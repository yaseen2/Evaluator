import React, { useState } from 'react';
import { X, Check, ShieldCheck, Sun, Moon, Monitor } from 'lucide-react';
import { setStoredApiKey, getStoredApiKey, getStoredModel, setStoredModel, AVAILABLE_MODELS } from '../services/geminiApi';

export const SettingsModal = ({ isOpen, onClose, themeMode, setThemeMode, groundingUsage }) => {
  const [activeTab, setActiveTab] = useState('api'); // 'api' | 'theme' | 'grounding'
  const [apiKeyInput, setApiKeyInput] = useState(getStoredApiKey());
  const [selectedModel, setSelectedModel] = useState(getStoredModel());
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSaveApiKey = () => {
    setStoredApiKey(apiKeyInput);
    setStoredModel(selectedModel);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleRemoveApiKey = () => {
    setStoredApiKey('');
    setApiKeyInput('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={e => e.stopPropagation()}
        style={{
          width: '92%',
          maxWidth: '540px',
          height: 'auto',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.25rem',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
      >
        {/* FIXED HEADER */}
        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚙️ Platform Settings</span>
          </h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        {/* TAB NAVIGATION */}
        <div className="nav-tabs" style={{ flexShrink: 0, margin: '0.65rem 0 0.75rem 0' }}>
          <button
            className={`tab-item ${activeTab === 'api' ? 'active' : ''}`}
            onClick={() => setActiveTab('api')}
          >
            API Key & Model Selection
          </button>
          <button
            className={`tab-item ${activeTab === 'theme' ? 'active' : ''}`}
            onClick={() => setActiveTab('theme')}
          >
            Appearance & Theme
          </button>
          <button
            className={`tab-item ${activeTab === 'grounding' ? 'active' : ''}`}
            onClick={() => setActiveTab('grounding')}
          >
            Usage & Grounding
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '0.25rem 2px' }}>
          
          {/* TAB 1: API Key & Model Selector */}
          {activeTab === 'api' && (
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
                Configure your personal <strong>Google AI Studio Gemini API Key</strong> and select your preferred AI evaluation model.
              </p>

              {/* Gemini Model Selector Dropdown */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Target Gemini Model Engine
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-strong)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    fontFamily: 'var(--font-sans)',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {AVAILABLE_MODELS.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* API Key Input */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                  Gemini API Key
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-strong)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    fontFamily: 'var(--font-mono)',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--pass-green)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={16} />
                <span>Keys & model preferences are stored locally in your browser's <code>localStorage</code>.</span>
              </div>
            </div>
          )}

          {/* TAB 2: Appearance & Theme Switcher */}
          {activeTab === 'theme' && (
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '1rem', fontWeight: 500 }}>
                Interface Theme Mode
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div
                  onClick={() => setThemeMode('light')}
                  style={{
                    padding: '1.25rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: themeMode === 'light' ? '2px solid var(--accent-gold)' : '1px solid var(--border)',
                    background: 'var(--bg-card)',
                    textAlign: 'center',
                    cursor: 'pointer',
                    color: themeMode === 'light' ? 'var(--accent-gold)' : 'var(--text-secondary)'
                  }}
                >
                  <Sun size={24} style={{ marginBottom: '6px' }} />
                  <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>Day Mode</div>
                </div>

                <div
                  onClick={() => setThemeMode('dark')}
                  style={{
                    padding: '1.25rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: themeMode === 'dark' ? '2px solid var(--accent-gold)' : '1px solid var(--border)',
                    background: 'var(--bg-card)',
                    textAlign: 'center',
                    cursor: 'pointer',
                    color: themeMode === 'dark' ? 'var(--accent-gold)' : 'var(--text-secondary)'
                  }}
                >
                  <Moon size={24} style={{ marginBottom: '6px' }} />
                  <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>Night Mode</div>
                </div>

                <div
                  onClick={() => setThemeMode('auto')}
                  style={{
                    padding: '1.25rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: themeMode === 'auto' ? '2px solid var(--accent-gold)' : '1px solid var(--border)',
                    background: 'var(--bg-card)',
                    textAlign: 'center',
                    cursor: 'pointer',
                    color: themeMode === 'auto' ? 'var(--accent-gold)' : 'var(--text-secondary)'
                  }}
                >
                  <Monitor size={24} style={{ marginBottom: '6px' }} />
                  <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>System Auto</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Usage & Grounding */}
          {activeTab === 'grounding' && (
            <div>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Search Grounding Monthly Quota
                </div>
                <div style={{ fontSize: '1.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                  {groundingUsage?.count || 0} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 400 }}>/ {groundingUsage?.limit || 5000} calls used</span>
                </div>
                <div className="metric-line-bg" style={{ height: '6px' }}>
                  <div
                    className="metric-line-fill"
                    style={{
                      width: `${Math.min(100, (((groundingUsage?.count || 0) / (groundingUsage?.limit || 5000)) * 100))}%`,
                      background: 'var(--accent-gold)'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* FIXED FOOTER BUTTONS */}
        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '0.65rem', borderTop: '1px solid var(--border)', marginTop: '0.5rem' }}>
          {getStoredApiKey() && (
            <button className="btn-minimal" onClick={handleRemoveApiKey} style={{ color: 'var(--fail-red)', marginRight: 'auto' }}>
              Remove Key
            </button>
          )}
          <button className="btn-minimal" onClick={onClose}>
            Close
          </button>
          <button className="btn-accent" onClick={handleSaveApiKey}>
            {isSaved ? <><Check size={14} /> Saved!</> : 'Save Settings'}
          </button>
        </div>

      </div>
    </div>
  );
};
