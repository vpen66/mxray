import React from 'react';
import { Terminal, Edit3, Trash2 } from 'lucide-react';

interface EnvSectionProps {
  env: Record<string, any>;
  onEdit: () => void;
  onDelete?: () => void;
}

export const EnvSection: React.FC<EnvSectionProps> = ({
  env,
  onEdit,
  onDelete,
}) => {
  const pairs = Object.entries(env || {});

  return (
    <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-white">环境变量</h3>
            <p className="text-xs text-slate-400">内核运行环境参数 ({pairs.length} 个变量)</p>
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

      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {pairs.map(([k, v], idx) => (
          <div
            key={idx}
            className="p-2.5 bg-slate-950/40 border border-white/5 rounded-xl text-xs font-mono flex items-center justify-between"
          >
            <span className="text-purple-300 font-semibold">{k}</span>
            <span className="text-slate-400 truncate max-w-[200px]">{String(v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
