import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  FileCheck,
  BarChart2,
  History,
  CreditCard,
  Shield,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  User,
  LogOut,
  X,
  Menu,
  BookOpen,
  Trash2,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

export const Sidebar = ({
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
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('jawabcheck_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [historyOpen, setHistoryOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const historyFlyoutRef = useRef(null);
  const userMenuRef = useRef(null);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('jawabcheck_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Close flyouts on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (historyFlyoutRef.current && !historyFlyoutRef.current.contains(e.target)) {
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
  const displayName = userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Candidate';
  const email = user?.email || '';

  // Get Initials for avatar
  const getInitials = (name) => {
    if (!name) return 'JC';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleNavClick = (view) => {
    setMobileDrawerOpen(false);
    setHistoryOpen(false);
    setUserMenuOpen(false);
    setActiveView?.(view);
  };

  return (
    <>
      {/* ============================================================ */}
      {/* 1. MOBILE TOP BAR (Visible only on < md screens)            */}
      {/* ============================================================ */}
      <header className="md:hidden w-full h-14 bg-white border-b border-slate-200/80 px-4 flex items-center justify-between sticky top-0 z-40 shrink-0 shadow-2xs">
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Open Navigation Menu"
        >
          <Menu size={22} />
        </button>

        {/* Brand */}
        <div
          onClick={() => handleNavClick('landing')}
          className="flex items-center gap-2 cursor-pointer select-none"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-[#1d6ef2] to-blue-500 flex items-center justify-center text-white shadow-xs">
            <FileCheck size={18} />
          </div>
          <span className="font-extrabold text-[17px] tracking-tight text-slate-900">
            JawabCheck
          </span>
        </div>

        {/* Mobile Right: Credits or Auth */}
        <div className="flex items-center gap-2">
          {user ? (
            <button
              type="button"
              onClick={() => handleNavClick('pricing')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#1d6ef2] border border-blue-200/80"
            >
              <Zap size={12} className="fill-current text-[#1d6ef2]" />
              <span className="font-mono font-bold">{credits}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#1d6ef2] text-white hover:bg-blue-600 transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* ============================================================ */}
      {/* 2. MOBILE OVERLAY DRAWER                                     */}
      {/* ============================================================ */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-left duration-200">
            {/* Top Brand & Close */}
            <div>
              <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-[#1d6ef2] to-blue-500 flex items-center justify-center text-white shadow-xs">
                    <FileCheck size={20} />
                  </div>
                  <div>
                    <span className="font-bold text-lg text-slate-900 block leading-tight">JawabCheck</span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">CSS & PMS AI</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Mobile Navigation List */}
              <nav className="p-3 space-y-1">
                <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 mt-2">
                  Platform
                </span>
                <button
                  type="button"
                  onClick={() => handleNavClick('landing')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeView === 'landing'
                      ? 'bg-blue-50 text-[#1d6ef2] border border-blue-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <LayoutDashboard size={18} />
                  <span>Home</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('hub')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeView === 'hub'
                      ? 'bg-blue-50 text-[#1d6ef2] border border-blue-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileCheck size={18} />
                    <span>Evaluate Paper</span>
                  </div>
                  {activeView === 'hub' && (
                    <span className="text-[10px] font-bold uppercase bg-[#1d6ef2] text-white px-1.5 py-0.5 rounded">Active</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('report')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeView === 'report'
                      ? 'bg-blue-50 text-[#1d6ef2] border border-blue-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <BarChart2 size={18} />
                    <span>Detailed Report</span>
                  </div>
                  {activeView === 'report' && (
                    <span className="text-[10px] font-bold uppercase bg-[#1d6ef2] text-white px-1.5 py-0.5 rounded">Active</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    setHistoryOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <History size={18} />
                    <span>History</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                    {evaluationHistory.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('pricing')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeView === 'pricing'
                      ? 'bg-blue-50 text-[#1d6ef2] border border-blue-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CreditCard size={18} />
                    <span>Pricing & Plans</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Pro</span>
                </button>

                <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 pt-4">
                  System
                </span>

                {user && isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      onOpenAdmin?.();
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-amber-50/80 text-amber-900 border border-amber-200/60 hover:bg-amber-100 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Shield size={18} className="text-amber-600" />
                      <span>Admin Review</span>
                    </div>
                    {pendingAdminPayments > 0 && (
                      <span className="text-[10px] font-bold bg-amber-600 text-white px-2 py-0.5 rounded-full">
                        {pendingAdminPayments}
                      </span>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    onOpenSettings?.();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
                >
                  <Settings size={18} />
                  <span>Settings</span>
                </button>
              </nav>
            </div>

            {/* Mobile Bottom: Credits & User */}
            <div className="p-4 border-t border-slate-100 space-y-3">
              {user ? (
                <>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Zap size={18} className="text-[#1d6ef2] fill-current" />
                      <div>
                        <p className="text-xs font-bold text-slate-800">{credits} Credits</p>
                        <p className="text-[10px] text-slate-500">{userProfile?.plan || 'Free Trial'}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleNavClick('pricing')}
                      className="text-xs font-bold text-[#1d6ef2] hover:underline"
                    >
                      Top Up
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 text-white font-bold text-xs flex items-center justify-center">
                        {getInitials(displayName)}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-slate-900 truncate max-w-[130px]">{displayName}</p>
                        <p className="text-[10px] text-slate-400 truncate max-w-[130px]">{email}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileDrawerOpen(false);
                        onLogout?.();
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Sign Out"
                    >
                      <LogOut size={16} />
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    onOpenAuth?.();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-bold bg-[#1d6ef2] text-white hover:bg-blue-600 transition-colors shadow-xs"
                >
                  Sign In / Register
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. DESKTOP / TABLET COLLAPSIBLE LEFT SIDEBAR                 */}
      {/* ============================================================ */}
      <aside
        className={`hidden md:flex flex-col justify-between shrink-0 bg-white border-r border-slate-200/80 transition-all duration-300 ease-in-out z-30 sticky top-0 h-screen select-none shadow-sm ${
          isCollapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {/* Top Section: Brand & Toggle */}
        <div className="flex flex-col">
          <div className="h-18 flex items-center justify-between px-3.5 border-b border-slate-100">
            {/* Logo + Title */}
            <a
              onClick={(e) => {
                e.preventDefault();
                handleNavClick('landing');
              }}
              href="#"
              className="flex items-center gap-3 overflow-hidden focus:outline-none cursor-pointer group"
              title="JawabCheck Platform"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-[#1d6ef2] to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0 group-hover:scale-105 transition-transform">
                <FileCheck size={22} />
              </div>
              {!isCollapsed && (
                <div className="flex flex-col overflow-hidden whitespace-nowrap">
                  <span className="font-extrabold text-lg tracking-tight text-slate-900 leading-tight">
                    JawabCheck
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    CSS & PMS AI
                  </span>
                </div>
              )}
            </a>

            {/* Collapse / Expand Toggle Button */}
            <button
              type="button"
              onClick={toggleCollapse}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none shrink-0"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>

          {/* Primary Navigation Links */}
          <nav className="p-3 space-y-1.5 flex flex-col">
            {!isCollapsed && (
              <span className="px-3 mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Platform
              </span>
            )}

            {/* Home / Landing */}
            <button
              type="button"
              onClick={() => handleNavClick('landing')}
              className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl font-medium text-sm transition-all group ${
                activeView === 'landing'
                  ? 'bg-blue-50/90 text-[#1d6ef2] font-semibold border border-blue-200/70 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
              title={isCollapsed ? 'Home' : undefined}
            >
              <LayoutDashboard size={20} className={activeView === 'landing' ? 'text-[#1d6ef2]' : 'text-slate-400 group-hover:text-slate-700'} />
              {!isCollapsed && <span>Home</span>}
            </button>

            {/* Evaluate Paper / Practice Hub */}
            <button
              type="button"
              onClick={() => handleNavClick('hub')}
              className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl font-medium text-sm transition-all group ${
                activeView === 'hub'
                  ? 'bg-blue-50/90 text-[#1d6ef2] font-semibold border border-blue-200/70 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              } ${isCollapsed ? 'justify-center px-0' : 'justify-between'}`}
              title={isCollapsed ? 'Evaluate Paper' : undefined}
            >
              <div className="flex items-center gap-3.5">
                <FileCheck size={20} className={activeView === 'hub' ? 'text-[#1d6ef2]' : 'text-slate-400 group-hover:text-slate-700'} />
                {!isCollapsed && <span>Evaluate Paper</span>}
              </div>
              {!isCollapsed && activeView === 'hub' && (
                <span className="text-[10px] font-bold uppercase bg-[#1d6ef2] text-white px-1.5 py-0.5 rounded shadow-2xs">
                  Active
                </span>
              )}
            </button>

            {/* Detailed Report Studio */}
            <button
              type="button"
              onClick={() => handleNavClick('report')}
              className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl font-medium text-sm transition-all group ${
                activeView === 'report'
                  ? 'bg-blue-50/90 text-[#1d6ef2] font-semibold border border-blue-200/70 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              } ${isCollapsed ? 'justify-center px-0' : 'justify-between'}`}
              title={isCollapsed ? 'Detailed Report' : undefined}
            >
              <div className="flex items-center gap-3.5">
                <BarChart2 size={20} className={activeView === 'report' ? 'text-[#1d6ef2]' : 'text-slate-400 group-hover:text-slate-700'} />
                {!isCollapsed && <span>Detailed Report</span>}
              </div>
              {!isCollapsed && activeView === 'report' && (
                <span className="text-[10px] font-bold uppercase bg-[#1d6ef2] text-white px-1.5 py-0.5 rounded shadow-2xs">
                  Active
                </span>
              )}
            </button>

            {/* Evaluation History (Trigger Popover) */}
            <div className="relative" ref={historyFlyoutRef}>
              <button
                type="button"
                onClick={() => setHistoryOpen(!historyOpen)}
                className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl font-medium text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all group ${
                  historyOpen ? 'bg-slate-100 text-slate-900' : ''
                } ${isCollapsed ? 'justify-center px-0' : 'justify-between'}`}
                title={isCollapsed ? `History (${evaluationHistory.length})` : undefined}
              >
                <div className="flex items-center gap-3.5">
                  <History size={20} className="text-slate-400 group-hover:text-slate-700" />
                  {!isCollapsed && <span>History</span>}
                </div>
                {!isCollapsed && (
                  <span className="text-xs bg-slate-100 group-hover:bg-slate-200 text-slate-600 font-semibold px-2 py-0.5 rounded-full transition-colors">
                    {evaluationHistory.length}
                  </span>
                )}
              </button>

              {/* History Flyout Drawer (Sits directly beside sidebar) */}
              {historyOpen && (
                <div
                  className="absolute left-full top-0 ml-2.5 w-84 max-h-[85vh] bg-white border border-slate-200/90 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                  style={{ minWidth: '320px' }}
                >
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Saved Evaluations</span>
                      <span className="text-[11px] text-slate-400">{evaluationHistory.length} Graded Copies</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHistoryOpen(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100 max-h-[60vh]">
                    {evaluationHistory.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No saved evaluations yet. Submit a paper to see your history here!
                      </div>
                    ) : (
                      evaluationHistory.map((item) => {
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
                              isCurrent
                                ? 'bg-blue-50/80 border border-blue-200/70'
                                : 'hover:bg-slate-50 border border-transparent'
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
                      })
                    )}
                  </div>

                  <div className="p-2 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryOpen(false);
                        onTrySample?.();
                      }}
                      className="text-[#1d6ef2] font-semibold hover:underline px-2 py-1"
                    >
                      Load Sample Essay
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryOpen(false);
                        handleNavClick('hub');
                      }}
                      className="text-slate-600 hover:text-slate-900 font-medium px-2 py-1"
                    >
                      + New Evaluation
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Pricing & Plans */}
            <button
              type="button"
              onClick={() => handleNavClick('pricing')}
              className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl font-medium text-sm transition-all group ${
                activeView === 'pricing'
                  ? 'bg-blue-50/90 text-[#1d6ef2] font-semibold border border-blue-200/70 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              } ${isCollapsed ? 'justify-center px-0' : 'justify-between'}`}
              title={isCollapsed ? 'Pricing & Plans' : undefined}
            >
              <div className="flex items-center gap-3.5">
                <CreditCard size={20} className={activeView === 'pricing' ? 'text-[#1d6ef2]' : 'text-slate-400 group-hover:text-slate-700'} />
                {!isCollapsed && <span>Pricing & Plans</span>}
              </div>
              {!isCollapsed && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  Pro
                </span>
              )}
            </button>

            {/* System Section Divider */}
            <div className="pt-3 mt-1 border-t border-slate-100">
              {!isCollapsed && (
                <span className="px-3 mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  System
                </span>
              )}

              {/* Admin Review (Visible if Admin or has payments) */}
              {user && isAdmin && (
                <button
                  type="button"
                  onClick={onOpenAdmin}
                  className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl font-semibold text-sm bg-amber-50/70 text-amber-900 border border-amber-200/60 hover:bg-amber-100 transition-all ${
                    isCollapsed ? 'justify-center px-0' : 'justify-between'
                  }`}
                  title={isCollapsed ? `Admin Review (${pendingAdminPayments} Pending)` : undefined}
                >
                  <div className="flex items-center gap-3.5">
                    <Shield size={20} className="text-amber-600 shrink-0" />
                    {!isCollapsed && <span>Admin Review</span>}
                  </div>
                  {!isCollapsed && pendingAdminPayments > 0 && (
                    <span className="text-[10px] font-bold bg-amber-600 text-white px-1.5 py-0.5 rounded-full">
                      {pendingAdminPayments}
                    </span>
                  )}
                </button>
              )}

              {/* Settings */}
              <button
                type="button"
                onClick={onOpenSettings}
                className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl font-medium text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all group mt-1 ${
                  isCollapsed ? 'justify-center px-0' : ''
                }`}
                title={isCollapsed ? 'Settings' : undefined}
              >
                <Settings size={20} className="text-slate-400 group-hover:text-slate-700 shrink-0" />
                {!isCollapsed && <span>Settings</span>}
              </button>
            </div>
          </nav>
        </div>

        {/* Bottom Section: Credits & User Profile */}
        <div className="p-3 border-t border-slate-100 space-y-2.5">
          {/* Credits Widget */}
          {user ? (
            isCollapsed ? (
              <button
                type="button"
                onClick={() => handleNavClick('pricing')}
                className="w-full py-2.5 rounded-xl bg-blue-50/80 border border-blue-200/70 flex flex-col items-center justify-center text-[#1d6ef2] hover:bg-blue-100/70 transition-colors"
                title={`${credits} Credits - Click to upgrade`}
              >
                <Zap size={16} className="fill-current text-[#1d6ef2] mb-0.5" />
                <span className="text-[11px] font-bold font-mono">{credits}</span>
              </button>
            ) : (
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                    <Zap size={16} className="text-[#1d6ef2] fill-current" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {isAdmin ? '∞ Pro Admin' : `${credits} ${credits === 1 ? 'Credit' : 'Credits'}`}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {userProfile?.plan || 'Free Trial'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleNavClick('pricing')}
                  className="text-[11px] font-bold text-[#1d6ef2] hover:underline shrink-0"
                >
                  Top Up
                </button>
              </div>
            )
          ) : null}

          {/* User Profile Card */}
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={`w-full flex items-center rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all cursor-pointer ${
                  isCollapsed ? 'justify-center p-1.5' : 'justify-between p-2'
                }`}
                title={isCollapsed ? displayName : undefined}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 via-[#1d6ef2] to-blue-400 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                    {getInitials(displayName)}
                  </div>
                  {!isCollapsed && (
                    <div className="overflow-hidden text-left leading-tight">
                      <p className="text-xs font-bold text-slate-900 truncate max-w-[130px]">
                        {displayName}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate max-w-[130px]">
                        {email}
                      </p>
                    </div>
                  )}
                </div>
                {!isCollapsed && (
                  <ChevronDown size={14} className="text-slate-400 shrink-0" />
                )}
              </button>

              {/* User Menu Popover */}
              {userMenuOpen && (
                <div className="absolute left-full bottom-0 ml-2.5 w-56 bg-white border border-slate-200/90 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
                    <p className="text-[11px] text-slate-400 truncate">{email}</p>
                  </div>
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleNavClick('pricing');
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 text-left"
                    >
                      <CreditCard size={15} className="text-slate-400" />
                      <span>Subscription & Credits</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenSettings?.();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 text-left"
                    >
                      <Settings size={15} className="text-slate-400" />
                      <span>Account Settings</span>
                    </button>
                  </div>
                  <div className="border-t border-slate-100 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        onLogout?.();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 text-left"
                    >
                      <LogOut size={15} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className={`w-full py-2.5 rounded-xl font-bold text-xs bg-[#1d6ef2] text-white hover:bg-blue-600 transition-colors shadow-2xs flex items-center justify-center gap-2 ${
                isCollapsed ? 'px-0' : 'px-3'
              }`}
              title="Sign In / Register"
            >
              <User size={16} />
              {!isCollapsed && <span>Sign In</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

