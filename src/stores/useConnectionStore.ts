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

export const useConnectionStore = create<ConnectionStore>((set) => ({
  connections: [],
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
        return c;
      }),
    })),

  initConnectionSimulation: () => {
    // No-op simulation: mock data disabled per user request
    return () => {};
  },
}));
