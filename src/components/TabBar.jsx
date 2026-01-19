import { Terminal as TerminalIcon, Plus, X } from 'lucide-react';

export default function TabBar({ tabs, activeTabId, onTabSelect, onTabClose, onNewTab }) {
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
            onClick={() => onTabSelect(tab.id)}
          >
            <TerminalIcon size={16} className="flex-shrink-0" />
            <span className="flex-1 truncate text-sm">
              {tab.title}
            </span>
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
