import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, formatBytes } from '../store/StoreContext.jsx';
import { useSearch } from '../components/Layout.jsx';
import StatCard from '../components/StatCard.jsx';
import Badge from '../components/Badge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';

export default function Dashboard() {
  const { query } = useSearch();
  const { totals, documents, addDocuments } = useStore();
  const navigate = useNavigate();
  const fileInput = useRef(null);

  const q = query.trim().toLowerCase();

  const triggerUpload = () => fileInput.current && fileInput.current.click();

  const recent = documents
    .filter((d) => !q || d.title.toLowerCase().includes(q) || d.author.toLowerCase().includes(q))
    .slice(0, 5);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <div className="section-sub">Overview of your document workspace</div>
        </div>
        <Button variant="primary" icon="upload" onClick={triggerUpload}>Upload Document</Button>
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files.length) {
              addDocuments(Array.from(e.target.files));
            }
            e.target.value = '';
          }}
          aria-label="Upload documents"
        />
      </div>

      <div className="stat-grid">
        <StatCard label="Total Documents" value={totals.totalDocuments.toLocaleString()} icon="documents" sub={totals.totalDocuments ? 'documents in workspace' : 'no documents yet'} />
        <StatCard label="Pending Approvals" value={totals.pendingApprovals.toLocaleString()} icon="clock" sub={totals.pendingApprovals ? 'awaiting review' : 'all caught up'} />
        <StatCard label="Active Employees" value={totals.activeEmployees.toLocaleString()} icon="employees" sub={totals.activeEmployees ? 'team members' : 'no employees yet'} />
        <StatCard label="Storage Used" value={formatBytes(totals.storageBytes)} icon="chart" sub={formatBytes(totals.storageBytes) === '0 B' ? 'no files stored' : 'total upload size'} />
      </div>

      <div className="dash-two dash-grid-wide">
        <div>
          <div className="section-header">
            <div>
              <h2>Recent Submissions</h2>
              <div className="section-sub">Latest documents in the workspace</div>
            </div>
          </div>
          <div className="card">
            {recent.length === 0 ? (
              <EmptyState
                icon="documents"
                title="No documents yet"
                description="Upload a document to see it here, or add one from the Documents page."
                action={<Button variant="secondary" icon="upload" onClick={triggerUpload}>Upload Document</Button>}
              />
            ) : (
              <>
                {recent.map((d) => (
                  <div className="submission-row" key={d.id}>
                    <div className={`doc-icon ${d.type || 'docx'}`}>
                      <Icon name={d.type === 'docx' ? 'fileText' : 'file'} size={20} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="sub-docname" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</div>
                      <div className="sub-meta">{d.author} • {d.dept} • {d.size}</div>
                    </div>
                    <Badge status={d.status} />
                  </div>
                ))}
                <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/documents')}>View all documents</Button>
                </div>
              </>
            )}
          </div>

          <div className="section-header">
            <h2>Quick Operations</h2>
          </div>
          <div className="quick-op-grid">
            <button className="quick-op" onClick={triggerUpload}>
              <span className="qo-icon"><Icon name="upload" size={18} /></span>
              Upload Document
            </button>
            <button className="quick-op" onClick={() => navigate('/employees')}>
              <span className="qo-icon"><Icon name="userPlus" size={18} /></span>
              Add Employee
            </button>
            <button className="quick-op" onClick={() => navigate('/inbox')}>
              <span className="qo-icon"><Icon name="message" size={18} /></span>
              New Message
            </button>
          </div>
        </div>

        <div>
          <div className="section-header">
            <h2>Category Distribution</h2>
          </div>
          <div className="card">
            {documents.length === 0 ? (
              <EmptyState icon="chart" title="No data to chart" description="Upload documents to see category distribution." />
            ) : (
              <div className="card-body category-list">{categoryRows(documents)}</div>
            )}
          </div>

          <div className="section-header">
            <h2>System Activity</h2>
          </div>
          <div className="card">
            {documents.length === 0 ? (
              <EmptyState icon="activity" title="No activity yet" description="Uploads and reviews will be tracked here." />
            ) : (
              <div className="chart-bars" role="img" aria-label="Document activity">
                {activitySegments(documents).map((b, i) => (
                  <div key={i} className={`chart-bar ${b.active ? 'highlight' : ''}`} style={{ height: `${b.h}%` }} />
                ))}
                <div className="legend" style={{ width: '100%' }}>
                  <div className="legend-item"><span className="legend-swatch" style={{ background: 'var(--primary)' }} /> Uploads</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function categoryRows(documents) {
  const deptCount = {};
  documents.forEach((d) => {
    deptCount[d.dept || 'General'] = (deptCount[d.dept || 'General'] || 0) + 1;
  });
  const entries = Object.entries(deptCount).sort((a, b) => b[1] - a[1]);
  const max = entries[0] ? entries[0][1] : 1;
  return entries.map(([name, count]) => {
    const pct = Math.round((count / max) * 100);
    return (
      <div className="category-row" key={name}>
        <span className="category-name">{name}</span>
        <div className="category-track">
          <div className="category-fill" style={{ width: `${pct}%`, background: 'var(--primary)' }} />
        </div>
        <span className="category-value">{count}</span>
      </div>
    );
  });
}

function activitySegments(documents) {
  const days = 10;
  const buckets = Array(days).fill(0);
  const daySpan = 1000 * 60 * 60 * 24;
  const now = Date.now();
  documents.forEach((d) => {
    const idx = Math.min(days - 1, Math.floor((now - (d.dateTs || now)) / daySpan));
    if (idx >= 0 && idx < days) buckets[days - 1 - idx]++;
  });
  const max = Math.max(1, ...buckets);
  return buckets.map((c) => ({ h: Math.max(8, Math.round((c / max) * 100)), active: c > 0 }));
}
