import React, { useState, useMemo } from 'react';
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
  RefreshCw,
  Server,
  Layers,
  ArrowRight,
  Globe,
  SlidersHorizontal,
} from 'lucide-react';
import { useConfigStore, TEMPLATE_STANDARD, TEMPLATE_TUN, TEMPLATE_MINIMAL } from '../stores/useConfigStore';
import { useProxyStore } from '../stores/useProxyStore';
import { useAppStore } from '../stores/useAppStore';
import { extractNodesFromConfigJson, type XrayConfigObject } from '../utils/xrayMapper';
import { ConfirmModal } from '../components/ConfirmModal';

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
    syncNodesAndGroups,
  } = useConfigStore();

  const { profiles: proxyProfiles, proxyGroups } = useProxyStore();
  const { coreState, setCoreRunning } = useAppStore();

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

  // --- CRUD Modals State for Visual Inspector ---
  // Inbound Modal State
  const [inboundModal, setInboundModal] = useState<{
    isOpen: boolean;
    index: number | null;
    tag: string;
    protocol: string;
    customProtocol: string;
    listen: string;
    port: number | string;
    sniffing: boolean;
    uuidPassword?: string;
  }>({
    isOpen: false,
    index: null,
    tag: '',
    protocol: 'socks',
    customProtocol: '',
    listen: '127.0.0.1',
    port: 10808,
    sniffing: true,
    uuidPassword: '',
  });

  // Outbound Modal State
  const [outboundModal, setOutboundModal] = useState<{
    isOpen: boolean;
    index: number | null;
    tag: string;
    protocol: string;
    server: string;
    port: number | string;
    security: string;
    uuidPassword: string;
  }>({
    isOpen: false,
    index: null,
    tag: '',
    protocol: 'vless',
    server: '',
    port: 443,
    security: 'reality',
    uuidPassword: '',
  });

  // Routing Rule Modal State
  const [ruleModal, setRuleModal] = useState<{
    isOpen: boolean;
    index: number | null;
    outboundTag: string;
    type: string;
    domain: string;
    ip: string;
    network: string;
  }>({
    isOpen: false,
    index: null,
    outboundTag: 'proxy',
    type: 'field',
    domain: '',
    ip: '',
    network: '',
  });

  // DNS Modal State
  const [dnsModal, setDnsModal] = useState<{
    isOpen: boolean;
    index: number | null;
    server: string;
  }>({
    isOpen: false,
    index: null,
    server: '',
  });

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) || profiles[0];
  const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];

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
  }, [selectedProfile?.content]);

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

  // --- Inbound Handlers ---
  const handleOpenInboundModal = (ib?: any, index?: number) => {
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
      'freedom',
      'blackhole',
      'loopback',
    ];

    if (ib && index !== undefined) {
      let uuidPassword = '';
      if (ib.settings?.clients?.[0]?.id) {
        uuidPassword = ib.settings.clients[0].id;
      } else if (ib.settings?.clients?.[0]?.password) {
        uuidPassword = ib.settings.clients[0].password;
      }

      const isKnown = knownProtocols.includes(ib.protocol);

      setInboundModal({
        isOpen: true,
        index,
        tag: ib.tag || `inbound-${index}`,
        protocol: isKnown ? ib.protocol : 'custom',
        customProtocol: isKnown ? '' : ib.protocol || '',
        listen: ib.listen || '127.0.0.1',
        port: ib.port || 10808,
        sniffing: ib.sniffing?.enabled ?? true,
        uuidPassword,
      });
    } else {
      const count = parsedConfig?.inbounds?.length || 0;
      setInboundModal({
        isOpen: true,
        index: null,
        tag: count === 0 ? 'socks-in' : count === 1 ? 'http-in' : `inbound-${count + 1}`,
        protocol: count === 1 ? 'http' : 'socks',
        customProtocol: '',
        listen: '127.0.0.1',
        port: count === 0 ? 10808 : count === 1 ? 10809 : 10810 + count,
        sniffing: true,
        uuidPassword: '',
      });
    }
  };

  const handleSaveInbound = () => {
    updateParsedConfig((config) => {
      if (!config.inbounds) config.inbounds = [];

      const targetProtocol =
        inboundModal.protocol === 'custom' ? inboundModal.customProtocol.trim() || 'socks' : inboundModal.protocol;

      const newInbound: any = {
        tag: inboundModal.tag || 'inbound',
        port: Number(inboundModal.port) || 10808,
        listen: inboundModal.listen || '127.0.0.1',
        protocol: targetProtocol,
      };

      if (inboundModal.sniffing) {
        newInbound.sniffing = {
          enabled: true,
          destOverride: ['http', 'tls', 'quic'],
        };
      }

      if (targetProtocol === 'socks' || targetProtocol === 'http') {
        newInbound.settings = { auth: 'noauth', udp: true };
      } else if (targetProtocol === 'vless' || targetProtocol === 'vmess') {
        if (inboundModal.uuidPassword) {
          newInbound.settings = {
            clients: [{ id: inboundModal.uuidPassword, flow: 'xtls-rprx-vision' }],
            decryption: 'none',
          };
        }
      } else if (targetProtocol === 'trojan' || targetProtocol === 'shadowsocks' || targetProtocol === 'hysteria2') {
        if (inboundModal.uuidPassword) {
          newInbound.settings = {
            clients: [{ password: inboundModal.uuidPassword }],
          };
        }
      }

      if (inboundModal.index !== null && inboundModal.index < config.inbounds.length) {
        const existing = config.inbounds[inboundModal.index];
        config.inbounds[inboundModal.index] = { ...existing, ...newInbound };
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
      let server = '';
      let port: number | string = 443;
      let uuidPassword = '';

      if (ob.settings?.vnext?.[0]) {
        server = ob.settings.vnext[0].address || '';
        port = ob.settings.vnext[0].port || 443;
        uuidPassword = ob.settings.vnext[0].users?.[0]?.id || '';
      } else if (ob.settings?.servers?.[0]) {
        server = ob.settings.servers[0].address || '';
        port = ob.settings.servers[0].port || 443;
        uuidPassword = ob.settings.servers[0].password || '';
      }

      setOutboundModal({
        isOpen: true,
        index,
        tag: ob.tag || `outbound-${index}`,
        protocol: ob.protocol || 'freedom',
        server,
        port,
        security: ob.streamSettings?.security || 'none',
        uuidPassword,
      });
    } else {
      setOutboundModal({
        isOpen: true,
        index: null,
        tag: `node-${(parsedConfig?.outbounds?.length || 0) + 1}`,
        protocol: 'vless',
        server: 'example.com',
        port: 443,
        security: 'reality',
        uuidPassword: '',
      });
    }
  };

  const handleSaveOutbound = () => {
    updateParsedConfig((config) => {
      if (!config.outbounds) config.outbounds = [];

      const newOb: any = {
        tag: outboundModal.tag || 'outbound',
        protocol: outboundModal.protocol,
      };

      if (outboundModal.protocol === 'freedom') {
        newOb.settings = {};
      } else if (outboundModal.protocol === 'blackhole') {
        newOb.settings = { response: { type: 'http' } };
      } else if (outboundModal.protocol === 'vless' || outboundModal.protocol === 'vmess') {
        newOb.settings = {
          vnext: [
            {
              address: outboundModal.server,
              port: Number(outboundModal.port) || 443,
              users: [
                {
                  id: outboundModal.uuidPassword,
                  encryption: 'none',
                },
              ],
            },
          ],
        };
        newOb.streamSettings = {
          network: 'tcp',
          security: outboundModal.security,
        };
      } else {
        newOb.settings = {
          servers: [
            {
              address: outboundModal.server,
              port: Number(outboundModal.port) || 443,
              password: outboundModal.uuidPassword,
            },
          ],
        };
        newOb.streamSettings = {
          network: 'tcp',
          security: outboundModal.security,
        };
      }

      if (outboundModal.index !== null && outboundModal.index < config.outbounds.length) {
        const existing = config.outbounds[outboundModal.index];
        config.outbounds[outboundModal.index] = { ...existing, ...newOb };
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
      setRuleModal({
        isOpen: true,
        index,
        outboundTag: rule.outboundTag || defaultOutbound,
        type: rule.type || 'field',
        domain: Array.isArray(rule.domain) ? rule.domain.join(', ') : rule.domain || '',
        ip: Array.isArray(rule.ip) ? rule.ip.join(', ') : rule.ip || '',
        network: rule.network || '',
      });
    } else {
      setRuleModal({
        isOpen: true,
        index: null,
        outboundTag: defaultOutbound,
        type: 'field',
        domain: '',
        ip: '',
        network: '',
      });
    }
  };

  const handleSaveRule = () => {
    updateParsedConfig((config) => {
      if (!config.routing) {
        config.routing = { domainStrategy: 'IPIfNonMatch', rules: [] };
      }
      if (!config.routing.rules) config.routing.rules = [];

      const newRule: any = {
        type: ruleModal.type || 'field',
        outboundTag: ruleModal.outboundTag,
      };

      if (ruleModal.domain.trim()) {
        newRule.domain = ruleModal.domain
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
      if (ruleModal.ip.trim()) {
        newRule.ip = ruleModal.ip
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
      if (ruleModal.network.trim()) {
        newRule.network = ruleModal.network.trim();
      }

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
      const val = typeof srv === 'string' ? srv : srv.address || JSON.stringify(srv);
      setDnsModal({
        isOpen: true,
        index,
        server: val,
      });
    } else {
      setDnsModal({
        isOpen: true,
        index: null,
        server: 'https://dns.google/dns-query',
      });
    }
  };

  const handleSaveDns = () => {
    updateParsedConfig((config) => {
      if (!config.dns) {
        config.dns = { servers: [] };
      }
      if (!Array.isArray(config.dns.servers)) {
        config.dns.servers = [];
      }

      const srvValue = dnsModal.server.trim();
      if (!srvValue) return;

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
  }, [selectedProfile?.content]);

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

  const handleSyncWithProxyStore = () => {
    const allNodes = proxyProfiles.flatMap((p) => p.nodes);
    syncNodesAndGroups(allNodes, proxyGroups);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
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
            高级 `config.json` 双向可视化映射与配置文件管理
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            将底层 Xray 原生 `config.json` 进行全可视化结构分解，节点出站 (Outbounds) 与策略路由 (Routing) 双向实时映射
          </p>
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
        {/* Left Side: Config Profiles List Panel (4 cols) */}
        <div className="lg:col-span-4 flex flex-col glass-card rounded-2xl border border-white/10 p-3 bg-slate-900/60 overflow-hidden">
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="font-semibold text-slate-300">配置文件列表 ({profiles.length})</span>
              <span className="text-[11px] text-slate-500">运行: {activeProfile?.name}</span>
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

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
            {filteredProfiles.map((p) => {
              const isSelected = p.id === selectedProfileId;
              const isActive = p.id === activeProfileId && coreState.isRunning;

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProfileId(p.id)}
                  className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500/50 shadow-lg shadow-blue-500/10'
                      : 'bg-slate-950/40 border-white/5 hover:border-white/20 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
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

                  <p className="text-[11px] text-slate-400 line-clamp-2 mb-2 leading-relaxed">
                    {p.description}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] text-slate-500">
                    <span>更新: {p.updatedAt}</span>

                    <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLaunchProfile(p.id);
                        }}
                        title="启动指定该配置"
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                          isActive
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'
                        }`}
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>{isActive ? '正在运行' : '启动指定'}</span>
                      </button>

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

        {/* Right Side: Visual Inspector & Monaco Editor Workspace (8 cols) */}
        <div className="lg:col-span-8 flex flex-col glass-card rounded-2xl border border-white/10 p-3 bg-slate-950 overflow-hidden min-h-[480px]">
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
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white tracking-wide truncate">{selectedProfile.name}</h3>
                      <button
                        onClick={startEditTitle}
                        title="编辑名称与描述"
                        className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">{selectedProfile.description}</p>
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

              {/* Line 2: Toolbar Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  onClick={handleSyncWithProxyStore}
                  title="强行将节点代理管理页面中的节点与策略重新写入此 config.json"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                  <span>同步 GUI 节点与策略</span>
                </button>

                {viewMode === 'code' && (
                  <>
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
                  </>
                )}
              </div>
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
                {/* 1. Outbounds Node Mapping Section */}
                <div className="p-3 bg-slate-900/60 rounded-xl border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white flex items-center gap-2">
                      <Server className="w-4 h-4 text-blue-400" />
                      节点出站映射 (Outbounds Section)
                    </h4>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-blue-300 font-mono">
                        共 {parsedConfig?.outbounds?.length || 0} 项 Outbounds (包含 {mappedNodesInJson.length} 个代理节点)
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
                      return (
                        <div
                          key={ob.tag || idx}
                          className={`p-2.5 rounded-lg border flex items-center justify-between ${
                            isNode
                              ? 'bg-slate-950/80 border-blue-500/30'
                              : 'bg-slate-950/40 border-white/5 text-slate-400'
                          }`}
                        >
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <div className="font-bold text-slate-100 flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                                {ob.protocol}
                              </span>
                              <span className="truncate max-w-[150px]">{ob.tag}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">
                              {ob.settings?.vnext?.[0]?.address
                                ? `${ob.settings.vnext[0].address}:${ob.settings.vnext[0].port}`
                                : ob.settings?.servers?.[0]?.address
                                ? `${ob.settings.servers[0].address}:${ob.settings.servers[0].port}`
                                : '系统内置自由出站'}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <div className="text-[10px] font-mono text-slate-500">
                              {ob.streamSettings?.security ? `TLS: ${ob.streamSettings.security}` : '直连'}
                            </div>
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

                {/* 2. Routing Rules Section */}
                <div className="p-3 bg-slate-900/60 rounded-xl border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      策略分流规则映射 (Routing Rules)
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

                  <div className="space-y-1.5">
                    {(parsedConfig?.routing?.rules || []).map((rule, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-slate-950/80 border border-white/5 flex items-center justify-between gap-3 text-[11px]"
                      >
                        <div className="flex items-center gap-2 font-mono flex-1 min-w-0">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30 shrink-0">
                            {rule.type || 'field'}
                          </span>
                          <span className="text-slate-300 truncate">
                            {rule.domain
                              ? `域名: [${rule.domain.slice(0, 3).join(', ')}${rule.domain.length > 3 ? '...' : ''}]`
                              : rule.ip
                              ? `IP: [${rule.ip.join(', ')}]`
                              : rule.network
                              ? `网络: ${rule.network}`
                              : '全匹配'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 font-mono">
                          <div className="flex items-center gap-1 text-slate-400">
                            <ArrowRight className="w-3 h-3 text-slate-500" />
                            <span className="px-2 py-0.5 rounded bg-blue-600/20 text-blue-300 font-bold border border-blue-500/30">
                              {rule.outboundTag}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenRuleModal(rule, idx)}
                              title="编辑此规则"
                              className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRule(idx)}
                              title="删除此规则"
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

                {/* 3. Inbounds & DNS Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Inbounds */}
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                        入站配置 (Inbounds)
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

                  {/* DNS */}
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white flex items-center gap-2">
                        <Globe className="w-4 h-4 text-purple-400" />
                        DNS 解析服务 (DNS)
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
      {inboundModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md glass-card bg-slate-900 border border-white/15 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-cyan-400" />
                {inboundModal.index !== null ? '编辑入站配置 (Inbound)' : '新增入站配置 (Inbound)'}
              </h3>
              <button
                onClick={() => setInboundModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">入站 Tag (标识名)</label>
                <input
                  type="text"
                  placeholder="如: socks-in 或 http-in"
                  value={inboundModal.tag}
                  onChange={(e) => setInboundModal((prev) => ({ ...prev, tag: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">协议 Protocol</label>
                  <select
                    value={inboundModal.protocol}
                    onChange={(e) => setInboundModal((prev) => ({ ...prev, protocol: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value="socks">socks (SOCKS5)</option>
                    <option value="http">http (HTTP 代理)</option>
                    <option value="dokodemo-door">dokodemo-door (任意门/透明代理)</option>
                    <option value="vless">vless (VLESS 入站)</option>
                    <option value="vmess">vmess (VMess 入站)</option>
                    <option value="trojan">trojan (Trojan 入站)</option>
                    <option value="shadowsocks">shadowsocks (SS 入站)</option>
                    <option value="hysteria2">hysteria2 (Hysteria 2 入站)</option>
                    <option value="wireguard">wireguard (WireGuard 入站)</option>
                    <option value="freedom">freedom (自由直连入站)</option>
                    <option value="blackhole">blackhole (黑洞阻断入站)</option>
                    <option value="loopback">loopback (回环链式入站)</option>
                    <option value="custom">自定义扩展协议...</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">监听端口 Port</label>
                  <input
                    type="number"
                    placeholder="10808"
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

              {['vless', 'vmess', 'trojan', 'shadowsocks', 'hysteria2'].includes(
                inboundModal.protocol === 'custom' ? inboundModal.customProtocol : inboundModal.protocol
              ) && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">客户端认证 UUID / 密码 Password</label>
                  <input
                    type="text"
                    placeholder="填入客户端连接所需 UUID 或密码"
                    value={inboundModal.uuidPassword || ''}
                    onChange={(e) => setInboundModal((prev) => ({ ...prev, uuidPassword: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

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
                  <div className="text-xs font-semibold text-slate-200">开启流量嗅探 (Sniffing)</div>
                  <div className="text-[10px] text-slate-400">自动重定向 HTTP/TLS 域名至真实 Host</div>
                </div>
                <input
                  type="checkbox"
                  checked={inboundModal.sniffing}
                  onChange={(e) => setInboundModal((prev) => ({ ...prev, sniffing: e.target.checked }))}
                  className="w-4 h-4 rounded border-white/20 bg-slate-900 text-cyan-600 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
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
      )}

      {/* Edit / Add Outbound Modal */}
      {outboundModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md glass-card bg-slate-900 border border-white/15 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Server className="w-5 h-5 text-blue-400" />
                {outboundModal.index !== null ? '编辑出站配置 (Outbound)' : '新增出站配置 (Outbound)'}
              </h3>
              <button
                onClick={() => setOutboundModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">协议 Protocol</label>
                  <select
                    value={outboundModal.protocol}
                    onChange={(e) => setOutboundModal((prev) => ({ ...prev, protocol: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="vless">VLESS</option>
                    <option value="vmess">VMess</option>
                    <option value="trojan">Trojan</option>
                    <option value="shadowsocks">Shadowsocks</option>
                    <option value="freedom">Freedom (自由直连)</option>
                    <option value="blackhole">Blackhole (阻断拦截)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">传输安全 Security</label>
                  <select
                    value={outboundModal.security}
                    onChange={(e) => setOutboundModal((prev) => ({ ...prev, security: e.target.value }))}
                    disabled={outboundModal.protocol === 'freedom' || outboundModal.protocol === 'blackhole'}
                    className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="none">none (明文)</option>
                    <option value="tls">tls</option>
                    <option value="reality">reality</option>
                  </select>
                </div>
              </div>

              {outboundModal.protocol !== 'freedom' && outboundModal.protocol !== 'blackhole' && (
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

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">UUID / 密码 Password</label>
                    <input
                      type="text"
                      placeholder="填入 UUID 或节点连接密码"
                      value={outboundModal.uuidPassword}
                      onChange={(e) => setOutboundModal((prev) => ({ ...prev, uuidPassword: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
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
          <div className="w-full max-w-md glass-card bg-slate-900 border border-white/15 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                {ruleModal.index !== null ? '编辑策略分流规则' : '新增策略分流规则'}
              </h3>
              <button
                onClick={() => setRuleModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">目标出站 Target Outbound</label>
                <select
                  value={ruleModal.outboundTag}
                  onChange={(e) => setRuleModal((prev) => ({ ...prev, outboundTag: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                >
                  {(parsedConfig?.outbounds || []).map((ob) => (
                    <option key={ob.tag} value={ob.tag}>
                      {ob.tag} ({ob.protocol})
                    </option>
                  ))}
                  <option value="proxy">proxy</option>
                  <option value="direct">direct</option>
                  <option value="block">block</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">匹配域名 Domain (英文逗号分隔)</label>
                <input
                  type="text"
                  placeholder="例如: geosite:openai, domain:chatgpt.com"
                  value={ruleModal.domain}
                  onChange={(e) => setRuleModal((prev) => ({ ...prev, domain: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">匹配 IP (英文逗号分隔)</label>
                <input
                  type="text"
                  placeholder="例如: geoip:cn, geoip:private, 1.1.1.1/32"
                  value={ruleModal.ip}
                  onChange={(e) => setRuleModal((prev) => ({ ...prev, ip: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">网络协议 Network</label>
                <select
                  value={ruleModal.network}
                  onChange={(e) => setRuleModal((prev) => ({ ...prev, network: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">全部网络 (All)</option>
                  <option value="tcp,udp">tcp,udp</option>
                  <option value="tcp">tcp</option>
                  <option value="udp">udp</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                onClick={() => setRuleModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleSaveRule}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all"
              >
                保存规则
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Add DNS Modal */}
      {dnsModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md glass-card bg-slate-900 border border-white/15 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-400" />
                {dnsModal.index !== null ? '编辑 DNS 服务器' : '新增 DNS 服务器'}
              </h3>
              <button
                onClick={() => setDnsModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
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

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
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
