import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, useSearch } from '../store/hooks.js';
import { formatBytes } from '../store/utils.js';
import { useTranslation } from '../store/useTranslation.js';
import { useAuth } from '../store/AuthContext.jsx';
import StatCard from '../components/StatCard.jsx';
import Badge from '../components/Badge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import UploadModal from '../components/UploadModal.jsx';
import PageHeader from '../components/PageHeader.jsx';

export default function Dashboard() {
  const { query } = useSearch();
  const { totals, documents, cases, clients } = useStore();
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [uploadOpen, setUploadOpen] = useState(false);

  const q = query.trim().toLowerCase();
  const openUpload = () => setUploadOpen(true);

  // Trashed documents are not part of the active workspace view.
  const activeDocs = documents.filter((d) => !d.isTrashed);

  const recent = activeDocs
    .filter((d) => !q || d.title.toLowerCase().includes(q) || d.author.toLowerCase().includes(q))
    .slice(0, 5);

  // Upcoming / Today's appointments
  const appointments = cases.filter((c) => c.appointmentDate);

  const getClientName = (clientId) => {
    const cl = clients.find((c) => c.id === clientId);
    return cl ? cl.name : 'Klien';
  };

  return (
    <>
      <PageHeader
        title={t('dash.title')}
        subtitle={t('dash.subtitle')}
        actions={<Button variant="primary" icon="upload" onClick={openUpload}>{t('action.upload')}</Button>}
      />

      <div className="stat-grid">
        <StatCard label="Permohonan / Kasus Aktif" value={(totals.activeCases || 0).toLocaleString()} icon="fileText" sub={`${totals.totalCases || 0} total permohonan`} />
        <StatCard label="Total Klien Terdaftar" value={(totals.totalClients || 0).toLocaleString()} icon="user" sub="klien di database" />
        <StatCard label={t('stat.totalDocuments')} value={totals.totalDocuments.toLocaleString()} icon="documents" sub={totals.totalDocuments ? t('stat.sub.totalTruth') : t('stat.sub.totalEmpty')} />
        {isAdmin && (
          <StatCard label={t('stat.pendingApprovals')} value={totals.pendingApprovals.toLocaleString()} icon="clock" sub={totals.pendingApprovals ? t('stat.sub.pendingTruth') : t('stat.sub.pendingEmpty')} />
        )}
      </div>

      <div className="dash-two dash-grid-wide">
        <div>
          <SectionHead title={t('dash.recentSubmissions')} subtitle={t('dash.recentSub')} />
          <div className="card">
            {recent.length === 0 ? (
              <EmptyState
                icon="documents"
                title={t('dash.empty.documents.title')}
                description={t('dash.empty.documents.desc')}
                action={<Button variant="secondary" icon="upload" onClick={openUpload}>{t('action.upload')}</Button>}
              />
            ) : (
              <>
                {recent.map((d) => (
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
                ))}
                <div className="card-footer-link">
                  <Button variant="ghost" size="sm" onClick={() => navigate('/documents')}>{t('dash.viewAll')}</Button>
                </div>
              </>
            )}
          </div>

          <SectionHead title={t('dash.quickOps')} />
          <div className="quick-op-grid">
            <button className="quick-op" onClick={() => navigate('/cases')}>
              <span className="qo-icon"><Icon name="plus" size={18} /></span>
              Permohonan Baru
            </button>
            <button className="quick-op" onClick={() => navigate('/clients')}>
              <span className="qo-icon"><Icon name="userPlus" size={18} /></span>
              Tambah Klien
            </button>
            <button className="quick-op" onClick={openUpload}>
              <span className="qo-icon"><Icon name="upload" size={18} /></span>
              {t('action.upload')}
            </button>
            {isAdmin && (
              <button className="quick-op" onClick={() => navigate('/employees')}>
                <span className="qo-icon"><Icon name="user" size={18} /></span>
                {t('action.addEmployee')}
              </button>
            )}
          </div>
        </div>

        <div>
          <SectionHead title="📅 Agenda Penandatanganan Akta" subtitle="Jadwal kehadiran klien TTD" />
          <div className="card mb-4">
            {appointments.length === 0 ? (
              <div className="p-4 text-center text-muted" style={{ fontSize: '0.85rem' }}>
                Belum ada jadwal penandatanganan akta minggu ini.
              </div>
            ) : (
              <div className="p-3">
                {appointments.slice(0, 4).map((apt) => (
                  <div key={apt.id} className="submission-row" style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{apt.serviceType} — {getClientName(apt.clientId)}</div>
                      <div className="sub-meta">📅 {apt.appointmentDate} • ⏰ Jam {apt.appointmentTime || '10:00'}</div>
                    </div>
                    <div>
                      <span className="badge info">{apt.caseNumber}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <SectionHead title={t('dash.category')} />
          <div className="card">
            {activeDocs.length === 0 ? (
              <EmptyState icon="chart" title={t('dash.empty.category.title')} description={t('dash.empty.category.desc')} />
            ) : (
              <div className="card-body category-list">{categoryRows(activeDocs)}</div>
            )}
          </div>

          <SectionHead title={t('dash.activity')} />
          <div className="card">
            {activeDocs.length === 0 ? (
              <EmptyState icon="activity" title={t('dash.empty.activity.title')} description={t('dash.empty.activity.desc')} />
            ) : (
              <div className="card-body">
                <div className="chart-bars" role="img" aria-label={t('dash.activity')}>
                  {activitySegments(activeDocs).map((b, i) => (
                    <div key={i} className={`chart-bar ${b.active ? 'highlight' : ''}`} style={{ height: `${b.h}%` }} />
                  ))}
                </div>
                <div className="legend">
                  <div className="legend-item"><span className="legend-swatch" style={{ background: 'var(--primary)' }} /> {t('legend.uploads')}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </>
  );
}

function SectionHead({ title, subtitle }) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
        {subtitle && <div className="section-sub">{subtitle}</div>}
      </div>
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
