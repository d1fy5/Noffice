import { useState } from 'react';
import { emails } from '../data/mockData.js';
import { useSearch } from '../components/Layout.jsx';
import Avatar from '../components/Avatar.jsx';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import { Link } from 'react-router-dom';

export default function Inbox() {
  const { query } = useSearch();
  const [activeId, setActiveId] = useState(emails[0].id);
  const q = query.trim().toLowerCase();

  const filtered = emails.filter((m) =>
    !q || `${m.sender} ${m.subject} ${m.preview}`.toLowerCase().includes(q)
  );
  const active = emails.find((m) => m.id === activeId) || emails[0];

  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/dashboard">Home</Link>
        <span className="sep">/</span>
        <span className="current">Inbox</span>
      </nav>

      <div className="page-head">
        <div>
          <h1>Inbox</h1>
          <div className="section-sub">Messages and notifications</div>
        </div>
        <Button variant="primary" icon="message">New Message</Button>
      </div>

      <div className="inbox-layout">
        <div className="email-list">
          {filtered.map((m) => (
            <button
              key={m.id}
              className={`email-item ${m.id === activeId ? 'active' : ''}`}
              onClick={() => setActiveId(m.id)}
            >
              <Avatar name={m.sender} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="email-topline">
                  <span className="email-sender">{m.sender}</span>
                  <span className="email-time">{m.time}</span>
                </div>
                <div className="email-subject">{m.subject}</div>
                <div className="email-preview">{m.preview}</div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && <div className="card-body" style={{ color: 'var(--text-3)' }}>No messages match your search.</div>}
        </div>

        <div className="email-pane show">
          <div className="email-pane-head">
            <h2 className="email-pane-title">{active.subject}</h2>
            <div className="email-pane-meta">
              <Avatar name={active.sender} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{active.sender}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{active.cat} • {active.time}</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button className="icon-btn" aria-label="Reply"><Icon name="message" size={17} /></button>
                <button className="icon-btn" aria-label="Delete"><Icon name="trash" size={17} /></button>
              </div>
            </div>
          </div>
          <div className="email-pane-body">
            {active.body.split('\n').map((line, i) => (
              <p key={i} style={{ margin: '0 0 12px' }}>{line || '\u00A0'}</p>
            ))}
            {active.attachment && (
              <div className="attachment-placeholder">
                <span style={{ color: 'var(--primary)' }}><Icon name="paperclip" size={18} /></span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Attachment placeholder</div>
                  <div style={{ fontSize: 12.5 }}>{active.attachment} • 1 file</div>
                </div>
                <Button variant="secondary" size="sm" icon="download" style={{ marginLeft: 'auto' }}>Download</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
