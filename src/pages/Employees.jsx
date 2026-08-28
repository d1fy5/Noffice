import { useMemo, useState } from 'react';
import { employees } from '../data/mockData.js';
import { useSearch } from '../components/Layout.jsx';
import Avatar from '../components/Avatar.jsx';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import { Link } from 'react-router-dom';

const PER_PAGE = 8;

export default function Employees() {
  const { query } = useSearch();
  const [status, setStatus] = useState('All Status');
  const [dept, setDept] = useState('All Departments');
  const [page, setPage] = useState(1);
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    let rows = employees;
    if (status !== 'All Status') rows = rows.filter((e) => e.status === status.toLowerCase());
    if (dept !== 'All Departments') rows = rows.filter((e) => e.dept === dept);
    if (q) rows = rows.filter((e) => `${e.name} ${e.dept} ${e.role}`.toLowerCase().includes(q));
    return rows;
  }, [status, dept, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const current = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const goTo = (p) => setPage(Math.max(1, Math.min(totalPages, p)));

  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/dashboard">Home</Link>
        <span className="sep">/</span>
        <span className="current">Employees</span>
      </nav>

      <div className="page-head">
        <div>
          <h1>Employees</h1>
          <div className="section-sub">Manage your organisation's team</div>
        </div>
        <Button variant="primary" icon="userPlus">Add Employee</Button>
      </div>

      <div className="table-controls">
        <select className="filter-select" value={dept} onChange={(e) => { setDept(e.target.value); setPage(1); }} aria-label="Filter by department">
          <option>All Departments</option>
          {['Engineering', 'HR & Talent', 'Finance', 'Legal & Compliance', 'Operations'].map((d) => <option key={d}>{d}</option>)}
        </select>
        <select className="filter-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status">
          <option>All Status</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>
      </div>

      <div className="card table-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Role</th>
                <th>Email</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {current.map((e) => (
                <tr key={e.id}>
                  <td>
                    <div className="employee-cell">
                      <Avatar name={e.name} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{e.name}</div>
                        <div className="cell-sub">Employee #{e.id.toString().padStart(3, '0')}</div>
                      </div>
                    </div>
                  </td>
                  <td>{e.dept}</td>
                  <td>{e.role}</td>
                  <td style={{ color: 'var(--text-2)' }}>{e.email}</td>
                  <td><Badge status={e.status} /></td>
                  <td>
                    <span style={{ display: 'inline-flex', gap: 4 }}>
                      <button className="action-btn" aria-label={`Edit ${e.name}`}><Icon name="edit" size={16} /></button>
                      <button className="action-btn" aria-label={`Remove ${e.name}`}><Icon name="trash" size={16} /></button>
                    </span>
                  </td>
                </tr>
              ))}
              {current.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-3)', padding: 30 }}>No employees match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card-body pagination">
          <div className="pagination-info">
            Showing {(safePage - 1) * PER_PAGE + 1}–{Math.min(safePage * PER_PAGE, filtered.length)} of {filtered.length} employees
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
