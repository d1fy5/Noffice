import { useMemo, useState } from 'react';
import { useStore, useTheme, useToast } from '../store/hooks.js';
import { DEPARTMENTS, TIMEZONES, DATE_FORMATS, MAX_STORAGE_GB } from '../store/constants.js';
import { useTranslation } from '../store/useTranslation.js';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import Avatar from '../components/Avatar.jsx';
import FormField from '../components/FormField.jsx';
import Breadcrumb from '../components/Breadcrumb.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { formatBytes as bytesLabel } from '../utils/formatDate.js';

function formatStorageUsed(bytes) {
  return bytesLabel(bytes);
}

const SECTIONS = [
  { id: 'general', icon: 'building', labelKey: 'settings.general' },
  { id: 'account', icon: 'user', labelKey: 'settings.account' },
  { id: 'notifications', icon: 'bell', labelKey: 'settings.notifications' },
  { id: 'appearance', icon: 'monitor', labelKey: 'settings.appearance' },
  { id: 'language', icon: 'mail', labelKey: 'settings.language' },
  { id: 'security', icon: 'shield', labelKey: 'settings.security' },
];

function ToggleRow({ label, desc, checked, onChange }) {
  return (
    <div className="toggle-row">
      <div>
        <div className="toggle-label">{label}</div>
        {desc && <div className="toggle-desc">{desc}</div>}
      </div>
      <label className="toggle">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
        <span className="toggle-slider" />
      </label>
    </div>
  );
}

function PanduanPengguna() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '18px', overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px', background: 'var(--surface-2)', border: 'none', cursor: 'pointer',
          fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)',
        }}
      >
        <span>📖 Panduan Penggunaan — Format Akta & Tanda Terima</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 400, transition: 'transform 0.2s', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: '16px 20px', background: 'var(--surface)', fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.7 }}>
          <h4 style={{ margin: '0 0 10px', color: 'var(--text)', fontSize: '0.88rem' }}>🔢 Cara Mengubah Format Nomor Akta</h4>
          <ol style={{ paddingLeft: '18px', margin: '0 0 14px' }}>
            <li>Buka halaman <strong>Settings → General</strong></li>
            <li>Gulir ke bagian <strong>"Format Nomor Akta"</strong></li>
            <li>Ketik format yang diinginkan di kotak input, atau klik chip variabel untuk menyisipkan otomatis</li>
            <li>Preview hasil format akan tampil secara langsung di bawah kotak</li>
            <li>Klik <strong>Simpan Perubahan</strong> di bagian bawah halaman</li>
            <li>Format baru berlaku saat berikutnya klik tombol <strong>"Generate No. Akta"</strong> di halaman Kasus</li>
          </ol>
          <div style={{ background: 'var(--surface-2)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
            <div style={{ marginBottom: '4px', fontWeight: 700, color: 'var(--text)' }}>Contoh Format:</div>
            <div>No. {'{no}'}/{'{bulanRomawi}'}/{'{tahun}'} &nbsp;→&nbsp; <strong>No. 5/IX/2026</strong></div>
            <div>AKT-{'{no}'}/{'{tahun}'}/{'{bulanRomawi}'} &nbsp;→&nbsp; <strong>AKT-5/2026/IX</strong></div>
            <div>{'{no}'}/{'{jenisAkta}'}/{'{tahun}'} &nbsp;→&nbsp; <strong>5/PT/2026</strong></div>
            <div>{'{no}'}/{'{bulan}'}/{'{tahunPendek}'} &nbsp;→&nbsp; <strong>5/09/26</strong></div>
          </div>
          <div style={{ background: 'var(--warning-soft,#fef9c3)', border: '1px solid var(--warning-border,#fde68a)', borderRadius: '8px', padding: '8px 14px', marginBottom: '14px', color: '#92400e', fontSize: '0.78rem' }}>
            ⚠️ <strong>Penting:</strong> Pastikan format mengandung variabel <code>{'{no}'}</code> agar nomor urut akta tidak berulang. Nomor urut dihitung otomatis per tahun.
          </div>
          <h4 style={{ margin: '0 0 10px', color: 'var(--text)', fontSize: '0.88rem' }}>🖨️ Cara Mengubah Template Tanda Terima</h4>
          <ol style={{ paddingLeft: '18px', margin: '0 0 14px' }}>
            <li>Masih di <strong>Settings → General</strong>, gulir ke bagian <strong>"Template Tanda Terima"</strong></li>
            <li>Ubah <strong>Subtitle Kop Surat</strong> — contoh: <em>"Notaris & PPAT Kota Semarang"</em></li>
            <li>Ubah <strong>Alamat & Kontak Kantor</strong> — contoh: <em>"Jln. Diponegoro No. 10 | Telp: 024-555xxxx"</em></li>
            <li>Preview kop surat akan berubah secara langsung di bawah form</li>
            <li>Klik <strong>Simpan Perubahan</strong></li>
            <li>Perubahan langsung berlaku saat cetak Tanda Terima di halaman Kasus</li>
          </ol>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '4px' }}>
            💡 <strong>Tips:</strong> Nama Kantor di kop surat diambil dari field <em>"Nama Perusahaan"</em> di atas. Ubah di sana untuk mengganti nama kantor pada tanda terima.
          </div>
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const { t } = useTranslation();
  const {
    account, setAccount,
    notifications, setNotifications,
    appearance, setAppearance,
    security, setSecurity,
    language, setLanguage,
    general, setGeneral,
    totals,  // contains storageBytes
  } = useStore();
  const { theme, chosen, setTheme } = useTheme();
  const { notify } = useToast();

  const [active, setActive] = useState('general');

  const [accForm, setAccForm] = useState({ ...account });
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [securityNotif, setSecurityNotif] = useState('');
  const [accMsg, setAccMsg] = useState('');

  // General settings form
  const [genForm, setGenForm] = useState({ ...general });
  const [logoFile, setLogoFile] = useState(null);
  const [logoErr, setLogoErr] = useState('');
  const [genSaving, setGenSaving] = useState(false);
  const [genMsg, setGenMsg] = useState(null);

  const saveAccount = () => {
    setAccount(accForm);
    setAccMsg(t('settings.saved'));
    notify(t('settings.saved'));
    setTimeout(() => setAccMsg(''), 2500);
  };

  const saveAppearance = () => {
    setAppearance((a) => ({ ...a }));
    notify(t('settings.saved'));
  };

  const saveSecurity = () => {
    if (pwd.next && pwd.next !== pwd.confirm) {
      setSecurityNotif(t('settings.sec.passMismatch'));
      return;
    }
    if (pwd.next && pwd.next.length < 6) {
      setSecurityNotif(t('settings.sec.passShort'));
      return;
    }
    setSecurity((s) => ({ ...s, changedAt: pwd.next ? Date.now() : s.changedAt }));
    setPwd({ current: '', next: '', confirm: '' });
    setSecurityNotif('');
    notify(t('settings.sec.passChanged'));
  };

  const LOGO_MAX_BYTES = 2 * 1024 * 1024;
  const ALLOWED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml'];

  const handleLogo = (file) => {
    setLogoErr('');
    if (!file) return;
    const okType = ALLOWED_LOGO_TYPES.includes(file.type) || /\.(jpe?g|png|svg)$/i.test(file.name);
    if (!okType) {
      setLogoErr(t('settings.general.logoInvalid'));
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setLogoErr(t('settings.general.logoLarge'));
      return;
    }
    setLogoFile(file);
  };

  const resetGeneral = () => {
    setGenForm({ ...general });
    setLogoFile(null);
    setLogoErr('');
    setGenMsg(null);
  };

  const saveGeneral = () => {
    setGenSaving(true);
    setGenMsg(null);
    setTimeout(() => {
      let next = { ...genForm, storageLimitGB: Math.min(Math.max(genForm.storageLimitGB, 1), MAX_STORAGE_GB) };
      if (logoFile) {
        const reader = new FileReader();
        reader.onload = () => {
          next = { ...next, companyLogo: reader.result };
          setGeneral(next);
          setGenSaving(false);
          setGenMsg({ kind: 'success', text: t('settings.saved') });
          notify(t('settings.saved'));
        };
        reader.readAsDataURL(logoFile);
      } else {
        setGeneral(next);
        setGenSaving(false);
        setGenMsg({ kind: 'success', text: t('settings.saved') });
        notify(t('settings.saved'));
      }
    }, 600);
  };

  const storageUsedText = t('settings.general.storageUsed', { used: formatStorageUsed(totals?.storageBytes || 0), total: `${genForm.storageLimitGB} GB` });

  // Logo preview: newly picked file wins, otherwise the saved logo (if any).
  const logoPreview = useMemo(
    () => (logoFile ? URL.createObjectURL(logoFile) : (general.companyLogo || '')),
    [logoFile, general.companyLogo]
  );

  return (
    <>
      <Breadcrumb crumbs={[{ label: t('breadcrumb.home'), to: '/dashboard' }, { label: t('settings.title') }]} />
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <div className="settings-layout">
        <aside className="card settings-nav" aria-label={t('settings.title')}>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              className={`folder-item ${active === s.id ? 'active' : ''}`}
              onClick={() => setActive(s.id)}
            >
              <span className="folder-icon"><Icon name={s.icon} size={17} /></span>
              {t(s.labelKey)}
            </button>
          ))}
        </aside>

        <div className="card settings-section">
          {active === 'general' && (
            <>
              <div className="settings-head">
                <h2>{t('settings.general')}</h2>
                <p>{t('settings.general.sub')}</p>
              </div>

              <FormField label={t('settings.general.companyName')} htmlFor="gen-company" required>
                <input
                  className="form-input"
                  id="gen-company"
                  value={genForm.companyName}
                  onChange={(e) => setGenForm({ ...genForm, companyName: e.target.value })}
                  placeholder="Noffice"
                />
              </FormField>

              <FormField label={t('settings.general.companyLogo')}>
                <div
                  className={`logo-dropzone ${logoErr ? 'dropzone-error' : ''}`}
                  onClick={() => document.getElementById('logo-input')?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleLogo(e.dataTransfer.files[0]);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      document.getElementById('logo-input')?.click();
                    }
                  }}
                  aria-label={t('settings.general.companyLogo')}
                >
                  {(logoPreview) ? (
                    <div className="logo-preview">
                      <img src={logoPreview} alt={t('settings.general.logoPreview')} />
                      <div className="logo-preview-name">{(logoFile || {}).name || general.companyName}</div>
                    </div>
                  ) : (
                    <>
                      <span className="drop-icon"><Icon name="upload" size={24} /></span>
                      <div className="drop-title">{t('settings.general.logoDrop')}</div>
                      <div className="drop-text">{t('settings.general.logoText')}</div>
                      <div className="drop-formats">JPG · PNG · SVG</div>
                    </>
                  )}
                  <input id="logo-input" type="file" hidden accept=".jpg,.jpeg,.png,.svg,image/jpeg,image/png,image/svg+xml" onChange={(e) => { handleLogo(e.target.files[0]); e.target.value = ''; }} />
                </div>
                {logoErr && <div className="form-error" role="alert">{logoErr}</div>}
                {!logoErr && <div className="form-hint">{t('settings.general.logoHint')}</div>}
              </FormField>

              <div className="form-row">
                <FormField label={t('settings.language')} htmlFor="gen-lang">
                  <select className="form-select" id="gen-lang" value={genForm.defaultLanguage} onChange={(e) => setGenForm({ ...genForm, defaultLanguage: e.target.value })}>
                    <option value="en">{t('settings.lang.en')}</option>
                    <option value="id">{t('settings.lang.id')}</option>
                  </select>
                </FormField>
                <FormField label={t('settings.general.timezone')} htmlFor="gen-tz">
                  <select className="form-select" id="gen-tz" value={genForm.timezone} onChange={(e) => setGenForm({ ...genForm, timezone: e.target.value })}>
                    {TIMEZONES.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
                  </select>
                </FormField>
              </div>

              <FormField label={t('settings.general.dateFormat')} htmlFor="gen-df">
                <select className="form-select" id="gen-df" value={genForm.dateFormat} onChange={(e) => setGenForm({ ...genForm, dateFormat: e.target.value })}>
                  {DATE_FORMATS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </FormField>

              {/* ── Card: Format Nomor Akta ── */}
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px 20px', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '1.1rem' }}>🔢</span>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>Format Nomor Akta</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', margin: '0 0 14px', lineHeight: 1.5 }}>
                  Tentukan template penomoran akta. Gunakan variabel di bawah untuk menyesuaikan format sesuai kebutuhan kantor.
                </p>
                {/* Chip variabel */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                  {['{no}', '{bulanRomawi}', '{bulan}', '{tahun}', '{tahunPendek}', '{jenisAkta}'].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setGenForm((f) => ({ ...f, aktaFormat: (f.aktaFormat || '') + v }))}
                      title={`Klik untuk sisipkan ${v}`}
                      style={{
                        padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'monospace',
                        background: 'var(--primary-soft)', color: 'var(--primary)', border: '1px solid var(--primary)',
                        borderRadius: '99px', cursor: 'pointer', transition: 'opacity 0.15s',
                      }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    className="form-input"
                    id="gen-akta-format"
                    value={genForm.aktaFormat || 'No. {no}/{bulanRomawi}/{tahun}'}
                    onChange={(e) => setGenForm({ ...genForm, aktaFormat: e.target.value })}
                    placeholder="No. {no}/{bulanRomawi}/{tahun}"
                    style={{ fontFamily: 'monospace', fontSize: '0.9rem', flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => setGenForm((f) => ({ ...f, aktaFormat: 'No. {no}/{bulanRomawi}/{tahun}' }))}
                    style={{ padding: '8px 12px', fontSize: '0.75rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-2)', whiteSpace: 'nowrap' }}
                    title="Reset ke format default"
                  >
                    Reset
                  </button>
                </div>
                {/* Live Preview */}
                <div style={{ marginTop: '10px', padding: '8px 14px', background: 'var(--surface)', borderRadius: '8px', border: '1px dashed var(--border-strong)', fontSize: '0.82rem', color: 'var(--text-2)' }}>
                  <span style={{ fontWeight: 600 }}>Preview: </span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 700 }}>
                    {(genForm.aktaFormat || 'No. {no}/{bulanRomawi}/{tahun}')
                      .replace(/\{no\}/g, '5')
                      .replace(/\{bulanRomawi\}/g, ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][new Date().getMonth()])
                      .replace(/\{bulan\}/g, String(new Date().getMonth() + 1).padStart(2, '0'))
                      .replace(/\{tahun\}/g, new Date().getFullYear())
                      .replace(/\{tahunPendek\}/g, String(new Date().getFullYear()).slice(-2))
                      .replace(/\{jenisAkta\}/g, 'PT')}
                  </span>
                </div>
                <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-3)', lineHeight: 1.5 }}>
                  <strong>Keterangan variabel:</strong> {'{no}'} = nomor urut · {'{bulanRomawi}'} = bulan romawi (I–XII) · {'{bulan}'} = bulan angka (01–12) · {'{tahun}'} = tahun 4 digit · {'{tahunPendek}'} = tahun 2 digit · {'{jenisAkta}'} = jenis akta (PT, CV, dll)
                </div>
              </div>

              {/* ── Card: Template Tanda Terima ── */}
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px 20px', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '1.1rem' }}>🖨️</span>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>Template Tanda Terima</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', margin: '0 0 14px', lineHeight: 1.5 }}>
                  Kustomisasi kop surat yang muncul pada cetak Tanda Terima Berkas & Penyerahan Salinan Akta.
                </p>
                <FormField label="Subtitle Kop Surat" htmlFor="gen-receipt-subtitle">
                  <input
                    className="form-input"
                    id="gen-receipt-subtitle"
                    value={genForm.receiptSubtitle || ''}
                    onChange={(e) => setGenForm({ ...genForm, receiptSubtitle: e.target.value })}
                    placeholder="Pejabat Pembuat Akta Tanah (PPAT) & Notaris Resmi"
                  />
                </FormField>
                <FormField label="Alamat & Kontak Kantor" htmlFor="gen-receipt-address">
                  <input
                    className="form-input"
                    id="gen-receipt-address"
                    value={genForm.receiptAddress || ''}
                    onChange={(e) => setGenForm({ ...genForm, receiptAddress: e.target.value })}
                    placeholder="Jln. Utama No. 88 | Telp: (021) 555-8899 | Email: info@kantor.id"
                  />
                </FormField>
                {/* Live Preview Mini Kop */}
                <div style={{ marginTop: '4px', padding: '14px 16px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#0f172a', borderBottom: '2px solid #0f172a', paddingBottom: '8px', marginBottom: '6px' }}>
                    {genForm.companyName || 'NAMA KANTOR'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                    {genForm.receiptSubtitle || 'Pejabat Pembuat Akta Tanah (PPAT) & Notaris Resmi'}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                    {genForm.receiptAddress || 'Alamat kantor belum diisi'}
                  </div>
                </div>
              </div>

              {/* ── Panel Panduan Pengguna ── */}
              <PanduanPengguna />

              <div className="settings-head" style={{ marginBottom: 12 }}>
                <h2>{t('settings.general.storage')}</h2>
                <p>{t('settings.general.storageSub')}</p>
              </div>
              <div className="storage-limits">
                <span>{storageUsedText}</span>
                <span>{t('settings.general.storageSelected', { value: genForm.storageLimitGB, total: MAX_STORAGE_GB })}</span>
              </div>
              <input
                className="storage-slider"
                type="range"
                min="5"
                step="5"
                max={MAX_STORAGE_GB}
                value={Math.min(genForm.storageLimitGB, MAX_STORAGE_GB)}
                onChange={(e) => setGenForm({ ...genForm, storageLimitGB: Number(e.target.value) })}
                aria-label={t('settings.general.storage')}
              />
              <div className="storage-range-labels">
                <span>5 GB</span>
                <span>{MAX_STORAGE_GB} GB</span>
              </div>

              {genMsg && genMsg.kind === 'error' && <div className="form-error" role="alert">{genMsg.text}</div>}
              {genMsg && genMsg.kind === 'success' && <div className="form-hint form-success">{genMsg.text}</div>}

              <div className="settings-save-row settings-actions">
                <Button variant="secondary" onClick={resetGeneral}>{t('action.cancel')}</Button>
                <Button variant="primary" icon="save" disabled={genSaving} onClick={saveGeneral}>
                  {genSaving ? t('settings.general.saving') : t('settings.general.saveChanges')}
                </Button>
              </div>
            </>
          )}

          {active === 'account' && (
            <>
              <div className="settings-head">
                <h2>{t('settings.account')}</h2>
                <p>{t('settings.account.sub')}</p>
              </div>
              <div className="account-avatar-row">
                <Avatar name="Noffice User" size="lg" />
                <div>
                  <div className="emp-name">Noffice User</div>
                  <Button variant="secondary" size="sm" icon="upload" onClick={() => notify('Photo upload (demo)')}>{t('settings.changePhoto')}</Button>
                </div>
              </div>
              <div className="form-row">
                <FormField label={t('settings.first')} htmlFor="acc-first">
                  <input className="form-input" id="acc-first" value={accForm.firstName || ''} onChange={(e) => setAccForm({ ...accForm, firstName: e.target.value })} />
                </FormField>
                <FormField label={t('settings.last')} htmlFor="acc-last">
                  <input className="form-input" id="acc-last" value={accForm.lastName || ''} onChange={(e) => setAccForm({ ...accForm, lastName: e.target.value })} />
                </FormField>
              </div>
              <FormField label={t('settings.email')} htmlFor="acc-email" hint={t('settings.emailHint')}>
                <input className="form-input" id="acc-email" type="email" value={accForm.email || ''} onChange={(e) => setAccForm({ ...accForm, email: e.target.value })} />
              </FormField>
              <FormField label={t('settings.dept')} htmlFor="acc-dept">
                <select className="form-select" id="acc-dept" value={accForm.department || ''} onChange={(e) => setAccForm({ ...accForm, department: e.target.value })}>
                  <option value="">—</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </FormField>
              <Button variant="primary" onClick={saveAccount}>{t('action.save')}</Button>
              {accMsg && <div className="form-hint form-success">{accMsg}</div>}
            </>
          )}

          {active === 'notifications' && (
            <>
              <div className="settings-head">
                <h2>{t('settings.notifications')}</h2>
                <p>{t('settings.notif.sub')}</p>
              </div>
              <ToggleRow label={t('settings.notif.email')} desc={t('settings.notif.emailDesc')} checked={notifications.emailNotif} onChange={(v) => setNotifications({ ...notifications, emailNotif: v })} />
              <ToggleRow label={t('settings.notif.docApprovals')} desc={t('settings.notif.docApprovalsDesc')} checked={notifications.docApprovals} onChange={(v) => setNotifications({ ...notifications, docApprovals: v })} />
              <ToggleRow label={t('settings.notif.newSubs')} desc={t('settings.notif.newSubsDesc')} checked={notifications.newSubmissions} onChange={(v) => setNotifications({ ...notifications, newSubmissions: v })} />
              <ToggleRow label={t('settings.notif.system')} desc={t('settings.notif.systemDesc')} checked={notifications.systemAlerts} onChange={(v) => setNotifications({ ...notifications, systemAlerts: v })} />
              <ToggleRow label={t('settings.notif.digest')} desc={t('settings.notif.digestDesc')} checked={notifications.weeklyDigest} onChange={(v) => setNotifications({ ...notifications, weeklyDigest: v })} />
            </>
          )}

          {active === 'appearance' && (
            <>
              <div className="settings-head">
                <h2>{t('settings.appearance')}</h2>
                <p>{t('settings.appearance.sub')}</p>
              </div>
              <FormField label={t('settings.theme')} htmlFor="theme-select">
                <select className="form-select" id="theme-select" value={chosen} onChange={(e) => setTheme(e.target.value)}>
                  <option value="light">{t('settings.themeLight')}</option>
                  <option value="dark">{t('settings.themeDark')}</option>
                  <option value="system">{t('settings.themeSystem')}</option>
                </select>
              </FormField>
              <ToggleRow label={t('settings.density')} desc={t('settings.densityDesc')} checked={appearance.density === 'compact'} onChange={(v) => setAppearance({ ...appearance, density: v ? 'compact' : 'comfortable' })} />
              <ToggleRow label={t('settings.reducedMotion')} desc={t('settings.reducedMotionDesc')} checked={appearance.reducedMotion} onChange={(v) => setAppearance({ ...appearance, reducedMotion: v })} />
              <div className="settings-save-row">
                <Button variant="primary" onClick={saveAppearance}>{t('action.savePrefs')}</Button>
              </div>
            </>
          )}

          {active === 'language' && (
            <>
              <div className="settings-head">
                <h2>{t('settings.language')}</h2>
                <p>{t('settings.langSub')}</p>
              </div>
              <FormField label={t('settings.language')} htmlFor="lang-select">
                <select className="form-select" id="lang-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="en">{t('settings.lang.en')}</option>
                  <option value="id">{t('settings.lang.id')}</option>
                </select>
              </FormField>
              <div className="form-hint">{language === 'id' ? 'Bahasa Indonesia dipilih' : 'English selected'}</div>
            </>
          )}

          {active === 'security' && (
            <>
              <div className="settings-head">
                <h2>{t('settings.security')}</h2>
                <p>{t('settings.sec.sub')}</p>
              </div>
              <div className="form-row">
                <FormField label={t('settings.sec.currentPass')} htmlFor="sec-current">
                  <input className="form-input" id="sec-current" type="password" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} />
                </FormField>
                <FormField label={t('settings.sec.newPass')} htmlFor="sec-next">
                  <input className="form-input" id="sec-next" type="password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} />
                </FormField>
              </div>
              <FormField label={t('settings.sec.confirmPass')} htmlFor="sec-confirm">
                <input className="form-input" id="sec-confirm" type="password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} />
              </FormField>
              {securityNotif && <div className="form-error" role="alert">{securityNotif}</div>}
              <div className="form-hint demo-note">{t('settings.sec.demoNote')}</div>
              <div className="settings-save-row">
                <Button variant="primary" onClick={saveSecurity}>{t('action.updatePassword')}</Button>
              </div>

              {/* 1-Click Local Database Backup Box */}
              <div className="mt-5 p-4" style={{ background: 'var(--surface-2)', borderRadius: '12px', border: '1px solid var(--border)', marginTop: '24px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text)' }}>Backup Database SQLite 1-Klik</h3>
                <p style={{ fontSize: '0.83rem', color: 'var(--text-2)', marginBottom: '14px', lineHeight: 1.4 }}>
                  Unduh salinan cadangan file database SQLite (`database.sqlite`) ke Flashdisk atau Harddisk Eksternal setiap sore hari untuk menjamin keamanan penuh data kantor Notaris.
                </p>
                <a href="http://localhost:3001/api/system/backup" download style={{ textDecoration: 'none' }}>
                  <Button variant="secondary" icon="download">
                    Unduh Backup Database (.sqlite)
                  </Button>
                </a>
              </div>
              <ToggleRow label={t('settings.sec.2fa')} desc={t('settings.sec.2faDesc')} checked={security.twoFactor} onChange={(v) => setSecurity({ ...security, twoFactor: v })} />
              <ToggleRow label={t('settings.sec.session')} desc={t('settings.sec.sessionDesc')} checked={security.keepSession} onChange={(v) => setSecurity({ ...security, keepSession: v })} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
