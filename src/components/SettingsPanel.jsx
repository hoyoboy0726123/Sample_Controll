import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

export default function SettingsPanel({ isOpen, onClose, onSave }) {
  const [settings, setSettings] = useState({
    defaultShell: 'auto',
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    theme: 'dark',
  });

  useEffect(() => {
    // 从 localStorage 加载设置
    const savedSettings = localStorage.getItem('terminalSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('terminalSettings', JSON.stringify(settings));
    onSave(settings);
    onClose();
  };

  if (!isOpen) return null;

  const shellOptions = [
    { value: 'auto', label: '自动检测' },
    { value: 'powershell.exe', label: 'PowerShell' },
    { value: 'cmd.exe', label: 'CMD' },
    { value: 'bash', label: 'Bash' },
    { value: '/bin/zsh', label: 'Zsh' },
    { value: 'C:\\Program Files\\Git\\bin\\bash.exe', label: 'Git Bash' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#252526] rounded-lg shadow-2xl w-[600px] max-w-[90vw] max-h-[80vh] overflow-y-auto">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#3e3e3e] sticky top-0 bg-[#252526]">
          <h2 className="font-semibold text-white">设置</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#3e3e3e] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-6 space-y-6">
          {/* 默认 Shell */}
          <div>
            <h3 className="text-lg font-medium text-white mb-3">终端设置</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  默认 Shell
                </label>
                <select
                  value={settings.defaultShell}
                  onChange={(e) => setSettings({ ...settings, defaultShell: e.target.value })}
                  className="w-full px-3 py-2 bg-[#3c3c3c] text-white border border-[#555] rounded
                             focus:outline-none focus:border-[#007acc] transition-colors"
                >
                  {shellOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  新建终端时使用的默认 Shell
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  字体大小
                </label>
                <input
                  type="number"
                  min="10"
                  max="24"
                  value={settings.fontSize}
                  onChange={(e) => setSettings({ ...settings, fontSize: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-[#3c3c3c] text-white border border-[#555] rounded
                             focus:outline-none focus:border-[#007acc] transition-colors"
                />
                <p className="mt-1 text-xs text-gray-500">
                  终端字体大小 (10-24)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  字体族
                </label>
                <input
                  type="text"
                  value={settings.fontFamily}
                  onChange={(e) => setSettings({ ...settings, fontFamily: e.target.value })}
                  className="w-full px-3 py-2 bg-[#3c3c3c] text-white border border-[#555] rounded
                             focus:outline-none focus:border-[#007acc] transition-colors"
                />
                <p className="mt-1 text-xs text-gray-500">
                  终端使用的字体
                </p>
              </div>
            </div>
          </div>

          {/* 外观设置 */}
          <div>
            <h3 className="text-lg font-medium text-white mb-3">外观</h3>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                主题
              </label>
              <select
                value={settings.theme}
                onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
                className="w-full px-3 py-2 bg-[#3c3c3c] text-white border border-[#555] rounded
                           focus:outline-none focus:border-[#007acc] transition-colors"
              >
                <option value="dark">暗色</option>
                <option value="light">亮色</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                应用程序主题
              </p>
            </div>
          </div>

          {/* 快捷键说明 */}
          <div>
            <h3 className="text-lg font-medium text-white mb-3">快捷键</h3>
            <div className="bg-[#1e1e1e] rounded p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">新建终端</span>
                <kbd className="px-2 py-1 bg-[#3c3c3c] rounded text-gray-300">Ctrl + T</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">关闭终端</span>
                <kbd className="px-2 py-1 bg-[#3c3c3c] rounded text-gray-300">Ctrl + W</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">切换分屏</span>
                <kbd className="px-2 py-1 bg-[#3c3c3c] rounded text-gray-300">Ctrl + \</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">切换标签</span>
                <kbd className="px-2 py-1 bg-[#3c3c3c] rounded text-gray-300">Ctrl + 1-9</kbd>
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-[#3e3e3e] sticky bottom-0 bg-[#252526]">
          <button
            onClick={onClose}
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
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
}
