import { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { useAppStore } from './stores/useAppStore';
import { useKernelStore } from './stores/useKernelStore';
import { useLogStore } from './stores/useLogStore';
import { LogsPage } from './pages/Logs';
import { JsonConfigPage } from './pages/JsonConfig';
import { SettingsPage } from './pages/Settings';

export function App() {
  const { activeTab, checkSystemProxyStatus } = useAppStore();
  const { syncKeepKernelAliveOnExit } = useKernelStore();
  const { initLogListener, loadHistoricalLogs } = useLogStore();

  useEffect(() => {
    checkSystemProxyStatus();
    syncKeepKernelAliveOnExit();
    const cleanup = initLogListener();
    // 延迟回填历史日志：若实时事件已到达则内部自动跳过
    const backfillTimer = window.setTimeout(() => {
      loadHistoricalLogs();
    }, 800);
    return () => {
      window.clearTimeout(backfillTimer);
      cleanup();
    };
  }, [checkSystemProxyStatus, initLogListener, loadHistoricalLogs, syncKeepKernelAliveOnExit]);

  const renderActivePage = () => {
    switch (activeTab) {
      case 'json-config':
        return <JsonConfigPage />;
      case 'logs':
        return <LogsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <JsonConfigPage />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 h-screen overflow-y-auto p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative">
        {renderActivePage()}
      </main>
    </div>
  );
}

export default App;
