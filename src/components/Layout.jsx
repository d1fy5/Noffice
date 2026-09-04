import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { SearchContext } from '../store/contexts.js';
import { useTranslation } from '../store/useTranslation.js';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import AiCopilotDrawer from './AiCopilotDrawer.jsx';

const titleKeyMap = {
  '/dashboard': 'dashboard',
  '/clients': 'clients',
  '/cases': 'cases',
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
  const { t } = useTranslation();

  const title = titleKeyMap[location.pathname] ? t(titleKeyMap[location.pathname]) : 'Noffice';

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
          />
          <main className="main">{children}</main>
        </div>
        <AiCopilotDrawer />
      </div>
    </SearchContext.Provider>
  );
}
