import React, { useState, useEffect } from 'react';
import { X, Save, Eye, Code2, AlertCircle, Plus, Trash2, Zap, ShieldCheck, Eraser, RefreshCw } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { invoke } from '@tauri-apps/api/core';
import { CustomSelect } from '../../components/CustomSelect';
import { ToggleSwitch } from '../../components/ToggleSwitch';
import { StreamSettingsPanel } from '../../components/StreamSettingsPanel';
import { FieldLabel } from '../../components/FieldLabel';

interface InboundModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialValue?: any;
  onSave: (val: any) => void;
}

const INBOUND_PROTOCOL_OPTIONS = [
  { value: 'tunnel', label: 'Tunnel 隧道转发' },
  { value: 'http', label: 'HTTP 入站代理' },
  { value: 'shadowsocks', label: 'Shadowsocks 入站' },
  { value: 'socks', label: 'Socks 入站代理' },
  { value: 'trojan', label: 'Trojan 入站' },
  { value: 'vless', label: 'VLESS XTLS Vision Seed' },
  { value: 'vmess', label: 'VMess 入站' },
  { value: 'wireguard', label: 'WireGuard 入站' },
  { value: 'hysteria', label: 'Hysteria 入站' },
  { value: 'tun', label: 'TUN 虚拟网卡入站' },
];

const SOCKS_AUTH_OPTIONS = [
  { value: 'noauth', label: 'noauth 无需密码' },
  { value: 'password', label: 'password 账号密码认证' },
];

const NETWORK_TYPE_OPTIONS = [
  { value: 'tcp', label: 'TCP' },
  { value: 'udp', label: 'UDP' },
  { value: 'tcp,udp', label: 'TCP + UDP' },
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

const FLOW_OPTIONS = [
  { value: '', label: '无流控 普通 TLS' },
  { value: 'xtls-rprx-vision', label: 'xtls-rprx-vision' },
  { value: 'xtls-rprx-vision-udp443', label: 'xtls-rprx-vision-udp443' },
];

// 通用输入框样式
const inputCls = 'w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 font-mono';
const labelCls = 'block text-xs font-medium text-slate-300 mb-1.5';
const subPanelCls = 'p-4 bg-slate-950/40 border border-white/5 rounded-xl space-y-3';

interface UserEntry { user: string; pass: string }
interface SocksUser { user: string; pass: string }
interface ClientEntry { id: string; level: number; email: string; flow?: string; reverseTag?: string }
interface TrojanUser { password: string; email: string; level: number }
interface HysteriaUser { auth: string; level: number; email: string }
interface WgPeer { publicKey: string; allowedIPs: string }
interface PortMapEntry { local: string; remote: string }

const inputSmall = 'w-full px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 font-mono';

export const InboundModal: React.FC<InboundModalProps> = ({
  isOpen,
  onClose,
  initialValue,
  onSave,
}) => {
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');
  const [tag, setTag] = useState('socks-in');
  const [protocol, setProtocol] = useState('socks');
  const [listen, setListen] = useState('127.0.0.1');
  const [port, setPort] = useState<number | string>(7890);
  const [sniffing, setSniffing] = useState(true);
  const [sniffDestOverride, setSniffDestOverride] = useState<string[]>(['http', 'tls', 'fakedns']);
  const [sniffMetadataOnly, setSniffMetadataOnly] = useState(false);
  const [sniffDomainsExcluded, setSniffDomainsExcluded] = useState('');
  const [sniffIpsExcluded, setSniffIpsExcluded] = useState('');
  const [sniffRouteOnly, setSniffRouteOnly] = useState(false);
  const [rawJsonText, setRawJsonText] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Socks
  const [socksAuth, setSocksAuth] = useState('noauth');
  const [socksUsers, setSocksUsers] = useState<SocksUser[]>([]);
  const [socksUdp, setSocksUdp] = useState(false);
  const [socksIp, setSocksIp] = useState('127.0.0.1');
  const [socksUserLevel, setSocksUserLevel] = useState(0);

  // HTTP
  const [httpUsers, setHttpUsers] = useState<UserEntry[]>([]);
  const [httpAllowTransparent, setHttpAllowTransparent] = useState(false);
  const [httpUserLevel, setHttpUserLevel] = useState(0);

  // Tunnel
  const [tunnelAllowedNetwork, setTunnelAllowedNetwork] = useState('tcp');
  const [tunnelRewriteAddress, setTunnelRewriteAddress] = useState('');
  const [tunnelRewritePort, setTunnelRewritePort] = useState<number | string>(0);
  const [tunnelPortMap, setTunnelPortMap] = useState<PortMapEntry[]>([]);
  const [tunnelFollowRedirect, setTunnelFollowRedirect] = useState(false);
  const [tunnelUserLevel, setTunnelUserLevel] = useState(0);

  // Shadowsocks
  const [ssNetwork, setSsNetwork] = useState('tcp,udp');
  const [ssMethod, setSsMethod] = useState('aes-256-gcm');
  const [ssPassword, setSsPassword] = useState('');
  const [ssEmail, setSsEmail] = useState('');
  const [ssLevel, setSsLevel] = useState(0);

  // Trojan
  const [trojanUsers, setTrojanUsers] = useState<TrojanUser[]>([{ password: '', email: '', level: 0 }]);

  // VLESS
  const [vlessUsers, setVlessUsers] = useState<ClientEntry[]>([{ id: '', level: 0, email: '', flow: 'xtls-rprx-vision' }]);
  const [vlessDecryption, setVlessDecryption] = useState('none');
  const [vlessEncryption, setVlessEncryption] = useState('none');
  const [vlessEncType, setVlessEncType] = useState<'none' | 'x25519' | 'mlkem768'>('none');
  const [vlessEncGenerating, setVlessEncGenerating] = useState(false);

  // VMess
  const [vmessUsers, setVmessUsers] = useState<ClientEntry[]>([{ id: '', level: 0, email: '' }]);

  // WireGuard
  const [wgSecretKey, setWgSecretKey] = useState('');
  const [wgPeers, setWgPeers] = useState<WgPeer[]>([{ publicKey: '', allowedIPs: '0.0.0.0/0, ::/0' }]);
  const [wgMtu, setWgMtu] = useState(1420);

  // Hysteria
  const [hysteriaUsers, setHysteriaUsers] = useState<HysteriaUser[]>([{ auth: '', level: 0, email: '' }]);

  // Stream settings (for vless, vmess, trojan, socks)
  const [streamSettings, setStreamSettings] = useState<any>({});
  const streamSettingsRef = React.useRef<any>({});
  // 每次打开弹窗递增，用于强制 StreamSettingsPanel 重新挂载以读取新的 initialValue
  const [openKey, setOpenKey] = useState(0);

  // TUN
  const [tunName, setTunName] = useState('');
  const [tunDesc, setTunDesc] = useState('');
  const [tunMtu, setTunMtu] = useState<number>(1500);
  const [tunGateway, setTunGateway] = useState('10.0.0.1/16, fc00::1/64');
  const [tunDns, setTunDns] = useState('1.1.1.1, 8.8.8.8');
  const [tunUserLevel, setTunUserLevel] = useState(0);
  const [tunAutoRouting, setTunAutoRouting] = useState('0.0.0.0/0, ::/0');
  const [tunAutoOutbounds, setTunAutoOutbounds] = useState('auto');

  const applyInitialValue = (inputVal?: any) => {
      const val = inputVal || {
        tag: 'socks-in',
        port: 7890,
        listen: '127.0.0.1',
        protocol: 'socks',
        settings: { auth: 'noauth', udp: true },
        sniffing: { enabled: true },
      };
      setTag(val.tag || 'inbound');
      setProtocol(val.protocol || 'socks');
      setListen(val.listen || '127.0.0.1');
      setPort(val.port ?? 7890);
      setSniffing(val.sniffing?.enabled !== false);
      const sn = val.sniffing || {};
      setSniffDestOverride(Array.isArray(sn.destOverride) ? sn.destOverride : ['http', 'tls', 'fakedns']);
      setSniffMetadataOnly(sn.metadataOnly === true);
      setSniffDomainsExcluded(Array.isArray(sn.domainsExcluded) ? sn.domainsExcluded.join('\n') : '');
      setSniffIpsExcluded(Array.isArray(sn.ipsExcluded) ? sn.ipsExcluded.join('\n') : '');
      setSniffRouteOnly(sn.routeOnly === true);

      const s = val.settings || {};

      // Socks
      setSocksAuth(s.auth || 'noauth');
      setSocksUsers(Array.isArray(s.users) && s.users.length > 0 ? s.users.map((u: any) => ({ user: u.user || '', pass: u.pass || '' })) : []);
      setSocksUdp(s.udp !== false);
      setSocksIp(s.ip || '127.0.0.1');
      setSocksUserLevel(s.userLevel ?? 0);

      // HTTP
      setHttpUsers(Array.isArray(s.users) && s.users.length > 0 ? s.users.map((u: any) => ({ user: u.user || '', pass: u.pass || '' })) : []);
      setHttpAllowTransparent(s.allowTransparent === true);
      setHttpUserLevel(s.userLevel ?? 0);

      // Tunnel
      setTunnelAllowedNetwork(s.allowedNetwork || 'tcp');
      setTunnelRewriteAddress(s.rewriteAddress || '');
      setTunnelRewritePort(s.rewritePort ?? 0);
      setTunnelFollowRedirect(s.followRedirect === true);
      setTunnelUserLevel(s.userLevel ?? 0);
      if (s.portMap && typeof s.portMap === 'object') {
        setTunnelPortMap(Object.entries(s.portMap).map(([local, remote]) => ({ local, remote: remote as string })));
      } else {
        setTunnelPortMap([]);
      }

      // Shadowsocks
      setSsNetwork(s.network || 'tcp,udp');
      setSsMethod(s.method || 'aes-256-gcm');
      setSsPassword(s.password || '');
      setSsEmail(s.email || '');
      setSsLevel(s.level ?? 0);

      // Trojan
      setTrojanUsers(Array.isArray(s.users) && s.users.length > 0 ? s.users.map((u: any) => ({ password: u.password || '', email: u.email || '', level: u.level ?? 0 })) : [{ password: '', email: '', level: 0 }]);

      // VLESS
      setVlessUsers(Array.isArray(s.users) && s.users.length > 0 ? s.users.map((u: any) => ({ id: u.id || '', level: u.level ?? 0, email: u.email || '', flow: u.flow || '', reverseTag: u.reverse?.tag || '' })) : [{ id: '', level: 0, email: '', flow: 'xtls-rprx-vision', reverseTag: '' }]);
      setVlessDecryption(s.decryption || 'none');
      setVlessEncryption(s.encryption || 'none');
      if (s.encryption && s.encryption !== 'none') {
        if (s.decryption?.includes('mlkem768x25519plus')) {
          setVlessEncType(s.encryption.length > 200 ? 'mlkem768' : 'x25519');
        } else {
          setVlessEncType('x25519');
        }
      } else {
        setVlessEncType('none');
      }

      // VMess
      setVmessUsers(Array.isArray(s.users) && s.users.length > 0 ? s.users.map((u: any) => ({ id: u.id || '', level: u.level ?? 0, email: u.email || '' })) : [{ id: '', level: 0, email: '' }]);

      // WireGuard
      setWgSecretKey(s.secretKey || '');
      setWgPeers(Array.isArray(s.peers) && s.peers.length > 0 ? s.peers.map((p: any) => ({ publicKey: p.publicKey || '', allowedIPs: Array.isArray(p.allowedIPs) ? p.allowedIPs.join(', ') : (p.allowedIPs || '0.0.0.0/0, ::/0') })) : [{ publicKey: '', allowedIPs: '0.0.0.0/0, ::/0' }]);
      setWgMtu(s.mtu ?? 1420);

      // Hysteria
      setHysteriaUsers(Array.isArray(s.users) && s.users.length > 0 ? s.users.map((u: any) => ({ auth: u.auth || '', level: u.level ?? 0, email: u.email || '' })) : [{ auth: '', level: 0, email: '' }]);

      // TUN
      if (val.protocol === 'tun') {
        setTunName(s.name || '');
        setTunDesc(s.desc || '');
        setTunMtu(s.mtu ?? 1500);
        setTunGateway(Array.isArray(s.gateway) ? s.gateway.join(', ') : (s.gateway || '10.0.0.1/16, fc00::1/64'));
        setTunDns(Array.isArray(s.dns) ? s.dns.join(', ') : (s.dns || '1.1.1.1, 8.8.8.8'));
        setTunUserLevel(s.userLevel ?? 0);
        setTunAutoRouting(Array.isArray(s.autoSystemRoutingTable) ? s.autoSystemRoutingTable.join(', ') : (s.autoSystemRoutingTable || '0.0.0.0/0, ::/0'));
        setTunAutoOutbounds(s.autoOutboundsInterface || 'auto');
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
  };

  useEffect(() => {
    if (isOpen) {
      setOpenKey(k => k + 1);
      applyInitialValue(initialValue);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  // 协议切换时同步更新入站标识默认值
  const PROTOCOL_DEFAULT_TAG: Record<string, string> = {
    tunnel: 'tunnel-in',
    http: 'http-in',
    shadowsocks: 'shadowsocks-in',
    socks: 'socks-in',
    trojan: 'trojan-in',
    vless: 'vless-in',
    vmess: 'vmess-in',
    wireguard: 'wireguard-in',
    hysteria: 'hysteria-in',
    tun: 'tun-in',
  };

  const handleProtocolChange = (newProtocol: string) => {
    // 仅在当前标识是某协议的默认值时才自动同步，避免覆盖用户自定义标识
    const currentDefault = PROTOCOL_DEFAULT_TAG[protocol];
    if (tag === currentDefault || !tag) {
      setTag(PROTOCOL_DEFAULT_TAG[newProtocol] || `${newProtocol}-in`);
    }
    setProtocol(newProtocol);
  };

  const buildSettings = (): any => {
    switch (protocol) {
      case 'socks': {
        const settings: any = { auth: socksAuth, udp: socksUdp, ip: socksIp, userLevel: socksUserLevel };
        if (socksAuth === 'password' && socksUsers.length > 0) {
          settings.users = socksUsers.filter(u => u.user).map(u => ({ user: u.user, pass: u.pass }));
        }
        return settings;
      }
      case 'http': {
        const settings: any = { allowTransparent: httpAllowTransparent, userLevel: httpUserLevel };
        if (httpUsers.length > 0) {
          settings.users = httpUsers.filter(u => u.user).map(u => ({ user: u.user, pass: u.pass }));
        }
        return settings;
      }
      case 'tunnel': {
        const settings: any = {
          allowedNetwork: tunnelAllowedNetwork,
          rewriteAddress: tunnelRewriteAddress.trim() || 'localhost',
          rewritePort: typeof tunnelRewritePort === 'number' ? tunnelRewritePort : Number(tunnelRewritePort) || 0,
          followRedirect: tunnelFollowRedirect,
          userLevel: tunnelUserLevel,
        };
        if (tunnelPortMap.length > 0) {
          const pm: Record<string, string> = {};
          tunnelPortMap.forEach(e => { if (e.local) pm[e.local] = e.remote; });
          if (Object.keys(pm).length > 0) settings.portMap = pm;
        }
        return settings;
      }
      case 'shadowsocks': {
        return { network: ssNetwork, method: ssMethod, password: ssPassword, level: ssLevel, ...(ssEmail ? { email: ssEmail } : {}) };
      }
      case 'trojan': {
        return {
          users: trojanUsers.filter(u => u.password).map(u => {
            const user: any = { password: u.password, level: u.level };
            if (u.email) user.email = u.email;
            return user;
          }),
        };
      }
      case 'vless': {
        const settings: any = {
          users: vlessUsers.filter(u => u.id).map(u => {
            const user: any = { id: u.id, level: u.level };
            if (u.email) user.email = u.email;
            if (u.flow) user.flow = u.flow;
            if (u.reverseTag) user.reverse = { tag: u.reverseTag };
            return user;
          }),
          decryption: vlessDecryption,
        };
        if (vlessEncryption && vlessEncryption !== 'none') {
          settings.encryption = vlessEncryption;
        }
        return settings;
      }
      case 'vmess': {
        return {
          users: vmessUsers.filter(u => u.id).map(u => {
            const user: any = { id: u.id, level: u.level };
            if (u.email) user.email = u.email;
            return user;
          }),
        };
      }
      case 'wireguard': {
        return {
          secretKey: wgSecretKey,
          peers: wgPeers.filter(p => p.publicKey).map(p => ({
            publicKey: p.publicKey,
            allowedIPs: p.allowedIPs.split(',').map(x => x.trim()).filter(Boolean),
          })),
          mtu: wgMtu,
        };
      }
      case 'hysteria': {
        return {
          version: 2,
          users: hysteriaUsers.filter(u => u.auth).map(u => {
            const user: any = { auth: u.auth, level: u.level };
            if (u.email) user.email = u.email;
            return user;
          }),
        };
      }
      case 'tun': {
        const parseArray = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean);
        return {
          ...(tunName ? { name: tunName } : {}),
          ...(tunDesc ? { desc: tunDesc } : {}),
          mtu: tunMtu,
          gateway: parseArray(tunGateway),
          dns: parseArray(tunDns),
          userLevel: tunUserLevel,
          autoSystemRoutingTable: parseArray(tunAutoRouting),
          autoOutboundsInterface: tunAutoOutbounds || null,
        };
      }
      default:
        return {};
    }
  };

  const handleStreamSettingsChange = (ss: any) => {
    streamSettingsRef.current = ss;
    setStreamSettings(ss);
  };

  // Protocols that support streamSettings
  const STREAM_PROTOCOLS = ['vless', 'vmess', 'trojan', 'socks'];

  // 将当前可视化状态构建为配置对象
  const buildConfigObject = (): any => {
    const result: any = {
      tag: tag.trim() || 'inbound',
      protocol,
    };
    const trimmedListen = listen.trim();
    if (trimmedListen) {
      result.listen = trimmedListen;
    } else if (protocol !== 'tun') {
      result.listen = '127.0.0.1';
    }
    const numPort = typeof port === 'number' ? port : Number(port) || 0;
    if (numPort > 0) {
      result.port = numPort;
    } else if (protocol !== 'tun') {
      result.port = 7890;
    }
    result.settings = buildSettings();
    if (sniffing) {
      const sniffingObj: any = { enabled: true };
      if (sniffDestOverride.length > 0) sniffingObj.destOverride = sniffDestOverride;
      if (sniffMetadataOnly) sniffingObj.metadataOnly = true;
      const domExcl = sniffDomainsExcluded.split('\n').map(x => x.trim()).filter(Boolean);
      if (domExcl.length > 0) sniffingObj.domainsExcluded = domExcl;
      const ipsExcl = sniffIpsExcluded.split('\n').map(x => x.trim()).filter(Boolean);
      if (ipsExcl.length > 0) sniffingObj.ipsExcluded = ipsExcl;
      if (sniffRouteOnly) sniffingObj.routeOnly = true;
      result.sniffing = sniffingObj;
    }
    // Attach streamSettings for applicable protocols
    if (STREAM_PROTOCOLS.includes(protocol)) {
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

  // ---- User list helpers ----
  const addSocksUser = () => setSocksUsers(prev => [...prev, { user: '', pass: '' }]);
  const removeSocksUser = (i: number) => setSocksUsers(prev => prev.filter((_, idx) => idx !== i));
  const updateSocksUser = (i: number, field: keyof SocksUser, val: string) => setSocksUsers(prev => prev.map((u, idx) => idx === i ? { ...u, [field]: val } : u));

  const addHttpUser = () => setHttpUsers(prev => [...prev, { user: '', pass: '' }]);
  const removeHttpUser = (i: number) => setHttpUsers(prev => prev.filter((_, idx) => idx !== i));
  const updateHttpUser = (i: number, field: keyof UserEntry, val: string) => setHttpUsers(prev => prev.map((u, idx) => idx === i ? { ...u, [field]: val } : u));

  const addTrojanUser = () => setTrojanUsers(prev => [...prev, { password: '', email: '', level: 0 }]);
  const removeTrojanUser = (i: number) => setTrojanUsers(prev => prev.filter((_, idx) => idx !== i));
  const updateTrojanUser = (i: number, field: keyof TrojanUser, val: any) => setTrojanUsers(prev => prev.map((u, idx) => idx === i ? { ...u, [field]: val } : u));

  const addVlessUser = () => setVlessUsers(prev => [...prev, { id: '', level: 0, email: '', flow: '', reverseTag: '' }]);
  const removeVlessUser = (i: number) => setVlessUsers(prev => prev.filter((_, idx) => idx !== i));
  const updateVlessUser = (i: number, field: keyof ClientEntry, val: any) => setVlessUsers(prev => prev.map((u, idx) => idx === i ? { ...u, [field]: val } : u));

  const addVmessUser = () => setVmessUsers(prev => [...prev, { id: '', level: 0, email: '' }]);
  const removeVmessUser = (i: number) => setVmessUsers(prev => prev.filter((_, idx) => idx !== i));
  const updateVmessUser = (i: number, field: keyof ClientEntry, val: any) => setVmessUsers(prev => prev.map((u, idx) => idx === i ? { ...u, [field]: val } : u));

  const addHysteriaUser = () => setHysteriaUsers(prev => [...prev, { auth: '', level: 0, email: '' }]);
  const removeHysteriaUser = (i: number) => setHysteriaUsers(prev => prev.filter((_, idx) => idx !== i));
  const updateHysteriaUser = (i: number, field: keyof HysteriaUser, val: any) => setHysteriaUsers(prev => prev.map((u, idx) => idx === i ? { ...u, [field]: val } : u));

  const addWgPeer = () => setWgPeers(prev => [...prev, { publicKey: '', allowedIPs: '0.0.0.0/0, ::/0' }]);
  const removeWgPeer = (i: number) => setWgPeers(prev => prev.filter((_, idx) => idx !== i));
  const updateWgPeer = (i: number, field: keyof WgPeer, val: string) => setWgPeers(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p));

  const addPortMap = () => setTunnelPortMap(prev => [...prev, { local: '', remote: '' }]);
  const removePortMap = (i: number) => setTunnelPortMap(prev => prev.filter((_, idx) => idx !== i));
  const updatePortMap = (i: number, field: keyof PortMapEntry, val: string) => setTunnelPortMap(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p));

  // Reusable components
  const AddButton = ({ onClick, label }: { onClick: () => void; label: string }) => (
    <button type="button" onClick={onClick} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors">
      <Plus className="w-3.5 h-3.5" />
      {label}
    </button>
  );

  const RemoveButton = ({ onClick }: { onClick: () => void }) => (
    <button type="button" onClick={onClick} className="p-1 text-slate-500 hover:text-rose-400 transition-colors">
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );

  // Protocol settings renderers
  const renderSocksSettings = () => (
    <div className="space-y-4">
      <div>
        <label className={labelCls}><FieldLabel label="认证模式" tip="SOCKS 入站的认证方式。noauth 无需认证，password 需要账号密码。" /></label>
        <CustomSelect options={SOCKS_AUTH_OPTIONS} value={socksAuth} onChange={setSocksAuth} />
      </div>
      {socksAuth === 'password' && (
        <div className={subPanelCls}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-300">用户账号列表</span>
            <AddButton onClick={addSocksUser} label="添加用户" />
          </div>
          {socksUsers.map((u, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="text" value={u.user} onChange={e => updateSocksUser(i, 'user', e.target.value)} placeholder="用户名" className={inputSmall} />
              <input type="text" value={u.pass} onChange={e => updateSocksUser(i, 'pass', e.target.value)} placeholder="密码" className={inputSmall} />
              {socksUsers.length > 0 && <RemoveButton onClick={() => removeSocksUser(i)} />}
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
        <div className="flex items-center justify-between p-3 bg-slate-950/40 border border-white/5 rounded-xl">
          <div>
            <span className="text-sm font-medium text-slate-200">UDP 支持</span>
            <p className="text-xs text-slate-400">开启 UDP 协议转发</p>
          </div>
          <ToggleSwitch checked={socksUdp} onChange={() => setSocksUdp(p => !p)} activeColor="blue" size="sm" ariaLabel="UDP 支持" />
        </div>
        {socksUdp && (
          <div>
            <label className={labelCls}><FieldLabel label="UDP 监听 IP" tip="UDP 监听的 IP 地址，仅在启用 UDP 转发时生效。" /></label>
            <input type="text" value={socksIp} onChange={e => setSocksIp(e.target.value)} placeholder="127.0.0.1" className={inputCls} />
          </div>
        )}
      </div>
      <div>
        <label className={labelCls}><FieldLabel label="用户等级" tip="SOCKS 入站的用户等级，用于匹配策略。" /></label>
        <input type="number" value={socksUserLevel} onChange={e => setSocksUserLevel(Number(e.target.value) || 0)} className={inputCls} />
      </div>
    </div>
  );

  const renderHttpSettings = () => (
    <div className="space-y-4">
      <div className={subPanelCls}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-blue-300">认证用户列表</span>
          <AddButton onClick={addHttpUser} label="添加用户" />
        </div>
        {httpUsers.length === 0 && <p className="text-xs text-slate-500">未设置用户时不进行认证验证</p>}
        {httpUsers.map((u, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="text" value={u.user} onChange={e => updateHttpUser(i, 'user', e.target.value)} placeholder="用户名" className={inputSmall} />
            <input type="text" value={u.pass} onChange={e => updateHttpUser(i, 'pass', e.target.value)} placeholder="密码" className={inputSmall} />
            <RemoveButton onClick={() => removeHttpUser(i)} />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between p-3 bg-slate-950/40 border border-white/5 rounded-xl">
        <div>
          <span className="text-sm font-medium text-slate-200">透明代理模式</span>
          <p className="text-xs text-slate-400">转发所有 HTTP 请求而非仅代理请求</p>
        </div>
        <ToggleSwitch checked={httpAllowTransparent} onChange={() => setHttpAllowTransparent(p => !p)} activeColor="blue" size="sm" ariaLabel="透明代理" />
      </div>
      <div>
        <label className={labelCls}><FieldLabel label="用户等级" tip="HTTP 入站的用户等级。" /></label>
        <input type="number" value={httpUserLevel} onChange={e => setHttpUserLevel(Number(e.target.value) || 0)} className={inputCls} />
      </div>
    </div>
  );

  const renderTunnelSettings = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
        <div>
          <label className={labelCls}><FieldLabel label="允许网络类型" tip="Tunnel 入站允许的网络类型，tcp、udp 或两者。" /></label>
          <CustomSelect options={NETWORK_TYPE_OPTIONS} value={tunnelAllowedNetwork} onChange={setTunnelAllowedNetwork} />
        </div>
        <div>
          <label className={labelCls}><FieldLabel label="目标端口" tip="Tunnel 入站转发的目标端口，0 表示使用监听端口。" /></label>
          <input type="number" value={tunnelRewritePort} onChange={e => setTunnelRewritePort(e.target.value)} placeholder="0 表示使用监听端口" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}><FieldLabel label="目标地址" tip="Tunnel 入站转发的目标地址，支持域名或 IP。" /></label>
        <input type="text" value={tunnelRewriteAddress} onChange={e => setTunnelRewriteAddress(e.target.value)} placeholder="8.8.8.8 或 example.com" className={inputCls} />
      </div>
      <div className={subPanelCls}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-blue-300">端口映射表</span>
          <AddButton onClick={addPortMap} label="添加映射" />
        </div>
        {tunnelPortMap.length === 0 && <p className="text-xs text-slate-500">未设置时使用目标地址和端口转发</p>}
        {tunnelPortMap.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="text" value={p.local} onChange={e => updatePortMap(i, 'local', e.target.value)} placeholder="本地端口" className={inputSmall} />
            <span className="text-slate-500 text-xs">→</span>
            <input type="text" value={p.remote} onChange={e => updatePortMap(i, 'remote', e.target.value)} placeholder="1.1.1.1:7777" className={inputSmall} />
            <RemoveButton onClick={() => removePortMap(i)} />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between p-3 bg-slate-950/40 border border-white/5 rounded-xl">
        <div>
          <span className="text-sm font-medium text-slate-200">透明代理跟随</span>
          <p className="text-xs text-slate-400">识别 iptables 转发的数据并转发到目标地址</p>
        </div>
        <ToggleSwitch checked={tunnelFollowRedirect} onChange={() => setTunnelFollowRedirect(p => !p)} activeColor="blue" size="sm" ariaLabel="透明代理跟随" />
      </div>
      <div>
        <label className={labelCls}><FieldLabel label="用户等级" tip="Tunnel 入站的用户等级。" /></label>
        <input type="number" value={tunnelUserLevel} onChange={e => setTunnelUserLevel(Number(e.target.value) || 0)} className={inputCls} />
      </div>
    </div>
  );

  const renderShadowsocksSettings = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
        <div>
          <label className={labelCls}><FieldLabel label="加密方式" tip="Shadowsocks 入站的加密算法。" /></label>
          <CustomSelect options={SS_METHOD_OPTIONS} value={ssMethod} onChange={setSsMethod} />
        </div>
        <div>
          <label className={labelCls}><FieldLabel label="网络类型" tip="Shadowsocks 入站允许的网络类型。" /></label>
          <CustomSelect options={NETWORK_TYPE_OPTIONS} value={ssNetwork} onChange={setSsNetwork} />
        </div>
      </div>
      <div>
        <label className={labelCls}><FieldLabel label="密码" tip="Shadowsocks 入站密码，需与客户端一致。" /></label>
        <input type="text" value={ssPassword} onChange={e => setSsPassword(e.target.value)} placeholder="Shadowsocks 密码" className={inputCls} />
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
        <div>
          <label className={labelCls}><FieldLabel label="用户邮箱" tip="可选字段，用于标识用户以便流量统计。" /></label>
          <input type="text" value={ssEmail} onChange={e => setSsEmail(e.target.value)} placeholder="用于区分用户流量" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}><FieldLabel label="用户等级" tip="Shadowsocks 入站的用户等级。" /></label>
          <input type="number" value={ssLevel} onChange={e => setSsLevel(Number(e.target.value) || 0)} className={inputCls} />
        </div>
      </div>
    </div>
  );

  const renderTrojanSettings = () => (
    <div className="space-y-4">
      <div className={subPanelCls}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-blue-300">用户列表</span>
          <AddButton onClick={addTrojanUser} label="添加用户" />
        </div>
        {trojanUsers.map((u, i) => (
          <div key={i} className="space-y-2 pb-2 border-b border-white/5 last:border-0">
            <div className="flex items-center gap-2">
              <input type="text" value={u.password} onChange={e => updateTrojanUser(i, 'password', e.target.value)} placeholder="密码" className={inputSmall} />
              <input type="text" value={u.email} onChange={e => updateTrojanUser(i, 'email', e.target.value)} placeholder="邮箱" className={inputSmall} />
              {trojanUsers.length > 1 && <RemoveButton onClick={() => removeTrojanUser(i)} />}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-slate-400 whitespace-nowrap"><FieldLabel label="等级" tip="用户等级，用于匹配 policy 中的等级策略配置。" /></label>
              <input type="number" value={u.level} onChange={e => updateTrojanUser(i, 'level', Number(e.target.value) || 0)} className={`${inputSmall} w-20`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const handleGenerateUuid = async (userIndex: number) => {
    try {
      const uuid = await invoke<string>('generate_uuid', { binaryPath: null });
      updateVlessUser(userIndex, 'id', uuid);
    } catch (err: any) {
      setJsonError(`生成 UUID 失败: ${typeof err === 'string' ? err : err.message || err}`);
    }
  };

  const handleGenerateUuidForVmess = async (userIndex: number) => {
    try {
      const uuid = await invoke<string>('generate_uuid', { binaryPath: null });
      updateVmessUser(userIndex, 'id', uuid);
    } catch (err: any) {
      setJsonError(`生成 UUID 失败: ${typeof err === 'string' ? err : err.message || err}`);
    }
  };

  const handleGenerateVlessEnc = async (type: 'x25519' | 'mlkem768') => {
    setVlessEncGenerating(true);
    try {
      const keys = await invoke<any>('generate_vless_encryption', { binaryPath: null });
      if (type === 'x25519') {
        setVlessDecryption(keys.x25519_decryption);
        setVlessEncryption(keys.x25519_encryption);
      } else {
        setVlessDecryption(keys.mlkem768_decryption);
        setVlessEncryption(keys.mlkem768_encryption);
      }
      setVlessEncType(type);
    } catch (err: any) {
      setJsonError(`生成加密密钥失败: ${typeof err === 'string' ? err : err.message || err}`);
    } finally {
      setVlessEncGenerating(false);
    }
  };

  const handleClearVlessEnc = () => {
    setVlessDecryption('none');
    setVlessEncryption('none');
    setVlessEncType('none');
  };

  const renderVlessSettings = () => (
    <div className="space-y-4">
      {/* VLESS 加密配置面板 */}
      <div className={subPanelCls}>
        <span className="text-xs font-semibold text-purple-300">VLESS 加密认证配置</span>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
          <div>
            <label className="text-[11px] text-slate-400 mb-1 block"><FieldLabel label="解密" tip="VLESS 入站解密配置，由 X25519 或 ML-KEM-768 认证自动生成。" /></label>
            <input type="text" value={vlessDecryption} onChange={e => setVlessDecryption(e.target.value)} placeholder="none" className={inputSmall} readOnly />
          </div>
          <div>
            <label className="text-[11px] text-slate-400 mb-1 block"><FieldLabel label="加密" tip="VLESS 入站加密配置，由 X25519 或 ML-KEM-768 认证自动生成。" /></label>
            <input type="text" value={vlessEncryption} onChange={e => setVlessEncryption(e.target.value)} placeholder="none" className={inputSmall} readOnly />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            disabled={vlessEncGenerating}
            onClick={() => handleGenerateVlessEnc('x25519')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              vlessEncType === 'x25519'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800 text-blue-300 border border-blue-500/30 hover:bg-blue-600/20'
            } disabled:opacity-50`}
          >
            <Zap className="w-3.5 h-3.5" />
            X25519 认证
          </button>
          <button
            type="button"
            disabled={vlessEncGenerating}
            onClick={() => handleGenerateVlessEnc('mlkem768')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              vlessEncType === 'mlkem768'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-800 text-purple-300 border border-purple-500/30 hover:bg-purple-600/20'
            } disabled:opacity-50`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            ML-KEM-768 抗量子认证
          </button>
          <button
            type="button"
            onClick={handleClearVlessEnc}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 text-slate-400 border border-white/10 rounded-lg hover:bg-rose-600/20 hover:text-rose-300 transition-all"
          >
            <Eraser className="w-3.5 h-3.5" />
            清除
          </button>
        </div>
        <p className="text-[11px] text-slate-500">
          {vlessEncGenerating ? '正在生成密钥...' : `已选择：${vlessEncType === 'none' ? 'None' : vlessEncType === 'x25519' ? 'X25519' : 'ML-KEM-768 抗量子'}`}
        </p>
      </div>

      {/* 用户列表 */}
      <div className={subPanelCls}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-blue-300">用户列表</span>
          <AddButton onClick={addVlessUser} label="添加用户" />
        </div>
        {vlessUsers.map((u, i) => (
          <div key={i} className="space-y-2 pb-2 border-b border-white/5 last:border-0">
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block"><FieldLabel label="用户 ID / UUID" tip="VLESS 用户唯一标识符，可点击右侧按钮自动生成。" /></label>
              <div className="flex items-center gap-2">
                <input type="text" value={u.id} onChange={e => updateVlessUser(i, 'id', e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className={inputSmall} />
                <button
                  type="button"
                  onClick={() => handleGenerateUuid(i)}
                  className="shrink-0 p-1.5 text-slate-400 hover:text-blue-400 bg-slate-800 hover:bg-blue-600/20 border border-white/10 rounded-lg transition-all"
                  title="生成 UUID"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                {vlessUsers.length > 1 && <RemoveButton onClick={() => removeVlessUser(i)} />}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="text" value={u.email} onChange={e => updateVlessUser(i, 'email', e.target.value)} placeholder="邮箱" className={inputSmall} />
              <input type="number" value={u.level} onChange={e => updateVlessUser(i, 'level', Number(e.target.value) || 0)} placeholder="等级" className={`${inputSmall} w-20`} />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block"><FieldLabel label="流控模式" tip="VLESS 流控方式，如 xtls-rprx-vision 可启用 Vision 流控。" /></label>
              <CustomSelect options={FLOW_OPTIONS} value={u.flow || ''} onChange={val => updateVlessUser(i, 'flow', val)} />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block"><FieldLabel label="反向代理出站标识" tip="配置 VLESS 反向代理的出站 Tag，留空则不启用反向代理。" /></label>
              <input type="text" value={u.reverseTag || ''} onChange={e => updateVlessUser(i, 'reverseTag', e.target.value)} placeholder="留空则不启用反向代理" className={inputSmall} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderVmessSettings = () => (
    <div className="space-y-4">
      <div className={subPanelCls}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-blue-300">用户列表</span>
          <AddButton onClick={addVmessUser} label="添加用户" />
        </div>
        {vmessUsers.map((u, i) => (
          <div key={i} className="space-y-2 pb-2 border-b border-white/5 last:border-0">
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block"><FieldLabel label="用户 ID / UUID" tip="VMess 用户唯一标识符（UUID），可点击右侧按钮自动生成。" /></label>
              <div className="flex items-center gap-2">
                <input type="text" value={u.id} onChange={e => updateVmessUser(i, 'id', e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className={inputSmall} />
                <button
                  type="button"
                  onClick={() => handleGenerateUuidForVmess(i)}
                  className="shrink-0 p-1.5 text-slate-400 hover:text-blue-400 bg-slate-800 hover:bg-blue-600/20 border border-white/10 rounded-lg transition-all"
                  title="生成 UUID"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                {vmessUsers.length > 1 && <RemoveButton onClick={() => removeVmessUser(i)} />}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="text" value={u.email} onChange={e => updateVmessUser(i, 'email', e.target.value)} placeholder="邮箱" className={inputSmall} />
              <input type="number" value={u.level} onChange={e => updateVmessUser(i, 'level', Number(e.target.value) || 0)} placeholder="等级" className={`${inputSmall} w-20`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderWireGuardSettings = () => (
    <div className="space-y-4">
      <div>
        <label className={labelCls}><FieldLabel label="私钥" tip="WireGuard 入站私钥，用于解密客户端发来的数据。" /></label>
        <input type="text" value={wgSecretKey} onChange={e => setWgSecretKey(e.target.value)} placeholder="WireGuard Private Key" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}><FieldLabel label="MTU" tip="WireGuard 入站最大传输单元，默认 1420。" /></label>
        <input type="number" value={wgMtu} onChange={e => setWgMtu(Number(e.target.value) || 1420)} placeholder="1420" className={inputCls} />
      </div>
      <div className={subPanelCls}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-blue-300">对端节点列表</span>
          <AddButton onClick={addWgPeer} label="添加节点" />
        </div>
        {wgPeers.map((p, i) => (
          <div key={i} className="space-y-2 pb-2 border-b border-white/5 last:border-0">
            <div className="flex items-center gap-2">
              <input type="text" value={p.publicKey} onChange={e => updateWgPeer(i, 'publicKey', e.target.value)} placeholder="公钥 PublicKey" className={inputSmall} />
              {wgPeers.length > 1 && <RemoveButton onClick={() => removeWgPeer(i)} />}
            </div>
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block"><FieldLabel label="允许 IP" tip="WireGuard 对端允许的路由 IP 列表，逗号分隔。" /></label>
              <input type="text" value={p.allowedIPs} onChange={e => updateWgPeer(i, 'allowedIPs', e.target.value)} placeholder="0.0.0.0/0, ::/0" className={inputSmall} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderHysteriaSettings = () => (
    <div className="space-y-4">
      <div className={subPanelCls}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-blue-300">用户列表</span>
          <AddButton onClick={addHysteriaUser} label="添加用户" />
        </div>
        {hysteriaUsers.map((u, i) => (
          <div key={i} className="space-y-2 pb-2 border-b border-white/5 last:border-0">
            <div className="flex items-center gap-2">
              <input type="text" value={u.auth} onChange={e => updateHysteriaUser(i, 'auth', e.target.value)} placeholder="认证密钥" className={inputSmall} />
              {hysteriaUsers.length > 1 && <RemoveButton onClick={() => removeHysteriaUser(i)} />}
            </div>
            <div className="flex items-center gap-2">
              <input type="text" value={u.email} onChange={e => updateHysteriaUser(i, 'email', e.target.value)} placeholder="邮箱" className={inputSmall} />
              <input type="number" value={u.level} onChange={e => updateHysteriaUser(i, 'level', Number(e.target.value) || 0)} placeholder="等级" className={`${inputSmall} w-20`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTunSettings = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
        <div>
          <label className={labelCls}><FieldLabel label="接口名称" tip="TUN 虚拟网卡接口名称，如 utun10。留空则自动分配。" /></label>
          <input type="text" value={tunName} onChange={e => setTunName(e.target.value)} placeholder="utun10" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}><FieldLabel label="接口描述" tip="TUN 虚拟网卡描述信息，Windows 下可设为 Wintun。" /></label>
          <input type="text" value={tunDesc} onChange={e => setTunDesc(e.target.value)} placeholder="Wintun" className={inputCls} />
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
        <div>
          <label className={labelCls}><FieldLabel label="MTU" tip="TUN 虚拟网卡最大传输单元，默认 1500。" /></label>
          <input type="number" value={tunMtu} onChange={e => setTunMtu(Number(e.target.value) || 1500)} placeholder="1500" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}><FieldLabel label="用户等级" tip="TUN 入站的用户等级。" /></label>
          <input type="number" value={tunUserLevel} onChange={e => setTunUserLevel(Number(e.target.value) || 0)} placeholder="0" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}><FieldLabel label="网关地址" tip="TUN 虚拟网卡的网关地址，支持 IPv4 和 IPv6。" /></label>
        <input type="text" value={tunGateway} onChange={e => setTunGateway(e.target.value)} placeholder="10.0.0.1/16, fc00::1/64" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}><FieldLabel label="DNS 服务器" tip="TUN 虚拟网卡使用的 DNS 服务器地址。" /></label>
        <input type="text" value={tunDns} onChange={e => setTunDns(e.target.value)} placeholder="1.1.1.1, 8.8.8.8" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}><FieldLabel label="自动路由表" tip="TUN 自动配置的系统路由表规则，默认 0.0.0.0/0, ::/0 表示全局。" /></label>
        <input type="text" value={tunAutoRouting} onChange={e => setTunAutoRouting(e.target.value)} placeholder="0.0.0.0/0, ::/0" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}><FieldLabel label="出站接口绑定" tip="TUN 入站绑定的出站接口，auto 表示自动选择。" /></label>
        <input type="text" value={tunAutoOutbounds} onChange={e => setTunAutoOutbounds(e.target.value)} placeholder="auto" className={inputCls} />
      </div>
    </div>
  );

  const renderProtocolSettings = () => {
    switch (protocol) {
      case 'socks': return renderSocksSettings();
      case 'http': return renderHttpSettings();
      case 'tunnel': return renderTunnelSettings();
      case 'shadowsocks': return renderShadowsocksSettings();
      case 'trojan': return renderTrojanSettings();
      case 'vless': return renderVlessSettings();
      case 'vmess': return renderVmessSettings();
      case 'wireguard': return renderWireGuardSettings();
      case 'hysteria': return renderHysteriaSettings();
      case 'tun': return renderTunSettings();
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900/98 border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/40">
          <h3 className="font-semibold text-lg text-white">配置入站代理</h3>
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
                onClick={() => {
                  if (viewMode === 'json') {
                    // 从 JSON 源码切回可视化：用编辑后的 JSON 重新填充所有字段
                    try {
                      applyInitialValue(JSON.parse(rawJsonText));
                      setOpenKey(k => k + 1);
                    } catch { /* JSON 非法时保持现状 */ }
                  } else {
                    // 从可视化切换到 JSON 时，同步当前配置到 JSON 文本
                    setRawJsonText(JSON.stringify(buildConfigObject(), null, 2));
                  }
                  setViewMode(viewMode === 'visual' ? 'json' : 'visual');
                }}
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
              <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                <div>
                  <label className={labelCls}><FieldLabel label="入站标识" tip="此入站的唯一标识 Tag，用于路由规则匹配。必须全局唯一。" /></label>
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    placeholder="socks-in"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}><FieldLabel label="入站协议" tip="入站使用的代理协议，如 SOCKS、HTTP、VLESS、VMess 等。" /></label>
                  <CustomSelect
                    options={INBOUND_PROTOCOL_OPTIONS}
                    value={protocol}
                    onChange={handleProtocolChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                <div>
                  <label className={labelCls}><FieldLabel label={`监听地址${protocol === 'tun' ? '（可选）' : ''}`} tip="入站监听的 IP 地址。127.0.0.1 仅本机访问，0.0.0.0 允许所有来源。" /></label>
                  <input
                    type="text"
                    value={listen}
                    onChange={(e) => setListen(e.target.value)}
                    placeholder={protocol === 'tun' ? '留空则不设置' : '127.0.0.1'}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}><FieldLabel label={`监听端口${protocol === 'tun' ? '（可选）' : ''}`} tip="入站监听的端口号。" /></label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder={protocol === 'tun' ? '留空则不设置' : '7890'}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Protocol-specific settings */}
              {renderProtocolSettings()}

              {/* Stream Settings for applicable protocols */}
              {STREAM_PROTOCOLS.includes(protocol) && (
                <div className="pt-2 border-t border-white/5">
                  <h4 className="text-sm font-semibold text-slate-200 mb-3">传输层配置</h4>
                  <StreamSettingsPanel
                    key={`${openKey}-${protocol}`}
                    initialValue={streamSettings}
                    isInbound={true}
                    onChange={handleStreamSettingsChange}
                  />
                </div>
              )}

              <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-950/40 border border-white/5 rounded-xl">
                    <div>
                      <span className="text-sm font-medium text-slate-200">启用流量嗅探</span>
                      <p className="text-xs text-slate-400">嗅探流量中的目标域名以准确路由分流</p>
                    </div>
                    <ToggleSwitch
                      checked={sniffing}
                      onChange={() => setSniffing((prev) => !prev)}
                      activeColor="blue"
                      size="sm"
                      ariaLabel="启用流量嗅探"
                    />
                  </div>
                  {sniffing && (
                    <div className={subPanelCls}>
                      <div>
                        <label className={labelCls}><FieldLabel label="目标协议覆盖" tip="选择嗅探到哪些协议时需要重置目标地址。选中的协议在嗅探到后会覆盖连接的目标地址。" /></label>
                        <div className="flex flex-wrap gap-2">
                          {(['http', 'tls', 'quic', 'fakedns'] as const).map(proto => {
                            const active = sniffDestOverride.includes(proto);
                            return (
                              <button
                                key={proto}
                                type="button"
                                onClick={() => {
                                  setSniffDestOverride(prev =>
                                    active ? prev.filter(p => p !== proto) : [...prev, proto]
                                  );
                                }}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                                  active
                                    ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                                    : 'bg-slate-800/60 border-white/10 text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                {proto}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">选中表示嗅探到该协议时重置目标地址</p>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-900/60 border border-white/5 rounded-lg">
                        <div>
                          <span className="text-xs font-medium text-slate-200">仅使用元数据</span>
                          <p className="text-[11px] text-slate-400">仅用连接元数据推断目标，不解析流量内容</p>
                        </div>
                        <ToggleSwitch checked={sniffMetadataOnly} onChange={() => setSniffMetadataOnly(p => !p)} activeColor="blue" size="sm" ariaLabel="仅使用元数据" />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-900/60 border border-white/5 rounded-lg">
                        <div>
                          <span className="text-xs font-medium text-slate-200">仅用于路由</span>
                          <p className="text-[11px] text-slate-400">嗅探域名仅用于路由匹配，不重置代理目标地址</p>
                        </div>
                        <ToggleSwitch checked={sniffRouteOnly} onChange={() => setSniffRouteOnly(p => !p)} activeColor="blue" size="sm" ariaLabel="仅用于路由" />
                      </div>
                      <div>
                        <label className={labelCls}><FieldLabel label="排除域名" tip="嗅探到的域名如果在此列表中，不会重置目标地址。每行一个域名。" /></label>
                        <textarea
                          value={sniffDomainsExcluded}
                          onChange={e => setSniffDomainsExcluded(e.target.value)}
                          placeholder={"每行一个域名，例如：\ncourier.push.apple.com\nMijia Cloud"}
                          rows={3}
                          className={`${inputCls} resize-none`}
                        />
                        <p className="text-[11px] text-slate-500 mt-1">命中列表中的域名不会重置目标地址</p>
                      </div>
                      <div>
                        <label className={labelCls}><FieldLabel label="排除 IP" tip="嗅探到的 IP 如果在此列表中，不会重置目标地址。每行一个 IP 或 CIDR。" /></label>
                        <textarea
                          value={sniffIpsExcluded}
                          onChange={e => setSniffIpsExcluded(e.target.value)}
                          placeholder={"每行一个 IP 或 CIDR，例如：\n1.1.1.1\n10.0.0.0/8"}
                          rows={3}
                          className={`${inputCls} resize-none`}
                        />
                        <p className="text-[11px] text-slate-500 mt-1">命中列表中的 IP 不会重置目标地址</p>
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
            保存入站配置
          </button>
        </div>
      </div>
    </div>
  );
};
