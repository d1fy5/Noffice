import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import Avatar from './Avatar.jsx';
import { useStore } from '../store/hooks.js';
import { useTranslation } from '../store/useTranslation.js';

export default function Topbar({ title, searchValue, onSearch, onMenu }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { notificationItems = [] } = useStore();

  const unreadCount = notificationItems.filter((n) => !n.read).length;
  const onNotifications = location.pathname === '/notifications';

  useEffect(() => {
    const handler = (e) => {
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
        <button
          className={`icon-btn ${onNotifications ? 'active' : ''}`}
          onClick={() => navigate('/notifications')}
          aria-label={`${t('topbar.notifications')} (${unreadCount})`}
        >
          <Icon name="bell" size={20} />
          {unreadCount > 0 && (
            <span className="icon-dot" aria-hidden="true" />
          )}
        </button>

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
