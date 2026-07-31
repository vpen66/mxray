import React, { useState, useEffect } from 'react';
import { X, Save, Eye, Code2, AlertCircle, Plus, Trash2 } from 'lucide-react';
import Editor from '@monaco-editor/react';

interface GeodataModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialValue?: any;
  onSave: (val: any) => void;
}

interface AssetEntry {
  url: string;
  file: string;
}

const inputCls = 'w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 font-mono';
const labelCls = 'block text-xs font-medium text-slate-300 mb-1.5';

export const GeodataModal: React.FC<GeodataModalProps> = ({
  isOpen,
  onClose,
  initialValue,
  onSave,
}) => {
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');
  const [cron, setCron] = useState('');
  const [outbound, setOutbound] = useState('');
  const [assets, setAssets] = useState<AssetEntry[]>([
    { url: 'https://github.com/v2fly/geoip/releases/latest/download/geoip.dat', file: 'geoip.dat' },
    { url: 'https://github.com/v2fly/domain-list-community/releases/latest/download/dlc.dat', file: 'geosite.dat' },
  ]);
  const [rawJsonText, setRawJsonText] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const val = initialValue || {};
      setCron(val.cron || '');
      setOutbound(val.outbound || '');
      if (Array.isArray(val.assets) && val.assets.length > 0) {
        setAssets(val.assets.map((a: any) => ({ url: a.url || '', file: a.file || '' })));
      } else {
        setAssets([
          { url: 'https://github.com/v2fly/geoip/releases/latest/download/geoip.dat', file: 'geoip.dat' },
          { url: 'https://github.com/v2fly/domain-list-community/releases/latest/download/dlc.dat', file: 'geosite.dat' },
        ]);
      }
      setRawJsonText(JSON.stringify(val, null, 2));
      setJsonError(null);
      setViewMode('visual');
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const buildObject = (): any => {
    const result: any = {};
    if (cron.trim()) result.cron = cron.trim();
    if (outbound.trim()) result.outbound = outbound.trim();
    const validAssets = assets.filter(a => a.url.trim() && a.file.trim());
    if (validAssets.length > 0) {
      result.assets = validAssets.map(a => ({ url: a.url.trim(), file: a.file.trim() }));
    }
    return result;
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
      onSave(buildObject());
      onClose();
    }
  };

  const switchToJson = () => {
    if (viewMode === 'visual') {
      setRawJsonText(JSON.stringify(buildObject(), null, 2));
    }
    setViewMode('json');
  };

  const switchToVisual = () => {
    try {
      const parsed = JSON.parse(rawJsonText);
      setCron(parsed.cron || '');
      setOutbound(parsed.outbound || '');
      if (Array.isArray(parsed.assets) && parsed.assets.length > 0) {
        setAssets(parsed.assets.map((a: any) => ({ url: a.url || '', file: a.file || '' })));
      }
      setJsonError(null);
    } catch (err: any) {
      setJsonError(`无法切换为可视化：JSON 解析错误 (${err.message})`);
      return;
    }
    setViewMode('visual');
  };

  const addAsset = () => setAssets([...assets, { url: '', file: '' }]);
  const removeAsset = (i: number) => setAssets(assets.filter((_, idx) => idx !== i));
  const updateAsset = (i: number, field: keyof AssetEntry, val: string) => {
    const next = [...assets];
    next[i] = { ...next[i], [field]: val };
    setAssets(next);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900/98 border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/40">
          <h3 className="font-semibold text-lg text-white">配置地理数据</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-800/80 border border-white/10 rounded-lg p-0.5">
              <button
                type="button"
                onClick={switchToVisual}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'visual' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />可视化结构
              </button>
              <button
                type="button"
                onClick={switchToJson}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'json' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
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
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{jsonError}</span>
            </div>
          )}

          {viewMode === 'visual' ? (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>定时任务 (cron)</label>
                <input
                  type="text"
                  value={cron}
                  onChange={(e) => setCron(e.target.value)}
                  placeholder="如 0 4 * * *（每天 04:00 执行）"
                  className={inputCls}
                />
                <p className="mt-1.5 text-[10px] text-slate-500">标准 5 段 cron 表达式，按运行环境本地时区执行</p>
              </div>

              <div>
                <label className={labelCls}>下载出站代理</label>
                <input
                  type="text"
                  value={outbound}
                  onChange={(e) => setOutbound(e.target.value)}
                  placeholder="留空则走路由模块"
                  className={inputCls}
                />
                <p className="mt-1.5 text-[10px] text-slate-500">下载 geodata 文件时使用的出站代理标识</p>
              </div>

              {/* Assets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">资源文件列表</span>
                  <button
                    type="button"
                    onClick={addAsset}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />添加资源
                  </button>
                </div>

                {assets.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">未配置资源文件，定时任务只会重载现有文件</p>
                ) : (
                  <div className="space-y-2">
                    {assets.map((asset, idx) => (
                      <div key={idx} className="bg-slate-800/30 border border-white/5 rounded-xl p-3 space-y-2">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 space-y-2">
                            <div>
                              <label className="block text-[10px] font-medium text-slate-400 mb-0.5">下载地址 (HTTPS)</label>
                              <input
                                type="text"
                                value={asset.url}
                                onChange={(e) => updateAsset(idx, 'url', e.target.value)}
                                placeholder="https://example.com/geoip.dat"
                                className={`${inputCls} text-xs`}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-medium text-slate-400 mb-0.5">写入文件名</label>
                              <input
                                type="text"
                                value={asset.file}
                                onChange={(e) => updateAsset(idx, 'file', e.target.value)}
                                placeholder="geoip.dat"
                                className={`${inputCls} text-xs`}
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAsset(idx)}
                            className="p-2 mt-4 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
            保存地理数据配置
          </button>
        </div>
      </div>
    </div>
  );
};
