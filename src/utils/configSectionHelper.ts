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
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= arr.length) return jsonStr;
    const [item] = arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, item);
    return JSON.stringify(config, null, 2);
  } catch {
    return jsonStr;
  }
}

/**
 * 在原始 JSON 文本层面剔除 routing.rules 中 enabled 为 false 的规则，
 * 不经过 JSON.parse/JSON.stringify，完整保留原配置的字段顺序与格式
 */
export function stripDisabledRoutingRules(jsonStr: string): string {
  if (!jsonStr || !jsonStr.includes('"enabled"')) return jsonStr;

  const routingIdx = jsonStr.indexOf('"routing"');
  if (routingIdx === -1) return jsonStr;
  const rulesIdx = jsonStr.indexOf('"rules"', routingIdx);
  if (rulesIdx === -1) return jsonStr;
  const arrStart = jsonStr.indexOf('[', rulesIdx);
  if (arrStart === -1) return jsonStr;

  // 定位 rules 数组的结束位置（括号配平）
  let depth = 0;
  let arrEnd = -1;
  let inStr = false;
  let esc = false;
  for (let i = arrStart; i < jsonStr.length; i++) {
    const ch = jsonStr[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
    } else if (ch === '[' || ch === '{') {
      depth++;
    } else if (ch === ']' || ch === '}') {
      depth--;
      if (depth === 0) {
        arrEnd = i;
        break;
      }
    }
  }
  if (arrEnd === -1) return jsonStr;

  // 扫描数组内顶层的每个对象，记录 enabled: false 的对象范围
  const ranges: Array<{ start: number; end: number }> = [];
  depth = 0;
  inStr = false;
  esc = false;
  let objStart = -1;
  let enabledFalse = false;
  for (let i = arrStart + 1; i < arrEnd; i++) {
    const ch = jsonStr[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      // 仅在规则对象顶层（depth === 1）判定 "enabled": false
      if (depth === 1 && /^"enabled"\s*:\s*false/.test(jsonStr.slice(i))) {
        enabledFalse = true;
      }
      inStr = true;
      continue;
    }
    if (ch === '{' || ch === '[') {
      if (ch === '{' && depth === 0) {
        objStart = i;
        enabledFalse = false;
      }
      depth++;
      continue;
    }
    if (ch === '}' || ch === ']') {
      depth--;
      if (ch === '}' && depth === 0 && objStart !== -1) {
        if (enabledFalse) ranges.push({ start: objStart, end: i });
        objStart = -1;
      }
      continue;
    }
  }

  if (ranges.length === 0) return jsonStr;

  // 重建文本：跳过被剔除的对象，并清理残留的尾逗号
  let result = '';
  let cursor = 0;
  for (const { start, end } of ranges) {
    // 追加被剔除对象之前的文本，并清理尾部空白避免残留空行
    result += jsonStr.slice(cursor, start);
    result = result.replace(/\s+$/, '');
    cursor = end + 1;
    const rest = jsonStr.slice(cursor);
    const trailing = rest.match(/^\s*,/);
    if (trailing) {
      cursor += trailing[0].length;
    } else {
      // 被剔除的是最后一项，移除其前面的逗号（尾部空白已清理）
      if (result.endsWith(',')) {
        result = result.slice(0, -1);
      }
    }
  }
  result += jsonStr.slice(cursor);

  // 兜底校验：确保结果仍是合法 JSON，否则回退原文
  try {
    JSON.parse(result);
    return result;
  } catch {
    return jsonStr;
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
