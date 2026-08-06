import React from 'react';
import { Activity, Trash2 } from 'lucide-react';
import { ToggleSwitch } from '../../components/ToggleSwitch';

interface StatsSectionProps {
  onDelete?: () => void;
  enabled?: boolean;
  onToggleEnabled?: () => void;
}

export const StatsSection: React.FC<StatsSectionProps> = ({ onDelete, enabled, onToggleEnabled }) => {
  const isEnabled = enabled !== false;

  return (
    <div className={`bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-xl space-y-3 transition-opacity ${isEnabled ? '' : 'opacity-60'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-white">统计信息 (Stats)</h3>
            <p className="text-xs text-emerald-400 font-medium">已启用流量与连接统计服务</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onToggleEnabled && (
            <ToggleSwitch
              checked={isEnabled}
              onChange={onToggleEnabled}
              activeColor="blue"
              size="sm"
              ariaLabel="切换统计信息启用状态"
            />
          )}
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
    </div>
  );
};
