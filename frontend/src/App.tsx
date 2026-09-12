import { useEffect, useState } from 'react';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { Layout, type NavKey } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { LeadsPage } from './pages/LeadsPage';
import { IntegrationPage } from './pages/IntegrationPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  if (typeof window !== 'undefined' && window.location.pathname === '/privacy') {
    return (
      <div className="min-h-screen bg-white">
        <PrivacyPolicy />
        <div className="py-6 text-center">
          <a href="/" className="text-sm text-indigo-600 hover:underline">← Voltar ao CRM</a>
        </div>
      </div>
    );
  }

  const [active, setActive] = useState<NavKey>(() => {
    const h = typeof window !== 'undefined' ? window.location.hash.replace('#','') : '';
    if (h === 'leads' || h === 'integracao' || h === 'config' || h === 'dashboard') return h as NavKey;
    return 'leads';
  });

  useEffect(() => {
    window.location.hash = active;
  }, [active]);

  // Banner global para OAuth (mantém compat com ?meta=)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('meta')) {
      // IntegrationPage já trata, mas garante que tab abra lá
      setActive('integracao');
    }
  }, []);

  return (
    <Layout active={active} onChange={setActive}>
      {active === 'dashboard' && <DashboardPage />}
      {active === 'leads' && <LeadsPage />}
      {active === 'integracao' && <IntegrationPage />}
      {active === 'config' && <SettingsPage />}
    </Layout>
  );
}
