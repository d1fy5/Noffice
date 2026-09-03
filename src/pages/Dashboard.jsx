import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, useSearch } from '../store/hooks.js';
import { useTranslation } from '../store/useTranslation.js';
import { useAuth } from '../store/AuthContext.jsx';
import StatCard from '../components/StatCard.jsx';
import Badge from '../components/Badge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import UploadModal from '../components/UploadModal.jsx';
import { CASE_STATUSES } from '../store/constants.js';

export default function Dashboard() {
  const { query } = useSearch();
  const { totals, documents, cases, clients } = useStore();
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [uploadOpen, setUploadOpen] = useState(false);

  const q = query.trim().toLowerCase();
  const openUpload = () => setUploadOpen(true);

  const activeDocs = documents.filter((d) => !d.isTrashed);

  const recentDocs = activeDocs
    .filter((d) => !q || d.title.toLowerCase().includes(q) || d.author.toLowerCase().includes(q))
    .slice(0, 4);

  const recentCases = cases
    .filter((c) => !q || (c.caseNumber || '').toLowerCase().includes(q) || (c.serviceType || '').toLowerCase().includes(q))
    .slice(0, 5);

  const appointments = cases.filter((c) => c.appointmentDate).slice(0, 4);

  const getClientName = (clientId) => {
    const cl = clients.find((c) => c.id === clientId);
    return cl ? cl.name : 'Klien';
  };

  const getStatusBadge = (st) => {
    const s = CASE_STATUSES.find((item) => item.id === st) || CASE_STATUSES[0];
    return <span className={`badge status-badge ${s.variant}`}>{s.label}</span>;
  };

  const todayStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      {/* Welcome block */}
      <div className="dash-welcome mb-4">
        <div>
          <div className="dash-welcome-label">{todayStr}</div>
          <h1 className="dash-welcome-title">Selamat datang, {user?.name || 'Notaris & PPAT'}</h1>
          <p className="dash-welcome-sub">Sistem Manajemen Kantor Notaris & PPAT 100% offline. Semua data permohonan akta dan identitas klien tersimpan aman di PC lokal.</p>
        </div>
        <div className="dash-welcome-actions">
          <Button variant="primary" icon="plus" onClick={() => navigate('/cases', { state: { createNew: true } })}>Permohonan Akta</Button>
          <Button variant="secondary" icon="userPlus" onClick={() => navigate('/clients', { state: { createNew: true } })}>Tambah Klien</Button>
        </div>
      </div>

      {/* Statistics - compact, uniform card heights */}
      <div className="stat-grid">
        <StatCard tone="blue" label="Kasus Aktif" value={(totals.activeCases || 0).toLocaleString()} icon="fileText" sub={`${totals.totalCases || 0} total permohonan`} />
        <StatCard tone="green" label="Total Klien" value={(totals.totalClients || 0).toLocaleString()} icon="user" sub="klien di database" />
        <StatCard tone="violet" label="Dokumen" value={totals.totalDocuments.toLocaleString()} icon="documents" sub={totals.totalDocuments ? t('stat.sub.totalTruth') : t('stat.sub.totalEmpty')} />
        {isAdmin ? (
          <StatCard tone="amber" label="Menunggu Persetujuan" value={totals.pendingApprovals.toLocaleString()} icon="clock" sub={totals.pendingApprovals ? t('stat.sub.pendingTruth') : t('stat.sub.pendingEmpty')} />
        ) : (
          <StatCard tone="green" label="Mesin AI" value="Siap" icon="activity" sub="100% offline" />
        )}
      </div>

      {/* Quick actions - consistent clickable cards */}
      <div className="quick-op-grid mb-6">
        <button type="button" className="quick-op" onClick={() => navigate('/cases', { state: { createNew: true } })} aria-label="Buat permohonan akta baru">
          <span className="qo-icon tone-blue"><Icon name="plus" size={20} /></span>
          <span>
            <span className="quick-op-title">Permohonan Baru</span>
            <span className="quick-op-desc">Buat akta atau kasus baru</span>
          </span>
        </button>
        <button type="button" className="quick-op" onClick={() => navigate('/clients', { state: { createNew: true } })} aria-label="Tambah klien baru">
          <span className="qo-icon tone-green"><Icon name="userPlus" size={20} /></span>
          <span>
            <span className="quick-op-title">Tambah Klien</span>
            <span className="quick-op-desc">Input data klien &amp; KTP</span>
          </span>
        </button>
        <button type="button" className="quick-op" onClick={openUpload} aria-label="Unggah dokumen baru">
          <span className="qo-icon tone-violet"><Icon name="upload" size={20} /></span>
          <span>
            <span className="quick-op-title">Unggah Dokumen</span>
            <span className="quick-op-desc">Upload dan kelola berkas</span>
          </span>
        </button>
        {isAdmin ? (
          <button type="button" className="quick-op" onClick={() => navigate('/employees')} aria-label="Kelola staff kantor">
            <span className="qo-icon tone-amber"><Icon name="user" size={20} /></span>
            <span>
              <span className="quick-op-title">Kelola Staff</span>
              <span className="quick-op-desc">Atur pengguna dan akses kantor</span>
            </span>
          </button>
        ) : (
          <button type="button" className="quick-op" onClick={() => navigate('/inbox')} aria-label="Buka kotak masuk">
            <span className="qo-icon tone-amber"><Icon name="inbox" size={20} /></span>
            <span>
              <span className="quick-op-title">Kotak Masuk</span>
              <span className="quick-op-desc">Lihat pesan dan pemberitahuan</span>
            </span>
          </button>
        )}
      </div>

      {/* Balanced two-column layout */}
      <div className="dash-grid-wide">
        {/* Main column */}
        <div className="dash-main-col">
          <Panel
            title="Permohonan Akta Terbaru"
            subtitle="Daftar permohonan yang sedang diproses"
            className="mb-4"
            actions={<Button variant="ghost" size="sm" onClick={() => navigate('/cases')}>Lihat semua →</Button>}
          >
            {recentCases.length === 0 ? (
              <EmptyState
                icon="fileText"
                title="Belum Ada Permohonan Akta"
                description="Buat permohonan baru untuk memulai alur pengerjaan akta."
                action={<Button variant="primary" icon="plus" onClick={() => navigate('/cases', { state: { createNew: true } })}>Buat Permohonan</Button>}
              />
            ) : (
              <>
                <div className="table-scroll">
                  <table className="data-table data-table-simple">
                    <thead>
                      <tr>
                        <th>Permohonan</th>
                        <th>Klien</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentCases.map((c) => (
                        <tr key={c.id} onClick={() => navigate('/cases')} style={{ cursor: 'pointer' }}>
                          <td>
                            <div className="sub-docname">{c.serviceType}</div>
                            <div className="sub-meta">No. Ref: {c.caseNumber}{c.aktaNumber ? ` • Akta: ${c.aktaNumber}` : ''}</div>
                          </td>
                          <td>{getClientName(c.clientId)}</td>
                          <td>{getStatusBadge(c.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Panel>

          <Panel
            title={t('dash.recentSubmissions')}
            subtitle={t('dash.recentSub')}
            actions={<Button variant="ghost" size="sm" onClick={() => navigate('/documents')}>{t('dash.viewAll')} →</Button>}
          >
            {recentDocs.length === 0 ? (
              <EmptyState
                icon="documents"
                title={t('dash.empty.documents.title')}
                description={t('dash.empty.documents.desc')}
                action={<Button variant="secondary" icon="upload" onClick={openUpload}>{t('action.upload')}</Button>}
              />
            ) : (
              recentDocs.map((d) => (
                <div className="submission-row" key={d.id}>
                  <div className={`doc-icon ${d.type || 'docx'}`}>
                    <Icon name={d.type === 'docx' ? 'fileText' : 'file'} size={20} />
                  </div>
                  <div className="sub-main">
                    <div className="sub-docname">{d.title}</div>
                    <div className="sub-meta">{d.author} • {d.dept} • {d.size}</div>
                  </div>
                  <Badge status={d.status} />
                </div>
              ))
            )}
          </Panel>
        </div>

        {/* Secondary column */}
        <div className="dash-side-col">
          <Panel
            title="Agenda Penandatanganan Akta"
            subtitle="Jadwal kehadiran klien TTD"
            className="mb-4"
          >
            {appointments.length === 0 ? (
              <EmptyState icon="clock" title="Belum Ada Jadwal TTD" description="Belum ada jadwal penandatanganan akta minggu ini." />
            ) : (
              <div className="dash-schedule">
                {appointments.map((apt) => (
                  <div className="dash-schedule-item" key={apt.id}>
                    <div className="dash-schedule-date">
                      <span className="dash-schedule-dot" aria-hidden="true" />
                      <span>
                        <span className="dash-schedule-title">{apt.serviceType}</span>
                        <span className="dash-schedule-sub">{getClientName(apt.clientId)} • {apt.appointmentDate} • {apt.appointmentTime || '10:00'}</span>
                      </span>
                    </div>
                    <span className="badge info">{apt.caseNumber}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel
            title={t('dash.category')}
            subtitle="Rincian jenis berkas di sistem"
            className="mb-4"
          >
            {activeDocs.length === 0 ? (
              <EmptyState icon="chart" title={t('dash.empty.category.title')} description={t('dash.empty.category.desc')} />
            ) : (
              <div className="category-list">{categoryRows(activeDocs)}</div>
            )}
          </Panel>

          <Panel title="AI Notaris Lokal" subtitle="Kecerdasan buatan 100% offline">
            <div className="ai-status-head">
              <div className="qo-icon tone-blue"><Icon name="activity" size={20} /></div>
              <div>
                <div className="sub-docname">Mesin AI Notaris Lokal</div>
                <div className="ai-status-ready">Siap & Aman 100% Offline</div>
              </div>
            </div>
            <p className="ai-status-desc">
              Sistem AI lokal siap mengekstrak data KTP, menyusun draf pasal akta, dan meninjau risiko hukum 24/7 tanpa butuh internet.
            </p>
            <Button variant="secondary" size="sm" icon="activity" onClick={() => {
              const copilotBtn = document.querySelector('.copilot-floating-btn');
              if (copilotBtn) copilotBtn.click();
            }}>
              Buka AI Copilot
            </Button>
          </Panel>
        </div>
      </div>

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </>
  );
}

function Panel({ title, subtitle, children, actions, className = '' }) {
  return (
    <div className={`card panel ${className}`}>
      <div className="panel-head">
        <div>
          <div className="panel-title">{title}</div>
          {subtitle && <div className="panel-sub">{subtitle}</div>}
        </div>
        {actions && <div className="panel-actions">{actions}</div>}
      </div>
      <div className="panel-body">{children}</div>
    </div>
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
