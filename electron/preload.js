const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给前端
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取应用版本
  getVersion: () => ipcRenderer.invoke('get-version'),
  
  // 最小化窗口
  minimize: () => ipcRenderer.send('window-minimize'),
  
  // 最大化窗口
  maximize: () => ipcRenderer.send('window-maximize'),
  
  // 关闭窗口
  close: () => ipcRenderer.send('window-close'),
  
  // 是否为 Electron 环境
  isElectron: true,
});
