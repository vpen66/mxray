export type ProtocolType = 'vless' | 'vmess' | 'trojan' | 'shadowsocks' | 'hysteria2' | 'wireguard' | 'direct' | 'block';

export type OutboundMode = 'rule' | 'global' | 'direct';

export type ProxyGroupType = 'select' | 'urltest' | 'fallback' | 'loadbalance' | 'direct' | 'block';

export interface ProxyGroup {
  id: string;
  name: string;
  type: ProxyGroupType;
  icon?: string;
  selectedNodeId: string;
  useFilter?: boolean;
  filter?: string;
  nodeIds?: string[];
  testUrl?: string;
  interval?: number;
  tolerance?: number;
  isCustom?: boolean;
}

export interface ProxyNode {
  id: string;
  name: string;
  protocol: ProtocolType;
  server: string;
  port: number;
  uuid?: string;
  password?: string;
  cipher?: string;
  flow?: string;
  security?: 'none' | 'tls' | 'reality';
  sni?: string;
  fingerprint?: string;
  publicKey?: string;
  shortId?: string;
  network?: 'tcp' | 'ws' | 'grpc' | 'h2';
  path?: string;
  host?: string;
  serviceName?: string;
  alpn?: string[];
  delay?: number; // MS, -1 means failed/timeout
  profileId?: string;
  rawUrl?: string;
}

export interface Profile {
  id: string;
  name: string;
  url?: string;
  type: 'remote' | 'local';
  updatedAt: number;
  nodeCount: number;
  nodes: ProxyNode[];
  autoUpdate: boolean;
  updateInterval: number; // hours
}

export interface RoutingRule {
  id: string;
  type: 'field';
  outboundTag: string;
  domain?: string[];
  ip?: string[];
  port?: string;
  protocol?: string[];
  enabled: boolean;
  description?: string;
}

export interface TrafficStats {
  uploadSpeed: number; // bytes/s
  downloadSpeed: number; // bytes/s
  totalUpload: number; // bytes
  totalDownload: number; // bytes
}

export interface CoreState {
  isRunning: boolean;
  version: string;
  uptime: number; // seconds
  mode: OutboundMode;
  systemProxy: boolean;
  tunMode: boolean;
  activeNodeId?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  message: string;
}

// Xray JSON Schema types for custom JSON merge editor
export interface XrayInbound {
  tag: string;
  port: number;
  listen?: string;
  protocol: string;
  settings?: Record<string, any>;
  sniffing?: {
    enabled: boolean;
    destOverride?: string[];
  };
  streamSettings?: Record<string, any>;
}

export interface XrayOutbound {
  tag: string;
  protocol: string;
  settings?: Record<string, any>;
  streamSettings?: Record<string, any>;
  mux?: Record<string, any>;
}

export interface XrayCustomConfig {
  log?: {
    access?: string;
    error?: string;
    loglevel?: string;
    dnsLog?: boolean;
    maskAddress?: string;
  };
  inbounds?: XrayInbound[];
  outbounds?: XrayOutbound[];
  routing?: {
    domainStrategy?: string;
    rules?: Record<string, any>[];
  };
  dns?: Record<string, any>;
  policy?: Record<string, any>;
}

export interface XrayConfigProfile {
  id: string;
  name: string;
  description: string;
  content: string;
  updatedAt: string;
  isDefault?: boolean;
}

export type KernelSourceType = 'bundled' | 'custom' | 'installed';

export interface KernelInfo {
  name: string;
  version: string;
  path: string;
  kernel_type: KernelSourceType;
  is_valid: boolean;
  error?: string;
}

export interface RemoteRelease {
  version: string;
  tag_name: string;
  name: string;
  published_at: string;
  download_url: string;
}

export interface GeoDataFileInfo {
  name: string;
  exists: boolean;
  size_bytes: number;
  updated_at?: string;
}

export interface GeoDataStatus {
  geoip: GeoDataFileInfo;
  geosite: GeoDataFileInfo;
  asset_dir: string;
}

export interface ConnectionItem {
  id: string;
  host: string;
  network: 'TCP' | 'UDP';
  inboundTag: string;
  rule: string;
  chain: string[];
  destinationIp?: string;
  processName?: string;
  download: number; // bytes
  upload: number; // bytes
  downloadSpeed: number; // bytes/s
  uploadSpeed: number; // bytes/s
  status: 'active' | 'closed';
  startTime: number; // timestamp ms
  closedTime?: number;
}


