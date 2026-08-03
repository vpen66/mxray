import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { XrayConfigProfile } from '../types';
import { invoke } from '@tauri-apps/api/core';
import { getShanghaiNowString } from '../utils/date';
import { useAppStore } from './useAppStore';
import { stripDisabledRoutingRules } from '../utils/configSectionHelper';

interface ConfigStore {
  profiles: XrayConfigProfile[];
  activeProfileId: string;
  selectedProfileId: string;
  socksPort: number;
  httpPort: number;
  dnsStrategy: string;
  
  // Actions
  addProfile: (data: { name: string; description: string; content: string }) => string;
  updateProfile: (id: string, updates: Partial<Omit<XrayConfigProfile, 'id'>>) => void;
  deleteProfile: (id: string) => void;
  duplicateProfile: (id: string) => string;
  setActiveProfileId: (id: string) => void;
  setSelectedProfileId: (id: string) => void;
  updatePorts: (socks: number, http: number) => void;
  setDnsStrategy: (strategy: string) => void;
  startActiveKernel: () => Promise<void>;
}


export const TEMPLATE_DEFAULT = `{
  "log": {
    "loglevel": "info"
  },
  "dns": {
    "hosts": {
      "domain:googleapis.cn": "googleapis.com",
      "full:localhost.weixin.qq.com": "127.0.0.1"
    },
    "servers": [
      {
        "address": "223.5.5.5",
        "port": 53,
        "domains": [
          "geosite:cn"
        ],
        "expectIPs": [
          "geoip:cn",
          "geoip:private"
        ],
        "skipFallback": true,
        "tag": "dns-direct"
      },
      {
        "address": "https://1.1.1.1/dns-query",
        "domains": [
          "geosite:geolocation-!cn"
        ],
        "tag": "dns-proxy"
      }
    ],
    "queryStrategy": "UseIPv4",
    "disableCache": false,
    "disableFallback": false,
    "disableFallbackIfMatch": true,
    "enableParallelQuery": false,
    "useSystemHosts": true
  },
  "inbounds": [
    {
      "tag": "tun-in",
      "protocol": "tun",
      "settings": {
        "name": "utun20",
        "mtu": 1500,
        "gateway": [
          "169.254.10.1/30"
        ],
        "userLevel": 0,
        "autoSystemRoutingTable": [
          "0.0.0.0/0"
        ],
        "autoOutboundsInterface": "auto"
      },
      "sniffing": {
        "enabled": true,
        "destOverride": [
          "http",
          "tls",
          "quic"
        ],
        "routeOnly": false
      }
    },
    {
      "tag": "mixed-in",
      "listen": "127.0.0.1",
      "port": 7890,
      "protocol": "mixed",
      "settings": {
        "auth": "noauth",
        "udp": true
      },
      "sniffing": {
        "enabled": true,
        "destOverride": [
          "http",
          "tls",
          "quic"
        ],
        "routeOnly": true
      }
    }
  ],
  "outbounds": [
    {
      "tag": "direct",
      "protocol": "freedom",
      "settings": {
        "domainStrategy": "UseIP"
      }
    },
    {
      "tag": "dns-out",
      "protocol": "dns",
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
    "domainMatcher": "mph",
    "rules": [
      {
        "type": "field",
        "inboundTag": [
          "dns-direct"
        ],
        "outboundTag": "direct"
      },
      {
        "type": "field",
        "inboundTag": [
          "tun-in"
        ],
        "network": "tcp,udp",
        "port": "53",
        "outboundTag": "dns-out"
      },
      {
        "type": "field",
        "domain": [
          "geosite:category-ads-all"
        ],
        "outboundTag": "block"
      },
      {
        "type": "field",
        "ip": [
          "geoip:private"
        ],
        "outboundTag": "direct"
      },
      {
        "type": "field",
        "domain": [
          "geosite:private",
          "geosite:cn"
        ],
        "outboundTag": "direct"
      },
      {
        "type": "field",
        "ip": [
          "geoip:cn"
        ],
        "outboundTag": "direct"
      }
    ]
  },
  "policy": {
    "levels": {
      "0": {
        "handshake": 4,
        "connIdle": 300,
        "uplinkOnly": 2,
        "downlinkOnly": 5
      }
    },
    "system": {
      "statsInboundUplink": false,
      "statsInboundDownlink": false,
      "statsOutboundUplink": false,
      "statsOutboundDownlink": false
    }
  }
}`;

const INITIAL_PROFILES: XrayConfigProfile[] = [
  {
    id: 'cfg-default',
    name: '默认配置',
    description: 'TUN 透明代理 + Mixed 混合入站，国内外分流',
    content: TEMPLATE_DEFAULT,
    updatedAt: '2026-07-31 00:00',
    isDefault: true,
  },
];

export const useConfigStore = create<ConfigStore>()(
  persist(
    (set, get) => ({
      profiles: INITIAL_PROFILES,
      activeProfileId: 'cfg-default',
      selectedProfileId: 'cfg-default',
      socksPort: 7890,
      httpPort: 7891,
      dnsStrategy: 'IPIfNonMatch',

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
        if (useAppStore.getState().coreState.isRunning) {
          get().startActiveKernel();
        }
      },
      setSelectedProfileId: (id) => set({ selectedProfileId: id }),

      updatePorts: (socks, http) => {
        set({ socksPort: socks, httpPort: http });
        const appState = useAppStore.getState();
        if (appState.coreState.isRunning && appState.coreState.systemProxy) {
          invoke('set_system_proxy', { enable: true, httpPort: http, socksPort: socks }).catch(() => {});
        }
      },
      setDnsStrategy: (strategy) => set({ dnsStrategy: strategy }),

      startActiveKernel: async () => {
        const state = get();
        const activeProfile = state.profiles.find((p) => p.id === state.activeProfileId) || state.profiles[0];
        if (activeProfile && activeProfile.content) {
          // Build runtime config: only filter out disabled routing rules
          // (Xray doesn't understand the `enabled` field, so we must strip disabled rules).
          // 在原始文本层面过滤，避免 JSON.parse/stringify 打乱字段顺序
          const runtimeConfigJson = stripDisabledRoutingRules(activeProfile.content);

          await invoke('start_kernel', { configJson: runtimeConfigJson });
        }
      },
    }),
    {
      name: 'mxray-config-profiles-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

