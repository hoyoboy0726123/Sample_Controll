const { contextBridge, ipcRenderer } = require('electron');

// 🔒 驗證常數
const VALIDATION = {
  TERMINAL_ID_MAX_LENGTH: 255,
  DATA_MAX_LENGTH: 50000,  // 50KB
  TERMINAL_MAX_COLS: 1000,
  TERMINAL_MAX_ROWS: 1000,
};

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 创建终端
  createTerminal: (options) => ipcRenderer.invoke('terminal:create', options),

  // 写入数据到终端
  writeToTerminal: (id, data) => {
    // 🔒 客戶端驗證：防止發送過大數據
    if (typeof id !== 'string' || id.length === 0 || id.length > VALIDATION.TERMINAL_ID_MAX_LENGTH) {
      throw new Error(`Invalid terminal id (max ${VALIDATION.TERMINAL_ID_MAX_LENGTH} chars)`);
    }
    if (typeof data !== 'string') {
      throw new Error('Data must be a string');
    }
    if (data.length > VALIDATION.DATA_MAX_LENGTH) {
      console.warn(`數據過大，已截斷（最大 ${VALIDATION.DATA_MAX_LENGTH / 1000}KB）`);
      data = data.substring(0, VALIDATION.DATA_MAX_LENGTH);
    }
    return ipcRenderer.send('terminal:write', { id, data });
  },

  // 调整终端大小
  resizeTerminal: (id, cols, rows) => {
    // 🔒 客戶端驗證：防止無效的終端大小
    if (typeof id !== 'string' || id.length === 0 || id.length > VALIDATION.TERMINAL_ID_MAX_LENGTH) {
      throw new Error(`Invalid terminal id (max ${VALIDATION.TERMINAL_ID_MAX_LENGTH} chars)`);
    }
    if (!Number.isInteger(cols) || cols < 1 || cols > VALIDATION.TERMINAL_MAX_COLS) {
      throw new Error(`Invalid cols value (must be 1-${VALIDATION.TERMINAL_MAX_COLS})`);
    }
    if (!Number.isInteger(rows) || rows < 1 || rows > VALIDATION.TERMINAL_MAX_ROWS) {
      throw new Error(`Invalid rows value (must be 1-${VALIDATION.TERMINAL_MAX_ROWS})`);
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

  // 🔒 安全性：移除 removeAllListeners API
  // 原因：渲染進程可以移除所有監聽器，包括其他組件註冊的，可能導致意外副作用
  // 替代方案：每個監聽器 API 都返回清理函數，使用該函數清理

  // 监听應用內新建標籤請求（從指令觸發）
  onRequestNewTab: (callback) => {
    const handler = (event, options) => callback(options);
    ipcRenderer.on('terminal:request-new-tab', handler);
    return () => ipcRenderer.removeListener('terminal:request-new-tab', handler);
  },

  // 选择文件夹
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder')
});
