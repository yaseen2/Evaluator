import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  Zap,
  Award,
  TrendingUp,
  BookOpen,
  Clock,
  ChevronRight,
  Plus,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Shield,
  Calendar
} from 'lucide-react';
import { fetchUserPaymentRequests } from '../services/firebase';
import { PLATFORM_PLANS } from '../data/plans';

const QUICK_SUBJECTS = [
  { name: 'English Essay', group: 'Compulsory • 100 Marks', tag: 'High Weightage' },
  { name: 'English (Precis and Composition)', group: 'Compulsory • 100 Marks', tag: 'Expression' },
  { name: 'Current Affairs', group: 'Compulsory • 100 Marks', tag: 'Grounding' },
  { name: 'Pakistan Affairs', group: 'Compulsory • 100 Marks', tag: 'Core' },
  { name: 'Islamic Studies', group: 'Compulsory • 100 Marks', tag: 'Compulsory' },
  { name: 'International Relations', group: 'Optional • 200 Marks', tag: 'Group-I' }
];

export const CandidateDashboard = ({
  user,
  userProfile,
  evaluationHistory = [],
  onSelectEvaluation,
  onDeleteEvaluation,
  onStartNewEvaluation,
  onSelectSubjectAndStart,
  onTrySample,
  onOpenPricing,
  onOpenAdmin
}) => {
  const [paymentRequests, setPaymentRequests] = useState([]);

  useEffect(() => {
    if (user?.uid) {
      fetchUserPaymentRequests(user.uid).then(setPaymentRequests);
    }
  }, [user?.uid]);

  const isAdmin = userProfile?.role === 'admin';
  const credits = userProfile?.credits ?? 0;
  const tierId = userProfile?.tier || 'free';
  const planObj = PLATFORM_PLANS.find((p) => p.id === tierId) || PLATFORM_PLANS[0];
  const displayName =
    userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'CSS Aspirant';

  // Calculate Candidate Analytics from personal evaluations
  const totalPapers = evaluationHistory.length;
  const scoredPapers = evaluationHistory.filter((item) => typeof item.overallScore === 'number');

  const avgPercentage =
    scoredPapers.length > 0
      ? Math.round(
          scoredPapers.reduce((acc, item) => {
            const max = item.maxScore || (item.subject?.toLowerCase().includes('essay') ? 100 : 20);
            return acc + (item.overallScore / max) * 100;
          }, 0) / scoredPapers.length
        )
      : null;

  const uniqueSubjects = new Set(evaluationHistory.map((e) => e.subject).filter(Boolean)).size;
  const pendingRequests = paymentRequests.filter((r) => r.status === 'pending');

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/60 text-slate-900 min-h-full h-full py-8 px-4 sm:px-6 lg:px-8 antialiased">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Welcome & Candidate Status Banner */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-64 h-64 bg-gradient-to-br from-blue-50 via-indigo-50/40 to-transparent rounded-full pointer-events-none" />

          <div className="space-y-2 relative z-10">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#1d6ef2] border border-blue-200/60">
                <Award size={13} />
                <span>{isAdmin ? 'Platform Administrator' : planObj.title}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <Zap size={12} className="fill-current" />
                <span>{isAdmin ? '∞ Unlimited Credits' : `${credits} Credits Available`}</span>
              </span>
            </div>

            <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome back, {displayName}
            </h1>
            <p className="text-sm text-slate-500 max-w-xl leading-relaxed">
              Track your FPSC rubric readiness, review examiner feedback on past scripts, or start a new 60-second multi-agent paper evaluation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 relative z-10 shrink-0">
            {isAdmin && (
              <button
                type="button"
                onClick={onOpenAdmin}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs sm:text-sm transition-all cursor-pointer"
              >
                <Shield size={16} className="text-amber-600" />
                <span>Open Admin Console</span>
              </button>
            )}

            {!isAdmin && (
              <button
                type="button"
                onClick={onOpenPricing}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 hover:text-[#1d6ef2] border border-slate-200/90 font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-2xs"
              >
                <Zap size={15} className="text-[#1d6ef2]" />
                <span>Upgrade / Top Up</span>
              </button>
            )}

            <button
              type="button"
              onClick={onStartNewEvaluation}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#1d6ef2] hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Plus size={17} />
              <span>Evaluate New Paper</span>
            </button>
          </div>
        </div>

        {/* Live Payment Verification Status Alert (if candidate has pending request) */}
        {pendingRequests.length > 0 && (
          <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-start gap-3">
              <Clock size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-amber-950">
                  Payment Verification in Progress ({pendingRequests[0].planName})
                </h3>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  Your transaction (TID: <span className="font-mono font-bold">{pendingRequests[0].transactionId}</span> • {pendingRequests[0].pricePKR}) is in the verification queue. Credits (+{pendingRequests[0].credits}) will appear automatically once approved.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenPricing}
              className="text-xs font-bold text-amber-900 hover:underline shrink-0 self-start sm:self-center"
            >
              View Payment Status →
            </button>
          </div>
        )}

        {/* 4-Card Candidate Analytics KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Papers Evaluated</span>
              <FileCheck size={18} className="text-[#1d6ef2]" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-slate-900">
              {totalPapers}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {totalPapers === 0 ? 'Submit your first script today' : 'Synced securely in cloud'}
            </p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Average Score</span>
              <TrendingUp size={18} className="text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-slate-900">
              {avgPercentage !== null ? `${avgPercentage}%` : '—'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {avgPercentage !== null
                ? avgPercentage >= 40
                  ? 'Above FPSC 40% passing bar'
                  : 'Below 40% FPSC threshold — keep practicing'
                : 'Complete an evaluation to unlock'}
            </p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Subjects Practiced</span>
              <BookOpen size={18} className="text-indigo-600" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-slate-900">
              {uniqueSubjects} <span className="text-xs font-normal text-slate-400">/ 12 CSS Papers</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Compulsory &amp; Optional coverage
            </p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Examiner Credits</span>
              <Zap size={18} className="text-amber-500 fill-current" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-slate-900">
              {isAdmin ? '∞' : credits}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isAdmin ? 'Master Admin Account' : `${userProfile?.totalCreditsUsed || 0} credits used total`}
            </p>
          </div>
        </div>

        {/* Quick-Start FPSC Subject Cards */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Quick-Launch Subject Evaluation</h2>
              <p className="text-xs text-slate-500">Select a subject to jump straight into camera scan or text evaluation</p>
            </div>
            <button
              type="button"
              onClick={onStartNewEvaluation}
              className="text-xs font-bold text-[#1d6ef2] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>All 50+ FPSC Subjects</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {QUICK_SUBJECTS.map((subj) => (
              <button
                key={subj.name}
                type="button"
                onClick={() => onSelectSubjectAndStart?.(subj.name)}
                className="bg-white hover:bg-blue-50/40 border border-slate-200/90 hover:border-[#1d6ef2] rounded-2xl p-4 text-left transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
              >
                <div className="min-w-0 pr-3">
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-[#1d6ef2] bg-blue-50 px-2 py-0.5 rounded-md mb-1.5">
                    {subj.tag}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#1d6ef2] truncate transition-colors">
                    {subj.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">{subj.group}</p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-slate-50 group-hover:bg-[#1d6ef2] text-slate-400 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                  <ChevronRight size={16} />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Candidate's Personal Evaluated Scripts History */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">My Evaluated Answer Scripts</h2>
              <p className="text-xs text-slate-500">
                Your personal cloud-synced evaluation reports ({evaluationHistory.length})
              </p>
            </div>
            <button
              type="button"
              onClick={onTrySample}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#1d6ef2] bg-white border border-slate-200/90 px-3 py-1.5 rounded-xl shadow-2xs transition-colors cursor-pointer"
            >
              <Eye size={13} />
              <span>View Sample FPSC Report</span>
            </button>
          </div>

          {evaluationHistory.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-10 text-center max-w-2xl mx-auto my-4 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#1d6ef2] flex items-center justify-center mx-auto">
                <Sparkles size={26} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  You haven&apos;t submitted any papers yet
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                  Snap photos of your handwritten CSS/PMS answer sheets or paste a draft essay to get your 6-agent FPSC examiner report in under 60 seconds.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onStartNewEvaluation}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1d6ef2] hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-sm cursor-pointer transition-all"
                >
                  <Plus size={16} />
                  <span>Submit Your First Paper</span>
                </button>
                <button
                  type="button"
                  onClick={onTrySample}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs sm:text-sm font-semibold cursor-pointer transition-all"
                >
                  <Eye size={15} />
                  <span>Explore Sample Evaluation</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {evaluationHistory.map((item) => {
                const hasScore = typeof item.overallScore === 'number';
                const maxMarks =
                  item.maxScore || (item.subject?.toLowerCase().includes('essay') ? 100 : 20);
                const title =
                  item.topic || item.examQuestion || `${item.subject || 'CSS'} Evaluation`;
                const summaryExcerpt =
                  item.examinerSummary ||
                  item.overallFeedback ||
                  'Click to open full side-by-side OCR annotations, rubric scores, and topper rewrites.';

                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectEvaluation?.(item)}
                    className="bg-white border border-slate-200/90 hover:border-[#1d6ef2]/60 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="bg-blue-50 text-[#1d6ef2] border border-blue-100 text-[11px] font-bold px-2.5 py-0.5 rounded-full truncate">
                          {item.subject || 'English Essay'}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Calendar size={11} />
                            <span>{item.date || 'Saved'}</span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteEvaluation?.(item.id);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                            title="Delete Evaluation"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <h3 className="font-sans font-bold text-sm text-slate-900 group-hover:text-[#1d6ef2] transition-colors line-clamp-2 mb-1.5">
                        {title}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                        {summaryExcerpt}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-baseline gap-1">
                        {hasScore ? (
                          <>
                            <span
                              className={`font-mono text-sm font-extrabold ${
                                item.passStatus !== false ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {item.overallScore}/{maxMarks}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase ml-1">
                              {item.passStatus !== false ? 'Pass' : 'Needs Work'}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs font-mono font-bold text-[#1d6ef2]">
                            Diagnostic Report
                          </span>
                        )}
                      </div>

                      <span className="text-xs font-bold text-[#1d6ef2] flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                        <span>Open Studio</span>
                        <ChevronRight size={14} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

