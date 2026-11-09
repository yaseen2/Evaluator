import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Shield,
  X,
  Menu
} from 'lucide-react';

export const Navbar = ({
  activeView = 'landing',
  setActiveView,
  onOpenSettings,
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
  onDeleteEvaluation,
  onTrySample
}) => {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const dropdownRef = useRef(null);
  const userMenuRef = useRef(null);

  // Close menus on outside click
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

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileDrawerOpen]);

  const isAdmin = userProfile?.role === 'admin';
  const credits = userProfile?.credits ?? 0;

  const handleNavScroll = (elementId) => {
    setMobileDrawerOpen(false);
    if (activeView !== 'landing') {
      setActiveView?.('landing');
      setTimeout(() => {
        const el = document.getElementById(elementId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
    } else {
      const el = document.getElementById(elementId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleLogoClick = (e) => {
    e.preventDefault();
    if (activeView !== 'landing') {
      setActiveView?.('landing');
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const hero = document.querySelector('.hero-glow');
      if (hero) hero.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header className="navbar w-full bg-white/90 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
        
        {/* Brand Logo: JawabCheck + Stitch Document Sparkle Icon */}
        <a
          aria-label="JawabCheck Home"
          className="flex items-center gap-2.5 sm:gap-3 group cursor-pointer select-none no-underline"
          onClick={handleLogoClick}
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50/90 border border-blue-100 flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shadow-xs shrink-0">
            <svg className="w-5 h-5 text-[#1d6ef2]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 2H15L19 6V20C19 21.1046 18.1046 22 17 22H7C5.89543 22 5 21.1046 5 20V5C5 3.34315 6.34315 2 8 2Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
              <path d="M14 2V6.5C14 6.77614 14.2239 7 14.5 7H19" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8.5 11H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M8.5 14.5H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M10.5 18L13.5 20.5L19.5 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M18.5 3L19.2 4.2L20.5 4.5L19.5 5.5L19.8 6.8L18.5 6L17.2 6.8L17.5 5.5L16.5 4.5L17.8 4.2L18.5 3Z" fill="currentColor" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[21px] sm:text-[23px] font-bold tracking-tight text-slate-900 group-hover:text-[#1d6ef2] transition-colors">
              JawabCheck
            </span>
            <span className="hidden xl:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-[#1d6ef2] border border-blue-100">
              CSS &amp; PMS AI
            </span>
          </div>
        </a>

        {/* Center Navigation: Conditional based on Signed In vs Not Signed In */}
        {!user ? (
          /* NOT Signed In: Stitch Public Landing Navigation */
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-[14.5px] font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => handleNavScroll('how-it-works')}
              className="hover:text-[#1d6ef2] transition-colors bg-transparent border-0 p-0 cursor-pointer font-semibold text-slate-600"
            >
              How it works
            </button>
            <button
              type="button"
              onClick={() => handleNavScroll('comparison')}
              className="hover:text-[#1d6ef2] transition-colors bg-transparent border-0 p-0 cursor-pointer font-semibold text-slate-600"
            >
              Why JawabCheck
            </button>
            <button
              type="button"
              onClick={() => onTrySample?.()}
              className="hover:text-[#1d6ef2] transition-colors bg-transparent border-0 p-0 cursor-pointer font-semibold text-slate-600 inline-flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Sample Evaluation
            </button>
            <button
              type="button"
              onClick={() => setActiveView?.('pricing')}
              className={`hover:text-[#1d6ef2] transition-colors bg-transparent border-0 p-0 cursor-pointer font-semibold ${
                activeView === 'pricing' ? 'text-[#1d6ef2] font-bold border-b-2 border-[#1d6ef2] pb-0.5' : 'text-slate-600'
              }`}
            >
              Pricing
            </button>
            <button
              type="button"
              onClick={() => handleNavScroll('faq')}
              className="hover:text-[#1d6ef2] transition-colors bg-transparent border-0 p-0 cursor-pointer font-semibold text-slate-600"
            >
              FAQ
            </button>
          </nav>
        ) : (
          /* SIGNED IN: 3-Pill Workspace Switcher */
          <div className="hidden sm:flex items-center bg-slate-100/90 border border-slate-200/80 rounded-full p-1 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveView?.('landing')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${
                activeView === 'landing'
                  ? 'bg-white text-[#1d6ef2] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-transparent border-0'
              }`}
            >
              <span>🏠</span>
              <span>Home</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView?.('hub')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${
                activeView === 'hub'
                  ? 'bg-white text-[#1d6ef2] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-transparent border-0'
              }`}
            >
              <span>✍️</span>
              <span>Evaluate Answer</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView?.('report')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${
                activeView === 'report'
                  ? 'bg-white text-[#1d6ef2] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-transparent border-0'
              }`}
            >
              <span>📊</span>
              <span>Report</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView?.('pricing')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${
                activeView === 'pricing'
                  ? 'bg-white text-[#1d6ef2] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-transparent border-0'
              }`}
            >
              <span>💎</span>
              <span>Pricing</span>
            </button>
          </div>
        )}

        {/* Right Action Controls: Conditional based on Signed In vs Not Signed In */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          
          {/* Admin Queue Button (Visible only to Admin) */}
          {user && isAdmin && (
            <button
              type="button"
              onClick={onOpenAdmin}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors shadow-xs"
              title="Open Payment Verification & Candidate Admin Queue"
            >
              <Shield size={13} className="text-amber-600" />
              <span>Admin</span>
              {pendingAdminPayments > 0 && (
                <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-bold">
                  {pendingAdminPayments}
                </span>
              )}
            </button>
          )}

          {/* Credits / Subscription Pill */}
          {user ? (
            <button
              type="button"
              onClick={onOpenSubscription}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold border transition-all shadow-xs ${
                credits === 0 && !isAdmin
                  ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                  : 'border-blue-200/90 bg-blue-50/70 text-[#1d6ef2] hover:bg-blue-100/70'
              }`}
              title="View Credit Balance & Plans"
            >
              <Zap size={13} className="fill-current text-[#1d6ef2]" />
              <span className="font-mono font-bold">
                {isAdmin ? '∞ Pro Admin' : `${credits} ${credits === 1 ? 'Credit' : 'Credits'}`}
              </span>
            </button>
          ) : null}

          {/* History Dropdown (Signed In) */}
          {user && evaluationHistory.length > 0 && (
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setHistoryOpen(!historyOpen)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-xs"
                title="Switch between saved paper evaluations"
              >
                <History size={13} className="text-slate-500" />
                <span className="desktop-only-btn">History ({evaluationHistory.length})</span>
                <ChevronDown size={11} className="text-slate-400" />
              </button>

              {historyOpen && (
                <div className="absolute top-[calc(100%+8px)] right-0 w-80 max-h-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
                    <span>Saved Evaluations</span>
                    <span className="text-[#1d6ef2]">{evaluationHistory.length} Copies</span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100">
                    {evaluationHistory.map((item) => {
                      const isCurrent = item.id === activeEvaluationId;
                      const hasScore = typeof item.overallScore === 'number';
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            onSelectEvaluation?.(item);
                            setHistoryOpen(false);
                            if (activeView !== 'report') setActiveView?.('report');
                          }}
                          className={`p-2.5 rounded-xl cursor-pointer flex items-center justify-between gap-2.5 transition-colors ${
                            isCurrent ? 'bg-blue-50/80 border border-blue-200/70' : 'hover:bg-slate-50 border border-transparent'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-1">
                              <BookOpen size={11} className="text-[#1d6ef2]" />
                              <span className="text-[11px] font-bold text-[#1d6ef2] truncate">
                                {item.subject}
                              </span>
                              <span className="text-[10px] text-slate-400">• {item.date}</span>
                            </div>
                            <div className="text-[12px] font-medium text-slate-800 truncate">
                              {item.topic || item.examQuestion || 'Evaluated Answer'}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {hasScore ? (
                              <span
                                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
                                  item.passStatus !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                }`}
                              >
                                {item.overallScore}/{item.maxScore || 20}
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#1d6ef2]">
                                {item.essayMode === 'outline_only' ? 'Outline' : 'Essay'}
                              </span>
                            )}

                            {evaluationHistory.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteEvaluation?.(item.id);
                                }}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors bg-transparent border-0 cursor-pointer"
                                title="Delete evaluation"
                              >
                                <Trash2 size={12} />
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
            type="button"
            onClick={onOpenSettings}
            className="p-2 sm:p-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors bg-transparent border-0 cursor-pointer"
            title="API Key & System Settings"
            aria-label="Settings"
          >
            <Settings size={18} />
          </button>

          {/* User Auth or Profile Dropdown */}
          {user ? (
            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
                title={user.email}
              >
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#1d6ef2] to-blue-500 text-white font-bold text-xs flex items-center justify-center">
                  {(userProfile?.displayName || user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
                <span className="hidden md:inline-block text-xs font-semibold text-slate-800 max-w-[95px] truncate">
                  {userProfile?.displayName || user.displayName || user.email?.split('@')[0]}
                </span>
                <ChevronDown size={11} className="text-slate-400 hidden sm:inline" />
              </button>

              {userMenuOpen && (
                <div className="absolute top-[calc(100%+8px)] right-0 w-60 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-2 flex flex-col gap-1">
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {userProfile?.displayName || user.displayName || 'CSS Aspirant'}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {user.email}
                    </div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#1d6ef2]">
                      {isAdmin ? 'SaaS Administrator' : 'Candidate Account'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      onOpenSubscription?.();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-[#1d6ef2] transition-colors flex items-center gap-2 bg-transparent border-0 cursor-pointer"
                  >
                    <Zap size={13} className="text-[#1d6ef2]" />
                    <span>Top Up / Redeem Code</span>
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenAdmin?.();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-amber-800 hover:bg-amber-50 transition-colors flex items-center gap-2 bg-transparent border-0 cursor-pointer"
                    >
                      <Shield size={13} className="text-amber-600" />
                      <span>Admin Payment Queue</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      onLogout?.();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2 bg-transparent border-0 cursor-pointer"
                  >
                    <LogOut size={13} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Stitch Login Button */
            <button
              type="button"
              onClick={onOpenAuth}
              className="hidden sm:inline-flex items-center justify-center px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[13.5px] font-semibold text-[#1d6ef2] bg-white border border-[#1d6ef2]/30 hover:border-[#1d6ef2] hover:bg-blue-50/60 shadow-xs transition-all duration-200 cursor-pointer"
            >
              Login
            </button>
          )}

          {/* Primary CTA Button: Stitch vibrant blue button */}
          <button
            type="button"
            onClick={() => setActiveView?.('hub')}
            disabled={isEvaluating}
            className="relative group overflow-hidden inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-[#1d6ef2] hover:bg-[#1558d6] text-white font-semibold text-[13px] sm:text-[14px] transition-all duration-300 shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/35 active:scale-95 cursor-pointer"
          >
            {isEvaluating ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Upload size={14} />
            )}
            <span>
              {isEvaluating
                ? 'Evaluating...'
                : user
                ? '+ New Eval'
                : 'Try Free'}
            </span>
          </button>

          {/* Mobile Menu Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="md:hidden flex items-center justify-center p-2 rounded-xl text-slate-700 hover:text-[#1d6ef2] hover:bg-blue-50/60 transition-colors bg-transparent border-0 cursor-pointer"
            aria-label="Open mobile menu"
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      {/* Stitch Mobile Navigation Drawer (Portaled to body to escape navbar backdrop-blur containment) */}
      {mobileDrawerOpen && typeof document !== 'undefined' && createPortal(
        <>
          <div
            aria-hidden="true"
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300"
            style={{ zIndex: 9998 }}
            onClick={() => setMobileDrawerOpen(false)}
          />

          <div
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[320px] max-w-[88vw] shadow-2xl flex flex-col p-6 border-l border-slate-200 transition-transform duration-300 ease-in-out"
            style={{ backgroundColor: '#ffffff', zIndex: 9999 }}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1d6ef2]">
                  <svg className="w-4 h-4 text-[#1d6ef2]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 2H15L19 6V20C19 21.1046 18.1046 22 17 22H7C5.89543 22 5 21.1046 5 20V5C5 3.34315 6.34315 2 8 2Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
                    <path d="M14 2V6.5C14 6.77614 14.2239 7 14.5 7H19" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M10.5 18L13.5 20.5L19.5 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="font-bold text-slate-900 text-lg tracking-tight">JawabCheck</span>
              </div>

              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors bg-transparent border-0 cursor-pointer"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Signed-in User Card in Mobile Drawer */}
            {user && (
              <div className="py-3 px-3.5 my-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {userProfile?.displayName || user.displayName || user.email?.split('@')[0]}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {user.email}
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-blue-100/80 text-[#1d6ef2] font-mono text-[11px] font-bold shrink-0">
                  {isAdmin ? 'Admin' : `${credits} cr`}
                </div>
              </div>
            )}

            {/* Navigation Links inside Drawer */}
            <div className="flex flex-col gap-1.5 py-4 overflow-y-auto flex-1">
              {user ? (
                <>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1">
                    Workspace
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView?.('landing');
                      setMobileDrawerOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2.5 transition-colors ${
                      activeView === 'landing' ? 'bg-blue-50 text-[#1d6ef2]' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>🏠</span>
                    <span>Home (Landing Page)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView?.('hub');
                      setMobileDrawerOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2.5 transition-colors ${
                      activeView === 'hub' ? 'bg-blue-50 text-[#1d6ef2]' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>✍️</span>
                    <span>Evaluate Answer Studio</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView?.('report');
                      setMobileDrawerOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2.5 transition-colors ${
                      activeView === 'report' ? 'bg-blue-50 text-[#1d6ef2]' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>📊</span>
                    <span>Evaluation Report</span>
                  </button>

                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mt-4 mb-1">
                    Candidate Account
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      onOpenSubscription?.();
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-[#1d6ef2] flex items-center gap-2.5 transition-colors"
                  >
                    <Zap size={16} className="text-[#1d6ef2]" />
                    <span>Top Up Credits ({credits} Available)</span>
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileDrawerOpen(false);
                        onOpenAdmin?.();
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-amber-800 hover:bg-amber-50 flex items-center gap-2.5 transition-colors"
                    >
                      <Shield size={16} className="text-amber-600" />
                      <span>Admin Portal ({pendingAdminPayments} Pending)</span>
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleNavScroll('how-it-works')}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:text-[#1d6ef2] hover:bg-blue-50/60 transition-colors"
                  >
                    How it works
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavScroll('comparison')}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:text-[#1d6ef2] hover:bg-blue-50/60 transition-colors"
                  >
                    Why JawabCheck (Comparison)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      onTrySample?.();
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:text-[#1d6ef2] hover:bg-blue-50/60 transition-colors flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Sample Evaluation</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      setActiveView?.('pricing');
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:text-[#1d6ef2] hover:bg-blue-50/60 transition-colors"
                  >
                    Pricing &amp; Plans
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavScroll('faq')}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:text-[#1d6ef2] hover:bg-blue-50/60 transition-colors"
                  >
                    Frequently Asked Questions
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false);
                  onOpenSettings?.();
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
              >
                <Settings size={16} className="text-slate-500" />
                <span>API Key &amp; Settings</span>
              </button>
            </div>

            {/* Mobile Drawer Bottom Actions */}
            <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col gap-2.5">
              {user ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      setActiveView?.('hub');
                    }}
                    className="w-full py-3 rounded-xl bg-[#1d6ef2] hover:bg-[#1558d6] text-white text-center font-semibold text-sm shadow-md shadow-blue-500/25 transition-all duration-200 flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Upload size={15} />
                    <span>Start New Evaluation</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      onLogout?.();
                    }}
                    className="w-full py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-center font-semibold text-xs transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      onOpenAuth?.();
                    }}
                    className="w-full py-2.5 rounded-xl border border-[#1d6ef2]/30 text-[#1d6ef2] hover:bg-blue-50 font-semibold text-sm transition-colors text-center"
                  >
                    Login to Account
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      setActiveView?.('hub');
                    }}
                    className="w-full py-3 rounded-xl bg-[#1d6ef2] hover:bg-[#1558d6] text-white text-center font-semibold text-sm shadow-md shadow-blue-500/25 transition-all duration-200 active:scale-95"
                  >
                    Try Free / Evaluate Now
                  </button>
                </>
              )}
              <p className="text-[11px] text-center text-slate-400 font-medium mt-1">
                CSS &amp; PMS AI Answer Evaluation
              </p>
            </div>
          </div>
        </>,
        document.body
      )}
    </header>
  );
};
