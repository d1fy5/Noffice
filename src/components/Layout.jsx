import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from '../store/hooks.js';
import { SearchContext } from '../store/contexts.js';
import { useTranslation } from '../store/useTranslation.js';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

const titleKeyMap = {
  '/dashboard': 'dashboard',
  '/documents': 'documents',
  '/inbox': 'inbox',
  '/data-tables': 'data-tables',
  '/employees': 'employees',
  '/notifications': 'notifications',
  '/settings': 'settings',
};

export default function Layout({ children }) {
  const [query, setQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { documents, notificationItems = [] } = useStore();
  const { t } = useTranslation();

  const title = titleKeyMap[location.pathname] ? t(titleKeyMap[location.pathname]) : 'Noffice';

  // Derive a pending-approval item from actual pending data (not dummy).
  const pendingDocs = documents.filter((d) => d.status === 'pending').length;
  const notifItems = pendingDocs > 0 ? [{ title: `${pendingDocs} ${t('topbar.pendingApproval')}`, sub: `${t('topbar.viewPending')} →`, route: '/documents' }] : [];

  return (
    <SearchContext.Provider value={{ query, setQuery }}>
      <div className="app">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="content-wrap">
          <Topbar
            title={title}
            searchValue={query}
            onSearch={setQuery}
            onMenu={() => setSidebarOpen(true)}
            notifications={notifItems}
          />
          <main className="main">{children}</main>
        </div>
      </div>
    </SearchContext.Provider>
  );
}
