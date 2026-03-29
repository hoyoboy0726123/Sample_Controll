import { useState } from 'react';
import { X, Folder, Terminal as TerminalIcon } from 'lucide-react';

export default function NewTerminalDialog({ isOpen, onClose, onConfirm, defaultShell, defaultPath }) {
  const [selectedShell, setSelectedShell] = useState(defaultShell || 'auto');
  const [selectedPath, setSelectedPath] = useState(defaultPath || '');

  if (!isOpen) return null;

  const handleSelectFolder = async () => {
    if (window.electronAPI && window.electronAPI.selectFolder) {
      const result = await window.electronAPI.selectFolder();
      if (!result.canceled && result.path) {
        setSelectedPath(result.path);
      }
    }
  };

  const handleConfirm = () => {
    // 保存最近使用的路徑
    if (selectedPath) {
      try {
        const recentPathsStr = localStorage.getItem('recentPaths') || '[]';
        const recentPaths = JSON.parse(recentPathsStr);
        const updated = [selectedPath, ...recentPaths.filter(p => p !== selectedPath)].slice(0, 10);
        localStorage.setItem('recentPaths', JSON.stringify(updated));
      } catch (error) {
        console.error('無法保存最近路徑到 localStorage:', error);
        // 保存失敗不影響終端創建，繼續執行
      }
    }

    onConfirm({
      shell: selectedShell,
      cwd: selectedPath || undefined
    });
    onClose();
  };

  const shellOptions = [
    { value: 'auto', label: '自動檢測', description: '根據系統自動選擇' },
    { value: 'powershell.exe', label: 'PowerShell', description: 'Windows PowerShell' },
    { value: 'cmd.exe', label: 'CMD', description: 'Windows 命令提示字元' },
    { value: 'bash', label: 'Bash', description: 'Bash Shell' },
    { value: '/bin/zsh', label: 'Zsh', description: 'Z Shell' },
    { value: 'C:\\Program Files\\Git\\bin\\bash.exe', label: 'Git Bash', description: 'Git for Windows Bash' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#252526] rounded-lg shadow-2xl w-[500px] max-w-[90vw]">
        {/* 標題欄 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#3e3e3e]">
          <div className="flex items-center gap-2 text-white">
            <TerminalIcon size={20} />
            <h2 className="font-semibold">新建終端機</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#3e3e3e] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 內容區域 */}
        <div className="p-6 space-y-5">
          {/* Shell 選擇 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              選擇 Shell
            </label>
            <select
              value={selectedShell}
              onChange={(e) => setSelectedShell(e.target.value)}
              className="w-full px-3 py-2 bg-[#3c3c3c] text-white border border-[#555] rounded
                         focus:outline-none focus:border-[#007acc] transition-colors"
            >
              {shellOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} - {option.description}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              選擇此終端機使用的 Shell 類型
            </p>
          </div>

          {/* 工作目錄 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              工作目錄
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={selectedPath}
                onChange={(e) => setSelectedPath(e.target.value)}
                placeholder="留空使用預設目錄"
                className="flex-1 px-3 py-2 bg-[#3c3c3c] text-white border border-[#555] rounded
                           focus:outline-none focus:border-[#007acc] transition-colors"
              />
              <button
                onClick={handleSelectFolder}
                className="px-4 py-2 bg-[#0e639c] text-white rounded hover:bg-[#1177bb]
                           transition-colors flex items-center gap-2"
              >
                <Folder size={16} />
                瀏覽
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              終端機將從此目錄啟動
            </p>
          </div>
        </div>

        {/* 底部按鈕 */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-[#3e3e3e]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:bg-[#3e3e3e] rounded transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-[#0e639c] text-white rounded hover:bg-[#1177bb]
                       transition-colors font-medium"
          >
            建立終端機
          </button>
        </div>
      </div>
    </div>
  );
}
