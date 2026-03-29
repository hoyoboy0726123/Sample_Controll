import { useState, useEffect } from 'react';
import { X, Save, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';

export default function SettingsPanel({ isOpen, onClose, onSave }) {
  const [settings, setSettings] = useState({
    defaultShell: 'auto',
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    theme: 'dark',
    restoreSession: true, // 預設啟用會話恢復
  });

  // 確認對話框狀態
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    dataType: null,
    isDangerous: false,
  });

  // 成功提示狀態
  const [successMessage, setSuccessMessage] = useState(null);

  // 🔒 安全性：驗證設定數據
  const validateSettings = (settings) => {
    const defaults = {
      defaultShell: 'auto',
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: 'dark',
      restoreSession: true,
    };

    if (!settings || typeof settings !== 'object') {
      return defaults;
    }

    return {
      defaultShell: typeof settings.defaultShell === 'string' && settings.defaultShell.length < 256
        ? settings.defaultShell
        : defaults.defaultShell,
      fontSize: Number.isInteger(settings.fontSize) && settings.fontSize >= 10 && settings.fontSize <= 30
        ? settings.fontSize
        : defaults.fontSize,
      fontFamily: typeof settings.fontFamily === 'string' && settings.fontFamily.length < 500
        ? settings.fontFamily
        : defaults.fontFamily,
      theme: ['dark', 'light'].includes(settings.theme)
        ? settings.theme
        : defaults.theme,
      restoreSession: typeof settings.restoreSession === 'boolean'
        ? settings.restoreSession
        : defaults.restoreSession,
    };
  };

  useEffect(() => {
    // 從 localStorage 載入設定
    try {
      const savedSettings = localStorage.getItem('terminalSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        // 🔒 驗證設定數據
        const validated = validateSettings(parsed);
        setSettings(validated);
      }
    } catch (error) {
      console.error('無法從 localStorage 載入設定:', error);
    }
  }, [isOpen]);

  const handleSave = () => {
    try {
      localStorage.setItem('terminalSettings', JSON.stringify(settings));
      onSave(settings);
      onClose();
    } catch (error) {
      console.error('無法保存設定到 localStorage:', error);
      // 即使保存失敗，也通知父組件設定已更改（至少在記憶體中生效）
      onSave(settings);
      onClose();
    }
  };

  // 顯示成功提示（自動消失）
  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // 打開確認對話框
  const handleClearData = (dataType) => {
    const confirmations = {
      session: {
        title: '清除會話數據',
        message: '確定要清除已保存的會話數據嗎？這將移除上次關閉時的所有終端機狀態。',
        isDangerous: false,
      },
      recentPaths: {
        title: '清除最近路徑',
        message: '確定要清除最近使用的路徑歷史記錄嗎？',
        isDangerous: false,
      },
      projectGroups: {
        title: '清除項目群組',
        message: '確定要刪除所有項目群組嗎？',
        isDangerous: false,
      },
      all: {
        title: '清除所有數據',
        message: '確定要清除所有數據嗎？\n\n這將刪除：\n• 已保存的會話\n• 最近路徑歷史\n• 所有項目群組\n\n（設定將會保留）',
        isDangerous: true,
      },
    };

    const config = confirmations[dataType];
    setConfirmDialog({
      isOpen: true,
      title: config.title,
      message: config.message,
      dataType,
      isDangerous: config.isDangerous,
    });
  };

  // 確認清除數據
  const handleConfirmClear = () => {
    const { dataType } = confirmDialog;

    try {
      switch (dataType) {
        case 'session':
          localStorage.removeItem('lastSession');
          showSuccess('會話數據已清除');
          break;
        case 'recentPaths':
          localStorage.removeItem('recentPaths');
          showSuccess('最近路徑已清除');
          break;
        case 'projectGroups':
          localStorage.removeItem('projectGroups');
          showSuccess('項目群組已清除');
          break;
        case 'all':
          const savedSettings = localStorage.getItem('terminalSettings');
          localStorage.clear();
          if (savedSettings) {
            localStorage.setItem('terminalSettings', savedSettings);
          }
          showSuccess('所有數據已清除（設定已保留）');
          break;
      }
    } catch (error) {
      console.error('清除數據時發生錯誤:', error);
      showSuccess('清除數據失敗，請查看控制台了解詳情');
    }

    // 關閉對話框
    setConfirmDialog({ isOpen: false, title: '', message: '', dataType: null, isDangerous: false });
  };

  // 取消清除
  const handleCancelClear = () => {
    setConfirmDialog({ isOpen: false, title: '', message: '', dataType: null, isDangerous: false });
  };

  if (!isOpen) return null;

  const shellOptions = [
    { value: 'auto', label: '自動檢測' },
    { value: 'powershell.exe', label: 'PowerShell' },
    { value: 'cmd.exe', label: 'CMD' },
    { value: 'bash', label: 'Bash' },
    { value: '/bin/zsh', label: 'Zsh' },
    { value: 'C:\\Program Files\\Git\\bin\\bash.exe', label: 'Git Bash' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#252526] rounded-lg shadow-2xl w-[600px] max-w-[90vw] max-h-[80vh] overflow-y-auto">
        {/* 標題欄 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#3e3e3e] sticky top-0 bg-[#252526]">
          <h2 className="font-semibold text-white">設定</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#3e3e3e] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 內容區域 */}
        <div className="p-6 space-y-6">
          {/* 預設 Shell */}
          <div>
            <h3 className="text-lg font-medium text-white mb-3">終端機設定</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  預設 Shell
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
                  新建終端機時使用的預設 Shell
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  字型大小
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
                  終端機字型大小 (10-24)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  字型系列
                </label>
                <input
                  type="text"
                  value={settings.fontFamily}
                  onChange={(e) => setSettings({ ...settings, fontFamily: e.target.value })}
                  className="w-full px-3 py-2 bg-[#3c3c3c] text-white border border-[#555] rounded
                             focus:outline-none focus:border-[#007acc] transition-colors"
                />
                <p className="mt-1 text-xs text-gray-500">
                  終端機使用的字型
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.restoreSession}
                    onChange={(e) => setSettings({ ...settings, restoreSession: e.target.checked })}
                    className="w-4 h-4 bg-[#3c3c3c] border border-[#555] rounded
                               focus:outline-none focus:ring-2 focus:ring-[#007acc]"
                  />
                  <span className="text-sm font-medium text-gray-300">
                    啟動時自動恢復上次會話
                  </span>
                </label>
                <p className="mt-1 text-xs text-gray-500 ml-6">
                  重新開啟應用程式時，自動恢復上次關閉時的所有終端機
                </p>
              </div>
            </div>
          </div>

          {/* 外觀設定 */}
          <div>
            <h3 className="text-lg font-medium text-white mb-3">外觀</h3>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                主題
              </label>
              <select
                value={settings.theme}
                onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
                className="w-full px-3 py-2 bg-[#3c3c3c] text-white border border-[#555] rounded
                           focus:outline-none focus:border-[#007acc] transition-colors"
              >
                <option value="dark">深色</option>
                <option value="light">淺色</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                應用程式主題
              </p>
            </div>
          </div>

          {/* 快速鍵說明 */}
          <div>
            <h3 className="text-lg font-medium text-white mb-3">快速鍵</h3>

            <div className="space-y-3">
              {/* 應用程式快捷鍵 */}
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">應用程式</h4>
                <div className="bg-[#1e1e1e] rounded p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">新建終端機</span>
                    <kbd className="px-2 py-1 bg-[#3c3c3c] rounded text-gray-300">Ctrl + T</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">關閉終端機</span>
                    <kbd className="px-2 py-1 bg-[#3c3c3c] rounded text-gray-300">Ctrl + W</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">切換分屏</span>
                    <kbd className="px-2 py-1 bg-[#3c3c3c] rounded text-gray-300">Ctrl + \</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">切換標籤</span>
                    <kbd className="px-2 py-1 bg-[#3c3c3c] rounded text-gray-300">Ctrl + 1-9</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">開發者工具</span>
                    <kbd className="px-2 py-1 bg-[#3c3c3c] rounded text-gray-300">F12</kbd>
                  </div>
                </div>
              </div>

              {/* 終端機內快捷鍵 */}
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">終端機內操作</h4>
                <div className="bg-[#1e1e1e] rounded p-3 space-y-2 text-sm">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="text-gray-400">複製</div>
                      <div className="text-xs text-gray-600 mt-0.5">選中文字後使用</div>
                    </div>
                    <div className="flex gap-2">
                      <kbd className="px-2 py-1 bg-[#3c3c3c] rounded text-gray-300">Ctrl + C</kbd>
                      <span className="text-gray-600">或</span>
                      <kbd className="px-2 py-1 bg-[#3c3c3c] rounded text-gray-300 text-xs">Ctrl + Shift + C</kbd>
                    </div>
                  </div>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="text-gray-400">貼上</div>
                      <div className="text-xs text-gray-600 mt-0.5">貼上剪貼板內容</div>
                    </div>
                    <div className="flex gap-2">
                      <kbd className="px-2 py-1 bg-[#3c3c3c] rounded text-gray-300">Ctrl + V</kbd>
                      <span className="text-gray-600">或</span>
                      <kbd className="px-2 py-1 bg-[#3c3c3c] rounded text-gray-300 text-xs">Ctrl + Shift + V</kbd>
                    </div>
                  </div>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="text-gray-400">中斷進程</div>
                      <div className="text-xs text-gray-600 mt-0.5">無選中文字時</div>
                    </div>
                    <kbd className="px-2 py-1 bg-[#3c3c3c] rounded text-gray-300">Ctrl + C</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 數據管理 */}
          <div>
            <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
              <AlertTriangle size={20} className="text-yellow-500" />
              數據管理
            </h3>
            <div className="bg-[#1e1e1e] rounded p-4 space-y-3">
              <p className="text-sm text-gray-400 mb-3">
                清除保存在本地的數據。此操作無法復原，請謹慎使用。
              </p>

              <div className="space-y-2">
                <button
                  onClick={() => handleClearData('session')}
                  className="w-full px-3 py-2 bg-[#3c3c3c] text-gray-300 rounded
                             hover:bg-[#4e4e4e] transition-colors text-sm flex items-center justify-between group"
                >
                  <span>清除會話數據</span>
                  <Trash2 size={16} className="text-gray-500 group-hover:text-red-400" />
                </button>

                <button
                  onClick={() => handleClearData('recentPaths')}
                  className="w-full px-3 py-2 bg-[#3c3c3c] text-gray-300 rounded
                             hover:bg-[#4e4e4e] transition-colors text-sm flex items-center justify-between group"
                >
                  <span>清除最近路徑</span>
                  <Trash2 size={16} className="text-gray-500 group-hover:text-red-400" />
                </button>

                <button
                  onClick={() => handleClearData('projectGroups')}
                  className="w-full px-3 py-2 bg-[#3c3c3c] text-gray-300 rounded
                             hover:bg-[#4e4e4e] transition-colors text-sm flex items-center justify-between group"
                >
                  <span>清除項目群組</span>
                  <Trash2 size={16} className="text-gray-500 group-hover:text-red-400" />
                </button>

                <div className="pt-2 border-t border-[#3c3c3c]">
                  <button
                    onClick={() => handleClearData('all')}
                    className="w-full px-3 py-2 bg-red-900/30 text-red-400 rounded
                               hover:bg-red-900/50 transition-colors text-sm font-medium
                               flex items-center justify-between group border border-red-900/50"
                  >
                    <span>清除所有數據（保留設定）</span>
                    <Trash2 size={16} className="group-hover:animate-pulse" />
                  </button>
                  <p className="mt-2 text-xs text-gray-500">
                    這將清除所有數據，但保留您的設定選項
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部按鈕 */}
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
            儲存設定
          </button>
        </div>
      </div>

      {/* 確認對話框 */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        isDangerous={confirmDialog.isDangerous}
        onConfirm={handleConfirmClear}
        onCancel={handleCancelClear}
      />

      {/* 成功提示（Toast） */}
      {successMessage && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-[10000] animate-fade-in">
          <CheckCircle size={20} />
          <span>{successMessage}</span>
        </div>
      )}
    </div>
  );
}
