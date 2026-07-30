import React, { useState, useEffect } from 'react';
import { X, Save, Eye, Code2, AlertCircle, Plus, Trash2 } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { CustomSelect } from '../../components/CustomSelect';

interface DnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialValue?: any;
  onSave: (val: any) => void;
}

const QUERY_STRATEGY_OPTIONS = [
  { value: 'UseIP', label: 'UseIP (同时查询 IPv4/IPv6 并按路由偏好返回)' },
  { value: 'UseIPv4', label: 'UseIPv4 (仅优先使用 IPv4)' },
  { value: 'UseIPv6', label: 'UseIPv6 (仅优先使用 IPv6)' },
];

export const DnsModal: React.FC<DnsModalProps> = ({
  isOpen,
  onClose,
  initialValue,
  onSave,
}) => {
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');
  const [servers, setServers] = useState<string[]>(['1.1.1.1', '223.5.5.5']);
  const [queryStrategy, setQueryStrategy] = useState('UseIP');
  const [rawJsonText, setRawJsonText] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const val = initialValue || { servers: ['1.1.1.1', '223.5.5.5'], queryStrategy: 'UseIP' };
      if (Array.isArray(val.servers)) {
        setServers(val.servers.map((s: any) => (typeof s === 'string' ? s : JSON.stringify(s))));
      } else {
        setServers(['1.1.1.1', '223.5.5.5']);
      }
      setQueryStrategy(val.queryStrategy || 'UseIP');
      setRawJsonText(JSON.stringify(val, null, 2));
      setJsonError(null);
      setViewMode('visual');
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handleAddServer = () => {
    setServers([...servers, '8.8.8.8']);
  };

  const handleRemoveServer = (index: number) => {
    setServers(servers.filter((_, i) => i !== index));
  };

  const handleServerChange = (index: number, val: string) => {
    const next = [...servers];
    next[index] = val;
    setServers(next);
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
      const finalServers = servers.map((s) => {
        const trimmed = s.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          try {
            return JSON.parse(trimmed);
          } catch {
            return trimmed;
          }
        }
        return trimmed;
      }).filter(Boolean);

      const base = typeof initialValue === 'object' && initialValue ? { ...initialValue } : {};
      onSave({
        ...base,
        servers: finalServers,
        queryStrategy,
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900/98 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/40">
          <h3 className="font-semibold text-lg text-white">配置 DNS 模块</h3>
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
                  DNS 查询偏好策略 (queryStrategy)
                </label>
                <CustomSelect
                  options={QUERY_STRATEGY_OPTIONS}
                  value={queryStrategy}
                  onChange={setQueryStrategy}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-slate-300">
                    DNS 服务器地址列表 (servers)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddServer}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    添加 DNS 服务器
                  </button>
                </div>

                <div className="space-y-2">
                  {servers.map((srv, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={srv}
                        onChange={(e) => handleServerChange(idx, e.target.value)}
                        placeholder="如: https://1.1.1.1/dns-query 或 223.5.5.5"
                        className="flex-1 px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveServer(idx)}
                        className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
            保存 DNS 配置
          </button>
        </div>
      </div>
    </div>
  );
};
