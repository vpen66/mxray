import React, { useState, useEffect } from 'react';
import { X, Save, Eye, Code2, AlertCircle } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { CustomSelect } from '../../components/CustomSelect';

interface RoutingRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialValue?: any;
  availableOutboundOptions: Array<{ value: string; label: string; protocol?: string }>;
  onSave: (val: any) => void;
}

export const RoutingRuleModal: React.FC<RoutingRuleModalProps> = ({
  isOpen,
  onClose,
  initialValue,
  availableOutboundOptions,
  onSave,
}) => {
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');
  const [outboundTag, setOutboundTag] = useState('proxy');
  const [description, setDescription] = useState('');
  const [domain, setDomain] = useState('');
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('');
  const [protocol, setProtocol] = useState('');
  const [network, setNetwork] = useState('');
  const [rawJsonText, setRawJsonText] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const val = initialValue || { type: 'field', outboundTag: 'proxy' };
      setOutboundTag(val.outboundTag || val.balancerTag || 'proxy');
      setDescription(val.description || '');
      setDomain(Array.isArray(val.domain) ? val.domain.join(', ') : val.domain || '');
      setIp(Array.isArray(val.ip) ? val.ip.join(', ') : val.ip || '');
      setPort(val.port || '');
      setProtocol(Array.isArray(val.protocol) ? val.protocol.join(', ') : val.protocol || '');
      setNetwork(val.network || '');
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
      const ruleObj: any = {
        type: 'field',
        outboundTag,
      };
      if (description.trim()) ruleObj.description = description.trim();

      if (domain.trim()) {
        ruleObj.domain = domain
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
      if (ip.trim()) {
        ruleObj.ip = ip
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
      if (port.trim()) ruleObj.port = port.trim();
      if (protocol.trim()) {
        ruleObj.protocol = protocol
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
      if (network.trim()) ruleObj.network = network.trim();

      onSave(ruleObj);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900/98 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/40">
          <h3 className="font-semibold text-lg text-white">配置路由分流规则</h3>
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
                  规则备注描述 (可选)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="如: 国内域名直连规则"
                  className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  命中后指向的目标出站标识 (outboundTag)
                </label>
                <CustomSelect
                  options={availableOutboundOptions}
                  value={outboundTag}
                  onChange={setOutboundTag}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    匹配域名列表 (geosite:cn, domain:google.com 等, 逗号分隔)
                  </label>
                  <textarea
                    rows={3}
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="geosite:google, geosite:gfw"
                    className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    匹配 IP 地址列表 (geoip:cn, 192.168.1.0/24 等, 逗号分隔)
                  </label>
                  <textarea
                    rows={3}
                    value={ip}
                    onChange={(e) => setIp(e.target.value)}
                    placeholder="geoip:cn, geoip:private"
                    className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    匹配端口范围 (port)
                  </label>
                  <input
                    type="text"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder="80,443 或 8000-9000"
                    className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    嗅探协议列表 (protocol)
                  </label>
                  <input
                    type="text"
                    value={protocol}
                    onChange={(e) => setProtocol(e.target.value)}
                    placeholder="http, tls, bittorrent"
                    className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    网络层类型 (network)
                  </label>
                  <input
                    type="text"
                    value={network}
                    onChange={(e) => setNetwork(e.target.value)}
                    placeholder="tcp,udp 或 tcp"
                    className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 font-mono"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="h-80 border border-white/10 rounded-xl overflow-hidden">
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
            保存路由规则
          </button>
        </div>
      </div>
    </div>
  );
};
