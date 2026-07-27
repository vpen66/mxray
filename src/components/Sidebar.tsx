import React from 'react';
import {
  LayoutDashboard,
  Globe2,
  FolderGit2,
  Route,
  Terminal,
  FileCode2,
  Settings,
  Shield,
  Zap,
  Activity,
} from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { useKernelStore } from '../stores/useKernelStore';

const NAV_ITEMS = [
  { id: 'dashboard', label: '控制台', icon: LayoutDashboard },
  { id: 'proxies', label: '节点代理', icon: Globe2 },
  { id: 'profiles', label: '订阅配置', icon: FolderGit2 },
  { id: 'rules', label: '路由规则', icon: Route },
  { id: 'logs', label: '实时日志', icon: Terminal },
  { id: 'json-config', label: '高级配置', icon: FileCode2 },
  { id: 'settings', label: '系统设置', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, coreState, toggleSystemProxy, toggleTunMode } = useAppStore();
  const { activeKernel } = useKernelStore();

  return (
    <aside className="w-64 h-screen glass-nav flex flex-col justify-between p-4 z-20">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-3 py-4 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white tracking-wide">MXray</h1>
          </div>
        </div>

        {/* Core Status Badge */}
        <div className="px-3 mb-4">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${coreState.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-slate-300 font-medium">{coreState.isRunning ? '内核运行中' : '内核已停止'}</span>
            </div>
            <span className="text-slate-500 text-[10px]">{activeKernel.version}</span>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-md shadow-blue-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Toggles Footer */}
      <div className="space-y-2 pt-4 border-t border-white/10">
        <button
          onClick={toggleSystemProxy}
          className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-medium border transition-all ${
            coreState.systemProxy
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-900/40 border-white/5 text-slate-400 hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>系统代理</span>
          </div>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${coreState.systemProxy ? 'bg-emerald-500/30 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>
            {coreState.systemProxy ? 'ON' : 'OFF'}
          </span>
        </button>

        <button
          onClick={toggleTunMode}
          className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-medium border transition-all ${
            coreState.tunMode
              ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
              : 'bg-slate-900/40 border-white/5 text-slate-400 hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            <span>原生 TUN 模式</span>
          </div>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${coreState.tunMode ? 'bg-indigo-500/30 text-indigo-300' : 'bg-slate-800 text-slate-500'}`}>
            {coreState.tunMode ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>
    </aside>
  );
};
