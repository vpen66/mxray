import React, { useState, useMemo, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import {
  FileCode2,
  Plus,
  Play,
  Check,
  AlertCircle,
  Sparkles,
  Trash2,
  Copy,
  Save,
  Search,
  Zap,
  Edit3,
  X,
  Code2,
  Eye,
  Server,
  Layers,
  Globe,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
  Cpu,
  Shield,
  Terminal,
  ChevronUp,
  ChevronDown,
  Sliders,
  Activity,
  Info,
} from 'lucide-react';
import { useConfigStore, TEMPLATE_STANDARD, TEMPLATE_TUN, TEMPLATE_MINIMAL } from '../stores/useConfigStore';
import { useAppStore } from '../stores/useAppStore';
import { extractNodesFromConfigJson, type XrayConfigObject } from '../utils/xrayMapper';
import { ConfirmModal } from '../components/ConfirmModal';
import { formatShanghaiTime } from '../utils/date';
import { CustomSelect } from '../components/CustomSelect';
import { useProxyStore } from '../stores/useProxyStore';
import { OutboundSelect } from '../components/OutboundSelect';

const getProtocolBadgeClass = (protocol?: string) => {
  switch (protocol?.toLowerCase()) {
    case 'vless':
      return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    case 'vmess':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    case 'hysteria2':
    case 'hy2':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    case 'trojan':
      return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    case 'shadowsocks':
    case 'ss':
      return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
    case 'freedom':
      return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
    case 'blackhole':
      return 'bg-slate-800 text-slate-400 border-slate-700';
    default:
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
  }
};

const INBOUND_PROTOCOL_OPTIONS = [
  { value: 'dokodemo-door', label: 'Tunnel (dokodemo-door 任意门/端口转发)' },
  { value: 'http', label: 'HTTP (HTTP 入站代理)' },
  { value: 'shadowsocks', label: 'Shadowsocks (SS 入站代理)' },
  { value: 'socks', label: 'Socks (SOCKS5 入站代理)' },
  { value: 'trojan', label: 'Trojan (Trojan 入站)' },
  { value: 'vless', label: 'VLESS (XTLS Vision Seed 入站)' },
  { value: 'vmess', label: 'VMess (VMess 入站)' },
  { value: 'wireguard', label: 'WireGuard (WireGuard 入站)' },
  { value: 'hysteria2', label: 'Hysteria (Hysteria 2 入站)' },
  { value: 'tun', label: 'TUN (TUN 虚拟网卡入站)' },
  { value: 'custom', label: '自定义扩展协议...' },
];

const INBOUND_NETWORK_OPTIONS = [
  { value: 'tcp,udp', label: 'tcp,udp (双协议)' },
  { value: 'tcp', label: 'tcp (仅 TCP)' },
  { value: 'udp', label: 'udp (仅 UDP)' },
];

const SHADOWSOCKS_METHOD_OPTIONS = [
  { value: '2022-blake3-aes-128-gcm', label: '2022-blake3-aes-128-gcm (推荐)' },
  { value: '2022-blake3-aes-256-gcm', label: '2022-blake3-aes-256-gcm' },
  { value: 'aes-128-gcm', label: 'aes-128-gcm' },
  { value: 'aes-256-gcm', label: 'aes-256-gcm' },
  { value: 'chacha20-poly1305', label: 'chacha20-poly1305' },
];

const SOCKS_AUTH_OPTIONS = [
  { value: 'noauth', label: 'noauth (无需密码)' },
  { value: 'password', label: 'password (账号密码认证)' },
];

const OUTBOUND_PROTOCOL_OPTIONS = [
  { value: 'blackhole', label: 'Blackhole (黑洞阻断)' },
  { value: 'dns', label: 'DNS (DNS 查询发送器)' },
  { value: 'freedom', label: 'Freedom (fragment、noises 自由直连)' },
  { value: 'http', label: 'HTTP (HTTP 代理出站)' },
  { value: 'loopback', label: 'Loopback (回环出站 Tag)' },
  { value: 'shadowsocks', label: 'Shadowsocks (SS 出站)' },
  { value: 'socks', label: 'Socks (SOCKS5 出站代理)' },
  { value: 'trojan', label: 'Trojan (Trojan 出站)' },
  { value: 'vless', label: 'VLESS (XTLS Vision Seed 出站)' },
  { value: 'vmess', label: 'VMess (VMess 出站)' },
  { value: 'wireguard', label: 'WireGuard (WireGuard VPN 出站)' },
  { value: 'hysteria2', label: 'Hysteria (Hysteria 2 出站)' },
];

const OUTBOUND_SECURITY_OPTIONS = [
  { value: 'none', label: 'none (明文)' },
  { value: 'tls', label: 'tls' },
  { value: 'reality', label: 'reality' },
];

const OUTBOUND_NETWORK_OPTIONS = [
  { value: 'tcp', label: 'tcp (RAW TCP)' },
  { value: 'ws', label: 'ws (WebSocket)' },
  { value: 'grpc', label: 'grpc (gRPC)' },
  { value: 'h2', label: 'h2 (HTTP/2)' },
  { value: 'quic', label: 'quic (QUIC)' },
];

const TLS_FINGERPRINT_OPTIONS = [
  { value: 'chrome', label: 'chrome (推荐)' },
  { value: 'firefox', label: 'firefox' },
  { value: 'safari', label: 'safari' },
  { value: 'edge', label: 'edge' },
  { value: 'qq', label: 'qq' },
  { value: 'ios', label: 'ios' },
  { value: 'android', label: 'android' },
  { value: 'randomised', label: 'randomised' },
];

const VMESS_SECURITY_OPTIONS = [
  { value: 'auto', label: 'auto (自动识别)' },
  { value: 'aes-128-gcm', label: 'aes-128-gcm' },
  { value: 'chacha20-poly1305', label: 'chacha20-poly1305' },
  { value: 'none', label: 'none (不加密)' },
  { value: 'zero', label: 'zero' },
];

const FREEDOM_DOMAIN_STRATEGY_OPTIONS = [
  { value: 'AsIs', label: 'AsIs (不查询域名，直接发送目标)' },
  { value: 'UseIP', label: 'UseIP (优先解析并使用真实 IP 连接)' },
  { value: 'UseIPv4', label: 'UseIPv4 (仅解析并使用 IPv4 连接)' },
  { value: 'UseIPv6', label: 'UseIPv6 (仅解析并使用 IPv6 连接)' },
];

const BLACKHOLE_RESPONSE_OPTIONS = [
  { value: 'none', label: 'none (无回应 / 丢弃数据包)' },
  { value: 'http', label: 'http (返回 403 HTTP 阻断响应)' },
];

const TUN_STACK_OPTIONS = [
  { value: 'gvisor', label: 'gvisor (用户态网络栈，推荐)' },
  { value: 'system', label: 'system (系统原生网络栈)' },
  { value: 'lwip', label: 'lwip (轻量级网络栈)' },
];

const DNS_NON_IP_QUERY_OPTIONS = [
  { value: 'accept', label: 'accept (正常发起 DNS 查询)' },
  { value: 'drop', label: 'drop (丢弃非 IP 类 DNS 请求)' },
  { value: 'skip', label: 'skip (跳过 DNS 查询)' },
];



const LOG_LEVEL_OPTIONS = [
  { value: 'debug', label: 'debug' },
  { value: 'info', label: 'info' },
  { value: 'warning', label: 'warning' },
  { value: 'error', label: 'error' },
  { value: 'none', label: 'none' },
];

const MASK_ADDRESS_OPTIONS = [
  { value: '', label: 'none' },
  { value: 'quarter', label: 'quarter' },
  { value: 'half', label: 'half' },
  { value: 'full', label: 'full' },
];

const OBSERVATORY_TYPE_OPTIONS = [
  { value: 'disabled', label: '禁用 (不开启连通性观测)' },
  { value: 'observatory', label: 'observatory (后台固定周期连通性观测)' },
  { value: 'burstObservatory', label: 'burstObservatory (突发随机打散连通性观测)' },
];

const PROBE_URL_PRESET_OPTIONS = [
  { value: 'https://www.google.com/generate_204', label: 'Google 204 (https://www.google.com/generate_204)' },
  { value: 'https://connectivitycheck.gstatic.com/generate_204', label: 'Gstatic 204 (https://connectivitycheck.gstatic.com/generate_204)' },
  { value: 'https://cp.cloudflare.com/', label: 'Cloudflare 204 (https://cp.cloudflare.com/)' },
  { value: 'https://www.v2ex.com/generate_204', label: 'V2EX 204 (https://www.v2ex.com/generate_204)' },
  { value: 'custom', label: '自定义 URL...' },
];

export const JsonConfigPage: React.FC = () => {
  const {
    profiles,
    activeProfileId,
    selectedProfileId,
    addProfile,
    updateProfile,
    deleteProfile,
    duplicateProfile,
    setActiveProfileId,
    setSelectedProfileId,
  } = useConfigStore();

  const { coreState, setCoreRunning } = useAppStore();

  // Proxy store for OutboundSelect in routing rules
  const { proxyGroups, profiles: proxyProfiles } = useProxyStore();
  const allProxyNodes = proxyProfiles.flatMap((p) => p.nodes);



  // Routing rule priority handlers
  const handleMoveRuleUp = (index: number) => {
    if (index === 0) return;
    updateParsedConfig((config) => {
      if (config.routing?.rules && index > 0) {
        const temp = config.routing.rules[index - 1];
        config.routing.rules[index - 1] = config.routing.rules[index];
        config.routing.rules[index] = temp;
      }
    });
  };

  const handleMoveRuleDown = (index: number) => {
    updateParsedConfig((config) => {
      if (config.routing?.rules && index < config.routing.rules.length - 1) {
        const temp = config.routing.rules[index + 1];
        config.routing.rules[index + 1] = config.routing.rules[index];
        config.routing.rules[index] = temp;
      }
    });
  };

  const handleCloneRule = (index: number) => {
    updateParsedConfig((config) => {
      if (config.routing?.rules && index < config.routing.rules.length) {
        const cloned = JSON.parse(JSON.stringify(config.routing.rules[index]));
        if (cloned.description) {
          cloned.description = `${cloned.description} (副本)`;
        }
        config.routing.rules.splice(index + 1, 0, cloned);
      }
    });
  };

  const handleToggleRuleEnabled = (index: number) => {
    updateParsedConfig((config) => {
      if (config.routing?.rules && index < config.routing.rules.length) {
        const rule = config.routing.rules[index];
        rule.enabled = rule.enabled === false ? true : false;
      }
    });
  };

  const handleChangeRuleOutbound = (index: number, newTag: string) => {
    updateParsedConfig((config) => {
      if (config.routing?.rules && index < config.routing.rules.length) {
        config.routing.rules[index].outboundTag = newTag;
      }
    });
  };

  const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual');
  const [searchQuery, setSearchQuery] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [launchSuccess, setLaunchSuccess] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  // New Profile Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDesc, setNewProfileDesc] = useState('');
  const [newTemplateType, setNewTemplateType] = useState<'standard' | 'tun' | 'minimal' | 'blank'>('standard');
  const [deletingProfile, setDeletingProfile] = useState<{ id: string; name: string } | null>(null);

  // Inline name/desc editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [showDescPopover, setShowDescPopover] = useState(false);

  // Scroll selected profile card into view & reset popovers
  const selectedCardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setShowDescPopover(false);
    if (selectedCardRef.current) {
      selectedCardRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedProfileId]);

  // --- CRUD Modals State for Visual Inspector ---
  // Inbound Modal State
  const [inboundModal, setInboundModal] = useState<{
    isOpen: boolean;
    isMaximized?: boolean;
    index: number | null;
    mode: 'visual' | 'json';
    rawJsonText: string;
    jsonError: string | null;
    tag: string;
    protocol: string;
    customProtocol: string;
    listen: string;
    port: number | string;
    sniffing: boolean;
    // dokodemo-door / tunnel settings
    targetAddress: string;
    targetPort: number | string;
    network: string;
    followRedirect: boolean;
    // socks / http settings
    auth: string;
    username: string;
    userPassword: string;
    udp: boolean;
    // vless / vmess / trojan / hysteria2 / shadowsocks settings
    uuidPassword: string;
    flow: string;
    enableReverse: boolean;
    reverseTag: string;
    ssMethod: string;
    // wireguard inbound
    wgSecretKey: string;
    wgPublicKey: string;
    wgAllowedIPs: string;
    // tun inbound
    tunName: string;
    tunMtu: number | string;
    tunStack: string;
    autoRoute: boolean;
    strictRoute: boolean;
  }>({
    isOpen: false,
    isMaximized: false,
    index: null,
    mode: 'visual',
    rawJsonText: '',
    jsonError: null,
    tag: '',
    protocol: 'socks',
    customProtocol: '',
    listen: '127.0.0.1',
    port: 7890,
    sniffing: true,
    targetAddress: '8.8.8.8',
    targetPort: 53,
    network: 'tcp,udp',
    followRedirect: false,
    auth: 'noauth',
    username: '',
    userPassword: '',
    udp: true,
    uuidPassword: '',
    flow: 'xtls-rprx-vision',
    enableReverse: false,
    reverseTag: '',
    ssMethod: '2022-blake3-aes-128-gcm',
    wgSecretKey: '',
    wgPublicKey: '',
    wgAllowedIPs: '0.0.0.0/0',
    tunName: 'tun0',
    tunMtu: 1500,
    tunStack: 'gvisor',
    autoRoute: true,
    strictRoute: true,
  });

  // Outbound Modal State
  const [outboundModal, setOutboundModal] = useState<{
    isOpen: boolean;
    isMaximized?: boolean;
    index: number | null;
    mode: 'visual' | 'json';
    rawJsonText: string;
    jsonError: string | null;
    tag: string;
    protocol: string;
    server: string;
    port: number | string;
    network: string;
    security: string;
    uuidPassword: string;
    vlessEncryption: string;
    vmessSecurity: string;
    flow: string;
    enableReverse: boolean;
    reverseTag: string;
    // reality settings
    realityServerName: string;
    realityPublicKey: string;
    realityShortId: string;
    realityFingerprint: string;
    realitySpiderX: string;
    realityShow: boolean;
    // tls settings
    tlsServerName: string;
    tlsAllowInsecure: boolean;
    tlsFingerprint: string;
    tlsAlpn: string;
    // ws settings
    wsPath: string;
    wsHost: string;
    // grpc settings
    grpcServiceName: string;
    grpcMultiMode: boolean;
    // http/h2 settings
    httpHost: string;
    httpPath: string;
    // freedom
    domainStrategy: string;
    enableFragment: boolean;
    fragPackets: string;
    fragLength: string;
    fragInterval: string;
    enableNoises: boolean;
    noisePacket: string;
    noiseDelay: string;
    // blackhole
    blackholeResponse: string;
    // dns outbound
    dnsAddress: string;
    dnsPort: number | string;
    dnsNetwork: string;
    dnsNonIPQuery: string;
    // loopback
    inboundTag: string;
    // http & socks outbound
    username: string;
    userPassword: string;
    // shadowsocks
    ssMethod: string;
    ssUot: boolean;
    // wireguard outbound
    wgSecretKey: string;
    wgAddress: string;
    wgPublicKey: string;
    wgEndpoint: string;
    wgAllowedIPs: string;
    wgMtu: number | string;
  }>({
    isOpen: false,
    isMaximized: false,
    index: null,
    mode: 'visual',
    rawJsonText: '',
    jsonError: null,
    tag: '',
    protocol: 'vless',
    server: '',
    port: 443,
    network: 'tcp',
    security: 'reality',
    uuidPassword: '',
    vlessEncryption: 'none',
    vmessSecurity: 'auto',
    flow: 'xtls-rprx-vision',
    enableReverse: false,
    reverseTag: '',
    realityServerName: '',
    realityPublicKey: '',
    realityShortId: '',
    realityFingerprint: 'chrome',
    realitySpiderX: '/',
    realityShow: false,
    tlsServerName: '',
    tlsAllowInsecure: false,
    tlsFingerprint: 'chrome',
    tlsAlpn: '',
    wsPath: '/',
    wsHost: '',
    grpcServiceName: '',
    grpcMultiMode: false,
    httpHost: '',
    httpPath: '/',
    domainStrategy: 'AsIs',
    enableFragment: false,
    fragPackets: 'tlshello',
    fragLength: '100-200',
    fragInterval: '10-20',
    enableNoises: false,
    noisePacket: 'rand',
    noiseDelay: '10-20',
    blackholeResponse: 'http',
    dnsAddress: '1.1.1.1',
    dnsPort: 53,
    dnsNetwork: 'udp',
    dnsNonIPQuery: 'accept',
    inboundTag: 'socks-in',
    username: '',
    userPassword: '',
    ssMethod: '2022-blake3-aes-128-gcm',
    ssUot: true,
    wgSecretKey: '',
    wgAddress: '10.0.0.2/32',
    wgPublicKey: '',
    wgEndpoint: '',
    wgAllowedIPs: '0.0.0.0/0',
    wgMtu: 1420,
  });

  // Routing Rule Modal State
  const [ruleModal, setRuleModal] = useState<{
    isOpen: boolean;
    isMaximized?: boolean;
    index: number | null;
    mode: 'visual' | 'json';
    rawJsonText: string;
    jsonError: string | null;
    outboundTag: string;
    type: string;
    description: string;
    domain: string;
    ip: string;
    port: string;
    protocol: string;
    network: string;
    activeTab: 'domain' | 'ip' | 'port' | 'protocol';
  }>({
    isOpen: false,
    isMaximized: false,
    index: null,
    mode: 'visual',
    rawJsonText: '',
    jsonError: null,
    outboundTag: 'proxy',
    type: 'field',
    description: '',
    domain: '',
    ip: '',
    port: '',
    protocol: '',
    network: '',
    activeTab: 'domain',
  });

  // Track which rule's OutboundSelect dropdown is open (for z-index)
  const [activeOpenRuleId, setActiveOpenRuleId] = useState<number | null>(null);

  // DNS Modal State
  const [dnsModal, setDnsModal] = useState<{
    isOpen: boolean;
    isMaximized?: boolean;
    index: number | null;
    mode: 'visual' | 'json';
    rawJsonText: string;
    jsonError: string | null;
    server: string;
  }>({
    isOpen: false,
    isMaximized: false,
    index: null,
    mode: 'visual',
    rawJsonText: '',
    jsonError: null,
    server: '',
  });

  // Observatory Modal State
  const [observatoryModal, setObservatoryModal] = useState<{
    isOpen: boolean;
    isMaximized?: boolean;
    mode: 'visual' | 'json';
    type: 'disabled' | 'observatory' | 'burstObservatory';
    subjectSelector: string[];
    subjectInput: string;
    probeUrl: string;
    probeInterval: string;
    enableConcurrency: boolean;
    destination: string;
    interval: string;
    sampling: number | string;
    timeout: string;
    rawJsonText: string;
    jsonError: string | null;
  }>({
    isOpen: false,
    isMaximized: false,
    mode: 'visual',
    type: 'disabled',
    subjectSelector: ['outbound', 'proxy'],
    subjectInput: '',
    probeUrl: 'https://www.google.com/generate_204',
    probeInterval: '10s',
    enableConcurrency: true,
    destination: 'https://connectivitycheck.gstatic.com/generate_204',
    interval: '1m',
    sampling: 10,
    timeout: '5s',
    rawJsonText: '',
    jsonError: null,
  });

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) || profiles[0];

  const filteredProfiles = profiles.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Parse JSON content for visual inspector
  const parsedConfig = useMemo<XrayConfigObject | null>(() => {
    if (!selectedProfile) return null;
    try {
      return JSON.parse(selectedProfile.content);
    } catch {
      return null;
    }
  }, [selectedProfile]);

  // Helper to mutate current selected config JSON
  const updateParsedConfig = (updater: (config: XrayConfigObject) => void) => {
    if (!selectedProfile) return;
    try {
      const config: XrayConfigObject = JSON.parse(selectedProfile.content || '{}');
      updater(config);
      const updatedContent = JSON.stringify(config, null, 2);
      updateProfile(selectedProfile.id, { content: updatedContent });
      setJsonError(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: any) {
      console.error('Failed to update config JSON:', err);
    }
  };

  const handleOpenObservatoryModal = () => {
    if (!parsedConfig) return;
    let type: 'disabled' | 'observatory' | 'burstObservatory' = 'disabled';
    let subjectSelector = ['outbound', 'proxy'];
    let probeUrl = 'https://www.google.com/generate_204';
    let probeInterval = '10s';
    let enableConcurrency = true;
    let destination = 'https://connectivitycheck.gstatic.com/generate_204';
    let interval = '1m';
    let sampling: number | string = 10;
    let timeout = '5s';
    let rawObj: any = null;

    if (parsedConfig.burstObservatory) {
      type = 'burstObservatory';
      rawObj = parsedConfig.burstObservatory;
      subjectSelector = Array.isArray(rawObj.subjectSelector) ? [...rawObj.subjectSelector] : ['outbound'];
      if (rawObj.pingConfig) {
        destination = rawObj.pingConfig.destination || destination;
        interval = rawObj.pingConfig.interval || interval;
        sampling = rawObj.pingConfig.sampling ?? sampling;
        timeout = rawObj.pingConfig.timeout || timeout;
      }
    } else if (parsedConfig.observatory) {
      type = 'observatory';
      rawObj = parsedConfig.observatory;
      subjectSelector = Array.isArray(rawObj.subjectSelector) ? [...rawObj.subjectSelector] : ['outbound'];
      probeUrl = rawObj.probeUrl || probeUrl;
      probeInterval = rawObj.probeInterval || probeInterval;
      enableConcurrency = rawObj.enableConcurrency !== false;
    }

    const rawJsonText = rawObj
      ? JSON.stringify(rawObj, null, 2)
      : JSON.stringify(
          {
            subjectSelector: ['outbound'],
            probeUrl: 'https://www.google.com/generate_204',
            probeInterval: '10s',
            enableConcurrency: true,
          },
          null,
          2
        );

    setObservatoryModal({
      isOpen: true,
      isMaximized: false,
      mode: 'visual',
      type,
      subjectSelector,
      subjectInput: '',
      probeUrl,
      probeInterval,
      enableConcurrency,
      destination,
      interval,
      sampling,
      timeout,
      rawJsonText,
      jsonError: null,
    });
  };

  const handleSaveObservatory = () => {
    updateParsedConfig((config) => {
      if (observatoryModal.type === 'disabled') {
        delete config.observatory;
        delete config.burstObservatory;
      } else if (observatoryModal.type === 'observatory') {
        delete config.burstObservatory;
        if (observatoryModal.mode === 'json') {
          try {
            config.observatory = JSON.parse(observatoryModal.rawJsonText);
          } catch (err: any) {
            setObservatoryModal((prev) => ({ ...prev, jsonError: `JSON 语法解析错误: ${err.message}` }));
            return;
          }
        } else {
          config.observatory = {
            subjectSelector: observatoryModal.subjectSelector,
            probeUrl: observatoryModal.probeUrl,
            probeInterval: observatoryModal.probeInterval,
            enableConcurrency: observatoryModal.enableConcurrency,
          };
        }
      } else if (observatoryModal.type === 'burstObservatory') {
        delete config.observatory;
        if (observatoryModal.mode === 'json') {
          try {
            config.burstObservatory = JSON.parse(observatoryModal.rawJsonText);
          } catch (err: any) {
            setObservatoryModal((prev) => ({ ...prev, jsonError: `JSON 语法解析错误: ${err.message}` }));
            return;
          }
        } else {
          config.burstObservatory = {
            subjectSelector: observatoryModal.subjectSelector,
            pingConfig: {
              destination: observatoryModal.destination,
              interval: observatoryModal.interval,
              sampling: Number(observatoryModal.sampling) || 10,
              timeout: observatoryModal.timeout,
            },
          };
        }
      }
    });

    setObservatoryModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleSwitchObservatoryMode = (targetMode: 'visual' | 'json') => {
    if (targetMode === 'json') {
      let rawObj: any = {};
      if (observatoryModal.type === 'observatory') {
        rawObj = {
          subjectSelector: observatoryModal.subjectSelector,
          probeUrl: observatoryModal.probeUrl,
          probeInterval: observatoryModal.probeInterval,
          enableConcurrency: observatoryModal.enableConcurrency,
        };
      } else if (observatoryModal.type === 'burstObservatory') {
        rawObj = {
          subjectSelector: observatoryModal.subjectSelector,
          pingConfig: {
            destination: observatoryModal.destination,
            interval: observatoryModal.interval,
            sampling: Number(observatoryModal.sampling) || 10,
            timeout: observatoryModal.timeout,
          },
        };
      } else {
        rawObj = {
          subjectSelector: observatoryModal.subjectSelector.length > 0 ? observatoryModal.subjectSelector : ['outbound'],
          probeUrl: observatoryModal.probeUrl || 'https://www.google.com/generate_204',
          probeInterval: observatoryModal.probeInterval || '10s',
          enableConcurrency: observatoryModal.enableConcurrency,
        };
      }
      setObservatoryModal((prev) => ({
        ...prev,
        mode: 'json',
        rawJsonText: JSON.stringify(rawObj, null, 2),
        jsonError: null,
      }));
    } else {
      try {
        if (observatoryModal.rawJsonText.trim()) {
          const parsed = JSON.parse(observatoryModal.rawJsonText);
          if (parsed.pingConfig) {
            setObservatoryModal((prev) => ({
              ...prev,
              mode: 'visual',
              type: 'burstObservatory',
              subjectSelector: Array.isArray(parsed.subjectSelector) ? parsed.subjectSelector : prev.subjectSelector,
              destination: parsed.pingConfig.destination || prev.destination,
              interval: parsed.pingConfig.interval || prev.interval,
              sampling: parsed.pingConfig.sampling ?? prev.sampling,
              timeout: parsed.pingConfig.timeout || prev.timeout,
              jsonError: null,
            }));
          } else {
            setObservatoryModal((prev) => ({
              ...prev,
              mode: 'visual',
              type: 'observatory',
              subjectSelector: Array.isArray(parsed.subjectSelector) ? parsed.subjectSelector : prev.subjectSelector,
              probeUrl: parsed.probeUrl || prev.probeUrl,
              probeInterval: parsed.probeInterval || prev.probeInterval,
              enableConcurrency: parsed.enableConcurrency !== false,
              jsonError: null,
            }));
          }
        } else {
          setObservatoryModal((prev) => ({ ...prev, mode: 'visual', jsonError: null }));
        }
      } catch (err: any) {
        setObservatoryModal((prev) => ({
          ...prev,
          jsonError: `切回可视化模式失败: JSON 语法存在错误 (${err.message})`,
        }));
      }
    }
  };

  const handleAddSubjectSelector = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    setObservatoryModal((prev) => {
      if (prev.subjectSelector.includes(trimmed)) return prev;
      return {
        ...prev,
        subjectSelector: [...prev.subjectSelector, trimmed],
        subjectInput: '',
      };
    });
  };

  const handleRemoveSubjectSelector = (index: number) => {
    setObservatoryModal((prev) => ({
      ...prev,
      subjectSelector: prev.subjectSelector.filter((_, i) => i !== index),
    }));
  };

  const handleLogLevelChange = (newLevel: string) => {
    updateParsedConfig((config) => {
      config.log = {
        ...(config.log || {}),
        loglevel: newLevel,
      };
    });
  };

  const handleLogAccessChange = (accessPath: string) => {
    updateParsedConfig((config) => {
      config.log = {
        ...(config.log || {}),
        access: accessPath,
      };
    });
  };

  const handleLogErrorChange = (errorPath: string) => {
    updateParsedConfig((config) => {
      config.log = {
        ...(config.log || {}),
        error: errorPath,
      };
    });
  };

  const handleLogDnsLogToggle = (dnsLog: boolean) => {
    updateParsedConfig((config) => {
      config.log = {
        ...(config.log || {}),
        dnsLog,
      };
    });
  };

  const handleLogMaskAddressChange = (maskAddress: string) => {
    updateParsedConfig((config) => {
      config.log = {
        ...(config.log || {}),
        maskAddress,
      };
    });
  };

  // --- Helper Conversion Functions for Modal Visual <-> JSON Sync ---
  const buildInboundObjectFromVisual = (ib: typeof inboundModal) => {
    const targetProtocol =
      ib.protocol === 'custom' ? ib.customProtocol.trim() || 'socks' : ib.protocol;

    const newInbound: any = {
      tag: ib.tag || 'inbound',
      port: Number(ib.port) || 7890,
      listen: ib.listen || '127.0.0.1',
      protocol: targetProtocol,
    };

    if (ib.sniffing) {
      newInbound.sniffing = {
        enabled: true,
        destOverride: ['http', 'tls', 'quic'],
      };
    }

    if (targetProtocol === 'dokodemo-door') {
      newInbound.settings = {
        address: ib.targetAddress || '127.0.0.1',
        port: Number(ib.targetPort) || 53,
        network: ib.network || 'tcp,udp',
        followRedirect: ib.followRedirect,
      };
    } else if (targetProtocol === 'socks') {
      newInbound.settings = {
        auth: ib.auth || 'noauth',
        udp: ib.udp,
        ...(ib.auth === 'password' && ib.username
          ? { accounts: [{ user: ib.username, pass: ib.userPassword }] }
          : {}),
      };
    } else if (targetProtocol === 'http') {
      newInbound.settings = ib.username
        ? { accounts: [{ user: ib.username, pass: ib.userPassword }] }
        : {};
    } else if (targetProtocol === 'vless') {
      newInbound.settings = {
        clients: [
          {
            id: ib.uuidPassword,
            ...(ib.flow ? { flow: ib.flow } : {}),
            ...(ib.enableReverse && ib.reverseTag ? { reverse: { tag: ib.reverseTag } } : {}),
          },
        ],
        decryption: 'none',
      };
    } else if (targetProtocol === 'vmess') {
      newInbound.settings = {
        clients: [{ id: ib.uuidPassword, alterId: 0 }],
      };
    } else if (targetProtocol === 'trojan') {
      newInbound.settings = {
        clients: [{ password: ib.uuidPassword }],
      };
    } else if (targetProtocol === 'shadowsocks') {
      newInbound.settings = {
        method: ib.ssMethod || '2022-blake3-aes-128-gcm',
        password: ib.uuidPassword,
        network: ib.network || 'tcp,udp',
      };
    } else if (targetProtocol === 'hysteria2') {
      newInbound.settings = {
        users: [{ password: ib.uuidPassword }],
      };
    } else if (targetProtocol === 'wireguard') {
      newInbound.settings = {
        secretKey: ib.wgSecretKey,
        peers: [
          {
            publicKey: ib.wgPublicKey,
            allowedIPs: [ib.wgAllowedIPs || '0.0.0.0/0'],
          },
        ],
      };
    } else if (targetProtocol === 'tun') {
      newInbound.settings = {
        name: ib.tunName || 'tun0',
        mtu: Number(ib.tunMtu) || 1500,
        stack: ib.tunStack || 'gvisor',
        autoRoute: ib.autoRoute,
        strictRoute: ib.strictRoute,
      };
    }
    return newInbound;
  };

  const populateInboundVisualFromObject = (ib: any) => {
    const knownProtocols = [
      'socks',
      'http',
      'dokodemo-door',
      'vless',
      'vmess',
      'trojan',
      'shadowsocks',
      'hysteria2',
      'wireguard',
      'tun',
      'freedom',
      'blackhole',
      'loopback',
    ];
    let uuidPassword = '';
    if (ib.settings?.clients?.[0]?.id) {
      uuidPassword = ib.settings.clients[0].id;
    } else if (ib.settings?.clients?.[0]?.password) {
      uuidPassword = ib.settings.clients[0].password;
    } else if (ib.settings?.users?.[0]?.password) {
      uuidPassword = ib.settings.users[0].password;
    } else if (ib.settings?.password) {
      uuidPassword = ib.settings.password;
    }
    const isKnown = knownProtocols.includes(ib.protocol);

    return {
      tag: ib.tag || '',
      protocol: isKnown ? ib.protocol : 'custom',
      customProtocol: isKnown ? '' : ib.protocol || '',
      listen: ib.listen || '127.0.0.1',
      port: ib.port ?? 7890,
      sniffing: ib.sniffing?.enabled ?? true,
      targetAddress: ib.settings?.address || '8.8.8.8',
      targetPort: ib.settings?.port ?? 53,
      network: ib.settings?.network || 'tcp,udp',
      followRedirect: Boolean(ib.settings?.followRedirect),
      auth: ib.settings?.auth || (ib.settings?.accounts?.length ? 'password' : 'noauth'),
      username: ib.settings?.accounts?.[0]?.user || '',
      userPassword: ib.settings?.accounts?.[0]?.pass || '',
      udp: ib.settings?.udp ?? true,
      uuidPassword,
      flow: ib.settings?.clients?.[0]?.flow || 'xtls-rprx-vision',
      enableReverse: Boolean(ib.settings?.clients?.[0]?.reverse?.tag),
      reverseTag: ib.settings?.clients?.[0]?.reverse?.tag || '',
      ssMethod: ib.settings?.method || '2022-blake3-aes-128-gcm',
      wgSecretKey: ib.settings?.secretKey || '',
      wgPublicKey: ib.settings?.peers?.[0]?.publicKey || '',
      wgAllowedIPs: ib.settings?.peers?.[0]?.allowedIPs?.[0] || '0.0.0.0/0',
      tunName: ib.settings?.name || 'tun0',
      tunMtu: ib.settings?.mtu ?? 1500,
      tunStack: ib.settings?.stack || 'gvisor',
      autoRoute: ib.settings?.autoRoute ?? true,
      strictRoute: ib.settings?.strictRoute ?? true,
    };
  };

  const handleSwitchInboundMode = (targetMode: 'visual' | 'json') => {
    if (targetMode === inboundModal.mode) return;
    if (targetMode === 'json') {
      const obj = buildInboundObjectFromVisual(inboundModal);
      setInboundModal((prev) => ({
        ...prev,
        mode: 'json',
        rawJsonText: JSON.stringify(obj, null, 2),
        jsonError: null,
      }));
    } else {
      try {
        const parsed = JSON.parse(inboundModal.rawJsonText);
        if (typeof parsed !== 'object' || !parsed) {
          throw new Error('JSON 必须为非空对象');
        }
        const visualState = populateInboundVisualFromObject(parsed);
        setInboundModal((prev) => ({
          ...prev,
          ...visualState,
          mode: 'visual',
          jsonError: null,
        }));
      } catch (err: any) {
        setInboundModal((prev) => ({
          ...prev,
          jsonError: `JSON 格式错误: ${err.message}`,
        }));
      }
    }
  };

  const buildStreamSettingsFromVisual = (ob: typeof outboundModal) => {
    const streamSettings: any = {
      network: ob.network || 'tcp',
      security: ob.security || 'none',
    };

    if (ob.security === 'tls') {
      streamSettings.tlsSettings = {
        ...(ob.tlsServerName ? { serverName: ob.tlsServerName } : {}),
        ...(ob.tlsAllowInsecure ? { allowInsecure: true } : {}),
        ...(ob.tlsFingerprint ? { fingerprint: ob.tlsFingerprint } : {}),
        ...(ob.tlsAlpn ? { alpn: ob.tlsAlpn.split(',').map((s: string) => s.trim()).filter(Boolean) } : {}),
      };
    } else if (ob.security === 'reality') {
      streamSettings.realitySettings = {
        show: Boolean(ob.realityShow),
        fingerprint: ob.realityFingerprint || 'chrome',
        serverName: ob.realityServerName || '',
        publicKey: ob.realityPublicKey || '',
        shortId: ob.realityShortId || '',
        spiderX: ob.realitySpiderX || '/',
      };
    }

    if (ob.network === 'ws') {
      streamSettings.wsSettings = {
        path: ob.wsPath || '/',
        ...(ob.wsHost ? { headers: { Host: ob.wsHost } } : {}),
      };
    } else if (ob.network === 'grpc') {
      streamSettings.grpcSettings = {
        serviceName: ob.grpcServiceName || '',
        multiMode: Boolean(ob.grpcMultiMode),
      };
    } else if (ob.network === 'h2' || ob.network === 'http') {
      streamSettings.httpSettings = {
        host: ob.httpHost ? ob.httpHost.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        path: ob.httpPath || '/',
      };
    }

    return streamSettings;
  };

  const buildOutboundObjectFromVisual = (ob: typeof outboundModal) => {
    const newOb: any = {
      tag: ob.tag || 'outbound',
      protocol: ob.protocol,
    };

    if (ob.protocol === 'freedom') {
      newOb.settings = {
        domainStrategy: ob.domainStrategy || 'AsIs',
        ...(ob.enableFragment
          ? {
              fragment: {
                packets: ob.fragPackets || 'tlshello',
                length: ob.fragLength || '100-200',
                interval: ob.fragInterval || '10-20',
              },
            }
          : {}),
        ...(ob.enableNoises
          ? {
              noises: [
                {
                  type: 'rand',
                  packet: ob.noisePacket || '10-20',
                  delay: ob.noiseDelay || '10-20',
                },
              ],
            }
          : {}),
      };
    } else if (ob.protocol === 'blackhole') {
      newOb.settings = { response: { type: ob.blackholeResponse || 'http' } };
    } else if (ob.protocol === 'dns') {
      newOb.settings = {
        address: ob.dnsAddress || '1.1.1.1',
        port: Number(ob.dnsPort) || 53,
        network: ob.dnsNetwork || 'udp',
        nonIPQuery: ob.dnsNonIPQuery || 'accept',
      };
    } else if (ob.protocol === 'loopback') {
      newOb.settings = {
        inboundTag: ob.inboundTag || 'socks-in',
      };
    } else if (ob.protocol === 'wireguard') {
      newOb.settings = {
        secretKey: ob.wgSecretKey,
        address: [ob.wgAddress || '10.0.0.2/32'],
        peers: [
          {
            publicKey: ob.wgPublicKey,
            endpoint: ob.wgEndpoint,
            allowedIPs: [ob.wgAllowedIPs || '0.0.0.0/0'],
          },
        ],
        mtu: Number(ob.wgMtu) || 1420,
      };
    } else if (ob.protocol === 'http' || ob.protocol === 'socks') {
      newOb.settings = {
        servers: [
          {
            address: ob.server,
            port: Number(ob.port) || 1080,
            ...(ob.username
              ? { users: [{ user: ob.username, pass: ob.userPassword }] }
              : {}),
          },
        ],
      };
      newOb.streamSettings = buildStreamSettingsFromVisual(ob);
    } else if (ob.protocol === 'shadowsocks') {
      newOb.settings = {
        servers: [
          {
            address: ob.server,
            port: Number(ob.port) || 8388,
            method: ob.ssMethod || '2022-blake3-aes-128-gcm',
            password: ob.uuidPassword,
            uot: ob.ssUot,
          },
        ],
      };
      newOb.streamSettings = buildStreamSettingsFromVisual(ob);
    } else if (ob.protocol === 'vless') {
      newOb.settings = {
        vnext: [
          {
            address: ob.server,
            port: Number(ob.port) || 443,
            users: [
              {
                id: ob.uuidPassword,
                encryption: ob.vlessEncryption || 'none',
                ...(ob.flow ? { flow: ob.flow } : {}),
                ...(ob.enableReverse && ob.reverseTag ? { reverse: { tag: ob.reverseTag } } : {}),
              },
            ],
          },
        ],
      };
      newOb.streamSettings = buildStreamSettingsFromVisual(ob);
    } else if (ob.protocol === 'vmess') {
      newOb.settings = {
        vnext: [
          {
            address: ob.server,
            port: Number(ob.port) || 443,
            users: [
              {
                id: ob.uuidPassword,
                alterId: 0,
                security: ob.vmessSecurity || 'auto',
              },
            ],
          },
        ],
      };
      newOb.streamSettings = buildStreamSettingsFromVisual(ob);
    } else {
      // trojan, hysteria2, etc.
      newOb.settings = {
        servers: [
          {
            address: ob.server,
            port: Number(ob.port) || 443,
            password: ob.uuidPassword,
          },
        ],
      };
      newOb.streamSettings = buildStreamSettingsFromVisual(ob);
    }
    return newOb;
  };

  const populateOutboundVisualFromObject = (ob: any) => {
    let server = '';
    let port: number | string = 443;
    let uuidPassword = '';
    let flow = 'xtls-rprx-vision';
    let username = '';
    let userPassword = '';
    let ssMethod = '2022-blake3-aes-128-gcm';
    let vlessEncryption = 'none';
    let vmessSecurity = 'auto';

    if (ob.settings?.vnext?.[0]) {
      server = ob.settings.vnext[0].address || '';
      port = ob.settings.vnext[0].port || 443;
      const firstUser = ob.settings.vnext[0].users?.[0];
      if (firstUser) {
        uuidPassword = firstUser.id || '';
        flow = firstUser.flow || 'xtls-rprx-vision';
        vlessEncryption = firstUser.encryption || 'none';
        vmessSecurity = firstUser.security || 'auto';
      }
    } else if (ob.settings?.servers?.[0]) {
      server = ob.settings.servers[0].address || '';
      port = ob.settings.servers[0].port || 443;
      uuidPassword = ob.settings.servers[0].password || '';
      ssMethod = ob.settings.servers[0].method || '2022-blake3-aes-128-gcm';
      if (ob.settings.servers[0].users?.[0]) {
        username = ob.settings.servers[0].users[0].user || '';
        userPassword = ob.settings.servers[0].users[0].pass || '';
      }
    }

    const vlessUser = ob.settings?.vnext?.[0]?.users?.[0];
    const streamSettings = ob.streamSettings || {};
    const security = streamSettings.security || 'none';
    const network = streamSettings.network || 'tcp';
    const realitySettings = streamSettings.realitySettings || {};
    const tlsSettings = streamSettings.tlsSettings || {};
    const wsSettings = streamSettings.wsSettings || {};
    const grpcSettings = streamSettings.grpcSettings || {};
    const httpSettings = streamSettings.httpSettings || {};

    return {
      tag: ob.tag || '',
      protocol: ob.protocol || 'vless',
      server,
      port,
      security,
      network,
      uuidPassword,
      vlessEncryption,
      vmessSecurity,
      flow,
      enableReverse: Boolean(vlessUser?.reverse?.tag),
      reverseTag: vlessUser?.reverse?.tag || '',
      realityServerName: realitySettings.serverName || '',
      realityPublicKey: realitySettings.publicKey || '',
      realityShortId: realitySettings.shortId || '',
      realityFingerprint: realitySettings.fingerprint || 'chrome',
      realitySpiderX: realitySettings.spiderX || '/',
      realityShow: Boolean(realitySettings.show),
      tlsServerName: tlsSettings.serverName || '',
      tlsAllowInsecure: Boolean(tlsSettings.allowInsecure),
      tlsFingerprint: tlsSettings.fingerprint || 'chrome',
      tlsAlpn: Array.isArray(tlsSettings.alpn) ? tlsSettings.alpn.join(', ') : (tlsSettings.alpn || ''),
      wsPath: wsSettings.path || '/',
      wsHost: wsSettings.headers?.Host || wsSettings.headers?.host || '',
      grpcServiceName: grpcSettings.serviceName || '',
      grpcMultiMode: Boolean(grpcSettings.multiMode),
      httpHost: Array.isArray(httpSettings.host) ? httpSettings.host.join(', ') : (httpSettings.host || ''),
      httpPath: httpSettings.path || '/',
      domainStrategy: ob.settings?.domainStrategy || 'AsIs',
      enableFragment: Boolean(ob.settings?.fragment),
      fragPackets: ob.settings?.fragment?.packets || 'tlshello',
      fragLength: ob.settings?.fragment?.length || '100-200',
      fragInterval: ob.settings?.fragment?.interval || '10-20',
      enableNoises: Boolean(ob.settings?.noises?.length),
      noisePacket: ob.settings?.noises?.[0]?.packet || 'rand',
      noiseDelay: ob.settings?.noises?.[0]?.delay || '10-20',
      blackholeResponse: ob.settings?.response?.type || 'http',
      dnsAddress: ob.settings?.address || '1.1.1.1',
      dnsPort: ob.settings?.port ?? 53,
      dnsNetwork: ob.settings?.network || 'udp',
      dnsNonIPQuery: ob.settings?.nonIPQuery || 'accept',
      inboundTag: ob.settings?.inboundTag || 'socks-in',
      username,
      userPassword,
      ssMethod,
      ssUot: ob.settings?.servers?.[0]?.uot ?? true,
      wgSecretKey: ob.settings?.secretKey || '',
      wgAddress: ob.settings?.address?.[0] || '10.0.0.2/32',
      wgPublicKey: ob.settings?.peers?.[0]?.publicKey || '',
      wgEndpoint: ob.settings?.peers?.[0]?.endpoint || '',
      wgAllowedIPs: ob.settings?.peers?.[0]?.allowedIPs?.[0] || '0.0.0.0/0',
      wgMtu: ob.settings?.mtu ?? 1420,
    };
  };

  const handleSwitchOutboundMode = (targetMode: 'visual' | 'json') => {
    if (targetMode === outboundModal.mode) return;
    if (targetMode === 'json') {
      const obj = buildOutboundObjectFromVisual(outboundModal);
      setOutboundModal((prev) => ({
        ...prev,
        mode: 'json',
        rawJsonText: JSON.stringify(obj, null, 2),
        jsonError: null,
      }));
    } else {
      try {
        const parsed = JSON.parse(outboundModal.rawJsonText);
        if (typeof parsed !== 'object' || !parsed) {
          throw new Error('JSON 必须为非空对象');
        }
        const visualState = populateOutboundVisualFromObject(parsed);
        setOutboundModal((prev) => ({
          ...prev,
          ...visualState,
          mode: 'visual',
          jsonError: null,
        }));
      } catch (err: any) {
        setOutboundModal((prev) => ({
          ...prev,
          jsonError: `JSON 格式错误: ${err.message}`,
        }));
      }
    }
  };

  const buildRuleObjectFromVisual = (rule: typeof ruleModal) => {
    const newRule: any = {
      type: rule.type || 'field',
      outboundTag: rule.outboundTag,
    };
    if (rule.description.trim()) {
      newRule.description = rule.description.trim();
    }
    if (rule.domain.trim()) {
      newRule.domain = rule.domain
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (rule.ip.trim()) {
      newRule.ip = rule.ip
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (rule.port.trim()) {
      newRule.port = rule.port.trim();
    }
    if (rule.protocol.trim()) {
      newRule.protocol = rule.protocol
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
    }
    if (rule.network.trim()) {
      newRule.network = rule.network.trim();
    }
    return newRule;
  };

  const populateRuleVisualFromObject = (rule: any) => {
    return {
      outboundTag: rule.outboundTag || 'proxy',
      type: rule.type || 'field',
      description: rule.description || '',
      domain: Array.isArray(rule.domain) ? rule.domain.join('\n') : rule.domain || '',
      ip: Array.isArray(rule.ip) ? rule.ip.join('\n') : rule.ip || '',
      port: rule.port || '',
      protocol: Array.isArray(rule.protocol) ? rule.protocol.join(', ') : rule.protocol || '',
      network: rule.network || '',
    };
  };

  const insertDomainPrefix = (prefix: string) => {
    setRuleModal((prev) => {
      const lines = prev.domain.split('\n').filter((l) => l.trim().length > 0);
      lines.push(`${prefix}example.com`);
      return { ...prev, domain: lines.join('\n') };
    });
  };

  const handleSwitchRuleMode = (targetMode: 'visual' | 'json') => {
    if (targetMode === ruleModal.mode) return;
    if (targetMode === 'json') {
      const obj = buildRuleObjectFromVisual(ruleModal);
      setRuleModal((prev) => ({
        ...prev,
        mode: 'json',
        rawJsonText: JSON.stringify(obj, null, 2),
        jsonError: null,
      }));
    } else {
      try {
        const parsed = JSON.parse(ruleModal.rawJsonText);
        if (typeof parsed !== 'object' || !parsed) {
          throw new Error('JSON 必须为非空对象');
        }
        const visualState = populateRuleVisualFromObject(parsed);
        setRuleModal((prev) => ({
          ...prev,
          ...visualState,
          mode: 'visual',
          jsonError: null,
        }));
      } catch (err: any) {
        setRuleModal((prev) => ({
          ...prev,
          jsonError: `JSON 格式错误: ${err.message}`,
        }));
      }
    }
  };

  const buildDnsObjectFromVisual = (dns: typeof dnsModal) => {
    const srvValue = dns.server.trim();
    if (srvValue.startsWith('{') && srvValue.endsWith('}')) {
      try {
        return JSON.parse(srvValue);
      } catch {
        return srvValue;
      }
    }
    return srvValue;
  };

  const populateDnsVisualFromObject = (srv: any) => {
    const val = typeof srv === 'string' ? srv : srv.address || JSON.stringify(srv);
    return { server: val };
  };

  const handleSwitchDnsMode = (targetMode: 'visual' | 'json') => {
    if (targetMode === dnsModal.mode) return;
    if (targetMode === 'json') {
      const obj = buildDnsObjectFromVisual(dnsModal);
      setDnsModal((prev) => ({
        ...prev,
        mode: 'json',
        rawJsonText: typeof obj === 'string' ? JSON.stringify(obj, null, 2) : JSON.stringify(obj, null, 2),
        jsonError: null,
      }));
    } else {
      try {
        const parsed = JSON.parse(dnsModal.rawJsonText);
        const visualState = populateDnsVisualFromObject(parsed);
        setDnsModal((prev) => ({
          ...prev,
          ...visualState,
          mode: 'visual',
          jsonError: null,
        }));
      } catch (err: any) {
        setDnsModal((prev) => ({
          ...prev,
          jsonError: `JSON 格式错误: ${err.message}`,
        }));
      }
    }
  };

  // --- Inbound Handlers ---
  const handleOpenInboundModal = (ib?: any, index?: number) => {
    if (ib && index !== undefined) {
      const visualState = populateInboundVisualFromObject(ib);
      setInboundModal({
        ...visualState,
        isOpen: true,
        index,
        mode: 'visual',
        rawJsonText: JSON.stringify(ib, null, 2),
        jsonError: null,
      });
    } else {
      const count = parsedConfig?.inbounds?.length || 0;
      const defaultState = {
        isOpen: true,
        index: null,
        mode: 'visual' as const,
        rawJsonText: '',
        jsonError: null,
        tag: count === 0 ? 'socks-in' : count === 1 ? 'http-in' : `inbound-${count + 1}`,
        protocol: count === 1 ? 'http' : 'socks',
        customProtocol: '',
        listen: '127.0.0.1',
        port: count === 0 ? 7890 : count === 1 ? 7891 : 7892 + count,
        sniffing: true,
        targetAddress: '8.8.8.8',
        targetPort: 53,
        network: 'tcp,udp',
        followRedirect: false,
        auth: 'noauth',
        username: '',
        userPassword: '',
        udp: true,
        uuidPassword: '',
        flow: 'xtls-rprx-vision',
        enableReverse: false,
        reverseTag: '',
        ssMethod: '2022-blake3-aes-128-gcm',
        wgSecretKey: '',
        wgPublicKey: '',
        wgAllowedIPs: '0.0.0.0/0',
        tunName: 'tun0',
        tunMtu: 1500,
        tunStack: 'gvisor',
        autoRoute: true,
        strictRoute: true,
      };
      defaultState.rawJsonText = JSON.stringify(buildInboundObjectFromVisual(defaultState), null, 2);
      setInboundModal(defaultState);
    }
  };

  const handleSaveInbound = () => {
    let newInbound: any = null;
    if (inboundModal.mode === 'json') {
      try {
        newInbound = JSON.parse(inboundModal.rawJsonText);
        if (typeof newInbound !== 'object' || !newInbound) {
          throw new Error('JSON 必须为有效的对象');
        }
      } catch (err: any) {
        setInboundModal((prev) => ({
          ...prev,
          jsonError: `保存失败，JSON 格式错误: ${err.message}`,
        }));
        return;
      }
    } else {
      newInbound = buildInboundObjectFromVisual(inboundModal);
    }

    updateParsedConfig((config) => {
      if (!config.inbounds) config.inbounds = [];
      if (inboundModal.index !== null && inboundModal.index < config.inbounds.length) {
        const existing = config.inbounds[inboundModal.index];
        config.inbounds[inboundModal.index] = inboundModal.mode === 'json' ? newInbound : { ...existing, ...newInbound };
      } else {
        config.inbounds.push(newInbound);
      }
    });
    setInboundModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleDeleteInbound = (index: number) => {
    updateParsedConfig((config) => {
      if (config.inbounds) {
        config.inbounds.splice(index, 1);
      }
    });
  };

  // --- Outbound Handlers ---
  const handleOpenOutboundModal = (ob?: any, index?: number) => {
    if (ob && index !== undefined) {
      const visualState = populateOutboundVisualFromObject(ob);
      setOutboundModal({
        ...visualState,
        isOpen: true,
        index,
        mode: 'visual',
        rawJsonText: JSON.stringify(ob, null, 2),
        jsonError: null,
      });
    } else {
      const defaultState = {
        isOpen: true,
        index: null,
        mode: 'visual' as const,
        rawJsonText: '',
        jsonError: null,
        tag: `outbound-${(parsedConfig?.outbounds?.length || 0) + 1}`,
        protocol: 'vless',
        server: 'example.com',
        port: 443,
        network: 'tcp',
        security: 'reality',
        uuidPassword: '',
        vlessEncryption: 'none',
        vmessSecurity: 'auto',
        flow: 'xtls-rprx-vision',
        enableReverse: false,
        reverseTag: '',
        realityServerName: '',
        realityPublicKey: '',
        realityShortId: '',
        realityFingerprint: 'chrome',
        realitySpiderX: '/',
        realityShow: false,
        tlsServerName: '',
        tlsAllowInsecure: false,
        tlsFingerprint: 'chrome',
        tlsAlpn: '',
        wsPath: '/',
        wsHost: '',
        grpcServiceName: '',
        grpcMultiMode: false,
        httpHost: '',
        httpPath: '/',
        domainStrategy: 'AsIs',
        enableFragment: false,
        fragPackets: 'tlshello',
        fragLength: '100-200',
        fragInterval: '10-20',
        enableNoises: false,
        noisePacket: 'rand',
        noiseDelay: '10-20',
        blackholeResponse: 'http',
        dnsAddress: '1.1.1.1',
        dnsPort: 53,
        dnsNetwork: 'udp',
        dnsNonIPQuery: 'accept',
        inboundTag: 'socks-in',
        username: '',
        userPassword: '',
        ssMethod: '2022-blake3-aes-128-gcm',
        ssUot: true,
        wgSecretKey: '',
        wgAddress: '10.0.0.2/32',
        wgPublicKey: '',
        wgEndpoint: '',
        wgAllowedIPs: '0.0.0.0/0',
        wgMtu: 1420,
      };
      defaultState.rawJsonText = JSON.stringify(buildOutboundObjectFromVisual(defaultState), null, 2);
      setOutboundModal(defaultState);
    }
  };

  const handleSaveOutbound = () => {
    let newOb: any = null;
    if (outboundModal.mode === 'json') {
      try {
        newOb = JSON.parse(outboundModal.rawJsonText);
        if (typeof newOb !== 'object' || !newOb) {
          throw new Error('JSON 必须为有效的对象');
        }
      } catch (err: any) {
        setOutboundModal((prev) => ({
          ...prev,
          jsonError: `保存失败，JSON 格式错误: ${err.message}`,
        }));
        return;
      }
    } else {
      newOb = buildOutboundObjectFromVisual(outboundModal);
    }

    updateParsedConfig((config) => {
      if (!config.outbounds) config.outbounds = [];
      if (outboundModal.index !== null && outboundModal.index < config.outbounds.length) {
        const existing = config.outbounds[outboundModal.index];
        config.outbounds[outboundModal.index] = outboundModal.mode === 'json' ? newOb : { ...existing, ...newOb };
      } else {
        config.outbounds.push(newOb);
      }
    });
    setOutboundModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleDeleteOutbound = (index: number) => {
    updateParsedConfig((config) => {
      if (config.outbounds) {
        config.outbounds.splice(index, 1);
      }
    });
  };

  // --- Routing Rule Handlers ---
  const handleOpenRuleModal = (rule?: any, index?: number) => {
    const availableOutbounds = parsedConfig?.outbounds?.map((o) => o.tag) || ['proxy', 'direct', 'block'];
    const defaultOutbound = availableOutbounds[0] || 'proxy';

    if (rule && index !== undefined) {
      const visualState = populateRuleVisualFromObject(rule);
      setRuleModal({
        ...visualState,
        isOpen: true,
        isMaximized: false,
        index,
        mode: 'visual',
        rawJsonText: JSON.stringify(rule, null, 2),
        jsonError: null,
        activeTab: 'domain',
      });
    } else {
      const defaultState = {
        isOpen: true,
        isMaximized: false,
        index: null,
        mode: 'visual' as const,
        rawJsonText: '',
        jsonError: null,
        outboundTag: defaultOutbound,
        type: 'field',
        description: '',
        domain: '',
        ip: '',
        port: '',
        protocol: '',
        network: '',
        activeTab: 'domain' as const,
      };
      defaultState.rawJsonText = JSON.stringify(buildRuleObjectFromVisual(defaultState), null, 2);
      setRuleModal(defaultState);
    }
  };

  const handleSaveRule = () => {
    let newRule: any = null;
    if (ruleModal.mode === 'json') {
      try {
        newRule = JSON.parse(ruleModal.rawJsonText);
        if (typeof newRule !== 'object' || !newRule) {
          throw new Error('JSON 必须为有效的对象');
        }
      } catch (err: any) {
        setRuleModal((prev) => ({
          ...prev,
          jsonError: `保存失败，JSON 格式错误: ${err.message}`,
        }));
        return;
      }
    } else {
      newRule = buildRuleObjectFromVisual(ruleModal);
    }

    updateParsedConfig((config) => {
      if (!config.routing) {
        config.routing = { domainStrategy: 'IPIfNonMatch', rules: [] };
      }
      if (!config.routing.rules) config.routing.rules = [];

      if (ruleModal.index !== null && ruleModal.index < config.routing.rules.length) {
        config.routing.rules[ruleModal.index] = newRule;
      } else {
        config.routing.rules.push(newRule);
      }
    });
    setRuleModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleDeleteRule = (index: number) => {
    updateParsedConfig((config) => {
      if (config.routing?.rules) {
        config.routing.rules.splice(index, 1);
      }
    });
  };

  // --- DNS Handlers ---
  const handleOpenDnsModal = (srv?: any, index?: number) => {
    if (srv !== undefined && index !== undefined) {
      const visualState = populateDnsVisualFromObject(srv);
      setDnsModal({
        ...visualState,
        isOpen: true,
        index,
        mode: 'visual',
        rawJsonText: typeof srv === 'string' ? JSON.stringify(srv, null, 2) : JSON.stringify(srv, null, 2),
        jsonError: null,
      });
    } else {
      const defaultState = {
        isOpen: true,
        index: null,
        mode: 'visual' as const,
        rawJsonText: JSON.stringify('https://dns.google/dns-query', null, 2),
        jsonError: null,
        server: 'https://dns.google/dns-query',
      };
      setDnsModal(defaultState);
    }
  };

  const handleSaveDns = () => {
    let srvValue: any = null;
    if (dnsModal.mode === 'json') {
      try {
        srvValue = JSON.parse(dnsModal.rawJsonText);
      } catch (err: any) {
        setDnsModal((prev) => ({
          ...prev,
          jsonError: `保存失败，JSON 格式错误: ${err.message}`,
        }));
        return;
      }
    } else {
      srvValue = buildDnsObjectFromVisual(dnsModal);
    }

    if (!srvValue) return;

    updateParsedConfig((config) => {
      if (!config.dns) {
        config.dns = { servers: [] };
      }
      if (!Array.isArray(config.dns.servers)) {
        config.dns.servers = [];
      }

      if (dnsModal.index !== null && dnsModal.index < config.dns.servers.length) {
        config.dns.servers[dnsModal.index] = srvValue;
      } else {
        config.dns.servers.push(srvValue);
      }
    });
    setDnsModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleDeleteDns = (index: number) => {
    updateParsedConfig((config) => {
      if (Array.isArray(config.dns?.servers)) {
        config.dns.servers.splice(index, 1);
      }
    });
  };

  // Extract nodes count mapped in this JSON
  const mappedNodesInJson = useMemo(() => {
    if (!selectedProfile) return [];
    return extractNodesFromConfigJson(selectedProfile.content);
  }, [selectedProfile]);

  const handleEditorChange = (value?: string) => {
    if (value === undefined || !selectedProfile) return;
    try {
      JSON.parse(value);
      setJsonError(null);
    } catch (err: any) {
      setJsonError(err.message);
    }
    updateProfile(selectedProfile.id, { content: value });
  };

  const handleSave = () => {
    if (jsonError) return;
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleFormatJson = () => {
    if (!selectedProfile) return;
    try {
      const parsed = JSON.parse(selectedProfile.content);
      const formatted = JSON.stringify(parsed, null, 2);
      updateProfile(selectedProfile.id, { content: formatted });
      setJsonError(null);
    } catch (err: any) {
      setJsonError(err.message);
    }
  };

  const handleLaunchProfile = (profileId: string) => {
    const target = profiles.find((p) => p.id === profileId);
    if (!target) return;

    setActiveProfileId(profileId);
    setCoreRunning(true);

    setLaunchSuccess(`已成功启动配置文件: ${target.name}`);
    setTimeout(() => setLaunchSuccess(null), 3000);
  };

  const handleCreateNewProfile = () => {
    let initialContent = TEMPLATE_STANDARD;
    if (newTemplateType === 'tun') initialContent = TEMPLATE_TUN;
    if (newTemplateType === 'minimal') initialContent = TEMPLATE_MINIMAL;
    if (newTemplateType === 'blank') initialContent = '{\n  "log": {\n    "loglevel": "warning"\n  }\n}';

    const createdId = addProfile({
      name: newProfileName || '自定义配置文件',
      description: newProfileDesc || '自定义 Xray JSON 节点与路由',
      content: initialContent,
    });

    setSelectedProfileId(createdId);
    setIsModalOpen(false);
    setNewProfileName('');
    setNewProfileDesc('');
    setNewTemplateType('standard');
  };

  const startEditTitle = () => {
    if (!selectedProfile) return;
    setEditName(selectedProfile.name);
    setEditDesc(selectedProfile.description);
    setIsEditingTitle(true);
  };

  const saveEditTitle = () => {
    if (!selectedProfile) return;
    updateProfile(selectedProfile.id, {
      name: editName.trim() || selectedProfile.name,
      description: editDesc.trim() || selectedProfile.description,
    });
    setIsEditingTitle(false);
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileCode2 className="w-6 h-6 text-blue-400" />
            高级配置
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {launchSuccess && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold px-3 py-1.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 animate-pulse">
              <Zap className="w-4 h-4 fill-emerald-400" /> {launchSuccess}
            </span>
          )}

          {saveSuccess && (
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold">
              <Check className="w-4 h-4" /> 映射配置已同步
            </span>
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-semibold shadow-lg shadow-blue-500/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>新建配置文件</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 flex-1 min-h-0">
        {/* Left Side: Config Profiles List Panel (Fixed max width 280px on desktop) */}
        <div className="flex flex-col glass-card rounded-2xl border border-white/10 p-3 bg-slate-900/60 overflow-hidden shrink-0">
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="font-semibold text-slate-300">配置文件列表 ({profiles.length})</span>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="搜索配置名称或描述..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950/70 rounded-xl border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
              />
            </div>
          </div>

          <div className="flex-1 min-h-[140px] max-h-[260px] lg:max-h-none overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
            {filteredProfiles.map((p) => {
              const isSelected = p.id === selectedProfileId;
              const isActive = p.id === activeProfileId && coreState.isRunning;

              return (
                <div
                  key={p.id}
                  ref={isSelected ? selectedCardRef : undefined}
                  onClick={() => setSelectedProfileId(p.id)}
                  className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500/50 shadow-lg shadow-blue-500/10'
                      : 'bg-slate-950/40 border-white/5 hover:border-white/20 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCode2 className={`w-4 h-4 shrink-0 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />
                      <h4 className="text-xs font-bold text-slate-100 truncate">{p.name}</h4>
                    </div>

                    {isActive ? (
                      <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full shadow-sm shadow-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        运行中
                      </span>
                    ) : p.id === activeProfileId ? (
                      <span className="shrink-0 text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                        已激活
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] text-slate-500">
                    <span>更新: {formatShanghaiTime(p.updatedAt)}</span>

                    <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateProfile(p.id);
                        }}
                        title="复制副本"
                        className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {profiles.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingProfile({ id: p.id, name: p.name });
                          }}
                          title="删除配置"
                          className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Visual Inspector & Monaco Editor Workspace */}
        <div className="flex flex-col glass-card rounded-2xl border border-white/10 p-3 bg-slate-950 overflow-hidden min-h-[480px]">
          {selectedProfile && (
            <div className="space-y-2.5 pb-3 mb-3 border-b border-white/10">
              {/* Line 1: Title Info & Mode Switcher / Primary Action */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Title / Description area */}
                {isEditingTitle ? (
                  <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="配置名称"
                      className="px-2.5 py-1 bg-slate-900 border border-blue-500/50 rounded-lg text-xs text-white focus:outline-none"
                    />
                    <input
                      type="text"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="配置描述"
                      className="px-2.5 py-1 bg-slate-900 border border-white/10 rounded-lg text-xs text-slate-300 focus:outline-none flex-1 min-w-[120px]"
                    />
                    <button
                      onClick={saveEditTitle}
                      className="p-1.5 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-500 shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="min-w-0 flex-1 relative">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white tracking-wide truncate">{selectedProfile.name}</h3>
                      <button
                        onClick={startEditTitle}
                        title="编辑名称与描述"
                        className="text-slate-500 hover:text-slate-300 transition-colors shrink-0 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {selectedProfile.description && (
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onClick={() => setShowDescPopover((prev) => !prev)}
                            title="点击查看配置备注说明"
                            className={`p-1 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
                              showDescPopover
                                ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>

                          {showDescPopover && (
                            <div className="absolute left-0 top-full mt-2 z-50 w-72 sm:w-80 p-3 rounded-xl bg-slate-900/98 border border-white/15 backdrop-blur-2xl shadow-2xl animate-fadeIn text-xs text-slate-200 space-y-1.5">
                              <div className="flex items-center justify-between font-bold text-slate-300 border-b border-white/10 pb-1.5">
                                <span>配置备注说明</span>
                                <button
                                  type="button"
                                  onClick={() => setShowDescPopover(false)}
                                  className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <p className="text-[11px] text-slate-300 leading-relaxed font-mono break-words">
                                {selectedProfile.description}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* View Mode Switcher & Quick Launch */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Visual vs Code Mode Toggle */}
                  <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-white/10">
                    <button
                      onClick={() => setViewMode('visual')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        viewMode === 'visual'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>可视化结构</span>
                    </button>
                    <button
                      onClick={() => setViewMode('code')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        viewMode === 'code'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>JSON 源码</span>
                    </button>
                  </div>

                  <button
                    onClick={() => handleLaunchProfile(selectedProfile.id)}
                    disabled={!!jsonError}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 flex items-center gap-1.5 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>启动此配置</span>
                  </button>
                </div>
              </div>

              {/* Line 2: Toolbar Action Buttons (Code Mode) */}
              {viewMode === 'code' && (
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={handleFormatJson}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-white/10 flex items-center gap-1.5 transition-all"
                  >
                    <Code2 className="w-3.5 h-3.5 text-cyan-400" /> 格式化
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!!jsonError}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold border border-white/10 flex items-center gap-1.5 transition-all"
                  >
                    <Save className="w-3.5 h-3.5 text-blue-400" /> 保存
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Validation Banner */}
          <div className="mb-2">
            {jsonError ? (
              <div className="flex items-center justify-between text-xs text-rose-400 font-semibold px-3 py-1.5 bg-rose-500/10 rounded-lg border border-rose-500/20">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>JSON 语法错误: {jsonError}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-emerald-400 font-medium px-3 py-1 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>底层 Xray JSON 结构校验正常</span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    (已被 {mappedNodesInJson.length} 个节点与 {parsedConfig?.routing?.rules?.length || 0} 条规则无缝映射)
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* Main Area: Visual GUI vs Monaco Code */}
          <div className="flex-1 rounded-xl overflow-hidden border border-white/5 bg-slate-950/80 p-2 custom-scrollbar overflow-y-auto">
            {viewMode === 'visual' ? (
              <div className="space-y-4 text-xs">
                {/* 1. Inbounds Section (Step 1: Traffic Entrance) */}
                <div className="p-3 bg-slate-900/60 rounded-xl border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                      <span>入站配置</span>
                    </h4>
                    <button
                      onClick={() => handleOpenInboundModal()}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-[11px] font-semibold transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>添加入站</span>
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {(parsedConfig?.inbounds || []).map((ib, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-slate-950/80 border border-white/5 flex items-center justify-between">
                        <div className="min-w-0 flex-1 pr-2">
                          <span className="font-bold text-slate-200 truncate block">{ib.tag}</span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {ib.listen || '127.0.0.1'}:{ib.port || '动态'} ({ib.protocol})
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {ib.sniffing?.enabled && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-bold border border-cyan-500/20">
                              嗅探开启
                            </span>
                          )}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenInboundModal(ib, idx)}
                              title="编辑入站"
                              className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteInbound(idx)}
                              title="删除入站"
                              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Routing Rules Section (Step 2: Flow Matching) */}
                <div className="p-3 bg-slate-900/60 rounded-xl border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <span>策略分流规则映射</span>
                    </h4>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-emerald-300 font-mono">
                        共 {parsedConfig?.routing?.rules?.length || 0} 条规则
                      </span>
                      <button
                        onClick={() => handleOpenRuleModal()}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>添加规则</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {(parsedConfig?.routing?.rules || []).map((rule: any, idx: number) => {
                      const isDropdownOpen = activeOpenRuleId === idx;
                      const ruleEnabled = rule.enabled !== false;
                      const ruleDescription = rule.description || (
                        rule.domain?.includes('geosite:cn') || rule.ip?.includes('geoip:cn')
                          ? '中国大陆域名/IP'
                          : rule.domain?.includes('geosite:category-ads-all')
                          ? '全网广告与追踪域名拦截'
                          : rule.domain
                          ? '域名分流规则'
                          : rule.ip
                          ? 'IP 分流规则'
                          : rule.network
                          ? '网络协议规则'
                          : '路由规则'
                      );
                      return (
                        <div
                          key={idx}
                          style={{ zIndex: isDropdownOpen ? 50 : (parsedConfig?.routing?.rules?.length || 0) - idx }}
                          className={`relative p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 transition-all ${
                            ruleEnabled ? 'border-white/10 bg-slate-950/60' : 'border-white/5 opacity-50 bg-slate-950/40'
                          }`}
                        >
                          <div className="flex items-center gap-3 shrink-0 min-w-0 max-w-full">
                            {/* Order index badge & Priority controls */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="w-6 h-6 rounded-lg bg-slate-950 border border-white/10 text-slate-300 font-mono text-xs font-bold flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <div className="flex items-center gap-0.5">
                                <button
                                  onClick={() => handleMoveRuleUp(idx)}
                                  disabled={idx === 0}
                                  className="p-0.5 text-slate-500 hover:text-white disabled:opacity-20 transition-colors cursor-pointer"
                                  title="向上调高优先级"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleMoveRuleDown(idx)}
                                  disabled={idx === (parsedConfig?.routing?.rules?.length || 1) - 1}
                                  className="p-0.5 text-slate-500 hover:text-white disabled:opacity-20 transition-colors cursor-pointer"
                                  title="向下调低优先级"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Rule Info */}
                            <div className="min-w-0">
                              <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide break-keep truncate">
                                {ruleDescription}
                              </h4>
                            </div>
                          </div>

                          {/* Outbound Quick Target & Actions */}
                          <div className="flex flex-wrap items-center gap-2 shrink-0 sm:ml-auto">
                            {/* Outbound Target Select */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-slate-400 text-xs font-semibold shrink-0">出站:</span>
                              <OutboundSelect
                                value={rule.outboundTag}
                                onChange={(val) => handleChangeRuleOutbound(idx, val)}
                                onOpenChange={(open) => setActiveOpenRuleId(open ? idx : null)}
                                proxyGroups={proxyGroups}
                                allNodes={allProxyNodes}
                                size="sm"
                              />
                            </div>

                            {/* Enable/Disable Toggle */}
                            <button
                              onClick={() => handleToggleRuleEnabled(idx)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                ruleEnabled
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-slate-900 text-slate-500 border-white/5'
                              }`}
                            >
                              {ruleEnabled ? '启用' : '禁用'}
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => handleOpenRuleModal(rule, idx)}
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/5 transition-colors"
                              title="编辑高级规则"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Clone */}
                            <button
                              onClick={() => handleCloneRule(idx)}
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-blue-400 border border-white/5 transition-colors"
                              title="克隆此规则"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteRule(idx)}
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-600/20 text-slate-500 hover:text-rose-400 border border-white/5 transition-colors"
                              title="删除规则"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Outbounds Node Mapping Section (Step 3: Target Outbound) */}
                <div className="p-3 bg-slate-900/60 rounded-xl border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white flex items-center gap-2">
                      <Server className="w-4 h-4 text-blue-400" />
                      <span>节点出站映射</span>
                    </h4>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-blue-300 font-mono">
                        共 {parsedConfig?.outbounds?.length || 0} 项出站 (包含 {mappedNodesInJson.length} 个代理节点)
                      </span>
                      <button
                        onClick={() => handleOpenOutboundModal()}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-[11px] font-semibold transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>添加出站</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {(parsedConfig?.outbounds || []).map((ob, idx) => {
                      const isNode = ob.protocol !== 'freedom' && ob.protocol !== 'blackhole';
                      const security = ob.streamSettings?.security;
                      const network = ob.streamSettings?.network;
                      const user = ob.settings?.vnext?.[0]?.users?.[0];
                      const flow = user?.flow;

                      return (
                        <div
                          key={ob.tag || idx}
                          className={`p-2.5 rounded-lg border flex items-center justify-between ${
                            isNode
                              ? 'bg-slate-950/80 border-blue-500/30'
                              : 'bg-slate-950/40 border-white/5 text-slate-400'
                          }`}
                        >
                          <div className="space-y-1 min-w-0 flex-1">
                            {/* 1. Outbound Tag Name in First Position */}
                            <div className="font-bold text-slate-100 text-xs truncate">
                              {ob.tag}
                            </div>

                            {/* 2. Badges Underneath Name */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-mono font-bold border shrink-0 ${getProtocolBadgeClass(
                                  ob.protocol
                                )}`}
                              >
                                {ob.protocol}
                              </span>

                              {security === 'reality' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 shrink-0">
                                  <Cpu className="w-2.5 h-2.5" /> REALITY
                                </span>
                              )}

                              {security === 'tls' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 shrink-0">
                                  <Shield className="w-2.5 h-2.5" /> TLS
                                </span>
                              )}

                              {network && network !== 'tcp' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/30 shrink-0">
                                  {network}
                                </span>
                              )}

                              {flow && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 shrink-0">
                                  Vision
                                </span>
                              )}
                            </div>

                            {/* 3. Address Info */}
                            <div className="text-[10px] text-slate-400 font-mono truncate">
                              {ob.settings?.vnext?.[0]?.address
                                ? `${ob.settings.vnext[0].address}:${ob.settings.vnext[0].port}`
                                : ob.settings?.servers?.[0]?.address
                                ? `${ob.settings.servers[0].address}:${ob.settings.servers[0].port}`
                                : '系统内置自由出站'}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {!isNode && (
                              <div className="text-[10px] font-mono text-slate-400">
                                {ob.protocol === 'freedom' ? '直连' : ob.protocol === 'blackhole' ? '阻断' : '系统出站'}
                              </div>
                            )}

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenOutboundModal(ob, idx)}
                                title="编辑此出站"
                                className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteOutbound(idx)}
                                title="删除此出站"
                                className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Visual Divider: Advanced & System Settings */}
                <div className="pt-3 pb-1 flex items-center gap-3">
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 via-white/5 to-transparent" />
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 tracking-wider">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
                    <span>高级解析与系统配置</span>
                  </span>
                  <div className="h-[1px] flex-1 bg-gradient-to-l from-white/10 via-white/5 to-transparent" />
                </div>

                {/* 4 & 5. DNS & Observatory Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* DNS */}
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white flex items-center gap-2">
                        <Globe className="w-4 h-4 text-purple-400" />
                        DNS 解析服务
                      </h4>
                      <button
                        onClick={() => handleOpenDnsModal()}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-[11px] font-semibold transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>添加 DNS</span>
                      </button>
                    </div>

                    <div className="space-y-1.5 font-mono text-[11px] text-slate-300">
                      {Array.isArray(parsedConfig?.dns?.servers) && parsedConfig.dns.servers.length > 0 ? (
                        parsedConfig.dns.servers.map((srv, idx) => (
                          <div key={idx} className="p-1.5 bg-slate-950/80 rounded border border-white/5 flex items-center justify-between gap-2">
                            <span className="truncate flex-1 text-slate-300">
                              {typeof srv === 'string' ? srv : srv.address || JSON.stringify(srv)}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleOpenDnsModal(srv, idx)}
                                title="编辑 DNS"
                                className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteDns(idx)}
                                title="删除 DNS"
                                className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 rounded transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-500 p-2">使用系统默认 DNS</div>
                      )}
                    </div>
                  </div>

                  {/* Observatory */}
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-white/10 space-y-2 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Activity className="w-4 h-4 text-emerald-400 mr-0.5" />
                          <h4 className="font-bold text-white text-xs sm:text-sm mr-1">连接观测</h4>
                          {parsedConfig?.burstObservatory ? (
                            <>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                                突发打散
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-white/10 font-semibold">
                                {parsedConfig.burstObservatory.pingConfig?.interval || '1m'}
                              </span>
                            </>
                          ) : parsedConfig?.observatory ? (
                            <>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                                固定周期
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 border border-white/10 font-semibold">
                                {parsedConfig.observatory.probeInterval || '10s'}
                              </span>
                            </>
                          ) : (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-white/5">
                              未开启
                            </span>
                          )}
                        </div>

                        <button
                          onClick={handleOpenObservatoryModal}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold transition-all cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{parsedConfig?.observatory || parsedConfig?.burstObservatory ? '配置观测' : '开启观测'}</span>
                        </button>
                      </div>

                      {parsedConfig?.burstObservatory ? (
                        <div className="p-2 bg-slate-950/80 rounded-lg border border-white/5 text-xs space-y-1.5">
                          <div className="flex items-center gap-2 text-slate-300 min-w-0">
                            <span className="text-slate-400 text-[11px] shrink-0">探测目标:</span>
                            <span className="font-mono text-amber-300 truncate flex-1 min-w-0 font-semibold select-all text-[11px]">
                              {parsedConfig.burstObservatory.pingConfig?.destination || '未设置'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-white/5">
                            <span className="text-slate-500 text-[10px]">匹配 Tag:</span>
                            {(parsedConfig.burstObservatory.subjectSelector || []).map((tag: string, i: number) => (
                              <span key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-[10px] border border-white/5">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : parsedConfig?.observatory ? (
                        <div className="p-2 bg-slate-950/80 rounded-lg border border-white/5 text-xs space-y-1.5">
                          <div className="flex items-center gap-2 text-slate-300 min-w-0">
                            <span className="text-slate-400 text-[11px] shrink-0">探测目标:</span>
                            <span className="font-mono text-emerald-300 truncate flex-1 min-w-0 font-semibold select-all text-[11px]">
                              {parsedConfig.observatory.probeUrl || '未设置'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-white/5">
                            <span className="text-slate-500 text-[10px]">匹配 Tag:</span>
                            {(parsedConfig.observatory.subjectSelector || []).map((tag: string, i: number) => (
                              <span key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono text-[10px] border border-white/5">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="p-2 bg-slate-950/40 rounded-lg border border-dashed border-white/10 text-xs text-slate-400">
                          未启用出站连通性状态观测。点击上方按钮配置。
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 6. Log Object Full Specification Visual Editor Section */}
                <div className="p-3 bg-slate-900/60 rounded-xl border border-white/10 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="font-bold text-white flex items-center gap-2 text-sm">
                      <Terminal className="w-4 h-4 text-amber-400" />
                      日志配置
                    </h4>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold uppercase">
                        {parsedConfig?.log?.loglevel || 'warning'}
                      </span>
                      {parsedConfig?.log?.dnsLog && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-semibold">
                          DNS LOG
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Grid 1: loglevel, dnsLog, maskAddress */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        日志输出等级
                      </label>
                      <CustomSelect
                        value={parsedConfig?.log?.loglevel || 'warning'}
                        onChange={handleLogLevelChange}
                        options={LOG_LEVEL_OPTIONS}
                        accentColor="purple"
                        size="sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        IP/域名隐私遮罩
                      </label>
                      <CustomSelect
                        value={parsedConfig?.log?.maskAddress || ''}
                        onChange={handleLogMaskAddressChange}
                        options={MASK_ADDRESS_OPTIONS}
                        accentColor="purple"
                        size="sm"
                      />
                    </div>

                    <div className="flex flex-col justify-end">
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        DNS 查询日志
                      </label>
                      <button
                        type="button"
                        onClick={() => handleLogDnsLogToggle(!parsedConfig?.log?.dnsLog)}
                        className={`w-full py-1.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                          parsedConfig?.log?.dnsLog
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            : 'bg-slate-950 text-slate-400 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <span>记录 DNS 查询日志</span>
                        <span className={`w-3.5 h-3.5 rounded-full ${parsedConfig?.log?.dnsLog ? 'bg-cyan-400 shadow-sm shadow-cyan-500/50' : 'bg-slate-700'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Grid 2: access & error log path inputs with quick preset buttons */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-slate-300">
                          访问日志重定向
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleLogAccessChange('none')}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5 transition-colors"
                          >
                            none (禁用)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLogAccessChange('')}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5 transition-colors"
                          >
                            控制台输出
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={parsedConfig?.log?.access ?? ''}
                        onChange={(e) => handleLogAccessChange(e.target.value)}
                        placeholder="留空为控制台输出，或填 none / 日志文件路径"
                        className="w-full bg-slate-950 px-3 py-1.5 rounded-xl border border-white/10 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 font-mono"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-slate-300">
                          错误日志重定向
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleLogErrorChange('none')}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5 transition-colors"
                          >
                            none (禁用)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLogErrorChange('')}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5 transition-colors"
                          >
                            控制台输出
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={parsedConfig?.log?.error ?? ''}
                        onChange={(e) => handleLogErrorChange(e.target.value)}
                        placeholder="留空为控制台输出，或填 none / 日志文件路径"
                        className="w-full bg-slate-950 px-3 py-1.5 rounded-xl border border-white/10 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Code Editor Mode */
              <Editor
                height="100%"
                defaultLanguage="json"
                theme="vs-dark"
                value={selectedProfile.content}
                onChange={handleEditorChange}
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  formatOnPaste: true,
                  formatOnType: true,
                  mouseWheelZoom: true,
                  padding: { top: 12 },
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* New Config Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg glass-card bg-slate-900 border border-white/15 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                新建 Xray 配置文件
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">配置文件名称</label>
                <input
                  type="text"
                  placeholder="例如: 日本节点专用分流配置"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">配置说明 / 备注</label>
                <input
                  type="text"
                  placeholder="例如: 针对 ChatGPT 及 4K 视频优化"
                  value={newProfileDesc}
                  onChange={(e) => setNewProfileDesc(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">选择初始模板</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setNewTemplateType('standard')}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      newTemplateType === 'standard'
                        ? 'bg-blue-600/20 border-blue-500 text-white'
                        : 'bg-slate-950/60 border-white/5 text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    <div className="font-bold text-xs mb-0.5">标准 SOCKS5+HTTP 模板</div>
                    <div className="text-[10px] text-slate-400">预置分流规则与常规双端口入站</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewTemplateType('tun')}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      newTemplateType === 'tun'
                        ? 'bg-blue-600/20 border-blue-500 text-white'
                        : 'bg-slate-950/60 border-white/5 text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    <div className="font-bold text-xs mb-0.5">TUN 透明代理模板</div>
                    <div className="text-[10px] text-slate-400">含 Dokodemo-door 与 FakeDNS 配置</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewTemplateType('minimal')}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      newTemplateType === 'minimal'
                        ? 'bg-blue-600/20 border-blue-500 text-white'
                        : 'bg-slate-950/60 border-white/5 text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    <div className="font-bold text-xs mb-0.5">极简调试模板</div>
                    <div className="text-[10px] text-slate-400">仅包含最基础入站与自由出站</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewTemplateType('blank')}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      newTemplateType === 'blank'
                        ? 'bg-blue-600/20 border-blue-500 text-white'
                        : 'bg-slate-950/60 border-white/5 text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    <div className="font-bold text-xs mb-0.5">空白基础 JSON</div>
                    <div className="text-[10px] text-slate-400">从零构建完全自定义 JSON</div>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleCreateNewProfile}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all"
              >
                立即创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Add Inbound Modal */}
      {inboundModal.isOpen && (() => {
        const effectiveProtocol =
          inboundModal.protocol === 'custom' ? inboundModal.customProtocol : inboundModal.protocol;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
            <div className={`w-full glass-card bg-slate-900 border border-white/15 rounded-2xl p-6 shadow-2xl transition-all duration-300 flex flex-col ${
              inboundModal.isMaximized ? 'max-w-5xl h-[85vh]' : 'max-w-lg max-h-[90vh]'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-white/10 gap-2 shrink-0">
                <h3 className="text-base font-bold text-white flex items-center gap-2 truncate min-w-0">
                  <SlidersHorizontal className="w-5 h-5 text-cyan-400 shrink-0" />
                  <span className="truncate">{inboundModal.index !== null ? '编辑入站配置' : '新增入站配置'}</span>
                </h3>
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Mode Switcher */}
                  <div className="flex items-center p-1 bg-slate-950/80 rounded-xl border border-white/10 text-xs shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSwitchInboundMode('visual')}
                      title="可视化结构"
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap ${
                        inboundModal.mode === 'visual'
                          ? 'bg-cyan-600 text-white shadow-md font-bold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5 shrink-0" />
                      <span className="hidden sm:inline whitespace-nowrap">可视化结构</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchInboundMode('json')}
                      title="JSON 源码"
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap ${
                        inboundModal.mode === 'json'
                          ? 'bg-cyan-600 text-white shadow-md font-bold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      <Code2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="hidden sm:inline whitespace-nowrap">JSON 源码</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInboundModal((prev) => ({ ...prev, isMaximized: !prev.isMaximized }))}
                    title={inboundModal.isMaximized ? '还原窗口大小' : '最大化 / 放大窗口'}
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    {inboundModal.isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setInboundModal((prev) => ({ ...prev, isOpen: false }))}
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {inboundModal.mode === 'visual' ? (
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar py-3 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">入站 Tag (标识名)</label>
                    <input
                      type="text"
                      placeholder="如: socks-in, http-in 或 tunnel-in"
                      value={inboundModal.tag}
                      onChange={(e) => setInboundModal((prev) => ({ ...prev, tag: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">协议 Protocol</label>
                      <CustomSelect
                        value={inboundModal.protocol}
                        onChange={(val) => setInboundModal((prev) => ({ ...prev, protocol: val }))}
                        options={INBOUND_PROTOCOL_OPTIONS}
                        accentColor="cyan"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">监听端口 Port</label>
                      <input
                        type="number"
                        placeholder="7890"
                        value={inboundModal.port}
                        onChange={(e) => setInboundModal((prev) => ({ ...prev, port: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>
                  </div>

                  {inboundModal.protocol === 'custom' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">自定义协议名称 Custom Protocol</label>
                      <input
                        type="text"
                        placeholder="例如: socks, http, dokodemo-door 等"
                        value={inboundModal.customProtocol}
                        onChange={(e) => setInboundModal((prev) => ({ ...prev, customProtocol: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-cyan-500/50 text-xs text-white font-mono focus:outline-none"
                      />
                    </div>
                  )}

                  {/* --- Protocol Specific Configuration Section --- */}

                  {/* 1. Dokodemo-door (Tunnel / 任意门) */}
                  {effectiveProtocol === 'dokodemo-door' && (
                    <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-xl space-y-3">
                      <div className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        Dokodemo-door 任意门设置
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">目标地址 Target Address</label>
                          <input
                            type="text"
                            placeholder="例如: 8.8.8.8 或 127.0.0.1"
                            value={inboundModal.targetAddress}
                            onChange={(e) => setInboundModal((prev) => ({ ...prev, targetAddress: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">目标端口 Target Port</label>
                          <input
                            type="number"
                            placeholder="例如: 53 或 80"
                            value={inboundModal.targetPort}
                            onChange={(e) => setInboundModal((prev) => ({ ...prev, targetPort: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">传输网络 Network</label>
                        <CustomSelect
                          value={inboundModal.network}
                          onChange={(val) => setInboundModal((prev) => ({ ...prev, network: val }))}
                          options={INBOUND_NETWORK_OPTIONS}
                          accentColor="cyan"
                        />
                      </div>

                      <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-lg border border-white/5">
                        <div>
                          <div className="text-xs font-semibold text-slate-200">透明代理重定向</div>
                          <div className="text-[10px] text-slate-400">自动识别 iptables/nftables 捕获的真实目的地 IP 和端口</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={inboundModal.followRedirect}
                          onChange={(e) => setInboundModal((prev) => ({ ...prev, followRedirect: e.target.checked }))}
                          className="w-4 h-4 rounded border-white/20 bg-slate-900 text-cyan-600 focus:ring-cyan-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* 2. SOCKS5 */}
                  {effectiveProtocol === 'socks' && (
                    <div className="p-3 bg-slate-950/40 border border-white/10 rounded-xl space-y-3">
                      <div className="text-xs font-bold text-cyan-400">SOCKS5 协议高级设置</div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">认证方式 Auth</label>
                          <CustomSelect
                            value={inboundModal.auth}
                            onChange={(val) => setInboundModal((prev) => ({ ...prev, auth: val }))}
                            options={SOCKS_AUTH_OPTIONS}
                            accentColor="cyan"
                          />
                        </div>

                        <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-white/10 mt-5">
                          <span className="text-xs font-semibold text-slate-200">支持 UDP 转发</span>
                          <input
                            type="checkbox"
                            checked={inboundModal.udp}
                            onChange={(e) => setInboundModal((prev) => ({ ...prev, udp: e.target.checked }))}
                            className="w-4 h-4 rounded border-white/20 bg-slate-900 text-cyan-600 focus:ring-cyan-500"
                          />
                        </div>
                      </div>

                      {inboundModal.auth === 'password' && (
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">账号 Username</label>
                            <input
                              type="text"
                              placeholder="用户名"
                              value={inboundModal.username}
                              onChange={(e) => setInboundModal((prev) => ({ ...prev, username: e.target.value }))}
                              className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">密码 Password</label>
                            <input
                              type="password"
                              placeholder="密码"
                              value={inboundModal.userPassword}
                              onChange={(e) => setInboundModal((prev) => ({ ...prev, userPassword: e.target.value }))}
                              className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. HTTP */}
                  {effectiveProtocol === 'http' && (
                    <div className="p-3 bg-slate-950/40 border border-white/10 rounded-xl space-y-3">
                      <div className="text-xs font-bold text-cyan-400">HTTP 代理认证设置 (可选)</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">账号 Username</label>
                          <input
                            type="text"
                            placeholder="留空即为无密码代理"
                            value={inboundModal.username}
                            onChange={(e) => setInboundModal((prev) => ({ ...prev, username: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">密码 Password</label>
                          <input
                            type="password"
                            placeholder="密码"
                            value={inboundModal.userPassword}
                            onChange={(e) => setInboundModal((prev) => ({ ...prev, userPassword: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 4. Shadowsocks */}
                  {effectiveProtocol === 'shadowsocks' && (
                    <div className="p-3 bg-slate-950/40 border border-white/10 rounded-xl space-y-3">
                      <div className="text-xs font-bold text-cyan-400">Shadowsocks 入站设置</div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">加密方式 Encryption Method</label>
                        <CustomSelect
                          value={inboundModal.ssMethod}
                          onChange={(val) => setInboundModal((prev) => ({ ...prev, ssMethod: val }))}
                          options={SHADOWSOCKS_METHOD_OPTIONS}
                          accentColor="cyan"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">服务密码 Password</label>
                        <input
                          type="text"
                          placeholder="密码"
                          value={inboundModal.uuidPassword}
                          onChange={(e) => setInboundModal((prev) => ({ ...prev, uuidPassword: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">传输网络 Network</label>
                        <CustomSelect
                          value={inboundModal.network}
                          onChange={(val) => setInboundModal((prev) => ({ ...prev, network: val }))}
                          options={INBOUND_NETWORK_OPTIONS}
                          accentColor="cyan"
                        />
                      </div>
                    </div>
                  )}

                  {/* 5. VLESS / VMess / Trojan / Hysteria 2 */}
                  {['vless', 'vmess', 'trojan', 'hysteria2'].includes(effectiveProtocol) && (
                    <div className="p-3 bg-slate-950/40 border border-white/10 rounded-xl space-y-3">
                      <div className="text-xs font-bold text-cyan-400">{effectiveProtocol.toUpperCase()} 入站认证设置</div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          {effectiveProtocol === 'vless' || effectiveProtocol === 'vmess' ? '客户端 UUID' : '客户端连接密码 Password'}
                        </label>
                        <input
                          type="text"
                          placeholder="填入客户端连接所需 UUID 或密码"
                          value={inboundModal.uuidPassword || ''}
                          onChange={(e) => setInboundModal((prev) => ({ ...prev, uuidPassword: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      {effectiveProtocol === 'vless' && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">流控算法 Flow (可选)</label>
                            <input
                              type="text"
                              placeholder="例如: xtls-rprx-vision"
                              value={inboundModal.flow || ''}
                              onChange={(e) => setInboundModal((prev) => ({ ...prev, flow: e.target.value }))}
                              className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                            />
                          </div>

                          <div className="pt-2 border-t border-white/5 space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-semibold text-slate-300">VLESS 反向代理</label>
                              <input
                                type="checkbox"
                                checked={inboundModal.enableReverse || false}
                                onChange={(e) => setInboundModal((prev) => ({ ...prev, enableReverse: e.target.checked }))}
                                className="w-4 h-4 rounded border-white/10 bg-slate-950 text-cyan-500 focus:ring-0 cursor-pointer"
                              />
                            </div>
                            {inboundModal.enableReverse && (
                              <div>
                                <label className="block text-xs text-slate-400 mb-1 font-semibold">反向代理关联出站 Tag</label>
                                <input
                                  type="text"
                                  placeholder="例如: r-outbound (Portal 端映射出的出站 Tag)"
                                  value={inboundModal.reverseTag || ''}
                                  onChange={(e) => setInboundModal((prev) => ({ ...prev, reverseTag: e.target.value }))}
                                  className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 6. WireGuard 入站 */}
                  {effectiveProtocol === 'wireguard' && (
                    <div className="p-3 bg-slate-950/40 border border-white/10 rounded-xl space-y-3">
                      <div className="text-xs font-bold text-cyan-400">WireGuard 入站代理设置</div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">服务端私钥 Secret Key</label>
                        <input
                          type="text"
                          placeholder="Base64 私钥"
                          value={inboundModal.wgSecretKey}
                          onChange={(e) => setInboundModal((prev) => ({ ...prev, wgSecretKey: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">客户端公钥 Public Key</label>
                          <input
                            type="text"
                            placeholder="Base64 公钥"
                            value={inboundModal.wgPublicKey}
                            onChange={(e) => setInboundModal((prev) => ({ ...prev, wgPublicKey: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">允许客户端 IP Allowed IPs</label>
                          <input
                            type="text"
                            placeholder="例如: 0.0.0.0/0"
                            value={inboundModal.wgAllowedIPs}
                            onChange={(e) => setInboundModal((prev) => ({ ...prev, wgAllowedIPs: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 7. TUN 入站 */}
                  {effectiveProtocol === 'tun' && (
                    <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-xl space-y-3">
                      <div className="text-xs font-bold text-cyan-400">TUN 虚拟网卡入站设置</div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">网卡名称 Name</label>
                          <input
                            type="text"
                            placeholder="tun0"
                            value={inboundModal.tunName}
                            onChange={(e) => setInboundModal((prev) => ({ ...prev, tunName: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">MTU 大小</label>
                          <input
                            type="number"
                            placeholder="1500"
                            value={inboundModal.tunMtu}
                            onChange={(e) => setInboundModal((prev) => ({ ...prev, tunMtu: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">网络栈 Stack</label>
                          <CustomSelect
                            value={inboundModal.tunStack}
                            onChange={(val) => setInboundModal((prev) => ({ ...prev, tunStack: val }))}
                            options={TUN_STACK_OPTIONS}
                            accentColor="cyan"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="flex items-center justify-between p-2 bg-slate-950/60 rounded-lg border border-white/5">
                          <span className="text-xs text-slate-200">自动设置系统路由</span>
                          <input
                            type="checkbox"
                            checked={inboundModal.autoRoute}
                            onChange={(e) => setInboundModal((prev) => ({ ...prev, autoRoute: e.target.checked }))}
                            className="w-4 h-4 rounded border-white/20 bg-slate-900 text-cyan-600 focus:ring-cyan-500"
                          />
                        </div>
                        <div className="flex items-center justify-between p-2 bg-slate-950/60 rounded-lg border border-white/5">
                          <span className="text-xs text-slate-200">严格路由模式</span>
                          <input
                            type="checkbox"
                            checked={inboundModal.strictRoute}
                            onChange={(e) => setInboundModal((prev) => ({ ...prev, strictRoute: e.target.checked }))}
                            className="w-4 h-4 rounded border-white/20 bg-slate-900 text-cyan-600 focus:ring-cyan-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- Common Listen & Sniffing Section --- */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">监听地址 Listen Address</label>
                    <input
                      type="text"
                      placeholder="127.0.0.1 或 0.0.0.0"
                      value={inboundModal.listen}
                      onChange={(e) => setInboundModal((prev) => ({ ...prev, listen: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-white/5">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">开启流量嗅探</div>
                      <div className="text-[10px] text-slate-400">自动重定向 HTTP/TLS/QUIC 域名至真实 Host</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={inboundModal.sniffing}
                      onChange={(e) => setInboundModal((prev) => ({ ...prev, sniffing: e.target.checked }))}
                      className="w-4 h-4 rounded border-white/20 bg-slate-900 text-cyan-600 focus:ring-cyan-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-h-0 py-3 flex flex-col space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-400 shrink-0">
                    <span>编辑局部入站 JSON 配置对象 (符合 Xray 官方规范)</span>
                    <span className="font-mono text-[10px] text-slate-500">JSON Object</span>
                  </div>
                  <div className={`w-full rounded-xl border border-white/10 overflow-hidden bg-[#1e1e1e] ${
                    inboundModal.isMaximized ? 'flex-1 min-h-[300px]' : 'h-[360px] shrink-0'
                  }`}>
                    <Editor
                      height="100%"
                      defaultLanguage="json"
                      language="json"
                      theme="vs-dark"
                      value={inboundModal.rawJsonText}
                      onChange={(val) =>
                        setInboundModal((prev) => ({ ...prev, rawJsonText: val || '', jsonError: null }))
                      }
                      options={{
                        fontSize: 12,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 2,
                        formatOnPaste: true,
                        formatOnType: true,
                        padding: { top: 8, bottom: 8 },
                        lineNumbersMinChars: 3,
                        folding: true,
                        mouseWheelZoom: true,
                      }}
                    />
                  </div>
                  {inboundModal.jsonError && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 font-mono shrink-0 animate-fadeIn">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{inboundModal.jsonError}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10 shrink-0">
                <button
                  onClick={() => setInboundModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveInbound}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 transition-all"
                >
                  保存设置
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Edit / Add Outbound Modal */}
      {outboundModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className={`w-full glass-card bg-slate-900 border border-white/15 rounded-2xl p-6 shadow-2xl transition-all duration-300 flex flex-col ${
            outboundModal.isMaximized ? 'max-w-5xl h-[85vh]' : 'max-w-xl max-h-[90vh]'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-white/10 gap-2 shrink-0">
              <h3 className="text-base font-bold text-white flex items-center gap-2 truncate min-w-0">
                <Server className="w-5 h-5 text-blue-400 shrink-0" />
                <span className="truncate">{outboundModal.index !== null ? '编辑出站配置' : '新增出站配置'}</span>
              </h3>
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Mode Switcher */}
                <div className="flex items-center p-1 bg-slate-950/80 rounded-xl border border-white/10 text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSwitchOutboundMode('visual')}
                    title="可视化结构"
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap ${
                      outboundModal.mode === 'visual'
                        ? 'bg-blue-600 text-white shadow-md font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline whitespace-nowrap">可视化结构</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchOutboundMode('json')}
                    title="JSON 源码"
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap ${
                      outboundModal.mode === 'json'
                        ? 'bg-blue-600 text-white shadow-md font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline whitespace-nowrap">JSON 源码</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setOutboundModal((prev) => ({ ...prev, isMaximized: !prev.isMaximized }))}
                  title={outboundModal.isMaximized ? '还原窗口大小' : '最大化 / 放大窗口'}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  {outboundModal.isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setOutboundModal((prev) => ({ ...prev, isOpen: false }))}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {outboundModal.mode === 'visual' ? (
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar py-3 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">出站 Tag (标识名)</label>
                  <input
                    type="text"
                    placeholder="如: proxy, direct, block 等"
                    value={outboundModal.tag}
                    onChange={(e) => setOutboundModal((prev) => ({ ...prev, tag: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">出站协议 Protocol</label>
                    <CustomSelect
                      value={outboundModal.protocol}
                      onChange={(val) => setOutboundModal((prev) => ({ ...prev, protocol: val }))}
                      options={OUTBOUND_PROTOCOL_OPTIONS}
                      accentColor="blue"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">传输网络 Network</label>
                    <CustomSelect
                      value={outboundModal.network}
                      onChange={(val) => setOutboundModal((prev) => ({ ...prev, network: val }))}
                      options={OUTBOUND_NETWORK_OPTIONS}
                      disabled={['freedom', 'blackhole', 'dns', 'loopback', 'wireguard'].includes(outboundModal.protocol)}
                      accentColor="blue"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">传输安全 Security</label>
                    <CustomSelect
                      value={outboundModal.security}
                      onChange={(val) => setOutboundModal((prev) => ({ ...prev, security: val }))}
                      options={OUTBOUND_SECURITY_OPTIONS}
                      disabled={['freedom', 'blackhole', 'dns', 'loopback', 'wireguard'].includes(outboundModal.protocol)}
                      accentColor="blue"
                    />
                  </div>
                </div>

                {/* --- Protocol Specific Outbound Options --- */}

                {/* 1. Blackhole */}
                {outboundModal.protocol === 'blackhole' && (
                  <div className="p-3 bg-slate-950/40 border border-white/10 rounded-xl space-y-2">
                    <div className="text-xs font-bold text-blue-400">Blackhole (黑洞阻断) 设置</div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">阻断响应类型 Response Type</label>
                      <CustomSelect
                        value={outboundModal.blackholeResponse}
                        onChange={(val) => setOutboundModal((prev) => ({ ...prev, blackholeResponse: val }))}
                        options={BLACKHOLE_RESPONSE_OPTIONS}
                        accentColor="blue"
                      />
                    </div>
                  </div>
                )}

                {/* 2. DNS Outbound */}
                {outboundModal.protocol === 'dns' && (
                  <div className="p-3 bg-slate-950/40 border border-white/10 rounded-xl space-y-3">
                    <div className="text-xs font-bold text-blue-400">DNS 查询发送器设置</div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-slate-300 mb-1">DNS 服务器 Address</label>
                        <input
                          type="text"
                          placeholder="例如: 1.1.1.1 或 8.8.8.8"
                          value={outboundModal.dnsAddress}
                          onChange={(e) => setOutboundModal((prev) => ({ ...prev, dnsAddress: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">端口 Port</label>
                        <input
                          type="number"
                          placeholder="53"
                          value={outboundModal.dnsPort}
                          onChange={(e) => setOutboundModal((prev) => ({ ...prev, dnsPort: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">传输网络 Network</label>
                        <CustomSelect
                          value={outboundModal.dnsNetwork}
                          onChange={(val) => setOutboundModal((prev) => ({ ...prev, dnsNetwork: val }))}
                          options={INBOUND_NETWORK_OPTIONS}
                          accentColor="blue"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">非 IP 查询处理</label>
                        <CustomSelect
                          value={outboundModal.dnsNonIPQuery}
                          onChange={(val) => setOutboundModal((prev) => ({ ...prev, dnsNonIPQuery: val }))}
                          options={DNS_NON_IP_QUERY_OPTIONS}
                          accentColor="blue"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Freedom (Fragment & Noises) */}
                {outboundModal.protocol === 'freedom' && (
                  <div className="p-3 bg-slate-950/40 border border-white/10 rounded-xl space-y-3">
                    <div className="text-xs font-bold text-blue-400">Freedom (直连策略与抗封锁混淆)</div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">域名解析策略 Domain Strategy</label>
                      <CustomSelect
                        value={outboundModal.domainStrategy}
                        onChange={(val) => setOutboundModal((prev) => ({ ...prev, domainStrategy: val }))}
                        options={FREEDOM_DOMAIN_STRATEGY_OPTIONS}
                        accentColor="blue"
                      />
                    </div>

                    <div className="p-2.5 bg-slate-950/60 rounded-lg border border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-200">启用 TLS/TCP 数据包分片 (Fragment)</span>
                        <input
                          type="checkbox"
                          checked={outboundModal.enableFragment}
                          onChange={(e) => setOutboundModal((prev) => ({ ...prev, enableFragment: e.target.checked }))}
                          className="w-4 h-4 rounded border-white/20 bg-slate-900 text-blue-600 focus:ring-blue-500"
                        />
                      </div>
                      {outboundModal.enableFragment && (
                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <div>
                            <label className="block text-[10px] text-slate-400">分片目标 Packets</label>
                            <input
                              type="text"
                              value={outboundModal.fragPackets}
                              onChange={(e) => setOutboundModal((prev) => ({ ...prev, fragPackets: e.target.value }))}
                              className="w-full px-2 py-1 bg-slate-950 rounded text-xs text-white font-mono border border-white/10"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400">长度 Length</label>
                            <input
                              type="text"
                              value={outboundModal.fragLength}
                              onChange={(e) => setOutboundModal((prev) => ({ ...prev, fragLength: e.target.value }))}
                              className="w-full px-2 py-1 bg-slate-950 rounded text-xs text-white font-mono border border-white/10"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400">延迟 Interval (ms)</label>
                            <input
                              type="text"
                              value={outboundModal.fragInterval}
                              onChange={(e) => setOutboundModal((prev) => ({ ...prev, fragInterval: e.target.value }))}
                              className="w-full px-2 py-1 bg-slate-950 rounded text-xs text-white font-mono border border-white/10"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. Loopback */}
                {outboundModal.protocol === 'loopback' && (
                  <div className="p-3 bg-slate-950/40 border border-white/10 rounded-xl space-y-2">
                    <div className="text-xs font-bold text-blue-400">Loopback (回环重定向) 设置</div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">目标入站 Tag (inboundTag)</label>
                      <input
                        type="text"
                        placeholder="如: socks-in"
                        value={outboundModal.inboundTag}
                        onChange={(e) => setOutboundModal((prev) => ({ ...prev, inboundTag: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* 5. WireGuard Outbound */}
                {outboundModal.protocol === 'wireguard' && (
                  <div className="p-3 bg-slate-950/40 border border-white/10 rounded-xl space-y-3">
                    <div className="text-xs font-bold text-blue-400">WireGuard VPN 出站设置</div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">客户端私钥 Secret Key</label>
                      <input
                        type="text"
                        placeholder="Base64 私钥"
                        value={outboundModal.wgSecretKey}
                        onChange={(e) => setOutboundModal((prev) => ({ ...prev, wgSecretKey: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">服务端公钥 Public Key</label>
                        <input
                          type="text"
                          placeholder="Base64 公钥"
                          value={outboundModal.wgPublicKey}
                          onChange={(e) => setOutboundModal((prev) => ({ ...prev, wgPublicKey: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">服务端 Endpoint (IP:Port)</label>
                        <input
                          type="text"
                          placeholder="1.2.3.4:51820"
                          value={outboundModal.wgEndpoint}
                          onChange={(e) => setOutboundModal((prev) => ({ ...prev, wgEndpoint: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">本地 VPN 地址 Address</label>
                        <input
                          type="text"
                          placeholder="10.0.0.2/32"
                          value={outboundModal.wgAddress}
                          onChange={(e) => setOutboundModal((prev) => ({ ...prev, wgAddress: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">MTU 大小</label>
                        <input
                          type="number"
                          placeholder="1420"
                          value={outboundModal.wgMtu}
                          onChange={(e) => setOutboundModal((prev) => ({ ...prev, wgMtu: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. Standard Proxy Protocols (VLESS, VMess, Trojan, SS, HTTP, SOCKS, Hysteria 2) */}
                {!['freedom', 'blackhole', 'dns', 'loopback', 'wireguard'].includes(outboundModal.protocol) && (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-slate-300 mb-1">服务器地址 Server</label>
                        <input
                          type="text"
                          placeholder="1.2.3.4 或 node.example.com"
                          value={outboundModal.server}
                          onChange={(e) => setOutboundModal((prev) => ({ ...prev, server: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">端口 Port</label>
                        <input
                          type="number"
                          placeholder="443"
                          value={outboundModal.port}
                          onChange={(e) => setOutboundModal((prev) => ({ ...prev, port: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {outboundModal.protocol === 'shadowsocks' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">加密方式 Method</label>
                        <CustomSelect
                          value={outboundModal.ssMethod}
                          onChange={(val) => setOutboundModal((prev) => ({ ...prev, ssMethod: val }))}
                          options={SHADOWSOCKS_METHOD_OPTIONS}
                          accentColor="blue"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {outboundModal.protocol === 'vless' || outboundModal.protocol === 'vmess' ? 'UUID' : '密码'}
                      </label>
                      <input
                        type="text"
                        placeholder="填入 UUID 或节点连接密码"
                        value={outboundModal.uuidPassword}
                        onChange={(e) => setOutboundModal((prev) => ({ ...prev, uuidPassword: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {outboundModal.protocol === 'vless' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">流控算法</label>
                          <input
                            type="text"
                            placeholder="如: xtls-rprx-vision"
                            value={outboundModal.flow}
                            onChange={(e) => setOutboundModal((prev) => ({ ...prev, flow: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="pt-2 border-t border-white/5 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-300">VLESS 反向代理</label>
                            <input
                              type="checkbox"
                              checked={outboundModal.enableReverse || false}
                              onChange={(e) => setOutboundModal((prev) => ({ ...prev, enableReverse: e.target.checked }))}
                              className="w-4 h-4 rounded border-white/10 bg-slate-950 text-blue-500 focus:ring-0 cursor-pointer"
                            />
                          </div>
                          {outboundModal.enableReverse && (
                            <div>
                              <input
                                type="text"
                                placeholder="例如: r-inbound (Bridge 端接收流量的入站 Tag)"
                                value={outboundModal.reverseTag || ''}
                                onChange={(e) => setOutboundModal((prev) => ({ ...prev, reverseTag: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {outboundModal.protocol === 'vmess' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">加密算法</label>
                        <CustomSelect
                          value={outboundModal.vmessSecurity}
                          onChange={(val) => setOutboundModal((prev) => ({ ...prev, vmessSecurity: val }))}
                          options={VMESS_SECURITY_OPTIONS}
                          accentColor="blue"
                        />
                      </div>
                    )}

                    {/* --- Security Settings Cards (REALITY & TLS) --- */}
                    {outboundModal.security === 'reality' && (
                      <div className="p-3 bg-slate-950/60 border border-white/10 rounded-xl space-y-3">
                        <div className="text-xs font-bold text-blue-400">REALITY 安全配置</div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">伪装域名 SNI</label>
                            <input
                              type="text"
                              placeholder="如: www.amd.com"
                              value={outboundModal.realityServerName}
                              onChange={(e) => setOutboundModal((prev) => ({ ...prev, realityServerName: e.target.value }))}
                              className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">伪装公钥 Public Key</label>
                            <input
                              type="text"
                              placeholder="REALITY 椭圆曲线公钥 Base64"
                              value={outboundModal.realityPublicKey}
                              onChange={(e) => setOutboundModal((prev) => ({ ...prev, realityPublicKey: e.target.value }))}
                              className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">Short ID</label>
                            <input
                              type="text"
                              placeholder="如: de"
                              value={outboundModal.realityShortId}
                              onChange={(e) => setOutboundModal((prev) => ({ ...prev, realityShortId: e.target.value }))}
                              className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">TLS 指纹 Fingerprint</label>
                            <CustomSelect
                              value={outboundModal.realityFingerprint}
                              onChange={(val) => setOutboundModal((prev) => ({ ...prev, realityFingerprint: val }))}
                              options={TLS_FINGERPRINT_OPTIONS}
                              accentColor="blue"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">爬虫路径 SpiderX</label>
                            <input
                              type="text"
                              placeholder="/"
                              value={outboundModal.realitySpiderX}
                              onChange={(e) => setOutboundModal((prev) => ({ ...prev, realitySpiderX: e.target.value }))}
                              className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <label className="text-xs font-semibold text-slate-300">显示调试日志</label>
                          <input
                            type="checkbox"
                            checked={outboundModal.realityShow}
                            onChange={(e) => setOutboundModal((prev) => ({ ...prev, realityShow: e.target.checked }))}
                            className="w-4 h-4 rounded border-white/10 bg-slate-950 text-blue-500 focus:ring-0 cursor-pointer"
                          />
                        </div>
                      </div>
                    )}

                    {outboundModal.security === 'tls' && (
                      <div className="p-3 bg-slate-950/60 border border-white/10 rounded-xl space-y-3">
                        <div className="text-xs font-bold text-blue-400">TLS 安全配置</div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">伪装域名 SNI</label>
                            <input
                              type="text"
                              placeholder="如: example.com"
                              value={outboundModal.tlsServerName}
                              onChange={(e) => setOutboundModal((prev) => ({ ...prev, tlsServerName: e.target.value }))}
                              className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">TLS 指纹 Fingerprint</label>
                            <CustomSelect
                              value={outboundModal.tlsFingerprint}
                              onChange={(val) => setOutboundModal((prev) => ({ ...prev, tlsFingerprint: val }))}
                              options={TLS_FINGERPRINT_OPTIONS}
                              accentColor="blue"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">ALPN (逗号分隔)</label>
                            <input
                              type="text"
                              placeholder="如: h2,http/1.1"
                              value={outboundModal.tlsAlpn}
                              onChange={(e) => setOutboundModal((prev) => ({ ...prev, tlsAlpn: e.target.value }))}
                              className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div className="flex items-center justify-between pt-5">
                            <label className="text-xs font-semibold text-slate-300">允许不安全证书</label>
                            <input
                              type="checkbox"
                              checked={outboundModal.tlsAllowInsecure}
                              onChange={(e) => setOutboundModal((prev) => ({ ...prev, tlsAllowInsecure: e.target.checked }))}
                              className="w-4 h-4 rounded border-white/10 bg-slate-950 text-blue-500 focus:ring-0 cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* --- Transport Network Settings Cards (WS, gRPC, HTTP/2) --- */}
                    {outboundModal.network === 'ws' && (
                      <div className="p-3 bg-slate-950/60 border border-white/10 rounded-xl space-y-3">
                        <div className="text-xs font-bold text-blue-400">WebSocket 传输配置</div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">路径 Path</label>
                            <input
                              type="text"
                              placeholder="如: /ws"
                              value={outboundModal.wsPath}
                              onChange={(e) => setOutboundModal((prev) => ({ ...prev, wsPath: e.target.value }))}
                              className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">Host 标头</label>
                            <input
                              type="text"
                              placeholder="如: example.com"
                              value={outboundModal.wsHost}
                              onChange={(e) => setOutboundModal((prev) => ({ ...prev, wsHost: e.target.value }))}
                              className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {outboundModal.network === 'grpc' && (
                      <div className="p-3 bg-slate-950/60 border border-white/10 rounded-xl space-y-3">
                        <div className="text-xs font-bold text-blue-400">gRPC 传输配置</div>
                        <div className="grid grid-cols-2 gap-3 items-center">
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">服务名称 Service Name</label>
                            <input
                              type="text"
                              placeholder="如: TunGunService"
                              value={outboundModal.grpcServiceName}
                              onChange={(e) => setOutboundModal((prev) => ({ ...prev, grpcServiceName: e.target.value }))}
                              className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div className="flex items-center justify-between pt-5">
                            <label className="text-xs font-semibold text-slate-300">多路复用</label>
                            <input
                              type="checkbox"
                              checked={outboundModal.grpcMultiMode}
                              onChange={(e) => setOutboundModal((prev) => ({ ...prev, grpcMultiMode: e.target.checked }))}
                              className="w-4 h-4 rounded border-white/10 bg-slate-950 text-blue-500 focus:ring-0 cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {(outboundModal.network === 'h2' || outboundModal.network === 'http') && (
                      <div className="p-3 bg-slate-950/60 border border-white/10 rounded-xl space-y-3">
                        <div className="text-xs font-bold text-blue-400">HTTP/2 传输配置</div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">Host 标头 (逗号分隔)</label>
                            <input
                              type="text"
                              placeholder="如: example.com"
                              value={outboundModal.httpHost}
                              onChange={(e) => setOutboundModal((prev) => ({ ...prev, httpHost: e.target.value }))}
                              className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">路径 Path</label>
                            <input
                              type="text"
                              placeholder="如: /"
                              value={outboundModal.httpPath}
                              onChange={(e) => setOutboundModal((prev) => ({ ...prev, httpPath: e.target.value }))}
                              className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="flex-1 min-h-0 py-3 flex flex-col space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-400 shrink-0">
                  <span>编辑局部出站 JSON 配置对象 (符合 Xray 官方规范)</span>
                  <span className="font-mono text-[10px] text-slate-500">JSON Object</span>
                </div>
                <div className={`w-full rounded-xl border border-white/10 overflow-hidden bg-[#1e1e1e] ${
                  outboundModal.isMaximized ? 'flex-1 min-h-[300px]' : 'h-[360px] shrink-0'
                }`}>
                  <Editor
                    height="100%"
                    defaultLanguage="json"
                    language="json"
                    theme="vs-dark"
                    value={outboundModal.rawJsonText}
                    onChange={(val) =>
                      setOutboundModal((prev) => ({ ...prev, rawJsonText: val || '', jsonError: null }))
                    }
                    options={{
                      fontSize: 12,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                      formatOnPaste: true,
                      formatOnType: true,
                      padding: { top: 8, bottom: 8 },
                      lineNumbersMinChars: 3,
                      folding: true,
                      mouseWheelZoom: true,
                    }}
                  />
                </div>
                {outboundModal.jsonError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 font-mono shrink-0 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{outboundModal.jsonError}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10 shrink-0">
              <button
                onClick={() => setOutboundModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleSaveOutbound}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all"
              >
                保存设置
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Add Routing Rule Modal */}
      {ruleModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-900/80">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  {ruleModal.index !== null ? `编辑分流规则 - ${ruleModal.description || '策略规则'}` : '新建高级分流路由规则'}
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Mode Switcher */}
                <div className="flex items-center p-1 bg-slate-950/80 rounded-xl border border-white/10 text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSwitchRuleMode('visual')}
                    title="可视化结构"
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap ${
                      ruleModal.mode === 'visual'
                        ? 'bg-emerald-600 text-white shadow-md font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline whitespace-nowrap">可视化</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchRuleMode('json')}
                    title="JSON 源码"
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap ${
                      ruleModal.mode === 'json'
                        ? 'bg-emerald-600 text-white shadow-md font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline whitespace-nowrap">JSON</span>
                  </button>
                </div>
                <button
                  onClick={() => setRuleModal((prev) => ({ ...prev, isOpen: false }))}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {ruleModal.mode === 'visual' ? (
              /* Visual Mode Content */
              <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
                {/* Description & Target Outbound */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-semibold flex items-center gap-1">
                      规则描述名称 <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={ruleModal.description}
                      onChange={(e) => setRuleModal((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="例如: OpenAI & ChatGPT 流量规则"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-semibold text-xs sm:text-sm">指向出站目标 (代理组或特定节点)</label>
                    <OutboundSelect
                      value={ruleModal.outboundTag}
                      onChange={(val) => setRuleModal((prev) => ({ ...prev, outboundTag: val }))}
                      proxyGroups={proxyGroups}
                      allNodes={allProxyNodes}
                      size="md"
                      fullWidth
                    />
                  </div>
                </div>

                {/* Condition Type Tabs */}
                <div className="space-y-3 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-semibold">规则匹配类型条件配置</label>
                    <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-white/10 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setRuleModal((prev) => ({ ...prev, activeTab: 'domain' }))}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          ruleModal.activeTab === 'domain' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        域名 / GeoSite
                      </button>
                      <button
                        type="button"
                        onClick={() => setRuleModal((prev) => ({ ...prev, activeTab: 'ip' }))}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          ruleModal.activeTab === 'ip' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        IP / GeoIP
                      </button>
                      <button
                        type="button"
                        onClick={() => setRuleModal((prev) => ({ ...prev, activeTab: 'port' }))}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          ruleModal.activeTab === 'port' ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        端口
                      </button>
                      <button
                        type="button"
                        onClick={() => setRuleModal((prev) => ({ ...prev, activeTab: 'protocol' }))}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          ruleModal.activeTab === 'protocol' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        协议
                      </button>
                    </div>
                  </div>

                  {/* TAB 1: DOMAIN & GEOSITE */}
                  {ruleModal.activeTab === 'domain' && (
                    <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300 font-semibold">域名与 GeoSite 清单 (一行一条规则)</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-500 mr-1">一键插入前缀:</span>
                          <button type="button" onClick={() => insertDomainPrefix('domain:')} className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 text-[10px] font-mono">domain:</button>
                          <button type="button" onClick={() => insertDomainPrefix('full:')} className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 text-[10px] font-mono">full:</button>
                          <button type="button" onClick={() => insertDomainPrefix('keyword:')} className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-mono">keyword:</button>
                          <button type="button" onClick={() => insertDomainPrefix('regexp:')} className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 text-[10px] font-mono">regexp:</button>
                          <button type="button" onClick={() => insertDomainPrefix('geosite:')} className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[10px] font-mono font-bold">geosite:</button>
                        </div>
                      </div>
                      <textarea
                        rows={5}
                        value={ruleModal.domain}
                        onChange={(e) => setRuleModal((prev) => ({ ...prev, domain: e.target.value }))}
                        placeholder={`domain:openai.com\nfull:chatgpt.com\ngeosite:openai\nkeyword:telegram`}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sky-200 font-mono placeholder-slate-600 focus:outline-none focus:border-blue-500 text-xs leading-relaxed"
                      />
                      <p className="text-[10px] text-slate-400">
                        前缀说明: <code className="text-sky-300">domain:</code> 匹配包含所有子域名; <code className="text-blue-300">full:</code> 精准匹配完整域名; <code className="text-emerald-300">geosite:</code> Geo 数据库分类库。
                      </p>
                    </div>
                  )}

                  {/* TAB 2: IP & GEOIP */}
                  {ruleModal.activeTab === 'ip' && (
                    <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300 font-semibold">IP 地址与 GeoIP 清单 (一行一条)</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setRuleModal((prev) => ({ ...prev, ip: prev.ip ? `${prev.ip}\ngeoip:cn` : 'geoip:cn' }))}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-mono font-bold"
                          >
                            + geoip:cn
                          </button>
                          <button
                            type="button"
                            onClick={() => setRuleModal((prev) => ({ ...prev, ip: prev.ip ? `${prev.ip}\ngeoip:private` : 'geoip:private' }))}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[10px] font-mono font-bold"
                          >
                            + geoip:private
                          </button>
                        </div>
                      </div>
                      <textarea
                        rows={5}
                        value={ruleModal.ip}
                        onChange={(e) => setRuleModal((prev) => ({ ...prev, ip: e.target.value }))}
                        placeholder={`geoip:cn\ngeoip:private\n1.1.1.1/32\n192.168.0.0/16`}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-cyan-200 font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500 text-xs leading-relaxed"
                      />
                      <p className="text-[10px] text-slate-400">
                        支持 CIDR 网段（如 <code className="text-cyan-300">192.168.1.0/24</code>）或 GeoIP 数据库库名称（如 <code className="text-cyan-300">geoip:cn</code>）。
                      </p>
                    </div>
                  )}

                  {/* TAB 3: PORT */}
                  {ruleModal.activeTab === 'port' && (
                    <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-white/10">
                      <span className="text-slate-300 font-semibold block">目标端口或端口范围</span>
                      <input
                        type="text"
                        value={ruleModal.port}
                        onChange={(e) => setRuleModal((prev) => ({ ...prev, port: e.target.value }))}
                        placeholder="例如: 80, 443 或 8000-9000"
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-amber-200 font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500 text-xs"
                      />
                      <p className="text-[10px] text-slate-400">
                        可用英文逗号分隔多个端口（如 <code className="text-amber-300">80, 443, 8080</code>）或使用连字符指定范围（如 <code className="text-amber-300">1000-2000</code>）。
                      </p>
                    </div>
                  )}

                  {/* TAB 4: PROTOCOL */}
                  {ruleModal.activeTab === 'protocol' && (
                    <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-white/10">
                      <span className="text-slate-300 font-semibold block">网络协议</span>
                      <input
                        type="text"
                        value={ruleModal.protocol}
                        onChange={(e) => setRuleModal((prev) => ({ ...prev, protocol: e.target.value }))}
                        placeholder="例如: http, tls, bittorrent"
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-purple-200 font-mono placeholder-slate-600 focus:outline-none focus:border-purple-500 text-xs"
                      />
                      <p className="text-[10px] text-slate-400">
                        基于 Xray 的 Traffic Sniffing 功能识别流量协议。
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* JSON Mode Content */
              <div className="flex-1 min-h-0 py-3 px-6 flex flex-col space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-400 shrink-0">
                  <span>编辑局部路由规则 JSON 对象 (符合 Xray 官方规范)</span>
                  <span className="font-mono text-[10px] text-slate-500">JSON Object</span>
                </div>
                <div className="w-full rounded-xl border border-white/10 overflow-hidden bg-[#1e1e1e] h-[300px] shrink-0">
                  <Editor
                    height="100%"
                    defaultLanguage="json"
                    language="json"
                    theme="vs-dark"
                    value={ruleModal.rawJsonText}
                    onChange={(val) =>
                      setRuleModal((prev) => ({ ...prev, rawJsonText: val || '', jsonError: null }))
                    }
                    options={{
                      fontSize: 12,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                      formatOnPaste: true,
                      formatOnType: true,
                      padding: { top: 8, bottom: 8 },
                      lineNumbersMinChars: 3,
                      folding: true,
                      mouseWheelZoom: true,
                    }}
                  />
                </div>
                {ruleModal.jsonError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 font-mono shrink-0 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{ruleModal.jsonError}</span>
                  </div>
                )}
              </div>
            )}

            {/* Footer Buttons */}
            <div className="px-6 py-4 border-t border-white/10 bg-slate-900/80 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRuleModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-all cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveRule}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                保存路由规则
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Add DNS Modal */}
      {dnsModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className={`w-full glass-card bg-slate-900 border border-white/15 rounded-2xl p-6 shadow-2xl transition-all duration-300 flex flex-col ${
            dnsModal.isMaximized ? 'max-w-4xl h-[75vh]' : 'max-w-md max-h-[90vh]'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-white/10 gap-2 shrink-0">
              <h3 className="text-base font-bold text-white flex items-center gap-2 truncate min-w-0">
                <Globe className="w-5 h-5 text-purple-400 shrink-0" />
                <span className="truncate">{dnsModal.index !== null ? '编辑 DNS 服务器' : '新增 DNS 服务器'}</span>
              </h3>
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Mode Switcher */}
                <div className="flex items-center p-1 bg-slate-950/80 rounded-xl border border-white/10 text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSwitchDnsMode('visual')}
                    title="可视化结构"
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap ${
                      dnsModal.mode === 'visual'
                        ? 'bg-purple-600 text-white shadow-md font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline whitespace-nowrap">可视化结构</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchDnsMode('json')}
                    title="JSON 源码"
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap ${
                      dnsModal.mode === 'json'
                        ? 'bg-purple-600 text-white shadow-md font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline whitespace-nowrap">JSON 源码</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setDnsModal((prev) => ({ ...prev, isMaximized: !prev.isMaximized }))}
                  title={dnsModal.isMaximized ? '还原窗口大小' : '最大化 / 放大窗口'}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  {dnsModal.isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setDnsModal((prev) => ({ ...prev, isOpen: false }))}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {dnsModal.mode === 'visual' ? (
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar py-3 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">DNS 服务器地址 / DoH URL</label>
                  <input
                    type="text"
                    placeholder="例如: 1.1.1.1, 8.8.8.8 或 https://dns.google/dns-query"
                    value={dnsModal.server}
                    onChange={(e) => setDnsModal((prev) => ({ ...prev, server: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 min-h-0 py-3 flex flex-col space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-400 shrink-0">
                  <span>编辑局部 DNS 服务器配置 (字符串地址或对象描述符)</span>
                  <span className="font-mono text-[10px] text-slate-500">JSON Value</span>
                </div>
                <div className={`w-full rounded-xl border border-white/10 overflow-hidden bg-[#1e1e1e] ${
                  dnsModal.isMaximized ? 'flex-1 min-h-[200px]' : 'h-[250px] shrink-0'
                }`}>
                  <Editor
                    height="100%"
                    defaultLanguage="json"
                    language="json"
                    theme="vs-dark"
                    value={dnsModal.rawJsonText}
                    onChange={(val) =>
                      setDnsModal((prev) => ({ ...prev, rawJsonText: val || '', jsonError: null }))
                    }
                    options={{
                      fontSize: 12,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                      formatOnPaste: true,
                      formatOnType: true,
                      padding: { top: 8, bottom: 8 },
                      lineNumbersMinChars: 3,
                      folding: true,
                      mouseWheelZoom: true,
                    }}
                  />
                </div>
                {dnsModal.jsonError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 font-mono shrink-0 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{dnsModal.jsonError}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10 shrink-0">
              <button
                onClick={() => setDnsModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleSaveDns}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all"
              >
                保存 DNS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Add Observatory Modal */}
      {observatoryModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div
            className={`w-full glass-card bg-slate-900 border border-white/15 rounded-2xl p-6 shadow-2xl transition-all duration-300 flex flex-col ${
              observatoryModal.isMaximized ? 'max-w-4xl h-[85vh]' : 'max-w-xl max-h-[90vh]'
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 gap-2 shrink-0">
              <h3 className="text-base font-bold text-white flex items-center gap-2 truncate min-w-0">
                <Activity className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="truncate">配置连通性观测</span>
              </h3>
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Mode Switcher */}
                <div className="flex items-center p-1 bg-slate-950/80 rounded-xl border border-white/10 text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSwitchObservatoryMode('visual')}
                    title="可视化结构"
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap ${
                      observatoryModal.mode === 'visual'
                        ? 'bg-emerald-600 text-white shadow-md font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline whitespace-nowrap">可视化结构</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchObservatoryMode('json')}
                    title="JSON 源码"
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap ${
                      observatoryModal.mode === 'json'
                        ? 'bg-emerald-600 text-white shadow-md font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline whitespace-nowrap">JSON 源码</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setObservatoryModal((prev) => ({ ...prev, isMaximized: !prev.isMaximized }))}
                  title={observatoryModal.isMaximized ? '还原窗口大小' : '最大化 / 放大窗口'}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  {observatoryModal.isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setObservatoryModal((prev) => ({ ...prev, isOpen: false }))}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            {observatoryModal.mode === 'visual' ? (
              <div className="py-4 space-y-4 overflow-y-auto flex-1 text-xs">
                {/* 1. Observation Type Switch */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    观测服务模式类型
                  </label>
                  <CustomSelect
                    value={observatoryModal.type}
                    onChange={(val) => setObservatoryModal((prev) => ({ ...prev, type: val as any }))}
                    options={OBSERVATORY_TYPE_OPTIONS}
                    accentColor="emerald"
                    size="md"
                    fullWidth
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    遵循 Xray 官方规范：<code className="text-emerald-300">observatory</code> 为固定周期探测；<code className="text-amber-300">burstObservatory</code> 为突发打散随机探测。
                  </p>
                </div>

                {observatoryModal.type !== 'disabled' && (
                  <>
                    {/* 2. Subject Selector Tag Manager */}
                    <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-white/10">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-200">
                          匹配出站代理 Tag 标签前缀
                        </label>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-500">一键添加前缀:</span>
                          <button
                            type="button"
                            onClick={() => handleAddSubjectSelector('outbound')}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[10px] font-mono font-bold"
                          >
                            + outbound
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddSubjectSelector('proxy')}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-mono font-bold"
                          >
                            + proxy
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddSubjectSelector('node')}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 text-[10px] font-mono font-bold"
                          >
                            + node
                          </button>
                        </div>
                      </div>

                      {/* Tag Input Form */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleAddSubjectSelector(observatoryModal.subjectInput);
                        }}
                        className="flex gap-2"
                      >
                        <input
                          type="text"
                          value={observatoryModal.subjectInput}
                          onChange={(e) => setObservatoryModal((prev) => ({ ...prev, subjectInput: e.target.value }))}
                          placeholder="例如: proxy 或 outbound- (输入匹配前缀)"
                          className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all"
                        >
                          添加前缀
                        </button>
                      </form>

                      {/* Added Tags Pills */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {observatoryModal.subjectSelector.map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[11px]"
                          >
                            <span>{tag}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSubjectSelector(idx)}
                              className="text-slate-400 hover:text-rose-400 transition-colors"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                        {observatoryModal.subjectSelector.length === 0 && (
                          <span className="text-[11px] text-amber-400">请至少添加一个匹配前缀 Tag</span>
                        )}
                      </div>
                    </div>

                    {/* 3. Fields for Standard Observatory */}
                    {observatoryModal.type === 'observatory' && (
                      <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-white/10">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-200">
                              连通性探测目标 URL
                            </label>
                            <span className="text-[10px] text-slate-400">快捷选择预设:</span>
                          </div>
                          <div className="space-y-1.5">
                            <CustomSelect
                              value={PROBE_URL_PRESET_OPTIONS.some((o) => o.value === observatoryModal.probeUrl) ? observatoryModal.probeUrl : 'custom'}
                              onChange={(val) => {
                                if (val !== 'custom') {
                                  setObservatoryModal((prev) => ({ ...prev, probeUrl: val }));
                                }
                              }}
                              options={PROBE_URL_PRESET_OPTIONS}
                              accentColor="emerald"
                              size="sm"
                              fullWidth
                            />
                            <input
                              type="text"
                              value={observatoryModal.probeUrl}
                              onChange={(e) => setObservatoryModal((prev) => ({ ...prev, probeUrl: e.target.value }))}
                              placeholder="https://www.google.com/generate_204"
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                              探测周期间隔
                            </label>
                            <input
                              type="text"
                              value={observatoryModal.probeInterval}
                              onChange={(e) => setObservatoryModal((prev) => ({ ...prev, probeInterval: e.target.value }))}
                              placeholder="10s"
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                            />
                            <span className="text-[10px] text-slate-500">格式如: 10s, 30s, 1m</span>
                          </div>

                          <div className="flex flex-col justify-end">
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                              并发探测
                            </label>
                            <button
                              type="button"
                              onClick={() => setObservatoryModal((prev) => ({ ...prev, enableConcurrency: !prev.enableConcurrency }))}
                              className={`w-full py-1.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                                observatoryModal.enableConcurrency
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-slate-950 text-slate-400 border-white/10 hover:border-white/20'
                              }`}
                            >
                              <span>{observatoryModal.enableConcurrency ? '并发发起探测' : '顺序单线程探测'}</span>
                              <span className={`w-3.5 h-3.5 rounded-full ${observatoryModal.enableConcurrency ? 'bg-emerald-400 shadow-sm shadow-emerald-500/50' : 'bg-slate-700'}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 4. Fields for Burst Observatory */}
                    {observatoryModal.type === 'burstObservatory' && (
                      <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-white/10">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-200">
                              探测目标 URL
                            </label>
                            <span className="text-[10px] text-slate-400">快捷选择预设:</span>
                          </div>
                          <div className="space-y-1.5">
                            <CustomSelect
                              value={PROBE_URL_PRESET_OPTIONS.some((o) => o.value === observatoryModal.destination) ? observatoryModal.destination : 'custom'}
                              onChange={(val) => {
                                if (val !== 'custom') {
                                  setObservatoryModal((prev) => ({ ...prev, destination: val }));
                                }
                              }}
                              options={PROBE_URL_PRESET_OPTIONS}
                              accentColor="amber"
                              size="sm"
                              fullWidth
                            />
                            <input
                              type="text"
                              value={observatoryModal.destination}
                              onChange={(e) => setObservatoryModal((prev) => ({ ...prev, destination: e.target.value }))}
                              placeholder="https://connectivitycheck.gstatic.com/generate_204"
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                              打散采样周期
                            </label>
                            <input
                              type="text"
                              value={observatoryModal.interval}
                              onChange={(e) => setObservatoryModal((prev) => ({ ...prev, interval: e.target.value }))}
                              placeholder="1m"
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                              采样次数
                            </label>
                            <input
                              type="number"
                              value={observatoryModal.sampling}
                              onChange={(e) => setObservatoryModal((prev) => ({ ...prev, sampling: e.target.value }))}
                              placeholder="10"
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                              超时时间
                            </label>
                            <input
                              type="text"
                              value={observatoryModal.timeout}
                              onChange={(e) => setObservatoryModal((prev) => ({ ...prev, timeout: e.target.value }))}
                              placeholder="5s"
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              /* Modal Body (JSON Mode) */
              <div className="flex-1 min-h-0 py-3 flex flex-col space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 shrink-0">
                  <span>编辑连通性观测 JSON 规范片段</span>
                  <span className="font-mono text-[10px] text-slate-500">JSON Object</span>
                </div>
                <div className="w-full rounded-xl border border-white/10 overflow-hidden bg-[#1e1e1e] h-[300px] shrink-0">
                  <Editor
                    height="100%"
                    defaultLanguage="json"
                    language="json"
                    theme="vs-dark"
                    value={observatoryModal.rawJsonText}
                    onChange={(val) =>
                      setObservatoryModal((prev) => ({ ...prev, rawJsonText: val || '', jsonError: null }))
                    }
                    options={{
                      fontSize: 12,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                      formatOnPaste: true,
                      formatOnType: true,
                      padding: { top: 8, bottom: 8 },
                      lineNumbersMinChars: 3,
                      folding: true,
                      mouseWheelZoom: true,
                    }}
                  />
                </div>
                {observatoryModal.jsonError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 font-mono shrink-0 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{observatoryModal.jsonError}</span>
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setObservatoryModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveObservatory}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                保存连通性观测配置
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Config Profile Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingProfile}
        title="删除配置文件"
        message={
          <span>
            确定要删除配置文件 <strong className="text-rose-400 font-semibold">"{deletingProfile?.name}"</strong> 吗？删除后此配置无法恢复。
          </span>
        }
        confirmText="确认删除"
        onConfirm={() => {
          if (deletingProfile) {
            deleteProfile(deletingProfile.id);
            setDeletingProfile(null);
          }
        }}
        onCancel={() => setDeletingProfile(null)}
      />
    </div>
  );
};
