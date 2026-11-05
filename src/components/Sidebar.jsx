import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import Avatar from './Avatar.jsx';
import LogoMark from './LogoMark.jsx';
import { useTranslation } from '../store/useTranslation.js';
import { useAuth } from '../store/AuthContext.jsx';
import { useToast } from "../store/hooks.js";

const mainNav = [
  { to: '/dashboard', icon: 'dashboard', labelKey: 'dashboard' },
  { to: '/clients', icon: 'user', labelKey: 'clients' },
  { to: '/cases', icon: 'fileText', labelKey: 'cases' },
  { to: '/ppat-cases', icon: 'documents', labelKey: 'ppatCases' },
  { to: '/documents', icon: 'documents', labelKey: 'documents' },
  { to: '/data-tables', icon: 'table', labelKey: 'data-tables', adminOnly: true },
];

const secondaryNav = [
  { to: '/employees', icon: 'employees', labelKey: 'employees', adminOnly: true },
  { to: '/settings', icon: 'settings', labelKey: 'settings' },
];

export default function Sidebar({ open, onClose }) {
  const { t } = useTranslation();
  const { user, isAdmin, logout } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    notify('Anda berhasil logout.', 'info');
    navigate('/login');
  };

  const filteredMainNav = mainNav.filter(item => !item.adminOnly || isAdmin);
  const filteredSecondaryNav = secondaryNav.filter(item => !item.adminOnly || isAdmin);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <>
      <div
        className={`sidebar-backdrop ${open ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label={t('nav.main')}>
        <div className="sidebar-brand">
          <div className="brand-logo-wrap">
            <LogoMark size={28} className="brand-logo" />
            <div className="brand-text">
              <span className="brand-title">Noffice</span>
              <span className="brand-sub">Document Management</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group-label">{t('nav.main')}</div>
          {filteredMainNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="nav-icon"><Icon name={item.icon} size={18} /></span>
              <span className="nav-label">{t(item.labelKey)}</span>
            </NavLink>
          ))}

          <div className="nav-group-label" style={{ marginTop: '20px' }}>
            {t('nav.settings')}
          </div>
          {filteredSecondaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="nav-icon"><Icon name={item.icon} size={18} /></span>
              <span className="nav-label">{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile-summary">
            <Avatar name={user?.name || 'User'} size={36} />
            <div className="user-info">
              <div className="user-name-text">{user?.name || 'User'}</div>
              <div className="user-role-text">{user?.role === 'admin' ? 'Administrator' : 'Staf Notaris'}</div>
            </div>
            <button className="logout-btn" onClick={handleLogout} title="Logout">
              <Icon name="logout" size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
