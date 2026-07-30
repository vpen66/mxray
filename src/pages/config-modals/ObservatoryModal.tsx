import React, { useState, useEffect } from 'react';
import { X, Save, Eye, Code2, AlertCircle } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { CustomSelect } from '../../components/CustomSelect';

interface ObservatoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialValue?: { observatory?: any; burstObservatory?: any };
  onSave: (val: { observatory?: any; burstObservatory?: any }) => void;
}

const TYPE_OPTIONS = [
  { value: 'observatory', label: '常规背景连接观测 (observatory)' },
  { value: 'burstObservatory', label: '并发并发冲刷观测 (burstObservatory)' },
  { value: 'disabled', label: '禁用连接观测' },
];

export const ObservatoryModal: React.FC<ObservatoryModalProps> = ({
  isOpen,
  onClose,
  initialValue,
  onSave,
}) => {
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');
  const [type, setType] = useState<'observatory' | 'burstObservatory' | 'disabled'>('observatory');
  const [subjectSelector, setSubjectSelector] = useState('proxy');
  const [probeUrl, setProbeUrl] = useState('https://www.google.com/generate_204');
  const [probeInterval, setProbeInterval] = useState('10m');
  const [rawJsonText, setRawJsonText] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialValue?.burstObservatory) {
        setType('burstObservatory');
        const b = initialValue.burstObservatory;
        setSubjectSelector(Array.isArray(b.subjectSelector) ? b.subjectSelector.join(',') : 'proxy');
        setRawJsonText(JSON.stringify(b, null, 2));
      } else if (initialValue?.observatory) {
        setType('observatory');
        const o = initialValue.observatory;
        setSubjectSelector(Array.isArray(o.subjectSelector) ? o.subjectSelector.join(',') : 'proxy');
        setProbeUrl(o.probeUrl || 'https://www.google.com/generate_204');
        setProbeInterval(o.probeInterval || '10m');
        setRawJsonText(JSON.stringify(o, null, 2));
      } else {
        setType('observatory');
        setSubjectSelector('proxy');
        setProbeUrl('https://www.google.com/generate_204');
        setProbeInterval('10m');
        setRawJsonText(JSON.stringify({ subjectSelector: ['proxy'], probeUrl: 'https://www.google.com/generate_204', probeInterval: '10m' }, null, 2));
      }
      setJsonError(null);
      setViewMode('visual');
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (type === 'disabled') {
      onSave({ observatory: undefined, burstObservatory: undefined });
      onClose();
      return;
    }

    if (viewMode === 'json') {
      try {
        const parsed = JSON.parse(rawJsonText);
        if (type === 'burstObservatory') {
          onSave({ burstObservatory: parsed, observatory: undefined });
        } else {
          onSave({ observatory: parsed, burstObservatory: undefined });
        }
        onClose();
      } catch (err: any) {
        setJsonError(`JSON 语法解析错误: ${err.message}`);
      }
    } else {
      const selectors = subjectSelector.split(',').map((s) => s.trim()).filter(Boolean);
      if (type === 'burstObservatory') {
        onSave({
          burstObservatory: {
            subjectSelector: selectors.length > 0 ? selectors : ['proxy'],
          },
          observatory: undefined,
        });
      } else {
        onSave({
          observatory: {
            subjectSelector: selectors.length > 0 ? selectors : ['proxy'],
            probeUrl: probeUrl.trim() || 'https://www.google.com/generate_204',
            probeInterval: probeInterval.trim() || '10m',
            enableConcurrency: true,
          },
          burstObservatory: undefined,
        });
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900/98 border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/40">
          <h3 className="font-semibold text-lg text-white">配置连接观测 (Observatory)</h3>
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
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  观测器模式
                </label>
                <CustomSelect
                  options={TYPE_OPTIONS}
                  value={type}
                  onChange={(val) => setType(val as any)}
                />
              </div>

              {type !== 'disabled' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      目标观察出站 Selector (多个用逗号隔开)
                    </label>
                    <input
                      type="text"
                      value={subjectSelector}
                      onChange={(e) => setSubjectSelector(e.target.value)}
                      placeholder="proxy, node-1, node-2"
                      className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 font-mono"
                    />
                  </div>

                  {type === 'observatory' && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          探测测速 URL (probeUrl)
                        </label>
                        <input
                          type="text"
                          value={probeUrl}
                          onChange={(e) => setProbeUrl(e.target.value)}
                          placeholder="https://www.google.com/generate_204"
                          className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          探测周期 (probeInterval)
                        </label>
                        <input
                          type="text"
                          value={probeInterval}
                          onChange={(e) => setProbeInterval(e.target.value)}
                          placeholder="10m"
                          className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 font-mono"
                        />
                      </div>
                    </>
                  )}
                </>
              )}
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
            保存观测配置
          </button>
        </div>
      </div>
    </div>
  );
};
