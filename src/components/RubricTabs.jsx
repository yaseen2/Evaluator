import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  AlertTriangle,
  Compass,
  FileText,
  CheckCircle2,
  MessageSquare,
  ShieldAlert,
  BookOpen,
  Sparkles,
  Lightbulb,
  XCircle,
  TrendingUp,
  Award,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { resolveSubjectProfile } from '../services/fpscRubrics';
import { ParagraphRewriter } from './ParagraphRewriter';
import { cleanSimpleText } from '../utils/textUtils';

export const RubricTabs = ({ evaluation, selectedAnnId, onSelectAnnId }) => {
  // Default to the clean Stitch Diagnostic Report
  const [activeTab, setActiveTab] = useState('report'); // 'report' | 'rewrites' | 'accuracy' | 'directive' | 'callouts'
  const [selectedParamId, setSelectedParamId] = useState(null);
  const [calloutFilter, setCalloutFilter] = useState('all'); // 'all' | 'red' | 'amber' | 'green'
  const cardRefs = useRef({});

  if (!evaluation) return null;

  const profile = resolveSubjectProfile(evaluation.subject, {
    essayMode: evaluation.essayMode,
    archetypeId: evaluation.archetypeId
  });

  const dealBreakers = profile.dealBreakers || [];
  const factChecks = evaluation.factCheck || [];
  const breakdown = evaluation.scoreBreakdown || {};
  const directiveAnalysis = evaluation.directiveAnalysis || {};
  const allAnnotations = evaluation.annotations || [];
  const rewrites = evaluation.rewrites || [];
  const headerUpgrades = evaluation.headerUpgrades || [];
  const totalUpgradesCount = rewrites.length + headerUpgrades.length;
  const examinerSummary = evaluation.examinerSummary || null;

  const redCount = allAnnotations.filter((a) => a.type === 'red').length;
  const amberCount = allAnnotations.filter((a) => a.type === 'amber').length;
  const greenCount = allAnnotations.filter((a) => a.type === 'green').length;

  const filteredAnnotations =
    calloutFilter === 'all'
      ? allAnnotations
      : allAnnotations.filter((a) => a.type === calloutFilter);

  // If candidate clicks an annotation on paper while in callouts tab, scroll to it
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

  // Compute 2-Column Rubric Breakdown Parameters (Stitch Design)
  const displayParameters = useMemo(() => {
    return profile.breakdown.map((comp) => {
      const saved = breakdown[comp.id] || {};
      let status = saved.status;
      if (!status) {
        if (comp.id === 'introduction') {
          status = (evaluation.introWordCount || 0) >= (evaluation.targetIntroWords || 100) ? 'Satisfactory' : 'Incomplete';
        } else if (comp.id === 'grammar_syntax') {
          status = redCount === 0 ? 'Strong' : redCount > 3 ? 'Needs Polish' : 'Moderate';
        } else {
          status = 'Moderate';
        }
      }

      let score = typeof saved.score === 'number' ? saved.score : null;
      if (score === null) {
        const s = status.toLowerCase();
        score = s.includes('strong') || s.includes('satisfactory')
          ? Math.round(comp.maxMarks * 0.75 * 2) / 2
          : s.includes('partial') || s.includes('moderate') || s.includes('developing') || s.includes('balanced')
          ? Math.round(comp.maxMarks * 0.5 * 2) / 2
          : Math.round(comp.maxMarks * 0.25 * 2) / 2;
      }

      // Clean leading number e.g. "1. Topic Decoding & Prompt Relevance" -> "Topic Relevancy"
      let cleanName = comp.name.replace(/^[0-9]+[.\-)]\s*/, '');
      if (cleanName.includes('&')) {
        const shortPart = cleanName.split('&')[0].trim();
        if (shortPart.length <= 18) cleanName = shortPart;
      }
      if (cleanName.length > 24) {
        cleanName = cleanName.substring(0, 22) + '...';
      }

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
  }, [profile.breakdown, breakdown, evaluation, redCount]);

  // Status Badge Styling Helper
  const getBadgeStyle = (status = '') => {
    const s = status.toLowerCase();
    if (s.includes('strong') || s.includes('satisfactory') || s.includes('excellent')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
    }
    if (s.includes('missing') || s.includes('absent') || s.includes('critical') || s.includes('fragmented') || s.includes('deficient')) {
      return 'bg-rose-50 text-rose-700 border-rose-200/60';
    }
    if (s.includes('low') || s.includes('incomplete')) {
      return 'bg-rose-50 text-rose-700 border-rose-200/60';
    }
    if (s.includes('partial') || s.includes('informal') || s.includes('developing') || s.includes('moderate') || s.includes('polish') || s.includes('balanced')) {
      return 'bg-amber-50 text-amber-700 border-amber-200/60';
    }
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  // Immediate Remedial Steps (Numbered 1, 2, 3)
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

    // Add outline or thesis remedial directive if missing
    if (steps.length < 3 && evaluation.outlineAlignment?.missingFromBody?.length) {
      steps.push({
        title: 'Fulfill Outline Sections',
        description: `Ensure all points promised in your outline are developed in full prose paragraphs (e.g. ${evaluation.outlineAlignment.missingFromBody[0]}).`
      });
    }
    if (steps.length < 3 && evaluation.thesisAudit?.status === 'Needs Polish') {
      steps.push({
        title: 'Formulate Explicit Thesis',
        description: 'Under Introduction, provide a verbatim 2-sentence thesis paragraph outlining your core analytical contention.'
      });
    }

    if (steps.length === 0) {
      steps.push(
        { title: 'Adopt Rigorous Diction', description: 'Replace informal phraseology with authoritative civil service terminology.' },
        { title: 'Formulate Explicit Thesis', description: 'Provide a verbatim 2-sentence thesis paragraph outlining your core contention.' },
        { title: 'Expand Outline Granularity', description: 'Flesh out primary roman numerals into complete, sub-argumentative assertions before commencing full prose.' }
      );
    }

    return steps.slice(0, 3);
  }, [evaluation]);

  const topicTitle = evaluation.topic || evaluation.examQuestion || "Candidate's Answer Script";

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
          <span>Topper Rewrites ({totalUpgradesCount})</span>
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
          <span>All Mistakes ({allAnnotations.length})</span>
        </button>
      </div>

      {/* TAB 1: GOOGLE STITCH MINIMAL DIAGNOSTIC REPORT */}
      {activeTab === 'report' && (
        <div className="space-y-6">
          {/* Header Info */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold tracking-wider text-brand-600 uppercase font-sans">
                Report
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {evaluation.wordCount || 0} words
              </span>
            </div>
            <h2 className="text-xl xl:text-2xl font-academic font-medium text-slate-900 leading-snug">
              {topicTitle}
            </h2>
          </div>

          {/* Rubric Score Matrix (BREAKDOWN) */}
          <div className="space-y-2.5" data-purpose="rubric-matrix">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-sans">
                Breakdown
              </h4>
              <span className="text-[10px] font-mono text-slate-400">
                {displayParameters.length} Parameters
              </span>
            </div>

            {/* 2-Column Responsive Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {displayParameters.map((item) => {
                const isSelected = selectedParamId === item.id;
                const badgeClass = getBadgeStyle(item.status);
                const scoreFormatted =
                  typeof item.score === 'number'
                    ? String(Math.round(item.score)).padStart(2, '0')
                    : '00';

                return (
                  <div
                    key={item.id}
                    onClick={() =>
                      setSelectedParamId(isSelected ? null : item.id)
                    }
                    className={`p-2.5 bg-slate-50 border rounded-md flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-brand-500 ring-1 ring-brand-500/30 bg-blue-50/40'
                        : 'border-slate-200 hover:bg-slate-100/70'
                    }`}
                    title={item.fullName}
                  >
                    <div className="text-[11px] text-slate-500 font-medium truncate font-sans">
                      {item.cleanName}
                    </div>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-sm font-semibold text-slate-800 font-mono">
                        {scoreFormatted}
                        <span className="text-[10px] font-normal text-slate-400">
                          /{item.maxMarks}
                        </span>
                      </span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${badgeClass}`}
                      >
                        {item.status}
                      </span>
                    </div>

                    {/* Expandable feedback when clicked */}
                    {isSelected && item.feedback && (
                      <div className="mt-2 pt-2 border-t border-slate-200/80 text-[11px] text-slate-600 font-normal leading-relaxed animate-in fade-in duration-150">
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
                Examiner Analytical Critique
              </h4>
            </div>
            <div className="bg-white border border-slate-200 rounded-md p-4 text-slate-600 text-sm leading-relaxed space-y-2 font-academic text-[15px]">
              <p>
                {examinerSummary ? (
                  `"${examinerSummary}"`
                ) : (
                  `"The candidate addresses foundational themes across the topic directive. However, structural rigor and analytical precision must be deepened to satisfy FPSC civil service examination benchmark standards."`
                )}
              </p>
            </div>
          </div>

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
        </div>
      )}

      {/* TAB 2: TOPPER REWRITES & HEADER UPGRADES */}
      {activeTab === 'rewrites' && (
        <div>
          <ParagraphRewriter
            rewrites={rewrites}
            headerUpgrades={headerUpgrades}
          />
        </div>
      )}

      {/* TAB 3: FACT AUDIT */}
      {activeTab === 'accuracy' && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2 mb-2">
            <BookOpen className="w-4 h-4 text-brand-600" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 font-sans">
              Historical, Institutional & Empirical Audit ({factChecks.length})
            </h4>
          </div>

          {factChecks.map((item, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${
                item.verified
                  ? 'bg-emerald-50/50 border-emerald-200 text-slate-700'
                  : 'bg-rose-50/50 border-rose-200 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    item.verified
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {item.verified ? '✓ Verified Fact' : '✗ Factual Discrepancy'}
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
                <div className="text-rose-700 font-sans pt-1">
                  <strong>Correction:</strong> {item.correctedFact}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: RULES & SCOPE */}
      {activeTab === 'directive' && (
        <div className="space-y-4 text-xs font-sans">
          {/* Directive Word & Timeframe */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              Prompt Qualifier & Scope Alignment
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Directive Qualifier</span>
                <strong className="text-slate-800">
                  {directiveAnalysis.directiveWord || 'Analytical Examination'}
                </strong>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Timeframe / Context</span>
                <strong className="text-slate-800">
                  {directiveAnalysis.targetTimeframe || 'Contemporary & Historical'}
                </strong>
              </div>
            </div>
            {directiveAnalysis.feedback && (
              <p className="text-slate-600 leading-relaxed pt-1">
                {directiveAnalysis.feedback}
              </p>
            )}
          </div>

          {/* Deal Breakers */}
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

      {/* TAB 5: ALL MISTAKES (CALLOUTS LIST) */}
      {activeTab === 'callouts' && (
        <div className="space-y-3 font-sans">
          {/* Filter Pills */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-1">
            <span className="text-xs text-slate-400">
              Showing {filteredAnnotations.length} annotations:
            </span>
            <div className="flex gap-1">
              {[
                { id: 'all', label: `All (${allAnnotations.length})` },
                { id: 'red', label: `Errors (${redCount})` },
                { id: 'amber', label: `Polish (${amberCount})` },
                { id: 'green', label: `Strengths (${greenCount})` }
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

          {/* Cards */}
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
                    {ann.category || 'Correction'}
                  </span>
                  <span className="text-[10px] text-slate-400">Click to view on paper</span>
                </div>

                <div className="font-academic text-[14px] text-slate-800">
                  <span className="line-through text-red-600 mr-2">
                    {ann.targetPhrase}
                  </span>
                  {ann.suggestion && (
                    <span className="text-[#007a64] font-semibold">
                      → {ann.suggestion}
                    </span>
                  )}
                </div>

                {ann.comment && (
                  <p className="text-slate-600 leading-relaxed">
                    {cleanSimpleText(ann.comment)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
