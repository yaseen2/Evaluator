import React from 'react';
import { FileCheck, Sparkles, ArrowRight, Eye, CreditCard, Home } from 'lucide-react';

export const PublicHeader = ({
  activeView = 'landing',
  setActiveView,
  onOpenAuth,
  onTrySample
}) => {
  return (
    <header className="w-full h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40 shrink-0 shadow-2xs">
      {/* Brand Logo */}
      <div
        onClick={() => setActiveView?.('landing')}
        className="flex items-center gap-3 cursor-pointer select-none group"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-[#1d6ef2] to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
          <FileCheck size={20} />
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-[18px] tracking-tight text-slate-900 leading-tight">
            JawabCheck
          </span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            CSS &amp; PMS AI Examiner
          </span>
        </div>
      </div>

      {/* Center Public Navigation */}
      <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
        <button
          type="button"
          onClick={() => setActiveView?.('landing')}
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
          onClick={() => onTrySample?.()}
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
          onClick={() => setActiveView?.('pricing')}
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

      {/* Right Auth Actions */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => onOpenAuth?.('login')}
          className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-[#1d6ef2] hover:bg-slate-100 transition-colors cursor-pointer"
        >
          Sign In
        </button>

        <button
          type="button"
          onClick={() => onOpenAuth?.('register')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#1d6ef2] hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
        >
          <Sparkles size={14} />
          <span>Start Free Trial</span>
          <ArrowRight size={14} className="hidden sm:inline" />
        </button>
      </div>
    </header>
  );
};

