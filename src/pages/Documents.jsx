import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { useSearch } from '../components/Layout.jsx';
import { useToast } from '../store/ToastContext.jsx';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';

const FOLDERS = ['All Documents', 'Reports', 'Finance', 'HR Documents', 'Legal', 'Archived'];
const DEPT_TO_FOLDER = {
  Engineering: 'Reports',
  'HR & Talent': 'HR Documents',
  Finance: 'Finance',
  'Legal & Compliance': 'Legal',
};

export default function Documents() {
  const { query } = useSearch();
  const { documents, addDocuments, deleteDocument, updateDocument } = useStore();
  const { notify } = useToast();
  const fileInput = useRef(null);

  const [folder, setFolder] = useState('All Documents');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('newest');
  const [view, setView] = useState('grid');
  const [selected, setSelected] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    let rows = documents;
    if (folder !== 'All Documents') {
      if (folder === 'Archived') {
        rows = [];
      } else {
        rows = rows.filter((d) => (DEPT_TO_FOLDER[d.dept] || 'Reports') === folder);
      }
    }
    if (status !== 'all') rows = rows.filter((d) => d.status === status);
    if (q) rows = rows.filter((d) => `${d.title} ${d.author} ${d.dept}`.toLowerCase().includes(q));
    if (sort === 'newest') rows = [...rows].sort((a, b) => (b.dateTs || 0) - (a.dateTs || 0));
    else if (sort === 'oldest') rows = [...rows].sort((a, b) => (a.dateTs || 0) - (b.dateTs || 0));
    else if (sort === 'size') rows = [...rows].sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0));
    return rows;
  }, [documents, folder, status, sort, q]);

  const folderCount = (f) => {
    if (f === 'All Documents') return documents.length;
    if (f === 'Archived') return 0;
    return documents.filter((d) => (DEPT_TO_FOLDER[d.dept] || 'Reports') === f).length;
  };

  const handleFiles = (fileList) => {
    const files = Array.from(fileList);
    if (!files.length) return;
    addDocuments(files);
    notify(`${files.length} document${files.length > 1 ? 's' : ''} uploaded`);
    fileInput.current.value = '';
  };

  const openUpload = () => fileInput.current && fileInput.current.click();

  const doDelete = () => {
    if (!confirmId) return;
    const doc = documents.find((d) => d.id === confirmId);
    deleteDocument(confirmId);
    setConfirmId(null);
    if (selected && selected.id === confirmId) setSelected(null);
    notify(`${doc ? doc.title : 'Document'} deleted`);
  };

  const confirmDelete = (doc) => {
    if (selected && selected.id === doc.id) setSelected(null);
    setConfirmId(doc.id);
  };

  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/dashboard">Home</Link>
        <span className="sep">/</span>
        <span className="current">Documents</span>
      </nav>

      <div className="page-head">
        <div>
          <h1>Documents</h1>
          <div className="section-sub">Manage and review your uploaded documents</div>
        </div>
        <Button variant="primary" icon="upload" onClick={openUpload}>Upload Document</Button>
        <input ref={fileInput} type="file" multiple hidden onChange={(e) => handleFiles(e.target.files)} aria-label="Upload documents" />
      </div>

      <div className="doc-layout">
        <aside className="card doc-folders" aria-label="Folders">
          {FOLDERS.map((f) => (
            <button
              key={f}
              className={`folder-item ${folder === f ? 'active' : ''}`}
              onClick={() => setFolder(f)}
            >
              <span className="folder-icon"><Icon name="folders" size={17} /></span>
              {f}
              <span className="folder-count">{folderCount(f)}</span>
            </button>
          ))}
        </aside>

        <div>
          <div className="doc-view-controls" style={{ marginBottom: 18 }}>
            <select className="filter-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
            <select className="filter-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="size">Size</option>
            </select>
            <div style={{ flex: 1 }} />
            <div className="view-toggle" role="group" aria-label="View mode">
              <button className={`view-btn ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')} aria-label="Grid view" aria-pressed={view === 'grid'}>
                <Icon name="grid" size={17} />
              </button>
              <button className={`view-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')} aria-label="List view" aria-pressed={view === 'list'}>
                <Icon name="list" size={17} />
              </button>
            </div>
          </div>

          <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 0 }}>
            {filtered.length} document{filtered.length !== 1 ? 's' : ''} in {folder}
          </p>

          {filtered.length === 0 ? (
            <div className="card">
              <EmptyState
                icon="documents"
                title="No documents yet"
                description="Upload your first document to start building your library. Files are stored locally in this browser."
                action={<Button variant="primary" icon="upload" onClick={openUpload}>Upload Document</Button>}
              />
            </div>
          ) : view === 'grid' ? (
            <div className="doc-grid">
              {filtered.map((d) => (
                <div className="doc-card" key={d.id}>
                  <button className="doc-card-main" onClick={() => setSelected(d)} aria-label={`Open ${d.title}`}>
                    <div className="doc-thumb">
                      <span className="thumb-file"><Icon name="file" size={30} /></span>
                    </div>
                    <div className="doc-body">
                      <h3 className="doc-title">{d.title}</h3>
                      <div className="doc-author">by {d.author}</div>
                      <div className="doc-meta">
                        <span>{d.size} • {d.date}</span>
                        <Badge status={d.status} />
                      </div>
                    </div>
                  </button>
                  <div className="doc-card-actions">
                    <button className="action-btn" onClick={() => setSelected(d)} aria-label={`View ${d.title}`}><Icon name="eye" size={16} /></button>
                    <button className="action-btn" onClick={() => confirmDelete(d)} aria-label={`Delete ${d.title}`}><Icon name="trash" size={16} /></button>
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
                          <span style={{ display: 'inline-flex', gap: 4 }}>
                            <button className="action-btn" onClick={() => setSelected(d)} aria-label={`View ${d.title}`}><Icon name="eye" size={16} /></button>
                            <button className="action-btn" onClick={() => confirmDelete(d)} aria-label={`Delete ${d.title}`}><Icon name="trash" size={16} /></button>
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
          <div className="doc-thumb" style={{ height: 150, marginBottom: 18, borderRadius: 10 }}>
            <span className="thumb-file"><Icon name="file" size={34} /></span>
          </div>
          <dl style={{ margin: 0, display: 'grid', gap: 12, fontSize: 13.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><dt style={{ color: 'var(--text-3)' }}>Author</dt><dd style={{ margin: 0 }}>{selected.author}</dd></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><dt style={{ color: 'var(--text-3)' }}>Department</dt><dd style={{ margin: 0 }}>{selected.dept}</dd></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><dt style={{ color: 'var(--text-3)' }}>Size</dt><dd style={{ margin: 0 }}>{selected.size}</dd></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><dt style={{ color: 'var(--text-3)' }}>Uploaded</dt><dd style={{ margin: 0 }}>{selected.date}</dd></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><dt style={{ color: 'var(--text-3)' }}>Status</dt><dd style={{ margin: 0 }}><Badge status={selected.status} /></dd></div>
          </dl>
          <div className="form-group" style={{ marginTop: 18 }}>
            <label className="form-label" htmlFor="doc-status">Update status</label>
            <select
              className="form-select"
              id="doc-status"
              value={selected.status}
              onChange={(e) => {
                updateDocument(selected.id, { status: e.target.value });
                notify('Document status updated');
                setSelected((s) => ({ ...s, status: e.target.value }));
              }}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="modal-actions">
            <Button variant="secondary" icon="download" onClick={() => notify('Download started (demo)')}>Download</Button>
            <Button variant="ghost" icon="trash" onClick={() => confirmDelete(selected)}>Delete</Button>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!confirmId}
        title="Delete document"
        message="Are you sure you want to delete this document? This cannot be undone."
        confirmLabel="Delete"
        onCancel={() => setConfirmId(null)}
        onConfirm={doDelete}
      />
    </>
  );
}
