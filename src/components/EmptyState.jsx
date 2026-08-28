import Icon from './Icon.jsx';

export default function EmptyState({ icon = 'file', title, description, action }) {
  return (
    <div className="empty-state" role="status">
      <div className="empty-icon">
        <Icon name={icon} size={30} />
      </div>
      <h3 className="empty-title">{title}</h3>
      {description && <p className="empty-desc">{description}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}
