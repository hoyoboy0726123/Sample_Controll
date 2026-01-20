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
          // 如果是完整路徑，直接返回
          return shellOption;
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
        return shellOption;
    }
  };

  return {
    // 创建终端
    createTerminal(id, options = {}) {
      if (terminals.has(id)) {
        throw new Error(`Terminal with id ${id} already exists`);
      }

      const shell = resolveShell(options.shell);
      const cwd = options.cwd || process.env.HOME || process.env.USERPROFILE || os.homedir();

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
          COLORTERM: 'truecolor'
        },
        // Windows 特定選項：避免 AttachConsole 錯誤
        useConpty: true,
        conptyInheritCursor: false
      });

      // 监听数据输出
      ptyProcess.onData((data) => {
        dataCallbacks.forEach(callback => callback(id, data));
      });

      // 监听进程退出
      ptyProcess.onExit(({ exitCode, signal }) => {
        exitCallbacks.forEach(callback => callback(id, exitCode));
        terminals.delete(id);
      });

      terminals.set(id, ptyProcess);
      console.log(`Terminal created: ${id}, shell: ${shell}, cwd: ${cwd}`);

      return ptyProcess;
    },

    // 写入数据到终端
    write(id, data) {
      const terminal = terminals.get(id);
      if (terminal) {
        terminal.write(data);
      } else {
        console.warn(`Terminal ${id} not found`);
      }
    },

    // 调整终端大小
    resize(id, cols, rows) {
      const terminal = terminals.get(id);
      if (terminal) {
        terminal.resize(cols, rows);
      } else {
        console.warn(`Terminal ${id} not found`);
      }
    },

    // 关闭终端
    closeTerminal(id) {
      const terminal = terminals.get(id);
      if (terminal) {
        terminal.kill();
        terminals.delete(id);
        console.log(`Terminal closed: ${id}`);
      }
    },

    // 注册数据回调
    onData(callback) {
      dataCallbacks.push(callback);
    },

    // 注册退出回调
    onExit(callback) {
      exitCallbacks.push(callback);
    },

    // 获取所有终端
    getAllTerminals() {
      return Array.from(terminals.keys());
    }
  };
}
