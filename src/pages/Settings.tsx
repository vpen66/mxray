import React from 'react';
import { Shield, Network, Cpu } from 'lucide-react';
import { useConfigStore } from '../stores/useConfigStore';

export const SettingsPage: React.FC = () => {
  const { socksPort, httpPort, enableFakeDns, sniffingEnabled, updatePorts, toggleFakeDns, toggleSniffing } = useConfigStore();

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">系统与全局设置 (Settings)</h2>
        <p className="text-xs text-slate-400">配置本地代理监听端口、原生 TUN 模式、FakeDNS 及系统常驻偏好</p>
      </div>

      {/* Network Ports */}
      <div className="glass-card p-6 rounded-2xl space-y-4 border border-white/10">
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <Network className="w-5 h-5 text-blue-400" />
          <h3 className="text-base font-bold text-white">本地代理入站端口 (Inbound Ports)</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Socks5 监听端口</label>
            <input
              type="number"
              value={socksPort}
              onChange={(e) => updatePorts(parseInt(e.target.value) || 10808, httpPort)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">HTTP 监听端口</label>
            <input
              type="number"
              value={httpPort}
              onChange={(e) => updatePorts(socksPort, parseInt(e.target.value) || 10809)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* DNS & FakeDNS */}
      <div className="glass-card p-6 rounded-2xl space-y-4 border border-white/10">
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <Cpu className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-bold text-white">Xray DNS 与 流量嗅探 (DNS & Sniffing)</h3>
        </div>

        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-white">开启 FakeDNS 域名解析池</h4>
              <p className="text-slate-400">使用 198.18.0.0/15 地址池接管 TUN 与操作系统 DNS 流量</p>
            </div>
            <button
              onClick={toggleFakeDns}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${enableFakeDns ? 'bg-blue-600' : 'bg-slate-800'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${enableFakeDns ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-white/5 pt-3">
            <div>
              <h4 className="font-bold text-white">开启入站流量嗅探 (Sniffing)</h4>
              <p className="text-slate-400">基于 HTTP/TLS/QUIC 嗅探真实的域名目标，防御 DNS 污染</p>
            </div>
            <button
              onClick={toggleSniffing}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${sniffingEnabled ? 'bg-blue-600' : 'bg-slate-800'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${sniffingEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* System & Autostart */}
      <div className="glass-card p-6 rounded-2xl space-y-4 border border-white/10">
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <Shield className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-bold text-white">系统开机启动与托盘行为</h3>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-white">开机自动启动 MXray</h4>
              <p className="text-slate-400">登录系统后后台静默启动并自动挂载核心代理</p>
            </div>
            <button className="w-12 h-6 rounded-full bg-blue-600 relative p-0.5">
              <div className="w-5 h-5 rounded-full bg-white translate-x-6 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
