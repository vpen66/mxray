import React from 'react';
import { Database, Edit3, Trash2, Globe, Shield, Wifi, Layers, Ghost, Server, Zap } from 'lucide-react';
import { ToggleSwitch } from '../../components/ToggleSwitch';

interface DnsSectionProps {
  dns: any;
  onEdit: () => void;
  onDelete?: () => void;
  onDeleteServer?: (index: number) => void;
  onToggleServerEnabled?: (index: number) => void;
  enabled?: boolean;
  onToggleEnabled?: () => void;
}

/* ── helpers ── */
type ServerKind = 'doh' | 'dohl' | 'doql' | 'h2c' | 'tcp' | 'tcpl' | 'quic' | 'fakedns' | 'local' | 'udp';

function detectKind(addr: string): ServerKind {
  if (addr === 'localhost') return 'local';
  if (addr === 'fakedns') return 'fakedns';
  if (addr.startsWith('https+local://')) return 'dohl';
  if (addr.startsWith('https://')) return 'doh';
  if (addr.startsWith('h2c://')) return 'h2c';
  if (addr.startsWith('tcp+local://')) return 'tcpl';
  if (addr.startsWith('tcp://')) return 'tcp';
  if (addr.startsWith('quic+local://')) return 'doql';
  if (addr.startsWith('quic://')) return 'quic';
  return 'udp';
}

const KIND_META: Record<ServerKind, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  doh:     { label: 'DOH',     color: 'text-blue-400 bg-blue-500/15 border-blue-500/30',     icon: Shield },
  dohl:    { label: 'DOH-L',   color: 'text-blue-300 bg-blue-500/10 border-blue-400/20',     icon: Shield },
  doql:    { label: 'DOQ-L',   color: 'text-cyan-300 bg-cyan-500/10 border-cyan-400/20',     icon: Zap },
  h2c:     { label: 'H2C',     color: 'text-purple-300 bg-purple-500/10 border-purple-400/20', icon: Layers },
  tcp:     { label: 'TCP',     color: 'text-amber-300 bg-amber-500/10 border-amber-400/20',   icon: Server },
  tcpl:    { label: 'TCP-L',   color: 'text-amber-200 bg-amber-500/10 border-amber-400/20',   icon: Server },
  quic:    { label: 'QUIC',    color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',      icon: Zap },
  fakedns: { label: 'Fake',    color: 'text-pink-400 bg-pink-500/15 border-pink-500/30',      icon: Ghost },
  local:   { label: '本地',    color: 'text-slate-300 bg-slate-500/15 border-slate-500/30',   icon: Wifi },
  udp:     { label: 'UDP',     color: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30', icon: Globe },
};

function extractAddress(srv: any): string {
  if (typeof srv === 'string') return srv;
  return srv?.address || 'unknown';
}

function summarizeServer(srv: any) {
  const addr = extractAddress(srv);
  const kind = detectKind(addr);
  const meta = KIND_META[kind];
  const IconComp = meta.icon;

  // For object servers, extract key info
  const isObj = typeof srv === 'object' && srv !== null;
  const domains: string[] = isObj && Array.isArray(srv.domains) ? srv.domains : [];
  const expectedIPs: string[] = isObj && Array.isArray(srv.expectedIPs) ? srv.expectedIPs : [];
  const skipFallback = isObj && srv.skipFallback;
  const finalQuery = isObj && srv.finalQuery;
  const qs = isObj && srv.queryStrategy;
  const port = isObj && srv.port;

  return { addr, kind, meta, IconComp, isObj, domains, expectedIPs, skipFallback, finalQuery, qs, port };
}

/* ── component ── */
export const DnsSection: React.FC<DnsSectionProps> = ({
  dns,
  onEdit,
  onDelete,
  onDeleteServer,
  onToggleServerEnabled,
  enabled,
  onToggleEnabled,
}) => {
  const servers = Array.isArray(dns?.servers) ? dns.servers : [];
  const hosts = dns?.hosts && typeof dns.hosts === 'object' ? Object.entries(dns.hosts) : [];
  const isEnabled = enabled !== false;

  return (
    <div className={`bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-xl space-y-4 transition-opacity ${isEnabled ? '' : 'opacity-60'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-white">DNS 服务器</h3>
            <p className="text-xs text-slate-400">
              查询策略: <span className="font-mono text-emerald-300">{dns?.queryStrategy || 'UseIP'}</span>
              <span className="mx-1.5 text-slate-600">|</span>
              {servers.length} 个服务器
              {hosts.length > 0 && (
                <>
                  <span className="mx-1.5 text-slate-600">|</span>
                  {hosts.length} 条 Hosts
                </>
              )}
              {dns?.disableCache && <span className="ml-2 text-amber-400/80">无缓存</span>}
              {dns?.enableParallelQuery && <span className="ml-2 text-cyan-400/80">并行查询</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onToggleEnabled && (
            <ToggleSwitch
              checked={isEnabled}
              onChange={onToggleEnabled}
              activeColor="blue"
              size="sm"
              ariaLabel="切换 DNS 配置启用状态"
            />
          )}
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-xl transition-all font-medium"
          >
            <Edit3 className="w-3.5 h-3.5" />
            编辑
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="移除模块"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {servers.map((srv: any, idx: number) => {
          const { addr, meta, IconComp, isObj, domains, expectedIPs, skipFallback, finalQuery, qs, port } = summarizeServer(srv);
          const isSrvEnabled = !isObj || srv.enabled !== false;
          return (
            <div
              key={idx}
              className={`p-3 bg-slate-950/40 border border-white/5 rounded-xl group hover:border-white/10 transition-all ${isSrvEnabled ? '' : 'opacity-50'}`}
            >
              {/* top row: type badge + address + toggle + delete */}
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${meta.color} shrink-0`}>
                  <IconComp className="w-3 h-3" />
                  {meta.label}
                </span>
                <span className="flex-1 truncate text-xs font-mono text-slate-200">
                  {addr}
                  {port ? <span className="text-slate-500">:{port}</span> : null}
                </span>
                {onToggleServerEnabled && isObj && (
                  <ToggleSwitch
                    checked={isSrvEnabled}
                    onChange={() => onToggleServerEnabled(idx)}
                    activeColor="emerald"
                    size="sm"
                    ariaLabel="切换 DNS 服务器启用状态"
                  />
                )}
                {onDeleteServer && (
                  <button
                    type="button"
                    onClick={() => onDeleteServer(idx)}
                    className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                    title="删除此服务器"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* detail tags row */}
              {isObj && (domains.length > 0 || expectedIPs.length > 0 || skipFallback || finalQuery || qs) && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {qs && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                      {qs}
                    </span>
                  )}
                  {domains.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/15 text-purple-300 border border-purple-500/20" title={domains.join(', ')}>
                      {domains.length} 域名规则
                    </span>
                  )}
                  {expectedIPs.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-green-500/15 text-green-300 border border-green-500/20" title={expectedIPs.join(', ')}>
                      期望 IP: {expectedIPs.length}
                    </span>
                  )}
                  {skipFallback && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/20">
                      跳过回退
                    </span>
                  )}
                  {finalQuery && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/15 text-rose-300 border border-rose-500/20">
                      最终查询
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
