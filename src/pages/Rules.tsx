import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import type { RoutingRule } from '../types';

const DEFAULT_RULES: RoutingRule[] = [
  {
    id: 'rule-1',
    type: 'field',
    outboundTag: 'direct',
    domain: ['geosite:cn', 'geosite:private', 'domain:baidu.com', 'domain:qq.com'],
    enabled: true,
    description: '国内常见域名与局域网',
  },
  {
    id: 'rule-2',
    type: 'field',
    outboundTag: 'direct',
    ip: ['geoip:cn', 'geoip:private'],
    enabled: true,
    description: '中国大陆 IP 与局域网',
  },
  {
    id: 'rule-3',
    type: 'field',
    outboundTag: 'block',
    domain: ['geosite:category-ads-all'],
    enabled: true,
    description: '全网广告域名拦截',
  },
  {
    id: 'rule-4',
    type: 'field',
    outboundTag: 'proxy',
    domain: ['geosite:google', 'geosite:github', 'geosite:gfw', 'geosite:telegram'],
    enabled: true,
    description: '常用代理域名',
  },
];

export const RulesPage: React.FC = () => {
  const [rules, setRules] = useState<RoutingRule[]>(DEFAULT_RULES);

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const getOutboundBadge = (outbound: string) => {
    switch (outbound) {
      case 'direct':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'block':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">路由与 Geo 规则管理</h2>
          <p className="text-xs text-slate-400">设置基于 geoip.dat 与 geosite.dat 的分流路由规则</p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20">
          <Plus className="w-4 h-4" />
          <span>添加自定义规则</span>
        </button>
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        {rules.map((rule, idx) => (
          <div
            key={rule.id}
            className={`glass-card p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${
              rule.enabled ? 'border-white/10' : 'border-white/5 opacity-50'
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="w-6 h-6 rounded-lg bg-slate-900 border border-white/10 text-slate-400 font-mono text-xs font-bold flex items-center justify-center">
                {idx + 1}
              </span>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase ${getOutboundBadge(rule.outboundTag)}`}>
                    {rule.outboundTag === 'proxy' ? '代理' : rule.outboundTag === 'direct' ? '直连' : '拦截'}
                  </span>
                  <h4 className="text-sm font-bold text-white">{rule.description}</h4>
                </div>

                <div className="flex flex-wrap items-center gap-1 text-[11px] font-mono text-slate-400">
                  {rule.domain &&
                    rule.domain.map((d) => (
                      <span key={d} className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-white/5">
                        {d}
                      </span>
                    ))}
                  {rule.ip &&
                    rule.ip.map((ip) => (
                      <span key={ip} className="px-1.5 py-0.5 rounded bg-slate-900 text-cyan-300 border border-white/5">
                        {ip}
                      </span>
                    ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => toggleRule(rule.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                rule.enabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-900 text-slate-500 border-white/5'
              }`}
            >
              {rule.enabled ? '启用中' : '已禁用'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
