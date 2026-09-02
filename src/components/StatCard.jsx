import Icon from './Icon.jsx';

const iconGradients = {
  documents: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
  clock: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  employees: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  user: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  fileText: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
  chart: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
};

const iconGlows = {
  documents: '0 6px 16px rgba(37, 99, 235, 0.3)',
  clock: '0 6px 16px rgba(245, 158, 11, 0.3)',
  employees: '0 6px 16px rgba(16, 185, 129, 0.3)',
  user: '0 6px 16px rgba(16, 185, 129, 0.3)',
  fileText: '0 6px 16px rgba(99, 102, 241, 0.3)',
  chart: '0 6px 16px rgba(139, 92, 246, 0.3)',
};

export default function StatCard({ label, value, icon, sub, color }) {
  const bgStyle = color || iconGradients[icon] || iconGradients.documents;
  const shadowStyle = iconGlows[icon] || iconGlows.documents;

  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: bgStyle, boxShadow: shadowStyle }}>
        <Icon name={icon} size={22} />
      </div>
      <div style={{ flex: 1 }}>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

