/**
 * DyRec 依赖自动下载与安装模块
 * 
 * 功能：
 * - 启动时自动检测缺失依赖
 * - 自动下载并安装 FFmpeg
 * - 支持进度回调
 * - 多平台适配（Windows/Linux/macOS）
 * - 多种下载源自动切换
 */

import { execSync, spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import { createWriteStream } from 'fs';

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

/**
 * FFmpeg 下载源配置
 * 
 * Windows: 使用 ZIP 格式（PowerShell 原生支持解压）
 * Linux: 优先使用 tar.gz 格式（兼容性更好），备选 tar.xz
 * macOS: 使用 ZIP 格式
 */
interface FFmpegSource {
  url: string;
  format: 'zip' | 'tar.gz' | 'tar.xz';
  /** 解压后 ffmpeg 可执行文件在压缩包内的相对路径模式 */
  binaryPattern: string;
  /** 解压后的顶层目录名（用于定位文件） */
  topDir?: string;
}

const FFMPEG_SOURCES: Record<string, FFmpegSource[]> = {
  win64: [
    {
      // gyan.dev 提供 essentials 版本，ZIP 格式，结构清晰
      url: 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip',
      format: 'zip',
      binaryPattern: 'bin/ffmpeg.exe',
    },
    {
      // BtbN 构建，ZIP 格式
      url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip',
      format: 'zip',
      binaryPattern: 'bin/ffmpeg.exe',
    },
  ],
  darwin_arm: [
    {
      url: 'https://evermeet.cx/ffmpeg/getrelease/zip',
      format: 'zip',
      binaryPattern: 'ffmpeg',
    },
    {
      url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-darwin-arm64-gpl.tar.xz',
      format: 'tar.xz',
      binaryPattern: 'bin/ffmpeg',
    },
  ],
  darwin_x64: [
    {
      url: 'https://evermeet.cx/ffmpeg/getrelease/zip',
      format: 'zip',
      binaryPattern: 'ffmpeg',
    },
    {
      url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-darwin-amd64-gpl.tar.xz',
      format: 'tar.xz',
      binaryPattern: 'bin/ffmpeg',
    },
  ],
  linux: [
    {
      // johnvansickle 提供静态构建，tar.xz 格式
      url: 'https://johnvansickle.com/ffmpeg/builds/ffmpeg-release-amd64-static.tar.xz',
      format: 'tar.xz',
      binaryPattern: 'ffmpeg',
    },
    {
      url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz',
      format: 'tar.xz',
      binaryPattern: 'bin/ffmpeg',
    },
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
  results.push(checkFFmpeg());
  const networkResult = await checkNetwork();
  results.push(networkResult);
  return results;
}

/**
 * 下载文件（带进度回调，支持重定向）
 */
function downloadFile(
  url: string,
  destPath: string,
  onProgress?: (progress: { downloaded: number; total: number; percent: number }) => void,
  maxRedirects = 5
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) {
      reject(new Error('Too many redirects'));
      return;
    }

    const protocol = url.startsWith('https') ? https : http;
    const file = createWriteStream(destPath);
    let downloaded = 0;
    let totalSize = 0;

    const request = protocol.get(url, { timeout: 60000 }, (response) => {
      // 处理重定向
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        let redirectUrl = response.headers.location;
        // 处理相对路径重定向
        if (redirectUrl.startsWith('/')) {
          const baseUrl = new URL(url);
          redirectUrl = `${baseUrl.protocol}//${baseUrl.host}${redirectUrl}`;
        }
        downloadFile(redirectUrl, destPath, onProgress, maxRedirects - 1).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        file.close();
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        reject(new Error(`Download failed: HTTP ${response.statusCode}`));
        return;
      }

      totalSize = parseInt(response.headers['content-length'] || '0', 10);

      response.on('data', (chunk: Buffer) => {
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
 * 在目录中递归查找文件
 */
function findFileInDir(dir: string, fileName: string): string | null {
  if (!fs.existsSync(dir)) return null;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isFile() && entry.name === fileName) {
      return fullPath;
    }
    
    if (entry.isDirectory()) {
      const found = findFileInDir(fullPath, fileName);
      if (found) return found;
    }
  }
  
  return null;
}

/**
 * Windows 专用：使用 PowerShell 解压 ZIP
 */
async function extractZipPowerShell(zipPath: string, destDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // 使用 PowerShell Expand-Archive 解压
    const psCommand = `Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force`;
    
    const proc = spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command', psCommand], {
      timeout: 180000,
      stdio: 'pipe',
    });

    let stderr = '';
    proc.stderr?.on('data', (data) => { stderr += data.toString(); });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`PowerShell extraction failed (code ${code}): ${stderr.trim()}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to start PowerShell: ${err.message}`));
    });
  });
}

/**
 * Unix 专用：使用 unzip 解压 ZIP
 */
async function extractZipUnix(zipPath: string, destDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('unzip', ['-o', zipPath, '-d', destDir], {
      timeout: 180000,
      stdio: 'pipe',
    });

    let stderr = '';
    proc.stderr?.on('data', (data) => { stderr += data.toString(); });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`unzip failed (code ${code}): ${stderr.trim()}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to start unzip: ${err.message}`));
    });
  });
}

/**
 * 解压 TAR.XZ 文件
 * 先尝试系统 tar，如果失败则尝试安装 xz-utils
 */
async function extractTarXz(tarPath: string, destDir: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    // 先尝试直接解压
    const tryExtract = (): Promise<void> => {
      return new Promise((res, rej) => {
        const proc = spawn('tar', ['-xf', tarPath, '-C', destDir], {
          timeout: 180000,
          stdio: 'pipe',
        });

        let stderr = '';
        proc.stderr?.on('data', (data) => { stderr += data.toString(); });
        
        proc.on('close', (code) => {
          if (code === 0) {
            res();
          } else {
            rej(new Error(`tar failed (code ${code}): ${stderr.trim()}`));
          }
        });

        proc.on('error', (err) => {
          rej(new Error(`Failed to start tar: ${err.message}`));
        });
      });
    };

    try {
      await tryExtract();
      resolve();
    } catch (firstError) {
      // 如果失败，可能是因为缺少 xz，尝试安装
      const errMsg = (firstError as Error).message;
      if (errMsg.includes('xz') || errMsg.includes('filter')) {
        console.log('[DepInstaller] tar.xz 解压失败，尝试安装 xz-utils...');
        
        try {
          // 尝试 apt-get 安装 xz-utils
          execSync('apt-get update -qq && apt-get install -y -qq xz-utils', {
            timeout: 60000,
            stdio: 'pipe',
          });
          
          // 重试解压
          await tryExtract();
          resolve();
        } catch {
          // apt-get 不可用，尝试 yum
          try {
            execSync('yum install -y xz', { timeout: 60000, stdio: 'pipe' });
            await tryExtract();
            resolve();
          } catch {
            reject(new Error(
              '无法解压 .tar.xz 文件：系统缺少 xz 工具。\n' +
              '请手动安装: apt-get install xz-utils (Debian/Ubuntu) 或 yum install xz (CentOS/RHEL)'
            ));
          }
        }
      } else {
        reject(firstError);
      }
    }
  });
}

/**
 * 解压文件（根据格式自动选择解压方式）
 */
async function extractArchive(archivePath: string, destDir: string, format: 'zip' | 'tar.gz' | 'tar.xz'): Promise<void> {
  // 确保目标目录存在
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  if (format === 'zip') {
    if (process.platform === 'win32') {
      await extractZipPowerShell(archivePath, destDir);
    } else {
      try {
        await extractZipUnix(archivePath, destDir);
      } catch {
        // 如果 unzip 不可用，尝试 PowerShell（在某些环境可能可用）
        await extractZipPowerShell(archivePath, destDir);
      }
    }
  } else if (format === 'tar.xz' || format === 'tar.gz') {
    await extractTarXz(archivePath, destDir);
  }
}

/**
 * 自动安装 FFmpeg
 */
export async function installFFmpeg(onProgress?: (info: ProgressInfo) => void): Promise<string> {
  const platform = process.platform;
  const arch = process.arch;
  const depsDir = getDepsDir();

  if (onProgress) onProgress({ stage: 'downloading', percent: 0, message: '准备下载 FFmpeg...' });

  // 确定下载源列表
  let sources: FFmpegSource[] = [];
  if (platform === 'win32') {
    sources = FFMPEG_SOURCES.win64;
  } else if (platform === 'darwin') {
    sources = arch === 'arm64' ? FFMPEG_SOURCES.darwin_arm : FFMPEG_SOURCES.darwin_x64;
  } else if (platform === 'linux') {
    sources = FFMPEG_SOURCES.linux;
  }

  if (sources.length === 0) {
    throw new Error(`不支持的平台: ${platform} ${arch}，请手动安装 FFmpeg`);
  }

  // 依次尝试每个下载源
  let lastError: Error | null = null;

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    const ext = source.format === 'zip' ? '.zip' : source.format === 'tar.gz' ? '.tar.gz' : '.tar.xz';
    const downloadPath = path.join(depsDir, `ffmpeg-download-${i}${ext}`);
    const extractDir = path.join(depsDir, `ffmpeg-extract-${i}`);

    try {
      // 清理旧的临时文件
      if (fs.existsSync(downloadPath)) fs.unlinkSync(downloadPath);
      if (fs.existsSync(extractDir)) {
        fs.rmSync(extractDir, { recursive: true, force: true });
      }
      fs.mkdirSync(extractDir, { recursive: true });

      const hostname = new URL(source.url).hostname;
      if (onProgress) {
        onProgress({
          stage: 'downloading',
          percent: 0,
          message: `正在从 ${hostname} 下载 FFmpeg (${source.format})...`,
        });
      }

      // 下载文件
      await downloadFile(source.url, downloadPath, (progress) => {
        if (onProgress) {
          onProgress({
            stage: 'downloading',
            percent: Math.round(progress.percent * 0.7), // 下载占 70%
            message: `下载中 ${progress.percent}% (${(progress.downloaded / 1024 / 1024).toFixed(1)}MB / ${(progress.total / 1024 / 1024).toFixed(1)}MB)`,
          });
        }
      });

      if (onProgress) onProgress({ stage: 'extracting', percent: 70, message: '正在解压...' });

      // 解压文件
      await extractArchive(downloadPath, extractDir, source.format);

      if (onProgress) onProgress({ stage: 'extracting', percent: 85, message: '正在定位 FFmpeg...' });

      // 查找 ffmpeg 可执行文件
      const ffmpegName = platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
      const foundPath = findFileInDir(extractDir, ffmpegName);

      if (!foundPath) {
        throw new Error(`解压后未找到 ${ffmpegName}，压缩包结构可能不符合预期`);
      }

      // 移动到目标位置
      const targetPath = getFFmpegPath();
      fs.copyFileSync(foundPath, targetPath);

      // 设置可执行权限（Linux/Mac）
      if (platform !== 'win32') {
        fs.chmodSync(targetPath, 0o755);
      }

      // 验证安装
      try {
        const versionOutput = execSync(`"${targetPath}" -version`, {
          timeout: 10000,
          encoding: 'utf-8',
          stdio: 'pipe',
        });
        const version = versionOutput.split('\n')[0].trim();
        console.log(`[DepInstaller] FFmpeg 安装成功: ${version}`);
      } catch {
        throw new Error('FFmpeg 安装后验证失败，文件可能已损坏');
      }

      // 清理临时文件
      try {
        if (fs.existsSync(downloadPath)) fs.unlinkSync(downloadPath);
        if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });
      } catch {
        // 清理失败不影响主流程
      }

      if (onProgress) onProgress({ stage: 'complete', percent: 100, message: 'FFmpeg 安装完成！' });

      return targetPath;
    } catch (err) {
      lastError = err as Error;
      console.error(`[DepInstaller] 下载源 ${source.url} 失败: ${lastError.message}`);

      // 清理本次临时文件
      try {
        if (fs.existsSync(downloadPath)) fs.unlinkSync(downloadPath);
        if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });
      } catch { /* ignore */ }

      // 继续尝试下一个源
      continue;
    }
  }

  throw new Error(`FFmpeg 安装失败，所有下载源均不可用。\n最后错误: ${lastError?.message || '未知错误'}\n请手动下载 FFmpeg 并放置到: ${getFFmpegPath()}`);
}

/**
 * 自动检测并安装缺失依赖
 */
export async function autoInstall(onProgress?: (info: ProgressInfo) => void): Promise<DepResult[]> {
  const results = await checkAll();
  
  const ffmpegResult = results.find(r => r.name === 'FFmpeg');
  const networkResult = results.find(r => r.name === '网络连接');
  
  if (ffmpegResult && ffmpegResult.status === DepStatus.NOT_INSTALLED) {
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
