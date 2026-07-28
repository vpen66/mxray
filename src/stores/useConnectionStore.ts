import { create } from 'zustand';
import type { ConnectionItem } from '../types';

interface ConnectionStore {
  connections: ConnectionItem[];
  isPaused: boolean;
  searchQuery: string;
  filterTab: 'active' | 'closed' | 'all';
  selectedChainFilter: string;
  regexMode: boolean;
  
  // Actions
  closeConnection: (id: string) => void;
  closeAllConnections: () => void;
  clearClosedConnections: () => void;
  togglePause: () => void;
  setSearchQuery: (query: string) => void;
  setFilterTab: (tab: 'active' | 'closed' | 'all') => void;
  setSelectedChainFilter: (chain: string) => void;
  setRegexMode: (enabled: boolean) => void;
  updateModeConnections: (mode: string, activeNodeName?: string) => void;
  initConnectionSimulation: () => () => void;
}

const INITIAL_CONNECTIONS: ConnectionItem[] = [
  {
    id: 'conn-1',
    host: 'push.navicat.com:443',
    network: 'TCP',
    inboundTag: 'tun-in',
    rule: 'Match',
    chain: ['其他流量', '国外流量', 'tw'],
    destinationIp: '43.129.21.90:443',
    processName: 'navicat',
    download: 8612,
    upload: 2468,
    downloadSpeed: 0,
    uploadSpeed: 0,
    status: 'active',
    startTime: Date.now() - 320000,
  },
  {
    id: 'conn-2',
    host: 'imap.qq.com:993',
    network: 'TCP',
    inboundTag: 'socks-in',
    rule: 'DomainSuffix(qq.com)',
    chain: ['国内流量', '直接连接', 'DIRECT'],
    destinationIp: '14.18.245.237:993',
    processName: 'Foxmail',
    download: 15155,
    upload: 2099,
    downloadSpeed: 0,
    uploadSpeed: 0,
    status: 'active',
    startTime: Date.now() - 450000,
  },
  {
    id: 'conn-3',
    host: 'waa-pa.clients6.google.com:443',
    network: 'TCP',
    inboundTag: 'tun-in',
    rule: 'DomainKeyword(google)',
    chain: ['国外流量', 'tw'],
    destinationIp: '142.250.207.74:443',
    processName: 'chrome',
    download: 11980,
    upload: 6758,
    downloadSpeed: 0,
    uploadSpeed: 0,
    status: 'active',
    startTime: Date.now() - 180000,
  },
  {
    id: 'conn-4',
    host: 'daily-cloudcode-pa.googleapis.com:443',
    network: 'TCP',
    inboundTag: 'tun-in',
    rule: 'DomainKeyword(google)',
    chain: ['国外流量', '6amuemkt5i'],
    destinationIp: '172.217.160.106:443',
    processName: 'Code Helper',
    download: 77824,
    upload: 34000,
    downloadSpeed: 12400,
    uploadSpeed: 4200,
    status: 'active',
    startTime: Date.now() - 95000,
  },
  {
    id: 'conn-5',
    host: 'mtalk.google.com:5228',
    network: 'TCP',
    inboundTag: 'socks-in',
    rule: 'DomainKeyword(google)',
    chain: ['国外流量', 'tw'],
    destinationIp: '108.177.125.188:5228',
    processName: 'system',
    download: 6892,
    upload: 2078,
    downloadSpeed: 0,
    uploadSpeed: 0,
    status: 'active',
    startTime: Date.now() - 600000,
  },
  {
    id: 'conn-6',
    host: 'chatgpt.com:443',
    network: 'TCP',
    inboundTag: 'tun-in',
    rule: 'DomainSuffix(chatgpt.com)',
    chain: ['OpenAI', '国外流量', 'tw'],
    destinationIp: '104.18.32.7:443',
    processName: 'chrome',
    download: 5785,
    upload: 13414,
    downloadSpeed: 5600,
    uploadSpeed: 1200,
    status: 'active',
    startTime: Date.now() - 42000,
  },
  {
    id: 'conn-7',
    host: '203.119.169.109:443',
    network: 'TCP',
    inboundTag: 'http-in',
    rule: 'GeoIP(cn)',
    chain: ['国内流量', '直接连接', 'DIRECT'],
    destinationIp: '203.119.169.109:443',
    processName: 'WeChat',
    download: 8744,
    upload: 2764,
    downloadSpeed: 0,
    uploadSpeed: 0,
    status: 'active',
    startTime: Date.now() - 210000,
  },
  {
    id: 'conn-8',
    host: 'pms.topode.com:443',
    network: 'TCP',
    inboundTag: 'http-in',
    rule: 'DomainSuffix(topode.com)',
    chain: ['DIRECT'],
    destinationIp: '118.31.22.14:443',
    processName: 'node',
    download: 7127,
    upload: 2826,
    downloadSpeed: 0,
    uploadSpeed: 0,
    status: 'active',
    startTime: Date.now() - 520000,
  },
  {
    id: 'conn-9',
    host: 'ws.chatgpt.com:443',
    network: 'TCP',
    inboundTag: 'tun-in',
    rule: 'DomainSuffix(chatgpt.com)',
    chain: ['OpenAI', '国外流量', 'tw'],
    destinationIp: '104.18.33.7:443',
    processName: 'chrome',
    download: 5765,
    upload: 10342,
    downloadSpeed: 8900,
    uploadSpeed: 2100,
    status: 'active',
    startTime: Date.now() - 88000,
  },
  {
    id: 'conn-10',
    host: '1.1.1.1:443',
    network: 'UDP',
    inboundTag: 'tun-in',
    rule: 'Match',
    chain: ['其他流量', '国外流量', '6amuemkt5i'],
    destinationIp: '1.1.1.1:443',
    processName: 'dns-resolver',
    download: 7055,
    upload: 3051,
    downloadSpeed: 0,
    uploadSpeed: 0,
    status: 'active',
    startTime: Date.now() - 150000,
  },
  {
    id: 'conn-11',
    host: 'easylist-downloads.adblockplus.org:443',
    network: 'TCP',
    inboundTag: 'socks-in',
    rule: 'DomainSuffix(adblockplus.org)',
    chain: ['国外流量', 'tw'],
    destinationIp: '104.22.61.12:443',
    processName: 'chrome',
    download: 1054,
    upload: 2867,
    downloadSpeed: 0,
    uploadSpeed: 0,
    status: 'closed',
    startTime: Date.now() - 900000,
    closedTime: Date.now() - 30000,
  },
];

const ORIGINAL_CONNECTIONS: Record<string, { rule: string; chain: string[] }> = {
  'conn-1': { rule: 'Match', chain: ['其他流量', '国外流量', 'tw'] },
  'conn-2': { rule: 'DomainSuffix(qq.com)', chain: ['国内流量', '直接连接', 'DIRECT'] },
  'conn-3': { rule: 'DomainKeyword(google)', chain: ['国外流量', 'tw'] },
  'conn-4': { rule: 'DomainKeyword(google)', chain: ['国外流量', '6amuemkt5i'] },
  'conn-5': { rule: 'DomainKeyword(google)', chain: ['国外流量', 'tw'] },
  'conn-6': { rule: 'DomainSuffix(chatgpt.com)', chain: ['OpenAI', '国外流量', 'tw'] },
  'conn-7': { rule: 'GeoIP(cn)', chain: ['国内流量', '直接连接', 'DIRECT'] },
  'conn-8': { rule: 'DomainSuffix(topode.com)', chain: ['DIRECT'] },
  'conn-9': { rule: 'DomainSuffix(chatgpt.com)', chain: ['OpenAI', '国外流量', 'tw'] },
  'conn-10': { rule: 'Match', chain: ['其他流量', '国外流量', '6amuemkt5i'] },
  'conn-11': { rule: 'DomainSuffix(adblockplus.org)', chain: ['国外流量', 'tw'] },
};

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
  connections: INITIAL_CONNECTIONS,
  isPaused: false,
  searchQuery: '',
  filterTab: 'active',
  selectedChainFilter: 'ALL',
  regexMode: false,

  closeConnection: (id) =>
    set((state) => ({
      connections: state.connections.map((c) =>
        c.id === id ? { ...c, status: 'closed', downloadSpeed: 0, uploadSpeed: 0, closedTime: Date.now() } : c
      ),
    })),

  closeAllConnections: () =>
    set((state) => ({
      connections: state.connections.map((c) =>
        c.status === 'active'
          ? { ...c, status: 'closed', downloadSpeed: 0, uploadSpeed: 0, closedTime: Date.now() }
          : c
      ),
    })),

  clearClosedConnections: () =>
    set((state) => ({
      connections: state.connections.filter((c) => c.status === 'active'),
    })),

  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setFilterTab: (filterTab) => set({ filterTab }),
  setSelectedChainFilter: (selectedChainFilter) => set({ selectedChainFilter }),
  setRegexMode: (regexMode) => set({ regexMode }),

  updateModeConnections: (mode: string, activeNodeName: string = '代理节点') =>
    set((state) => ({
      connections: state.connections.map((c) => {
        if (mode === 'direct') {
          return {
            ...c,
            rule: 'MXRay Mode Override: Direct',
            chain: ['直连模式', 'DIRECT'],
          };
        }
        if (mode === 'global') {
          const isPrivate = c.host.startsWith('192.168.') || c.host.startsWith('10.') || c.host.startsWith('127.');
          if (isPrivate) {
            return {
              ...c,
              rule: 'MXRay Mode Override: Global Private Direct',
              chain: ['局域网直连', 'DIRECT'],
            };
          }
          return {
            ...c,
            rule: 'MXRay Mode Override: Global Proxy',
            chain: ['全局代理', activeNodeName],
          };
        }
        // Restoring 'rule' mode
        const orig = ORIGINAL_CONNECTIONS[c.id];
        return {
          ...c,
          rule: orig ? orig.rule : c.rule,
          chain: orig ? orig.chain : c.chain,
        };
      }),
    })),

  initConnectionSimulation: () => {
    const timer = setInterval(() => {
      const { isPaused } = get();
      if (isPaused) return;

      set((state) => {
        const updated = state.connections.map((c) => {
          if (c.status !== 'active') return c;

          // Random chance of traffic burst for active connections
          const activeBurst = Math.random() > 0.6;
          const deltaDownload = activeBurst ? Math.floor(Math.random() * 15000) : 0;
          const deltaUpload = activeBurst ? Math.floor(Math.random() * 4000) : 0;

          const downloadSpeed = activeBurst ? Math.floor(deltaDownload * 1.2) : 0;
          const uploadSpeed = activeBurst ? Math.floor(deltaUpload * 1.2) : 0;

          return {
            ...c,
            download: c.download + deltaDownload,
            upload: c.upload + deltaUpload,
            downloadSpeed,
            uploadSpeed,
          };
        });

        return { connections: updated };
      });
    }, 2000);

    return () => clearInterval(timer);
  },
}));
