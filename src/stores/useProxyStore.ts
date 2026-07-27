import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Profile, ProxyGroup, ProxyNode } from '../types';
import { useConfigStore } from './useConfigStore';

function triggerConfigSync(get: () => ProxyStore) {
  setTimeout(() => {
    const state = get();
    const allNodes = state.profiles.flatMap((p) => p.nodes);
    useConfigStore.getState().syncNodesAndGroups(allNodes, state.proxyGroups);
  }, 0);
}

interface ProxyStore {
  profiles: Profile[];
  selectedNodeId: string;
  proxyGroups: ProxyGroup[];
  isTestingLatency: boolean;
  selectNode: (nodeId: string) => void;
  selectGroupNode: (groupId: string, nodeIdOrTag: string) => void;
  testNodeLatency: (nodeId: string) => Promise<void>;
  testAllLatencies: () => Promise<void>;
  addProfile: (profile: Profile) => void;
  removeProfile: (profileId: string) => void;
  updateProfile: (profile: Profile) => void;
  addGroup: (group: ProxyGroup) => void;
  removeGroup: (groupId: string) => void;
  updateGroup: (group: ProxyGroup) => void;
}

export const getMatchingNodesForGroup = (group: ProxyGroup, allNodes: ProxyNode[]): ProxyNode[] => {
  if (group.useFilter && group.filter && group.filter.trim() !== '') {
    try {
      const regex = new RegExp(group.filter, 'i');
      return allNodes.filter((node) => regex.test(node.name) || regex.test(node.server));
    } catch {
      const keyword = group.filter.toLowerCase();
      return allNodes.filter((node) => node.name.toLowerCase().includes(keyword) || node.server.toLowerCase().includes(keyword));
    }
  }

  if (group.nodeIds && group.nodeIds.length > 0) {
    const set = new Set(group.nodeIds);
    return allNodes.filter((node) => set.has(node.id));
  }

  return allNodes;
};

const LEGACY_HARDCODED_NAMES = new Set([
  '国际流量',
  '国内流量',
  'OpenAI',
  'Telegram',
  '国际媒体',
  '国内媒体',
  '苹果流量',
  '其他流量',
]);

const LEGACY_HARDCODED_IDS = new Set([
  'group-global',
  'group-cn',
  'group-openai',
  'group-telegram',
  'group-media',
  'group-cn-media',
  'group-apple',
  'group-others',
]);

const INITIAL_GROUPS: ProxyGroup[] = [];

const INITIAL_PROFILES: Profile[] = [];

export const useProxyStore = create<ProxyStore>()(
  persist(
    (set, get) => ({
      profiles: INITIAL_PROFILES,
      selectedNodeId: '',
      proxyGroups: INITIAL_GROUPS,
      isTestingLatency: false,

      selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

      selectGroupNode: (groupId, nodeIdOrTag) =>
        set((state) => ({
          proxyGroups: state.proxyGroups.map((g) =>
            g.id === groupId ? { ...g, selectedNodeId: nodeIdOrTag } : g
          ),
        })),

      testNodeLatency: async (nodeId) => {
        await new Promise((res) => setTimeout(res, 200 + Math.random() * 300));
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

      addProfile: (profile) => {
        set((state) => ({
          profiles: [...state.profiles, profile],
        }));
        triggerConfigSync(get);
      },

      removeProfile: (profileId) => {
        set((state) => {
          const updatedProfiles = state.profiles.filter((p) => p.id !== profileId);
          const remainingNodes = updatedProfiles.flatMap((p) => p.nodes);
          const remainingNodeIds = new Set(remainingNodes.map((n) => n.id));

          const updatedGroups = state.proxyGroups.map((g) => {
            const sid = g.selectedNodeId;
            if (
              sid &&
              sid !== 'DIRECT' &&
              sid !== 'BLOCK' &&
              sid !== 'REJECT' &&
              !state.proxyGroups.some((otherG) => otherG.id === sid) &&
              !remainingNodeIds.has(sid)
            ) {
              const matched = getMatchingNodesForGroup(g, remainingNodes);
              return {
                ...g,
                selectedNodeId: matched.length > 0 ? matched[0].id : 'DIRECT',
              };
            }
            return g;
          });

          let nextSelectedNodeId = state.selectedNodeId;
          if (!remainingNodeIds.has(state.selectedNodeId)) {
            nextSelectedNodeId = remainingNodes.length > 0 ? remainingNodes[0].id : '';
          }

          return {
            profiles: updatedProfiles,
            proxyGroups: updatedGroups,
            selectedNodeId: nextSelectedNodeId,
          };
        });
        triggerConfigSync(get);
      },

      updateProfile: (updated) => {
        set((state) => ({
          profiles: state.profiles.map((p) => (p.id === updated.id ? updated : p)),
        }));
        triggerConfigSync(get);
      },

      addGroup: (group) => {
        set((state) => ({
          proxyGroups: [...state.proxyGroups, group],
        }));
        triggerConfigSync(get);
      },

      removeGroup: (groupId) => {
        set((state) => ({
          proxyGroups: state.proxyGroups.filter((g) => g.id !== groupId),
        }));
        triggerConfigSync(get);
      },

      updateGroup: (updated) => {
        set((state) => ({
          proxyGroups: state.proxyGroups.map((g) => (g.id === updated.id ? updated : g)),
        }));
        triggerConfigSync(get);
      },
    }),
    {
      name: 'mxray-proxy-store',
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState: any, currentState: ProxyStore) => {
        const pState = (persistedState as Partial<ProxyStore>) || {};
        const cleanGroups = (pState.proxyGroups || []).filter(
          (g) => !LEGACY_HARDCODED_NAMES.has(g.name) && !LEGACY_HARDCODED_IDS.has(g.id)
        );
        return {
          ...currentState,
          ...pState,
          proxyGroups: cleanGroups,
        };
      },
      partialize: (state) => ({
        profiles: state.profiles,
        selectedNodeId: state.selectedNodeId,
        proxyGroups: state.proxyGroups.filter(
          (g) => !LEGACY_HARDCODED_NAMES.has(g.name) && !LEGACY_HARDCODED_IDS.has(g.id)
        ),
      }),
    }
  )
);
