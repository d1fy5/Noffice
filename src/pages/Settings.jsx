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
