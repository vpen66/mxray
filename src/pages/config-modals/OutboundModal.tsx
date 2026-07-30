import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Eye, Code2, AlertCircle } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { CustomSelect } from '../../components/CustomSelect';
import { StreamSettingsPanel } from '../../components/StreamSettingsPanel';

interface OutboundModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialValue?: any;
  onSave: (val: any) => void;
}

const OUTBOUND_PROTOCOL_OPTIONS = [
  { value: 'vless', label: 'VLESS XTLS Vision / REALITY' },
  { value: 'vmess', label: 'VMess 标准传输协议' },
  { value: 'trojan', label: 'Trojan 传输协议' },
  { value: 'shadowsocks', label: 'Shadowsocks 传输协议' },
  { value: 'hysteria2', label: 'Hysteria 2 高并发 UDP' },
  { value: 'wireguard', label: 'WireGuard VPN 协议' },
  { value: 'freedom', label: 'Freedom 直连出站' },
  { value: 'blackhole', label: 'Blackhole 黑洞阻断' },
  { value: 'dns', label: 'DNS 查询转发' },
  { value: 'loopback', label: 'Loopback 本地回环' },
];

const VLESS_FLOW_OPTIONS = [
  { value: '', label: '无流控' },
  { value: 'xtls-rprx-vision', label: 'xtls-rprx-vision' },
  { value: 'xtls-rprx-vision-udp443', label: 'xtls-rprx-vision-udp443' },
];

const VMESS_SECURITY_OPTIONS = [
  { value: 'auto', label: 'auto 自动选择' },
  { value: 'aes-128-gcm', label: 'aes-128-gcm' },
  { value: 'chacha20-poly1305', label: 'chacha20-poly1305' },
  { value: 'none', label: 'none 无加密' },
];

const SS_METHOD_OPTIONS = [
  { value: '2022-blake3-aes-128-gcm', label: '2022-blake3-aes-128-gcm' },
  { value: '2022-blake3-aes-256-gcm', label: '2022-blake3-aes-256-gcm' },
  { value: '2022-blake3-chacha20-poly1305', label: '2022-blake3-chacha20-poly1305' },
  { value: 'aes-256-gcm', label: 'aes-256-gcm' },
  { value: 'aes-128-gcm', label: 'aes-128-gcm' },
  { value: 'chacha20-poly1305', label: 'chacha20-poly1305' },
  { value: 'xchacha20-poly1305', label: 'xchacha20-poly1305' },
];

const FREEDOM_DS_OPTIONS = [
  { value: '', label: '不设置' },
  { value: 'AsIs', label: 'AsIs' },
  { value: 'UseIP', label: 'UseIP' },
  { value: 'UseIPv4', label: 'UseIPv4' },
  { value: 'UseIPv6', label: 'UseIPv6' },
];

// Protocols that don't use streamSettings
const NO_STREAM_PROTOCOLS = ['freedom', 'blackhole', 'dns', 'loopback', 'wireguard'];

const inputCls = 'w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 font-mono';
const inputSmall = 'w-full px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 font-mono';
const labelCls = 'block text-xs font-medium text-slate-300 mb-1.5';

export const OutboundModal: React.FC<OutboundModalProps> = ({
  isOpen,
  onClose,
  initialValue,
  onSave,
}) => {
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');
  const [tag, setTag] = useState('proxy');
  const [protocol, setProtocol] = useState('vless');
  const [address, setAddress] = useState('');
  const [port, setPort] = useState<number | string>(443);
  const [uuid, setUuid] = useState('');
  const [rawJsonText, setRawJsonText] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // VLESS-specific
  const [vlessFlow, setVlessFlow] = useState('xtls-rprx-vision');
  // VMess-specific
  const [vmessSecurity, setVmessSecurity] = useState('auto');
  const [vmessAlterId, setVmessAlterId] = useState(0);
  // Shadowsocks-specific
  const [ssMethod, setSsMethod] = useState('aes-256-gcm');
  const [ssPassword, setSsPassword] = useState('');
  // Freedom-specific
  const [freedomDs, setFreedomDs] = useState('');
  const [freedomRedirect, setFreedomRedirect] = useState('');

  // StreamSettings from panel
  const [streamSettings, setStreamSettings] = useState<any>({});
  const streamSettingsRef = useRef<any>({});

  useEffect(() => {
    if (isOpen) {
      const val = initialValue || {
        tag: 'proxy-new',
        protocol: 'vless',
        settings: {
          vnext: [{ address: 'example.com', port: 443, users: [{ id: '', encryption: 'none', flow: 'xtls-rprx-vision' }] }],
        },
        streamSettings: { method: 'raw', security: 'reality', realitySettings: { serverName: '', publicKey: '', shortId: '' } },
      };

      setTag(val.tag || 'proxy');
      setProtocol(val.protocol || 'vless');

      // Extract address/port/uuid from settings
      if (val.settings?.vnext && val.settings.vnext[0]) {
        const vn = val.settings.vnext[0];
        setAddress(vn.address || '');
        setPort(vn.port || 443);
        setUuid(vn.users?.[0]?.id || '');
        setVlessFlow(vn.users?.[0]?.flow || 'xtls-rprx-vision');
        setVmessSecurity(vn.users?.[0]?.security || 'auto');
        setVmessAlterId(vn.users?.[0]?.alterId ?? 0);
      } else if (val.settings?.servers && val.settings.servers[0]) {
        const srv = val.settings.servers[0];
        setAddress(srv.address || '');
        setPort(srv.port || 443);
        if (val.protocol === 'shadowsocks') {
          setSsMethod(srv.method || 'aes-256-gcm');
          setSsPassword(srv.password || '');
          setUuid('');
        } else {
          setUuid(srv.password || '');
        }
      } else {
        setAddress('');
        setPort(443);
        setUuid('');
      }

      // Freedom
      if (val.protocol === 'freedom') {
        setFreedomDs(val.settings?.domainStrategy || '');
        setFreedomRedirect(val.settings?.redirect || '');
      }

      // Stream settings
      if (val.streamSettings) {
        streamSettingsRef.current = val.streamSettings;
        setStreamSettings(val.streamSettings);
      } else {
        streamSettingsRef.current = {};
        setStreamSettings({});
      }

      setRawJsonText(JSON.stringify(val, null, 2));
      setJsonError(null);
      setViewMode('visual');
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handleStreamSettingsChange = (ss: any) => {
    streamSettingsRef.current = ss;
    setStreamSettings(ss);
  };

  const buildConfigObject = (): any => {
    let settings: any = {};
    const numPort = typeof port === 'number' ? port : Number(port) || 443;
    const trimmedAddr = address.trim();

    switch (protocol) {
      case 'vless':
        settings = {
          vnext: [{
            address: trimmedAddr,
            port: numPort,
            users: [{
              id: uuid.trim(),
              encryption: 'none',
              ...(vlessFlow ? { flow: vlessFlow } : {}),
            }],
          }],
        };
        break;
      case 'vmess':
        settings = {
          vnext: [{
            address: trimmedAddr,
            port: numPort,
            users: [{
              id: uuid.trim(),
              alterId: vmessAlterId,
              security: vmessSecurity,
            }],
          }],
        };
        break;
      case 'trojan':
      case 'hysteria2':
        settings = {
          servers: [{ address: trimmedAddr, port: numPort, password: uuid.trim() }],
        };
        break;
      case 'shadowsocks':
        settings = {
          servers: [{ address: trimmedAddr, port: numPort, method: ssMethod, password: ssPassword.trim() }],
        };
        break;
      case 'freedom':
        settings = {};
        if (freedomDs) settings.domainStrategy = freedomDs;
        if (freedomRedirect) settings.redirect = freedomRedirect;
        break;
      case 'blackhole':
        settings = {};
        break;
      case 'dns':
      case 'loopback':
      case 'wireguard':
        settings = {};
        break;
    }

    const result: any = {
      tag: tag.trim() || 'proxy',
      protocol,
      settings,
    };

    // Attach streamSettings for applicable protocols
    if (!NO_STREAM_PROTOCOLS.includes(protocol)) {
      const ss = streamSettingsRef.current;
      if (ss && Object.keys(ss).length > 0) {
        result.streamSettings = ss;
      }
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
      onSave(buildConfigObject());
      onClose();
    }
  };

  // Whether to show address/port section
  const showAddressSection = !NO_STREAM_PROTOCOLS.includes(protocol);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900/98 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/40">
          <h3 className="font-semibold text-lg text-white">配置出站代理</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-800/80 border border-white/10 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('visual')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'visual' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                可视化结构
              </button>
              <button
                type="button"
                onClick={() => {
                  if (viewMode === 'visual') {
                    setRawJsonText(JSON.stringify(buildConfigObject(), null, 2));
                  }
                  setViewMode('json');
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'json' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                JSON 源码
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
              {/* Basic fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>出站标识</label>
                  <input type="text" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="proxy" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>出站协议</label>
                  <CustomSelect options={OUTBOUND_PROTOCOL_OPTIONS} value={protocol} onChange={setProtocol} />
                </div>
              </div>

              {/* Address / Port / UUID for network protocols */}
              {showAddressSection && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className={labelCls}>服务器地址</label>
                      <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="example.com" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>端口</label>
                      <input type="number" value={port} onChange={(e) => setPort(e.target.value)} placeholder="443" className={inputCls} />
                    </div>
                  </div>

                  {/* Protocol-specific fields */}
                  {protocol === 'vless' && (
                    <div className="space-y-3">
                      <div>
                        <label className={labelCls}>用户 UUID</label>
                        <input type="text" value={uuid} onChange={(e) => setUuid(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>流控模式</label>
                        <CustomSelect options={VLESS_FLOW_OPTIONS} value={vlessFlow} onChange={setVlessFlow} size="sm" accentColor="blue" />
                      </div>
                    </div>
                  )}

                  {protocol === 'vmess' && (
                    <div className="space-y-3">
                      <div>
                        <label className={labelCls}>用户 UUID</label>
                        <input type="text" value={uuid} onChange={(e) => setUuid(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className={inputCls} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}>加密方式</label>
                          <CustomSelect options={VMESS_SECURITY_OPTIONS} value={vmessSecurity} onChange={setVmessSecurity} size="sm" accentColor="blue" />
                        </div>
                        <div>
                          <label className={labelCls}>alterId</label>
                          <input type="number" value={vmessAlterId} onChange={(e) => setVmessAlterId(Number(e.target.value) || 0)} className={inputSmall} />
                        </div>
                      </div>
                    </div>
                  )}

                  {(protocol === 'trojan' || protocol === 'hysteria2') && (
                    <div>
                      <label className={labelCls}>{protocol === 'trojan' ? '密码' : '认证密钥'}</label>
                      <input type="text" value={uuid} onChange={(e) => setUuid(e.target.value)} placeholder={protocol === 'trojan' ? 'Trojan 密码' : 'Hysteria2 认证密钥'} className={inputCls} />
                    </div>
                  )}

                  {protocol === 'shadowsocks' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}>加密方式</label>
                          <CustomSelect options={SS_METHOD_OPTIONS} value={ssMethod} onChange={setSsMethod} size="sm" accentColor="blue" />
                        </div>
                        <div>
                          <label className={labelCls}>密码</label>
                          <input type="text" value={ssPassword} onChange={(e) => setSsPassword(e.target.value)} placeholder="Shadowsocks 密码" className={inputSmall} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Stream Settings Panel */}
                  <div className="pt-2 border-t border-white/5">
                    <h4 className="text-sm font-semibold text-slate-200 mb-3">传输层配置</h4>
                    <StreamSettingsPanel
                      initialValue={streamSettings}
                      isInbound={false}
                      onChange={handleStreamSettingsChange}
                    />
                  </div>
                </>
              )}

              {/* Freedom-specific */}
              {protocol === 'freedom' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>域名解析策略</label>
                      <CustomSelect options={FREEDOM_DS_OPTIONS} value={freedomDs} onChange={setFreedomDs} size="sm" accentColor="blue" />
                    </div>
                    <div>
                      <label className={labelCls}>目标重定向</label>
                      <input type="text" value={freedomRedirect} onChange={(e) => setFreedomRedirect(e.target.value)} placeholder="127.0.0.1:8080" className={inputSmall} />
                    </div>
                  </div>
                </div>
              )}

              {/* Info for special protocols */}
              {(protocol === 'blackhole' || protocol === 'dns' || protocol === 'loopback') && (
                <p className="text-xs text-slate-500">
                  {protocol === 'blackhole' && '黑洞阻断协议将丢弃所有数据，用于屏蔽特定流量。'}
                  {protocol === 'dns' && 'DNS 查询转发协议，将 DNS 请求转发至指定服务器。'}
                  {protocol === 'loopback' && '本地回环协议，将流量回送至本地入站。'}
                </p>
              )}

              {protocol === 'wireguard' && (
                <p className="text-xs text-slate-500">WireGuard 出站的详细配置请使用 JSON 源码模式编辑。</p>
              )}
            </div>
          ) : (
            <div className="h-80 border border-white/10 rounded-xl overflow-hidden">
              <Editor
                height="100%"
                defaultLanguage="json"
                theme="vs-dark"
                value={rawJsonText}
                onChange={(val) => setRawJsonText(val || '')}
                options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false, automaticLayout: true }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-950/60 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 rounded-xl transition-all font-medium">
            取消
          </button>
          <button type="button" onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-600/20 transition-all font-medium">
            <Save className="w-4 h-4" />
            保存出站配置
          </button>
        </div>
      </div>
    </div>
  );
};
