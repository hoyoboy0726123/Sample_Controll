import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';

// 🔒 驗證常數
const VALIDATION = {
  COMMAND_MAX_LENGTH: 10000,
  SCROLLBACK_BUFFER: 10000,
  COMMAND_EXEC_DELAY: 500, // ms
};

export function useTerminal(terminalId, shell, cwd, command) {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const isInitializingRef = useRef(false);
  const commandExecutedRef = useRef(false); // 追蹤命令是否已執行
  const isUnmountingRef = useRef(false); // 追蹤組件是否正在卸載（用戶主動關閉）

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
        scrollback: VALIDATION.SCROLLBACK_BUFFER,
        rows: 24,
        cols: 80,
        windowsMode: true, // 啟用 Windows 模式以改善 IME 支援
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

          // 如果有命令需要執行，在終端就緒後執行
          if (command && !commandExecutedRef.current) {
            commandExecutedRef.current = true;

            // 延遲執行命令，確保終端完全初始化
            setTimeout(() => {
              if (window.electronAPI) {
                // 安全性驗證：檢查命令
                if (typeof command !== 'string') {
                  console.error('命令必須是字符串類型');
                  return;
                }

                // 長度限制：防止過長命令
                if (command.length > VALIDATION.COMMAND_MAX_LENGTH) {
                  console.error(`命令過長，已拒絕執行（最大 ${VALIDATION.COMMAND_MAX_LENGTH} 字符）`);
                  return;
                }

                // 危險命令檢測：警告潛在危險命令
                const dangerousPatterns = [
                  /rm\s+-rf\s+\/\s*$/i,           // rm -rf /
                  /format\s+[A-Z]:\s*$/i,         // format C:
                  /del\s+\/[SF]/i,                // del /S /F
                  /mkfs\./i,                      // mkfs.ext4 等
                  />>\s*\/dev\/sd[a-z]/i,         // 直接寫入磁碟設備
                ];

                const isDangerous = dangerousPatterns.some(pattern => pattern.test(command));
                if (isDangerous) {
                  console.warn(`⚠️ 檢測到潛在危險命令: ${command}`);
                  console.warn('此命令可能導致數據損失，已記錄但仍會執行');
                  // 不阻止執行，因為可能是合法用途，但記錄警告
                }

                console.log(`在終端 ${terminalId} 中執行命令: ${command}`);
                // 發送命令加上 Enter 鍵
                window.electronAPI.writeToTerminal(terminalId, command + '\r');
              }
            }, VALIDATION.COMMAND_EXEC_DELAY); // 延遲確保終端準備好
          }
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
            // 如果組件正在卸載（用戶主動關閉標籤），不處理退出事件
            if (isUnmountingRef.current) {
              console.log(`Terminal ${id} exiting due to unmount, skip restart`);
              return;
            }

            // 根據退出碼決定訊息顏色和文字
            let message, color;

            // 正常退出碼（不顯示為錯誤）
            const normalExitCodes = [
              0,                // 正常退出
              -1073741510,      // Windows Ctrl+C (0xC000013A)
              130,              // Unix Ctrl+C
              1,                // 一般錯誤（常見，不算嚴重）
            ];

            if (normalExitCodes.includes(code)) {
              // 正常退出 - 灰色
              color = '\x1b[90m';  // 灰色
              if (code === 0) {
                message = `Process exited successfully`;
              } else if (code === -1073741510 || code === 130) {
                message = `Process interrupted (Ctrl+C)`;
              } else {
                message = `Process exited with code ${code}`;
              }
            } else {
              // 異常退出 - 紅色
              color = '\x1b[31m';  // 紅色
              message = `⚠️ Process exited with error code ${code}`;
            }

            xtermRef.current.write(`\r\n${color}${message}\x1b[0m\r\n`);

            // 🔧 自動重啟 shell（就像真正的終端）
            // 延遲 500ms 讓用戶看到退出訊息
            setTimeout(() => {
              // 再次檢查是否正在卸載
              if (isUnmountingRef.current || !xtermRef.current) {
                return;
              }

              console.log(`Auto-restarting shell for terminal ${terminalId}`);

              // 重新創建終端進程
              window.electronAPI.createTerminal({
                id: terminalId,
                cwd: cwd || undefined,
                shell: shell,
              }).then(() => {
                if (xtermRef.current) {
                  // Shell 重啟成功，顯示提示
                  xtermRef.current.write(`\x1b[90m[Shell restarted. Press Enter to continue]\x1b[0m\r\n`);
                  setIsReady(true);
                }
              }).catch(err => {
                console.error('Failed to restart shell:', err);
                if (xtermRef.current) {
                  xtermRef.current.write(`\x1b[31m[Failed to restart shell: ${err.message}]\x1b[0m\r\n`);
                }
              });
            }, 500);
          }
        });

        // 监听用户输入
        xterm.onData((data) => {
          window.electronAPI.writeToTerminal(terminalId, data);
        });

        // 添加複製貼上功能
        xterm.attachCustomKeyEventHandler((event) => {
          // Ctrl+C: 如果有選中文字則複製，否則發送中斷信號
          if (event.ctrlKey && event.key === 'c' && event.type === 'keydown') {
            const selection = xterm.getSelection();
            if (selection) {
              // 有選中文字，複製到剪貼板
              navigator.clipboard.writeText(selection).catch(err => {
                console.error('複製失敗:', err);
              });
              return false; // 阻止默認行為
            }
            // 沒有選中文字，讓 Ctrl+C 正常發送中斷信號
            return true;
          }

          // Ctrl+V: 貼上剪貼板內容
          if (event.ctrlKey && event.key === 'v' && event.type === 'keydown') {
            event.preventDefault();
            navigator.clipboard.readText().then(text => {
              if (text && window.electronAPI) {
                window.electronAPI.writeToTerminal(terminalId, text);
              }
            }).catch(err => {
              console.error('貼上失敗:', err);
            });
            return false; // 阻止默認行為
          }

          // Ctrl+Shift+C: 強制複製（備用方案）
          if (event.ctrlKey && event.shiftKey && event.key === 'C' && event.type === 'keydown') {
            const selection = xterm.getSelection();
            if (selection) {
              navigator.clipboard.writeText(selection).catch(err => {
                console.error('複製失敗:', err);
              });
            }
            return false;
          }

          // Ctrl+Shift+V: 強制貼上（備用方案）
          if (event.ctrlKey && event.shiftKey && event.key === 'V' && event.type === 'keydown') {
            event.preventDefault();
            navigator.clipboard.readText().then(text => {
              if (text && window.electronAPI) {
                window.electronAPI.writeToTerminal(terminalId, text);
              }
            }).catch(err => {
              console.error('貼上失敗:', err);
            });
            return false;
          }

          // 其他按鍵正常處理
          return true;
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

    // 清理（重構：按順序清理，避免重複代碼）
    return () => {
      // 0. 設置卸載標誌（防止自動重啟）
      isUnmountingRef.current = true;

      // 1. 清理計時器
      if (initTimer) {
        clearTimeout(initTimer);
      }

      // 2. 清理 window resize 監聽器
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
      }

      // 3. 清理 ResizeObserver（只保留一次）
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }

      // 4. 清理 IPC 監聽器
      if (cleanupTerminalData) {
        cleanupTerminalData();
      }
      if (cleanupTerminalExit) {
        cleanupTerminalExit();
      }

      // 5. 清理 xterm 實例
      if (xtermRef.current) {
        try {
          xtermRef.current.dispose();
        } catch (err) {
          console.warn('清理 xterm 時發生錯誤:', err);
        }
        xtermRef.current = null;
      }

      // 6. 延遲關閉終端（減少 AttachConsole 錯誤）
      if (window.electronAPI) {
        setTimeout(() => {
          try {
            window.electronAPI.closeTerminal(terminalId);
          } catch (err) {
            console.warn('關閉終端時發生錯誤（可忽略）:', err);
          }
        }, 100);
      }

      // 7. 重置初始化標誌
      isInitializingRef.current = false;
    };
  }, [terminalId, shell, cwd]);

  // 🔒 修復內存洩漏：當 command 變化時重置執行標誌
  useEffect(() => {
    // 重置命令執行標誌，允許新命令執行
    commandExecutedRef.current = false;
  }, [command]);

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
