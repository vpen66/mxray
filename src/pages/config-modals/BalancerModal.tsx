import React, { useState, useEffect } from 'react';
import { X, Save, Eye, Code2, AlertCircle, Plus, Trash2 } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { CustomSelect } from '../../components/CustomSelect';

const inputCls = 'w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 font-mono';
const labelCls = 'block text-[11px] font-medium text-slate-400 mb-1';

const STRATEGY_OPTIONS = [
  { value: 'random', label: 'random', description: '随机选择' },
  { value: 'roundRobin', label: 'roundRobin', description: '轮询选择' },
  { value: 'leastPing', label: 'leastPing', description: '最小延迟（需观测站）' },
  { value: 'leastLoad', label: 'leastLoad', description: '最稳定（需观测站）' },
];

interface BalancerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialValue?: any;
  availableOutboundOptions: Array<{ value: string; label: string; protocol?: string }>;
  existingTags?: string[];
  onSave: (val: any) => void;
}

export const BalancerModal: React.FC<BalancerModalProps> = ({
  isOpen, onClose, initialValue, availableOutboundOptions, onSave,
}) => {
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');
  const [rawJsonText, setRawJsonText] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const [tag, setTag] = useState('');
  const [selectors, setSelectors] = useState<string[]>([]);
  const [fallbackTag, setFallbackTag] = useState('');
  const [strategyType, setStrategyType] = useState('random');

  // Strategy settings (leastLoad only)
  const [expected, setExpected] = useState('');
  const [maxRTT, setMaxRTT] = useState('');
  const [tolerance, setTolerance] = useState('');
  const [baselines, setBaselines] = useState('');
  const [costs, setCosts] = useState<{ regexp: boolean; match: string; value: string }[]>([]);

  useEffect(() => {
    if (isOpen) {
      const val = initialValue || {};
      setTag(val.tag || '');
      setSelectors(Array.isArray(val.selector) ? val.selector : []);
      setFallbackTag(val.fallbackTag || '');
      const st = val.strategy?.type || 'random';
      setStrategyType(st);
      const ss = val.strategy?.settings || {};
      setExpected(ss.expected != null ? String(ss.expected) : '');
      setMaxRTT(ss.maxRTT || '');
      setTolerance(ss.tolerance != null ? String(ss.tolerance) : '');
      setBaselines(Array.isArray(ss.baselines) ? ss.baselines.join(', ') : '');
      setCosts(Array.isArray(ss.costs) ? ss.costs.map((c: any) => ({
        regexp: c.regexp === true, match: c.match || '', value: c.value != null ? String(c.value) : '',
      })) : []);
      setRawJsonText(JSON.stringify(val, null, 2));
      setJsonError(null);
      setViewMode('visual');
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const buildObject = (): any => {
    const obj: any = { tag: tag.trim() };
    if (selectors.filter(Boolean).length > 0) obj.selector = selectors.filter(Boolean);
    if (fallbackTag.trim()) obj.fallbackTag = fallbackTag.trim();
    const strategy: any = { type: strategyType };
    if (strategyType === 'leastLoad') {
      const settings: any = {};
      if (expected.trim()) settings.expected = Number(expected) || 0;
      if (maxRTT.trim()) settings.maxRTT = maxRTT.trim();
      if (tolerance.trim()) settings.tolerance = Number(tolerance) || 0;
      if (baselines.trim()) settings.baselines = baselines.split(',').map(s => s.trim()).filter(Boolean);
      const validCosts = costs.filter(c => c.match.trim());
      if (validCosts.length > 0) {
        settings.costs = validCosts.map(c => ({
          regexp: c.regexp, match: c.match.trim(), value: Number(c.value) || 0,
        }));
      }
      if (Object.keys(settings).length > 0) strategy.settings = settings;
    }
    obj.strategy = strategy;
    return obj;
  };

  const handleSave = () => {
    if (viewMode === 'json') {
      try { onSave(JSON.parse(rawJsonText)); onClose(); }
      catch (err: any) { setJsonError(`JSON 语法解析错误: ${err.message}`); }
    } else {
      if (!tag.trim()) { setJsonError('标识 (tag) 不能为空'); return; }
      onSave(buildObject());
      onClose();
    }
  };

  const switchToJson = () => {
    if (viewMode === 'visual') setRawJsonText(JSON.stringify(buildObject(), null, 2));
    setViewMode('json');
  };

  const addCost = () => setCosts(prev => [...prev, { regexp: false, match: '', value: '' }]);
  const removeCost = (i: number) => setCosts(prev => prev.filter((_, idx) => idx !== i));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900/98 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/40">
          <h3 className="font-semibold text-lg text-white">配置负载均衡器</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-800/80 border border-white/10 rounded-lg p-0.5">
              <button type="button" onClick={() => setViewMode('visual')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'visual' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}>
                <Eye className="w-3.5 h-3.5" />可视化结构
              </button>
              <button type="button" onClick={switchToJson}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'json' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}>
                <Code2 className="w-3.5 h-3.5" />JSON 源码
              </button>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {jsonError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /><span>{jsonError}</span>
            </div>
          )}

          {viewMode === 'visual' ? (
            <div className="space-y-4">
              {/* Tag & Strategy */}
              <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
                <div>
                  <label className={labelCls}>负载均衡器标识</label>
                  <input type="text" value={tag} onChange={e => setTag(e.target.value)}
                    placeholder="如: my-balancer" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>选择策略</label>
                  <CustomSelect options={STRATEGY_OPTIONS} value={strategyType} onChange={setStrategyType} accentColor="cyan" />
                </div>
              </div>

              {/* Fallback */}
              <div>
                <label className={labelCls}>回退出站 (全部不可用时)</label>
                <CustomSelect
                  options={[{ value: '', label: '不设置' }, ...availableOutboundOptions]}
                  value={fallbackTag} onChange={setFallbackTag} accentColor="cyan" />
              </div>

              {/* Selectors */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-400">选择器 (前缀匹配出站标识)</span>
                  <button type="button" onClick={() => setSelectors(prev => [...prev, ''])}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5">
                    <Plus className="w-3 h-3" />添加
                  </button>
                </div>
                {selectors.map((sel, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="text" value={sel}
                      onChange={e => setSelectors(prev => prev.map((s, idx) => idx === i ? e.target.value : s))}
                      placeholder="outbound-tag-prefix" className={`${inputCls} flex-1`} />
                    <button type="button" onClick={() => setSelectors(prev => prev.filter((_, idx) => idx !== i))}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {selectors.length === 0 && (
                  <p className="text-[10px] text-slate-500">选择器用于前缀匹配出站标识，如 ["us-"] 将匹配 us-node-1, us-node-2 等</p>
                )}
              </div>

              {/* Strategy Settings (leastLoad only) */}
              {strategyType === 'leastLoad' && (
                <div className="p-3 bg-slate-950/40 border border-white/5 rounded-xl space-y-3">
                  <span className="text-[11px] font-semibold text-cyan-300">策略参数</span>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
                    <div>
                      <label className={labelCls}>最优节点数</label>
                      <input type="text" value={expected} onChange={e => setExpected(e.target.value)}
                        placeholder="2" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>最高 RTT</label>
                      <input type="text" value={maxRTT} onChange={e => setMaxRTT(e.target.value)}
                        placeholder="1s" className={inputCls} />
                    </div>
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
                    <div>
                      <label className={labelCls}>容忍失败比例</label>
                      <input type="text" value={tolerance} onChange={e => setTolerance(e.target.value)}
                        placeholder="0.01" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>RTT 基线 (逗号分隔)</label>
                      <input type="text" value={baselines} onChange={e => setBaselines(e.target.value)}
                        placeholder="1s, 2s" className={inputCls} />
                    </div>
                  </div>

                  {/* Costs */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-400">权重配置</span>
                      <button type="button" onClick={addCost}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5">
                        <Plus className="w-3 h-3" />添加
                      </button>
                    </div>
                    {costs.map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <label className="flex items-center gap-1 text-[10px] text-slate-400 shrink-0 cursor-pointer">
                          <input type="checkbox" checked={c.regexp}
                            onChange={e => setCosts(prev => prev.map((x, idx) => idx === i ? { ...x, regexp: e.target.checked } : x))}
                            className="rounded border-white/20" />
                          正则
                        </label>
                        <input type="text" value={c.match}
                          onChange={e => setCosts(prev => prev.map((x, idx) => idx === i ? { ...x, match: e.target.value } : x))}
                          placeholder="匹配 tag" className={`${inputCls} flex-1`} />
                        <input type="text" value={c.value}
                          onChange={e => setCosts(prev => prev.map((x, idx) => idx === i ? { ...x, value: e.target.value } : x))}
                          placeholder="权重" className={`${inputCls} w-20`} />
                        <button type="button" onClick={() => removeCost(i)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-80 border border-white/10 rounded-xl overflow-hidden">
              <Editor height="100%" defaultLanguage="json" theme="vs-dark"
                value={rawJsonText} onChange={val => setRawJsonText(val || '')}
                options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false, automaticLayout: true }} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-950/60 flex justify-end gap-3">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 rounded-xl transition-all font-medium">
            取消
          </button>
          <button type="button" onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-lg shadow-cyan-600/20 transition-all font-medium">
            <Save className="w-4 h-4" />保存负载均衡器
          </button>
        </div>
      </div>
    </div>
  );
};
