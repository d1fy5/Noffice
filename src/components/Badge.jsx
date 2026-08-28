export default function Badge({ status }) {
  const map = {
    approved: 'badge-approved',
    pending: 'badge-pending',
    rejected: 'badge-rejected',
    active: 'badge-active',
    inactive: 'badge-inactive',
  };
  const label = { approved: 'Approved', pending: 'Pending', rejected: 'Rejected', active: 'Active', inactive: 'Inactive' };
  const cls = map[status] || 'badge-info';
  return (
    <span className={`badge ${cls}`}>
      <span className="badge-dot" aria-hidden="true" />
      {label[status] || status}
    </span>
  );
}
