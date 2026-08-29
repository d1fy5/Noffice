import { useMemo, useState } from 'react';
import { useStore, useSearch, useToast } from '../store/hooks.js';
import { useTranslation } from '../store/useTranslation.js';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import UploadModal from '../components/UploadModal.jsx';
import Breadcrumb from '../components/Breadcrumb.jsx';
import PageHeader from '../components/PageHeader.jsx';

const DEPT_TO_FOLDER = {
  Engineering: 'Reports',
  'HR & Talent': 'HR Documents',
  Finance: 'Finance',
  'Legal & Compliance': 'Legal',
};

export default function Documents() {
  const { query } = useSearch();
  const { documents, deleteDocument, updateDocument } = useStore();
  const { notify } = useToast();
  const { t } = useTranslation();

  const [folder, setFolder] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('newest');
  const [view, setView] = useState('grid');
  const [selected, setSelected] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const q = query.trim().toLowerCase();

  const FOLDERS = [
    { id: 'all', label: t('doc.all') },
    { id: 'Reports', label: t('doc.reports') },
    { id: 'Finance', label: t('doc.finance') },
    { id: 'HR Documents', label: t('doc.hr') },
    { id: 'Legal', label: t('doc.legal') },
  ];

  const filtered = useMemo(() => {
    let rows = documents;
    if (folder !== 'all') {
      rows = rows.filter((d) => (DEPT_TO_FOLDER[d.dept] || 'Reports') === folder);
    }
    if (status !== 'all') rows = rows.filter((d) => d.status === status);
    if (q) rows = rows.filter((d) => `${d.title} ${d.author} ${d.dept}`.toLowerCase().includes(q));
    if (sort === 'newest') rows = [...rows].sort((a, b) => (b.dateTs || 0) - (a.dateTs || 0));
    else if (sort === 'oldest') rows = [...rows].sort((a, b) => (a.dateTs || 0) - (b.dateTs || 0));
    else if (sort === 'size') rows = [...rows].sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0));
    return rows;
  }, [documents, folder, status, sort, q]);

  const folderCount = (fid) => {
    if (fid === 'all') return documents.length;
    return documents.filter((d) => (DEPT_TO_FOLDER[d.dept] || 'Reports') === fid).length;
  };

  const currentFolderLabel = FOLDERS.find((f) => f.id === folder)?.label || t('doc.all');

  const openUpload = () => setUploadOpen(true);

  const doDelete = () => {
    if (!confirmId) return;
    const doc = documents.find((d) => d.id === confirmId);
    deleteDocument(confirmId);
    setConfirmId(null);
    if (selected && selected.id === confirmId) setSelected(null);
    notify(`${doc ? doc.title : 'Document'} ${t('action.delete')}`);
  };

  const confirmDelete = (doc) => {
    if (selected && selected.id === doc.id) setSelected(null);
    setConfirmId(doc.id);
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
              className={`folder-item ${folder === f.id ? 'active' : ''}`}
              onClick={() => setFolder(f.id)}
            >
              <span className="folder-icon"><Icon name="folders" size={17} /></span>
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

          {filtered.length === 0 ? (
            <div className="card">
              <EmptyState
                icon="documents"
                title={t('doc.empty.title')}
                description={t('doc.empty.desc')}
                action={<Button variant="primary" icon="upload" onClick={openUpload}>{t('action.upload')}</Button>}
              />
            </div>
          ) : view === 'grid' ? (
            <div className="doc-grid">
              {filtered.map((d) => (
                <div className="doc-card" key={d.id}>
                  <button className="doc-card-main" onClick={() => setSelected(d)} aria-label={`${t('action.view')} ${d.title}`}>
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
                    <button className="action-btn" onClick={() => setSelected(d)} aria-label={`${t('action.view')} ${d.title}`}><Icon name="eye" size={16} /></button>
                    <button className="action-btn" onClick={() => confirmDelete(d)} aria-label={`${t('action.delete')} ${d.title}`}><Icon name="trash" size={16} /></button>
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
                      <th>Name</th>
                      <th>Author</th>
                      <th>Department</th>
                      <th>Size</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((d) => (
                      <tr key={d.id}>
                        <td style={{ fontWeight: 500 }}>{d.title}</td>
                        <td>{d.author}</td>
                        <td>{d.dept}</td>
                        <td>{d.size}</td>
                        <td>{d.date}</td>
                        <td><Badge status={d.status} /></td>
                        <td>
                          <span className="row-actions">
                            <button className="action-btn" onClick={() => setSelected(d)} aria-label={`${t('action.view')} ${d.title}`}><Icon name="eye" size={16} /></button>
                            <button className="action-btn" onClick={() => confirmDelete(d)} aria-label={`${t('action.delete')} ${d.title}`}><Icon name="trash" size={16} /></button>
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

      {selected && (
        <Modal open onClose={() => setSelected(null)} title={selected.title}>
          <div className="doc-thumb modal-thumb">
            <span className="thumb-file"><Icon name="file" size={34} /></span>
          </div>
          {selected.description && (
            <p style={{ color: 'var(--text-2)', fontSize: 13.5, margin: '0 0 16px', lineHeight: 1.6 }}>{selected.description}</p>
          )}
          <dl className="doc-detail-list">
            <div><dt>{t('doc.by')}</dt><dd>{selected.author}</dd></div>
            <div><dt>Department</dt><dd>{selected.dept}</dd></div>
            <div><dt>Size</dt><dd>{selected.size}</dd></div>
            <div><dt>Uploaded</dt><dd>{selected.date}</dd></div>
            <div className="with-badge"><dt>Status</dt><dd><Badge status={selected.status} /></dd></div>
          </dl>
          <div className="form-group">
            <label className="form-label" htmlFor="doc-status">{t('doc.updateStatus')}</label>
            <select
              className="form-select"
              id="doc-status"
              value={selected.status}
              onChange={(e) => {
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

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </>
  );
}
