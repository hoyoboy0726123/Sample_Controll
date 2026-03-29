/**
 * 🔒 日誌記錄工具 - 根據環境條件化記錄
 *
 * 在生產環境中，只記錄 warn 和 error 級別的日誌
 * 在開發環境中，記錄所有級別的日誌
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

const logger = {
  /**
   * 調試級別日誌 - 僅在開發環境記錄
   */
  debug(...args) {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * 信息級別日誌 - 僅在開發環境記錄
   */
  log(...args) {
    if (isDevelopment) {
      console.log('[INFO]', ...args);
    }
  },

  /**
   * 警告級別日誌 - 所有環境都記錄
   */
  warn(...args) {
    console.warn('[WARN]', ...args);
  },

  /**
   * 錯誤級別日誌 - 所有環境都記錄
   */
  error(...args) {
    console.error('[ERROR]', ...args);
  },

  /**
   * 安全相關日誌 - 所有環境都記錄
   */
  security(...args) {
    console.warn('[SECURITY]', ...args);
  },
};

export default logger;
