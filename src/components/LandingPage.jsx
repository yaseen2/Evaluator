import React, { useState } from 'react';
import sampleEssayEvaluation from '../data/evaluations/sample-essay-evaluation.json';

export const LandingPage = ({
  onStartEvaluation,
  onTrySample,
  onOpenPricing,
  onOpenAuth,
  user,
  userProfile
}) => {
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  const credits = userProfile?.credits ?? 0;
  const displayName = userProfile?.displayName || user?.displayName || user?.email?.split('@')[0];

  const faqs = [
    {
      q: "How does JawabCheck evaluate handwritten CSS/PMS answers against official FPSC standards?",
      a: "JawabCheck uses neural multi-page Vision OCR combined with a specialized 6-agent Directed Acyclic Graph (DAG). It analyzes question directive calibration, factual accuracy, structural causality, paragraph cohesion, and English expression. Instead of just encircling mistakes like traditional academies do, it explains why each flaw hurts your score and shows high-scorer topper rewrites."
    },
    {
      q: "How is this different from pasting my answer into ChatGPT or Claude?",
      a: "Generic LLMs suffer from positive politeness bias, hallucinate non-existent rubrics, and struggle with cursive handwriting, tables, and diagrams. JawabCheck is calibrated strictly to official FPSC examination dimensions, applying tough examiner deductions and generating concrete CSS model answers."
    },
    {
      q: "Can I evaluate only my Essay Outline & Thesis without submitting a full 2,500-word essay?",
      a: "Yes! JawabCheck offers a dedicated 'Outline & Thesis Only' diagnostic mode. It evaluates outline parallelism, thematic division, argument depth, and thesis clarity in under 30 seconds."
    },
    {
      q: "Can the AI decipher messy, cursive, or rushed handwriting under exam conditions?",
      a: "Yes. Our neural OCR has been tuned on thousands of civil service answer sheets, including cursive, rushed penmanship, strikethroughs, and margins. Simply snap clear photos with your smartphone camera."
    },
    {
      q: "Which local Pakistani and international payment methods do you accept?",
      a: "We support instant local payments via Raast, JazzCash, EasyPaisa, and Pakistani Bank Transfers with 1-click in-app TID screenshot verification, as well as International Visa/Mastercard debit and credit cards."
    },
    {
      q: "Are my answer copies shared publicly or used to train other people's models?",
      a: "Never. Your submissions and evaluations are 100% private and protected with enterprise AES-256 cloud encryption. Your answers remain your intellectual property and are never used to train public models."
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-white text-slate-900 hero-glow selection:bg-blue-100 selection:text-blue-900 antialiased" style={{ minHeight: 'calc(100vh - 64px)' }}>
      
      {/* Hero Section */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 pt-12 sm:pt-16 pb-16 text-center relative overflow-hidden">
        {/* Ambient Gradient Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[360px] bg-gradient-to-tr from-blue-200/30 via-indigo-100/20 to-amber-200/25 blur-3xl -z-10 rounded-full pointer-events-none"></div>
        
        <div className="max-w-4xl mx-auto flex flex-col items-center relative z-10">
          {/* Ratings Pill */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/95 border border-slate-200/90 shadow-xs mb-7 hover:border-amber-300 transition-colors">
            <div className="flex items-center gap-1 text-[#f59e0b]">
              {[0, 0.2, 0.4, 0.6, 0.8].map((delay, idx) => (
                <svg
                  key={idx}
                  className="w-4 h-4 fill-current animate-pulse"
                  style={{ animationDuration: '1.8s', animationDelay: `${delay}s` }}
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <div className="h-3.5 w-px bg-slate-200"></div>
            <span className="text-xs sm:text-sm font-semibold text-slate-700">You will Love it!</span>
          </div>

          {/* Headline */}
          <h1 className="font-serif text-[28px] sm:text-[44px] md:text-[60px] lg:text-[70px] leading-[1.12] sm:leading-[1.08] font-bold text-slate-900 tracking-tight mb-4 sm:mb-6 max-w-4xl px-3 break-words">
            AI-POWERED <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1d6ef2] via-blue-600 to-indigo-600 inline-block">CSS/PMS</span> PAPER EVALUATION
          </h1>

          {/* Subtitle */}
          <p className="font-sans text-[15px] sm:text-[18px] md:text-[20px] text-slate-600 max-w-2xl font-normal leading-relaxed mb-8 px-4">
            Get Your CSS Papers Evaluated in 60 Seconds. Know Where You Stand.
          </p>

          {/* Primary CTA Buttons (Conditional based on Signed In vs Not Signed In) */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center max-w-lg mb-6 px-2">
            <button
              type="button"
              onClick={onStartEvaluation}
              className="w-full sm:w-auto relative group overflow-hidden inline-flex items-center justify-center gap-3 px-8 sm:px-9 py-3.5 sm:py-4 rounded-2xl bg-[#1d6ef2] text-white font-semibold text-[16px] sm:text-[17px] transition-all duration-300 shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] cursor-pointer"
            >
              <span className="absolute inset-0 w-1/2 h-full bg-white/20 -skew-x-12 animate-shine pointer-events-none"></span>
              <span>{user ? 'Go to Evaluation Studio' : 'Evaluate now'}</span>
              <svg className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2.3" viewBox="0 0 24 24">
                <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => onTrySample?.(sampleEssayEvaluation)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 sm:py-4 rounded-2xl bg-white text-slate-700 hover:text-[#1d6ef2] font-semibold text-[15px] border border-slate-200/90 hover:border-blue-300 shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Sample Evaluation Report</span>
            </button>
          </div>

          {/* Dynamic User Status Tag */}
          {user ? (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50/80 border border-blue-100 text-xs text-[#1d6ef2] font-medium">
              <span>Signed in as <strong>{displayName}</strong></span>
              <span>•</span>
              <span className="font-mono font-bold">{credits} Credits Available</span>
            </div>
          ) : (
            <div className="text-xs text-slate-500 font-medium">
              Free trial available • Strict FPSC &amp; UPSC Rubrics • Instant 60s Turnaround
            </div>
          )}
        </div>
      </main>

      {/* How it Works & Head-to-Head Section */}
      <section className="w-full pt-10 pb-20 px-4 sm:px-6 relative" id="how-it-works">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="font-serif text-[32px] sm:text-[44px] md:text-[50px] font-bold text-slate-900 tracking-tight leading-[1.18] mb-4">
              Why our Evaluation beats ChatGPT &amp; Traditional Coaching Academies
            </h2>
            <p className="font-sans text-[16px] sm:text-[18px] text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Generic AI hallucinates rubrics, and physical academies take weeks for handwritten feedback. JawabCheck gives instant, rubric-aligned UPSC/CSS Mains evaluation designed specifically for civil service aspirants.
            </p>
          </div>

          {/* Comparison Table */}
          <div className="mb-20" id="comparison">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1d6ef2] bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                Head to Head
              </span>
              <h3 className="font-serif text-[28px] sm:text-[38px] font-bold text-slate-900 mt-2">
                See how we compare
              </h3>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
              <div className="block sm:hidden px-4 py-2 bg-blue-50/80 border-b border-slate-200 text-center text-[12px] text-[#1d6ef2] font-semibold">
                <span>Why JawabCheck AI Evaluation</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[13px] sm:text-[14px]">
                      <th className="py-4 sm:py-5 px-4 sm:px-7 font-bold text-slate-700 w-[26%]">Features &amp; Criteria</th>
                      <th className="py-4 sm:py-5 px-4 sm:px-7 w-[34%] bg-blue-50/80 border-x-2 border-[#1d6ef2] relative">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[15px] sm:text-[17px] font-extrabold text-[#1d6ef2] block">JawabCheck AI Mentor</span>
                            <span className="text-[10px] text-blue-700 font-semibold block sm:hidden">Recommended</span>
                          </div>
                          <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[11px] uppercase font-bold tracking-wider bg-[#1d6ef2] text-white shadow-xs">
                            Recommended
                          </span>
                        </div>
                      </th>
                      <th className="py-4 sm:py-5 px-4 sm:px-7 font-bold text-slate-700 w-[20%]">ChatGPT (Generic LLM)</th>
                      <th className="py-4 sm:py-5 px-4 sm:px-7 font-bold text-slate-700 w-[20%]">Traditional Academies</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[13px] sm:text-[14.5px]">
                    <tr className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 sm:py-4 px-4 sm:px-7 font-bold text-slate-900">Handwritten Answer &amp; Diagram OCR</td>
                      <td className="py-3.5 sm:py-4 px-4 sm:px-7 bg-blue-50/30 border-x-2 border-[#1d6ef2] font-semibold text-emerald-800">
                        <div className="flex items-start gap-2.5">
                          <span className="text-emerald-600 font-bold shrink-0">✅</span>
                          <span>Instant OCR &amp; line-by-line diagrammatic schematic scoring</span>
                        </div>
                      </td>
                      <td className="py-3.5 sm:py-4 px-4 sm:px-7 text-slate-600">
                        <div className="flex items-start gap-2">
                          <span className="shrink-0 text-amber-500">⚠️</span>
                          <span>Text only; struggles with handwriting, tables &amp; diagrams</span>
                        </div>
                      </td>
                      <td className="py-3.5 sm:py-4 px-4 sm:px-7 text-slate-600">
                        <div className="flex items-start gap-2">
                          <span className="shrink-0">⏱️</span>
                          <span>7–14 days delay, manual red-ink grading</span>
                        </div>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 sm:py-4 px-4 sm:px-7 font-bold text-slate-900">UPSC / CSS Rubric Alignment</td>
                      <td className="py-3.5 sm:py-4 px-4 sm:px-7 bg-blue-50/30 border-x-2 border-[#1d6ef2] font-semibold text-emerald-800">
                        <div className="flex items-start gap-2.5">
                          <span className="text-emerald-600 font-bold shrink-0">✅</span>
                          <span>Strict official marks distribution, keywords &amp; dimensions</span>
                        </div>
                      </td>
                      <td className="py-3.5 sm:py-4 px-4 sm:px-7 text-slate-600">
                        <div className="flex items-start gap-2">
                          <span className="shrink-0 text-rose-500">❌</span>
                          <span>Generic summaries, no actual civil service syllabus calibration</span>
                        </div>
                      </td>
                      <td className="py-3.5 sm:py-4 px-4 sm:px-7 text-slate-600">
                        <div className="flex items-start gap-2">
                          <span className="shrink-0 text-amber-500">⚠️</span>
                          <span>Highly subjective, varies widely by faculty mood and batch load</span>
                        </div>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 sm:py-4 px-4 sm:px-7 font-bold text-slate-900">Turnaround Speed</td>
                      <td className="py-3.5 sm:py-4 px-4 sm:px-7 bg-blue-50/30 border-x-2 border-[#1d6ef2] font-semibold text-blue-900">
                        <div className="flex items-start gap-2.5">
                          <span className="text-blue-600 font-bold shrink-0">⚡</span>
                          <span>Under 60 seconds instant turnaround</span>
                        </div>
                      </td>
                      <td className="py-3.5 sm:py-4 px-4 sm:px-7 text-slate-600">
                        <div className="flex items-start gap-2">
                          <span className="shrink-0 text-blue-500">⚡</span>
                          <span>Instant, but lacks exam criteria &amp; structural marks</span>
                        </div>
                      </td>
                      <td className="py-3.5 sm:py-4 px-4 sm:px-7 text-slate-600">
                        <div className="flex items-start gap-2">
                          <span className="shrink-0">🐢</span>
                          <span>1 to 2 weeks turnaround time per copy</span>
                        </div>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 sm:py-4 px-4 sm:px-7 font-bold text-slate-900">Cost &amp; Volume</td>
                      <td className="py-3.5 sm:py-4 px-4 sm:px-7 bg-blue-50/30 border-x-2 border-[#1d6ef2] font-semibold text-emerald-800">
                        <div className="flex items-start gap-2.5">
                          <span className="shrink-0">💰</span>
                          <span>Fraction of academy fees with unlimited answer evaluations</span>
                        </div>
                      </td>
                      <td className="py-3.5 sm:py-4 px-4 sm:px-7 text-slate-600">
                        <div className="flex items-start gap-2">
                          <span className="shrink-0">💰</span>
                          <span>Paid monthly subscription with zero exam specialization</span>
                        </div>
                      </td>
                      <td className="py-3.5 sm:py-4 px-4 sm:px-7 text-slate-600">
                        <div className="flex items-start gap-2">
                          <span className="shrink-0 text-rose-500">💸</span>
                          <span>Heavy fees (Rs. 1,00,000–2,00,000+) with limited copies</span>
                        </div>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 sm:py-4 px-4 sm:px-7 font-bold text-slate-900">24/7 Availability &amp; Discipline</td>
                      <td className="py-3.5 sm:py-4 px-4 sm:px-7 bg-blue-50/30 border-x-2 border-[#1d6ef2] font-semibold text-emerald-800">
                        <div className="flex items-start gap-2.5">
                          <span className="text-emerald-600 font-bold shrink-0">✅</span>
                          <span>Daily targets, instant doubt clearance &amp; streak tracking 24/7</span>
                        </div>
                      </td>
                      <td className="py-3.5 sm:py-4 px-4 sm:px-7 text-slate-600">
                        <div className="flex items-start gap-2">
                          <span className="shrink-0 text-amber-500">⚠️</span>
                          <span>Available 24/7, but lacks structured syllabus tracking</span>
                        </div>
                      </td>
                      <td className="py-3.5 sm:py-4 px-4 sm:px-7 text-slate-600">
                        <div className="flex items-start gap-2">
                          <span className="shrink-0 text-rose-500">❌</span>
                          <span>Fixed office hours, rigid schedules, crowded batches</span>
                        </div>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 sm:py-4 px-4 sm:px-7 font-bold text-slate-900">Personalized Model Answers</td>
                      <td className="py-3.5 sm:py-4 px-4 sm:px-7 bg-blue-50/30 border-x-2 border-[#1d6ef2] font-semibold text-emerald-800">
                        <div className="flex items-start gap-2.5">
                          <span className="text-emerald-600 font-bold shrink-0">✅</span>
                          <span>Instant customized model answers, case studies &amp; data points</span>
                        </div>
                      </td>
                      <td className="py-3.5 sm:py-4 px-4 sm:px-7 text-slate-600">
                        <div className="flex items-start gap-2">
                          <span className="shrink-0 text-amber-500">⚠️</span>
                          <span>Surface-level web data without exam context</span>
                        </div>
                      </td>
                      <td className="py-3.5 sm:py-4 px-4 sm:px-7 text-slate-600">
                        <div className="flex items-start gap-2">
                          <span className="shrink-0 text-amber-500">⚠️</span>
                          <span>Static printed answer keys handed out weeks later</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 3 Pillar Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
            <div className="group glass-card rounded-2xl p-7 shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden">
              <h3 className="font-sans font-bold text-[19px] text-slate-900 mb-2.5">
                Instant Feedback in 60s
              </h3>
              <p className="text-[14.5px] text-slate-600 leading-relaxed">
                Evaluates handwritten answers in 60 seconds with line-by-line markups and scoring, while physical academies take 7–14 days for superficial red-ink marks.
              </p>
            </div>

            <div className="group glass-card rounded-2xl p-7 shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden">
              <h3 className="font-sans font-bold text-[19px] text-slate-900 mb-2.5">
                Strict Exam Rubrics
              </h3>
              <p className="text-[14.5px] text-slate-600 leading-relaxed">
                Trained on official civil service scoring dimensions (Structure, Content, Keywords, Diagrammatic presentation), avoiding ChatGPT's generic polite praise.
              </p>
            </div>

            <div className="group glass-card rounded-2xl p-7 shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden">
              <h3 className="font-sans font-bold text-[19px] text-slate-900 mb-2.5">
                Handwritten OCR &amp; Diagrams
              </h3>
              <p className="text-[14.5px] text-slate-600 leading-relaxed">
                Directly upload phone snapshots of handwritten sheets. Evaluates Essay, GS, and Optionals with pinpoint diagrammatic schematic checks.
              </p>
            </div>
          </div>

          {/* Live OCR Demonstration Phone Mockup */}
          <div className="mb-20 sm:mb-24 bg-gradient-to-b from-blue-50/70 via-white to-slate-50/50 border border-blue-200/70 rounded-2xl sm:rounded-3xl p-4 sm:p-10 md:p-12 shadow-xl relative overflow-hidden">
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
              
              <div className="lg:col-span-5 flex flex-col justify-center text-left">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue-100/80 text-[#1d6ef2] w-fit mb-4">
                  <span className="w-2 h-2 rounded-full bg-[#1d6ef2] animate-ping"></span> Live OCR Demonstration
                </div>
                <h3 className="font-serif text-[24px] sm:text-[34px] md:text-[38px] font-bold text-slate-900 leading-tight mb-3 sm:mb-4">
                  Point. Scan. Get Evaluated in 60 Seconds.
                </h3>
                <p className="font-sans text-[14px] sm:text-[16px] text-slate-600 leading-relaxed mb-6 sm:mb-7">
                  Simply point your mobile camera at any handwritten essay or answer sheet. JawabCheck's high-precision neural OCR maps every sentence, rubric criterion, and diagram directly on the page.
                </p>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 bg-white/95 p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-blue-300 transition-colors">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm shrink-0">✓</div>
                    <div className="text-[13px] sm:text-[14px] text-slate-800 font-semibold">Detects handwritten 'CSS Essay' &amp; Mains answers instantly</div>
                  </div>
                  <div className="flex items-center gap-3 bg-white/95 p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-blue-300 transition-colors">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1d6ef2] flex items-center justify-center font-bold text-sm shrink-0">⚡</div>
                    <div className="text-[13px] sm:text-[14px] text-slate-800 font-semibold">Instant Mobile Scanner • CSS Essay Evaluation in 60s</div>
                  </div>
                  <div className="flex items-center gap-3 bg-white/95 p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-blue-300 transition-colors">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm shrink-0">★</div>
                    <div className="text-[13px] sm:text-[14px] text-slate-800 font-semibold">Line-by-line grammar, expression &amp; arguments scoring</div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 flex justify-center w-full px-1 sm:px-0">
                <div className="relative max-w-[310px] sm:max-w-[340px] w-full mx-auto select-none group transition-transform duration-300 hover:scale-[1.015]">
                  <div className="relative p-3 bg-slate-900 rounded-[44px] shadow-2xl border-4 border-slate-800 drop-shadow-[0_25px_50px_rgba(15,23,42,0.45)]">
                    <div className="relative rounded-[34px] overflow-hidden bg-white shadow-inner">
                      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-950 rounded-full z-30 flex items-center justify-end px-2">
                        <div className="w-2 h-2 rounded-full bg-blue-900/60"></div>
                      </div>
                      <div className="relative w-full h-[540px] sm:h-[580px] overflow-hidden bg-white flex items-center justify-center">
                        <img
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCrBCqAwc2bXl491fBoNjyegUyeFhs0IGIyUpZJ1oHTBWNMp2UH2-Jhn49eE95dB9ShDd4RmB1LtWCB8Cc4v9NvLbx5Rr6ZYwVLru5uvAZsY46gEU2lV9cgUhPn_47UPlLgdBNRC1o3ji5QeWmPjFWxNaSQyWPR8VvJypauhOFt-H9kxHKP0ZmilPONT4OSpn4SCWBFRgwSekIjyS5vfxBWPKGWvwNtrE81MYv2xH8ww1wwu6Bz7c7i"
                          alt="Pathways to Pakistan's prosperity handwritten CSS essay"
                          className="w-full h-full object-cover object-top select-none pointer-events-none"
                        />
                        <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400 laser-line-glow pointer-events-none z-20 animate-camscanner-sweep"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Interactive Frequently Asked Questions Section */}
          <div className="mb-20 max-w-4xl mx-auto" id="faq">
            <div className="text-center mb-10">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1d6ef2] bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                FAQ
              </span>
              <h3 className="font-serif text-[28px] sm:text-[36px] font-bold text-slate-900 mt-2">
                Frequently Asked Questions
              </h3>
              <p className="text-slate-600 text-sm sm:text-base mt-2">
                Everything you need to know about JawabCheck evaluation, scoring, and rubrics.
              </p>
            </div>

            <div className="flex flex-col gap-3.5">
              {faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border transition-all duration-200 overflow-hidden bg-white ${
                      isOpen ? 'border-blue-300 shadow-md ring-2 ring-blue-50' : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}
                      className="w-full text-left px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-4 bg-transparent border-0 cursor-pointer"
                    >
                      <span className="font-semibold text-slate-900 text-[15px] sm:text-[16px]">
                        {faq.q}
                      </span>
                      <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-transform duration-200 ${
                        isOpen ? 'bg-blue-100/80 text-[#1d6ef2] rotate-180' : 'bg-slate-100 text-slate-600'
                      }`}>
                        ▼
                      </span>
                    </button>

                    {isOpen && (
                      <div className="px-5 sm:px-6 pb-5 pt-1 text-[14px] sm:text-[14.5px] text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/40">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-slate-200/80 py-10 px-6 text-slate-500 text-xs sm:text-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1d6ef2]">
              <svg className="w-4 h-4 text-[#1d6ef2]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 2H15L19 6V20C19 21.1046 18.1046 22 17 22H7C5.89543 22 5 21.1046 5 20V5C5 3.34315 6.34315 2 8 2Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
                <path d="M10.5 18L13.5 20.5L19.5 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="font-bold text-slate-800 text-base">JawabCheck</span>
            <span className="text-slate-400">| Pakistan's Premier AI Answer Evaluator</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-slate-600 font-medium">
            <a href="#how-it-works" className="hover:text-[#1d6ef2] transition-colors">How it works</a>
            <a href="#comparison" className="hover:text-[#1d6ef2] transition-colors">Why JawabCheck</a>
            <button
              type="button"
              onClick={() => onTrySample?.(sampleEssayEvaluation)}
              className="hover:text-[#1d6ef2] transition-colors bg-transparent border-0 p-0 cursor-pointer font-medium text-slate-600"
            >
              Sample Evaluation
            </button>
            <button
              type="button"
              onClick={onOpenPricing}
              className="hover:text-[#1d6ef2] transition-colors bg-transparent border-0 p-0 cursor-pointer font-medium text-slate-600"
            >
              Pricing
            </button>
            <a href="#faq" className="hover:text-[#1d6ef2] transition-colors">FAQ</a>
          </div>

          <div className="text-slate-400 text-center md:text-right">
            © 2026 JawabCheck. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Support Button */}
      <aside className="fixed bottom-6 right-6 z-50">
        <a
          aria-label="Chat on WhatsApp"
          className="relative group w-14 h-14 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-600/30 hover:shadow-xl hover:shadow-emerald-600/40 transition-all duration-300 hover:scale-105 active:scale-95"
          href="https://wa.me/"
          rel="noopener noreferrer"
          target="_blank"
        >
          <span className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-60 pointer-events-none"></span>
          <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
            <path d="M19.05 4.91A9.816 9.816 0 0 0 12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01zm-7.01 15.24c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c.02 4.54-3.68 8.23-8.23 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.98-.15.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.66.31-.23.25-.88.86-.88 2.1 0 1.23.9 2.43 1.03 2.6.12.17 1.77 2.7 4.28 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.07-.12-.23-.19-.48-.31z" />
          </svg>
        </a>
      </aside>

    </div>
  );
};
