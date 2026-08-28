import { createContext, useContext, useState } from 'react';
import { useLocation } from 'react-router-dom';
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

  const title = titleMap[location.pathname] || 'Noffice';

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
      </div>
    </SearchContext.Provider>
  );
}
