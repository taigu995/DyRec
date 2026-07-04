const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const fs = require('fs');

// 禁用硬件加速（解决某些 Windows 机器黑屏问题）
app.disableHardwareAcceleration();

let mainWindow = null;
let nextServer = null;
let isReady = false;

// 获取可用端口
const PORT = process.env.PORT || 5000;

// 获取应用路径
function getAppPath() {
  if (app.isPackaged) {
    // 打包后：resources/app 或 resources 目录
    const resourcesPath = process.resourcesPath;
    // 检查是否有 .next 目录
    if (fs.existsSync(path.join(resourcesPath, 'app', '.next'))) {
      return path.join(resourcesPath, 'app');
    }
    if (fs.existsSync(path.join(resourcesPath, '.next'))) {
      return resourcesPath;
    }
    return resourcesPath;
  }
  return process.cwd();
}

// 查找 next 命令
function findNextCommand(appPath) {
  // 优先使用本地 node_modules 中的 next
  const localNext = path.join(appPath, 'node_modules', '.bin', 'next');
  const localNextCmd = path.join(appPath, 'node_modules', '.bin', 'next.cmd');
  
  if (fs.existsSync(localNextCmd)) return localNextCmd;
  if (fs.existsSync(localNext)) return localNext;
  
  // 回退到 npx
  return 'npx';
}

// 启动 Next.js 服务器
function startNextServer() {
  return new Promise((resolve, reject) => {
    const appPath = getAppPath();
    const isDev = !app.isPackaged;
    
    console.log(`[DyRec] App path: ${appPath}`);
    console.log(`[DyRec] Mode: ${isDev ? 'development' : 'production'}`);
    console.log(`[DyRec] Port: ${PORT}`);

    let cmd, args;
    
    if (isDev) {
      cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      args = ['next', 'dev', '-p', String(PORT)];
    } else {
      // 生产模式
      const nextCmd = findNextCommand(appPath);
      if (nextCmd === 'npx') {
        cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
        args = ['next', 'start', '-p', String(PORT)];
      } else {
        cmd = nextCmd;
        args = ['start', '-p', String(PORT)];
      }
    }

    console.log(`[DyRec] Starting: ${cmd} ${args.join(' ')}`);
    console.log(`[DyRec] Working dir: ${appPath}`);

    try {
      nextServer = spawn(cmd, args, {
        cwd: appPath,
        env: { 
          ...process.env, 
          PORT: String(PORT),
          NODE_ENV: isDev ? 'development' : 'production',
          HOSTNAME: '127.0.0.1',
        },
        stdio: 'pipe',
        shell: true,
      });
    } catch (err) {
      console.error('[DyRec] Failed to start server:', err);
      reject(err);
      return;
    }

    let resolved = false;

    nextServer.stdout.on('data', (data) => {
      const msg = data.toString().trim();
      console.log(`[Next.js] ${msg}`);
      if (!resolved && (msg.includes('Ready') || msg.includes('ready') || msg.includes('started') || msg.includes('Local:'))) {
        resolved = true;
        resolve();
      }
    });

    nextServer.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      console.error(`[Next.js] ${msg}`);
      // Next.js dev 模式有时输出到 stderr
      if (!resolved && (msg.includes('Ready') || msg.includes('ready'))) {
        resolved = true;
        resolve();
      }
    });

    nextServer.on('error', (err) => {
      console.error('[DyRec] Server error:', err);
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });

    nextServer.on('close', (code) => {
      console.log(`[DyRec] Next.js server exited with code ${code}`);
      if (!resolved) {
        resolved = true;
        resolve(); // 继续尝试打开窗口
      }
    });

    // 超时处理 - 15秒后无论如何继续
    setTimeout(() => {
      if (!resolved) {
        console.log('[DyRec] Server start timeout, proceeding anyway...');
        resolved = true;
        resolve();
      }
    }, 15000);
  });
}

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'DyRec - 抖音直播录制工具',
    backgroundColor: '#09090b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true,
    show: false,
  });

  const url = `http://127.0.0.1:${PORT}`;
  
  // 等待页面加载完成再显示
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // 加载应用，带重试
  function loadWithRetry(retries = 5) {
    mainWindow.loadURL(url).catch((err) => {
      console.error(`[DyRec] Load failed (${retries} retries left):`, err.message);
      if (retries > 0) {
        setTimeout(() => loadWithRetry(retries - 1), 2000);
      }
    });
  }

  loadWithRetry();

  // 外部链接在浏览器中打开
  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    shell.openExternal(targetUrl);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ========== IPC Handlers ==========

// 窗口操作
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window-close', () => mainWindow?.close());

// 获取版本
ipcMain.handle('get-version', () => app.getVersion());

// 依赖检测
const depChecker = require('./modules/dependency-checker');

ipcMain.handle('deps:check-all', async () => {
  try {
    const results = await depChecker.checkAll();
    return { success: true, data: results };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('deps:check-ffmpeg', () => {
  try {
    return { success: true, data: depChecker.checkFFmpeg() };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('deps:install-ffmpeg', async () => {
  try {
    // 通过 webContents 发送进度
    const sendProgress = (progress) => {
      mainWindow?.webContents.send('deps:install-progress', progress);
    };
    const result = await depChecker.installFFmpeg(sendProgress);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('deps:get-ffmpeg-path', () => {
  return { success: true, data: depChecker.getFFmpegPath() };
});

ipcMain.handle('deps:get-deps-dir', () => {
  return { success: true, data: depChecker.getDepsDir() };
});

// 应用就绪
app.whenReady().then(async () => {
  // 启动 Next.js 服务器
  await startNextServer();
  
  // 等待一小段时间确保服务就绪
  await new Promise(r => setTimeout(r, 2000));
  
  // 创建窗口
  createWindow();
  isReady = true;

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 退出前清理
app.on('before-quit', () => {
  if (nextServer) {
    console.log('[DyRec] Shutting down Next.js server...');
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /pid ${nextServer.pid} /f /t 2>nul`, { stdio: 'ignore' });
      } else {
        nextServer.kill('SIGTERM');
      }
    } catch (e) {
      // ignore
    }
  }
});

// 所有窗口关闭时退出
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
