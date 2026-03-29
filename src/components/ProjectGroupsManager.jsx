import { useState, useEffect } from 'react';
import { X, FolderOpen, Plus, Trash2, Edit2, Play, Save, Folder } from 'lucide-react';

export default function ProjectGroupsManager({ isOpen, onClose, onOpenGroup }) {
  const [projectGroups, setProjectGroups] = useState([]);
  const [recentPaths, setRecentPaths] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);

  // 載入項目組和最近路徑
  useEffect(() => {
    if (isOpen) {
      try {
        const savedGroups = localStorage.getItem('projectGroups');
        if (savedGroups) {
          setProjectGroups(JSON.parse(savedGroups));
        }
      } catch (error) {
        console.error('無法從 localStorage 載入項目組:', error);
      }

      try {
        const savedPaths = localStorage.getItem('recentPaths');
        if (savedPaths) {
          setRecentPaths(JSON.parse(savedPaths));
        }
      } catch (error) {
        console.error('無法從 localStorage 載入最近路徑:', error);
      }
    }
  }, [isOpen]);

  // 儲存項目組到 localStorage
  const saveProjectGroups = (groups) => {
    try {
      localStorage.setItem('projectGroups', JSON.stringify(groups));
      setProjectGroups(groups);
    } catch (error) {
      console.error('無法保存項目組到 localStorage:', error);
      // 即使保存失敗，也更新記憶體中的狀態
      setProjectGroups(groups);
    }
  };

  // 新建項目組
  const handleCreateGroup = () => {
    setEditingGroup({
      id: `group-${Date.now()}`,
      name: '新項目組',
      terminals: []
    });
    setIsEditing(true);
  };

  // 編輯項目組
  const handleEditGroup = (group) => {
    setEditingGroup({ ...group });
    setIsEditing(true);
  };

  // 刪除項目組
  const handleDeleteGroup = (groupId) => {
    if (confirm('確定要刪除此項目組嗎？')) {
      const updated = projectGroups.filter(g => g.id !== groupId);
      saveProjectGroups(updated);
    }
  };

  // 打開項目組（一鍵打開所有終端機）
  const handleOpenGroup = (group) => {
    onOpenGroup(group);
    onClose();
  };

  // 從最近路徑打開單個終端
  const handleOpenFromRecent = (path) => {
    onOpenGroup({
      name: '單個終端',
      terminals: [{ path, shell: 'auto' }]
    });
    onClose();
  };

  if (!isOpen) return null;

  if (isEditing) {
    return <GroupEditor
      group={editingGroup}
      onSave={(savedGroup) => {
        const existing = projectGroups.find(g => g.id === savedGroup.id);
        const updated = existing
          ? projectGroups.map(g => g.id === savedGroup.id ? savedGroup : g)
          : [...projectGroups, savedGroup];
        saveProjectGroups(updated);
        setIsEditing(false);
        setEditingGroup(null);
      }}
      onCancel={() => {
        setIsEditing(false);
        setEditingGroup(null);
      }}
      recentPaths={recentPaths}
    />;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#252526] rounded-lg shadow-2xl w-[700px] max-w-[90vw] max-h-[80vh] flex flex-col">
        {/* 標題欄 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#3e3e3e]">
          <div className="flex items-center gap-2 text-white">
            <FolderOpen size={20} />
            <h2 className="font-semibold">專案群組管理</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#3e3e3e] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 內容區域 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 最近使用的路徑 */}
          {recentPaths.length > 0 && (
            <div>
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <Folder size={16} />
                最近使用的路徑
              </h3>
              <div className="space-y-2">
                {recentPaths.slice(0, 10).map((path, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-3 py-2 bg-[#1e1e1e] rounded hover:bg-[#2a2a2a] transition-colors"
                  >
                    <span className="text-sm text-gray-300 truncate flex-1">{path}</span>
                    <button
                      onClick={() => handleOpenFromRecent(path)}
                      className="ml-2 px-3 py-1 bg-[#0e639c] text-white text-sm rounded hover:bg-[#1177bb] transition-colors"
                    >
                      開啟
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 專案群組列表 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium flex items-center gap-2">
                <FolderOpen size={16} />
                專案群組
              </h3>
              <button
                onClick={handleCreateGroup}
                className="px-3 py-1 bg-[#0e639c] text-white text-sm rounded hover:bg-[#1177bb] transition-colors flex items-center gap-1"
              >
                <Plus size={14} />
                新建群組
              </button>
            </div>

            {projectGroups.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FolderOpen size={48} className="mx-auto mb-2 opacity-30" />
                <p>尚無專案群組</p>
                <p className="text-sm mt-1">點擊「新建群組」開始建立</p>
              </div>
            ) : (
              <div className="space-y-2">
                {projectGroups.map((group) => (
                  <div
                    key={group.id}
                    className="px-4 py-3 bg-[#1e1e1e] rounded border border-[#3e3e3e] hover:border-[#007acc] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-medium">{group.name}</h4>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleOpenGroup(group)}
                          className="p-1.5 text-green-400 hover:bg-[#2a2a2a] rounded transition-colors"
                          title="打開群組"
                        >
                          <Play size={16} />
                        </button>
                        <button
                          onClick={() => handleEditGroup(group)}
                          className="p-1.5 text-blue-400 hover:bg-[#2a2a2a] rounded transition-colors"
                          title="編輯"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          className="p-1.5 text-red-400 hover:bg-[#2a2a2a] rounded transition-colors"
                          title="刪除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">
                      {group.terminals.length} 個終端機
                      {group.terminals.length > 0 && (
                        <span className="ml-2">
                          ({group.terminals.map(t => t.path.split(/[/\\]/).pop()).join(', ')})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 底部按鈕 */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-[#3e3e3e]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:bg-[#3e3e3e] rounded transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}

// 群組編輯器子組件
function GroupEditor({ group, onSave, onCancel, recentPaths }) {
  const [name, setName] = useState(group.name);
  const [terminals, setTerminals] = useState(group.terminals || []);

  const handleAddTerminal = async () => {
    if (window.electronAPI && window.electronAPI.selectFolder) {
      const result = await window.electronAPI.selectFolder();
      if (!result.canceled && result.path) {
        setTerminals([...terminals, { path: result.path, shell: 'auto' }]);
      }
    }
  };

  const handleAddFromRecent = (path) => {
    if (!terminals.find(t => t.path === path)) {
      setTerminals([...terminals, { path, shell: 'auto' }]);
    }
  };

  const handleRemoveTerminal = (index) => {
    setTerminals(terminals.filter((_, i) => i !== index));
  };

  const handleShellChange = (index, shell) => {
    const updated = [...terminals];
    updated[index].shell = shell;
    setTerminals(updated);
  };

  const handleSave = () => {
    if (name.trim() && terminals.length > 0) {
      onSave({ ...group, name, terminals });
    } else {
      alert('請輸入群組名稱並至少添加一個終端機');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#252526] rounded-lg shadow-2xl w-[700px] max-w-[90vw] max-h-[80vh] flex flex-col">
        {/* 標題欄 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#3e3e3e]">
          <h2 className="font-semibold text-white">編輯專案群組</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#3e3e3e] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 內容區域 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* 群組名稱 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              群組名稱
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：前端專案組"
              className="w-full px-3 py-2 bg-[#3c3c3c] text-white border border-[#555] rounded
                         focus:outline-none focus:border-[#007acc] transition-colors"
            />
          </div>

          {/* 終端機列表 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-300">
                終端機配置
              </label>
              <button
                onClick={handleAddTerminal}
                className="px-3 py-1 bg-[#0e639c] text-white text-sm rounded hover:bg-[#1177bb] transition-colors flex items-center gap-1"
              >
                <Plus size={14} />
                添加終端機
              </button>
            </div>

            {terminals.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-[#1e1e1e] rounded">
                <p>尚未添加終端機</p>
                <p className="text-sm mt-1">點擊「添加終端機」開始</p>
              </div>
            ) : (
              <div className="space-y-2">
                {terminals.map((terminal, index) => (
                  <div key={index} className="flex gap-2 items-center p-3 bg-[#1e1e1e] rounded">
                    <input
                      type="text"
                      value={terminal.path}
                      readOnly
                      className="flex-1 px-3 py-2 bg-[#2a2a2a] text-gray-300 border border-[#3e3e3e] rounded text-sm"
                    />
                    <select
                      value={terminal.shell}
                      onChange={(e) => handleShellChange(index, e.target.value)}
                      className="px-3 py-2 bg-[#3c3c3c] text-white border border-[#555] rounded text-sm"
                    >
                      <option value="auto">自動檢測</option>
                      <option value="powershell.exe">PowerShell</option>
                      <option value="cmd.exe">CMD</option>
                      <option value="bash">Bash</option>
                      <option value="/bin/zsh">Zsh</option>
                    </select>
                    <button
                      onClick={() => handleRemoveTerminal(index)}
                      className="p-2 text-red-400 hover:bg-[#2a2a2a] rounded transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 快速添加（從最近路徑） */}
          {recentPaths.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                從最近路徑添加
              </label>
              <div className="flex flex-wrap gap-2">
                {recentPaths.slice(0, 5).map((path, index) => (
                  <button
                    key={index}
                    onClick={() => handleAddFromRecent(path)}
                    className="px-3 py-1 bg-[#2a2a2a] text-gray-300 text-sm rounded hover:bg-[#3a3a3a] transition-colors"
                    disabled={terminals.find(t => t.path === path)}
                  >
                    {path.split(/[/\\]/).pop() || path}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 底部按鈕 */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-[#3e3e3e]">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-300 hover:bg-[#3e3e3e] rounded transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-[#0e639c] text-white rounded hover:bg-[#1177bb]
                       transition-colors font-medium flex items-center gap-2"
          >
            <Save size={16} />
            儲存群組
          </button>
        </div>
      </div>
    </div>
  );
}
