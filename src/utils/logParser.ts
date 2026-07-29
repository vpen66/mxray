import type { LogCategory, LogEntry } from '../types';

export interface ParsedLogInfo {
  category: LogCategory;
  source?: string;
  protocol?: string;
  target?: string;
  domain?: string;
  port?: string;
  outbound?: string;
  chain?: string[];
  rule?: string;
  action?: string;
  shortSummary?: string;
}

/**
 * 剥离日志前部的动态日期时间戳 (例如 "2026/07/29 10:19:41.307474 ")
 * 避免微秒级时间戳导致相同日志被判为不同记录
 */
export function stripLeadingTimestamp(msg: string): string {
  if (!msg) return '';
  return msg
    .replace(/^(?:\d{4}[/-]\d{2}[/-]\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?|\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s*/i, '')
    .replace(/^\[\d{4}[/-]\d{2}[/-]\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?\]\s*/i, '')
    .trim();
}

/**
 * 从 "host:port" 或 "domain" 字符串中精准提取域名与端口号
 */
function extractDomainAndPort(rawTarget: string): { domain: string; port?: string } {
  let cleanTarget = rawTarget.trim();

  // 移除开头的 // 前缀 (例如 "//example.com:443")
  if (cleanTarget.startsWith('//')) {
    cleanTarget = cleanTarget.substring(2);
  }

  // 移除可能存在的 scheme 前缀 (例如 "tcp:example.com:443")
  if (cleanTarget.includes(':')) {
    const parts = cleanTarget.split(':');
    if (parts.length === 2) {
      return { domain: parts[0], port: parts[1] };
    } else if (parts.length > 2) {
      // 最后一项是数字端口号
      const possiblePort = parts[parts.length - 1];
      if (/^\d+$/.test(possiblePort)) {
        const domain = parts.slice(0, parts.length - 1).join(':');
        return { domain, port: possiblePort };
      }
    }
  }
  return { domain: cleanTarget };
}

/**
 * 解析出站链路信息 (例如 "proxy >> hk-01" 转换为 ['proxy', 'hk-01'])
 */
function parseChain(rawOutbound?: string): string[] | undefined {
  if (!rawOutbound) return undefined;
  if (rawOutbound.includes('>>')) {
    return rawOutbound.split('>>').map((item) => item.trim());
  }
  if (rawOutbound.toLowerCase() === 'direct') {
    return ['直连出站'];
  }
  if (rawOutbound.toLowerCase() === 'block') {
    return ['阻断拦截'];
  }
  return [rawOutbound];
}

/**
 * 1. 解析 Access / Connection 连接访问日志
 */
function parseAccessLog(msg: string): ParsedLogInfo | null {
  // 支持: "2026/07/29 08:00:00 from 127.0.0.1:61831 accepted //bad.domain.com:443 [proxy >> hk-01]"
  const accessRegex = /(?:from\s+)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+|\[[a-f0-9:]+\]:\d+)\s+(accepted|rejected)\s+(\S+?)(?:\s+\[([^\]]+)\]|\s+bounds:|$)/i;
  const match = msg.match(accessRegex);

  if (match) {
    const source = match[1];
    const rawAction = match[2].toLowerCase();
    let rawTarget = match[3];
    const rawOutbound = match[4] || 'default';

    // 判断协议
    let protocol = 'TCP';
    if (rawTarget.startsWith('//')) {
      const clean = rawTarget.substring(2);
      protocol = clean.endsWith(':443') ? 'HTTPS' : 'HTTP';
    } else if (rawTarget.includes(':')) {
      const parts = rawTarget.split(':');
      const scheme = parts[0].toUpperCase();
      if (['TCP', 'UDP', 'HTTP', 'HTTPS', 'SOCKS'].includes(scheme)) {
        protocol = scheme;
      }
    }

    const { domain, port } = extractDomainAndPort(rawTarget);
    const chain = parseChain(rawOutbound);
    const action = rawAction === 'accepted' ? '通过' : '阻断';
    const chainDisplay = chain ? chain.join(' ➔ ') : rawOutbound;

    return {
      category: 'connection',
      source,
      protocol,
      target: rawTarget,
      domain,
      port,
      outbound: rawOutbound,
      chain,
      action,
      shortSummary: `${action} ${protocol} | 域名: ${domain} | 链路: ${chainDisplay}`,
    };
  }

  // 兜底：包含 accepted connection from 或 rejected connection from
  const connMatch = msg.match(/(accepted|rejected)\s+connection\s+from\s+(\S+)/i);
  if (connMatch) {
    const action = connMatch[1].toLowerCase() === 'accepted' ? '通过' : '阻断';
    const source = connMatch[2];
    return {
      category: 'connection',
      source,
      action,
      protocol: 'TCP',
      shortSummary: `连接${action} | 来自源地址: ${source}`,
    };
  }

  return null;
}

/**
 * 2. 解析 Router 路由分流与规则匹配日志
 */
function parseRouterLog(msg: string): ParsedLogInfo | null {
  if (!msg.includes('app/router') && !msg.includes('router:') && !msg.includes('app/dispatcher')) {
    return null;
  }

  // 匹配: "take outbound [proxy] for [tcp:example.com:443]"
  const takeMatch = msg.match(/take outbound \[([^\]]+)\] for \[([a-z0-9]+):([^\]]+)\]/i);
  if (takeMatch) {
    const rawOutbound = takeMatch[1];
    const proto = takeMatch[2].toUpperCase();
    const rawTarget = takeMatch[3];
    const { domain, port } = extractDomainAndPort(rawTarget);
    const chain = parseChain(rawOutbound);

    return {
      category: 'router',
      protocol: proto,
      target: rawTarget,
      domain,
      port,
      outbound: rawOutbound,
      chain,
      action: '路由分流',
      shortSummary: `路由分流 ➔ 域名: ${domain} | 出站: ${chain ? chain.join(' ➔ ') : rawOutbound}`,
    };
  }

  // 匹配: "match rule [domain:geosite:cn] -> outbound [direct]"
  const ruleMatch = msg.match(/match rule \[([^\]]+)\](?:(?:\s*->\s*|\s+outbound\s+)\[([^\]]+)\])?/i);
  if (ruleMatch) {
    const ruleStr = ruleMatch[1];
    const rawOutbound = ruleMatch[2] || 'proxy';
    const chain = parseChain(rawOutbound);

    return {
      category: 'router',
      rule: ruleStr,
      outbound: rawOutbound,
      chain,
      action: '规则命中',
      shortSummary: `命中规则 [${ruleStr}] ➔ 出站: ${chain ? chain.join(' ➔ ') : rawOutbound}`,
    };
  }

  // 匹配: "balancer [selector-group] selected outbound [node-01]"
  const balancerMatch = msg.match(/balancer\s+\[([^\]]+)\]\s+selected\s+(?:outbound\s+)?\[([^\]]+)\]/i);
  if (balancerMatch) {
    const balancerTag = balancerMatch[1];
    const selectedOutbound = balancerMatch[2];
    const chain = [balancerTag, selectedOutbound];

    return {
      category: 'router',
      outbound: selectedOutbound,
      chain,
      action: '负载均衡',
      shortSummary: `策略组 [${balancerTag}] 自动优选节点 ➔ ${selectedOutbound}`,
    };
  }

  return {
    category: 'router',
    action: '路由选路',
    shortSummary: '路由分流引擎匹配处理中',
  };
}

/**
 * 3. 解析 DNS 查询、Hosts 与 FakeDNS 日志
 */
function parseDnsLog(msg: string): ParsedLogInfo | null {
  if (!msg.includes('app/dns') && !msg.includes('dns:')) {
    return null;
  }

  // 匹配 FakeDNS: "fakedns matched example.com -> 198.18.0.15"
  const fakeDnsMatch = msg.match(/fakedns\s+matched\s+([a-zA-Z0-9.-]+)\s+->\s+(\S+)/i);
  if (fakeDnsMatch) {
    const domain = fakeDnsMatch[1];
    const fakeIp = fakeDnsMatch[2];
    return {
      category: 'dns',
      domain,
      target: domain,
      chain: ['FakeDNS 虚拟池', fakeIp],
      action: 'FakeDNS映射',
      shortSummary: `FakeDNS 映射: ${domain} ➔ ${fakeIp}`,
    };
  }

  // 匹配 IP 响应: "returned ip for example.com: 104.16.123.96" 或 "exchange example.com A -> 1.1.1.1"
  const ipResultMatch = msg.match(/(?:returned ip for|exchange)\s+([a-zA-Z0-9.-]+)(?:\s+[A-Z]+)?(?:\s+->\s+|\s*:\s*)(\S+)/i);
  if (ipResultMatch) {
    const domain = ipResultMatch[1];
    const ipResult = ipResultMatch[2];
    return {
      category: 'dns',
      domain,
      target: domain,
      chain: ['DNS 服务器', ipResult],
      action: 'DNS解析成功',
      shortSummary: `DNS 解析完成: ${domain} ➔ ${ipResult}`,
    };
  }

  // 匹配 DNS 缓存命中: "cache hit for example.com"
  const cacheHitMatch = msg.match(/cache hit for\s+([a-zA-Z0-9.-]+)/i);
  if (cacheHitMatch) {
    const domain = cacheHitMatch[1];
    return {
      category: 'dns',
      domain,
      target: domain,
      chain: ['DNS 本地缓存'],
      action: '缓存命中',
      shortSummary: `DNS 缓存命中: ${domain}`,
    };
  }

  // 一般 DNS 查询: "looking up domain example.com"
  const domainMatch = msg.match(/domain\s+([a-zA-Z0-9.-]+)/i) || msg.match(/for\s+([a-zA-Z0-9.-]+)/i);
  const domain = domainMatch ? domainMatch[1] : undefined;

  return {
    category: 'dns',
    target: domain,
    domain,
    chain: ['DNS 解析服务'],
    action: 'DNS查询',
    shortSummary: domain ? `DNS 查询域名: ${domain}` : 'DNS 域名解析服务',
  };
}

/**
 * 4. 解析 Inbound 入站服务与网络监听日志
 */
function parseInboundLog(msg: string): ParsedLogInfo | null {
  if (!msg.includes('inbound') && !msg.includes('listening on')) {
    return null;
  }

  // 匹配: "start listening inbound on 127.0.0.1:10808 (socks)" 或 "listening on 127.0.0.1:10808"
  const listenMatch = msg.match(/listening\s+(?:inbound\s+)?on\s+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+|\[[a-f0-9:]+\]:\d+)(?:\s+\(([^)]+)\))?/i);
  if (listenMatch) {
    const addr = listenMatch[1];
    const proto = (listenMatch[2] || 'Inbound').toUpperCase();
    const { domain, port } = extractDomainAndPort(addr);

    return {
      category: 'inbound',
      protocol: proto,
      domain: domain || addr,
      port,
      target: addr,
      chain: [`${proto} 入站`, addr],
      action: '监听启动',
      shortSummary: `${proto} 入站服务就绪 ➔ 监听地址: ${addr}`,
    };
  }

  return {
    category: 'inbound',
    action: '入站事件',
    shortSummary: '入站协议网络事件',
  };
}

/**
 * 5. 解析 Outbound 节点代理与传输协议握手日志
 */
function parseOutboundLog(msg: string): ParsedLogInfo | null {
  if (
    !msg.includes('app/proxies') &&
    !msg.includes('transport/internet') &&
    !msg.includes('dialing to') &&
    !msg.includes('handshake')
  ) {
    return null;
  }

  // 匹配代理拨号: "app/proxies/vless: dialing to tcp:hk.example.com:443"
  const dialMatch = msg.match(/app\/proxies\/([a-z0-9]+):\s+dialing\s+to\s+([a-z0-9]+):(\S+)/i);
  if (dialMatch) {
    const proxyProto = dialMatch[1].toUpperCase();
    const rawTarget = dialMatch[3];
    const { domain, port } = extractDomainAndPort(rawTarget);

    return {
      category: 'outbound',
      protocol: proxyProto,
      target: rawTarget,
      domain,
      port,
      chain: [`${proxyProto} 握手`, domain],
      action: '节点拨号',
      shortSummary: `${proxyProto} 节点拨号 ➔ ${domain}${port ? ':' + port : ''}`,
    };
  }

  // 匹配 REALITY 指纹握手: "transport/internet/reality: client handshake successful with fingerprint chrome"
  const realityMatch = msg.match(/reality:\s+client\s+handshake\s+(successful|failed)/i);
  if (realityMatch) {
    const success = realityMatch[1].toLowerCase() === 'successful';
    return {
      category: 'outbound',
      protocol: 'REALITY',
      chain: ['REALITY 传输层', success ? '握手成功' : '握手失败'],
      action: success ? 'REALITY握手' : 'REALITY失败',
      shortSummary: `REALITY 安全传输握手${success ? '成功' : '失败'}`,
    };
  }

  // 匹配 TLS SNI: "transport/internet/tls: serverName is set to example.com"
  const tlsSniMatch = msg.match(/tls:\s+serverName\s+is\s+set\s+to\s+(\S+)/i);
  if (tlsSniMatch) {
    const sni = tlsSniMatch[1];
    return {
      category: 'outbound',
      protocol: 'TLS',
      domain: sni,
      target: sni,
      chain: ['TLS 伪装 SNI', sni],
      action: 'TLS设置',
      shortSummary: `TLS 伪装 SNI 设置: ${sni}`,
    };
  }

  return {
    category: 'outbound',
    action: '出站代理',
    shortSummary: '代理协议与传输握手事件',
  };
}

/**
 * 6. 解析 Observatory 节点测速与健康检查日志
 */
function parseObservatoryLog(msg: string): ParsedLogInfo | null {
  if (!msg.includes('observatory') && !msg.includes('Observatory')) {
    return null;
  }

  // 匹配测速结果: "pinging outbound [hk-node-01] -> delay 42ms" 或 "outbound [hk-01] delay 42ms"
  const delayMatch = msg.match(/outbound\s+\[([^\]]+)\]\s+.*delay\s+(\d+ms)/i);
  if (delayMatch) {
    const nodeTag = delayMatch[1];
    const delayMs = delayMatch[2];
    return {
      category: 'observatory',
      outbound: nodeTag,
      chain: ['延迟测速', nodeTag, delayMs],
      action: `延迟 ${delayMs}`,
      shortSummary: `节点测速 [${nodeTag}] ➔ 延迟响应: ${delayMs}`,
    };
  }

  // 匹配测速超时: "outbound [us-node-02] failed: timeout"
  const failMatch = msg.match(/outbound\s+\[([^\]]+)\]\s+failed/i);
  if (failMatch) {
    const nodeTag = failMatch[1];
    return {
      category: 'observatory',
      outbound: nodeTag,
      chain: ['延迟测速', nodeTag, '连接超时'],
      action: '测速超时',
      shortSummary: `节点测速 [${nodeTag}] ➔ 连接不可达/超时`,
    };
  }

  return {
    category: 'observatory',
    action: '健康检查',
    shortSummary: '节点自动测速与可用性探针',
  };
}

/**
 * 智能解析 Xray 运行日志
 * 精准提炼 域名 (Domain)、出站路由链路 (Chain)、传输协议、源地址及各模块行为
 */
export function parseXrayLog(rawMessage: string, level: LogEntry['level']): ParsedLogInfo {
  const msg = rawMessage.trim();

  // 1. 尝试连接访问 Access 日志解析
  const accessResult = parseAccessLog(msg);
  if (accessResult) return accessResult;

  // 2. 尝试路由分流 Router 日志解析
  const routerResult = parseRouterLog(msg);
  if (routerResult) return routerResult;

  // 3. 尝试 DNS 解析日志
  const dnsResult = parseDnsLog(msg);
  if (dnsResult) return dnsResult;

  // 4. 尝试 Observatory 测速日志
  const obsResult = parseObservatoryLog(msg);
  if (obsResult) return obsResult;

  // 5. 尝试 Inbound 入站监听日志
  const inboundResult = parseInboundLog(msg);
  if (inboundResult) return inboundResult;

  // 6. 尝试 Outbound 出站协议与握手日志
  const outboundResult = parseOutboundLog(msg);
  if (outboundResult) return outboundResult;

  // 7. 兜底通用 Access/accepted 日志模糊判断
  if (msg.includes('accepted') || msg.includes('rejected')) {
    const isAccepted = msg.includes('accepted');
    const action = isAccepted ? '通过' : '阻断';

    const targetMatch = msg.match(/(?:\/\/|tcp:|udp:|http:|\s+)([a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?::\d+)?)/i);
    const domainAndPort = targetMatch ? extractDomainAndPort(targetMatch[1]) : undefined;

    const outboundMatch = msg.match(/\[([^\]]+)\]/);
    const rawOutbound = outboundMatch ? outboundMatch[1] : undefined;
    const chain = parseChain(rawOutbound);

    return {
      category: 'connection',
      action,
      protocol: 'TCP',
      domain: domainAndPort?.domain,
      port: domainAndPort?.port,
      outbound: rawOutbound,
      chain,
      shortSummary: `${action} 请求 | 域名: ${domainAndPort?.domain || '未知'} | 链路: ${chain ? chain.join(' ➔ ') : '未知'}`,
    };
  }

  // 8. 系统与内核生命周期日志
  const cleanMsg = stripLeadingTimestamp(msg);
  if (
    msg.includes('app/proxies') ||
    msg.includes('core:') ||
    msg.includes('Xray') ||
    msg.includes('transport/') ||
    msg.includes('inbound') ||
    msg.includes('outbound') ||
    level === 'error' ||
    level === 'warning'
  ) {
    return {
      category: 'system',
      action: level === 'error' ? '系统错误' : level === 'warning' ? '系统警告' : '内核状态',
      shortSummary: cleanMsg.length > 90 ? cleanMsg.substring(0, 90) + '...' : cleanMsg,
    };
  }

  // 默认常规类别
  return {
    category: 'general',
    shortSummary: cleanMsg.length > 90 ? cleanMsg.substring(0, 90) + '...' : cleanMsg,
  };
}
