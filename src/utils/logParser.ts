import type { LogCategory, LogEntry } from '../types';

export interface ParsedLogInfo {
  category: LogCategory;
  source?: string;
  destination?: string;
  protocol?: string;
  target?: string;
  domain?: string;
  port?: string;
  outbound?: string;
  chain?: string[];
  rule?: string;
  action?: string;
  shortSummary?: string;
  module?: string;
  sessionId?: string;
  resolvedIps?: string[];
  rtt?: string;
  queryType?: string;
  dnsServer?: string;
}

export interface LogHeaderInfo {
  sessionId?: string;
  module?: string;
}

/**
 * 提取 Xray 标准日志头部：时间戳 / [级别] / [会话ID] / 模块路径
 * 例如 "2026/08/03 16:22:29.006040 [Info] [1835983835] proxy/tun: ..."
 * 提取出 sessionId=1835983835, module=proxy/tun
 */
export function parseLogHeader(msg: string): LogHeaderInfo {
  if (!msg) return {};
  const headerMatch = msg.match(
    /^\s*(?:\d{4}[/-]\d{2}[/-]\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?\s*)?(?:\[(?:Debug|Info|Warning|Error)\]\s*)?(?:\[(\d+)\]\s+)?([a-z]+(?:\/[a-z0-9._-]+)+):/i
  );
  if (headerMatch) {
    return { sessionId: headerMatch[1], module: headerMatch[2] };
  }
  // 无时间戳前缀时仍尝试提取会话 ID 与模块
  const looseMatch = msg.match(/(?:^|\s)\[(\d+)\]\s+([a-z]+(?:\/[a-z0-9._-]+)+):/i);
  if (looseMatch) {
    return { sessionId: looseMatch[1], module: looseMatch[2] };
  }
  return {};
}

/**
 * 剥离日志前部的时间戳、级别与会话 ID 前缀，仅保留「模块: 内容」便于摘要展示
 */
export function stripLogPrefix(msg: string): string {
  if (!msg) return '';
  return msg
    .replace(/^\s*\d{4}[/-]\d{2}[/-]\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?\s*/i, '')
    .replace(/^\[(?:Debug|Info|Warning|Error)\]\s*/i, '')
    .replace(/^\[\d+\]\s+/, '')
    .trim();
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
 * 1.1 解析 TUN 虚拟网卡流量转发日志
 * 例如 "proxy/tun: processing from udp:169.254.10.2:33299 to udp:114.114.114.114:53"
 */
function parseTunLog(msg: string): ParsedLogInfo | null {
  if (!msg.includes('proxy/tun') && !msg.includes('tun:')) {
    return null;
  }

  const tunMatch = msg.match(
    /processing\s+from\s+(tcp|udp|ip):(\S+?):(\d+)\s+to\s+(tcp|udp|ip):(\S+?):(\d+)/i
  );
  if (tunMatch) {
    const srcProto = tunMatch[1].toUpperCase();
    const srcIp = tunMatch[2];
    const srcPort = tunMatch[3];
    const dstProto = tunMatch[4].toUpperCase();
    const dstIp = tunMatch[5];
    const dstPort = tunMatch[6];
    const isDns = dstPort === '53';
    const isHttp = dstPort === '80' || dstPort === '443';

    const source = `${srcProto.toLowerCase()}:${srcIp}:${srcPort}`;
    const destination = `${dstProto.toLowerCase()}:${dstIp}:${dstPort}`;
    let protocol = dstProto;
    if (isDns) protocol = 'DNS';
    else if (dstPort === '443') protocol = `${dstProto}/HTTPS`;
    else if (isHttp && dstProto === 'TCP') protocol = 'TCP/HTTP';

    return {
      category: 'connection',
      protocol,
      source,
      destination,
      target: `${dstIp}:${dstPort}`,
      port: dstPort,
      chain: ['TUN 虚拟网卡', srcIp, `${dstIp}:${dstPort}`],
      action: isDns ? 'DNS转发' : 'TUN转发',
      shortSummary: isDns
        ? `TUN 转发 DNS 查询 | ${srcIp}:${srcPort} ➔ ${dstIp}:53`
        : `TUN 转发 ${dstProto} | ${srcIp}:${srcPort} ➔ ${dstIp}:${dstPort}`,
    };
  }

  return {
    category: 'connection',
    action: 'TUN事件',
    shortSummary: 'TUN 虚拟网卡流量事件',
  };
}

/**
 * 1.2 解析代理协议隧道请求日志
 * 例如 "proxy/vless/outbound: tunneling request to tcp:hk.example.com:443"
 */
function parseProxyTunnelLog(msg: string): ParsedLogInfo | null {
  const tunnelMatch = msg.match(
    /proxy\/([a-z0-9]+)\/(?:outbound|inbound):\s+tunneling\s+request\s+to\s+(?:tcp|udp)?:?(\S+)/i
  );
  if (!tunnelMatch) return null;

  const proxyProto = tunnelMatch[1].toUpperCase();
  const rawTarget = tunnelMatch[2];
  const { domain, port } = extractDomainAndPort(rawTarget);
  const isOutbound = msg.includes('/outbound');

  return {
    category: isOutbound ? 'outbound' : 'inbound',
    protocol: proxyProto,
    target: rawTarget,
    domain,
    port,
    chain: isOutbound ? [`${proxyProto} 出站隧道`, domain] : [`${proxyProto} 入站隧道`, domain],
    action: isOutbound ? '隧道请求' : '隧道接入',
    shortSummary: `${proxyProto} ${isOutbound ? '出站' : '入站'}隧道请求 ➔ ${domain}${port ? ':' + port : ''}`,
  };
}

/**
 * 1.3 解析 HTTP 代理入站请求日志
 * 例如 "proxy/http: request to Method [CONNECT] Host [api.jetbrains.cloud:443] with URL [//api.jetbrains.cloud:443]"
 */
function parseHttpRequestLog(msg: string): ParsedLogInfo | null {
  if (!msg.includes('proxy/http')) return null;

  const httpMatch = msg.match(
    /request\s+to\s+Method\s+\[(\w+)\]\s+Host\s+\[([^\]]+)\](?:\s+with\s+URL\s+\[([^\]]+)\])?/i
  );
  if (!httpMatch) {
    return {
      category: 'inbound',
      action: 'HTTP事件',
      shortSummary: 'HTTP 代理服务事件',
    };
  }

  const method = httpMatch[1].toUpperCase();
  const rawHost = httpMatch[2];
  const { domain, port } = extractDomainAndPort(rawHost);
  const isTls = method === 'CONNECT' || port === '443';
  const protocol = isTls ? 'HTTPS' : 'HTTP';

  return {
    category: 'connection',
    protocol,
    target: rawHost,
    domain,
    port,
    action: method === 'CONNECT' ? 'HTTPS隧道请求' : `HTTP请求`,
    chain: ['HTTP 代理入站', method, domain],
    shortSummary: `HTTP 代理 ${method} 请求 ➔ ${domain}${port ? ':' + port : ''}`,
  };
}

/**
 * 1.4 解析 Freedom 直连出站连接日志
 * 例如 "proxy/freedom: connection opened to tcp:example.com:80, local endpoint 192.168.1.2:52189, remote endpoint 1.2.3.4:80"
 */
function parseFreedomLog(msg: string): ParsedLogInfo | null {
  if (!msg.includes('proxy/freedom')) return null;

  const freedomMatch = msg.match(
    /connection\s+opened\s+to\s+(tcp|udp):(\S+),\s+local\s+endpoint\s+(\S+),\s+remote\s+endpoint\s+(\S+)/i
  ) || msg.match(/connection\s+opened\s+to\s+(tcp|udp):(\S+)/i);
  if (!freedomMatch) {
    return {
      category: 'outbound',
      action: '直连事件',
      shortSummary: '直连出站事件',
    };
  }

  const proto = freedomMatch[1].toUpperCase();
  const rawTarget = freedomMatch[2];
  const localEndpoint = freedomMatch[3];
  const remoteEndpoint = freedomMatch[4];
  const { domain, port } = extractDomainAndPort(rawTarget);

  return {
    category: 'connection',
    protocol: proto,
    target: rawTarget,
    domain,
    port,
    source: localEndpoint,
    destination: remoteEndpoint,
    outbound: 'direct',
    chain: ['直连出站', domain],
    action: '直连打开',
    shortSummary: `直连打开 ${proto} ➔ ${domain}${port ? ':' + port : ''}${remoteEndpoint ? ` (${remoteEndpoint})` : ''}`,
  };
}

/**
 * 2. 解析 Router 路由分流与规则匹配日志
 */
function parseRouterLog(msg: string): ParsedLogInfo | null {
  if (!msg.includes('app/router') && !msg.includes('router:') && !msg.includes('app/dispatcher')) {
    return null;
  }

  // 匹配流量嗅探识别域名: "app/dispatcher: sniffed domain: netapm.music.163.com"
  const sniffMatch = msg.match(/sniffed\s+domain:\s*([a-zA-Z0-9.-]+)/i);
  if (sniffMatch) {
    const domain = sniffMatch[1];
    return {
      category: 'router',
      domain,
      target: domain,
      chain: ['流量嗅探识别', domain],
      action: '域名嗅探',
      shortSummary: `协议嗅探识别域名: ${domain}`,
    };
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

  // 匹配 DNS 服务器应答: "app/dns: UDP:223.5.5.5:53 got answer: music.163.com. TypeA -> [1.2.3.4 5.6.7.8], rtt: 17.14ms"
  const answerMatch = msg.match(
    /(\S+?)\s+got\s+answer:\s+([a-zA-Z0-9.-]+?)\.?\s+(Type[A-Z0-9]+)\s+->\s+\[([^\]]+)\](?:,\s+rtt:\s+([^,\s]+))?/i
  );
  if (answerMatch) {
    const dnsServer = answerMatch[1];
    const domain = answerMatch[2];
    const queryType = answerMatch[3].replace(/^Type/i, '');
    const resolvedIps = answerMatch[4].trim().split(/\s+/);
    const rtt = answerMatch[5];

    return {
      category: 'dns',
      domain,
      target: domain,
      dnsServer,
      queryType,
      resolvedIps,
      rtt,
      chain: [`DNS 应答 ${queryType}`, dnsServer, resolvedIps.join(', ')],
      action: 'DNS应答',
      shortSummary: `DNS 应答: ${domain} ${queryType} ➔ ${resolvedIps.join(' / ')}${rtt ? ` | 耗时 ${rtt}` : ''}`,
    };
  }

  // 匹配 DNS 查询发起: "app/dns: TCP:223.5.5.5:53 querying domain example.com"
  const queryingMatch = msg.match(/(\S+?)\s+querying\s+(?:domain\s+)?([a-zA-Z0-9.-]+)/i);
  if (queryingMatch) {
    const dnsServer = queryingMatch[1];
    const domain = queryingMatch[2];
    return {
      category: 'dns',
      domain,
      target: domain,
      dnsServer,
      chain: ['DNS 查询发起', dnsServer, domain],
      action: 'DNS查询',
      shortSummary: `DNS 查询: ${domain} ➔ 服务器 ${dnsServer}`,
    };
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

  // 0. 提取日志头部：模块路径与连接会话 ID
  const header = parseLogHeader(msg);

  // 1. 尝试连接访问 Access 日志解析
  const accessResult = parseAccessLog(msg);
  if (accessResult) return { ...header, ...accessResult };

  // 1.5 尝试 TUN 虚拟网卡流量转发日志解析
  const tunResult = parseTunLog(msg);
  if (tunResult) return { ...header, ...tunResult };

  // 1.6 尝试代理协议隧道请求日志解析
  const tunnelResult = parseProxyTunnelLog(msg);
  if (tunnelResult) return { ...header, ...tunnelResult };

  // 1.7 尝试 HTTP 代理入站请求日志解析
  const httpRequestResult = parseHttpRequestLog(msg);
  if (httpRequestResult) return { ...header, ...httpRequestResult };

  // 1.8 尝试 Freedom 直连出站连接日志解析
  const freedomResult = parseFreedomLog(msg);
  if (freedomResult) return { ...header, ...freedomResult };

  // 2. 尝试路由分流 Router 日志解析
  const routerResult = parseRouterLog(msg);
  if (routerResult) return { ...header, ...routerResult };

  // 3. 尝试 DNS 解析日志
  const dnsResult = parseDnsLog(msg);
  if (dnsResult) return { ...header, ...dnsResult };

  // 4. 尝试 Observatory 测速日志
  const obsResult = parseObservatoryLog(msg);
  if (obsResult) return { ...header, ...obsResult };

  // 5. 尝试 Inbound 入站监听日志
  const inboundResult = parseInboundLog(msg);
  if (inboundResult) return { ...header, ...inboundResult };

  // 6. 尝试 Outbound 出站协议与握手日志
  const outboundResult = parseOutboundLog(msg);
  if (outboundResult) return { ...header, ...outboundResult };

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
      ...header,
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
  const cleanMsg = stripLogPrefix(msg);
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
      ...header,
      category: 'system',
      action: level === 'error' ? '系统错误' : level === 'warning' ? '系统警告' : '内核状态',
      shortSummary: cleanMsg.length > 90 ? cleanMsg.substring(0, 90) + '...' : cleanMsg,
    };
  }

  // 默认常规类别
  return {
    ...header,
    category: 'general',
    shortSummary: cleanMsg.length > 90 ? cleanMsg.substring(0, 90) + '...' : cleanMsg,
  };
}
