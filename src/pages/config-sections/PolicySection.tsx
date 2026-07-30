import React from 'react';
import { Sliders, Edit3, Trash2 } from 'lucide-react';

interface PolicySectionProps {
  policy: any;
  onEdit: () => void;
  onDelete?: () => void;
}

export const PolicySection: React.FC<PolicySectionProps> = ({
  policy: _policy,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/30 flex items-center justify-center">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-white">本地策略 (Policy)</h3>
            <p className="text-xs text-slate-400">连接超时、握手与系统缓存管理</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
