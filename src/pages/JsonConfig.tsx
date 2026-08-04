import React, { useState, useMemo, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import {
  FileCode2,
  Plus,
  Play,
  Check,
  AlertCircle,
  Trash2,
  Copy,
  X,
  Code2,
  Eye,
  ChevronRight,
  List,
  Hash,
  Layers,
  ArrowRight,
  Globe,
  Shield,
  Server,
  Settings,
  Activity,
  Navigation,
  Box,
  Map,
  Tag,
  PanelLeftClose,
  PanelLeftOpen,
  FileDown,
  FileUp,
} from 'lucide-react';
import { save, open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { useConfigStore, TEMPLATE_DEFAULT } from '../stores/useConfigStore';
import { useAppStore } from '../stores/useAppStore';
import { ConfirmModal } from '../components/ConfirmModal';

import {
  getModuleFromConfig,
  setModuleInConfig,
  removeModuleFromConfig,
  addArrayItemInConfig,
  updateArrayItemInConfig,
  removeArrayItemInConfig,
  moveArrayItemInConfig,
  reorderArrayItemInConfig,
  getAvailableModules,
  MODULE_DEFINITIONS,
} from '../utils/configSectionHelper';

// Import Section Components
import { InboundSection } from './config-sections/InboundSection';
import { OutboundSection } from './config-sections/OutboundSection';
import { RoutingSection } from './config-sections/RoutingSection';
import { DnsSection } from './config-sections/DnsSection';
import { LogSection } from './config-sections/LogSection';
import { ApiSection } from './config-sections/ApiSection';
import { FakeDnsSection } from './config-sections/FakeDnsSection';
import { TransportSection } from './config-sections/TransportSection';
import { PolicySection } from './config-sections/PolicySection';
import { StatsSection } from './config-sections/StatsSection';
import { MetricsSection } from './config-sections/MetricsSection';
import { ObservatorySection } from './config-sections/ObservatorySection';
import { GeodataSection } from './config-sections/GeodataSection';
import { VersionSection } from './config-sections/VersionSection';
import { EnvSection } from './config-sections/EnvSection';

// Import Modal Components
import { AddModuleModal } from './config-modals/AddModuleModal';
import { InboundModal } from './config-modals/InboundModal';
import { OutboundModal } from './config-modals/OutboundModal';
import { RoutingRuleModal } from './config-modals/RoutingRuleModal';
import { BalancerModal } from './config-modals/BalancerModal';
import { DnsModal } from './config-modals/DnsModal';
import { LogModal } from './config-modals/LogModal';
import { ApiModal } from './config-modals/ApiModal';
import { FakeDnsModal } from './config-modals/FakeDnsModal';
import { TransportModal } from './config-modals/TransportModal';
import { PolicyModal } from './config-modals/PolicyModal';
import { StatsModal } from './config-modals/StatsModal';
import { MetricsModal } from './config-modals/MetricsModal';
import { ObservatoryModal } from './config-modals/ObservatoryModal';
import { GeodataModal } from './config-modals/GeodataModal';
import { VersionModal } from './config-modals/VersionModal';
import { EnvModal } from './config-modals/EnvModal';
import { SubscriptionImportModal } from './config-modals/SubscriptionImportModal';

export const JsonConfigPage: React.FC = () => {
  const {
    profiles,
    selectedProfileId,
    activeProfileId,
    setSelectedProfileId,
    setActiveProfileId,
    updateProfile,
    addProfile,
    deleteProfile,
    duplicateProfile,
    startActiveKernel,
  } = useConfigStore();

  const { isLeftPanelOpen } = useAppStore();

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.id === selectedProfileId) || profiles[0],
    [profiles, selectedProfileId]
  );

  // Monaco editor ref for TOC navigation
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  }, []);

  const [tocCollapsed, setTocCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');
  const [editorContent, setEditorContent] = useState<string>(selectedProfile?.content || TEMPLATE_DEFAULT);
  const setIsSaved = useState(true)[1];
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Parse top-level keys with line numbers from JSON text
  const topLevelKeys = useMemo(() => {
    const keys: { key: string; line: number }[] = [];
    const lines = editorContent.split('\n');
    let depth = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const stripped = line.replace(/\/\/.*/g, '').trim();
      // Check for top-level key at depth 1 BEFORE counting braces on this line
      if (depth === 1) {
        const match = line.match(/^\s*"([^"]+)"\s*:/);
        if (match) {
          keys.push({ key: match[1], line: i + 1 });
        }
      }
      // Track brace depth
      for (const ch of stripped) {
        if (ch === '{' || ch === '[') depth++;
        if (ch === '}' || ch === ']') depth--;
      }
    }
    return keys;
  }, [editorContent]);

  // TOC key icon & color mapping
  const tocKeyMeta: Record<string, { icon: React.FC<any>; color: string }> = {
    log:         { icon: FileCode2,   color: 'text-sky-400' },
    api:         { icon: Tag,         color: 'text-violet-400' },
    dns:         { icon: Globe,       color: 'text-cyan-400' },
    fakedns:     { icon: Shield,      color: 'text-pink-400' },
    inbounds:    { icon: ArrowRight,  color: 'text-emerald-400' },
    outbounds:   { icon: Navigation,  color: 'text-orange-400' },
    routing:     { icon: Map,         color: 'text-yellow-400' },
    policy:      { icon: Settings,    color: 'text-slate-400' },
    reverse:     { icon: Layers,      color: 'text-indigo-400' },
    transport:   { icon: Server,      color: 'text-teal-400' },
    stats:       { icon: Activity,    color: 'text-lime-400' },
    metrics:     { icon: Activity,    color: 'text-fuchsia-400' },
    observatory: { icon: Hash,        color: 'text-amber-400' },
    burstObservatory: { icon: Hash,   color: 'text-amber-400' },
    geodata:     { icon: Globe,       color: 'text-blue-400' },
    version:     { icon: Tag,         color: 'text-rose-400' },
    env:         { icon: Box,         color: 'text-green-400' },
  };

  const handleTocClick = useCallback((line: number) => {
    if (editorRef.current) {
      editorRef.current.revealLineInCenter(line);
      editorRef.current.setPosition({ lineNumber: line, column: 1 });
      editorRef.current.focus();
    }
  }, []);

  // Sync content when selected profile changes
  React.useEffect(() => {
    if (selectedProfile) {
      setEditorContent(selectedProfile.content);
      setIsSaved(true);
      setJsonError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProfile?.id, selectedProfile?.content]);

  // Profile CRUD Modal
  const [isNewProfileModalOpen, setIsNewProfileModalOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDesc, setNewProfileDesc] = useState('');
  const [newProfileTemplate, setNewProfileTemplate] = useState<'default' | 'empty'>('default');

  // Confirm delete profile modal
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Active Editing Modals state
  const [isAddModuleModalOpen, setIsAddModuleModalOpen] = useState(false);
  const [isSubscriptionImportOpen, setIsSubscriptionImportOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<{
    type: string;
    index?: number;
    initialValue?: any;
  } | null>(null);

  // Parse active profile JSON config
  const parsedConfig = useMemo(() => {
    try {
      return JSON.parse(editorContent);
    } catch {
      return null;
    }
  }, [editorContent]);

  // Module statuses (added/not added)
  const moduleStatuses = useMemo(() => {
    return getAvailableModules(editorContent);
  }, [editorContent]);

  // Handle content update & save
  const handleUpdateContent = (newJsonStr: string) => {
    try {
      JSON.parse(newJsonStr);
      setJsonError(null);
    } catch (err: any) {
      setJsonError(`JSON 语法校验警告: ${err.message}`);
    }
    setEditorContent(newJsonStr);
    if (selectedProfile) {
      updateProfile(selectedProfile.id, { content: newJsonStr });
    }
    setIsSaved(true);
  };

  // Add module trigger
  const handleSelectModuleToAdd = (moduleId: string) => {
    const status = moduleStatuses.find((m) => m.definition.id === moduleId);
    if (status?.isAdded && !status.definition.isArray) {
      // Single object module already added -> open edit modal directly
      const existingVal = getModuleFromConfig(editorContent, moduleId);
      setActiveModal({ type: moduleId, initialValue: existingVal });
      return;
    }

    if (moduleId === 'inbounds') {
      setActiveModal({ type: 'inbound_add', initialValue: MODULE_DEFINITIONS.find((d) => d.id === 'inbounds')?.defaultTemplate });
    } else if (moduleId === 'outbounds') {
      setActiveModal({ type: 'outbound_add', initialValue: MODULE_DEFINITIONS.find((d) => d.id === 'outbounds')?.defaultTemplate });
    } else if (moduleId === 'routing' || moduleId === 'routing.rules') {
      setActiveModal({ type: 'routing_rule_add', initialValue: { type: 'field', outboundTag: 'direct' } });
    } else if (moduleId === 'fakedns') {
      setActiveModal({ type: 'fakedns_add', initialValue: { ipPool: '198.18.0.0/15', poolSize: 65535 } });
    } else {
      // Single object module -> add default template to config JSON and open modal
      const def = MODULE_DEFINITIONS.find((d) => d.id === moduleId);
      if (def) {
        const nextJson = setModuleInConfig(editorContent, moduleId, def.defaultTemplate);
        handleUpdateContent(nextJson);
        setActiveModal({ type: moduleId, initialValue: def.defaultTemplate });
      }
    }
  };

  // Profile management handlers
  const handleCreateProfile = () => {
    const content = newProfileTemplate === 'default' ? TEMPLATE_DEFAULT : '{}';
    const createdId = addProfile({
      name: newProfileName,
      description: newProfileDesc,
      content,
    });
    setSelectedProfileId(createdId);
    setIsNewProfileModalOpen(false);
    setNewProfileName('');
    setNewProfileDesc('');
    setNewProfileTemplate('default');
  };

  // Available outbound options for routing rules
  const availableOutboundOptions = useMemo(() => {
    const outbounds = parsedConfig?.outbounds || [];
    return outbounds.map((ob: any) => ({
      value: ob.tag || 'outbound',
      label: `${ob.tag || 'outbound'} (${ob.protocol || 'freedom'})`,
      protocol: ob.protocol,
    }));
  }, [parsedConfig]);

  return (
    <div className="flex h-full w-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Left Profiles Sidebar Panel */}
      <div className={`border-r border-white/10 bg-slate-950/60 flex flex-col h-full shrink-0 transition-all duration-300 overflow-hidden ${isLeftPanelOpen ? 'w-80' : 'w-0 border-r-0'}`}>
        <div className="p-4 border-b border-white/10 flex items-center gap-2">
          <FileCode2 className="w-5 h-5 text-blue-400" />
          <h2 className="font-bold text-sm tracking-wide text-white">配置文件</h2>
        </div>


        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <button
            onClick={() => setIsNewProfileModalOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-white border border-white/10 rounded-lg transition-all font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            新建
          </button>

          {profiles.map((p) => {
            const isSelected = p.id === selectedProfileId;
            const isActive = p.id === activeProfileId;

            return (
              <div
                key={p.id}
                onClick={() => setSelectedProfileId(p.id)}
                className={`p-2 rounded-lg border transition-all cursor-pointer flex flex-col justify-between group ${
                  isSelected
                    ? 'bg-blue-600/15 border-blue-500/40 shadow-lg shadow-blue-500/10'
                    : 'bg-slate-900/40 border-white/5 hover:bg-white/5'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 font-medium text-xs text-slate-100 truncate">
                    <span>{p.name}</span>
                    {isActive && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded font-semibold shrink-0">
                        <Check className="w-3 h-3" />
                        应用中
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      title="复制此配置副本"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateProfile(p.id);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    {profiles.length > 1 && (
                      <button
                        type="button"
                        title="删除配置"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTargetId(p.id);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 line-clamp-1 mb-1 leading-snug">
                  {p.description}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-white/5">
                  <span>{p.updatedAt}</span>
                  <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-slate-400" />
                </div>
              </div>
            );
          })}

        </div>
      </div>

      {/* Main Container Right */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
        {/* Top Header Controls */}
        <div className="px-6 py-4 border-b border-white/10 bg-slate-900/60 backdrop-blur-xl flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">

            <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>{selectedProfile?.name}</span>
              {selectedProfile?.id === activeProfileId && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                  活动内核配置
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{selectedProfile?.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-800/80 border border-white/10 rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('visual')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'visual'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                可视化结构
              </button>
              <button
                type="button"
                onClick={() => setViewMode('json')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'json'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                JSON 源码
              </button>
            </div>

            {/* Import/Export Buttons */}
            <button
              type="button"
              onClick={async () => {
                if (!selectedProfile) return;
                try {
                  const filePath = await save({
                    title: '导出配置文件',
                    defaultPath: `${selectedProfile.name}.json`,
                    filters: [{ name: 'JSON 配置文件', extensions: ['json'] }],
                  });
                  if (filePath) {
                    await invoke('write_text_file', { path: filePath, content: selectedProfile.content });
                  }
                } catch (err) {
                  console.error('导出失败:', err);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-white border border-white/10 rounded-xl transition-all font-medium"
              title="导出当前配置文件为 JSON"
            >
              <FileUp className="w-3.5 h-3.5" />
              导出
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  const filePath = await open({
                    title: '导入配置文件',
                    filters: [{ name: 'JSON 配置文件', extensions: ['json'] }],
                    multiple: false,
                    directory: false,
                  });
                  if (filePath && typeof filePath === 'string') {
                    const content = await invoke('read_text_file', { path: filePath }) as string;
                    JSON.parse(content);
                    const fileName = filePath.split('/').pop()?.replace(/\.json$/i, '') || '导入的配置';
                    const createdId = addProfile({
                      name: fileName,
                      description: '从文件导入的配置',
                      content,
                    });
                    setSelectedProfileId(createdId);
                  }
                } catch (err: any) {
                  console.error('导入失败:', err);
                  if (err?.message?.includes('JSON')) {
                    alert('导入失败：文件格式无效，请确保是合法的 JSON 配置文件');
                  }
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-white border border-white/10 rounded-xl transition-all font-medium"
              title="从 JSON 文件导入配置"
            >
              <FileDown className="w-3.5 h-3.5" />
              导入
            </button>

            {/* Add Module Button */}
            <button
              type="button"
              onClick={() => setIsAddModuleModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-white border border-white/10 rounded-xl transition-all font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              新增配置
            </button>

            {/* Start Kernel / Apply Profile Button */}
            <button
              type="button"
              onClick={async () => {
                if (selectedProfile) {
                  setActiveProfileId(selectedProfile.id);
                  await startActiveKernel();
                  useAppStore.getState().setCoreRunning(true);
                }
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              启动此配置
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {jsonError && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{jsonError}</span>
            </div>
          )}

          {viewMode === 'visual' ? (
            <div className="space-y-6 max-w-6xl mx-auto pb-12">
              {/* Log Section */}
              {parsedConfig?.log && (
                <LogSection
                  log={parsedConfig.log}
                  onEdit={() => setActiveModal({ type: 'log', initialValue: parsedConfig.log })}
                  onDelete={() => handleUpdateContent(removeModuleFromConfig(editorContent, 'log'))}
                />
              )}

              {/* Inbounds Section */}
              <InboundSection
                inbounds={parsedConfig?.inbounds || []}
                onAddInbound={() => setActiveModal({ type: 'inbound_add' })}
                onEditInbound={(idx) => setActiveModal({ type: 'inbound_edit', index: idx, initialValue: parsedConfig.inbounds[idx] })}
                onDeleteInbound={(idx) => handleUpdateContent(removeArrayItemInConfig(editorContent, 'inbounds', idx))}
                onMoveInbound={(idx, dir) => handleUpdateContent(moveArrayItemInConfig(editorContent, 'inbounds', idx, dir))}
                onReorderInbound={(from, to) => handleUpdateContent(reorderArrayItemInConfig(editorContent, 'inbounds', from, to))}
                onToggleSniffing={(idx) => {
                  const currentInbounds = parsedConfig?.inbounds || [];
                  const targetIb = currentInbounds[idx];
                  if (targetIb) {
                    const currentSniff = targetIb.sniffing?.enabled !== false;
                    const updatedIb = {
                      ...targetIb,
                      sniffing: {
                        enabled: !currentSniff,
                        destOverride: ['http', 'tls', 'quic', 'fakedns'],
                        routeOnly: true,
                      },
                    };
                    handleUpdateContent(updateArrayItemInConfig(editorContent, 'inbounds', idx, updatedIb));
                  }
                }}
              />

              {/* DNS Section */}
              {parsedConfig?.dns && (
                <DnsSection
                  dns={parsedConfig.dns}
                  onEdit={() => setActiveModal({ type: 'dns', initialValue: parsedConfig.dns })}
                  onDelete={() => handleUpdateContent(removeModuleFromConfig(editorContent, 'dns'))}
                  onDeleteServer={(idx) => {
                    try {
                      const config = JSON.parse(editorContent);
                      if (config.dns?.servers && Array.isArray(config.dns.servers)) {
                        config.dns.servers.splice(idx, 1);
                        handleUpdateContent(JSON.stringify(config, null, 2));
                      }
                    } catch { /* ignore */ }
                  }}
                />
              )}

              {/* Routing Section */}
              <RoutingSection
                routing={parsedConfig?.routing}
                onAddRule={() => setActiveModal({ type: 'routing_rule_add' })}
                onEditRule={(idx) => setActiveModal({ type: 'routing_rule_edit', index: idx, initialValue: parsedConfig?.routing?.rules?.[idx] })}
                onDeleteRule={(idx) => handleUpdateContent(removeArrayItemInConfig(editorContent, 'routing.rules', idx))}
                onToggleRuleEnabled={(idx) => {
                  const rules = parsedConfig?.routing?.rules || [];
                  const targetRule = rules[idx];
                  if (targetRule) {
                    const updatedRule = { ...targetRule, enabled: targetRule.enabled === false };
                    handleUpdateContent(updateArrayItemInConfig(editorContent, 'routing.rules', idx, updatedRule));
                  }
                }}
                onMoveRule={(idx, dir) => handleUpdateContent(moveArrayItemInConfig(editorContent, 'routing.rules', idx, dir))}
                onEditDomainStrategy={(val) => {
                  try {
                    const config = JSON.parse(editorContent || '{}');
                    if (config.routing) config.routing.domainStrategy = val;
                    handleUpdateContent(JSON.stringify(config, null, 2));
                  } catch { /* ignore */ }
                }}
                onEditDomainMatcher={(val) => {
                  try {
                    const config = JSON.parse(editorContent || '{}');
                    if (config.routing) {
                      if (val) config.routing.domainMatcher = val;
                      else delete config.routing.domainMatcher;
                    }
                    handleUpdateContent(JSON.stringify(config, null, 2));
                  } catch { /* ignore */ }
                }}
                onAddBalancer={() => setActiveModal({ type: 'balancer_add' })}
                onEditBalancer={(idx) => setActiveModal({ type: 'balancer_edit', index: idx, initialValue: parsedConfig?.routing?.balancers?.[idx] })}
                onDeleteBalancer={(idx) => handleUpdateContent(removeArrayItemInConfig(editorContent, 'routing.balancers', idx))}
              />

              {/* Outbounds Section */}
              <OutboundSection
                outbounds={parsedConfig?.outbounds || []}
                onAddOutbound={() => setActiveModal({ type: 'outbound_add' })}
                onEditOutbound={(idx) => setActiveModal({ type: 'outbound_edit', index: idx, initialValue: parsedConfig.outbounds[idx] })}
                onDeleteOutbound={(idx) => handleUpdateContent(removeArrayItemInConfig(editorContent, 'outbounds', idx))}
                onMoveOutbound={(idx, dir) => handleUpdateContent(moveArrayItemInConfig(editorContent, 'outbounds', idx, dir))}
                onReorderOutbound={(from, to) => handleUpdateContent(reorderArrayItemInConfig(editorContent, 'outbounds', from, to))}
                onImportSubscription={() => setIsSubscriptionImportOpen(true)}
              />

              {/* Api Section */}
              {parsedConfig?.api && (
                <ApiSection
                  api={parsedConfig.api}
                  onEdit={() => setActiveModal({ type: 'api', initialValue: parsedConfig.api })}
                  onDelete={() => handleUpdateContent(removeModuleFromConfig(editorContent, 'api'))}
                />
              )}

              {/* FakeDNS Section */}
              {Array.isArray(parsedConfig?.fakedns) && (
                <FakeDnsSection
                  fakedns={parsedConfig.fakedns}
                  onAdd={() => setActiveModal({ type: 'fakedns_add' })}
                  onEdit={(idx) => setActiveModal({ type: 'fakedns_edit', index: idx, initialValue: parsedConfig.fakedns[idx] })}
                  onDelete={(idx) => handleUpdateContent(removeArrayItemInConfig(editorContent, 'fakedns', idx))}
                  onRemoveModule={() => handleUpdateContent(removeModuleFromConfig(editorContent, 'fakedns'))}
                />
              )}

              {/* Transport Section */}
              {parsedConfig?.transport && (
                <TransportSection
                  transport={parsedConfig.transport}
                  onEdit={() => setActiveModal({ type: 'transport', initialValue: parsedConfig.transport })}
                  onDelete={() => handleUpdateContent(removeModuleFromConfig(editorContent, 'transport'))}
                />
              )}

              {/* Policy Section */}
              {parsedConfig?.policy && (
                <PolicySection
                  policy={parsedConfig.policy}
                  onEdit={() => setActiveModal({ type: 'policy', initialValue: parsedConfig.policy })}
                  onDelete={() => handleUpdateContent(removeModuleFromConfig(editorContent, 'policy'))}
                />
              )}

              {/* Stats Section */}
              {parsedConfig?.stats && (
                <StatsSection
                  onDelete={() => handleUpdateContent(removeModuleFromConfig(editorContent, 'stats'))}
                />
              )}

              {/* Metrics Section */}
              {parsedConfig?.metrics && (
                <MetricsSection
                  metrics={parsedConfig.metrics}
                  onEdit={() => setActiveModal({ type: 'metrics', initialValue: parsedConfig.metrics })}
                  onDelete={() => handleUpdateContent(removeModuleFromConfig(editorContent, 'metrics'))}
                />
              )}

              {/* Observatory Section */}
              {(parsedConfig?.observatory || parsedConfig?.burstObservatory) && (
                <ObservatorySection
                  observatory={parsedConfig?.observatory}
                  burstObservatory={parsedConfig?.burstObservatory}
                  onEdit={() => setActiveModal({ type: 'observatory', initialValue: { observatory: parsedConfig?.observatory, burstObservatory: parsedConfig?.burstObservatory } })}
                  onDelete={() => {
                    let nextStr = removeModuleFromConfig(editorContent, 'observatory');
                    nextStr = removeModuleFromConfig(nextStr, 'burstObservatory');
                    handleUpdateContent(nextStr);
                  }}
                />
              )}

              {/* Geodata Section */}
              {parsedConfig?.geodata && (
                <GeodataSection
                  geodata={parsedConfig.geodata}
                  onEdit={() => setActiveModal({ type: 'geodata', initialValue: parsedConfig.geodata })}
                  onDelete={() => handleUpdateContent(removeModuleFromConfig(editorContent, 'geodata'))}
                />
              )}

              {/* Version Section */}
              {parsedConfig?.version && (
                <VersionSection
                  version={parsedConfig.version}
                  onEdit={() => setActiveModal({ type: 'version', initialValue: parsedConfig.version })}
                  onDelete={() => handleUpdateContent(removeModuleFromConfig(editorContent, 'version'))}
                />
              )}

              {/* Env Section */}
              {parsedConfig?.env && (
                <EnvSection
                  env={parsedConfig.env}
                  onEdit={() => setActiveModal({ type: 'env', initialValue: parsedConfig.env })}
                  onDelete={() => handleUpdateContent(removeModuleFromConfig(editorContent, 'env'))}
                />
              )}
            </div>
          ) : (
            <div className="flex h-full min-h-[500px] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              {/* TOC Sidebar */}
              {topLevelKeys.length > 0 && (
                <div className={`${tocCollapsed ? 'w-11' : 'w-44'} shrink-0 bg-slate-900/80 border-r border-white/10 flex flex-col transition-all duration-200`}>
                  <div className={`${tocCollapsed ? 'px-1.5 justify-center' : 'px-3'} py-2 border-b border-white/10 flex items-center gap-1.5`}>
                    {!tocCollapsed && (
                      <>
                        <List className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="text-[11px] font-semibold text-slate-300 tracking-wide flex-1">目录导航</span>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setTocCollapsed(!tocCollapsed)}
                      className={`p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors ${tocCollapsed ? '' : 'shrink-0'}`}
                      title={tocCollapsed ? '展开目录' : '收起目录'}
                    >
                      {tocCollapsed ? <PanelLeftOpen className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className={`flex-1 overflow-y-auto py-1.5 space-y-0.5 ${tocCollapsed ? 'px-1' : 'px-1.5'}`}>
                    {topLevelKeys.map(({ key, line }) => {
                      const meta = tocKeyMeta[key];
                      const Icon = meta?.icon || Hash;
                      const iconColor = meta?.color || 'text-slate-400';
                      return (
                        <button
                          key={`${key}-${line}`}
                          type="button"
                          onClick={() => handleTocClick(line)}
                          className={`w-full flex items-center gap-2 py-1.5 rounded-lg text-left text-[11px] font-medium text-slate-300 hover:bg-white/8 hover:text-white transition-colors group ${
                            tocCollapsed ? 'px-0 justify-center' : 'px-2'
                          }`}
                          title={tocCollapsed ? `${key} (第 ${line} 行)` : `跳转到第 ${line} 行`}
                        >
                          <Icon className={`w-3 h-3 shrink-0 ${iconColor}`} />
                          {!tocCollapsed && (
                            <>
                              <span className="truncate flex-1">{key}</span>
                              <span className="text-[9px] text-slate-500 group-hover:text-slate-400 tabular-nums">L{line}</span>
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Editor */}
              <div className="flex-1 min-w-0">
                <Editor
                  height="100%"
                  defaultLanguage="json"
                  theme="vs-dark"
                  value={editorContent}
                  onChange={(val) => handleUpdateContent(val || '')}
                  onMount={handleEditorDidMount}
                  options={{
                    minimap: { enabled: true },
                    fontSize: 13,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Module Modal */}
      <AddModuleModal
        isOpen={isAddModuleModalOpen}
        onClose={() => setIsAddModuleModalOpen(false)}
        moduleStatuses={moduleStatuses}
        onSelectModule={handleSelectModuleToAdd}
      />

      {/* Inbound Modal */}
      <InboundModal
        isOpen={activeModal?.type === 'inbound_add' || activeModal?.type === 'inbound_edit'}
        onClose={() => setActiveModal(null)}
        initialValue={activeModal?.initialValue}
        onSave={(val) => {
          if (activeModal?.type === 'inbound_edit' && typeof activeModal.index === 'number') {
            handleUpdateContent(updateArrayItemInConfig(editorContent, 'inbounds', activeModal.index, val));
          } else {
            handleUpdateContent(addArrayItemInConfig(editorContent, 'inbounds', val));
          }
        }}
      />

      {/* Outbound Modal */}
      <OutboundModal
        isOpen={activeModal?.type === 'outbound_add' || activeModal?.type === 'outbound_edit'}
        onClose={() => setActiveModal(null)}
        initialValue={activeModal?.initialValue}
        onSave={(val) => {
          if (activeModal?.type === 'outbound_edit' && typeof activeModal.index === 'number') {
            handleUpdateContent(updateArrayItemInConfig(editorContent, 'outbounds', activeModal.index, val));
          } else {
            handleUpdateContent(addArrayItemInConfig(editorContent, 'outbounds', val));
          }
        }}
      />

      {/* Routing Rule Modal */}
      <RoutingRuleModal
        isOpen={activeModal?.type === 'routing_rule_add' || activeModal?.type === 'routing_rule_edit'}
        onClose={() => setActiveModal(null)}
        initialValue={activeModal?.initialValue}
        availableOutboundOptions={availableOutboundOptions}
        onSave={(val) => {
          if (activeModal?.type === 'routing_rule_edit' && typeof activeModal.index === 'number') {
            handleUpdateContent(updateArrayItemInConfig(editorContent, 'routing.rules', activeModal.index, val));
          } else {
            handleUpdateContent(addArrayItemInConfig(editorContent, 'routing.rules', val));
          }
        }}
      />

      {/* Balancer Modal */}
      <BalancerModal
        isOpen={activeModal?.type === 'balancer_add' || activeModal?.type === 'balancer_edit'}
        onClose={() => setActiveModal(null)}
        initialValue={activeModal?.initialValue}
        availableOutboundOptions={availableOutboundOptions}
        existingTags={(parsedConfig?.routing?.balancers || []).map((b: any) => b.tag).filter(Boolean)}
        onSave={(val) => {
          if (activeModal?.type === 'balancer_edit' && typeof activeModal.index === 'number') {
            handleUpdateContent(updateArrayItemInConfig(editorContent, 'routing.balancers', activeModal.index, val));
          } else {
            handleUpdateContent(addArrayItemInConfig(editorContent, 'routing.balancers', val));
          }
        }}
      />

      {/* DNS Modal */}
      <DnsModal
        isOpen={activeModal?.type === 'dns'}
        onClose={() => setActiveModal(null)}
        initialValue={activeModal?.initialValue}
        onSave={(val) => handleUpdateContent(setModuleInConfig(editorContent, 'dns', val))}
      />

      {/* Log Modal */}
      <LogModal
        isOpen={activeModal?.type === 'log'}
        onClose={() => setActiveModal(null)}
        initialValue={activeModal?.initialValue}
        onSave={(val) => handleUpdateContent(setModuleInConfig(editorContent, 'log', val))}
      />

      {/* Api Modal */}
      <ApiModal
        isOpen={activeModal?.type === 'api'}
        onClose={() => setActiveModal(null)}
        initialValue={activeModal?.initialValue}
        onSave={(val) => handleUpdateContent(setModuleInConfig(editorContent, 'api', val))}
      />

      {/* FakeDNS Modal */}
      <FakeDnsModal
        isOpen={activeModal?.type === 'fakedns_add' || activeModal?.type === 'fakedns_edit'}
        onClose={() => setActiveModal(null)}
        initialValue={activeModal?.initialValue}
        onSave={(val) => {
          if (activeModal?.type === 'fakedns_edit' && typeof activeModal.index === 'number') {
            handleUpdateContent(updateArrayItemInConfig(editorContent, 'fakedns', activeModal.index, val));
          } else {
            handleUpdateContent(addArrayItemInConfig(editorContent, 'fakedns', val));
          }
        }}
      />

      {/* Transport Modal */}
      <TransportModal
        isOpen={activeModal?.type === 'transport'}
        onClose={() => setActiveModal(null)}
        initialValue={activeModal?.initialValue}
        onSave={(val) => handleUpdateContent(setModuleInConfig(editorContent, 'transport', val))}
      />

      {/* Policy Modal */}
      <PolicyModal
        isOpen={activeModal?.type === 'policy'}
        onClose={() => setActiveModal(null)}
        initialValue={activeModal?.initialValue}
        onSave={(val) => handleUpdateContent(setModuleInConfig(editorContent, 'policy', val))}
      />

      {/* Stats Modal */}
      <StatsModal
        isOpen={activeModal?.type === 'stats'}
        onClose={() => setActiveModal(null)}
        onSave={(val) => handleUpdateContent(setModuleInConfig(editorContent, 'stats', val))}
      />

      {/* Metrics Modal */}
      <MetricsModal
        isOpen={activeModal?.type === 'metrics'}
        onClose={() => setActiveModal(null)}
        initialValue={activeModal?.initialValue}
        onSave={(val) => handleUpdateContent(setModuleInConfig(editorContent, 'metrics', val))}
      />

      {/* Observatory Modal */}
      <ObservatoryModal
        isOpen={activeModal?.type === 'observatory'}
        onClose={() => setActiveModal(null)}
        initialValue={activeModal?.initialValue}
        onSave={({ observatory, burstObservatory }) => {
          let nextStr = editorContent;
          if (observatory) {
            nextStr = setModuleInConfig(nextStr, 'observatory', observatory);
            nextStr = removeModuleFromConfig(nextStr, 'burstObservatory');
          } else if (burstObservatory) {
            nextStr = setModuleInConfig(nextStr, 'burstObservatory', burstObservatory);
            nextStr = removeModuleFromConfig(nextStr, 'observatory');
          } else {
            nextStr = removeModuleFromConfig(nextStr, 'observatory');
            nextStr = removeModuleFromConfig(nextStr, 'burstObservatory');
          }
          handleUpdateContent(nextStr);
        }}
      />

      {/* Geodata Modal */}
      <GeodataModal
        isOpen={activeModal?.type === 'geodata'}
        onClose={() => setActiveModal(null)}
        initialValue={activeModal?.initialValue}
        onSave={(val) => handleUpdateContent(setModuleInConfig(editorContent, 'geodata', val))}
      />

      {/* Version Modal */}
      <VersionModal
        isOpen={activeModal?.type === 'version'}
        onClose={() => setActiveModal(null)}
        initialValue={activeModal?.initialValue}
        onSave={(val) => handleUpdateContent(setModuleInConfig(editorContent, 'version', val))}
      />

      {/* Env Modal */}
      <EnvModal
        isOpen={activeModal?.type === 'env'}
        onClose={() => setActiveModal(null)}
        initialValue={activeModal?.initialValue}
        onSave={(val) => handleUpdateContent(setModuleInConfig(editorContent, 'env', val))}
      />

      {/* Subscription Import Modal */}
      <SubscriptionImportModal
        isOpen={isSubscriptionImportOpen}
        onClose={() => setIsSubscriptionImportOpen(false)}
        onImport={(nodes) => {
          let currentContent = editorContent;
          for (const node of nodes) {
            currentContent = addArrayItemInConfig(currentContent, 'outbounds', node);
          }
          handleUpdateContent(currentContent);
        }}
      />

      {/* New Profile Modal */}
      {isNewProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900/98 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg text-white">新建配置文件</h3>
              <button
                onClick={() => setIsNewProfileModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">配置名称</label>
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="如: 我的专线节点配置"
                className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">描述说明</label>
              <input
                type="text"
                value={newProfileDesc}
                onChange={(e) => setNewProfileDesc(e.target.value)}
                placeholder="描述此配置文件的应用场景..."
                className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">初始模板</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'default' as const, name: '默认配置', desc: 'TUN + Mixed 入站，国内外分流' },
                  { id: 'empty' as const, name: '空白配置', desc: '从零开始自定义' },
                ].map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setNewProfileTemplate(tpl.id)}
                    className={`py-2.5 px-3 rounded-xl border text-left transition-all ${
                      newProfileTemplate === tpl.id
                        ? 'bg-blue-600/20 border-blue-500/40'
                        : 'bg-slate-950/40 border-white/10 hover:bg-white/5'
                    }`}
                  >
                    <div className={`text-xs font-medium ${
                      newProfileTemplate === tpl.id ? 'text-blue-300' : 'text-slate-300'
                    }`}>{tpl.name}</div>
                    <div className={`text-[10px] mt-0.5 ${
                      newProfileTemplate === tpl.id ? 'text-blue-400/70' : 'text-slate-500'
                    }`}>{tpl.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsNewProfileModalOpen(false)}
                className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-800/80 rounded-xl font-medium"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleCreateProfile}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium shadow-lg shadow-blue-600/20"
              >
                创建配置文件
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (deleteTargetId) {
            deleteProfile(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        title="确认删除该配置文件？"
        message="此操作不可恢复，删除后将永久丢失该配置的文本及结构内容。"
      />
    </div>
  );
};

export default JsonConfigPage;
