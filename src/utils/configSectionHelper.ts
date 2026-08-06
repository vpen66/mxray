/**
 * Xray 配置模块辅助工具类
 * 提供底层对 config.json 字符串各配置模块的获取、写入、更新、删除及模态/区块渲染判定能力
 */

export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  isArray: boolean;
  isAlwaysVisible?: boolean;
  defaultTemplate: any;
}

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    id: 'inbounds',
    name: '入站代理',
    description: 'Socks / HTTP / TUN / Dokodemo-door / VLESS / VMess / Trojan 入站',
    isArray: true,
    isAlwaysVisible: true,
    defaultTemplate: {
      tag: 'socks-in-new',
      port: 1080,
      listen: '127.0.0.1',
      protocol: 'socks',
      settings: { auth: 'noauth', udp: true },
      sniffing: { enabled: true, destOverride: ['http', 'tls', 'quic', 'fakedns'], routeOnly: true },
    },
  },
  {
    id: 'routing',
    name: '路由规则',
    description: '基于域名 (geosite)、IP (geoip)、端口及协议的分流规则与负载均衡器',
    isArray: false, // 路由本身为对象，内含 rules[] 数组
    isAlwaysVisible: true,
    defaultTemplate: {
      domainStrategy: 'IPIfNonMatch',
      domainMatcher: 'hybrid',
      rules: [
        {
          type: 'field',
          outboundTag: 'direct',
          domain: ['geosite:cn'],
        },
      ],
    },
  },
  {
    id: 'outbounds',
    name: '出站代理',
    description: 'Freedom / Blackhole / VLESS / VMess / Trojan / Shadowsocks / Hysteria 2 / WireGuard 出站',
    isArray: true,
    isAlwaysVisible: true,
    defaultTemplate: {
      tag: 'proxy-new',
      protocol: 'freedom',
      settings: {},
    },
  },
  {
    id: 'dns',
    name: 'DNS 服务器',
    description: '自定义 DNS 服务器、Hosts 域名映射与查询策略',
    isArray: false,
    defaultTemplate: {
      hosts: {},
      servers: ['1.1.1.1', '223.5.5.5'],
      queryStrategy: 'UseIP',
    },
  },
  {
    id: 'log',
    name: '日志配置',
    description: '控制台与文件日志输出级别 (debug/info/warning/error/none)、DNS日志及脱敏',
    isArray: false,
    defaultTemplate: {
      loglevel: 'warning',
      dnsLog: false,
      maskAddress: 'half',
    },
  },
  {
    id: 'api',
    name: 'API 接口',
    description: '远程 API 控制服务通道及其服务模块 (HandlerService/LoggerService/StatsService)',
    isArray: false,
    defaultTemplate: {
      tag: 'api',
      services: ['HandlerService', 'LoggerService', 'StatsService'],
    },
  },
  {
    id: 'fakedns',
    name: 'FakeDNS 地址池',
    description: '透明代理/TUN 模式下使用的虚拟 IP 地址池与大小',
    isArray: true,
    defaultTemplate: {
      ipPool: '198.18.0.0/15',
      poolSize: 65535,
    },
  },
  {
    id: 'transport',
    name: '全局传输配置',
    description: 'TCP / WebSocket / gRPC / HTTP2 / QUIC 等全局底层传输层属性',
    isArray: false,
    defaultTemplate: {
      tcpSettings: {
        acceptProxyProtocol: false,
      },
    },
  },
  {
    id: 'policy',
    name: '本地策略',
    description: '超时策略 (handshake/connIdle/uplinkOnly)、缓存与系统内存握手策略',
    isArray: false,
    defaultTemplate: {
      levels: {
        '0': {
          handshake: 4,
          connIdle: 300,
          uplinkOnly: 2,
          downlinkOnly: 5,
          statsUserUplink: false,
          statsUserDownlink: false,
          bufferSize: 0,
        },
      },
      system: {
        statsInboundUplink: false,
        statsInboundDownlink: false,
        statsOutboundUplink: false,
        statsOutboundDownlink: false,
      },
    },
  },
  {
    id: 'stats',
    name: '统计信息',
    description: '启用流量与连接状态统计',
    isArray: false,
    defaultTemplate: {},
  },
  {
    id: 'metrics',
    name: 'Metrics 监控',
    description: 'Prometheus 监控指标导出的 tag 标签与监听端口',
    isArray: false,
    defaultTemplate: {
      tag: 'metrics-in',
      listen: '127.0.0.1:9090',
    },
  },
  {
    id: 'observatory',
    name: '连接观测',
    description: '节点延迟延迟探测、可用性与测速组设置 (observatory / burstObservatory)',
    isArray: false,
    defaultTemplate: {
      subjectSelector: ['proxy'],
      probeUrl: 'https://www.google.com/generate_204',
      probeInterval: '10m',
      enableConcurrency: true,
    },
  },
  {
    id: 'geodata',
    name: '地理数据',
    description: 'GeoIP / GeoSite 自动更新 URL、更新周期与热重载设置',
    isArray: false,
    defaultTemplate: {
      geoipUrl: 'https://github.com/v2fly/geoip/releases/latest/download/geoip.dat',
      geositeUrl: 'https://github.com/v2fly/domain-list-community/releases/latest/download/dlc.dat',
      autoUpdate: true,
      interval: '24h',
    },
  },
  {
    id: 'version',
    name: '版本约束',
    description: '配置文件兼容的最低/最高 Xray 内核版本',
    isArray: false,
    defaultTemplate: {
      min: '1.8.0',
      max: '2.0.0',
    },
  },
  {
    id: 'env',
    name: '环境变量',
    description: '内核进程运行时自定义环境变量参数 (键值对)',
    isArray: false,
    defaultTemplate: {
      XRAY_LOCATION_ASSET: './assets',
    },
  },
];

/**
 * 解析配置 JSON 中的模块内容
 */
export function getModuleFromConfig(jsonStr: string, moduleId: string): any {
  try {
    const config = JSON.parse(jsonStr || '{}');
    if (moduleId === 'routing.rules') {
      return config.routing?.rules || [];
    }
    return config[moduleId];
  } catch {
    return undefined;
  }
}

/**
 * 设置/更新配置 JSON 中的单对象模块
 */
export function setModuleInConfig(jsonStr: string, moduleId: string, value: any): string {
  try {
    const config = JSON.parse(jsonStr || '{}');
    config[moduleId] = value;
    return JSON.stringify(config, null, 2);
  } catch {
    return jsonStr;
  }
}

/**
 * 移除配置 JSON 中的模块
 */
export function removeModuleFromConfig(jsonStr: string, moduleId: string): string {
  try {
    const config = JSON.parse(jsonStr || '{}');
    delete config[moduleId];
    return JSON.stringify(config, null, 2);
  } catch {
    return jsonStr;
  }
}

/**
 * 向数组型模块（如 inbounds/outbounds/fakedns）追加一项
 */
export function addArrayItemInConfig(jsonStr: string, moduleId: string, item: any): string {
  try {
    const config = JSON.parse(jsonStr || '{}');
    if (moduleId === 'routing.rules') {
      if (!config.routing) config.routing = {};
      if (!Array.isArray(config.routing.rules)) config.routing.rules = [];
      config.routing.rules.push(item);
    } else if (moduleId === 'routing.balancers') {
      if (!config.routing) config.routing = {};
      if (!Array.isArray(config.routing.balancers)) config.routing.balancers = [];
      config.routing.balancers.push(item);
    } else {
      if (!Array.isArray(config[moduleId])) config[moduleId] = [];
      config[moduleId].push(item);
    }
    return JSON.stringify(config, null, 2);
  } catch {
    return jsonStr;
  }
}

/**
 * 更新数组型模块（如 inbounds/outbounds/fakedns）指定索引项
 */
export function updateArrayItemInConfig(jsonStr: string, moduleId: string, index: number, item: any): string {
  try {
    const config = JSON.parse(jsonStr || '{}');
    if (moduleId === 'routing.rules') {
      if (config.routing?.rules && Array.isArray(config.routing.rules) && index >= 0 && index < config.routing.rules.length) {
        config.routing.rules[index] = item;
      }
    } else if (moduleId === 'routing.balancers') {
      if (config.routing?.balancers && Array.isArray(config.routing.balancers) && index >= 0 && index < config.routing.balancers.length) {
        config.routing.balancers[index] = item;
      }
    } else {
      if (Array.isArray(config[moduleId]) && index >= 0 && index < config[moduleId].length) {
        config[moduleId][index] = item;
      }
    }
    return JSON.stringify(config, null, 2);
  } catch {
    return jsonStr;
  }
}

/**
 * 删除数组型模块指定索引项
 */
export function removeArrayItemInConfig(jsonStr: string, moduleId: string, index: number): string {
  try {
    const config = JSON.parse(jsonStr || '{}');
    if (moduleId === 'routing.rules') {
      if (config.routing?.rules && Array.isArray(config.routing.rules)) {
        config.routing.rules.splice(index, 1);
      }
    } else if (moduleId === 'routing.balancers') {
      if (config.routing?.balancers && Array.isArray(config.routing.balancers)) {
        config.routing.balancers.splice(index, 1);
      }
    } else {
      if (Array.isArray(config[moduleId])) {
        config[moduleId].splice(index, 1);
      }
    }
    return JSON.stringify(config, null, 2);
  } catch {
    return jsonStr;
  }
}

export function moveArrayItemInConfig(jsonStr: string, moduleId: string, fromIndex: number, direction: 'up' | 'down'): string {
  return reorderArrayItemInConfig(jsonStr, moduleId, fromIndex, direction === 'up' ? fromIndex - 1 : fromIndex + 1);
}

/**
 * 将数组型模块（如 inbounds/outbounds）指定项移动到目标索引位置（支持拖拽排序）
 */
export function reorderArrayItemInConfig(jsonStr: string, moduleId: string, fromIndex: number, toIndex: number): string {
  try {
    const config = JSON.parse(jsonStr || '{}');
    let arr: any[] | undefined;
    if (moduleId === 'routing.rules') {
      arr = config.routing?.rules;
    } else if (moduleId === 'routing.balancers') {
      arr = config.routing?.balancers;
    } else {
      arr = config[moduleId];
    }
    if (!Array.isArray(arr)) return jsonStr;
    if (fromIndex < 0 || fromIndex >= arr.length || toIndex < 0 || toIndex >= arr.length || fromIndex === toIndex) {
      return jsonStr;
    }
    const [item] = arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, item);
    return JSON.stringify(config, null, 2);
  } catch {
    return jsonStr;
  }
}

/** 支持整体禁用的顶级对象模块集合 */
export const DISABLED_MODULE_KEYS = new Set([
  'log', 'api', 'dns', 'transport', 'policy', 'stats', 'metrics',
  'observatory', 'burstObservatory', 'geodata', 'version', 'env', 'routing',
]);

/**
 * 顶级模块的可视化渲染顺序：JSON 顶级键顺序与此保持一致，
 * 确保可视化视图中模块的先后位置与 JSON 源码中的位置一一对应。
 */
export const VISUAL_MODULE_ORDER = [
  'log', 'inbounds', 'dns', 'routing', 'outbounds', 'api', 'fakedns',
  'transport', 'policy', 'stats', 'metrics', 'observatory', 'burstObservatory',
  'geodata', 'version', 'env',
];

/**
 * 按可视化渲染顺序重排 JSON 顶级键（未知键保留在末尾）。
 * 顺序已正确时原样返回，避免无谓的重格式化。
 */
export function sortTopLevelKeys(jsonStr: string): string {
  try {
    const config = JSON.parse(jsonStr || '{}');
    if (!config || typeof config !== 'object' || Array.isArray(config)) return jsonStr;
    const keys = Object.keys(config);
    const sorted = [
      ...VISUAL_MODULE_ORDER.filter((k) => keys.includes(k)),
      ...keys.filter((k) => !VISUAL_MODULE_ORDER.includes(k)),
    ];
    if (sorted.join('\u0000') === keys.join('\u0000')) return jsonStr;
    const next: Record<string, any> = {};
    for (const k of sorted) next[k] = config[k];
    return JSON.stringify(next, null, 2);
  } catch {
    return jsonStr;
  }
}

/** 支持条目级禁用的数组路径 */
export const DISABLED_ARRAY_PATHS = [
  'inbounds', 'outbounds', 'fakedns', 'dns.servers', 'routing.rules', 'routing.balancers',
];

function getArrayByPath(config: any, moduleId: string): any[] | undefined {
  if (moduleId.includes('.')) {
    const [parent, child] = moduleId.split('.');
    return config?.[parent]?.[child];
  }
  return config?.[moduleId];
}

function ensureArrayByPath(config: any, moduleId: string): any[] {
  if (moduleId.includes('.')) {
    const [parent, child] = moduleId.split('.');
    if (!config[parent] || typeof config[parent] !== 'object' || Array.isArray(config[parent])) {
      config[parent] = {};
    }
    if (!Array.isArray(config[parent][child])) config[parent][child] = [];
    return config[parent][child];
  }
  if (!Array.isArray(config[moduleId])) config[moduleId] = [];
  return config[moduleId];
}

const genUid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/**
 * 为被禁用的数组条目生成稳定的暂存标识。
 * 优先使用 tag / address / ipPool 等稳定字段，缺失（如路由规则）时生成随机 uid。
 */
export function makeDisabledKey(moduleId: string, item: any): string {
  if (moduleId === 'fakedns' && item?.ipPool) return `fakedns:pool=${item.ipPool}`;
  if (moduleId === 'dns.servers') {
    const addr = typeof item === 'string' ? item : item?.address;
    if (addr) return `dns.servers:addr=${addr}`;
  }
  if (item?.tag) return `${moduleId}:tag=${item.tag}`;
  return `${moduleId}:uid=${genUid()}`;
}

/** 从暂存标识解析出所属的数组模块路径（如 inbounds / dns.servers） */
export function moduleIdOfDisabledKey(key: string): string {
  const i = key.indexOf(':');
  return i === -1 ? key : key.slice(0, i);
}

/**
 * 禁用一个配置项：将其从 JSON 内容中移除，值与原始位置暂存到禁用记录中（可随时恢复到原位）。
 * index 为 null 时表示禁用顶级单对象模块；否则禁用数组路径下指定索引的条目。
 */
export function disableConfigEntry(
  content: string,
  moduleId: string,
  index: number | null,
  disabled: Record<string, any>
): { content: string; disabled: Record<string, any> } | null {
  try {
    const config = JSON.parse(content || '{}');
    let value: any;
    let key: string;
    let origIndex = -1;
    if (index === null) {
      value = config[moduleId];
      if (value === undefined) return null;
      origIndex = Object.keys(config).indexOf(moduleId);
      delete config[moduleId];
      key = moduleId;
    } else {
      const arr = getArrayByPath(config, moduleId);
      if (!Array.isArray(arr) || index < 0 || index >= arr.length) return null;
      value = arr[index];
      origIndex = index;
      arr.splice(index, 1);
      key = makeDisabledKey(moduleId, value);
    }
    // 标识冲突时追加随机后缀，避免覆盖已暂存的条目
    while (disabled[key] !== undefined) key = `${key}#${genUid()}`;
    return {
      content: JSON.stringify(config, null, 2),
      disabled: { ...disabled, [key]: { value, index: origIndex } },
    };
  } catch {
    return null;
  }
}

/**
 * 重新启用一个被禁用的配置项：将暂存值写回 JSON 内容的原始位置
 * （模块插回原顶级键位，数组条目插回原索引；位置未知时追加到末尾）。
 */
export function enableConfigEntry(
  content: string,
  key: string,
  disabled: Record<string, any>
): { content: string; disabled: Record<string, any> } | null {
  const entry = disabled[key];
  if (entry === undefined) return null;
  // 兼容旧版裸值暂存格式（无位置信息）
  const isWrapped = entry && typeof entry === 'object' && !Array.isArray(entry) && 'value' in entry && 'index' in entry;
  const value = isWrapped ? entry.value : entry;
  const rawIndex = isWrapped && typeof entry.index === 'number' ? entry.index : -1;
  try {
    let config = JSON.parse(content || '{}');
    const moduleId = moduleIdOfDisabledKey(key);
    if (moduleId === key) {
      // 顶级单对象模块：按原键位顺序插回
      const keys = Object.keys(config);
      const pos = rawIndex < 0 ? keys.length : Math.min(rawIndex, keys.length);
      const newConfig: Record<string, any> = {};
      keys.forEach((k, i) => {
        if (i === pos) newConfig[key] = value;
        newConfig[k] = config[k];
      });
      if (pos >= keys.length) newConfig[key] = value;
      config = newConfig;
    } else {
      const arr = ensureArrayByPath(config, moduleId);
      const pos = rawIndex < 0 ? arr.length : Math.min(rawIndex, arr.length);
      arr.splice(pos, 0, value);
    }
    const next = { ...disabled };
    delete next[key];
    return { content: JSON.stringify(config, null, 2), disabled: next };
  } catch {
    return null;
  }
}

/**
 * 迁移旧版内嵌的 enabled 标记：
 * 从内容中移除所有 enabled 字段，并将 enabled: false 的项整体移出内容、
 * 生成禁用标识列表，保证 JSON 为可直接被 Xray 启动的纯净官方结构。
 */
export function migrateEmbeddedEnabledFlags(jsonStr: string): { content: string; disabled: Record<string, any> } {
  try {
    const config = JSON.parse(jsonStr || '{}');
    const stash: Array<{ moduleId: string; index: number | null }> = [];
    for (const m of Array.from(DISABLED_MODULE_KEYS)) {
      const v = config[m];
      if (v && typeof v === 'object' && !Array.isArray(v) && 'enabled' in v) {
        if (v.enabled === false) stash.push({ moduleId: m, index: null });
        delete v.enabled;
      }
    }
    for (const moduleId of DISABLED_ARRAY_PATHS) {
      const arr = getArrayByPath(config, moduleId);
      if (!Array.isArray(arr)) continue;
      arr.forEach((item: any, idx: number) => {
        if (item && typeof item === 'object' && 'enabled' in item) {
          if (item.enabled === false) stash.push({ moduleId, index: idx });
          delete item.enabled;
        }
      });
    }
    // 倒序处理数组条目，避免 splice 影响后续索引；累积生成的禁用标识
    let contentStr = JSON.stringify(config, null, 2);
    let record: Record<string, any> = {};
    for (const s of [...stash].reverse()) {
      const res = disableConfigEntry(contentStr, s.moduleId, s.index, record);
      if (res) {
        contentStr = res.content;
        record = res.disabled;
      }
    }
    return { content: contentStr, disabled: record };
  } catch {
    return { content: jsonStr, disabled: {} };
  }
}

/**
 * 按旧版禁用标识列表（字符串数组）从内容中提取对应条目为禁用记录。
 * 支持模块键、tag/addr/pool 稳定标识与 moduleId#index 索引标识。
 */
export function extractDisabledByKeyList(jsonStr: string, keys: string[]): { content: string; disabled: Record<string, any> } {
  try {
    const config = JSON.parse(jsonStr || '{}');
    const rec: Record<string, any> = {};
    // 顶级模块键
    for (const k of keys) {
      if (!k.includes(':') && !k.includes('#') && config[k] !== undefined) {
        rec[k] = { value: config[k], index: Object.keys(config).indexOf(k) };
        delete config[k];
      }
    }
    // 索引型标识按模块分组
    const indexByModule: Record<string, number[]> = {};
    for (const k of keys) {
      const i = k.indexOf('#');
      if (i === -1) continue;
      const m = k.slice(0, i);
      const idx = parseInt(k.slice(i + 1), 10);
      if (!Number.isNaN(idx)) (indexByModule[m] ||= []).push(idx);
    }
    const matchStable = (key: string, moduleId: string, item: any): boolean => {
      if (moduleId === 'fakedns') return key === `fakedns:pool=${item?.ipPool}`;
      if (moduleId === 'dns.servers') {
        const addr = typeof item === 'string' ? item : item?.address;
        return key === `dns.servers:addr=${addr}`;
      }
      return key === `${moduleId}:tag=${item?.tag}`;
    };
    for (const moduleId of DISABLED_ARRAY_PATHS) {
      const arr = getArrayByPath(config, moduleId);
      if (!Array.isArray(arr)) continue;
      const indexSet = new Set(indexByModule[moduleId] || []);
      const stableKeys = keys.filter((k) => k.startsWith(`${moduleId}:`));
      for (let i = arr.length - 1; i >= 0; i--) {
        const item = arr[i];
        const matchedKey = stableKeys.find((k) => matchStable(k, moduleId, item));
        if (indexSet.has(i) || matchedKey) {
          rec[matchedKey || makeDisabledKey(moduleId, item)] = { value: item, index: i };
          arr.splice(i, 1);
        }
      }
    }
    return { content: JSON.stringify(config, null, 2), disabled: rec };
  } catch {
    return { content: jsonStr, disabled: {} };
  }
}

export interface ModuleStatusItem {
  definition: ModuleDefinition;
  isAdded: boolean;
  count?: number; // 数组类型的数量
}

/**
 * 汇总当前配置 JSON 中所有模块的添加状态
 */
export function getAvailableModules(jsonStr: string): ModuleStatusItem[] {
  let config: Record<string, any> = {};
  try {
    config = JSON.parse(jsonStr || '{}');
  } catch {
    config = {};
  }

  return MODULE_DEFINITIONS.map((def) => {
    let isAdded = false;
    let count: number | undefined;

    if (def.isAlwaysVisible) {
      isAdded = true;
      if (def.isArray && Array.isArray(config[def.id])) {
        count = config[def.id].length;
      } else if (def.id === 'routing' && Array.isArray(config.routing?.rules)) {
        count = config.routing.rules.length;
      }
    } else if (def.id in config) {
      isAdded = true;
      if (def.isArray && Array.isArray(config[def.id])) {
        count = config[def.id].length;
      }
    }

    return {
      definition: def,
      isAdded,
      count,
    };
  });
}
