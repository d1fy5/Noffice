import { NavLink } from 'react-router-dom';
import Icon from './Icon.jsx';
import Avatar from './Avatar.jsx';

const mainNav = [
  { to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { to: '/documents', icon: 'documents', label: 'Documents' },
  { to: '/inbox', icon: 'inbox', label: 'Inbox' },
  { to: '/data-tables', icon: 'table', label: 'Data Tables' },
];

const secondaryNav = [
  { to: '/employees', icon: 'employees', label: 'Employees' },
  { to: '/settings', icon: 'settings', label: 'Settings' },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      <div className={`drawer-backdrop ${open ? 'show' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Sidebar navigation">
        <div className="sidebar-logo">
          <div className="logo-mark">N</div>
          <div>
            <div className="logo-text">Noffice</div>
            <div className="logo-tag">Document Management</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group-label">Main</div>
          {mainNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="nav-icon">
                <Icon name={item.icon} size={19} />
              </span>
              {item.label}
            </NavLink>
          ))}

          <div className="nav-group-label">Organisation</div>
          {secondaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="nav-icon">
                <Icon name={item.icon} size={19} />
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-profile">
          <Avatar name="Noffice User" />
          <div>
            <div className="sp-name">Noffice User</div>
            <div className="sp-role">Administrator</div>
          </div>
          <span style={{ marginLeft: 'auto', color: '#5f6d92' }}>
            <Icon name="logout" size={18} />
          </span>
        </div>
      </aside>
    </>
  );
}
