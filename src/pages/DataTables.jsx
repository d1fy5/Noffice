import { useMemo, useState } from 'react';
import { tableRows, departments, subStatuses } from '../data/mockData.js';
import { useSearch } from '../components/Layout.jsx';
import Avatar from '../components/Avatar.jsx';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import { Link } from 'react-router-dom';

const PER_PAGE = 8;

export default function DataTables() {
  const { query } = useSearch();
  const [dept, setDept] = useState('All Departments');
  const [status, setStatus] = useState('All Status');
  const [page, setPage] = useState(1);
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    let rows = tableRows;
    if (dept !== 'All Departments') rows = rows.filter((r) => r.dept === dept);
    if (status !== 'All Status') rows = rows.filter((r) => r.status === status);
    if (q) rows = rows.filter((r) => `${r.id} ${r.name} ${r.dept} ${r.doc}`.toLowerCase().includes(q));
    return rows;
  }, [dept, status, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const current = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const initials = (name) => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const goTo = (p) => setPage(Math.max(1, Math.min(totalPages, p)));

  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/dashboard">Home</Link>
        <span className="sep">/</span>
        <span className="current">Data Tables</span>
      </nav>

      <div className="page-head">
        <div>
          <h1>Data Tables</h1>
          <div className="section-sub">Document submission records</div>
        </div>
      </div>

      <div className="table-controls">
        <select className="filter-select" value={dept} onChange={(e) => { setDept(e.target.value); setPage(1); }} aria-label="Filter by department">
          {departments.map((d) => <option key={d}>{d}</option>)}
        </select>
        <select className="filter-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status">
          {subStatuses.map((s) => <option key={s}>{s}</option>)}
        </select>
        <input className="filter-select" type="date" aria-label="Date submitted" style={{ width: 160 }} />
        <div style={{ flex: 1 }} />
        <Button variant="secondary" icon="download">Export CSV</Button>
      </div>

      <div className="card table-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Employee Name</th>
                <th>Department</th>
                <th>Document Title</th>
                <th>Date Submitted</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {current.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{r.id}</td>
                  <td>
                    <div className="employee-cell">
                      <Avatar name={r.name} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{r.name}</div>
                        <div className="cell-sub">{r.id.toLowerCase()}</div>
                      </div>
                    </div>
                  </td>
                  <td>{r.dept}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{r.doc}</div>
                  </td>
                  <td style={{ color: 'var(--text-2)' }}>{r.date}</td>
                  <td><Badge status={r.status} /></td>
                  <td>
                    <span style={{ display: 'inline-flex', gap: 4 }}>
                      <button className="action-btn" aria-label={`View ${r.id}`}><Icon name="eye" size={16} /></button>
                      <button className="action-btn" aria-label={`Edit ${r.id}`}><Icon name="edit" size={16} /></button>
                      <button className="action-btn" aria-label={`Delete ${r.id}`}><Icon name="trash" size={16} /></button>
                    </span>
                  </td>
                </tr>
              ))}
              {current.length === 0 && (
                <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-3)', padding: 30 }}>No submissions match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card-body pagination">
          <div className="pagination-info">
            Showing {(safePage - 1) * PER_PAGE + 1}–{Math.min(safePage * PER_PAGE, filtered.length)} of {filtered.length} submissions
          </div>
          <div className="page-btns">
            <button className="page-btn" disabled={safePage <= 1} onClick={() => goTo(safePage - 1)} aria-label="Previous page">&lt;</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} className={`page-btn ${p === safePage ? 'active' : ''}`} onClick={() => goTo(p)} aria-current={p === safePage ? 'page' : undefined}>
                {p}
              </button>
            ))}
            <button className="page-btn" disabled={safePage >= totalPages} onClick={() => goTo(safePage + 1)} aria-label="Next page">&gt;</button>
          </div>
        </div>
      </div>
    </>
  );
}
