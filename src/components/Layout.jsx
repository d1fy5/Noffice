import { createContext, useContext, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

const SearchContext = createContext({ query: '', setQuery: () => {} });

export function useSearch() {
  return useContext(SearchContext);
}

const titleMap = {
  '/dashboard': 'Dashboard',
  '/documents': 'Documents',
  '/inbox': 'Inbox',
  '/data-tables': 'Data Tables',
  '/employees': 'Employees',
  '/settings': 'Settings',
};

export default function Layout({ children }) {
  const [query, setQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { documents } = useStore();

  const title = titleMap[location.pathname] || 'Noffice';

  // Derive notifications from actual pending data (not dummy)
  const pendingDocs = documents.filter((d) => d.status === 'pending').length;
  const notifItems = pendingDocs > 0
    ? [{ title: `${pendingDocs} document${pendingDocs > 1 ? 's' : ''} pending approval`, sub: 'View pending documents', route: '/documents' }]
    : [];

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
