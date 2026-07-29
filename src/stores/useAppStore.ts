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
  autoStartApp: boolean;
  isTogglingAutoStart: boolean;
  isTunModalOpen: boolean;
  openTunModal: () => void;
  closeTunModal: () => void;
  setMode: (mode: OutboundMode) => void;
  toggleSystemProxy: () => Promise<void>;
  checkSystemProxyStatus: () => Promise<void>;
  toggleTunMode: () => Promise<void>;
  toggleAutoStartApp: () => Promise<void>;
  checkAutoStartStatus: () => Promise<void>;
  setCoreRunning: (running: boolean) => void;
  stopKernel: () => Promise<void>;
  startKernel: () => Promise<void>;
  toggleKernel: () => Promise<void>;
  updateTraffic: (upload: number, download: number) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),
  isTunModalOpen: false,
  openTunModal: () => set({ isTunModalOpen: true }),
  closeTunModal: () => set({ isTunModalOpen: false }),
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
  autoStartApp: false,
  isTogglingAutoStart: false,

  checkAutoStartStatus: async () => {
    try {
      const { isEnabled } = await import('@tauri-apps/plugin-autostart');
      const enabled = await isEnabled();
      set({ autoStartApp: enabled });
    } catch {
      // Web fallback
    }
  },

  toggleAutoStartApp: async () => {
    if (get().isTogglingAutoStart) return;
    set({ isTogglingAutoStart: true });
    try {
      const { enable, disable, isEnabled } = await import('@tauri-apps/plugin-autostart');
      const currentlyEnabled = await isEnabled();
      if (currentlyEnabled) {
        await disable();
        set({ autoStartApp: false });
      } else {
        await enable();
        set({ autoStartApp: true });
      }
    } catch (e) {
      console.warn('Toggle autostart warning:', e);
      set((state) => ({ autoStartApp: !state.autoStartApp }));
    } finally {
      set({ isTogglingAutoStart: false });
    }
  },

  setMode: async (mode) => {
    set((state) => ({
      coreState: { ...state.coreState, mode },
    }));

    try {
      const { useProxyStore } = await import('./useProxyStore');
      const { useConfigStore } = await import('./useConfigStore');

      const proxyState = useProxyStore.getState();
      const allNodes = proxyState.profiles.flatMap((p) => p.nodes);

      useConfigStore.getState().syncNodesAndGroups(
        allNodes,
        proxyState.proxyGroups,
        proxyState.selectedNodeId,
        mode
      );

      if (get().coreState.isRunning) {
        await useConfigStore.getState().startActiveKernel();
      }
    } catch (e) {
      console.warn('Set mode sync warning:', e);
    }
  },
  toggleSystemProxy: async () => {
    if (get().isTogglingSystemProxy) return;
    set({ isTogglingSystemProxy: true });
    const nextState = !get().coreState.systemProxy;
    const { httpPort, socksPort } = useConfigStore.getState();
    const minDelay = new Promise((resolve) => setTimeout(resolve, 450));

    const performToggle = async () => {
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
            httpPort,
            socksPort,
          });
          set((state) => ({
            coreState: { ...state.coreState, systemProxy: true, isRunning: true },
          }));
        } else {
          // 关闭系统代理 -> 同时停止 Xray 内核（清理干净后台进程）
          await invoke('set_system_proxy', {
            enable: false,
            httpPort,
            socksPort,
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
      }
    };

    try {
      await Promise.all([performToggle(), minDelay]);
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
    const minDelay = new Promise((resolve) => setTimeout(resolve, 450));
    try {
      await minDelay;
      const nextTunMode = !get().coreState.tunMode;
      set((state) => ({
        coreState: { ...state.coreState, tunMode: nextTunMode },
      }));
      if (get().coreState.isRunning) {
        await useConfigStore.getState().startActiveKernel();
      }
    } catch (err) {
      console.error('切换 TUN 模式失败:', err);
    } finally {
      set({ isTogglingTunMode: false });
    }
  },
  setCoreRunning: (running) =>
    set((state) => ({
      coreState: { ...state.coreState, isRunning: running },
    })),
  stopKernel: async () => {
    const { httpPort, socksPort } = useConfigStore.getState();
    try {
      await invoke('set_system_proxy', {
        enable: false,
        httpPort,
        socksPort,
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
    const { httpPort, socksPort } = useConfigStore.getState();
    try {
      await useConfigStore.getState().startActiveKernel();
      await invoke('set_system_proxy', {
        enable: true,
        httpPort,
        socksPort,
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
