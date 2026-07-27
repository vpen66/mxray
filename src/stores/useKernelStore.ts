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

  loadInstalledKernels: () => Promise<void>;
  fetchRemoteReleases: () => Promise<void>;
  switchKernel: (kernel: KernelInfo) => void;
  selectCustomPath: (path: string) => Promise<boolean>;
  installRelease: (release: RemoteRelease) => Promise<void>;
  fetchGeoDataInfo: () => Promise<void>;
  updateGeoData: (source?: string) => Promise<void>;
}

const DEFAULT_BUNDLED_KERNEL: KernelInfo = {
  name: 'Xray-core (内置)',
  version: 'v26.3.27',
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
    } catch {
      // Fallback mock releases for web/demo mode
      const mockReleases: RemoteRelease[] = [
        {
          version: 'v26.3.27',
          tag_name: 'v26.3.27',
          name: 'Xray-core v26.3.27',
          published_at: '2026-03-27',
          download_url: 'https://github.com/XTLS/Xray-core/releases/download/v26.3.27/Xray-macos-64.zip',
        },
        {
          version: 'v26.3.0',
          tag_name: 'v26.3.0',
          name: 'Xray-core v26.3.0',
          published_at: '2026-03-01',
          download_url: 'https://github.com/XTLS/Xray-core/releases/download/v26.3.0/Xray-macos-64.zip',
        },
        {
          version: 'v25.1.0',
          tag_name: 'v25.1.0',
          name: 'Xray-core v25.1.0',
          published_at: '2025-01-15',
          download_url: 'https://github.com/XTLS/Xray-core/releases/download/v25.1.0/Xray-macos-64.zip',
        },
      ];
      set({ remoteReleases: mockReleases, isLoadingReleases: false });
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
    } catch {
      // Mock validation in web mode
      const mockCustom: KernelInfo = {
        name: `Xray-core (${path.split('/').pop() || 'custom'})`,
        version: 'v26.3.27 (自定义)',
        path,
        kernel_type: 'custom',
        is_valid: true,
      };
      const installed = get().installedKernels.filter((k) => k.path !== path);
      set({
        installedKernels: [...installed, mockCustom],
        activeKernel: mockCustom,
        error: null,
      });
      return true;
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
    } catch {
      // Mock install in web mode
      setTimeout(() => {
        const mockInstalled: KernelInfo = {
          name: `Xray-core (${release.version})`,
          version: release.version,
          path: `$APP_DATA/cores/xray-${release.version}/xray`,
          kernel_type: 'installed',
          is_valid: true,
        };
        const installed = get().installedKernels.filter((k) => k.version !== release.version);
        set({
          installedKernels: [...installed, mockInstalled],
          activeKernel: mockInstalled,
          isInstalling: false,
          installingVersion: null,
        });
      }, 1000);
    }
  },

  fetchGeoDataInfo: async () => {
    try {
      const status = await invoke<GeoDataStatus>('get_geodata_info');
      set({ geoDataStatus: status });
    } catch {
      // Mock status for web/demo mode
      const nowStr = new Date().toLocaleString('zh-CN');
      set({
        geoDataStatus: {
          geoip: {
            name: 'geoip.dat',
            exists: true,
            size_bytes: 18452104,
            updated_at: nowStr,
          },
          geosite: {
            name: 'geosite.dat',
            exists: true,
            size_bytes: 25140880,
            updated_at: nowStr,
          },
          asset_dir: '$APP_DATA/geodata/',
        },
      });
    }
  },

  updateGeoData: async (source?: string) => {
    set({ isUpdatingGeoData: true, error: null });
    try {
      const status = await invoke<GeoDataStatus>('update_geodata', { source });
      set({ geoDataStatus: status, isUpdatingGeoData: false });
    } catch (e: any) {
      // Fallback mock update in web mode
      await new Promise((r) => setTimeout(r, 1200));
      const nowStr = new Date().toLocaleString('zh-CN');
      set({
        isUpdatingGeoData: false,
        geoDataStatus: {
          geoip: {
            name: 'geoip.dat',
            exists: true,
            size_bytes: 19852044,
            updated_at: nowStr,
          },
          geosite: {
            name: 'geosite.dat',
            exists: true,
            size_bytes: 26410120,
            updated_at: nowStr,
          },
          asset_dir: '$APP_DATA/geodata/',
        },
      });
    }
  },
}));
