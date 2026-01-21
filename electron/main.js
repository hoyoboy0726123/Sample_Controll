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
      /**
       * 安全性評估結果：sandbox 必須設為 false
       *
       * 原因：
       * 1. node-pty 需要原生 Node.js 模組支援，無法在沙箱環境中運行
       * 2. Preload 腳本需要訪問 ipcRenderer 來建立 contextBridge
       *
       * 安全緩解措施：
       * 1. ✓ nodeIntegration: false - 防止渲染進程直接訪問 Node.js API
       * 2. ✓ contextIsolation: true - 隔離 preload 腳本和渲染進程的上下文
       * 3. ✓ contextBridge - 只暴露明確定義的安全 API (electronAPI)
       * 4. ✓ IPC 驗證 - 所有 IPC 通信都經過 main 進程驗證
       * 5. ✓ 最小權限原則 - preload.cjs 只暴露必要的終端管理功能
       *
       * 風險評估：中等風險
       * - 如果渲染進程被 XSS 攻擊，攻擊者可以透過 electronAPI 執行終端指令
       * - 建議未來添加指令白名單或更嚴格的輸入驗證
       */
      sandbox: false
    },
    frame: true,
    titleBarStyle: 'default',
    autoHideMenuBar: true
  });

  // 开发环境加载 Vite 开发服务器
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    // 註釋掉自動開啟 DevTools，用戶可以按 F12 手動開啟
    // mainWindow.webContents.openDevTools();

    // 添加 F12 快捷鍵來切換開發者工具
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12') {
        if (mainWindow.webContents.isDevToolsOpened()) {
          mainWindow.webContents.closeDevTools();
        } else {
          mainWindow.webContents.openDevTools();
        }
      }
    });
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

// IPC 輸入驗證輔助函數
function validateTerminalId(id) {
  return typeof id === 'string' && id.length > 0 && id.length < 256;
}

function validateString(value, maxLength = 10000) {
  return typeof value === 'string' && value.length <= maxLength;
}

function validatePositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function validateObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// IPC 通信处理 - 创建终端
ipcMain.handle('terminal:create', async (event, options) => {
  try {
    // 輸入驗證
    if (!validateObject(options)) {
      return { success: false, error: 'Invalid options: must be an object' };
    }

    const { id, cwd, shell } = options;

    if (!validateTerminalId(id)) {
      return { success: false, error: 'Invalid terminal id: must be a non-empty string (max 255 chars)' };
    }

    if (cwd !== undefined && !validateString(cwd, 4096)) {
      return { success: false, error: 'Invalid cwd: must be a string (max 4096 chars)' };
    }

    if (shell !== undefined && !validateString(shell, 1024)) {
      return { success: false, error: 'Invalid shell: must be a string (max 1024 chars)' };
    }

    ptyService.createTerminal(id, {
      cwd: cwd || process.env.HOME || process.env.USERPROFILE,
      shell: shell || 'auto'
    });
    return { success: true, id };
  } catch (error) {
    console.error('Failed to create terminal:', error);
    return { success: false, error: error.message };
  }
});

// 檢測並攔截開啟新終端的指令
function detectNewTerminalCommand(data) {
  const trimmed = data.trim().toLowerCase();

  // Windows 指令
  const windowsCommands = [
    { pattern: /^start\s+(cmd|powershell|pwsh)/i, shell: 'cmd.exe', name: 'CMD' },
    { pattern: /^start\s+powershell/i, shell: 'powershell.exe', name: 'PowerShell' },
    { pattern: /^wt\b/i, shell: 'auto', name: 'Windows Terminal' },
    { pattern: /^cmd\s*$/i, shell: 'cmd.exe', name: 'CMD' },
    { pattern: /^powershell\s*$/i, shell: 'powershell.exe', name: 'PowerShell' },
  ];

  // Linux/Mac 指令
  const unixCommands = [
    { pattern: /^gnome-terminal/i, shell: 'bash', name: 'GNOME Terminal' },
    { pattern: /^konsole/i, shell: 'bash', name: 'Konsole' },
    { pattern: /^xterm/i, shell: 'bash', name: 'XTerm' },
    { pattern: /^kitty/i, shell: 'bash', name: 'Kitty' },
    { pattern: /^alacritty/i, shell: 'bash', name: 'Alacritty' },
  ];

  const allCommands = [...windowsCommands, ...unixCommands];

  for (const cmd of allCommands) {
    if (cmd.pattern.test(trimmed)) {
      return {
        shouldIntercept: true,
        shell: cmd.shell,
        name: cmd.name,
        originalCommand: data
      };
    }
  }

  return { shouldIntercept: false };
}

// IPC 通信处理 - 写入终端数据
ipcMain.on('terminal:write', (event, payload) => {
  // 輸入驗證
  if (!validateObject(payload)) {
    console.error('Invalid payload for terminal:write: must be an object');
    return;
  }

  const { id, data } = payload;

  if (!validateTerminalId(id)) {
    console.error('Invalid terminal id for terminal:write');
    return;
  }

  if (!validateString(data, 100000)) {
    console.error('Invalid data for terminal:write: must be a string (max 100000 chars)');
    return;
  }

  // 檢測是否為開啟新終端的指令
  const detection = detectNewTerminalCommand(data);

  if (detection.shouldIntercept) {
    console.log(`攔截到開啟新終端指令: ${detection.name}`);

    // 發送消息給渲染進程，在應用內創建新標籤
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal:request-new-tab', {
        shell: detection.shell,
        fromCommand: true,
        commandName: detection.name
      });
    }

    // 向當前終端輸出提示訊息
    if (mainWindow && !mainWindow.isDestroyed()) {
      const message = `\r\n\x1b[32m✓ 已在應用內開啟新的 ${detection.name} 標籤\x1b[0m\r\n`;
      mainWindow.webContents.send('terminal:data', { id, data: message });
    }

    // 不將指令傳遞給 shell，阻止系統終端開啟
    return;
  }

  // 正常指令，傳遞給終端
  ptyService.write(id, data);
});

// IPC 通信处理 - 调整终端大小
ipcMain.on('terminal:resize', (event, payload) => {
  // 輸入驗證
  if (!validateObject(payload)) {
    console.error('Invalid payload for terminal:resize: must be an object');
    return;
  }

  const { id, cols, rows } = payload;

  if (!validateTerminalId(id)) {
    console.error('Invalid terminal id for terminal:resize');
    return;
  }

  if (!validatePositiveInteger(cols) || cols > 1000) {
    console.error('Invalid cols for terminal:resize: must be a positive integer (max 1000)');
    return;
  }

  if (!validatePositiveInteger(rows) || rows > 1000) {
    console.error('Invalid rows for terminal:resize: must be a positive integer (max 1000)');
    return;
  }

  ptyService.resize(id, cols, rows);
});

// IPC 通信处理 - 关闭终端
ipcMain.on('terminal:close', (event, payload) => {
  // 輸入驗證
  if (!validateObject(payload)) {
    console.error('Invalid payload for terminal:close: must be an object');
    return;
  }

  const { id } = payload;

  if (!validateTerminalId(id)) {
    console.error('Invalid terminal id for terminal:close');
    return;
  }

  ptyService.closeTerminal(id);
});

// 将 PTY 输出发送到渲染进程
// 注意: onData 和 onExit 返回清理函數，但在此應用中回調應存在於整個應用生命週期
// 如果需要清理，可以保存返回的函數並在適當時候調用:
// const cleanupData = ptyService.onData(...);
// const cleanupExit = ptyService.onExit(...);
// 然後在需要時調用: cleanupData(); cleanupExit();
ptyService.onData((id, data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('terminal:data', { id, data });
  }
});

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
