import { contextBridge, ipcRenderer } from 'electron';

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

  // 监听终端数据
  onTerminalData: (callback) => {
    ipcRenderer.on('terminal:data', (event, { id, data }) => callback(id, data));
  },

  // 监听终端退出
  onTerminalExit: (callback) => {
    ipcRenderer.on('terminal:exit', (event, { id, code }) => callback(id, code));
  },

  // 移除监听器
  removeListener: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // 选择文件夹
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder')
});
