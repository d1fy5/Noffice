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
import PageHeader from '../components/PageHeader.jsx';
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

  // Active non-trashed documents
  const activeDocs = documents.filter((d) => !d.isTrashed);

  const recentDocs = activeDocs
    .filter((d) => !q || d.title.toLowerCase().includes(q) || d.author.toLowerCase().includes(q))
    .slice(0, 4);

  const recentCases = cases
    .filter((c) => !q || (c.caseNumber || '').toLowerCase().includes(q) || (c.serviceType || '').toLowerCase().includes(q))
    .slice(0, 4);

  // Upcoming appointments
  const appointments = cases.filter((c) => c.appointmentDate);

  const getClientName = (clientId) => {
    const cl = clients.find((c) => c.id === clientId);
    return cl ? cl.name : 'Klien';
  };

  const getStatusBadge = (st) => {
    const s = CASE_STATUSES.find((item) => item.id === st) || CASE_STATUSES[0];
    return (
      <span className="badge" style={{ color: s.color, backgroundColor: s.bg, border: `1px solid ${s.color}33` }}>
        {s.label}
      </span>
    );
  };

  const todayStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      {/* Welcome Hero Banner */}
      <div 
        className="card mb-4" 
        style={{
          background: 'linear-gradient(135deg, #0b1329 0%, #1e293b 100%)',
          color: '#ffffff',
          padding: '24px 28px',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span className="badge" style={{ background: 'rgba(37,99,235,0.25)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)', padding: '4px 12px' }}>
                🟢 Local AI Engine Active
              </span>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>📅 {todayStr}</span>
            </div>
            <h1 style={{ color: '#ffffff', fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em', margin: '4px 0' }}>
              Selamat datang kembali, {user?.name || 'Notaris & PPAT'}! 👋
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0, maxWidth: '640px' }}>
              Sistem Manajemen Kantor Notaris & PPAT 100% Offline-First. Seluruh data permohonan akta dan identitas klien tersimpan dengan aman di PC lokal.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="primary" icon="plus" onClick={() => navigate('/cases')}>
              Permohonan Akta
            </Button>
            <Button variant="secondary" icon="userPlus" onClick={() => navigate('/clients')}>
              Tambah Klien
            </Button>
          </div>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="stat-grid">
        <StatCard label="Permohonan / Kasus Aktif" value={(totals.activeCases || 0).toLocaleString()} icon="fileText" sub={`${totals.totalCases || 0} total permohonan`} />
        <StatCard label="Total Klien Terdaftar" value={(totals.totalClients || 0).toLocaleString()} icon="user" sub="klien di database" />
        <StatCard label={t('stat.totalDocuments')} value={totals.totalDocuments.toLocaleString()} icon="documents" sub={totals.totalDocuments ? t('stat.sub.totalTruth') : t('stat.sub.totalEmpty')} />
        {isAdmin && (
          <StatCard label={t('stat.pendingApprovals')} value={totals.pendingApprovals.toLocaleString()} icon="clock" sub={totals.pendingApprovals ? t('stat.sub.pendingTruth') : t('stat.sub.pendingEmpty')} />
        )}
      </div>

      {/* Main Two-Column Layout */}
      <div className="dash-two dash-grid-wide">
        <div>
          {/* Quick Operations Grid */}
          <SectionHead title="⚡ Akses Cepat Operasional" subtitle="Shortcut aksi utama kantor notaris" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            <div 
              className="card" 
              onClick={() => navigate('/cases')}
              style={{ padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', transition: 'all 0.2s ease' }}
            >
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #2563eb, #4f46e5)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="plus" size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Permohonan Baru</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>Buat akta AJB, PT, dll.</div>
              </div>
            </div>

            <div 
              className="card" 
              onClick={() => navigate('/clients')}
              style={{ padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', transition: 'all 0.2s ease' }}
            >
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="userPlus" size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Tambah Klien</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>Input KTP & AI OCR</div>
              </div>
            </div>

            <div 
              className="card" 
              onClick={openUpload}
              style={{ padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', transition: 'all 0.2s ease' }}
            >
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="upload" size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Unggah Dokumen</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>Upload scan sertifikat</div>
              </div>
            </div>

            {isAdmin && (
              <div 
                className="card" 
                onClick={() => navigate('/employees')}
                style={{ padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', transition: 'all 0.2s ease' }}
              >
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="user" size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Kelola Staff</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>Pengaturan karyawan</div>
                </div>
              </div>
            )}
          </div>

          {/* Recent Active Cases */}
          <SectionHead title="📋 Permohonan Akta Terbaru" subtitle="Daftar permohonan yang sedang diproses" />
          <div className="card mb-4">
            {recentCases.length === 0 ? (
              <EmptyState
                icon="fileText"
                title="Belum Ada Permohonan Akta"
                description="Buat permohonan baru untuk memulai alur pengerjaan akta."
                action={<Button variant="primary" icon="plus" onClick={() => navigate('/cases')}>Buat Permohonan</Button>}
              />
            ) : (
              <>
                <div style={{ padding: '8px 0' }}>
                  {recentCases.map((c) => (
                    <div 
                      key={c.id} 
                      className="submission-row"
                      onClick={() => navigate('/cases')}
                      style={{ cursor: 'pointer', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name="fileText" size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>
                            {c.serviceType} — {getClientName(c.clientId)}
                          </div>
                          <div className="sub-meta">
                            No. Ref: {c.caseNumber} {c.aktaNumber ? `• Akta: ${c.aktaNumber}` : ''}
                          </div>
                        </div>
                      </div>
                      <div>
                        {getStatusBadge(c.status)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="card-footer-link" style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', textAlign: 'right' }}>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/cases')}>Lihat Semua Permohonan ➔</Button>
                </div>
              </>
            )}
          </div>

          {/* Recent Uploaded Documents */}
          <SectionHead title={t('dash.recentSubmissions')} subtitle={t('dash.recentSub')} />
          <div className="card">
            {recentDocs.length === 0 ? (
              <EmptyState
                icon="documents"
                title={t('dash.empty.documents.title')}
                description={t('dash.empty.documents.desc')}
                action={<Button variant="secondary" icon="upload" onClick={openUpload}>{t('action.upload')}</Button>}
              />
            ) : (
              <>
                {recentDocs.map((d) => (
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
                <div className="card-footer-link" style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', textAlign: 'right' }}>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/documents')}>{t('dash.viewAll')} ➔</Button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div>
          {/* Appointment Calendar Widget */}
          <SectionHead title="📅 Agenda Penandatanganan Akta" subtitle="Jadwal kehadiran klien TTD" />
          <div className="card mb-4">
            {appointments.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.88rem' }}>
                <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '6px' }}>📅</span>
                Belum ada jadwal penandatanganan akta minggu ini.
              </div>
            ) : (
              <div style={{ padding: '12px' }}>
                {appointments.slice(0, 4).map((apt) => (
                  <div 
                    key={apt.id} 
                    style={{ 
                      padding: '12px 14px', 
                      marginBottom: '8px', 
                      borderRadius: 'var(--radius-sm)', 
                      background: 'var(--surface-2)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      border: '1px solid var(--border)' 
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)' }}>
                        {apt.serviceType} — {getClientName(apt.clientId)}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', marginTop: '2px' }}>
                        📅 {apt.appointmentDate} • ⏰ Jam {apt.appointmentTime || '10:00'}
                      </div>
                    </div>
                    <div>
                      <span className="badge badge-info">{apt.caseNumber}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Document Categories Distribution */}
          <SectionHead title={t('dash.category')} subtitle="Rincian jenis berkas di sistem" />
          <div className="card mb-4">
            {activeDocs.length === 0 ? (
              <EmptyState icon="chart" title={t('dash.empty.category.title')} description={t('dash.empty.category.desc')} />
            ) : (
              <div className="card-body category-list">{categoryRows(activeDocs)}</div>
            )}
          </div>

          {/* Local AI Engine Status Card */}
          <SectionHead title="🤖 Local Notary AI Status" subtitle="Kecerdasan buatan 100% offline" />
          <div className="card" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(99,102,241,0.06) 100%)', border: '1px solid rgba(37,99,235,0.2)', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary-gradient)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                🤖
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Local Notary Smart Engine</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--green)', fontWeight: 600 }}>🟢 System Ready & Offline Secured</div>
              </div>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.4, margin: '0 0 14px 0' }}>
              Sistem AI lokal siap mengekstrak data KTP, menyusun draf pasal akta, dan meninjau risiko hukum 24/7 tanpa butuh internet.
            </p>
            <Button variant="secondary" size="sm" onClick={() => {
              const copilotBtn = document.querySelector('.copilot-floating-btn');
              if (copilotBtn) copilotBtn.click();
            }}>
              Buka AI Copilot ➔
            </Button>
          </div>
        </div>
      </div>

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </>
  );
}

function SectionHead({ title, subtitle }) {
  return (
    <div className="section-header" style={{ margin: '24px 0 14px 0' }}>
      <div>
        <h2 style={{ fontSize: '17px', fontWeight: 700, letterSpacing: '-0.01em' }}>{title}</h2>
        {subtitle && <div className="section-sub" style={{ fontSize: '12.5px', color: 'var(--text-3)' }}>{subtitle}</div>}
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
      <div className="category-row" key={name} style={{ marginBottom: '10px' }}>
        <span className="category-name" style={{ fontSize: '13px', fontWeight: 500 }}>{name}</span>
        <div className="category-track" style={{ height: '8px', borderRadius: '4px', background: 'var(--surface-2)' }}>
          <div className="category-fill" style={{ width: `${pct}%`, height: '100%', borderRadius: '4px', background: 'var(--primary-gradient)' }} />
        </div>
        <span className="category-value" style={{ fontSize: '13px', fontWeight: 700 }}>{count}</span>
      </div>
    );
  });
}

