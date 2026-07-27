import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Profile, ProxyNode } from '../types';

interface ProxyStore {
  profiles: Profile[];
  selectedNodeId: string;
  isTestingLatency: boolean;
  selectNode: (nodeId: string) => void;
  testNodeLatency: (nodeId: string) => Promise<void>;
  testAllLatencies: () => Promise<void>;
  addProfile: (profile: Profile) => void;
  removeProfile: (profileId: string) => void;
  updateProfile: (profile: Profile) => void;
}

const INITIAL_NODES: ProxyNode[] = [
  {
    id: 'node-vless-reality-1',
    name: '美国 01 | VLESS-REALITY-Vision',
    protocol: 'vless',
    server: 'us01.mxray.net',
    port: 443,
    uuid: 'a3e56226-5c08-4747-97fa-da3e2006ac6b',
    flow: 'xtls-rprx-vision',
    security: 'reality',
    sni: 'dl.google.com',
    publicKey: '7bXqR_8m2N3kL9pW4vJ6Y1zA0cE5tF8g',
    shortId: '6ba7b810',
    delay: 142,
    profileId: 'prof-1',
  },
  {
    id: 'node-vless-reality-2',
    name: '日本 01 | VLESS-REALITY-gRPC',
    protocol: 'vless',
    server: 'jp01.mxray.net',
    port: 443,
    uuid: 'a3e56226-5c08-4747-97fa-da3e2006ac6b',
    security: 'reality',
    sni: 'www.microsoft.com',
    network: 'grpc',
    serviceName: 'xray-grpc',
    publicKey: '9mK3vJ6Y1zA0cE5tF8g7bXqR_8m2N3kL',
    delay: 48,
    profileId: 'prof-1',
  },
  {
    id: 'node-hy2-1',
    name: '香港 01 | Hysteria2 高速专线',
    protocol: 'hysteria2',
    server: 'hk01.mxray.net',
    port: 8443,
    password: 'mxray-hy2-pass',
    sni: 'hk01.mxray.net',
    delay: 28,
    profileId: 'prof-1',
  },
  {
    id: 'node-vmess-ws-1',
    name: '新加坡 01 | VMess-WS-TLS',
    protocol: 'vmess',
    server: 'sg01.mxray.net',
    port: 443,
    uuid: 'e2b3c4d5-6e7f-8a9b-0c1d-2e3f4a5b6c7d',
    security: 'tls',
    sni: 'sg01.mxray.net',
    network: 'ws',
    path: '/vmessws',
    delay: 65,
    profileId: 'prof-1',
  },
  {
    id: 'node-trojan-1',
    name: '德国 01 | Trojan-TLS',
    protocol: 'trojan',
    server: 'de01.mxray.net',
    port: 443,
    password: 'trojan-password-123',
    security: 'tls',
    sni: 'de01.mxray.net',
    delay: 185,
    profileId: 'prof-2',
  },
];

const INITIAL_PROFILES: Profile[] = [
  {
    id: 'prof-1',
    name: 'Premium 核心订阅',
    url: 'https://sub.mxray.net/api/v1/sub?token=demo',
    type: 'remote',
    updatedAt: Date.now() - 3600000 * 2,
    nodeCount: 4,
    nodes: INITIAL_NODES.filter((n) => n.profileId === 'prof-1'),
    autoUpdate: true,
    updateInterval: 12,
  },
  {
    id: 'prof-2',
    name: '本地备用配置 (Clash/JSON 导入)',
    type: 'local',
    updatedAt: Date.now() - 3600000 * 24,
    nodeCount: 1,
    nodes: INITIAL_NODES.filter((n) => n.profileId === 'prof-2'),
    autoUpdate: false,
    updateInterval: 0,
  },
];

export const useProxyStore = create<ProxyStore>()(
  persist(
    (set, get) => ({
      profiles: INITIAL_PROFILES,
      selectedNodeId: 'node-vless-reality-2',
      isTestingLatency: false,

      selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

      testNodeLatency: async (nodeId) => {
        await new Promise((res) => setTimeout(res, 300 + Math.random() * 400));
        const randomLatency = Math.floor(20 + Math.random() * 150);

        set((state) => ({
          profiles: state.profiles.map((profile) => ({
            ...profile,
            nodes: profile.nodes.map((node) =>
              node.id === nodeId ? { ...node, delay: randomLatency } : node
            ),
          })),
        }));
      },

      testAllLatencies: async () => {
        set({ isTestingLatency: true });
        const allNodeIds = get()
          .profiles.flatMap((p) => p.nodes)
          .map((n) => n.id);

        for (const id of allNodeIds) {
          await get().testNodeLatency(id);
        }
        set({ isTestingLatency: false });
      },

      addProfile: (profile) =>
        set((state) => ({
          profiles: [...state.profiles, profile],
        })),

      removeProfile: (profileId) =>
        set((state) => ({
          profiles: state.profiles.filter((p) => p.id !== profileId),
        })),

      updateProfile: (updated) =>
        set((state) => ({
          profiles: state.profiles.map((p) => (p.id === updated.id ? updated : p)),
        })),
    }),
    {
      name: 'mxray-proxy-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        profiles: state.profiles,
        selectedNodeId: state.selectedNodeId,
      }),
    }
  )
);

