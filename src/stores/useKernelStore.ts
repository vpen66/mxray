import { create } from 'zustand';
import type { KernelInfo, RemoteRelease } from '../types';
import { invoke } from '@tauri-apps/api/core';

interface KernelStore {
  activeKernel: KernelInfo;
  installedKernels: KernelInfo[];
  remoteReleases: RemoteRelease[];
  isLoadingReleases: boolean;
  isLoadingKernels: boolean;
  isInstalling: boolean;
  installingVersion: string | null;
  error: string | null;

  // Standalone No-GUI Kernel Mode Settings
  standaloneKernel: boolean;
  keepKernelAliveOnExit: boolean;
  autoStartKernelDaemon: boolean;

  loadInstalledKernels: () => Promise<void>;
  fetchRemoteReleases: () => Promise<void>;
  switchKernel: (kernel: KernelInfo) => void;
  selectCustomPath: (path: string) => Promise<boolean>;
  installRelease: (release: RemoteRelease) => Promise<void>;
  toggleStandaloneKernel: () => void;
  toggleKeepKernelAliveOnExit: () => Promise<void>;
  syncKeepKernelAliveOnExit: () => Promise<void>;
  toggleAutoStartKernelDaemon: () => void;
}

const DEFAULT_BUNDLED_KERNEL: KernelInfo = {
  name: 'Xray-core (内置)',
  version: 'Xray',
  path: 'bundled',
  kernel_type: 'bundled',
  is_valid: true,
};

const KEEP_ALIVE_STORAGE_KEY = 'mxray.keepKernelAliveOnExit';

export const useKernelStore = create<KernelStore>((set, get) => ({
  activeKernel: DEFAULT_BUNDLED_KERNEL,
  installedKernels: [],
  remoteReleases: [],
  isLoadingReleases: false,
  isLoadingKernels: false,
  isInstalling: false,
  installingVersion: null,
  error: null,

  standaloneKernel: false,
  keepKernelAliveOnExit: false,
  autoStartKernelDaemon: false,

  loadInstalledKernels: async () => {
    set({ isLoadingKernels: true });
    try {
      const kernels = await invoke<KernelInfo[]>('list_installed_kernels');
      // 将 activeKernel 同步为列表中第一个有效内核（获取真实版本号）
      const currentActive = get().activeKernel;
      const matched = kernels.find((k) => k.path === currentActive.path) || kernels[0];
      set({ installedKernels: kernels, activeKernel: matched || currentActive, isLoadingKernels: false });
    } catch {
      // Fallback in web / dev environment
      set({ installedKernels: [DEFAULT_BUNDLED_KERNEL], activeKernel: DEFAULT_BUNDLED_KERNEL, isLoadingKernels: false });
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

  toggleStandaloneKernel: () =>
    set((state) => ({ standaloneKernel: !state.standaloneKernel })),

  // 切换“退出时保持内核后台运行”：同时写入 localStorage 与 Rust 后端持久化
  toggleKeepKernelAliveOnExit: async () => {
    const next = !get().keepKernelAliveOnExit;
    set({ keepKernelAliveOnExit: next });
    try {
      localStorage.setItem(KEEP_ALIVE_STORAGE_KEY, next ? 'true' : 'false');
    } catch {
      // localStorage 不可用时忽略（Web 环境）
    }
    try {
      await invoke('set_keep_kernel_alive', { enabled: next });
    } catch (e) {
      console.warn('同步保活开关到后端失败:', e);
    }
  },

  // 应用启动时以后端持久化状态为准恢复开关（Web 环境回退 localStorage）
  syncKeepKernelAliveOnExit: async () => {
    try {
      const enabled = await invoke<boolean>('get_keep_kernel_alive');
      set({ keepKernelAliveOnExit: enabled });
      try {
        localStorage.setItem(KEEP_ALIVE_STORAGE_KEY, enabled ? 'true' : 'false');
      } catch {
        // ignore
      }
    } catch {
      try {
        set({ keepKernelAliveOnExit: localStorage.getItem(KEEP_ALIVE_STORAGE_KEY) === 'true' });
      } catch {
        // ignore
      }
    }
  },

  toggleAutoStartKernelDaemon: () =>
    set((state) => ({ autoStartKernelDaemon: !state.autoStartKernelDaemon })),
}));
