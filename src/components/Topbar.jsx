import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import Avatar from './Avatar.jsx';
import { useTranslation } from '../store/useTranslation.js';

export default function Topbar({ title, searchValue, onSearch, onMenu, notifications = [] }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

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
      <button className="icon-btn menu-toggle" onClick={onMenu} aria-label={t('action.menu') || 'Menu'}>
        <Icon name="menu" size={20} />
      </button>

      <span className="topbar-title">{title}</span>

      <div className="topbar-search" role="search">
        <span className="search-icon">
          <Icon name="search" size={18} />
        </span>
        <input
          type="search"
          placeholder={t('search')}
          value={searchValue}
          onChange={(e) => onSearch(e.target.value)}
          aria-label={t('search')}
        />
        {searchValue && (
          <button className="search-clear" onClick={() => onSearch('')} aria-label={t('search.clear')}>
            <Icon name="x" size={15} />
          </button>
        )}
      </div>

      <div className="topbar-actions">
        <div className="dropdown" ref={notifRef}>
          <button
            className="icon-btn"
            aria-label={`${t('topbar.notifications')} (${notifications.length})`}
            onClick={() => setNotifOpen((v) => !v)}
          >
            <Icon name="bell" size={20} />
            {notifications.length > 0 && (
              <span className="icon-dot" aria-hidden="true" />
            )}
          </button>
          {notifOpen && (
            <div className="dropdown-menu notif-menu" role="menu">
              <div className="dropdown-head">{t('topbar.notifications')}</div>
              {notifications.length === 0 ? (
                <div className="dropdown-empty">{t('topbar.notifEmpty')}</div>
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
          <button className="topbar-profile" aria-label={t('profile')} onClick={() => setProfileOpen((v) => !v)}>
            <Avatar name={t('profile')} />
            <span className="p-namewrap">
              <span className="p-name">{t('profile')}</span>
              <div className="p-role">{t('profileRole')}</div>
            </span>
            <Icon name="chevronDown" size={16} />
          </button>
          {profileOpen && (
            <div className="dropdown-menu" role="menu">
              <button className="dropdown-item" onClick={() => { setProfileOpen(false); navigate('/settings'); }}>
                {t('settings.title')}
              </button>
              <button className="dropdown-item" onClick={() => { setProfileOpen(false); navigate('/settings'); }}>
                {t('settings.account')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
