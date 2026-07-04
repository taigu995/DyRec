/**
 * DyRec 依赖检测与自动安装模块
 * 
 * 检测项目：
 * - FFmpeg: 录制功能必需
 * - Node.js: 运行时（Electron 已内置，但某些场景需要系统级）
 * - 网络连通性: 下载依赖需要
 * 
 * 安装策略：
 * - FFmpeg: 从 GitHub releases 下载预编译二进制，放到应用目录
 */

const { execSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { app } = require('electron');

// 依赖状态枚举
const STATUS = {
  INSTALLED: 'installed',
  NOT_INSTALLED: 'not_installed',
  INSTALLING: 'installing',
  FAILED: 'failed',
  CHECKING: 'checking',
};

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
  linux: [],
};

/**
 * 获取应用数据目录（存放 ffmpeg 等依赖）
 */
function getDepsDir() {
  let baseDir;
  if (app && app.isPackaged) {
    baseDir = path.join(app.getPath('userData'), 'deps');
  } else {
    baseDir = path.join(process.cwd(), '.deps');
  }
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  return baseDir;
}

/**
 * 获取 FFmpeg 可执行文件路径
 */
function getFFmpegPath() {
  const depsDir = getDepsDir();
  const ext = process.platform === 'win32' ? '.exe' : '';
  return path.join(depsDir, `ffmpeg${ext}`);
}

/**
 * 检测命令是否可用
 */
function checkCommand(command, args = ['--version']) {
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
function checkFFmpeg() {
  // 1. 检查应用内置的 ffmpeg
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
        status: STATUS.INSTALLED,
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
      status: STATUS.INSTALLED,
      version: systemCheck.version,
      path: 'system',
      source: 'system',
      description: '录制功能必需，使用系统安装版本',
    };
  }

  // 3. 未安装
  return {
    name: 'FFmpeg',
    status: STATUS.NOT_INSTALLED,
    version: null,
    path: null,
    source: null,
    description: '录制功能必需，未检测到 FFmpeg',
  };
}

/**
 * 检测 Node.js（系统级）
 */
function checkNodeJS() {
  const check = checkCommand('node');
  if (check.available) {
    return {
      name: 'Node.js',
      status: STATUS.INSTALLED,
      version: check.version,
      path: 'system',
      source: 'system',
      description: '运行时环境（Electron 已内置，此项可选）',
    };
  }
  return {
    name: 'Node.js',
    status: STATUS.NOT_INSTALLED,
    version: null,
    path: null,
    source: null,
    description: 'Electron 已内置运行时，此项可选安装',
    optional: true,
  };
}

/**
 * 检测网络连通性
 */
function checkNetwork() {
  return new Promise((resolve) => {
    const req = https.get('https://github.com', { timeout: 5000 }, (res) => {
      resolve({
        name: '网络连接',
        status: STATUS.INSTALLED,
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
        status: STATUS.NOT_INSTALLED,
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
        status: STATUS.NOT_INSTALLED,
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
async function checkAll() {
  const results = [];

  // FFmpeg
  results.push(checkFFmpeg());

  // Node.js
  results.push(checkNodeJS());

  // 网络
  const networkResult = await checkNetwork();
  results.push(networkResult);

  return results;
}

/**
 * 下载文件（带进度回调）
 */
function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    let downloaded = 0;
    let totalSize = 0;

    const request = protocol.get(url, { timeout: 30000 }, (response) => {
      // 处理重定向
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        fs.unlinkSync(destPath);
        return downloadFile(response.headers.location, destPath, onProgress).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
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
 * 解压 ZIP 文件（纯 JS 实现，不依赖外部工具）
 */
async function extractZip(zipPath, destDir, fileName) {
  // 使用 Node.js 内置 zlib + 手动解析 ZIP
  // 简化版：只提取指定文件
  const AdmZip = (() => {
    try {
      return require('adm-zip');
    } catch {
      return null;
    }
  })();

  if (AdmZip) {
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();
    for (const entry of entries) {
      if (entry.entryName.endsWith(fileName) && !entry.isDirectory) {
        const content = entry.getData();
        const outputPath = path.join(destDir, fileName);
        fs.writeFileSync(outputPath, content);
        // Windows 上设置可执行权限不需要
        return outputPath;
      }
    }
    throw new Error(`File ${fileName} not found in ZIP`);
  }

  // 回退：尝试使用系统 unzip 命令
  try {
    execSync(`unzip -o "${zipPath}" -d "${destDir}"`, { timeout: 60000 });
    // 查找解压后的文件
    const findResult = execSync(`find "${destDir}" -name "${fileName}" -type f`, {
      encoding: 'utf-8',
      timeout: 10000,
    }).trim();
    if (findResult) {
      return findResult.split('\n')[0];
    }
  } catch {
    // Windows 上使用 PowerShell
    try {
      execSync(`powershell -Command "Expand-Archive -Force '${zipPath}' '${destDir}'"`, {
        timeout: 60000,
      });
      const findCmd = process.platform === 'win32'
        ? `dir /s /b "${path.join(destDir, fileName)}"`
        : `find "${destDir}" -name "${fileName}" -type f`;
      const findResult = execSync(findCmd, { encoding: 'utf-8', timeout: 10000 }).trim();
      if (findResult) {
        return findResult.split('\n')[0];
      }
    } catch (extractErr) {
      throw new Error(`Failed to extract ZIP: ${extractErr.message}`);
    }
  }

  throw new Error(`Could not find ${fileName} in extracted files`);
}

/**
 * 自动安装 FFmpeg
 */
async function installFFmpeg(onProgress) {
  const platform = process.platform;
  const arch = process.arch;
  const depsDir = getDepsDir();

  if (onProgress) onProgress({ stage: 'downloading', percent: 0, message: '准备下载 FFmpeg...' });

  // 确定下载 URL
  let urls = [];
  if (platform === 'win32') {
    urls = FFMPEG_DOWNLOAD_URLS.win64;
  } else if (platform === 'darwin') {
    urls = arch === 'arm64' ? FFMPEG_DOWNLOAD_URLS.darwin_arm : FFMPEG_DOWNLOAD_URLS.darwin_x64;
  }

  if (urls.length === 0) {
    throw new Error(`不支持的平台: ${platform} ${arch}，请手动安装 FFmpeg`);
  }

  // 尝试每个下载源
  let zipPath = null;
  let lastError = null;

  for (const url of urls) {
    try {
      const ext = url.endsWith('.zip') ? '.zip' : '.zip';
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
      lastError = err;
      if (zipPath && fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
      }
    }
  }

  if (!zipPath || !fs.existsSync(zipPath)) {
    throw new Error(`下载失败: ${lastError?.message || '未知错误'}`);
  }

  // 解压
  if (onProgress) onProgress({ stage: 'extracting', percent: 80, message: '正在解压...' });

  try {
    const ffmpegName = platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
    const extractedPath = await extractZip(zipPath, depsDir, ffmpegName);

    // 移动到目标位置
    const targetPath = getFFmpegPath();
    if (extractedPath !== targetPath) {
      fs.copyFileSync(extractedPath, targetPath);
      // 清理临时文件
      if (extractedPath !== targetPath && fs.existsSync(extractedPath)) {
        fs.unlinkSync(extractedPath);
      }
    }

    // 设置可执行权限 (Linux/macOS)
    if (platform !== 'win32') {
      fs.chmodSync(targetPath, 0o755);
    }

    // 清理下载文件
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

    if (onProgress) onProgress({ stage: 'done', percent: 100, message: 'FFmpeg 安装完成' });

    return {
      success: true,
      path: targetPath,
      version: checkFFmpeg().version,
    };
  } catch (err) {
    // 清理
    if (zipPath && fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    throw new Error(`解压失败: ${err.message}`);
  }
}

module.exports = {
  STATUS,
  checkAll,
  checkFFmpeg,
  checkNodeJS,
  checkNetwork,
  installFFmpeg,
  getFFmpegPath,
  getDepsDir,
};
