import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { createPtyService } from './pty-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
const ptyService = createPtyService();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#1e1e1e',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    },
    frame: true,
    titleBarStyle: 'default',
    autoHideMenuBar: true
  });

  // 开发环境加载 Vite 开发服务器
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // 生产环境加载打包后的文件
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 应用准备就绪时创建窗口
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭时退出应用 (macOS除外)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC 通信处理 - 创建终端
ipcMain.handle('terminal:create', async (event, options) => {
  try {
    const { id, cwd, shell } = options;
    ptyService.createTerminal(id, {
      cwd: cwd || process.env.HOME || process.env.USERPROFILE,
      shell: shell || process.env.SHELL || 'bash'
    });
    return { success: true, id };
  } catch (error) {
    console.error('Failed to create terminal:', error);
    return { success: false, error: error.message };
  }
});

// IPC 通信处理 - 写入终端数据
ipcMain.on('terminal:write', (event, { id, data }) => {
  ptyService.write(id, data);
});

// IPC 通信处理 - 调整终端大小
ipcMain.on('terminal:resize', (event, { id, cols, rows }) => {
  ptyService.resize(id, cols, rows);
});

// IPC 通信处理 - 关闭终端
ipcMain.on('terminal:close', (event, { id }) => {
  ptyService.closeTerminal(id);
});

// 将 PTY 输出发送到渲染进程
ptyService.onData((id, data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('terminal:data', { id, data });
  }
});

// 终端退出事件
ptyService.onExit((id, code) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('terminal:exit', { id, code });
  }
});

// IPC 通信处理 - 选择文件夹
ipcMain.handle('dialog:selectFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: '选择项目文件夹'
  });

  if (result.canceled) {
    return { canceled: true };
  }

  return { canceled: false, path: result.filePaths[0] };
});
