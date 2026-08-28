import { stats, recentSubmissions, categories, activityBars } from '../data/mockData.js';
import { useSearch } from '../components/Layout.jsx';
import StatCard from '../components/StatCard.jsx';
import Badge from '../components/Badge.jsx';
import Icon from '../components/Icon.jsx';

const docExt = (name) => {
  const ext = name.split('.').pop().toLowerCase();
  return ext === 'pdf' ? 'pdf' : ext === 'xlsx' || ext === 'xls' ? 'xlsx' : 'docx';
};

export default function Dashboard() {
  const { query } = useSearch();
  const q = query.trim().toLowerCase();

  const filteredSubs = recentSubmissions.filter((s) =>
    !q || s.name.toLowerCase().includes(q) || s.author.toLowerCase().includes(q)
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <div className="section-sub">Overview of your document workspace</div>
        </div>
      </div>

      <div className="stat-grid">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: '20px', alignItems: 'start', gridTemplateAreas: "'main side'" }} className="dash-two">
        <div>
          <div className="section-header">
            <h2>Recent Submissions</h2>
          </div>
          <div className="card">
            {filteredSubs.length === 0 && <div className="card-body" style={{ color: 'var(--text-3)' }}>No matching documents.</div>}
            {filteredSubs.map((s) => (
              <div className="submission-row" key={s.name}>
                <div className={`doc-icon ${docExt(s.name)}`}>
                  <Icon name={docExt(s.name) === 'docx' ? 'fileText' : 'file'} size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="sub-docname" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                  <div className="sub-meta">{s.author} • {s.dept} • {s.meta}</div>
                </div>
                <Badge status={s.status} />
              </div>
            ))}
          </div>

          <div className="section-header">
            <h2>Quick Operations</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            <button className="quick-op">
              <span className="qo-icon"><Icon name="upload" size={18} /></span>
              Upload Document
            </button>
            <button className="quick-op">
              <span className="qo-icon"><Icon name="userPlus" size={18} /></span>
              Add Employee
            </button>
            <button className="quick-op">
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
            <div className="card-body">
              {categories.map((c) => (
                <div className="category-row" key={c.name}>
                  <span className="category-name">{c.name}</span>
                  <div className="category-track">
                    <div className="category-fill" style={{ width: `${c.value}%`, background: c.color }} />
                  </div>
                  <span className="category-value">{c.value}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="section-header">
            <h2>System Activity</h2>
          </div>
          <div className="card">
            <div className="card-body">
              <div className="chart-bars" role="img" aria-label="System activity over the last 10 days">
                {activityBars.map((b, i) => (
                  <div key={i} className={`chart-bar ${b.active ? 'highlight' : ''}`} style={{ height: `${b.h}%` }} />
                ))}
              </div>
              <div className="legend">
                <div className="legend-item"><span className="legend-swatch" style={{ background: 'var(--primary)' }} /> Document uploads</div>
                <div className="legend-item"><span className="legend-swatch" style={{ background: 'var(--primary-soft)' }} /> Reviews</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
