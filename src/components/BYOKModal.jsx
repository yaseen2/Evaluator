import React, { useState } from 'react';
import { Key, ShieldCheck, X, AlertCircle, CheckCircle } from 'lucide-react';
import { getStoredApiKey, setStoredApiKey } from '../services/geminiApi';

export const BYOKModal = ({ isOpen, onClose }) => {
  const [keyInput, setKeyInput] = useState(getStoredApiKey());
  const [savedStatus, setSavedStatus] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setStoredApiKey(keyInput);
    setSavedStatus(true);
    setTimeout(() => {
      setSavedStatus(false);
      onClose();
    }, 800);
  };

  const handleClear = () => {
    setKeyInput('');
    setStoredApiKey('');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ padding: '6px', background: 'rgba(217,119,6,0.15)', borderRadius: '6px', border: '1px solid rgba(217,119,6,0.3)' }}>
              <Key size={18} color="var(--accent-gold)" />
            </div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', margin: 0 }}>
              Bring Your Own Key (BYOK)
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Insert your personal <strong>Google AI Studio Gemini API Key</strong> to get unlimited evaluation credits on your own free tier quota.
        </p>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
            Gemini 3.6 Flash API Key
          </label>
          <input
            type="password"
            placeholder="AIzaSy..."
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.8rem',
              background: 'var(--bg-dark)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-main)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem'
            }}
          />
        </div>

        <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <ShieldCheck size={18} color="var(--pass-green)" style={{ shrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
            <strong>Security Guarantee:</strong> Your key is stored strictly in your local browser's <code style={{ fontFamily: 'var(--font-mono)' }}>localStorage</code>. It is never logged or stored on central servers.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          {keyInput && (
            <button className="btn btn-secondary" onClick={handleClear} style={{ fontSize: '0.8rem' }}>
              Remove Key
            </button>
          )}
          <button className="btn btn-primary" onClick={handleSave} style={{ fontSize: '0.8rem' }}>
            {savedStatus ? <CheckCircle size={16} /> : null}
            {savedStatus ? 'Saved!' : 'Save Key'}
          </button>
        </div>
      </div>
    </div>
  );
};
