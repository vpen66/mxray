import React, { useEffect, useState, useRef } from 'react';
import { Shield, Network, Cpu, HardDrive, Download, FolderOpen, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useConfigStore } from '../stores/useConfigStore';

import { useKernelStore } from '../stores/useKernelStore';
import { open } from '@tauri-apps/plugin-dialog';

export const SettingsPage: React.FC = () => {
  const { socksPort, httpPort, enableFakeDns, sniffingEnabled, updatePorts, toggleFakeDns, toggleSniffing } = useConfigStore();
  const {
    activeKernel,
    installedKernels,
    remoteReleases,
    isLoadingReleases,
    isInstalling,
    installingVersion,
    error,
    loadInstalledKernels,
    fetchRemoteReleases,
    switchKernel,
    selectCustomPath,
    installRelease,
  } = useKernelStore();

  const [customPathInput, setCustomPathInput] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadInstalledKernels();
    fetchRemoteReleases();
  }, []);

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
        <p className="text-xs text-slate-400">配置 Xray-core 内核路径、版本切换、本地代理监听端口及网络优化</p>
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
          <label className="block text-xs font-semibold text-slate-300">选择已安装的内核</label>
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
        </div>

        {/* 2. Custom Path Selector */}
        <div className="space-y-2 border-t border-white/5 pt-4">
          <label className="block text-xs font-semibold text-slate-300">指定本地安装的 Xray-core 路径</label>

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
              const isAlreadyInstalled = installedKernels.some((k) => k.version === rel.version);
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
                    {isAlreadyInstalled ? (
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

      {/* Network Ports */}
      <div className="glass-card p-6 rounded-2xl space-y-4 border border-white/10">
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <Network className="w-5 h-5 text-blue-400" />
          <h3 className="text-base font-bold text-white">本地代理入站端口</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Socks5 监听端口</label>
            <input
              type="number"
              value={socksPort}
              onChange={(e) => updatePorts(parseInt(e.target.value) || 10808, httpPort)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">HTTP 监听端口</label>
            <input
              type="number"
              value={httpPort}
              onChange={(e) => updatePorts(socksPort, parseInt(e.target.value) || 10809)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* DNS & FakeDNS */}
      <div className="glass-card p-6 rounded-2xl space-y-4 border border-white/10">
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <Cpu className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-bold text-white">Xray DNS 与 流量嗅探</h3>
        </div>

        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-white">开启 FakeDNS 域名解析池</h4>
              <p className="text-slate-400">使用 198.18.0.0/15 地址池接管 TUN 与操作系统 DNS 流量</p>
            </div>
            <button
              onClick={toggleFakeDns}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${enableFakeDns ? 'bg-blue-600' : 'bg-slate-800'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${enableFakeDns ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-white/5 pt-3">
            <div>
              <h4 className="font-bold text-white">开启入站流量嗅探 (Sniffing)</h4>
              <p className="text-slate-400">基于 HTTP/TLS/QUIC 嗅探真实的域名目标，防御 DNS 污染</p>
            </div>
            <button
              onClick={toggleSniffing}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${sniffingEnabled ? 'bg-blue-600' : 'bg-slate-800'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${sniffingEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
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
            <button className="w-12 h-6 rounded-full bg-blue-600 relative p-0.5">
              <div className="w-5 h-5 rounded-full bg-white translate-x-6 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

