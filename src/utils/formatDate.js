import { getNotificationGroup } from '../store/utils.js';
import { DATE_FORMATS } from '../store/constants.js';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function pad(n) {
  return String(n).padStart(2, '0');
}

/**
 * Formats a timestamp into a readable label using the app date format + timezone.
 * e.g. Today · 14:05 / Yesterday · 09:12 / 12 Aug 2026
 */
export function formatNotificationDate(dateTs, dateFormat = 'DD/MM/YYYY', timezone = 'Asia/Jakarta', labels = { today: 'Today', yesterday: 'Yesterday' }) {
  if (!dateTs) return '';
  const d = new Date(dateTs);
  const group = getNotificationGroup(dateTs);
  if (group === 'today') return `${labels.today} · ${formatTime(d, timezone)}`;
  if (group === 'yesterday') return `${labels.yesterday} · ${formatTime(d, timezone)}`;
  return formatDate(d, dateFormat);
}

export function formatTime(date, timezone) {
  try {
    return new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit', timeZone: timezone }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' }).format(date);
  }
}

export function formatDate(date, dateFormat = 'DD/MM/YYYY') {
  const y = date.getFullYear();
  const mo = MONTHS_SHORT[date.getMonth()];
  const moF = MONTHS_FULL[date.getMonth()];
  const dd = pad(date.getDate());
  const mm = pad(date.getMonth() + 1);
  switch (dateFormat) {
    case 'MM/DD/YYYY':
      return `${mm}/${dd}/${y}`;
    case 'YYYY-MM-DD':
      return `${y}-${mm}-${dd}`;
    case 'DD MMM YYYY':
      return `${dd} ${mo} ${y}`;
    case 'MMM D, YYYY':
      return `${mo} ${date.getDate()}, ${y}`;
    case 'DD MMMM YYYY':
      return `${dd} ${moF} ${y}`;
    default:
      return `${dd}/${mm}/${y}`;
  }
}

export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n >= 100 ? Math.round(n) : n.toFixed(1)} ${units[i]}`;
}

export { getNotificationGroup, DATE_FORMATS };
