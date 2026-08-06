import React from 'react';
import { SlidersHorizontal, Edit3, Trash2 } from 'lucide-react';
import { ToggleSwitch } from '../../components/ToggleSwitch';

interface TransportSectionProps {
  transport: any;
  onEdit: () => void;
  onDelete?: () => void;
  enabled?: boolean;
  onToggleEnabled?: () => void;
}

export const TransportSection: React.FC<TransportSectionProps> = ({
  transport: _transport,
  onEdit,
  onDelete,
  enabled,
  onToggleEnabled,
}) => {
  const isEnabled = enabled !== false;

  return (
    <div className={`bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-xl space-y-3 transition-opacity ${isEnabled ? '' : 'opacity-60'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-white">全局传输配置 (Transport)</h3>
            <p className="text-xs text-slate-400">底层 TCP / WebSocket / gRPC 全局参数</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onToggleEnabled && (
            <ToggleSwitch
              checked={isEnabled}
              onChange={onToggleEnabled}
              activeColor="blue"
              size="sm"
              ariaLabel="切换全局传输配置启用状态"
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
    </div>
  );
};
