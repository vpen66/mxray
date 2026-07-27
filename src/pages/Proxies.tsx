import React, { useState } from 'react';
import {
  Zap,
  Check,
  Search,
  RefreshCw,
  Cpu,
  Server,
  Globe,
  Bot,
  Send,
  Tv,
  PlayCircle,
  Apple,
  Anchor,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Shield,
  Layers,
  Radio,
  Share2,
  Plus,
  Edit3,
  Trash2,
  Filter,
  X,
  Shuffle,
  Activity,
  Sliders,
} from 'lucide-react';
import { useProxyStore, getMatchingNodesForGroup } from '../stores/useProxyStore';
import { useAppStore } from '../stores/useAppStore';
import type { ProtocolType, ProxyGroup, ProxyGroupType } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';

// Helper to render Group Icon
export const getGroupIcon = (iconName?: string) => {
  if (iconName && iconName.length <= 4 && !/^[A-Za-z]+$/.test(iconName)) {
    // Emoji Icon
    return <span className="text-base leading-none">{iconName}</span>;
  }
  switch (iconName) {
    case 'Globe':
      return <Globe className="w-4 h-4 text-sky-400" />;
    case 'Zap':
      return <Zap className="w-4 h-4 text-amber-400" />;
    case 'Bot':
      return <Bot className="w-4 h-4 text-emerald-400" />;
    case 'Send':
      return <Send className="w-4 h-4 text-blue-400" />;
    case 'Tv':
      return <Tv className="w-4 h-4 text-purple-400" />;
    case 'PlayCircle':
      return <PlayCircle className="w-4 h-4 text-rose-400" />;
    case 'Apple':
      return <Apple className="w-4 h-4 text-slate-200" />;
    case 'Anchor':
      return <Anchor className="w-4 h-4 text-cyan-400" />;
    case 'Shield':
      return <Shield className="w-4 h-4 text-indigo-400" />;
    case 'Activity':
      return <Activity className="w-4 h-4 text-emerald-400" />;
    case 'Shuffle':
      return <Shuffle className="w-4 h-4 text-orange-400" />;
    default:
      return <Layers className="w-4 h-4 text-blue-400" />;
  }
};

export const ProxiesPage: React.FC = () => {
  const {
    profiles,
    proxyGroups,
    selectGroupNode,
    isTestingLatency,
    testAllLatencies,
    testNodeLatency,
    addGroup,
    updateGroup,
    removeGroup,
  } = useProxyStore();
  const { coreState, setMode } = useAppStore();
  const mode = coreState.mode;

  const [search, setSearch] = useState('');
  const [protocolFilter, setProtocolFilter] = useState<string>('all');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ProxyGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<ProxyGroup | null>(null);

  const allNodes = profiles.flatMap((p) => p.nodes);

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const toggleAllCollapse = () => {
    const allCollapsed = proxyGroups.every((g) => collapsedGroups[g.id]);
    const newState: Record<string, boolean> = {};
    proxyGroups.forEach((g) => {
      newState[g.id] = !allCollapsed;
    });
    setCollapsedGroups(newState);
  };

  const handleOpenCreateModal = () => {
    setEditingGroup(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (group: ProxyGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingGroup(group);
    setIsModalOpen(true);
  };

  const handleOpenDeleteModal = (group: ProxyGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingGroup(group);
  };

  const handleConfirmDeleteGroup = () => {
    if (deletingGroup) {
      removeGroup(deletingGroup.id);
      setDeletingGroup(null);
    }
  };


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

  const getTypeBadge = (type: ProxyGroupType) => {
    switch (type) {
      case 'select':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">SELECT</span>;
      case 'urltest':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase flex items-center gap-1"><Zap className="w-3 h-3"/> URLTEST</span>;
      case 'fallback':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase flex items-center gap-1"><Shield className="w-3 h-3"/> FALLBACK</span>;
      case 'loadbalance':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase flex items-center gap-1"><Shuffle className="w-3 h-3"/> LOADBALANCE</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400 uppercase">{type}</span>;
    }
  };

  // Helper to find selected target name in a proxy group
  const getSelectedTargetLabel = (group: ProxyGroup) => {
    const selectedId = group.selectedNodeId;
    if (!selectedId || selectedId === 'DIRECT') return '直接连接';
    if (selectedId === 'BLOCK' || selectedId === 'REJECT') return '拦截连接';

    // Check if it's another group
    const targetGroup = proxyGroups.find((g) => g.id === selectedId);
    if (targetGroup) return targetGroup.name;

    // Check if it's a node
    const node = allNodes.find((n) => n.id === selectedId || n.name === selectedId);
    if (node) return node.name;

    // Check if matching nodes exist for this group
    const groupMatchingNodes = getMatchingNodesForGroup(group, allNodes);
    if (groupMatchingNodes.length > 0) {
      return groupMatchingNodes[0].name;
    }

    return '直接连接 (无可用节点)';
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Radio className="w-5 h-5 text-blue-400" />
            代理组与节点策略
          </h2>
          <p className="text-xs text-slate-400">支持自定义代理策略组、支持正则/关键词智能自动感知归集节点</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Create Custom Proxy Group */}
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>新建代理组</span>
          </button>

          {/* Outbound Mode Switcher */}
          <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-white/10 text-xs font-semibold">
            <button
              onClick={() => setMode('rule')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                mode === 'rule' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              规则
            </button>
            <button
              onClick={() => setMode('global')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                mode === 'global' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              全局
            </button>
            <button
              onClick={() => setMode('direct')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                mode === 'direct' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              直连
            </button>
          </div>

          {/* Test All Latency */}
          <button
            onClick={testAllLatencies}
            disabled={isTestingLatency}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all"
          >
            <Zap className={`w-3.5 h-3.5 ${isTestingLatency ? 'animate-bounce' : ''}`} />
            <span>{isTestingLatency ? '测速中...' : '并发全测速'}</span>
          </button>

          {/* Expand/Collapse All */}
          <button
            onClick={toggleAllCollapse}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-white/10 transition-all"
          >
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>展开/折叠</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-white/5">
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-white/10 w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="搜索节点或代理组..."
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

      {/* Proxy Groups List */}
      <div className="space-y-4">
        {proxyGroups.length === 0 ? (
          <div className="glass-card p-12 rounded-2xl border border-white/10 text-center space-y-3 bg-slate-900/40">
            <Radio className="w-10 h-10 text-slate-500 mx-auto animate-pulse" />
            <h3 className="text-base font-bold text-white">暂无代理策略组</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              已移除所有默认策略组。您可以点击右上角“新建代理组”根据需要添加自定义策略组与归集规则。
            </p>
          </div>
        ) : (
          proxyGroups
            .filter((group) => group.name.toLowerCase().includes(search.toLowerCase()))
            .map((group) => {
            const isCollapsed = !!collapsedGroups[group.id];
            const currentLabel = getSelectedTargetLabel(group);

            // Compute matching nodes for this group using getMatchingNodesForGroup
            const groupMatchingNodes = getMatchingNodesForGroup(group, allNodes);

            // Filter group's nodes by search and protocol filter
            const availableNodes = groupMatchingNodes.filter((node) => {
              const matchesSearch =
                node.name.toLowerCase().includes(search.toLowerCase()) ||
                node.server.toLowerCase().includes(search.toLowerCase());
              const matchesProtocol = protocolFilter === 'all' || node.protocol === protocolFilter;
              return matchesSearch && matchesProtocol;
            });

            // Special options for groups (other groups)
            const otherGroupsOptions = proxyGroups.filter((g) => g.id !== group.id);

            return (
              <div
                key={group.id}
                className="glass-card rounded-2xl border border-white/10 overflow-hidden transition-all bg-slate-900/40"
              >
                {/* Group Header */}
                <div
                  onClick={() => toggleGroupCollapse(group.id)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-800/80 border border-white/10 flex items-center justify-center shadow-inner">
                      {getGroupIcon(group.icon)}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white tracking-wide">{group.name}</h3>
                        {getTypeBadge(group.type)}
                        {group.useFilter && group.filter && (
                          <span className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            <Filter className="w-2.5 h-2.5" /> 正则: {group.filter}
                          </span>
                        )}
                        {group.isCustom && (
                          <span className="px-1.5 py-0.2 text-[9px] rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                            自定义
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5">
                        <span className="text-slate-500">当前使用:</span>
                        <span className="font-semibold text-blue-300 truncate max-w-[200px] sm:max-w-[320px]">
                          {currentLabel}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-white/5 font-mono">
                      <span>{availableNodes.length} 个关联节点</span>
                    </div>

                    {/* Edit & Delete Group Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        title="编辑策略组"
                        onClick={(e) => handleOpenEditModal(group, e)}
                        className="w-8 h-8 rounded-lg bg-slate-800/60 hover:bg-blue-600 hover:text-white flex items-center justify-center text-slate-400 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {group.isCustom && (
                        <button
                          title="删除策略组"
                          onClick={(e) => handleOpenDeleteModal(group, e)}
                          className="w-8 h-8 rounded-lg bg-slate-800/60 hover:bg-rose-600 hover:text-white flex items-center justify-center text-slate-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        className="w-8 h-8 rounded-lg bg-slate-800/60 hover:bg-slate-700 flex items-center justify-center text-slate-400 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleGroupCollapse(group.id);
                        }}
                      >
                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Group Expanded Content */}
                {!isCollapsed && (
                  <div className="p-4 pt-0 border-t border-white/5 space-y-3">
                    {/* Special Targets (Direct & Reject & Other Groups) */}
                    <div className="pt-3">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        直连与策略组
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {/* DIRECT Option */}
                        <div
                          onClick={() => selectGroupNode(group.id, 'DIRECT')}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs font-semibold ${
                            group.selectedNodeId === 'DIRECT'
                              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 shadow-md shadow-emerald-500/10'
                              : 'bg-slate-950/50 border-white/5 text-slate-300 hover:border-white/20 hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5 text-emerald-400" />
                            <span>直接连接</span>
                          </div>
                          {group.selectedNodeId === 'DIRECT' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>

                        {/* REJECT Option */}
                        <div
                          onClick={() => selectGroupNode(group.id, 'BLOCK')}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs font-semibold ${
                            group.selectedNodeId === 'BLOCK'
                              ? 'bg-rose-950/40 border-rose-500/50 text-rose-300 shadow-md shadow-rose-500/10'
                              : 'bg-slate-950/50 border-white/5 text-slate-300 hover:border-white/20 hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                            <span>拦截连接</span>
                          </div>
                          {group.selectedNodeId === 'BLOCK' && <Check className="w-3.5 h-3.5 text-rose-400" />}
                        </div>

                        {/* Other Groups Link */}
                        {otherGroupsOptions.map((og) => (
                          <div
                            key={og.id}
                            onClick={() => selectGroupNode(group.id, og.id)}
                            className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs font-semibold truncate ${
                              group.selectedNodeId === og.id
                                ? 'bg-blue-950/40 border-blue-500/50 text-blue-300 shadow-md shadow-blue-500/10'
                                : 'bg-slate-950/50 border-white/5 text-slate-400 hover:border-white/20 hover:bg-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <Share2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span className="truncate">{og.name}</span>
                            </div>
                            {group.selectedNodeId === og.id && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Nodes Grid */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          关联代理节点 ({availableNodes.length})
                        </p>
                        {group.useFilter && (
                          <span className="text-[11px] text-cyan-400 font-mono">
                            匹配规则: /{group.filter}/i
                          </span>
                        )}
                      </div>

                      {availableNodes.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 text-xs bg-slate-950/30 rounded-xl border border-dashed border-white/10">
                          暂无符合规则或已选中的节点
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {availableNodes.map((node) => {
                            const isSelected = group.selectedNodeId === node.id;
                            return (
                              <div
                                key={node.id}
                                onClick={() => selectGroupNode(group.id, node.id)}
                                className={`p-3 rounded-xl border cursor-pointer transition-all relative space-y-2 group ${
                                  isSelected
                                    ? 'border-emerald-500/50 bg-emerald-950/20 shadow-lg shadow-emerald-500/10'
                                    : 'bg-slate-950/40 border-white/5 hover:border-white/20 hover:bg-white/5'
                                }`}
                              >
                                {isSelected && (
                                  <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                                    <Check className="w-3.5 h-3.5" />
                                  </div>
                                )}

                                <div className="pr-6 space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <Server className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400 shrink-0 transition-colors" />
                                    <h4 className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-1">
                                      {node.name}
                                    </h4>
                                  </div>
                                  <p className="text-[11px] text-slate-400 font-mono truncate">
                                    {node.server}:{node.port}
                                  </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-1 text-[10px]">
                                  <span className={`px-1.5 py-0.5 rounded border uppercase font-mono font-bold ${getProtocolColor(node.protocol)}`}>
                                    {node.protocol}
                                  </span>

                                  {node.security === 'reality' && (
                                    <span className="px-1.5 py-0.5 rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 font-semibold flex items-center gap-0.5">
                                      <Cpu className="w-2.5 h-2.5" /> REALITY
                                    </span>
                                  )}

                                  {node.flow && (
                                    <span className="px-1.5 py-0.5 rounded border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
                                      Vision
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center justify-between pt-1.5 border-t border-white/5 text-[11px]">
                                  <span className="text-slate-500 font-mono truncate max-w-[120px]">
                                    {node.sni || 'N/A'}
                                  </span>
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
                      )}
                    </div>
                  </div>
                )}
                </div>
              );
            })
        )}
      </div>

      {/* Edit / Create Group Modal */}
      {isModalOpen && (
        <GroupEditModal
          editingGroup={editingGroup}
          allNodes={allNodes}
          onClose={() => setIsModalOpen(false)}
          onSave={(savedGroup) => {
            if (editingGroup) {
              updateGroup(savedGroup);
            } else {
              addGroup(savedGroup);
            }
            setIsModalOpen(false);
          }}
        />
      )}

      {/* Delete Group Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingGroup}
        title="删除代理策略组"
        message={
          <span>
            确定要删除代理策略组 <strong className="text-rose-400 font-semibold">"{deletingGroup?.name}"</strong> 吗？删除后该策略组配置将被永久移除。
          </span>
        }
        confirmText="确认删除"
        onConfirm={handleConfirmDeleteGroup}
        onCancel={() => setDeletingGroup(null)}
      />
    </div>
  );
};

// Subcomponent: GroupEditModal
interface GroupEditModalProps {
  editingGroup: ProxyGroup | null;
  allNodes: any[];
  onClose: () => void;
  onSave: (group: ProxyGroup) => void;
}

const PRESET_ICONS = ['Globe', 'Zap', 'Bot', 'Send', 'Tv', 'PlayCircle', 'Apple', 'Anchor', 'Shield', 'Activity', 'Shuffle'];
const PRESET_EMOJIS = ['🇭🇰', '🇯🇵', '🇺🇸', '🇸🇬', '🇬🇧', '🇩🇪', '🤖', '🎬', '🎮', '🛡️', '⚡', '🌐'];

const GroupEditModal: React.FC<GroupEditModalProps> = ({ editingGroup, allNodes, onClose, onSave }) => {
  const [name, setName] = useState(editingGroup?.name || '');
  const [type, setType] = useState<ProxyGroupType>(editingGroup?.type || 'select');
  const [icon, setIcon] = useState(editingGroup?.icon || 'Globe');
  const [useFilter, setUseFilter] = useState(editingGroup?.useFilter ?? true);
  const [filter, setFilter] = useState(editingGroup?.filter || '香港|HK');
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>(editingGroup?.nodeIds || []);
  const [testUrl, setTestUrl] = useState(editingGroup?.testUrl || 'https://www.gstatic.com/generate_204');
  const [interval, setInterval] = useState(editingGroup?.interval || 300);
  const [tolerance, setTolerance] = useState(editingGroup?.tolerance || 50);

  // Compute matched nodes for preview if useFilter is active
  const previewMatchedNodes = useFilter
    ? (() => {
        if (!filter.trim()) return [];
        try {
          const regex = new RegExp(filter, 'i');
          return allNodes.filter((n) => regex.test(n.name) || regex.test(n.server));
        } catch {
          const kw = filter.toLowerCase();
          return allNodes.filter((n) => n.name.toLowerCase().includes(kw) || n.server.toLowerCase().includes(kw));
        }
      })()
    : allNodes.filter((n) => selectedNodeIds.includes(n.id));

  const toggleNodeSelection = (nodeId: string) => {
    setSelectedNodeIds((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
    );
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('请输入代理组名称');
      return;
    }

    const saved: ProxyGroup = {
      id: editingGroup?.id || `custom-group-${Date.now()}`,
      name: name.trim(),
      type,
      icon,
      selectedNodeId: editingGroup?.selectedNodeId || 'DIRECT',
      useFilter,
      filter: useFilter ? filter : undefined,
      nodeIds: !useFilter ? selectedNodeIds : undefined,
      testUrl: type === 'urltest' || type === 'fallback' ? testUrl : undefined,
      interval: type === 'urltest' || type === 'fallback' ? interval : undefined,
      tolerance: type === 'urltest' ? tolerance : undefined,
      isCustom: editingGroup ? editingGroup.isCustom : true,
    };

    onSave(saved);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-white">
              {editingGroup ? `编辑代理策略组 (${editingGroup.name})` : '新建自定义代理策略组'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Name & Icon */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-slate-300 font-semibold flex items-center gap-1">
                代理组名称 <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如: 🇭🇰 香港低延迟专线 / 🤖 OpenAI"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">图标</label>
              <div className="relative flex items-center">
                <div className="absolute left-3 flex items-center justify-center pointer-events-none">
                  {getGroupIcon(icon)}
                </div>
                <input
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="名称 (如 Zap) 或 Emoji (如 🇭🇰)"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
                />
              </div>
            </div>
          </div>

          {/* Quick Icon Selector */}
          <div className="space-y-1.5">
            <label className="text-slate-400 text-[11px]">快捷选择图标</label>
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/60 p-2 rounded-xl border border-white/5">
              {PRESET_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setIcon(e)}
                  title={e}
                  className={`w-7 h-7 rounded-lg border text-sm flex items-center justify-center transition-all ${
                    icon === e ? 'bg-blue-600/30 border-blue-500 text-white' : 'border-white/5 bg-slate-900 hover:bg-slate-800'
                  }`}
                >
                  {e}
                </button>
              ))}
              <div className="w-px h-5 bg-white/10 mx-1" />
              {PRESET_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  title={ic}
                  className={`w-7 h-7 rounded-lg border text-sm flex items-center justify-center transition-all ${
                    icon === ic ? 'bg-blue-600/30 border-blue-500 text-white' : 'border-white/5 bg-slate-900 hover:bg-slate-800'
                  }`}
                >
                  {getGroupIcon(ic)}
                </button>
              ))}
            </div>
          </div>

          {/* Strategy Type Selector */}
          <div className="space-y-2">
            <label className="text-slate-300 font-semibold">策略类型</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setType('select')}
                className={`p-3 rounded-xl border text-left transition-all space-y-1 ${
                  type === 'select'
                    ? 'bg-blue-950/50 border-blue-500 text-white shadow-md shadow-blue-500/10'
                    : 'bg-slate-950/40 border-white/5 text-slate-400 hover:bg-white/5'
                }`}
              >
                <div className="font-bold flex items-center gap-1">SELECT (手动)</div>
                <div className="text-[10px] text-slate-500">手动指定当前使用节点</div>
              </button>

              <button
                type="button"
                onClick={() => setType('urltest')}
                className={`p-3 rounded-xl border text-left transition-all space-y-1 ${
                  type === 'urltest'
                    ? 'bg-amber-950/50 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10'
                    : 'bg-slate-950/40 border-white/5 text-slate-400 hover:bg-white/5'
                }`}
              >
                <div className="font-bold flex items-center gap-1"><Zap className="w-3 h-3 text-amber-400"/> URLTEST (自动)</div>
                <div className="text-[10px] text-slate-500">定期测试选延迟最低节点</div>
              </button>

              <button
                type="button"
                onClick={() => setType('fallback')}
                className={`p-3 rounded-xl border text-left transition-all space-y-1 ${
                  type === 'fallback'
                    ? 'bg-purple-950/50 border-purple-500 text-purple-300 shadow-md shadow-purple-500/10'
                    : 'bg-slate-950/40 border-white/5 text-slate-400 hover:bg-white/5'
                }`}
              >
                <div className="font-bold flex items-center gap-1"><Shield className="w-3 h-3 text-purple-400"/> FALLBACK (高可用)</div>
                <div className="text-[10px] text-slate-500">主节点故障自动退化顺延</div>
              </button>

              <button
                type="button"
                onClick={() => setType('loadbalance')}
                className={`p-3 rounded-xl border text-left transition-all space-y-1 ${
                  type === 'loadbalance'
                    ? 'bg-emerald-950/50 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10'
                    : 'bg-slate-950/40 border-white/5 text-slate-400 hover:bg-white/5'
                }`}
              >
                <div className="font-bold flex items-center gap-1"><Shuffle className="w-3 h-3 text-emerald-400"/> LOADBALANCE</div>
                <div className="text-[10px] text-slate-500">散列轮询打散并发流量</div>
              </button>
            </div>
          </div>

          {/* Node Matching Mode Switch (Filter Regex vs Manual Selection) */}
          <div className="space-y-3 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setUseFilter(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    useFilter ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  正则/关键词匹配 (推荐)
                </button>
                <button
                  type="button"
                  onClick={() => setUseFilter(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    !useFilter ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  手动勾选指定节点
                </button>
              </div>
            </div>

            {useFilter ? (
              <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-xl border border-cyan-500/20">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold">正则表达式 / 关键字</label>
                  <span className="text-[11px] text-cyan-400 font-mono font-bold">
                    匹配结果: {previewMatchedNodes.length} / {allNodes.length} 个节点
                  </span>
                </div>
                <input
                  type="text"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="如: 香港|HK 或 (?i)US|United States"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-cyan-200 font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
                <p className="text-[10px] text-slate-400">
                  支持正则表达式或直接输入关键字（多关键词可用 <code className="text-cyan-400 font-bold">|</code> 分隔）。订阅更新获取新节点时将**自动匹配归集**。
                </p>

                {/* Preview Matched Nodes Badges */}
                <div className="pt-2 border-t border-white/5 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400">当前匹配预览:</span>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pt-1">
                    {previewMatchedNodes.length === 0 ? (
                      <span className="text-[10px] text-rose-400 font-mono">⚠️ 未匹配到任何符合规则的节点</span>
                    ) : (
                      previewMatchedNodes.map((n) => (
                        <span
                          key={n.id}
                          className="px-2 py-0.5 rounded bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono"
                        >
                          {n.name}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-300">勾选归属节点 (已选 {selectedNodeIds.length} 个)</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedNodeIds.length === allNodes.length) {
                        setSelectedNodeIds([]);
                      } else {
                        setSelectedNodeIds(allNodes.map((n) => n.id));
                      }
                    }}
                    className="text-[11px] text-blue-400 hover:underline"
                  >
                    {selectedNodeIds.length === allNodes.length ? '取消全选' : '全选全部节点'}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                  {allNodes.map((n) => {
                    const isChecked = selectedNodeIds.includes(n.id);
                    return (
                      <div
                        key={n.id}
                        onClick={() => toggleNodeSelection(n.id)}
                        className={`p-2 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${
                          isChecked
                            ? 'bg-blue-950/40 border-blue-500/50 text-blue-300'
                            : 'bg-slate-900/60 border-white/5 text-slate-400 hover:bg-white/5'
                        }`}
                      >
                        <span className="font-semibold truncate pr-2">{n.name}</span>
                        {isChecked && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Health Check Settings (For URLTEST & FALLBACK) */}
          {(type === 'urltest' || type === 'fallback') && (
            <div className="space-y-3 pt-2 border-t border-white/5">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                健康检查与自动测试参数
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-slate-400 text-[10px]">测速地址 (Test URL)</label>
                  <input
                    type="text"
                    value={testUrl}
                    onChange={(e) => setTestUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono text-[11px] focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px]">测试间隔 (秒)</label>
                  <input
                    type="number"
                    value={interval}
                    onChange={(e) => setInterval(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono text-[11px] focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
              {type === 'urltest' && (
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px]">防抖容忍度 (Tolerance ms)</label>
                  <input
                    type="number"
                    value={tolerance}
                    onChange={(e) => setTolerance(Number(e.target.value))}
                    className="w-full sm:w-1/3 bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono text-[11px] focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-500">仅当新节点延迟比当前节点低 {tolerance}ms 以上时才切换，防止网络小幅抖动频繁切 IP。</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-900/80 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-all cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            保存策略组
          </button>
        </div>
      </div>
    </div>
  );
};
