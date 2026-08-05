import React, { useState, useEffect } from 'react';
import { X, Save, Eye, Code2, AlertCircle, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { CustomSelect } from '../../components/CustomSelect';
import { ToggleSwitch } from '../../components/ToggleSwitch';
import { FieldLabel } from '../../components/FieldLabel';

interface DnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialValue?: any;
  onSave: (val: any) => void;
}

/* ── option lists ── */
const QUERY_STRATEGY_OPTIONS = [
  { value: 'UseIP', label: 'UseIP', description: '同时查询 A + AAAA 记录' },
  { value: 'UseIPv4', label: 'UseIPv4', description: '仅查询 A 记录' },
  { value: 'UseIPv6', label: 'UseIPv6', description: '仅查询 AAAA 记录' },
  { value: 'UseSystem', label: 'UseSystem', description: '自适应操作系统网络环境' },
];

const SERVER_QUERY_STRATEGY_OPTIONS = [
  { value: '', label: '继承全局', description: '不单独指定，使用全局 queryStrategy' },
  { value: 'UseIP', label: 'UseIP', description: '同时查询 A + AAAA' },
  { value: 'UseIPv4', label: 'UseIPv4', description: '仅查询 A 记录' },
  { value: 'UseIPv6', label: 'UseIPv6', description: '仅查询 AAAA 记录' },
  { value: 'UseSystem', label: 'UseSystem', description: '自适应系统网络' },
];

/* ── types ── */
interface HostEntry { domain: string; address: string }
interface ServerEntry {
  address: string;
  port: string;
  domains: string;
  expectedIPs: string;
  unexpectedIPs: string;
  skipFallback: boolean;
  finalQuery: boolean;
  tag: string;
  clientIP: string;
  queryStrategy: string;
  disableCache: boolean;
  serveStale: boolean;
  serveExpiredTTL: string;
  timeoutMs: string;
  /** true = DnsServerObject, false = plain string */
  isObject: boolean;
}

const emptyServer = (): ServerEntry => ({
  address: '', port: '', domains: '', expectedIPs: '', unexpectedIPs: '',
  skipFallback: false, finalQuery: false, tag: '', clientIP: '',
  queryStrategy: '', disableCache: false, serveStale: false,
  serveExpiredTTL: '', timeoutMs: '', isObject: false,
});

/* ── helpers ── */
const inputCls = 'w-full px-3 py-1.5 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 font-mono';
const labelCls = 'block text-xs font-medium text-slate-400 mb-1';

function parseServers(raw: any[]): ServerEntry[] {
  return raw.map((s: any) => {
    if (typeof s === 'string') {
      return { ...emptyServer(), address: s, isObject: false };
    }
    if (s && typeof s === 'object') {
      return {
        address: s.address || '',
        port: s.port != null ? String(s.port) : '',
        domains: Array.isArray(s.domains) ? s.domains.join('\n') : '',
        expectedIPs: Array.isArray(s.expectedIPs) ? s.expectedIPs.join('\n') : '',
        unexpectedIPs: Array.isArray(s.unexpectedIPs) ? s.unexpectedIPs.join('\n') : '',
        skipFallback: !!s.skipFallback,
        finalQuery: !!s.finalQuery,
        tag: s.tag || '',
        clientIP: s.clientIP || '',
        queryStrategy: s.queryStrategy || '',
        disableCache: !!s.disableCache,
        serveStale: !!s.serveStale,
        serveExpiredTTL: s.serveExpiredTTL != null ? String(s.serveExpiredTTL) : '',
        timeoutMs: s.timeoutMs != null ? String(s.timeoutMs) : '',
        isObject: true,
      };
    }
    return { ...emptyServer(), address: String(s) };
  });
}

function parseHosts(raw: any): HostEntry[] {
  if (!raw || typeof raw !== 'object') return [];
  return Object.entries(raw).map(([domain, address]) => ({
    domain,
    address: Array.isArray(address) ? address.join(', ') : String(address),
  }));
}

/* ── build output ── */
function buildConfigObject(
  servers: ServerEntry[],
  hosts: HostEntry[],
  queryStrategy: string,
  clientIp: string,
  disableCache: boolean,
  serveStale: boolean,
  serveExpiredTTL: string,
  disableFallback: boolean,
  disableFallbackIfMatch: boolean,
  enableParallelQuery: boolean,
  useSystemHosts: boolean,
  tag: string,
  initialValue: any,
): any {
  const base = typeof initialValue === 'object' && initialValue ? { ...initialValue } : {};

  // hosts
  const hostsObj: Record<string, any> = {};
  hosts.forEach(h => {
    const d = h.domain.trim();
    if (!d) return;
    const parts = h.address.split(',').map(a => a.trim()).filter(Boolean);
    hostsObj[d] = parts.length === 1 ? parts[0] : parts;
  });

  // servers
  const serversArr = servers.map(s => {
    const addr = s.address.trim();
    if (!s.isObject) return addr || 'localhost';
    const obj: any = { address: addr };
    if (s.port) obj.port = Number(s.port);
    const doms = s.domains.split('\n').map(l => l.trim()).filter(Boolean);
    if (doms.length) obj.domains = doms;
    const expIPs = s.expectedIPs.split('\n').map(l => l.trim()).filter(Boolean);
    if (expIPs.length) obj.expectedIPs = expIPs;
    const unIPs = s.unexpectedIPs.split('\n').map(l => l.trim()).filter(Boolean);
    if (unIPs.length) obj.unexpectedIPs = unIPs;
    if (s.skipFallback) obj.skipFallback = true;
    if (s.finalQuery) obj.finalQuery = true;
    if (s.tag.trim()) obj.tag = s.tag.trim();
    if (s.clientIP.trim()) obj.clientIP = s.clientIP.trim();
    if (s.queryStrategy) obj.queryStrategy = s.queryStrategy;
    if (s.disableCache) obj.disableCache = true;
    if (s.serveStale) obj.serveStale = true;
    if (s.serveExpiredTTL) obj.serveExpiredTTL = Number(s.serveExpiredTTL);
    if (s.timeoutMs) obj.timeoutMs = Number(s.timeoutMs);
    return obj;
  }).filter(Boolean);

  const result: any = { ...base };
  if (Object.keys(hostsObj).length > 0) result.hosts = hostsObj;
  else delete result.hosts;
  result.servers = serversArr;
  result.queryStrategy = queryStrategy;
  if (clientIp.trim()) result.clientIp = clientIp.trim(); else delete result.clientIp;
  result.disableCache = disableCache;
  result.serveStale = serveStale;
  if (serveExpiredTTL) result.serveExpiredTTL = Number(serveExpiredTTL); else delete result.serveExpiredTTL;
  result.disableFallback = disableFallback;
  result.disableFallbackIfMatch = disableFallbackIfMatch;
  result.enableParallelQuery = enableParallelQuery;
  result.useSystemHosts = useSystemHosts;
  if (tag.trim()) result.tag = tag.trim(); else delete result.tag;
  return result;
}

/* ── component ── */
export const DnsModal: React.FC<DnsModalProps> = ({ isOpen, onClose, initialValue, onSave }) => {
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');
  const [rawJsonText, setRawJsonText] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // global fields
  const [queryStrategy, setQueryStrategy] = useState('UseIP');
  const [clientIp, setClientIp] = useState('');
  const [disableCache, setDisableCache] = useState(false);
  const [serveStale, setServeStale] = useState(false);
  const [serveExpiredTTL, setServeExpiredTTL] = useState('');
  const [disableFallback, setDisableFallback] = useState(false);
  const [disableFallbackIfMatch, setDisableFallbackIfMatch] = useState(false);
  const [enableParallelQuery, setEnableParallelQuery] = useState(false);
  const [useSystemHosts, setUseSystemHosts] = useState(false);
  const [tag, setTag] = useState('');

  // hosts
  const [hosts, setHosts] = useState<HostEntry[]>([]);
  // servers
  const [servers, setServers] = useState<ServerEntry[]>([]);
  const [expandedServer, setExpandedServer] = useState<number | null>(null);

  /* ── load ── */
  useEffect(() => {
    if (!isOpen) return;
    const val = initialValue || { servers: ['1.1.1.1', '223.5.5.5'], queryStrategy: 'UseIP' };
    setQueryStrategy(val.queryStrategy || 'UseIP');
    setClientIp(val.clientIp || '');
    setDisableCache(!!val.disableCache);
    setServeStale(!!val.serveStale);
    setServeExpiredTTL(val.serveExpiredTTL != null ? String(val.serveExpiredTTL) : '');
    setDisableFallback(!!val.disableFallback);
    setDisableFallbackIfMatch(!!val.disableFallbackIfMatch);
    setEnableParallelQuery(!!val.enableParallelQuery);
    setUseSystemHosts(!!val.useSystemHosts);
    setTag(val.tag || '');
    setHosts(parseHosts(val.hosts));
    setServers(Array.isArray(val.servers) && val.servers.length > 0 ? parseServers(val.servers) : [{ ...emptyServer(), address: '1.1.1.1', isObject: false }, { ...emptyServer(), address: '223.5.5.5', isObject: false }]);
    setRawJsonText(JSON.stringify(val, null, 2));
    setJsonError(null);
    setViewMode('visual');
    setExpandedServer(null);
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  /* ── hosts CRUD ── */
  const addHost = () => setHosts([...hosts, { domain: '', address: '' }]);
  const removeHost = (i: number) => setHosts(hosts.filter((_, idx) => idx !== i));
  const updateHost = (i: number, field: keyof HostEntry, val: string) => {
    const next = [...hosts];
    next[i] = { ...next[i], [field]: val };
    setHosts(next);
  };

  /* ── servers CRUD ── */
  const addServer = (isObject: boolean) => {
    const s = emptyServer();
    s.isObject = isObject;
    s.address = isObject ? '' : '8.8.8.8';
    setServers([...servers, s]);
    if (isObject) setExpandedServer(servers.length);
  };
  const removeServer = (i: number) => {
    setServers(servers.filter((_, idx) => idx !== i));
    if (expandedServer === i) setExpandedServer(null);
  };
  const updateServer = (i: number, field: keyof ServerEntry, val: any) => {
    const next = [...servers];
    next[i] = { ...next[i], [field]: val };
    setServers(next);
  };
  const toggleServerType = (i: number) => {
    updateServer(i, 'isObject', !servers[i].isObject);
  };

  /* ── save ── */
  const handleSave = () => {
    if (viewMode === 'json') {
      try {
        const parsed = JSON.parse(rawJsonText);
        onSave(parsed);
        onClose();
      } catch (err: any) {
        setJsonError(`JSON 语法解析错误: ${err.message}`);
      }
    } else {
      const obj = buildConfigObject(servers, hosts, queryStrategy, clientIp, disableCache, serveStale, serveExpiredTTL, disableFallback, disableFallbackIfMatch, enableParallelQuery, useSystemHosts, tag, initialValue);
      onSave(obj);
      onClose();
    }
  };

  const switchToJson = () => {
    if (viewMode === 'visual') {
      const obj = buildConfigObject(servers, hosts, queryStrategy, clientIp, disableCache, serveStale, serveExpiredTTL, disableFallback, disableFallbackIfMatch, enableParallelQuery, useSystemHosts, tag, initialValue);
      setRawJsonText(JSON.stringify(obj, null, 2));
    }
    setViewMode('json');
  };

  /* ── toggle row helper ── */
  const ToggleRow = ({ label, checked, onChange, desc }: { label: React.ReactNode; checked: boolean; onChange: () => void; desc?: string }) => (
    <div className="flex items-center justify-between py-1.5">
      <div>
        <span className="text-xs text-slate-200">{label}</span>
        {desc && <p className="text-[10px] text-slate-500 mt-0.5">{desc}</p>}
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} size="sm" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900/98 border border-white/10 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/40 shrink-0">
          <h3 className="font-semibold text-lg text-white">配置 DNS 模块</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-800/80 border border-white/10 rounded-lg p-0.5">
              <button type="button" onClick={() => setViewMode('visual')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === 'visual' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>
                <Eye className="w-3.5 h-3.5" />可视化结构
              </button>
              <button type="button" onClick={switchToJson} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === 'json' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>
                <Code2 className="w-3.5 h-3.5" />JSON 源码
              </button>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {jsonError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /><span>{jsonError}</span>
            </div>
          )}

          {viewMode === 'visual' ? (
            <>
              {/* ─── 全局查询策略 ─── */}
              <section>
                <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full bg-blue-500" />全局设置
                </h4>
                <div className="space-y-3 bg-slate-800/30 border border-white/5 rounded-xl p-4">
                  <div>
                    <label className={labelCls}><FieldLabel label="查询策略" tip="DNS 查询的 IP 记录策略。UseIP 同时查询 A+AAAA，UseIPv4 仅 A 记录，UseIPv6 仅 AAAA 记录。" /></label>
                    <CustomSelect options={QUERY_STRATEGY_OPTIONS} value={queryStrategy} onChange={setQueryStrategy} accentColor="blue" />
                  </div>
                  <div>
                    <label className={labelCls}><FieldLabel label="EDNS Client Subnet IP" tip="向 DNS 服务器发送的客户端子网 IP，用于 EDNS Client Subnet 扩展，可影响 CDN 调度结果。" /></label>
                    <input type="text" value={clientIp} onChange={e => setClientIp(e.target.value)} placeholder="如 1.2.3.4（留空则不设置）" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}><FieldLabel label="入站标识" tip="指定 DNS 查询流量应经过的入站 Tag，用于路由分流 DNS 流量。" /></label>
                    <input type="text" value={tag} onChange={e => setTag(e.target.value)} placeholder="DNS 查询流量的入站标识（留空则不设置）" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}><FieldLabel label="乐观缓存有效期（秒）" tip="设置 DNS 缓存过期后仍可返回旧记录的时间（秒），配合 serveStale 使用可减少 DNS 查询延迟。" /></label>
                    <input type="number" value={serveExpiredTTL} onChange={e => setServeExpiredTTL(e.target.value)} placeholder="0 = 永不过期（留空则不设置）" className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 divide-x divide-white/5">
                    <div className="space-y-0.5">
                      <ToggleRow label={<FieldLabel label="禁用缓存" tip="开启后将不缓存任何 DNS 查询结果，每次请求都会重新解析。" />} checked={disableCache} onChange={() => setDisableCache(!disableCache)} />
                      <ToggleRow label={<FieldLabel label="乐观缓存" tip="允许返回已过期的缓存记录，同时在后台刷新该记录，减少用户感知延迟。" />} checked={serveStale} onChange={() => setServeStale(!serveStale)} desc="返回陈旧记录并后台刷新" />
                      <ToggleRow label={<FieldLabel label="禁用 Fallback" tip="禁用 DNS Fallback 机制。正常情况下当首选 DNS 无结果时会尝试 Fallback 服务器。" />} checked={disableFallback} onChange={() => setDisableFallback(!disableFallback)} />
                    </div>
                    <div className="pl-6 space-y-0.5">
                      <ToggleRow label={<FieldLabel label="命中时禁用 Fallback" tip="当非 Fallback 服务器返回了有效结果后，不再等待 Fallback 服务器响应，加速 DNS 解析。" />} checked={disableFallbackIfMatch} onChange={() => setDisableFallbackIfMatch(!disableFallbackIfMatch)} />
                      <ToggleRow label={<FieldLabel label="并行查询" tip="启用并行查询模式，DNS 请求会按服务器分组，组内竞速查询、组间顺序回退。" />} checked={enableParallelQuery} onChange={() => setEnableParallelQuery(!enableParallelQuery)} desc="动态分组，组内竞速，组间回退" />
                      <ToggleRow label={<FieldLabel label="使用系统 Hosts" tip="启用后将读取操作系统 /etc/hosts 文件中的域名映射条目。" />} checked={useSystemHosts} onChange={() => setUseSystemHosts(!useSystemHosts)} />
                    </div>
                  </div>
                </div>
              </section>

              {/* ─── Hosts 映射 ─── */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <span className="w-1 h-4 rounded-full bg-emerald-500" />静态 Hosts 映射
                  </h4>
                  <button type="button" onClick={addHost} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium"><Plus className="w-3.5 h-3.5" />添加映射</button>
                </div>
                {hosts.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">暂无 Hosts 映射条目</p>
                ) : (
                  <div className="space-y-2">
                    {hosts.map((h, i) => (
                      <div key={i} className="flex items-start gap-2 bg-slate-800/30 border border-white/5 rounded-xl p-3">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div>
                            <label className={labelCls}><FieldLabel label="域名" tip="要映射的域名，支持 domain:、regexp:、full:、geosite: 等前缀格式。" /></label>
                            <input type="text" value={h.domain} onChange={e => updateHost(i, 'domain', e.target.value)} placeholder="如 baidu.com 或 domain:xray.com" className={inputCls} />
                          </div>
                          <div>
                            <label className={labelCls}><FieldLabel label="地址" tip="域名对应的 IP 地址或 CNAME 域名，多个值用逗号分隔。" /></label>
                            <input type="text" value={h.address} onChange={e => updateHost(i, 'address', e.target.value)} placeholder="IP 或域名，多个用逗号分隔" className={inputCls} />
                          </div>
                        </div>
                        <button type="button" onClick={() => removeHost(i)} className="p-2 mt-5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* ─── DNS 服务器 ─── */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <span className="w-1 h-4 rounded-full bg-purple-500" />DNS 服务器
                  </h4>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => addServer(false)} className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 font-medium"><Plus className="w-3.5 h-3.5" />简单地址</button>
                    <button type="button" onClick={() => addServer(true)} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium"><Plus className="w-3.5 h-3.5" />高级配置</button>
                  </div>
                </div>

                <div className="space-y-2">
                  {servers.map((srv, idx) => (
                    <div key={idx} className="bg-slate-800/30 border border-white/5 rounded-xl overflow-hidden">
                      {/* header row */}
                      <div className="flex items-center gap-2 px-3 py-2">
                        {srv.isObject ? (
                          <button type="button" onClick={() => setExpandedServer(expandedServer === idx ? null : idx)} className="p-0.5 text-slate-400 hover:text-white transition-colors">
                            {expandedServer === idx ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        ) : <span className="w-5" />}
                        <input
                          type="text"
                          value={srv.address}
                          onChange={e => updateServer(idx, 'address', e.target.value)}
                          placeholder={srv.isObject ? '如 https://dns.google/dns-query' : '如 8.8.8.8 或 localhost'}
                          className="flex-1 px-3 py-1.5 bg-slate-950/60 border border-white/10 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 font-mono"
                        />
                        <button type="button" onClick={() => toggleServerType(idx)} className="px-2 py-1 text-[10px] rounded-md border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-colors whitespace-nowrap" title="切换简单/高级模式">
                          {srv.isObject ? '切为简单' : '切为高级'}
                        </button>
                        <button type="button" onClick={() => removeServer(idx)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>

                      {/* expanded details */}
                      {srv.isObject && expandedServer === idx && (
                        <div className="px-3 pb-3 space-y-3 border-t border-white/5 pt-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className={labelCls}><FieldLabel label="端口" tip="DNS 服务器的查询端口，默认 53。DoH/DoT 等加密协议通常使用 443 或 853。" /></label>
                              <input type="number" value={srv.port} onChange={e => updateServer(idx, 'port', e.target.value)} placeholder="默认 53" className={inputCls} />
                            </div>
                            <div>
                              <label className={labelCls}><FieldLabel label="查询策略" tip="此 DNS 服务器的 IP 查询策略，留空则继承全局 queryStrategy 设置。" /></label>
                              <CustomSelect options={SERVER_QUERY_STRATEGY_OPTIONS} value={srv.queryStrategy} onChange={v => updateServer(idx, 'queryStrategy', v)} accentColor="purple" size="sm" />
                            </div>
                          </div>
                          <div>
                            <label className={labelCls}><FieldLabel label="优先匹配域名" tip="指定此服务器优先处理的域名列表，每行一个。支持 geosite:、domain: 等前缀。仅匹配这些域名的查询才会发往此服务器。" /></label>
                            <textarea value={srv.domains} onChange={e => updateServer(idx, 'domains', e.target.value)} placeholder={"如:\ngeosite:netflix\ndomain:xray.com"} rows={2} className={`${inputCls} resize-y`} />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className={labelCls}><FieldLabel label="期望 IP" tip="期望此 DNS 服务器返回的 IP 列表（每行一个）。若返回的 IP 不在期望列表中，该结果将被丢弃。支持 geoip: 前缀。" /></label>
                              <textarea value={srv.expectedIPs} onChange={e => updateServer(idx, 'expectedIPs', e.target.value)} placeholder="如 geoip:cn" rows={2} className={`${inputCls} resize-y`} />
                            </div>
                            <div>
                              <label className={labelCls}><FieldLabel label="排除 IP" tip="不期望此 DNS 服务器返回的 IP 列表（每行一个）。若返回的 IP 在排除列表中，该结果将被丢弃。" /></label>
                              <textarea value={srv.unexpectedIPs} onChange={e => updateServer(idx, 'unexpectedIPs', e.target.value)} placeholder="如 geoip:cloudflare" rows={2} className={`${inputCls} resize-y`} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className={labelCls}><FieldLabel label="客户端 IP" tip="发送 DNS 查询时携带的 EDNS Client Subnet IP，留空则继承全局 clientIp 设置。" /></label>
                              <input type="text" value={srv.clientIP} onChange={e => updateServer(idx, 'clientIP', e.target.value)} placeholder="继承全局" className={inputCls} />
                            </div>
                            <div>
                              <label className={labelCls}><FieldLabel label="入站标识" tip="此 DNS 服务器查询流量的入站标识 Tag，留空则继承全局设置。" /></label>
                              <input type="text" value={srv.tag} onChange={e => updateServer(idx, 'tag', e.target.value)} placeholder="继承全局" className={inputCls} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className={labelCls}><FieldLabel label="超时时间（毫秒）" tip="此 DNS 服务器的查询超时时间（毫秒），默认 4000ms。超时后视为查询失败。" /></label>
                              <input type="number" value={srv.timeoutMs} onChange={e => updateServer(idx, 'timeoutMs', e.target.value)} placeholder="默认 4000" className={inputCls} />
                            </div>
                            <div>
                              <label className={labelCls}><FieldLabel label="乐观缓存有效期（秒）" tip="此服务器的过期缓存保留时间（秒），留空则继承全局 serveExpiredTTL 设置。" /></label>
                              <input type="number" value={srv.serveExpiredTTL} onChange={e => updateServer(idx, 'serveExpiredTTL', e.target.value)} placeholder="继承全局" className={inputCls} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-x-6 divide-x divide-white/5">
                            <div className="space-y-0.5">
                              <ToggleRow label={<FieldLabel label="跳过 Fallback" tip="标记此服务器为跳过 Fallback，在 Fallback 阶段不会被使用。" />} checked={srv.skipFallback} onChange={() => updateServer(idx, 'skipFallback', !srv.skipFallback)} />
                              <ToggleRow label={<FieldLabel label="最终查询" tip="标记此服务器为最终查询服务器。当其他服务器均无结果时，此服务器作为最后尝试，不触发 fallback。" />} checked={srv.finalQuery} onChange={() => updateServer(idx, 'finalQuery', !srv.finalQuery)} desc="此服务器为最终尝试，不触发 fallback" />
                            </div>
                            <div className="pl-6 space-y-0.5">
                              <ToggleRow label={<FieldLabel label="禁用缓存" tip="对此服务器禁用 DNS 缓存，每次查询都直接转发。留空则继承全局设置。" />} checked={srv.disableCache} onChange={() => updateServer(idx, 'disableCache', !srv.disableCache)} desc="继承全局（未设置时）" />
                              <ToggleRow label={<FieldLabel label="乐观缓存" tip="允许此服务器返回过期的缓存记录并后台刷新。" />} checked={srv.serveStale} onChange={() => updateServer(idx, 'serveStale', !srv.serveStale)} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <div className="h-[60vh] border border-white/10 rounded-xl overflow-hidden">
              <Editor height="100%" defaultLanguage="json" theme="vs-dark" value={rawJsonText} onChange={val => setRawJsonText(val || '')} options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false, automaticLayout: true }} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-950/60 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 rounded-xl transition-all font-medium">取消</button>
          <button type="button" onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-600/20 transition-all font-medium">
            <Save className="w-4 h-4" />保存 DNS 配置
          </button>
        </div>
      </div>
    </div>
  );
};
