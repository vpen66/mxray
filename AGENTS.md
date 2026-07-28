# AGENTS.md - AI Agent 与开发者开发指南

> **适用对象**：AI 编码助手（Antigravity、Claude、GPT-4o、Cursor 等）及人类开发者。
> **项目名称**：`mxray` — 基于 **Tauri 2**、**React 19**、**TypeScript**、**Rust** 及 **Tailwind CSS** 构建的高性能跨平台 Xray GUI 客户端。

---

## 🎯 核心架构设计理念

### 1. 单一事实来源：`config.json`
在 `mxray` 项目中，一切设计与功能均围绕 Xray 内核的官方原生配置文件 **`config.json`** 展开：
- **UI 即视图/投影**：界面上的所有控件（节点卡片、策略组选择器、路由分流规则、入站/出站开关、DNS 策略、TUN 模式等）均为 `config.json` 的可视投影与编辑器。
- **配置数据流驱动**：对节点列表、策略组或系统代理模式的任何 GUI 操作，必须无缝且精准地转换为符合 Xray 官方标准的 JSON 配置对象。
- **官方规范遵循**：所有生成的 Xray 配置文件及类型定义，必须严格遵照官方文档规范 **[https://xtls.github.io/config](https://xtls.github.io/config)**。

---

## 📘 Xray 配置规范详解（严格遵循 https://xtls.github.io/config）

AI Agent 在解析、生成、校验或重构 Xray 配置与 TypeScript/Rust 代码时，必须遵循以下标准的 Xray 配置 Schema：

### 1. 根对象顶层结构（Root Schema）
Xray `config.json` 的根对象包含以下标准顶级字段：

```json
{
  "log": { ... },
  "api": { ... },
  "dns": { ... },
  "fakedns": [ ... ],
  "inbounds": [ ... ],
  "outbounds": [ ... ],
  "routing": { ... },
  "policy": { ... },
  "reverse": { ... },
  "transport": { ... },
  "stats": { ... }
}
```

| 字段 | 类型 | 规范说明与关键属性 |
| :--- | :--- | :--- |
| `log` | `Object` | `loglevel`: `"debug"` \| `"info"` \| `"warning"` \| `"error"` \| `"none"`, `access`, `error`, `dnsLog` |
| `api` | `Object` | `tag`: `"api"`, `services`: `["HandlerService", "LoggerService", "StatsService"]` |
| `dns` | `Object` | `hosts`, `servers` (支持字符串地址或对象描述符), `queryStrategy` (`"UseIP"`, `"UseIPv4"`, `"UseIPv6"`), `disableCache`, `disableFallback`, `tag` |
| `fakedns` | `Array` | 虚拟 IP 地址池数组，例如：`[{ "ipPool": "198.18.0.0/15", "poolSize": 65535 }]` |
| `inbounds` | `Array` | 入站协议对象列表（`socks`, `http`, `dokodemo-door`, `vless`, `vmess` 等） |
| `outbounds` | `Array` | 出站协议对象列表（`vless`, `vmess`, `trojan`, `shadowsocks`, `hysteria2`, `wireguard`, `freedom`, `blackhole`） |
| `routing` | `Object` | `domainStrategy` (`"AsIs"`, `"IPIfNonMatch"`, `"IPOnDemand"`), `domainMatcher` (`"linear"`, `"mph"`, `"hybrid"`), `rules` (路由规则列表), `balancers` |
| `policy` | `Object` | `levels` (连接超时与缓存策略), `system` (握手与内存策略) |

---

### 2. 协议与传输层标准 Schema

#### 出站协议映射（`outbounds[]`）
- **VLESS (`protocol: "vless"`)**
  - 设置: `{ "vnext": [{ "address": string, "port": number, "users": [{ "id": string, "encryption": "none", "flow": "xtls-rprx-vision" }] }] }`
  - *注意：用户标识字段为 `id`，非 `uuid`；流控字段为 `flow`*
- **VMess (`protocol: "vmess"`)**
  - 设置: `{ "vnext": [{ "address": string, "port": number, "users": [{ "id": string, "alterId": 0, "security": "auto" | "aes-128-gcm" | "chacha20-poly1305" }] }] }`
- **Trojan (`protocol: "trojan"`)**
  - 设置: `{ "servers": [{ "address": string, "port": number, "password": string }] }`
- **Shadowsocks (`protocol: "shadowsocks"`)**
  - 设置: `{ "servers": [{ "address": string, "port": number, "method": string, "password": string, "ota": false }] }`
- **Hysteria2 (`protocol: "hysteria2"`)**
  - 设置: `{ "servers": [{ "address": string, "port": number, "password": string }] }`
- **Freedom / 直连 (`protocol: "freedom"`)**
  - 设置: `{ "domainStrategy": "AsIs" | "UseIP" | "UseIPv4" | "UseIPv6", "redirect": string }`
- **Blackhole / 阻断 (`protocol: "blackhole"`)**
  - 设置: `{ "response": { "type": "none" | "http" } }`

#### 传输与安全设置（`streamSettings`）
入站和出站均可配置 `streamSettings`：
- **`network`** (底层传输方式): `"tcp"` \| `"ws"` \| `"grpc"` \| `"h2"` \| `"quic"`
- **`security`** (安全传输类型): `"none"` \| `"tls"` \| `"reality"`
- **`tlsSettings`**: `{ "serverName": string, "allowInsecure": boolean, "fingerprint": "chrome" | "firefox" | "safari", "alpn": string[] }`
- **`realitySettings`**: `{ "show": false, "fingerprint": "chrome", "serverName": string, "publicKey": string, "shortId": string, "spiderX": "/" }`
- **`wsSettings`**: `{ "path": string, "headers": { "Host": string } }`
- **`grpcSettings`**: `{ "serviceName": string, "multiMode": boolean }`
- **`httpSettings`**: `{ "host": string[], "path": string }`

---

### 3. 路由匹配引擎结构（`routing`）
路由规则按数组顺序优先匹配：
```json
{
  "routing": {
    "domainStrategy": "IPIfNonMatch",
    "domainMatcher": "hybrid",
    "rules": [
      {
        "type": "field",
        "outboundTag": "direct",
        "domain": ["geosite:cn", "geosite:private"],
        "ip": ["geoip:cn", "geoip:private"]
      },
      {
        "type": "field",
        "outboundTag": "block",
        "domain": ["geosite:category-ads-all"]
      },
      {
        "type": "field",
        "outboundTag": "proxy",
        "network": "tcp,udp"
      }
    ]
  }
}
```

---

## 🏗️ 项目架构与配置数据流

```
mxray/
├── AGENTS.md                     # 本文件：AI Agent 与开发者开发指南（中文版）
├── src/                          # 前端（React 19 + TypeScript + Zustand）
│   ├── components/               # React 组件 (编辑器, 节点列表, 策略组, 日志, 设置)
│   ├── pages/                    # 主要页面 (仪表盘, 配置文件, 节点, 路由规则, JSON编辑器)
│   ├── stores/                   # 状态管理
│   │   ├── useConfigStore.ts     # 配置 Profile 管理、当前 JSON 文本及同步逻辑
│   │   ├── useProxyStore.ts      # 节点与策略组选择、延迟测试
│   │   ├── useKernelStore.ts     # Xray 内核运行状态、系统代理及 TUN 模式控制
│   │   └── useLogStore.ts        # 实时日志缓冲区
│   ├── types/                    # TypeScript 类型定义
│   │   └── index.ts              # ProxyNode, XrayConfigProfile, XrayOutbound, CoreState 等
│   └── utils/                    # 工具函数
│       └── xrayMapper.ts         # 核心映射层 (ProxyNode/Group 与 config.json 双向转换)
└── src-tauri/                    # 后端（Rust / Tauri 2）
    └── src/
        ├── config/               # Rust 配置处理模块
        │   ├── builder.rs        # 运行时 config.json 程序化构建器
        │   ├── parser.rs         # 配置文件解析与格式化
        │   └── merge.rs          # JSON Patch 补丁合并工具
        └── kernel.rs             # Xray-core 子进程生命周期管理 (启动/停止/重启/校验)
```

### 核心双向数据流说明
1. **配置文件 Store (`src/stores/useConfigStore.ts`)**：
   - 维护多个 `XrayConfigProfile` 配置预设（每个预设包含一份完整的 `config.json` 文本）。
   - 预设模板（如 `TEMPLATE_STANDARD`, `TEMPLATE_TUN`, `TEMPLATE_MINIMAL`）严格遵循 `https://xtls.github.io/config`。
2. **转换映射层 (`src/utils/xrayMapper.ts`)**：
   - `nodeToXrayOutbound(node: ProxyNode)`: 将 UI 界面节点对象转换为符合 Xray 规范的 `XrayOutbound` 对象。
   - `xrayOutboundToNode(outbound: XrayOutbound)`: 将 Xray `Outbound` 节点反向解析为 GUI 界面节点。
   - `syncNodesAndGroupsToConfigJson(rawJson, nodes, groups)`: 将节点列表和策略组规则合并注入现有的 `config.json` 中，同时保留用户自定义的高级模块（如自定义 `log`, `dns`, `fakedns` 或自定义 `routing.rules`）。
3. **Rust 内核集成 (`src-tauri/src/config/builder.rs` & `kernel.rs`)**：
   - 构建运行时配置 JSON 文本，在启动 Xray-core 时通过标准输入或临时配置文件传递给 Xray 进程。

---

## 🤖 AI Agent 必须遵循的开发规则

AI Agent 在修改或新增本项目的代码时，必须严格遵守以下指令：

### 1. 严格对齐 Xray 官方文档
- **禁止私自发明字段**：不得在 `config.json` 中使用非官方或不存在的属性名。
- **校验字段拼写**：始终对照 [https://xtls.github.io/config](https://xtls.github.io/config) 核对字段，例如 VLESS 协议中的 `id`、REALITY 的 `realitySettings` 以及流控 `flow: "xtls-rprx-vision"`。

### 2. 保护用户自定义配置块
- 在通过界面同步节点或修改基础设置时，**严禁清空或损坏**用户自定的根字段（如 `dns.hosts`, `policy`, `fakedns`, `reverse` 或特定的 `routing.rules`）。
- 必须使用深度合并或基于 Tag 替换的方式更新配置文件。

### 3. 保留基准系统出站（Outbound）
- 任何生成的配置中，必须包含并保留以下基础系统出站标识（Tag）：
  - `"direct"`（协议：`"freedom"`）
  - `"block"`（协议：`"blackhole"`）
  - `"proxy"`（默认主代理出站标识）

### 4. 代码类型与安全规范
- 修改 `xrayMapper.ts` 或 Rust 后端 `builder.rs` 时，必须同步更新 `src/types/index.ts` 中的 TypeScript 接口定义。
- 所有的 JSON 解析与反序列化逻辑必须包含异常捕获（`try-catch` 或 Rust `Result`），防止因用户导入非法 JSON 导致应用崩溃。

### 5. UI 组件与下拉框统一规范（Dropdown UI Standard）
- **禁止使用原生 HTML `<select>` 标签**：为确保跨平台 UI 风格高度一致、现代化与极佳的暗黑美学体验，应用中所有下拉选择组件（如入站/出站协议选择、传输安全设置、路由规则目标及网络类型等）严禁使用浏览器原生 `<select>` 标签。
- **统一使用自定义下拉组件**：必须统一使用 `CustomSelect`（`src/components/CustomSelect.tsx`）或 `OutboundSelect`（`src/components/OutboundSelect.tsx`）。
- **统一设计风格**：下拉菜单需采用深色半透明玻璃材质（`bg-slate-900/98 backdrop-blur-2xl`）、细微边框高亮、选中项 Check 标识、圆角与平滑过渡动画，保持与分流规则中的下拉框（`OutboundSelect`）完全统一的视觉与交互规范。

### 6. 界面文本与标题规范（UI Title & Label Standard）
- **严禁在界面标题与 Label 中使用“括号+英文”后缀**：例如 `编辑出站配置 (Outbound)`、`VLESS 反向代理 (Reverse Proxy)`、`伪装域名 SNI (serverName)`、`显示调试日志 (show)`、`直连 (direct)`、`拒绝 (block)` 等。
- **保持纯正中文与简约专业视觉**：所有页面标题、模态框 Header、分组名称、表单控件 Label、下拉框选项名称必须保持纯粹、地道的中文表述（例如 `编辑出站配置`、`VLESS 反向代理`、`伪装域名 SNI`、`直连`、`拒绝`），禁止拼接类似 `(Outbound)`、`(Reverse Proxy)` 或对应 JSON 属性字段名的圆括号英文后缀。

### 7. 任务完成前验证命令
在向用户汇报任务完成前，必须执行以下命令确保代码编译无误：
- 前端构建检查：`pnpm build`
- 前端代码检查：`pnpm lint`（运行 oxlint）
- Rust 后端检查（若修改了 `src-tauri`）：在 `src-tauri` 目录下运行 `cargo check`

---

## 🔗 官方参考链接
- **Xray 官方配置总览:** [https://xtls.github.io/config](https://xtls.github.io/config)
- **Xray 出站协议说明:** [https://xtls.github.io/config/outbounds/](https://xtls.github.io/config/outbounds/)
- **Xray 入站协议说明:** [https://xtls.github.io/config/inbounds/](https://xtls.github.io/config/inbounds/)
- **Xray 路由配置文档:** [https://xtls.github.io/config/routing.html](https://xtls.github.io/config/routing.html)
- **Xray 传输层与 REALITY:** [https://xtls.github.io/config/transport.html](https://xtls.github.io/config/transport.html)
