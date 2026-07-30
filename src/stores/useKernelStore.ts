import { create } from 'zustand';
import type { GeoDataStatus, KernelInfo, RemoteRelease } from '../types';
import { invoke } from '@tauri-apps/api/core';

interface KernelStore {
  activeKernel: KernelInfo;
  installedKernels: KernelInfo[];
  remoteReleases: RemoteRelease[];
  isLoadingReleases: boolean;
  isInstalling: boolean;
  installingVersion: string | null;
  error: string | null;

  geoDataStatus: GeoDataStatus | null;
  isUpdatingGeoData: boolean;

  // Standalone No-GUI Kernel Mode Settings
  standaloneKernel: boolean;
  keepKernelAliveOnExit: boolean;
  autoStartKernelDaemon: boolean;

  loadInstalledKernels: () => Promise<void>;
  fetchRemoteReleases: () => Promise<void>;
  switchKernel: (kernel: KernelInfo) => void;
  selectCustomPath: (path: string) => Promise<boolean>;
  installRelease: (release: RemoteRelease) => Promise<void>;
  fetchGeoDataInfo: () => Promise<void>;
  updateGeoData: (source?: string) => Promise<void>;
  toggleStandaloneKernel: () => void;
  toggleKeepKernelAliveOnExit: () => void;
  toggleAutoStartKernelDaemon: () => void;
}

const DEFAULT_BUNDLED_KERNEL: KernelInfo = {
  name: 'Xray-core (内置)',
  version: 'v26.7.28',
  path: 'bundled',
  kernel_type: 'bundled',
  is_valid: true,
};

export const useKernelStore = create<KernelStore>((set, get) => ({
  activeKernel: DEFAULT_BUNDLED_KERNEL,
  installedKernels: [DEFAULT_BUNDLED_KERNEL],
  remoteReleases: [],
  isLoadingReleases: false,
  isInstalling: false,
  installingVersion: null,
  error: null,
  geoDataStatus: null,
  isUpdatingGeoData: false,

  standaloneKernel: false,
  keepKernelAliveOnExit: false,
  autoStartKernelDaemon: false,

  loadInstalledKernels: async () => {
    try {
      const kernels = await invoke<KernelInfo[]>('list_installed_kernels');
      set({ installedKernels: kernels });
    } catch {
      // Fallback in web / dev environment
      set({ installedKernels: [DEFAULT_BUNDLED_KERNEL] });
    }
  },

  fetchRemoteReleases: async () => {
    set({ isLoadingReleases: true, error: null });
    try {
      const releases = await invoke<RemoteRelease[]>('fetch_remote_releases');
      set({ remoteReleases: releases, isLoadingReleases: false });
    } catch (err: any) {
      set({ remoteReleases: [], isLoadingReleases: false, error: err?.toString() || '获取远程发行版本失败' });
    }
  },

  switchKernel: (kernel) => {
    set({ activeKernel: kernel });
  },

  selectCustomPath: async (path: string) => {
    if (!path.trim()) return false;
    try {
      const info = await invoke<KernelInfo>('detect_kernel', { path });
      if (info.is_valid) {
        const customKernel: KernelInfo = {
          ...info,
          name: `Xray-core (自定义路径)`,
          kernel_type: 'custom',
        };
        const installed = get().installedKernels.filter((k) => k.path !== path);
        set({
          installedKernels: [...installed, customKernel],
          activeKernel: customKernel,
          error: null,
        });
        return true;
      } else {
        set({ error: info.error || '无法验证所选路径处的 Xray-core 可执行程序' });
        return false;
      }
    } catch (err: any) {
      set({ error: err?.toString() || '路径校验失败' });
      return false;
    }
  },

  installRelease: async (release: RemoteRelease) => {
    set({ isInstalling: true, installingVersion: release.version, error: null });
    try {
      const newKernel = await invoke<KernelInfo>('install_kernel', {
        version: release.version,
        downloadUrl: release.download_url,
      });
      const installed = get().installedKernels.filter((k) => k.version !== release.version);
      set({
        installedKernels: [...installed, newKernel],
        activeKernel: newKernel,
        isInstalling: false,
        installingVersion: null,
      });
    } catch (err: any) {
      set({ isInstalling: false, installingVersion: null, error: err?.toString() || '安装内核失败' });
    }
  },

  fetchGeoDataInfo: async () => {
    try {
      const status = await invoke<GeoDataStatus>('get_geodata_info');
      set({ geoDataStatus: status });
    } catch (err: any) {
      set({ geoDataStatus: null, error: err?.toString() || '无法获取 GeoData 信息' });
    }
  },

  updateGeoData: async (source?: string) => {
    set({ isUpdatingGeoData: true, error: null });
    try {
      const status = await invoke<GeoDataStatus>('update_geodata', { source });
      set({ geoDataStatus: status, isUpdatingGeoData: false });
    } catch (err: any) {
      set({ isUpdatingGeoData: false, error: err?.toString() || '更新 GeoData 失败' });
    }
  },

  toggleStandaloneKernel: () =>
    set((state) => ({ standaloneKernel: !state.standaloneKernel })),
  toggleKeepKernelAliveOnExit: () =>
    set((state) => ({ keepKernelAliveOnExit: !state.keepKernelAliveOnExit })),
  toggleAutoStartKernelDaemon: () =>
    set((state) => ({ autoStartKernelDaemon: !state.autoStartKernelDaemon })),
}));
