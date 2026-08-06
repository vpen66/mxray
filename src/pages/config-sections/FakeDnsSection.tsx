import React from 'react';
import { Layers, Plus, Edit3, Trash2 } from 'lucide-react';
import { ToggleSwitch } from '../../components/ToggleSwitch';
import { DisabledItemCard } from '../../components/DisabledCards';
import { mergeActiveWithDisabled, type DisabledEntryItem } from '../../utils/configSectionHelper';

interface FakeDnsSectionProps {
  fakedns: any[];
  onAdd: () => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onRemoveModule?: () => void;
  onToggleItemEnabled?: (index: number) => void;
  disabledItems?: DisabledEntryItem[];
  onEnableEntry?: (key: string) => void;
  onDeleteDisabledEntry?: (key: string) => void;
}

export const FakeDnsSection: React.FC<FakeDnsSectionProps> = ({
  fakedns,
  onAdd,
  onEdit,
  onDelete,
  onRemoveModule,
  onToggleItemEnabled,
  disabledItems,
  onEnableEntry,
  onDeleteDisabledEntry,
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
        {mergeActiveWithDisabled<any>(fakedns, disabledItems ?? []).map((entry) => {
          if (entry.kind === 'disabled') {
            const v = entry.value;
            return (
              <DisabledItemCard
                key={`disabled:${entry.key}`}
                title={v?.ipPool || '198.18.0.0/15'}
                subtitle={`Pool Size: ${v?.poolSize || 65535}`}
                onEnable={() => onEnableEntry?.(entry.key)}
                onDelete={() => onDeleteDisabledEntry?.(entry.key)}
              />
            );
          }
          const item = entry.value;
          const idx = entry.activeIndex;
          const isItemEnabled = item?.enabled !== false;
          return (
            <div
              key={idx}
              className={`p-4 bg-slate-950/40 border border-white/5 rounded-xl flex items-center justify-between font-mono transition-opacity ${isItemEnabled ? '' : 'opacity-50'}`}
            >
              <div>
                <div className="text-xs text-slate-400">CIDR: <span className="text-teal-300 font-semibold">{item.ipPool || '198.18.0.0/15'}</span></div>
                <div className="text-xs text-slate-400">Pool Size: <span className="text-slate-200">{item.poolSize || 65535}</span></div>
              </div>
              <div className="flex items-center gap-1">
                {onToggleItemEnabled && (
                  <ToggleSwitch
                    checked={isItemEnabled}
                    onChange={() => onToggleItemEnabled(idx)}
                    activeColor="emerald"
                    size="sm"
                    ariaLabel="切换地址池启用状态"
                  />
                )}
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
          );
        })}
      </div>
    </div>
  );
};
