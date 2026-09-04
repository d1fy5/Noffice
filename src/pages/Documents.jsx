import { useMemo, useState } from 'react';
import { useStore, useSearch, useToast } from '../store/hooks.js';
import { useTranslation } from '../store/useTranslation.js';
import { useAuth } from '../store/AuthContext.jsx';
import { DOC_CATEGORIES } from '../store/constants.js';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import UploadModal from '../components/UploadModal.jsx';
import Breadcrumb from '../components/Breadcrumb.jsx';
import PageHeader from '../components/PageHeader.jsx';

const CATEGORY_IDS = DOC_CATEGORIES.map((c) => c.id);

// Determines which folder a document belongs to. Uses the stored category
// (the value set on upload) and falls back to a default folder for any
// legacy values that no longer match the notary categories.
function categoryOf(d) {
  const c = d.category || d.dept;
  return CATEGORY_IDS.includes(c) ? c : 'Lainnya';
}

export default function Documents() {
  const { query } = useSearch();
  const {
    documents,
    deleteDocument,
    restoreDocument,
    deleteDocumentPermanently,
    emptyTrash,
    updateDocument,
    updateDocumentStatus,
  } = useStore();
  const { notify } = useToast();
  const { t } = useTranslation();
  const { isAdmin, user } = useAuth();

  const [folder, setFolder] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('newest');
  const [view, setView] = useState('grid');
  const [selected, setSelected] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [permanentId, setPermanentId] = useState(null);
  const [emptyConfirm, setEmptyConfirm] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [decision, setDecision] = useState(null);

  const q = query.trim().toLowerCase();
  const inTrash = folder === 'trash';

  const FOLDERS = useMemo(
    () => [
      { id: 'all', label: t('doc.all'), icon: 'folders', trash: false },
      ...DOC_CATEGORIES.map((c) => ({ id: c.id, label: t(c.labelKey), icon: 'folders', trash: false })),
      { id: 'trash', label: t('doc.trash'), icon: 'trash', trash: true },
    ],
    [t]
  );

  const filtered = useMemo(() => {
    let rows = inTrash ? documents.filter((d) => d.isTrashed) : documents.filter((d) => !d.isTrashed);
    if (!inTrash && folder !== 'all') {
      rows = rows.filter((d) => categoryOf(d) === folder);
    }
    if (status !== 'all') rows = rows.filter((d) => d.status === status);
    if (q) rows = rows.filter((d) => `${d.title} ${d.author} ${d.dept}`.toLowerCase().includes(q));
    if (sort === 'newest') rows = [...rows].sort((a, b) => (b.dateTs || 0) - (a.dateTs || 0));
    else if (sort === 'oldest') rows = [...rows].sort((a, b) => (a.dateTs || 0) - (b.dateTs || 0));
    else if (sort === 'size') rows = [...rows].sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0));
    return rows;
  }, [documents, folder, status, sort, q, inTrash]);

  const folderCount = (fid) => {
    if (fid === 'trash') return documents.filter((d) => d.isTrashed).length;
    if (fid === 'all') return documents.filter((d) => !d.isTrashed).length;
    return documents.filter((d) => !d.isTrashed && categoryOf(d) === fid).length;
  };

  const currentFolderLabel = FOLDERS.find((f) => f.id === folder)?.label || t('doc.all');

  const openUpload = () => setUploadOpen(true);

  const doMoveToTrash = () => {
    if (!confirmId) return;
    const doc = documents.find((d) => d.id === confirmId);
    deleteDocument(confirmId);
    setConfirmId(null);
    if (selected && selected.id === confirmId) setSelected(null);
    notify(`${doc ? doc.title : 'Document'} ${t('doc.trash.moved')}`);
  };

  const doPermanentDelete = () => {
    if (!permanentId) return;
    deleteDocumentPermanently(permanentId, user?.role);
    setPermanentId(null);
    notify(t('doc.trash.permanentMsg'));
  };

  const doEmptyTrash = () => {
    emptyTrash(user?.role);
    setEmptyConfirm(false);
    notify(t('doc.trash.emptyMsg'));
  };

  const confirmDelete = (doc) => {
    if (selected && selected.id === doc.id) setSelected(null);
    setConfirmId(doc.id);
  };

  // Approve / Decline untuk admin. Status disimpan ke backend dan local state
  // diupdate tanpa reload halaman.
  const handleDecision = async (action) => {
    if (!selected) return;
    const nextStatus = action === 'approve' ? 'approved' : 'rejected';
    const ok = await updateDocumentStatus(selected.id, nextStatus, user?.id);
    setDecision(null);
    if (ok) {
      setSelected((s) => (s ? { ...s, status: nextStatus } : s));
      notify(nextStatus === 'approved' ? t('doc.approve.done') : t('doc.decline.done'), 'success');
    } else {
      notify(t('doc.decision.failed'), 'error');
    }
  };

  const renderActions = (d) => {
    if (inTrash) {
      return (
        <>
          <button
            className="action-btn"
            onClick={() => {
              restoreDocument(d.id);
              notify(`${d.title} ${t('doc.trash.restoredMsg')}`);
            }}
            aria-label={`${t('doc.trash.restore')} ${d.title}`}
            title={t('doc.trash.restore')}
          >
            <Icon name="back" size={16} />
          </button>
          <button
            className="action-btn danger"
            onClick={() => setPermanentId(d.id)}
            aria-label={`${t('doc.trash.permanent')} ${d.title}`}
            title={t('doc.trash.permanent')}
          >
            <Icon name="trash" size={16} />
          </button>
        </>
      );
    }
    return (
      <>
        <button className="action-btn" onClick={() => setSelected(d)} aria-label={`${t('action.view')} ${d.title}`}><Icon name="eye" size={16} /></button>
        <button className="action-btn" onClick={() => confirmDelete(d)} aria-label={`${t('action.delete')} ${d.title}`}><Icon name="trash" size={16} /></button>
      </>
    );
  };

  return (
    <>
      <Breadcrumb crumbs={[{ label: t('breadcrumb.home'), to: '/dashboard' }, { label: t('doc.title') }]} />

      <PageHeader
        title={t('doc.title')}
        subtitle={t('doc.subtitle')}
        actions={<Button variant="primary" icon="upload" onClick={openUpload}>{t('action.upload')}</Button>}
      />

      <div className="doc-layout">
        <aside className="card doc-folders" aria-label={t('doc.folders')}>
          {FOLDERS.map((f) => (
            <button
              key={f.id}
              className={`folder-item ${folder === f.id ? 'active' : ''} ${f.trash ? 'folder-trash' : ''}`}
              onClick={() => setFolder(f.id)}
            >
              <span className="folder-icon"><Icon name={f.icon} size={17} /></span>
              {f.label}
              <span className="folder-count">{folderCount(f.id)}</span>
            </button>
          ))}
        </aside>

        <div>
          <div className="doc-view-controls">
            <select className="filter-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t('doc.filterStatus')}>
              <option value="all">{t('doc.filterStatus')}</option>
              <option value="approved">{t('doc.status.approved')}</option>
              <option value="pending">{t('doc.status.pending')}</option>
              <option value="rejected">{t('doc.status.rejected')}</option>
            </select>
            <select className="filter-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
              <option value="newest">{t('doc.sortNewest')}</option>
              <option value="oldest">{t('doc.sortOldest')}</option>
              <option value="size">{t('doc.sortSize')}</option>
            </select>
            <div style={{ flex: 1 }} />
            <div className="view-toggle" role="group" aria-label={t('doc.gridView')}>
              <button className={`view-btn ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')} aria-label={t('doc.gridView')} aria-pressed={view === 'grid'}>
                <Icon name="grid" size={17} />
              </button>
              <button className={`view-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')} aria-label={t('doc.listView')} aria-pressed={view === 'list'}>
                <Icon name="list" size={17} />
              </button>
            </div>
          </div>

          <p className="doc-count-label">
            {filtered.length} {t('doc.count').toLowerCase()} {currentFolderLabel}
          </p>

          {inTrash && filtered.length > 0 && (
            <div className="trash-actions">
              <Button variant="ghost" icon="trash" onClick={() => setEmptyConfirm(true)}>{t('doc.trash.emptyTrash')}</Button>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={inTrash ? 'trash' : 'documents'}
                title={inTrash ? t('doc.trash.empty.title') : t('doc.empty.title')}
                description={inTrash ? t('doc.trash.empty.desc') : t('doc.empty.desc')}
                action={inTrash ? null : <Button variant="primary" icon="upload" onClick={openUpload}>{t('action.upload')}</Button>}
              />
            </div>
          ) : view === 'grid' ? (
            <div className="doc-grid">
              {filtered.map((d) => (
                <div className="doc-card" key={d.id}>
                  <button className="doc-card-main" onClick={() => (inTrash ? null : setSelected(d))} aria-label={`${t('action.view')} ${d.title}`}>
                    <div className="doc-thumb">
                      <span className="thumb-file"><Icon name="file" size={30} /></span>
                    </div>
                    <div className="doc-body">
                      <h3 className="doc-title">{d.title}</h3>
                      <div className="doc-author">{t('doc.by')} {d.author}</div>
                      <div className="doc-meta">
                        <span>{d.size} • {d.date}</span>
                        <Badge status={d.status} />
                      </div>
                    </div>
                  </button>
                  <div className="doc-card-actions">
                    {renderActions(d)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card table-card">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('doc.col.name')}</th>
                      <th>{t('doc.col.author')}</th>
                      <th>{t('doc.col.dept')}</th>
                      <th>{t('doc.col.size')}</th>
                      <th>{t('doc.col.date')}</th>
                      <th>{t('doc.col.status')}</th>
                      <th>{t('doc.col.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((d) => (
                      <tr key={d.id}>
                        <td data-label={t('doc.col.name')} style={{ fontWeight: 500, overflowWrap: 'anywhere' }}>{d.title}</td>
                        <td data-label={t('doc.col.author')}>{d.author}</td>
                        <td data-label={t('doc.col.dept')}>{d.dept}</td>
                        <td data-label={t('doc.col.size')}>{d.size}</td>
                        <td className="cell-date" data-label={t('doc.col.date')}>{d.date}</td>
                        <td data-label={t('doc.col.status')}><Badge status={d.status} /></td>
                        <td className="cell-actions" data-label={t('doc.col.actions')}>
                          <span className="row-actions">
                            {renderActions(d)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {selected && !inTrash && (
        <Modal open onClose={() => setSelected(null)} title={selected.title}>
          <div className="doc-thumb modal-thumb">
            <span className="thumb-file"><Icon name="file" size={34} /></span>
          </div>
          {selected.description && (
            <p style={{ color: 'var(--text-2)', fontSize: 13.5, margin: '0 0 16px', lineHeight: 1.6 }}>{selected.description}</p>
          )}
          <dl className="doc-detail-list">
            <div><dt>{t('doc.by')}</dt><dd>{selected.author}</dd></div>
            <div><dt>{t('doc.col.dept')}</dt><dd>{selected.dept}</dd></div>
            <div><dt>{t('doc.col.size')}</dt><dd>{selected.size}</dd></div>
            <div><dt>{t('doc.uploaded')}</dt><dd>{selected.date}</dd></div>
            <div className="with-badge"><dt>{t('doc.col.status')}</dt><dd><Badge status={selected.status} /></dd></div>
          </dl>
          <div className="form-group">
            <label className="form-label" htmlFor="doc-status">{t('doc.updateStatus')} {!isAdmin && <span style={{ color: '#f59e0b', fontWeight: 700 }}>🔒</span>}</label>
            <select
              className="form-select"
              id="doc-status"
              value={selected.status}
              disabled={!isAdmin}
              style={{ opacity: isAdmin ? 1 : 0.6, cursor: isAdmin ? 'auto' : 'not-allowed' }}
              onChange={(e) => {
                if (!isAdmin) {
                  notify('Hanya Notaris / Admin yang berwenang mengubah status persetujuan dokumen.', 'warning');
                  return;
                }
                updateDocument(selected.id, { status: e.target.value });
                notify(t('doc.updateStatus'));
                setSelected((s) => ({ ...s, status: e.target.value }));
              }}
            >
              <option value="pending">{t('doc.status.pending')}</option>
              <option value="approved">{t('doc.status.approved')}</option>
              <option value="rejected">{t('doc.status.rejected')}</option>
            </select>
          </div>
          <div className="modal-actions">
            <Button variant="secondary" icon="download" onClick={() => notify(t('action.download') + ' (demo)')}>{t('action.download')}</Button>
            <Button variant="ghost" icon="trash" onClick={() => confirmDelete(selected)}>{t('action.delete')}</Button>
            {isAdmin && selected.status === 'pending' && (
              <>
                <span className="modal-actions-spacer" />
                <Button variant="primary" icon="check" onClick={() => setDecision('approve')}>{t('doc.approve')}</Button>
                <Button variant="danger" icon="x" onClick={() => setDecision('decline')}>{t('doc.decline')}</Button>
              </>
            )}
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!confirmId}
        title={t('doc.delete.title')}
        message={t('doc.delete.msg')}
        confirmLabel={t('action.delete')}
        onCancel={() => setConfirmId(null)}
        onConfirm={doMoveToTrash}
      />

      <ConfirmDialog
        open={decision === 'approve'}
        title={t('doc.approve.title')}
        message={t('doc.approve.msg')}
        confirmLabel={t('doc.approve.confirm')}
        onCancel={() => setDecision(null)}
        onConfirm={() => handleDecision('approve')}
      />

      <ConfirmDialog
        open={decision === 'decline'}
        title={t('doc.decline.title')}
        message={t('doc.decline.msg')}
        confirmLabel={t('doc.decline.confirm')}
        danger
        onCancel={() => setDecision(null)}
        onConfirm={() => handleDecision('decline')}
      />

      <ConfirmDialog
        open={!!permanentId}
        title={t('doc.trash.permanent.title')}
        message={t('doc.trash.permanent.msg', { name: documents.find((d) => d.id === permanentId)?.title || '' })}
        confirmLabel={t('doc.trash.permanent')}
        danger
        onCancel={() => setPermanentId(null)}
        onConfirm={doPermanentDelete}
      />

      {emptyConfirm && (
        <ConfirmDialog
          open
          title={t('doc.trash.emptyTrash.title')}
          message={t('doc.trash.emptyTrash.msg', { count: documents.filter((d) => d.isTrashed).length })}
          confirmLabel={t('doc.trash.emptyTrash')}
          danger
          onCancel={() => setEmptyConfirm(false)}
          onConfirm={doEmptyTrash}
        />
      )}

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </>
  );
}
