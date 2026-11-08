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
  activeView = 'report',
  setActiveView,
  onOpenSettings,
  onOpenUpload,
  onOpenAuth,
  onOpenSubscription,
  onOpenAdmin,
  onLogout,
  user,
  userProfile,
  pendingAdminPayments = 0,
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
      {/* Left: Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          onClick={() => setActiveView && setActiveView('hub')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          title="Go to Answer Evaluation Hub"
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #257af3 0%, #1557bf 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.85rem',
              boxShadow: '0 2px 8px rgba(37, 122, 243, 0.3)'
            }}
          >
            K
          </div>
          <span className="brand-title" style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            FPSC Kalam
          </span>
        </div>
        <span
          className="desktop-only-btn"
          style={{
            fontSize: '0.62rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: 'var(--accent-blue)',
            background: 'var(--accent-blue-soft)',
            border: '1px solid rgba(37, 122, 243, 0.25)',
            padding: '2px 8px',
            borderRadius: '9999px'
          }}
        >
          AI Mains Evaluation
        </span>
      </div>

      {/* Center: SuperKalam 2-Pill Workspace Switcher */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-app)',
          border: '1px solid var(--border)',
          borderRadius: '9999px',
          padding: '3px'
        }}
      >
        <button
          onClick={() => setActiveView && setActiveView('hub')}
          style={{
            border: 'none',
            background: activeView === 'hub' ? '#ffffff' : 'transparent',
            color: activeView === 'hub' ? 'var(--accent-blue)' : 'var(--text-secondary)',
            fontWeight: activeView === 'hub' ? 700 : 500,
            fontSize: '0.78rem',
            padding: '5px 14px',
            borderRadius: '9999px',
            boxShadow: activeView === 'hub' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
        >
          <span>✍️</span>
          <span>Evaluate Answer</span>
        </button>

        <button
          onClick={() => setActiveView && setActiveView('report')}
          style={{
            border: 'none',
            background: activeView === 'report' ? '#ffffff' : 'transparent',
            color: activeView === 'report' ? 'var(--accent-blue)' : 'var(--text-secondary)',
            fontWeight: activeView === 'report' ? 700 : 500,
            fontSize: '0.78rem',
            padding: '5px 14px',
            borderRadius: '9999px',
            boxShadow: activeView === 'report' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
        >
          <span>📊</span>
          <span>Evaluation Report</span>
        </button>
      </div>

      {/* Right Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Admin Portal Button (Visible ONLY to Admin yaseenwazir953@gmail.com) */}
        {isAdmin && (
          <button
            className="btn-minimal"
            onClick={onOpenAdmin}
            style={{
              borderColor: pendingAdminPayments > 0 ? 'rgba(245, 158, 11, 0.6)' : 'rgba(56, 189, 248, 0.45)',
              color: 'var(--accent-blue)'
            }}
            title="Open SaaS Owner & Payment Queue Admin Portal"
          >
            <Shield size={13} color="var(--accent-blue)" />
            <span>Admin</span>
            {pendingAdminPayments > 0 && (
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  padding: '0 5px',
                  borderRadius: '8px',
                  background: 'var(--warning-amber)',
                  color: '#fff'
                }}
              >
                {pendingAdminPayments}
              </span>
            )}
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
                          {hasScore ? (
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
                          ) : (
                            <span
                              style={{
                                fontSize: '0.64rem',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 600,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: 'rgba(2, 132, 199, 0.12)',
                                color: 'var(--accent-blue)'
                              }}
                            >
                              {item.essayMode === 'outline_only' ? 'Outline' : 'Essay'}
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
        <button
          className="btn-superkalam-primary"
          onClick={() => {
            if (setActiveView) setActiveView('hub');
            else onOpenUpload?.();
          }}
          disabled={isEvaluating}
          style={{ padding: '6px 14px', fontSize: '0.78rem' }}
        >
          {isEvaluating ? <RefreshCw size={13} className="spin" /> : <Upload size={13} />}
          <span>{isEvaluating ? 'Evaluating...' : '+ New Evaluation'}</span>
        </button>
      </div>
    </nav>
  );
};
