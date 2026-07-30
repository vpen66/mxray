import React from 'react';
import { Route, Plus, Edit3, Trash2 } from 'lucide-react';
import { ToggleSwitch } from '../../components/ToggleSwitch';

interface RoutingSectionProps {
  routing: any;
  onAddRule: () => void;
  onEditRule: (index: number) => void;
  onDeleteRule: (index: number) => void;
  onToggleRuleEnabled: (index: number) => void;
}

export const RoutingSection: React.FC<RoutingSectionProps> = ({
  routing,
  onAddRule,
  onEditRule,
  onDeleteRule,
  onToggleRuleEnabled,
}) => {
  const rules = Array.isArray(routing?.rules) ? routing.rules : [];

  return (
    <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
            <Route className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-white">策略分流规则映射</h3>
            <p className="text-xs text-slate-400">
              策略匹配模式: <span className="font-mono text-purple-300">{routing?.domainStrategy || 'IPIfNonMatch'}</span> ({rules.length} 条规则)
            </p>
          </div>
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
                <span className="text-xs font-mono text-slate-500 w-5 text-center shrink-0">
                  {idx + 1}
                </span>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-200 truncate">
                      {r.description || `分流规则 #${idx + 1}`}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-mono font-medium shrink-0">
                      → {target}
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
