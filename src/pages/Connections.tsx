import React, { useEffect, useState } from 'react';
import {
  Activity,
  Pause,
  Play,
  Trash2,
  XCircle,
  Search,
  Copy,
  Check,
  Info,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Shield,
  Zap,
  Globe,
  Radio,
  Server,
  Layers,
  Network,
  Route,
} from 'lucide-react';
import { useConnectionStore } from '../stores/useConnectionStore';
import type { ConnectionItem } from '../types';
import { CustomSelect } from '../components/CustomSelect';
import { OutboundSelect } from '../components/OutboundSelect';
import { useProxyStore } from '../stores/useProxyStore';
import { useConfigStore } from '../stores/useConfigStore';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec === 0) return '0.00 B/s';
  return `${formatBytes(bytesPerSec)}/s`;
}

function formatDuration(startTime: number): string {
  const seconds = Math.floor((Date.now() - startTime) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remSec = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remSec}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export const ConnectionsPage: React.FC = () => {
  const {
    connections,
    isPaused,
    searchQuery,
    filterTab,
    selectedChainFilter,
    regexMode,
    closeConnection,
    closeAllConnections,
    clearClosedConnections,
    togglePause,
    setSearchQuery,
    setFilterTab,
    setSelectedChainFilter,
    setRegexMode,
    initConnectionSimulation,
  } = useConnectionStore();

  const { proxyGroups, profiles } = useProxyStore();
  const { profiles: configProfiles, selectedProfileId, activeProfileId, updateProfile } = useConfigStore();
  const targetConfigProfile = configProfiles.find((p) => p.id === (selectedProfileId || activeProfileId)) || configProfiles[0];
  const allNodes = profiles.flatMap((p) => p.nodes);

  const [copiedHost, setCopiedHost] = useState<string | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<ConnectionItem | null>(null);

  // Quick Edit Connection Rule State
  const [ruleEditingConnection, setRuleEditingConnection] = useState<ConnectionItem | null>(null);
  const [targetDomainRule, setTargetDomainRule] = useState<string>('');
  const [targetOutbound, setTargetOutbound] = useState<string>('direct');
  const [ruleDescription, setRuleDescription] = useState<string>('');
  const [domainRuleType, setDomainRuleType] = useState<'full' | 'root' | 'custom'>('full');
  const [saveSuccessToast, setSaveSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    const cleanup = initConnectionSimulation();
    return () => cleanup();
  }, [initConnectionSimulation]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHost(text);
    setTimeout(() => setCopiedHost(null), 2000);
  };

  const handleOpenRuleModal = (conn: ConnectionItem) => {
    setRuleEditingConnection(conn);
    const cleanHost = conn.host.split(':')[0];
    const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(cleanHost);
    
    const initialRule = isIp ? `ip:${cleanHost}` : `domain:${cleanHost}`;
    setTargetDomainRule(initialRule);
    setDomainRuleType('full');

    const currentOutbound = conn.chain[conn.chain.length - 1] || 'direct';
    setTargetOutbound(currentOutbound);
    setRuleDescription(`针对 ${conn.host} 的自定义路由规则`);
  };

  const handleDomainTypeChange = (type: 'full' | 'root' | 'custom', conn: ConnectionItem) => {
    setDomainRuleType(type);
    const cleanHost = conn.host.split(':')[0];
    const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(cleanHost);

    if (type === 'full') {
      setTargetDomainRule(isIp ? `ip:${cleanHost}` : `domain:${cleanHost}`);
    } else if (type === 'root') {
      const parts = cleanHost.split('.');
      const root = parts.length >= 2 ? parts.slice(-2).join('.') : cleanHost;
      setTargetDomainRule(isIp ? `ip:${cleanHost}` : `domain:${root}`);
    }
  };

  const handleSaveRuleForConnection = () => {
    if (!ruleEditingConnection || !targetConfigProfile) return;

    try {
      const config = JSON.parse(targetConfigProfile.content || '{}');
      if (!config.routing) {
        config.routing = { domainStrategy: 'IPIfNonMatch', rules: [] };
      }
      if (!Array.isArray(config.routing.rules)) {
        config.routing.rules = [];
      }

      const isIpRule = targetDomainRule.startsWith('ip:');
      const ruleVal = targetDomainRule.replace(/^(domain:|ip:)/, '');

      const ruleItem = isIpRule
        ? {
            type: 'field',
            outboundTag: targetOutbound,
            ip: [ruleVal],
            enabled: true,
            description: ruleDescription || `针对 ${ruleEditingConnection.host} 的规则`,
          }
        : {
            type: 'field',
            outboundTag: targetOutbound,
            domain: [targetDomainRule.startsWith('domain:') ? targetDomainRule : `domain:${targetDomainRule}`],
            enabled: true,
            description: ruleDescription || `针对 ${ruleEditingConnection.host} 的规则`,
          };

      // Prepend to routing.rules so it takes priority
      config.routing.rules.unshift(ruleItem);

      // Save to config store profile
      updateProfile(targetConfigProfile.id, { content: JSON.stringify(config, null, 2) });

      // Update connection item state in useConnectionStore
      let nextChain = [targetOutbound];
      if (targetOutbound === 'direct') nextChain = ['直接连接', 'DIRECT'];
      else if (targetOutbound === 'block') nextChain = ['黑洞阻断', 'BLOCK'];

      useConnectionStore.setState((state) => ({
        connections: state.connections.map((c) =>
          c.id === ruleEditingConnection.id
            ? {
                ...c,
                rule: targetDomainRule,
                chain: nextChain,
              }
            : c
        ),
      }));

      setSaveSuccessToast(`已成功保存并关联路由规则 ➔ [${targetOutbound}]`);
      setTimeout(() => setSaveSuccessToast(null), 3500);
      setRuleEditingConnection(null);
    } catch (err) {
      console.error('Failed to save connection routing rule:', err);
    }
  };

  // Counts
  const activeCount = connections.filter((c) => c.status === 'active').length;
  const closedCount = connections.filter((c) => c.status === 'closed').length;

  // Aggregate Traffic
  const totalDownload = connections.reduce((acc, c) => acc + c.download, 0);
  const totalUpload = connections.reduce((acc, c) => acc + c.upload, 0);
  const activeDownloadSpeed = connections.reduce((acc, c) => acc + c.downloadSpeed, 0);
  const activeUploadSpeed = connections.reduce((acc, c) => acc + c.uploadSpeed, 0);

  // Extract unique chain nodes/strategy groups for filter dropdown
  const uniqueChains = Array.from(
    new Set(connections.flatMap((c) => c.chain))
  ).filter(Boolean);

  const chainSelectOptions = [
    { value: 'ALL', label: '全部策略组 / 出站' },
    ...uniqueChains.map((c) => ({
      value: c,
      label: c,
      description: c === 'DIRECT' ? '直连流量' : '代理出站或策略组',
    })),
  ];

  // Filtering
  const filteredConnections = connections.filter((conn) => {
    // Status tab filter
    if (filterTab === 'active' && conn.status !== 'active') return false;
    if (filterTab === 'closed' && conn.status !== 'closed') return false;

    // Strategy chain dropdown filter
    if (selectedChainFilter !== 'ALL') {
      if (!conn.chain.includes(selectedChainFilter)) return false;
    }

    // Search query filter
    if (!searchQuery.trim()) return true;

    if (regexMode) {
      try {
        const regex = new RegExp(searchQuery, 'i');
        return (
          regex.test(conn.host) ||
          regex.test(conn.rule) ||
          regex.test(conn.chain.join(' ')) ||
          regex.test(conn.processName || '') ||
          regex.test(conn.destinationIp || '')
        );
      } catch {
        // Fallback if invalid regex
      }
    }

    const query = searchQuery.toLowerCase();
    return (
      conn.host.toLowerCase().includes(query) ||
      conn.rule.toLowerCase().includes(query) ||
      conn.chain.some((ch) => ch.toLowerCase().includes(query)) ||
      (conn.processName && conn.processName.toLowerCase().includes(query)) ||
      (conn.destinationIp && conn.destinationIp.toLowerCase().includes(query))
    );
  });

  // Sorting
  type SortField = 'host' | 'download' | 'upload' | 'downloadSpeed' | 'uploadSpeed' | 'startTime';
  type SortOrder = 'asc' | 'desc';

  const [sortField, setSortField] = useState<SortField>('startTime');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortOrder === 'desc') {
        setSortOrder('asc');
      } else {
        setSortField('startTime');
        setSortOrder('desc');
      }
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedConnections = [...filteredConnections].sort((a, b) => {
    let valA: any = a[sortField] ?? 0;
    let valB: any = b[sortField] ?? 0;

    if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = (valB as string).toLowerCase();
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const renderSortHeader = (field: SortField, label: string, alignRight = false) => {
    const isSorted = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className={`py-3 px-3 cursor-pointer select-none group/th transition-colors hover:text-white whitespace-nowrap ${
          alignRight ? 'text-right' : 'text-left'
        } ${isSorted ? 'text-cyan-400 font-bold' : ''}`}
      >
        <div className={`inline-flex items-center gap-1.5 ${alignRight ? 'justify-end' : 'justify-start'}`}>
          <span>{label}</span>
          {isSorted ? (
            sortOrder === 'desc' ? (
              <ArrowDown className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            ) : (
              <ArrowUp className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            )
          ) : (
            <ArrowUpDown className="w-3 h-3 text-slate-600 group-hover/th:text-slate-400 transition-colors shrink-0" />
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Title & Metric Cards */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">网络连接可视化</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                实时追踪与分析域名、请求策略组分流路径及节点出站链路
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center gap-2">
          <button
            onClick={togglePause}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isPaused
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                : 'bg-slate-900 border-white/10 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {isPaused ? <Play className="w-4 h-4 text-amber-400" /> : <Pause className="w-4 h-4 text-cyan-400" />}
            <span>{isPaused ? '恢复更新' : '暂停更新'}</span>
          </button>

          {closedCount > 0 && (
            <button
              onClick={clearClosedConnections}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-slate-400" />
              <span>清空已关闭</span>
            </button>
          )}

          {activeCount > 0 && (
            <button
              onClick={closeAllConnections}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 transition-all cursor-pointer"
            >
              <XCircle className="w-4 h-4 text-rose-400" />
              <span>关闭全部</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute right-3 top-3 w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          </div>
          <div className="text-xs text-slate-400 font-medium">活跃连接</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">{activeCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">当前建立中的 Socket/Session</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute right-3 top-3 w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
            <Shield className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xs text-slate-400 font-medium">已关闭连接</div>
          <div className="text-2xl font-bold text-slate-300 mt-1 font-mono">{closedCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">已结束的历史请求记录</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute right-3 top-3 w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
            <ArrowDownLeft className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xs text-slate-400 font-medium">实时下行速率</div>
          <div className="text-xl font-bold text-cyan-400 mt-1 font-mono">
            {formatSpeed(activeDownloadSpeed)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            累计下行: <span className="font-mono text-slate-400">{formatBytes(totalDownload)}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute right-3 top-3 w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <ArrowUpRight className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xs text-slate-400 font-medium">实时上行速率</div>
          <div className="text-xl font-bold text-purple-400 mt-1 font-mono">
            {formatSpeed(activeUploadSpeed)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            累计上行: <span className="font-mono text-slate-400">{formatBytes(totalUpload)}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="relative z-30 flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/70 border border-white/10 backdrop-blur-xl">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setFilterTab('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterTab === 'active'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            活跃 <span className="ml-1 opacity-80 font-mono">({activeCount})</span>
          </button>

          <button
            onClick={() => setFilterTab('closed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterTab === 'closed'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            已关闭 <span className="ml-1 opacity-80 font-mono">({closedCount})</span>
          </button>

          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterTab === 'all'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            全部 <span className="ml-1 opacity-80 font-mono">({connections.length})</span>
          </button>
        </div>

        {/* Right Search Input & Select Dropdown */}
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          {/* Strategy Chain Dropdown */}
          <div className="w-52 shrink-0">
            <CustomSelect
              value={selectedChainFilter}
              onChange={setSelectedChainFilter}
              options={chainSelectOptions}
              accentColor="blue"
              size="sm"
            />
          </div>

          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="过滤主机、规则、过程或节点..."
              className="w-full bg-slate-950 border border-white/10 focus:border-blue-500/60 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Regex Toggle */}
          <button
            onClick={() => setRegexMode(!regexMode)}
            title="切换正则表达式匹配"
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
              regexMode
                ? 'bg-blue-600/30 border-blue-500/50 text-blue-300 shadow-sm shadow-blue-500/20'
                : 'bg-slate-950 border-white/10 text-slate-500 hover:text-slate-300'
            }`}
          >
            .*
          </button>
        </div>
      </div>

      {/* Main Connections Table */}
      <div className="relative z-0 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {renderSortHeader('host', '主机 (Host)')}
                {renderSortHeader('download', '下载量', true)}
                {renderSortHeader('upload', '上传量', true)}
                {renderSortHeader('downloadSpeed', '下载速度', true)}
                {renderSortHeader('uploadSpeed', '上传速度', true)}
                <th className="py-3 px-4">链路 (分流策略组 ➔ 出站)</th>
                <th className="py-3 px-4">匹配规则</th>
                <th className="py-3 px-4 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {sortedConnections.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-medium">
                    无匹配的活跃/历史网络连接数据
                  </td>
                </tr>
              ) : (
                sortedConnections.map((conn) => {
                  const isClosed = conn.status === 'closed';
                  return (
                    <tr
                      key={conn.id}
                      className={`group hover:bg-white/[0.04] transition-colors ${
                        isClosed ? 'opacity-55' : ''
                      }`}
                    >
                      {/* Host Column */}
                      <td className="py-3 px-4 max-w-[260px]">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                              conn.network === 'TCP'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {conn.network}
                          </span>
                          <span
                            onClick={() => setSelectedConnection(conn)}
                            className="font-mono text-slate-200 font-medium hover:text-cyan-400 transition-colors truncate cursor-pointer"
                            title={conn.host}
                          >
                            {conn.host}
                          </span>
                          <button
                            onClick={() => copyToClipboard(conn.host)}
                            title="复制主机地址"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-slate-200"
                          >
                            {copiedHost === conn.host ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        {conn.destinationIp && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5 pl-8">
                            IP: {conn.destinationIp}
                          </div>
                        )}
                      </td>

                      {/* Download Total */}
                      <td className="py-3 px-3 text-right font-mono text-slate-300 whitespace-nowrap">
                        {formatBytes(conn.download)}
                      </td>

                      {/* Upload Total */}
                      <td className="py-3 px-3 text-right font-mono text-slate-300 whitespace-nowrap">
                        {formatBytes(conn.upload)}
                      </td>

                      {/* Download Speed */}
                      <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                        {conn.downloadSpeed > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold text-[11px] animate-pulse border border-cyan-500/30 whitespace-nowrap">
                            {formatSpeed(conn.downloadSpeed)}
                          </span>
                        ) : (
                          <span className="text-slate-500 whitespace-nowrap">0.00 B/s</span>
                        )}
                      </td>

                      {/* Upload Speed */}
                      <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                        {conn.uploadSpeed > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold text-[11px] animate-pulse border border-purple-500/30 whitespace-nowrap">
                            {formatSpeed(conn.uploadSpeed)}
                          </span>
                        ) : (
                          <span className="text-slate-500 whitespace-nowrap">0.00 B/s</span>
                        )}
                      </td>

                      {/* Strategy Chain Flow */}
                      <td className="py-3 px-4">
                        <div className="flex items-center flex-wrap gap-1">
                          {conn.chain.map((step, idx) => {
                            const isLast = idx === conn.chain.length - 1;
                            const isDirect = step === 'DIRECT' || step === '直接连接';
                            const isReject = step === 'REJECT' || step === 'BLOCK';

                            let badgeStyle = 'bg-blue-500/10 text-blue-300 border-blue-500/25';
                            if (isDirect) badgeStyle = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
                            else if (isReject) badgeStyle = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
                            else if (isLast) badgeStyle = 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 font-bold';

                            return (
                              <React.Fragment key={idx}>
                                {idx > 0 && <span className="text-slate-600 text-[10px]">/</span>}
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[11px] border font-medium whitespace-nowrap ${badgeStyle}`}
                                >
                                  {step}
                                </span>
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </td>

                      {/* Matching Rule */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-block font-mono text-[11px] px-2 py-0.5 rounded-md bg-slate-950 text-slate-300 border border-white/10 whitespace-nowrap">
                          {conn.rule}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenRuleModal(conn)}
                            title="快捷配置/修改此连接的路由规则"
                            className="p-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 transition-colors cursor-pointer"
                          >
                            <Route className="w-3.5 h-3.5 text-indigo-400" />
                          </button>

                          <button
                            onClick={() => setSelectedConnection(conn)}
                            title="查看详细拓扑与诊断信息"
                            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          >
                            <Info className="w-3.5 h-3.5 text-blue-400" />
                          </button>

                          {conn.status === 'active' && (
                            <button
                              onClick={() => closeConnection(conn.id)}
                              title="关闭此连接"
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Connection Detail Modal Drawer */}
      {selectedConnection && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-white/15 rounded-2xl shadow-2xl shadow-black overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-950">
              <div className="flex items-center gap-2">
                <Network className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-sm tracking-wide">连接请求详细链路拓扑</h3>
              </div>
              <button
                onClick={() => setSelectedConnection(null)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {/* Visual Pipeline Flowchart */}
              <div>
                <div className="text-xs font-semibold text-slate-400 mb-3 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-400" />
                  请求路由拓扑流程
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3 overflow-x-auto">
                  {/* Step 1: Process */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-xs">
                    <Globe className="w-4 h-4 text-purple-400" />
                    <div>
                      <div className="text-[10px] text-slate-500">客户端 / 进程</div>
                      <div className="font-mono text-slate-200 font-medium">
                        {selectedConnection.processName || 'System'}
                      </div>
                    </div>
                  </div>

                  <span className="text-slate-600 text-sm hidden md:block">➔</span>

                  {/* Step 2: Inbound */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-xs">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="text-[10px] text-slate-500">入站协议</div>
                      <div className="font-mono text-amber-300 font-medium">
                        {selectedConnection.inboundTag} ({selectedConnection.network})
                      </div>
                    </div>
                  </div>

                  <span className="text-slate-600 text-sm hidden md:block">➔</span>

                  {/* Step 3: Match Rule */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-xs">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="text-[10px] text-slate-500">匹配规则</div>
                      <div className="font-mono text-emerald-300 font-medium">
                        {selectedConnection.rule}
                      </div>
                    </div>
                  </div>

                  <span className="text-slate-600 text-sm hidden md:block">➔</span>

                  {/* Step 4: Final Chain */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600/20 border border-blue-500/30 text-xs">
                    <Server className="w-4 h-4 text-cyan-400" />
                    <div>
                      <div className="text-[10px] text-slate-400">出站节点 / 策略</div>
                      <div className="font-mono text-cyan-300 font-bold">
                        {selectedConnection.chain[selectedConnection.chain.length - 1]}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Breakdown Table */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-slate-950 border border-white/5 space-y-1">
                  <div className="text-[11px] text-slate-500">主机地址 (Host)</div>
                  <div className="text-xs font-mono text-slate-200 font-semibold truncate select-all">
                    {selectedConnection.host}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-white/5 space-y-1">
                  <div className="text-[11px] text-slate-500">目标 IP 地址</div>
                  <div className="text-xs font-mono text-slate-200 select-all">
                    {selectedConnection.destinationIp || '未指定'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-white/5 space-y-1">
                  <div className="text-[11px] text-slate-500">传输统计</div>
                  <div className="text-xs font-mono text-cyan-300">
                    下载: {formatBytes(selectedConnection.download)} / 上传: {formatBytes(selectedConnection.upload)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-white/5 space-y-1">
                  <div className="text-[11px] text-slate-500">持续时长 / 状态</div>
                  <div className="text-xs font-mono text-slate-200">
                    {formatDuration(selectedConnection.startTime)}{' '}
                    <span
                      className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        selectedConnection.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {selectedConnection.status === 'active' ? 'ACTIVE' : 'CLOSED'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Full Strategy Chain Path List */}
              <div className="p-3 rounded-xl bg-slate-950 border border-white/5">
                <div className="text-[11px] text-slate-500 mb-2">完整分流策略组层级</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedConnection.chain.map((c, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono text-blue-300 font-semibold"
                    >
                      {i + 1}. {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const connToEdit = selectedConnection;
                    setSelectedConnection(null);
                    handleOpenRuleModal(connToEdit);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/40 text-xs font-semibold text-indigo-200 border border-indigo-500/40 transition-colors cursor-pointer"
                >
                  <Route className="w-3.5 h-3.5 text-indigo-400" />
                  <span>修改路由规则</span>
                </button>

                <button
                  onClick={() => copyToClipboard(JSON.stringify(selectedConnection, null, 2))}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-300 transition-colors cursor-pointer border border-white/10"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>复制 JSON</span>
                </button>
              </div>

              <button
                onClick={() => setSelectedConnection(null)}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Edit Connection Routing Rule Modal */}
      {ruleEditingConnection && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-white/15 rounded-2xl shadow-2xl shadow-black flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-950 shrink-0">
              <div className="flex items-center gap-2">
                <Route className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-sm">修改连接路由规则</h3>
              </div>
              <button
                onClick={() => setRuleEditingConnection(null)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Form Content Body with extra bottom padding for dropdown popovers */}
            <div className="p-5 space-y-4 text-xs overflow-y-auto custom-scrollbar flex-1 pb-44">
              {/* Host Banner */}
              <div className="p-3 rounded-xl bg-slate-950 border border-white/10 space-y-1">
                <div className="text-[11px] text-slate-400">当前目标主机 (Host)</div>
                <div className="font-mono text-cyan-300 font-bold text-sm truncate">
                  {ruleEditingConnection.host}
                </div>
              </div>

              {/* Match Strategy Choice */}
              <div className="space-y-2">
                <label className="text-slate-300 font-semibold block">匹配规则模式 (Domain Pattern)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDomainTypeChange('full', ruleEditingConnection)}
                    className={`p-2.5 rounded-xl border text-left font-mono text-xs transition-all cursor-pointer ${
                      domainRuleType === 'full'
                        ? 'bg-blue-600/25 border-blue-500/60 text-blue-300 font-bold'
                        : 'bg-slate-950 border-white/10 text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    <div className="text-[10px] text-slate-500 font-sans">全域名匹配</div>
                    <div className="truncate mt-0.5">domain:{ruleEditingConnection.host.split(':')[0]}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDomainTypeChange('root', ruleEditingConnection)}
                    className={`p-2.5 rounded-xl border text-left font-mono text-xs transition-all cursor-pointer ${
                      domainRuleType === 'root'
                        ? 'bg-blue-600/25 border-blue-500/60 text-blue-300 font-bold'
                        : 'bg-slate-950 border-white/10 text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    <div className="text-[10px] text-slate-500 font-sans">根域名匹配 (含所有子域名)</div>
                    <div className="truncate mt-0.5">
                      domain:{ruleEditingConnection.host.split(':')[0].split('.').slice(-2).join('.')}
                    </div>
                  </button>
                </div>
              </div>

              {/* Rule Pattern Input */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">规则匹配表达式</label>
                <input
                  type="text"
                  value={targetDomainRule}
                  onChange={(e) => {
                    setTargetDomainRule(e.target.value);
                    setDomainRuleType('custom');
                  }}
                  className="w-full bg-slate-950 border border-white/10 focus:border-blue-500/60 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 outline-none transition-all"
                />
              </div>

              {/* Destination Outbound Dropdown */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">重定向目标出站 / 策略组</label>
                <OutboundSelect
                  value={targetOutbound}
                  onChange={setTargetOutbound}
                  proxyGroups={proxyGroups}
                  allNodes={allNodes}
                  fullWidth
                  size="md"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">规则说明</label>
                <input
                  type="text"
                  value={ruleDescription}
                  onChange={(e) => setRuleDescription(e.target.value)}
                  placeholder="规则简要描述..."
                  className="w-full bg-slate-950 border border-white/10 focus:border-blue-500/60 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none transition-all"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-slate-950 flex items-center justify-end gap-2 shrink-0 z-10">
              <button
                onClick={() => setRuleEditingConnection(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-400 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleSaveRuleForConnection}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
              >
                保存并即刻应用规则
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {saveSuccessToast && (
        <div className="fixed bottom-6 right-6 z-[100] bg-emerald-600/90 text-white px-4 py-3 rounded-xl shadow-2xl backdrop-blur-xl flex items-center gap-2 border border-emerald-400/40 text-xs font-semibold animate-in slide-in-from-bottom-5">
          <Check className="w-4 h-4 text-emerald-200 shrink-0" />
          <span>{saveSuccessToast}</span>
        </div>
      )}
    </div>
  );
};
