import React, { useState, useEffect } from 'react';
import { X, Plus, Copy, Check, Shield, Key, RefreshCw } from 'lucide-react';
import {
  createSubscriptionVoucher,
  fetchAllVouchers,
  savePlatformGeminiConfig,
  getPlatformGeminiConfig
} from '../services/firebase';
import { AVAILABLE_MODELS, getStoredApiKey } from '../services/geminiApi';

export const AdminModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('vouchers'); // 'vouchers' | 'platform_key'
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  // Platform Gemini Config State
  const [platformKey, setPlatformKey] = useState('');
  const [platformModel, setPlatformModel] = useState('auto');
  const [keySaved, setKeySaved] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [voucherList, geminiCfg] = await Promise.all([
        fetchAllVouchers(),
        getPlatformGeminiConfig()
      ]);
      setVouchers(voucherList);
      if (geminiCfg?.apiKey) {
        setPlatformKey(geminiCfg.apiKey);
        setPlatformModel(geminiCfg.defaultModel || 'auto');
      } else if (getStoredApiKey()) {
        setPlatformKey(getStoredApiKey());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGenerateVoucher = async (credits, tier, label) => {
    setLoading(true);
    try {
      const created = await createSubscriptionVoucher({ credits, tier, label });
      setVouchers((prev) => [created, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSavePlatformKey = async () => {
    await savePlatformGeminiConfig({ apiKey: platformKey, defaultModel: platformModel });
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '94%',
          maxWidth: '680px',
          maxHeight: '88vh',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} color="var(--accent-blue)" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              SaaS Owner & Voucher Admin Portal
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="nav-tabs" style={{ flexShrink: 0, margin: '0.65rem 0' }}>
          <button
            className={`tab-item ${activeTab === 'vouchers' ? 'active' : ''}`}
            onClick={() => setActiveTab('vouchers')}
          >
            Subscription Vouchers ({vouchers.length})
          </button>
          <button
            className={`tab-item ${activeTab === 'platform_key' ? 'active' : ''}`}
            onClick={() => setActiveTab('platform_key')}
          >
            Subscriber Master AI Key
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '0.25rem 2px' }}>
          {activeTab === 'vouchers' ? (
            <div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                Generate 1-time activation codes to send to candidates who pay via JazzCash, EasyPaisa, RAAST, or Bank Transfer:
              </p>

              {/* Quick Generate Buttons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <button
                  className="btn-minimal"
                  disabled={loading}
                  onClick={() => handleGenerateVoucher(10, 'aspirant', 'Starter Pack (10 Credits)')}
                >
                  <Plus size={13} color="var(--accent-blue)" />
                  <span>Generate +10 Credits Code</span>
                </button>
                <button
                  className="btn-accent"
                  disabled={loading}
                  onClick={() => handleGenerateVoucher(30, 'aspirant', 'CSS Aspirant Monthly (30 Credits)')}
                >
                  <Plus size={13} />
                  <span>Generate +30 Credits (PKR 1,500)</span>
                </button>
                <button
                  className="btn-accent"
                  disabled={loading}
                  onClick={() => handleGenerateVoucher(100, 'pro', 'CSS/PMS Pro Pass (100 Credits)')}
                >
                  <Plus size={13} />
                  <span>Generate +100 Credits (PKR 3,500)</span>
                </button>
                <button
                  className="btn-minimal"
                  onClick={loadData}
                  title="Refresh Vouchers"
                >
                  <RefreshCw size={13} />
                </button>
              </div>

              {/* Vouchers List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {vouchers.length === 0 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    No voucher codes generated yet. Click one of the buttons above to create an instant activation code.
                  </div>
                ) : (
                  vouchers.map((v) => (
                    <div
                      key={v.code}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 700, color: v.isRedeemed ? 'var(--text-muted)' : 'var(--accent-blue)' }}>
                            {v.code}
                          </span>
                          <span
                            style={{
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: v.isRedeemed ? 'rgba(156, 163, 175, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              color: v.isRedeemed ? 'var(--text-muted)' : 'var(--pass-green)'
                            }}
                          >
                            {v.isRedeemed ? `Redeemed by ${v.redeemedByEmail || 'User'}` : `Available (+${v.credits} Credits)`}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {v.label} • Created {v.createdAt?.split('T')[0]}
                        </div>
                      </div>

                      {!v.isRedeemed && (
                        <button
                          className="btn-minimal"
                          onClick={() => handleCopyCode(v.code)}
                          style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                        >
                          {copiedCode === v.code ? <Check size={13} color="var(--pass-green)" /> : <Copy size={13} />}
                          <span>{copiedCode === v.code ? 'Copied' : 'Copy Code'}</span>
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Tab 2: Central Subscriber Gemini API Key */
            <div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
                Configure the <strong>Platform Master Gemini API Key</strong> stored in Cloud Firestore. Active subscribers with evaluation credits will automatically use this engine without needing their own key.
              </p>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Default Subscriber Model Engine
                </label>
                <select
                  value={platformModel}
                  onChange={(e) => setPlatformModel(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-strong)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem'
                  }}
                >
                  {AVAILABLE_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Platform Master Gemini API Key
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', padding: '7px 10px' }}>
                  <Key size={14} color="var(--accent-blue)" />
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={platformKey}
                    onChange={(e) => setPlatformKey(e.target.value)}
                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <button className="btn-accent" onClick={handleSavePlatformKey}>
                {keySaved ? (
                  <>
                    <Check size={14} />
                    <span>Saved to Cloud Firestore!</span>
                  </>
                ) : (
                  <span>Save Platform Configuration</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

