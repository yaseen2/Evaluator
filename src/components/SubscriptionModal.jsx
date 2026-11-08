import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Zap,
  KeyRound,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  MessageCircle,
  Copy,
  Clock,
  Send,
  ExternalLink
} from 'lucide-react';
import {
  SUBSCRIPTION_PLANS,
  redeemSubscriptionVoucher,
  getPaymentConfig,
  submitPaymentRequest,
  fetchUserPaymentRequests
} from '../services/firebase';

export const SubscriptionModal = ({ isOpen, onClose, user, userProfile, onProfileUpdated, onOpenAuth }) => {
  const [voucherCode, setVoucherCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState(null);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [copiedAccount, setCopiedAccount] = useState(false);

  // In-App Payment Verification Form State
  const [paymentMethod, setPaymentMethod] = useState('RAAST / Bank Transfer');
  const [transactionId, setTransactionId] = useState('');
  const [senderAccount, setSenderAccount] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentStatusMsg, setPaymentStatusMsg] = useState(null);
  const [userRequests, setUserRequests] = useState([]);

  useEffect(() => {
    if (isOpen) {
      getPaymentConfig().then((cfg) => {
        if (cfg) setPaymentConfig(cfg);
      });
      if (user?.uid) {
        fetchUserPaymentRequests(user.uid).then(setUserRequests);
      } else {
        setUserRequests([]);
      }
    }
  }, [isOpen, user?.uid]);

  if (!isOpen) return null;

  const currentCredits = userProfile?.credits ?? 0;
  const currentTier = userProfile?.tier || 'free';

  const handleCopyAccount = () => {
    if (!paymentConfig?.paymentAccountNumber) return;
    navigator.clipboard.writeText(paymentConfig.paymentAccountNumber);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  const handleSubmitPaymentTid = async (e) => {
    e.preventDefault();
    if (!user) {
      onClose();
      onOpenAuth?.();
      return;
    }

    if (!transactionId.trim()) {
      setPaymentStatusMsg({ type: 'error', text: 'Please enter your Transaction ID (TID) or Reference Number.' });
      return;
    }

    setSubmittingPayment(true);
    setPaymentStatusMsg(null);
    try {
      const created = await submitPaymentRequest({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || userProfile?.displayName,
        planId: selectedPlanForPayment.id,
        planName: selectedPlanForPayment.name,
        pricePKR: selectedPlanForPayment.pricePKR,
        credits: selectedPlanForPayment.credits,
        paymentMethod,
        transactionId,
        senderAccount
      });
      setUserRequests((prev) => [created, ...prev]);
      setTransactionId('');
      setSenderAccount('');
      setPaymentStatusMsg({
        type: 'success',
        text: `Payment TID (${created.transactionId}) submitted! Credits (+${created.credits}) will be added to your account upon verification.`
      });
    } catch (err) {
      setPaymentStatusMsg({
        type: 'error',
        text: err.message || 'Could not submit payment verification.'
      });
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleRedeem = async (e) => {
    e.preventDefault();
    if (!user) {
      onClose();
      onOpenAuth?.();
      return;
    }

    if (!voucherCode.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter an activation voucher code.' });
      return;
    }

    setRedeeming(true);
    setStatusMessage(null);
    try {
      const result = await redeemSubscriptionVoucher(user.uid, user.email, voucherCode);
      setStatusMessage({
        type: 'success',
        text: `Success! Added +${result.addedCredits} Credits (${result.planLabel}). Your new balance is ${result.updatedCredits} Credits.`
      });
      setVoucherCode('');
      onProfileUpdated?.({
        ...userProfile,
        credits: result.updatedCredits,
        tier: result.updatedTier
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Could not redeem activation code.'
      });
    } finally {
      setRedeeming(false);
    }
  };

  const buildWhatsAppCheckoutUrl = (plan) => {
    const cleanPhone = (paymentConfig?.whatsappNumber || '').replace(/[^0-9]/g, '');
    const userEmailText = user?.email ? `for my account (${user.email})` : '';
    const tidText = transactionId.trim() ? ` (TID: ${transactionId.trim()})` : '';
    const msg = encodeURIComponent(
      `Assalam-o-Alaikum! I want to activate *${plan.name}* (${plan.pricePKR} — ${plan.credits} Credits) on FPSC CSS Evaluator ${userEmailText}${tidText}.`
    );
    return cleanPhone ? `https://wa.me/${cleanPhone}?text=${msg}` : null;
  };

  const getDirectCardCheckoutUrl = (plan) => {
    if (!plan || !paymentConfig) return null;
    if (plan.id === 'aspirant' && paymentConfig.aspirantCheckoutUrl) return paymentConfig.aspirantCheckoutUrl;
    if (plan.id === 'pro' && paymentConfig.proCheckoutUrl) return paymentConfig.proCheckoutUrl;
    return null;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '94%',
          maxWidth: '780px',
          maxHeight: '90vh',
          padding: '1.25rem 1.35rem',
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
            paddingBottom: '0.75rem'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                ⚡ FPSC Examiner Subscription Plans
              </h3>
              {user && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'rgba(2, 132, 199, 0.12)',
                    color: 'var(--accent-blue)',
                    border: '1px solid rgba(2, 132, 199, 0.28)'
                  }}
                >
                  Balance: {userProfile?.role === 'admin' ? '∞ Admin' : `${currentCredits} Credits`}
                </span>
              )}
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.73rem', color: 'var(--text-muted)' }}>
              1 Credit = Essay Outline or 20-Mark Question • 2 Credits = Full 100-Mark English Essay
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '1rem 2px' }}>
          {/* 3-Column Pricing Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '1.1rem' }}>
            {SUBSCRIPTION_PLANS.map((plan) => {
              const isCurrentTier = user && currentTier === plan.id;
              const isSelected = selectedPlanForPayment?.id === plan.id;
              return (
                <div
                  key={plan.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: isSelected || plan.highlight ? '2px solid var(--accent-blue)' : '1px solid var(--border-strong)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    boxShadow: isSelected || plan.highlight ? '0 8px 25px rgba(2, 132, 199, 0.14)' : 'none'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {plan.name}
                      </span>
                      <span
                        style={{
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '10px',
                          background: plan.highlight ? 'var(--accent-blue)' : 'var(--bg-panel)',
                          color: plan.highlight ? '#fff' : 'var(--text-secondary)',
                          border: '1px solid var(--border)'
                        }}
                      >
                        {plan.badge}
                      </span>
                    </div>

                    <div style={{ margin: '8px 0 12px 0' }}>
                      <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                        {plan.pricePKR}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                        {plan.period}
                      </span>
                    </div>

                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem 0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {plan.features.map((feat, i) => (
                        <li key={i} style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '6px', lineHeight: 1.35 }}>
                          <Check size={13} color="var(--pass-green)" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {plan.id === 'free' ? (
                    <button
                      className="btn-minimal"
                      onClick={() => {
                        if (!user) {
                          onClose();
                          onOpenAuth?.();
                        }
                      }}
                      style={{ width: '100%', justifyContent: 'center', padding: '7px' }}
                    >
                      {user ? (isCurrentTier ? 'Active Starter Plan' : 'Included') : 'Sign Up for 2 Free Credits'}
                    </button>
                  ) : (
                    <button
                      className="btn-accent"
                      onClick={() => {
                        setSelectedPlanForPayment(plan);
                        setPaymentStatusMsg(null);
                      }}
                      style={{ width: '100%', justifyContent: 'center', padding: '7px' }}
                    >
                      <Zap size={13} />
                      <span>{isSelected ? 'Selected Below' : `Subscribe (${plan.credits} Credits)`}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* IN-APP DIRECT CHECKOUT & TID SUBMISSION PANEL */}
          {selectedPlanForPayment && (
            <div
              style={{
                background: 'rgba(2, 132, 199, 0.06)',
                border: '1.5px solid rgba(2, 132, 199, 0.35)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                marginBottom: '1rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CreditCard size={16} />
                  <span>
                    Direct Checkout — {selectedPlanForPayment.name} ({selectedPlanForPayment.pricePKR} • +{selectedPlanForPayment.credits} Credits)
                  </span>
                </span>
                <button
                  onClick={() => setSelectedPlanForPayment(null)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.72rem' }}
                >
                  Close
                </button>
              </div>

              {/* Step 1: Account Transfer Details */}
              <div
                style={{
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px',
                  marginBottom: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div style={{ fontSize: '0.75rem', lineHeight: 1.55 }}>
                  <div>
                    <strong style={{ color: 'var(--text-secondary)' }}>Step 1 — Transfer {selectedPlanForPayment.pricePKR} via:</strong>{' '}
                    <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>
                      {paymentConfig?.bankOrWalletName || 'JazzCash / EasyPaisa / RAAST'}
                    </span>
                  </div>
                  {paymentConfig?.paymentAccountTitle && (
                    <div>
                      <strong style={{ color: 'var(--text-secondary)' }}>Account Title:</strong>{' '}
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{paymentConfig.paymentAccountTitle}</span>
                    </div>
                  )}
                  <div>
                    <strong style={{ color: 'var(--text-secondary)' }}>Account / RAAST IBAN:</strong>{' '}
                    <span style={{ color: 'var(--pass-green)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      {paymentConfig?.paymentAccountNumber || 'Configure in Admin Portal → Settings'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {paymentConfig?.paymentAccountNumber && (
                    <button
                      type="button"
                      className="btn-minimal"
                      onClick={handleCopyAccount}
                      style={{ padding: '5px 10px', fontSize: '0.72rem' }}
                    >
                      {copiedAccount ? <Check size={13} color="var(--pass-green)" /> : <Copy size={13} />}
                      <span>{copiedAccount ? 'Copied!' : 'Copy Account'}</span>
                    </button>
                  )}

                  {getDirectCardCheckoutUrl(selectedPlanForPayment) && (
                    <a
                      href={getDirectCardCheckoutUrl(selectedPlanForPayment)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-accent"
                      style={{ textDecoration: 'none', padding: '5px 11px', fontSize: '0.72rem' }}
                    >
                      <ExternalLink size={12} />
                      <span>Pay with Debit / Credit Card</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Step 2: Submit Transaction ID (TID) Directly in Website */}
              <form onSubmit={handleSubmitPaymentTid}>
                <div style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Step 2 — Submit Transaction ID (TID) for Credit Activation:
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', marginBottom: '8px' }}>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    style={{
                      padding: '7px 10px',
                      background: 'var(--bg-panel)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '0.76rem',
                      outline: 'none'
                    }}
                  >
                    <option value="RAAST / Bank Transfer">RAAST / Bank Transfer</option>
                    <option value="JazzCash">JazzCash</option>
                    <option value="EasyPaisa">EasyPaisa</option>
                    <option value="Debit / Credit Card">Debit / Credit Card</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Transaction ID / TID (e.g. 04829183721)"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    style={{
                      padding: '7px 10px',
                      background: 'var(--bg-panel)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.76rem',
                      outline: 'none'
                    }}
                  />

                  <input
                    type="text"
                    placeholder="Sender Name or Phone (Optional)"
                    value={senderAccount}
                    onChange={(e) => setSenderAccount(e.target.value)}
                    style={{
                      padding: '7px 10px',
                      background: 'var(--bg-panel)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '0.76rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <button
                    type="submit"
                    className="btn-accent"
                    disabled={submittingPayment}
                    style={{ padding: '7px 14px', fontSize: '0.76rem' }}
                  >
                    <Send size={13} />
                    <span>{submittingPayment ? 'Submitting TID...' : `Submit Payment for +${selectedPlanForPayment.credits} Credits`}</span>
                  </button>

                  {buildWhatsAppCheckoutUrl(selectedPlanForPayment) && (
                    <a
                      href={buildWhatsAppCheckoutUrl(selectedPlanForPayment)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-minimal"
                      style={{ textDecoration: 'none', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.35)', fontSize: '0.73rem', padding: '6px 11px' }}
                    >
                      <MessageCircle size={13} />
                      <span>Or Share Receipt on WhatsApp</span>
                    </a>
                  )}
                </div>
              </form>

              {paymentStatusMsg && (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '7px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.74rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: paymentStatusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    border: paymentStatusMsg.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                    color: paymentStatusMsg.type === 'success' ? 'var(--pass-green)' : 'var(--fail-red)'
                  }}
                >
                  {paymentStatusMsg.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  <span>{paymentStatusMsg.text}</span>
                </div>
              )}
            </div>
          )}

          {/* Candidate's Submitted Payment Requests (Live Status) */}
          {userRequests.length > 0 && (
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 12px',
                marginBottom: '0.9rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                <Clock size={13} color="var(--accent-blue)" />
                <span>Your Payment Verification History</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {userRequests.slice(0, 3).map((req) => (
                  <div
                    key={req.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.72rem',
                      padding: '5px 8px',
                      background: 'var(--bg-panel)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>{req.planName}</strong>{' '}
                      <span style={{ color: 'var(--text-muted)' }}>({req.paymentMethod} • TID: {req.transactionId})</span>
                    </div>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: '10px',
                        textTransform: 'uppercase',
                        background:
                          req.status === 'approved'
                            ? 'rgba(16, 185, 129, 0.14)'
                            : req.status === 'rejected'
                            ? 'rgba(239, 68, 68, 0.14)'
                            : 'rgba(245, 158, 11, 0.14)',
                        color:
                          req.status === 'approved'
                            ? 'var(--pass-green)'
                            : req.status === 'rejected'
                            ? 'var(--fail-red)'
                            : 'var(--warning-amber)'
                      }}
                    >
                      {req.status === 'approved' ? `Approved (+${req.credits} Credits)` : req.status === 'rejected' ? 'Declined' : 'Pending Verification'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Voucher / Activation Code Redemption Box */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <KeyRound size={15} color="var(--accent-blue)" />
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Have an Instant Activation Voucher Code?
              </span>
            </div>

            <form onSubmit={handleRedeem} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Enter Activation Code (e.g. CSS-ASPIRANT-XXXX-XXXX)"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                style={{
                  flex: 1,
                  minWidth: '220px',
                  padding: '7px 11px',
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.78rem',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                className="btn-accent"
                disabled={redeeming}
                style={{ padding: '7px 15px', fontSize: '0.76rem' }}
              >
                <Sparkles size={13} />
                <span>{redeeming ? 'Activating...' : 'Redeem Code'}</span>
              </button>
            </form>

            {statusMessage && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '7px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.74rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  border: statusMessage.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                  color: statusMessage.type === 'success' ? 'var(--pass-green)' : 'var(--fail-red)'
                }}
              >
                {statusMessage.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                <span>{statusMessage.text}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
