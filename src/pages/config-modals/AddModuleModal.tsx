import React from 'react';
import { X, Check, Plus } from 'lucide-react';
import type { ModuleStatusItem } from '../../utils/configSectionHelper';

interface AddModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleStatuses: ModuleStatusItem[];
  onSelectModule: (moduleId: string) => void;
}

export const AddModuleModal: React.FC<AddModuleModalProps> = ({
  isOpen,
  onClose,
  moduleStatuses,
  onSelectModule,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900/98 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-lg text-white">新增配置模块</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Modules */}
        <div className="p-6 overflow-y-auto space-y-3">
          <p className="text-xs text-slate-400 mb-4">
            选择要向当前配置文件注入的 Xray 内核规范配置模块：
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {moduleStatuses.map(({ definition, isAdded, count }) => {
              return (
                <div
                  key={definition.id}
                  onClick={() => {
                    onSelectModule(definition.id);
                    onClose();
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group ${
                    isAdded && !definition.isArray
                      ? 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/70'
                      : 'bg-slate-950/40 border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-medium text-sm text-slate-100 group-hover:text-blue-300 transition-colors">
                      {definition.name}
                    </span>
                    {isAdded && !definition.isArray ? (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                        <Check className="w-3 h-3" />
                        已添加
                      </span>
                    ) : isAdded && definition.isArray ? (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 font-medium">
                        {count || 0} 项
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-medium group-hover:bg-blue-500/20 group-hover:text-blue-300 group-hover:border-blue-500/40">
                        <Plus className="w-3 h-3" />
                        添加
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {definition.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-950/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 rounded-xl transition-all font-medium"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};
