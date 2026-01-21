const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 创建终端
  createTerminal: (options) => ipcRenderer.invoke('terminal:create', options),

  // 写入数据到终端
  writeToTerminal: (id, data) => ipcRenderer.send('terminal:write', { id, data }),

  // 调整终端大小
  resizeTerminal: (id, cols, rows) => ipcRenderer.send('terminal:resize', { id, cols, rows }),

  // 关闭终端
  closeTerminal: (id) => ipcRenderer.send('terminal:close', { id }),

  // 监听终端数据 - 返回清理函數
  onTerminalData: (callback) => {
    const handler = (event, { id, data }) => callback(id, data);
    ipcRenderer.on('terminal:data', handler);
    // 返回清理函數
    return () => ipcRenderer.removeListener('terminal:data', handler);
  },

  // 监听终端退出 - 返回清理函數
  onTerminalExit: (callback) => {
    const handler = (event, { id, code }) => callback(id, code);
    ipcRenderer.on('terminal:exit', handler);
    // 返回清理函數
    return () => ipcRenderer.removeListener('terminal:exit', handler);
  },

  // 移除所有监听器（保留向後兼容）
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // 监听應用內新建標籤請求（從指令觸發）
  onRequestNewTab: (callback) => {
    const handler = (event, options) => callback(options);
    ipcRenderer.on('terminal:request-new-tab', handler);
    return () => ipcRenderer.removeListener('terminal:request-new-tab', handler);
  },

  // 选择文件夹
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder')
});
