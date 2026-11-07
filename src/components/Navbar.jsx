import React, { useState, useRef, useEffect } from 'react';
import {
  Settings,
  Upload,
  RefreshCw,
  History,
  Trash2,
  ChevronDown,
  BookOpen,
  Zap,
  User,
  LogOut,
  Shield
} from 'lucide-react';

export const Navbar = ({
  onOpenSettings,
  onOpenUpload,
  onOpenAuth,
  onOpenSubscription,
  onOpenAdmin,
  onLogout,
  user,
  userProfile,
  isEvaluating,
  evaluationHistory = [],
  activeEvaluationId,
  onSelectEvaluation,
  onDeleteEvaluation
}) => {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setHistoryOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAdmin = userProfile?.role === 'admin';
  const credits = userProfile?.credits ?? 0;

  return (
    <nav className="navbar">
      {/* Brand Title & Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span className="brand-title">FPSC Evaluator</span>
        <span
          className="desktop-only-btn"
          style={{
            fontSize: '0.65rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            color: 'var(--accent-blue)',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            padding: '1px 7px',
            borderRadius: '10px'
          }}
        >
          CSS/PMS Cloud v3.0
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Admin Portal Button (Visible ONLY to Admin yaseenwazir953@gmail.com) */}
        {isAdmin && (
          <button
            className="btn-minimal"
            onClick={onOpenAdmin}
            style={{
              borderColor: 'rgba(56, 189, 248, 0.45)',
              color: 'var(--accent-blue)'
            }}
            title="Open SaaS Owner & Voucher Admin Portal"
          >
            <Shield size={13} color="var(--accent-blue)" />
            <span>Admin</span>
          </button>
        )}

        {/* Credits & Subscription Plans Pill */}
        <button
          className="btn-minimal"
          onClick={onOpenSubscription}
          style={{
            borderColor: user && credits === 0 && !isAdmin ? 'rgba(248, 113, 113, 0.45)' : 'rgba(56, 189, 248, 0.35)',
            background: 'rgba(56, 189, 248, 0.08)'
          }}
          title="View Subscription Plans or Redeem Activation Voucher"
        >
          <Zap size={13} color="var(--accent-blue)" />
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
            {user ? (isAdmin ? '∞ Pro Admin' : `${credits} ${credits === 1 ? 'Credit' : 'Credits'}`) : 'Plans & Pricing'}
          </span>
        </button>

        {/* Saved Evaluations History Dropdown */}
        {evaluationHistory.length > 0 && (
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              className="btn-minimal"
              onClick={() => setHistoryOpen(!historyOpen)}
              title="Switch between saved paper evaluations"
            >
              <History size={14} color="var(--accent-blue)" />
              <span className="desktop-only-btn">History ({evaluationHistory.length})</span>
              <ChevronDown size={12} color="var(--text-muted)" />
            </button>

            {historyOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  width: '340px',
                  maxHeight: '380px',
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.45)',
                  zIndex: 9999,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}
              >
                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{user ? 'Cloud & Local History' : 'Saved Evaluations'}</span>
                  <span>{evaluationHistory.length} Papers</span>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
                  {evaluationHistory.map((item) => {
                    const isCurrent = item.id === activeEvaluationId;
                    const hasScore = typeof item.overallScore === 'number';
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          onSelectEvaluation?.(item);
                          setHistoryOpen(false);
                        }}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)',
                          background: isCurrent ? 'var(--bg-card-hover)' : 'transparent',
                          border: isCurrent ? '1px solid var(--border-strong)' : '1px solid transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          marginBottom: '4px'
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                            <BookOpen size={11} color="var(--accent-blue)" />
                            <span style={{ fontSize: '0.68rem', color: 'var(--accent-blue)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.subject}
                            </span>
                            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>• {item.date}</span>
                          </div>
                          <div style={{ fontSize: '0.76rem', fontWeight: isCurrent ? 600 : 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.topic || item.examQuestion || 'Evaluated Script'}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          {hasScore && (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: item.passStatus !== false ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)',
                                color: item.passStatus !== false ? 'var(--pass-green)' : 'var(--fail-red)'
                              }}
                            >
                              {item.overallScore}/{item.maxScore || 20}
                            </span>
                          )}

                          {evaluationHistory.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteEvaluation?.(item.id);
                              }}
                              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                              title="Delete evaluation"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settings Button */}
        <button
          className="btn-minimal"
          onClick={onOpenSettings}
          title="Platform Settings (Themes, Personal BYOK API Key)"
        >
          <Settings size={14} color="var(--accent-gold)" />
          <span className="desktop-only-btn">Settings</span>
        </button>

        {/* User Auth Button / Profile Dropdown */}
        {user ? (
          <div ref={userMenuRef} style={{ position: 'relative' }}>
            <button
              className="btn-minimal"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              title={user.email}
            >
              <User size={13} color="var(--pass-green)" />
              <span className="desktop-only-btn" style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userProfile?.displayName || user.displayName || user.email?.split('@')[0]}
              </span>
              <ChevronDown size={11} color="var(--text-muted)" />
            </button>

            {userMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  width: '230px',
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 15px 35px rgba(0,0,0,0.45)',
                  zIndex: 9999,
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', marginBottom: '2px' }}>
                  <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {userProfile?.displayName || user.displayName || 'CSS Candidate'}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.email}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    onOpenSubscription?.();
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '0.75rem',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    textAlign: 'left'
                  }}
                >
                  <Zap size={13} color="var(--accent-blue)" />
                  <span>Top Up / Redeem Code</span>
                </button>

                {isAdmin && (
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onOpenAdmin?.();
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--accent-blue)',
                      fontSize: '0.75rem',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      textAlign: 'left'
                    }}
                  >
                    <Shield size={13} color="var(--accent-blue)" />
                    <span>SaaS Owner Admin</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    onLogout?.();
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--fail-red)',
                    fontSize: '0.75rem',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    textAlign: 'left'
                  }}
                >
                  <LogOut size={13} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className="btn-minimal" onClick={onOpenAuth}>
            <User size={13} color="var(--accent-blue)" />
            <span>Sign In</span>
          </button>
        )}

        {/* Primary Evaluation CTA */}
        <button className="btn-accent" onClick={onOpenUpload} disabled={isEvaluating}>
          {isEvaluating ? <RefreshCw size={13} className="spin" /> : <Upload size={13} />}
          <span>{isEvaluating ? 'Evaluating...' : 'Evaluate Paper'}</span>
        </button>
      </div>
    </nav>
  );
};
