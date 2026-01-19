import pty from 'node-pty';
import os from 'os';

export function createPtyService() {
  const terminals = new Map();
  const dataCallbacks = [];
  const exitCallbacks = [];

  // 获取默认 shell
  const getDefaultShell = () => {
    if (os.platform() === 'win32') {
      return process.env.COMSPEC || 'cmd.exe';
    }
    return process.env.SHELL || '/bin/bash';
  };

  return {
    // 创建终端
    createTerminal(id, options = {}) {
      if (terminals.has(id)) {
        throw new Error(`Terminal with id ${id} already exists`);
      }

      const shell = options.shell || getDefaultShell();
      const cwd = options.cwd || process.env.HOME || process.env.USERPROFILE || os.homedir();

      const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: options.cols || 80,
        rows: options.rows || 24,
        cwd,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor'
        }
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
