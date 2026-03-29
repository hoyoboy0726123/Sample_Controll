import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * 自定義確認對話框組件
 * 替換同步的 window.confirm()，提供更好的用戶體驗
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - 是否顯示對話框
 * @param {string} props.title - 對話框標題
 * @param {string} props.message - 對話框訊息（支持換行）
 * @param {string} props.confirmText - 確認按鈕文字（預設：確定）
 * @param {string} props.cancelText - 取消按鈕文字（預設：取消）
 * @param {boolean} props.isDangerous - 是否為危險操作（紅色確認按鈕）
 * @param {Function} props.onConfirm - 確認回調
 * @param {Function} props.onCancel - 取消回調
 */
export default function ConfirmDialog({
  isOpen,
  title = '確認操作',
  message,
  confirmText = '確定',
  cancelText = '取消',
  isDangerous = false,
  onConfirm,
  onCancel,
}) {
  // ESC 鍵關閉對話框
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  // 處理背景點擊
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      <div
        className="bg-[#252526] rounded-lg shadow-2xl max-w-md w-full mx-4 border border-[#3c3c3c]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 標題 */}
        <div className="px-6 py-4 border-b border-[#3c3c3c] flex items-center gap-3">
          {isDangerous && (
            <AlertTriangle className="w-5 h-5 text-red-500" />
          )}
          <h2
            id="confirm-dialog-title"
            className="text-lg font-semibold text-white"
          >
            {title}
          </h2>
        </div>

        {/* 訊息內容 */}
        <div className="px-6 py-4">
          <p
            id="confirm-dialog-message"
            className="text-gray-300 whitespace-pre-line leading-relaxed"
          >
            {message}
          </p>
        </div>

        {/* 按鈕 */}
        <div className="px-6 py-4 border-t border-[#3c3c3c] flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-[#3c3c3c] hover:bg-[#4c4c4c] text-white rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus={!isDangerous}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded transition-colors focus:outline-none focus:ring-2 ${
              isDangerous
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
            }`}
            autoFocus={isDangerous}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
