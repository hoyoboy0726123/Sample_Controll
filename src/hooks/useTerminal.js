import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';

export function useTerminal(terminalId) {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    // 创建 xterm 实例
    const xterm = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
        selection: '#264f78',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      },
      allowTransparency: true,
      scrollback: 10000,
    });

    // 添加插件
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);

    // 挂载终端
    xterm.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // 创建终端实例（与 Electron 通信）
    if (window.electronAPI) {
      window.electronAPI.createTerminal({
        id: terminalId,
        cwd: process.env.HOME || process.env.USERPROFILE,
      }).then(() => {
        setIsReady(true);
      });

      // 监听终端数据
      window.electronAPI.onTerminalData((id, data) => {
        if (id === terminalId && xtermRef.current) {
          xtermRef.current.write(data);
        }
      });

      // 监听终端退出
      window.electronAPI.onTerminalExit((id, code) => {
        if (id === terminalId && xtermRef.current) {
          xtermRef.current.write(`\r\n\x1b[31mProcess exited with code ${code}\x1b[0m\r\n`);
        }
      });

      // 监听用户输入
      xterm.onData((data) => {
        window.electronAPI.writeToTerminal(terminalId, data);
      });
    }

    // 窗口大小改变时自适应
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit();
        const dims = fitAddonRef.current.proposeDimensions();
        if (dims && window.electronAPI) {
          window.electronAPI.resizeTerminal(terminalId, dims.cols, dims.rows);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    // 清理
    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      if (xtermRef.current) {
        xtermRef.current.dispose();
        xtermRef.current = null;
      }
      if (window.electronAPI) {
        window.electronAPI.closeTerminal(terminalId);
      }
    };
  }, [terminalId]);

  const focus = () => {
    if (xtermRef.current) {
      xtermRef.current.focus();
    }
  };

  const clear = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
    }
  };

  return {
    terminalRef,
    isReady,
    focus,
    clear,
  };
}
