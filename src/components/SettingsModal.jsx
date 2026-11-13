import React, { useState } from 'react';
import {
  X,
  Check,
  Sun,
  Moon,
  Monitor,
  Zap,
  CreditCard
} from 'lucide-react';
import { PLATFORM_PLANS } from '../data/plans';

export const SettingsModal = ({
  isOpen,
  onClose,
  themeMode,
  setThemeMode,
  user,
  userProfile,
  onOpenPricing
}) => {
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const isAdmin = userProfile?.role === 'admin';
  const credits = userProfile?.credits ?? 0;
  const tierId = userProfile?.tier || 'free';
  const planObj = PLATFORM_PLANS.find((p) => p.id === tierId) || PLATFORM_PLANS[0];
  const displayName =
    userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Guest Visitor';

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose?.();
    }, 900);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 antialiased"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200/90 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Account &amp; Preferences</h3>
            <p className="text-xs text-slate-500">
              Manage your candidate profile, subscription status, and workspace appearance
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Section 1: Candidate Profile & Plan Status */}
        {user ? (
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#1d6ef2] text-white font-bold text-sm flex items-center justify-center shrink-0">
                  {displayName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{displayName}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-[#1d6ef2] border border-blue-200/60 shrink-0">
                {isAdmin ? 'Admin' : planObj.title}
              </span>
            </div>

            <div className="pt-3 border-t border-slate-200/70 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Zap size={15} className="text-[#1d6ef2] fill-current" />
                <span>
                  Balance:{' '}
                  <strong className="font-mono text-slate-900">
                    {isAdmin ? '∞ Unlimited' : `${credits} Credits`}
                  </strong>
                </span>
              </div>
              {!isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    onClose?.();
                    onOpenPricing?.();
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1d6ef2] hover:underline cursor-pointer"
                >
                  <CreditCard size={13} />
                  <span>Upgrade / Top Up</span>
                </button>
              )}
            </div>
          </div>
        ) : null}

        {/* Section 2: Interface Theme Mode */}
        <div className="space-y-2.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Workspace Theme
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { id: 'light', label: 'Day Mode', icon: Sun },
              { id: 'dark', label: 'Night Mode', icon: Moon },
              { id: 'auto', label: 'System Auto', icon: Monitor }
            ].map((item) => {
              const Icon = item.icon;
              const active = themeMode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setThemeMode(item.id)}
                  className={`p-3.5 rounded-2xl border text-center flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    active
                      ? 'border-[#1d6ef2] bg-blue-50/70 text-[#1d6ef2] font-bold shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-xs">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#1d6ef2] hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            {isSaved ? (
              <>
                <Check size={14} />
                <span>Saved!</span>
              </>
            ) : (
              <span>Save Preferences</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
