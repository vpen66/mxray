import React from 'react';
import {
  Terminal,
  FileCode2,
  Settings,
  Zap,
  Loader2,
  Power,
} from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { useKernelStore } from '../stores/useKernelStore';

const NAV_ITEMS = [
  { id: 'json-config', label: '高级配置', icon: FileCode2 },
  { id: 'logs', label: '实时日志', icon: Terminal },
  { id: 'settings', label: '系统设置', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    toggleLeftPanel,
    coreState,
    isTogglingSystemProxy,
    toggleKernel,
  } = useAppStore();
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

        {/* Core Status Badge (Clickable to Start/Stop Kernel Process) */}
        <div className="px-3 mb-4">
          <button
            onClick={toggleKernel}
            disabled={isTogglingSystemProxy}
            title={coreState.isRunning ? '点击可停止 Xray 内核进程' : '点击可启动 Xray 内核进程'}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all duration-300 cursor-pointer group ${
              isTogglingSystemProxy
                ? 'bg-amber-500/10 border-amber-500/30'
                : coreState.isRunning
                ? 'bg-emerald-500/10 border-emerald-500/25 hover:bg-emerald-500/20'
                : 'bg-slate-900/60 hover:bg-slate-800/80 border-white/5'
            }`}
          >
            <div className="flex items-center gap-2">
              {isTogglingSystemProxy ? (
                <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              ) : (
                <span
                  className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                    coreState.isRunning ? 'bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400' : 'bg-rose-500'
                  }`}
                />
              )}
              <span className="text-slate-300 font-medium group-hover:text-white transition-colors">
                {isTogglingSystemProxy ? '内核切换中...' : coreState.isRunning ? '内核运行中' : '内核已停止'}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-500 group-hover:text-slate-300">
              <Power className={`w-3 h-3 transition-colors ${coreState.isRunning ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span>{activeKernel.version}</span>
            </div>
          </button>
        </div>

        {/* Nav Links */}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'json-config') {
                    setActiveTab(item.id);
                    toggleLeftPanel();
                  } else {
                    setActiveTab(item.id);
                  }
                }}
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

    </aside>
  );
};
