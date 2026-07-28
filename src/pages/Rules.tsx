import React, { useState, useEffect } from 'react';
import {
  ArrowRightLeft,
  Plus,
  Trash2,
  Edit3,
  ChevronUp,
  ChevronDown,
  Copy,
  X,
  Search,
  Sliders,
  CheckSquare,
  Square,
  Power,
  PowerOff,
  Activity,
  Layers,
} from 'lucide-react';
import type { RoutingRule, XrayBalancer } from '../types';
import { useProxyStore } from '../stores/useProxyStore';
import { useConfigStore } from '../stores/useConfigStore';
import { OutboundSelect } from '../components/OutboundSelect';
import { ConfirmModal } from '../components/ConfirmModal';
import { RoutingVisualizer } from '../components/RoutingVisualizer';

const DEFAULT_RULES: RoutingRule[] = [
  {
    id: 'rule-cn-domain',
    type: 'field',
    outboundTag: 'direct',
    domain: ['geosite:cn', 'geosite:private', 'domain:baidu.com', 'domain:qq.com'],
    enabled: true,
    description: '中国大陆常见域名与局域网 (直连)',
  },
  {
    id: 'rule-cn-ip',
    type: 'field',
    outboundTag: 'direct',
    ip: ['geoip:cn', 'geoip:private'],
    enabled: true,
    description: '中国大陆 IP 与局域网 (直连)',
  },
  {
    id: 'rule-ads',
    type: 'field',
    outboundTag: 'block',
    domain: ['geosite:category-ads-all'],
    enabled: true,
    description: '全网广告与追踪域名拦截 (拒绝)',
  },
  {
    id: 'rule-global',
    type: 'field',
    outboundTag: 'proxy',
    domain: ['geosite:google', 'geosite:github', 'geosite:gfw', 'geosite:openai', 'geosite:telegram'],
    enabled: true,
    description: '常用国外与代理域名',
  },
];

export const RulesPage: React.FC = () => {
  const { proxyGroups, profiles } = useProxyStore();
  const { profiles: configProfiles, selectedProfileId, activeProfileId, updateProfile } = useConfigStore();
  const targetConfigProfile = configProfiles.find((p) => p.id === (selectedProfileId || activeProfileId)) || configProfiles[0];

  const allNodes = profiles.flatMap((p) => p.nodes);
  const activeNodeName = allNodes[0] ? (allNodes[0].name ? `${allNodes[0].name} [${allNodes[0].id.slice(-4)}]` : allNodes[0].name) : 'direct';

  const [rules, setRules] = useState<RoutingRule[]>(() =>
    DEFAULT_RULES.map((r) => (r.outboundTag === 'proxy' ? { ...r, outboundTag: activeNodeName } : r))
  );
  const [domainStrategy, setDomainStrategy] = useState<'IPIfNonMatch' | 'AsIs' | 'IPOnDemand'>('IPIfNonMatch');
  const [domainMatcher, setDomainMatcher] = useState<'hybrid' | 'linear' | 'mph'>('hybrid');
  const [balancers, setBalancers] = useState<XrayBalancer[]>([]);
  const [pageViewMode, setPageViewMode] = useState<'list' | 'visualizer'>('list');

  const [searchQuery, setSearchQuery] = useState('');
  const [activeOpenRuleId, setActiveOpenRuleId] = useState<string | null>(null);

  // Multi-select state
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>([]);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (!targetConfigProfile?.content) return;
    try {
      const parsed = JSON.parse(targetConfigProfile.content);
      if (parsed?.routing) {
        if (parsed.routing.domainStrategy) setDomainStrategy(parsed.routing.domainStrategy);
        if (parsed.routing.domainMatcher) setDomainMatcher(parsed.routing.domainMatcher);
        if (parsed.routing.balancers && Array.isArray(parsed.routing.balancers)) {
          setBalancers(parsed.routing.balancers);
        }

        if (parsed.routing.rules && Array.isArray(parsed.routing.rules)) {
          const loaded: RoutingRule[] = parsed.routing.rules.map((r: any, idx: number) => {
            let tag = r.outboundTag || 'direct';
            if (tag === 'proxy') {
              tag = activeNodeName;
            }
            return {
              id: r.id || `rule-${idx}`,
              type: r.type || 'field',
              outboundTag: tag,
              balancerTag: r.balancerTag,
              domain: r.domain,
              ip: r.ip,
              port: r.port,
              sourcePort: r.sourcePort,
              network: r.network,
              source: r.source,
              user: r.user,
              inboundTag: r.inboundTag,
              protocol: r.protocol,
              attributes: r.attributes,
              enabled: r.enabled !== false,
              description:
                r.description ||
                (r.domain?.includes('geosite:cn') || r.ip?.includes('geoip:cn')
                  ? '中国大陆域名/IP'
                  : r.domain?.includes('geosite:category-ads-all')
                  ? '全网广告与追踪域名拦截'
                  : '自定义分流规则'),
            };
          });
          setRules(loaded);
        }
      }
    } catch {
      // fallback
    }
  }, [targetConfigProfile?.content, activeNodeName]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<RoutingRule | null>(null);

  const updateRulesAndSync = (newRules: RoutingRule[]) => {
    setRules(newRules);
    if (!targetConfigProfile) return;

    try {
      const config = JSON.parse(targetConfigProfile.content || '{}');
      if (!config.routing) {
        config.routing = { domainStrategy, domainMatcher, rules: [] };
      }
      const xrayRules = newRules.map((r) => ({
        type: r.type || 'field',
        outboundTag: r.outboundTag || undefined,
        balancerTag: r.balancerTag || undefined,
        description: r.description || undefined,
        domain: r.domain && r.domain.length > 0 ? r.domain : undefined,
        ip: r.ip && r.ip.length > 0 ? r.ip : undefined,
        port: r.port || undefined,
        sourcePort: r.sourcePort || undefined,
        network: r.network || undefined,
        source: r.source && r.source.length > 0 ? r.source : undefined,
        user: r.user && r.user.length > 0 ? r.user : undefined,
        inboundTag: r.inboundTag && r.inboundTag.length > 0 ? r.inboundTag : undefined,
        protocol: r.protocol && r.protocol.length > 0 ? r.protocol : undefined,
        attributes: r.attributes && Object.keys(r.attributes).length > 0 ? r.attributes : undefined,
        enabled: r.enabled !== false,
      }));
      config.routing.rules = xrayRules;
      config.routing.domainStrategy = domainStrategy;
      config.routing.domainMatcher = domainMatcher;
      if (balancers.length > 0) {
        config.routing.balancers = balancers;
      }
      updateProfile(targetConfigProfile.id, { content: JSON.stringify(config, null, 2) });
    } catch {
      // ignore
    }
  };

  const handleUpdateDomainStrategy = (newStrat: 'IPIfNonMatch' | 'AsIs' | 'IPOnDemand') => {
    setDomainStrategy(newStrat);
    if (!targetConfigProfile) return;
    try {
      const config = JSON.parse(targetConfigProfile.content || '{}');
      if (!config.routing) config.routing = {};
      config.routing.domainStrategy = newStrat;
      updateProfile(targetConfigProfile.id, { content: JSON.stringify(config, null, 2) });
    } catch {}
  };

  const handleUpdateDomainMatcher = (newMatcher: 'hybrid' | 'linear' | 'mph') => {
    setDomainMatcher(newMatcher);
    if (!targetConfigProfile) return;
    try {
      const config = JSON.parse(targetConfigProfile.content || '{}');
      if (!config.routing) config.routing = {};
      config.routing.domainMatcher = newMatcher;
      updateProfile(targetConfigProfile.id, { content: JSON.stringify(config, null, 2) });
    } catch {}
  };

  const handleUpdateBalancers = (newBalancers: XrayBalancer[]) => {
    setBalancers(newBalancers);
    if (!targetConfigProfile) return;
    try {
      const config = JSON.parse(targetConfigProfile.content || '{}');
      if (!config.routing) config.routing = {};
      config.routing.balancers = newBalancers;
      updateProfile(targetConfigProfile.id, { content: JSON.stringify(config, null, 2) });
    } catch {}
  };

  const filteredRules = rules.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      r.description?.toLowerCase().includes(q) ||
      r.outboundTag?.toLowerCase().includes(q) ||
      r.balancerTag?.toLowerCase().includes(q) ||
      r.domain?.some((d) => d.toLowerCase().includes(q)) ||
      r.ip?.some((ip) => ip.toLowerCase().includes(q))
    );
  });

  // Multi-select actions
  const isAllSelected =
    filteredRules.length > 0 &&
    filteredRules.every((r) => selectedRuleIds.includes(r.id));

  const toggleSelectRule = (id: string) => {
    setSelectedRuleIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const filteredIds = new Set(filteredRules.map((r) => r.id));
      setSelectedRuleIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const filteredIds = filteredRules.map((r) => r.id);
      setSelectedRuleIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleBatchEnable = () => {
    if (selectedRuleIds.length === 0) return;
    const selectedSet = new Set(selectedRuleIds);
    const newRules = rules.map((r) =>
      selectedSet.has(r.id) ? { ...r, enabled: true } : r
    );
    updateRulesAndSync(newRules);
  };

  const handleBatchDisable = () => {
    if (selectedRuleIds.length === 0) return;
    const selectedSet = new Set(selectedRuleIds);
    const newRules = rules.map((r) =>
      selectedSet.has(r.id) ? { ...r, enabled: false } : r
    );
    updateRulesAndSync(newRules);
  };

  const handleBatchDelete = () => {
    if (selectedRuleIds.length === 0) return;
    setIsBatchDeleteModalOpen(true);
  };

  const handleConfirmBatchDelete = () => {
    const selectedSet = new Set(selectedRuleIds);
    const newRules = rules.filter((r) => !selectedSet.has(r.id));
    updateRulesAndSync(newRules);
    setSelectedRuleIds([]);
    setIsBatchDeleteModalOpen(false);
  };

  const handleOpenCreateModal = () => {
    setEditingRule(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rule: RoutingRule) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  const handleToggleEnable = (id: string) => {
    updateRulesAndSync(rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };

  const handleDeleteRule = (rule: RoutingRule) => {
    setDeletingRule(rule);
  };

  const handleConfirmDeleteRule = () => {
    if (deletingRule) {
      updateRulesAndSync(rules.filter((r) => r.id !== deletingRule.id));
      setSelectedRuleIds((prev) => prev.filter((id) => id !== deletingRule.id));
      setDeletingRule(null);
    }
  };

  const handleClone = (rule: RoutingRule) => {
    const cloned: RoutingRule = {
      ...rule,
      id: `rule-${Date.now()}`,
      description: `${rule.description} (副本)`,
    };
    updateRulesAndSync([cloned, ...rules]);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newRules = [...rules];
    const temp = newRules[index - 1];
    newRules[index - 1] = newRules[index];
    newRules[index] = temp;
    updateRulesAndSync(newRules);
  };

  const handleMoveDown = (index: number) => {
    if (index === rules.length - 1) return;
    const newRules = [...rules];
    const temp = newRules[index + 1];
    newRules[index + 1] = newRules[index];
    newRules[index] = temp;
    updateRulesAndSync(newRules);
  };

  const handleSaveRule = (savedRule: RoutingRule) => {
    if (editingRule) {
      updateRulesAndSync(rules.map((r) => (r.id === savedRule.id ? savedRule : r)));
    } else {
      updateRulesAndSync([savedRule, ...rules]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-blue-400" />
            高级分流与 Geo 规则构造引擎
          </h2>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Main View Switcher */}
          <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setPageViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                pageViewMode === 'list'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>分流规则列表</span>
            </button>

            <button
              onClick={() => setPageViewMode('visualizer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                pageViewMode === 'visualizer'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-cyan-300" />
              <span>路由拓扑与匹配仿真</span>
            </button>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/20 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>新建规则</span>
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: LIST MODE */}
      {pageViewMode === 'list' ? (
        <div className="space-y-6 animate-fade-in">
          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-white/5">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 hover:border-blue-500/50 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer shrink-0"
                title={isAllSelected ? '取消全选' : '全选当前规则'}
              >
                {isAllSelected ? (
                  <CheckSquare className="w-4 h-4 text-blue-400" />
                ) : (
                  <Square className="w-4 h-4 text-slate-500" />
                )}
                <span>{isAllSelected ? '取消全选' : '全选'}</span>
              </button>

              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-white/10 flex-1 sm:w-80">
                <Search className="w-4 h-4 text-slate-500 shrink-0" />
                <input
                  type="text"
                  placeholder="搜索规则描述、域名关键字、IP或代理组..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none w-full font-mono"
                />
              </div>
            </div>

            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline-block">
              共 {rules.length} 条路由规则 (按优先级自上而下第一匹配)
            </span>
          </div>

          {/* Batch Actions Bar */}
          {selectedRuleIds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-blue-950/40 border border-blue-500/30 p-3 rounded-xl animate-fade-in backdrop-blur-sm shadow-lg shadow-blue-950/20">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-xs font-bold text-blue-200">
                  已选中 <span className="text-white underline decoration-blue-400 font-mono">{selectedRuleIds.length}</span> 条路由规则
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleBatchEnable}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>批量启用</span>
                </button>

                <button
                  onClick={handleBatchDisable}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 text-xs font-bold transition-all cursor-pointer"
                >
                  <PowerOff className="w-3.5 h-3.5" />
                  <span>批量关闭</span>
                </button>

                <button
                  onClick={handleBatchDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>批量删除</span>
                </button>

                <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />

                <button
                  onClick={() => setSelectedRuleIds([])}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/5 text-xs transition-colors cursor-pointer"
                >
                  取消选择
                </button>
              </div>
            </div>
          )}

          {/* Rules List */}
          <div className="space-y-3">
            {filteredRules.map((rule, idx) => {
              const isDropdownOpen = activeOpenRuleId === rule.id;
              const isSelected = selectedRuleIds.includes(rule.id);
              return (
                <div
                  key={rule.id}
                  style={{ zIndex: isDropdownOpen ? 50 : rules.length - idx }}
                  className={`glass-card relative p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 transition-all ${
                    isSelected
                      ? 'border-blue-500/50 bg-blue-950/20 ring-1 ring-blue-500/30'
                      : rule.enabled
                      ? 'border-white/10 bg-slate-900/40'
                      : 'border-white/5 opacity-50 bg-slate-950/40'
                  }`}
                >
                  <div className="flex items-center gap-3 shrink-0 min-w-0 max-w-full">
                    {/* Multi-select Checkbox */}
                    <button
                      onClick={() => toggleSelectRule(rule.id)}
                      className="p-1 rounded-md text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                      title={isSelected ? '取消选择' : '选择规则'}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600 hover:text-slate-400" />
                      )}
                    </button>

                    {/* Order index badge & Priority controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="w-6 h-6 rounded-lg bg-slate-950 border border-white/10 text-slate-300 font-mono text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => handleMoveUp(idx)}
                          disabled={idx === 0}
                          className="p-0.5 text-slate-500 hover:text-white disabled:opacity-20 transition-colors cursor-pointer"
                          title="向上调高优先级"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveDown(idx)}
                          disabled={idx === rules.length - 1}
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
                        {rule.description}
                      </h4>
                    </div>
                  </div>

                  {/* Outbound Quick Target & Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 sm:ml-auto">
                    {/* Outbound Target Select */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-slate-400 text-xs font-semibold shrink-0">出站:</span>
                      <OutboundSelect
                        value={rule.outboundTag || rule.balancerTag || 'direct'}
                        onChange={(val) => {
                          const newRules = rules.map((r) => (r.id === rule.id ? { ...r, outboundTag: val, balancerTag: undefined } : r));
                          updateRulesAndSync(newRules);
                        }}
                        onOpenChange={(open) => setActiveOpenRuleId(open ? rule.id : null)}
                        proxyGroups={proxyGroups}
                        allNodes={allNodes}
                        size="sm"
                      />
                    </div>

                    {/* Actions: Enable Toggle, Edit, Clone, Delete */}
                    <button
                      onClick={() => handleToggleEnable(rule.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        rule.enabled
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-900 text-slate-500 border-white/5'
                      }`}
                    >
                      {rule.enabled ? '启用' : '禁用'}
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(rule)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/5 transition-colors cursor-pointer"
                      title="编辑高级规则"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleClone(rule)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-blue-400 border border-white/5 transition-colors cursor-pointer"
                      title="克隆此规则"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteRule(rule)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-600/20 text-slate-500 hover:text-rose-400 border border-white/5 transition-colors cursor-pointer"
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
      ) : (
        /* VIEW MODE 2: VISUALIZER MODE */
        <RoutingVisualizer
          rules={rules}
          domainStrategy={domainStrategy}
          domainMatcher={domainMatcher}
          balancers={balancers}
          proxyGroups={proxyGroups}
          allNodes={allNodes}
          onUpdateDomainStrategy={handleUpdateDomainStrategy}
          onUpdateDomainMatcher={handleUpdateDomainMatcher}
          onUpdateBalancers={handleUpdateBalancers}
        />
      )}

      {/* Advanced Rule Creation & Editing Modal */}
      {isModalOpen && (
        <AdvancedRuleModal
          editingRule={editingRule}
          proxyGroups={proxyGroups}
          allNodes={allNodes}
          balancers={balancers}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveRule}
        />
      )}

      {/* Delete Single Rule Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingRule}
        title="删除分流规则"
        message={
          <span>
            确定要删除该条分流规则（Target: <strong className="text-rose-400 font-semibold">{deletingRule?.outboundTag || deletingRule?.balancerTag}</strong>）吗？删除后配置无法撤销。
          </span>
        }
        confirmText="确认删除"
        onConfirm={handleConfirmDeleteRule}
        onCancel={() => setDeletingRule(null)}
      />

      {/* Delete Multiple Rules Confirmation Modal */}
      <ConfirmModal
        isOpen={isBatchDeleteModalOpen}
        title="批量删除分流规则"
        message={
          <span>
            确定要批量删除选中的 <strong className="text-rose-400 font-semibold">{selectedRuleIds.length}</strong> 条分流规则吗？删除后配置无法撤销。
          </span>
        }
        confirmText="确认批量删除"
        onConfirm={handleConfirmBatchDelete}
        onCancel={() => setIsBatchDeleteModalOpen(false)}
      />
    </div>
  );
};

// Subcomponent: AdvancedRuleModal
interface AdvancedRuleModalProps {
  editingRule: RoutingRule | null;
  proxyGroups: any[];
  allNodes: any[];
  balancers: XrayBalancer[];
  onClose: () => void;
  onSave: (rule: RoutingRule) => void;
}

const AdvancedRuleModal: React.FC<AdvancedRuleModalProps> = ({
  editingRule,
  proxyGroups,
  allNodes,
  onClose,
  onSave,
}) => {
  const [description, setDescription] = useState(editingRule?.description || '');
  const [outboundTag, setOutboundTag] = useState(editingRule?.outboundTag || editingRule?.balancerTag || '国际流量');

  // Extended input fields for rule target conditions
  const [domainText, setDomainText] = useState(editingRule?.domain ? editingRule.domain.join('\n') : 'domain:google.com\ngeosite:gfw');
  const [ipText, setIpText] = useState(editingRule?.ip ? editingRule.ip.join('\n') : '');
  const [sourceIpText, setSourceIpText] = useState(editingRule?.source ? editingRule.source.join('\n') : '');
  const [portText, setPortText] = useState(editingRule?.port || '');
  const [sourcePortText, setSourcePortText] = useState(editingRule?.sourcePort || '');
  const [networkText, setNetworkText] = useState(editingRule?.network || '');
  const [protocolText, setProtocolText] = useState(editingRule?.protocol ? editingRule.protocol.join(',') : '');
  const [inboundTagText, setInboundTagText] = useState(editingRule?.inboundTag ? editingRule.inboundTag.join(',') : '');
  const [userText, setUserText] = useState(editingRule?.user ? editingRule.user.join(',') : '');
  const [attributesText, setAttributesText] = useState(
    editingRule?.attributes
      ? Object.entries(editingRule.attributes)
          .map(([k, v]) => `${k}:${v}`)
          .join('\n')
      : ''
  );

  const [activeTab, setActiveTab] = useState<'domain' | 'ip' | 'port' | 'protocol' | 'attributes'>('domain');

  const insertPrefix = (prefix: string) => {
    setDomainText((prev) => {
      const lines = prev.split('\n').filter((l) => l.trim().length > 0);
      lines.push(`${prefix}example.com`);
      return lines.join('\n');
    });
  };

  const handleSave = () => {
    if (!description.trim()) {
      alert('请输入分流规则的描述说明');
      return;
    }

    const domainList = domainText
      .split('\n')
      .map((d) => d.trim())
      .filter(Boolean);

    const ipList = ipText
      .split('\n')
      .map((i) => i.trim())
      .filter(Boolean);

    const sourceIpList = sourceIpText
      .split('\n')
      .map((i) => i.trim())
      .filter(Boolean);

    const protocolList = protocolText
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const inboundTagList = inboundTagText
      .split(',')
      .map((i) => i.trim())
      .filter(Boolean);

    const userList = userText
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);

    let parsedAttributes: Record<string, string> | undefined = undefined;
    if (attributesText.trim()) {
      parsedAttributes = {};
      attributesText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .forEach((line) => {
          const parts = line.split(':');
          if (parts.length >= 2) {
            parsedAttributes![parts[0].trim()] = parts.slice(1).join(':').trim();
          }
        });
    }

    const savedRule: RoutingRule = {
      id: editingRule?.id || `rule-${Date.now()}`,
      type: 'field',
      outboundTag,
      description: description.trim(),
      domain: domainList.length > 0 ? domainList : undefined,
      ip: ipList.length > 0 ? ipList : undefined,
      source: sourceIpList.length > 0 ? sourceIpList : undefined,
      port: portText.trim() ? portText.trim() : undefined,
      sourcePort: sourcePortText.trim() ? sourcePortText.trim() : undefined,
      network: networkText.trim() ? networkText.trim() : undefined,
      protocol: protocolList.length > 0 ? protocolList : undefined,
      inboundTag: inboundTagList.length > 0 ? inboundTagList : undefined,
      user: userList.length > 0 ? userList : undefined,
      attributes: parsedAttributes && Object.keys(parsedAttributes).length > 0 ? parsedAttributes : undefined,
      enabled: editingRule ? editingRule.enabled : true,
    };

    onSave(savedRule);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-white">
              {editingRule ? `编辑分流规则 - ${editingRule.description}` : '新建高级分流路由规则'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Description & Target Outbound */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold flex items-center gap-1">
                规则描述名称 <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="例如: OpenAI 流量规则"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold text-xs sm:text-sm">指向出站目标</label>
              <OutboundSelect
                value={outboundTag}
                onChange={(val) => setOutboundTag(val)}
                proxyGroups={proxyGroups}
                allNodes={allNodes}
                size="md"
                fullWidth
              />
            </div>
          </div>

          {/* Condition Type Tabs */}
          <div className="space-y-3 pt-2 border-t border-white/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-slate-300 font-semibold">规则匹配条件配置</label>
              <div className="flex flex-wrap items-center bg-slate-950 p-1 rounded-xl border border-white/10 text-xs font-semibold gap-0.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('domain')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeTab === 'domain' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  域名 (Domain)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('ip')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeTab === 'ip' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  IP / 源 IP
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('port')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeTab === 'port' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  端口 / 源端口
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('protocol')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeTab === 'protocol' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  网络与协议
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('attributes')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeTab === 'attributes' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  属性扩展
                </button>
              </div>
            </div>

            {/* TAB 1: DOMAIN & GEOSITE */}
            {activeTab === 'domain' && (
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-semibold">域名与 GeoSite 清单 (一行一条规则)</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 mr-1">插入前缀:</span>
                    <button
                      type="button"
                      onClick={() => insertPrefix('domain:')}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 text-[10px] font-mono"
                    >
                      domain:
                    </button>
                    <button
                      type="button"
                      onClick={() => insertPrefix('full:')}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 text-[10px] font-mono"
                    >
                      full:
                    </button>
                    <button
                      type="button"
                      onClick={() => insertPrefix('keyword:')}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-mono"
                    >
                      keyword:
                    </button>
                    <button
                      type="button"
                      onClick={() => insertPrefix('geosite:')}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[10px] font-mono font-bold"
                    >
                      geosite:
                    </button>
                  </div>
                </div>

                <textarea
                  rows={5}
                  value={domainText}
                  onChange={(e) => setDomainText(e.target.value)}
                  placeholder={`domain:openai.com\nfull:chatgpt.com\ngeosite:openai`}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sky-200 font-mono placeholder-slate-600 focus:outline-none focus:border-blue-500 text-xs leading-relaxed"
                />
              </div>
            )}

            {/* TAB 2: IP & SOURCE IP */}
            {activeTab === 'ip' && (
              <div className="space-y-4 bg-slate-950/60 p-4 rounded-xl border border-white/10">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-semibold">目标 IP 地址 / GeoIP (ip)</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setIpText((prev) => (prev ? `${prev}\ngeoip:cn` : 'geoip:cn'))}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-mono font-bold"
                      >
                        + geoip:cn
                      </button>
                      <button
                        type="button"
                        onClick={() => setIpText((prev) => (prev ? `${prev}\ngeoip:private` : 'geoip:private'))}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[10px] font-mono font-bold"
                      >
                        + geoip:private
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    value={ipText}
                    onChange={(e) => setIpText(e.target.value)}
                    placeholder={`geoip:cn\ngeoip:private\n1.1.1.1/32`}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-cyan-200 font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500 text-xs"
                  />
                </div>

                <div className="space-y-2 pt-2 border-t border-white/5">
                  <span className="text-slate-300 font-semibold block">源 IP 地址 CIDR (source)</span>
                  <textarea
                    rows={2}
                    value={sourceIpText}
                    onChange={(e) => setSourceIpText(e.target.value)}
                    placeholder="例如: 192.168.1.100/32 或 geoip:private"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-cyan-200 font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500 text-xs"
                  />
                </div>
              </div>
            )}

            {/* TAB 3: PORT & SOURCE PORT */}
            {activeTab === 'port' && (
              <div className="space-y-4 bg-slate-950/60 p-4 rounded-xl border border-white/10">
                <div className="space-y-1.5">
                  <span className="text-slate-300 font-semibold block">目标端口或端口范围 (port)</span>
                  <input
                    type="text"
                    value={portText}
                    onChange={(e) => setPortText(e.target.value)}
                    placeholder="例如: 80, 443 或 8000-9000"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-amber-200 font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>

                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <span className="text-slate-300 font-semibold block">源端口或源端口范围 (sourcePort)</span>
                  <input
                    type="text"
                    value={sourcePortText}
                    onChange={(e) => setSourcePortText(e.target.value)}
                    placeholder="例如: 53 或 1000-2000"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-amber-200 font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>
              </div>
            )}

            {/* TAB 4: NETWORK & PROTOCOL & INBOUND & USER */}
            {activeTab === 'protocol' && (
              <div className="space-y-4 bg-slate-950/60 p-4 rounded-xl border border-white/10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="text-slate-300 font-semibold block">网络传输类型 (network)</span>
                    <input
                      type="text"
                      value={networkText}
                      onChange={(e) => setNetworkText(e.target.value)}
                      placeholder="例如: tcp, udp 或 tcp,udp"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-purple-200 font-mono text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-slate-300 font-semibold block">嗅探协议 (protocol)</span>
                    <input
                      type="text"
                      value={protocolText}
                      onChange={(e) => setProtocolText(e.target.value)}
                      placeholder="例如: http, tls, bittorrent"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-purple-200 font-mono text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                  <div className="space-y-1.5">
                    <span className="text-slate-300 font-semibold block">入站 Tag 过滤 (inboundTag)</span>
                    <input
                      type="text"
                      value={inboundTagText}
                      onChange={(e) => setInboundTagText(e.target.value)}
                      placeholder="例如: socks-in, http-in"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-slate-300 font-mono text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-slate-300 font-semibold block">用户 Email 匹配 (user)</span>
                    <input
                      type="text"
                      value={userText}
                      onChange={(e) => setUserText(e.target.value)}
                      placeholder="例如: user1@example.com"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-slate-300 font-mono text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: ATTRIBUTES */}
            {activeTab === 'attributes' && (
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-white/10">
                <span className="text-slate-300 font-semibold block">匹配属性表达式 (attributes, 一行一个 key:value)</span>
                <textarea
                  rows={4}
                  value={attributesText}
                  onChange={(e) => setAttributesText(e.target.value)}
                  placeholder={`attrs.type:video\nattrs.country:us`}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-emerald-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-900/80 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-all cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            保存路由规则
          </button>
        </div>
      </div>
    </div>
  );
};
