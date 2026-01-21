# 手動測試指南

由於網絡問題，自動測試依賴未完全安裝。請使用此手動測試指南驗證所有功能和修復。

---

## 📋 測試清單

### 1. 安全修復測試

#### 🔴 CRITICAL #1: 命令注入防護
**測試步驟**:
1. 開啟開發者工具（F12）查看控制台
2. 在終端輸入以下命令（不會實際執行，只是測試驗證）:
   ```
   <!-- 這些命令會觸發警告 -->
   rm -rf /
   format C:
   del /S /F C:\Windows
   ```
3. **預期結果**: 控制台應該顯示警告訊息

**驗證點**:
- ✅ 過長命令（>10000 字符）被拒絕
- ✅ 危險命令顯示警告
- ✅ 命令類型檢查生效

---

#### 🔴 CRITICAL #2: Shell 路徑白名單
**測試步驟**:
1. 打開設定面板
2. 嘗試選擇不同的 shell（CMD, PowerShell, Bash）
3. 檢查控制台是否有白名單拒絕訊息

**驗證點**:
- ✅ 只允許白名單中的 shell
- ✅ 非白名單 shell 使用默認值
- ✅ 控制台記錄警告訊息

---

#### 🔴 CRITICAL #3: localStorage XSS 防護
**測試步驟**:
1. 關閉應用
2. 開啟開發者工具（F12）
3. 在控制台手動污染 localStorage:
   ```javascript
   localStorage.setItem('lastSession', JSON.stringify({
     tabs: [{
       id: 'test',
       title: '<script>alert("XSS")</script>',
       command: 'malicious command'
     }],
     activeTabId: 'test'
   }))
   ```
4. 在設定中啟用「恢復會話」
5. 重新啟動應用

**預期結果**:
- ✅ 不會顯示 alert
- ✅ 惡意 command 不會自動執行
- ✅ 數據被驗證和清理

---

### 2. UX 改進測試

#### 🎨 自定義確認對話框
**測試步驟**:
1. 打開設定面板
2. 點擊「數據管理」區域的任一清除按鈕
3. 測試確認對話框功能:
   - 點擊背景關閉
   - 按 ESC 鍵關閉
   - 點擊「取消」按鈕
   - 點擊「確定」按鈕並觀察成功提示

**驗證點**:
- ✅ 對話框顯示正確
- ✅ 背景點擊可關閉
- ✅ ESC 鍵可關閉
- ✅ 危險操作顯示紅色按鈕
- ✅ 成功提示自動消失（3秒）

---

### 3. 命令攔截測試

#### 🔧 Windows 命令攔截
**測試步驟**（Windows 系統）:
1. 在終端輸入以下命令:
   ```
   start cmd /k npm run dev
   start cmd
   start powershell
   wt -d ./frontend npm start
   ```

**預期結果**:
- ✅ 這些命令應在應用內開啟新標籤
- ✅ 帶參數的命令應自動執行
- ✅ 不會開啟外部終端視窗

**不應攔截**（子 shell）:
```
cmd
powershell
bash
```
這些應在當前終端啟動子 shell。

---

#### 🔧 Linux/Mac 命令攔截
**測試步驟**（Linux/Mac 系統）:
1. 在終端輸入:
   ```
   gnome-terminal -- npm run dev
   konsole -e python server.py
   ```

**預期結果**:
- ✅ 在應用內開啟新標籤
- ✅ 命令自動執行

---

### 4. 性能優化測試

#### ⚡ useEffect 依賴優化
**測試步驟**:
1. 開啟開發者工具 Performance 選項卡
2. 開始錄製
3. 快速執行以下操作:
   - 創建多個終端標籤（Ctrl+T）
   - 切換標籤（Ctrl+1, Ctrl+2, ...）
   - 關閉標籤（Ctrl+W）
   - 切換分屏（Ctrl+\）
4. 停止錄製並檢查性能

**驗證點**:
- ✅ 鍵盤快捷鍵響應迅速
- ✅ 沒有明顯的卡頓
- ✅ 事件監聽器註冊次數減少

---

### 5. 路徑驗證測試

#### 🔒 路徑規範化
**測試步驟**:
1. 打開新終端對話框
2. 測試不同的路徑格式:
   ```
   ../test
   ./project
   /home/user/../user/project
   ```
3. 檢查控制台日誌

**預期結果**:
- ✅ 相對路徑轉換為絕對路徑
- ✅ `..` 和 `.` 被解析
- ✅ 可疑路徑顯示警告

---

### 6. 完整功能測試

#### ✨ 核心功能
**測試清單**:
- [ ] 創建新終端標籤（Ctrl+T）
- [ ] 關閉終端標籤（Ctrl+W）
- [ ] 切換標籤（Ctrl+1-9）
- [ ] 分屏模式（Ctrl+\）
- [ ] 複製/貼上（Ctrl+C/V）
- [ ] 開啟設定面板（齒輪圖標）
- [ ] 保存設定
- [ ] 清除數據（確認對話框）
- [ ] 選擇工作目錄
- [ ] 選擇 Shell
- [ ] 會話恢復（重啟應用）
- [ ] 項目群組管理

---

## 🐛 已知問題

### 開發環境警告
以下警告是正常的，不影響功能:
- `xterm@5.3.0 deprecated` - xterm 版本警告
- `AttachConsole failed` - Windows 控制台警告（已優化）
- CSP 警告（開發模式） - 生產環境會自動修復

---

## 📝 測試報告模板

完成測試後，請填寫以下報告:

```
## 測試結果

**測試日期**: YYYY-MM-DD
**測試環境**: Windows/Linux/Mac
**Node 版本**:
**Electron 版本**:

### 安全測試
- [ ] 命令注入防護: PASS/FAIL
- [ ] Shell 白名單: PASS/FAIL
- [ ] localStorage 驗證: PASS/FAIL

### UX 測試
- [ ] 確認對話框: PASS/FAIL
- [ ] 成功提示: PASS/FAIL

### 命令攔截測試
- [ ] Windows 命令: PASS/FAIL
- [ ] Unix/Linux 命令: PASS/FAIL

### 性能測試
- [ ] 鍵盤快捷鍵: PASS/FAIL
- [ ] 事件監聽器優化: PASS/FAIL

### 功能測試
- [ ] 所有核心功能: PASS/FAIL

### 發現的問題
1.
2.
3.

### 備註
```

---

## 🚀 自動化測試（可選）

如果測試依賴安裝成功，運行:

```bash
# 安裝測試依賴
npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom happy-dom

# 運行測試
npm test

# 查看測試 UI
npm run test:ui

# 生成覆蓋率報告
npm run test:coverage
```

---

## 📞 問題回報

如果發現任何問題:
1. 記錄錯誤訊息和控制台輸出
2. 記錄復現步驟
3. 截圖（如適用）
4. 在 GitHub 創建 Issue

---

## ✅ 測試完成檢查

全部測試完成後，確認:
- [ ] 所有 CRITICAL 安全測試通過
- [ ] 所有 UX 改進正常工作
- [ ] 命令攔截功能正確
- [ ] 性能優化有效
- [ ] 核心功能無問題

**恭喜！應用已準備好使用！** 🎉
