const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给前端
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取应用版本
  getVersion: () => ipcRenderer.invoke('get-version'),
  
  // 窗口操作
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  
  // 依赖检测与安装
  deps: {
    checkAll: () => ipcRenderer.invoke('deps:check-all'),
    checkFFmpeg: () => ipcRenderer.invoke('deps:check-ffmpeg'),
    installFFmpeg: () => ipcRenderer.invoke('deps:install-ffmpeg'),
    getFFmpegPath: () => ipcRenderer.invoke('deps:get-ffmpeg-path'),
    getDepsDir: () => ipcRenderer.invoke('deps:get-deps-dir'),
    onInstallProgress: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('deps:install-progress', handler);
      return () => ipcRenderer.removeListener('deps:install-progress', handler);
    },
  },

  // 开机自启动
  autoStart: {
    get: () => ipcRenderer.invoke('autostart:get'),
    set: (enabled) => ipcRenderer.invoke('autostart:set', enabled),
  },

  // 是否为 Electron 环境
  isElectron: true,
});
