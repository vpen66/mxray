import React, { useState, useEffect } from 'react';
import { X, Save, Eye, Code2, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { CustomSelect } from '../../components/CustomSelect';

const inputCls = 'w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500/50 font-mono';
const textareaCls = `${inputCls} resize-none`;
const labelCls = 'block text-[11px] font-medium text-slate-400 mb-1';

const Collapsible: React.FC<{ title: string; color?: string; defaultOpen?: boolean; children: React.ReactNode }> = ({
  title, color = 'text-purple-300', defaultOpen = false, children,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="p-3 bg-slate-950/40 border border-white/5 rounded-xl space-y-3">
      <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-1.5 w-full text-left">
        {open ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
        <span className={`text-xs font-semibold ${color}`}>{title}</span>
      </button>
      {open && <div className="space-y-3 pt-1">{children}</div>}
    </div>
  );
};

interface RoutingRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialValue?: any;
  availableOutboundOptions: Array<{ value: string; label: string; protocol?: string }>;
  onSave: (val: any) => void;
}

export const RoutingRuleModal: React.FC<RoutingRuleModalProps> = ({
  isOpen, onClose, initialValue, availableOutboundOptions, onSave,
}) => {
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');
  const [rawJsonText, setRawJsonText] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  // Basic
  const [ruleTag, setRuleTag] = useState('');
  const [outboundTag, setOutboundTag] = useState('direct');
  const [balancerTag, setBalancerTag] = useState('');
  const [useBalancer, setUseBalancer] = useState(false);

  // Domain & IP
  const [domain, setDomain] = useState('');
  const [ip, setIp] = useState('');

  // Port
  const [port, setPort] = useState('');
  const [sourcePort, setSourcePort] = useState('');
  const [localPort, setLocalPort] = useState('');

  // Source & Local
  const [sourceIP, setSourceIP] = useState('');
  const [localIP, setLocalIP] = useState('');
  const [user, setUser] = useState('');
  const [inboundTag, setInboundTag] = useState('');

  // Protocol & Network
  const [protocol, setProtocol] = useState('');
  const [network, setNetwork] = useState('');
  const [attrs, setAttrs] = useState('');

  // Advanced
  const [process, setProcess] = useState('');
  const [vlessRoute, setVlessRoute] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookDedup, setWebhookDedup] = useState('');
  const [webhookHeaders, setWebhookHeaders] = useState('');

  useEffect(() => {
    if (isOpen) {
      const val = initialValue || { type: 'field', outboundTag: 'direct' };
      setRuleTag(val.ruleTag || '');
      if (val.balancerTag && !val.outboundTag) {
        setUseBalancer(true);
        setBalancerTag(val.balancerTag);
        setOutboundTag('direct');
      } else {
        setUseBalancer(false);
        setOutboundTag(val.outboundTag || 'direct');
        setBalancerTag(val.balancerTag || '');
      }
      setDomain(Array.isArray(val.domain) ? val.domain.join(', ') : val.domain || '');
      setIp(Array.isArray(val.ip) ? val.ip.join(', ') : val.ip || '');
      setPort(val.port != null ? String(val.port) : '');
      setSourcePort(val.sourcePort != null ? String(val.sourcePort) : '');
      setLocalPort(val.localPort != null ? String(val.localPort) : '');
      setSourceIP(Array.isArray(val.sourceIP || val.source) ? (val.sourceIP || val.source).join(', ') : (val.sourceIP || val.source || ''));
      setLocalIP(Array.isArray(val.localIP) ? val.localIP.join(', ') : val.localIP || '');
      setUser(Array.isArray(val.user) ? val.user.join(', ') : val.user || '');
      setInboundTag(Array.isArray(val.inboundTag) ? val.inboundTag.join(', ') : val.inboundTag || '');
      setProtocol(Array.isArray(val.protocol) ? val.protocol.join(', ') : val.protocol || '');
      setNetwork(val.network || '');
      setAttrs(val.attrs ? JSON.stringify(val.attrs, null, 2) : '');
      setProcess(Array.isArray(val.process) ? val.process.join(', ') : val.process || '');
      setVlessRoute(val.vlessRoute != null ? String(val.vlessRoute) : '');
      if (val.webhook) {
        setWebhookUrl(val.webhook.url || '');
        setWebhookDedup(val.webhook.deduplication != null ? String(val.webhook.deduplication) : '');
        setWebhookHeaders(val.webhook.headers ? JSON.stringify(val.webhook.headers, null, 2) : '');
      } else {
        setWebhookUrl(''); setWebhookDedup(''); setWebhookHeaders('');
      }
      setRawJsonText(JSON.stringify(val, null, 2));
      setJsonError(null);
      setViewMode('visual');
      setFormKey(k => k + 1);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const toArr = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean);

  const buildRuleObject = (): any => {
    const rule: any = { type: 'field' };
    if (ruleTag.trim()) rule.ruleTag = ruleTag.trim();
    if (useBalancer && balancerTag.trim()) {
      rule.balancerTag = balancerTag.trim();
    } else {
      rule.outboundTag = outboundTag;
    }
    if (domain.trim()) rule.domain = toArr(domain);
    if (ip.trim()) rule.ip = toArr(ip);
    if (port.trim()) rule.port = port.trim();
    if (sourcePort.trim()) rule.sourcePort = sourcePort.trim();
    if (localPort.trim()) rule.localPort = localPort.trim();
    if (sourceIP.trim()) rule.sourceIP = toArr(sourceIP);
    if (localIP.trim()) rule.localIP = toArr(localIP);
    if (user.trim()) rule.user = toArr(user);
    if (inboundTag.trim()) rule.inboundTag = toArr(inboundTag);
    if (protocol.trim()) rule.protocol = toArr(protocol);
    if (network.trim()) rule.network = network.trim();
    if (attrs.trim()) {
      try { rule.attrs = JSON.parse(attrs); } catch { /* skip invalid */ }
    }
    if (process.trim()) rule.process = toArr(process);
    if (vlessRoute.trim()) rule.vlessRoute = vlessRoute.trim();
    if (webhookUrl.trim()) {
      const wh: any = { url: webhookUrl.trim() };
      if (webhookDedup.trim()) wh.deduplication = Number(webhookDedup) || 0;
      if (webhookHeaders.trim()) {
        try { wh.headers = JSON.parse(webhookHeaders); } catch { /* skip */ }
      }
      rule.webhook = wh;
    }
    return rule;
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
      onSave(buildRuleObject());
      onClose();
    }
  };

  const switchToJson = () => {
    if (viewMode === 'visual') {
      setRawJsonText(JSON.stringify(buildRuleObject(), null, 2));
    }
    setViewMode('json');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900/98 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/40">
          <h3 className="font-semibold text-lg text-white">配置路由分流规则</h3>
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
            <div key={formKey} className="space-y-4">
              {/* ── 基础设置 ── */}
              <Collapsible title="基础设置" defaultOpen>
                <div>
                  <label className={labelCls}>规则标识</label>
                  <input type="text" value={ruleTag} onChange={e => setRuleTag(e.target.value)}
                    placeholder="可选，用于调试日志标识此规则" className={inputCls} />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className={labelCls}>目标出站</label>
                    {!useBalancer ? (
                      <CustomSelect options={availableOutboundOptions} value={outboundTag} onChange={setOutboundTag} accentColor="purple" />
                    ) : (
                      <input type="text" value={balancerTag} onChange={e => setBalancerTag(e.target.value)}
                        placeholder="负载均衡器标识" className={inputCls} />
                    )}
                  </div>
                  <div className="pt-5">
                    <button type="button" onClick={() => setUseBalancer(p => !p)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-colors ${
                        useBalancer ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-slate-800/60 text-slate-400 border-white/10 hover:text-slate-200'
                      }`}>
                      {useBalancer ? '负载均衡' : '出站直选'}
                    </button>
                  </div>
                </div>
              </Collapsible>

              {/* ── 域名与IP匹配 ── */}
              <Collapsible title="域名与IP匹配" defaultOpen>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
                  <div>
                    <label className={labelCls}>匹配域名 (逗号分隔)</label>
                    <textarea rows={3} value={domain} onChange={e => setDomain(e.target.value)}
                      placeholder="geosite:cn, domain:google.com" className={textareaCls} />
                  </div>
                  <div>
                    <label className={labelCls}>匹配 IP 地址 (逗号分隔)</label>
                    <textarea rows={3} value={ip} onChange={e => setIp(e.target.value)}
                      placeholder="geoip:cn, 10.0.0.0/8" className={textareaCls} />
                  </div>
                </div>
              </Collapsible>

              {/* ── 端口匹配 ── */}
              <Collapsible title="端口匹配" defaultOpen={!!(port || sourcePort || localPort)}>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
                  <div>
                    <label className={labelCls}>目标端口</label>
                    <input type="text" value={port} onChange={e => setPort(e.target.value)}
                      placeholder="53,443,1000-2000" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>来源端口</label>
                    <input type="text" value={sourcePort} onChange={e => setSourcePort(e.target.value)}
                      placeholder="53,443,1000-2000" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>本地入站端口</label>
                    <input type="text" value={localPort} onChange={e => setLocalPort(e.target.value)}
                      placeholder="监听端口范围" className={inputCls} />
                  </div>
                </div>
              </Collapsible>

              {/* ── 来源与本地 ── */}
              <Collapsible title="来源与入站匹配" defaultOpen={!!(sourceIP || localIP || user || inboundTag)}>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
                  <div>
                    <label className={labelCls}>来源 IP (逗号分隔)</label>
                    <input type="text" value={sourceIP} onChange={e => setSourceIP(e.target.value)}
                      placeholder="10.0.0.1, geoip:private" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>本地入站 IP (逗号分隔)</label>
                    <input type="text" value={localIP} onChange={e => setLocalIP(e.target.value)}
                      placeholder="192.168.0.25" className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
                  <div>
                    <label className={labelCls}>匹配用户邮箱 (逗号分隔)</label>
                    <input type="text" value={user} onChange={e => setUser(e.target.value)}
                      placeholder="love@xray.com" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>入站标识 (逗号分隔)</label>
                    <input type="text" value={inboundTag} onChange={e => setInboundTag(e.target.value)}
                      placeholder="tag-vmess, VLESS_TCP" className={inputCls} />
                  </div>
                </div>
              </Collapsible>

              {/* ── 协议与网络 ── */}
              <Collapsible title="协议与网络" defaultOpen={!!(protocol || network || attrs)}>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
                  <div>
                    <label className={labelCls}>嗅探协议 (逗号分隔)</label>
                    <input type="text" value={protocol} onChange={e => setProtocol(e.target.value)}
                      placeholder="http, tls, quic, bittorrent" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>网络类型</label>
                    <CustomSelect
                      options={[
                        { value: '', label: '不指定' },
                        { value: 'tcp', label: 'tcp' },
                        { value: 'udp', label: 'udp' },
                        { value: 'tcp,udp', label: 'tcp,udp 全部' },
                      ]}
                      value={network} onChange={setNetwork} accentColor="purple" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>HTTP 属性匹配 (JSON 对象)</label>
                  <textarea rows={2} value={attrs} onChange={e => setAttrs(e.target.value)}
                    placeholder='{":method": "GET"} 或 {":path": "/test"}' className={textareaCls} />
                </div>
              </Collapsible>

              {/* ── 高级 ── */}
              <Collapsible title="高级选项" defaultOpen={!!(process || vlessRoute || webhookUrl)}>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
                  <div>
                    <label className={labelCls}>匹配进程名 (逗号分隔)</label>
                    <input type="text" value={process} onChange={e => setProcess(e.target.value)}
                      placeholder="curl, self/, /usr/bin/app" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>VLESS 路由标识</label>
                    <input type="text" value={vlessRoute} onChange={e => setVlessRoute(e.target.value)}
                      placeholder="UUID 第7-8字节路由值" className={inputCls} />
                  </div>
                </div>
                <div className="border-t border-white/5 pt-3 space-y-2">
                  <span className="text-[11px] font-semibold text-amber-300">Webhook 通知</span>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
                    <div>
                      <label className={labelCls}>Webhook URL</label>
                      <input type="text" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
                        placeholder="https://api.example.com/alert" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>去重时间 (秒)</label>
                      <input type="text" value={webhookDedup} onChange={e => setWebhookDedup(e.target.value)}
                        placeholder="300" className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>自定义请求头 (JSON 对象)</label>
                    <input type="text" value={webhookHeaders} onChange={e => setWebhookHeaders(e.target.value)}
                      placeholder='{"X-API-Key": "secret"}' className={inputCls} />
                  </div>
                </div>
              </Collapsible>
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
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-lg shadow-purple-600/20 transition-all font-medium">
            <Save className="w-4 h-4" />保存路由规则
          </button>
        </div>
      </div>
    </div>
  );
};
