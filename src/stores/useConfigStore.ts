import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { XrayConfigProfile } from '../types';
import { invoke } from '@tauri-apps/api/core';
import { getShanghaiNowString } from '../utils/date';
import { useAppStore } from './useAppStore';
import { migrateEmbeddedEnabledFlags, extractDisabledByKeyList, sortTopLevelKeys } from '../utils/configSectionHelper';

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

// 配置修改后自动重启内核的防抖定时器（避免 Monaco 编辑器逐字输入时频繁重启）
let autoRestartTimer: ReturnType<typeof setTimeout> | null = null;
const AUTO_RESTART_DEBOUNCE_MS = 1500;


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
    content: sortTopLevelKeys(TEMPLATE_DEFAULT),
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

        // 若修改的是当前活动配置且内核正在运行，防抖后自动重启内核以重新加载配置
        if ((updates.content !== undefined || updates.disabled !== undefined) && id === get().activeProfileId) {
          if (autoRestartTimer) {
            clearTimeout(autoRestartTimer);
            autoRestartTimer = null;
          }
          const appState = useAppStore.getState();
          if (appState.coreState.isRunning) {
            autoRestartTimer = setTimeout(async () => {
              autoRestartTimer = null;
              const latest = get().profiles.find((p) => p.id === id);
              // JSON 非法（如编辑器输入中间态）时跳过重启，保留内核继续运行
              if (!latest?.content) return;
              try {
                JSON.parse(latest.content);
              } catch {
                return;
              }
              if (!useAppStore.getState().coreState.isRunning) return;
              try {
                await get().startActiveKernel();
              } catch (err) {
                console.error('配置变更后自动重启内核失败:', err);
                useAppStore.getState().setCoreRunning(false);
              }
            }, AUTO_RESTART_DEBOUNCE_MS);
          }
        }
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
        // 显式启动/重启时取消待执行的防抖自动重启，避免双重重启
        if (autoRestartTimer) {
          clearTimeout(autoRestartTimer);
          autoRestartTimer = null;
        }
        const state = get();
        const activeProfile = state.profiles.find((p) => p.id === state.activeProfileId) || state.profiles[0];
        if (activeProfile && activeProfile.content) {
          // 配置内容本身已是 Xray 官方纯净结构（禁用项已移出内容单独暂存），直接传入内核
          await invoke('start_kernel', { configJson: activeProfile.content });
        }
      },
    }),
    {
      name: 'mxray-config-profiles-storage',
      storage: createJSONStorage(() => localStorage),
      version: 4,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as { profiles?: XrayConfigProfile[] };
        // 从旧版升级：
        // v0 → 将内嵌在 JSON 中的 enabled 标记移出内容为禁用暂存记录
        // v1 → 将禁用标识列表（string[]）升级为含值的暂存记录（条目从内容中移出）
        // v2 → 裸值暂存包装为 { value, index }（位置未知，恢复时追加到末尾）
        // v3 → 顶级键顺序按可视化渲染顺序统一重排
        if (version < 4 && state?.profiles) {
          state.profiles = state.profiles.map((p) => {
            let content = p.content || '';
            let rec: Record<string, any> | undefined = Array.isArray(p.disabled) ? undefined : (p.disabled as any);
            if (version < 3 && Array.isArray(p.disabled)) {
              // v0/v1 遗留：内嵌标记与标识列表 → 提取为暂存记录
              const legacyKeys = p.disabled as string[];
              const emb = migrateEmbeddedEnabledFlags(content);
              content = emb.content;
              rec = emb.disabled;
              if (legacyKeys.length > 0) {
                const ex = extractDisabledByKeyList(content, legacyKeys);
                content = ex.content;
                rec = { ...ex.disabled, ...rec };
              }
            } else if (version < 3 && rec) {
              // v2 遗留：裸值暂存 → 包装为含位置的条目
              const wrapped: Record<string, any> = {};
              for (const [k, v] of Object.entries(rec)) {
                wrapped[k] = v && typeof v === 'object' && !Array.isArray(v) && 'value' in v && 'index' in v
                  ? v
                  : { value: v, index: -1 };
              }
              rec = wrapped;
            }
            // 顶级键顺序与可视化布局对齐（如 log 始终在开头）
            content = sortTopLevelKeys(content);
            return { ...p, content, disabled: rec };
          });
        }
        return state as any;
      },
    }
  )
);

