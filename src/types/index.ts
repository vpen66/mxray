export interface CoreState {
  isRunning: boolean;
  version: string;
  uptime: number; // seconds
  systemProxy: boolean;
  tunMode: boolean;
}

export type LogCategory =
  | 'connection'
  | 'router'
  | 'dns'
  | 'inbound'
  | 'outbound'
  | 'observatory'
  | 'system'
  | 'general';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  message: string;
  category?: LogCategory;
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

export interface XrayConfigProfile {
  id: string;
  name: string;
  description: string;
  content: string;
  updatedAt: string;
  isDefault?: boolean;
  /** 禁用配置项标识列表（不写入 JSON，启动内核时动态过滤） */
  disabled?: string[];
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

