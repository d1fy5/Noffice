import { useMemo, useState } from 'react';
import { useStore, DEPARTMENTS } from '../store/StoreContext.jsx';
import { useSearch } from '../components/Layout.jsx';
import { useToast } from '../store/ToastContext.jsx';
import { useTranslation } from '../store/useTranslation.js';
import Avatar from '../components/Avatar.jsx';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Breadcrumb from '../components/Breadcrumb.jsx';
import PageHeader from '../components/PageHeader.jsx';

const STATUS_OPTIONS = [
  { value: 'approved', labelKey: 'doc.status.approved' },
  { value: 'pending', labelKey: 'doc.status.pending' },
  { value: 'rejected', labelKey: 'doc.status.rejected' },
];

export default function DataTables() {
  const { query } = useSearch();
  const { submissions, updateDocument, deleteDocument } = useStore();
  const { notify } = useToast();
  const { t } = useTranslation();

  const [dept, setDept] = useState('all');
  const [status, setStatus] = useState('all');
  const [viewing, setViewing] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    let rows = submissions;
    if (dept !== 'all') rows = rows.filter((r) => r.dept === dept);
    if (status !== 'all') rows = rows.filter((r) => r.status === status);
    if (q) rows = rows.filter((r) => `${r.id} ${r.name} ${r.dept} ${r.doc}`.toLowerCase().includes(q));
    return rows;
  }, [submissions, dept, status, q]);

  const initials = (name) => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const exportCSV = () => {
    if (filtered.length === 0) return;
    const header = ['ID', 'Employee Name', 'Department', 'Document Title', 'Date Submitted', 'Status'];
    const rows = filtered.map((r) => [r.id, r.name, r.dept, r.doc, r.date, r.status]);
    const csv = [header, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'noffice-submissions.csv';
    a.click();
    URL.revokeObjectURL(url);
    notify(t('table.export.msg'));
  };

  const doDelete = () => {
    if (!confirmId) return;
    deleteDocument(confirmId);
    setConfirmId(null);
    if (viewing && viewing.subId === confirmId) setViewing(null);
    notify(t('action.delete'));
  };

  return (
    <>
      <Breadcrumb crumbs={[{ label: t('breadcrumb.home'), to: '/dashboard' }, { label: t('table.title') }]} />
      <PageHeader
        title={t('table.title')}
        subtitle={t('table.subtitle')}
        actions={<Button variant="secondary" icon="download" onClick={exportCSV} disabled={filtered.length === 0}>{t('action.export')}</Button>}
      />

      <div className="table-controls">
        <select className="filter-select" value={dept} onChange={(e) => setDept(e.target.value)} aria-label={t('status.allDepts')}>
          <option value="all">{t('status.allDepts')}</option>
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="filter-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t('status.all')}>
          <option value="all">{t('status.all')}</option>
          {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{t(s.labelKey)}</option>)}
        </select>
        <input className="filter-select" type="date" aria-label={t('table.date')} />
      </div>

      <div className="card table-card">
        {filtered.length === 0 ? (
          <EmptyState
            icon="table"
            title={t('table.empty.title')}
            description={t('table.empty.desc')}
          />
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('table.col.id')}</th>
                    <th>{t('table.col.employee')}</th>
                    <th>{t('table.col.dept')}</th>
                    <th>{t('table.col.doc')}</th>
                    <th>{t('table.col.date')}</th>
                    <th>{t('table.col.status')}</th>
                    <th>{t('table.col.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.subId}>
                      <td className="cell-id">{r.id}</td>
                      <td>
                        <div className="employee-cell">
                          <Avatar name={r.name} size="sm" />
                          <div className="emp-name">{r.name}</div>
                        </div>
                      </td>
                      <td>{r.dept}</td>
                      <td className="cell-doc">{r.doc}</td>
                      <td className="cell-date">{r.date}</td>
                      <td><Badge status={r.status} /></td>
                      <td>
                        <span className="row-actions">
                          <button className="action-btn" onClick={() => setViewing(r)} aria-label={`${t('action.view')} ${r.id}`}><Icon name="eye" size={16} /></button>
                          <button className="action-btn" onClick={() => setConfirmId(r.subId)} aria-label={`${t('action.delete')} ${r.id}`}><Icon name="trash" size={16} /></button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card-footer pagination-info">
              {t('table.showing')} {filtered.length} {t('table.col.id').toLowerCase()}
            </div>
          </>
        )}
      </div>

      {viewing && (
        <Modal open onClose={() => setViewing(null)} title={viewing.doc}>
          <dl className="doc-detail-list">
            <div><dt>{t('table.col.id')}</dt><dd>{viewing.id}</dd></div>
            <div><dt>{t('table.col.employee')}</dt><dd>{viewing.name}</dd></div>
            <div><dt>{t('table.col.dept')}</dt><dd>{viewing.dept}</dd></div>
            <div><dt>{t('table.col.date')}</dt><dd>{viewing.date}</dd></div>
            <div className="with-badge"><dt>{t('table.col.status')}</dt><dd><Badge status={viewing.status} /></dd></div>
          </dl>
          <div className="form-group">
            <label className="form-label" htmlFor="sub-status">{t('doc.updateStatus')}</label>
            <select
              className="form-select"
              id="sub-status"
              value={viewing.status}
              onChange={(e) => {
                updateDocument(viewing.subId, { status: e.target.value });
                notify(t('doc.updateStatus'));
                setViewing((v) => ({ ...v, status: e.target.value }));
              }}
            >
              {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{t(s.labelKey)}</option>)}
            </select>
          </div>
          <div className="modal-actions">
            <Button variant="ghost" icon="trash" onClick={() => { setConfirmId(viewing.subId); }}>{t('action.delete')}</Button>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!confirmId}
        title={t('doc.delete.title')}
        message={t('doc.delete.msg')}
        confirmLabel={t('action.delete')}
        onCancel={() => setConfirmId(null)}
        onConfirm={doDelete}
      />
    </>
  );
}
