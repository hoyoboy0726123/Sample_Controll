# UX 改進計劃

> **日期**: 2026-01-22
> **狀態**: 實施中
> **優先級**: P0 (用戶體驗關鍵改進)

---

## 📋 問題分析

### 1. 終端無法輸入 (P0 - 嚴重)

**現象**：
- 顯示 `Process interrupted (Ctrl+C)` 後，終端變成不可用
- 無法繼續輸入命令
- 光標不閃爍，按鍵無反應

**根本原因**：
- Shell 進程退出後，沒有自動重啟
- 終端 UI 還在，但後端 PTY 進程已死亡

**解決方案**：
- ✅ 方案 A（推薦）：Shell 退出後自動重啟
- ❌ 方案 B：顯示「重啟」按鈕（需要用戶手動操作）
- ❌ 方案 C：防止 shell 意外退出（治標不治本）

### 2. 分屏邏輯不直觀 (P0 - 體驗問題)

**現況**：
```
全局分屏 (所有標籤共享)
┌─────────────────┐
│ Tab1 │ Tab2│Tab3│
├────────┬────────┤
│        │        │
│  左側  │  右側  │  ← 影響所有標籤
│        │        │
└────────┴────────┘
```

**用戶期望**：
```
標籤內分屏 (每個標籤獨立)
┌─────────────────┐
│ Tab1 │ Tab2     │
├────────┬────────┤  ← Tab1 有分屏
│ Term1  │ Term2  │
│        │        │
└────────┴────────┘

點擊 Tab2 →
┌─────────────────┐
│ Tab1 │ Tab2     │
├─────────────────┤  ← Tab2 無分屏
│                 │
│   Single Term   │
└─────────────────┘
```

**好處**：
- ✅ 每個標籤可以有不同佈局（單視圖 / 分屏）
- ✅ 更符合用戶心智模型（類似 VS Code）
- ✅ 靈活性更高（某些標籤需要對比，某些不需要）

**實現要點**：
- 修改數據結構：`tab.layout = 'single' | 'split'`
- 修改分屏按鈕邏輯：只影響當前標籤
- 每個標籤可以有 1-2 個子終端

### 3. 標籤命名改進 (P1 - 易用性)

**現況**：
- 固定命名：Terminal 1, Terminal 2, Terminal 3...
- 無法區分不同專案/目錄

**期望**：
- 預設使用當前資料夾名稱
- 支援雙擊標籤名稱編輯
- 支援右鍵選單重命名

**範例**：
```
之前：
  Terminal 1 | Terminal 2 | Terminal 3

之後：
  my-project | backend | frontend
  (來自資料夾名稱)

手動編輯：
  my-project → Production Server ✅
```

---

## 🎯 實施計劃

### Phase 1：修復終端無法輸入 (1 小時)

```javascript
// src/hooks/useTerminal.js

cleanupTerminalExit = window.electronAPI.onTerminalExit((id, code) => {
  if (id === terminalId && xtermRef.current) {
    // 顯示退出訊息
    displayExitMessage(code);

    // 🔧 自動重啟 shell
    setTimeout(() => {
      restartShell();
    }, 500);
  }
});

function restartShell() {
  window.electronAPI.createTerminal({
    id: terminalId,
    cwd: cwd,
    shell: shell,
  }).then(() => {
    xtermRef.current.write('\x1b[90m[Shell restarted]\x1b[0m\r\n');
  });
}
```

### Phase 2：重構分屏架構 (3 小時)

**數據結構變更**：
```javascript
// 之前
{
  tabs: [
    { id: 'terminal-1', title: 'Terminal 1', shell, cwd }
  ],
  splitMode: true  // 全局分屏狀態
}

// 之後
{
  tabs: [
    {
      id: 'tab-1',
      title: 'my-project',
      layout: 'split',  // 'single' | 'split'
      terminals: [
        { id: 'terminal-1', shell, cwd },
        { id: 'terminal-2', shell, cwd }  // 分屏時才有
      ]
    }
  ]
}
```

**組件架構**：
```
App
├── TabBar
│   └── Tab (可編輯名稱)
└── TabContent
    ├── Single Mode (1 個 Terminal)
    └── Split Mode (2 個 Terminal)
```

**UI 變更**：
```javascript
// 分屏按鈕邏輯
const toggleSplitMode = (tabId) => {
  setTabs(tabs.map(tab => {
    if (tab.id === tabId) {
      if (tab.layout === 'single') {
        // 單視圖 → 分屏：新增第二個終端
        return {
          ...tab,
          layout: 'split',
          terminals: [
            ...tab.terminals,
            { id: `terminal-${uuid()}`, shell, cwd: tab.terminals[0].cwd }
          ]
        };
      } else {
        // 分屏 → 單視圖：只保留第一個終端
        return {
          ...tab,
          layout: 'single',
          terminals: [tab.terminals[0]]
        };
      }
    }
    return tab;
  }));
};
```

### Phase 3：標籤命名功能 (2 小時)

**資料夾名稱提取**：
```javascript
// 從 cwd 提取資料夾名稱
function getFolderName(cwd) {
  if (!cwd) return 'Terminal';

  const parts = cwd.split(/[\/\\]/);  // 處理 Windows/Unix 路徑
  return parts[parts.length - 1] || 'Terminal';
}

// 創建標籤時自動命名
const createNewTab = (cwd) => {
  const folderName = getFolderName(cwd);

  return {
    id: `tab-${uuid()}`,
    title: folderName,  // ✅ 使用資料夾名稱
    layout: 'single',
    terminals: [...]
  };
};
```

**可編輯標籤**：
```javascript
// TabBar.jsx
const [editingTabId, setEditingTabId] = useState(null);
const [editingTitle, setEditingTitle] = useState('');

<div onDoubleClick={() => startEditing(tab.id, tab.title)}>
  {editingTabId === tab.id ? (
    <input
      value={editingTitle}
      onChange={(e) => setEditingTitle(e.target.value)}
      onBlur={() => finishEditing()}
      onKeyPress={(e) => e.key === 'Enter' && finishEditing()}
      autoFocus
    />
  ) : (
    <span>{tab.title}</span>
  )}
</div>
```

---

## 📊 影響範圍

### 文件修改清單

| 文件 | 修改程度 | 說明 |
|------|---------|------|
| `src/App.jsx` | 🔴 重大 | 數據結構完全重構 |
| `src/components/TabBar.jsx` | 🟡 中等 | 添加編輯功能 |
| `src/hooks/useTerminal.js` | 🟢 小 | 添加自動重啟 |
| `src/components/Terminal.jsx` | 🟡 中等 | 適配新數據結構 |

### 向後兼容性

**會話數據遷移**：
```javascript
// 遷移舊格式到新格式
function migrateOldSession(oldSession) {
  return {
    tabs: oldSession.tabs.map(oldTab => ({
      id: oldTab.id,
      title: getFolderName(oldTab.cwd) || oldTab.title,
      layout: 'single',
      terminals: [{
        id: `terminal-${uuid()}`,
        shell: oldTab.shell,
        cwd: oldTab.cwd
      }]
    }))
  };
}
```

---

## ✅ 測試計劃

### 測試案例

**1. 終端重啟**
- [ ] Ctrl+C 後終端自動重啟
- [ ] 可以繼續輸入命令
- [ ] 重啟訊息正確顯示

**2. 分屏功能**
- [ ] 單視圖 → 分屏：新增第二個終端
- [ ] 分屏 → 單視圖：保留第一個終端
- [ ] 每個標籤分屏狀態獨立
- [ ] 切換標籤時佈局正確

**3. 標籤命名**
- [ ] 新建標籤自動使用資料夾名稱
- [ ] 雙擊標籤可以編輯名稱
- [ ] Enter 確認，Esc/失焦取消
- [ ] 名稱保存到本地存儲

**4. 向後兼容**
- [ ] 舊會話數據自動遷移
- [ ] 沒有資料夾路徑時使用默認名稱

---

## 🚀 實施時間表

```
Day 1 (2 小時):
  ✅ Phase 1: 終端重啟功能
  ✅ 測試並修復

Day 2 (4 小時):
  ⏳ Phase 2: 分屏架構重構
  ⏳ 測試並修復

Day 3 (3 小時):
  ⏳ Phase 3: 標籤命名功能
  ⏳ 完整測試
  ⏳ 文檔更新

總計: ~9 小時
```

---

## 💡 未來增強

### 可選功能（低優先級）

1. **分屏比例調整**
   - 拖動中間分隔線調整左右比例
   - 記住用戶偏好

2. **更多佈局選項**
   - 橫向分屏 (上下)
   - 三分屏 (1:1:1)
   - 自由佈局

3. **標籤顏色標記**
   - 不同專案用不同顏色
   - 快速識別

4. **標籤分組**
   - 相關標籤歸為一組
   - 折疊/展開

---

**下一步**: 開始實施 Phase 1（終端重啟功能）
