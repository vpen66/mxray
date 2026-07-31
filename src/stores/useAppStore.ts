import { create } from 'zustand';
import type { CoreState } from '../types';
import { invoke } from '@tauri-apps/api/core';
import { useConfigStore } from './useConfigStore';

interface AppStore {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isLeftPanelOpen: boolean;
  toggleLeftPanel: () => void;
  coreState: CoreState;
  isTogglingSystemProxy: boolean;
  isTogglingTunMode: boolean;
  autoStartApp: boolean;
  isTogglingAutoStart: boolean;
  isTunModalOpen: boolean;
  openTunModal: () => void;
  closeTunModal: () => void;
  toggleSystemProxy: () => Promise<void>;
  checkSystemProxyStatus: () => Promise<void>;
  toggleTunMode: () => Promise<void>;
  toggleAutoStartApp: () => Promise<void>;
  checkAutoStartStatus: () => Promise<void>;
  setCoreRunning: (running: boolean) => void;
  stopKernel: () => Promise<void>;
  startKernel: () => Promise<void>;
  toggleKernel: () => Promise<void>;
}

export const useAppStore = create<AppStore>((set, get) => ({
  activeTab: 'json-config',
  setActiveTab: (tab) => set({ activeTab: tab }),
  isLeftPanelOpen: false,
  toggleLeftPanel: () => set((state) => ({ isLeftPanelOpen: !state.isLeftPanelOpen })),
  isTunModalOpen: false,
  openTunModal: () => set({ isTunModalOpen: true }),
  closeTunModal: () => set({ isTunModalOpen: false }),
  coreState: {
    isRunning: false,
    version: 'Xray 26.3.27 (Xray-core)',
    uptime: 0,
    systemProxy: false,
    tunMode: false,
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

  toggleSystemProxy: async () => {
    if (get().isTogglingSystemProxy) return;
    set({ isTogglingSystemProxy: true });
    const nextState = !get().coreState.systemProxy;
    const minDelay = new Promise((resolve) => setTimeout(resolve, 450));

    try {
      const { httpPort, socksPort } = useConfigStore.getState();
      await invoke('set_system_proxy', {
        enable: nextState,
        httpPort,
        socksPort,
      });
      set((state) => ({
        coreState: { ...state.coreState, systemProxy: nextState },
      }));
    } catch {
      set((state) => ({
        coreState: { ...state.coreState, systemProxy: nextState },
      }));
    } finally {
      await minDelay;
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
      const nextTunMode = !get().coreState.tunMode;
      set((state) => ({
        coreState: { ...state.coreState, tunMode: nextTunMode },
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
      await invoke('stop_kernel');
    } catch {
      // web fallback
    }
    set((state) => ({
      coreState: { ...state.coreState, isRunning: false },
    }));
  },
  startKernel: async () => {
    try {
      await useConfigStore.getState().startActiveKernel();
    } catch {
      // web fallback
    }
    set((state) => ({
      coreState: { ...state.coreState, isRunning: true },
    }));
  },
  toggleKernel: async () => {
    const isRunning = get().coreState.isRunning;
    if (isRunning) {
      await get().stopKernel();
    } else {
      await get().startKernel();
    }
  },
}));
