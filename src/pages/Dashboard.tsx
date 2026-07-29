import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Activity, ShieldCheck, Radio, Loader2, Sliders } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAppStore } from '../stores/useAppStore';
import { useProxyStore } from '../stores/useProxyStore';
import { ToggleSwitch } from '../components/ToggleSwitch';

interface SpeedPoint {
  time: string;
  up: number;
  down: number;
}

export const DashboardPage: React.FC = () => {
  const {
    coreState,
    trafficStats,
    setMode,
    toggleSystemProxy,
    toggleTunMode,
    isTogglingSystemProxy,
    isTogglingTunMode,
    toggleKernel,
    openTunModal,
  } = useAppStore();
  const { profiles, selectedNodeId } = useProxyStore();

  const [speedHistory, setSpeedHistory] = useState<SpeedPoint[]>([]);

  const activeNode = profiles
    .flatMap((p) => p.nodes)
    .find((n) => n.id === selectedNodeId);

  const currentDownloadSpeed = coreState.isRunning ? trafficStats.downloadSpeed : 0;
  const currentUploadSpeed = coreState.isRunning ? trafficStats.uploadSpeed : 0;

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      const point: SpeedPoint = {
        time: timeStr,
        down: Math.round(currentDownloadSpeed / 1024),
        up: Math.round(currentUploadSpeed / 1024),
      };
      setSpeedHistory((prev) => [...prev.slice(-11), point]);
    }, 2000);
    return () => clearInterval(timer);
  }, [currentDownloadSpeed, currentUploadSpeed]);

  const formatSpeed = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB/s`;
    return `${(bytes / 1024).toFixed(1)} KB/s`;
  };

  const formatTotal = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Core Info */}
        {/* Mode Selector */}
        <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-white/10">
          {(['rule', 'global', 'direct'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                coreState.mode === m
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {m === 'rule' ? '规则模式' : m === 'global' ? '全局代理' : '直连模式'}
            </button>
          ))}
        </div>


      {/* Speed & Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>实时下载速率</span>
            <ArrowDown className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {formatSpeed(currentDownloadSpeed)}
          </div>
          <div className="text-[11px] text-slate-500">累计下载: {formatTotal(trafficStats.totalDownload)}</div>
        </div>

        <div className="glass-card p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>实时上传速率</span>
            <ArrowUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {formatSpeed(currentUploadSpeed)}
          </div>
          <div className="text-[11px] text-slate-500">累计上传: {formatTotal(trafficStats.totalUpload)}</div>
        </div>

        <div className="glass-card p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>当前代理节点</span>
            <Radio className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-emerald-300 truncate">
            {activeNode ? activeNode.name : '未选择节点'}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <span className="uppercase font-mono font-semibold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded text-[10px]">
              {activeNode?.protocol || 'N/A'}
            </span>
            <span>延迟: {activeNode?.delay || 0} ms</span>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl space-y-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>系统与接管状态</span>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>

          <div className="space-y-1.5">
            <div
              onClick={() => !isTogglingSystemProxy && toggleSystemProxy()}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl border transition-all duration-300 select-none ${
                isTogglingSystemProxy ? 'bg-emerald-500/10 border-emerald-500/30 cursor-wait' : 'cursor-pointer hover:border-emerald-500/40'
              } ${
                coreState.systemProxy
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-sm shadow-emerald-500/10'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
              }`}
            >
              <span className="text-xs font-semibold whitespace-nowrap">系统代理</span>
              <ToggleSwitch
                checked={coreState.systemProxy}
                onChange={toggleSystemProxy}
                loading={isTogglingSystemProxy}
                activeColor="emerald"
                size="sm"
                ariaLabel="系统代理"
              />
            </div>

            <div
              onClick={() => !isTogglingTunMode && toggleTunMode()}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl border transition-all duration-300 select-none ${
                isTogglingTunMode ? 'bg-indigo-500/10 border-indigo-500/30 cursor-wait' : 'cursor-pointer hover:border-indigo-500/40'
              } ${
                coreState.tunMode
                  ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300 shadow-sm shadow-indigo-500/10'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
              }`}
            >
              <span className="text-xs font-semibold whitespace-nowrap">TUN 模式</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="配置 TUN 模式参数"
                  onClick={(e) => {
                    e.stopPropagation();
                    openTunModal();
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5" />
                </button>
                <ToggleSwitch
                  checked={coreState.tunMode}
                  onChange={toggleTunMode}
                  loading={isTogglingTunMode}
                  activeColor="indigo"
                  size="sm"
                  ariaLabel="TUN 模式"
                />
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-white/5">
            <span className="flex items-center gap-1.5 whitespace-nowrap min-w-0 truncate">
              {isTogglingSystemProxy ? (
                <>
                  <Loader2 className="w-3 h-3 text-amber-400 animate-spin flex-shrink-0" />
                  <span className="text-amber-400 truncate">内核状态切换中...</span>
                </>
              ) : (
                <>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${coreState.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                  <span className="truncate">内核进程: {coreState.isRunning ? '运行中' : '已停止'}</span>
                </>
              )}
            </span>
            <button
              onClick={toggleKernel}
              disabled={isTogglingSystemProxy}
              className={`text-[10px] whitespace-nowrap flex-shrink-0 ml-2 transition-colors ${
                isTogglingSystemProxy ? 'text-slate-500 cursor-not-allowed' : 'text-blue-400 hover:text-blue-300 underline underline-offset-2'
              }`}
            >
              {isTogglingSystemProxy ? '请稍候...' : coreState.isRunning ? '停止内核' : '启动内核'}
            </button>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-white">网络吞吐趋势图</h3>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> 下载
            </div>
            <div className="flex items-center gap-1.5 text-blue-400">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> 上传
            </div>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={speedHistory}>
              <defs>
                <linearGradient id="downGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="upGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit=" KB/s" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderRadius: '0.75rem',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Area type="monotone" dataKey="down" stroke="#22d3ee" strokeWidth={2} fillOpacity={1} fill="url(#downGrad)" />
              <Area type="monotone" dataKey="up" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#upGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
