import React, { useState } from 'react';
import { Plus, Link2, Trash2, Sparkles, Code2 } from 'lucide-react';
import { useProxyStore } from '../stores/useProxyStore';
import type { Profile } from '../types';

export const ProfilesPage: React.FC = () => {
  const { profiles, addProfile, removeProfile } = useProxyStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [subName, setSubName] = useState('');
  const [subUrl, setSubUrl] = useState('');
  const [rawConfigText, setRawConfigText] = useState('');
  const [importType, setImportType] = useState<'url' | 'clash' | 'link'>('url');

  const handleImport = () => {
    if (!subName.trim()) return;

    if (importType === 'url') {
      const newProfile: Profile = {
        id: `prof-${Date.now()}`,
        name: subName,
        url: subUrl,
        type: 'remote',
        updatedAt: Date.now(),
        nodeCount: 3,
        autoUpdate: true,
        updateInterval: 12,
        nodes: [
          {
            id: `node-${Date.now()}-1`,
            name: `${subName} - 节点 01 (VLESS)`,
            protocol: 'vless',
            server: 'node1.sub.com',
            port: 443,
            uuid: 'a3e56226-5c08-4747-97fa-da3e2006ac6b',
            security: 'reality',
            sni: 'dl.google.com',
            delay: 45,
          },
          {
            id: `node-${Date.now()}-2`,
            name: `${subName} - 节点 02 (Hysteria2)`,
            protocol: 'hysteria2',
            server: 'node2.sub.com',
            port: 8443,
            password: 'sub-hy2-pass',
            sni: 'node2.sub.com',
            delay: 32,
          },
        ],
      };
      addProfile(newProfile);
    } else if (importType === 'clash') {
      const newProfile: Profile = {
        id: `prof-${Date.now()}`,
        name: `${subName} (Clash 转码)`,
        type: 'local',
        updatedAt: Date.now(),
        nodeCount: 2,
        autoUpdate: false,
        updateInterval: 0,
        nodes: [
          {
            id: `node-${Date.now()}-1`,
            name: `[Clash 转码] 香港 01`,
            protocol: 'trojan',
            server: 'hk.clash.net',
            port: 443,
            password: 'clash-pass-123',
            security: 'tls',
            delay: 54,
          },
        ],
      };
      addProfile(newProfile);
    }

    setShowAddModal(false);
    setSubName('');
    setSubUrl('');
    setRawConfigText('');
  };

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">订阅与配置管理 (Profiles)</h2>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {profiles.map((profile) => (
          <div key={profile.id} className="glass-card p-5 rounded-2xl space-y-4 border border-white/10 relative">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${profile.type === 'remote' ? 'bg-blue-500/20 text-blue-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    {profile.type === 'remote' ? '远程订阅' : '本地文件'}
                  </span>
                  <h3 className="text-base font-bold text-white">{profile.name}</h3>
                </div>
                {profile.url && <p className="text-xs text-slate-400 font-mono truncate max-w-sm">{profile.url}</p>}
              </div>

              <button
                onClick={() => removeProfile(profile.id)}
                className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
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

      {/* Add Subscription Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full p-6 rounded-2xl space-y-5 border border-white/15 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white">导入订阅或链接</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
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

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">订阅 / 配置名称</label>
                <input
                  type="text"
                  placeholder="例如: 机场专线订阅 2026"
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
                    placeholder="https://example.com/api/v1/client/subscribe?token=xxx"
                    value={subUrl}
                    onChange={(e) => setSubUrl(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
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
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                取消
              </button>
              <button
                onClick={handleImport}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30"
              >
                确认导入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
