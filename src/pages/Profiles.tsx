import React, { useState } from 'react';
import { Plus, Link2, Trash2, Sparkles, Code2, X, Globe, FileText } from 'lucide-react';
import { useProxyStore } from '../stores/useProxyStore';
import type { Profile } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';

import { parseSubscriptionContent, fetchAndParseSubscriptionUrl } from '../utils/subParser';
import type { ProxyNode } from '../types';

export const ProfilesPage: React.FC = () => {
  const { profiles, addProfile, removeProfile } = useProxyStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingProfile, setDeletingProfile] = useState<Profile | null>(null);
  const [subName, setSubName] = useState('');
  const [subUrl, setSubUrl] = useState('');
  const [rawConfigText, setRawConfigText] = useState('');
  const [importType, setImportType] = useState<'url' | 'clash' | 'link'>('url');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleImport = async () => {
    if (!subName.trim()) {
      setErrorMsg('请输入订阅/配置名称');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      let parsedNodes: ProxyNode[] = [];

      if (importType === 'url') {
        const urlToFetch = subUrl.trim();
        if (!urlToFetch) {
          setErrorMsg('请输入有效的订阅 URL 或节点链接');
          setLoading(false);
          return;
        }

        // If user directly pasted a vless/vmess/trojan/hy2 link or base64 into the URL input
        if (
          urlToFetch.startsWith('vless://') ||
          urlToFetch.startsWith('vmess://') ||
          urlToFetch.startsWith('trojan://') ||
          urlToFetch.startsWith('hy2://') ||
          urlToFetch.startsWith('hysteria2://')
        ) {
          parsedNodes = parseSubscriptionContent(urlToFetch);
        } else {
          try {
            parsedNodes = await fetchAndParseSubscriptionUrl(urlToFetch);
          } catch (err: any) {
            console.warn('Fetch failed, trying raw text fallback:', err);
            if (rawConfigText.trim()) {
              parsedNodes = parseSubscriptionContent(rawConfigText);
            } else {
              throw new Error(`无法获取或解析该订阅地址: ${err.message || '网络或跨域错误'}`);
            }
          }
        }
      } else if (importType === 'link') {
        const textToParse = rawConfigText.trim() || subUrl.trim();
        if (!textToParse) {
          setErrorMsg('请输入节点分享码或 Base64 订阅内容');
          setLoading(false);
          return;
        }
        parsedNodes = parseSubscriptionContent(textToParse);
      } else if (importType === 'clash') {
        parsedNodes = parseSubscriptionContent(rawConfigText);
      }

      if (parsedNodes.length === 0) {
        throw new Error('未解析到任何有效节点，请检查链接或文本格式是否正确');
      }

      const newProfile: Profile = {
        id: `prof-${Date.now()}`,
        name: subName,
        url: importType === 'url' ? subUrl : undefined,
        type: importType === 'url' ? 'remote' : 'local',
        updatedAt: Date.now(),
        nodeCount: parsedNodes.length,
        autoUpdate: importType === 'url',
        updateInterval: 12,
        nodes: parsedNodes,
      };

      addProfile(newProfile);
      setShowAddModal(false);
      setSubName('');
      setSubUrl('');
      setRawConfigText('');
      setErrorMsg('');
    } catch (err: any) {
      setErrorMsg(err.message || '导入失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">订阅与配置管理</h2>
          <p className="text-xs text-slate-400">导入订阅链接、单个节点分享码或 Clash YAML 配置文件</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>添加/导入新订阅</span>
        </button>
      </div>

      {/* Profile Cards */}
      {profiles.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl border border-white/10 text-center space-y-3 bg-slate-900/40">
          <Globe className="w-10 h-10 text-slate-500 mx-auto animate-pulse" />
          <h3 className="text-base font-bold text-white">暂无订阅或配置文件</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            点击右上角“添加/导入新订阅”按钮，支持通过 HTTP 订阅链接、节点分享码 (vless/vmess/hy2) 或 Clash YAML 导入节点。
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profiles.map((profile) => (
            <div key={profile.id} className="glass-card p-5 rounded-2xl space-y-4 border border-white/10 relative">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 shrink-0 ${profile.type === 'remote' ? 'bg-blue-500/20 text-blue-300' : 'bg-amber-500/20 text-amber-300'}`}>
                      {profile.type === 'remote' ? <Globe className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                      {profile.type === 'remote' ? '远程订阅' : '本地文件'}
                    </span>
                    <h3 className="text-base font-bold text-white truncate">{profile.name}</h3>
                  </div>
                  {profile.url && <p className="text-xs text-slate-400 font-mono truncate">{profile.url}</p>}
                </div>

                <button
                  onClick={() => setDeletingProfile(profile)}
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all shrink-0"
                  title="删除订阅"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-white/5">
                <span>节点数量: <strong className="text-slate-200">{profile.nodes.length} 个</strong></span>
                <span>更新时间: {new Date(profile.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Subscription Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full p-6 rounded-2xl space-y-5 border border-white/15 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white">导入订阅或链接</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Type selector */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setImportType('url')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                  importType === 'url' ? 'bg-blue-600/30 border-blue-500 text-blue-300' : 'border-white/10 text-slate-400 hover:bg-white/5'
                }`}
              >
                <Link2 className="w-4 h-4" /> 订阅 URL
              </button>
              <button
                onClick={() => setImportType('clash')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                  importType === 'clash' ? 'bg-blue-600/30 border-blue-500 text-blue-300' : 'border-white/10 text-slate-400 hover:bg-white/5'
                }`}
              >
                <Code2 className="w-4 h-4" /> Clash YAML 转换
              </button>
              <button
                onClick={() => setImportType('link')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                  importType === 'link' ? 'bg-blue-600/30 border-blue-500 text-blue-300' : 'border-white/10 text-slate-400 hover:bg-white/5'
                }`}
              >
                <Sparkles className="w-4 h-4" /> 节点分享码
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                {errorMsg}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">订阅 / 配置名称</label>
                <input
                  type="text"
                  placeholder="例如: 我的 VLESS 节点订阅"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {importType === 'url' && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">订阅链接地址 (HTTP/HTTPS)</label>
                  <input
                    type="text"
                    placeholder="https://example.com/api/v1/client/subscribe?token=xxx 或 vless://..."
                    value={subUrl}
                    onChange={(e) => setSubUrl(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {importType === 'link' && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">粘贴节点分享码 (vless://, vmess://, trojan://, hy2:// 或 Base64)</label>
                  <textarea
                    rows={4}
                    placeholder="粘贴节点分享码，如:\nvless://uuid@ip:port?security=reality&...#nodeName"
                    value={rawConfigText}
                    onChange={(e) => setRawConfigText(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white font-mono text-[11px] focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {importType === 'clash' && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">粘贴 Clash YAML 内容</label>
                  <textarea
                    rows={4}
                    placeholder="proxies:\n  - name: node1\n    type: vless..."
                    value={rawConfigText}
                    onChange={(e) => setRawConfigText(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-semibold"
              >
                取消
              </button>
              <button
                onClick={handleImport}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 flex items-center gap-2"
              >
                {loading ? '解析中...' : '确认导入'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Subscription Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingProfile}
        title="删除订阅配置"
        message={
          <span>
            确定要删除订阅 <strong className="text-rose-400 font-semibold">"{deletingProfile?.name}"</strong> 吗？删除后该订阅下的 {deletingProfile?.nodes.length || 0} 个节点将被一并移除。
          </span>
        }
        confirmText="确认删除"
        onConfirm={() => {
          if (deletingProfile) {
            removeProfile(deletingProfile.id);
            setDeletingProfile(null);
          }
        }}
        onCancel={() => setDeletingProfile(null)}
      />
    </div>
  );
};
