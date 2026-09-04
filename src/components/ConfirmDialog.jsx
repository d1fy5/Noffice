import Button from './Button.jsx';
import Icon from './Icon.jsx';
import { useTranslation } from '../store/useTranslation.js';

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onCancel, onConfirm, danger = false }) {
  const { t } = useTranslation();
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onCancel} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-titlebar">
          <h2 style={{ fontSize: 16 }}>{title}</h2>
          <button className="action-btn" onClick={onCancel} aria-label={t('action.close')}>
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="modal-body">
          <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 14, lineHeight: 1.6 }}>{message}</p>
          <div className="modal-actions" style={{ justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onCancel}>{t('action.cancel')}</Button>
            <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
