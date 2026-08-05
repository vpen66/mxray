import React, { useState, useEffect } from 'react';
import { X, Save, Eye, Code2, AlertCircle } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { FieldLabel } from '../../components/FieldLabel';

interface ApiModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialValue?: any;
  onSave: (val: any) => void;
}

const AVAILABLE_SERVICES = [
  { id: 'HandlerService', label: 'HandlerService' },
  { id: 'LoggerService', label: 'LoggerService' },
  { id: 'StatsService', label: 'StatsService' },
  { id: 'RoutingService', label: 'RoutingService' },
  { id: 'ReflectionService', label: 'ReflectionService' },
];

export const ApiModal: React.FC<ApiModalProps> = ({
  isOpen,
  onClose,
  initialValue,
  onSave,
}) => {
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');
  const [tag, setTag] = useState('api');
  const [listen, setListen] = useState('');
  const [services, setServices] = useState<string[]>(['HandlerService', 'LoggerService', 'StatsService']);
  const [rawJsonText, setRawJsonText] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const val = initialValue || { tag: 'api', services: ['HandlerService', 'LoggerService', 'StatsService'] };
      setTag(val.tag || 'api');
      setListen(val.listen || '');
      setServices(Array.isArray(val.services) ? val.services : []);
      setRawJsonText(JSON.stringify(val, null, 2));
      setJsonError(null);
      setViewMode('visual');
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const toggleService = (srvId: string) => {
    setServices((prev) =>
      prev.includes(srvId) ? prev.filter((s) => s !== srvId) : [...prev, srvId]
    );
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
      const result: any = {
        tag: tag.trim() || 'api',
        services,
      };
      if (listen.trim()) result.listen = listen.trim();
      onSave(result);
      onClose();
    }
  };

  const handleSwitchMode = (mode: 'visual' | 'json') => {
    if (mode === 'json') {
      const obj: any = { tag: tag.trim() || 'api', services };
      if (listen.trim()) obj.listen = listen.trim();
      setRawJsonText(JSON.stringify(obj, null, 2));
      setJsonError(null);
    } else {
      try {
        const parsed = JSON.parse(rawJsonText);
        setTag(parsed.tag || 'api');
        setListen(parsed.listen || '');
        setServices(Array.isArray(parsed.services) ? parsed.services : []);
        setJsonError(null);
      } catch (err: any) {
        setJsonError(`无法切换为可视化：JSON 解析错误 (${err.message})`);
        return;
      }
    }
    setViewMode(mode);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900/98 border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/40">
          <h3 className="font-semibold text-lg text-white">配置 API 接口</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-800/80 border border-white/10 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => handleSwitchMode('visual')}
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
                onClick={() => handleSwitchMode('json')}
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
                  <FieldLabel label="API 服务标识" tip="API 入站的标识 Tag，默认为 api。用于路由中将 API 流量引导到对应入站。" />
                </label>
                <input
                  type="text"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="api"
                  className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  <FieldLabel label="监听地址与端口" tip="API 的 gRPC 监听地址和端口。设置后自动创建入站和路由，但流量统计不包含 API 连接。" />
                </label>
                <input
                  type="text"
                  value={listen}
                  onChange={(e) => setListen(e.target.value)}
                  placeholder="如 127.0.0.1:8080（留空则需手动配置 inbounds 和 routing）"
                  className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 font-mono"
                />
                <p className="mt-1.5 text-[10px] text-slate-500">设置后无需额外配置 inbounds 和 routing，但流量统计不统计 API 入站连接</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  <FieldLabel label="gRPC API 服务模块" tip="选择要开启的 gRPC API 服务。HandlerService 管理入站出站，LoggerService 日志控制，StatsService 流量统计，RoutingService 路由管理，ReflectionService 服务反射。" />
                </label>
                <div className="space-y-2">
                  {AVAILABLE_SERVICES.map((srv) => (
                    <label
                      key={srv.id}
                      className="flex items-center gap-3 p-3 bg-slate-950/40 border border-white/5 rounded-xl cursor-pointer hover:bg-white/5 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={services.includes(srv.id)}
                        onChange={() => toggleService(srv.id)}
                        className="w-4 h-4 rounded border-white/20 bg-slate-900 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-slate-200">{srv.label}</span>
                    </label>
                  ))}
                </div>
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
            保存 API 配置
          </button>
        </div>
      </div>
    </div>
  );
};
