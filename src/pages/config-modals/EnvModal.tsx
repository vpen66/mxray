import React, { useState, useEffect } from 'react';
import { X, Save, Eye, Code2, AlertCircle, Plus, Trash2 } from 'lucide-react';
import Editor from '@monaco-editor/react';

interface EnvModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialValue?: any;
  onSave: (val: any) => void;
}

interface EnvPair {
  key: string;
  value: string;
}

export const EnvModal: React.FC<EnvModalProps> = ({
  isOpen,
  onClose,
  initialValue,
  onSave,
}) => {
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');
  const [pairs, setPairs] = useState<EnvPair[]>([{ key: 'XRAY_LOCATION_ASSET', value: './assets' }]);
  const [rawJsonText, setRawJsonText] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const val = initialValue || { XRAY_LOCATION_ASSET: './assets' };
      // enabled 为应用内部启停标志，不作为环境变量编辑
      const filtered: Record<string, any> = {};
      Object.entries(val).forEach(([k, v]) => {
        if (k !== 'enabled') filtered[k] = v;
      });
      const arr: EnvPair[] = Object.entries(filtered).map(([k, v]) => ({ key: k, value: String(v) }));
      setPairs(arr.length > 0 ? arr : [{ key: '', value: '' }]);
      setRawJsonText(JSON.stringify(filtered, null, 2));
      setJsonError(null);
      setViewMode('visual');
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handleAddPair = () => {
    setPairs([...pairs, { key: '', value: '' }]);
  };

  const handleRemovePair = (index: number) => {
    setPairs(pairs.filter((_, i) => i !== index));
  };

  const handlePairChange = (index: number, field: 'key' | 'value', val: string) => {
    const next = [...pairs];
    next[index][field] = val;
    setPairs(next);
  };

  const handleSave = () => {
    if (viewMode === 'json') {
      try {
        const parsed = JSON.parse(rawJsonText);
        onSave(parsed);
        onClose();
      } catch (err: any) {
        setJsonError(`JSON 语法解析错误: ${err.message}`);
      }
    } else {
      const result: Record<string, string> = {};
      pairs.forEach((p) => {
        if (p.key.trim()) {
          result[p.key.trim()] = p.value;
        }
      });
      onSave(result);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900/98 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/40">
          <h3 className="font-semibold text-lg text-white">配置环境变量 (Env)</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-800/80 border border-white/10 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('visual')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'visual'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                可视化结构
              </button>
              <button
                type="button"
                onClick={() => setViewMode('json')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'json'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                JSON 源码
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {jsonError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{jsonError}</span>
            </div>
          )}

          {viewMode === 'visual' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">环境变量键值对列表</span>
                <button
                  type="button"
                  onClick={handleAddPair}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  添加变量
                </button>
              </div>

              {pairs.map((pair, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={pair.key}
                    onChange={(e) => handlePairChange(idx, 'key', e.target.value)}
                    placeholder="环境变量 Key"
                    className="flex-1 px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 font-mono"
                  />
                  <span className="text-slate-500 font-mono">=</span>
                  <input
                    type="text"
                    value={pair.value}
                    onChange={(e) => handlePairChange(idx, 'value', e.target.value)}
                    placeholder="Value"
                    className="flex-1 px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePair(idx)}
                    className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-72 border border-white/10 rounded-xl overflow-hidden">
              <Editor
                height="100%"
                defaultLanguage="json"
                theme="vs-dark"
                value={rawJsonText}
                onChange={(val) => setRawJsonText(val || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-950/60 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 rounded-xl transition-all font-medium"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-600/20 transition-all font-medium"
          >
            <Save className="w-4 h-4" />
            保存环境变量
          </button>
        </div>
      </div>
    </div>
  );
};
