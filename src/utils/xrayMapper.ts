import type { ProxyNode, ProxyGroup, OutboundMode } from '../types';

export interface XrayOutbound {
  tag: string;
  protocol: string;
  settings?: Record<string, any>;
  streamSettings?: Record<string, any>;
  mux?: Record<string, any>;
}

export interface XrayRoutingRule {
  type: string;
  outboundTag?: string;
  balancerTag?: string;
  domain?: string[];
  ip?: string[];
  port?: string;
  protocol?: string[];
  inboundTag?: string[];
  network?: string;
  enabled?: boolean;
  description?: string;
}

export interface XrayConfigObject {
  log?: Record<string, any>;
  inbounds?: Record<string, any>[];
  outbounds?: XrayOutbound[];
  routing?: {
    domainStrategy?: string;
    domainMatcher?: string;
    rules?: XrayRoutingRule[];
    balancers?: Record<string, any>[];
  };
  dns?: Record<string, any>;
  fakedns?: Record<string, any>[];
  policy?: Record<string, any>;
  observatory?: Record<string, any>;
  burstObservatory?: Record<string, any>;
  [key: string]: any;
}

/**
 * Convert a ProxyNode object to an Xray Outbound JSON object
 */
export function nodeToXrayOutbound(node: ProxyNode): XrayOutbound {
  const tag = node.name ? `${node.name} [${node.id.slice(-4)}]` : node.id;

  if (node.protocol === 'direct') {
    return {
      tag,
      protocol: 'freedom',
      settings: {},
    };
  }

  if (node.protocol === 'block') {
    return {
      tag,
      protocol: 'blackhole',
      settings: { response: { type: 'http' } },
    };
  }

  const streamSettings: Record<string, any> = {
    network: node.network || 'tcp',
    security: node.security || 'none',
  };

  if (node.security === 'tls') {
    streamSettings.tlsSettings = {
      serverName: node.sni || node.server,
      allowInsecure: false,
      fingerprint: node.fingerprint || 'chrome',
      alpn: node.alpn && node.alpn.length > 0 ? node.alpn : undefined,
    };
  } else if (node.security === 'reality') {
    streamSettings.realitySettings = {
      show: false,
      fingerprint: node.fingerprint || 'chrome',
      serverName: node.sni || node.server,
      publicKey: node.publicKey || '',
      shortId: node.shortId || '',
      spiderX: node.path || '/',
    };
  }

  if (node.network === 'ws') {
    streamSettings.wsSettings = {
      path: node.path || '/',
      headers: node.host ? { Host: node.host } : undefined,
    };
  } else if (node.network === 'grpc') {
    streamSettings.grpcSettings = {
      serviceName: node.serviceName || '',
      multiMode: false,
    };
  } else if (node.network === 'h2') {
    streamSettings.httpSettings = {
      host: node.host ? [node.host] : [node.server],
      path: node.path || '/',
    };
  }

  let settings: Record<string, any> = {};

  switch (node.protocol) {
    case 'vless':
      settings = {
        vnext: [
          {
            address: node.server,
            port: node.port,
            users: [
              {
                id: node.uuid || '',
                encryption: 'none',
                flow: node.flow || undefined,
                ...(node.reverseTag ? { reverse: { tag: node.reverseTag } } : {}),
              },
            ],
          },
        ],
      };
      break;

    case 'vmess':
      settings = {
        vnext: [
          {
            address: node.server,
            port: node.port,
            users: [
              {
                id: node.uuid || '',
                alterId: 0,
                security: node.cipher || 'auto',
              },
            ],
          },
        ],
      };
      break;

    case 'trojan':
      settings = {
        servers: [
          {
            address: node.server,
            port: node.port,
            password: node.password || '',
          },
        ],
      };
      break;

    case 'shadowsocks':
      settings = {
        servers: [
          {
            address: node.server,
            port: node.port,
            method: node.cipher || 'aes-128-gcm',
            password: node.password || '',
            ota: false,
          },
        ],
      };
      break;

    case 'hysteria2':
      settings = {
        servers: [
          {
            address: node.server,
            port: node.port,
            password: node.password || '',
          },
        ],
      };
      break;

    default:
      settings = {
        servers: [
          {
            address: node.server,
            port: node.port,
          },
        ],
      };
      break;
  }

  return {
    tag,
    protocol: node.protocol,
    settings,
    streamSettings,
  };
}

/**
 * Try to parse an Xray Outbound JSON back to ProxyNode structure
 */
export function xrayOutboundToNode(outbound: XrayOutbound, profileId: string = 'local'): ProxyNode | null {
  if (!outbound || !outbound.protocol) return null;

  const protocol = outbound.protocol.toLowerCase();

  if (protocol === 'freedom' || protocol === 'blackhole' || outbound.tag === 'proxy') {
    return null; // System outbounds / default primary proxy tag
  }

  const id = `node-from-json-${outbound.tag.replace(/[^a-zA-Z0-9-]/g, '_')}`;
  const name = outbound.tag || 'Xray Node';
  const settings = outbound.settings || {};
  const streamSettings = outbound.streamSettings || {};

  let server = '127.0.0.1';
  let port = 443;
  let uuid: string | undefined;
  let password: string | undefined;
  let cipher: string | undefined;
  let flow: string | undefined;
  let reverseTag: string | undefined;

  if (protocol === 'vless' || protocol === 'vmess') {
    const vnext = settings.vnext?.[0];
    if (vnext) {
      server = vnext.address || server;
      port = vnext.port || port;
      const user = vnext.users?.[0];
      if (user) {
        uuid = user.id;
        flow = user.flow;
        cipher = user.security;
        if (user.reverse && typeof user.reverse.tag === 'string') {
          reverseTag = user.reverse.tag;
        }
      }
    }
  } else if (protocol === 'trojan' || protocol === 'shadowsocks' || protocol === 'hysteria2') {
    const serverObj = settings.servers?.[0];
    if (serverObj) {
      server = serverObj.address || server;
      port = serverObj.port || port;
      password = serverObj.password;
      cipher = serverObj.method;
    }
  }

  const security = (streamSettings.security as 'none' | 'tls' | 'reality') || 'none';
  const network = (streamSettings.network as 'tcp' | 'ws' | 'grpc' | 'h2') || 'tcp';

  let sni: string | undefined;
  let fingerprint: string | undefined;
  let publicKey: string | undefined;
  let shortId: string | undefined;

  if (security === 'tls' && streamSettings.tlsSettings) {
    sni = streamSettings.tlsSettings.serverName;
    fingerprint = streamSettings.tlsSettings.fingerprint;
  } else if (security === 'reality' && streamSettings.realitySettings) {
    sni = streamSettings.realitySettings.serverName;
    fingerprint = streamSettings.realitySettings.fingerprint;
    publicKey = streamSettings.realitySettings.publicKey;
    shortId = streamSettings.realitySettings.shortId;
  }

  let path: string | undefined;
  let host: string | undefined;
  let serviceName: string | undefined;

  if (network === 'ws' && streamSettings.wsSettings) {
    path = streamSettings.wsSettings.path;
    host = streamSettings.wsSettings.headers?.Host;
  } else if (network === 'grpc' && streamSettings.grpcSettings) {
    serviceName = streamSettings.grpcSettings.serviceName;
  } else if (network === 'h2' && streamSettings.httpSettings) {
    path = streamSettings.httpSettings.path;
    host = streamSettings.httpSettings.host?.[0];
  }

  return {
    id,
    name,
    protocol: protocol as any,
    server,
    port,
    uuid,
    password,
    cipher,
    flow,
    reverseTag,
    security,
    sni,
    fingerprint,
    publicKey,
    shortId,
    network,
    path,
    host,
    serviceName,
    profileId,
    delay: Math.floor(20 + Math.random() * 80),
  };
}

/**
 * Merge ProxyNode array & ProxyGroup array into an existing Xray Config JSON string
 */
export function syncNodesAndGroupsToConfigJson(
  rawConfigJson: string,
  nodes: ProxyNode[],
  groups: ProxyGroup[] = [],
  selectedNodeId?: string,
  mode: OutboundMode = 'rule'
): string {
  let config: XrayConfigObject = {};

  try {
    config = JSON.parse(rawConfigJson);
  } catch {
    config = {};
  }

  if (!config.outbounds) {
    config.outbounds = [];
  }

  // Preserve existing system outbounds (like direct, block, or custom non-node tags), completely ignoring any 'proxy' tag
  const systemOutbounds = config.outbounds.filter(
    (ob) => (ob.protocol === 'freedom' || ob.protocol === 'blackhole' || ob.tag === 'direct' || ob.tag === 'block') && ob.tag !== 'proxy'
  );

  // If system outbounds direct and block are missing, add standard ones
  if (!systemOutbounds.some((ob) => ob.tag === 'direct')) {
    systemOutbounds.push({
      tag: 'direct',
      protocol: 'freedom',
      settings: {},
    });
  }
  if (!systemOutbounds.some((ob) => ob.tag === 'block')) {
    systemOutbounds.push({
      tag: 'block',
      protocol: 'blackhole',
      settings: { response: { type: 'http' } },
    });
  }

  // Generate node outbounds
  const nodeOutbounds: XrayOutbound[] = nodes.map((node) => nodeToXrayOutbound(node));

  // Determine active node tag for routing rules
  let activeNodeTag = 'direct';
  if (selectedNodeId) {
    const selectedNode = nodes.find((n) => n.id === selectedNodeId);
    if (selectedNode) {
      activeNodeTag = selectedNode.name ? `${selectedNode.name} [${selectedNode.id.slice(-4)}]` : selectedNode.id;
    }
  }
  if (activeNodeTag === 'direct' && nodeOutbounds.length > 0) {
    activeNodeTag = nodeOutbounds[0].tag;
  }

  const combinedOutbounds: XrayOutbound[] = [...nodeOutbounds, ...systemOutbounds];

  // Remove duplicate tags while preserving order
  const seenTags = new Set<string>();
  const finalOutbounds: XrayOutbound[] = [];

  for (const ob of combinedOutbounds) {
    if (!seenTags.has(ob.tag)) {
      seenTags.add(ob.tag);
      finalOutbounds.push(ob);
    }
  }

  config.outbounds = finalOutbounds;

  // Build/Sync routing rules and balancers based on strategy groups
  if (!config.routing) {
    config.routing = {
      domainStrategy: 'IPIfNonMatch',
      domainMatcher: 'hybrid',
      rules: [],
    };
  }

  // Clean out any previously injected mode override rules to keep user rules intact
  const rawExistingRules = config.routing.rules || [];
  const existingRules = rawExistingRules.filter(
    (rule) => !(rule.description && rule.description.startsWith('MXRay Mode Override'))
  );

  // Replace any existing rule pointing to 'proxy' with the active node's tag (if nodes exist)
  const updatedExistingRules = existingRules.map((rule) => {
    if (rule.outboundTag === 'proxy' && activeNodeTag !== 'proxy') {
      return { ...rule, outboundTag: activeNodeTag };
    }
    return rule;
  });

  const groupRoutingRules: XrayRoutingRule[] = [];
  const balancers: Record<string, any>[] = [];
  const observatorySubjectSelectors = new Set<string>();
  let probeUrl = 'https://www.gstatic.com/generate_204';
  let probeInterval = 10;

  for (const group of groups) {
    let targetOutboundTag = activeNodeTag;
    let targetBalancerTag: string | undefined = undefined;

    const isAutoGroup = group.type === 'urltest' || group.type === 'fallback' || group.type === 'loadbalance';

    if (isAutoGroup) {
      // Find matching nodes for this group
      let matchedNodes: ProxyNode[] = [];
      if (group.useFilter && group.filter && group.filter.trim() !== '') {
        try {
          const regex = new RegExp(group.filter, 'i');
          matchedNodes = nodes.filter((node) => regex.test(node.name) || regex.test(node.server));
        } catch {
          const keyword = group.filter.toLowerCase();
          matchedNodes = nodes.filter((node) => node.name.toLowerCase().includes(keyword) || node.server.toLowerCase().includes(keyword));
        }
      } else if (group.nodeIds && group.nodeIds.length > 0) {
        const set = new Set(group.nodeIds);
        matchedNodes = nodes.filter((node) => set.has(node.id));
      } else {
        matchedNodes = nodes;
      }

      if (matchedNodes.length > 0) {
        const balancerTag = `balancer-${group.id.replace(/[^a-zA-Z0-9-]/g, '_')}`;
        targetBalancerTag = balancerTag;

        const selectors = matchedNodes.map((n) => (n.name ? `${n.name} [${n.id.slice(-4)}]` : n.id));
        selectors.forEach((s) => observatorySubjectSelectors.add(s));

        balancers.push({
          tag: balancerTag,
          selector: selectors,
          strategy: {
            type: group.type === 'loadbalance' ? 'random' : 'leastPing',
          },
        });

        if (group.testUrl) probeUrl = group.testUrl;
        if (group.interval) probeInterval = group.interval;
      }
    }

    if (!targetBalancerTag) {
      if (group.selectedNodeId === 'DIRECT') {
        targetOutboundTag = 'direct';
      } else if (group.selectedNodeId === 'BLOCK' || group.selectedNodeId === 'REJECT') {
        targetOutboundTag = 'block';
      } else {
        const targetNode = nodes.find((n) => n.id === group.selectedNodeId);
        if (targetNode) {
          targetOutboundTag = targetNode.name ? `${targetNode.name} [${targetNode.id.slice(-4)}]` : targetNode.id;
        }
      }
    }

    const ruleBase: XrayRoutingRule = {
      type: 'field',
    };
    if (targetBalancerTag) {
      ruleBase.balancerTag = targetBalancerTag;
    } else {
      ruleBase.outboundTag = targetOutboundTag;
    }

    if (group.name === 'OpenAI' || group.name.toLowerCase().includes('openai')) {
      groupRoutingRules.push({
        ...ruleBase,
        domain: ['geosite:openai'],
      });
    } else if (group.name === 'Telegram' || group.name.toLowerCase().includes('telegram')) {
      groupRoutingRules.push({
        ...ruleBase,
        domain: ['geosite:telegram'],
        ip: ['geoip:telegram'],
      });
    } else if (group.name === '国内流量' || group.name.toLowerCase().includes('cn')) {
      groupRoutingRules.push({
        ...ruleBase,
        domain: ['geosite:cn'],
        ip: ['geoip:cn'],
      });
    }
  }

  if (balancers.length > 0) {
    config.routing.balancers = balancers;
  }

  if (observatorySubjectSelectors.size > 0) {
    if (config.burstObservatory) {
      // Merge selectors into existing burstObservatory if present
      const existing = new Set(config.burstObservatory.subjectSelector || []);
      observatorySubjectSelectors.forEach((s) => existing.add(s));
      config.burstObservatory.subjectSelector = Array.from(existing);
    } else if (config.observatory) {
      // Merge selectors into existing observatory
      const existing = new Set(config.observatory.subjectSelector || []);
      observatorySubjectSelectors.forEach((s) => existing.add(s));
      config.observatory.subjectSelector = Array.from(existing);
    } else {
      config.observatory = {
        subjectSelector: Array.from(observatorySubjectSelectors),
        probeUrl,
        probeInterval: `${probeInterval}s`,
        enableConcurrency: true,
      };
    }
  }

  // Combine existing non-group rules with strategy group rules
  const combinedRules: XrayRoutingRule[] = [...groupRoutingRules, ...updatedExistingRules];
  const baseRules: XrayRoutingRule[] = [];
  const ruleKeys = new Set<string>();

  for (const r of combinedRules) {
    const key = `${r.outboundTag}-${(r.domain || []).join(',')}-${(r.ip || []).join(',')}`;
    if (!ruleKeys.has(key)) {
      ruleKeys.add(key);
      baseRules.push(r);
    }
  }

  // Construct mode override rules dynamically based on selected mode
  let modeOverrideRules: XrayRoutingRule[] = [];
  if (mode === 'direct') {
    modeOverrideRules = [
      {
        type: 'field',
        outboundTag: 'direct',
        network: 'tcp,udp',
        description: 'MXRay Mode Override: Direct',
      },
    ];
  } else if (mode === 'global') {
    modeOverrideRules = [
      {
        type: 'field',
        outboundTag: 'direct',
        ip: ['geoip:private'],
        description: 'MXRay Mode Override: Global Private Direct',
      },
      {
        type: 'field',
        outboundTag: activeNodeTag,
        network: 'tcp,udp',
        description: 'MXRay Mode Override: Global Proxy',
      },
    ];
  }

  config.routing.rules = [...modeOverrideRules, ...baseRules];

  return JSON.stringify(config, null, 2);
}

/**
 * Parse an Xray Config JSON string into nodes list
 */
export function extractNodesFromConfigJson(rawConfigJson: string): ProxyNode[] {
  try {
    const config: XrayConfigObject = JSON.parse(rawConfigJson);
    if (!config.outbounds || !Array.isArray(config.outbounds)) return [];

    const nodes: ProxyNode[] = [];
    for (const ob of config.outbounds) {
      if (ob.tag === 'direct' || ob.tag === 'block' || ob.tag === 'proxy') continue;
      const node = xrayOutboundToNode(ob);
      if (node) {
        nodes.push(node);
      }
    }
    return nodes;
  } catch {
    return [];
  }
}
