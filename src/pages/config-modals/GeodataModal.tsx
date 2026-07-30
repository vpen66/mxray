import React, { useState, useEffect } from 'react';
import { X, Save, Eye, Code2, AlertCircle } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { ToggleSwitch } from '../../components/ToggleSwitch';

interface GeodataModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialValue?: any;
  onSave: (val: any) => void;
}

export const GeodataModal: React.FC<GeodataModalProps> = ({
  isOpen,
  onClose,
  initialValue,
  onSave,
}) => {
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');
  const [geoipUrl, setGeoipUrl] = useState('');
  const [geositeUrl, setGeositeUrl] = useState('');
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [interval, setInterval] = useState('24h');
  const [rawJsonText, setRawJsonText] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const val = initialValue || {
        geoipUrl: 'https://github.com/v2fly/geoip/releases/latest/download/geoip.dat',
        geositeUrl: 'https://github.com/v2fly/domain-list-community/releases/latest/download/dlc.dat',
        autoUpdate: true,
        interval: '24h',
      };
      setGeoipUrl(val.geoipUrl || '');
      setGeositeUrl(val.geositeUrl || '');
      setAutoUpdate(val.autoUpdate !== false);
      setInterval(val.interval || '24h');
      setRawJsonText(JSON.stringify(val, null, 2));
      setJsonError(null);
      setViewMode('visual');
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

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
      onSave({
        ...(geoipUrl ? { geoipUrl: geoipUrl.trim() } : {}),
        ...(geositeUrl ? { geositeUrl: geositeUrl.trim() } : {}),
        autoUpdate,
        interval: interval.trim() || '24h',
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900/98 border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/40">
          <h3 className="font-semibold text-lg text-white">配置地理数据 (Geodata)</h3>
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
                  GeoIP 下载更新 URL
                </label>
                <input
                  type="text"
                  value={geoipUrl}
                  onChange={(e) => setGeoipUrl(e.target.value)}
                  placeholder="https://github.com/v2fly/geoip/releases/latest/download/geoip.dat"
                  className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  GeoSite 下载更新 URL
                </label>
                <input
                  type="text"
                  value={geositeUrl}
                  onChange={(e) => setGeositeUrl(e.target.value)}
                  placeholder="https://github.com/v2fly/domain-list-community/releases/latest/download/dlc.dat"
                  className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  自动检查与下载更新周期
                </label>
                <input
                  type="text"
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                  placeholder="24h"
                  className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 font-mono"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950/40 border border-white/5 rounded-xl">
                <div>
                  <span className="text-sm font-medium text-slate-200">启用自动更新</span>
                  <p className="text-xs text-slate-400">自动在后台定时拉取最新的 GeoIP / GeoSite 数据文件</p>
                </div>
                <ToggleSwitch
                  checked={autoUpdate}
                  onChange={() => setAutoUpdate((prev) => !prev)}
                  activeColor="blue"
                  size="sm"
                  ariaLabel="启用地理数据自动更新"
                />
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
