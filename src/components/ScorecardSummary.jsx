import React, { useState } from 'react';
import {
  FileText,
  Lightbulb,
  Compass,
  Sparkles,
  Award,
  CheckCircle2,
  AlertTriangle,
  Target,
  GitMerge,
  Copy,
  Check,
  Zap,
  TrendingUp,
  XCircle
} from 'lucide-react';
import { resolveSubjectProfile } from '../services/fpscRubrics';

export const ScorecardSummary = ({ evaluation }) => {
  const [copiedThesis, setCopiedThesis] = useState(false);
  const [showTokenDetails, setShowTokenDetails] = useState(false);

  if (!evaluation) return null;

  const currentSubject = evaluation.subject || 'English Essay';
  const profile = resolveSubjectProfile(currentSubject, {
    essayMode: evaluation.essayMode,
    archetypeId: evaluation.archetypeId
  });

  const isScored = evaluation.scored !== false && profile.scored !== false;
  const isOutlineOnly = profile.archetypeId === 'essay_outline' || evaluation.essayMode === 'outline_only';

  const topic = evaluation.topic || 'Candidate Answer Script';
  const wordCount = evaluation.wordCount || 0;
  const introWordCount = evaluation.introWordCount || 0;
  const targetIntroWords = evaluation.targetIntroWords || profile.targetIntroWords || 100;
  const breakdown = evaluation.scoreBreakdown || {};
  const annotations = evaluation.annotations || [];
  const examinerSummary = evaluation.examinerSummary || null;
  const customObservations = evaluation.customObservations || [];
  const directiveAnalysis = evaluation.directiveAnalysis || {};
  const thingsToInclude = evaluation.thingsToInclude || [];
  const thesisAudit = evaluation.thesisAudit || null;
  const outlineAlignment = evaluation.outlineAlignment || null;
  const tokenUsage = evaluation.tokenUsage || null;
  const creditsConsumed = evaluation.creditsConsumed || tokenUsage?.creditsConsumed || null;

  const redCount = annotations.filter((a) => a.type === 'red').length;
  const amberCount = annotations.filter((a) => a.type === 'amber').length;
  const greenCount = annotations.filter((a) => a.type === 'green').length;

  const getStatusStyle = (status = '') => {
    const s = status.toLowerCase();
    if (s.includes('strong') || s.includes('satisfactory')) {
      return {
        color: 'var(--pass-green)',
        bg: 'rgba(29, 168, 72, 0.12)',
        border: 'rgba(29, 168, 72, 0.35)',
        pct: 88
      };
    }
    if (s.includes('critical') || s.includes('missing')) {
      return {
        color: 'var(--fail-red)',
        bg: 'rgba(217, 52, 43, 0.12)',
        border: 'rgba(217, 52, 43, 0.35)',
        pct: 28
      };
    }
    if (s.includes('balanced')) {
      return {
        color: 'var(--accent-blue)',
        bg: 'var(--accent-blue-soft)',
        border: 'rgba(37, 122, 243, 0.35)',
        pct: 68
      };
    }
    return {
      color: 'var(--warning-amber)',
      bg: 'rgba(251, 113, 36, 0.12)',
      border: 'rgba(251, 113, 36, 0.35)',
      pct: 50
    };
  };

  // Build dynamic diagnostic components based on the subject's archetype
  let computedTotalScore = 0;
  const displayDiagnosticComponents = profile.breakdown.map((comp) => {
    const saved = breakdown[comp.id] || {};
    let status = saved.status;
    if (!status) {
      if (comp.id === 'introduction') {
        status = introWordCount >= targetIntroWords ? (isScored ? 'Satisfactory' : 'Strong') : isScored ? 'Needs Improvement' : 'Needs Polish';
      } else if (comp.id === 'grammar_syntax') {
        status = redCount === 0 ? (isScored ? 'Satisfactory' : 'Strong') : isScored ? 'Needs Improvement' : 'Needs Polish';
      } else {
        status = isScored ? 'Needs Improvement' : 'Balanced';
      }
    }

    let score = typeof saved.score === 'number' ? saved.score : null;
    if (isScored && score === null) {
      score =
        status === 'Satisfactory' || status === 'Strong'
          ? Math.round(comp.maxMarks * 0.75 * 2) / 2
          : status === 'Needs Improvement' || status === 'Balanced' || status === 'Needs Polish'
          ? Math.round(comp.maxMarks * 0.5 * 2) / 2
          : Math.round(comp.maxMarks * 0.25 * 2) / 2;
    }

    if (isScored && typeof score === 'number') {
      computedTotalScore += score;
    }

    return {
      id: comp.id,
      name: comp.name,
      status,
      score,
      maxMarks: comp.maxMarks,
      feedback:
        saved.feedback ||
        (comp.id === 'introduction'
          ? `Introduction contains ${introWordCount} words (Balanced Target: ~${targetIntroWords} words).`
          : comp.defaultFeedback)
    };
  });

  const maxScore = evaluation.maxScore || profile.totalScore;
  const overallScore =
    typeof evaluation.overallScore === 'number'
      ? evaluation.overallScore
      : Math.min(maxScore, Math.round(computedTotalScore * 2) / 2);
  const passingScore = evaluation.passingScore || profile.passingScore;
  const passStatus = typeof evaluation.passStatus === 'boolean' ? evaluation.passStatus : overallScore >= passingScore;

  const scorePercentage = Math.round((overallScore / maxScore) * 100);

  const overallReadiness =
    evaluation.overallReadiness ||
    evaluation.gradeBand ||
    (isScored
      ? overallScore >= maxScore * 0.7
        ? 'Top Allocation Standard'
        : overallScore >= maxScore * 0.55
        ? 'Strong Competitive Standard'
        : passStatus
        ? 'Qualifying / Borderline Pass'
        : `Below FPSC Cutoff (<${passingScore}/${maxScore})`
      : 'Balanced Draft — Needs Structural Polish');

  const readinessLower = overallReadiness.toLowerCase();
  const isStrongReadiness =
    readinessLower.includes('strong') || readinessLower.includes('well-structured') || readinessLower.includes('top');
  const isWeakReadiness =
    readinessLower.includes('foundational') || readinessLower.includes('below') || readinessLower.includes('critical');

  // Derive SuperKalam 2-Column Strengths & Weaknesses
  const derivedStrengths = [];
  const derivedWeaknesses = [];

  // From Custom Observations
  customObservations.forEach((obs) => {
    if (obs.type === 'strength') {
      derivedStrengths.push(obs.observation);
    } else if (obs.type === 'concern' || obs.type === 'critical') {
      derivedWeaknesses.push(obs.observation);
    }
  });

  // From Green/Red annotations if list is short
  annotations.forEach((ann) => {
    if (ann.type === 'green' && derivedStrengths.length < 4) {
      if (ann.comment && !derivedStrengths.includes(ann.comment)) {
        derivedStrengths.push(ann.comment);
      }
    } else if (ann.type === 'red' && derivedWeaknesses.length < 4) {
      if (ann.comment && !derivedWeaknesses.includes(ann.comment)) {
        derivedWeaknesses.push(`${ann.targetPhrase ? `"${ann.targetPhrase}": ` : ''}${ann.comment}`);
      }
    }
  });

  // From skipped points or dealbreakers
  if (outlineAlignment?.missingFromBody?.length) {
    outlineAlignment.missingFromBody.forEach((pt) => {
      if (derivedWeaknesses.length < 5) derivedWeaknesses.push(`Outline point skipped in body: ${pt}`);
    });
  }

  // Fallbacks if empty
  if (derivedStrengths.length === 0) {
    derivedStrengths.push(
      'Demonstrates sound thematic grasp of the topic directive and core arguments.',
      'Maintains formal academic register suitable for competitive FPSC civil service examination.'
    );
  }
  if (derivedWeaknesses.length === 0) {
    derivedWeaknesses.push(
      'Integrate more empirical citations, verifiable data, and historical case studies.',
      'Refine paragraph transitions to eliminate abrupt logical jumps between points.'
    );
  }

  const handleCopyModelThesis = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedThesis(true);
    setTimeout(() => setCopiedThesis(false), 2000);
  };

  // Gradient Marker Percentage Clamping (between 5% and 95%)
  const clampedMarkerPct = isScored
    ? Math.min(95, Math.max(5, scorePercentage))
    : isStrongReadiness
    ? 85
    : isWeakReadiness
    ? 30
    : 65;

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {/* SuperKalam Section Ribbon */}
      <div className="sk-section-ribbon">
        DETAILED EVALUATION REPORT
      </div>

      {/* Header: Subject & Topic */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
              {currentSubject} • {profile.archetypeLabel}
            </div>
            <h1 style={{ margin: '3px 0 0 0', fontSize: '1.18rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.35 }}>
              {topic}
            </h1>
          </div>

          {/* Word Count & Token Pills */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: '#ffffff',
                padding: '4px 10px',
                borderRadius: '9999px',
                border: '1px solid var(--border)',
                fontSize: '0.72rem',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)'
              }}
            >
              <FileText size={12} color="var(--accent-blue)" />
              <span>{isOutlineOnly ? `${wordCount}w Outline` : `${wordCount} Words`}</span>
            </div>

            {tokenUsage && (
              <button
                type="button"
                onClick={() => setShowTokenDetails(!showTokenDetails)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'var(--accent-blue-soft)',
                  padding: '3px 9px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(37, 122, 243, 0.25)',
                  fontSize: '0.68rem',
                  color: 'var(--accent-blue)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                title="Click to view token telemetry"
              >
                <Zap size={11} />
                <span>
                  {creditsConsumed} Credits • {(tokenUsage.totalTokens / 1000).toFixed(1)}k Tokens
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Token Receipt */}
      {showTokenDetails && tokenUsage && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid var(--border-strong)',
            borderRadius: '12px',
            padding: '12px 14px',
            marginBottom: '16px',
            fontSize: '0.72rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={14} color="var(--accent-blue)" />
              <span>Token-Synced Compute Ledger</span>
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-blue)', fontWeight: 700 }}>
              {creditsConsumed} Credits (1 Credit = 2,500 Weighted Tokens)
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))',
              gap: '6px',
              background: 'var(--bg-app)',
              padding: '8px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              fontFamily: 'var(--font-mono)'
            }}
          >
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Input:</span>{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{tokenUsage.inputTokens?.toLocaleString()}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Output (3.5×):</span>{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{tokenUsage.outputTokens?.toLocaleString()}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Weighted:</span>{' '}
              <strong style={{ color: 'var(--accent-blue)' }}>{tokenUsage.weightedTokens?.toLocaleString()}</strong>
            </div>
          </div>
        </div>
      )}

      {/* SUPERKALAM .mains-marks-card with 4-stop GradientProgressBar */}
      <div className="sk-marks-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '1.25rem' }}>
                {isScored ? (passStatus ? '🌟' : '📝') : isStrongReadiness ? '🌟' : '📝'}
              </span>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {isScored ? 'Marks Scored' : 'FPSC Diagnostic Verdict'}
              </span>
            </div>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {overallReadiness}
            </div>
          </div>

          {isScored ? (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: passStatus ? 'var(--pass-green)' : 'var(--fail-red)', lineHeight: 1 }}>
                {overallScore}
                <span style={{ fontSize: '1.05rem', color: 'var(--text-muted)', fontWeight: 500 }}>/{maxScore}</span>
              </div>
              <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                Cutoff: {passingScore}/{maxScore} Marks
              </div>
            </div>
          ) : (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '9999px',
                background: isStrongReadiness ? 'rgba(29, 168, 72, 0.12)' : 'var(--accent-blue-soft)',
                color: isStrongReadiness ? 'var(--pass-green)' : 'var(--accent-blue)'
              }}
            >
              {isOutlineOnly ? 'Outline Benchmark' : 'Essay Benchmark'}
            </span>
          )}
        </div>

        {/* 4-Stop Gradient Bar */}
        <div className="sk-gradient-bar-wrapper">
          <div className="sk-gradient-marker" style={{ left: `${clampedMarkerPct}%` }}>
            <span className="sk-gradient-pointer" />
            <span
              style={{
                position: 'absolute',
                top: '-22px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '0.66rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: 'var(--text-primary)',
                background: '#ffffff',
                padding: '1px 5px',
                borderRadius: '4px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                whiteSpace: 'nowrap'
              }}
            >
              {isScored ? `${overallScore}/${maxScore}` : `${clampedMarkerPct}%`}
            </span>
          </div>
        </div>

        {/* Mentor Feedback Phrase */}
        {examinerSummary && (
          <p style={{ margin: '14px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            "{examinerSummary}"
          </p>
        )}
      </div>

      {/* SUPERKALAM 2-COLUMN STRENGTHS VS SCOPE FOR IMPROVEMENT GRID */}
      <div className="sk-strengths-weaknesses-grid">
        {/* Column 1: Strengths */}
        <div className="sk-card-strengths">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <CheckCircle2 size={16} color="var(--pass-green)" />
            <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--pass-green)' }}>
              Strengths
            </h3>
          </div>
          <ul style={{ margin: 0, padding: '0 0 0 1.1rem', fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
            {derivedStrengths.map((str, idx) => (
              <li key={idx} style={{ marginBottom: '6px' }}>{str}</li>
            ))}
          </ul>
        </div>

        {/* Column 2: Scope for Improvement */}
        <div className="sk-card-weaknesses">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <XCircle size={16} color="var(--fail-red)" />
            <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--fail-red)' }}>
              Scope for Improvement
            </h3>
          </div>
          <ul style={{ margin: 0, padding: '0 0 0 1.1rem', fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
            {derivedWeaknesses.map((w, idx) => (
              <li key={idx} style={{ marginBottom: '6px' }}>{w}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* THESIS STATEMENT AUDIT CARD (SUPERKALAM STYLE) */}
      {thesisAudit && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid var(--border)',
            padding: '14px 16px',
            borderRadius: '12px',
            marginBottom: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Target size={15} color="var(--accent-blue)" />
              <span>Thesis Statement Audit</span>
            </span>
            {thesisAudit.status && (
              <span
                style={{
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: getStatusStyle(thesisAudit.status).bg,
                  color: getStatusStyle(thesisAudit.status).color
                }}
              >
                {thesisAudit.status}
              </span>
            )}
          </div>

          {thesisAudit.candidateThesis && (
            <div style={{ fontSize: '0.78rem', background: 'var(--bg-app)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.45 }}>
              <strong style={{ color: 'var(--text-primary)' }}>Your Thesis:</strong> "{thesisAudit.candidateThesis}"
            </div>
          )}

          {thesisAudit.critique && (
            <p style={{ margin: '0 0 8px 0', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              {thesisAudit.critique}
            </p>
          )}

          {thesisAudit.modelTopperThesis && (
            <div
              style={{
                position: 'relative',
                fontSize: '0.78rem',
                background: 'rgba(29, 168, 72, 0.08)',
                border: '1px solid rgba(29, 168, 72, 0.25)',
                padding: '8px 32px 8px 10px',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                lineHeight: 1.45
              }}
            >
              <strong style={{ color: 'var(--pass-green)' }}>Model Topper Thesis:</strong> "{thesisAudit.modelTopperThesis}"
              <button
                type="button"
                onClick={() => handleCopyModelThesis(thesisAudit.modelTopperThesis)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '8px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
                title="Copy Model Thesis"
              >
                {copiedThesis ? <Check size={14} color="var(--pass-green)" /> : <Copy size={14} />}
              </button>
            </div>
          )}
        </div>
      )}

      {/* QUESTION DEMAND & SCOPE DECODING (#demand) */}
      <div
        id="demand"
        style={{
          background: '#ffffff',
          border: '1px solid var(--border)',
          padding: '14px 16px',
          borderRadius: '12px',
          marginBottom: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Compass size={15} color="var(--accent-blue)" />
            <span>Question Demand & Scope Decoding</span>
          </span>
          <span
            style={{
              fontSize: '0.66rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '9999px',
              background: 'rgba(29, 168, 72, 0.12)',
              color: 'var(--pass-green)'
            }}
          >
            {directiveAnalysis.alignmentStatus || 'Aligned'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: directiveAnalysis.targetTimeframe ? '1fr 1fr 1fr' : '1fr 1fr', gap: '8px', margin: '8px 0', fontSize: '0.74rem', background: 'var(--bg-app)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <div>
            <strong style={{ color: 'var(--text-muted)' }}>Type:</strong>{' '}
            <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{directiveAnalysis.directiveWord || 'Analytical'}</span>
          </div>
          {directiveAnalysis.targetTimeframe && (
            <div>
              <strong style={{ color: 'var(--text-muted)' }}>Scope:</strong>{' '}
              <span style={{ color: 'var(--text-primary)' }}>{directiveAnalysis.targetTimeframe}</span>
            </div>
          )}
          <div>
            <strong style={{ color: 'var(--text-muted)' }}>Dimensions:</strong>{' '}
            <span style={{ color: 'var(--text-primary)' }}>{directiveAnalysis.requiredDimensions || profile.lens.domainLabel}</span>
          </div>
        </div>

        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
          {directiveAnalysis.feedback}
        </p>
      </div>

      {/* OUTLINE-TO-BODY ALIGNMENT CARD (FOR FULL ESSAYS) */}
      {outlineAlignment && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid var(--border)',
            padding: '14px 16px',
            borderRadius: '12px',
            marginBottom: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <GitMerge size={15} color="var(--accent-blue)" />
              <span>Outline-to-Body Alignment Check</span>
            </span>
            {outlineAlignment.status && (
              <span
                style={{
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: getStatusStyle(outlineAlignment.status).bg,
                  color: getStatusStyle(outlineAlignment.status).color
                }}
              >
                {outlineAlignment.status}
              </span>
            )}
          </div>

          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            {outlineAlignment.summary}
          </p>

          {Array.isArray(outlineAlignment.missingFromBody) && outlineAlignment.missingFromBody.length > 0 && (
            <div style={{ marginTop: '8px', background: 'rgba(251, 113, 36, 0.08)', border: '1px solid rgba(251, 113, 36, 0.25)', padding: '8px 10px', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--text-primary)' }}>
              <strong style={{ color: 'var(--warning-amber)' }}>Outline Points Skipped in Body:</strong>
              <ul style={{ margin: '4px 0 0 1.2rem', padding: 0 }}>
                {outlineAlignment.missingFromBody.map((pt, idx) => (
                  <li key={idx}>{pt}</li>
                ))}
              </ul>
            </div>
          )}

          {outlineAlignment.bodyHeadingWarning && (
            <div style={{ marginTop: '8px', background: 'rgba(217, 52, 43, 0.08)', border: '1px solid rgba(217, 52, 43, 0.25)', padding: '8px 10px', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--fail-red)' }}>
              ⚠️ <strong>FPSC Rule Alert:</strong> {outlineAlignment.bodyHeadingWarning}
            </div>
          )}
        </div>
      )}

      {/* Rubric Breakdown Diagnostic Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
          Diagnostic Pillar Breakdown
        </span>
        {displayDiagnosticComponents.map((comp) => {
          const styleInfo = getStatusStyle(comp.status);
          const pct = isScored && typeof comp.score === 'number'
            ? Math.min(100, Math.round((comp.score / comp.maxMarks) * 100))
            : styleInfo.pct;

          return (
            <div
              key={comp.id}
              style={{
                background: '#ffffff',
                border: '1px solid var(--border)',
                padding: '10px 12px',
                borderRadius: '10px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {comp.name}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  {isScored && typeof comp.score === 'number' && (
                    <span style={{ fontSize: '0.76rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {comp.score}/{comp.maxMarks}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: '0.64rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      background: styleInfo.bg,
                      color: styleInfo.color
                    }}
                  >
                    {comp.status}
                  </span>
                </div>
              </div>

              <div className="metric-line-bg" style={{ marginBottom: '6px', height: '4px' }}>
                <div
                  className="metric-line-fill"
                  style={{
                    width: `${pct}%`,
                    background: styleInfo.color
                  }}
                />
              </div>

              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                {comp.feedback}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
