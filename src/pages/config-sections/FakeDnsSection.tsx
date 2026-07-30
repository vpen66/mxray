import React from 'react';
import { Layers, Plus, Edit3, Trash2 } from 'lucide-react';

interface FakeDnsSectionProps {
  fakedns: any[];
  onAdd: () => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onRemoveModule?: () => void;
}

export const FakeDnsSection: React.FC<FakeDnsSectionProps> = ({
  fakedns,
  onAdd,
  onEdit,
  onDelete,
  onRemoveModule,
}) => {
  return (
    <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-white">FakeDNS 地址池</h3>
            <p className="text-xs text-slate-400">虚拟 IP 地址段及容量映射</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 rounded-xl transition-all font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            添加地址池
          </button>
          {onRemoveModule && (
            <button
              type="button"
              onClick={onRemoveModule}
              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="移除模块"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {fakedns.map((item, idx) => (
          <div
            key={idx}
            className="p-4 bg-slate-950/40 border border-white/5 rounded-xl flex items-center justify-between font-mono"
          >
            <div>
              <div className="text-xs text-slate-400">CIDR: <span className="text-teal-300 font-semibold">{item.ipPool || '198.18.0.0/15'}</span></div>
              <div className="text-xs text-slate-400">Pool Size: <span className="text-slate-200">{item.poolSize || 65535}</span></div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onEdit(idx)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(idx)}
                className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
