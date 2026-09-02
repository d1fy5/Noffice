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
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 18px',
          borderRadius: '50px',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '0.9rem',
          transition: 'all 0.2s ease',
        }}
      >
        <span style={{ fontSize: '1.2rem' }}>🤖</span>
        <span>AI Copilot</span>
        {open && <Icon name="x" size={16} />}
      </button>

      {/* Expandable Chat Drawer Window */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '24px',
            width: '380px',
            maxHeight: '560px',
            height: '80vh',
            zIndex: 998,
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 16px',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              color: '#fff',
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>🤖</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Noffice AI Copilot</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                  {status?.mode || '100% Offline AI Engine'}
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <Icon name="x" size={18} />
            </button>
          </div>

          {/* Quick Prompts bar */}
          <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '6px', overflowX: 'auto' }}>
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(qp)}
                style={{
                  whiteSpace: 'nowrap',
                  fontSize: '0.75rem',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  cursor: 'pointer',
                  color: '#334155',
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
              padding: '12px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              background: '#f8fafc',
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
                    padding: '10px 14px',
                    borderRadius: m.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    background: m.sender === 'user' ? 'var(--primary)' : '#ffffff',
                    color: m.sender === 'user' ? '#ffffff' : '#1e293b',
                    fontSize: '0.85rem',
                    lineHeight: '1.4',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    border: m.sender === 'user' ? 'none' : '1px solid #e2e8f0',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {m.text}
                </div>
                <div
                  style={{
                    fontSize: '0.65rem',
                    color: '#94a3b8',
                    marginTop: '2px',
                    textAlign: m.sender === 'user' ? 'right' : 'left',
                  }}
                >
                  {m.time}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', fontSize: '0.8rem', color: '#64748b', italic: 'true' }}>
                AI sedang berpikir...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box Footer */}
          <div style={{ padding: '10px', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Tanyakan sesuatu pada AI..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '0.85rem',
                borderRadius: '20px',
                border: '1px solid #cbd5e1',
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
