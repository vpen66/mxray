import React from 'react';
import { Route, Plus, Edit3, Trash2, ChevronUp, ChevronDown, Settings2 } from 'lucide-react';
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
}) => {
  const rules = Array.isArray(routing?.rules) ? routing.rules : [];

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
          const target = r.outboundTag || r.balancerTag || 'proxy';
          const domainStr = Array.isArray(r.domain) ? r.domain.join(', ') : r.domain || '';
          const ipStr = Array.isArray(r.ip) ? r.ip.join(', ') : r.ip || '';

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
    </div>
  );
};
