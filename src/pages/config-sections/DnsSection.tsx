import React from 'react';
import { Database, Edit3, Trash2 } from 'lucide-react';

interface DnsSectionProps {
  dns: any;
  onEdit: () => void;
  onDelete?: () => void;
  onDeleteServer?: (index: number) => void;
}

export const DnsSection: React.FC<DnsSectionProps> = ({
  dns,
  onEdit,
  onDelete,
  onDeleteServer,
}) => {
  const servers = Array.isArray(dns?.servers) ? dns.servers : [];

  return (
    <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-white">DNS 服务器</h3>
            <p className="text-xs text-slate-400">
              查询策略: <span className="font-mono text-emerald-300">{dns?.queryStrategy || 'UseIP'}</span> ({servers.length} 个服务器)
            </p>
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

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {servers.map((srv: any, idx: number) => {
          const srvStr = typeof srv === 'string' ? srv : JSON.stringify(srv);
          return (
            <div
              key={idx}
              className="p-3 bg-slate-950/40 border border-white/5 rounded-xl text-xs font-mono text-slate-300 flex items-center justify-between gap-2 group"
            >
              <span className="truncate">
                <span className="text-emerald-400 font-semibold mr-2">#{idx + 1}</span>
                {srvStr}
              </span>
              {onDeleteServer && (
                <button
                  type="button"
                  onClick={() => onDeleteServer(idx)}
                  className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 opacity-60 group-hover:opacity-100"
                  title="删除此服务器"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
