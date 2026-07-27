import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { XrayConfigProfile } from '../types';
import { syncNodesAndGroupsToConfigJson } from '../utils/xrayMapper';

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
  syncNodesAndGroups: (nodes: any[], groups: any[], selectedNodeId?: string) => void;
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
      "port": 10808,
      "listen": "127.0.0.1",
      "protocol": "socks",
      "settings": {
        "auth": "noauth",
        "udp": true
      },
      "sniffing": {
        "enabled": true,
        "destOverride": ["http", "tls", "quic", "fakedns"]
      }
    },
    {
      "tag": "http-in",
      "port": 10809,
      "listen": "127.0.0.1",
      "protocol": "http",
      "settings": {
        "timeout": 0
      }
    }
  ],
  "outbounds": [
    {
      "tag": "proxy",
      "protocol": "vless",
      "settings": {
        "vnext": [
          {
            "address": "example.com",
            "port": 443,
            "users": [
              {
                "id": "00000000-0000-0000-0000-000000000000",
                "encryption": "none",
                "flow": "xtls-rprx-vision"
              }
            ]
          }
        ]
      },
      "streamSettings": {
        "network": "tcp",
        "security": "reality",
        "realitySettings": {
          "show": false,
          "fingerprint": "chrome",
          "serverName": "www.apple.com",
          "publicKey": "11223344556677889900aabbccddeeff11223344556",
          "shortId": "12345678",
          "spiderX": "/"
        }
      }
    },
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
      "port": 10808,
      "listen": "127.0.0.1",
      "protocol": "socks",
      "settings": {
        "auth": "noauth",
        "udp": true
      }
    },
    {
      "tag": "tun-in",
      "protocol": "dokodemo-door",
      "settings": {
        "network": "tcp,udp",
        "followRedirect": true
      },
      "streamSettings": {
        "sockopt": {
          "tproxy": "tproxy"
        }
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
      "tag": "proxy",
      "protocol": "freedom"
    },
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
        "outboundTag": "proxy",
        "inboundTag": ["tun-in"]
      },
      {
        "type": "field",
        "outboundTag": "direct",
        "domain": ["geosite:cn", "geosite:private"]
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
      "port": 10808,
      "listen": "127.0.0.1",
      "protocol": "socks",
      "settings": {
        "auth": "noauth",
        "udp": true
      },
      "sniffing": {
        "enabled": true,
        "destOverride": ["http", "tls", "quic"]
      }
    }
  ],
  "outbounds": [
    {
      "tag": "proxy",
      "protocol": "freedom"
    },
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
    description: '标准 SOCKS5 (10808) / HTTP (10809) 入站与 CN / OpenAI / Telegram 分流规则',
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
      socksPort: 10808,
      httpPort: 10809,
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
          updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        };
        set((state) => ({
          profiles: [...state.profiles, newProfile],
          selectedProfileId: newId,
        }));
        return newId;
      },

      updateProfile: (id, updates) => {
        const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
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
          updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        };

        set((state) => ({
          profiles: [...state.profiles, newProfile],
          selectedProfileId: newId,
        }));
        return newId;
      },

      setActiveProfileId: (id) => set({ activeProfileId: id }),
      setSelectedProfileId: (id) => set({ selectedProfileId: id }),

      updatePorts: (socks, http) => set({ socksPort: socks, httpPort: http }),
      setDnsStrategy: (strategy) => set({ dnsStrategy: strategy }),
      toggleFakeDns: () => set((state) => ({ enableFakeDns: !state.enableFakeDns })),
      toggleSniffing: () => set((state) => ({ sniffingEnabled: !state.sniffingEnabled })),
      
      syncNodesAndGroups: (nodes, groups, selectedNodeId) => {
        const state = get();
        const activeId = state.selectedProfileId || state.activeProfileId;
        const currentProfile = state.profiles.find((p) => p.id === activeId) || state.profiles[0];
        if (!currentProfile) return;

        const updatedContent = syncNodesAndGroupsToConfigJson(
          currentProfile.content,
          nodes,
          groups,
          selectedNodeId
        );
        state.updateProfile(currentProfile.id, { content: updatedContent });
      },
    }),
    {
      name: 'mxray-config-profiles-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

