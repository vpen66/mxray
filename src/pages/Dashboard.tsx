import React, { useEffect } from 'react';
import { ArrowDown, ArrowUp, Activity, ShieldCheck, Radio } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAppStore } from '../stores/useAppStore';
import { useProxyStore } from '../stores/useProxyStore';

const MOCK_SPEED_HISTORY = [
  { time: '10:45', up: 12, down: 120 },
  { time: '10:46', up: 25, down: 280 },
  { time: '10:47', up: 18, down: 410 },
  { time: '10:48', up: 45, down: 350 },
  { time: '10:49', up: 32, down: 520 },
  { time: '10:50', up: 68, down: 890 },
  { time: '10:51', up: 42, down: 380 },
];

export const DashboardPage: React.FC = () => {
  const { coreState, trafficStats, setMode, updateTraffic } = useAppStore();
  const { profiles, selectedNodeId } = useProxyStore();

  const activeNode = profiles
    .flatMap((p) => p.nodes)
    .find((n) => n.id === selectedNodeId);

  useEffect(() => {
    const interval = setInterval(() => {
      const randomUp = Math.floor(Math.random() * 50 * 1024);
      const randomDown = Math.floor(Math.random() * 600 * 1024);
      updateTraffic(randomUp, randomDown);
    }, 2000);
    return () => clearInterval(interval);
  }, [updateTraffic]);

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>实时下载速率</span>
            <ArrowDown className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {formatSpeed(trafficStats.downloadSpeed)}
          </div>
          <div className="text-[11px] text-slate-500">累计下载: {formatTotal(trafficStats.totalDownload)}</div>
        </div>

        <div className="glass-card p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>实时上传速率</span>
            <ArrowUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {formatSpeed(trafficStats.uploadSpeed)}
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

        <div className="glass-card p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>系统与接管状态</span>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${coreState.systemProxy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
              系统代理: {coreState.systemProxy ? '开启' : '关闭'}
            </span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${coreState.tunMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
              TUN 模式: {coreState.tunMode ? '开启' : '关闭'}
            </span>
          </div>
          <div className="text-[11px] text-slate-500">FakeDNS: 开启 (198.18.0.0/15)</div>
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
            <AreaChart data={MOCK_SPEED_HISTORY}>
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
