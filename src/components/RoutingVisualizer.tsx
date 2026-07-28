import React, { useState, useMemo } from 'react';
import {
  Layers,
  Sparkles,
  Zap,
  CheckCircle2,
  XCircle,
  Sliders,
  Shield,
  Radio,
  ArrowRight,
  Plus,
  Trash2,
  Activity,
  Globe,
  Server,
  Play,
  HelpCircle,
} from 'lucide-react';
import type { RoutingRule, XrayBalancer } from '../types';
import { CustomSelect } from './CustomSelect';
import { useConfigStore } from '../stores/useConfigStore';

interface RoutingVisualizerProps {
  rules: RoutingRule[];
  domainStrategy: 'IPIfNonMatch' | 'AsIs' | 'IPOnDemand';
  domainMatcher: 'hybrid' | 'linear' | 'mph';
  balancers: XrayBalancer[];
  inbounds?: any[];
  proxyGroups: any[];
  allNodes: any[];
  onUpdateDomainStrategy: (strategy: 'IPIfNonMatch' | 'AsIs' | 'IPOnDemand') => void;
  onUpdateDomainMatcher: (matcher: 'hybrid' | 'linear' | 'mph') => void;
  onUpdateBalancers: (balancers: XrayBalancer[]) => void;
}

export const RoutingVisualizer: React.FC<RoutingVisualizerProps> = ({
  rules,
  domainStrategy,
  domainMatcher,
  balancers,
  proxyGroups,
  allNodes,
  onUpdateDomainStrategy,
  onUpdateDomainMatcher,
  onUpdateBalancers,
}) => {
  const { socksPort, httpPort } = useConfigStore();
  const [activeTab, setActiveTab] = useState<'topology' | 'simulator' | 'settings'>('topology');
  const [openSelectId, setOpenSelectId] = useState<string | null>(null);

  // --- Simulator State ---
  const [simTarget, setSimTarget] = useState('www.topode.com');
  const [simPort, setSimPort] = useState('443');
  const [simNetwork, setSimNetwork] = useState('tcp');
  const [simProtocol, setSimProtocol] = useState('tls');
  const [simInboundTag, setSimInboundTag] = useState('socks-in');
  const [simResult, setSimResult] = useState<{
    matchedRule: RoutingRule | null;
    matchedReason: string;
    targetOutbound: string;
    logs: string[];
  } | null>(null);

  // --- Balancer Modal State ---
  const [isBalancerModalOpen, setIsBalancerModalOpen] = useState(false);
  const [editingBalancer, setEditingBalancer] = useState<XrayBalancer | null>(null);
  const [balancerTag, setBalancerTag] = useState('');
  const [balancerSelectorsText, setBalancerSelectorsText] = useState('');
  const [balancerStrategy, setBalancerStrategy] = useState<'leastPing' | 'random'>('leastPing');
  const [balancerFallbackTag, setBalancerFallbackTag] = useState('direct');

  // Domain Strategy Options
  const domainStrategyOptions = [
    {
      value: 'IPIfNonMatch',
      label: 'IPIfNonMatch (默认推荐)',
      description: '优先按域名规则匹配；若未命中任何域名规则，则解析为 IP 重新匹配 IP 规则',
    },
    {
      value: 'AsIs',
      label: 'AsIs (严格域名)',
      description: '仅使用请求的原始域名进行匹配，即使含有 IP 规则也不提前触发 DNS 解析',
    },
    {
      value: 'IPOnDemand',
      label: 'IPOnDemand (即时解析)',
      description: '在匹配过程中一旦遇到任何 IP 规则，立即强制触发 DNS 解析域名为 IP 进行比对',
    },
  ];

  // Domain Matcher Options
  const domainMatcherOptions = [
    {
      value: 'hybrid',
      label: 'hybrid (混合高性能)',
      description: '综合结合线性与哈希算法的高性能匹配引擎（推荐）',
    },
    {
      value: 'linear',
      label: 'linear (线性匹配)',
      description: '经典逐行线性迭代匹配引擎',
    },
    {
      value: 'mph',
      label: 'mph (最小完美哈希)',
      description: '适用于大规模超多域名的并发快速匹配引擎',
    },
  ];

  // Run Simulation Logic
  const handleRunSimulation = () => {
    const logs: string[] = [];
    const targetInput = simTarget.trim();
    const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(targetInput) || targetInput.includes(':');

    const effectiveHost = isIpAddress ? '' : targetInput;
    let effectiveIp = isIpAddress ? targetInput : '';

    if (!isIpAddress && effectiveHost && domainStrategy !== 'AsIs') {
      if (effectiveHost.endsWith('.cn') || effectiveHost.includes('baidu') || effectiveHost.includes('qq.com') || effectiveHost.includes('taobao')) {
        effectiveIp = '180.76.76.76';
      } else if (effectiveHost.endsWith('.local') || effectiveHost.endsWith('.lan') || effectiveHost === 'localhost') {
        effectiveIp = '192.168.1.1';
      } else {
        effectiveIp = '104.18.7.192';
      }
    }

    logs.push(
      `[开始匹配测试] 目标地址: ${targetInput || '(未填写)'} (${isIpAddress ? '检测为 IP' : '检测为域名 Host'}) | 端口: ${simPort} | 协议: ${simNetwork}/${simProtocol}`
    );
    logs.push(`[路由策略引擎] domainStrategy: ${domainStrategy} | domainMatcher: ${domainMatcher}`);

    const enabledRules = rules.filter((r) => r.enabled);
    let matchedRule: RoutingRule | null = null;
    let matchedReason = '';
    let targetOutbound = 'direct';

    for (let i = 0; i < enabledRules.length; i++) {
      const r = enabledRules[i];
      logs.push(`[规则 #${i + 1}] 正在演算: ${r.description} (Target: ${r.outboundTag || r.balancerTag})`);

      // 1. Check Inbound Tag
      if (r.inboundTag && r.inboundTag.length > 0) {
        if (!r.inboundTag.includes(simInboundTag)) {
          logs.push(`  └─ ❌ 入站不匹配 (规则要求: ${r.inboundTag.join(',')}, 实际: ${simInboundTag})`);
          continue;
        }
      }

      // 2. Check Network
      if (r.network) {
        const netList = r.network.split(',').map((n) => n.trim().toLowerCase());
        if (!netList.includes(simNetwork.toLowerCase())) {
          logs.push(`  └─ ❌ 网络协议不匹配 (规则要求: ${r.network}, 实际: ${simNetwork})`);
          continue;
        }
      }

      // 3. Check Protocol Sniffing
      if (r.protocol && r.protocol.length > 0) {
        const pList = r.protocol.map((p) => p.toLowerCase());
        if (!pList.includes(simProtocol.toLowerCase())) {
          logs.push(`  └─ ❌ 嗅探协议不匹配 (规则要求: ${r.protocol.join(',')}, 实际: ${simProtocol})`);
          continue;
        }
      }

      // 4. Check Port
      if (r.port) {
        const portStr = r.port.trim();
        const targetPortNum = parseInt(simPort, 10);
        let portMatched = false;
        if (portStr.includes(',')) {
          const ports = portStr.split(',').map((p) => parseInt(p.trim(), 10));
          portMatched = ports.includes(targetPortNum);
        } else if (portStr.includes('-')) {
          const [start, end] = portStr.split('-').map((p) => parseInt(p.trim(), 10));
          portMatched = targetPortNum >= start && targetPortNum <= end;
        } else {
          portMatched = parseInt(portStr, 10) === targetPortNum;
        }
        if (!portMatched) {
          logs.push(`  └─ ❌ 目标端口不匹配 (规则要求: ${r.port}, 实际: ${simPort})`);
          continue;
        }
      }

      // 5. Check Domain
      let domainMatched = false;
      let matchedDomainPattern = '';
      if (r.domain && r.domain.length > 0 && effectiveHost) {
        const hostLower = effectiveHost.toLowerCase();
        for (const domPattern of r.domain) {
          const domLower = domPattern.toLowerCase();
          if (domLower.startsWith('domain:')) {
            const dom = domLower.replace('domain:', '');
            if (hostLower === dom || hostLower.endsWith('.' + dom)) {
              domainMatched = true;
              matchedDomainPattern = domPattern;
              break;
            }
          } else if (domLower.startsWith('full:')) {
            const dom = domLower.replace('full:', '');
            if (hostLower === dom) {
              domainMatched = true;
              matchedDomainPattern = domPattern;
              break;
            }
          } else if (domLower.startsWith('keyword:')) {
            const dom = domLower.replace('keyword:', '');
            if (hostLower.includes(dom)) {
              domainMatched = true;
              matchedDomainPattern = domPattern;
              break;
            }
          } else if (domLower.startsWith('geosite:')) {
            const category = domLower.replace('geosite:', '');
            if (category === 'cn' || category === 'category-media-cn') {
              if (hostLower.endsWith('.cn') || hostLower.includes('baidu') || hostLower.includes('qq.com') || hostLower.includes('taobao') || hostLower.includes('aliyun') || hostLower.includes('bilibili') || hostLower.includes('weibo') || hostLower.includes('bytedance') || hostLower.includes('zhihu')) {
                domainMatched = true;
                matchedDomainPattern = domPattern;
                break;
              }
            } else if (category === 'private') {
              if (hostLower.endsWith('.local') || hostLower.endsWith('.lan') || hostLower === 'localhost' || hostLower.endsWith('.internal') || hostLower.endsWith('.home.arpa')) {
                domainMatched = true;
                matchedDomainPattern = domPattern;
                break;
              }
            } else if (category.includes('ads') || category.includes('category-ads')) {
              if (hostLower.includes('adservice') || hostLower.includes('doubleclick') || hostLower.includes('adsystem') || hostLower.includes('telemetry')) {
                domainMatched = true;
                matchedDomainPattern = domPattern;
                break;
              }
            } else if (['openai', 'gfw', 'google', 'github', 'telegram', 'twitter', 'youtube', 'facebook', 'netflix'].includes(category) || category.includes('geolocation-!cn')) {
              if (hostLower.includes('openai') || hostLower.includes('chatgpt') || hostLower.includes('google') || hostLower.includes('github') || hostLower.includes('telegram') || hostLower.includes('twitter') || hostLower.includes('youtube') || hostLower.includes('facebook') || hostLower.includes('netflix')) {
                domainMatched = true;
                matchedDomainPattern = domPattern;
                break;
              }
            } else {
              if (hostLower.includes(category)) {
                domainMatched = true;
                matchedDomainPattern = domPattern;
                break;
              }
            }
          } else {
            if (hostLower.includes(domLower)) {
              domainMatched = true;
              matchedDomainPattern = domPattern;
              break;
            }
          }
        }
      }

      // 6. Check IP
      let ipMatched = false;
      let matchedIpPattern = '';
      if (r.ip && r.ip.length > 0 && effectiveIp) {
        for (const ipPattern of r.ip) {
          if (ipPattern === 'geoip:cn' && (effectiveIp.startsWith('114.') || effectiveIp.startsWith('223.') || effectiveIp.startsWith('180.'))) {
            ipMatched = true;
            matchedIpPattern = ipPattern;
            break;
          }
          if (ipPattern === 'geoip:private' && (effectiveIp.startsWith('192.168.') || effectiveIp.startsWith('10.') || effectiveIp.startsWith('127.'))) {
            ipMatched = true;
            matchedIpPattern = ipPattern;
            break;
          }
          if (effectiveIp.startsWith(ipPattern.replace(/\/.*$/, ''))) {
            ipMatched = true;
            matchedIpPattern = ipPattern;
            break;
          }
        }
      }

      if (domainMatched || ipMatched || (!r.domain && !r.ip && (r.port || r.network || r.protocol))) {
        matchedRule = r;
        matchedReason = domainMatched
          ? `域名规则匹配 [${matchedDomainPattern}]`
          : ipMatched
          ? `IP/GeoIP规则匹配 [${matchedIpPattern}]`
          : `端口/协议规则匹配 [Port:${r.port || 'All'}]`;
        targetOutbound = r.outboundTag || r.balancerTag || 'direct';
        logs.push(`  └─ ✅ 规则命中！原因: ${matchedReason} -> 目标出站: ${targetOutbound}`);
        break;
      } else {
        logs.push(`  └─ ❌ 域名与 IP 条件未匹配`);
      }
    }

    if (!matchedRule) {
      logs.push(`[兜底匹配] 未命中任何特定分流规则，走 Xray 默认主出站策略`);
    }

    setSimResult({
      matchedRule,
      matchedReason: matchedReason || '未命中特定规则，命中默认出站',
      targetOutbound,
      logs,
    });
  };

  // Balancer Handlers
  const handleOpenBalancerModal = (b?: XrayBalancer) => {
    if (b) {
      setEditingBalancer(b);
      setBalancerTag(b.tag);
      setBalancerSelectorsText(b.selector.join('\n'));
      setBalancerStrategy(b.strategy?.type || 'leastPing');
      setBalancerFallbackTag(b.fallbackTag || 'direct');
    } else {
      setEditingBalancer(null);
      setBalancerTag(`balancer-${Date.now().toString().slice(-4)}`);
      setBalancerSelectorsText('us-\nhk-');
      setBalancerStrategy('leastPing');
      setBalancerFallbackTag('direct');
    }
    setIsBalancerModalOpen(true);
  };

  const handleSaveBalancer = () => {
    if (!balancerTag.trim()) {
      alert('请输入负载均衡器名称 Tag');
      return;
    }
    const selectors = balancerSelectorsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const newBalancer: XrayBalancer = {
      tag: balancerTag.trim(),
      selector: selectors,
      strategy: { type: balancerStrategy },
      fallbackTag: balancerFallbackTag,
    };

    if (editingBalancer) {
      onUpdateBalancers(balancers.map((b) => (b.tag === editingBalancer.tag ? newBalancer : b)));
    } else {
      onUpdateBalancers([...balancers, newBalancer]);
    }
    setIsBalancerModalOpen(false);
  };

  const handleDeleteBalancer = (tag: string) => {
    onUpdateBalancers(balancers.filter((b) => b.tag !== tag));
  };

  // Statistics calculation
  const stats = useMemo(() => {
    let domainRuleCount = 0;
    let ipRuleCount = 0;
    let portRuleCount = 0;
    let protocolRuleCount = 0;

    rules.forEach((r) => {
      if (r.domain && r.domain.length > 0) domainRuleCount++;
      if (r.ip && r.ip.length > 0) ipRuleCount++;
      if (r.port || r.sourcePort) portRuleCount++;
      if (r.protocol || r.network) protocolRuleCount++;
    });

    return {
      total: rules.length,
      enabled: rules.filter((r) => r.enabled).length,
      domainRuleCount,
      ipRuleCount,
      portRuleCount,
      protocolRuleCount,
    };
  }, [rules]);

  return (
    <div className="space-y-6">
      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-2 rounded-2xl border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab('topology')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'topology'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>路由管线拓扑</span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'simulator'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>实时流量匹配仿真器</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>全局引擎与负载均衡设置</span>
          </button>
        </div>

        <div className="flex items-center gap-3 px-3">
          <span className="text-xs text-slate-400 font-mono">
            已激活规则: <strong className="text-emerald-400 font-bold">{stats.enabled}</strong> / {stats.total}
          </span>
        </div>
      </div>

      {/* TAB 1: TOPOLOGY PIPELINE MAP */}
      {activeTab === 'topology' && (
        <div className="space-y-6 animate-fade-in">
          {/* Top Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Step 1: Inbound Traffic */}
            <div className="glass-card p-4 rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-cyan-950/20 to-slate-900/60 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                  步骤 1 : 入站入口
                </span>
                <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">流量监听端</h4>
              <p className="text-[11px] text-slate-400 mb-3">SOCKS5 / HTTP / TUN 网卡代理</p>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-white/5 flex items-center justify-between text-slate-300">
                  <span>socks-in</span>
                  <span className="text-cyan-300">127.0.0.1:{socksPort}</span>
                </div>
                <div className="px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-white/5 flex items-center justify-between text-slate-300">
                  <span>http-in</span>
                  <span className="text-cyan-300">127.0.0.1:{httpPort}</span>
                </div>
              </div>
            </div>

            {/* Step 2: Routing Decision Engine */}
            <div className="glass-card p-4 rounded-2xl border border-blue-500/20 bg-gradient-to-b from-blue-950/20 to-slate-900/60 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                  步骤 2 : 路由引擎
                </span>
                <Globe className="w-4 h-4 text-blue-400" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">全局决策模型</h4>
              <p className="text-[11px] text-slate-400 mb-3">解析策略与域名匹配算法</p>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-white/5 flex items-center justify-between">
                  <span className="text-slate-400">domainStrategy</span>
                  <span className="text-blue-300 font-bold">{domainStrategy}</span>
                </div>
                <div className="px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-white/5 flex items-center justify-between">
                  <span className="text-slate-400">domainMatcher</span>
                  <span className="text-blue-300 font-bold">{domainMatcher}</span>
                </div>
              </div>
            </div>

            {/* Step 3: Rules Pipeline Stack */}
            <div className="glass-card p-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-950/20 to-slate-900/60 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  步骤 3 : 匹配规则链
                </span>
                <Layers className="w-4 h-4 text-emerald-400" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">分流优先级堆栈</h4>
              <p className="text-[11px] text-slate-400 mb-3">自上而下匹配首条命中</p>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                <div className="px-2 py-1 rounded bg-slate-950/80 text-emerald-300 border border-white/5 text-center">
                  域名规则: {stats.domainRuleCount} 条
                </div>
                <div className="px-2 py-1 rounded bg-slate-950/80 text-cyan-300 border border-white/5 text-center">
                  IP 规则: {stats.ipRuleCount} 条
                </div>
                <div className="px-2 py-1 rounded bg-slate-950/80 text-amber-300 border border-white/5 text-center">
                  端口规则: {stats.portRuleCount} 条
                </div>
                <div className="px-2 py-1 rounded bg-slate-950/80 text-purple-300 border border-white/5 text-center">
                  协议规则: {stats.protocolRuleCount} 条
                </div>
              </div>
            </div>

            {/* Step 4: Outbound Targets */}
            <div className="glass-card p-4 rounded-2xl border border-purple-500/20 bg-gradient-to-b from-purple-950/20 to-slate-900/60 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
                  步骤 4 : 出站终点
                </span>
                <Server className="w-4 h-4 text-purple-400" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">出站转发目标</h4>
              <p className="text-[11px] text-slate-400 mb-3">代理节点 / 策略组 / 直连 / 阻断</p>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-white/5 flex items-center justify-between text-slate-300">
                  <span>策略组 & 节点</span>
                  <span className="text-purple-300 font-bold">{proxyGroups.length + allNodes.length} 个</span>
                </div>
                <div className="px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-white/5 flex items-center justify-between text-slate-300">
                  <span>负载均衡组</span>
                  <span className="text-purple-300 font-bold">{balancers.length} 个</span>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Interactive Pipeline Canvas */}
          <div className="p-6 bg-slate-950/90 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span>实时路由规则链路映射流向图</span>
              </h4>
              <span className="text-xs text-slate-400">自动根据当前激活配置绘制</span>
            </div>

            <div className="space-y-3 pt-2">
              {rules.map((rule, idx) => {
                const isDirect = rule.outboundTag === 'direct';
                const isBlock = rule.outboundTag === 'block';

                return (
                  <div
                    key={rule.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      rule.enabled
                        ? 'border-white/10 bg-slate-900/60 hover:border-blue-500/40'
                        : 'border-white/5 opacity-40 bg-slate-950/40'
                    }`}
                  >
                    {/* Left: Rule Priority & Conditions */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <span className="w-6 h-6 rounded-lg bg-slate-950 border border-white/10 text-slate-300 font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        #{idx + 1}
                      </span>

                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-bold text-white tracking-wide truncate">
                            {rule.description}
                          </h5>
                          {!rule.enabled && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-white/5">
                              已禁用
                            </span>
                          )}
                        </div>

                        {/* Badges for rule conditions */}
                        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
                          {rule.domain && rule.domain.length > 0 && (
                            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                              域名 ({rule.domain.length}): {rule.domain[0]} {rule.domain.length > 1 ? `+${rule.domain.length - 1}` : ''}
                            </span>
                          )}
                          {rule.ip && rule.ip.length > 0 && (
                            <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                              IP ({rule.ip.length}): {rule.ip[0]} {rule.ip.length > 1 ? `+${rule.ip.length - 1}` : ''}
                            </span>
                          )}
                          {rule.port && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              目标端口: {rule.port}
                            </span>
                          )}
                          {rule.sourcePort && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              源端口: {rule.sourcePort}
                            </span>
                          )}
                          {rule.network && (
                            <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                              网络: {rule.network}
                            </span>
                          )}
                          {rule.protocol && rule.protocol.length > 0 && (
                            <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                              嗅探协议: {rule.protocol.join(',')}
                            </span>
                          )}
                          {rule.inboundTag && rule.inboundTag.length > 0 && (
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/10">
                              入站过滤: {rule.inboundTag.join(',')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Flow Connector Arrow */}
                    <div className="hidden md:flex items-center text-slate-600 shrink-0">
                      <div className="w-12 h-px bg-gradient-to-r from-blue-500/40 to-emerald-500/40 relative">
                        <ArrowRight className="w-3.5 h-3.5 text-blue-400 absolute -right-1 -top-1.5" />
                      </div>
                    </div>

                    {/* Right: Outbound Target Badge */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                      <span className="text-[10px] text-slate-400">指向目标:</span>
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border shadow-sm ${
                          isDirect
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : isBlock
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                            : rule.balancerTag
                            ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                            : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                        }`}
                      >
                        {isDirect ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : isBlock ? (
                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                        ) : (
                          <Server className="w-3.5 h-3.5 text-blue-400" />
                        )}
                        <span>{rule.outboundTag || rule.balancerTag}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE SIMULATOR */}
      {activeTab === 'simulator' && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-cyan-400" />
                  流量路由匹配实时演算仿真器
                </h3>
                <p className="text-xs text-slate-400">
                  模拟特定请求流量，按 Xray 规则自上而下演算匹配结果，精准排查规则拦截与走向
                </p>
              </div>

              <button
                onClick={handleRunSimulation}
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>运行路由匹配演算</span>
              </button>
            </div>

            {/* Simulation Input Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 sm:col-span-2 md:col-span-2">
                <label className="text-slate-300 font-semibold text-xs flex items-center justify-between">
                  <span>目标地址 (域名 Host 或 IP 地址)</span>
                  <span className="text-[10px] text-slate-500 font-mono">例如: api.openai.com 或 104.18.7.192</span>
                </label>
                <input
                  type="text"
                  value={simTarget}
                  onChange={(e) => setSimTarget(e.target.value)}
                  placeholder="例如: api.openai.com 或 1.1.1.1"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sky-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold text-xs flex items-center justify-between">
                  <span>目标端口</span>
                  <span className="text-[10px] text-slate-500 font-mono">e.g. 443</span>
                </label>
                <input
                  type="text"
                  value={simPort}
                  onChange={(e) => setSimPort(e.target.value)}
                  placeholder="例如: 443"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-amber-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className={`space-y-1.5 transition-all ${openSelectId === 'simNet' ? 'relative z-50' : 'relative z-20'}`}>
                <label className="text-slate-300 font-semibold text-xs">网络传输类型</label>
                <CustomSelect
                  value={simNetwork}
                  onChange={(val) => setSimNetwork(val)}
                  onOpenChange={(open) => setOpenSelectId(open ? 'simNet' : null)}
                  options={[
                    { value: 'tcp', label: 'TCP 协议' },
                    { value: 'udp', label: 'UDP 协议' },
                  ]}
                  size="sm"
                  accentColor="cyan"
                />
              </div>

              <div className={`space-y-1.5 transition-all ${openSelectId === 'simProto' ? 'relative z-50' : 'relative z-20'}`}>
                <label className="text-slate-300 font-semibold text-xs">嗅探协议</label>
                <CustomSelect
                  value={simProtocol}
                  onChange={(val) => setSimProtocol(val)}
                  onOpenChange={(open) => setOpenSelectId(open ? 'simProto' : null)}
                  options={[
                    { value: 'tls', label: 'TLS 协议' },
                    { value: 'http', label: 'HTTP 协议' },
                    { value: 'bittorrent', label: 'BitTorrent 协议' },
                    { value: 'none', label: '无嗅探协议' },
                  ]}
                  size="sm"
                  accentColor="cyan"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold text-xs">入站标识</label>
                <input
                  type="text"
                  value={simInboundTag}
                  onChange={(e) => setSimInboundTag(e.target.value)}
                  placeholder="例如: socks-in"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-slate-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Simulation Calculation Results */}
            {simResult && (
              <div className="space-y-4 pt-4 border-t border-white/10 animate-fade-in">
                <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">匹配演算决策结果:</span>
                    <span className="px-3 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold border border-cyan-500/40">
                      匹配结果: {simResult.targetOutbound}
                    </span>
                  </div>

                  {simResult.matchedRule ? (
                    <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-white">
                          命中规则: {simResult.matchedRule.description}
                        </div>
                        <div className="text-[11px] text-emerald-400 font-mono">
                          匹配匹配项: {simResult.matchedReason}
                        </div>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 ml-3" />
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/30 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-amber-200">
                          未命中特定自定义规则
                        </div>
                        <div className="text-[11px] text-amber-400 font-mono">
                          系统按默认兜底规则直连或走全局代理节点
                        </div>
                      </div>
                      <HelpCircle className="w-5 h-5 text-amber-400 shrink-0 ml-3" />
                    </div>
                  )}

                  {/* Log Tracer Output */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-slate-400 font-semibold block">匹配逻辑推演日志:</span>
                    <div className="p-3 rounded-lg bg-slate-900/90 font-mono text-[11px] text-slate-300 space-y-1 max-h-48 overflow-y-auto custom-scrollbar border border-white/5">
                      {simResult.logs.map((log, idx) => (
                        <div
                          key={idx}
                          className={
                            log.includes('✅')
                              ? 'text-emerald-300 font-bold'
                              : log.includes('❌')
                              ? 'text-slate-500'
                              : 'text-slate-300'
                          }
                        >
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: GLOBAL ENGINE SETTINGS & BALANCERS */}
      {activeTab === 'settings' && (
        <div className="space-y-6 animate-fade-in">
          {/* Top Engine Configuration Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-20">
            {/* Domain Strategy Selector */}
            <div className={`glass-card p-5 rounded-2xl border border-white/10 space-y-4 transition-all ${openSelectId === 'strategy' ? 'relative z-50' : 'relative z-30'}`}>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-400" />
                <h4 className="text-sm font-bold text-white">域名解析路由策略</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                控制 Xray 在规则比对过程中如何处理域名与 DNS IP 的关联关系。
              </p>
              <CustomSelect
                value={domainStrategy}
                onChange={(val) => onUpdateDomainStrategy(val as any)}
                onOpenChange={(open) => setOpenSelectId(open ? 'strategy' : null)}
                options={domainStrategyOptions}
                size="md"
                accentColor="blue"
              />
            </div>

            {/* Domain Matcher Selector */}
            <div className={`glass-card p-5 rounded-2xl border border-white/10 space-y-4 transition-all ${openSelectId === 'matcher' ? 'relative z-50' : 'relative z-20'}`}>
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-purple-400" />
                <h4 className="text-sm font-bold text-white">域名匹配引擎算法</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                控制底层的域名查找与哈希树加速匹配模式。
              </p>
              <CustomSelect
                value={domainMatcher}
                onChange={(val) => onUpdateDomainMatcher(val as any)}
                onOpenChange={(open) => setOpenSelectId(open ? 'matcher' : null)}
                options={domainMatcherOptions}
                size="md"
                accentColor="purple"
              />
            </div>
          </div>

          {/* Balancers List & Management */}
          <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4 relative z-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-400" />
                  Xray 内核原生负载均衡器配置
                </h3>
                <p className="text-xs text-slate-400">
                  配置支持 lowestPing (最低延迟测速) 与 random (随机平摊) 的负载均衡器标识
                </p>
              </div>

              <button
                onClick={() => handleOpenBalancerModal()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>新建负载均衡器</span>
              </button>
            </div>

            <div className="space-y-3 pt-2">
              {balancers.length === 0 ? (
                <div className="py-8 text-center bg-slate-950/40 rounded-xl border border-dashed border-white/10 text-slate-500 text-xs">
                  暂未添加 Xray 原生负载均衡器。点击右上角新建。
                </div>
              ) : (
                balancers.map((b) => (
                  <div
                    key={b.tag}
                    className="p-4 rounded-xl bg-slate-950/70 border border-white/10 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white font-mono">{b.tag}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                          策略: {b.strategy?.type === 'random' ? '随机平摊' : '最低延迟'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        前缀筛选: <code className="text-purple-300">{b.selector.join(', ')}</code>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenBalancerModal(b)}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteBalancer(b.tag)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-600/20 text-slate-500 hover:text-rose-400 border border-white/10 transition-colors cursor-pointer"
                        title="删除此负载均衡器"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Balancer Edit Modal */}
      {isBalancerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-900/80">
              <h3 className="text-base font-bold text-white">
                {editingBalancer ? `编辑负载均衡器 - ${editingBalancer.tag}` : '新建 Xray 负载均衡器'}
              </h3>
              <button
                onClick={() => setIsBalancerModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">负载均衡器名称标识</label>
                <input
                  type="text"
                  value={balancerTag}
                  onChange={(e) => setBalancerTag(e.target.value)}
                  placeholder="例如: balancer-us"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">节点 Outbound Tag 筛选规则 (一行一个前缀关键字)</label>
                <textarea
                  rows={4}
                  value={balancerSelectorsText}
                  onChange={(e) => setBalancerSelectorsText(e.target.value)}
                  placeholder={`us-\nhk-\nproxy`}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-purple-200 font-mono placeholder-slate-600 focus:outline-none focus:border-purple-500 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">负载选路策略</label>
                <CustomSelect
                  value={balancerStrategy}
                  onChange={(val) => setBalancerStrategy(val as any)}
                  options={[
                    { value: 'leastPing', label: 'leastPing (最低延迟)' },
                    { value: 'random', label: 'random (随机平摊)' },
                  ]}
                  size="md"
                  accentColor="purple"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-white/10 bg-slate-900/80 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsBalancerModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveBalancer}
                className="px-5 py-2 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-500 shadow-lg shadow-purple-600/30 cursor-pointer"
              >
                保存负载均衡器
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
