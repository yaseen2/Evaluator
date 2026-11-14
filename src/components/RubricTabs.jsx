import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Activity,
  Award,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { resolveSubjectProfile } from '../services/fpscRubrics';
import { ParagraphRewriter } from './ParagraphRewriter';
import {
  cleanSimpleText,
  formatLocationLabel,
  formatRoleLabel,
  simplifyCategoryTitle,
  isDiscrepantEvidenceAnnotation
} from '../utils/textUtils';

const GENRE_LABELS = {
  DESCRIPTIVE_ISSUE: 'Descriptive / Issue-Based',
  ARGUMENTATIVE_DEBATE: 'Argumentative Debate',
  RELATIONAL_TWO_CONCEPT: 'Relational Two-Concept ("A & B")',
  ABSTRACT_PHILOSOPHICAL: 'Abstract / Philosophical'
};

const PILLAR_DEV_FALLBACK = 'Outline blueprint depth audited in Macro Architecture.';

const sanitizePillarFeedback = (feedback = '') => {
  const raw = String(feedback || '').trim();
  if (!raw || raw === PILLAR_DEV_FALLBACK) {
    return 'Checks whether your outline covers political, economic, social, and global dimensions with concrete examples.';
  }
  return cleanSimpleText(raw);
};

const isEmptyThesisPlaceholder = (text = '') => {
  const cleaned = String(text || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();
  if (!cleaned) return true;
  return /^(?:not clearly stated|not stated|missing|none|n\/a|absent|not provided|no thesis statement found)\.?$/i.test(
    cleaned
  );
};

const formatSourceDomain = (src = '') => {
  try {
    const url = new URL(src);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return String(src || '');
  }
};

const getStatusToneClass = (status = '') => {
  const s = String(status || '').toLowerCase();
  if (
    s.includes('strong') ||
    s.includes('satisfactory') ||
    s.includes('excellent') ||
    s.includes('aligned') ||
    s.includes('ready')
  ) {
    return 'studio-pill studio-pill-strong';
  }
  if (
    s.includes('missing') ||
    s.includes('absent') ||
    s.includes('critical') ||
    s.includes('fragmented') ||
    s.includes('deficient') ||
    s.includes('fatal') ||
    s.includes('weak draft') ||
    s.includes('serious mistakes') ||
    s.includes('low') ||
    s.includes('incomplete')
  ) {
    return 'studio-pill studio-pill-critical';
  }
  if (
    s.includes('partial') ||
    s.includes('informal') ||
    s.includes('developing') ||
    s.includes('moderate') ||
    s.includes('polish') ||
    s.includes('balanced') ||
    s.includes('fair draft') ||
    s.includes('major mistakes')
  ) {
    return 'studio-pill studio-pill-warning';
  }
  return 'studio-pill';
};

const getStatusDotColor = (status = '') => {
  const s = String(status || '').toLowerCase();
  if (
    s.includes('strong') ||
    s.includes('satisfactory') ||
    s.includes('excellent') ||
    s.includes('aligned') ||
    s.includes('ready')
  ) {
    return '#10b981';
  }
  if (
    s.includes('missing') ||
    s.includes('absent') ||
    s.includes('critical') ||
    s.includes('fragmented') ||
    s.includes('deficient') ||
    s.includes('fatal') ||
    s.includes('weak draft') ||
    s.includes('serious mistakes') ||
    s.includes('low') ||
    s.includes('incomplete')
  ) {
    return '#e11d48';
  }
  if (
    s.includes('partial') ||
    s.includes('informal') ||
    s.includes('developing') ||
    s.includes('moderate') ||
    s.includes('polish') ||
    s.includes('balanced') ||
    s.includes('fair draft') ||
    s.includes('major mistakes')
  ) {
    return '#d97706';
  }
  return '#64748b';
};

export const RubricTabs = ({ evaluation, selectedAnnId, onSelectAnnId, isAdmin = false }) => {
  const [activeTab, setActiveTab] = useState('report'); // 'report' | 'rewrites' | 'accuracy' | 'directive' | 'callouts' | 'agent_log'
  const [expandedParamIds, setExpandedParamIds] = useState({});
  const [calloutFilter, setCalloutFilter] = useState('all'); // 'all' | 'tier1' | 'tier2' | 'polish' | 'green'
  const cardRefs = useRef({});
  const agentTrace = evaluation?.agentTrace || null;
  const tokenStages = evaluation?.tokenUsage?.stages || agentTrace?.tokenStages || [];
  const showAgentLog = Boolean(isAdmin);

  if (!evaluation) return null;

  const profile = resolveSubjectProfile(evaluation.subject, {
    essayMode: evaluation.essayMode,
    archetypeId: evaluation.archetypeId
  });

  const isNonScoredEssay =
    evaluation.isNonScoredEssay === true ||
    profile.scored === false ||
    (evaluation.subject || '').toLowerCase().includes('essay');

  const isOutlineOnlySubmission =
    evaluation.essayMode === 'outline_only' ||
    evaluation.isOutlineOnly === true ||
    evaluation.archetypeId === 'essay_outline';

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
  const greenCount = allAnnotations.filter((a) => a.type === 'green').length;

  const isTier1 = (a) => a.tier === 'TIER_1_FATAL' || a.tier === 'TIER_1_DEAL_BREAKER';
  const isTier2 = (a) =>
    a.tier === 'TIER_2_MAJOR' ||
    a.tier === 'TIER_2_MAJOR_FLAW' ||
    (a.type === 'red' && !isTier1(a));
  const isPolish = (a) =>
    a.tier === 'TIER_3_POLISH' || (a.type === 'amber' && !isTier1(a) && !isTier2(a));
  const isGreen = (a) =>
    a.type === 'green' || a.tier === 'EARNED_SIGNIFIER' || a.tier === 'EARNED_STRENGTH';

  const tier1AnnCount = allAnnotations.filter(isTier1).length;
  const tier2AnnCount = allAnnotations.filter(isTier2).length;
  const tier3AnnCount = allAnnotations.filter(isPolish).length;

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
    if (activeTab === 'accuracy' && factChecks.length === 0) {
      setActiveTab('report');
    }
  }, [activeTab, factChecks.length]);

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

  // Compute Rubric Breakdown Parameters (Qualitative for Essay vs. Scored for 20-Mark Subjective)
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
        feedback: sanitizePillarFeedback(saved.feedback || comp.defaultFeedback)
      };
    });
  }, [profile.breakdown, breakdown, evaluation, redCount, isNonScoredEssay]);

  // Auto-expand urgent critical/missing parameters when viewing a new evaluation
  useEffect(() => {
    const initial = {};
    displayParameters.forEach((p) => {
      const s = String(p.status || '').toLowerCase();
      if (s.includes('critical') || s.includes('missing') || s.includes('absent') || s.includes('fatal')) {
        initial[p.id] = true;
      }
    });
    setExpandedParamIds(initial);
  }, [evaluation?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleParamRow = (paramId) => {
    setExpandedParamIds((prev) => ({ ...prev, [paramId]: !prev[paramId] }));
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
        title: 'Write Every Outline Point in the Essay',
        description: `Include full paragraphs for every point listed in your outline (for example: ${cleanSimpleText(
          evaluation.outlineAlignment.missingFromBody[0]
        )}).`
      });
    }
    if (steps.length < 3 && evaluation.thesisAudit?.status === 'Needs Polish') {
      steps.push({
        title: 'Write a Clear Main Argument',
        description:
          'At the end of your introduction, clearly state your main point of view in one or two direct sentences.'
      });
    }

    if (steps.length === 0) {
      steps.push(
        {
          title: 'Use Clear, Natural English',
          description: 'Avoid casual phrases and write in clean, formal sentences.'
        },
        {
          title: 'Write a Clear Main Argument',
          description: 'State your main answer to the topic clearly at the end of your introduction.'
        },
        {
          title: 'Make Outline Points Specific',
          description: 'Write clear, complete outline points so your essay plan is easy to follow.'
        }
      );
    }

    return steps.slice(0, 3);
  }, [evaluation]);

  const topicTitle = evaluation.topic || evaluation.examQuestion || 'Your Essay';
  const genreDisplay = evaluation.essayGenre
    ? GENRE_LABELS[evaluation.essayGenre] || evaluation.essayGenre
    : null;

  const showPacingMetric =
    !isOutlineOnlySubmission &&
    evaluation.pacingMetrics &&
    typeof evaluation.pacingMetrics.decayPercent === 'number' &&
    (evaluation.pacingMetrics.evaluatedParagraphCount || 0) >= 4;

  const headerMetaParts = [
    genreDisplay,
    typeof evaluation.requiresCounterArgument === 'boolean'
      ? evaluation.requiresCounterArgument
        ? 'Counter-Argument Required'
        : 'Issue Analysis'
      : null,
    showPacingMetric
      ? `2nd-Half Pacing: ${evaluation.pacingMetrics.decayPercent >= 0 ? '+' : ''}${
          evaluation.pacingMetrics.decayPercent
        }%`
      : null
  ].filter(Boolean);

  const extractedThesisRaw =
    evaluation.thesisAudit?.extractedThesis || evaluation.thesisAudit?.candidateThesis || '';
  const hasRealThesisQuote = !isEmptyThesisPlaceholder(extractedThesisRaw);

  return (
    <div className="w-full font-sans">
      {/* Sleek Minimal Underline Tab Bar (Zero Horizontal Scrollbar) */}
      <nav className="studio-tabs-bar" aria-label="Evaluation views">
        <div className="studio-tabs-list">
          <button
            type="button"
            className={`studio-tab-btn ${activeTab === 'report' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('report')}
          >
            <span>Overview</span>
          </button>

          <button
            type="button"
            className={`studio-tab-btn ${activeTab === 'rewrites' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('rewrites')}
          >
            <span>Rewrites</span>
            <span className="studio-tab-count">{totalUpgradesCount}</span>
          </button>

          {factChecks.length > 0 && (
            <button
              type="button"
              className={`studio-tab-btn ${activeTab === 'accuracy' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('accuracy')}
            >
              <span>Facts</span>
              <span className="studio-tab-count">{factChecks.length}</span>
            </button>
          )}

          <button
            type="button"
            className={`studio-tab-btn ${activeTab === 'directive' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('directive')}
          >
            <span>Topic Rules</span>
          </button>

          <button
            type="button"
            className={`studio-tab-btn ${activeTab === 'callouts' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('callouts')}
          >
            <span>Notes</span>
            <span className="studio-tab-count">{allAnnotations.length}</span>
          </button>
        </div>

        {showAgentLog && (
          <button
            type="button"
            className={`studio-tab-btn ${activeTab === 'agent_log' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('agent_log')}
            title="Admin Only: Pipeline Agent Trace"
          >
            <Activity size={13} />
            <span>Log</span>
          </button>
        )}
      </nav>

      {/* TAB 1: EDITORIAL MINIMAL OVERVIEW REPORT */}
      {activeTab === 'report' && (
        <div className="space-y-6">
          {/* Calm Header & Single Interpunct Metadata Line */}
          <header className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="studio-section-eyebrow" style={{ color: 'var(--accent-blue)' }}>
                  {isOutlineOnlySubmission
                    ? 'Outline Review'
                    : isNonScoredEssay
                    ? 'Essay Report'
                    : 'Paper Report'}
                </span>
                {evaluation.overallReadiness && (
                  <span className={getStatusToneClass(evaluation.overallReadiness)}>
                    {evaluation.overallReadiness}
                  </span>
                )}
              </div>
              <span className="text-xs studio-text-muted font-mono tabular-nums">
                {evaluation.wordCount || 0} words
              </span>
            </div>

            <h2 className="text-xl xl:text-[22px] font-academic font-medium studio-text-primary leading-snug">
              {topicTitle}
            </h2>

            {headerMetaParts.length > 0 && (
              <p className="text-xs studio-text-muted leading-relaxed">
                {headerMetaParts.join(' · ')}
              </p>
            )}
          </header>

          {/* Hairline 4-Column Diagnostic KPI Strip */}
          {isNonScoredEssay && (
            <div className="studio-surface studio-kpi-grid" role="group" aria-label="Issue counts">
              <button
                type="button"
                onClick={() => handleTierFilterJump('tier1')}
                className={`studio-kpi-cell ${tier1Count === 0 ? 'opacity-45' : ''}`}
                title="View Serious Mistakes"
              >
                <span className="studio-kpi-value">{tier1Count}</span>
                <span className="studio-kpi-label">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 inline-block" />
                  <span>Serious</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTierFilterJump('tier2')}
                className={`studio-kpi-cell ${tier2Count === 0 ? 'opacity-45' : ''}`}
                title="View Major Mistakes"
              >
                <span className="studio-kpi-value">{tier2Count}</span>
                <span className="studio-kpi-label">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" />
                  <span>Major</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTierFilterJump('polish')}
                className={`studio-kpi-cell ${tier3Count === 0 ? 'opacity-45' : ''}`}
                title="View Writing Tips"
              >
                <span className="studio-kpi-value">{tier3Count}</span>
                <span className="studio-kpi-label">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                  <span>Tips</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTierFilterJump('green')}
                className={`studio-kpi-cell ${earnedSignifiersList.length === 0 ? 'opacity-45' : ''}`}
                title="View Strong Points"
              >
                <span className="studio-kpi-value">{earnedSignifiersList.length}</span>
                <span className="studio-kpi-label">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  <span>Strong</span>
                </span>
              </button>
            </div>
          )}

          {/* Editorial Summary (Action-First Order) */}
          <section className="space-y-2" data-purpose="examiner-critique">
            <h4 className="studio-section-eyebrow">Overall Feedback</h4>
            <div className="studio-summary-quote font-academic text-[15px] leading-relaxed">
              <p>
                {examinerSummary
                  ? cleanSimpleText(examinerSummary)
                  : 'Your essay covers the main topic, but stronger structure, clearer examples, and cleaner sentences will improve your overall standard.'}
              </p>
            </div>
          </section>

          {/* Actionable Top Steps */}
          <section className="space-y-2.5" data-purpose="actionable-directives">
            <h4 className="studio-section-eyebrow">Next Steps to Improve</h4>
            <ol className="studio-surface studio-list-divided overflow-hidden">
              {remedialSteps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-3 px-3.5 py-3 text-xs leading-relaxed">
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full font-semibold text-[11px] flex-shrink-0 mt-0.5 tabular-nums"
                    style={{
                      background: 'var(--accent-blue-soft)',
                      color: 'var(--accent-blue)'
                    }}
                  >
                    {idx + 1}
                  </span>
                  <div className="studio-text-secondary">
                    <strong className="studio-text-primary font-semibold">
                      {cleanSimpleText(step.title)}:{' '}
                    </strong>
                    {cleanSimpleText(step.description)}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Full-Width Expandable Checklist Accordion (Zero Truncation, Zero Orphan Cells) */}
          <section className="space-y-2.5" data-purpose="rubric-matrix">
            <div className="flex items-center justify-between gap-2">
              <h4 className="studio-section-eyebrow">
                {isNonScoredEssay ? 'Essay Checklist' : 'Score Breakdown'}
              </h4>
              <span className="text-[11px] font-mono studio-text-muted">
                {displayParameters.length} Pillars
              </span>
            </div>

            <div className="studio-surface studio-list-divided overflow-hidden">
              {displayParameters.map((item) => {
                const isExpanded = Boolean(expandedParamIds[item.id]);
                const scoreFormatted =
                  typeof item.score === 'number'
                    ? String(Math.round(item.score)).padStart(2, '0')
                    : null;

                return (
                  <div key={item.id}>
                    <button
                      type="button"
                      onClick={() => toggleParamRow(item.id)}
                      aria-expanded={isExpanded}
                      className="studio-checklist-row"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: getStatusDotColor(item.status) }}
                        />
                        <span className="text-xs font-semibold studio-text-primary truncate">
                          {item.cleanName}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!isNonScoredEssay && scoreFormatted !== null && (
                          <span className="text-xs font-mono font-semibold studio-text-primary">
                            {scoreFormatted}
                            <span className="studio-text-muted font-normal">/{item.maxMarks}</span>
                          </span>
                        )}
                        <span className={getStatusToneClass(item.status)}>{item.status}</span>
                        {isExpanded ? (
                          <ChevronDown size={14} className="studio-text-muted" />
                        ) : (
                          <ChevronRight size={14} className="studio-text-muted" />
                        )}
                      </div>
                    </button>

                    {isExpanded && item.feedback && (
                      <div className="px-4 pb-3.5 pt-0.5 pl-8 text-xs studio-text-secondary leading-relaxed">
                        {item.feedback}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Strong Points (Shown Only When Earned, Without Emoji Noise) */}
          {earnedSignifiersList.length > 0 && (
            <section className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h4 className="studio-section-eyebrow flex items-center gap-1.5">
                  <Award size={13} style={{ color: 'var(--pass-green)' }} />
                  <span>Strong Points ({earnedSignifiersList.length})</span>
                </h4>
              </div>
              <div className="space-y-2">
                {earnedSignifiersList.slice(0, 4).map((sig, idx) => (
                  <div
                    key={idx}
                    className="studio-surface p-3.5 text-xs space-y-1"
                    style={{ borderLeft: '3px solid var(--pass-green)' }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="text-[10.5px] font-bold uppercase tracking-wider"
                        style={{ color: 'var(--pass-green)' }}
                      >
                        {simplifyCategoryTitle(sig.category, { type: 'green' })}
                      </span>
                      {sig.location_id && (
                        <span className="text-[11px] studio-text-muted">
                          {formatLocationLabel(sig.location_id)}
                        </span>
                      )}
                    </div>
                    {sig.exact_verbatim_quote && (
                      <p className="font-academic studio-text-primary italic text-[13.5px]">
                        "{sig.exact_verbatim_quote}"
                      </p>
                    )}
                    {sig.observation && (
                      <p className="studio-text-secondary leading-relaxed">
                        {cleanSimpleText(sig.observation)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Thesis Statement Audit (Cleanly Nested Without Empty Quote Box) */}
          {evaluation.thesisAudit && (
            <section className="studio-surface p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="studio-section-eyebrow">Thesis Statement</h4>
                <div className="flex items-center gap-1.5">
                  {!hasRealThesisQuote && (
                    <span className="studio-pill">Not found in script</span>
                  )}
                  {evaluation.thesisAudit.status && (
                    <span className={getStatusToneClass(evaluation.thesisAudit.status)}>
                      {evaluation.thesisAudit.status}
                    </span>
                  )}
                </div>
              </div>

              {hasRealThesisQuote && (
                <div className="studio-surface-subtle px-3 py-2 font-academic text-[13.5px] italic studio-text-primary">
                  "{extractedThesisRaw}"
                </div>
              )}

              {evaluation.thesisAudit.critique && (
                <p className="studio-text-secondary leading-relaxed">
                  {cleanSimpleText(evaluation.thesisAudit.critique)}
                </p>
              )}

              {evaluation.thesisAudit.modelTopperThesis && (
                <div className="studio-sample-block space-y-1">
                  <div
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: 'var(--pass-green)' }}
                  >
                    Sample Thesis Statement
                  </div>
                  <p className="font-academic text-[13.5px] leading-relaxed studio-text-primary">
                    "{evaluation.thesisAudit.modelTopperThesis}"
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Outline-to-Body Synchronization */}
          {evaluation.outlineAlignment && (
            <section className="studio-surface p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="studio-section-eyebrow">Outline &amp; Essay Alignment</h4>
                {evaluation.outlineAlignment.status && (
                  <span className={getStatusToneClass(evaluation.outlineAlignment.status)}>
                    {evaluation.outlineAlignment.status}
                  </span>
                )}
              </div>

              {evaluation.outlineAlignment.summary && (
                <p className="studio-text-secondary leading-relaxed">
                  {cleanSimpleText(evaluation.outlineAlignment.summary)}
                </p>
              )}

              {evaluation.outlineAlignment.bodyHeadingWarning && (
                <div className="studio-diff-before text-[11.5px] studio-text-secondary">
                  <strong className="studio-text-primary">Important: </strong>
                  {cleanSimpleText(evaluation.outlineAlignment.bodyHeadingWarning)}
                </div>
              )}

              {evaluation.outlineAlignment.missingFromBody?.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div
                    className="text-[10.5px] font-bold uppercase tracking-wider"
                    style={{ color: 'var(--fail-red)' }}
                  >
                    Outline Points Skipped in Essay
                  </div>
                  <ul className="list-disc pl-4 studio-text-secondary space-y-0.5">
                    {evaluation.outlineAlignment.missingFromBody.map((m, i) => (
                      <li key={i}>{cleanSimpleText(m)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {evaluation.outlineAlignment.orphanBodyParagraphs?.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div
                    className="text-[10.5px] font-bold uppercase tracking-wider"
                    style={{ color: 'var(--warning-amber)' }}
                  >
                    Essay Paragraphs Not in Your Outline
                  </div>
                  <ul className="list-disc pl-4 studio-text-secondary space-y-0.5">
                    {evaluation.outlineAlignment.orphanBodyParagraphs.map((m, i) => (
                      <li key={i}>{cleanSimpleText(m)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* Paragraph Role Map & Key Phrases */}
          {((evaluation.paragraphRoleMap && Object.keys(evaluation.paragraphRoleMap).length > 0) ||
            (evaluation.strategicHighlightingPicks &&
              evaluation.strategicHighlightingPicks.length > 0)) && (
            <section className="studio-surface p-4 space-y-3 text-xs">
              {evaluation.paragraphRoleMap && Object.keys(evaluation.paragraphRoleMap).length > 0 && (
                <div className="space-y-2">
                  <h4 className="studio-section-eyebrow">Paragraph-by-Paragraph Map</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(evaluation.paragraphRoleMap).map(([pId, role]) => (
                      <span key={pId} className="studio-pill">
                        <strong className="studio-text-primary">{formatLocationLabel(pId)}:</strong>{' '}
                        {formatRoleLabel(role)}
                      </span>
                    ))}
                  </div>
                  {!isOutlineOnlySubmission && evaluation.pacingMetrics?.summary && (
                    <p className="text-[11.5px] studio-text-muted pt-0.5">
                      {cleanSimpleText(evaluation.pacingMetrics.summary)}
                    </p>
                  )}
                </div>
              )}

              {evaluation.strategicHighlightingPicks?.length > 0 && (
                <div
                  className={`space-y-2 ${
                    evaluation.paragraphRoleMap && Object.keys(evaluation.paragraphRoleMap).length > 0
                      ? 'pt-3 border-t border-[var(--border)]'
                      : ''
                  }`}
                >
                  <h4 className="studio-section-eyebrow">
                    {isOutlineOnlySubmission
                      ? 'Key Phrases to Emphasize'
                      : 'Key Phrases to Underline in the Exam'}
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {evaluation.strategicHighlightingPicks.map((phrase, idx) => (
                      <span key={idx} className="studio-pill font-medium studio-text-primary">
                        "{phrase}"
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Paper Layout Check (Strict Student View Only — Admin QA Telemetry Lives Exclusively in Log Tab) */}
          {evaluation.handwritingAudit && (
            <section className="studio-surface-subtle p-3.5 space-y-1.5 text-xs">
              <h4 className="studio-section-eyebrow">Paper Layout Check</h4>
              <p className="studio-text-secondary leading-relaxed">
                Margins:{' '}
                <strong className="studio-text-primary">
                  {evaluation.handwritingAudit.marginsRespected
                    ? 'Clean'
                    : 'Leave Neater Side Margins'}
                </strong>{' '}
                · Paragraph Indents:{' '}
                <strong className="studio-text-primary">
                  {evaluation.handwritingAudit.indentationConsistent
                    ? 'Consistent'
                    : 'Start Each Paragraph Slightly Indented'}
                </strong>
                {evaluation.handwritingAudit.samePageOutlineBodyStart
                  ? ' · Tip: Start the Essay Introduction on a fresh page after your Outline.'
                  : ''}
              </p>
            </section>
          )}
        </div>
      )}

      {/* TAB 2: REWRITES & HEADING UPGRADES */}
      {activeTab === 'rewrites' && (
        <ParagraphRewriter rewrites={rewrites} headerUpgrades={headerUpgrades} />
      )}

      {/* TAB 3: FACT CHECK */}
      {activeTab === 'accuracy' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="studio-section-eyebrow flex items-center gap-1.5">
              <BookOpen size={13} style={{ color: 'var(--accent-blue)' }} />
              <span>Fact &amp; Reference Check ({factChecks.length})</span>
            </h4>
          </div>

          {factChecks.map((item, idx) => {
            const isUnverifiedQuote = item.status === 'UNVERIFIED_CITATION';
            const badgeClass = item.verified
              ? 'studio-pill studio-pill-strong'
              : isUnverifiedQuote
              ? 'studio-pill studio-pill-warning'
              : 'studio-pill studio-pill-critical';

            return (
              <div key={idx} className="studio-surface p-3.5 text-xs space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className={badgeClass}>
                    {item.verified
                      ? 'Verified Fact'
                      : isUnverifiedQuote
                      ? 'Unverified Quote'
                      : 'Needs Correction'}
                  </span>
                  {item.source && (
                    <span className="text-[11px] studio-text-muted font-mono">
                      Source: {item.source}
                    </span>
                  )}
                </div>

                <p className="font-medium studio-text-primary font-academic text-[14px] leading-snug">
                  "{item.claim}"
                </p>

                {item.correctedFact && (
                  <p
                    className="leading-relaxed"
                    style={{
                      color: isUnverifiedQuote ? 'var(--warning-amber)' : 'var(--fail-red)'
                    }}
                  >
                    <strong>{isUnverifiedQuote ? 'Note:' : 'Correction:'}</strong>{' '}
                    <span className="studio-text-secondary">
                      {cleanSimpleText(item.correctedFact)}
                    </span>
                  </p>
                )}
              </div>
            );
          })}

          {evaluation.searchSources?.length > 0 && (
            <div className="studio-surface-subtle p-3.5 text-xs space-y-2">
              <div className="studio-section-eyebrow">
                Verification Sources ({evaluation.searchSources.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {evaluation.searchSources.map((src, idx) => (
                  <a
                    key={idx}
                    href={src.startsWith('http') ? src : undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="studio-pill hover:underline max-w-[220px]"
                    title={src}
                  >
                    <span className="truncate">{formatSourceDomain(src)}</span>
                    <ExternalLink size={10} />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: TOPIC RULES */}
      {activeTab === 'directive' && (
        <div className="space-y-4 text-xs">
          <div className="studio-surface p-4 space-y-3">
            <h4 className="studio-section-eyebrow">Topic Breakdown</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="studio-surface-subtle p-2.5 space-y-0.5">
                <span className="studio-text-muted block text-[10.5px]">Essay Type</span>
                <strong className="studio-text-primary text-xs font-semibold">
                  {genreDisplay || directiveAnalysis.directiveWord || 'Analytical Essay'}
                </strong>
              </div>
              <div className="studio-surface-subtle p-2.5 space-y-0.5">
                <span className="studio-text-muted block text-[10.5px]">Timeframe / Focus</span>
                <strong className="studio-text-primary text-xs font-semibold">
                  {directiveAnalysis.targetTimeframe || 'Contemporary & Historical'}
                </strong>
              </div>
            </div>

            {evaluation.genreRationale && (
              <p className="studio-text-secondary leading-relaxed">
                {cleanSimpleText(evaluation.genreRationale)}
              </p>
            )}
            {directiveAnalysis.feedback && (
              <p className="studio-text-secondary leading-relaxed">
                {cleanSimpleText(directiveAnalysis.feedback)}
              </p>
            )}
          </div>

          <div className="studio-surface p-4 space-y-2.5">
            <h4 className="studio-section-eyebrow flex items-center gap-1.5">
              <ShieldAlert size={13} style={{ color: 'var(--fail-red)' }} />
              <span>Common Mistakes to Avoid</span>
            </h4>
            <ul className="space-y-2 studio-text-secondary">
              {dealBreakers.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                    style={{ background: 'var(--fail-red)' }}
                  />
                  <span>{cleanSimpleText(rule)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* TAB 5: ALL INLINE NOTES LIST */}
      {activeTab === 'callouts' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs studio-text-muted tabular-nums">
              {filteredAnnotations.length} {filteredAnnotations.length === 1 ? 'note' : 'notes'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: `All (${allAnnotations.length})`, dot: null },
                { id: 'tier1', label: `Serious (${tier1AnnCount})`, dot: '#e11d48' },
                { id: 'tier2', label: `Major (${tier2AnnCount})`, dot: '#f97316' },
                { id: 'polish', label: `Tips (${tier3AnnCount})`, dot: '#f59e0b' },
                { id: 'green', label: `Strong (${greenCount})`, dot: '#10b981' }
              ].map((f) => {
                const active = calloutFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setCalloutFilter(f.id)}
                    className={`studio-filter-btn ${active ? 'is-active' : ''}`}
                  >
                    {f.dot && (
                      <span
                        className="w-1.5 h-1.5 rounded-full inline-block"
                        style={{ background: f.dot }}
                      />
                    )}
                    <span>{f.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {filteredAnnotations.length === 0 ? (
            <div className="studio-surface p-6 text-center text-xs studio-text-muted">
              No notes match this filter.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredAnnotations.map((ann) => {
                const origIdx = allAnnotations.indexOf(ann);
                const annId = ann.id || `ann-${origIdx >= 0 ? origIdx : 0}`;
                const isSelected =
                  selectedAnnId === annId || selectedAnnId === `ann-${ann.targetPhrase}`;
                const isEvidenceErr = isDiscrepantEvidenceAnnotation(ann);

                const selectedRingClass = isSelected
                  ? ann.type === 'green'
                    ? 'is-selected-good'
                    : isEvidenceErr || ann.type === 'red'
                    ? 'is-selected-error'
                    : 'is-selected-polish'
                  : '';

                const badgeClass =
                  isEvidenceErr || ann.type === 'red'
                    ? 'studio-pill studio-pill-critical'
                    : ann.type === 'green'
                    ? 'studio-pill studio-pill-strong'
                    : 'studio-pill studio-pill-warning';

                return (
                  <div
                    key={annId}
                    ref={(el) => (cardRefs.current[annId] = el)}
                    onClick={() => onSelectAnnId && onSelectAnnId(annId)}
                    className={`studio-callout-card text-xs space-y-1.5 ${selectedRingClass}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={badgeClass}>
                        {simplifyCategoryTitle(ann.category, ann)}
                      </span>
                      <span className="text-[11px] studio-text-muted text-right">
                        {ann.locationId ? `${formatLocationLabel(ann.locationId)} · ` : ''}View
                      </span>
                    </div>

                    <div className="font-academic text-[14px] studio-text-primary">
                      <span
                        className={
                          ann.type === 'green'
                            ? 'font-medium'
                            : isEvidenceErr
                            ? 'font-semibold underline decoration-red-500/80'
                            : 'font-medium underline decoration-wavy decoration-red-400'
                        }
                        style={{
                          color:
                            ann.type === 'green'
                              ? 'var(--pass-green)'
                              : isEvidenceErr || ann.type === 'red'
                              ? 'var(--fail-red)'
                              : 'var(--warning-amber)'
                        }}
                      >
                        {ann.targetPhrase}
                      </span>
                    </div>

                    {ann.comment && (
                      <p className="studio-text-secondary leading-relaxed">
                        {cleanSimpleText(ann.comment)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: ADMIN ONLY PIPELINE AGENT LOG */}
      {activeTab === 'agent_log' && showAgentLog && (
        <div className="space-y-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-emerald-400">
                <Activity size={14} />
                <span>Admin Only • Full Agent Pipeline Log</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                  Rubric v{evaluation.rubricVersion || 'legacy'}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                  Mode: {evaluation.essayMode || (evaluation.isOutlineOnly ? 'OUTLINE_ONLY' : 'FULL_ESSAY')}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Complete internal trace: OCR extraction, structural outline/paragraph split, raw agent diagnostics, QA false-positive deletions, Google Search grounding links, final pillar decisions, and token usage.
            </p>
          </div>

          {!agentTrace && (
            <div className="studio-surface p-3 text-[11.5px] studio-text-secondary">
              Note: This essay was evaluated before full per-agent tracing was saved. Showing all saved metadata below.
            </div>
          )}

          {/* Stage 0: Vision OCR & Layout */}
          <div className="studio-surface p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="studio-section-eyebrow studio-text-primary">
                Stage 0 • Vision OCR &amp; Layout Check
              </span>
              <span className="studio-pill font-mono">
                {agentTrace?.stage0_ocr
                  ? agentTrace.stage0_ocr.skipped
                    ? 'Typed Text'
                    : `${agentTrace.stage0_ocr.pagesProcessed || 0} Scanned Pages`
                  : evaluation.handwritingAudit
                  ? 'Scanned Pages'
                  : 'Typed / Legacy'}
              </span>
            </div>
            {agentTrace?.stage0_ocr?.detectedTitle && (
              <div className="text-[11px] studio-text-secondary">
                Detected Title: <strong className="studio-text-primary">{agentTrace.stage0_ocr.detectedTitle}</strong>
              </div>
            )}
            {(agentTrace?.stage0_ocr?.handwritingAudit || evaluation.handwritingAudit) && (() => {
              const hw = agentTrace?.stage0_ocr?.handwritingAudit || evaluation.handwritingAudit;
              return (
                <div className="studio-surface-subtle text-[11px] studio-text-secondary p-2.5">
                  Margins: <strong className="studio-text-primary">{hw.marginsRespected ? 'Clean' : 'Needs Improvement'}</strong> •{' '}
                  Indentation: <strong className="studio-text-primary">{hw.indentationConsistent ? 'Consistent' : 'Inconsistent'}</strong> •{' '}
                  Excessive Scratch-outs: <strong className="studio-text-primary">{hw.excessiveScratchOuts ? 'Yes' : 'No'}</strong> •{' '}
                  Outline &amp; Body Same Page: <strong className="studio-text-primary">{hw.samePageOutlineBodyStart ? 'Yes' : 'No'}</strong>
                  {hw.observations ? <div className="pt-1 studio-text-muted">{hw.observations}</div> : null}
                </div>
              );
            })()}
            {(agentTrace?.rawOcrText || evaluation.rawText) && (
              <details>
                <summary className="cursor-pointer text-[11px] font-semibold hover:underline" style={{ color: 'var(--accent-blue)' }}>
                  View Exact OCR / Submitted Text ({(agentTrace?.rawOcrText || evaluation.rawText).length.toLocaleString()} chars)
                </summary>
                <pre className="mt-2 p-2.5 rounded bg-slate-900 text-slate-100 text-[10px] font-mono whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed">
                  {agentTrace?.rawOcrText || evaluation.rawText}
                </pre>
              </details>
            )}
          </div>

          {/* Stage 0B: Structural Indexer & Splitter */}
          {agentTrace?.stage0b_splitter && (
            <div className="studio-surface p-3.5 space-y-2">
              <div className="studio-section-eyebrow studio-text-primary">
                Stage 0B • Outline &amp; Paragraph Splitter
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="studio-surface-subtle p-2">
                  <div className="studio-text-muted">Outline Points</div>
                  <div className="font-bold studio-text-primary font-mono">
                    {agentTrace.stage0b_splitter.outlineCount} ({agentTrace.stage0b_splitter.outlineWordCount}w)
                  </div>
                </div>
                <div className="studio-surface-subtle p-2">
                  <div className="studio-text-muted">Body Paragraphs</div>
                  <div className="font-bold studio-text-primary font-mono">
                    {agentTrace.stage0b_splitter.paragraphCount} ({agentTrace.stage0b_splitter.bodyWordCount}w)
                  </div>
                </div>
                <div className="studio-surface-subtle p-2">
                  <div className="studio-text-muted">Total Words</div>
                  <div className="font-bold studio-text-primary font-mono">
                    {agentTrace.stage0b_splitter.totalWordCount}w
                  </div>
                </div>
                <div className="studio-surface-subtle p-2">
                  <div className="studio-text-muted">AI Re-Split?</div>
                  <div className="font-bold studio-text-primary font-mono">
                    {agentTrace.stage0b_splitter.aiBoundaryAdjusted ? 'Yes (Fixed)' : 'Clean Split'}
                  </div>
                </div>
              </div>
              {agentTrace.stage0b_splitter.inlineHeadingsCaught > 0 && (
                <div className="text-[11px]" style={{ color: 'var(--warning-amber)' }}>
                  Inline Headings Caught Inside Essay Body: {agentTrace.stage0b_splitter.inlineHeadingsCaught}
                </div>
              )}
              {(agentTrace.outlineNodes?.length > 0 || agentTrace.paragraphs?.length > 0) && (
                <details>
                  <summary className="cursor-pointer text-[11px] font-semibold hover:underline" style={{ color: 'var(--accent-blue)' }}>
                    View Parsed Structure ({agentTrace.outlineNodes?.length || 0} Outline lines • {agentTrace.paragraphs?.length || 0} Body paragraphs)
                  </summary>
                  <div className="mt-2 space-y-2 max-h-56 overflow-y-auto pr-1 text-[11px]">
                    {agentTrace.outlineNodes?.length > 0 && (
                      <div className="studio-surface-subtle p-2 space-y-0.5 font-mono text-[10px]">
                        <div className="font-sans font-bold studio-text-primary mb-1">Outline Nodes:</div>
                        {agentTrace.outlineNodes.map((o, idx) => (
                          <div key={idx} className="studio-text-secondary">
                            <span className="font-bold" style={{ color: 'var(--accent-blue)' }}>{o.id}:</span> {o.text}
                          </div>
                        ))}
                      </div>
                    )}
                    {agentTrace.paragraphs?.length > 0 && (
                      <div className="studio-surface-subtle p-2 space-y-1 font-mono text-[10px]">
                        <div className="font-sans font-bold studio-text-primary">Paragraph Slices:</div>
                        {agentTrace.paragraphs.map((p, idx) => (
                          <div key={idx} className="studio-text-secondary">
                            <span className="font-bold" style={{ color: 'var(--accent-blue)' }}>{p.id}</span> ({p.wordCount}w, {p.sentenceCount}s): {p.preview}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          )}

          {/* Stage 1: Agent 1 Macro & Outline Alignment */}
          <div className="studio-surface p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="studio-section-eyebrow studio-text-primary">
                Agent 1 • Big-Picture, Topic Scope &amp; Outline Alignment
              </span>
              <span className="studio-pill font-mono">
                {agentTrace?.stage1_macro?.rawFlagsCount ?? 0} raw flags
              </span>
            </div>
            <div className="text-[11px] studio-text-secondary space-y-1">
              <div>
                Genre: <strong className="studio-text-primary">{agentTrace?.stage1_macro?.essayGenre || evaluation.essayGenre || 'General'}</strong> •{' '}
                Counter-Argument Needed:{' '}
                <strong className="studio-text-primary">
                  {(agentTrace?.stage1_macro?.requiresCounterArgument ?? evaluation.requiresCounterArgument) ? 'Yes' : 'No / Optional'}
                </strong>
              </div>
              {(agentTrace?.stage1_macro?.directiveAnalysis || evaluation.directiveAnalysis) && (() => {
                const da = agentTrace?.stage1_macro?.directiveAnalysis || evaluation.directiveAnalysis;
                return (
                  <div>
                    Scope: <strong className="studio-text-primary">{da.directiveWord || 'N/A'}</strong> ({da.targetTimeframe || 'N/A'}) — {da.feedback || ''}
                  </div>
                );
              })()}
              {(agentTrace?.stage1_macro?.genreRationale || evaluation.genreRationale) && (
                <div>
                  Rationale: {agentTrace?.stage1_macro?.genreRationale || evaluation.genreRationale}
                </div>
              )}
              {(agentTrace?.stage1_macro?.thesisAudit || evaluation.thesisAudit) && (() => {
                const ta = agentTrace?.stage1_macro?.thesisAudit || evaluation.thesisAudit;
                return (
                  <div className="studio-surface-subtle p-2 space-y-0.5">
                    <div>
                      <strong className="studio-text-primary">Thesis Audit ({ta.status}):</strong> {ta.critique}
                    </div>
                    {ta.extractedThesis && <div className="italic studio-text-muted">Extracted: "{ta.extractedThesis}"</div>}
                  </div>
                );
              })()}
              {(agentTrace?.stage1_macro?.outlineAlignment || evaluation.outlineAlignment) && (() => {
                const oa = agentTrace?.stage1_macro?.outlineAlignment || evaluation.outlineAlignment;
                return (
                  <div className="studio-surface-subtle p-2 space-y-0.5">
                    <div>
                      <strong className="studio-text-primary">Outline Alignment ({oa.status}):</strong> {oa.summary}
                    </div>
                    {oa.missingFromBody?.length > 0 && (
                      <div style={{ color: 'var(--fail-red)' }}>Skipped in Essay: {oa.missingFromBody.join(' | ')}</div>
                    )}
                    {oa.orphanBodyParagraphs?.length > 0 && (
                      <div style={{ color: 'var(--warning-amber)' }}>Orphan Body Paragraphs: {oa.orphanBodyParagraphs.join(' | ')}</div>
                    )}
                  </div>
                );
              })()}
            </div>
            {agentTrace?.stage1_macro?.rawFlags?.length > 0 && (
              <details className="pt-1">
                <summary className="cursor-pointer text-[11px] font-semibold hover:underline" style={{ color: 'var(--accent-blue)' }}>
                  View Agent 1 Raw Flags ({agentTrace.stage1_macro.rawFlags.length})
                </summary>
                <div className="mt-2 space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {agentTrace.stage1_macro.rawFlags.map((flag, i) => (
                    <div key={i} className="studio-surface-subtle p-2 text-[11px]">
                      <div className="font-semibold studio-text-primary">
                        [{flag.locationId || 'GLOBAL'}] {flag.severity || flag.type} • {flag.category}
                      </div>
                      {flag.targetPhrase && <div className="studio-text-muted italic">"{flag.targetPhrase}"</div>}
                      {flag.comment && <div className="studio-text-secondary">{flag.comment}</div>}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>

          {/* Stage 1-Post: Pacing */}
          {(agentTrace?.stage1post_pacing || evaluation.pacingMetrics) && (() => {
            const pm = agentTrace?.stage1post_pacing || evaluation.pacingMetrics;
            return (
              <div className="studio-surface p-3.5 space-y-1">
                <div className="studio-section-eyebrow studio-text-primary">
                  Stage 1-Post • Deterministic Length &amp; Fatigue Check
                </div>
                <p className="text-[11px] studio-text-secondary">
                  {pm.summary ||
                    `Checked ${pm.evaluatedParagraphCount || 0} body paragraphs (1st half avg ${pm.firstHalfAvgWords || 0}w vs 2nd half avg ${pm.secondHalfAvgWords || 0}w, change ${pm.decayPercent || 0}%).`}
                </p>
              </div>
            );
          })()}

          {/* Agent 2: Paragraphs */}
          {agentTrace?.stage2_paragraphs && (
            <div className="studio-surface p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="studio-section-eyebrow studio-text-primary">
                  Agent 2 • Paragraph Logic, Evidence &amp; Unity
                </span>
                <span className="studio-pill font-mono">
                  {agentTrace.stage2_paragraphs.skipped
                    ? 'Skipped (Outline-Only)'
                    : `${agentTrace.stage2_paragraphs.rawFlagsCount || 0} raw flags`}
                </span>
              </div>
              {!agentTrace.stage2_paragraphs.skipped && agentTrace.stage2_paragraphs.rawFlags?.length > 0 && (
                <details className="pt-1">
                  <summary className="cursor-pointer text-[11px] font-semibold hover:underline" style={{ color: 'var(--accent-blue)' }}>
                    View Agent 2 Raw Flags ({agentTrace.stage2_paragraphs.rawFlags.length})
                  </summary>
                  <div className="mt-2 space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {agentTrace.stage2_paragraphs.rawFlags.map((flag, i) => (
                      <div key={i} className="studio-surface-subtle p-2 text-[11px]">
                        <div className="font-semibold studio-text-primary">
                          [{flag.locationId || 'BODY'}] {flag.severity || flag.type} • {flag.category}
                        </div>
                        {flag.targetPhrase && <div className="studio-text-muted italic">"{flag.targetPhrase}"</div>}
                        {flag.comment && <div className="studio-text-secondary">{flag.comment}</div>}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          {/* Agent 3: Facts + Language */}
          <div className="studio-surface p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="studio-section-eyebrow studio-text-primary">
                Agent 3 • Search-Grounded Facts &amp; Grammar/Expression
              </span>
              <span className="studio-pill font-mono">
                {agentTrace?.stage3_fact_language?.factChecksCount ?? factChecks.length} facts •{' '}
                {agentTrace?.stage3_fact_language?.rawFlagsCount ?? 0} language flags
              </span>
            </div>
            <div className="text-[11px] studio-text-secondary">
              Google Search Verification:{' '}
              <strong className="studio-text-primary">
                {agentTrace?.stage3_fact_language?.searchGrounded || evaluation.searchSources?.length > 0
                  ? 'Enabled & Grounded'
                  : 'Standard Knowledge'}
              </strong>
              {(agentTrace?.stage3_fact_language?.searchSources?.length || evaluation.searchSources?.length || 0) > 0
                ? ` (${(agentTrace?.stage3_fact_language?.searchSources || evaluation.searchSources).length} web sources cited)`
                : ''}
            </div>
            {(agentTrace?.stage3_fact_language?.searchSources?.length || evaluation.searchSources?.length) > 0 && (
              <details>
                <summary className="cursor-pointer text-[11px] font-semibold hover:underline" style={{ color: 'var(--accent-blue)' }}>
                  View Grounding Search Sources ({(agentTrace?.stage3_fact_language?.searchSources || evaluation.searchSources).length})
                </summary>
                <div className="mt-1.5 flex flex-col gap-1 max-h-40 overflow-y-auto">
                  {(agentTrace?.stage3_fact_language?.searchSources || evaluation.searchSources).map((src, i) => (
                    <a
                      key={i}
                      href={src.startsWith('http') ? src : undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-mono hover:underline truncate"
                      style={{ color: 'var(--accent-blue)' }}
                    >
                      {src}
                    </a>
                  ))}
                </div>
              </details>
            )}
            {agentTrace?.stage3_fact_language?.rawFlags?.length > 0 && (
              <details>
                <summary className="cursor-pointer text-[11px] font-semibold hover:underline" style={{ color: 'var(--accent-blue)' }}>
                  View Agent 3 Raw Language Flags ({agentTrace.stage3_fact_language.rawFlags.length})
                </summary>
                <div className="mt-2 space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {agentTrace.stage3_fact_language.rawFlags.map((flag, i) => (
                    <div key={i} className="studio-surface-subtle p-2 text-[11px]">
                      <div className="font-semibold studio-text-primary">
                        [{flag.locationId || 'TEXT'}] {flag.severity || flag.type} • {flag.category}
                      </div>
                      {flag.targetPhrase && <div className="studio-text-muted italic">"{flag.targetPhrase}"</div>}
                      {flag.comment && <div className="studio-text-secondary">{flag.comment}</div>}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>

          {/* Agent 4: QA Verifier, Deleted False Alarms & Pillar Calibration */}
          <div className="studio-surface p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="studio-section-eyebrow studio-text-primary">
                Agent 4 • QA Verifier, Pruned False Alarms &amp; Rewrites
              </span>
              <span className="studio-pill font-mono">
                Kept {agentTrace?.stage4_qa_coach?.verifiedFlagsCount ?? allAnnotations.length} • Deleted{' '}
                {agentTrace?.stage4_qa_coach?.qaAuditLog?.falsePositivesDeleted ??
                  evaluation.qaAuditLog?.falsePositivesDeleted ??
                  0}
              </span>
            </div>
            <div className="text-[11px] studio-text-secondary space-y-1.5">
              <div>
                Overall Readiness: <strong className="studio-text-primary">{agentTrace?.stage4_qa_coach?.overallReadiness || evaluation.overallReadiness}</strong> •{' '}
                Rewrites Generated: <strong className="studio-text-primary">{agentTrace?.stage4_qa_coach?.rewritesCount ?? rewrites.length}</strong> •{' '}
                Outline Heading Upgrades: <strong className="studio-text-primary">{headerUpgrades.length}</strong>
              </div>
              {(agentTrace?.stage4_qa_coach?.qaAuditLog?.deletionNotes || evaluation.qaAuditLog?.deletionNotes)?.length > 0 && (
                <div className="studio-diff-before text-[11px] space-y-0.5">
                  <div className="font-bold" style={{ color: 'var(--fail-red)' }}>QA Removal Reasons:</div>
                  <ul className="list-disc pl-4 studio-text-secondary">
                    {(agentTrace?.stage4_qa_coach?.qaAuditLog?.deletionNotes || evaluation.qaAuditLog?.deletionNotes).map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </div>
              )}
              {agentTrace?.stage4_qa_coach?.prunedFlags?.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-[11px] font-semibold hover:underline" style={{ color: 'var(--fail-red)' }}>
                    View Exact Pruned False Alarms ({agentTrace.stage4_qa_coach.prunedFlags.length})
                  </summary>
                  <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {agentTrace.stage4_qa_coach.prunedFlags.map((flag, i) => (
                      <div key={i} className="studio-diff-before text-[11px]">
                        <div className="font-semibold" style={{ color: 'var(--fail-red)' }}>
                          [DELETED • {flag.locationId || 'GLOBAL'}] {flag.category}
                        </div>
                        {flag.targetPhrase && <div className="italic studio-text-muted">"{flag.targetPhrase}"</div>}
                        {flag.comment && <div className="studio-text-secondary">{flag.comment}</div>}
                      </div>
                    ))}
                  </div>
                </details>
              )}
              {Object.keys(breakdown).length > 0 && (
                <details>
                  <summary className="cursor-pointer text-[11px] font-semibold hover:underline" style={{ color: 'var(--accent-blue)' }}>
                    View Final Calibrated Pillar Decisions ({Object.keys(breakdown).length})
                  </summary>
                  <div className="mt-2 space-y-1 max-h-48 overflow-y-auto pr-1">
                    {Object.entries(breakdown).map(([k, v]) => (
                      <div key={k} className="studio-surface-subtle p-2 text-[11px]">
                        <div className="font-semibold studio-text-primary">
                          {k}: <span style={{ color: 'var(--accent-blue)' }}>{v?.status}</span>
                        </div>
                        {v?.feedback && <div className="studio-text-secondary">{v.feedback}</div>}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>

          {evaluation.stageDegradations?.length > 0 && (
            <div className="studio-surface p-3.5 text-[11px]" style={{ borderLeft: '3px solid var(--warning-amber)' }}>
              <div className="font-bold uppercase tracking-wider text-[10px] mb-1" style={{ color: 'var(--warning-amber)' }}>
                Stage Degradations / Warnings
              </div>
              <ul className="list-disc pl-4 space-y-0.5 studio-text-secondary">
                {evaluation.stageDegradations.map((d, idx) => (
                  <li key={idx}>{d}</li>
                ))}
              </ul>
            </div>
          )}

          {tokenStages.length > 0 && (() => {
            const totals = tokenStages.reduce(
              (acc, s) => ({
                in: acc.in + (s.inputTokens || 0),
                out: acc.out + (s.outputTokens || 0),
                think: acc.think + (s.thinkingTokens || 0)
              }),
              { in: 0, out: 0, think: 0 }
            );
            return (
              <div className="studio-surface p-3.5 space-y-2">
                <div className="studio-section-eyebrow studio-text-primary">
                  Actual Token &amp; Model Usage by Stage
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border)] studio-text-muted">
                        <th className="py-1 pr-2">Stage</th>
                        <th className="py-1 pr-2">Model</th>
                        <th className="py-1 pr-2 text-right">In</th>
                        <th className="py-1 pr-2 text-right">Out</th>
                        <th className="py-1 text-right">Think</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokenStages.map((s, idx) => (
                        <tr key={idx} className="border-b border-[var(--border)] font-mono text-[10px] studio-text-secondary">
                          <td className="py-1 pr-2 font-sans font-medium studio-text-primary">{s.stage}</td>
                          <td className="py-1 pr-2">{s.model}</td>
                          <td className="py-1 pr-2 text-right">{(s.inputTokens || 0).toLocaleString()}</td>
                          <td className="py-1 pr-2 text-right">{(s.outputTokens || 0).toLocaleString()}</td>
                          <td className="py-1 text-right">{(s.thinkingTokens || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-[var(--border-strong)] font-mono text-[10px] font-bold studio-text-primary">
                        <td className="py-1.5 pr-2 font-sans" colSpan={2}>Total Tokens Consumed</td>
                        <td className="py-1.5 pr-2 text-right">{totals.in.toLocaleString()}</td>
                        <td className="py-1.5 pr-2 text-right">{totals.out.toLocaleString()}</td>
                        <td className="py-1.5 text-right">{totals.think.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
