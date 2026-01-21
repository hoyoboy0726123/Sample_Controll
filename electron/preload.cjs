const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 创建终端
  createTerminal: (options) => ipcRenderer.invoke('terminal:create', options),

  // 写入数据到终端
  writeToTerminal: (id, data) => {
    // 🔒 客戶端驗證：防止發送過大數據
    if (typeof id !== 'string' || id.length === 0 || id.length > 255) {
      throw new Error('Invalid terminal id');
    }
    if (typeof data !== 'string') {
      throw new Error('Data must be a string');
    }
    if (data.length > 50000) {  // 降低到 50KB
      console.warn('數據過大，已截斷（最大 50KB）');
      data = data.substring(0, 50000);
    }
    return ipcRenderer.send('terminal:write', { id, data });
  },

  // 调整终端大小
  resizeTerminal: (id, cols, rows) => {
    // 🔒 客戶端驗證：防止無效的終端大小
    if (typeof id !== 'string' || id.length === 0 || id.length > 255) {
      throw new Error('Invalid terminal id');
    }
    if (!Number.isInteger(cols) || cols < 1 || cols > 1000) {
      throw new Error('Invalid cols value (must be 1-1000)');
    }
    if (!Number.isInteger(rows) || rows < 1 || rows > 1000) {
      throw new Error('Invalid rows value (must be 1-1000)');
    }
    return ipcRenderer.send('terminal:resize', { id, cols, rows });
  },

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
