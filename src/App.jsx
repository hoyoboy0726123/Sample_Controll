import { useState, useEffect, useCallback, useRef } from 'react';
import TabBar from './components/TabBar';
import Terminal from './components/Terminal';
import SplitView from './components/SplitView';
import NewTerminalDialog from './components/NewTerminalDialog';
import SettingsPanel from './components/SettingsPanel';
import ProjectGroupsManager from './components/ProjectGroupsManager';
import { Settings, Moon, Sun, FolderOpen } from 'lucide-react';

function App() {
  // 使用 useRef 而非模組級變量，避免競態條件
  const terminalIdCounterRef = useRef(0);

  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [splitMode, setSplitMode] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [showNewTerminalDialog, setShowNewTerminalDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProjectGroups, setShowProjectGroups] = useState(false);
  const [settings, setSettings] = useState({
    defaultShell: 'auto',
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    theme: 'dark',
    restoreSession: false, // 默認關閉會話恢復，避免問題
  });

  // 🔒 安全性：驗證 tab 數據結構
  const validateTabData = useCallback((tab) => {
    if (!tab || typeof tab !== 'object') return false;

    // 驗證必需欄位
    if (typeof tab.id !== 'string' || tab.id.length === 0 || tab.id.length > 256) {
      return false;
    }

    // 驗證可選欄位
    if (tab.shell !== undefined && typeof tab.shell !== 'string') {
      return false;
    }
    if (tab.cwd !== undefined && (typeof tab.cwd !== 'string' || tab.cwd.length > 1000)) {
      return false;
    }
    if (tab.title !== undefined && (typeof tab.title !== 'string' || tab.title.length > 256)) {
      return false;
    }

    // 🔒 安全性：不恢復命令（避免自動執行惡意命令）
    // tab.command 會被忽略，不會在會話恢復時執行

    return true;
  }, []);

  // 🔒 安全性：清理和驗證會話數據
  const sanitizeSession = useCallback((session) => {
    if (!session || typeof session !== 'object') {
      return null;
    }

    // 驗證並清理 tabs
    const tabs = Array.isArray(session.tabs)
      ? session.tabs
          .filter(validateTabData)
          .map(tab => ({
            id: tab.id,
            title: tab.title || 'Terminal',
            shell: tab.shell,
            cwd: tab.cwd,
            // 🔒 安全性：不恢復 command，防止自動執行惡意命令
            command: undefined,
          }))
      : [];

    // 驗證 activeTabId
    const activeTabId = typeof session.activeTabId === 'string'
      && tabs.some(t => t.id === session.activeTabId)
      ? session.activeTabId
      : null;

    // 驗證 terminalIdCounter
    const terminalIdCounter = Number.isInteger(session.terminalIdCounter)
      && session.terminalIdCounter >= 0
      && session.terminalIdCounter < 10000
      ? session.terminalIdCounter
      : 0;

    return {
      tabs,
      activeTabId,
      terminalIdCounter,
    };
  }, [validateTabData]);

  // 创建新标签页
  const createNewTab = useCallback((options = {}) => {
    const id = `terminal-${terminalIdCounterRef.current++}`;
    const shell = options.shell === 'auto' || !options.shell
      ? (settings.defaultShell === 'auto' ? undefined : settings.defaultShell)
      : options.shell;

    const newTab = {
      id,
      title: `Terminal ${terminalIdCounterRef.current}`,
      shell,
      cwd: options.cwd,
      command: options.command, // 要在新終端執行的命令
    };

    // 直接同步更新狀態（移除 setTimeout 避免競態條件）
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(id);
  }, [settings.defaultShell]);

  // 載入設定並恢復會話
  useEffect(() => {
    // 先載入設定
    let savedSettings = null;
    try {
      savedSettings = localStorage.getItem('terminalSettings');
    } catch (error) {
      console.error('無法訪問 localStorage (terminalSettings):', error);
    }

    let shouldRestoreSession = false; // 預設關閉

    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
        setTheme(parsed.theme);
        shouldRestoreSession = parsed.restoreSession === true; // 只有明確設定為 true 才恢復
      } catch (error) {
        console.error('載入設定失敗:', error);
      }
    }

    // 根據設定決定是否恢復會話
    if (shouldRestoreSession) {
      let savedSession = null;
      try {
        savedSession = localStorage.getItem('lastSession');
      } catch (error) {
        console.error('無法訪問 localStorage (lastSession):', error);
      }

      if (savedSession) {
        try {
          const rawSession = JSON.parse(savedSession);

          // 🔒 安全性：使用 sanitizeSession 驗證和清理數據
          const session = sanitizeSession(rawSession);

          if (session && session.tabs.length > 0) {
            // 恢復終端機計數器
            terminalIdCounterRef.current = session.terminalIdCounter;

            // 恢復所有終端機標籤
            setTabs(session.tabs);
            setActiveTabId(session.activeTabId || session.tabs[0].id);

            console.log(`✅ 已恢復 ${session.tabs.length} 個終端機標籤（已驗證安全性）`);
            return; // 成功恢復會話，不需要創建新終端機
          } else {
            console.warn('會話數據無效或為空，創建新終端機');
          }
        } catch (error) {
          console.error('恢復會話失敗:', error);
        }
      }
    }

    // 如果不恢復會話、沒有保存的會話或恢復失敗，創建新終端機
    createNewTab();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在掛載時執行一次，不需要依賴 createNewTab

  // 自動保存會話（當終端機標籤改變時）
  useEffect(() => {
    // 只有在有終端機時才保存
    if (tabs.length > 0) {
      const session = {
        tabs,
        activeTabId,
        terminalIdCounter: terminalIdCounterRef.current,
        timestamp: Date.now()
      };

      try {
        localStorage.setItem('lastSession', JSON.stringify(session));
      } catch (error) {
        // 可能是 QuotaExceededError 或 localStorage 不可用
        console.error('無法保存會話到 localStorage:', error);
        if (error.name === 'QuotaExceededError') {
          console.warn('localStorage 空間已滿，嘗試清理舊數據');
          try {
            // 嘗試清除舊的會話數據並重試
            localStorage.removeItem('lastSession');
            localStorage.setItem('lastSession', JSON.stringify(session));
          } catch (retryError) {
            console.error('清理後仍無法保存:', retryError);
          }
        }
      }
    }
  }, [tabs, activeTabId]);

  // 監聽終端內的新標籤請求（從指令觸發）
  useEffect(() => {
    if (!window.electronAPI?.onRequestNewTab) {
      return;
    }

    const cleanup = window.electronAPI.onRequestNewTab((options) => {
      console.log('收到新建標籤請求:', options);

      // 使用指定的 shell、工作目錄和命令創建新標籤
      createNewTab({
        shell: options.shell || 'auto',
        cwd: options.cwd || undefined,
        command: options.command || undefined // 要在新終端執行的命令
      });
    });

    return cleanup;
  }, [createNewTab]);

  // 显示新建终端对话框
  const handleNewTabClick = useCallback(() => {
    setShowNewTerminalDialog(true);
  }, []);

  // 从对话框创建终端
  const handleCreateTerminal = useCallback((options) => {
    createNewTab(options);
  }, [createNewTab]);

  // 打開項目組（同時打開多個終端機）
  const handleOpenProjectGroup = useCallback((group) => {
    group.terminals.forEach((terminal) => {
      createNewTab({
        shell: terminal.shell === 'auto' ? undefined : terminal.shell,
        cwd: terminal.path
      });
    });
  }, [createNewTab]);

  // 关闭标签页
  const closeTab = useCallback((id) => {
    setTabs((prev) => {
      const newTabs = prev.filter((tab) => tab.id !== id);

      // 如果关闭的是当前活动标签，切换到其他标签
      if (id === activeTabId && newTabs.length > 0) {
        setActiveTabId(newTabs[newTabs.length - 1].id);
      }

      // 如果没有标签了，创建一个新的
      if (newTabs.length === 0) {
        setTimeout(createNewTab, 0);
      }

      return newTabs;
    });
  }, [activeTabId, createNewTab]);

  // 切换标签
  const selectTab = useCallback((id) => {
    setActiveTabId(id);
  }, []);

  // 切换分屏模式
  const toggleSplitMode = useCallback(() => {
    setSplitMode((prev) => !prev);
  }, []);

  // 切换主题
  const toggleTheme = useCallback(() => {
    setTheme((prev) => prev === 'dark' ? 'light' : 'dark');
  }, []);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+T: 新建终端
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        handleNewTabClick();
      }

      // Ctrl+W: 关闭当前终端
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        if (activeTabId) {
          closeTab(activeTabId);
        }
      }

      // Ctrl+\: 切换分屏
      if (e.ctrlKey && e.key === '\\') {
        e.preventDefault();
        toggleSplitMode();
      }

      // Ctrl+数字键: 切换到对应标签
      if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (tabs[index]) {
          selectTab(tabs[index].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, tabs, handleNewTabClick, closeTab, toggleSplitMode, selectTab]);

  // 渲染终端
  const renderTerminals = () => {
    if (tabs.length === 0) return null;

    if (splitMode && tabs.length >= 2) {
      // 分屏模式：显示当前标签和下一个标签
      const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
      const nextIndex = (currentIndex + 1) % tabs.length;
      const nextTab = tabs[nextIndex];
      const activeTab = tabs[currentIndex];

      return (
        <>
          {/* 渲染所有終端以保持狀態 */}
          <div className="hidden">
            {tabs.map((tab) => {
              // 跳過已在分屏中顯示的終端
              if (tab.id === activeTab.id || tab.id === nextTab.id) return null;
              return (
                <Terminal
                  key={tab.id}
                  id={tab.id}
                  shell={tab.shell}
                  cwd={tab.cwd}
                  command={tab.command}
                  isActive={false}
                  onFocus={() => selectTab(tab.id)}
                />
              );
            })}
          </div>

          {/* 顯示分屏終端 */}
          <SplitView>
            <Terminal
              key={activeTab.id}
              id={activeTab.id}
              shell={activeTab.shell}
              cwd={activeTab.cwd}
              command={activeTab.command}
              isActive={true}
              onFocus={() => selectTab(activeTab.id)}
            />
            <Terminal
              key={nextTab.id}
              id={nextTab.id}
              shell={nextTab.shell}
              cwd={nextTab.cwd}
              command={nextTab.command}
              isActive={false}
              onFocus={() => selectTab(nextTab.id)}
            />
          </SplitView>
        </>
      );
    }

    // 单屏模式：渲染所有终端，但只显示活动的
    // 使用 CSS 隐藏而不是卸载，保持终端状态
    return (
      <div className="h-full w-full relative">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className="absolute inset-0"
            style={{ display: tab.id === activeTabId ? 'block' : 'none' }}
          >
            <Terminal
              id={tab.id}
              shell={tab.shell}
              cwd={tab.cwd}
              command={tab.command}
              isActive={tab.id === activeTabId}
              onFocus={() => selectTab(tab.id)}
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-screen ${theme === 'dark' ? 'bg-terminal-bg' : 'bg-white'}`}>
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between bg-[#2d2d2d] border-b border-[#3e3e3e] px-4 h-10">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-sm">Terminal Manager</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="p-2 text-gray-400 hover:text-white hover:bg-[#363636] rounded transition-colors"
            onClick={toggleSplitMode}
            title="切换分屏 (Ctrl+\)"
          >
            <div className="flex gap-1">
              <div className={`w-3 h-3 border ${splitMode ? 'border-blue-500' : 'border-gray-400'}`} />
              <div className={`w-3 h-3 border ${splitMode ? 'border-blue-500' : 'border-gray-400'}`} />
            </div>
          </button>

          <button
            className="p-2 text-gray-400 hover:text-white hover:bg-[#363636] rounded transition-colors"
            onClick={() => setShowProjectGroups(true)}
            title="專案群組"
          >
            <FolderOpen size={16} />
          </button>

          <button
            className="p-2 text-gray-400 hover:text-white hover:bg-[#363636] rounded transition-colors"
            onClick={toggleTheme}
            title="切換主題"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button
            className="p-2 text-gray-400 hover:text-white hover:bg-[#363636] rounded transition-colors"
            onClick={() => setShowSettings(true)}
            title="設定"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* 标签栏 */}
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabSelect={selectTab}
        onTabClose={closeTab}
        onNewTab={handleNewTabClick}
      />

      {/* 终端内容区域 */}
      <div className="flex-1 overflow-hidden">
        {renderTerminals()}
      </div>

      {/* 底部狀態列 */}
      <div className="flex items-center justify-between bg-[#007acc] px-4 h-6 text-white text-xs">
        <div className="flex items-center gap-4">
          <span>終端機: {tabs.length}</span>
          <span>活動: {activeTabId}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>模式: {splitMode ? '分屏' : '單屏'}</span>
          <span>主題: {theme === 'dark' ? '深色' : '淺色'}</span>
        </div>
      </div>

      {/* 对话框 */}
      <NewTerminalDialog
        isOpen={showNewTerminalDialog}
        onClose={() => setShowNewTerminalDialog(false)}
        onConfirm={handleCreateTerminal}
        defaultShell={settings.defaultShell}
        defaultPath=""
      />

      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={(newSettings) => {
          setSettings(newSettings);
          setTheme(newSettings.theme);
        }}
      />

      <ProjectGroupsManager
        isOpen={showProjectGroups}
        onClose={() => setShowProjectGroups(false)}
        onOpenGroup={handleOpenProjectGroup}
      />
    </div>
  );
}

export default App;
