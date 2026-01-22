import { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, Plus, X } from 'lucide-react';

export default function TabBar({ tabs, activeTabId, onTabSelect, onTabClose, onRenameTab, onNewTab }) {
  const [editingTabId, setEditingTabId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const inputRef = useRef(null);

  // 開始編輯標籤名稱
  const startEditing = (tab) => {
    setEditingTabId(tab.id);
    setEditingTitle(tab.title);
  };

  // 完成編輯（保存）
  const finishEditing = () => {
    if (editingTabId && editingTitle.trim()) {
      onRenameTab(editingTabId, editingTitle.trim());
    }
    setEditingTabId(null);
    setEditingTitle('');
  };

  // 取消編輯
  const cancelEditing = () => {
    setEditingTabId(null);
    setEditingTitle('');
  };

  // 自動聚焦輸入框
  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select(); // 選中所有文字
    }
  }, [editingTabId]);

  return (
    <div className="flex items-center bg-[#2d2d2d] border-b border-[#3e3e3e] h-12">
      <div className="flex items-center overflow-x-auto flex-1">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`
              group flex items-center gap-2 px-4 h-12 min-w-[150px] max-w-[250px]
              border-r border-[#3e3e3e] cursor-pointer transition-colors
              ${activeTabId === tab.id
                ? 'bg-terminal-bg text-white'
                : 'bg-[#2d2d2d] text-gray-400 hover:bg-[#363636]'
              }
            `}
            onClick={() => editingTabId !== tab.id && onTabSelect(tab.id)}
          >
            <TerminalIcon size={16} className="flex-shrink-0" />

            {/* 編輯模式：顯示輸入框 */}
            {editingTabId === tab.id ? (
              <input
                ref={inputRef}
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={finishEditing}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    finishEditing();
                  } else if (e.key === 'Escape') {
                    cancelEditing();
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 bg-[#3c3c3c] text-white text-sm px-2 py-1 rounded
                           border border-[#007acc] outline-none"
                maxLength={50}
              />
            ) : (
              /* 正常模式：顯示標題（雙擊編輯） */
              <span
                className="flex-1 truncate text-sm"
                onDoubleClick={() => startEditing(tab)}
                title={`雙擊編輯標籤名稱\n${tab.title}`}
              >
                {tab.title}
              </span>
            )}

            {/* 關閉按鈕（編輯時隱藏） */}
            {editingTabId !== tab.id && (
              <button
                className={`
                  flex-shrink-0 p-1 rounded hover:bg-[#4e4e4e] transition-colors
                  ${activeTabId === tab.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                `}
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        className="flex items-center justify-center w-12 h-12 text-gray-400
                   hover:text-white hover:bg-[#363636] transition-colors border-l border-[#3e3e3e]"
        onClick={onNewTab}
        title="新建终端 (Ctrl+T)"
      >
        <Plus size={18} />
      </button>
    </div>
  );
}
