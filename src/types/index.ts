export type ProtocolType = 'vless' | 'vmess' | 'trojan' | 'shadowsocks' | 'hysteria2' | 'wireguard' | 'direct' | 'block';

export type OutboundMode = 'rule' | 'global' | 'direct';

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
    loglevel?: string;
  };
  inbounds?: XrayInbound[];
  outbounds?: XrayOutbound[];
  routing?: {
    domainStrategy?: string;
    rules?: Record<string, any>[];
  };
  dns?: Record<string, any>;
  policy?: Record<string, any>;
  customJsonPatch?: string; // JSON Patch or JSON Merge string
}

export type KernelSourceType = 'bundled' | 'custom' | 'installed';

export interface KernelInfo {
  name: String;
  version: String;
  path: String;
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

