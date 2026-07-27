import { create } from 'zustand';
import type { CoreState, OutboundMode, TrafficStats } from '../types';

interface AppStore {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  coreState: CoreState;
  trafficStats: TrafficStats;
  setMode: (mode: OutboundMode) => void;
  toggleSystemProxy: () => void;
  toggleTunMode: () => void;
  setCoreRunning: (running: boolean) => void;
  updateTraffic: (upload: number, download: number) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),
  coreState: {
    isRunning: true,
    version: 'Xray 1.8.24 (Xray-core)',
    uptime: 3600,
    mode: 'rule',
    systemProxy: false,
    tunMode: false,
    activeNodeId: 'node-vless-reality-1',
  },
  trafficStats: {
    uploadSpeed: 1024 * 42,
    downloadSpeed: 1024 * 380,
    totalUpload: 1024 * 1024 * 145,
    totalDownload: 1024 * 1024 * 1280,
  },
  setMode: (mode) =>
    set((state) => ({
      coreState: { ...state.coreState, mode },
    })),
  toggleSystemProxy: () =>
    set((state) => ({
      coreState: { ...state.coreState, systemProxy: !state.coreState.systemProxy },
    })),
  toggleTunMode: () =>
    set((state) => ({
      coreState: { ...state.coreState, tunMode: !state.coreState.tunMode },
    })),
  setCoreRunning: (running) =>
    set((state) => ({
      coreState: { ...state.coreState, isRunning: running },
    })),
  updateTraffic: (upload, download) =>
    set((state) => ({
      trafficStats: {
        ...state.trafficStats,
        uploadSpeed: upload,
        downloadSpeed: download,
        totalUpload: state.trafficStats.totalUpload + upload,
        totalDownload: state.trafficStats.totalDownload + download,
      },
    })),
}));
