import React, { useEffect, useState, useRef } from 'react';
import { Shield, HardDrive, Download, FolderOpen, CheckCircle, AlertCircle, RefreshCw, Terminal, Copy, Check, Server, Zap, Sparkles } from 'lucide-react';
import { useKernelStore } from '../stores/useKernelStore';
import { useUpdateStore } from '../stores/useUpdateStore';
import { useAppStore } from '../stores/useAppStore';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { ToggleSwitch } from '../components/ToggleSwitch';
import { FieldLabel } from '../components/FieldLabel';

export const SettingsPage: React.FC = () => {
  const { autoStartApp, isTogglingAutoStart, toggleAutoStartApp, checkAutoStartStatus } = useAppStore();
  const {
    activeKernel,
    installedKernels,
    remoteReleases,
    isLoadingReleases,
    isLoadingKernels,
    isInstalling,
    installingVersion,
    error,
    loadInstalledKernels,
    fetchRemoteReleases,
    switchKernel,
    selectCustomPath,
    installRelease,
    standaloneKernel,
    keepKernelAliveOnExit,
    autoStartKernelDaemon,
    toggleStandaloneKernel,
    toggleKeepKernelAliveOnExit,
    toggleAutoStartKernelDaemon,
  } = useKernelStore();

  const {
    currentVersion: appVersion,
    status: updateStatus,
    updateInfo,
    downloadProgress,
    error: updateError,
    checkForUpdates,
    downloadAndInstallUpdate,
    loadCurrentVersion,
  } = useUpdateStore();

  const [copiedCli, setCopiedCli] = useState(false);
  const [copiedConfigPath, setCopiedConfigPath] = useState(false);
  const [cliCommand, setCliCommand] = useState<string>('');
  const [runtimeConfigPath, setRuntimeConfigPath] = useState<string>('');

  const [customPathInput, setCustomPathInput] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadInstalledKernels();
    checkAutoStartStatus();
    loadCurrentVersion();
  }, [loadInstalledKernels, checkAutoStartStatus, loadCurrentVersion]);

  useEffect(() => {
    const fetchCliInfo = async () => {
      try {
        const cmd = await invoke<string>('get_cli_command', { binaryPath: activeKernel.path });
        const path = await invoke<string>('get_runtime_config_path');
        setCliCommand(cmd);
        setRuntimeConfigPath(path);
      } catch {
        const isWin = (navigator.userAgent || '').toLowerCase().includes('win');
        const fallbackPath = isWin
          ? '%APPDATA%\\net.mxray.app\\runtime_config.json'
          : '$HOME/.config/net.mxray.app/runtime_config.json';
        const defaultBin = isWin ? 'xray.exe' : 'xray';
        const bin = activeKernel.path === 'bundled' ? defaultBin : (activeKernel.path || defaultBin);

        if (isWin) {
          setCliCommand(`cmd /c start /b "" "${bin}" run -config "${fallbackPath}"`);
        } else {
          setCliCommand(`nohup "${bin}" run -config "${fallbackPath}" > /dev/null 2>&1 &`);
        }
        setRuntimeConfigPath(fallbackPath);
      }
    };
    fetchCliInfo();
  }, [activeKernel]);

  const handleBrowseFile = async () => {
    setValidationError(null);
    try {
      const selected = await open({
        multiple: false,
        directory: false,
        title: '选择 Xray-core 二进制可执行文件',
      });
      const filePath = Array.isArray(selected) ? selected[0] : selected;
      if (filePath && typeof filePath === 'string') {
        setCustomPathInput(filePath);
        setIsDetecting(true);
        await selectCustomPath(filePath);
        setIsDetecting(false);
      }
    } catch {
      // Fallback: trigger HTML5 hidden file picker if tauri dialog plugin is not available
      if (fileInputRef.current) {
        fileInputRef.current.click();
      } else {
        const input = prompt('请输入本地 xray 可执行文件的绝对路径:', '/usr/local/bin/xray');
        if (input) {
          setCustomPathInput(input);
          setIsDetecting(true);
          await selectCustomPath(input);
          setIsDetecting(false);
        }
      }
    }
  };

  const handleWebFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const path = (file as any).path || file.name || '/usr/local/bin/xray';
      setCustomPathInput(path);
      setIsDetecting(true);
      await selectCustomPath(path);
      setIsDetecting(false);
    }
  };

  const handleManualPathSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (!customPathInput.trim()) {
      setValidationError('请先输入或选择 Xray-core 二进制文件的绝对路径');
      return;
    }
    setIsDetecting(true);
    await selectCustomPath(customPathInput.trim());
    setIsDetecting(false);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">系统与全局设置</h2>
        <p className="text-xs text-slate-400">配置 Xray-core 内核路径、版本切换及网络优化</p>
      </div>

      {/* App Online Updater Card */}
      <div className="glass-card p-6 rounded-2xl space-y-5 border border-white/10 bg-slate-900/40 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                MXray 客户端在线更新
              </h3>
              <p className="text-xs text-slate-400">保持应用最新，享受最佳稳定性、安全修复与最新协议特性</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-800 border border-white/10 text-slate-300">
              当前版本: v{appVersion}
            </span>
            <button
              onClick={() => checkForUpdates()}
              disabled={updateStatus === 'checking' || updateStatus === 'downloading' || updateStatus === 'installing'}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${updateStatus === 'checking' ? 'animate-spin' : ''}`} />
              <span>{updateStatus === 'checking' ? '正在检查更新...' : '检查应用更新'}</span>
            </button>
          </div>
        </div>

        {/* Update Status Feedback Area */}
        {updateStatus === 'latest' && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>已经是最新版本 (v{appVersion})，无需更新</span>
            </div>
            <span className="text-[11px] text-emerald-500/80 font-mono">系统构建正常</span>
          </div>
        )}

        {updateError && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{updateError}</span>
            </div>
            <button
              onClick={() => checkForUpdates()}
              className="px-2.5 py-1 bg-rose-500/20 border border-rose-500/30 rounded text-[11px] text-rose-300 hover:text-white transition-colors"
            >
              重试
            </button>
          </div>
        )}

        {updateStatus === 'available' && updateInfo && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500 text-white">NEW</span>
                <h4 className="font-bold text-white text-sm">发现新版本 v{updateInfo.version}</h4>
                {updateInfo.date && (
                  <span className="text-[11px] text-slate-400 font-mono">({updateInfo.date})</span>
                )}
              </div>
              <button
                onClick={() => downloadAndInstallUpdate()}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>立即在线升级</span>
              </button>
            </div>

            {updateInfo.body && (
              <div className="p-3 bg-slate-950/60 rounded-lg border border-white/5 text-xs text-slate-300 font-mono space-y-1 max-h-36 overflow-y-auto leading-relaxed">
                <p className="text-[11px] text-slate-400 font-sans font-semibold mb-1">更新日志与主要改动：</p>
                <div className="whitespace-pre-wrap">{updateInfo.body}</div>
              </div>
            )}
          </div>
        )}

        {(updateStatus === 'downloading' || updateStatus === 'installing') && (
          <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs text-blue-300">
              <span className="font-semibold flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                {updateStatus === 'downloading' ? '正在下载在线更新安装包...' : '正在解压并替换应用组件...'}
              </span>
              {downloadProgress !== null && (
                <span className="font-mono text-blue-400 font-bold">{downloadProgress}%</span>
              )}
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300 rounded-full"
                style={{ width: `${downloadProgress ?? 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Kernel Management Card */}
      <div className="glass-card p-6 rounded-2xl space-y-5 border border-white/10 bg-slate-900/40">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Xray 内核管理与版本切换</h3>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            当前使用: {activeKernel.name} ({activeKernel.version})
          </span>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Installed Kernel Switcher */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300"><FieldLabel label="选择已安装的内核" tip="从系统中已安装的 Xray 内核中选择一个作为当前运行的内核。" /></label>

          {isLoadingKernels ? (
            <div className="flex items-center justify-center py-6 text-xs text-slate-400 gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-slate-500" />
              <span>正在检测系统中已安装的内核...</span>
            </div>
          ) : installedKernels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-xs text-slate-500 gap-2">
              <AlertCircle className="w-5 h-5 text-slate-600" />
              <span>未检测到任何已安装的内核，请先在下方下载安装或指定本地路径</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {installedKernels.map((k, index) => {
                const isSelected = activeKernel.path === k.path && activeKernel.version === k.version;
                return (
                  <div
                    key={index}
                    onClick={() => switchKernel(k)}
                    className={`cursor-pointer p-3 rounded-xl border text-xs transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                        : 'bg-slate-900/60 border-white/5 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold flex items-center gap-1.5">
                        <span>{k.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 border border-white/10 rounded text-slate-400">
                          {k.kernel_type}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 truncate max-w-[240px]">{k.path}</p>
                    </div>
                    {isSelected ? (
                      <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />
                    ) : (
                      <button className="px-2 py-1 rounded bg-slate-800 text-[10px] text-slate-400 hover:text-white">
                        切换
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Custom Path Selector */}
        <div className="space-y-2 border-t border-white/5 pt-4">
          <label className="block text-xs font-semibold text-slate-300"><FieldLabel label="指定本地内核路径" tip="手动指定本地已安装的 Xray-core 可执行文件路径。" /></label>

          {validationError && (
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleWebFileChange}
            className="hidden"
          />

          <form onSubmit={handleManualPathSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="/usr/local/bin/xray 或 C:\\xray\\xray.exe"
                value={customPathInput}
                onChange={(e) => {
                  setCustomPathInput(e.target.value);
                  setValidationError(null);
                }}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={handleBrowseFile}
              disabled={isDetecting}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-xl text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
              浏览文件
            </button>
            <button
              type="submit"
              disabled={isDetecting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isDetecting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  检测中...
                </>
              ) : (
                '检测并应用'
              )}
            </button>
          </form>
        </div>

        {/* 3. Online Download & Installation Panel */}
        <div className="space-y-3 border-t border-white/5 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                在线下载与安装内核
              </h4>
              <p className="text-[11px] text-slate-400">一键拉取官方最新/历史 Release 内核自动补全至本地</p>
            </div>
            <button
              onClick={() => fetchRemoteReleases()}
              disabled={isLoadingReleases}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
              title="刷新在线版本"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingReleases ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-2">
            {remoteReleases.map((rel) => {
              const isAlreadyInstalled = installedKernels.some((k) => k.version === rel.version && k.is_valid);
              const isCurrentVersion =
                activeKernel.version === rel.version &&
                rel.version !== 'Unknown' &&
                rel.version !== '未检测到';
              const isBeingInstalled = isInstalling && installingVersion === rel.version;

              return (
                <div
                  key={rel.version}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-white/5 text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-200 flex items-center gap-2">
                      <span>{rel.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{rel.published_at}</span>
                    </div>
                  </div>

                  <div>
                    {isCurrentVersion ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[11px] font-medium">
                        <CheckCircle className="w-3 h-3" />
                        当前使用
                      </span>
                    ) : isAlreadyInstalled ? (
                      <span className="px-2.5 py-1 rounded bg-slate-800/80 text-slate-400 text-[11px] font-medium">
                        已安装
                      </span>
                    ) : (
                      <button
                        onClick={() => installRelease(rel)}
                        disabled={isInstalling}
                        className="px-3 py-1 bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-600/30 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-all disabled:opacity-50"
                      >
                        {isBeingInstalled ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            下载中...
                          </>
                        ) : (
                          <>
                            <Download className="w-3 h-3" />
                            一键下载安装
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Standalone No-GUI Kernel Mode Card */}
      <div className="glass-card p-6 rounded-2xl space-y-5 border border-white/10 bg-slate-900/40">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-bold text-white">Xray 内核独立后台运行</h3>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              standaloneKernel ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            {standaloneKernel ? '独立内核运行中' : '界面托管模式'}
          </span>
        </div>

        <div className="space-y-4 text-xs">
          {/* Option 1: Standalone Daemon Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-white">启用 Xray 内核独立守护模式</h4>
              <p className="text-slate-400">无需启动或保持图形界面，直接以系统后台进程方式独立运行 Xray 内核</p>
            </div>
            <ToggleSwitch
              checked={standaloneKernel}
              onChange={toggleStandaloneKernel}
              activeColor="purple"
              ariaLabel="启用 Xray 内核独立守护模式"
            />
          </div>

          {/* Option 2: Keep Kernel Alive on Exit */}
          <div className="flex items-center justify-between border-t border-white/5 pt-3">
            <div>
              <h4 className="font-bold text-white">退出应用主界面时保持 Xray 内核后台运行</h4>
              <p className="text-slate-400">关闭窗口时不杀死 Xray 进程，允许后端网络代理继续静默托管</p>
            </div>
            <ToggleSwitch
              checked={keepKernelAliveOnExit}
              onChange={toggleKeepKernelAliveOnExit}
              activeColor="purple"
              ariaLabel="退出时保持内核后台运行"
            />
          </div>

          {/* Option 3: Auto-start Kernel Daemon at Boot without GUI */}
          <div className="flex items-center justify-between border-t border-white/5 pt-3">
            <div>
              <h4 className="font-bold text-white">开机静默启动 Xray 内核</h4>
              <p className="text-slate-400">开机登录系统时仅自动拉起后台 Xray 内核，不弹窗或加载图形界面</p>
            </div>
            <ToggleSwitch
              checked={autoStartKernelDaemon}
              onChange={toggleAutoStartKernelDaemon}
              activeColor="purple"
              ariaLabel="开机静默启动 Xray 内核"
            />
          </div>

          {/* Option 4: CLI Standalone Command Box */}
          <div className="space-y-3 border-t border-white/5 pt-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-purple-400" />
                后台独立运行命令行指令 (CLI Command)
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(cliCommand || `nohup xray run -config "${runtimeConfigPath}" > /dev/null 2>&1 &`);
                  setCopiedCli(true);
                  setTimeout(() => setCopiedCli(false), 2000);
                }}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1 text-[11px] transition-colors"
              >
                {copiedCli ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCli ? '已复制指令' : '复制命令'}</span>
              </button>
            </div>
            {runtimeConfigPath && (
              <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
                <div className="truncate mr-2">
                  <span className="text-slate-400">运行时配置实际路径：</span>
                  <span className="font-mono text-purple-300 select-all">{runtimeConfigPath}</span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(runtimeConfigPath);
                    setCopiedConfigPath(true);
                    setTimeout(() => setCopiedConfigPath(false), 2000);
                  }}
                  className="shrink-0 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1 text-[10px] transition-colors"
                >
                  {copiedConfigPath ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                  <span>{copiedConfigPath ? '已复制' : '复制路径'}</span>
                </button>
              </div>
            )}
            <div className="p-3 bg-slate-950 rounded-xl border border-white/10 font-mono text-[11px] text-purple-300 break-all select-all">
              {cliCommand || `xray run -config "${runtimeConfigPath || 'runtime_config.json'}"`}
            </div>
          </div>
        </div>
      </div>

      {/* System & Autostart */}
      <div className="glass-card p-6 rounded-2xl space-y-4 border border-white/10">
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <Shield className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-bold text-white">系统开机启动与托盘行为</h3>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-white">开机自动启动 MXray</h4>
              <p className="text-slate-400">登录系统后后台静默启动并自动挂载核心代理</p>
            </div>
            <ToggleSwitch
              checked={autoStartApp}
              onChange={toggleAutoStartApp}
              loading={isTogglingAutoStart}
              activeColor="blue"
              ariaLabel="开机自动启动 MXray"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

