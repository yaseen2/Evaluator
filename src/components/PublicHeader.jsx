import React, { useState } from 'react';
import { FileCheck, Sparkles, ArrowRight, Eye, CreditCard, Home, Menu, X } from 'lucide-react';

export const PublicHeader = ({
  activeView = 'landing',
  setActiveView,
  onOpenAuth,
  onTrySample
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (view) => {
    setMobileMenuOpen(false);
    setActiveView?.(view);
  };

  return (
    <>
      <header className="w-full h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3.5 sm:px-8 flex items-center justify-between sticky top-0 z-40 shrink-0 shadow-2xs">
        {/* Brand Logo */}
        <div
          onClick={() => handleNav('landing')}
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none group min-w-0"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-[#1d6ef2] to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
            <FileCheck size={19} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-extrabold text-[16px] sm:text-[18px] tracking-tight text-slate-900 leading-tight truncate">
              JawabCheck
            </span>
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">
              CSS &amp; PMS AI
            </span>
          </div>
        </div>

        {/* Center Public Navigation (Desktop / Tablet) */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
          <button
            type="button"
            onClick={() => handleNav('landing')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeView === 'landing'
                ? 'bg-white text-[#1d6ef2] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Home size={14} />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onTrySample?.();
            }}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeView === 'report'
                ? 'bg-white text-[#1d6ef2] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye size={14} />
            <span>Live Sample Report</span>
          </button>

          <button
            type="button"
            onClick={() => handleNav('pricing')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeView === 'pricing'
                ? 'bg-white text-[#1d6ef2] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard size={14} />
            <span>Pricing &amp; Plans</span>
          </button>
        </nav>

        {/* Right Auth Actions (Desktop) */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenAuth?.('login')}
            className="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-[#1d6ef2] hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Sign In
          </button>

          <button
            type="button"
            onClick={() => onOpenAuth?.('register')}
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#1d6ef2] hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition-all cursor-pointer shrink-0"
          >
            <Sparkles size={14} />
            <span>Start Free Trial</span>
            <ArrowRight size={14} className="hidden lg:inline" />
          </button>
        </div>

        {/* Mobile Header Actions (< sm screens) */}
        <div className="flex sm:hidden items-center gap-1.5">
          <button
            type="button"
            onClick={() => onOpenAuth?.('register')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#1d6ef2] text-white shadow-xs"
          >
            Trial
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Slide-down Menu Drawer (< md screens) */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 bg-white/98 backdrop-blur-md border-b border-slate-200 shadow-xl z-50 p-4 space-y-3 animate-in slide-in-from-top-2 duration-150">
          <nav className="space-y-1">
            <button
              type="button"
              onClick={() => handleNav('landing')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeView === 'landing'
                  ? 'bg-blue-50 text-[#1d6ef2] border border-blue-100'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Home size={16} />
              <span>Platform Overview</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onTrySample?.();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeView === 'report'
                  ? 'bg-blue-50 text-[#1d6ef2] border border-blue-100'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Eye size={16} />
              <span>Live Sample Report</span>
            </button>

            <button
              type="button"
              onClick={() => handleNav('pricing')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeView === 'pricing'
                  ? 'bg-blue-50 text-[#1d6ef2] border border-blue-100'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <CreditCard size={16} />
                <span>Pricing &amp; Plans</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                PKR / Raast
              </span>
            </button>
          </nav>

          <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuth?.('login');
              }}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Sign In
            </button>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuth?.('register');
              }}
              className="w-full py-2.5 rounded-xl bg-[#1d6ef2] text-white text-xs font-bold shadow-xs hover:bg-blue-700 transition-colors"
            >
              Start Free Trial
            </button>
          </div>
        </div>
      )}
    </>
  );
};
