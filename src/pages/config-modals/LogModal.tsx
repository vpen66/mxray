import React, { useState, useEffect } from 'react';
import { X, Save, Eye, Code2, AlertCircle } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { CustomSelect } from '../../components/CustomSelect';
import { ToggleSwitch } from '../../components/ToggleSwitch';

interface LogModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialValue?: any;
  onSave: (val: any) => void;
}

const LOGLEVEL_OPTIONS = [
  { value: 'debug', label: 'debug (详细调试)' },
  { value: 'info', label: 'info (基本状态信息)' },
  { value: 'warning', label: 'warning (警告与异常信息)' },
  { value: 'error', label: 'error (仅严重错误)' },
  { value: 'none', label: 'none (关闭日志输出)' },
];

const MASK_ADDRESS_OPTIONS = [
  { value: 'none', label: '不脱敏 (保留完整 IP 与地址)' },
  { value: 'half', label: '半脱敏 (掩码后半段地址)' },
  { value: 'full', label: '完全脱敏 (隐藏全部网络地址)' },
];

export const LogModal: React.FC<LogModalProps> = ({
  isOpen,
  onClose,
  initialValue,
  onSave,
}) => {
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');
  const [loglevel, setLoglevel] = useState('warning');
  const [access, setAccess] = useState('');
  const [errorPath, setErrorPath] = useState('');
  const [dnsLog, setDnsLog] = useState(false);
  const [maskAddress, setMaskAddress] = useState('half');
  const [rawJsonText, setRawJsonText] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const val = initialValue || { loglevel: 'warning', dnsLog: false, maskAddress: 'half' };
      setLoglevel(val.loglevel || 'warning');
      setAccess(val.access || '');
      setErrorPath(val.error || '');
      setDnsLog(!!val.dnsLog);
      setMaskAddress(val.maskAddress || 'half');
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
      const result: any = { loglevel };
      if (access.trim()) result.access = access.trim();
      if (errorPath.trim()) result.error = errorPath.trim();
      if (dnsLog) result.dnsLog = true;
      if (maskAddress) result.maskAddress = maskAddress;
      onSave(result);
      onClose();
    }
  };

  const handleSwitchMode = (mode: 'visual' | 'json') => {
    if (mode === 'json') {
      const currentVisual = {
        loglevel,
        ...(access ? { access } : {}),
        ...(errorPath ? { error: errorPath } : {}),
        ...(dnsLog ? { dnsLog: true } : {}),
        maskAddress,
      };
      setRawJsonText(JSON.stringify(currentVisual, null, 2));
      setJsonError(null);
    } else {
      try {
        const parsed = JSON.parse(rawJsonText);
        setLoglevel(parsed.loglevel || 'warning');
        setAccess(parsed.access || '');
        setErrorPath(parsed.error || '');
        setDnsLog(!!parsed.dnsLog);
        setMaskAddress(parsed.maskAddress || 'half');
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
          <h3 className="font-semibold text-lg text-white">配置日志模块</h3>
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
                  日志输出级别
                </label>
                <CustomSelect
                  options={LOGLEVEL_OPTIONS}
                  value={loglevel}
                  onChange={setLoglevel}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  访问日志文件路径 (可选)
                </label>
                <input
                  type="text"
                  value={access}
                  onChange={(e) => setAccess(e.target.value)}
                  placeholder="如: /var/log/xray/access.log"
                  className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  错误日志文件路径 (可选)
                </label>
                <input
                  type="text"
                  value={errorPath}
                  onChange={(e) => setErrorPath(e.target.value)}
                  placeholder="如: /var/log/xray/error.log"
                  className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  日志脱敏策略
                </label>
                <CustomSelect
                  options={MASK_ADDRESS_OPTIONS}
                  value={maskAddress}
                  onChange={setMaskAddress}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950/40 border border-white/5 rounded-xl">
                <div>
                  <span className="text-sm font-medium text-slate-200">启用 DNS 解析日志</span>
                  <p className="text-xs text-slate-400">独立记录 DNS 详细查询与响应过程</p>
                </div>
                <ToggleSwitch
                  checked={dnsLog}
                  onChange={() => setDnsLog((prev) => !prev)}
                  activeColor="blue"
                  size="sm"
                  ariaLabel="启用 DNS 解析日志"
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
            保存日志配置
          </button>
        </div>
      </div>
    </div>
  );
};
