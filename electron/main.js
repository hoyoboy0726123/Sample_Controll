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

  // 🔒 設置 Content Security Policy (CSP)
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          // 只允許來自同源和 localhost 的資源
          "default-src 'self'; " +
          // 允許內聯樣式（Tailwind CSS 需要），但不允許 eval
          "style-src 'self' 'unsafe-inline'; " +
          // 只允許來自自身的腳本
          "script-src 'self'; " +
          // 允許圖片來自 self 和 data URIs
          "img-src 'self' data:; " +
          // 允許連接到 localhost（Vite HMR）和 self
          "connect-src 'self' ws://localhost:* http://localhost:*; " +
          // 允許字體來自 self 和 data URIs
          "font-src 'self' data:;"
        ]
      }
    });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 🔒 保存事件監聽器清理函數
let cleanupDataCallback = null;
let cleanupExitCallback = null;

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

// 🔒 應用退出前清理事件監聽器
app.on('before-quit', () => {
  console.log('清理事件監聽器...');

  // 清理 PTY 服務的事件監聽器
  if (cleanupDataCallback) {
    cleanupDataCallback();
    cleanupDataCallback = null;
  }

  if (cleanupExitCallback) {
    cleanupExitCallback();
    cleanupExitCallback = null;
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
// 注意：只攔截會開啟新視窗的指令，不攔截在當前終端啟動子 shell 的指令
function detectNewTerminalCommand(data) {
  // 🔒 安全性：防止 ReDoS 攻擊，限制輸入長度
  if (typeof data !== 'string') {
    return { shouldIntercept: false };
  }

  // 超過 5000 字符的命令不進行匹配（防止 ReDoS）
  if (data.length > 5000) {
    console.warn('命令過長，跳過檢測（防止 ReDoS）');
    return { shouldIntercept: false };
  }

  const trimmed = data.trim();

  // Windows 指令 - 解析並提取參數
  // start cmd /k <command> - 執行命令後保持視窗開啟
  const startCmdMatch = trimmed.match(/^start\s+cmd\s+\/k\s+(.+)/i);
  if (startCmdMatch) {
    return {
      shouldIntercept: true,
      shell: 'cmd.exe',
      name: 'CMD',
      command: startCmdMatch[1],
      originalCommand: data
    };
  }

  // start cmd /c <command> - 執行命令後關閉視窗（通常不需要新視窗，但也處理）
  const startCmdCMatch = trimmed.match(/^start\s+cmd\s+\/c\s+(.+)/i);
  if (startCmdCMatch) {
    return {
      shouldIntercept: true,
      shell: 'cmd.exe',
      name: 'CMD',
      command: startCmdCMatch[1],
      originalCommand: data
    };
  }

  // start cmd (無參數)
  if (/^start\s+cmd\b/i.test(trimmed)) {
    return {
      shouldIntercept: true,
      shell: 'cmd.exe',
      name: 'CMD',
      originalCommand: data
    };
  }

  // start powershell -NoExit -Command "<command>"
  const startPsMatch = trimmed.match(/^start\s+powershell\s+(?:-NoExit\s+)?-Command\s+["'](.+?)["']/i);
  if (startPsMatch) {
    return {
      shouldIntercept: true,
      shell: 'powershell.exe',
      name: 'PowerShell',
      command: startPsMatch[1],
      originalCommand: data
    };
  }

  // start powershell (無參數)
  if (/^start\s+powershell\b/i.test(trimmed)) {
    return {
      shouldIntercept: true,
      shell: 'powershell.exe',
      name: 'PowerShell',
      originalCommand: data
    };
  }

  // start pwsh
  if (/^start\s+pwsh\b/i.test(trimmed)) {
    return {
      shouldIntercept: true,
      shell: 'powershell.exe',
      name: 'PowerShell Core',
      originalCommand: data
    };
  }

  // wt -d <directory> <command>
  const wtDirMatch = trimmed.match(/^wt(?:\.exe)?\s+-d\s+(\S+)\s+(.+)/i);
  if (wtDirMatch) {
    return {
      shouldIntercept: true,
      shell: 'auto',
      name: 'Windows Terminal',
      cwd: wtDirMatch[1].replace(/['"]/g, ''), // 移除引號
      command: wtDirMatch[2],
      originalCommand: data
    };
  }

  // wt <command>
  const wtMatch = trimmed.match(/^wt(?:\.exe)?\s+(.+)/i);
  if (wtMatch) {
    return {
      shouldIntercept: true,
      shell: 'auto',
      name: 'Windows Terminal',
      command: wtMatch[1],
      originalCommand: data
    };
  }

  // wt (無參數)
  if (/^wt(?:\.exe)?\s*$/i.test(trimmed)) {
    return {
      shouldIntercept: true,
      shell: 'auto',
      name: 'Windows Terminal',
      originalCommand: data
    };
  }

  // Linux/Mac 指令
  // gnome-terminal -- <command>
  const gnomeMatch = trimmed.match(/^gnome-terminal\s+--\s+(.+)/i);
  if (gnomeMatch) {
    return {
      shouldIntercept: true,
      shell: 'bash',
      name: 'GNOME Terminal',
      command: gnomeMatch[1],
      originalCommand: data
    };
  }

  // 其他 Linux 終端（基本支援）
  const unixCommands = [
    { pattern: /^gnome-terminal\b/i, shell: 'bash', name: 'GNOME Terminal' },
    { pattern: /^konsole\b/i, shell: 'bash', name: 'Konsole' },
    { pattern: /^xterm\b/i, shell: 'bash', name: 'XTerm' },
    { pattern: /^kitty\b/i, shell: 'bash', name: 'Kitty' },
    { pattern: /^alacritty\b/i, shell: 'bash', name: 'Alacritty' },
    { pattern: /^x-terminal-emulator\b/i, shell: 'bash', name: 'Terminal' },
  ];

  for (const cmd of unixCommands) {
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

// 注意：以下指令不會被攔截，保持標準 OS 行為
// - cmd (在當前終端啟動 CMD 子 shell)
// - powershell (在當前終端啟動 PowerShell 子 shell)
// - bash (在當前終端啟動 Bash 子 shell)
// - 其他不會開啟新視窗的指令

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
    if (detection.command) {
      console.log(`  要執行的命令: ${detection.command}`);
    }
    if (detection.cwd) {
      console.log(`  工作目錄: ${detection.cwd}`);
    }

    // 發送消息給渲染進程，在應用內創建新標籤
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal:request-new-tab', {
        shell: detection.shell,
        command: detection.command,  // 要在新終端執行的命令
        cwd: detection.cwd,          // 工作目錄
        fromCommand: true,
        commandName: detection.name
      });
    }

    // 向當前終端輸出提示訊息
    if (mainWindow && !mainWindow.isDestroyed()) {
      let message = `\r\n\x1b[32m✓ 已在應用內開啟新的 ${detection.name} 標籤\x1b[0m`;
      if (detection.command) {
        message += `\x1b[90m (執行: ${detection.command})\x1b[0m`;
      }
      message += '\r\n';
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
// 🔒 保存清理函數以便應用退出時清理
cleanupDataCallback = ptyService.onData((id, data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('terminal:data', { id, data });
  }
});

cleanupExitCallback = ptyService.onExit((id, code) => {
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
