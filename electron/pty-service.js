import pty from 'node-pty';
import os from 'os';
import fs from 'fs';
import path from 'path';

export function createPtyService() {
  const terminals = new Map();
  const dataCallbacks = [];
  const exitCallbacks = [];

  // 获取默认 shell
  const getDefaultShell = () => {
    if (os.platform() === 'win32') {
      return process.env.COMSPEC || 'C:\\Windows\\System32\\cmd.exe';
    }
    return process.env.SHELL || '/bin/bash';
  };

  // 檢查文件是否存在
  const fileExists = (filePath) => {
    try {
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  };

  // Shell 白名單（安全性：只允許常見的可信 shell）
  const ALLOWED_SHELLS_WINDOWS = [
    'C:\\Windows\\System32\\cmd.exe',
    'C:\\Windows\\SysWOW64\\cmd.exe',
    'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    'C:\\Windows\\SysWOW64\\WindowsPowerShell\\v1.0\\powershell.exe',
    'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
    'powershell.exe',
    'pwsh.exe',
    'cmd.exe',
    'bash.exe',
  ];

  const ALLOWED_SHELLS_UNIX = [
    '/bin/bash',
    '/bin/sh',
    '/bin/zsh',
    '/bin/dash',
    '/usr/bin/bash',
    '/usr/bin/zsh',
    '/usr/bin/fish',
    '/bin/fish',
  ];

  // 驗證 shell 路徑是否在白名單中
  const isShellAllowed = (shellPath) => {
    const platform = os.platform();
    const allowedShells = platform === 'win32' ? ALLOWED_SHELLS_WINDOWS : ALLOWED_SHELLS_UNIX;

    // 規範化路徑用於比較
    const normalizedPath = path.resolve(shellPath).toLowerCase();

    // 檢查是否在白名單中
    return allowedShells.some(allowedShell => {
      const normalizedAllowed = path.resolve(allowedShell).toLowerCase();
      return normalizedPath === normalizedAllowed || shellPath.toLowerCase() === allowedShell.toLowerCase();
    });
  };

  // 解析 shell 路徑
  const resolveShell = (shellOption) => {
    const platform = os.platform();

    // 如果是 'auto' 或未指定，使用默認 shell
    if (!shellOption || shellOption === 'auto') {
      return getDefaultShell();
    }

    // Windows 平台
    if (platform === 'win32') {
      switch (shellOption.toLowerCase()) {
        case 'powershell': {
          // 嘗試多個 PowerShell 路徑
          const possiblePaths = [
            'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
            'C:\\Windows\\SysWOW64\\WindowsPowerShell\\v1.0\\powershell.exe',
            path.join(process.env.SystemRoot || 'C:\\Windows', 'System32\\WindowsPowerShell\\v1.0\\powershell.exe')
          ];
          for (const shellPath of possiblePaths) {
            if (fileExists(shellPath)) {
              return shellPath;
            }
          }
          // 如果都找不到，嘗試使用 PATH 中的 powershell.exe
          return 'powershell.exe';
        }
        case 'cmd':
          return process.env.COMSPEC || 'C:\\Windows\\System32\\cmd.exe';
        case 'bash':
        case 'git-bash': {
          // 嘗試查找 Git Bash
          const possiblePaths = [
            'C:\\Program Files\\Git\\bin\\bash.exe',
            'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
            path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Git\\bin\\bash.exe')
          ];
          for (const shellPath of possiblePaths) {
            if (fileExists(shellPath)) {
              return shellPath;
            }
          }
          return 'bash.exe';
        }
        default:
          // 如果是完整路徑，驗證是否在白名單中
          if (fileExists(shellOption)) {
            if (isShellAllowed(shellOption)) {
              return shellOption;
            } else {
              console.warn(`⚠️ Shell 路徑不在白名單中，已拒絕: ${shellOption}`);
              console.warn('使用默認 shell 代替');
              return getDefaultShell();
            }
          }
          // 路徑不存在，使用默認 shell
          console.warn(`Shell 不存在: ${shellOption}，使用默認 shell`);
          return getDefaultShell();
      }
    }

    // Unix-like 平台
    switch (shellOption.toLowerCase()) {
      case 'bash':
        return '/bin/bash';
      case 'zsh':
        return '/bin/zsh';
      case 'fish':
        return '/usr/bin/fish';
      default:
        // 如果是完整路徑，驗證是否在白名單中
        if (fileExists(shellOption)) {
          if (isShellAllowed(shellOption)) {
            return shellOption;
          } else {
            console.warn(`⚠️ Shell 路徑不在白名單中，已拒絕: ${shellOption}`);
            console.warn('使用默認 shell 代替');
            return getDefaultShell();
          }
        }
        // 路徑不存在，使用默認 shell
        console.warn(`Shell 不存在: ${shellOption}，使用默認 shell`);
        return getDefaultShell();
    }
  };

  return {
    // 创建终端
    createTerminal(id, options = {}) {
      try {
        if (terminals.has(id)) {
          throw new Error(`Terminal with id ${id} already exists`);
        }

        const shell = resolveShell(options.shell);
        const cwd = options.cwd || process.env.HOME || process.env.USERPROFILE || os.homedir();

        // 驗證工作目錄是否存在且可訪問
        if (cwd) {
          try {
            const stats = fs.statSync(cwd);
            if (!stats.isDirectory()) {
              throw new Error(`Working directory is not a directory: ${cwd}`);
            }
          } catch (error) {
            console.error(`Invalid working directory: ${cwd}`, error.message);
            throw new Error(`Cannot access working directory: ${cwd}`);
          }
        }

        console.log(`Creating terminal ${id}:`);
        console.log(`  Shell option: ${options.shell}`);
        console.log(`  Resolved shell: ${shell}`);
        console.log(`  Working directory: ${cwd}`);

        const ptyProcess = pty.spawn(shell, [], {
          name: 'xterm-256color',
          cols: options.cols || 80,
          rows: options.rows || 24,
          cwd,
          env: {
            ...process.env,
            TERM: 'xterm-256color',
            COLORTERM: 'truecolor',
            // 禁用 ConPTY 的控制台進程列表獲取，避免 AttachConsole 錯誤
            NODE_PTY_USE_LEGACY: '0'
          },
          // Windows 特定選項
          useConpty: true,
          conptyInheritCursor: false
        });

        // 监听数据输出
        ptyProcess.onData((data) => {
          try {
            dataCallbacks.forEach(callback => callback(id, data));
          } catch (error) {
            console.error(`Error in data callback for terminal ${id}:`, error);
          }
        });

        // 监听进程退出
        ptyProcess.onExit(({ exitCode, signal }) => {
          try {
            exitCallbacks.forEach(callback => callback(id, exitCode));
          } catch (error) {
            console.error(`Error in exit callback for terminal ${id}:`, error);
          } finally {
            terminals.delete(id);
          }
        });

        terminals.set(id, ptyProcess);
        console.log(`Terminal created: ${id}, shell: ${shell}, cwd: ${cwd}`);

        return ptyProcess;
      } catch (error) {
        console.error(`Failed to create terminal ${id}:`, error);
        // 確保清理任何部分創建的資源
        if (terminals.has(id)) {
          terminals.delete(id);
        }
        throw error;
      }
    },

    // 写入数据到终端
    write(id, data) {
      try {
        const terminal = terminals.get(id);
        if (!terminal) {
          console.warn(`Terminal ${id} not found for write operation`);
          return false;
        }
        terminal.write(data);
        return true;
      } catch (error) {
        console.error(`Failed to write to terminal ${id}:`, error);
        return false;
      }
    },

    // 调整终端大小
    resize(id, cols, rows) {
      try {
        const terminal = terminals.get(id);
        if (!terminal) {
          console.warn(`Terminal ${id} not found for resize operation`);
          return false;
        }

        // 驗證尺寸參數
        if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols <= 0 || rows <= 0) {
          console.error(`Invalid terminal dimensions: cols=${cols}, rows=${rows}`);
          return false;
        }

        terminal.resize(cols, rows);
        return true;
      } catch (error) {
        console.error(`Failed to resize terminal ${id}:`, error);
        return false;
      }
    },

    // 关闭终端
    closeTerminal(id) {
      try {
        const terminal = terminals.get(id);
        if (!terminal) {
          console.warn(`Terminal ${id} not found for close operation`);
          return false;
        }

        terminal.kill();
        terminals.delete(id);
        console.log(`Terminal closed: ${id}`);
        return true;
      } catch (error) {
        console.error(`Failed to close terminal ${id}:`, error);
        // 即使 kill() 失敗，也嘗試從 Map 中移除
        terminals.delete(id);
        return false;
      }
    },

    // 注册数据回调 - 返回清理函數
    onData(callback) {
      if (typeof callback !== 'function') {
        throw new TypeError('Callback must be a function');
      }
      dataCallbacks.push(callback);

      // 返回清理函數
      return () => {
        const index = dataCallbacks.indexOf(callback);
        if (index > -1) {
          dataCallbacks.splice(index, 1);
        }
      };
    },

    // 注册退出回调 - 返回清理函數
    onExit(callback) {
      if (typeof callback !== 'function') {
        throw new TypeError('Callback must be a function');
      }
      exitCallbacks.push(callback);

      // 返回清理函數
      return () => {
        const index = exitCallbacks.indexOf(callback);
        if (index > -1) {
          exitCallbacks.splice(index, 1);
        }
      };
    },

    // 获取所有终端
    getAllTerminals() {
      return Array.from(terminals.keys());
    }
  };
}
