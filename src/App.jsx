import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { StoreProvider } from './store/StoreContext.jsx';
import { ThemeProvider } from './store/ThemeContext.jsx';
import { ToastProvider } from './store/ToastContext.jsx';
import { AuthProvider, useAuth } from './store/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Documents from './pages/Documents.jsx';
import Inbox from './pages/Inbox.jsx';
import DataTables from './pages/DataTables.jsx';
import Employees from './pages/Employees.jsx';
import Settings from './pages/Settings.jsx';
import Login from './pages/Login.jsx';

// Proteksi Route untuk memastikan user sudah login
function RequireAuth({ children, requireAdmin = false }) {
  const { isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Jika butuh admin tapi user bukan admin, lempar ke dashboard
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <StoreProvider>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                
                {/* Protected Routes dibungkus Layout */}
                <Route
                  path="/*"
                  element={
                    <RequireAuth>
                      <Layout>
                        <Routes>
                          <Route path="/" element={<Navigate to="/dashboard" replace />} />
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/documents" element={<Documents />} />
                          <Route path="/inbox" element={<Inbox />} />
                          <Route path="/settings" element={<Settings />} />
                          
                          {/* Hanya Admin yang bisa akses ini */}
                          <Route path="/data-tables" element={<RequireAuth requireAdmin><DataTables /></RequireAuth>} />
                          <Route path="/employees" element={<RequireAuth requireAdmin><Employees /></RequireAuth>} />
                          
                          <Route path="*" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                      </Layout>
                    </RequireAuth>
                  }
                />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </StoreProvider>
  );
}
