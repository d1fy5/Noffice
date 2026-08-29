import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider } from './store/StoreProvider.jsx';
import { ThemeProvider } from './store/ThemeProvider.jsx';
import { ToastProvider } from './store/ToastProvider.jsx';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Documents from './pages/Documents.jsx';
import Inbox from './pages/Inbox.jsx';
import DataTables from './pages/DataTables.jsx';
import Employees from './pages/Employees.jsx';
import Notifications from './pages/Notifications.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  return (
    <StoreProvider>
      <ThemeProvider>
        <ToastProvider>
          <BrowserRouter>
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/documents" element={<Documents />} />
                <Route path="/inbox" element={<Inbox />} />
                <Route path="/data-tables" element={<DataTables />} />
                <Route path="/employees" element={<Employees />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </StoreProvider>
  );
}
