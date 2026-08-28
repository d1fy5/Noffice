import Icon from './Icon.jsx';

export default function Modal({ open, onClose, title, children, footerContent, wide = false }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div
        className={`modal ${wide ? 'modal-wide' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        <div className="modal-titlebar">
          <h2 style={{ fontSize: 16 }}>{title}</h2>
          <button className="action-btn" onClick={onClose} aria-label="Close dialog">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footerContent && <div className="modal-footer">{footerContent}</div>}
      </div>
    </div>
  );
}
