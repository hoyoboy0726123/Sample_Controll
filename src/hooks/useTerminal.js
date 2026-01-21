import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';

export function useTerminal(terminalId, shell, cwd) {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const isInitializingRef = useRef(false);

  useEffect(() => {
    // 防止重複初始化
    if (!terminalRef.current || xtermRef.current || isInitializingRef.current) return;
    isInitializingRef.current = true;

    let resizeObserver = null;
    let isInitialized = false;
    let initTimer = null;
    let cleanupTerminalData = null;
    let cleanupTerminalExit = null;
    let resizeHandler = null;

    // 等待 DOM 元素有有效尺寸後再初始化
    const checkAndInitialize = () => {
      const element = terminalRef.current;
      if (!element) return;

      const rect = element.getBoundingClientRect();

      // 確保容器有有效的尺寸
      if (rect.width === 0 || rect.height === 0) {
        // 如果尺寸還是 0，稍後重試
        initTimer = setTimeout(checkAndInitialize, 50);
        return;
      }

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
        rows: 24,
        cols: 80,
      });

      // 添加插件
      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      xterm.loadAddon(fitAddon);
      xterm.loadAddon(webLinksAddon);

      // 挂载终端
      xterm.open(element);

      xtermRef.current = xterm;
      fitAddonRef.current = fitAddon;

      // 创建终端实例（与 Electron 通信）
      if (window.electronAPI) {
        window.electronAPI.createTerminal({
          id: terminalId,
          cwd: cwd || undefined,
          shell: shell,
        }).then(() => {
          setIsReady(true);
        });

        // 监听终端数据 - 保存清理函數
        cleanupTerminalData = window.electronAPI.onTerminalData((id, data) => {
          if (id === terminalId && xtermRef.current) {
            xtermRef.current.write(data);
          }
        });

        // 监听终端退出 - 保存清理函數
        cleanupTerminalExit = window.electronAPI.onTerminalExit((id, code) => {
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
      resizeHandler = () => {
        if (!fitAddonRef.current || !xtermRef.current || !terminalRef.current) {
          return;
        }

        try {
          fitAddonRef.current.fit();
          const dims = fitAddonRef.current.proposeDimensions();
          if (dims && window.electronAPI) {
            window.electronAPI.resizeTerminal(terminalId, dims.cols, dims.rows);
          }
        } catch (e) {
          if (isInitialized) {
            console.warn('Failed to fit terminal on resize:', e);
          }
        }
      };

      // 保存 resizeHandler 引用以便清理
      window.addEventListener('resize', resizeHandler);
      resizeObserver = new ResizeObserver(resizeHandler);
      if (terminalRef.current) {
        resizeObserver.observe(terminalRef.current);
      }

      // 初始化时延迟调用 fit()，确保 xterm 内部状态完全初始化
      initTimer = setTimeout(() => {
        isInitialized = true;
        if (resizeHandler) {
          resizeHandler();
        }
      }, 100);
    };

    // 開始檢查和初始化
    checkAndInitialize();

    // 清理
    return () => {
      // 清理計時器
      if (initTimer) {
        clearTimeout(initTimer);
      }

      // 清理 window resize 監聽器（使用保存的引用）
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
      }

      // 清理 ResizeObserver
      if (resizeObserver) {
        resizeObserver.disconnect();
      }

      // 清理 IPC 監聽器
      if (cleanupTerminalData) {
        cleanupTerminalData();
      }
      if (cleanupTerminalExit) {
        cleanupTerminalExit();
      }

      // 清理 xterm 實例
      if (xtermRef.current) {
        xtermRef.current.dispose();
        xtermRef.current = null;
      }

      // 關閉終端
      if (window.electronAPI) {
        window.electronAPI.closeTerminal(terminalId);
      }

      // 重置初始化標誌
      isInitializingRef.current = false;
    };
  }, [terminalId, shell, cwd]);

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
