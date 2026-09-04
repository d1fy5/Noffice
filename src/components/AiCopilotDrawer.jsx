import { useState, useEffect, useRef } from 'react';
import { AiAPI } from '../services/api.js';
import Icon from './Icon.jsx';
import Button from './Button.jsx';

export default function AiCopilotDrawer() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(null);
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Halo! Saya Noffice Copilot — Asisten AI Notaris Lokal Anda (100% Offline). Ada yang bisa saya bantu terkait permohonan akta, syarat berkas, atau operasional kantor?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    AiAPI.getStatus()
      .then((res) => setStatus(res))
      .catch(() => setStatus({ mode: 'Offline NLP Engine' }));
  }, []);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  const handleSend = async (customMsg = null) => {
    const textToSend = customMsg || input;
    if (!textToSend || !textToSend.trim() || loading) return;

    const userMsg = {
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customMsg) setInput('');
    setLoading(true);

    try {
      const res = await AiAPI.chat(textToSend);
      const aiMsg = {
        sender: 'ai',
        text: res.reply || 'Maaf, terjadi kendala saat memproses jawaban.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Maaf, tidak dapat terhubung ke AI Engine Lokal.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    'Syarat Akta Jual Beli (AJB)',
    'Syarat Pendirian PT',
    'Cara Generate Nomor Akta',
  ];

  return (
    <>
      {/* Floating Button Bottom-Right */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="copilot-floating-btn"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 20px',
          borderRadius: '50px',
          background: 'var(--primary)',
          color: '#fff',
          border: '1px solid var(--primary)',
          boxShadow: 'var(--shadow-md)',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '0.9rem',
          letterSpacing: '-0.01em',
          transition: 'background 0.15s',
        }}
      >
        <Icon name="activity" size={16} />
        <span>Noffice Copilot</span>
        {open && <Icon name="x" size={16} />}
      </button>

      {/* Expandable Chat Drawer Window */}
      {open && (
        <div
          className="copilot-window"
          style={{
            position: 'fixed',
            bottom: '84px',
            right: '24px',
            width: '390px',
            maxHeight: '580px',
            height: '82vh',
            zIndex: 998,
            background: 'var(--surface)',
            borderRadius: '20px',
            boxShadow: 'var(--shadow-lg), 0 0 30px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid var(--border)',
            animation: 'fadeIn 0.25s ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 18px',
            background: 'var(--primary)',
            color: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                border: '1px solid rgba(255,255,255,0.2)',
              }}>
                <Icon name="activity" size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Noffice AI Copilot</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.72)', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '1px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                  {status?.mode || '100% Offline AI Engine'}
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#e2e8f0', borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex' }}
            >
              <Icon name="x" size={16} />
            </button>
          </div>

          {/* Quick Prompts bar */}
          <div style={{ padding: '10px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', display: 'flex', gap: '6px', overflowX: 'auto' }}>
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(qp)}
                style={{
                  whiteSpace: 'nowrap',
                  fontSize: '0.75rem',
                  padding: '5px 10px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  cursor: 'pointer',
                  color: 'var(--text-2)',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                }}
              >
                {qp}
              </button>
            ))}
          </div>

          {/* Message History Body */}
          <div
            style={{
              flex: 1,
              padding: '14px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              background: 'var(--bg)',
            }}
          >
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                }}
              >
                <div
                  style={{
                    padding: '10px 15px',
                    borderRadius: m.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: m.sender === 'user' ? 'var(--primary)' : 'var(--surface)',
                    color: m.sender === 'user' ? '#ffffff' : 'var(--text)',
                    fontSize: '0.85rem',
                    lineHeight: '1.45',
                    boxShadow: 'var(--shadow-sm)',
                    border: m.sender === 'user' ? '1px solid var(--primary)' : '1px solid var(--border)',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {m.text}
                </div>
                <div
                  style={{
                    fontSize: '0.65rem',
                    color: 'var(--text-3)',
                    marginTop: '3px',
                    textAlign: m.sender === 'user' ? 'right' : 'left',
                    fontWeight: 500,
                  }}
                >
                  {m.time}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', fontSize: '0.8rem', color: 'var(--text-2)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="activity" size={14} /> AI Notaris sedang berpikir...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box Footer */}
          <div style={{ padding: '12px', background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Tanyakan sesuatu pada AI Notaris..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              style={{
                flex: 1,
                padding: '9px 14px',
                fontSize: '0.85rem',
                borderRadius: '24px',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
                color: 'var(--text)',
                outline: 'none',
              }}
            />
            <Button variant="primary" size="sm" onClick={() => handleSend()} disabled={loading}>
              Kirim
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

