import React from 'react';
import { Trash2, PowerOff } from 'lucide-react';
import { ToggleSwitch } from './ToggleSwitch';

/**
 * 顶级单对象模块被禁用时的原地置灰占位卡片。
 * 保持模块在可视化视图中的原始位置，提供重新启用与永久删除操作。
 */
interface DisabledModuleCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onEnable: () => void;
  onDelete: () => void;
}

export const DisabledModuleCard: React.FC<DisabledModuleCardProps> = ({
  title,
  subtitle,
  icon,
  onEnable,
  onDelete,
}) => {
  return (
    <div className="bg-slate-950/30 border border-dashed border-white/10 rounded-2xl p-5 opacity-70 hover:opacity-90 transition-opacity">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-slate-700/30 text-slate-500 border border-white/5 flex items-center justify-center shrink-0">
            {icon || <PowerOff className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-base text-slate-500 flex items-center gap-2">
              <span className="truncate">{title}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-500 border border-white/5 font-normal shrink-0">
                已禁用
              </span>
            </h3>
            <p className="text-xs text-slate-600 truncate">
              {subtitle || '已从配置中移除并暂存，重新启用后将恢复写入'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ToggleSwitch
            checked={false}
            onChange={onEnable}
            activeColor="blue"
            size="sm"
            ariaLabel="重新启用该配置"
          />
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="永久删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * 数组型模块中被禁用条目的原地置灰小卡片，
 * 插入渲染列表中该条目被禁用前所在的位置。
 */
interface DisabledItemCardProps {
  title: string;
  subtitle?: string;
  badge?: string;
  onEnable: () => void;
  onDelete: () => void;
}

export const DisabledItemCard: React.FC<DisabledItemCardProps> = ({
  title,
  subtitle,
  badge,
  onEnable,
  onDelete,
}) => {
  return (
    <div className="p-4 bg-slate-950/20 border border-dashed border-white/10 rounded-xl opacity-70 hover:opacity-90 transition-opacity flex flex-col justify-between group">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-sm font-medium text-slate-500 truncate">{title}</span>
            {badge && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-500 border border-white/5 uppercase font-mono font-medium shrink-0">
                {badge}
              </span>
            )}
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-500 border border-white/5 shrink-0">
              已禁用
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <ToggleSwitch
              checked={false}
              onChange={onEnable}
              activeColor="blue"
              size="sm"
              ariaLabel="重新启用该配置"
            />
            <button
              type="button"
              onClick={onDelete}
              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="永久删除"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {subtitle && (
          <div className="text-xs text-slate-600 font-mono truncate">{subtitle}</div>
        )}
      </div>
    </div>
  );
};
