import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { XrayConfigProfile } from '../types';
import { invoke } from '@tauri-apps/api/core';
import { getShanghaiNowString } from '../utils/date';
import { useAppStore } from './useAppStore';

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
  startActiveKernel: () => Promise<void>;
}


const INITIAL_PROFILES: XrayConfigProfile[] = [];

export const useConfigStore = create<ConfigStore>()(
  persist(
    (set, get) => ({
      profiles: INITIAL_PROFILES,
      activeProfileId: '',
      selectedProfileId: '',
      socksPort: 7890,
      httpPort: 7891,
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
      toggleFakeDns: () => set((state) => ({ enableFakeDns: !state.enableFakeDns })),
      toggleSniffing: () => set((state) => ({ sniffingEnabled: !state.sniffingEnabled })),

      startActiveKernel: async () => {
        const state = get();
        const activeProfile = state.profiles.find((p) => p.id === state.activeProfileId) || state.profiles[0];
        if (activeProfile && activeProfile.content) {
          try {
            const config = JSON.parse(activeProfile.content);

            // Build runtime config: only filter out disabled routing rules
            // (Xray doesn't understand the `enabled` field, so we must strip disabled rules)
            const runtimeConfig = { ...config };
            if (runtimeConfig.routing?.rules && Array.isArray(runtimeConfig.routing.rules)) {
              runtimeConfig.routing = {
                ...runtimeConfig.routing,
                rules: runtimeConfig.routing.rules.filter((r: any) => r.enabled !== false),
              };
            }

            await invoke('start_kernel', { configJson: JSON.stringify(runtimeConfig, null, 2) });
          } catch {
            // Web / mock environment fallback
          }
        }
      },
    }),
    {
      name: 'mxray-config-profiles-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

