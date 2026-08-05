# MXray

> 基于 **Tauri 2** + **React 19** + **Xray-core** 构建的现代化跨平台 Xray GUI 桌面客户端。

## 功能特性

- **配置管理** — 支持多配置预设（Profile）管理，内置标准、TUN、最小化等模板，基于 Monaco Editor 提供完整的 JSON 编辑体验
- **模块化配置编辑** — 可视化编辑入站（Inbound）、出站（Outbound）、路由规则、DNS、日志、策略、传输层等所有 Xray 配置模块
- **内核管理** — 支持内置内核、自定义路径内核及远程版本在线安装，一键启动/停止 Xray-core 进程
- **实时日志** — 结构化解析 Xray 运行日志，支持按连接、路由、DNS、入站/出站等分类过滤
- **系统代理** — 一键开关系统代理，支持 TUN 模式
- **自动更新** — 内置应用自动更新与 Xray 内核版本管理
- **订阅导入** — 支持通过订阅链接批量导入节点配置
- **跨平台** — 支持 macOS（Apple Silicon / Intel）、Windows 及 Linux

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端框架 | React 19 + TypeScript |
| 构建工具 | Vite 8 |
| 状态管理 | Zustand 5 |
| 样式 | Tailwind CSS 4 |
| 代码编辑 | Monaco Editor |
| 桌面框架 | Tauri 2 (Rust) |
| 包管理 | pnpm |
| 代码检查 | Oxlint |

## 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) >= 22
- [pnpm](https://pnpm.io/) >= 11
- [Rust](https://www.rust-lang.org/tools/install) (stable)

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/vpen66/mxray.git
cd mxray

# 安装前端依赖
pnpm install

# 启动开发环境（前端 + Tauri 桌面窗口）
pnpm tauri dev

# 构建生产版本
pnpm tauri build
```

### 前端单独开发

```bash
# 仅启动前端开发服务器（浏览器预览）
pnpm dev
```

## 项目结构

```
mxray/
├── src/                          # 前端源码
│   ├── components/               # 通用 React 组件
│   ├── pages/                    # 页面
│   │   ├── config-modals/        # 各配置模块编辑弹窗
│   │   ├── config-sections/      # 各配置模块展示区
│   │   ├── JsonConfig.tsx        # JSON 配置编辑器页面
│   │   ├── Logs.tsx              # 日志页面
│   │   └── Settings.tsx          # 设置页面
│   ├── stores/                   # Zustand 状态管理
│   │   ├── useConfigStore.ts     # 配置预设管理
│   │   ├── useKernelStore.ts     # Xray 内核状态
│   │   ├── useAppStore.ts        # 应用全局状态
│   │   └── useLogStore.ts        # 日志管理
│   ├── types/                    # TypeScript 类型定义
│   └── utils/                    # 工具函数
├── src-tauri/                    # Rust 后端
│   └── src/
│       ├── config/               # 配置解析、构建与合并
│       ├── kernel.rs             # Xray-core 进程管理
│       ├── sysproxy.rs           # 系统代理控制
│       └── helper.rs             # 辅助功能
└── .github/workflows/            # CI/CD 自动发布
```

## 开发命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动前端 Vite 开发服务器 |
| `pnpm build` | 构建前端静态资源 |
| `pnpm lint` | 运行 Oxlint 代码检查 |
| `pnpm tauri dev` | 启动完整桌面应用开发模式 |
| `pnpm tauri build` | 构建生产桌面应用 |

## 发布

项目使用 GitHub Actions 自动发布，推送 `v*` 格式的 Git tag 即可触发多平台构建：

```bash
git tag v1.2.0
git push origin v1.2.0
```

支持平台：macOS (aarch64 / x86_64)、Windows、Linux (Ubuntu)。

## 许可证

本项目仅供学习与研究使用。
