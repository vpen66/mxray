import React from 'react';
import { Route, Plus, Edit3, Trash2, ChevronUp, ChevronDown, Settings2, Shuffle } from 'lucide-react';
import { ToggleSwitch } from '../../components/ToggleSwitch';
import { CustomSelect } from '../../components/CustomSelect';

interface RoutingSectionProps {
  routing: any;
  onAddRule: () => void;
  onEditRule: (index: number) => void;
  onDeleteRule: (index: number) => void;
  onToggleRuleEnabled: (index: number) => void;
  onMoveRule?: (index: number, direction: 'up' | 'down') => void;
  onEditDomainStrategy?: (value: string) => void;
  onEditDomainMatcher?: (value: string) => void;
  onAddBalancer?: () => void;
  onEditBalancer?: (index: number) => void;
  onDeleteBalancer?: (index: number) => void;
}

export const RoutingSection: React.FC<RoutingSectionProps> = ({
  routing,
  onAddRule,
  onEditRule,
  onDeleteRule,
  onToggleRuleEnabled,
  onMoveRule,
  onEditDomainStrategy,
  onEditDomainMatcher,
  onAddBalancer,
  onEditBalancer,
  onDeleteBalancer,
}) => {
  const rules = Array.isArray(routing?.rules) ? routing.rules : [];
  const balancers = Array.isArray(routing?.balancers) ? routing.balancers : [];

  const DOMAIN_STRATEGY_OPTIONS = [
    { value: 'AsIs', label: 'AsIs', description: '不解析域名，直接使用目标域名' },
    { value: 'IPIfNonMatch', label: 'IPIfNonMatch', description: '未命中规则时解析 IP 再次匹配' },
    { value: 'IPOnDemand', label: 'IPOnDemand', description: '匹配前先将域名解析为 IP' },
  ];

  const DOMAIN_MATCHER_OPTIONS = [
    { value: '', label: '默认', description: '不指定，使用核心默认值' },
    { value: 'linear', label: 'linear', description: '线性匹配，精确但较慢' },
    { value: 'mph', label: 'mph', description: '最小完美哈希，速度快' },
    { value: 'hybrid', label: 'hybrid', description: '混合模式，兼顾速度与精度' },
  ];

  return (
    <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
            <Route className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-white">路由</h3>
            <p className="text-xs text-slate-400">
              {rules.length} 条规则
              {routing?.domainMatcher && <span className="ml-2 text-cyan-400/80">匹配器: {routing.domainMatcher}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-800/40 border border-white/5 rounded-xl px-3 py-1.5">
            <Settings2 className="w-3.5 h-3.5 text-slate-400" />
            {onEditDomainStrategy && (
              <div className="w-36">
                <CustomSelect
                  options={DOMAIN_STRATEGY_OPTIONS}
                  value={routing?.domainStrategy || 'AsIs'}
                  onChange={onEditDomainStrategy}
                  size="sm"
                  accentColor="purple"
                />
              </div>
            )}
            {onEditDomainMatcher && (
              <div className="w-28">
                <CustomSelect
                  options={DOMAIN_MATCHER_OPTIONS}
                  value={routing?.domainMatcher || ''}
                  onChange={onEditDomainMatcher}
                  size="sm"
                  accentColor="cyan"
                />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onAddRule}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-xl transition-all font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            添加规则
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {rules.map((r: any, idx: number) => {
          const isEnabled = r.enabled !== false;
          const target = r.outboundTag || r.balancerTag || 'direct';
          const domainStr = Array.isArray(r.domain) ? r.domain.join(', ') : r.domain || '';
          const ipStr = Array.isArray(r.ip) ? r.ip.join(', ') : r.ip || '';
          const inboundStr = Array.isArray(r.inboundTag) ? r.inboundTag.join(', ') : r.inboundTag || '';
          const protocolStr = Array.isArray(r.protocol) ? r.protocol.join(', ') : r.protocol || '';

          return (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                isEnabled
                  ? 'bg-slate-950/40 border-white/5 hover:border-white/10'
                  : 'bg-slate-950/20 border-white/5 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex items-center gap-1 shrink-0">
                  {onMoveRule && (
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => onMoveRule(idx, 'up')}
                        disabled={idx === 0}
                        className="p-0.5 rounded text-slate-500 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                        title="上移"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveRule(idx, 'down')}
                        disabled={idx === rules.length - 1}
                        className="p-0.5 rounded text-slate-500 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                        title="下移"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <span className="text-xs font-mono text-slate-500 w-5 text-center shrink-0">
                    {idx + 1}
                  </span>
                </div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">

                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-mono font-medium shrink-0">
                       {target}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400 font-mono truncate">
                    {domainStr && (
                      <span className="truncate">域名: <span className="text-slate-300">{domainStr}</span></span>
                    )}
                    {ipStr && (
                      <span className="truncate">IP: <span className="text-slate-300">{ipStr}</span></span>
                    )}
                    {r.port && (
                      <span className="shrink-0">端口: <span className="text-slate-300">{r.port}</span></span>
                    )}
                    {r.network && (
                      <span className="shrink-0">网络: <span className="text-cyan-300">{r.network}</span></span>
                    )}
                    {protocolStr && (
                      <span className="truncate">协议: <span className="text-amber-300">{protocolStr}</span></span>
                    )}
                    {inboundStr && (
                      <span className="truncate">入站: <span className="text-emerald-300">{inboundStr}</span></span>
                    )}
                    {r.ruleTag && (
                      <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-white/5">{r.ruleTag}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <ToggleSwitch
                  checked={isEnabled}
                  onChange={() => onToggleRuleEnabled(idx)}
                  activeColor="purple"
                  size="sm"
                  ariaLabel="切换规则状态"
                />
                <button
                  type="button"
                  onClick={() => onEditRule(idx)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="编辑规则"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteRule(idx)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="删除规则"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 负载均衡器 ── */}
      {balancers.length > 0 && (
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Shuffle className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-semibold text-cyan-300">负载均衡器</span>
              <span className="text-[10px] text-slate-500">{balancers.length} 个</span>
            </div>
            {onAddBalancer && (
              <button type="button" onClick={onAddBalancer}
                className="flex items-center gap-1 px-2 py-1 text-[10px] bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 rounded-lg transition-all font-medium">
                <Plus className="w-3 h-3" />添加
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {balancers.map((b: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-950/40 border border-white/5 rounded-xl hover:border-cyan-500/20 transition-all">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono font-medium shrink-0">
                    {b.tag || '未命名'}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-white/5 font-mono">
                    {b.strategy?.type || 'random'}
                  </span>
                  {Array.isArray(b.selector) && b.selector.length > 0 && (
                    <span className="text-[10px] text-slate-500 truncate">
                      选择: {b.selector.join(', ')}
                    </span>
                  )}
                  {b.fallbackTag && (
                    <span className="text-[10px] text-amber-400/80 shrink-0">回退: {b.fallbackTag}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {onEditBalancer && (
                    <button type="button" onClick={() => onEditBalancer(idx)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                      <Edit3 className="w-3 h-3" />
                    </button>
                  )}
                  {onDeleteBalancer && (
                    <button type="button" onClick={() => onDeleteBalancer(idx)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {balancers.length === 0 && onAddBalancer && (
        <div className="pt-1">
          <button type="button" onClick={onAddBalancer}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] text-cyan-400/60 hover:text-cyan-300 border border-dashed border-cyan-500/20 hover:border-cyan-500/40 rounded-xl transition-all">
            <Shuffle className="w-3.5 h-3.5" />添加负载均衡器
          </button>
        </div>
      )}
    </div>
  );
};
