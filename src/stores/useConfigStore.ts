import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { XrayConfigProfile, OutboundMode } from '../types';
import { syncNodesAndGroupsToConfigJson } from '../utils/xrayMapper';
import { invoke } from '@tauri-apps/api/core';
import { getShanghaiNowString } from '../utils/date';
import { useAppStore } from './useAppStore';

interface ConfigStore {
  profiles: XrayConfigProfile[];
  activeProfileId: string;
  selectedProfileId: string;
  socksPort: number;
  httpPort: number;
  dnsStrategy: string;
  enableFakeDns: boolean;
  sniffingEnabled: boolean;
  
  // Actions
  addProfile: (data: { name: string; description: string; content: string }) => string;
  updateProfile: (id: string, updates: Partial<Omit<XrayConfigProfile, 'id'>>) => void;
  deleteProfile: (id: string) => void;
  duplicateProfile: (id: string) => string;
  setActiveProfileId: (id: string) => void;
  setSelectedProfileId: (id: string) => void;
  updatePorts: (socks: number, http: number) => void;
  setDnsStrategy: (strategy: string) => void;
  toggleFakeDns: () => void;
  toggleSniffing: () => void;
  syncNodesAndGroups: (nodes: any[], groups: any[], selectedNodeId?: string, mode?: OutboundMode) => void;
  startActiveKernel: () => Promise<void>;
}

export const TEMPLATE_STANDARD = `{
  "log": {
    "loglevel": "warning",
    "dnsLog": false
  },
  "dns": {
    "hosts": {
      "domain:v2fly.org": "1.1.1.1"
    },
    "servers": [
      "https://1.1.1.1/dns-query",
      {
        "address": "223.5.5.5",
        "domains": [
          "geosite:cn"
        ],
        "expectIPs": [
          "geoip:cn"
        ]
      },
      "localhost"
    ],
    "queryStrategy": "UseIP"
  },
  "inbounds": [
    {
      "tag": "socks-in",
      "port": 7890,
      "listen": "127.0.0.1",
      "protocol": "socks",
      "settings": {
        "auth": "noauth",
        "udp": true
      },
      "sniffing": {
        "enabled": true,
        "destOverride": ["http", "tls", "quic", "fakedns"],
        "routeOnly": true
      }
    },
    {
      "tag": "http-in",
      "port": 7891,
      "listen": "127.0.0.1",
      "protocol": "http",
      "settings": {
        "timeout": 0
      },
      "sniffing": {
        "enabled": true,
        "destOverride": ["http", "tls", "quic", "fakedns"],
        "routeOnly": true
      }
    }
  ],
  "outbounds": [
    {
      "tag": "direct",
      "protocol": "freedom",
      "settings": {}
    },
    {
      "tag": "block",
      "protocol": "blackhole",
      "settings": {
        "response": {
          "type": "http"
        }
      }
    }
  ],
  "routing": {
    "domainStrategy": "IPIfNonMatch",
    "domainMatcher": "hybrid",
    "rules": [
      {
        "type": "field",
        "outboundTag": "proxy",
        "domain": [
          "geosite:openai",
          "geosite:github",
          "geosite:gfw"
        ]
      },
      {
        "type": "field",
        "outboundTag": "direct",
        "domain": [
          "geosite:cn",
          "geosite:private"
        ]
      },
      {
        "type": "field",
        "outboundTag": "direct",
        "ip": [
          "geoip:cn",
          "geoip:private"
        ]
      },
      {
        "type": "field",
        "outboundTag": "block",
        "domain": [
          "geosite:category-ads-all"
        ]
      },
      {
        "type": "field",
        "outboundTag": "proxy",
        "network": "tcp,udp"
      }
    ]
  }
}`;

export const TEMPLATE_TUN = `{
  "log": {
    "loglevel": "warning"
  },
  "fakedns": [
    {
      "ipPool": "198.18.0.0/15",
      "poolSize": 65535
    }
  ],
  "dns": {
    "hosts": {
      "domain:v2fly.org": "1.1.1.1"
    },
    "servers": [
      "https://1.1.1.1/dns-query",
      "223.5.5.5",
      "fakedns"
    ],
    "queryStrategy": "UseIP"
  },
  "inbounds": [
    {
      "tag": "socks-in",
      "port": 7890,
      "listen": "127.0.0.1",
      "protocol": "socks",
      "settings": {
        "auth": "noauth",
        "udp": true
      },
      "sniffing": {
        "enabled": true,
        "destOverride": ["http", "tls", "quic", "fakedns"],
        "routeOnly": true
      }
    },
    {
      "tag": "http-in",
      "port": 7891,
      "listen": "127.0.0.1",
      "protocol": "http",
      "settings": {
        "timeout": 0
      },
      "sniffing": {
        "enabled": true,
        "destOverride": ["http", "tls", "quic", "fakedns"],
        "routeOnly": true
      }
    },
    {
      "tag": "tun-in",
      "protocol": "tun",
      "settings": {
        "name": "utun20",
        "desc": "MXray TUN Adapter",
        "mtu": 1500,
        "gateway": ["172.18.0.1/30", "fdfe:dcba:9876::1/126"],
        "dns": ["1.1.1.1", "8.8.8.8"],
        "userLevel": 0,
        "autoSystemRoutingTable": ["0.0.0.0/0", "::/0"],
        "autoOutboundsInterface": "auto"
      },
      "sniffing": {
        "enabled": true,
        "destOverride": ["http", "tls", "quic", "fakedns"],
        "routeOnly": true
      }
    }
  ],
  "outbounds": [
    {
      "tag": "direct",
      "protocol": "freedom"
    },
    {
      "tag": "block",
      "protocol": "blackhole"
    }
  ],
  "routing": {
    "domainStrategy": "AsIs",
    "domainMatcher": "hybrid",
    "rules": [
      {
        "type": "field",
        "outboundTag": "block",
        "ip": ["224.0.0.0/3", "ff00::/8"]
      },
      {
        "type": "field",
        "outboundTag": "block",
        "port": "135,137-139,5353",
        "network": "udp"
      },
      {
        "type": "field",
        "outboundTag": "direct",
        "domain": ["geosite:cn", "geosite:private"]
      },
      {
        "type": "field",
        "outboundTag": "direct",
        "ip": ["geoip:cn", "geoip:private"]
      },
      {
        "type": "field",
        "outboundTag": "proxy",
        "network": "tcp,udp"
      }
    ]
  }
}`;

export const TEMPLATE_MINIMAL = `{
  "log": {
    "loglevel": "info",
    "dnsLog": true
  },
  "dns": {
    "servers": [
      "8.8.8.8",
      "1.1.1.1"
    ]
  },
  "inbounds": [
    {
      "tag": "socks-in",
      "port": 7890,
      "listen": "127.0.0.1",
      "protocol": "socks",
      "settings": {
        "auth": "noauth",
        "udp": true
      },
      "sniffing": {
        "enabled": true,
        "destOverride": ["http", "tls", "quic", "fakedns"],
        "routeOnly": false
      }
    }
  ],
  "outbounds": [
    {
      "tag": "direct",
      "protocol": "freedom"
    }
  ],
  "routing": {
    "domainStrategy": "IPIfNonMatch",
    "rules": [
      {
        "type": "field",
        "outboundTag": "direct",
        "ip": ["geoip:private"]
      },
      {
        "type": "field",
        "outboundTag": "proxy",
        "network": "tcp,udp"
      }
    ]
  }
}`;

const INITIAL_PROFILES: XrayConfigProfile[] = [
  {
    id: 'cfg-default-standard',
    name: '默认标准分流配置',
    description: '标准 SOCKS5 / HTTP 入站与 CN / OpenAI / Telegram 分流规则',
    content: TEMPLATE_STANDARD,
    updatedAt: '2026-07-27 10:00',
    isDefault: true,
  },
  {
    id: 'cfg-tun-global',
    name: 'TUN 全局接管配置',
    description: '集成 Dokodemo-door 与 FakeDNS 透明代理入站，适合全系统接管',
    content: TEMPLATE_TUN,
    updatedAt: '2026-07-27 11:30',
  },
  {
    id: 'cfg-minimal-debug',
    name: '极简调试配置',
    description: '无规则路由，单个 SOCKS5 端口及直连出站调试使用',
    content: TEMPLATE_MINIMAL,
    updatedAt: '2026-07-27 12:15',
  },
];

export const useConfigStore = create<ConfigStore>()(
  persist(
    (set, get) => ({
      profiles: INITIAL_PROFILES,
      activeProfileId: 'cfg-default-standard',
      selectedProfileId: 'cfg-default-standard',
      socksPort: 7890,
      httpPort: 7891,
      dnsStrategy: 'IPIfNonMatch',
      enableFakeDns: true,
      sniffingEnabled: true,

      addProfile: ({ name, description, content }) => {
        const newId = `cfg-${Date.now()}`;
        const newProfile: XrayConfigProfile = {
          id: newId,
          name: name.trim() || '自定义配置文件',
          description: description.trim() || '未添加描述',
          content,
          updatedAt: getShanghaiNowString(),
        };
        set((state) => ({
          profiles: [...state.profiles, newProfile],
          selectedProfileId: newId,
        }));
        return newId;
      },

      updateProfile: (id, updates) => {
        const nowStr = getShanghaiNowString();
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: nowStr } : p
          ),
        }));
      },

      deleteProfile: (id) => {
        const state = get();
        if (state.profiles.length <= 1) return; // Don't delete the last profile

        const updatedProfiles = state.profiles.filter((p) => p.id !== id);
        let nextSelected = state.selectedProfileId;
        let nextActive = state.activeProfileId;

        if (state.selectedProfileId === id) {
          nextSelected = updatedProfiles[0].id;
        }
        if (state.activeProfileId === id) {
          nextActive = updatedProfiles[0].id;
        }

        set({
          profiles: updatedProfiles,
          selectedProfileId: nextSelected,
          activeProfileId: nextActive,
        });
      },

      duplicateProfile: (id) => {
        const state = get();
        const target = state.profiles.find((p) => p.id === id);
        if (!target) return id;

        const newId = `cfg-${Date.now()}`;
        const newProfile: XrayConfigProfile = {
          ...target,
          id: newId,
          name: `${target.name} (副本)`,
          isDefault: false,
          updatedAt: getShanghaiNowString(),
        };

        set((state) => ({
          profiles: [...state.profiles, newProfile],
          selectedProfileId: newId,
        }));
        return newId;
      },

      setActiveProfileId: (id) => {
        set({ activeProfileId: id });
        import('./useAppStore').then(({ useAppStore }) => {
          if (useAppStore.getState().coreState.isRunning) {
            get().startActiveKernel();
          }
        });
      },
      setSelectedProfileId: (id) => set({ selectedProfileId: id }),

      updatePorts: (socks, http) => {
        set({ socksPort: socks, httpPort: http });
        import('./useAppStore').then(({ useAppStore }) => {
          const appState = useAppStore.getState();
          if (appState.coreState.isRunning) {
            if (appState.coreState.systemProxy) {
              invoke('set_system_proxy', { enable: true, httpPort: http, socksPort: socks }).catch(() => {});
            }
            get().startActiveKernel();
          }
        });
      },
      setDnsStrategy: (strategy) => set({ dnsStrategy: strategy }),
      toggleFakeDns: () => set((state) => ({ enableFakeDns: !state.enableFakeDns })),
      toggleSniffing: () => set((state) => ({ sniffingEnabled: !state.sniffingEnabled })),
      
      syncNodesAndGroups: (nodes, groups, selectedNodeId, mode) => {
        set((prevState) => ({
          profiles: prevState.profiles.map((p) => ({
            ...p,
            content: syncNodesAndGroupsToConfigJson(p.content, nodes, groups, selectedNodeId, mode),
          })),
        }));
      },

      startActiveKernel: async () => {
        const state = get();
        const activeProfile = state.profiles.find((p) => p.id === state.activeProfileId) || state.profiles[0];
        if (activeProfile && activeProfile.content) {
          try {
            const config = JSON.parse(activeProfile.content);
            // Validate outbounds and routing rules before starting kernel
            const validOutboundTags = new Set(
              (Array.isArray(config.outbounds) ? config.outbounds : [])
                .map((ob: any) => ob.tag)
                .filter(Boolean)
            );
            const validBalancerTags = new Set(
              (Array.isArray(config.routing?.balancers) ? config.routing.balancers : [])
                .map((b: any) => b.tag)
                .filter(Boolean)
            );

            // Find primary proxy node outbound tag, defaulting to first node tag, or 'direct'
            const nodeOutbound = (config.outbounds || []).find(
              (ob: any) => ob.tag !== 'direct' && ob.tag !== 'block' && ob.tag !== 'proxy'
            );
            const primaryProxyTag = nodeOutbound?.tag || 'direct';

            if (config.routing?.rules && Array.isArray(config.routing.rules)) {
              config.routing.rules = config.routing.rules
                .filter((r: any) => r.enabled !== false)
                .map((r: any) => {
                  const updated = { ...r };

                  if (updated.balancerTag && !validBalancerTags.has(updated.balancerTag)) {
                    delete updated.balancerTag;
                    updated.outboundTag = primaryProxyTag;
                  }

                  if (updated.outboundTag) {
                    if (updated.outboundTag === 'proxy') {
                      updated.outboundTag = primaryProxyTag;
                    } else if (
                      !validOutboundTags.has(updated.outboundTag) &&
                      !validBalancerTags.has(updated.outboundTag)
                    ) {
                      updated.outboundTag = primaryProxyTag;
                    }
                  } else if (!updated.balancerTag) {
                    updated.outboundTag = primaryProxyTag;
                  }

                  return updated;
                });
            }

            const tunModeEnabled = useAppStore.getState().coreState.tunMode;

            if (!Array.isArray(config.inbounds)) {
              config.inbounds = [];
            }

            // Sync user settings ports with socks-in and http-in inbounds
            const socksIdx = config.inbounds.findIndex(
              (ib: any) => ib.tag === 'socks-in' || ib.protocol === 'socks'
            );
            if (socksIdx >= 0) {
              config.inbounds[socksIdx].port = state.socksPort;
              config.inbounds[socksIdx].listen = '127.0.0.1';
            } else {
              config.inbounds.unshift({
                tag: 'socks-in',
                port: state.socksPort,
                listen: '127.0.0.1',
                protocol: 'socks',
                settings: { auth: 'noauth', udp: true },
                sniffing: { enabled: true, destOverride: ['http', 'tls', 'quic', 'fakedns'], routeOnly: true },
              });
            }

            const httpIdx = config.inbounds.findIndex(
              (ib: any) => ib.tag === 'http-in' || ib.protocol === 'http'
            );
            if (httpIdx >= 0) {
              config.inbounds[httpIdx].port = state.httpPort;
              config.inbounds[httpIdx].listen = '127.0.0.1';
            } else {
              const insertIdx = socksIdx >= 0 ? socksIdx + 1 : 1;
              config.inbounds.splice(insertIdx, 0, {
                tag: 'http-in',
                port: state.httpPort,
                listen: '127.0.0.1',
                protocol: 'http',
                settings: { timeout: 0 },
                sniffing: { enabled: true, destOverride: ['http', 'tls', 'quic', 'fakedns'], routeOnly: true },
              });
            }

            const existingTunIdx = config.inbounds.findIndex(
              (ib: any) => ib.tag === 'tun-in' || ib.protocol === 'tun'
            );

            const isMac =
              typeof navigator !== 'undefined' &&
              /Mac|iPhone|iPod|iPad/.test(navigator.userAgent || navigator.platform);
            const isWin =
              typeof navigator !== 'undefined' &&
              /Win/.test(navigator.userAgent || navigator.platform);
            const defaultTunName = isMac ? 'utun20' : isWin ? 'wintun' : 'tun0';

            // Preserve or initialize user tun-in settings in active profile
            if (existingTunIdx >= 0) {
              const existingTun = config.inbounds[existingTunIdx];
              let nameVal = existingTun.settings?.name || '';
              if (!nameVal || (isMac && !/^utun\d+$/i.test(nameVal))) {
                nameVal = defaultTunName;
              }
              const existingGw = existingTun.settings?.gateway;
              const hasLegacyGw = Array.isArray(existingGw) && existingGw.some((g: string) => g.includes('10.0.0.1/16'));
              const gatewayVal = (!existingGw || hasLegacyGw)
                ? ['172.18.0.1/30', 'fdfe:dcba:9876::1/126']
                : existingGw;

              config.inbounds[existingTunIdx] = {
                ...existingTun,
                tag: 'tun-in',
                protocol: 'tun',
                settings: {
                  ...existingTun.settings,
                  name: nameVal,
                  gateway: gatewayVal,
                },
                sniffing: {
                  enabled: true,
                  destOverride: ['http', 'tls', 'quic', 'fakedns'],
                  ...existingTun.sniffing,
                  routeOnly: true,
                },
              };
            } else {
              config.inbounds.push({
                tag: 'tun-in',
                protocol: 'tun',
                settings: {
                  name: defaultTunName,
                  desc: 'MXray TUN Adapter',
                  mtu: 1500,
                  gateway: ['172.18.0.1/30', 'fdfe:dcba:9876::1/126'],
                  dns: ['1.1.1.1', '8.8.8.8'],
                  userLevel: 0,
                  autoSystemRoutingTable: ['0.0.0.0/0', '::/0'],
                  autoOutboundsInterface: 'auto',
                },
                sniffing: {
                  enabled: true,
                  destOverride: ['http', 'tls', 'quic', 'fakedns'],
                  routeOnly: true,
                },
              });
            }

            // Save updated config to profile, retaining user custom TUN settings
            const updatedProfileJson = JSON.stringify(config, null, 2);
            set((prevState) => ({
              profiles: prevState.profiles.map((p) =>
                p.id === activeProfile.id ? { ...p, content: updatedProfileJson } : p
              ),
            }));

            // Build runtime config for Xray kernel execution
            const runtimeConfig = JSON.parse(updatedProfileJson);
            if (!tunModeEnabled) {
              runtimeConfig.inbounds = (runtimeConfig.inbounds || []).filter(
                (ib: any) => ib.tag !== 'tun-in' && ib.protocol !== 'tun'
              );
            }

            if (Array.isArray(runtimeConfig.inbounds)) {
              runtimeConfig.inbounds = runtimeConfig.inbounds.map((ib: any) => ({
                ...ib,
                sniffing: {
                  enabled: true,
                  destOverride: ['http', 'tls', 'quic', 'fakedns'],
                  ...(ib.sniffing || {}),
                  routeOnly: true,
                },
              }));
            }

            await invoke('start_kernel', { configJson: JSON.stringify(runtimeConfig, null, 2) });
          } catch {
            // Web / mock environment fallback
          }
        }
      },
    }),
    {
      name: 'mxray-config-profiles-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

