import Icon from './Icon.jsx';
import { useTranslation } from '../store/useTranslation.js';
import { Link } from 'react-router-dom';

export default function Breadcrumb({ crumbs }) {
  const { t } = useTranslation();
  const items = crumbs || [{ label: t('breadcrumb.home'), to: '/dashboard' }];
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} style={{ display: 'contents' }}>
            {i > 0 && <span className="sep" aria-hidden="true">/</span>}
            {last ? (
              <span className="current">{c.label}</span>
            ) : c.to ? (
              <Link to={c.to}>{c.label}</Link>
            ) : (
              <span>{c.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
