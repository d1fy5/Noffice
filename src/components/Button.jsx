import Icon from './Icon.jsx';

export default function Button({ variant = 'secondary', size = '', icon, children, className = '', ...rest }) {
  const cls = `btn btn-${variant} ${size ? `btn-${size}` : ''} ${className}`.trim();
  return (
    <button className={cls} {...rest}>
      {icon && (
        <span className="btn-icon">
          <Icon name={icon} size={16} />
        </span>
      )}
      {children}
    </button>
  );
}
