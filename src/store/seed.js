import { uid, formatBytes } from './utils.js';

const DAY = 24 * 60 * 60 * 1000;

/**
 * Builds the initial notification feed from real app data whenever possible.
 * Only falls back to curated system notifications when the account is empty.
 */
export function buildInitialNotifications(target = {}) {
  const now = Date.now();
  const out = [];
  const push = (n, offsetDays) => {
    out.push({ id: 'notif-' + uid() + '-' + out.length, dateTs: now - offsetDays * DAY, read: false, ...n });
  };

  const pending = (target.documents || []).filter((d) => !d.isTrashed && d.status === 'pending');
  pending.slice(0, 5).forEach((d, i) => {
    push({
      type: 'submission',
      title: 'New Document Submission',
      message: `${d.author || 'A colleague'} submitted "${d.title}" and is awaiting your review.`,
      approval: true,
      route: '/data-tables',
    }, i * 0.6);
  });

  const messages = target.messages || [];
  messages.slice(0, 3).forEach((m, i) => {
    push({
      type: 'message',
      title: 'Unread Message in Inbox',
      message: `${m.sender || 'Someone'} sent "${m.subject}".`,
      route: '/inbox',
    }, i * 1.2 + 0.3);
  });

  // System-level notifications reflecting real stored state.
  const employees = target.employees || [];
  if (employees.length) {
    const newest = employees.reduce((a, b) => (new Date(b.dateTs || 0) > new Date(a.dateTs || 0) ? b : a), employees[0]);
    push({
      type: 'employee',
      title: 'New Employee Onboarded',
      message: `${newest.firstName || ''} ${newest.lastName || ''} joined as ${newest.role || 'a team member'}.`,
      route: '/employees',
    }, 1.5);
  }

  // Storage warning based on real stored bytes.
  const bytes = (target.documents || []).reduce((s, d) => s + (d.sizeBytes || 0), 0);
  if (bytes > 0) {
    push({
      type: 'storage',
      title: 'Storage Warning Alert',
      message: `Workspace usage has increased to ${formatBytes(bytes)}. Review your storage plan.`,
      approval: false,
      route: '/settings',
    }, 2.5);
  }

  // Curated items only added when the account has never been set up.
  const hasRealActivity = pending.length || messages.length || employees.length;
  if (!hasRealActivity) {
    push({ type: 'approval', title: 'System Audit Approved', message: 'The scheduled system audit completed successfully.', approval: true, route: '/data-tables' }, 0.2);
    push({ type: 'submission', title: 'New Document Submission', message: 'A new report was submitted for review.', approval: true, route: '/data-tables' }, 0.8);
    push({ type: 'approval', title: 'Document Rejected', message: 'A document was rejected and returned to the author.', approval: true, route: '/data-tables' }, 3);
  }

  return out;
}