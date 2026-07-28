import { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { useAppStore } from './stores/useAppStore';
import { useLogStore } from './stores/useLogStore';
import { DashboardPage } from './pages/Dashboard';
import { ProxiesPage } from './pages/Proxies';
import { ProfilesPage } from './pages/Profiles';
import { RulesPage } from './pages/Rules';
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
      case 'dashboard':
        return <DashboardPage />;
      case 'proxies':
        return <ProxiesPage />;
      case 'profiles':
        return <ProfilesPage />;
      case 'rules':
        return <RulesPage />;
      case 'logs':
        return <LogsPage />;
      case 'json-config':
        return <JsonConfigPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
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
