const DAY = 24 * 60 * 60 * 1000;

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function uid() {
  return 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Reusable helper that buckets a timestamp into a notification time group.
 * Returns 'today' | 'yesterday' | 'earlier'.
 */
export function getNotificationGroup(dateTs, now = Date.now()) {
  if (!dateTs) return 'earlier';
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = startOfToday.getTime() - DAY;
  if (dateTs >= startOfToday.getTime()) return 'today';
  if (dateTs >= startOfYesterday) return 'yesterday';
  return 'earlier';
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

export function extOf(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return 'xlsx';
  if (ext === 'docx' || ext === 'doc') return 'docx';
  return 'docx';
}