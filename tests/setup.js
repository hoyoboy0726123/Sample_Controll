/**
 * Vitest 測試環境設置
 *
 * 簡化版 - 不依賴外部庫以支持 npx 運行
 */

// 基本的全局測試環境設置
globalThis.testEnvironment = 'happy-dom';

// 為非瀏覽器環境添加基本的 DOM API 模擬（如果需要）
if (typeof window === 'undefined') {
  // 這將由 happy-dom 環境提供
  console.log('測試環境：happy-dom');
}
