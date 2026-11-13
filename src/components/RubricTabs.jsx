import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Compass,
  FileText,
  ShieldAlert,
  BookOpen,
  Sparkles,
  Lightbulb,
  Award,
  Layers
} from 'lucide-react';
import { resolveSubjectProfile } from '../services/fpscRubrics';
import { ParagraphRewriter } from './ParagraphRewriter';
import { cleanSimpleText } from '../utils/textUtils';

const GENRE_LABELS = {
  DESCRIPTIVE_ISSUE: 'Descriptive / Issue-Based',
  ARGUMENTATIVE_DEBATE: 'Argumentative Debate',
  RELATIONAL_TWO_CONCEPT: 'Relational Two-Concept ("A & B")',
  ABSTRACT_PHILOSOPHICAL: 'Abstract / Philosophical'
};

export const RubricTabs = ({ evaluation, selectedAnnId, onSelectAnnId }) => {
  const [activeTab, setActiveTab] = useState('report'); // 'report' | 'rewrites' | 'accuracy' | 'directive' | 'callouts'
  const [selectedParamId, setSelectedParamId] = useState(null);
  const [calloutFilter, setCalloutFilter] = useState('all'); // 'all' | 'tier1' | 'tier2' | 'polish' | 'green'
  const cardRefs = useRef({});

  if (!evaluation) return null;

  const profile = resolveSubjectProfile(evaluation.subject, {
    essayMode: evaluation.essayMode,
    archetypeId: evaluation.archetypeId
  });

  const isNonScoredEssay =
    evaluation.isNonScoredEssay === true ||
    profile.scored === false ||
    (evaluation.subject || '').toLowerCase().includes('essay');

  const dealBreakers = profile.dealBreakers || [];
  const factChecks = evaluation.factCheck || [];
  const breakdown = evaluation.scoreBreakdown || {};
  const directiveAnalysis = evaluation.directiveAnalysis || {};
  const allAnnotations = evaluation.annotations || [];
  const rewrites = evaluation.surgicalRewrites || evaluation.rewrites || [];
  const headerUpgrades = evaluation.headerUpgrades || [];
  const totalUpgradesCount = rewrites.length + headerUpgrades.length;
  const examinerSummary = evaluation.examinerSummary || null;

  const redCount = allAnnotations.filter((a) => a.type === 'red').length;
  const amberCount = allAnnotations.filter((a) => a.type === 'amber').length;
  const greenCount = allAnnotations.filter((a) => a.type === 'green').length;

  const isTier1 = (a) => a.tier === 'TIER_1_FATAL' || a.tier === 'TIER_1_DEAL_BREAKER';
  const isTier2 = (a) =>
    a.tier === 'TIER_2_MAJOR' ||
    a.tier === 'TIER_2_MAJOR_FLAW' ||
    (a.type === 'red' && !isTier1(a));
  const isPolish = (a) => a.tier === 'TIER_3_POLISH' || (a.type === 'amber' && !isTier1(a) && !isTier2(a));
  const isGreen = (a) => a.type === 'green' || a.tier === 'EARNED_SIGNIFIER' || a.tier === 'EARNED_STRENGTH';

  const tier1AnnCount = allAnnotations.filter(isTier1).length;
  const tier2AnnCount = allAnnotations.filter(isTier2).length;
  const tier3AnnCount = allAnnotations.filter(isPolish).length;

  // 4-Tier Diagnostic Counts (v3 Non-Scored Essay Rubric)
  const tier1Count = evaluation.diagnosticTiers?.tier1Fatal?.length ?? tier1AnnCount;
  const tier2Count = evaluation.diagnosticTiers?.tier2Major?.length ?? tier2AnnCount;
  const tier3Count = evaluation.diagnosticTiers?.tier3Polish?.length ?? tier3AnnCount;
  const earnedSignifiersList =
    evaluation.diagnosticTiers?.earnedSignifiers ||
    allAnnotations
      .filter(isGreen)
      .map((a) => ({
        location_id: a.locationId || '',
        exact_verbatim_quote: a.targetPhrase,
        category: a.category || 'Earned Topper Signifier',
        observation: a.comment
      }));

  const filteredAnnotations = allAnnotations.filter((a) => {
    if (calloutFilter === 'all') return true;
    if (calloutFilter === 'tier1') return isTier1(a);
    if (calloutFilter === 'tier2') return isTier2(a);
    if (calloutFilter === 'red') return a.type === 'red' || isTier1(a) || isTier2(a);
    if (calloutFilter === 'polish' || calloutFilter === 'amber') return isPolish(a);
    if (calloutFilter === 'green') return isGreen(a);
    return true;
  });

  const handleTierFilterJump = (filterKey) => {
    setCalloutFilter(filterKey);
    setActiveTab('callouts');
  };

  useEffect(() => {
    if (selectedAnnId && activeTab === 'callouts') {
      setTimeout(() => {
        const targetCard = cardRefs.current[selectedAnnId];
        if (targetCard && typeof targetCard.scrollIntoView === 'function') {
          targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 40);
    }
  }, [selectedAnnId, activeTab]);

  // Compute Rubric Breakdown Parameters (Non-Scored Qualitative for Essay vs. Scored for 20-Mark Subjective)
  const displayParameters = useMemo(() => {
    return profile.breakdown.map((comp) => {
      const saved = breakdown[comp.id] || {};
      let status = saved.status;
      if (!status) {
        if (comp.id === 'introduction') {
          status =
            (evaluation.introWordCount || 0) >= (evaluation.targetIntroWords || 100)
              ? 'Strong'
              : 'Needs Polish';
        } else if (comp.id === 'grammar_syntax') {
          status = redCount === 0 ? 'Strong' : redCount > 3 ? 'Needs Polish' : 'Balanced';
        } else {
          status = 'Balanced';
        }
      }

      let score = typeof saved.score === 'number' ? saved.score : null;
      if (!isNonScoredEssay && score === null) {
        const s = status.toLowerCase();
        score =
          s.includes('strong') || s.includes('satisfactory')
            ? Math.round(comp.maxMarks * 0.75 * 2) / 2
            : s.includes('partial') ||
              s.includes('moderate') ||
              s.includes('developing') ||
              s.includes('balanced')
            ? Math.round(comp.maxMarks * 0.5 * 2) / 2
            : Math.round(comp.maxMarks * 0.25 * 2) / 2;
      }

      const cleanName = comp.name.replace(/^[0-9]+[.\-)]\s*/, '').trim();

      return {
        id: comp.id,
        cleanName,
        fullName: comp.name,
        status,
        score,
        maxMarks: comp.maxMarks,
        feedback: saved.feedback || comp.defaultFeedback
      };
    });
  }, [profile.breakdown, breakdown, evaluation, redCount, isNonScoredEssay]);

  const getBadgeStyle = (status = '') => {
    const s = status.toLowerCase();
    if (s.includes('strong') || s.includes('satisfactory') || s.includes('excellent') || s.includes('aligned')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
    }
    if (
      s.includes('missing') ||
      s.includes('absent') ||
      s.includes('critical') ||
      s.includes('fragmented') ||
      s.includes('deficient') ||
      s.includes('fatal')
    ) {
      return 'bg-rose-50 text-rose-700 border-rose-200/60';
    }
    if (s.includes('low') || s.includes('incomplete')) {
      return 'bg-rose-50 text-rose-700 border-rose-200/60';
    }
    if (
      s.includes('partial') ||
      s.includes('informal') ||
      s.includes('developing') ||
      s.includes('moderate') ||
      s.includes('polish') ||
      s.includes('balanced')
    ) {
      return 'bg-amber-50 text-amber-700 border-amber-200/60';
    }
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const remedialSteps = useMemo(() => {
    const steps = [];
    if (Array.isArray(evaluation.thingsToInclude) && evaluation.thingsToInclude.length > 0) {
      evaluation.thingsToInclude.forEach((item) => {
        const parts = item.split(':');
        if (parts.length > 1) {
          steps.push({
            title: parts[0].trim(),
            description: parts.slice(1).join(':').trim()
          });
        } else {
          steps.push({
            title: 'Action Point',
            description: item.trim()
          });
        }
      });
    }

    if (steps.length < 3 && evaluation.outlineAlignment?.missingFromBody?.length) {
      steps.push({
        title: 'Fulfill Outline Sections',
        description: `Ensure all points promised in your outline are developed in full prose paragraphs (e.g. ${evaluation.outlineAlignment.missingFromBody[0]}).`
      });
    }
    if (steps.length < 3 && evaluation.thesisAudit?.status === 'Needs Polish') {
      steps.push({
        title: 'Formulate Explicit Thesis',
        description:
          'Under Introduction, provide a clear two-dimensional thesis statement outlining your core analytical contention.'
      });
    }

    if (steps.length === 0) {
      steps.push(
        {
          title: 'Adopt Rigorous Diction',
          description: 'Replace informal phraseology with authoritative civil service terminology.'
        },
        {
          title: 'Formulate Explicit Thesis',
          description: 'Provide a clear thesis statement outlining your core contention.'
        },
        {
          title: 'Expand Outline Granularity',
          description:
            'Flesh out primary roman numerals into parallel, self-explanatory analytical assertions.'
        }
      );
    }

    return steps.slice(0, 3);
  }, [evaluation]);

  const topicTitle = evaluation.topic || evaluation.examQuestion || "Candidate's Answer Script";
  const genreDisplay = evaluation.essayGenre
    ? GENRE_LABELS[evaluation.essayGenre] || evaluation.essayGenre
    : null;

  return (
    <div className="w-full">
      {/* Clean Pill Tabs Ribbon */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-3 border-b border-slate-200/80 mb-5">
        <button
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'report'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
          onClick={() => setActiveTab('report')}
        >
          <Layers size={13} />
          <span>Diagnostic Report</span>
        </button>

        <button
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'rewrites'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
          onClick={() => setActiveTab('rewrites')}
        >
          <Sparkles size={13} className="text-amber-500" />
          <span>Surgical Rewrites ({totalUpgradesCount})</span>
        </button>

        {factChecks.length > 0 && (
          <button
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'accuracy'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
            onClick={() => setActiveTab('accuracy')}
          >
            <BookOpen size={13} />
            <span>Fact Audit ({factChecks.length})</span>
          </button>
        )}

        <button
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'directive'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
          onClick={() => setActiveTab('directive')}
        >
          <Compass size={13} />
          <span>Rules & Scope</span>
        </button>

        <button
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'callouts'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
          onClick={() => setActiveTab('callouts')}
        >
          <Lightbulb size={13} />
          <span>All Callouts ({allAnnotations.length})</span>
        </button>
      </div>

      {/* TAB 1: GOOGLE STITCH MINIMAL DIAGNOSTIC REPORT (NON-SCORED FOR ESSAY) */}
      {activeTab === 'report' && (
        <div className="space-y-6">
          {/* Header Info */}
          <div>
            <div className="flex items-center justify-between mb-1 flex-wrap gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold tracking-wider text-brand-600 uppercase font-sans">
                  {isNonScoredEssay ? 'Non-Scored Diagnostic Report' : 'Report'}
                </span>
                {evaluation.overallReadiness && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getBadgeStyle(
                      evaluation.overallReadiness
                    )}`}
                  >
                    {evaluation.overallReadiness}
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {evaluation.wordCount || 0} words
              </span>
            </div>
            <h2 className="text-xl xl:text-2xl font-academic font-medium text-slate-900 leading-snug">
              {topicTitle}
            </h2>

            {/* Genre & Counter-Argument Mode Pill Bar */}
            {genreDisplay && (
              <div className="flex items-center flex-wrap gap-1.5 mt-2">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  Genre: {genreDisplay}
                </span>
                {typeof evaluation.requiresCounterArgument === 'boolean' && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200">
                    Counter-Argument:{' '}
                    {evaluation.requiresCounterArgument ? 'Required (Two-Sided Debate)' : 'Optional (Consensus / Issue)'}
                  </span>
                )}
                {evaluation.pacingMetrics && typeof evaluation.pacingMetrics.decayPercent === 'number' && (
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                      evaluation.pacingMetrics.pacingDecayFlag
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    2nd-Half Pacing: {evaluation.pacingMetrics.decayPercent >= 0 ? '+' : ''}
                    {evaluation.pacingMetrics.decayPercent}%
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 4-Tier Diagnostic Readiness Summary Ribbon (Interactive Filter Cards) */}
          {isNonScoredEssay && (
            <div className="grid grid-cols-4 gap-2 text-center">
              <button
                type="button"
                onClick={() => handleTierFilterJump('tier1')}
                className="p-2 rounded-md bg-rose-50/70 hover:bg-rose-100/70 border border-rose-200/80 transition-colors cursor-pointer"
                title="Filter Callouts: Fatal Deal-Breakers"
              >
                <div className="text-sm font-bold text-rose-700 font-mono">{tier1Count}</div>
                <div className="text-[10px] font-semibold text-rose-800 leading-tight">
                  🔴 Fatal Deal-Breakers
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleTierFilterJump('tier2')}
                className="p-2 rounded-md bg-orange-50/70 hover:bg-orange-100/70 border border-orange-200/80 transition-colors cursor-pointer"
                title="Filter Callouts: Structural Risks"
              >
                <div className="text-sm font-bold text-orange-700 font-mono">{tier2Count}</div>
                <div className="text-[10px] font-semibold text-orange-800 leading-tight">
                  🟠 Structural Risks
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleTierFilterJump('polish')}
                className="p-2 rounded-md bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200/80 transition-colors cursor-pointer"
                title="Filter Callouts: Polish & Upgrades"
              >
                <div className="text-sm font-bold text-blue-700 font-mono">{tier3Count}</div>
                <div className="text-[10px] font-semibold text-blue-800 leading-tight">
                  🔵 Polish & Upgrades
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleTierFilterJump('green')}
                className="p-2 rounded-md bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200/80 transition-colors cursor-pointer"
                title="Filter Callouts: Earned Signifiers"
              >
                <div className="text-sm font-bold text-emerald-700 font-mono">
                  {earnedSignifiersList.length}
                </div>
                <div className="text-[10px] font-semibold text-emerald-800 leading-tight">
                  🟢 Earned Signifiers
                </div>
              </button>
            </div>
          )}

          {/* Rubric Parameter Matrix (Qualitative Readiness for Essay vs. Numeric Marks for 20-Mark Subjective) */}
          <div className="space-y-2.5" data-purpose="rubric-matrix">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-sans">
                {isNonScoredEssay ? 'Qualitative Pillar Readiness (Click to Expand)' : 'Breakdown'}
              </h4>
              <span className="text-[10px] font-mono text-slate-400">
                {displayParameters.length} Pillars
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {displayParameters.map((item) => {
                const isSelected = selectedParamId === item.id;
                const badgeClass = getBadgeStyle(item.status);
                const scoreFormatted =
                  typeof item.score === 'number'
                    ? String(Math.round(item.score)).padStart(2, '0')
                    : null;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedParamId(isSelected ? null : item.id)}
                    className={`p-2.5 bg-slate-50 border rounded-md flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-brand-500 ring-1 ring-brand-500/30 bg-blue-50/40'
                        : 'border-slate-200 hover:bg-slate-100/70'
                    }`}
                    title={item.fullName}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="text-[11px] text-slate-700 font-semibold leading-snug font-sans">
                        {item.cleanName}
                      </div>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0 ${badgeClass}`}
                      >
                        {item.status}
                      </span>
                    </div>

                    {!isNonScoredEssay && scoreFormatted !== null ? (
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-sm font-semibold text-slate-800 font-mono">
                          {scoreFormatted}
                          <span className="text-[10px] font-normal text-slate-400">
                            /{item.maxMarks}
                          </span>
                        </span>
                      </div>
                    ) : (
                      item.feedback && (
                        <div className="mt-1.5 text-[11px] text-slate-500 line-clamp-2 leading-snug">
                          {item.feedback}
                        </div>
                      )
                    )}

                    {isSelected && item.feedback && (
                      <div className="mt-2 pt-2 border-t border-slate-200/80 text-[11px] text-slate-700 font-normal leading-relaxed animate-in fade-in duration-150">
                        {item.feedback}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Examiner Analytical Critique */}
          <div className="space-y-2" data-purpose="examiner-critique">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-brand-600" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 font-sans">
                Chief Examiner Analytical Critique
              </h4>
            </div>
            <div className="bg-white border border-slate-200 rounded-md p-4 text-slate-600 text-sm leading-relaxed space-y-2 font-academic text-[15px]">
              <p>
                {examinerSummary
                  ? `"${examinerSummary}"`
                  : `"The candidate addresses foundational themes across the topic directive. However, structural rigor and analytical precision must be deepened to satisfy FPSC civil service examination benchmark standards."`}
              </p>
            </div>
          </div>

          {/* 🟢 Earned Topper Signifiers (Quote-Locked, Strictly When Earned) */}
          {earnedSignifiersList.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-800 font-sans">
                  🟢 Earned Topper Signifiers ({earnedSignifiersList.length})
                </h4>
              </div>
              <div className="space-y-2">
                {earnedSignifiersList.slice(0, 4).map((sig, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-md bg-emerald-50/60 border border-emerald-200/80 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                        {sig.category || 'Earned Qualifier Strength'}
                      </span>
                      {sig.location_id && (
                        <span className="text-[10px] font-mono text-emerald-700">
                          [{sig.location_id}]
                        </span>
                      )}
                    </div>
                    {sig.exact_verbatim_quote && (
                      <div className="font-academic text-slate-800 italic">
                        "{sig.exact_verbatim_quote}"
                      </div>
                    )}
                    {sig.observation && (
                      <p className="text-slate-600 leading-relaxed">{sig.observation}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actionable Directives / Remedial Steps */}
          <div className="space-y-3 pt-1" data-purpose="actionable-directives">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 font-sans">
              Immediate Remedial Steps
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-600 font-sans">
              {remedialSteps.map((step, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-brand-50 text-brand-600 font-semibold text-[10px] mr-2.5 flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>
                    <strong>{step.title}:</strong> {step.description}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Thesis Statement Audit & Model Topper Rewrite */}
          {evaluation.thesisAudit && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2.5 text-xs font-sans">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Thesis Statement Architecture
                </h4>
                {evaluation.thesisAudit.status && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getBadgeStyle(evaluation.thesisAudit.status)}`}>
                    {evaluation.thesisAudit.status}
                  </span>
                )}
              </div>
              {(evaluation.thesisAudit.extractedThesis || evaluation.thesisAudit.candidateThesis) && (
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-slate-700 font-academic text-[13px] italic">
                  "{evaluation.thesisAudit.extractedThesis || evaluation.thesisAudit.candidateThesis}"
                </div>
              )}
              {evaluation.thesisAudit.critique && (
                <p className="text-slate-600 leading-relaxed">{evaluation.thesisAudit.critique}</p>
              )}
              {evaluation.thesisAudit.modelTopperThesis && (
                <div className="p-2.5 rounded bg-emerald-50/70 border border-emerald-200 text-emerald-950">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">
                    70+ Topper Thesis Model
                  </div>
                  <div className="font-academic text-[13px] leading-relaxed">
                    "{evaluation.thesisAudit.modelTopperThesis}"
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 1:1 Outline-to-Body Synchronization Card */}
          {evaluation.outlineAlignment && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2 text-xs font-sans">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  1:1 Outline-to-Body Sync
                </h4>
                {evaluation.outlineAlignment.status && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getBadgeStyle(evaluation.outlineAlignment.status)}`}>
                    {evaluation.outlineAlignment.status}
                  </span>
                )}
              </div>
              {evaluation.outlineAlignment.summary && (
                <p className="text-slate-600 leading-relaxed">{evaluation.outlineAlignment.summary}</p>
              )}
              {evaluation.outlineAlignment.bodyHeadingWarning && (
                <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
                  <strong>Structural Warning:</strong> {evaluation.outlineAlignment.bodyHeadingWarning}
                </div>
              )}
              {evaluation.outlineAlignment.missingFromBody?.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="text-[10px] font-bold uppercase text-rose-700">
                    Outline Points Missing in Body:
                  </div>
                  <ul className="list-disc pl-4 text-slate-700 space-y-0.5">
                    {evaluation.outlineAlignment.missingFromBody.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
              {evaluation.outlineAlignment.orphanBodyParagraphs?.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="text-[10px] font-bold uppercase text-amber-700">
                    Orphan Paragraphs Missing in Outline:
                  </div>
                  <ul className="list-disc pl-4 text-slate-700 space-y-0.5">
                    {evaluation.outlineAlignment.orphanBodyParagraphs.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Paragraph Role Map & Strategic Examiner Highlighting Picks */}
          {((evaluation.paragraphRoleMap && Object.keys(evaluation.paragraphRoleMap).length > 0) ||
            (evaluation.strategicHighlightingPicks && evaluation.strategicHighlightingPicks.length > 0)) && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 text-xs font-sans">
              {evaluation.paragraphRoleMap && Object.keys(evaluation.paragraphRoleMap).length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Structural Paragraph Role Map
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(evaluation.paragraphRoleMap).map(([pId, role]) => (
                      <span
                        key={pId}
                        className="text-[10px] px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-700 font-mono"
                      >
                        <strong>{pId}:</strong> {role}
                      </span>
                    ))}
                  </div>
                  {evaluation.pacingMetrics?.summary && (
                    <p className="text-[11px] text-slate-500 pt-1">{evaluation.pacingMetrics.summary}</p>
                  )}
                </div>
              )}

              {evaluation.strategicHighlightingPicks?.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Strategic Exam Marker Highlighting Picks (3–5/Page)
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {evaluation.strategicHighlightingPicks.map((phrase, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 font-medium"
                      >
                        "{phrase}"
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Chief Examiner QA Audit & Handwriting Physical Layout */}
          {(evaluation.qaAuditLog || evaluation.handwritingAudit || evaluation.stageDegradations?.length > 0) && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2 text-[11px] text-slate-600 font-sans">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Chief Examiner QA & Telemetry
                </span>
                {typeof evaluation.qaAuditLog?.falsePositivesDeleted === 'number' && (
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                    QA Gate: Reviewed {evaluation.qaAuditLog.totalFlagsReviewed || 0} • Pruned{' '}
                    {evaluation.qaAuditLog.falsePositivesDeleted} False Positives
                  </span>
                )}
              </div>

              {evaluation.qaAuditLog?.deletionNotes?.length > 0 && (
                <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                  {evaluation.qaAuditLog.deletionNotes.slice(0, 3).map((note, idx) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              )}

              {evaluation.handwritingAudit && (
                <div className="pt-1.5 border-t border-slate-200/80 space-y-1">
                  <div className="font-semibold text-slate-700">
                    Handwritten Layout Audit: Margins{' '}
                    {evaluation.handwritingAudit.marginsRespected ? 'Clean' : 'Needs Discipline'} • Indentation{' '}
                    {evaluation.handwritingAudit.indentationConsistent ? 'Consistent' : 'Inconsistent'}
                    {evaluation.handwritingAudit.samePageOutlineBodyStart
                      ? ' • ⚠️ Started essay on Outline end page'
                      : ''}
                  </div>
                  {evaluation.handwritingAudit.improperWordBreaks?.length > 0 && (
                    <div className="text-rose-700">
                      End-of-Line Word Splits: {evaluation.handwritingAudit.improperWordBreaks.join(', ')}
                    </div>
                  )}
                  {evaluation.handwritingAudit.observations?.length > 0 && (
                    <div className="text-slate-600">{evaluation.handwritingAudit.observations[0]}</div>
                  )}
                </div>
              )}

              {evaluation.stageDegradations?.length > 0 && (
                <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-800">
                  Partial Stage Notice: {evaluation.stageDegradations.join(' | ')}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SURGICAL REWRITES & HEADER UPGRADES */}
      {activeTab === 'rewrites' && (
        <div>
          <ParagraphRewriter rewrites={rewrites} headerUpgrades={headerUpgrades} />
        </div>
      )}

      {/* TAB 3: FACT AUDIT */}
      {activeTab === 'accuracy' && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2 mb-2">
            <BookOpen className="w-4 h-4 text-brand-600" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 font-sans">
              Search-Grounded Empirical & Citation Audit ({factChecks.length})
            </h4>
          </div>

          {factChecks.map((item, idx) => {
            const isUnverifiedQuote = item.status === 'UNVERIFIED_CITATION';
            return (
              <div
                key={idx}
                className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${
                  item.verified
                    ? 'bg-emerald-50/50 border-emerald-200 text-slate-700'
                    : isUnverifiedQuote
                    ? 'bg-blue-50/50 border-blue-200 text-slate-700'
                    : 'bg-rose-50/50 border-rose-200 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      item.verified
                        ? 'bg-emerald-100 text-emerald-800'
                        : isUnverifiedQuote
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {item.verified
                      ? '✓ Verified Fact'
                      : isUnverifiedQuote
                      ? '🔵 Unverified / Paraphrased Citation'
                      : '✗ Factual / 2026 Baseline Discrepancy'}
                  </span>
                  {item.source && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      Source: {item.source}
                    </span>
                  )}
                </div>
                <div className="font-medium text-slate-800 font-academic text-sm">
                  "{item.claim}"
                </div>
                {item.correctedFact && (
                  <div
                    className={`font-sans pt-1 ${
                      isUnverifiedQuote ? 'text-blue-800' : 'text-rose-700'
                    }`}
                  >
                    <strong>{isUnverifiedQuote ? 'Note:' : 'Correction:'}</strong>{' '}
                    {item.correctedFact}
                  </div>
                )}
              </div>
            );
          })}

          {evaluation.searchSources?.length > 0 && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-1.5 font-sans">
              <div className="font-bold uppercase tracking-wider text-[10px] text-slate-600">
                Google Search Verification Sources ({evaluation.searchSources.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {evaluation.searchSources.map((src, idx) => (
                  <a
                    key={idx}
                    href={src.startsWith('http') ? src : undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2 py-0.5 rounded bg-white border border-slate-200 text-brand-700 hover:underline truncate max-w-[260px]"
                  >
                    {src}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: RULES & SCOPE */}
      {activeTab === 'directive' && (
        <div className="space-y-4 text-xs font-sans">
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              Prompt Qualifier & Genre Playbook
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Classified Genre</span>
                <strong className="text-slate-800">
                  {genreDisplay || directiveAnalysis.directiveWord || 'Analytical Essay'}
                </strong>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Timeframe / Context</span>
                <strong className="text-slate-800">
                  {directiveAnalysis.targetTimeframe || 'Contemporary 2026 & Historical'}
                </strong>
              </div>
            </div>
            {evaluation.genreRationale && (
              <p className="text-slate-600 leading-relaxed pt-1">{evaluation.genreRationale}</p>
            )}
            {directiveAnalysis.feedback && (
              <p className="text-slate-600 leading-relaxed pt-1">{directiveAnalysis.feedback}</p>
            )}
          </div>

          <div className="bg-rose-50/50 border border-rose-200 rounded-lg p-4 space-y-2">
            <h4 className="font-bold text-rose-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <ShieldAlert size={14} className="text-rose-600" />
              <span>FPSC Disqualification Deal-Breakers</span>
            </h4>
            <ul className="space-y-1.5 text-slate-700">
              {dealBreakers.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-rose-600 font-bold">•</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* TAB 5: ALL CALLOUTS LIST */}
      {activeTab === 'callouts' && (
        <div className="space-y-3 font-sans">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-1">
            <span className="text-xs text-slate-400">
              Showing {filteredAnnotations.length} annotations:
            </span>
            <div className="flex flex-wrap gap-1">
              {[
                { id: 'all', label: `All (${allAnnotations.length})` },
                { id: 'tier1', label: `🔴 Fatal (${tier1AnnCount})` },
                { id: 'tier2', label: `🟠 Major (${tier2AnnCount})` },
                { id: 'polish', label: `🔵 Polish (${tier3AnnCount})` },
                { id: 'green', label: `🟢 Signifiers (${greenCount})` }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setCalloutFilter(f.id)}
                  className={`text-[11px] px-2 py-0.5 rounded-full border cursor-pointer ${
                    calloutFilter === f.id
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredAnnotations.map((ann, idx) => {
            const annId = ann.id || `ann-${idx}`;
            const isSelected = selectedAnnId === annId;
            return (
              <div
                key={annId}
                ref={(el) => (cardRefs.current[annId] = el)}
                onClick={() => onSelectAnnId && onSelectAnnId(annId)}
                className={`p-3 bg-white rounded-lg border text-xs space-y-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#007a64] ring-2 ring-[#007a64]/20 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      ann.type === 'red'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : ann.type === 'green'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {ann.category || 'Diagnostic'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {ann.locationId ? `[${ann.locationId}] • ` : ''}Click to view on paper
                  </span>
                </div>

                <div className="font-academic text-[14px] text-slate-800">
                  <span
                    className={
                      ann.type === 'green'
                        ? 'text-emerald-800 font-medium mr-2'
                        : 'line-through text-red-600 mr-2'
                    }
                  >
                    {ann.targetPhrase}
                  </span>
                  {ann.suggestion && (
                    <span className="text-[#007a64] font-semibold">→ {ann.suggestion}</span>
                  )}
                </div>

                {ann.comment && (
                  <p className="text-slate-600 leading-relaxed">{cleanSimpleText(ann.comment)}</p>
                )}
                {ann.microLesson && (
                  <div className="p-2 rounded bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 leading-relaxed">
                    <strong className="text-slate-800">Examiner Rule: </strong>
                    {cleanSimpleText(ann.microLesson)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
