import React from 'react';
import { Globe, Plus, Edit3, Trash2, ShieldCheck, Download, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import { useDragSort } from '../../hooks/useDragSort';
import { ToggleSwitch } from '../../components/ToggleSwitch';

interface OutboundSectionProps {
  outbounds: any[];
  onAddOutbound: () => void;
  onEditOutbound: (index: number) => void;
  onDeleteOutbound: (index: number) => void;
  onImportSubscription?: () => void;
  onToggleOutboundEnabled?: (index: number) => void;
  onMoveOutbound?: (index: number, direction: 'up' | 'down') => void;
  onReorderOutbound?: (fromIndex: number, toIndex: number) => void;
}

export const OutboundSection: React.FC<OutboundSectionProps> = ({
  outbounds,
  onAddOutbound,
  onEditOutbound,
  onDeleteOutbound,
  onImportSubscription,
  onToggleOutboundEnabled,
  onMoveOutbound,
  onReorderOutbound,
}) => {
  const { getItemDragProps, isDragging, isDropTarget, overlayEl } = useDragSort((from, to) => {
    onReorderOutbound?.(from, to);
  });

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
        <div className="flex items-center gap-2">
          {onImportSubscription && (
            <button
              type="button"
              onClick={onImportSubscription}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 rounded-xl transition-all font-medium"
            >
              <Download className="w-3.5 h-3.5" />
              导入订阅
            </button>
          )}
          <button
            type="button"
            onClick={onAddOutbound}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 rounded-xl transition-all font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            添加出站
          </button>
        </div>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {overlayEl}
        {outbounds.map((ob, idx) => {
          const isDirect = ob.protocol === 'freedom';
          const isBlock = ob.protocol === 'blackhole';
          const isProxyNode = !isDirect && !isBlock;
          const isObEnabled = ob.enabled !== false;

          let address = '系统内置';
          if (ob.settings?.address !== undefined && ob.settings?.port !== undefined) {
            address = `${ob.settings.address}:${ob.settings.port}`;
          } else if (ob.settings?.vnext && ob.settings.vnext[0]) {
            address = `${ob.settings.vnext[0].address}:${ob.settings.vnext[0].port}`;
          } else if (ob.settings?.servers && ob.settings.servers[0]) {
            address = `${ob.settings.servers[0].address}:${ob.settings.servers[0].port}`;
          }

          return (
            <div
              key={idx}
              {...(onReorderOutbound ? getItemDragProps(idx) : {})}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between group ${
                isProxyNode
                  ? 'bg-slate-950/60 border-cyan-500/20 hover:border-cyan-500/40 shadow-lg shadow-cyan-950/10'
                  : 'bg-slate-950/30 border-white/5 hover:border-white/10'
              } ${onReorderOutbound ? 'cursor-grab active:cursor-grabbing' : ''} ${
                isDragging(idx) ? 'opacity-30' : !isObEnabled ? 'opacity-50' : ''
              } ${isDropTarget(idx) ? 'ring-2 ring-cyan-400/70 border-cyan-400/70 scale-[1.015]' : ''}`}
              style={{ transition: 'transform 180ms ease-out, opacity 150ms ease-out, border-color 150ms, box-shadow 150ms, scale 180ms ease-out' }}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {onReorderOutbound && (
                      <GripVertical className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
                    )}
                    <span className="font-mono text-sm font-medium text-slate-100">{ob.tag || `outbound-${idx}`}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 uppercase font-mono font-medium">
                      {ob.protocol || 'freedom'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                    {onToggleOutboundEnabled && (
                      <ToggleSwitch
                        checked={isObEnabled}
                        onChange={() => onToggleOutboundEnabled(idx)}
                        activeColor="indigo"
                        size="sm"
                        ariaLabel="切换出站启用状态"
                      />
                    )}
                    {onMoveOutbound && (
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => onMoveOutbound(idx, 'up')}
                          disabled={idx === 0}
                          className="p-0.5 rounded text-slate-500 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                          title="上移"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onMoveOutbound(idx, 'down')}
                          disabled={idx === outbounds.length - 1}
                          className="p-0.5 rounded text-slate-500 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                          title="下移"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
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
