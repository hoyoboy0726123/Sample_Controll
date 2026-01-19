import { useState, useEffect, useCallback } from 'react';
import TabBar from './components/TabBar';
import Terminal from './components/Terminal';
import SplitView from './components/SplitView';
import { Settings, Moon, Sun } from 'lucide-react';

let terminalIdCounter = 0;

function App() {
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [splitMode, setSplitMode] = useState(false);
  const [theme, setTheme] = useState('dark');

  // 创建初始终端
  useEffect(() => {
    createNewTab();
  }, []);

  // 创建新标签页
  const createNewTab = useCallback(() => {
    const id = `terminal-${terminalIdCounter++}`;
    const newTab = {
      id,
      title: `Terminal ${terminalIdCounter}`,
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(id);
  }, []);

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
        createNewTab();
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
  }, [activeTabId, tabs, createNewTab, closeTab, toggleSplitMode, selectTab]);

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
            isActive={true}
            onFocus={() => selectTab(activeTab.id)}
          />
          <Terminal
            key={nextTab.id}
            id={nextTab.id}
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
            onClick={toggleTheme}
            title="切换主题"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button
            className="p-2 text-gray-400 hover:text-white hover:bg-[#363636] rounded transition-colors"
            title="设置"
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
        onNewTab={createNewTab}
      />

      {/* 终端内容区域 */}
      <div className="flex-1 overflow-hidden">
        {renderTerminals()}
      </div>

      {/* 底部状态栏 */}
      <div className="flex items-center justify-between bg-[#007acc] px-4 h-6 text-white text-xs">
        <div className="flex items-center gap-4">
          <span>终端: {tabs.length}</span>
          <span>活动: {activeTabId}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>模式: {splitMode ? '分屏' : '单屏'}</span>
          <span>主题: {theme === 'dark' ? '深色' : '浅色'}</span>
        </div>
      </div>
    </div>
  );
}

export default App;
