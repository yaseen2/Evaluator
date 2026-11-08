import React, { useState, useEffect } from 'react';
import { X, Plus, Copy, Check, Shield, Key, RefreshCw, Users, CreditCard, CheckCircle2, XCircle, Image as ImageIcon } from 'lucide-react';
import {
  createSubscriptionVoucher,
  fetchAllVouchers,
  fetchAllCandidates,
  adminGrantCreditsToUser,
  savePlatformGeminiConfig,
  getPlatformGeminiConfig,
  savePaymentConfig,
  getPaymentConfig,
  fetchAllPaymentRequests,
  approvePaymentRequest,
  rejectPaymentRequest
} from '../services/firebase';
import { AVAILABLE_MODELS, getStoredApiKey } from '../services/geminiApi';

export const AdminModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('payments'); // 'payments' | 'vouchers' | 'candidates' | 'settings'
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [toppedUpUid, setToppedUpUid] = useState(null);
  const [processingReqId, setProcessingReqId] = useState(null);
  const [expandedReceiptId, setExpandedReceiptId] = useState(null);

  // Platform Gemini Config State
  const [platformKey, setPlatformKey] = useState('');
  const [platformModel, setPlatformModel] = useState('auto');

  // Payment & Direct Checkout Config State
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [bankOrWalletName, setBankOrWalletName] = useState('JazzCash / EasyPaisa / RAAST');
  const [paymentAccountTitle, setPaymentAccountTitle] = useState('');
  const [paymentAccountNumber, setPaymentAccountNumber] = useState('');
  const [aspirantCheckoutUrl, setAspirantCheckoutUrl] = useState('');
  const [proCheckoutUrl, setProCheckoutUrl] = useState('');
  const [configSaved, setConfigSaved] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqList, voucherList, candidateList, geminiCfg, payCfg] = await Promise.all([
        fetchAllPaymentRequests(),
        fetchAllVouchers(),
        fetchAllCandidates(),
        getPlatformGeminiConfig(),
        getPaymentConfig()
      ]);
      setPaymentRequests(reqList);
      setVouchers(voucherList);
      setCandidates(candidateList);

      if (geminiCfg?.apiKey) {
        setPlatformKey(geminiCfg.apiKey);
        setPlatformModel(geminiCfg.defaultModel || 'auto');
      } else if (getStoredApiKey()) {
        setPlatformKey(getStoredApiKey());
      }

      if (payCfg) {
        setWhatsappNumber(payCfg.whatsappNumber || '');
        setBankOrWalletName(payCfg.bankOrWalletName || 'JazzCash / EasyPaisa / RAAST');
        setPaymentAccountTitle(payCfg.paymentAccountTitle || '');
        setPaymentAccountNumber(payCfg.paymentAccountNumber || '');
        setAspirantCheckoutUrl(payCfg.aspirantCheckoutUrl || '');
        setProCheckoutUrl(payCfg.proCheckoutUrl || '');
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

  const pendingPaymentsCount = paymentRequests.filter((r) => r.status === 'pending').length;

  const handleApproveRequest = async (reqId) => {
    setProcessingReqId(reqId);
    try {
      const approved = await approvePaymentRequest(reqId);
      setPaymentRequests((prev) => prev.map((r) => (r.id === reqId ? { ...r, status: 'approved', approvedAt: approved.approvedAt } : r)));
      // Also refresh candidate list credit balance
      setCandidates((prev) =>
        prev.map((c) => (c.uid === approved.userId ? { ...c, credits: approved.updatedCredits, tier: approved.planId } : c))
      );
    } finally {
      setProcessingReqId(null);
    }
  };

  const handleRejectRequest = async (reqId) => {
    setProcessingReqId(reqId);
    try {
      await rejectPaymentRequest(reqId);
      setPaymentRequests((prev) => prev.map((r) => (r.id === reqId ? { ...r, status: 'rejected' } : r)));
    } finally {
      setProcessingReqId(null);
    }
  };

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

  const handleDirectGrant = async (uid, addedCredits, tier) => {
    setLoading(true);
    try {
      const updated = await adminGrantCreditsToUser(uid, addedCredits, tier);
      setCandidates((prev) => prev.map((c) => (c.uid === uid ? updated : c)));
      setToppedUpUid(uid);
      setTimeout(() => setToppedUpUid(null), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    await Promise.all([
      savePlatformGeminiConfig({ apiKey: platformKey, defaultModel: platformModel }),
      savePaymentConfig({
        whatsappNumber,
        bankOrWalletName,
        paymentAccountTitle,
        paymentAccountNumber,
        aspirantCheckoutUrl,
        proCheckoutUrl
      })
    ]);
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '94%',
          maxWidth: '750px',
          maxHeight: '88vh',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '0.65rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} color="var(--accent-blue)" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              SaaS Owner & Subscription Admin Portal
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
        <div className="nav-tabs" style={{ flexShrink: 0, margin: '0.65rem 0', flexWrap: 'wrap' }}>
          <button
            className={`tab-item ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>Payment Queue</span>
            {pendingPaymentsCount > 0 ? (
              <span
                style={{
                  fontSize: '0.64rem',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: 'var(--warning-amber)',
                  color: '#fff'
                }}
              >
                {pendingPaymentsCount} Pending
              </span>
            ) : (
              <span style={{ opacity: 0.7 }}>({paymentRequests.length})</span>
            )}
          </button>
          <button
            className={`tab-item ${activeTab === 'vouchers' ? 'active' : ''}`}
            onClick={() => setActiveTab('vouchers')}
          >
            Vouchers ({vouchers.length})
          </button>
          <button
            className={`tab-item ${activeTab === 'candidates' ? 'active' : ''}`}
            onClick={() => setActiveTab('candidates')}
          >
            Candidates ({candidates.length})
          </button>
          <button
            className={`tab-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Payment & AI Settings
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '0.25rem 2px' }}>
          {/* TAB 0: IN-APP PAYMENT VERIFICATION QUEUE */}
          {activeTab === 'payments' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  Verify candidate RAAST / JazzCash / EasyPaisa Transaction IDs (TIDs) and approve credits in 1 click:
                </span>
                <button className="btn-minimal" onClick={loadData} style={{ padding: '4px 8px' }} title="Refresh Queue">
                  <RefreshCw size={12} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {paymentRequests.length === 0 ? (
                  <div
                    style={{
                      padding: '1.5rem',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.78rem',
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    No payment verification requests submitted yet. When candidates submit a Transaction ID (TID) inside the Subscription modal, it appears here.
                  </div>
                ) : (
                  paymentRequests.map((req) => (
                    <div
                      key={req.id}
                      style={{
                        background: 'var(--bg-card)',
                        border: req.status === 'pending' ? '1.5px solid rgba(245, 158, 11, 0.45)' : '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {req.userName || 'CSS Candidate'}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({req.userEmail})</span>
                          <span
                            style={{
                              fontSize: '0.64rem',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: '10px',
                              background: 'rgba(2, 132, 199, 0.12)',
                              color: 'var(--accent-blue)'
                            }}
                          >
                            {req.planName} ({req.pricePKR} • +{req.credits} Credits)
                          </span>
                        </div>

                        <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <span>
                            <strong>Method:</strong> {req.paymentMethod}
                          </span>
                          <span>
                            <strong>TID:</strong>{' '}
                            <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-blue)' }}>
                              {req.transactionId}
                            </code>
                          </span>
                          {req.senderAccount && (
                            <span>
                              <strong>Sender:</strong> {req.senderAccount}
                            </span>
                          )}
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>
                            {req.createdAt?.replace('T', ' ').slice(0, 16)}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {req.receiptImageDataUrl && (
                          <button
                            type="button"
                            className="btn-minimal"
                            onClick={() => setExpandedReceiptId(expandedReceiptId === req.id ? null : req.id)}
                            style={{ padding: '5px 9px', fontSize: '0.72rem' }}
                          >
                            <ImageIcon size={13} color="var(--accent-blue)" />
                            <span>{expandedReceiptId === req.id ? 'Hide Receipt' : 'View Receipt'}</span>
                          </button>
                        )}
                        {req.status === 'pending' ? (
                          <>
                            <button
                              className="btn-accent"
                              disabled={processingReqId === req.id}
                              onClick={() => handleApproveRequest(req.id)}
                              style={{ padding: '5px 11px', fontSize: '0.72rem', background: '#059669', borderColor: '#10b981' }}
                            >
                              <CheckCircle2 size={13} />
                              <span>{processingReqId === req.id ? 'Approving...' : `Approve (+${req.credits})`}</span>
                            </button>
                            <button
                              className="btn-minimal"
                              disabled={processingReqId === req.id}
                              onClick={() => handleRejectRequest(req.id)}
                              style={{ padding: '5px 9px', fontSize: '0.72rem', color: 'var(--fail-red)' }}
                            >
                              <XCircle size={13} />
                              <span>Decline</span>
                            </button>
                          </>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '10px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: req.status === 'approved' ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)',
                              color: req.status === 'approved' ? 'var(--pass-green)' : 'var(--fail-red)'
                            }}
                          >
                            {req.status === 'approved' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            <span>{req.status === 'approved' ? `Approved (+${req.credits} Credits)` : 'Declined'}</span>
                          </span>
                        )}
                      </div>

                      {expandedReceiptId === req.id && req.receiptImageDataUrl && (
                        <div style={{ width: '100%', marginTop: '6px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                          <img
                            src={req.receiptImageDataUrl}
                            alt="Payment Receipt"
                            style={{
                              maxWidth: '100%',
                              maxHeight: '340px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-strong)',
                              display: 'block'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 1: VOUCHERS */}
          {activeTab === 'vouchers' && (
            <div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                Generate 1-time activation codes to send to candidates who pay via JazzCash, EasyPaisa, RAAST, or Bank Transfer:
              </p>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <button
                  className="btn-minimal"
                  disabled={loading}
                  onClick={() => handleGenerateVoucher(100, 'aspirant', 'Starter Pack (100 Credits)')}
                >
                  <Plus size={13} color="var(--accent-blue)" />
                  <span>+100 Credits Code</span>
                </button>
                <button
                  className="btn-accent"
                  disabled={loading}
                  onClick={() => handleGenerateVoucher(500, 'aspirant', 'CSS Aspirant Monthly (500 Credits)')}
                >
                  <Plus size={13} />
                  <span>+500 Credits (PKR 1,500)</span>
                </button>
                <button
                  className="btn-accent"
                  disabled={loading}
                  onClick={() => handleGenerateVoucher(1500, 'pro', 'CSS Allocation Pro (1,500 Credits)')}
                >
                  <Plus size={13} />
                  <span>+1,500 Credits (PKR 3,500)</span>
                </button>
                <button className="btn-minimal" onClick={loadData} title="Refresh">
                  <RefreshCw size={13} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {vouchers.length === 0 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    No voucher codes generated yet. Click a button above to create an instant activation code.
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
          )}

          {/* TAB 2: REGISTERED CANDIDATES & DIRECT TOP-UP */}
          {activeTab === 'candidates' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  View all registered CSS candidates and directly top up their evaluation credits:
                </span>
                <button className="btn-minimal" onClick={loadData} style={{ padding: '4px 8px' }}>
                  <RefreshCw size={12} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {candidates.length === 0 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    No registered candidates found yet.
                  </div>
                ) : (
                  candidates.map((c) => (
                    <div
                      key={c.uid}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '9px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Users size={13} color="var(--accent-blue)" />
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {c.displayName || 'CSS Candidate'}
                          </span>
                          <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(2, 132, 199, 0.12)', color: 'var(--accent-blue)', fontWeight: 700, textTransform: 'uppercase' }}>
                            {c.tier || 'free'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {c.email} • Papers: <strong>{c.evaluationsCount || 0}</strong>
                          {c.totalTokensConsumed ? ` • Tokens: ${(c.totalTokensConsumed / 1000).toFixed(1)}k` : ''} • Balance:{' '}
                          <strong style={{ color: 'var(--pass-green)' }}>{c.role === 'admin' ? '∞' : c.credits} Credits</strong>
                        </div>
                      </div>

                      {c.role !== 'admin' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {toppedUpUid === c.uid && (
                            <span style={{ fontSize: '0.68rem', color: 'var(--pass-green)', fontWeight: 600 }}>
                              ✓ Added!
                            </span>
                          )}
                          <button
                            className="btn-minimal"
                            disabled={loading}
                            onClick={() => handleDirectGrant(c.uid, 500, 'aspirant')}
                            style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                          >
                            +500 Credits
                          </button>
                          <button
                            className="btn-accent"
                            disabled={loading}
                            onClick={() => handleDirectGrant(c.uid, 1500, 'pro')}
                            style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                          >
                            +1,500 Pro
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PAYMENT & AI ENGINE SETTINGS */}
          {activeTab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Direct Payment & Checkout Block */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.65rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-blue)' }}>
                  <CreditCard size={15} />
                  <span>Direct RAAST / JazzCash / EasyPaisa & Card Checkout Details</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      WhatsApp Number (e.g. 923001234567)
                    </label>
                    <input
                      type="text"
                      placeholder="923..."
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'var(--bg-panel)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Bank / Wallet Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. EasyPaisa / JazzCash / Meezan Bank RAAST"
                      value={bankOrWalletName}
                      onChange={(e) => setBankOrWalletName(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'var(--bg-panel)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Account Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Muhammad Yaseen"
                      value={paymentAccountTitle}
                      onChange={(e) => setPaymentAccountTitle(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'var(--bg-panel)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Account / RAAST / IBAN Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 0300-XXXXXXX or PK..."
                      value={paymentAccountNumber}
                      onChange={(e) => setPaymentAccountNumber(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'var(--bg-panel)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Optional Card Checkout URL — CSS Aspirant (Safepay / LemonSqueezy)
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={aspirantCheckoutUrl}
                      onChange={(e) => setAspirantCheckoutUrl(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'var(--bg-panel)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Optional Card Checkout URL — Allocation Pro (Safepay / LemonSqueezy)
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={proCheckoutUrl}
                      onChange={(e) => setProCheckoutUrl(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'var(--bg-panel)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* Subscriber Master Gemini Key Block */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.65rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-blue)' }}>
                  <Key size={15} />
                  <span>Subscriber Master Gemini AI Engine</span>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Default Subscriber Model Engine
                  </label>
                  <select
                    value={platformModel}
                    onChange={(e) => setPlatformModel(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-strong)',
                      background: 'var(--bg-panel)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem'
                    }}
                  >
                    {AVAILABLE_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Platform Master Gemini API Key (For Active Subscribers)
                  </label>
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={platformKey}
                    onChange={(e) => setPlatformKey(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'var(--bg-panel)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn-accent" onClick={handleSaveSettings} style={{ padding: '8px 18px' }}>
                  {configSaved ? (
                    <>
                      <Check size={14} />
                      <span>Saved All Settings to Cloud!</span>
                    </>
                  ) : (
                    <span>Save Payment & AI Settings</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
