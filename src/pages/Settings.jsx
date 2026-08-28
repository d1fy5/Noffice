import { useState } from 'react';
import { useStore, DEPARTMENTS } from '../store/StoreContext.jsx';
import { useTranslation } from '../store/useTranslation.js';
import { useTheme } from '../store/ThemeContext.jsx';
import { useToast } from '../store/ToastContext.jsx';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import Avatar from '../components/Avatar.jsx';
import FormField from '../components/FormField.jsx';
import Breadcrumb from '../components/Breadcrumb.jsx';
import PageHeader from '../components/PageHeader.jsx';

const SECTIONS = [
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
  } = useStore();
  const { theme, chosen, setTheme } = useTheme();
  const { notify } = useToast();

  const [active, setActive] = useState('account');

  const [accForm, setAccForm] = useState({ ...account });
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [securityNotif, setSecurityNotif] = useState('');
  const [accMsg, setAccMsg] = useState('');

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
              <ToggleRow label={t('settings.sec.2fa')} desc={t('settings.sec.2faDesc')} checked={security.twoFactor} onChange={(v) => setSecurity({ ...security, twoFactor: v })} />
              <ToggleRow label={t('settings.sec.session')} desc={t('settings.sec.sessionDesc')} checked={security.keepSession} onChange={(v) => setSecurity({ ...security, keepSession: v })} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
