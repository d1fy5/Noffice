import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import Avatar from './Avatar.jsx';
import { useTranslation } from '../store/useTranslation.js';
import { useAuth } from '../store/AuthContext.jsx';
import { useToast } from "../store/hooks.js";

const mainNav = [
  { to: '/dashboard', icon: 'dashboard', labelKey: 'dashboard' },
  { to: '/clients', icon: 'user', labelKey: 'clients' },
  { to: '/cases', icon: 'fileText', labelKey: 'cases' },
  { to: '/documents', icon: 'documents', labelKey: 'documents' },
  { to: '/inbox', icon: 'inbox', labelKey: 'inbox' },
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
    if (!open) return;
    document.body.classList.add('drawer-open');
    document.documentElement.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('drawer-open');
      document.documentElement.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return (
    <>
      <div className={`drawer-backdrop ${open ? 'show' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label={t('app.name')}>
        <div className="sidebar-logo">
          <div className="logo-mark">N</div>
          <div>
            <div className="logo-text">{t('app.name')}</div>
            <div className="logo-tag">{t('app.subtitle')}</div>
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
              <span className="nav-icon"><Icon name={item.icon} size={19} /></span>
              {t(item.labelKey)}
            </NavLink>
          ))}

          {filteredSecondaryNav.length > 0 && (
            <>
              <div className="nav-group-label">{t('nav.org')}</div>
              {filteredSecondaryNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <span className="nav-icon"><Icon name={item.icon} size={19} /></span>
                  {t(item.labelKey)}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="sidebar-profile">
          <Avatar name={user?.name || "Noffice User"} />
          <div>
            <div className="sp-name">{user?.name || t('profile')}</div>
            <div className="sp-role">{user?.role === 'admin' ? 'Administrator' : 'Karyawan'}</div>
          </div>
          <span className="sp-logout" aria-label="Logout" onClick={handleLogout} style={{cursor: 'pointer'}}>
            <Icon name="logout" size={18} />
          </span>
        </div>
      </aside>
    </>
  );
}
