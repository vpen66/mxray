import React, { useState, useEffect } from 'react';
import { X, Save, Eye, Code2, AlertCircle } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { CustomSelect } from '../../components/CustomSelect';

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

const SECURITY_OPTIONS = [
  { value: 'reality', label: 'REALITY 去特征安全传输' },
  { value: 'tls', label: 'TLS 标准 TLS 1.3 传输' },
  { value: 'none', label: 'none 明文无加密' },
];

const NETWORK_OPTIONS = [
  { value: 'tcp', label: 'TCP 底层原始 TCP' },
  { value: 'ws', label: 'WebSocket 伪装传输' },
  { value: 'grpc', label: 'gRPC 高性能复用' },
  { value: 'h2', label: 'HTTP/2 多路复用' },
  { value: 'quic', label: 'QUIC 低延迟传输' },
];

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
  const [flow, setFlow] = useState('xtls-rprx-vision');
  const [security, setSecurity] = useState('reality');
  const [network, setNetwork] = useState('tcp');
  const [sni, setSni] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [shortId, setShortId] = useState('');
  const [rawJsonText, setRawJsonText] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const val = initialValue || {
        tag: 'proxy-new',
        protocol: 'vless',
        settings: {
          vnext: [
            {
              address: 'example.com',
              port: 443,
              users: [{ id: '', encryption: 'none', flow: 'xtls-rprx-vision' }],
            },
          ],
        },
        streamSettings: {
          network: 'tcp',
          security: 'reality',
          realitySettings: { serverName: '', publicKey: '', shortId: '' },
        },
      };

      setTag(val.tag || 'proxy');
      setProtocol(val.protocol || 'vless');

      if (val.settings?.vnext && val.settings.vnext[0]) {
        const vn = val.settings.vnext[0];
        setAddress(vn.address || '');
        setPort(vn.port || 443);
        setUuid(vn.users && vn.users[0] ? vn.users[0].id || '' : '');
        setFlow(vn.users && vn.users[0] ? vn.users[0].flow || 'xtls-rprx-vision' : 'xtls-rprx-vision');
      } else if (val.settings?.servers && val.settings.servers[0]) {
        const srv = val.settings.servers[0];
        setAddress(srv.address || '');
        setPort(srv.port || 443);
        setUuid(srv.password || '');
      } else {
        setAddress('');
        setPort(443);
        setUuid('');
      }

      if (val.streamSettings) {
        setNetwork(val.streamSettings.network || 'tcp');
        setSecurity(val.streamSettings.security || 'none');
        if (val.streamSettings.realitySettings) {
          setSni(val.streamSettings.realitySettings.serverName || '');
          setPublicKey(val.streamSettings.realitySettings.publicKey || '');
          setShortId(val.streamSettings.realitySettings.shortId || '');
        } else if (val.streamSettings.tlsSettings) {
          setSni(val.streamSettings.tlsSettings.serverName || '');
        }
      } else {
        setNetwork('tcp');
        setSecurity('none');
      }

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
      let settings: any = {};
      const numPort = typeof port === 'number' ? port : Number(port) || 443;

      if (protocol === 'vless') {
        settings = {
          vnext: [
            {
              address: address.trim(),
              port: numPort,
              users: [
                {
                  id: uuid.trim(),
                  encryption: 'none',
                  flow: flow.trim() || undefined,
                },
              ],
            },
          ],
        };
      } else if (protocol === 'vmess') {
        settings = {
          vnext: [
            {
              address: address.trim(),
              port: numPort,
              users: [
                {
                  id: uuid.trim(),
                  alterId: 0,
                  security: 'auto',
                },
              ],
            },
          ],
        };
      } else if (protocol === 'trojan' || protocol === 'hysteria2') {
        settings = {
          servers: [
            {
              address: address.trim(),
              port: numPort,
              password: uuid.trim(),
            },
          ],
        };
      } else if (protocol === 'freedom' || protocol === 'blackhole' || protocol === 'dns' || protocol === 'loopback' || protocol === 'wireguard') {
        settings = {};
      }

      const streamSettings: any = {
        network,
        security,
      };

      if (security === 'reality') {
        streamSettings.realitySettings = {
          show: false,
          fingerprint: 'chrome',
          serverName: sni.trim(),
          publicKey: publicKey.trim(),
          shortId: shortId.trim(),
          spiderX: '/',
        };
      } else if (security === 'tls') {
        streamSettings.tlsSettings = {
          serverName: sni.trim(),
          allowInsecure: false,
          fingerprint: 'chrome',
        };
      }

      const result: any = {
        tag: tag.trim() || 'proxy',
        protocol,
        settings,
      };

      if (protocol !== 'freedom' && protocol !== 'blackhole' && protocol !== 'dns' && protocol !== 'loopback' && protocol !== 'wireguard') {
        result.streamSettings = streamSettings;
      }

      onSave(result);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900/98 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/40">
          <h3 className="font-semibold text-lg text-white">配置出站代理</h3>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    出站标识
                  </label>
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    placeholder="proxy"
                    className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    出站协议
                  </label>
                  <CustomSelect
                    options={OUTBOUND_PROTOCOL_OPTIONS}
                    value={protocol}
                    onChange={setProtocol}
                  />
                </div>
              </div>

              {protocol !== 'freedom' && protocol !== 'blackhole' && protocol !== 'dns' && protocol !== 'loopback' && protocol !== 'wireguard' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        服务器地址
                      </label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="example.com"
                        className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        端口
                      </label>
                      <input
                        type="number"
                        value={port}
                        onChange={(e) => setPort(e.target.value)}
                        placeholder="443"
                        className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      用户 UUID / 密钥
                    </label>
                    <input
                      type="text"
                      value={uuid}
                      onChange={(e) => setUuid(e.target.value)}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        传输网络
                      </label>
                      <CustomSelect
                        options={NETWORK_OPTIONS}
                        value={network}
                        onChange={setNetwork}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        传输安全
                      </label>
                      <CustomSelect
                        options={SECURITY_OPTIONS}
                        value={security}
                        onChange={setSecurity}
                      />
                    </div>
                  </div>

                  {security === 'reality' && (
                    <div className="p-4 bg-slate-950/40 border border-white/5 rounded-xl space-y-3">
                      <span className="text-xs font-semibold text-purple-300">REALITY 伪装参数设置</span>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          伪装域名 SNI
                        </label>
                        <input
                          type="text"
                          value={sni}
                          onChange={(e) => setSni(e.target.value)}
                          placeholder="itunes.apple.com"
                          className="w-full px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500/50 font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            公钥
                          </label>
                          <input
                            type="text"
                            value={publicKey}
                            onChange={(e) => setPublicKey(e.target.value)}
                            placeholder="REALITY Public Key"
                            className="w-full px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500/50 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Short ID
                          </label>
                          <input
                            type="text"
                            value={shortId}
                            onChange={(e) => setShortId(e.target.value)}
                            placeholder="如: 6ba85170"
                            className="w-full px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500/50 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
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
            保存出站配置
          </button>
        </div>
      </div>
    </div>
  );
};
