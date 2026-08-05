import { create } from 'zustand';
import { getVersion } from '@tauri-apps/api/app';
import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { open as openUrl } from '@tauri-apps/plugin-shell';

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'latest'
  | 'downloading'
  | 'installing'
  | 'error';

export interface UpdateReleaseInfo {
  version: string;
  body?: string;
  date?: string;
  htmlUrl?: string;
}

interface UpdateState {
  currentVersion: string;
  status: UpdateStatus;
  updateInfo: UpdateReleaseInfo | null;
  downloadProgress: number | null;
  error: string | null;
  activeUpdateHandle: Update | null;

  checkForUpdates: () => Promise<void>;
  downloadAndInstallUpdate: () => Promise<void>;
  clearStatus: () => void;
  loadCurrentVersion: () => Promise<void>;
}

const compareVersions = (v1: string, v2: string): number => {
  const cleanV1 = v1.replace(/^v/i, '').trim();
  const cleanV2 = v2.replace(/^v/i, '').trim();

  const parts1 = cleanV1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = cleanV2.split('.').map((p) => parseInt(p, 10) || 0);

  const maxLen = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLen; i++) {
    const val1 = parts1[i] || 0;
    const val2 = parts2[i] || 0;
    if (val1 > val2) return 1;
    if (val1 < val2) return -1;
  }
  return 0;
};

export const useUpdateStore = create<UpdateState>((set, get) => ({
  currentVersion: '',
  status: 'idle',
  updateInfo: null,
  downloadProgress: null,
  error: null,
  activeUpdateHandle: null,

  clearStatus: () => set({ status: 'idle', error: null, downloadProgress: null }),

  loadCurrentVersion: async () => {
    if (get().currentVersion) return;
    try {
      const version = await getVersion();
      set({ currentVersion: version });
    } catch {
      // 忽略读取失败，保持为空由使用方降级显示
    }
  },

  checkForUpdates: async () => {
    set({ status: 'checking', error: null, downloadProgress: null });

    let currentVer = get().currentVersion;
    if (!currentVer) {
      try {
        currentVer = await getVersion();
        set({ currentVersion: currentVer });
      } catch {
        currentVer = '0.0.0';
      }
    }

    try {
      // 1. 尝试使用 Tauri 2 原生 Updater 插件接口
      const update = await check();
      if (update) {
        set({
          status: 'available',
          activeUpdateHandle: update,
          updateInfo: {
            version: update.version,
            body: update.body || '包含性能改进和稳定性增强',
            date: update.date || new Date().toISOString().split('T')[0],
          },
        });
        return;
      }

      // 若原生 Update 对象为 null，说明已是最新版本
      set({ status: 'latest', activeUpdateHandle: null, updateInfo: null });
    } catch (pluginError) {
      console.warn('Tauri Updater plugin check failed or not available, falling back to GitHub API:', pluginError);

      // 2. 降级使用 GitHub API 检查最新 Releases
      try {
        const resp = await fetch('https://api.github.com/repos/vpen66/mxray/releases/latest', {
          headers: { Accept: 'application/vnd.github.v3+json' },
        });

        if (!resp.ok) {
          throw new Error(`无法连接至 GitHub Releases (HTTP ${resp.status})`);
        }

        const data = await resp.json();
        const latestTag = (data.tag_name || data.name || '').trim();
        const releaseBody = data.body || '无详细更新说明';
        const releaseDate = data.published_at ? data.published_at.split('T')[0] : '';
        const htmlUrl = data.html_url || 'https://github.com/vpen66/mxray/releases';

        if (latestTag && compareVersions(latestTag, currentVer) > 0) {
          set({
            status: 'available',
            activeUpdateHandle: null,
            updateInfo: {
              version: latestTag.replace(/^v/i, ''),
              body: releaseBody,
              date: releaseDate,
              htmlUrl: htmlUrl,
            },
          });
        } else {
          set({ status: 'latest', activeUpdateHandle: null, updateInfo: null });
        }
      } catch (err: any) {
        set({
          status: 'error',
          error: err?.message || '检查更新失败，请稍后再试或检查网络连接',
        });
      }
    }
  },

  downloadAndInstallUpdate: async () => {
    const { activeUpdateHandle, updateInfo } = get();

    if (activeUpdateHandle) {
      try {
        set({ status: 'downloading', downloadProgress: 0, error: null });

        let downloaded = 0;
        let contentLength = 0;

        await activeUpdateHandle.downloadAndInstall((event) => {
          switch (event.event) {
            case 'Started':
              contentLength = event.data.contentLength || 0;
              set({ status: 'downloading', downloadProgress: 0 });
              break;
            case 'Progress':
              downloaded += event.data.chunkLength;
              if (contentLength > 0) {
                const pct = Math.round((downloaded / contentLength) * 100);
                set({ downloadProgress: pct });
              }
              break;
            case 'Finished':
              set({ status: 'installing', downloadProgress: 100 });
              break;
          }
        });

        // 安装完成后提示并自动重启应用
        await relaunch();
      } catch (err: any) {
        set({
          status: 'error',
          error: `更新安装失败: ${err?.message || '未知错误'}`,
        });
      }
    } else if (updateInfo?.htmlUrl) {
      // 降级模式：打开浏览器 GitHub Release 下载页面
      try {
        await openUrl(updateInfo.htmlUrl);
      } catch {
        window.open(updateInfo.htmlUrl, '_blank');
      }
    }
  },
}));
