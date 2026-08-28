import { useState } from 'react';
import { documents, folders } from '../data/mockData.js';
import { useSearch } from '../components/Layout.jsx';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import { Link } from 'react-router-dom';

const fileExt = (name) => {
  const ext = name.split('.').pop().toLowerCase();
  return ext === 'pdf' ? 'pdf' : ext === 'xlsx' || ext === 'xls' ? 'xlsx' : 'docx';
};

export default function Documents() {
  const { query } = useSearch();
  const [folder, setFolder] = useState('All Documents');
  const [status, setStatus] = useState('all');
  const q = query.trim().toLowerCase();

  const filtered = documents.filter((d) => {
    if (folder !== 'All Documents' && folder !== 'All') {
      const map = { Reports: 'Reports', Finance: 'Finance', 'HR Documents': 'HR & Talent', Legal: 'Legal & Compliance' };
      if (!d.dept.includes(map[folder] || folder)) return false;
    }
    if (status !== 'all' && d.status !== status) return false;
    if (q && !`${d.title} ${d.author}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const [selected, setSelected] = useState(null);

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
          <div className="section-sub">Manage and review all uploaded documents</div>
        </div>
        <Button variant="primary" icon="upload">Upload Document</Button>
      </div>

      <div className="doc-layout">
        <aside className="card doc-folders" aria-label="Folders">
          {folders.map((f) => (
            <button
              key={f.name}
              className={`folder-item ${folder === f.name ? 'active' : ''}`}
              onClick={() => setFolder(f.name)}
            >
              <span className="folder-icon"><Icon name="folders" size={17} /></span>
              {f.name}
              <span className="folder-count">{f.count}</span>
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
            <select className="filter-select" aria-label="Sort by">
              <option>Newest first</option>
              <option>Oldest first</option>
              <option>Size</option>
            </select>
            <div style={{ flex: 1 }} />
            <div className="view-toggle">
              <button className="view-btn active" aria-label="Grid view"><Icon name="grid" size={17} /></button>
              <button className="view-btn" aria-label="List view"><Icon name="list" size={17} /></button>
            </div>
          </div>

          <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 0 }}>
            {filtered.length} document{filtered.length !== 1 ? 's' : ''} in {folder}
          </p>

          {filtered.length === 0 && (
            <div className="card"><div className="card-body" style={{ color: 'var(--text-3)' }}>No documents match your filters.</div></div>
          )}

          <div className="doc-grid">
            {filtered.map((d) => (
              <button className="doc-card" key={d.id} onClick={() => setSelected(d)} aria-label={`Open ${d.title}`}>
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
            ))}
          </div>
        </div>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)} role="dialog" aria-modal="true" aria-label="Document details">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-titlebar">
              <h2 style={{ fontSize: 16 }}>{selected.title}</h2>
              <button className="action-btn" onClick={() => setSelected(null)} aria-label="Close dialog">
                <Icon name="x" size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="doc-thumb" style={{ height: 160, marginBottom: 18, borderRadius: 10 }}>
                <span className="thumb-file"><Icon name="file" size={34} /></span>
              </div>
              <dl style={{ margin: 0, display: 'grid', gap: 12, fontSize: 13.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><dt style={{ color: 'var(--text-3)' }}>Author</dt><dd style={{ margin: 0 }}>{selected.author}</dd></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><dt style={{ color: 'var(--text-3)' }}>Size</dt><dd style={{ margin: 0 }}>{selected.size}</dd></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><dt style={{ color: 'var(--text-3)' }}>Uploaded</dt><dd style={{ margin: 0 }}>{selected.date}</dd></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><dt style={{ color: 'var(--text-3)' }}>Status</dt><dd style={{ margin: 0 }}><Badge status={selected.status} /></dd></div>
              </dl>
              <div className="modal-actions">
                <Button variant="primary" icon="download">Download</Button>
                <Button variant="secondary">Share</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
