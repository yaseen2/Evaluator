import React, { useState } from 'react';
import {
  FileText,
  Lightbulb,
  Compass,
  Sparkles,
  MessageSquare,
  Award,
  CheckCircle2,
  AlertTriangle,
  Target,
  GitMerge,
  Copy,
  Check
} from 'lucide-react';
import { resolveSubjectProfile } from '../services/fpscRubrics';

export const ScorecardSummary = ({ evaluation }) => {
  const [copiedThesis, setCopiedThesis] = useState(false);

  if (!evaluation) return null;

  const currentSubject = evaluation.subject || 'Islamic History & Culture';
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

  const redCount = annotations.filter((a) => a.type === 'red').length;
  const amberCount = annotations.filter((a) => a.type === 'amber').length;
  const greenCount = annotations.filter((a) => a.type === 'green').length;

  const getStatusStyle = (status = '') => {
    const s = status.toLowerCase();
    if (s.includes('strong') || s.includes('satisfactory')) {
      return {
        color: 'var(--pass-green)',
        bg: 'rgba(16, 185, 129, 0.12)',
        border: 'rgba(16, 185, 129, 0.35)',
        pct: 88
      };
    }
    if (s.includes('critical') || s.includes('missing')) {
      return {
        color: 'var(--fail-red)',
        bg: 'rgba(239, 68, 68, 0.12)',
        border: 'rgba(239, 68, 68, 0.35)',
        pct: 28
      };
    }
    if (s.includes('balanced')) {
      return {
        color: 'var(--accent-blue)',
        bg: 'rgba(2, 132, 199, 0.12)',
        border: 'rgba(2, 132, 199, 0.35)',
        pct: 68
      };
    }
    return {
      color: 'var(--warning-amber)',
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.35)',
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

  const alignmentColor =
    directiveAnalysis.alignmentStatus === 'Off-Topic'
      ? 'var(--fail-red)'
      : directiveAnalysis.alignmentStatus === 'Partially Aligned'
      ? 'var(--warning-amber)'
      : 'var(--pass-green)';

  const handleCopyModelThesis = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedThesis(true);
    setTimeout(() => setCopiedThesis(false), 2000);
  };

  return (
    <div style={{ marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
      {/* Subject & Topic Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '0.85rem' }}>
        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
            {currentSubject} • {profile.archetypeLabel}
          </div>
          <h3 style={{ margin: '2px 0 0 0', fontSize: '1.02rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', lineHeight: 1.35 }}>
            {topic}
          </h3>
        </div>

        {/* Deterministic Word Count Pill */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--bg-card)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            fontSize: '0.7rem',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)'
          }}
          title={isOutlineOnly ? `Outline Words: ${wordCount}` : `Total Words: ${wordCount} | Introduction Words: ${introWordCount}`}
        >
          <FileText size={13} color="var(--accent-blue)" />
          <span>{isOutlineOnly ? `${wordCount}w Outline` : `${wordCount}w (Intro: ${introWordCount}w)`}</span>
        </div>
      </div>

      {/* HERO BANNER: SCORE-FREE QUALITATIVE FOR ESSAYS vs QUANTITATIVE FOR 20-MARK QUESTIONS */}
      {isScored ? (
        <div
          style={{
            background: 'var(--bg-card)',
            border: passStatus ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(248, 113, 113, 0.35)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            marginBottom: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Award size={14} color={passStatus ? 'var(--pass-green)' : 'var(--fail-red)'} />
              <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                Estimated FPSC Examiner Score
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className={`status-pill ${passStatus ? 'pass' : 'fail'}`}>
                {passStatus ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                {passStatus ? 'Qualifying' : 'Below Cutoff'}
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {overallReadiness}
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div className="score-val" style={{ color: passStatus ? 'var(--pass-green)' : 'var(--fail-red)' }}>
              {overallScore}
              <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: 500 }}>/{maxScore}</span>
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Pass Cutoff: {passingScore}/{maxScore}
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--bg-card)',
            border: isStrongReadiness
              ? '1px solid rgba(16, 185, 129, 0.35)'
              : isWeakReadiness
              ? '1px solid rgba(245, 158, 11, 0.35)'
              : '1px solid rgba(2, 132, 199, 0.35)',
            borderRadius: 'var(--radius-md)',
            padding: '11px 14px',
            marginBottom: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}
        >
          <div>
            <div style={{ fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '3px' }}>
              {isOutlineOnly ? 'FPSC Outline Readiness Verdict' : 'FPSC Essay Diagnostic Verdict'}
            </div>
            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {overallReadiness}
            </div>
          </div>
          <span
            style={{
              fontSize: '0.66rem',
              fontWeight: 700,
              padding: '3px 9px',
              borderRadius: '12px',
              background: isStrongReadiness
                ? 'rgba(16, 185, 129, 0.12)'
                : isWeakReadiness
                ? 'rgba(245, 158, 11, 0.12)'
                : 'rgba(2, 132, 199, 0.12)',
              color: isStrongReadiness
                ? 'var(--pass-green)'
                : isWeakReadiness
                ? 'var(--warning-amber)'
                : 'var(--accent-blue)',
              border: '1px solid currentColor',
              flexShrink: 0
            }}
          >
            {isOutlineOnly ? 'Outline Audit' : 'Qualitative Mentor'}
          </span>
        </div>
      )}

      {/* SENIOR EXAMINER AUTONOMOUS SYNTHESIS SUMMARY BANNER */}
      {examinerSummary && (
        <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '10px 12px', borderRadius: 'var(--radius-md)', marginBottom: '0.85rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <Sparkles size={14} color="var(--accent-blue)" />
            <span>FPSC Mentor Synthesis</span>
          </span>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
            {examinerSummary}
          </p>
        </div>
      )}

      {/* THESIS STATEMENT AUDIT CARD (FOR ESSAY & OUTLINE MODE) */}
      {thesisAudit && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', padding: '10px 12px', borderRadius: 'var(--radius-md)', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Target size={14} color="var(--accent-blue)" />
              <span>Thesis Statement Audit</span>
            </span>
            {thesisAudit.status && (
              <span
                style={{
                  fontSize: '0.63rem',
                  fontWeight: 700,
                  padding: '1px 7px',
                  borderRadius: '4px',
                  background: getStatusStyle(thesisAudit.status).bg,
                  color: getStatusStyle(thesisAudit.status).color,
                  border: `1px solid ${getStatusStyle(thesisAudit.status).border}`
                }}
              >
                {thesisAudit.status}
              </span>
            )}
          </div>

          {thesisAudit.candidateThesis && (
            <div style={{ fontSize: '0.72rem', background: 'var(--bg-panel)', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border)', color: 'var(--text-secondary)', marginBottom: '6px', lineHeight: 1.4 }}>
              <strong style={{ color: 'var(--text-primary)' }}>Your Thesis:</strong> "{thesisAudit.candidateThesis}"
            </div>
          )}

          {thesisAudit.critique && (
            <p style={{ margin: '0 0 6px 0', fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              {thesisAudit.critique}
            </p>
          )}

          {thesisAudit.modelTopperThesis && (
            <div
              style={{
                position: 'relative',
                fontSize: '0.73rem',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.24)',
                padding: '7px 28px 7px 9px',
                borderRadius: '4px',
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
                  right: '6px',
                  top: '6px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
                title="Copy Model Thesis"
              >
                {copiedThesis ? <Check size={13} color="var(--pass-green)" /> : <Copy size={13} />}
              </button>
            </div>
          )}
        </div>
      )}

      {/* OUTLINE-TO-BODY ALIGNMENT CARD (FOR FULL ESSAYS) */}
      {outlineAlignment && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', padding: '10px 12px', borderRadius: 'var(--radius-md)', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <GitMerge size={14} color="var(--accent-blue)" />
              <span>Outline-to-Body Alignment Check</span>
            </span>
            {outlineAlignment.status && (
              <span
                style={{
                  fontSize: '0.63rem',
                  fontWeight: 700,
                  padding: '1px 7px',
                  borderRadius: '4px',
                  background: getStatusStyle(outlineAlignment.status).bg,
                  color: getStatusStyle(outlineAlignment.status).color,
                  border: `1px solid ${getStatusStyle(outlineAlignment.status).border}`
                }}
              >
                {outlineAlignment.status}
              </span>
            )}
          </div>

          <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            {outlineAlignment.summary}
          </p>

          {Array.isArray(outlineAlignment.missingFromBody) && outlineAlignment.missingFromBody.length > 0 && (
            <div style={{ marginTop: '6px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '6px 8px', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--text-primary)' }}>
              <strong style={{ color: 'var(--warning-amber)' }}>Outline Points Skipped in Body:</strong>
              <ul style={{ margin: '3px 0 0 1.1rem', padding: 0 }}>
                {outlineAlignment.missingFromBody.map((pt, idx) => (
                  <li key={idx}>{pt}</li>
                ))}
              </ul>
            </div>
          )}

          {outlineAlignment.bodyHeadingWarning && (
            <div style={{ marginTop: '6px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '6px 8px', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--fail-red)' }}>
              ⚠️ <strong>FPSC Rule Alert:</strong> {outlineAlignment.bodyHeadingWarning}
            </div>
          )}
        </div>
      )}

      {/* QUESTION DIRECTIVE & SCOPE ALIGNMENT CARD */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', padding: '10px 12px', borderRadius: 'var(--radius-md)', marginBottom: '0.85rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Compass size={14} color="var(--accent-blue)" />
            <span>Prompt Decoding & Scope Alignment</span>
          </span>
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: '3px',
              background: 'rgba(16, 185, 129, 0.12)',
              color: alignmentColor,
              border: `1px solid ${alignmentColor}`
            }}
          >
            {directiveAnalysis.alignmentStatus || 'Aligned'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: directiveAnalysis.targetTimeframe ? '1fr 1fr 1fr' : '1fr 1fr', gap: '6px', margin: '6px 0', fontSize: '0.7rem', background: 'var(--bg-panel)', padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
          <div>
            <strong style={{ color: 'var(--text-muted)' }}>Type:</strong>{' '}
            <span style={{ color: 'var(--accent-blue)' }}>{directiveAnalysis.directiveWord || 'Analytical'}</span>
          </div>
          {directiveAnalysis.targetTimeframe && (
            <div>
              <strong style={{ color: 'var(--text-muted)' }}>Scope:</strong>{' '}
              <span style={{ color: 'var(--text-primary)' }}>{directiveAnalysis.targetTimeframe}</span>
            </div>
          )}
          <div>
            <strong style={{ color: 'var(--text-muted)' }}>Focus:</strong>{' '}
            <span style={{ color: 'var(--text-primary)' }}>{directiveAnalysis.requiredDimensions || profile.lens.domainLabel}</span>
          </div>
        </div>

        <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          {directiveAnalysis.feedback}
        </p>
      </div>

      {/* AUTONOMOUS AI CUSTOM OBSERVATIONS */}
      {customObservations.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: 'var(--radius-md)', marginBottom: '0.85rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <MessageSquare size={14} color="var(--accent-blue)" />
            <span>Examiner Observations</span>
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {customObservations.map((obs, idx) => (
              <div key={idx} style={{ fontSize: '0.72rem', background: 'var(--bg-panel)', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                <div
                  style={{
                    fontWeight: 600,
                    color:
                      obs.type === 'strength'
                        ? 'var(--pass-green)'
                        : obs.type === 'concern'
                        ? 'var(--fail-red)'
                        : 'var(--warning-amber)',
                    marginBottom: '2px'
                  }}
                >
                  [{obs.category || 'Insight'}]
                </div>
                <div style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>{obs.observation}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Traffic-Light Callout Summary Pills (Red / Amber / Green) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '1rem' }}>
        <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '8px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--fail-red)', fontFamily: 'var(--font-mono)' }}>
            {redCount}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--fail-red)', fontWeight: 600 }}>Critical Errors</div>
        </div>

        <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.28)', padding: '8px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--warning-amber)', fontFamily: 'var(--font-mono)' }}>
            {amberCount}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--warning-amber)', fontWeight: 600 }}>Improvement Notes</div>
        </div>

        <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '8px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--pass-green)', fontFamily: 'var(--font-mono)' }}>
            {greenCount}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--pass-green)', fontWeight: 600 }}>Strong Elements</div>
        </div>
      </div>

      {/* HIGH-IMPACT THINGS TO INCLUDE */}
      {thingsToInclude.length > 0 && (
        <div style={{ background: 'rgba(56, 189, 248, 0.06)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '10px 12px', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <Lightbulb size={14} color="var(--accent-blue)" />
            <span>{isScored ? 'What to Add for 70%+ Marks (Examiner Blueprint)' : 'Dimensions & Evidence to Strengthen Your Essay'}</span>
          </span>
          <ul style={{ margin: '0 0 0 1.2rem', padding: 0, fontSize: '0.72rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
            {thingsToInclude.map((item, idx) => (
              <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Subject-Adaptive Rubric Breakdown Cards (Score-Free for Essays, Scored for 20-Mark Papers) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {displayDiagnosticComponents.map((comp) => {
          const styleInfo = getStatusStyle(comp.status);
          const pct = isScored && typeof comp.score === 'number'
            ? Math.min(100, Math.round((comp.score / comp.maxMarks) * 100))
            : styleInfo.pct;

          return (
            <div
              key={comp.id}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                padding: '9px 11px',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {comp.name}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  {isScored && typeof comp.score === 'number' && (
                    <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {comp.score}/{comp.maxMarks}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      padding: '1px 7px',
                      borderRadius: '4px',
                      background: styleInfo.bg,
                      color: styleInfo.color,
                      border: `1px solid ${styleInfo.border}`
                    }}
                  >
                    {comp.status}
                  </span>
                </div>
              </div>

              <div className="metric-line-bg" style={{ marginBottom: '6px', height: '3px' }}>
                <div
                  className="metric-line-fill"
                  style={{
                    width: `${pct}%`,
                    background: styleInfo.color
                  }}
                />
              </div>

              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {comp.feedback}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
