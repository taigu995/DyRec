/**
 * DyRec 依赖自动下载与安装模块
 * 
 * 功能：
 * - 启动时自动检测缺失依赖
 * - 自动下载并安装 FFmpeg
 * - 支持进度回调
 * - 支持多个下载源自动切换
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';

// 依赖状态枚举
export const DepStatus = {
  INSTALLED: 'installed',
  NOT_INSTALLED: 'not_installed',
  INSTALLING: 'installing',
  FAILED: 'failed',
  CHECKING: 'checking',
} as const;

export type DepStatusType = typeof DepStatus[keyof typeof DepStatus];

export interface DepResult {
  name: string;
  status: DepStatusType;
  version: string | null;
  path: string | null;
  source: string | null;
  description: string;
  optional?: boolean;
}

export interface ProgressInfo {
  stage: string;
  percent: number;
  message: string;
}

// FFmpeg 下载源（多个镜像，自动选择可用的）
const FFMPEG_DOWNLOAD_URLS = {
  win64: [
    'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip',
    'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip',
  ],
  darwin_arm: [
    'https://evermeet.cx/ffmpeg/getrelease/zip',
  ],
  darwin_x64: [
    'https://evermeet.cx/ffmpeg/getrelease/zip',
  ],
  linux: [
    'https://johnvansickle.com/ffmpeg/builds/ffmpeg-git-amd64-static.tar.xz',
  ],
};

/**
 * 获取依赖目录
 */
export function getDepsDir(): string {
  const baseDir = path.join(process.cwd(), '.deps');
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  return baseDir;
}

/**
 * 获取 FFmpeg 可执行文件路径
 */
export function getFFmpegPath(): string {
  const depsDir = getDepsDir();
  const ext = process.platform === 'win32' ? '.exe' : '';
  return path.join(depsDir, `ffmpeg${ext}`);
}

/**
 * 检测命令是否可用
 */
function checkCommand(command: string, args: string[] = ['--version']): { available: boolean; version: string | null } {
  try {
    const result = execSync(`${command} ${args.join(' ')}`, {
      timeout: 10000,
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    return { available: true, version: result.split('\n')[0].trim() };
  } catch {
    return { available: false, version: null };
  }
}

/**
 * 检测 FFmpeg
 */
export function checkFFmpeg(): DepResult {
  // 1. 检查应用目录下的 ffmpeg
  const bundledPath = getFFmpegPath();
  if (fs.existsSync(bundledPath)) {
    try {
      const result = execSync(`"${bundledPath}" -version`, {
        timeout: 10000,
        stdio: 'pipe',
        encoding: 'utf-8',
      });
      const version = result.split('\n')[0].trim();
      return {
        name: 'FFmpeg',
        status: DepStatus.INSTALLED,
        version,
        path: bundledPath,
        source: 'bundled',
        description: '录制功能必需，已安装到应用目录',
      };
    } catch {
      // 文件存在但无法执行
    }
  }

  // 2. 检查系统 PATH 中的 ffmpeg
  const systemCheck = checkCommand('ffmpeg');
  if (systemCheck.available) {
    return {
      name: 'FFmpeg',
      status: DepStatus.INSTALLED,
      version: systemCheck.version,
      path: 'system',
      source: 'system',
      description: '录制功能必需，使用系统安装版本',
    };
  }

  // 3. 未安装
  return {
    name: 'FFmpeg',
    status: DepStatus.NOT_INSTALLED,
    version: null,
    path: null,
    source: null,
    description: '录制功能必需，未检测到 FFmpeg',
  };
}

/**
 * 检测网络连通性
 */
export function checkNetwork(): Promise<DepResult> {
  return new Promise((resolve) => {
    const req = https.get('https://github.com', { timeout: 5000 }, (res) => {
      resolve({
        name: '网络连接',
        status: DepStatus.INSTALLED,
        version: null,
        path: null,
        source: null,
        description: '网络正常，可下载依赖',
        optional: true,
      });
      res.resume();
    });
    req.on('error', () => {
      resolve({
        name: '网络连接',
        status: DepStatus.NOT_INSTALLED,
        version: null,
        path: null,
        source: null,
        description: '无法连接外网，自动安装功能不可用',
        optional: true,
      });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({
        name: '网络连接',
        status: DepStatus.NOT_INSTALLED,
        version: null,
        path: null,
        source: null,
        description: '网络连接超时，自动安装功能不可用',
        optional: true,
      });
    });
  });
}

/**
 * 执行全部检测
 */
export async function checkAll(): Promise<DepResult[]> {
  const results: DepResult[] = [];

  // FFmpeg
  results.push(checkFFmpeg());

  // 网络
  const networkResult = await checkNetwork();
  results.push(networkResult);

  return results;
}

/**
 * 下载文件（带进度回调）
 */
function downloadFile(url: string, destPath: string, onProgress?: (progress: { downloaded: number; total: number; percent: number }) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    let downloaded = 0;
    let totalSize = 0;

    const request = protocol.get(url, { timeout: 30000 }, (response) => {
      // 处理重定向
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        downloadFile(response.headers.location, destPath, onProgress).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        file.close();
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        reject(new Error(`Download failed: HTTP ${response.statusCode}`));
        return;
      }

      totalSize = parseInt(response.headers['content-length'] || '0', 10);

      response.on('data', (chunk) => {
        downloaded += chunk.length;
        if (onProgress && totalSize > 0) {
          onProgress({
            downloaded,
            total: totalSize,
            percent: Math.round((downloaded / totalSize) * 100),
          });
        }
      });

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(destPath);
      });
    });

    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(err);
    });

    request.on('timeout', () => {
      request.destroy();
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(new Error('Download timeout'));
    });
  });
}

/**
 * 解压 ZIP 文件
 */
async function extractZip(zipPath: string, destDir: string, fileName: string): Promise<string> {
  // 尝试使用系统 unzip 命令
  try {
    if (process.platform === 'win32') {
      // Windows 上使用 PowerShell
      execSync(`powershell -Command "Expand-Archive -Force '${zipPath}' '${destDir}'"`, {
        timeout: 60000,
      });
      const findCmd = `dir /s /b "${path.join(destDir, fileName)}"`;
      const findResult = execSync(findCmd, { encoding: 'utf-8', timeout: 10000 }).trim();
      if (findResult) {
        return findResult.split('\n')[0];
      }
    } else {
      // Linux/Mac 上使用 unzip
      execSync(`unzip -o "${zipPath}" -d "${destDir}"`, { timeout: 60000 });
      const findResult = execSync(`find "${destDir}" -name "${fileName}" -type f`, {
        encoding: 'utf-8',
        timeout: 10000,
      }).trim();
      if (findResult) {
        return findResult.split('\n')[0];
      }
    }
  } catch {
    throw new Error(`Failed to extract ZIP: ${zipPath}`);
  }

  throw new Error(`Could not find ${fileName} in extracted files`);
}

/**
 * 自动安装 FFmpeg
 */
export async function installFFmpeg(onProgress?: (info: ProgressInfo) => void): Promise<string> {
  const platform = process.platform;
  const arch = process.arch;
  const depsDir = getDepsDir();

  if (onProgress) onProgress({ stage: 'downloading', percent: 0, message: '准备下载 FFmpeg...' });

  // 确定下载 URL
  let urls: string[] = [];
  if (platform === 'win32') {
    urls = FFMPEG_DOWNLOAD_URLS.win64;
  } else if (platform === 'darwin') {
    urls = arch === 'arm64' ? FFMPEG_DOWNLOAD_URLS.darwin_arm : FFMPEG_DOWNLOAD_URLS.darwin_x64;
  } else if (platform === 'linux') {
    urls = FFMPEG_DOWNLOAD_URLS.linux;
  }

  if (urls.length === 0) {
    throw new Error(`不支持的平台: ${platform} ${arch}，请手动安装 FFmpeg`);
  }

  // 尝试每个下载源
  let zipPath: string | null = null;
  let lastError: Error | null = null;

  for (const url of urls) {
    try {
      const ext = url.endsWith('.zip') ? '.zip' : url.endsWith('.tar.xz') ? '.tar.xz' : '.zip';
      zipPath = path.join(depsDir, `ffmpeg-download${ext}`);

      if (onProgress) onProgress({ stage: 'downloading', percent: 0, message: `正在从 ${new URL(url).hostname} 下载...` });

      await downloadFile(url, zipPath, (progress) => {
        if (onProgress) {
          onProgress({
            stage: 'downloading',
            percent: Math.round(progress.percent * 0.8), // 下载占 80%
            message: `下载中 ${progress.percent}% (${(progress.downloaded / 1024 / 1024).toFixed(1)}MB)`,
          });
        }
      });

      break; // 下载成功
    } catch (err) {
      lastError = err as Error;
      if (zipPath && fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
      }
    }
  }

  if (!zipPath || !fs.existsSync(zipPath)) {
    throw new Error(`下载失败: ${lastError?.message || '未知错误'}`);
  }

  if (onProgress) onProgress({ stage: 'extracting', percent: 80, message: '正在解压...' });

  // 解压并提取 ffmpeg 可执行文件
  const ffmpegName = platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  const extractedPath = await extractZip(zipPath, depsDir, ffmpegName);

  // 移动到目标位置
  const targetPath = getFFmpegPath();
  if (extractedPath !== targetPath) {
    fs.copyFileSync(extractedPath, targetPath);
  }

  // 设置可执行权限（Linux/Mac）
  if (platform !== 'win32') {
    fs.chmodSync(targetPath, 0o755);
  }

  // 清理临时文件
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  if (onProgress) onProgress({ stage: 'complete', percent: 100, message: 'FFmpeg 安装完成' });

  return targetPath;
}

/**
 * 自动检测并安装缺失依赖
 */
export async function autoInstall(onProgress?: (info: ProgressInfo) => void): Promise<DepResult[]> {
  const results = await checkAll();
  
  // 检查 FFmpeg 是否已安装
  const ffmpegResult = results.find(r => r.name === 'FFmpeg');
  const networkResult = results.find(r => r.name === '网络连接');
  
  if (ffmpegResult && ffmpegResult.status === DepStatus.NOT_INSTALLED) {
    // 检查网络
    if (networkResult && networkResult.status === DepStatus.INSTALLED) {
      try {
        if (onProgress) onProgress({ stage: 'installing', percent: 0, message: '正在自动安装 FFmpeg...' });
        await installFFmpeg(onProgress);
        ffmpegResult.status = DepStatus.INSTALLED;
        ffmpegResult.path = getFFmpegPath();
        ffmpegResult.source = 'auto-installed';
        ffmpegResult.description = '录制功能必需，已自动安装';
      } catch (err) {
        ffmpegResult.status = DepStatus.FAILED;
        ffmpegResult.description = `自动安装失败: ${(err as Error).message}`;
      }
    } else {
      ffmpegResult.description = '录制功能必需，但网络不可用，无法自动安装';
    }
  }
  
  return results;
}
