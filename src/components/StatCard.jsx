import Icon from './Icon.jsx';

export default function StatCard({ label, value, icon, sub, tone }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone ? `tone-${tone}` : ''}`}>
        <Icon name={icon} size={20} />
      </div>
      <div style={{ flex: 1 }}>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

