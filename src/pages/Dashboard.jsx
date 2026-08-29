import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, useSearch } from '../store/hooks.js';
import { formatBytes } from '../store/utils.js';
import { useTranslation } from '../store/useTranslation.js';
import StatCard from '../components/StatCard.jsx';
import Badge from '../components/Badge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import UploadModal from '../components/UploadModal.jsx';
import PageHeader from '../components/PageHeader.jsx';

export default function Dashboard() {
  const { query } = useSearch();
  const { totals, documents } = useStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [uploadOpen, setUploadOpen] = useState(false);

  const q = query.trim().toLowerCase();
  const openUpload = () => setUploadOpen(true);

  const recent = documents
    .filter((d) => !q || d.title.toLowerCase().includes(q) || d.author.toLowerCase().includes(q))
    .slice(0, 5);

  return (
    <>
      <PageHeader
        title={t('dash.title')}
        subtitle={t('dash.subtitle')}
        actions={<Button variant="primary" icon="upload" onClick={openUpload}>{t('action.upload')}</Button>}
      />

      <div className="stat-grid">
        <StatCard label={t('stat.totalDocuments')} value={totals.totalDocuments.toLocaleString()} icon="documents" sub={totals.totalDocuments ? t('stat.sub.totalTruth') : t('stat.sub.totalEmpty')} />
        <StatCard label={t('stat.pendingApprovals')} value={totals.pendingApprovals.toLocaleString()} icon="clock" sub={totals.pendingApprovals ? t('stat.sub.pendingTruth') : t('stat.sub.pendingEmpty')} />
        <StatCard label={t('stat.activeEmployees')} value={totals.activeEmployees.toLocaleString()} icon="employees" sub={totals.activeEmployees ? t('stat.sub.employeesTruth') : t('stat.sub.employeesEmpty')} />
        <StatCard label={t('stat.storageUsed')} value={formatBytes(totals.storageBytes)} icon="chart" sub={formatBytes(totals.storageBytes) === '0 B' ? t('stat.sub.storageEmpty') : t('stat.sub.storageTruth')} />
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
            <button className="quick-op" onClick={openUpload}>
              <span className="qo-icon"><Icon name="upload" size={18} /></span>
              {t('action.upload')}
            </button>
            <button className="quick-op" onClick={() => navigate('/employees')}>
              <span className="qo-icon"><Icon name="userPlus" size={18} /></span>
              {t('action.addEmployee')}
            </button>
            <button className="quick-op" onClick={() => navigate('/inbox')}>
              <span className="qo-icon"><Icon name="message" size={18} /></span>
              {t('action.newMessage')}
            </button>
          </div>
        </div>

        <div>
          <SectionHead title={t('dash.category')} />
          <div className="card">
            {documents.length === 0 ? (
              <EmptyState icon="chart" title={t('dash.empty.category.title')} description={t('dash.empty.category.desc')} />
            ) : (
              <div className="card-body category-list">{categoryRows(documents)}</div>
            )}
          </div>

          <SectionHead title={t('dash.activity')} />
          <div className="card">
            {documents.length === 0 ? (
              <EmptyState icon="activity" title={t('dash.empty.activity.title')} description={t('dash.empty.activity.desc')} />
            ) : (
              <div className="card-body">
                <div className="chart-bars" role="img" aria-label={t('dash.activity')}>
                  {activitySegments(documents).map((b, i) => (
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
