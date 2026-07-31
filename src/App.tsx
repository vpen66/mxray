import { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { useAppStore } from './stores/useAppStore';
import { useLogStore } from './stores/useLogStore';
import { LogsPage } from './pages/Logs';
import { JsonConfigPage } from './pages/JsonConfig';
import { SettingsPage } from './pages/Settings';

export function App() {
  const { activeTab, checkSystemProxyStatus } = useAppStore();
  const { initLogListener } = useLogStore();

  useEffect(() => {
    checkSystemProxyStatus();
    const cleanup = initLogListener();
    return () => {
      cleanup();
    };
  }, [checkSystemProxyStatus, initLogListener]);

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
