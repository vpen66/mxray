import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Server, Zap, RefreshCw, Activity } from 'lucide-react';
import type { Profile, ProxyNode } from '../types';

interface ProfileNodeSelectProps {
  profile: Profile;
  selectedNodeId: string;
  onSelectNode: (nodeId: string) => void;
  onTestNodeLatency: (nodeId: string) => Promise<void>;
  onTestProfileLatencies: (profileId: string) => Promise<void>;
}

export const ProfileNodeSelect: React.FC<ProfileNodeSelectProps> = ({
  profile,
  selectedNodeId,
  onSelectNode,
  onTestNodeLatency,
  onTestProfileLatencies,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [testingNodeId, setTestingNodeId] = useState<string | null>(null);
  const [isBatchTesting, setIsBatchTesting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const getDelayColor = (delay?: number) => {
    if (delay === undefined) return 'text-slate-500';
    if (delay < 0) return 'text-rose-400 font-semibold';
    if (delay < 60) return 'text-emerald-400 font-bold';
    if (delay < 150) return 'text-amber-400 font-semibold';
    return 'text-rose-400 font-semibold';
  };

  const getDelayText = (delay?: number) => {
    if (delay === undefined) return '未测速';
    if (delay < 0) return '超时';
    return `${delay} ms`;
  };

  const getProtocolColor = (protocol: string) => {
    switch (protocol.toLowerCase()) {
      case 'vless':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'vmess':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'trojan':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'hysteria2':
      case 'hy2':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'shadowsocks':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const activeNodeInProfile = profile.nodes.find((n) => n.id === selectedNodeId);

  const handleTestSingleNode = async (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setTestingNodeId(nodeId);
    try {
      await onTestNodeLatency(nodeId);
    } finally {
      setTestingNodeId(null);
    }
  };

  const handleTestAllInProfile = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBatchTesting(true);
    try {
      await onTestProfileLatencies(profile.id);
    } finally {
      setIsBatchTesting(false);
    }
  };

  return (
    <div className="space-y-2 pt-2 border-t border-white/5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400 flex items-center gap-1.5 font-medium">
          <Activity className="w-3.5 h-3.5 text-blue-400" />
          订阅节点与连接质量 ({profile.nodes.length} 个)
        </span>
        <button
          type="button"
          onClick={handleTestAllInProfile}
          disabled={isBatchTesting || profile.nodes.length === 0}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-[11px] font-semibold transition-all disabled:opacity-50 cursor-pointer"
          title="测试该订阅下所有节点的连接延迟"
        >
          <Zap className={`w-3 h-3 ${isBatchTesting ? 'animate-bounce text-amber-400' : 'text-blue-400'}`} />
          <span>{isBatchTesting ? '测速中...' : '测速当前订阅'}</span>
        </button>
      </div>

      <div ref={containerRef} className="relative w-full z-10">
        {/* Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between gap-2 bg-slate-950/80 border ${
            isOpen ? 'border-blue-500/70 ring-2 ring-blue-500/20 text-blue-300' : 'border-white/10 hover:border-white/20 text-slate-200'
          } rounded-xl px-3 py-2 text-xs transition-all duration-150 text-left focus:outline-none cursor-pointer`}
        >
          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            <Server className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {activeNodeInProfile ? (
              <span className="truncate font-mono font-medium text-blue-300">
                [当前选中] {activeNodeInProfile.name}
              </span>
            ) : (
              <span className="truncate font-mono text-slate-300">
                展开节点列表 ({profile.nodes.length} 个节点)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeNodeInProfile && (
              <span className={`font-mono text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-white/10 ${getDelayColor(activeNodeInProfile.delay)}`}>
                {getDelayText(activeNodeInProfile.delay)}
              </span>
            )}
            <ChevronDown
              className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-blue-400' : ''
              }`}
            />
          </div>
        </button>

        {/* Custom Popover Dropdown Menu */}
        {isOpen && (
          <div className="absolute left-0 top-[calc(100%+6px)] w-full max-h-64 bg-slate-900/98 backdrop-blur-2xl border border-slate-700/80 rounded-xl shadow-2xl shadow-black/90 z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between text-[11px] font-semibold text-slate-400 bg-slate-950/40">
              <span>节点列表 ({profile.nodes.length})</span>
              <span>点击节点切换使用</span>
            </div>

            <div className="p-1.5 overflow-y-auto overscroll-contain space-y-1 text-xs custom-scrollbar">
              {profile.nodes.length === 0 ? (
                <div className="py-4 text-center text-slate-500 text-xs">该订阅暂无有效节点</div>
              ) : (
                profile.nodes.map((node: ProxyNode) => {
                  const isSelected = selectedNodeId === node.id;
                  const isNodeTesting = testingNodeId === node.id;

                  return (
                    <div
                      key={node.id}
                      onClick={() => {
                        onSelectNode(node.id);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 shadow-sm font-semibold'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                        <Server className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-mono font-medium text-xs text-slate-200">
                              {node.name}
                            </span>
                            <span className={`px-1.5 py-0.2 text-[9px] rounded uppercase font-mono font-bold border ${getProtocolColor(node.protocol)}`}>
                              {node.protocol}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            {node.server}:{node.port}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Latency MS indicator */}
                        <span className={`font-mono text-xs px-2 py-0.5 rounded bg-slate-950/80 border border-white/5 ${getDelayColor(node.delay)}`}>
                          {getDelayText(node.delay)}
                        </span>

                        {/* Single node latency refresh button */}
                        <button
                          type="button"
                          onClick={(e) => handleTestSingleNode(e, node.id)}
                          disabled={isNodeTesting}
                          className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="测速该节点"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isNodeTesting ? 'animate-spin text-blue-400' : ''}`} />
                        </button>

                        {isSelected && <Check className="w-4 h-4 text-blue-400 shrink-0 ml-1" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
