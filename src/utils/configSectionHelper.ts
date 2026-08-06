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

/** 支持条目级禁用的数组路径 */
export const DISABLED_ARRAY_PATHS = [
  'inbounds', 'outbounds', 'fakedns', 'dns.servers', 'routing.rules', 'routing.balancers',
];

/**
 * 计算数组条目的稳定禁用标识。
 * 优先使用 tag / address / ipPool 等稳定字段，缺失时回退索引；routing.rules 始终使用索引。
 */
export function disabledKeyId(moduleId: string, item: any, index: number): string {
  if (moduleId === 'routing.rules') return `routing.rules#${index}`;
  if (moduleId === 'fakedns' && item?.ipPool) return `fakedns:pool=${item.ipPool}`;
  if (moduleId === 'dns.servers') {
    const addr = typeof item === 'string' ? item : item?.address;
    if (addr) return `dns.servers:addr=${addr}`;
    return `dns.servers#${index}`;
  }
  if ((moduleId === 'inbounds' || moduleId === 'outbounds' || moduleId === 'routing.balancers') && item?.tag) {
    return `${moduleId}:tag=${item.tag}`;
  }
  return `${moduleId}#${index}`;
}

function getArrayByPath(config: any, moduleId: string): any[] | undefined {
  if (moduleId.includes('.')) {
    const [parent, child] = moduleId.split('.');
    return config?.[parent]?.[child];
  }
  return config?.[moduleId];
}

function setArrayByPath(config: any, moduleId: string, arr: any[]) {
  if (moduleId.includes('.')) {
    const [parent, child] = moduleId.split('.');
    if (config[parent]) config[parent][child] = arr;
  } else {
    config[moduleId] = arr;
  }
}

/**
 * 构建启动 Xray 内核时传入的配置：根据禁用列表过滤掉所有被禁用的模块/条目。
 * 配置内容本身不含任何 enabled 字段，保持 Xray 官方纯净结构。
 */
export function buildRuntimeConfig(jsonStr: string, disabledKeys?: string[]): string {
  if (!disabledKeys || disabledKeys.length === 0) return jsonStr;
  try {
    const config = JSON.parse(jsonStr || '{}');
    for (const key of disabledKeys) {
      if (DISABLED_MODULE_KEYS.has(key)) delete config[key];
    }
    for (const moduleId of DISABLED_ARRAY_PATHS) {
      const arr = getArrayByPath(config, moduleId);
      if (!Array.isArray(arr)) continue;
      const filtered = arr.filter(
        (item: any, idx: number) => !disabledKeys.includes(disabledKeyId(moduleId, item, idx))
      );
      if (filtered.length !== arr.length) setArrayByPath(config, moduleId, filtered);
    }
    return JSON.stringify(config, null, 2);
  } catch {
    return jsonStr;
  }
}

/**
 * 迁移旧版内嵌的 enabled 标记：
 * 将 enabled: false 提取为外部禁用列表，并从内容中移除所有 enabled 字段，
 * 保证 JSON 为可直接被 Xray 启动的纯净官方结构。
 */
export function migrateEmbeddedEnabledFlags(jsonStr: string): { content: string; disabled: string[] } {
  try {
    const config = JSON.parse(jsonStr || '{}');
    const disabled: string[] = [];
    for (const m of Array.from(DISABLED_MODULE_KEYS)) {
      const v = config[m];
      if (v && typeof v === 'object' && !Array.isArray(v) && 'enabled' in v) {
        if (v.enabled === false) disabled.push(m);
        delete v.enabled;
      }
    }
    for (const moduleId of DISABLED_ARRAY_PATHS) {
      const arr = getArrayByPath(config, moduleId);
      if (!Array.isArray(arr)) continue;
      arr.forEach((item: any, idx: number) => {
        if (item && typeof item === 'object' && 'enabled' in item) {
          if (item.enabled === false) disabled.push(disabledKeyId(moduleId, item, idx));
          delete item.enabled;
        }
      });
    }
    return { content: JSON.stringify(config, null, 2), disabled };
  } catch {
    return { content: jsonStr, disabled: [] };
  }
}

/**
 * 数组删除条目后维护禁用列表：移除该条目标识，并将其后的索引型标识前移一位。
 */
export function afterRemoveDisabledKey(keys: string[], moduleId: string, item: any, index: number): string[] {
  const id = disabledKeyId(moduleId, item, index);
  const prefix = `${moduleId}#`;
  return keys
    .filter((k) => k !== id)
    .map((k) => {
      if (!k.startsWith(prefix)) return k;
      const i = parseInt(k.slice(prefix.length), 10);
      return Number.isNaN(i) || i <= index ? k : `${prefix}${i - 1}`;
    });
}

/**
 * 数组条目移动/重排序后维护禁用列表（仅影响索引型标识）。
 */
export function afterReorderDisabledKeys(keys: string[], moduleId: string, from: number, to: number): string[] {
  if (from === to) return keys;
  const prefix = `${moduleId}#`;
  return keys.map((k) => {
    if (!k.startsWith(prefix)) return k;
    const i = parseInt(k.slice(prefix.length), 10);
    if (Number.isNaN(i)) return k;
    let ni = i;
    if (i === from) ni = to;
    else if (from < to && i > from && i <= to) ni = i - 1;
    else if (from > to && i >= to && i < from) ni = i + 1;
    return ni === i ? k : `${prefix}${ni}`;
  });
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
