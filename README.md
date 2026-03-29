# Terminal Manager

<div align="center">

**专业的桌面终端管理器 - 基于 Electron + React**

一款现代化的终端管理器，让您轻松管理多个终端会话，支持分屏布局，告别杂乱无章的终端窗口。

</div>

---

## ✨ 核心特性

### 🎯 **多终端标签管理**
- 📑 支持无限标签页，轻松切换
- 🔄 拖拽排序（即将推出）
- ⚡ 快速创建/关闭终端

### 📐 **智能分屏布局**
- ↔️ 支持左右分屏显示
- 🖱️ 可调整分屏比例
- 👁️ 同时查看多个终端

### ⌨️ **强大的快捷键**
| 快捷键 | 功能 |
|--------|------|
| `Ctrl + T` | 新建终端 |
| `Ctrl + W` | 关闭当前终端 |
| `Ctrl + \` | 切换分屏模式 |
| `Ctrl + 1-9` | 快速切换到第 N 个标签 |

### 🎨 **美观的界面设计**
- 🌙 暗色主题（VSCode 风格）
- 🎯 直觉化操作
- 📱 响应式布局
- ✨ 流畅的动画效果

---

## 🚀 快速开始

### 📦 安装依赖

```bash
npm install
```

### 🔧 开发模式

```bash
npm run electron:dev
```

这将同时启动：
- Vite 开发服务器（React 热重载）
- Electron 应用窗口

### 📦 打包应用

```bash
npm run build          # 构建前端
npm run electron:build # 打包 Electron 应用
```

打包后的应用会在 `dist-electron/` 目录中。

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────┐
│          Electron 主进程             │
│  ┌──────────┐      ┌──────────┐    │
│  │ Main.js  │◄────►│ PTY服务  │    │
│  └──────────┘      └──────────┘    │
│        ▲                             │
│        │ IPC 通信                    │
│        ▼                             │
│  ┌──────────────────────────────┐   │
│  │     Preload.js (Bridge)      │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
           ▲
           │
           ▼
┌─────────────────────────────────────┐
│         React 渲染进程               │
│  ┌─────────┐    ┌──────────────┐   │
│  │  App.js │◄──►│  xterm.js    │   │
│  └─────────┘    └──────────────┘   │
│       │                             │
│       ├─► TabBar (标签栏)           │
│       ├─► Terminal (终端组件)       │
│       └─► SplitView (分屏布局)      │
└─────────────────────────────────────┘
```

### 核心技术栈

**前端层**
- ⚛️ React 18 - UI 框架
- 🎨 Tailwind CSS - 样式系统
- 🖥️ xterm.js - 终端渲染引擎
- 🎭 Lucide React - 图标库

**Electron 层**
- ⚡ Vite - 构建工具
- 🔌 node-pty - 伪终端 (PTY)
- 📦 electron-builder - 打包工具

---

## 📂 项目结构

```
terminal-manager/
├── electron/              # Electron 主进程
│   ├── main.js           # 应用入口
│   ├── preload.js        # 预加载脚本（IPC桥接）
│   └── pty-service.js    # PTY 服务（shell进程管理）
│
├── src/                  # React 前端
│   ├── components/
│   │   ├── Terminal.jsx      # 终端组件
│   │   ├── TabBar.jsx        # 标签栏组件
│   │   └── SplitView.jsx     # 分屏布局组件
│   ├── hooks/
│   │   └── useTerminal.js    # 终端管理 Hook
│   ├── styles/
│   │   └── index.css         # 全局样式
│   ├── App.jsx               # 主应用组件
│   └── main.jsx              # React 入口
│
├── public/               # 静态资源
│   └── icon.png
│
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

---

## 🎨 界面预览

### 主界面布局

```
┌─────────────────────────────────────────────┐
│  Terminal Manager        [分屏] [主题] [设置] │ ← 顶部工具栏
├─────────────────────────────────────────────┤
│ 📄 Terminal 1 | Terminal 2 | Terminal 3 [+] │ ← 标签栏
├──────────────────┬────────────────────────────┤
│                  │                            │
│   $ ls -la      │    $ npm run dev          │
│   total 48      │    > vite                  │
│   drwxr-xr-x    │    VITE ready in 234ms     │ ← 分屏终端
│   ...           │    ...                      │
│                  │                            │
├──────────────────┴────────────────────────────┤
│ 终端: 3 | 活动: terminal-1 | 模式: 分屏       │ ← 状态栏
└─────────────────────────────────────────────┘
```

---

## 🔑 核心功能说明

### 1. 多终端管理
- 每个标签页都是独立的 shell 进程
- 支持同时运行多个命令
- 自动保存终端历史记录（最多 10000 行）

### 2. 分屏功能
- 点击工具栏分屏按钮或按 `Ctrl + \`
- 拖动中间分割线调整比例
- 可在两个终端间快速切换

### 3. 真实的 Shell 体验
- 完整的 ANSI 转义序列支持
- 支持颜色和格式化输出
- 支持命令行编辑（方向键、删除等）
- 支持 Ctrl+C 中断命令

---

## 🛠️ 高级配置

### 自定义默认 Shell

编辑 `electron/pty-service.js`:

```javascript
const shell = process.env.SHELL || '/bin/zsh';  // 改为你喜欢的 shell
```

### 自定义终端主题

编辑 `src/hooks/useTerminal.js` 中的 theme 配置:

```javascript
theme: {
  background: '#1e1e1e',
  foreground: '#d4d4d4',
  // ... 更多颜色配置
}
```

### 调整终端字体

编辑 `src/hooks/useTerminal.js`:

```javascript
fontSize: 14,                          // 字体大小
fontFamily: 'Menlo, Monaco, ...',     // 字体族
```

---

## 🐛 常见问题

### Q: 为什么终端无法启动？
**A:** 检查是否安装了 `node-pty` 依赖。在某些系统上可能需要构建工具：

```bash
# macOS
xcode-select --install

# Ubuntu/Debian
sudo apt-get install build-essential python3

# Windows
npm install --global windows-build-tools
```

### Q: 快捷键不生效？
**A:** 确保应用窗口处于焦点状态，某些系统快捷键可能与应用冲突。

### Q: 如何更改应用图标？
**A:** 替换 `public/icon.png` 文件（推荐 512x512 PNG 格式）。

---

## 🗺️ 开发路线图

- [ ] 🎯 支持标签页拖拽排序
- [ ] 💾 会话保存与恢复
- [ ] 🎨 更多主题选择
- [ ] 📝 标签页重命名
- [ ] 🔍 搜索功能
- [ ] 📋 命令历史记录
- [ ] ⚙️ 可视化设置面板
- [ ] 🌐 支持 SSH 连接
- [ ] 🔒 密码管理器集成

---

## 📄 许可证

MIT License

---

## 👨‍💻 贡献

欢迎提交 Issue 和 Pull Request！

---

<div align="center">

**用专业的工具，做高效的工作** 💻

Made with ❤️ by Terminal Manager Team

</div>
