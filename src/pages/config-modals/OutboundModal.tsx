import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Eye, Code2, AlertCircle, Plus, Trash2 } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { CustomSelect } from '../../components/CustomSelect';
import { StreamSettingsPanel } from '../../components/StreamSettingsPanel';
import { ToggleSwitch } from '../../components/ToggleSwitch';

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
  { value: 'hysteria', label: 'Hysteria 高并发 UDP' },
  { value: 'wireguard', label: 'WireGuard VPN 协议' },
  { value: 'socks', label: 'SOCKS 代理协议' },
  { value: 'http', label: 'HTTP 代理协议' },
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

const TARGET_STRATEGY_OPTIONS = [
  { value: '', label: '不设置（默认 AsIs）' },
  { value: 'AsIs', label: 'AsIs 保持原样' },
  { value: 'UseIP', label: 'UseIP' },
  { value: 'UseIPv4', label: 'UseIPv4' },
  { value: 'UseIPv6', label: 'UseIPv6' },
  { value: 'UseIPv4v6', label: 'UseIPv4v6' },
  { value: 'UseIPv6v4', label: 'UseIPv6v4' },
  { value: 'ForceIP', label: 'ForceIP' },
  { value: 'ForceIPv4', label: 'ForceIPv4' },
  { value: 'ForceIPv6', label: 'ForceIPv6' },
  { value: 'ForceIPv4v6', label: 'ForceIPv4v6' },
  { value: 'ForceIPv6v4', label: 'ForceIPv6v4' },
];

const XUDP_PROXY_OPTIONS = [
  { value: 'reject', label: 'reject 拒绝 QUIC' },
  { value: 'allow', label: 'allow 允许' },
  { value: 'skip', label: 'skip 跳过 Mux' },
];

// Protocols that don't use streamSettings
const NO_STREAM_PROTOCOLS = ['freedom', 'blackhole', 'dns', 'loopback', 'wireguard'];

const inputCls = 'w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 font-mono';
const inputSmall = 'w-full px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 font-mono';
const labelCls = 'block text-xs font-medium text-slate-300 mb-1.5';

interface WgPeerEntry { endpoint: string; publicKey: string; preSharedKey: string; keepAlive: number; allowedIPs: string }

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
  const [vlessReverseTag, setVlessReverseTag] = useState('');
  const [vlessReverseSniffing, setVlessReverseSniffing] = useState(false);
  // VMess-specific
  const [vmessSecurity, setVmessSecurity] = useState('auto');
  const [vmessAlterId, setVmessAlterId] = useState(0);
  // Common user-level fields (email for Trojan/SS, level for all)
  const [userEmail, setUserEmail] = useState('');
  const [userLevel, setUserLevel] = useState(0);
  // Shadowsocks-specific
  const [ssMethod, setSsMethod] = useState('aes-256-gcm');
  const [ssPassword, setSsPassword] = useState('');
  // Freedom-specific
  const [freedomDs, setFreedomDs] = useState('');
  const [freedomRedirect, setFreedomRedirect] = useState('');
  const [freedomUserLevel, setFreedomUserLevel] = useState(0);
  // Blackhole-specific
  const [blackholeResponseType, setBlackholeResponseType] = useState('none');
  // DNS outbound-specific
  const [dnsRewriteNetwork, setDnsRewriteNetwork] = useState('');
  const [dnsRewriteAddress, setDnsRewriteAddress] = useState('');
  const [dnsRewritePort, setDnsRewritePort] = useState(0);
  const [dnsUserLevel, setDnsUserLevel] = useState(0);
  // WireGuard-specific
  const [wgSecretKey, setWgSecretKey] = useState('');
  const [wgAddress, setWgAddress] = useState('10.0.0.1, fd59:7153:2388:b5fd::1');
  const [wgPeers, setWgPeers] = useState<WgPeerEntry[]>([{ endpoint: '', publicKey: '', preSharedKey: '', keepAlive: 0, allowedIPs: '0.0.0.0/0, ::/0' }]);
  const [wgMtu, setWgMtu] = useState(1420);
  const [wgReserved, setWgReserved] = useState('');
  const [wgNoKernelTun, setWgNoKernelTun] = useState(false);
  const [wgDomainStrategy, setWgDomainStrategy] = useState('');
  // Loopback-specific
  const [loopbackInboundTag, setLoopbackInboundTag] = useState('');

  // Outbound-level fields
  const [sendThrough, setSendThrough] = useState('');
  const [targetStrategy, setTargetStrategy] = useState('');
  const [proxyTag, setProxyTag] = useState('');
  const [proxyTransportLayer, setProxyTransportLayer] = useState(false);
  const [muxEnabled, setMuxEnabled] = useState(false);
  const [muxConcurrency, setMuxConcurrency] = useState(8);
  const [muxXudpConcurrency, setMuxXudpConcurrency] = useState(0);
  const [muxXudpProxyUDP443, setMuxXudpProxyUDP443] = useState('reject');

  // StreamSettings from panel
  const [streamSettings, setStreamSettings] = useState<any>({});
  const streamSettingsRef = useRef<any>({});
  // 每次打开弹窗递增，用于强制 StreamSettingsPanel 重新挂载以读取新的 initialValue
  const [openKey, setOpenKey] = useState(0);

  const applyInitialValue = (inputVal?: any) => {
      const val = inputVal || {
        tag: 'proxy-new',
        protocol: 'vless',
        settings: {
          address: 'example.com',
          port: 443,
          id: '',
          encryption: 'none',
          flow: 'xtls-rprx-vision',
        },
        streamSettings: { method: 'raw', security: 'reality', realitySettings: { serverName: '', publicKey: '', shortId: '' } },
      };

      setTag(val.tag || 'proxy');
      setProtocol(val.protocol || 'vless');

      // Extract address/port/uuid from settings
      if (val.protocol === 'vless' && val.settings?.address !== undefined) {
        // VLESS flat format (official spec)
        setAddress(val.settings.address || '');
        setPort(val.settings.port || 443);
        setUuid(val.settings.id || '');
        setVlessFlow(val.settings.flow || 'xtls-rprx-vision');
        setUserLevel(val.settings.level ?? 0);
        setVlessReverseTag(val.settings.reverse?.tag || '');
        setVlessReverseSniffing(!!val.settings.reverse?.sniffing);
      } else if (val.settings?.vnext && val.settings.vnext[0]) {
        const vn = val.settings.vnext[0];
        setAddress(vn.address || '');
        setPort(vn.port || 443);
        setUuid(vn.users?.[0]?.id || '');
        const vlessUser = vn.users?.[0] || {};
        setVlessFlow('flow' in vlessUser ? vlessUser.flow : 'xtls-rprx-vision');
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

      // Common user-level email/level
      if (val.protocol === 'vless' && val.settings?.address !== undefined) {
        setUserEmail('');
        setUserLevel(val.settings.level ?? 0);
      } else if (val.settings?.vnext?.[0]?.users?.[0]) {
        setUserEmail('');
        setUserLevel(val.settings.vnext[0].users[0].level ?? 0);
      } else if (val.settings?.servers?.[0]) {
        setUserEmail(val.settings.servers[0].email || '');
        setUserLevel(val.settings.servers[0].level ?? 0);
      } else {
        setUserEmail('');
        setUserLevel(0);
      }

      // Freedom
      if (val.protocol === 'freedom') {
        setFreedomDs(val.settings?.domainStrategy || '');
        setFreedomRedirect(val.settings?.redirect || '');
        setFreedomUserLevel(val.settings?.userLevel ?? 0);
      }
      // Blackhole
      if (val.protocol === 'blackhole') {
        setBlackholeResponseType(val.settings?.response?.type || 'none');
      }
      // DNS outbound
      if (val.protocol === 'dns') {
        setDnsRewriteNetwork(val.settings?.rewriteNetwork || '');
        setDnsRewriteAddress(val.settings?.rewriteAddress || '');
        setDnsRewritePort(val.settings?.rewritePort ?? 0);
        setDnsUserLevel(val.settings?.userLevel ?? 0);
      }
      // WireGuard
      if (val.protocol === 'wireguard') {
        setWgSecretKey(val.settings?.secretKey || '');
        setWgAddress(Array.isArray(val.settings?.address) ? val.settings.address.join(', ') : (val.settings?.address || '10.0.0.1, fd59:7153:2388:b5fd::1'));
        setWgMtu(val.settings?.mtu ?? 1420);
        setWgReserved(Array.isArray(val.settings?.reserved) ? val.settings.reserved.join(', ') : '');
        setWgNoKernelTun(val.settings?.noKernelTun === true);
        setWgDomainStrategy(val.settings?.domainStrategy || '');
        if (Array.isArray(val.settings?.peers) && val.settings.peers.length > 0) {
          setWgPeers(val.settings.peers.map((p: any) => ({
            endpoint: p.endpoint || '',
            publicKey: p.publicKey || '',
            preSharedKey: p.preSharedKey || '',
            keepAlive: p.keepAlive ?? 0,
            allowedIPs: Array.isArray(p.allowedIPs) ? p.allowedIPs.join(', ') : (p.allowedIPs || '0.0.0.0/0, ::/0'),
          })));
        } else {
          setWgPeers([{ endpoint: '', publicKey: '', preSharedKey: '', keepAlive: 0, allowedIPs: '0.0.0.0/0, ::/0' }]);
        }
      }
      // Loopback
      if (val.protocol === 'loopback') {
        setLoopbackInboundTag(val.settings?.inboundTag || '');
      }

      // Outbound-level fields
      setSendThrough(val.sendThrough || '');
      setTargetStrategy(val.targetStrategy || '');
      setProxyTag(val.proxySettings?.tag || '');
      setProxyTransportLayer(val.proxySettings?.transportLayer === true);
      setMuxEnabled(val.mux?.enabled === true);
      setMuxConcurrency(val.mux?.concurrency ?? 8);
      setMuxXudpConcurrency(val.mux?.xudpConcurrency ?? 0);
      setMuxXudpProxyUDP443(val.mux?.xudpProxyUDP443 || 'reject');

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
  };

  useEffect(() => {
    if (isOpen) {
      setOpenKey(k => k + 1);
      applyInitialValue(initialValue);
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
      case 'vless': {
        settings = {
          address: trimmedAddr,
          port: numPort,
          id: uuid.trim(),
          encryption: 'none',
          flow: vlessFlow,
          ...(userLevel > 0 ? { level: userLevel } : {}),
        };
        const reverseObj: any = {};
        if (vlessReverseTag.trim()) reverseObj.tag = vlessReverseTag.trim();
        if (vlessReverseSniffing) reverseObj.sniffing = {};
        if (Object.keys(reverseObj).length > 0) settings.reverse = reverseObj;
        break;
      }
      case 'vmess':
        settings = {
          vnext: [{
            address: trimmedAddr,
            port: numPort,
            users: [{
              id: uuid.trim(),
              alterId: vmessAlterId,
              security: vmessSecurity,
              ...(userLevel > 0 ? { level: userLevel } : {}),
            }],
          }],
        };
        break;
      case 'trojan':
        settings = {
          servers: [{
            address: trimmedAddr, port: numPort, password: uuid.trim(),
            ...(userEmail.trim() ? { email: userEmail.trim() } : {}),
            ...(userLevel > 0 ? { level: userLevel } : {}),
          }],
        };
        break;
      case 'hysteria':
        settings = { version: 2, address: trimmedAddr, port: numPort };
        break;
      case 'shadowsocks':
        settings = {
          servers: [{
            address: trimmedAddr, port: numPort, method: ssMethod, password: ssPassword.trim(),
            ...(userEmail.trim() ? { email: userEmail.trim() } : {}),
            ...(userLevel > 0 ? { level: userLevel } : {}),
          }],
        };
        break;
      case 'freedom':
        settings = {};
        if (freedomDs) settings.domainStrategy = freedomDs;
        if (freedomRedirect) settings.redirect = freedomRedirect;
        if (freedomUserLevel > 0) settings.userLevel = freedomUserLevel;
        break;
      case 'blackhole':
        settings = { response: { type: blackholeResponseType || 'none' } };
        break;
      case 'dns': {
        const dnsSettings: any = {};
        if (dnsRewriteNetwork) dnsSettings.rewriteNetwork = dnsRewriteNetwork;
        if (dnsRewriteAddress.trim()) dnsSettings.rewriteAddress = dnsRewriteAddress.trim();
        if (dnsRewritePort > 0) dnsSettings.rewritePort = dnsRewritePort;
        if (dnsUserLevel > 0) dnsSettings.userLevel = dnsUserLevel;
        settings = dnsSettings;
        break;
      }
      case 'loopback':
        settings = loopbackInboundTag.trim() ? { inboundTag: loopbackInboundTag.trim() } : {};
        break;
      case 'wireguard': {
        const wgSettings: any = {};
        if (wgSecretKey.trim()) wgSettings.secretKey = wgSecretKey.trim();
        const addrArr = wgAddress.split(',').map(s => s.trim()).filter(Boolean);
        if (addrArr.length > 0) wgSettings.address = addrArr;
        const validPeers = wgPeers.filter(p => p.endpoint.trim() && p.publicKey.trim());
        if (validPeers.length > 0) {
          wgSettings.peers = validPeers.map(p => {
            const peer: any = { endpoint: p.endpoint.trim(), publicKey: p.publicKey.trim() };
            if (p.preSharedKey.trim()) peer.preSharedKey = p.preSharedKey.trim();
            if (p.keepAlive > 0) peer.keepAlive = p.keepAlive;
            const ips = p.allowedIPs.split(',').map(s => s.trim()).filter(Boolean);
            if (ips.length > 0) peer.allowedIPs = ips;
            return peer;
          });
        }
        if (wgMtu !== 1420) wgSettings.mtu = wgMtu;
        const reservedArr = wgReserved.split(',').map(s => s.trim()).filter(Boolean).map(Number).filter(n => !isNaN(n));
        if (reservedArr.length > 0) wgSettings.reserved = reservedArr;
        if (wgNoKernelTun) wgSettings.noKernelTun = true;
        if (wgDomainStrategy) wgSettings.domainStrategy = wgDomainStrategy;
        settings = wgSettings;
        break;
      }
      case 'socks':
        settings = {
          servers: [{ address: trimmedAddr, port: numPort, users: uuid.trim() ? [{ user: uuid.trim(), pass: ssPassword.trim() }] : [] }],
        };
        break;
      case 'http':
        settings = {
          servers: [{ address: trimmedAddr, port: numPort, users: uuid.trim() ? [{ user: uuid.trim(), pass: ssPassword.trim() }] : [] }],
        };
        break;
    }

    const result: any = {
      tag: tag.trim() || 'proxy',
      protocol,
      settings,
    };

    // sendThrough
    if (sendThrough.trim()) result.sendThrough = sendThrough.trim();

    // targetStrategy
    if (targetStrategy) result.targetStrategy = targetStrategy;

    // proxySettings
    if (proxyTag.trim()) {
      result.proxySettings = { tag: proxyTag.trim(), transportLayer: proxyTransportLayer };
    }

    // mux
    if (muxEnabled) {
      result.mux = {
        enabled: true,
        concurrency: muxConcurrency,
        xudpConcurrency: muxXudpConcurrency,
        xudpProxyUDP443: muxXudpProxyUDP443,
      };
    }

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
                  if (viewMode === 'json') {
                    // 从 JSON 源码切回可视化：用编辑后的 JSON 重新填充所有字段
                    try {
                      applyInitialValue(JSON.parse(rawJsonText));
                      setOpenKey(k => k + 1);
                    } catch { /* JSON 非法时保持现状 */ }
                  } else {
                    setRawJsonText(JSON.stringify(buildConfigObject(), null, 2));
                  }
                  setViewMode(viewMode === 'visual' ? 'json' : 'visual');
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
                      <div>
                        <label className={labelCls}>用户等级</label>
                        <input type="number" value={userLevel} onChange={(e) => setUserLevel(Number(e.target.value) || 0)} className={inputSmall} />
                      </div>
                      <div className="p-3 bg-slate-800/30 border border-white/5 rounded-xl space-y-3">
                        <p className="text-xs font-semibold text-blue-300">反向代理</p>
                        <p className="text-[11px] text-slate-500">启用后该出站可作为 VLESS 反向代理出站，向服务端注册隧道并保留公网源 IP。</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className={labelCls}>反向入站标识 tag</label>
                            <input type="text" value={vlessReverseTag} onChange={(e) => setVlessReverseTag(e.target.value)} placeholder="留空则不启用" className={inputSmall} />
                          </div>
                          <div className="flex items-end gap-2">
                            <ToggleSwitch checked={vlessReverseSniffing} onChange={() => setVlessReverseSniffing(p => !p)} activeColor="blue" size="sm" ariaLabel="启用流量嗅探" />
                            <span className="text-xs text-slate-400">启用流量嗅探 sniffing</span>
                          </div>
                        </div>
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
                      <div>
                        <label className={labelCls}>用户等级</label>
                        <input type="number" value={userLevel} onChange={(e) => setUserLevel(Number(e.target.value) || 0)} className={inputSmall} />
                      </div>
                    </div>
                  )}

                  {protocol === 'trojan' && (
                    <div className="space-y-3">
                      <div>
                        <label className={labelCls}>密码</label>
                        <input type="text" value={uuid} onChange={(e) => setUuid(e.target.value)} placeholder="Trojan 密码" className={inputCls} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}>用户邮箱</label>
                          <input type="text" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="可选，用于流量统计" className={inputSmall} />
                        </div>
                        <div>
                          <label className={labelCls}>用户等级</label>
                          <input type="number" value={userLevel} onChange={(e) => setUserLevel(Number(e.target.value) || 0)} className={inputSmall} />
                        </div>
                      </div>
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
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}>用户邮箱</label>
                          <input type="text" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="可选，用于流量统计" className={inputSmall} />
                        </div>
                        <div>
                          <label className={labelCls}>用户等级</label>
                          <input type="number" value={userLevel} onChange={(e) => setUserLevel(Number(e.target.value) || 0)} className={inputSmall} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Stream Settings Panel */}
                  <div className="pt-2 border-t border-white/5">
                    <h4 className="text-sm font-semibold text-slate-200 mb-3">传输层配置</h4>
                    <StreamSettingsPanel
                      key={`${openKey}-${protocol}`}
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
                  <div>
                    <label className={labelCls}>用户等级</label>
                    <input type="number" value={freedomUserLevel} onChange={(e) => setFreedomUserLevel(Number(e.target.value) || 0)} className={inputSmall} />
                  </div>
                </div>
              )}

              {/* Blackhole-specific */}
              {protocol === 'blackhole' && (
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>响应类型</label>
                    <CustomSelect
                      options={[
                        { value: 'none', label: 'none 无响应丢弃数据' },
                        { value: 'http', label: 'http 返回空 HTTP 响应' },
                      ]}
                      value={blackholeResponseType}
                      onChange={setBlackholeResponseType}
                      size="sm"
                      accentColor="blue"
                    />
                  </div>
                  <p className="text-xs text-slate-500">黑洞阻断协议将丢所有数据，用于屏蔽特定流量。</p>
                </div>
              )}

              {/* DNS outbound settings */}
              {protocol === 'dns' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">DNS 查询转发协议，将 DNS 请求转发至指定服务器，支持改写目标地址、端口和协议。</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className={labelCls}>改写传输协议</label>
                      <CustomSelect
                        options={[
                          { value: '', label: '保持来源' },
                          { value: 'tcp', label: 'TCP' },
                          { value: 'udp', label: 'UDP' },
                        ]}
                        value={dnsRewriteNetwork}
                        onChange={setDnsRewriteNetwork}
                        size="sm"
                        accentColor="blue"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>改写地址</label>
                      <input type="text" value={dnsRewriteAddress} onChange={(e) => setDnsRewriteAddress(e.target.value)} placeholder="保持来源" className={inputSmall} />
                    </div>
                    <div>
                      <label className={labelCls}>改写端口</label>
                      <input type="number" value={dnsRewritePort || ''} onChange={(e) => setDnsRewritePort(Number(e.target.value) || 0)} placeholder="53" className={inputSmall} />
                    </div>
                    <div>
                      <label className={labelCls}>用户等级</label>
                      <input type="number" value={dnsUserLevel} onChange={(e) => setDnsUserLevel(Number(e.target.value) || 0)} className={inputSmall} />
                    </div>
                  </div>
                </div>
              )}

              {/* Loopback settings */}
              {protocol === 'loopback' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">本地回环协议，将流量重新送回 routing 处理，可借助 balancer 实现复杂分流。</p>
                  <div>
                    <label className={labelCls}>回环入站标识 inboundTag</label>
                    <input type="text" value={loopbackInboundTag} onChange={(e) => setLoopbackInboundTag(e.target.value)} placeholder="用于路由重新匹配的入站 Tag" className={inputSmall} />
                  </div>
                </div>
              )}

              {protocol === 'wireguard' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">WireGuard VPN 协议，支持完整配置。注意 WireGuard 不支持 streamSettings。</p>
                  <div>
                    <label className={labelCls}>私钥 SecretKey</label>
                    <input type="text" value={wgSecretKey} onChange={(e) => setWgSecretKey(e.target.value)} placeholder="WireGuard Private Key" className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>虚拟网卡地址 (逗号分隔)</label>
                      <input type="text" value={wgAddress} onChange={(e) => setWgAddress(e.target.value)} placeholder="10.0.0.1, fd59:7153:2388:b5fd::1" className={inputSmall} />
                    </div>
                    <div>
                      <label className={labelCls}>MTU</label>
                      <input type="number" value={wgMtu} onChange={(e) => setWgMtu(Number(e.target.value) || 1420)} placeholder="1420" className={inputSmall} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Reserved 保留字节 (逗号分隔)</label>
                      <input type="text" value={wgReserved} onChange={(e) => setWgReserved(e.target.value)} placeholder="1, 2, 3" className={inputSmall} />
                    </div>
                    <div>
                      <label className={labelCls}>域名解析策略</label>
                      <CustomSelect
                        options={[
                          { value: '', label: '默认 ForceIP' },
                          { value: 'ForceIP', label: 'ForceIP' },
                          { value: 'ForceIPv4', label: 'ForceIPv4' },
                          { value: 'ForceIPv6', label: 'ForceIPv6' },
                          { value: 'ForceIPv4v6', label: 'ForceIPv4v6' },
                          { value: 'ForceIPv6v4', label: 'ForceIPv6v4' },
                        ]}
                        value={wgDomainStrategy}
                        onChange={setWgDomainStrategy}
                        size="sm"
                        accentColor="blue"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-950/40 border border-white/5 rounded-xl">
                    <div>
                      <span className="text-sm font-medium text-slate-200">禁用系统 TUN</span>
                      <p className="text-xs text-slate-400">禁用内核虚拟网卡，使用 gvisor 替代</p>
                    </div>
                    <ToggleSwitch checked={wgNoKernelTun} onChange={() => setWgNoKernelTun(p => !p)} activeColor="blue" size="sm" ariaLabel="禁用系统 TUN" />
                  </div>
                  <div className="p-3 bg-slate-800/30 border border-white/5 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-blue-300">对端节点列表</span>
                      <button type="button" onClick={() => setWgPeers(prev => [...prev, { endpoint: '', publicKey: '', preSharedKey: '', keepAlive: 0, allowedIPs: '0.0.0.0/0, ::/0' }])} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                        <Plus className="w-3.5 h-3.5" />添加节点
                      </button>
                    </div>
                    {wgPeers.map((peer, i) => (
                      <div key={i} className="space-y-2 pb-2 border-b border-white/5 last:border-0">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] text-slate-400 mb-1 block">Endpoint 端点地址</label>
                            <input type="text" value={peer.endpoint} onChange={(e) => setWgPeers(prev => prev.map((p, idx) => idx === i ? { ...p, endpoint: e.target.value } : p))} placeholder="engage.cloudflareclient.com:2408" className={inputSmall} />
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-400 mb-1 block">PublicKey 公钥</label>
                            <input type="text" value={peer.publicKey} onChange={(e) => setWgPeers(prev => prev.map((p, idx) => idx === i ? { ...p, publicKey: e.target.value } : p))} placeholder="服务器公钥" className={inputSmall} />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[11px] text-slate-400 mb-1 block">PreSharedKey</label>
                            <input type="text" value={peer.preSharedKey} onChange={(e) => setWgPeers(prev => prev.map((p, idx) => idx === i ? { ...p, preSharedKey: e.target.value } : p))} placeholder="可选" className={inputSmall} />
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-400 mb-1 block">KeepAlive 秒</label>
                            <input type="number" value={peer.keepAlive} onChange={(e) => setWgPeers(prev => prev.map((p, idx) => idx === i ? { ...p, keepAlive: Number(e.target.value) || 0 } : p))} placeholder="0" className={inputSmall} />
                          </div>
                          <div className="flex items-end gap-1">
                            {wgPeers.length > 1 && (
                              <button type="button" onClick={() => setWgPeers(prev => prev.filter((_, idx) => idx !== i))} className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 mb-1 block">AllowedIPs (逗号分隔)</label>
                          <input type="text" value={peer.allowedIPs} onChange={(e) => setWgPeers(prev => prev.map((p, idx) => idx === i ? { ...p, allowedIPs: e.target.value } : p))} placeholder="0.0.0.0/0, ::/0" className={inputSmall} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SOCKS / HTTP proxy user/pass */}
              {(protocol === 'socks' || protocol === 'http') && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>用户名</label>
                      <input type="text" value={uuid} onChange={(e) => setUuid(e.target.value)} placeholder="留空则无认证" className={inputSmall} />
                    </div>
                    <div>
                      <label className={labelCls}>密码</label>
                      <input type="text" value={ssPassword} onChange={(e) => setSsPassword(e.target.value)} placeholder="留空则无认证" className={inputSmall} />
                    </div>
                  </div>
                </div>
              )}

              {/* Outbound-level: sendThrough / targetStrategy */}
              <div className="border-t border-white/10 pt-4 mt-2">
                <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wide">出站高级设置</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>发送源地址 sendThrough</label>
                    <input type="text" value={sendThrough} onChange={(e) => setSendThrough(e.target.value)} placeholder="0.0.0.0 默认" className={inputSmall} />
                  </div>
                  <div>
                    <label className={labelCls}>目标域名策略 targetStrategy</label>
                    <CustomSelect options={TARGET_STRATEGY_OPTIONS} value={targetStrategy} onChange={setTargetStrategy} size="sm" accentColor="blue" />
                  </div>
                </div>
              </div>

              {/* proxySettings */}
              <div className="border border-white/10 rounded-xl p-3 space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">出站代理 proxySettings</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>代理目标 Tag</label>
                    <input type="text" value={proxyTag} onChange={(e) => setProxyTag(e.target.value)} placeholder="留空则不设置" className={inputSmall} />
                  </div>
                  <div className="flex items-end gap-2">
                    <ToggleSwitch checked={proxyTransportLayer} onChange={() => setProxyTransportLayer(p => !p)} activeColor="blue" size="sm" ariaLabel="传输层转发" />
                    <span className="text-xs text-slate-400">启用传输层转发 transportLayer</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500">将此出站的数据转发给另一个出站，与 Sockopt.dialerProxy 冲突。</p>
              </div>

              {/* Mux / XUDP */}
              <div className="border border-white/10 rounded-xl p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">多路复用 Mux / XUDP</p>
                  <ToggleSwitch checked={muxEnabled} onChange={() => setMuxEnabled(p => !p)} activeColor="blue" size="sm" ariaLabel="启用 Mux" />
                </div>
                {muxEnabled && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className={labelCls}>TCP 并发数</label>
                      <input type="number" value={muxConcurrency} onChange={(e) => setMuxConcurrency(Number(e.target.value) || 8)} min={-1} max={128} className={inputSmall} />
                    </div>
                    <div>
                      <label className={labelCls}>XUDP 并发数</label>
                      <input type="number" value={muxXudpConcurrency} onChange={(e) => setMuxXudpConcurrency(Number(e.target.value) || 0)} min={-1} max={1024} className={inputSmall} />
                    </div>
                    <div>
                      <label className={labelCls}>QUIC 流量处理</label>
                      <CustomSelect options={XUDP_PROXY_OPTIONS} value={muxXudpProxyUDP443} onChange={setMuxXudpProxyUDP443} size="sm" accentColor="blue" />
                    </div>
                  </div>
                )}
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
