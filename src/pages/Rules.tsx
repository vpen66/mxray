import React, { useState } from 'react';
import {
  ArrowRightLeft,
  Plus,
  Trash2,
  Edit3,
  ChevronUp,
  ChevronDown,
  Copy,
  Filter,
  Globe,
  X,
  Search,
  Sliders,
} from 'lucide-react';
import type { RoutingRule } from '../types';
import { useProxyStore } from '../stores/useProxyStore';
import { useConfigStore } from '../stores/useConfigStore';
import { OutboundSelect } from '../components/OutboundSelect';
import { ConfirmModal } from '../components/ConfirmModal';

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
    description: '常用国外与代理域名 (代理)',
  },
];

export const RulesPage: React.FC = () => {
  const { proxyGroups, profiles } = useProxyStore();
  const { profiles: configProfiles, selectedProfileId, activeProfileId, updateProfile } = useConfigStore();
  const targetConfigProfile = configProfiles.find((p) => p.id === (selectedProfileId || activeProfileId)) || configProfiles[0];

  const [rules, setRules] = useState<RoutingRule[]>(DEFAULT_RULES);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeOpenRuleId, setActiveOpenRuleId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<RoutingRule | null>(null);

  const allNodes = profiles.flatMap((p) => p.nodes);

  const updateRulesAndSync = (newRules: RoutingRule[]) => {
    setRules(newRules);
    if (!targetConfigProfile) return;

    try {
      const config = JSON.parse(targetConfigProfile.content || '{}');
      if (!config.routing) {
        config.routing = { domainStrategy: 'IPIfNonMatch', rules: [] };
      }
      const xrayRules = newRules
        .filter((r) => r.enabled !== false)
        .map((r) => ({
          type: r.type || 'field',
          outboundTag: r.outboundTag,
          domain: r.domain && r.domain.length > 0 ? r.domain : undefined,
          port: r.port || undefined,
          protocol: r.protocol && r.protocol.length > 0 ? r.protocol : undefined,
        }));
      config.routing.rules = xrayRules;
      updateProfile(targetConfigProfile.id, { content: JSON.stringify(config, null, 2) });
    } catch {
      // ignore
    }
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

  const getOutboundBadgeStyle = (outbound: string) => {
    if (outbound === 'direct' || outbound === '直连' || outbound === '国内流量') {
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }
    if (outbound === 'block' || outbound === 'reject' || outbound === '拒绝') {
      return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    }
    if (outbound === 'proxy' || outbound === '代理') {
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    }
    // Check if it matches an individual node
    const isNode = allNodes.some((n) => n.name === outbound || n.id === outbound);
    if (isNode) {
      return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    }
    return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
  };

  const filteredRules = rules.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      r.description?.toLowerCase().includes(q) ||
      r.outboundTag.toLowerCase().includes(q) ||
      r.domain?.some((d) => d.toLowerCase().includes(q)) ||
      r.ip?.some((ip) => ip.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-blue-400" />
            高级分流与 Geo 规则构造引擎
          </h2>
          <p className="text-xs text-slate-400">
            支持域名 (Full/Keyword/Regexp/GeoSite)、IP (CIDR/GeoIP)、端口与协议多维组合，精准控制出口动作
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>新建高级分流规则</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-2 bg-slate-900/60 p-3 rounded-xl border border-white/5">
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-white/10 w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="搜索规则描述、域名关键字、IP或代理组..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none w-full font-mono"
          />
        </div>
        <span className="text-[11px] text-slate-400 font-mono hidden sm:inline-block">
          共 {rules.length} 条路由规则 (按优先级自上而下第一匹配)
        </span>
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        {filteredRules.map((rule, idx) => {
          const isDropdownOpen = activeOpenRuleId === rule.id;
          return (
            <div
              key={rule.id}
              style={{ zIndex: isDropdownOpen ? 50 : rules.length - idx }}
              className={`glass-card relative p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                rule.enabled ? 'border-white/10 bg-slate-900/40' : 'border-white/5 opacity-50 bg-slate-950/40'
              }`}
            >
              <div className="flex items-start md:items-center gap-3">
                {/* Order index badge & Priority controls */}
                <div className="flex flex-col items-center gap-0.5 shrink-0">
                  <span className="w-6 h-6 rounded-lg bg-slate-950 border border-white/10 text-slate-300 font-mono text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div className="flex items-center gap-0.5 pt-0.5">
                    <button
                      onClick={() => handleMoveUp(idx)}
                      disabled={idx === 0}
                      className="p-0.5 text-slate-500 hover:text-white disabled:opacity-20 transition-colors"
                      title="向上调高优先级"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveDown(idx)}
                      disabled={idx === rules.length - 1}
                      className="p-0.5 text-slate-500 hover:text-white disabled:opacity-20 transition-colors"
                      title="向下调低优先级"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Rule Info */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase ${getOutboundBadgeStyle(
                        rule.outboundTag
                      )}`}
                    >
                      {rule.outboundTag}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide">{rule.description}</h4>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                    {rule.domain &&
                      rule.domain.map((d) => (
                        <span key={d} className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-white/10 flex items-center gap-1">
                          <Globe className="w-3 h-3 text-sky-400 shrink-0" />
                          {d}
                        </span>
                      ))}
                    {rule.ip &&
                      rule.ip.map((ip) => (
                        <span key={ip} className="px-2 py-0.5 rounded bg-slate-950 text-cyan-300 border border-white/10 flex items-center gap-1">
                          <Filter className="w-3 h-3 text-cyan-400 shrink-0" />
                          {ip}
                        </span>
                      ))}
                    {rule.port && (
                      <span className="px-2 py-0.5 rounded bg-slate-950 text-amber-300 border border-white/10">
                        Port: {rule.port}
                      </span>
                    )}
                    {rule.protocol &&
                      rule.protocol.map((p) => (
                        <span key={p} className="px-2 py-0.5 rounded bg-slate-950 text-purple-300 border border-white/10">
                          Proto: {p}
                        </span>
                      ))}
                  </div>
                </div>
              </div>

              {/* Outbound Quick Target & Actions */}
              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                {/* Outbound Target ProxyGroup / Node Select */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-slate-400 text-xs font-semibold shrink-0">指向出站:</span>
                  <OutboundSelect
                    value={rule.outboundTag}
                    onChange={(val) => {
                      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, outboundTag: val } : r)));
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
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  rule.enabled
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-900 text-slate-500 border-white/5'
                }`}
              >
                {rule.enabled ? '启用' : '禁用'}
              </button>

              <button
                onClick={() => handleOpenEditModal(rule)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/5 transition-colors"
                title="编辑高级规则"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleClone(rule)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-blue-400 border border-white/5 transition-colors"
                title="克隆此规则"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleDeleteRule(rule)}
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

      {/* Advanced Rule Creation & Editing Modal */}
      {isModalOpen && (
        <AdvancedRuleModal
          editingRule={editingRule}
          proxyGroups={proxyGroups}
          allNodes={allNodes}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveRule}
        />
      )}

      {/* Delete Rule Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingRule}
        title="删除分流规则"
        message={
          <span>
            确定要删除该条分流规则（Target: <strong className="text-rose-400 font-semibold">{deletingRule?.outboundTag}</strong>）吗？删除后配置无法撤销。
          </span>
        }
        confirmText="确认删除"
        onConfirm={handleConfirmDeleteRule}
        onCancel={() => setDeletingRule(null)}
      />
    </div>
  );
};

// Subcomponent: AdvancedRuleModal
interface AdvancedRuleModalProps {
  editingRule: RoutingRule | null;
  proxyGroups: any[];
  allNodes: any[];
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
  const [outboundTag, setOutboundTag] = useState(editingRule?.outboundTag || '国际流量');

  // Input fields for rule targets
  const [domainText, setDomainText] = useState(editingRule?.domain ? editingRule.domain.join('\n') : 'domain:google.com\ngeosite:gfw');
  const [ipText, setIpText] = useState(editingRule?.ip ? editingRule.ip.join('\n') : '');
  const [portText, setPortText] = useState(editingRule?.port || '');
  const [protocolText, setProtocolText] = useState(editingRule?.protocol ? editingRule.protocol.join(',') : '');

  const [activeTab, setActiveTab] = useState<'domain' | 'ip' | 'port' | 'protocol'>('domain');

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

    const protocolList = protocolText
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const savedRule: RoutingRule = {
      id: editingRule?.id || `rule-${Date.now()}`,
      type: 'field',
      outboundTag,
      description: description.trim(),
      domain: domainList.length > 0 ? domainList : undefined,
      ip: ipList.length > 0 ? ipList : undefined,
      port: portText.trim() ? portText.trim() : undefined,
      protocol: protocolList.length > 0 ? protocolList : undefined,
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
              {editingRule ? `编辑分流规则 (${editingRule.description})` : '新建高级分流路由规则'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 transition-colors"
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
                placeholder="例如: OpenAI & ChatGPT 流量规则"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold text-xs sm:text-sm">指向出站目标 (代理组或特定节点)</label>
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
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-semibold">规则匹配类型条件配置</label>
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-white/10 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('domain')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeTab === 'domain' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  域名 (Domain/GeoSite)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('ip')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeTab === 'ip' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  IP / GeoIP
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('port')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeTab === 'port' ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  端口 (Port)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('protocol')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeTab === 'protocol' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  协议 (Protocol)
                </button>
              </div>
            </div>

            {/* TAB 1: DOMAIN & GEOSITE */}
            {activeTab === 'domain' && (
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-semibold">域名与 GeoSite 清单 (一行一条规则)</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 mr-1">一键插入前缀:</span>
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
                      onClick={() => insertPrefix('regexp:')}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 text-[10px] font-mono"
                    >
                      regexp:
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
                  placeholder={`domain:openai.com\nfull:chatgpt.com\ngeosite:openai\nkeyword:telegram`}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sky-200 font-mono placeholder-slate-600 focus:outline-none focus:border-blue-500 text-xs leading-relaxed"
                />
                <p className="text-[10px] text-slate-400">
                  前缀说明: <code className="text-sky-300">domain:</code> 匹配包含所有子域名; <code className="text-blue-300">full:</code> 精准匹配完整域名; <code className="text-emerald-300">geosite:</code> Geo 数据库分类库。
                </p>
              </div>
            )}

            {/* TAB 2: IP & GEOIP */}
            {activeTab === 'ip' && (
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-semibold">IP 地址与 GeoIP 清单 (一行一条)</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setIpText((prev) => (prev ? `${prev}\ngeoip:cn` : 'geoip:cn'))
                      }
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-mono font-bold"
                    >
                      + geoip:cn
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setIpText((prev) => (prev ? `${prev}\ngeoip:private` : 'geoip:private'))
                      }
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[10px] font-mono font-bold"
                    >
                      + geoip:private
                    </button>
                  </div>
                </div>

                <textarea
                  rows={5}
                  value={ipText}
                  onChange={(e) => setIpText(e.target.value)}
                  placeholder={`geoip:cn\ngeoip:private\n1.1.1.1/32\n192.168.0.0/16`}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-cyan-200 font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500 text-xs leading-relaxed"
                />
                <p className="text-[10px] text-slate-400">
                  支持 CIDR 网段（如 <code className="text-cyan-300">192.168.1.0/24</code>）或 GeoIP 数据库库名称（如 <code className="text-cyan-300">geoip:cn</code>）。
                </p>
              </div>
            )}

            {/* TAB 3: PORT */}
            {activeTab === 'port' && (
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-white/10">
                <span className="text-slate-300 font-semibold block">目标端口或端口范围</span>
                <input
                  type="text"
                  value={portText}
                  onChange={(e) => setPortText(e.target.value)}
                  placeholder="例如: 80, 443 或 8000-9000"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-amber-200 font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500 text-xs"
                />
                <p className="text-[10px] text-slate-400">
                  可用英文逗号分隔多个端口（如 <code className="text-amber-300">80, 443, 8080</code>）或使用连字符指定范围（如 <code className="text-amber-300">1000-2000</code>）。
                </p>
              </div>
            )}

            {/* TAB 4: PROTOCOL */}
            {activeTab === 'protocol' && (
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-white/10">
                <span className="text-slate-300 font-semibold block">网络协议 (Protocol)</span>
                <input
                  type="text"
                  value={protocolText}
                  onChange={(e) => setProtocolText(e.target.value)}
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
