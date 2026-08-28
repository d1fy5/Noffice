import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import Avatar from './Avatar.jsx';

export default function Topbar({ title, searchValue, onSearch, onMenu, notifications = [] }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="topbar">
      <button className="icon-btn menu-toggle" onClick={onMenu} aria-label="Open navigation menu">
        <Icon name="menu" size={20} />
      </button>

      <span className="topbar-title">{title}</span>

      <div className="topbar-search" role="search">
        <span className="search-icon">
          <Icon name="search" size={18} />
        </span>
        <input
          type="search"
          placeholder="Search documents, employees, messages..."
          value={searchValue}
          onChange={(e) => onSearch(e.target.value)}
          aria-label="Search"
        />
        {searchValue && (
          <button className="search-clear" onClick={() => onSearch('')} aria-label="Clear search">
            <Icon name="x" size={15} />
          </button>
        )}
      </div>

      <div className="topbar-actions">
        <div className="dropdown" ref={notifRef}>
          <button
            className="icon-btn"
            aria-label={`Notifications (${notifications.length})`}
            onClick={() => setNotifOpen((v) => !v)}
          >
            <Icon name="bell" size={20} />
            {notifications.length > 0 && (
              <span className="icon-dot" aria-hidden="true" />
            )}
          </button>
          {notifOpen && (
            <div className="dropdown-menu notif-menu" role="menu">
              <div className="dropdown-head">Notifications</div>
              {notifications.length === 0 ? (
                <div className="dropdown-empty">You're all caught up.</div>
              ) : (
                notifications.slice(0, 6).map((n, i) => (
                  <button
                    key={i}
                    className="dropdown-item"
                    onClick={() => {
                      setNotifOpen(false);
                      navigate(n.route || '/documents');
                    }}
                  >
                    <span className="dropdown-item-title">{n.title}</span>
                    <span className="dropdown-item-sub">{n.sub}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="dropdown" ref={profileRef}>
          <button className="topbar-profile" aria-label="Profile menu" onClick={() => setProfileOpen((v) => !v)}>
            <Avatar name="Noffice User" />
            <span className="p-namewrap">
              <span className="p-name">Noffice User</span>
              <div className="p-role">Admin</div>
            </span>
            <Icon name="chevronDown" size={16} />
          </button>
          {profileOpen && (
            <div className="dropdown-menu" role="menu">
              <button className="dropdown-item" onClick={() => { setProfileOpen(false); navigate('/settings'); }}>
                Settings
              </button>
              <button className="dropdown-item" onClick={() => { setProfileOpen(false); navigate('/settings'); }}>
                Account
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
