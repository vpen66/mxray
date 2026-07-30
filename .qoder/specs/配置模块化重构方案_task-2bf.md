# 高级配置页面模块化重构方案

## 一、核心思路

在现有"高级配置"页面（`src/pages/JsonConfig.tsx`）基础上改造，而非另起炉灶：

- **保留**：左侧配置文件列表面板 + 右侧可视化结构视图 + JSON 源码模式 + 各编辑模态框
- **扩展**：可视化结构中新增更多配置模块区块（当前仅有入站/路由/出站/DNS/观测）
- **移除**：侧边栏中的"控制台"、"节点代理"、"订阅配置"、"路由规则"四个入口
- **交互**：用户在选中一个配置文件后，点击"新增配置"按钮 -> 选择模块类型（如"入站代理"、"日志配置"等）-> 新项出现在可视化结构对应区块中

---

## 二、侧边栏精简

### 修改文件：`src/components/Sidebar.tsx`

移除前的 NAV_ITEMS：
```
控制台 / 节点代理 / 订阅配置 / 路由规则 / 实时日志 / 高级配置 / 系统设置
```

移除后：
```
高级配置 / 实时日志 / 系统设置
```

同步修改 `src/App.tsx` 中的 `renderActivePage()`，移除 Dashboard/Proxies/Profiles/Rules 的路由分支。

可保留但不在侧边栏显示的页面文件（后续清理）：
- `src/pages/Dashboard.tsx`
- `src/pages/Proxies.tsx`
- `src/pages/Profiles.tsx`
- `src/pages/Rules.tsx`

---

## 三、可视化结构扩展设计

### 3.1 当前已有区块（保留并优化）

| 区块 | 对应字段 | 现有操作 |
|:---:|:---:|:---:|
| 入站配置 | `inbounds[]` | 添加入站、编辑、删除、嗅探开关 |
| 策略分流规则映射 | `routing.rules[]` | 添加规则、排序、启用/禁用、编辑、复制、删除 |
| 节点出站映射 | `outbounds[]` | 添加出站、编辑、删除 |
| DNS 服务器 | `dns.servers[]` | 添加 DNS、编辑、删除 |
| 连接观测 | `observatory` / `burstObservatory` | 类型切换、编辑 |

### 3.2 新增区块

| 新区块 | 对应字段 | 可视化内容 | 出现条件 |
|:---:|:---:|:---:|:---:|
| 环境变量 | `env` | 键值对列表 | 用户新增后显示 |
| 日志配置 | `log` | loglevel/access/error/dnsLog/maskAddress | 用户新增后显示 |
| API 接口 | `api` | tag + services 多选 | 用户新增后显示 |
| FakeDNS | `fakedns[]` | ipPool + poolSize 列表 | 用户新增后显示 |
| 传输配置 | `transport` | 全局 streamSettings | 用户新增后显示 |
| 本地策略 | `policy` | levels + system 数值表单 | 用户新增后显示 |
| 路由全局设置 | `routing.domainStrategy/domainMatcher/balancers` | 下拉 + balancers 列表 | 有 routing 时显示 |
| 统计信息 | `stats` | 启用开关（空对象） | 用户新增后显示 |
| Metrics | `metrics` | tag 输入 + 启用开关 | 用户新增后显示 |
| 地理数据 | `geodata` | 更新 URL/周期/热重载 | 用户新增后显示 |
| 版本约束 | `version` | min/max 输入 | 用户新增后显示 |

### 3.3 区块显示逻辑

- **始终显示**：入站配置、出站映射、路由规则（核心三件套，即使为空也显示空态 + 添加按钮）
- **按需显示**：其余模块仅在配置 JSON 中存在对应字段 或 用户主动新增后才渲染区块
- 这样避免界面一上来就铺满 15 个区块，保持简洁

---

## 四、"新增配置"交互流程

### 4.1 入口按钮

在可视化结构区域顶部（"可视化结构" / "JSON 源码" 切换按钮旁边），新增一个 **"+ 新增配置"** 按钮。

### 4.2 点击后弹出模块选择菜单

弹出一个下拉/模态框，列出所有可新增的模块类型：

```
+---------------------------+
| 选择要新增的配置模块       |
+---------------------------+
| 环境变量                  |
| 日志配置                  |
| API 接口                  |
| DNS 服务器                |  <- 已有则显示"已添加"
| FakeDNS                   |
| 入站代理                  |  <- 数组类型，可反复新增
| 出站代理                  |  <- 数组类型，可反复新增
| 传输配置                  |
| 本地策略                  |
| 路由规则                  |  <- 数组类型
| 统计信息                  |
| Metrics                   |
| 连接观测                  |
| 地理数据                  |
| 版本约束                  |
+---------------------------+
```

### 4.3 新增后的行为

- **单对象模块**（log/api/dns/transport/policy/stats/metrics/geodata/version/env）：
  - 如果该模块已存在，提示"该配置已存在"并跳转到对应区块编辑
  - 如果不存在，使用默认模板 JSON 创建，对应区块立即出现在可视化结构中
  
- **数组模块**（inbounds/outbounds/fakedns/routing.rules）：
  - 每次点击新增一个 item，打开对应的编辑模态框
  - 与现有"+ 添加入站"、"+ 添加出站"行为一致

### 4.4 各区块内的操作（统一规范）

每个区块标题栏右侧保留：
- `+ 添加XXX` 按钮（数组类型）或 `编辑` 按钮（单对象类型）
- 区块内的每个 item 卡片：启用/禁用开关、编辑（打开模态框）、复制、删除

---

## 五、编辑模态框扩展

### 5.1 现有模态框（保留）

- 入站编辑模态框（`inboundModal`）- 已支持多协议可视化 + JSON 双模式
- 出站编辑模态框（`outboundModal`）- 已支持多协议 + streamSettings
- 路由规则模态框（`ruleModal`）- 已支持 domain/ip/port/protocol
- DNS 模态框（`dnsModal`）
- 连接观测模态框（`observatoryModal`）

### 5.2 新增模态框

需要新增以下编辑模态框（均支持 可视化/JSON 双模式）：

| 模态框 | 可视化表单内容 |
|:---:|:---|
| LogModal | loglevel 下拉、access/error 路径、dnsLog 开关、maskAddress 下拉 |
| ApiModal | tag 输入、services 多选复选框 |
| FakeDnsModal | ipPool 输入、poolSize 数字 |
| TransportModal | network 下拉、security 下拉、tls/reality/ws/grpc/h2 子表单 |
| PolicyModal | levels 各数值字段 + system 各数值字段 |
| StatsModal | 仅一个启用开关（极简） |
| MetricsModal | tag 输入 + 启用开关 |
| GeodataModal | 更新 URL、更新周期、热重载开关 |
| VersionModal | min/max 版本输入 |
| EnvModal | 动态键值对列表 |

### 5.3 模态框统一规范

- 标题栏：模块图标 + "新增XXX" / "编辑XXX"
- 视图切换：可视化结构 / JSON 源码（复用现有 `Eye` / `Code2` 按钮样式）
- 底部操作：保存 / 取消
- 下拉框统一使用 `CustomSelect` 组件
- 遵循项目 UI 规范（深色玻璃材质、无原生 select、无括号英文后缀）

---

## 六、代码重构策略

### 6.1 拆分 JsonConfig.tsx（5061 行 -> 多文件）

当前单文件过于庞大，按职责拆分：

```
src/pages/
├── JsonConfig.tsx              # 主页面骨架（配置文件列表 + 视图切换 + 区块容器）~400行
├── config-sections/            # 可视化结构各区块组件
│   ├── InboundSection.tsx      # 入站配置区块
│   ├── OutboundSection.tsx     # 出站映射区块
│   ├── RoutingSection.tsx      # 路由规则区块
│   ├── DnsSection.tsx          # DNS 区块
│   ├── LogSection.tsx          # 日志区块
│   ├── ApiSection.tsx          # API 区块
│   ├── FakeDnsSection.tsx      # FakeDNS 区块
│   ├── TransportSection.tsx    # 传输配置区块
│   ├── PolicySection.tsx       # 本地策略区块
│   ├── StatsSection.tsx        # 统计信息区块
│   ├── MetricsSection.tsx      # Metrics 区块
│   ├── ObservatorySection.tsx  # 连接观测区块
│   ├── GeodataSection.tsx      # 地理数据区块
│   ├── VersionSection.tsx      # 版本约束区块
│   └── EnvSection.tsx          # 环境变量区块
├── config-modals/              # 编辑模态框组件
│   ├── InboundModal.tsx
│   ├── OutboundModal.tsx
│   ├── RoutingRuleModal.tsx
│   ├── DnsModal.tsx
│   ├── LogModal.tsx
│   ├── ApiModal.tsx
│   ├── FakeDnsModal.tsx
│   ├── TransportModal.tsx
│   ├── PolicyModal.tsx
│   ├── StatsModal.tsx
│   ├── MetricsModal.tsx
│   ├── ObservatoryModal.tsx
│   ├── GeodataModal.tsx
│   ├── VersionModal.tsx
│   └── EnvModal.tsx
```

### 6.2 Store 调整

`useConfigStore.ts` 保持核心结构不变（profiles + activeProfileId + content 文本），因为：
- 每个配置文件的 `content` 仍然是完整 config.json 文本
- 可视化结构只是对 content 的解析投影
- 新增/编辑模块项 -> 修改 content JSON -> 保存

新增辅助函数（在 `src/utils/` 中）：
```typescript
// configSectionHelper.ts
export function getModuleFromConfig(json: string, moduleId: string): any;
export function setModuleInConfig(json: string, moduleId: string, value: any): string;
export function addArrayItemInConfig(json: string, moduleId: string, item: any): string;
export function removeArrayItemInConfig(json: string, moduleId: string, index: number): string;
export function getAvailableModules(json: string): ModuleStatus[];  // 哪些已添加/未添加
```

### 6.3 移除的代码

- `src/pages/Dashboard.tsx` - 删除
- `src/pages/Proxies.tsx` - 删除
- `src/pages/Profiles.tsx` - 删除
- `src/pages/Rules.tsx` - 删除
- `src/stores/useProxyStore.ts` - 删除（订阅/节点管理不再需要独立页面）
- `src/components/RoutingVisualizer.tsx` - 删除
- `src/components/OutboundSelect.tsx` - 保留（路由规则编辑仍需要）
- `src/components/ProfileNodeSelect.tsx` - 删除
- `src/utils/subParser.ts` - 删除（订阅解析不再需要）
- `src/utils/xrayMapper.ts` - 精简或删除（不再需要节点<->outbound 双向映射）
- `useConfigStore.ts` 中的 `syncNodesAndGroups` 方法 - 删除

---

## 七、启动内核流程

保持现有逻辑基本不变：

```
用户点击"启动此配置" 
  -> 读取当前选中 profile 的 content（完整 config.json）
  -> 过滤 enabled=false 的 routing rules
  -> 根据 TUN 模式开关决定是否包含 tun-in 入站
  -> invoke('start_kernel', { configJson })
```

不再需要从 useProxyStore 动态注入节点，因为用户直接在 outbounds 区块中管理所有出站。

---

## 八、实施步骤

### 阶段一：侧边栏精简 + 页面清理
1. 修改 `Sidebar.tsx` NAV_ITEMS，仅保留 3 项
2. 修改 `App.tsx` 路由分支
3. 删除不再需要的页面和组件文件
4. 清理 `useAppStore.ts` 中对 useProxyStore 的引用
5. 验证 `pnpm build` 通过

### 阶段二：拆分 JsonConfig.tsx
6. 创建 `src/pages/config-sections/` 目录，将现有入站/出站/路由/DNS/观测区块抽为独立组件
7. 创建 `src/pages/config-modals/` 目录，将现有 5 个模态框抽为独立组件
8. 重写 `JsonConfig.tsx` 为精简的容器组件（组合 sections + modals）
9. 验证功能不变，`pnpm build` 通过

### 阶段三：新增模块区块 + 模态框
10. 实现"+ 新增配置"按钮 + 模块选择菜单
11. 实现 LogSection + LogModal
12. 实现 ApiSection + ApiModal
13. 实现 FakeDnsSection + FakeDnsModal
14. 实现 TransportSection + TransportModal
15. 实现 PolicySection + PolicyModal
16. 实现 StatsSection + StatsModal
17. 实现 MetricsSection + MetricsModal
18. 实现 GeodataSection + GeodataModal
19. 实现 VersionSection + VersionModal
20. 实现 EnvSection + EnvModal

### 阶段四：整合与优化
21. 实现区块按需显示逻辑（已添加的模块才显示）
22. 实现 `configSectionHelper.ts` 工具函数
23. 修改启动内核逻辑，移除动态注入
24. 清理 useConfigStore 中的 syncNodesAndGroups 等废弃方法
25. `pnpm build` + `pnpm lint` 最终验证

---

## 九、可视化结构区域最终效果

```
+------------------------------------------------------------------+
| [配置文件列表]  |  默认标准分流配置                                |
|                 |  [可视化结构] [JSON 源码]  [+ 新增配置] [启动]   |
| > 默认标准分流  |  ================================================ |
|   TUN全局接管   |                                                  |
|   极简调试      |  [日志配置]  loglevel: warning  [编辑]           |
|                 |  ------------------------------------------------ |
|                 |  [入站配置]                    [+ 添加入站]       |
|                 |    socks-in  127.0.0.1:7890   [启用] [编辑] [删] |
|                 |    http-in   127.0.0.1:7891   [启用] [编辑] [删] |
|                 |    tun-in    TUN 虚拟网卡      [禁用] [编辑] [删] |
|                 |  ------------------------------------------------ |
|                 |  [DNS 服务器]                  [+ 添加 DNS]       |
|                 |    https://1.1.1.1/dns-query   [编辑] [删]       |
|                 |    223.5.5.5 (geosite:cn)      [编辑] [删]       |
|                 |  ------------------------------------------------ |
|                 |  [策略分流规则]                [+ 添加规则]       |
|                 |    1. 国外代理域名 -> proxy    [启用] [编辑] [删] |
|                 |    2. 国内直连 -> direct       [启用] [编辑] [删] |
|                 |    3. 广告拦截 -> block        [启用] [编辑] [删] |
|                 |  ------------------------------------------------ |
|                 |  [出站映射]                    [+ 添加出站]       |
|                 |    direct   freedom            [编辑] [删]       |
|                 |    block    blackhole          [编辑] [删]       |
|                 |    my-vps   vless+reality      [编辑] [删]       |
|                 |  ------------------------------------------------ |
|                 |  [连接观测]  observatory       [编辑]            |
|                 |  ------------------------------------------------ |
|                 |  (其余模块未添加时不显示，通过"+新增配置"添加)    |
+------------------------------------------------------------------+
```
