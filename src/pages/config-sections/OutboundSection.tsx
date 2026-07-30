import React from 'react';
import { Globe, Plus, Edit3, Trash2, ShieldCheck } from 'lucide-react';

interface OutboundSectionProps {
  outbounds: any[];
  onAddOutbound: () => void;
  onEditOutbound: (index: number) => void;
  onDeleteOutbound: (index: number) => void;
}

export const OutboundSection: React.FC<OutboundSectionProps> = ({
  outbounds,
  onAddOutbound,
  onEditOutbound,
  onDeleteOutbound,
}) => {
  return (
    <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-white">出站映射</h3>
            <p className="text-xs text-slate-400">管理节点出站与直连阻断策略</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onAddOutbound}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 rounded-xl transition-all font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          添加出站
        </button>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {outbounds.map((ob, idx) => {
          const isDirect = ob.protocol === 'freedom';
          const isBlock = ob.protocol === 'blackhole';
          const isProxyNode = !isDirect && !isBlock;

          let address = '系统内置';
          if (ob.settings?.vnext && ob.settings.vnext[0]) {
            address = `${ob.settings.vnext[0].address}:${ob.settings.vnext[0].port}`;
          } else if (ob.settings?.servers && ob.settings.servers[0]) {
            address = `${ob.settings.servers[0].address}:${ob.settings.servers[0].port}`;
          }

          return (
            <div
              key={idx}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between group ${
                isProxyNode
                  ? 'bg-slate-950/60 border-cyan-500/20 hover:border-cyan-500/40 shadow-lg shadow-cyan-950/10'
                  : 'bg-slate-950/30 border-white/5 hover:border-white/10'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium text-slate-100">{ob.tag || `outbound-${idx}`}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 uppercase font-mono font-medium">
                      {ob.protocol || 'freedom'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => onEditOutbound(idx)}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="编辑出站"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {!isDirect && !isBlock && (
                      <button
                        type="button"
                        onClick={() => onDeleteOutbound(idx)}
                        className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="删除出站"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-xs text-slate-400 space-y-1 font-mono truncate">
                  <div>地址: <span className="text-slate-200">{address}</span></div>
                  {ob.streamSettings?.security && (
                    <div className="flex items-center gap-1 text-[11px] text-purple-300">
                      <ShieldCheck className="w-3 h-3 text-purple-400" />
                      {ob.streamSettings.security} ({ob.streamSettings.network || 'tcp'})
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
