import { useTranslation } from '../store/useTranslation.js';

export default function Badge({ status }) {
  const { t } = useTranslation();
  const map = {
    approved: 'badge-approved',
    pending: 'badge-pending',
    rejected: 'badge-rejected',
    active: 'badge-active',
    inactive: 'badge-inactive',
  };
  const labelKey = {
    approved: 'doc.status.approved',
    pending: 'doc.status.pending',
    rejected: 'doc.status.rejected',
    active: 'status.active',
    inactive: 'status.inactive',
  };
  const cls = map[status] || 'badge-info';
  const label = labelKey[status] ? t(labelKey[status]) : status;
  return (
    <span className={`badge ${cls}`}>
      <span className="badge-dot" aria-hidden="true" />
      {label}
    </span>
  );
}