import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { CustomSelect } from './CustomSelect';
import { ToggleSwitch } from './ToggleSwitch';

// ── Option constants ──
const METHOD_OPTIONS = [
  { value: 'raw', label: 'RAW 底层 TCP/UDP' },
  { value: 'xhttp', label: 'XHTTP 多模式传输' },
  { value: 'mkcp', label: 'mKCP UDP 模拟 TCP' },
  { value: 'grpc', label: 'gRPC HTTP/2 复用' },
  { value: 'websocket', label: 'WebSocket 伪装传输' },
  { value: 'httpupgrade', label: 'HTTPUpgrade 轻量升级' },
  { value: 'hysteria', label: 'Hysteria2 QUIC 传输' },
];

const SECURITY_OPTIONS = [
  { value: 'none', label: 'none 明文无加密' },
  { value: 'tls', label: 'TLS 标准 TLS 1.3' },
  { value: 'reality', label: 'REALITY 去特征安全传输' },
];

// REALITY only supports raw, xhttp, grpc
const REALITY_COMPATIBLE_METHODS = ['raw', 'xhttp', 'grpc'];

const FINGERPRINT_OPTIONS = [
  { value: 'chrome', label: 'chrome' },
  { value: 'firefox', label: 'firefox' },
  { value: 'safari', label: 'safari' },
  { value: 'ios', label: 'ios' },
  { value: 'android', label: 'android' },
  { value: 'edge', label: 'edge' },
  { value: '360', label: '360' },
  { value: 'qq', label: 'qq' },
  { value: 'random', label: 'random 随机浏览器' },
  { value: 'randomized', label: 'randomized 完全随机' },
];

const ALPN_OPTIONS = [
  { value: 'h2,http/1.1', label: 'h2, http/1.1 默认' },
  { value: 'h2', label: 'h2 HTTP/2' },
  { value: 'http/1.1', label: 'http/1.1' },
];

const XHTTP_MODE_OPTIONS = [
  { value: 'auto', label: 'auto 自动选择' },
  { value: 'packet-up', label: 'packet-up 数据包上行' },
  { value: 'stream-up', label: 'stream-up 流式上行' },
  { value: 'stream-one', label: 'stream-one 单流模式' },
];

const RAW_HEADER_OPTIONS = [
  { value: 'none', label: 'none 无伪装' },
  { value: 'http', label: 'http HTTP 伪装' },
];

const TPROXY_OPTIONS = [
  { value: 'off', label: 'off 关闭' },
  { value: 'redirect', label: 'redirect 重定向模式' },
  { value: 'tproxy', label: 'tproxy TProxy 模式' },
];

const DOMAIN_STRATEGY_OPTIONS = [
  { value: 'AsIs', label: 'AsIs 直接使用' },
  { value: 'UseIP', label: 'UseIP 解析 IP' },
  { value: 'UseIPv4', label: 'UseIPv4 仅 IPv4' },
  { value: 'UseIPv6', label: 'UseIPv6 仅 IPv6' },
  { value: 'UseIPv4v6', label: 'UseIPv4v6 IPv4 优先' },
  { value: 'UseIPv6v4', label: 'UseIPv6v4 IPv6 优先' },
  { value: 'ForceIP', label: 'ForceIP 强制解析' },
  { value: 'ForceIPv4', label: 'ForceIPv4 强制 IPv4' },
  { value: 'ForceIPv6', label: 'ForceIPv6 强制 IPv6' },
  { value: 'ForceIPv4v6', label: 'ForceIPv4v6 强制 IPv4 优先' },
  { value: 'ForceIPv6v4', label: 'ForceIPv6v4 强制 IPv6 优先' },
];

const ADDRESS_PORT_STRATEGY_OPTIONS = [
  { value: '', label: 'none 关闭' },
  { value: 'SrvPortOnly', label: 'SrvPortOnly SRV 端口' },
  { value: 'SrvAddressOnly', label: 'SrvAddressOnly SRV 地址' },
  { value: 'SrvPortAndAddress', label: 'SrvPortAndAddress SRV 全部' },
  { value: 'TxtPortOnly', label: 'TxtPortOnly TXT 端口' },
  { value: 'TxtAddressOnly', label: 'TxtAddressOnly TXT 地址' },
  { value: 'TxtPortAndAddress', label: 'TxtPortAndAddress TXT 全部' },
];

const TCP_CONGESTION_OPTIONS = [
  { value: '', label: '系统默认' },
  { value: 'bbr', label: 'bbr 推荐' },
  { value: 'cubic', label: 'cubic' },
  { value: 'reno', label: 'reno' },
];

const QUIC_CONGESTION_OPTIONS = [
  { value: 'bbr', label: 'BBR' },
  { value: 'brutal', label: 'Brutal 协商速率' },
  { value: 'force-brutal', label: 'Force-Brutal 强制速率' },
  { value: 'reno', label: 'Reno' },
];

const BBR_PROFILE_OPTIONS = [
  { value: 'standard', label: 'standard 标准' },
  { value: 'conservative', label: 'conservative 保守' },
  { value: 'aggressive', label: 'aggressive 激进' },
];

const MKCP_HEADER_OPTIONS = [
  { value: '', label: '无 加密伪装' },
  { value: 'dns', label: 'DNS 查询伪装' },
  { value: 'dtls', label: 'DTLS 1.2 伪装' },
  { value: 'srtp', label: 'SRTP 伪装' },
  { value: 'utp', label: 'uTP BitTorrent 伪装' },
  { value: 'wechat', label: '微信视频通话伪装' },
  { value: 'wireguard', label: 'WireGuard 伪装' },
];

// ── Styles ──
const inputSmall = 'w-full px-2.5 py-1.5 bg-slate-950/60 border border-white/10 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 font-mono';
const labelCls = 'block text-[11px] font-medium text-slate-400 mb-1';
const subPanelCls = 'p-3 bg-slate-950/40 border border-white/5 rounded-xl space-y-3';

// ── Collapsible section ──
const CollapsibleSection: React.FC<{
  title: string;
  titleColor?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, titleColor = 'text-blue-300', defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={subPanelCls}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 w-full text-left"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
        <span className={`text-xs font-semibold ${titleColor}`}>{title}</span>
      </button>
      {open && <div className="space-y-3 pt-1">{children}</div>}
    </div>
  );
};

// ── Props ──
interface StreamSettingsPanelProps {
  initialValue?: any;
  isInbound?: boolean;
  onChange: (streamSettings: any) => void;
}

export const StreamSettingsPanel: React.FC<StreamSettingsPanelProps> = ({
  initialValue,
  isInbound = false,
  onChange,
}) => {
  // Core
  const [method, setMethod] = useState('raw');
  const [security, setSecurity] = useState('none');

  // RAW settings
  const [rawAcceptProxy, setRawAcceptProxy] = useState(false);
  const [rawHeaderType, setRawHeaderType] = useState('none');

  // XHTTP settings
  const [xhttpMode, setXhttpMode] = useState('auto');
  const [xhttpPath, setXhttpPath] = useState('/');
  const [xhttpHost, setXhttpHost] = useState('');
  const [xhttpNoSSEHeader, setXhttpNoSSEHeader] = useState(false);
  const [xhttpExtra, setXhttpExtra] = useState('');

  // mKCP settings
  const [kcpMtu, setKcpMtu] = useState(1350);
  const [kcpTti, setKcpTti] = useState(50);
  const [kcpUplink, setKcpUplink] = useState(5);
  const [kcpDownlink, setKcpDownlink] = useState(20);
  const [kcpCongestion, setKcpCongestion] = useState(false);
  const [kcpReadBuf, setKcpReadBuf] = useState(2);
  const [kcpWriteBuf, setKcpWriteBuf] = useState(2);

  // mKCP FinalMask legacy
  const [kcpMaskHeader, setKcpMaskHeader] = useState('');
  const [kcpMaskValue, setKcpMaskValue] = useState('');

  // gRPC settings
  const [grpcAuthority, setGrpcAuthority] = useState('');
  const [grpcServiceName, setGrpcServiceName] = useState('');
  const [grpcMultiMode, setGrpcMultiMode] = useState(false);
  const [grpcUserAgent, setGrpcUserAgent] = useState('');
  const [grpcIdleTimeout, setGrpcIdleTimeout] = useState(0);
  const [grpcHealthTimeout, setGrpcHealthTimeout] = useState(20);
  const [grpcPermitWithoutStream, setGrpcPermitWithoutStream] = useState(false);
  const [grpcInitialWindowsSize, setGrpcInitialWindowsSize] = useState(0);

  // WebSocket settings
  const [wsAcceptProxy, setWsAcceptProxy] = useState(false);
  const [wsPath, setWsPath] = useState('/');
  const [wsHost, setWsHost] = useState('');
  const [wsHeaders, setWsHeaders] = useState<{ key: string; value: string }[]>([]);
  const [wsHeartbeat, setWsHeartbeat] = useState(0);

  // HTTPUpgrade settings
  const [hupAcceptProxy, setHupAcceptProxy] = useState(false);
  const [hupPath, setHupPath] = useState('/');
  const [hupHost, setHupHost] = useState('');
  const [hupHeaders, setHupHeaders] = useState<{ key: string; value: string }[]>([]);

  // REALITY settings (outbound/client)
  const [realityServerName, setRealityServerName] = useState('');
  const [realityFingerprint, setRealityFingerprint] = useState('chrome');
  const [realityPassword, setRealityPassword] = useState('');
  const [realityShortId, setRealityShortId] = useState('');
  const [realitySpiderX, setRealitySpiderX] = useState('/');
  const [realityMldsa65Verify, setRealityMldsa65Verify] = useState('');

  // REALITY settings (inbound/server)
  const [realityShow, setRealityShow] = useState(false);
  const [realityTarget, setRealityTarget] = useState('');
  const [realityServerNames, setRealityServerNames] = useState('');
  const [realityPrivateKey, setRealityPrivateKey] = useState('');
  const [realityShortIds, setRealityShortIds] = useState('');

  // TLS settings
  const [tlsServerName, setTlsServerName] = useState('');
  const [tlsAllowInsecure, setTlsAllowInsecure] = useState(false);
  const [tlsFingerprint, setTlsFingerprint] = useState('chrome');
  const [tlsAlpn, setTlsAlpn] = useState('h2,http/1.1');
  const [tlsDisableSystemRoot, setTlsDisableSystemRoot] = useState(false);
  const [tlsEnableSessionResumption, setTlsEnableSessionResumption] = useState(false);
  const [tlsPinnedCert, setTlsPinnedCert] = useState('');
  const [tlsCertFile, setTlsCertFile] = useState('');
  const [tlsKeyFile, setTlsKeyFile] = useState('');

  // FinalMask - QUIC params
  const [quicCongestion, setQuicCongestion] = useState('bbr');
  const [quicBbrProfile, setQuicBbrProfile] = useState('standard');
  const [quicBrutalUp, setQuicBrutalUp] = useState('');
  const [quicBrutalDown, setQuicBrutalDown] = useState('');
  const [quicUdpHopPorts, setQuicUdpHopPorts] = useState('');
  const [quicUdpHopInterval, setQuicUdpHopInterval] = useState(30);
  const [quicMaxIdleTimeout, setQuicMaxIdleTimeout] = useState(30);
  const [quicKeepAlive, setQuicKeepAlive] = useState(0);

  // Sockopt
  const [sockoptMark, setSockoptMark] = useState(0);
  const [sockoptTfo, setSockoptTfo] = useState(false);
  const [sockoptTproxy, setSockoptTproxy] = useState('off');
  const [sockoptDomainStrategy, setSockoptDomainStrategy] = useState('AsIs');
  const [sockoptDialerProxy, setSockoptDialerProxy] = useState('');
  const [sockoptInterface, setSockoptInterface] = useState('');
  const [sockoptTcpCongestion, setSockoptTcpCongestion] = useState('');
  const [sockoptTcpKeepAliveIdle, setSockoptTcpKeepAliveIdle] = useState(0);
  const [sockoptTcpKeepAliveInterval, setSockoptTcpKeepAliveInterval] = useState(0);
  const [sockoptTcpMptcp, setSockoptTcpMptcp] = useState(false);
  const [sockoptTcpMaxSeg, setSockoptTcpMaxSeg] = useState(0);
  const [sockoptTcpUserTimeout, setSockoptTcpUserTimeout] = useState(0);
  const [sockoptV6Only, setSockoptV6Only] = useState(false);
  const [sockoptTcpWindowClamp, setSockoptTcpWindowClamp] = useState(0);
  const [sockoptAddressPortStrategy, setSockoptAddressPortStrategy] = useState('');
  const [sockoptAcceptProxy, setSockoptAcceptProxy] = useState(false);
  const [sockoptTrustedXFF, setSockoptTrustedXFF] = useState('');
  const [sockoptCustomJson, setSockoptCustomJson] = useState('');
  // HappyEyeballs
  const [happyEyeballsEnabled, setHappyEyeballsEnabled] = useState(false);
  const [heTryDelay, setHeTryDelay] = useState(250);
  const [hePrioritizeIPv6, setHePrioritizeIPv6] = useState(false);
  const [heInterleave, setHeInterleave] = useState(1);
  const [heMaxConcurrent, setHeMaxConcurrent] = useState(4);

  // Hysteria settings (hysteriaSettings)
  const [hysteriaVersion, setHysteriaVersion] = useState(2);
  const [hysteriaAuth, setHysteriaAuth] = useState('');
  const [hysteriaUdpIdle, setHysteriaUdpIdle] = useState(60);
  const [hysteriaMasqType, setHysteriaMasqType] = useState('');
  const [hysteriaMasqDir, setHysteriaMasqDir] = useState('');
  const [hysteriaMasqUrl, setHysteriaMasqUrl] = useState('');
  const [hysteriaMasqRewriteHost, setHysteriaMasqRewriteHost] = useState(false);
  const [hysteriaMasqInsecure, setHysteriaMasqInsecure] = useState(false);
  const [hysteriaMasqContent, setHysteriaMasqContent] = useState('');
  const [hysteriaMasqHeaders, setHysteriaMasqHeaders] = useState('');
  const [hysteriaMasqStatusCode, setHysteriaMasqStatusCode] = useState(0);

  // Raw HTTP header sub-objects
  const [rawHttpRequest, setRawHttpRequest] = useState('');
  const [rawHttpResponse, setRawHttpResponse] = useState('');

  // FinalMask enabled toggles
  const [finalmaskEnabled, setFinalmaskEnabled] = useState(false);
  const [sockoptEnabled, setSockoptEnabled] = useState(false);

  // Use ref for onChange to avoid infinite re-render loops in buildAndEmit
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // Only load initial value once on mount to prevent flicker from parent re-renders
  const hasLoadedRef = useRef(false);

  // ── Load initial value ──
  useEffect(() => {
    if (hasLoadedRef.current || !initialValue) return;
    hasLoadedRef.current = true;
    const s = initialValue;
    setMethod(s.method || s.network || 'raw');
    setSecurity(s.security || 'none');

    // RAW
    const raw = s.rawSettings || s.tcpSettings || {};
    setRawAcceptProxy(raw.acceptProxyProtocol === true);
    setRawHeaderType(raw.header?.type || 'none');

    // XHTTP
    const xhttp = s.xhttpSettings || {};
    setXhttpMode(xhttp.mode || 'auto');
    setXhttpPath(xhttp.path || '/');
    setXhttpHost(xhttp.host || '');
    setXhttpNoSSEHeader(xhttp.noSSEHeader === true);
    setXhttpExtra(xhttp.extra ? JSON.stringify(xhttp.extra, null, 2) : '');

    // mKCP
    const kcp = s.kcpSettings || {};
    setKcpMtu(kcp.mtu ?? 1350);
    setKcpTti(kcp.tti ?? 50);
    setKcpUplink(kcp.uplinkCapacity ?? 5);
    setKcpDownlink(kcp.downlinkCapacity ?? 20);
    setKcpCongestion(kcp.congestion === true);
    setKcpReadBuf(kcp.readBufferSize ?? 2);
    setKcpWriteBuf(kcp.writeBufferSize ?? 2);

    // gRPC
    const grpc = s.grpcSettings || {};
    setGrpcAuthority(grpc.authority || '');
    setGrpcServiceName(grpc.serviceName || '');
    setGrpcMultiMode(grpc.multiMode === true);
    setGrpcUserAgent(grpc.user_agent || '');
    setGrpcIdleTimeout(grpc.idle_timeout ?? 0);
    setGrpcHealthTimeout(grpc.health_check_timeout ?? 20);
    setGrpcPermitWithoutStream(grpc.permit_without_stream === true);
    setGrpcInitialWindowsSize(grpc.initial_windows_size ?? 0);

    // WebSocket
    const ws = s.wsSettings || {};
    setWsAcceptProxy(ws.acceptProxyProtocol === true);
    setWsPath(ws.path || '/');
    setWsHost(ws.host || '');
    setWsHeartbeat(ws.heartbeatPeriod ?? 0);
    if (ws.headers && typeof ws.headers === 'object') {
      setWsHeaders(Object.entries(ws.headers).map(([key, value]) => ({ key, value: value as string })));
    }

    // HTTPUpgrade
    const hup = s.httpupgradeSettings || {};
    setHupAcceptProxy(hup.acceptProxyProtocol === true);
    setHupPath(hup.path || '/');
    setHupHost(hup.host || '');
    if (hup.headers && typeof hup.headers === 'object') {
      setHupHeaders(Object.entries(hup.headers).map(([key, value]) => ({ key, value: value as string })));
    }

    // REALITY
    const reality = s.realitySettings || {};
    setRealityServerName(reality.serverName || '');
    setRealityFingerprint(reality.fingerprint || 'chrome');
    setRealityPassword(reality.password || reality.publicKey || '');
    setRealityShortId(reality.shortId || '');
    setRealitySpiderX(reality.spiderX || '/');
    setRealityMldsa65Verify(reality.mldsa65Verify || '');
    setRealityShow(reality.show === true);
    setRealityTarget(reality.target || '');
    setRealityServerNames(Array.isArray(reality.serverNames) ? reality.serverNames.join(', ') : (reality.serverNames || ''));
    setRealityPrivateKey(reality.privateKey || '');
    setRealityShortIds(Array.isArray(reality.shortIds) ? reality.shortIds.join(', ') : (reality.shortIds || ''));

    // TLS
    const tls = s.tlsSettings || {};
    setTlsServerName(tls.serverName || '');
    setTlsAllowInsecure(tls.allowInsecure === true);
    setTlsFingerprint(tls.fingerprint || 'chrome');
    setTlsAlpn(Array.isArray(tls.alpn) ? tls.alpn.join(',') : (tls.alpn || 'h2,http/1.1'));
    setTlsDisableSystemRoot(tls.disableSystemRoot === true);
    setTlsEnableSessionResumption(tls.enableSessionResumption === true);
    setTlsPinnedCert(tls.pinnedPeerCertSha256 || '');
    if (Array.isArray(tls.certificates) && tls.certificates[0]) {
      setTlsCertFile(tls.certificates[0].certificateFile || '');
      setTlsKeyFile(tls.certificates[0].keyFile || '');
    }

    // Hysteria settings
    const hs = s.hysteriaSettings || {};
    setHysteriaVersion(hs.version ?? 2);
    setHysteriaAuth(hs.auth || '');
    setHysteriaUdpIdle(hs.udpIdleTimeout ?? 60);
    const mq = hs.masquerade || {};
    setHysteriaMasqType(mq.type || '');
    setHysteriaMasqDir(mq.dir || '');
    setHysteriaMasqUrl(mq.url || '');
    setHysteriaMasqRewriteHost(mq.rewriteHost === true);
    setHysteriaMasqInsecure(mq.insecure === true);
    setHysteriaMasqContent(mq.content || '');
    setHysteriaMasqHeaders(mq.headers && typeof mq.headers === 'object' ? JSON.stringify(mq.headers, null, 2) : '');
    setHysteriaMasqStatusCode(mq.statusCode ?? 0);

    // Raw HTTP header
    const rawH = raw?.header || {};
    if (rawH.type === 'http') {
      setRawHttpRequest(rawH.request ? JSON.stringify(rawH.request, null, 2) : '');
      setRawHttpResponse(rawH.response ? JSON.stringify(rawH.response, null, 2) : '');
    }

    // FinalMask
    const fm = s.finalmask;
    if (fm) {
      setFinalmaskEnabled(true);
      const qp = fm.quicParams || {};
      setQuicCongestion(qp.congestion || 'bbr');
      setQuicBbrProfile(qp.bbrProfile || 'standard');
      setQuicBrutalUp(qp.brutalUp || '');
      setQuicBrutalDown(qp.brutalDown || '');
      if (qp.udpHop) {
        setQuicUdpHopPorts(qp.udpHop.ports || '');
        setQuicUdpHopInterval(qp.udpHop.interval ?? 30);
      }
      setQuicMaxIdleTimeout(qp.maxIdleTimeout ?? 30);
      setQuicKeepAlive(qp.keepAlivePeriod ?? 0);
    }

    // Sockopt
    const so = s.sockopt;
    if (so) {
      setSockoptEnabled(true);
      setSockoptMark(so.mark ?? 0);
      setSockoptTfo(so.tcpFastOpen === true || (typeof so.tcpFastOpen === 'number' && so.tcpFastOpen > 0));
      setSockoptTproxy(so.tproxy || 'off');
      setSockoptDomainStrategy(so.domainStrategy || 'AsIs');
      setSockoptDialerProxy(so.dialerProxy || '');
      setSockoptInterface(so.interface || '');
      setSockoptTcpCongestion(so.tcpcongestion || '');
      setSockoptTcpKeepAliveIdle(so.tcpKeepAliveIdle ?? 0);
      setSockoptTcpKeepAliveInterval(so.tcpKeepAliveInterval ?? 0);
      setSockoptTcpMptcp(so.tcpMptcp === true);
      setSockoptTcpMaxSeg(so.tcpMaxSeg ?? 0);
      setSockoptTcpUserTimeout(so.tcpUserTimeout ?? 0);
      setSockoptV6Only(so.V6Only === true);
      setSockoptTcpWindowClamp(so.tcpWindowClamp ?? 0);
      setSockoptAddressPortStrategy(so.addressPortStrategy || '');
      setSockoptAcceptProxy(so.acceptProxyProtocol === true);
      setSockoptTrustedXFF(Array.isArray(so.trustedXForwardedFor) ? so.trustedXForwardedFor.join(', ') : '');
      if (Array.isArray(so.customSockopt) && so.customSockopt.length > 0) {
        setSockoptCustomJson(JSON.stringify(so.customSockopt, null, 2));
      }
      const he = so.happyEyeballs;
      if (he) {
        setHappyEyeballsEnabled(true);
        setHeTryDelay(he.tryDelayMs ?? 250);
        setHePrioritizeIPv6(he.prioritizeIPv6 === true);
        setHeInterleave(he.interleave ?? 1);
        setHeMaxConcurrent(he.maxConcurrentTry ?? 4);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Build and emit ──
  const buildAndEmit = useCallback(() => {
    const result: any = { method, security };

    // Transport-specific settings
    switch (method) {
      case 'raw': {
        const rawSettings: any = {};
        if (isInbound) rawSettings.acceptProxyProtocol = rawAcceptProxy;
        if (rawHeaderType !== 'none') {
          const header: any = { type: rawHeaderType };
          if (rawHeaderType === 'http') {
            if (rawHttpRequest.trim()) {
              try { header.request = JSON.parse(rawHttpRequest); } catch { /* skip */ }
            }
            if (rawHttpResponse.trim()) {
              try { header.response = JSON.parse(rawHttpResponse); } catch { /* skip */ }
            }
          }
          rawSettings.header = header;
        }
        if (Object.keys(rawSettings).length > 0) result.rawSettings = rawSettings;
        break;
      }
      case 'xhttp': {
        const xhttpSettings: any = {};
        if (xhttpMode !== 'auto') xhttpSettings.mode = xhttpMode;
        if (xhttpPath && xhttpPath !== '/') xhttpSettings.path = xhttpPath;
        if (xhttpHost) xhttpSettings.host = xhttpHost;
        if (xhttpNoSSEHeader) xhttpSettings.noSSEHeader = true;
        if (xhttpExtra.trim()) {
          try { xhttpSettings.extra = JSON.parse(xhttpExtra); } catch { /* skip */ }
        }
        if (Object.keys(xhttpSettings).length > 0) result.xhttpSettings = xhttpSettings;
        break;
      }
      case 'mkcp': {
        const kcpSettings: any = {
          mtu: kcpMtu,
          tti: kcpTti,
          uplinkCapacity: kcpUplink,
          downlinkCapacity: kcpDownlink,
          congestion: kcpCongestion,
          readBufferSize: kcpReadBuf,
          writeBufferSize: kcpWriteBuf,
        };
        result.kcpSettings = kcpSettings;
        break;
      }
      case 'grpc': {
        const grpcSettings: any = {};
        if (grpcAuthority) grpcSettings.authority = grpcAuthority;
        if (grpcServiceName) grpcSettings.serviceName = grpcServiceName;
        if (grpcMultiMode) grpcSettings.multiMode = true;
        if (!isInbound) {
          if (grpcUserAgent) grpcSettings.user_agent = grpcUserAgent;
          if (grpcIdleTimeout > 0) grpcSettings.idle_timeout = grpcIdleTimeout;
          if (grpcHealthTimeout !== 20) grpcSettings.health_check_timeout = grpcHealthTimeout;
          if (grpcPermitWithoutStream) grpcSettings.permit_without_stream = true;
          if (grpcInitialWindowsSize > 0) grpcSettings.initial_windows_size = grpcInitialWindowsSize;
        }
        if (Object.keys(grpcSettings).length > 0) result.grpcSettings = grpcSettings;
        break;
      }
      case 'websocket': {
        const wsSettings: any = {};
        if (isInbound) wsSettings.acceptProxyProtocol = wsAcceptProxy;
        if (wsPath && wsPath !== '/') wsSettings.path = wsPath;
        if (wsHost) wsSettings.host = wsHost;
        if (wsHeartbeat > 0) wsSettings.heartbeatPeriod = wsHeartbeat;
        const hdrs = wsHeaders.filter(h => h.key);
        if (hdrs.length > 0) {
          wsSettings.headers = Object.fromEntries(hdrs.map(h => [h.key, h.value]));
        }
        if (Object.keys(wsSettings).length > 0) result.wsSettings = wsSettings;
        break;
      }
      case 'httpupgrade': {
        const hupSettings: any = {};
        if (isInbound) hupSettings.acceptProxyProtocol = hupAcceptProxy;
        if (hupPath && hupPath !== '/') hupSettings.path = hupPath;
        if (hupHost) hupSettings.host = hupHost;
        const hdrs = hupHeaders.filter(h => h.key);
        if (hdrs.length > 0) {
          hupSettings.headers = Object.fromEntries(hdrs.map(h => [h.key, h.value]));
        }
        if (Object.keys(hupSettings).length > 0) result.httpupgradeSettings = hupSettings;
        break;
      }
      case 'hysteria': {
        const hysteriaSettings: any = { version: hysteriaVersion };
        if (hysteriaAuth) hysteriaSettings.auth = hysteriaAuth;
        if (hysteriaUdpIdle !== 60) hysteriaSettings.udpIdleTimeout = hysteriaUdpIdle;
        if (hysteriaMasqType) {
          const masq: any = { type: hysteriaMasqType };
          if (hysteriaMasqType === 'file' && hysteriaMasqDir) masq.dir = hysteriaMasqDir;
          if (hysteriaMasqType === 'proxy') {
            if (hysteriaMasqUrl) masq.url = hysteriaMasqUrl;
            if (hysteriaMasqRewriteHost) masq.rewriteHost = true;
            if (hysteriaMasqInsecure) masq.insecure = true;
          }
          if (hysteriaMasqType === 'string') {
            if (hysteriaMasqContent) masq.content = hysteriaMasqContent;
            if (hysteriaMasqHeaders.trim()) {
              try { masq.headers = JSON.parse(hysteriaMasqHeaders); } catch { /* skip */ }
            }
            if (hysteriaMasqStatusCode > 0) masq.statusCode = hysteriaMasqStatusCode;
          }
          hysteriaSettings.masquerade = masq;
        }
        result.hysteriaSettings = hysteriaSettings;
        break;
      }
    }

    // Security settings
    if (security === 'reality') {
      if (isInbound) {
        const rs: any = { show: realityShow };
        if (realityTarget) rs.target = realityTarget;
        if (realityServerNames) rs.serverNames = realityServerNames.split(',').map(s => s.trim()).filter(Boolean);
        if (realityPrivateKey) rs.privateKey = realityPrivateKey;
        if (realityShortIds) rs.shortIds = realityShortIds.split(',').map(s => s.trim()).filter(Boolean);
        result.realitySettings = rs;
      } else {
        const rs: any = {
          serverName: realityServerName,
          fingerprint: realityFingerprint,
        };
        if (realityPassword) rs.password = realityPassword;
        if (realityShortId) rs.shortId = realityShortId;
        if (realitySpiderX && realitySpiderX !== '/') rs.spiderX = realitySpiderX;
        if (realityMldsa65Verify) rs.mldsa65Verify = realityMldsa65Verify;
        result.realitySettings = rs;
      }
    } else if (security === 'tls') {
      const tls: any = {};
      if (tlsServerName) tls.serverName = tlsServerName;
      if (!isInbound) {
        if (tlsAllowInsecure) tls.allowInsecure = true;
        if (tlsPinnedCert) tls.pinnedPeerCertSha256 = tlsPinnedCert;
      }
      if (tlsFingerprint && tlsFingerprint !== 'chrome') tls.fingerprint = tlsFingerprint;
      const alpnArr = tlsAlpn.split(',').map(s => s.trim()).filter(Boolean);
      if (alpnArr.length > 0 && tlsAlpn !== 'h2,http/1.1') tls.alpn = alpnArr;
      if (tlsDisableSystemRoot) tls.disableSystemRoot = true;
      if (tlsEnableSessionResumption) tls.enableSessionResumption = true;
      if (isInbound && tlsCertFile && tlsKeyFile) {
        tls.certificates = [{ certificateFile: tlsCertFile, keyFile: tlsKeyFile }];
      }
      if (Object.keys(tls).length > 0) result.tlsSettings = tls;
    }

    // FinalMask
    if (finalmaskEnabled) {
      const fm: any = {};
      // QUIC params (for xhttp h3 / hysteria)
      if (method === 'xhttp' || method === 'hysteria') {
        const qp: any = {
          congestion: quicCongestion,
          bbrProfile: quicBbrProfile,
        };
        if (quicBrutalUp) qp.brutalUp = quicBrutalUp;
        if (quicBrutalDown) qp.brutalDown = quicBrutalDown;
        if (quicUdpHopPorts) {
          qp.udpHop = { ports: quicUdpHopPorts, interval: quicUdpHopInterval };
        }
        if (quicMaxIdleTimeout !== 30) qp.maxIdleTimeout = quicMaxIdleTimeout;
        if (quicKeepAlive > 0) qp.keepAlivePeriod = quicKeepAlive;
        fm.quicParams = qp;
      }
      if (Object.keys(fm).length > 0) result.finalmask = fm;
    }

    // FinalMask for mKCP (UDP legacy mask)
    if (finalmaskEnabled && method === 'mkcp' && kcpMaskHeader) {
      if (!result.finalmask) result.finalmask = {};
      result.finalmask.udp = [{ type: 'mkcp-legacy', settings: { header: kcpMaskHeader, value: kcpMaskValue } }];
    }

    // Sockopt
    if (sockoptEnabled) {
      const so: any = {};
      if (sockoptMark > 0) so.mark = sockoptMark;
      if (sockoptTcpMaxSeg > 0) so.tcpMaxSeg = sockoptTcpMaxSeg;
      if (sockoptTfo) so.tcpFastOpen = true;
      if (sockoptTproxy !== 'off') so.tproxy = sockoptTproxy;
      if (sockoptDomainStrategy !== 'AsIs') so.domainStrategy = sockoptDomainStrategy;
      if (happyEyeballsEnabled) {
        so.happyEyeballs = {
          tryDelayMs: heTryDelay,
          prioritizeIPv6: hePrioritizeIPv6,
          interleave: heInterleave,
          maxConcurrentTry: heMaxConcurrent,
        };
      }
      if (sockoptDialerProxy) so.dialerProxy = sockoptDialerProxy;
      if (isInbound && sockoptAcceptProxy) so.acceptProxyProtocol = true;
      const xffArr = sockoptTrustedXFF.split(',').map(s => s.trim()).filter(Boolean);
      if (xffArr.length > 0) so.trustedXForwardedFor = xffArr;
      if (sockoptTcpKeepAliveIdle > 0) so.tcpKeepAliveIdle = sockoptTcpKeepAliveIdle;
      if (sockoptTcpKeepAliveInterval > 0) so.tcpKeepAliveInterval = sockoptTcpKeepAliveInterval;
      if (sockoptTcpUserTimeout > 0) so.tcpUserTimeout = sockoptTcpUserTimeout;
      if (sockoptTcpCongestion) so.tcpcongestion = sockoptTcpCongestion;
      if (sockoptInterface) so.interface = sockoptInterface;
      if (sockoptV6Only) so.V6Only = true;
      if (sockoptTcpWindowClamp > 0) so.tcpWindowClamp = sockoptTcpWindowClamp;
      if (sockoptTcpMptcp) so.tcpMptcp = true;
      if (sockoptAddressPortStrategy) so.addressPortStrategy = sockoptAddressPortStrategy;
      if (sockoptCustomJson.trim()) {
        try { so.customSockopt = JSON.parse(sockoptCustomJson); } catch { /* skip */ }
      }
      if (Object.keys(so).length > 0) result.sockopt = so;
    }

    onChangeRef.current(result);
  }, [
    method, security, isInbound,
    rawAcceptProxy, rawHeaderType,
    rawHttpRequest, rawHttpResponse,
    xhttpMode, xhttpPath, xhttpHost, xhttpNoSSEHeader, xhttpExtra,
    kcpMtu, kcpTti, kcpUplink, kcpDownlink, kcpCongestion, kcpReadBuf, kcpWriteBuf,
    grpcAuthority, grpcServiceName, grpcMultiMode, grpcUserAgent, grpcIdleTimeout,
    grpcHealthTimeout, grpcPermitWithoutStream, grpcInitialWindowsSize,
    wsAcceptProxy, wsPath, wsHost, wsHeaders, wsHeartbeat,
    hupAcceptProxy, hupPath, hupHost, hupHeaders,
    realityServerName, realityFingerprint, realityPassword, realityShortId, realitySpiderX, realityMldsa65Verify,
    realityShow, realityTarget, realityServerNames, realityPrivateKey, realityShortIds,
    tlsServerName, tlsAllowInsecure, tlsFingerprint, tlsAlpn, tlsDisableSystemRoot,
    tlsEnableSessionResumption, tlsPinnedCert, tlsCertFile, tlsKeyFile,
    finalmaskEnabled, quicCongestion, quicBbrProfile, quicBrutalUp, quicBrutalDown,
    quicUdpHopPorts, quicUdpHopInterval, quicMaxIdleTimeout, quicKeepAlive,
    sockoptEnabled, sockoptMark, sockoptTfo, sockoptTproxy, sockoptDomainStrategy,
    sockoptDialerProxy, sockoptInterface, sockoptTcpCongestion,
    sockoptTcpKeepAliveIdle, sockoptTcpKeepAliveInterval, sockoptTcpMptcp,
    sockoptTcpMaxSeg, sockoptTcpUserTimeout, sockoptV6Only, sockoptTcpWindowClamp,
    sockoptAddressPortStrategy, sockoptAcceptProxy, sockoptTrustedXFF, sockoptCustomJson,
    happyEyeballsEnabled, heTryDelay, hePrioritizeIPv6, heInterleave, heMaxConcurrent,
    hysteriaVersion, hysteriaAuth, hysteriaUdpIdle, hysteriaMasqType, hysteriaMasqDir,
    hysteriaMasqUrl, hysteriaMasqRewriteHost, hysteriaMasqInsecure, hysteriaMasqContent,
    hysteriaMasqHeaders, hysteriaMasqStatusCode,
    kcpMaskHeader, kcpMaskValue,
  ]);

  useEffect(() => { buildAndEmit(); }, [buildAndEmit]);

  // Auto-fix security when method doesn't support REALITY
  useEffect(() => {
    if (security === 'reality' && !REALITY_COMPATIBLE_METHODS.includes(method)) {
      setSecurity('none');
    }
  }, [method, security]);

  // ── Header entry helpers ──
  const addWsHeader = () => setWsHeaders(prev => [...prev, { key: '', value: '' }]);
  const removeWsHeader = (i: number) => setWsHeaders(prev => prev.filter((_, idx) => idx !== i));
  const updateWsHeader = (i: number, field: 'key' | 'value', val: string) =>
    setWsHeaders(prev => prev.map((h, idx) => idx === i ? { ...h, [field]: val } : h));

  const addHupHeader = () => setHupHeaders(prev => [...prev, { key: '', value: '' }]);
  const removeHupHeader = (i: number) => setHupHeaders(prev => prev.filter((_, idx) => idx !== i));
  const updateHupHeader = (i: number, field: 'key' | 'value', val: string) =>
    setHupHeaders(prev => prev.map((h, idx) => idx === i ? { ...h, [field]: val } : h));

  // ── Render transport-specific settings ──
  const renderMethodSettings = () => {
    switch (method) {
      case 'raw':
        return (
          <div className="space-y-3">
            {isInbound && (
              <div className="flex items-center justify-between p-2.5 bg-slate-950/30 border border-white/5 rounded-lg">
                <div>
                  <span className="text-xs font-medium text-slate-200">接收 PROXY protocol</span>
                  <p className="text-[10px] text-slate-500">接收反代软件发送的真实来源 IP</p>
                </div>
                <ToggleSwitch checked={rawAcceptProxy} onChange={() => setRawAcceptProxy(p => !p)} size="sm" activeColor="blue" />
              </div>
            )}
            <div>
              <label className={labelCls}>数据包头伪装</label>
              <CustomSelect options={RAW_HEADER_OPTIONS} value={rawHeaderType} onChange={setRawHeaderType} size="sm" accentColor="blue" />
            </div>
            {rawHeaderType === 'http' && (
              <div className="space-y-3">
                <p className="text-[10px] text-amber-400/80">HTTP 伪装需在入站出站同时配置且内容一致，可通过 VLESS fallbacks path 分流</p>
                <div>
                  <label className={labelCls}>HTTP 请求 JSON</label>
                  <textarea value={rawHttpRequest} onChange={e => setRawHttpRequest(e.target.value)} rows={4} placeholder='{"version":"1.1","method":"GET","path":["/"],"headers":{"Host":["www.baidu.com"]}}' className={`${inputSmall} resize-none font-mono`} />
                </div>
                <div>
                  <label className={labelCls}>HTTP 响应 JSON</label>
                  <textarea value={rawHttpResponse} onChange={e => setRawHttpResponse(e.target.value)} rows={4} placeholder='{"version":"1.1","status":"200","reason":"OK","headers":{"Content-Type":["application/octet-stream"]}}' className={`${inputSmall} resize-none font-mono`} />
                </div>
              </div>
            )}
          </div>
        );

      case 'xhttp':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
              <div>
                <label className={labelCls}>传输模式</label>
                <CustomSelect options={XHTTP_MODE_OPTIONS} value={xhttpMode} onChange={setXhttpMode} size="sm" accentColor="blue" />
              </div>
              <div>
                <label className={labelCls}>路径</label>
                <input type="text" value={xhttpPath} onChange={e => setXhttpPath(e.target.value)} placeholder="/" className={inputSmall} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Host 主机</label>
              <input type="text" value={xhttpHost} onChange={e => setXhttpHost(e.target.value)} placeholder="example.com" className={inputSmall} />
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-950/30 border border-white/5 rounded-lg">
              <span className="text-xs text-slate-300">禁用 SSE Header</span>
              <ToggleSwitch checked={xhttpNoSSEHeader} onChange={() => setXhttpNoSSEHeader(p => !p)} size="sm" activeColor="blue" />
            </div>
            <div>
              <label className={labelCls}>附加参数 JSON</label>
              <textarea value={xhttpExtra} onChange={e => setXhttpExtra(e.target.value)} rows={2} placeholder='{"key": "value"}' className={`${inputSmall} resize-none`} />
            </div>
          </div>
        );

      case 'mkcp':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
              <div>
                <label className={labelCls}>MTU 最大传输单元</label>
                <input type="number" value={kcpMtu} onChange={e => setKcpMtu(Number(e.target.value) || 1350)} min={576} max={1460} className={inputSmall} />
              </div>
              <div>
                <label className={labelCls}>TTI 传输间隔 ms</label>
                <input type="number" value={kcpTti} onChange={e => setKcpTti(Number(e.target.value) || 50)} min={10} max={100} className={inputSmall} />
              </div>
              <div>
                <label className={labelCls}>上行带宽 MB/s</label>
                <input type="number" value={kcpUplink} onChange={e => setKcpUplink(Number(e.target.value) || 5)} className={inputSmall} />
              </div>
              <div>
                <label className={labelCls}>下行带宽 MB/s</label>
                <input type="number" value={kcpDownlink} onChange={e => setKcpDownlink(Number(e.target.value) || 20)} className={inputSmall} />
              </div>
              <div>
                <label className={labelCls}>读缓冲区 MB</label>
                <input type="number" value={kcpReadBuf} onChange={e => setKcpReadBuf(Number(e.target.value) || 2)} className={inputSmall} />
              </div>
              <div>
                <label className={labelCls}>写缓冲区 MB</label>
                <input type="number" value={kcpWriteBuf} onChange={e => setKcpWriteBuf(Number(e.target.value) || 2)} className={inputSmall} />
              </div>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-950/30 border border-white/5 rounded-lg">
              <div>
                <span className="text-xs font-medium text-slate-200">拥塞控制</span>
                <p className="text-[10px] text-slate-500">自动监测网络质量调整吞吐量</p>
              </div>
              <ToggleSwitch checked={kcpCongestion} onChange={() => setKcpCongestion(p => !p)} size="sm" activeColor="blue" />
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
              <div>
                <label className={labelCls}>mKCP 包头伪装</label>
                <CustomSelect options={MKCP_HEADER_OPTIONS} value={kcpMaskHeader} onChange={setKcpMaskHeader} size="sm" accentColor="blue" />
              </div>
              {kcpMaskHeader && (
                <div>
                  <label className={labelCls}>伪装参数</label>
                  <input type="text" value={kcpMaskValue} onChange={e => setKcpMaskValue(e.target.value)} placeholder={kcpMaskHeader === 'dns' ? 'www.baidu.com' : '密码'} className={inputSmall} />
                </div>
              )}
            </div>
          </div>
        );

      case 'grpc':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
              <div>
                <label className={labelCls}>Authority 权威</label>
                <input type="text" value={grpcAuthority} onChange={e => setGrpcAuthority(e.target.value)} placeholder="grpc.example.com" className={inputSmall} />
              </div>
              <div>
                <label className={labelCls}>服务名称</label>
                <input type="text" value={grpcServiceName} onChange={e => setGrpcServiceName(e.target.value)} placeholder="serviceName" className={inputSmall} />
              </div>
            </div>
            {!isInbound && (
              <>
                <div className="flex items-center justify-between p-2.5 bg-slate-950/30 border border-white/5 rounded-lg">
                  <div>
                    <span className="text-xs font-medium text-slate-200">Multi 模式</span>
                    <p className="text-[10px] text-slate-500">实验性选项，约 20% 性能提升</p>
                  </div>
                  <ToggleSwitch checked={grpcMultiMode} onChange={() => setGrpcMultiMode(p => !p)} size="sm" activeColor="blue" />
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
                  <div>
                    <label className={labelCls}>用户代理</label>
                    <input type="text" value={grpcUserAgent} onChange={e => setGrpcUserAgent(e.target.value)} placeholder="自定义 User Agent" className={inputSmall} />
                  </div>
                  <div>
                    <label className={labelCls}>空闲超时 秒</label>
                    <input type="number" value={grpcIdleTimeout} onChange={e => setGrpcIdleTimeout(Number(e.target.value) || 0)} className={inputSmall} />
                  </div>
                  <div>
                    <label className={labelCls}>健康检查超时 秒</label>
                    <input type="number" value={grpcHealthTimeout} onChange={e => setGrpcHealthTimeout(Number(e.target.value) || 20)} className={inputSmall} />
                  </div>
                  <div>
                    <label className={labelCls}>H2 初始窗口大小</label>
                    <input type="number" value={grpcInitialWindowsSize} onChange={e => setGrpcInitialWindowsSize(Number(e.target.value) || 0)} className={inputSmall} />
                  </div>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-950/30 border border-white/5 rounded-lg">
                  <span className="text-xs text-slate-300">无子连接时健康检查</span>
                  <ToggleSwitch checked={grpcPermitWithoutStream} onChange={() => setGrpcPermitWithoutStream(p => !p)} size="sm" activeColor="blue" />
                </div>
              </>
            )}
          </div>
        );

      case 'websocket':
        return (
          <div className="space-y-3">
            {isInbound && (
              <div className="flex items-center justify-between p-2.5 bg-slate-950/30 border border-white/5 rounded-lg">
                <div>
                  <span className="text-xs font-medium text-slate-200">接收 PROXY protocol</span>
                  <p className="text-[10px] text-slate-500">接收反代软件发送的真实来源 IP</p>
                </div>
                <ToggleSwitch checked={wsAcceptProxy} onChange={() => setWsAcceptProxy(p => !p)} size="sm" activeColor="blue" />
              </div>
            )}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
              <div>
                <label className={labelCls}>路径</label>
                <input type="text" value={wsPath} onChange={e => setWsPath(e.target.value)} placeholder="/" className={inputSmall} />
              </div>
              <div>
                <label className={labelCls}>Host 主机</label>
                <input type="text" value={wsHost} onChange={e => setWsHost(e.target.value)} placeholder="example.com" className={inputSmall} />
              </div>
            </div>
            {!isInbound && (
              <div>
                <label className={labelCls}>心跳间隔 秒 (0=禁用)</label>
                <input type="number" value={wsHeartbeat} onChange={e => setWsHeartbeat(Number(e.target.value) || 0)} className={inputSmall} />
              </div>
            )}
            {!isInbound && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-400">自定义 HTTP 头</span>
                  <button type="button" onClick={addWsHeader} className="text-[10px] text-blue-400 hover:text-blue-300">+ 添加</button>
                </div>
                {wsHeaders.map((h, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="text" value={h.key} onChange={e => updateWsHeader(i, 'key', e.target.value)} placeholder="Header-Name" className={`${inputSmall} flex-1`} />
                    <input type="text" value={h.value} onChange={e => updateWsHeader(i, 'value', e.target.value)} placeholder="value" className={`${inputSmall} flex-1`} />
                    <button type="button" onClick={() => removeWsHeader(i)} className="text-slate-500 hover:text-rose-400 text-xs">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'httpupgrade':
        return (
          <div className="space-y-3">
            {isInbound && (
              <div className="flex items-center justify-between p-2.5 bg-slate-950/30 border border-white/5 rounded-lg">
                <div>
                  <span className="text-xs font-medium text-slate-200">接收 PROXY protocol</span>
                  <p className="text-[10px] text-slate-500">接收反代软件发送的真实来源 IP</p>
                </div>
                <ToggleSwitch checked={hupAcceptProxy} onChange={() => setHupAcceptProxy(p => !p)} size="sm" activeColor="blue" />
              </div>
            )}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
              <div>
                <label className={labelCls}>路径</label>
                <input type="text" value={hupPath} onChange={e => setHupPath(e.target.value)} placeholder="/" className={inputSmall} />
              </div>
              <div>
                <label className={labelCls}>Host 主机</label>
                <input type="text" value={hupHost} onChange={e => setHupHost(e.target.value)} placeholder="example.com" className={inputSmall} />
              </div>
            </div>
            {!isInbound && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-400">自定义 HTTP 头</span>
                  <button type="button" onClick={addHupHeader} className="text-[10px] text-blue-400 hover:text-blue-300">+ 添加</button>
                </div>
                {hupHeaders.map((h, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="text" value={h.key} onChange={e => updateHupHeader(i, 'key', e.target.value)} placeholder="Header-Name" className={`${inputSmall} flex-1`} />
                    <input type="text" value={h.value} onChange={e => updateHupHeader(i, 'value', e.target.value)} placeholder="value" className={`${inputSmall} flex-1`} />
                    <button type="button" onClick={() => removeHupHeader(i)} className="text-slate-500 hover:text-rose-400 text-xs">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'hysteria':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
              <div>
                <label className={labelCls}>版本</label>
                <input type="number" value={hysteriaVersion} onChange={e => setHysteriaVersion(Number(e.target.value) || 2)} className={inputSmall} readOnly />
              </div>
              <div>
                <label className={labelCls}>UDP 空闲超时 秒</label>
                <input type="number" value={hysteriaUdpIdle} onChange={e => setHysteriaUdpIdle(Number(e.target.value) || 60)} className={inputSmall} />
              </div>
            </div>
            <div>
              <label className={labelCls}>认证密码</label>
              <input type="text" value={hysteriaAuth} onChange={e => setHysteriaAuth(e.target.value)} placeholder="服务端与客户端保持一致" className={inputSmall} />
            </div>
            <div>
              <label className={labelCls}>HTTP3 伪装类型</label>
              <CustomSelect
                options={[
                  { value: '', label: '无 默认 404' },
                  { value: 'file', label: 'file 文件服务' },
                  { value: 'proxy', label: 'proxy 反代目标' },
                  { value: 'string', label: 'string 自定义内容' },
                ]}
                value={hysteriaMasqType}
                onChange={setHysteriaMasqType}
                size="sm"
                accentColor="blue"
              />
            </div>
            {hysteriaMasqType === 'file' && (
              <div>
                <label className={labelCls}>文件目录路径</label>
                <input type="text" value={hysteriaMasqDir} onChange={e => setHysteriaMasqDir(e.target.value)} placeholder="/var/www/html" className={inputSmall} />
              </div>
            )}
            {hysteriaMasqType === 'proxy' && (
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>反代目标 URL</label>
                  <input type="text" value={hysteriaMasqUrl} onChange={e => setHysteriaMasqUrl(e.target.value)} placeholder="https://example.com" className={inputSmall} />
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center justify-between flex-1 min-w-[200px] p-2.5 bg-slate-950/30 border border-white/5 rounded-lg">
                    <span className="text-xs text-slate-300">重写 Host</span>
                    <ToggleSwitch checked={hysteriaMasqRewriteHost} onChange={() => setHysteriaMasqRewriteHost(p => !p)} size="sm" activeColor="blue" />
                  </div>
                  <div className="flex items-center justify-between flex-1 min-w-[200px] p-2.5 bg-slate-950/30 border border-white/5 rounded-lg">
                    <span className="text-xs text-slate-300">允许不安全证书</span>
                    <ToggleSwitch checked={hysteriaMasqInsecure} onChange={() => setHysteriaMasqInsecure(p => !p)} size="sm" activeColor="blue" />
                  </div>
                </div>
              </div>
            )}
            {hysteriaMasqType === 'string' && (
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>自定义内容</label>
                  <textarea value={hysteriaMasqContent} onChange={e => setHysteriaMasqContent(e.target.value)} rows={2} placeholder="Hello World" className={`${inputSmall} resize-none`} />
                </div>
                <div>
                  <label className={labelCls}>HTTP 头 JSON</label>
                  <textarea value={hysteriaMasqHeaders} onChange={e => setHysteriaMasqHeaders(e.target.value)} rows={2} placeholder='{"Content-Type": "text/plain"}' className={`${inputSmall} resize-none`} />
                </div>
                <div>
                  <label className={labelCls}>状态码</label>
                  <input type="number" value={hysteriaMasqStatusCode} onChange={e => setHysteriaMasqStatusCode(Number(e.target.value) || 0)} className={inputSmall} />
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // ── Render security settings ──
  const renderSecuritySettings = () => {
    if (security === 'reality') {
      if (isInbound) {
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2.5 bg-slate-950/30 border border-white/5 rounded-lg">
              <span className="text-xs text-slate-300">输出调试信息</span>
              <ToggleSwitch checked={realityShow} onChange={() => setRealityShow(p => !p)} size="sm" activeColor="purple" />
            </div>
            <div>
              <label className={labelCls}>目标</label>
              <input type="text" value={realityTarget} onChange={e => setRealityTarget(e.target.value)} placeholder="example.com:443" className={inputSmall} />
            </div>
            <div>
              <label className={labelCls}>ServerNames 列表 (逗号分隔)</label>
              <input type="text" value={realityServerNames} onChange={e => setRealityServerNames(e.target.value)} placeholder="example.com, www.example.com" className={inputSmall} />
            </div>
            <div>
              <label className={labelCls}>私钥</label>
              <input type="text" value={realityPrivateKey} onChange={e => setRealityPrivateKey(e.target.value)} placeholder="x25519 生成" className={inputSmall} />
            </div>
            <div>
              <label className={labelCls}>Short IDs 列表 (逗号分隔)</label>
              <input type="text" value={realityShortIds} onChange={e => setRealityShortIds(e.target.value)} placeholder='"", 0123456789abcdef' className={inputSmall} />
            </div>
          </div>
        );
      }
      return (
        <div className="space-y-3">
          <div>
            <label className={labelCls}>伪装域名 SNI</label>
            <input type="text" value={realityServerName} onChange={e => setRealityServerName(e.target.value)} placeholder="itunes.apple.com" className={inputSmall} />
          </div>
          <div>
            <label className={labelCls}>TLS 指纹</label>
            <CustomSelect options={FINGERPRINT_OPTIONS} value={realityFingerprint} onChange={setRealityFingerprint} size="sm" accentColor="purple" />
          </div>
          <div>
            <label className={labelCls}>密码</label>
            <input type="text" value={realityPassword} onChange={e => setRealityPassword(e.target.value)} placeholder="公钥" className={inputSmall} />
          </div>
          <div>
            <label className={labelCls}>ML-DSA-65 公钥</label>
            <input type="text" value={realityMldsa65Verify} onChange={e => setRealityMldsa65Verify(e.target.value)} placeholder="后量子签名验证公钥" className={inputSmall} />
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            <div>
              <label className={labelCls}>Short ID</label>
              <input type="text" value={realityShortId} onChange={e => setRealityShortId(e.target.value)} placeholder="6ba85170" className={inputSmall} />
            </div>
            <div>
              <label className={labelCls}>爬虫路径</label>
              <input type="text" value={realitySpiderX} onChange={e => setRealitySpiderX(e.target.value)} placeholder="/" className={inputSmall} />
            </div>
          </div>
        </div>
      );
    }

    if (security === 'tls') {
      return (
        <div className="space-y-3">
          <div>
            <label className={labelCls}>服务器名称 SNI</label>
            <input type="text" value={tlsServerName} onChange={e => setTlsServerName(e.target.value)} placeholder="example.com" className={inputSmall} />
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            <div>
              <label className={labelCls}>TLS 指纹</label>
              <CustomSelect options={FINGERPRINT_OPTIONS} value={tlsFingerprint} onChange={setTlsFingerprint} size="sm" accentColor="blue" />
            </div>
            <div>
              <label className={labelCls}>ALPN</label>
              <CustomSelect options={ALPN_OPTIONS} value={tlsAlpn} onChange={setTlsAlpn} size="sm" accentColor="blue" />
            </div>
          </div>
          {!isInbound && (
            <>
              <div className="flex items-center justify-between p-2.5 bg-slate-950/30 border border-white/5 rounded-lg">
                <div>
                  <span className="text-xs text-slate-300">允许不安全连接</span>
                  <p className="text-[10px] text-slate-500">跳过证书验证，不推荐生产使用</p>
                </div>
                <ToggleSwitch checked={tlsAllowInsecure} onChange={() => setTlsAllowInsecure(p => !p)} size="sm" activeColor="blue" />
              </div>
              <div>
                <label className={labelCls}>证书 SHA256 指纹</label>
                <input type="text" value={tlsPinnedCert} onChange={e => setTlsPinnedCert(e.target.value)} placeholder="e8e2d387fdbffe..." className={inputSmall} />
              </div>
            </>
          )}
          {isInbound && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
              <div>
                <label className={labelCls}>证书文件路径</label>
                <input type="text" value={tlsCertFile} onChange={e => setTlsCertFile(e.target.value)} placeholder="/path/to/cert.crt" className={inputSmall} />
              </div>
              <div>
                <label className={labelCls}>密钥文件路径</label>
                <input type="text" value={tlsKeyFile} onChange={e => setTlsKeyFile(e.target.value)} placeholder="/path/to/key.key" className={inputSmall} />
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center justify-between flex-1 min-w-[200px] p-2.5 bg-slate-950/30 border border-white/5 rounded-lg">
              <span className="text-xs text-slate-300">禁用系统 CA</span>
              <ToggleSwitch checked={tlsDisableSystemRoot} onChange={() => setTlsDisableSystemRoot(p => !p)} size="sm" activeColor="blue" />
            </div>
            <div className="flex items-center justify-between flex-1 min-w-[200px] p-2.5 bg-slate-950/30 border border-white/5 rounded-lg">
              <span className="text-xs text-slate-300">会话恢复</span>
              <ToggleSwitch checked={tlsEnableSessionResumption} onChange={() => setTlsEnableSessionResumption(p => !p)} size="sm" activeColor="blue" />
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Method & Security selectors */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
        <div>
          <label className={labelCls}>传输方式</label>
          <CustomSelect options={METHOD_OPTIONS} value={method} onChange={setMethod} size="sm" accentColor="blue" />
        </div>
        <div>
          <label className={labelCls}>传输安全</label>
          <CustomSelect
            options={SECURITY_OPTIONS.map(o => ({
              ...o,
              disabled: o.value === 'reality' && !REALITY_COMPATIBLE_METHODS.includes(method),
            }))}
            value={security}
            onChange={setSecurity}
            size="sm"
            accentColor="purple"
          />
        </div>
      </div>

      {/* Transport method settings */}
      <CollapsibleSection title="传输方式配置" defaultOpen>
        {renderMethodSettings()}
      </CollapsibleSection>

      {/* Security settings */}
      {security !== 'none' && (
        <CollapsibleSection
          title={security === 'reality' ? 'REALITY 去特征安全传输' : 'TLS 传输层安全'}
          titleColor={security === 'reality' ? 'text-purple-300' : 'text-blue-300'}
          defaultOpen
        >
          {renderSecuritySettings()}
        </CollapsibleSection>
      )}

      {/* FinalMask */}
      {(method === 'xhttp' || method === 'hysteria' || method === 'mkcp') && (
        <CollapsibleSection title="FinalMask 流量伪装" titleColor="text-amber-300">
          <div className="flex items-center justify-between p-2.5 bg-slate-950/30 border border-white/5 rounded-lg">
            <div>
              <span className="text-xs font-medium text-slate-200">启用 FinalMask</span>
              <p className="text-[10px] text-slate-500">传输层加密后的最后一层伪装</p>
            </div>
            <ToggleSwitch checked={finalmaskEnabled} onChange={() => setFinalmaskEnabled(p => !p)} size="sm" activeColor="blue" />
          </div>
          {finalmaskEnabled && (method === 'xhttp' || method === 'hysteria') && (
            <div className="space-y-3">
              <span className="text-[11px] font-semibold text-amber-300">QUIC 参数</span>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
                <div>
                  <label className={labelCls}>拥塞控制</label>
                  <CustomSelect options={QUIC_CONGESTION_OPTIONS} value={quicCongestion} onChange={setQuicCongestion} size="sm" accentColor="amber" />
                </div>
                <div>
                  <label className={labelCls}>BBR 预设</label>
                  <CustomSelect options={BBR_PROFILE_OPTIONS} value={quicBbrProfile} onChange={setQuicBbrProfile} size="sm" accentColor="amber" />
                </div>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
                <div>
                  <label className={labelCls}>上行速率 (如 60 mbps)</label>
                  <input type="text" value={quicBrutalUp} onChange={e => setQuicBrutalUp(e.target.value)} placeholder="60 mbps" className={inputSmall} />
                </div>
                <div>
                  <label className={labelCls}>下行速率</label>
                  <input type="text" value={quicBrutalDown} onChange={e => setQuicBrutalDown(e.target.value)} placeholder="100 mbps" className={inputSmall} />
                </div>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
                <div>
                  <label className={labelCls}>UDP 端口跳跃</label>
                  <input type="text" value={quicUdpHopPorts} onChange={e => setQuicUdpHopPorts(e.target.value)} placeholder="20000-50000" className={inputSmall} />
                </div>
                {quicUdpHopPorts && (
                  <div>
                    <label className={labelCls}>跳跃间隔 秒</label>
                    <input type="number" value={quicUdpHopInterval} onChange={e => setQuicUdpHopInterval(Number(e.target.value) || 30)} className={inputSmall} />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
                <div>
                  <label className={labelCls}>空闲超时 秒</label>
                  <input type="number" value={quicMaxIdleTimeout} onChange={e => setQuicMaxIdleTimeout(Number(e.target.value) || 30)} className={inputSmall} />
                </div>
                <div>
                  <label className={labelCls}>KeepAlive 间隔 秒 (0=禁用)</label>
                  <input type="number" value={quicKeepAlive} onChange={e => setQuicKeepAlive(Number(e.target.value) || 0)} className={inputSmall} />
                </div>
              </div>
            </div>
          )}
          {finalmaskEnabled && method === 'mkcp' && (
            <div className="space-y-3">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
                <div>
                  <label className={labelCls}>mKCP 包头伪装</label>
                  <CustomSelect options={MKCP_HEADER_OPTIONS} value={kcpMaskHeader} onChange={setKcpMaskHeader} size="sm" accentColor="amber" />
                </div>
                {kcpMaskHeader && (
                  <div>
                    <label className={labelCls}>伪装参数</label>
                    <input type="text" value={kcpMaskValue} onChange={e => setKcpMaskValue(e.target.value)} placeholder={kcpMaskHeader === 'dns' ? 'www.baidu.com' : '密码'} className={inputSmall} />
                  </div>
                )}
              </div>
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* Sockopt */}
      <CollapsibleSection title="Sockopt 底层网络选项" titleColor="text-emerald-300">
        <div className="flex items-center justify-between p-2.5 bg-slate-950/30 border border-white/5 rounded-lg">
          <div>
            <span className="text-xs font-medium text-slate-200">启用 Sockopt</span>
            <p className="text-[10px] text-slate-500">透明代理、域名解析及 Socket 选项</p>
          </div>
          <ToggleSwitch checked={sockoptEnabled} onChange={() => setSockoptEnabled(p => !p)} size="sm" activeColor="blue" />
        </div>
        {sockoptEnabled && (
          <div className="space-y-3">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
              <div>
                <label className={labelCls}>域名解析策略</label>
                <CustomSelect options={DOMAIN_STRATEGY_OPTIONS} value={sockoptDomainStrategy} onChange={setSockoptDomainStrategy} size="sm" accentColor="emerald" />
              </div>
              {isInbound && (
                <div>
                  <label className={labelCls}>透明代理</label>
                  <CustomSelect options={TPROXY_OPTIONS} value={sockoptTproxy} onChange={setSockoptTproxy} size="sm" accentColor="emerald" />
                </div>
              )}
              {!isInbound && (
                <div>
                  <label className={labelCls}>TCP 拥塞控制</label>
                  <CustomSelect options={TCP_CONGESTION_OPTIONS} value={sockoptTcpCongestion} onChange={setSockoptTcpCongestion} size="sm" accentColor="emerald" />
                </div>
              )}
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
              <div>
                <label className={labelCls}>SO_MARK (Linux)</label>
                <input type="number" value={sockoptMark} onChange={e => setSockoptMark(Number(e.target.value) || 0)} className={inputSmall} />
              </div>
              <div>
                <label className={labelCls}>出站接口绑定</label>
                <input type="text" value={sockoptInterface} onChange={e => setSockoptInterface(e.target.value)} placeholder="wg0" className={inputSmall} />
              </div>
              <div>
                <label className={labelCls}>TCP 最大分段</label>
                <input type="number" value={sockoptTcpMaxSeg} onChange={e => setSockoptTcpMaxSeg(Number(e.target.value) || 0)} className={inputSmall} />
              </div>
              <div>
                <label className={labelCls}>TCP 窗口限制</label>
                <input type="number" value={sockoptTcpWindowClamp} onChange={e => setSockoptTcpWindowClamp(Number(e.target.value) || 0)} className={inputSmall} />
              </div>
            </div>
            {!isInbound && (
              <div>
                <label className={labelCls}>代理链转发标识</label>
                <input type="text" value={sockoptDialerProxy} onChange={e => setSockoptDialerProxy(e.target.value)} placeholder="outbound tag" className={inputSmall} />
              </div>
            )}
            {isInbound && (
              <div className="flex items-center justify-between p-2.5 bg-slate-950/30 border border-white/5 rounded-lg">
                <div>
                  <span className="text-xs font-medium text-slate-200">接收 PROXY protocol</span>
                  <p className="text-[10px] text-slate-500">底层连接接收 PROXY protocol v1/v2</p>
                </div>
                <ToggleSwitch checked={sockoptAcceptProxy} onChange={() => setSockoptAcceptProxy(p => !p)} size="sm" activeColor="blue" />
              </div>
            )}
            <div>
              <label className={labelCls}>可信 XFF 头来源 (逗号分隔)</label>
              <input type="text" value={sockoptTrustedXFF} onChange={e => setSockoptTrustedXFF(e.target.value)} placeholder="X-Forwarded-For, X-Real-IP" className={inputSmall} />
              <p className="text-[10px] text-slate-500 mt-1">XHTTP/WebSocket/HTTPUpgrade/gRPC 可信反向代理标识</p>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
              <div>
                <label className={labelCls}>KeepAlive 空闲 秒</label>
                <input type="number" value={sockoptTcpKeepAliveIdle} onChange={e => setSockoptTcpKeepAliveIdle(Number(e.target.value) || 0)} className={inputSmall} />
              </div>
              <div>
                <label className={labelCls}>KeepAlive 间隔 秒</label>
                <input type="number" value={sockoptTcpKeepAliveInterval} onChange={e => setSockoptTcpKeepAliveInterval(Number(e.target.value) || 0)} className={inputSmall} />
              </div>
              <div>
                <label className={labelCls}>TCP 用户超时 ms</label>
                <input type="number" value={sockoptTcpUserTimeout} onChange={e => setSockoptTcpUserTimeout(Number(e.target.value) || 0)} className={inputSmall} />
              </div>
            </div>
            <div>
              <label className={labelCls}>地址端口策略 (SRV/TXT)</label>
              <CustomSelect options={ADDRESS_PORT_STRATEGY_OPTIONS} value={sockoptAddressPortStrategy} onChange={setSockoptAddressPortStrategy} size="sm" accentColor="emerald" />
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center justify-between flex-1 min-w-[200px] p-2.5 bg-slate-950/30 border border-white/5 rounded-lg">
                <span className="text-xs text-slate-300">TCP Fast Open</span>
                <ToggleSwitch checked={sockoptTfo} onChange={() => setSockoptTfo(p => !p)} size="sm" activeColor="blue" />
              </div>
              {!isInbound && (
                <div className="flex items-center justify-between flex-1 min-w-[200px] p-2.5 bg-slate-950/30 border border-white/5 rounded-lg">
                  <span className="text-xs text-slate-300">Multipath TCP</span>
                  <ToggleSwitch checked={sockoptTcpMptcp} onChange={() => setSockoptTcpMptcp(p => !p)} size="sm" activeColor="blue" />
                </div>
              )}
              <div className="flex items-center justify-between flex-1 min-w-[200px] p-2.5 bg-slate-950/30 border border-white/5 rounded-lg">
                <div>
                  <span className="text-xs text-slate-300">IPv6 Only (Linux)</span>
                  <p className="text-[10px] text-slate-500">:: 地址仅接受 IPv6</p>
                </div>
                <ToggleSwitch checked={sockoptV6Only} onChange={() => setSockoptV6Only(p => !p)} size="sm" activeColor="blue" />
              </div>
            </div>
            {/* HappyEyeballs */}
            <div className="p-3 bg-slate-950/40 border border-white/5 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-emerald-300">Happy Eyeballs 竞速连接</span>
                  <p className="text-[10px] text-slate-500">RFC-8305 实现，仅域名 + 非 AsIs 时生效</p>
                </div>
                <ToggleSwitch checked={happyEyeballsEnabled} onChange={() => setHappyEyeballsEnabled(p => !p)} size="sm" activeColor="emerald" />
              </div>
              {happyEyeballsEnabled && (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
                  <div>
                    <label className={labelCls}>尝试延迟 ms</label>
                    <input type="number" value={heTryDelay} onChange={e => setHeTryDelay(Number(e.target.value) || 0)} className={inputSmall} />
                  </div>
                  <div>
                    <label className={labelCls}>交错数量</label>
                    <input type="number" value={heInterleave} onChange={e => setHeInterleave(Number(e.target.value) || 1)} min={1} className={inputSmall} />
                  </div>
                  <div>
                    <label className={labelCls}>最大并发</label>
                    <input type="number" value={heMaxConcurrent} onChange={e => setHeMaxConcurrent(Number(e.target.value) || 4)} min={0} className={inputSmall} />
                  </div>
                  <div className="flex items-center justify-between p-2 bg-slate-950/30 border border-white/5 rounded-lg">
                    <span className="text-xs text-slate-300">IPv6 优先</span>
                    <ToggleSwitch checked={hePrioritizeIPv6} onChange={() => setHePrioritizeIPv6(p => !p)} size="sm" activeColor="emerald" />
                  </div>
                </div>
              )}
            </div>
            {/* customSockopt JSON */}
            <div>
              <label className={labelCls}>自定义 Sockopt (JSON 数组)</label>
              <textarea value={sockoptCustomJson} onChange={e => setSockoptCustomJson(e.target.value)} rows={3} placeholder='[{"system":"linux","network":"tcp","type":"str","level":"6","opt":"13","value":"bbr"}]' className={`${inputSmall} resize-none`} />
              <p className="text-[10px] text-slate-500 mt-1">高级用户自定义 Socket 选项，留空则不生效</p>
            </div>
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
};
