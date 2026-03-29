# 測試指南

## 安裝測試依賴

由於網絡問題，測試依賴可能未完全安裝。請手動安裝：

```bash
npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom happy-dom
```

## 運行測試

```bash
# 運行所有測試
npm test

# 運行測試並監視文件變化
npm test -- --watch

# 運行測試 UI（瀏覽器界面）
npm run test:ui

# 生成測試覆蓋率報告
npm run test:coverage
```

## 測試文件結構

```
tests/
├── setup.js           # 測試環境設置
└── security.test.js   # 安全驗證函數測試
```

## 測試覆蓋範圍

### 已實現的測試

1. **Tab 數據驗證** (`validateTabData`)
   - ✅ 有效數據測試
   - ✅ null/undefined 拒絕
   - ✅ 非對象值拒絕
   - ✅ 無效 ID 拒絕（空字符串、過長）
   - ✅ 無效欄位類型拒絕
   - ✅ 欄位長度限制測試

2. **設定數據驗證** (`validateSettings`)
   - ✅ 默認值測試
   - ✅ 有效設定測試
   - ✅ 無效 fontSize 範圍拒絕
   - ✅ 無效 theme 拒絕
   - ✅ 非布爾值拒絕

3. **危險命令檢測**
   - ✅ 危險命令識別
   - ✅ 安全命令不誤報

### 待添加的測試

1. **終端命令檢測** (`detectWindowsCommands`, `detectUnixCommands`)
2. **React 組件測試**
   - ConfirmDialog 組件
   - SettingsPanel 組件
3. **集成測試**

## 測試最佳實踐

1. **編寫測試** - 每個新函數都應該有對應的測試
2. **測試驅動開發（TDD）** - 先寫測試，再實現功能
3. **保持測試簡單** - 一個測試只測試一個功能點
4. **使用描述性名稱** - 測試名稱應該清楚說明測試內容
5. **保持測試獨立** - 測試之間不應該有依賴關係

## 示例：添加新測試

```javascript
import { describe, it, expect } from 'vitest';

describe('MyFunction', () => {
  it('should return true for valid input', () => {
    const result = myFunction('valid');
    expect(result).toBe(true);
  });

  it('should return false for invalid input', () => {
    const result = myFunction('invalid');
    expect(result).toBe(false);
  });
});
```

## 持續集成（CI）

未來可以添加 GitHub Actions 自動運行測試：

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
```

## 故障排除

### 問題：測試無法運行

**解決方法**：
1. 確保已安裝所有測試依賴
2. 檢查 `vitest.config.js` 配置是否正確
3. 運行 `npm install` 重新安裝依賴

### 問題：特定測試失敗

**解決方法**：
1. 閱讀錯誤訊息，了解失敗原因
2. 使用 `it.only()` 只運行特定測試
3. 添加 `console.log()` 調試輸出
4. 檢查測試數據是否正確

## 資源

- [Vitest 官方文檔](https://vitest.dev/)
- [Testing Library 文檔](https://testing-library.com/)
- [Jest-DOM 匹配器](https://github.com/testing-library/jest-dom)
