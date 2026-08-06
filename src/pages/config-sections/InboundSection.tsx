import React from 'react';
import { Server, Plus, Edit3, Trash2, ShieldCheck, ShieldAlert, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import { ToggleSwitch } from '../../components/ToggleSwitch';
import { useDragSort } from '../../hooks/useDragSort';

interface InboundSectionProps {
  inbounds: any[];
  onAddInbound: () => void;
  onEditInbound: (index: number) => void;
  onDeleteInbound: (index: number) => void;
  onToggleSniffing: (index: number) => void;
  onToggleInboundEnabled?: (index: number) => void;
  onMoveInbound?: (index: number, direction: 'up' | 'down') => void;
  onReorderInbound?: (fromIndex: number, toIndex: number) => void;
}

export const InboundSection: React.FC<InboundSectionProps> = ({
  inbounds,
  onAddInbound,
  onEditInbound,
  onDeleteInbound,
  onToggleSniffing,
  onToggleInboundEnabled,
  onMoveInbound,
  onReorderInbound,
}) => {
  const { getItemDragProps, isDragging, isDropTarget, overlayEl } = useDragSort((from, to) => {
    onReorderInbound?.(from, to);
  });

  return (
    <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-white">入站配置</h3>
            <p className="text-xs text-slate-400">设置本地网络代理端口与监听网卡</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onAddInbound}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl transition-all font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          添加入站
        </button>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {overlayEl}
        {inbounds.map((ib, idx) => {
          const isSniffingEnabled = ib.sniffing?.enabled !== false;
          const isIbEnabled = ib.enabled !== false;
          return (
            <div
              key={idx}
              {...(onReorderInbound ? getItemDragProps(idx) : {})}
              className={`p-4 bg-slate-950/40 border border-white/5 rounded-xl hover:border-white/10 transition-all flex flex-col justify-between group ${
                onReorderInbound ? 'cursor-grab active:cursor-grabbing' : ''
              } ${isDragging(idx) ? 'opacity-30' : !isIbEnabled ? 'opacity-50' : ''} ${
                isDropTarget(idx) ? 'ring-2 ring-blue-400/70 border-blue-400/70 scale-[1.015]' : ''
              }`}
              style={{ transition: 'transform 180ms ease-out, opacity 150ms ease-out, border-color 150ms, box-shadow 150ms, scale 180ms ease-out' }}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {onReorderInbound && (
                      <GripVertical className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
                    )}
                    <span className="font-mono text-sm font-medium text-slate-100">{ib.tag || `inbound-${idx}`}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 uppercase font-mono font-medium">
                      {ib.protocol || 'socks'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                    {onToggleInboundEnabled && (
                      <ToggleSwitch
                        checked={isIbEnabled}
                        onChange={() => onToggleInboundEnabled(idx)}
                        activeColor="blue"
                        size="sm"
                        ariaLabel="切换入站启用状态"
                      />
                    )}
                    {onMoveInbound && (
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => onMoveInbound(idx, 'up')}
                          disabled={idx === 0}
                          className="p-0.5 rounded text-slate-500 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                          title="上移"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onMoveInbound(idx, 'down')}
                          disabled={idx === inbounds.length - 1}
                          className="p-0.5 rounded text-slate-500 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                          title="下移"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => onEditInbound(idx)}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="编辑入站"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteInbound(idx)}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="删除入站"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-400 space-y-1 font-mono">
                  <div>监听网卡: <span className="text-slate-200">{ib.listen || '0.0.0.0'}</span></div>
                  <div>端口: <span className="text-blue-400 font-semibold">{ib.port || '动态'}</span></div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1 text-[11px]">
                  {isSniffingEnabled ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  域名嗅探
                </span>
                <ToggleSwitch
                  checked={isSniffingEnabled}
                  onChange={() => onToggleSniffing(idx)}
                  activeColor="blue"
                  size="sm"
                  ariaLabel="切换域名嗅探"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
