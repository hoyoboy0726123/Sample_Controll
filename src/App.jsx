import { useState, useEffect, useCallback } from 'react';
import TabBar from './components/TabBar';
import Terminal from './components/Terminal';
import SplitView from './components/SplitView';
import NewTerminalDialog from './components/NewTerminalDialog';
import SettingsPanel from './components/SettingsPanel';
import ProjectGroupsManager from './components/ProjectGroupsManager';
import { Settings, Moon, Sun, FolderOpen } from 'lucide-react';

let terminalIdCounter = 0;

function App() {
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
  });

  // 加载设置
  useEffect(() => {
    const savedSettings = localStorage.getItem('terminalSettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSettings(parsed);
      setTheme(parsed.theme);
    }
  }, []);

  // 创建初始终端
  useEffect(() => {
    createNewTab();
  }, []);

  // 创建新标签页
  const createNewTab = useCallback((options = {}) => {
    const id = `terminal-${terminalIdCounter++}`;
    const shell = options.shell === 'auto' || !options.shell
      ? (settings.defaultShell === 'auto' ? undefined : settings.defaultShell)
      : options.shell;

    const newTab = {
      id,
      title: `Terminal ${terminalIdCounter}`,
      shell,
      cwd: options.cwd,
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(id);
  }, [settings.defaultShell]);

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
    const activeTab = tabs.find((tab) => tab.id === activeTabId);
    if (!activeTab) return null;

    if (splitMode && tabs.length >= 2) {
      // 分屏模式：显示当前标签和下一个标签
      const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
      const nextIndex = (currentIndex + 1) % tabs.length;
      const nextTab = tabs[nextIndex];

      return (
        <SplitView>
          <Terminal
            key={activeTab.id}
            id={activeTab.id}
            shell={activeTab.shell}
            cwd={activeTab.cwd}
            isActive={true}
            onFocus={() => selectTab(activeTab.id)}
          />
          <Terminal
            key={nextTab.id}
            id={nextTab.id}
            shell={nextTab.shell}
            cwd={nextTab.cwd}
            isActive={false}
            onFocus={() => selectTab(nextTab.id)}
          />
        </SplitView>
      );
    }

    // 单屏模式：只显示当前活动标签
    return (
      <Terminal
        key={activeTab.id}
        id={activeTab.id}
        shell={activeTab.shell}
        cwd={activeTab.cwd}
        isActive={true}
        onFocus={() => selectTab(activeTab.id)}
      />
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
