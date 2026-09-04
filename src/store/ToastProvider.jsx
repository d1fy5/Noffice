import { useCallback, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { ToastContext } from './contexts.js';

const kinds = {
  success: { icon: 'check', className: 'toast-success' },
  error: { icon: 'x', className: 'toast-error' },
  info: { icon: 'bell', className: 'toast-info' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const push = useCallback((message, kind = 'success') => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3200);
  }, []);

  const notify = useCallback(
    (message, kind) => {
      push(message, kind || 'success');
    },
    [push]
  );

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => {
          const k = kinds[t.kind] || kinds.info;
          return (
            <div key={t.id} className={`toast ${k.className}`}>
              <span className="toast-icon">
                <Icon name={k.icon} size={16} />
              </span>
              <span className="toast-msg">{t.message}</span>
              <button
                className="toast-close"
                onClick={() => setToasts((arr) => arr.filter((x) => x.id !== t.id))}
                aria-label="Dismiss notification"
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}