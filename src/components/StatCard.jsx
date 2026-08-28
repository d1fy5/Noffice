import Icon from './Icon.jsx';

const iconColor = {
  documents: '#2563eb',
  clock: '#d97706',
  employees: '#16a34a',
  chart: '#7c3aed',
};

export default function StatCard({ label, value, icon, sub, color }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: color || iconColor[icon] }}>
        <Icon name={icon} size={22} />
      </div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}
