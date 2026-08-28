import Icon from './Icon.jsx';

const iconColor = {
  documents: '#2563eb',
  clock: '#d97706',
  employees: '#16a34a',
  chart: '#7c3aed',
};

export default function StatCard({ label, value, trend, dir, color, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: color || iconColor[icon] }}>
        <Icon name={icon} size={22} />
      </div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        <div className={`stat-trend ${dir === 'down' ? 'down' : 'up'}`}>
          <Icon name={dir === 'down' ? 'chevronDown' : 'chart'} size={13} />
          {trend}
          <span style={{ color: 'var(--text-3)', fontWeight: 500, marginLeft: 2 }}>vs last month</span>
        </div>
      </div>
    </div>
  );
}
