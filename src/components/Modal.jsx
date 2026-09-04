import Icon from './Icon.jsx';
import { useTranslation } from '../store/useTranslation.js';

export default function Modal({ open, onClose, title, children, footer, footerContent, wide = false }) {
  const { t } = useTranslation();
  if (!open) return null;
  const modalFooter = footer || footerContent;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div
        className={`modal ${wide ? 'modal-wide' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        <div className="modal-titlebar">
          <h2>{title}</h2>
          <button className="action-btn" onClick={onClose} aria-label={t('action.close')}>
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {modalFooter && <div className="modal-footer">{modalFooter}</div>}
      </div>
    </div>
  );
}

