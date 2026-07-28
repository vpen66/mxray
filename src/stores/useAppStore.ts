import { create } from 'zustand';
import type { CoreState, OutboundMode, TrafficStats } from '../types';
import { invoke } from '@tauri-apps/api/core';
import { useConfigStore } from './useConfigStore';

interface AppStore {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  coreState: CoreState;
  trafficStats: TrafficStats;
  isTogglingSystemProxy: boolean;
  isTogglingTunMode: boolean;
  setMode: (mode: OutboundMode) => void;
  toggleSystemProxy: () => Promise<void>;
  checkSystemProxyStatus: () => Promise<void>;
  toggleTunMode: () => Promise<void>;
  setCoreRunning: (running: boolean) => void;
  stopKernel: () => Promise<void>;
  startKernel: () => Promise<void>;
  toggleKernel: () => Promise<void>;
  updateTraffic: (upload: number, download: number) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),
  coreState: {
    isRunning: false,
    version: 'Xray 26.3.27 (Xray-core)',
    uptime: 0,
    mode: 'rule',
    systemProxy: false,
    tunMode: false,
    activeNodeId: '',
  },
  trafficStats: {
    uploadSpeed: 0,
    downloadSpeed: 0,
    totalUpload: 0,
    totalDownload: 0,
  },
  isTogglingSystemProxy: false,
  isTogglingTunMode: false,

  setMode: (mode) =>
    set((state) => ({
      coreState: { ...state.coreState, mode },
    })),
  toggleSystemProxy: async () => {
    if (get().isTogglingSystemProxy) return;
    set({ isTogglingSystemProxy: true });
    const nextState = !get().coreState.systemProxy;
    try {
      if (nextState) {
        // 开启系统代理 -> 同时启动 Xray 内核
        try {
          await useConfigStore.getState().startActiveKernel();
        } catch (e) {
          console.warn('Start kernel warning:', e);
        }
        await invoke('set_system_proxy', {
          enable: true,
          httpPort: 10809,
          socksPort: 10808,
        });
        set((state) => ({
          coreState: { ...state.coreState, systemProxy: true, isRunning: true },
        }));
      } else {
        // 关闭系统代理 -> 同时停止 Xray 内核（清理干净后台进程）
        await invoke('set_system_proxy', {
          enable: false,
          httpPort: 10809,
          socksPort: 10808,
        });
        try {
          await invoke('stop_kernel');
        } catch (e) {
          console.warn('Stop kernel warning:', e);
        }
        set((state) => ({
          coreState: { ...state.coreState, systemProxy: false, isRunning: false },
        }));
      }
    } catch {
      // Fallback for web environment or error handling
      set((state) => ({
        coreState: {
          ...state.coreState,
          systemProxy: nextState,
          isRunning: nextState,
        },
      }));
    } finally {
      set({ isTogglingSystemProxy: false });
    }
  },
  checkSystemProxyStatus: async () => {
    try {
      const status = await invoke<{ enabled: boolean }>('get_system_proxy_status');
      const isKernelRunning = await invoke<boolean>('get_kernel_status').catch(() => false);
      set((state) => ({
        coreState: {
          ...state.coreState,
          systemProxy: status.enabled,
          isRunning: isKernelRunning,
        },
      }));
    } catch {
      // Fallback in web mode
      set((state) => ({
        coreState: { ...state.coreState, systemProxy: false, isRunning: false },
      }));
    }
  },
  toggleTunMode: async () => {
    if (get().isTogglingTunMode) return;
    set({ isTogglingTunMode: true });
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      set((state) => ({
        coreState: { ...state.coreState, tunMode: !state.coreState.tunMode },
      }));
    } finally {
      set({ isTogglingTunMode: false });
    }
  },
  setCoreRunning: (running) =>
    set((state) => ({
      coreState: { ...state.coreState, isRunning: running },
    })),
  stopKernel: async () => {
    try {
      await invoke('set_system_proxy', {
        enable: false,
        httpPort: 10809,
        socksPort: 10808,
      });
      await invoke('stop_kernel');
    } catch {
      // web fallback
    }
    set((state) => ({
      coreState: { ...state.coreState, systemProxy: false, isRunning: false },
    }));
  },
  startKernel: async () => {
    try {
      await useConfigStore.getState().startActiveKernel();
      await invoke('set_system_proxy', {
        enable: true,
        httpPort: 10809,
        socksPort: 10808,
      });
    } catch {
      // web fallback
    }
    set((state) => ({
      coreState: { ...state.coreState, systemProxy: true, isRunning: true },
    }));
  },
  toggleKernel: async () => {
    await get().toggleSystemProxy();
  },
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
