import Icon from './Icon.jsx';

export default function Button({ variant = 'secondary', size = '', icon, children, className = '', type = 'button', ...rest }) {
  const cls = `btn btn-${variant} ${size ? `btn-${size}` : ''} ${className}`.trim();
  return (
    <button type={type} className={cls} {...rest}>
      {icon && (
        <span className="btn-icon">
          <Icon name={icon} size={16} />
        </span>
      )}
      {children}
    </button>
  );
}
