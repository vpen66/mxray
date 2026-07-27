import React, { useState } from 'react';
import { Zap, Check, Search, RefreshCw, Cpu } from 'lucide-react';
import { useProxyStore } from '../stores/useProxyStore';
import type { ProtocolType } from '../types';

export const ProxiesPage: React.FC = () => {
  const { profiles, selectedNodeId, selectNode, isTestingLatency, testAllLatencies, testNodeLatency } = useProxyStore();
  const [search, setSearch] = useState('');
  const [protocolFilter, setProtocolFilter] = useState<string>('all');

  const allNodes = profiles.flatMap((p) => p.nodes);

  const filteredNodes = allNodes.filter((node) => {
    const matchesSearch = node.name.toLowerCase().includes(search.toLowerCase()) || node.server.toLowerCase().includes(search.toLowerCase());
    const matchesProtocol = protocolFilter === 'all' || node.protocol === protocolFilter;
    return matchesSearch && matchesProtocol;
  });

  const getProtocolColor = (protocol: ProtocolType) => {
    switch (protocol) {
      case 'vless':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'vmess':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'hysteria2':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'trojan':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'shadowsocks':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getDelayColor = (delay?: number) => {
    if (!delay || delay < 0) return 'text-slate-500';
    if (delay < 60) return 'text-emerald-400 font-bold';
    if (delay < 150) return 'text-amber-400 font-semibold';
    return 'text-rose-400';
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">节点与代理选择 (Proxies)</h2>
          <p className="text-xs text-slate-400">选择当前全局/规则出站节点，测试 TCP & TLS 延迟</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={testAllLatencies}
            disabled={isTestingLatency}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all"
          >
            <Zap className={`w-4 h-4 ${isTestingLatency ? 'animate-bounce' : ''}`} />
            <span>{isTestingLatency ? '全测速中...' : '并发测试全部延迟'}</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-white/5">
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-white/10 w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="搜索节点名称 / 服务器..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none w-full"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          {['all', 'vless', 'hysteria2', 'vmess', 'trojan', 'shadowsocks'].map((p) => (
            <button
              key={p}
              onClick={() => setProtocolFilter(p)}
              className={`px-3 py-1.5 rounded-lg font-medium capitalize transition-all ${
                protocolFilter === p
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Nodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredNodes.map((node) => {
          const isSelected = selectedNodeId === node.id;
          return (
            <div
              key={node.id}
              onClick={() => selectNode(node.id)}
              className={`glass-card p-4 rounded-xl cursor-pointer transition-all border relative space-y-3 group ${
                isSelected
                  ? 'border-emerald-500/50 bg-emerald-950/20 shadow-lg shadow-emerald-500/10'
                  : 'hover:border-white/20 hover:bg-white/5'
              }`}
            >
              {/* Selected Check Badge */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                  <Check className="w-4 h-4" />
                </div>
              )}

              {/* Node Title & Server */}
              <div className="pr-8 space-y-1">
                <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-1">
                  {node.name}
                </h3>
                <p className="text-xs text-slate-400 font-mono truncate">
                  {node.server}:{node.port}
                </p>
              </div>

              {/* Tags & Security info */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className={`px-2 py-0.5 rounded border uppercase font-mono font-bold ${getProtocolColor(node.protocol)}`}>
                  {node.protocol}
                </span>

                {node.security === 'reality' && (
                  <span className="px-2 py-0.5 rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 font-semibold flex items-center gap-1">
                    <Cpu className="w-3 h-3" /> REALITY
                  </span>
                )}

                {node.flow && (
                  <span className="px-2 py-0.5 rounded border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
                    Vision
                  </span>
                )}

                {node.network && (
                  <span className="px-2 py-0.5 rounded border border-slate-700 bg-slate-800 text-slate-300 uppercase">
                    {node.network}
                  </span>
                )}
              </div>

              {/* Footer Latency */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                <span className="text-slate-500 font-mono">SNI: {node.sni || 'N/A'}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    testNodeLatency(node.id);
                  }}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  <span className={`font-mono ${getDelayColor(node.delay)}`}>
                    {node.delay ? `${node.delay} ms` : '未测速'}
                  </span>
                  <RefreshCw className="w-3 h-3 text-slate-500 hover:rotate-180 transition-transform" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
