import React from 'react';
import { Eye, Edit3, Trash2 } from 'lucide-react';

interface ObservatorySectionProps {
  observatory?: any;
  burstObservatory?: any;
  onEdit: () => void;
  onDelete?: () => void;
}

export const ObservatorySection: React.FC<ObservatorySectionProps> = ({
  observatory,
  burstObservatory,
  onEdit,
  onDelete,
}) => {
  const isBurst = !!burstObservatory;
  const targetObj = burstObservatory || observatory || {};
  const selectors = Array.isArray(targetObj.subjectSelector) ? targetObj.subjectSelector.join(', ') : 'proxy';

  return (
    <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-white">连接观测</h3>
            <p className="text-xs text-slate-400">
              类型: <span className="font-mono text-pink-300 font-semibold">{isBurst ? 'burstObservatory' : 'observatory'}</span> | Target: <span className="font-mono text-slate-200">{selectors}</span>
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
    </div>
  );
};
