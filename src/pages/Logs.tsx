import React, { useEffect, useRef, useState } from 'react';
import {
  Trash2,
  Search,
  Play,
  Pause,
  Terminal,
  Layers,
  Network,
  Route,
  Globe,
  AlertTriangle,
  Shield,
  Activity,
  ChevronRight,
  Maximize2,
  X,
  Copy,
  Check,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Zap,
  Sliders,
  CheckCircle2,
  Repeat,
} from 'lucide-react';
import { useLogStore } from '../stores/useLogStore';
import type { LogEntry } from '../types';
import { CustomSelect, type SelectOption } from '../components/CustomSelect';
import { OutboundSelect } from '../components/OutboundSelect';
import { parseXrayLog, stripLeadingTimestamp } from '../utils/logParser';
import { useConfigStore } from '../stores/useConfigStore';
import { useProxyStore } from '../stores/useProxyStore';

function getRootDomain(domain: string): string {
  if (!domain || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(domain)) {
    return domain;
  }
  const parts = domain.split('.');
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }
  return domain;
}

export interface AggregatedLogEntry extends LogEntry {
  repeatCount: number;
  lastTimestamp?: string;
}

/**
 * 将短时间内重复的同目标/同链路日志进行聚合去重
 */
function aggregateLogEntries(logsList: LogEntry[], enabled: boolean): AggregatedLogEntry[] {
  if (!enabled || logsList.length === 0) {
    return logsList.map((l) => ({ ...l, repeatCount: 1, lastTimestamp: l.timestamp }));
  }

  const result: AggregatedLogEntry[] = [];
  const map = new Map<string, AggregatedLogEntry>();

  for (const log of logsList) {
    const cleanMsg = stripLeadingTimestamp(log.message);
    const domainKey = log.domain || log.target || log.shortSummary || cleanMsg;
    const outboundKey = log.outbound || (log.chain ? log.chain.join('>') : 'default');
    const categoryKey = log.category || 'general';
    const levelKey = log.level || 'info';
    const actionKey = log.action || 'default';

    const fingerprint = `${levelKey}|${categoryKey}|${actionKey}|${domainKey}|${outboundKey}`;

    const existing = map.get(fingerprint);
    if (existing) {
      existing.repeatCount += 1;
      existing.lastTimestamp = log.timestamp;
      existing.id = log.id;
    } else {
      const entry: AggregatedLogEntry = {
        ...log,
        shortSummary: log.domain ? log.shortSummary : cleanMsg,
        repeatCount: 1,
        lastTimestamp: log.timestamp,
      };
      map.set(fingerprint, entry);
      result.push(entry);
    }
  }

  return result;
}

export const LogsPage: React.FC = () => {
  const {
    logs,
    logLevel,
    categoryFilter,
    viewMode,
    searchQuery,
    autoScroll,
    aggregateDuplicates,
    clearLogs,
    setLogLevel,
    setCategoryFilter,
    setViewMode,
    setSearchQuery,
    setAutoScroll,
    setAggregateDuplicates,
  } = useLogStore();

  const { proxyGroups, profiles: proxyProfiles } = useProxyStore();
  const { profiles: configProfiles, selectedProfileId, activeProfileId, updateProfile, startActiveKernel } = useConfigStore();
  const targetConfigProfile = configProfiles.find((p) => p.id === (selectedProfileId || activeProfileId)) || configProfiles[0];
  const allNodes = proxyProfiles.flatMap((p) => p.nodes);

  const logContainerRef = useRef<HTMLDivElement>(null);
  const [selectedLog, setSelectedLog] = useState<AggregatedLogEntry | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // 快捷调整路由规则 Modal State
  const [ruleEditingLog, setRuleEditingLog] = useState<LogEntry | null>(null);
  const [targetDomainRule, setTargetDomainRule] = useState<string>('');
  const [targetOutbound, setTargetOutbound] = useState<string>('direct');
  const [ruleDescription, setRuleDescription] = useState<string>('');
  const [domainRuleType, setDomainRuleType] = useState<'full' | 'root' | 'custom'>('root');
  const [saveSuccessToast, setSaveSuccessToast] = useState<string | null>(null);

  // 动态对所有日志做解析增强
  const parsedLogs: LogEntry[] = logs.map((log) => {
    if (log.category && (log.domain || log.chain || log.shortSummary)) {
      return log;
    }
    const parsed = parseXrayLog(log.message, log.level);
    return {
      ...log,
      ...parsed,
    };
  });

  // 过滤后的日志列表
  const filteredLogs = parsedLogs.filter((log) => {
    const matchesLevel = logLevel === 'all' || log.level === logLevel;
    const matchesCategory = categoryFilter === 'all' || log.category === categoryFilter;

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      log.message.toLowerCase().includes(q) ||
      (log.target && log.target.toLowerCase().includes(q)) ||
      (log.domain && log.domain.toLowerCase().includes(q)) ||
      (log.outbound && log.outbound.toLowerCase().includes(q)) ||
      (log.source && log.source.toLowerCase().includes(q)) ||
      (log.chain && log.chain.some((c) => c.toLowerCase().includes(q))) ||
      (log.shortSummary && log.shortSummary.toLowerCase().includes(q));

    return matchesLevel && matchesCategory && matchesSearch;
  });

  // 视去重设置进行短时间聚合
  const displayLogs = aggregateLogEntries(filteredLogs, aggregateDuplicates);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [displayLogs, autoScroll]);

  // 打开快捷编辑路由 Modal
  const handleOpenRuleModal = (log: LogEntry, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const cleanDomain = log.domain || (log.target ? log.target.split(':')[0] : 'pms.topode.com');
    const rootDomain = getRootDomain(cleanDomain);

    // 根据当前日志出站及链路定位选择初始出站策略
    let initialOutbound = 'direct';
    if (log.outbound === 'block' || log.chain?.includes('block') || log.chain?.includes('阻断拦截')) {
      initialOutbound = 'block';
    } else if (log.outbound === 'direct' || log.chain?.includes('direct') || log.chain?.includes('直连出站')) {
      initialOutbound = 'direct';
    } else if (log.outbound) {
      initialOutbound = log.outbound;
    } else if (log.chain && log.chain.length > 0) {
      initialOutbound = log.chain[log.chain.length - 1];
    }

    setRuleEditingLog(log);
    setDomainRuleType('root');
    setTargetDomainRule(`domain:${rootDomain}`);
    setTargetOutbound(initialOutbound);
    setRuleDescription(`针对 ${cleanDomain} 的分流调控规则`);
  };

  // 切换域名匹配模式
  const handleDomainTypeChange = (type: 'full' | 'root' | 'custom', log: LogEntry) => {
    setDomainRuleType(type);
    const cleanDomain = log.domain || (log.target ? log.target.split(':')[0] : 'example.com');
    if (type === 'full') {
      setTargetDomainRule(`full:${cleanDomain}`);
    } else if (type === 'root') {
      const root = getRootDomain(cleanDomain);
      setTargetDomainRule(`domain:${root}`);
    } else {
      setTargetDomainRule(cleanDomain);
    }
  };

  // 保存路由规则并立即应用到 Xray 内核
  const handleSaveRuleForLog = async () => {
    if (!ruleEditingLog || !targetConfigProfile) return;

    const cleanDomain = ruleEditingLog.domain || (ruleEditingLog.target ? ruleEditingLog.target.split(':')[0] : 'domain');

    try {
      const config = JSON.parse(targetConfigProfile.content || '{}');
      if (!config.routing) {
        config.routing = { domainStrategy: 'IPIfNonMatch', rules: [] };
      }
      if (!config.routing.rules) {
        config.routing.rules = [];
      }

      const newRuleObj = {
        type: 'field',
        outboundTag: targetOutbound,
        domain: [targetDomainRule],
        enabled: true,
        description: ruleDescription || `针对 ${cleanDomain} 的分流路由规则`,
      };

      // 检查是否已有针对该域名的路由规则，有则覆盖更新，否则插在最前面优先匹配
      const existingIdx = config.routing.rules.findIndex(
        (r: any) =>
          r.domain &&
          Array.isArray(r.domain) &&
          r.domain.some((d: string) => d.includes(cleanDomain) || d.includes(targetDomainRule))
      );

      if (existingIdx >= 0) {
        config.routing.rules[existingIdx] = {
          ...config.routing.rules[existingIdx],
          outboundTag: targetOutbound,
          domain: [targetDomainRule],
          description: ruleDescription || config.routing.rules[existingIdx].description,
        };
      } else {
        config.routing.rules.unshift(newRuleObj);
      }

      // 保存 Profile 内容
      updateProfile(targetConfigProfile.id, { content: JSON.stringify(config, null, 2) });

      // 重启或更新内核
      await startActiveKernel();

      const outboundLabel = targetOutbound === 'direct' ? '直连' : targetOutbound === 'block' ? '拒绝阻断' : targetOutbound;
      setSaveSuccessToast(`已成功将 ${cleanDomain} 分流规则调整为 [${outboundLabel}]！`);
      setTimeout(() => setSaveSuccessToast(null), 3000);
      setRuleEditingLog(null);
    } catch (e) {
      console.error('Failed to save log route rule:', e);
    }
  };

  // 快捷计数统计
  const totalCount = parsedLogs.length;
  const connectionCount = parsedLogs.filter((l) => l.category === 'connection').length;
  const routerAndDnsCount = parsedLogs.filter((l) => l.category === 'router' || l.category === 'dns').length;
  const proxyAndProbeCount = parsedLogs.filter((l) => l.category === 'outbound' || l.category === 'observatory').length;
  const warningOrErrorCount = parsedLogs.filter((l) => l.level === 'warning' || l.level === 'error').length;

  const handleCopyLog = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const getLevelBadgeClass = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'warning':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'debug':
        return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
      default:
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    }
  };

  const getCategoryBadge = (category?: string) => {
    switch (category) {
      case 'connection':
        return { label: '连接请求', icon: Network, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' };
      case 'router':
        return { label: '路由分流', icon: Route, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' };
      case 'dns':
        return { label: 'DNS解析', icon: Globe, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
      case 'inbound':
        return { label: '入站服务', icon: ArrowDownLeft, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
      case 'outbound':
        return { label: '出站代理', icon: ArrowUpRight, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' };
      case 'observatory':
        return { label: '节点测速', icon: Zap, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
      case 'system':
        return { label: '系统内核', icon: Shield, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
      default:
        return { label: '常规日志', icon: Activity, color: 'text-slate-400 bg-slate-800 border-white/10' };
    }
  };

  const categoryOptions: SelectOption[] = [
    { value: 'all', label: '全部类别', icon: Layers },
    { value: 'connection', label: '连接请求', icon: Network, description: '客户端网络建立与目标代理请求' },
    { value: 'router', label: '路由分流', icon: Route, description: 'GeoIP/Geosite 规则分流与选路' },
    { value: 'dns', label: 'DNS解析', icon: Globe, description: '域名查询、FakeDNS 与 Hosts 记录' },
    { value: 'inbound', label: '入站服务', icon: ArrowDownLeft, description: 'HTTP/SOCKS/TUN 网络监听服务' },
    { value: 'outbound', label: '出站代理', icon: ArrowUpRight, description: 'VLESS/VMess/Trojan 代理节点拨号与握手' },
    { value: 'observatory', label: '节点测速', icon: Zap, description: '自动节点延迟检测与健康状态探针' },
    { value: 'system', label: '系统内核', icon: Shield, description: 'Xray 核心进程启动与警告异常' },
    { value: 'general', label: '常规日志', icon: Terminal, description: '其他一般系统运行状态日志' },
  ];

  return (
    <div className="space-y-4 h-full flex flex-col relative">
      {/* Toast Notification */}
      {saveSuccessToast && (
        <div className="fixed top-6 right-6 z-[100] bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-top-3 duration-200 backdrop-blur-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{saveSuccessToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Terminal className="w-5 h-5 text-blue-400" />
            <span>实时日志分析</span>
          </h2>
          <p className="text-xs text-slate-400">
            全模块解析域名目标与链路，自动过滤聚合短时间内重复频发日志
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Aggregate Duplicates Toggle Button */}
          <button
            onClick={() => setAggregateDuplicates(!aggregateDuplicates)}
            title={aggregateDuplicates ? '点击停用重复日志合并（展示完整逐行日志）' : '点击启用重复日志合并（聚合频繁重复连接）'}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              aggregateDuplicates
                ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-400 border-white/10'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>{aggregateDuplicates ? '已合并重复日志' : '未合并重复'}</span>
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-white/10 text-xs">
            <button
              onClick={() => setViewMode('parsed')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                viewMode === 'parsed'
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              结构化明细
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                viewMode === 'raw'
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              控制台输出
            </button>
          </div>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              autoScroll ? 'bg-blue-600/30 text-blue-300 border-blue-500/40' : 'bg-slate-900 text-slate-400 border-white/10'
            }`}
          >
            {autoScroll ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{autoScroll ? '暂停滚屏' : '自动滚屏'}</span>
          </button>

          <button
            onClick={clearLogs}
            title="清空日志缓冲区"
            className="p-2 rounded-xl bg-slate-900 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-white/10 transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metric Cards Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 font-medium">缓冲区日志</div>
            <div className="text-lg font-bold text-white font-mono flex items-center gap-1.5">
              <span>{displayLogs.length}</span>
              {aggregateDuplicates && totalCount !== displayLogs.length && (
                <span className="text-[10px] text-slate-400 font-normal">({totalCount} 条原始)</span>
              )}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400">
            <Terminal className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 font-medium">请求连接</div>
            <div className="text-lg font-bold text-cyan-300 font-mono">{connectionCount}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400">
            <Network className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 font-medium">路由与DNS</div>
            <div className="text-lg font-bold text-purple-300 font-mono">{routerAndDnsCount}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20 text-purple-400">
            <Route className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 font-medium">节点与测速</div>
            <div className="text-lg font-bold text-amber-300 font-mono">{proxyAndProbeCount}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-400">
            <Zap className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 font-medium">异常与警告</div>
            <div className="text-lg font-bold text-rose-400 font-mono">{warningOrErrorCount}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/20 text-rose-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-white/5">
        {/* Search */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-white/10 w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="搜索域名、链路节点、IP、规则或关键字..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none w-full font-mono"
          />
        </div>

        {/* Filters Right Group */}
        <div className="flex flex-wrap items-center gap-3 text-xs w-full sm:w-auto">
          {/* Category CustomSelect Dropdown (Rule 5 Compliance) */}
          <div className="w-48">
            <CustomSelect
              value={categoryFilter}
              onChange={(val) => setCategoryFilter(val)}
              options={categoryOptions}
              placeholder="选择日志类别"
              accentColor="blue"
              size="sm"
            />
          </div>

          {/* Level Filter Pill Group */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/10">
            {[
              { id: 'all', label: '全部' },
              { id: 'info', label: '提示' },
              { id: 'warning', label: '警告' },
              { id: 'error', label: '错误' },
              { id: 'debug', label: '调试' },
            ].map((lvl) => (
              <button
                key={lvl.id}
                onClick={() => setLogLevel(lvl.id)}
                className={`px-2.5 py-1 rounded-lg font-medium text-xs transition-all cursor-pointer ${
                  logLevel === lvl.id
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {lvl.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        ref={logContainerRef}
        className="glass-card flex-1 min-h-[420px] rounded-2xl p-4 font-mono text-xs overflow-y-auto border border-white/10 bg-slate-950/90 shadow-inner custom-scrollbar"
      >
        {displayLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2 py-12">
            <Terminal className="w-8 h-8 opacity-40" />
            <span>暂无符合条件的运行日志记录</span>
          </div>
        ) : viewMode === 'parsed' ? (
          /* Parsed Structured Log Cards List */
          <div className="space-y-2.5">
            {displayLogs.map((log) => {
              const catBadge = getCategoryBadge(log.category);
              const CatIcon = catBadge.icon;

              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="group bg-slate-900/70 hover:bg-slate-800/90 border border-white/5 hover:border-blue-500/30 rounded-xl p-3.5 transition-all duration-200 cursor-pointer shadow-sm relative overflow-hidden"
                >
                  {/* Top Bar: Timestamp & Level & Category & Action & Repeat Count */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2 mb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-500 text-[11px] font-mono select-none">
                        {log.lastTimestamp && log.lastTimestamp !== log.timestamp
                          ? `${log.timestamp} ~ ${log.lastTimestamp}`
                          : log.timestamp}
                      </span>

                      {/* Level Badge */}
                      <span
                        className={`uppercase font-bold text-[10px] px-2 py-0.5 rounded-md border ${getLevelBadgeClass(
                          log.level
                        )}`}
                      >
                        {log.level}
                      </span>

                      {/* Category Badge */}
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-md border flex items-center gap-1 ${catBadge.color}`}
                      >
                        <CatIcon className="w-3 h-3" />
                        <span>{catBadge.label}</span>
                      </span>

                      {/* Action Badge */}
                      {log.action && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                          {log.action}
                        </span>
                      )}

                      {/* Repeat Count Badge */}
                      {log.repeatCount > 1 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 flex items-center gap-1 shadow-sm animate-pulse">
                          <Repeat className="w-3 h-3 text-indigo-400" />
                          <span>重复 {log.repeatCount} 次</span>
                        </span>
                      )}

                      {/* Rule Badge if available */}
                      {log.rule && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-950 text-purple-300 border border-purple-500/30">
                          规则: {log.rule}
                        </span>
                      )}
                    </div>

                    {/* Action Buttons Right */}
                    <div className="flex items-center gap-2">
                      {/* Modify Route Rule Action Button */}
                      {(log.domain || log.target) && (
                        <button
                          onClick={(e) => handleOpenRuleModal(log, e)}
                          title="针对此域名快捷修改分流路由规则"
                          className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 flex items-center gap-1 text-[11px] font-medium transition-all shadow-sm cursor-pointer"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>修改路由</span>
                        </button>
                      )}

                      <div className="flex items-center gap-1 text-[11px] text-slate-500 group-hover:text-blue-400 transition-colors">
                        <span>查看明细</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>

                  {/* Main Structured Info: Domain & Chain */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                    {/* Domain & Target Block */}
                    <div className="flex items-center gap-2 min-w-0">
                      {log.protocol && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-950 text-cyan-400 border border-cyan-500/30 shrink-0">
                          {log.protocol}
                        </span>
                      )}
                      {log.domain ? (
                        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                          <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="font-semibold text-blue-200 truncate" title={log.domain}>
                            {log.domain}
                          </span>
                          {log.port && <span className="text-slate-400 text-[11px] shrink-0">:{log.port}</span>}
                        </div>
                      ) : (
                        <span className="text-slate-300 font-sans text-xs break-all line-clamp-1">
                          {log.shortSummary || log.message}
                        </span>
                      )}
                    </div>

                    {/* Routing Chain Flow Block */}
                    <div className="flex items-center justify-start md:justify-end gap-1.5 overflow-x-auto custom-scrollbar py-0.5">
                      {log.chain && log.chain.length > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-normal">链路:</span>
                          {log.chain.map((step, idx) => (
                            <React.Fragment key={idx}>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 whitespace-nowrap shadow-sm">
                                {step}
                              </span>
                              {idx < log.chain!.length - 1 && (
                                <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      ) : log.outbound ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">出站:</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-950 text-slate-300 border border-white/10">
                            {log.outbound}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Raw Terminal View */
          <div className="space-y-1">
            {displayLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 hover:bg-white/5 p-1 rounded transition-colors">
                <span className="text-slate-500 select-none">{log.timestamp}</span>
                <span
                  className={`uppercase font-bold text-[10px] px-1.5 py-0.5 rounded border select-none ${getLevelBadgeClass(
                    log.level
                  )}`}
                >
                  {log.level}
                </span>
                {log.repeatCount > 1 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                    x{log.repeatCount}
                  </span>
                )}
                <span className="text-slate-200 break-all">{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Edit Routing Rule Modal */}
      {ruleEditingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="glass-card w-full max-w-lg rounded-2xl border border-white/10 p-6 space-y-5 shadow-2xl relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-base">修改域名分流路由规则</h3>
              </div>
              <button
                onClick={() => setRuleEditingLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Domain Highlight Box */}
            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-blue-500/30 space-y-2">
              <div className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">当前检测到的日志目标域名</div>
              <div className="font-bold text-white text-sm font-mono flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400 shrink-0" />
                <span>{ruleEditingLog.domain || ruleEditingLog.target || 'pms.topode.com'}</span>
              </div>
              {ruleEditingLog.chain && ruleEditingLog.chain.length > 0 && (
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1 border-t border-white/5">
                  <span>现有日志链路:</span>
                  <span className="text-indigo-300 font-mono">{ruleEditingLog.chain.join(' ➔ ')}</span>
                </div>
              )}
            </div>

            {/* Block Explanation Banner */}
            {(ruleEditingLog.outbound === 'block' ||
              ruleEditingLog.chain?.includes('block') ||
              ruleEditingLog.chain?.includes('阻断拦截')) && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-[11px] text-amber-300 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-amber-200">为什么现有日志链路显示为 block (阻断)？</div>
                  <div className="text-[10px] text-amber-300/80 leading-relaxed font-sans">
                    该域名（包含于内置 <code>geosite:category-ads-all</code>）属于数据统计与广告追踪域名，在内置标准分流规则中默认被黑洞 (block) 拦截。选择下方【直连】并保存后，新规则将高优先级生效，立即解除拦截放行！
                  </div>
                </div>
              </div>
            )}

            {/* Match Strategy Options */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">选择域名匹配匹配策略</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleDomainTypeChange('root', ruleEditingLog)}
                  className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    domainRuleType === 'root'
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-md shadow-blue-500/10 font-bold'
                      : 'bg-slate-900/60 border-white/5 text-slate-400 hover:bg-white/5'
                  }`}
                >
                  <span>全主域匹配</span>
                  <span className="text-[10px] text-slate-500 font-mono font-normal">domain:</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDomainTypeChange('full', ruleEditingLog)}
                  className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    domainRuleType === 'full'
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-md shadow-blue-500/10 font-bold'
                      : 'bg-slate-900/60 border-white/5 text-slate-400 hover:bg-white/5'
                  }`}
                >
                  <span>完全匹配</span>
                  <span className="text-[10px] text-slate-500 font-mono font-normal">full:</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDomainTypeChange('custom', ruleEditingLog)}
                  className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    domainRuleType === 'custom'
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-md shadow-blue-500/10 font-bold'
                      : 'bg-slate-900/60 border-white/5 text-slate-400 hover:bg-white/5'
                  }`}
                >
                  <span>普通匹配</span>
                  <span className="text-[10px] text-slate-500 font-mono font-normal">包含关键词</span>
                </button>
              </div>
            </div>

            {/* Input rule string */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">生成的分流规则表达式</label>
              <input
                type="text"
                value={targetDomainRule}
                onChange={(e) => setTargetDomainRule(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-blue-300 focus:outline-none focus:border-blue-500/70"
              />
            </div>

            {/* Target Outbound Selector using OutboundSelect (Rule 5 Compliance) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">调整目标出站策略 / 节点</label>
              <OutboundSelect
                value={targetOutbound}
                onChange={(val) => setTargetOutbound(val)}
                proxyGroups={proxyGroups}
                allNodes={allNodes}
                size="md"
                fullWidth
              />
            </div>

            {/* Description Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">规则备注说明</label>
              <input
                type="text"
                value={ruleDescription}
                onChange={(e) => setRuleDescription(e.target.value)}
                placeholder="请输入规则备注..."
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/70"
              />
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setRuleEditingLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-white/10 text-slate-400 text-xs font-medium transition-colors cursor-pointer"
              >
                取消
              </button>

              <button
                type="button"
                onClick={handleSaveRuleForLog}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>保存并更新内核路由</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Detail Drawer Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="glass-card w-full max-w-xl rounded-2xl border border-white/10 p-6 space-y-4 shadow-2xl relative">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Maximize2 className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-base">日志结构化全貌与链路拓扑</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Details Content */}
            <div className="space-y-3 font-mono text-xs text-slate-300">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                  <div className="text-[10px] text-slate-400 font-sans">生成与持续时间</div>
                  <div className="font-bold text-white mt-0.5">
                    {selectedLog.lastTimestamp && selectedLog.lastTimestamp !== selectedLog.timestamp
                      ? `${selectedLog.timestamp} ~ ${selectedLog.lastTimestamp}`
                      : selectedLog.timestamp}
                  </div>
                </div>

                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                  <div className="text-[10px] text-slate-400 font-sans">日志级别 / 累计出现</div>
                  <div className="font-bold uppercase text-white mt-0.5 flex items-center gap-2">
                    <span>{selectedLog.level}</span>
                    {selectedLog.repeatCount > 1 && (
                      <span className="text-[10px] text-indigo-300 bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-500/30">
                        累计 {selectedLog.repeatCount} 次
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Domain Block */}
              {selectedLog.domain && (
                <div className="bg-slate-900/80 p-3 rounded-xl border border-blue-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] text-blue-400 font-semibold flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5" />
                      <span>目标域名与地址</span>
                    </div>

                    <button
                      onClick={(e) => {
                        const logToEdit = selectedLog;
                        setSelectedLog(null);
                        handleOpenRuleModal(logToEdit, e);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>快捷修改分流路由</span>
                    </button>
                  </div>

                  <div className="font-bold text-blue-200 text-sm break-all flex items-center gap-2">
                    <span>{selectedLog.domain}</span>
                    {selectedLog.port && (
                      <span className="text-xs text-slate-400 font-normal">(端口: {selectedLog.port})</span>
                    )}
                  </div>
                </div>
              )}

              {/* Routing Chain Block */}
              {selectedLog.chain && selectedLog.chain.length > 0 && (
                <div className="bg-slate-900/80 p-3 rounded-xl border border-indigo-500/20 space-y-2">
                  <div className="text-[10px] text-indigo-400 font-semibold flex items-center gap-1">
                    <Route className="w-3.5 h-3.5" />
                    <span>出站路由链路拓扑</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedLog.chain.map((step, idx) => (
                      <React.Fragment key={idx}>
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-950 text-indigo-200 border border-indigo-500/40 font-bold text-xs shadow-sm">
                          {step}
                        </span>
                        {idx < selectedLog.chain!.length - 1 && (
                          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {selectedLog.rule && (
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                  <div className="text-[10px] text-slate-400">命中路由规则</div>
                  <div className="font-bold text-purple-300 mt-0.5">{selectedLog.rule}</div>
                </div>
              )}

              {selectedLog.source && (
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                  <div className="text-[10px] text-slate-400">客户端源地址</div>
                  <div className="font-bold text-slate-200 mt-0.5">{selectedLog.source}</div>
                </div>
              )}

              {/* Raw Message Box */}
              <div className="bg-slate-950 p-3 rounded-xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>完整原始日志消息</span>
                  <button
                    onClick={() => handleCopyLog(selectedLog.message)}
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                  >
                    {copiedText ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedText ? '已复制' : '复制文本'}</span>
                  </button>
                </div>
                <div className="break-all text-slate-200 font-mono text-[11px] leading-relaxed max-h-40 overflow-y-auto custom-scrollbar">
                  {selectedLog.message}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
