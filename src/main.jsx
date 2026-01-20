import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

// 移除 StrictMode，因為它會在開發模式下執行兩次 useEffect，
// 導致 node-pty 終端快速創建/銷毀出現 AttachConsole 錯誤
ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);
