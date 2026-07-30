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




