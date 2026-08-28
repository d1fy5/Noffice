import { useState } from 'react';
import Button from '../components/Button.jsx';
import Avatar from '../components/Avatar.jsx';
import Icon from '../components/Icon.jsx';
import { Link } from 'react-router-dom';

const sections = [
  { id: 'account', label: 'Account', icon: 'user' },
  { id: 'notifications', label: 'Notifications', icon: 'bell' },
  { id: 'appearance', label: 'Appearance', icon: 'monitor' },
  { id: 'security', label: 'Security', icon: 'shield' },
];

function Toggle({ label, desc, defaultOn = false }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="toggle-row">
      <div>
        <div className="toggle-label">{label}</div>
        {desc && <div className="toggle-desc">{desc}</div>}
      </div>
      <label className="toggle">
        <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} aria-label={label} />
        <span className="toggle-slider" />
      </label>
    </div>
  );
}

export default function Settings() {
  const [active, setActive] = useState('account');

  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/dashboard">Home</Link>
        <span className="sep">/</span>
        <span className="current">Settings</span>
      </nav>

      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <div className="section-sub">Manage your account and preferences</div>
        </div>
      </div>

      <div className="settings-layout">
        <aside className="card settings-nav" aria-label="Settings sections">
          {sections.map((s) => (
            <button
              key={s.id}
              className={`folder-item ${active === s.id ? 'active' : ''}`}
              onClick={() => setActive(s.id)}
            >
              <span className="folder-icon"><Icon name={s.icon} size={17} /></span>
              {s.label}
            </button>
          ))}
        </aside>

        <div className="card settings-section">
          {active === 'account' && (
            <>
              <div className="settings-head">
                <h2>Account</h2>
                <p>Update your personal information.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <Avatar name="Noffice User" size="lg" />
                <div>
                  <div style={{ fontWeight: 600 }}>Noffice User</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Administrator</div>
                  <Button variant="secondary" size="sm" icon="upload" style={{ marginTop: 8 }}>Change photo</Button>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="fname">First name</label>
                  <input className="form-input" id="fname" defaultValue="Noffice" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="lname">Last name</label>
                  <input className="form-input" id="lname" defaultValue="User" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="email">Email address</label>
                <input className="form-input" id="email" defaultValue="user@noffice.io" />
                <div className="form-hint">Used for account notifications and login.</div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="dept">Department</label>
                <select className="form-select" id="dept" defaultValue="Administration">
                  <option>Administration</option>
                  <option>Engineering</option>
                  <option>HR & Talent</option>
                  <option>Finance</option>
                </select>
              </div>
              <Button variant="primary">Save changes</Button>
            </>
          )}

          {active === 'notifications' && (
            <>
              <div className="settings-head">
                <h2>Notifications</h2>
                <p>Choose what you want to be notified about.</p>
              </div>
              <Toggle label="Email notifications" desc="Send updates to your inbox" defaultOn />
              <Toggle label="Document approvals" desc="Notify when a document is approved or rejected" defaultOn />
              <Toggle label="New submissions" desc="When a colleague submits a new document" defaultOn />
              <Toggle label="System alerts" desc="Critical system health alerts" defaultOn />
              <Toggle label="Weekly digest" desc="A summary of activity every Monday" />
            </>
          )}

          {active === 'appearance' && (
            <>
              <div className="settings-head">
                <h2>Appearance</h2>
                <p>Customise the look of your workspace.</p>
              </div>
              <Toggle label="Compact density" desc="Show more content per screen" />
              <Toggle label="Reduced motion" desc="Minimise animations and transitions" />
              <div className="form-group" style={{ marginTop: 8 }}>
                <label className="form-label" htmlFor="theme">Theme</label>
                <select className="form-select" id="theme" defaultValue="light">
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System default</option>
                </select>
              </div>
              <Button variant="primary">Save preferences</Button>
            </>
          )}

          {active === 'security' && (
            <>
              <div className="settings-head">
                <h2>Security</h2>
                <p>Manage your password and login security.</p>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="opass">Current password</label>
                  <input className="form-input" id="opass" type="password" placeholder="Enter current password" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="npass">New password</label>
                  <input className="form-input" id="npass" type="password" placeholder="Enter new password" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="cpass">Confirm password</label>
                <input className="form-input" id="cpass" type="password" placeholder="Confirm new password" />
              </div>
              <Toggle label="Two-factor authentication" desc="Require a code when signing in from a new device" defaultOn />
              <Toggle label="Active sessions" desc="Keep me signed in across devices" defaultOn />
              <div style={{ marginTop: 12 }}>
                <Button variant="primary">Update password</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
