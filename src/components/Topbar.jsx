import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import Avatar from './Avatar.jsx';
import { useStore } from '../store/hooks.js';
import { useTranslation } from '../store/useTranslation.js';
import { formatNotificationDate } from '../utils/formatDate.js';

export default function Topbar({ title, searchValue, onSearch, onMenu, notifications = [] }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { notificationItems = [], markNotificationRead, general } = useStore();

  // Collapse topbar notifications with the real feed, keeping any passed items too.
  const merged = [...notifications].map((n, i) => ({ id: 'legacy-' + i, ...n }));
  const allItems = [...notificationItems, ...merged]
    .sort((a, b) => (b.dateTs || 0) - (a.dateTs || 0));
  const unreadCount = allItems.filter((n) => !n.read).length;

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
            aria-label={`${t('topbar.notifications')} (${unreadCount})`}
            onClick={() => setNotifOpen((v) => !v)}
          >
            <Icon name="bell" size={20} />
            {unreadCount > 0 && (
              <span className="icon-dot" aria-hidden="true" />
            )}
          </button>
          {notifOpen && (
            <div className="dropdown-menu notif-menu" role="menu">
              <div className="dropdown-head">
                {t('topbar.notifications')}
                <span className="dropdown-head-count">{unreadCount} {t('notif.unreadLower')}</span>
              </div>
              {allItems.length === 0 ? (
                <div className="dropdown-empty">{t('topbar.notifEmpty')}</div>
              ) : (
                <>
                  {allItems.slice(0, 5).map((n) => (
                    <button
                      key={n.id}
                      className="dropdown-item"
                      onClick={() => {
                        if (!n.read && !n.id.startsWith('legacy-')) markNotificationRead(n.id);
                        setNotifOpen(false);
                        navigate(n.route || '/notifications');
                      }}
                    >
                      <span className={`dropdown-item-title ${n.read ? '' : 'unread'}`}>{n.title}</span>
                      <span className="dropdown-item-sub">{n.message || n.sub}</span>
                      <span className="dropdown-item-time">
                        {n.dateTs
                          ? formatNotificationDate(n.dateTs, general.dateFormat, general.timezone, { today: t('notif.group.today'), yesterday: t('notif.group.yesterday') })
                          : (n.sub || '')}
                      </span>
                    </button>
                  ))}
                  <button
                    className="dropdown-item notif-link-all"
                    onClick={() => {
                      setNotifOpen(false);
                      navigate('/notifications');
                    }}
                  >
                    {t('notif.viewAll')}
                  </button>
                </>
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
