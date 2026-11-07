import React, { useState } from 'react';
import { X, Check, Zap, KeyRound, Sparkles, AlertCircle, CheckCircle2, CreditCard } from 'lucide-react';
import { SUBSCRIPTION_PLANS, redeemSubscriptionVoucher } from '../services/firebase';

export const SubscriptionModal = ({ isOpen, onClose, user, userProfile, onProfileUpdated, onOpenAuth }) => {
  const [voucherCode, setVoucherCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: string }
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState(null);

  if (!isOpen) return null;

  const currentCredits = userProfile?.credits ?? 0;
  const currentTier = userProfile?.tier || 'free';

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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '94%',
          maxWidth: '780px',
          maxHeight: '90vh',
          padding: '1.35rem',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                ⚡ CSS / PMS Examiner Subscription Plans
              </h3>
              {user && (
                <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.14)', color: 'var(--accent-blue)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                  Balance: {userProfile?.role === 'admin' ? '∞ Admin' : `${currentCredits} Credits`}
                </span>
              )}
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              1 Credit = 20-Mark Subjective Question Evaluation • 2 Credits = 100-Mark Full English Essay Audit
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '1.25rem' }}>
            {SUBSCRIPTION_PLANS.map((plan) => {
              const isCurrentTier = user && currentTier === plan.id;
              return (
                <div
                  key={plan.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: plan.highlight ? '2px solid var(--accent-blue)' : '1px solid var(--border-strong)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    boxShadow: plan.highlight ? '0 8px 25px rgba(2, 132, 199, 0.18)' : 'none'
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
                      <span style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
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
                      onClick={() => setSelectedPlanForPayment(plan)}
                      style={{ width: '100%', justifyContent: 'center', padding: '7px' }}
                    >
                      <Zap size={13} />
                      <span>Subscribe ({plan.credits} Credits)</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Instant Payment Instructions Banner (when user clicks Subscribe) */}
          {selectedPlanForPayment && (
            <div
              style={{
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                marginBottom: '1rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CreditCard size={15} />
                  <span>Instant Activation for {selectedPlanForPayment.name} ({selectedPlanForPayment.pricePKR})</span>
                </span>
                <button
                  onClick={() => setSelectedPlanForPayment(null)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.72rem' }}
                >
                  Hide
                </button>
              </div>
              <p style={{ margin: '0 0 6px 0', fontSize: '0.75rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                To activate <strong>+{selectedPlanForPayment.credits} Evaluation Credits</strong> immediately via <strong>JazzCash, EasyPaisa, RAAST, or Bank Transfer</strong>:
              </p>
              <ol style={{ margin: '0 0 0 1.2rem', padding: 0, fontSize: '0.73rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <li>Complete your transfer of <strong>{selectedPlanForPayment.pricePKR}</strong> and receive your instant <strong>Activation Voucher Code</strong> (e.g., <code>CSS-{selectedPlanForPayment.id.toUpperCase()}-XXXX</code>).</li>
                <li>Paste your Activation Code in the box below to credit your account in 1 click!</li>
              </ol>
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
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Have a Subscription Activation / Voucher Code?
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
                  padding: '8px 12px',
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                className="btn-accent"
                disabled={redeeming}
                style={{ padding: '8px 16px', fontSize: '0.78rem' }}
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

