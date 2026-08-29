import { useState } from 'react';
import { useStore, useSearch, useToast } from '../store/hooks.js';
import { useTranslation } from '../store/useTranslation.js';
import Avatar from '../components/Avatar.jsx';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import FormField from '../components/FormField.jsx';
import Breadcrumb from '../components/Breadcrumb.jsx';
import PageHeader from '../components/PageHeader.jsx';

export default function Inbox() {
  const { query } = useSearch();
  const { messages, addMessage, deleteMessage } = useStore();
  const { notify } = useToast();
  const { t } = useTranslation();

  const [activeId, setActiveId] = useState(null);
  const [listOpen, setListOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const [form, setForm] = useState({ recipient: '', subject: '', message: '' });
  const [errors, setErrors] = useState({});

  const q = query.trim().toLowerCase();
  const filtered = messages.filter((m) =>
    !q || `${m.sender} ${m.subject} ${m.body}`.toLowerCase().includes(q)
  );

  const active = listOpen ? null : messages.find((m) => m.id === activeId) || filtered[0] || null;

  const openCompose = () => {
    setForm({ recipient: '', subject: '', message: '' });
    setErrors({});
    setComposeOpen(true);
  };

  const send = () => {
    const errs = {};
    if (!form.recipient.trim()) errs.recipient = t('inbox.recipientReq');
    if (!form.subject.trim()) errs.subject = t('inbox.subjectReq');
    if (!form.message.trim()) errs.message = t('inbox.messageReq');
    setErrors(errs);
    if (Object.keys(errs).length) return;
    addMessage(form);
    notify(t('action.send') + ' — ' + form.subject);
    setComposeOpen(false);
  };

  const doDelete = () => {
    if (!confirmId) return;
    deleteMessage(confirmId);
    if (activeId === confirmId) setActiveId(null);
    setConfirmId(null);
    notify(t('inbox.delete.title'));
  };

  return (
    <>
      <Breadcrumb crumbs={[{ label: t('breadcrumb.home'), to: '/dashboard' }, { label: t('inbox.title') }]} />
      <PageHeader
        title={t('inbox.title')}
        subtitle={t('inbox.subtitle')}
        actions={<Button variant="primary" icon="message" onClick={openCompose}>{t('action.newMessage')}</Button>}
      />

      <div className="inbox-layout">
        <div className={`email-list ${active ? 'hide' : ''}`}>
          {filtered.length === 0 ? (
            <div className="inbox-empty-mini">
              <EmptyState
                icon="inbox"
                title={t('inbox.empty.title')}
                description={t('inbox.empty.desc')}
                action={<Button variant="primary" icon="message" onClick={openCompose}>{t('action.newMessage')}</Button>}
              />
            </div>
          ) : (
            filtered.map((m) => (
              <button
                key={m.id}
                className={`email-item ${active && m.id === active.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveId(m.id);
                  setListOpen(false);
                }}
              >
                <Avatar name={m.sender} />
                <div className="email-main">
                  <div className="email-topline">
                    <span className="email-sender">{m.sender}</span>
                    <span className="email-time">{m.time}</span>
                  </div>
                  <div className="email-subject">{m.subject}</div>
                  <div className="email-preview">{m.preview}</div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className={`email-pane email-pane-mobile ${active ? 'show' : ''}`}>
          {active ? (
            <>
              <div className="email-pane-head">
                <div className="email-pane-top">
                  <button className="inbox-back-btn icon-btn" onClick={() => { setActiveId(null); setListOpen(true); }} aria-label={t('action.back')}><Icon name="back" size={17} /></button>
                  <h2 className="email-pane-title">{active.subject}</h2>
                  <div className="email-pane-actions">
                    <button className="icon-btn" aria-label={t('action.edit')}><Icon name="edit" size={17} /></button>
                    <button className="icon-btn" aria-label={t('action.delete')} onClick={() => setConfirmId(active.id)}><Icon name="trash" size={17} /></button>
                  </div>
                </div>
                <div className="email-pane-meta">
                  <Avatar name={active.sender} />
                  <div>
                    <div className="pane-sender">{active.sender}</div>
                    <div className="pane-sub">{active.cat} • {active.time} {active.recipient ? `• ${t('inbox.recipient')}: ${active.recipient}` : ''}</div>
                  </div>
                </div>
              </div>
              <div className="email-pane-body">
                {active.body.split('\n').map((line, i) => (
                  <p key={i} className="pane-para">{line || '\u00A0'}</p>
                ))}
              </div>
            </>
          ) : (
            <EmptyState icon="mail" title={t('inbox.empty.title')} description={t('inbox.empty.desc')} />
          )}
        </div>
      </div>

      <Modal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        title={t('inbox.new.title')}
        footerContent={
          <div className="modal-footer-btns">
            <Button variant="secondary" onClick={() => setComposeOpen(false)}>{t('action.cancel')}</Button>
            <Button variant="primary" icon="message" onClick={send}>{t('action.send')}</Button>
          </div>
        }
      >
        <FormField label={t('inbox.recipient')} htmlFor="in-recipient" required error={errors.recipient}>
          <input className="form-input" id="in-recipient" value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} aria-invalid={!!errors.recipient} />
        </FormField>
        <FormField label={t('inbox.subject')} htmlFor="in-subject" required error={errors.subject}>
          <input className="form-input" id="in-subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} aria-invalid={!!errors.subject} />
        </FormField>
        <FormField label={t('inbox.message')} htmlFor="in-message" required error={errors.message}>
          <textarea className="form-textarea" id="in-message" rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} aria-invalid={!!errors.message} />
        </FormField>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        title={t('inbox.delete.title')}
        message={t('inbox.delete.msg')}
        confirmLabel={t('action.delete')}
        onCancel={() => setConfirmId(null)}
        onConfirm={doDelete}
      />
    </>
  );
}
