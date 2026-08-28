import { NavLink } from 'react-router-dom';
import Icon from './Icon.jsx';
import Avatar from './Avatar.jsx';
import { useTranslation } from '../store/useTranslation.js';

const mainNav = [
  { to: '/dashboard', icon: 'dashboard', labelKey: 'dashboard' },
  { to: '/documents', icon: 'documents', labelKey: 'documents' },
  { to: '/inbox', icon: 'inbox', labelKey: 'inbox' },
  { to: '/data-tables', icon: 'table', labelKey: 'data-tables' },
];

const secondaryNav = [
  { to: '/employees', icon: 'employees', labelKey: 'employees' },
  { to: '/settings', icon: 'settings', labelKey: 'settings' },
];

export default function Sidebar({ open, onClose }) {
  const { t } = useTranslation();
  return (
    <>
      <div className={`drawer-backdrop ${open ? 'show' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Sidebar navigation">
        <div className="sidebar-logo">
          <div className="logo-mark">N</div>
          <div>
            <div className="logo-text">{t('app.name')}</div>
            <div className="logo-tag">{t('app.subtitle')}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group-label">{t('nav.main')}</div>
          {mainNav.map((item) => (
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

          <div className="nav-group-label">{t('nav.org')}</div>
          {secondaryNav.map((item) => (
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
        </nav>

        <div className="sidebar-profile">
          <Avatar name="Noffice User" />
          <div>
            <div className="sp-name">{t('profile')}</div>
            <div className="sp-role">{t('profileRole')}</div>
          </div>
          <span className="sp-logout" aria-label={t('admin.logout') || 'Logout'}>
            <Icon name="logout" size={18} />
          </span>
        </div>
      </aside>
    </>
  );
}
