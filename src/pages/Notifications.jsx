import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, useToast } from '../store/hooks.js';
import { useTranslation } from '../store/useTranslation.js';
import Breadcrumb from '../components/Breadcrumb.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { formatNotificationDate, getNotificationGroup } from '../utils/formatDate.js';

const TABS = [
  { id: 'all', icon: 'bell' },
  { id: 'unread', icon: 'mail' },
  { id: 'mentions', icon: 'message' },
  { id: 'approvals', icon: 'shield' },
];

const TYPE_ICON = {
  submission: 'documents',
  approval: 'shield',
  message: 'mail',
  storage: 'alert',
  employee: 'user',
  rejection: 'x',
};

export default function Notifications() {
  const { t } = useTranslation();
  const { notificationItems = [], markNotificationRead, markAllNotificationsRead, general } = useStore();
  const { notify } = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState('all');

  const unreadCount = useMemo(
    () => notificationItems.filter((n) => !n.read).length,
    [notificationItems]
  );

  const mentionsCount = useMemo(
    () => notificationItems.filter((n) => n.mention || n.type === 'message').length,
    [notificationItems]
  );
  const approvalsCount = useMemo(
    () => notificationItems.filter((n) => n.approval || n.type === 'approval' || n.type === 'submission' || n.type === 'rejection').length,
    [notificationItems]
  );

  const filtered = useMemo(() => {
    let rows = notificationItems;
    if (tab === 'unread') rows = rows.filter((n) => !n.read);
    else if (tab === 'mentions') rows = rows.filter((n) => n.mention || n.type === 'message');
    else if (tab === 'approvals') rows = rows.filter((n) => n.approval || n.type === 'approval' || n.type === 'submission' || n.type === 'rejection');
    return [...rows].sort((a, b) => (b.dateTs || 0) - (a.dateTs || 0));
  }, [notificationItems, tab]);

  const groups = useMemo(() => {
    const g = { today: [], yesterday: [], earlier: [] };
    filtered.forEach((n) => {
      const key = getNotificationGroup(n.dateTs);
      if (g[key]) g[key].push(n);
    });
    return g;
  }, [filtered]);

  const openNotification = (n) => {
    markNotificationRead(n.id);
    if (n.route) navigate(n.route);
  };

  const handleView = (n) => {
    if (n.route) {
      markNotificationRead(n.id);
      navigate(n.route);
    } else {
      markNotificationRead(n.id);
      notify(t('notif.viewed'));
    }
  };

  const handleMarkAll = () => {
    markAllNotificationsRead();
    notify(t('notif.markAllRead'));
  };

  const renderRow = (n) => {
    const icon = TYPE_ICON[n.type] || (n.approval ? 'shield' : 'bell');
    return (
      <li
        key={n.id}
        className={`notif-row ${n.read ? '' : 'unread'}`}
        onClick={() => openNotification(n)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openNotification(n);
          }
        }}
      >
        <span className="notif-icon-wrap">
          <span className={`notif-icon type-${n.type || 'generic'}`}>
            <Icon name={icon} size={18} />
          </span>
        </span>
        <span className="notif-content">
          <span className="notif-title">{n.title}</span>
          <span className="notif-msg">{n.message}</span>
          <span className="notif-time">{formatNotificationDate(n.dateTs, general.dateFormat, general.timezone, { today: t('notif.group.today'), yesterday: t('notif.group.yesterday') })}</span>
        </span>
        <span className="notif-actions">
          {!n.read && <span className="notif-unread-dot" aria-hidden="true" />}
          <button
            className="view-btn-mini"
            onClick={(e) => {
              e.stopPropagation();
              handleView(n);
            }}
            aria-label={`${t('action.view')} ${n.title}`}
          >
            {t('action.view')}
          </button>
        </span>
      </li>
    );
  };

  const renderGroup = (label, items) => {
    if (!items.length) return null;
    return (
      <section className="notif-group">
        <h3 className="notif-group-label">{label}</h3>
        <ul className="notif-list">{items.map(renderRow)}</ul>
      </section>
    );
  };

  return (
    <>
      <Breadcrumb crumbs={[{ label: t('breadcrumb.home'), to: '/dashboard' }, { label: t('notif.title') }]} />
      <PageHeader
        title={t('notif.title')}
        subtitle={t('notif.subtitle')}
        actions={
          unreadCount > 0 ? (
            <Button variant="secondary" icon="check" onClick={handleMarkAll}>{t('notif.markAllRead')}</Button>
          ) : null
        }
      />

      <div className="notif-tabs" role="tablist" aria-label={t('notif.title')}>
        {TABS.map((tabItem) => {
          let count = null;
          if (tabItem.id === 'all') count = notificationItems.length;
          else if (tabItem.id === 'unread') count = unreadCount;
          else if (tabItem.id === 'mentions') count = mentionsCount;
          else if (tabItem.id === 'approvals') count = approvalsCount;
          return (
            <button
              key={tabItem.id}
              role="tab"
              aria-selected={tab === tabItem.id}
              className={`notif-tab ${tab === tabItem.id ? 'active' : ''}`}
              onClick={() => setTab(tabItem.id)}
            >
              <span className="notif-tab-icon"><Icon name={tabItem.icon} size={16} /></span>
              {t(`notif.tab.${tabItem.id}`)}
              {count > 0 && <span className="notif-tab-count">{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="card table-card notif-card">
        {filtered.length === 0 ? (
          <EmptyState
            icon="bell"
            title={t('notif.empty.title')}
            description={t('notif.empty.desc')}
          />
        ) : (
          <div className="notif-list-wrap">
            {renderGroup(t('notif.group.today'), groups.today)}
            {renderGroup(t('notif.group.yesterday'), groups.yesterday)}
            {renderGroup(t('notif.group.earlier'), groups.earlier)}
          </div>
        )}
      </div>
    </>
  );
}
