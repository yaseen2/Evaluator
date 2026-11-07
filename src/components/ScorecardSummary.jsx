import React from 'react';
import { FileText, Lightbulb, Compass, Sparkles, MessageSquare, Award, CheckCircle2, AlertTriangle } from 'lucide-react';
import { resolveSubjectProfile } from '../services/fpscRubrics';

export const ScorecardSummary = ({ evaluation }) => {
  if (!evaluation) return null;

  const currentSubject = evaluation.subject || 'Islamic History & Culture';
  const profile = resolveSubjectProfile(currentSubject);

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

  const redCount = annotations.filter((a) => a.type === 'red').length;
  const amberCount = annotations.filter((a) => a.type === 'amber').length;
  const greenCount = annotations.filter((a) => a.type === 'green').length;

  // Build dynamic diagnostic components based on the subject's archetype
  let computedTotalScore = 0;
  const displayDiagnosticComponents = profile.breakdown.map((comp) => {
    const saved = breakdown[comp.id] || {};
    let status = saved.status;
    if (!status) {
      if (comp.id === 'introduction') {
        status = introWordCount >= targetIntroWords ? 'Satisfactory' : 'Needs Improvement';
      } else if (comp.id === 'grammar_syntax') {
        status = redCount === 0 ? 'Satisfactory' : 'Needs Improvement';
      } else {
        status = 'Needs Improvement';
      }
    }

    let score = typeof saved.score === 'number' ? saved.score : null;
    if (score === null) {
      score =
        status === 'Satisfactory'
          ? Math.round(comp.maxMarks * 0.75 * 2) / 2
          : status === 'Needs Improvement'
          ? Math.round(comp.maxMarks * 0.5 * 2) / 2
          : Math.round(comp.maxMarks * 0.25 * 2) / 2;
    }

    computedTotalScore += score;

    return {
      id: comp.id,
      name: comp.name,
      status,
      score,
      maxMarks: comp.maxMarks,
      feedback:
        saved.feedback ||
        (comp.id === 'introduction'
          ? `Introduction contains ${introWordCount} words (Target: ≥ ${targetIntroWords} words).`
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
  const gradeBand =
    evaluation.gradeBand ||
    (overallScore >= maxScore * 0.7
      ? 'Top Allocation Standard'
      : overallScore >= maxScore * 0.55
      ? 'Strong Competitive Standard'
      : passStatus
      ? 'Qualifying / Borderline Pass'
      : `Below FPSC Cutoff (<${passingScore}/${maxScore})`);

  const alignmentColor =
    directiveAnalysis.alignmentStatus === 'Off-Topic'
      ? 'var(--fail-red)'
      : directiveAnalysis.alignmentStatus === 'Partially Aligned'
      ? 'var(--warning-amber)'
      : 'var(--pass-green)';

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
          title={`Total Words: ${wordCount} | Introduction Words: ${introWordCount}`}
        >
          <FileText size={13} color="var(--accent-blue)" />
          <span>{wordCount}w (Intro: {introWordCount}w)</span>
        </div>
      </div>

      {/* QUANTITATIVE FPSC SCORE HERO CARD */}
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
              {gradeBand}
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

      {/* SENIOR EXAMINER AUTONOMOUS SYNTHESIS SUMMARY BANNER */}
      {examinerSummary && (
        <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '10px 12px', borderRadius: 'var(--radius-md)', marginBottom: '0.85rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <Sparkles size={14} color="var(--accent-blue)" />
            <span>Senior Examiner Synthesis</span>
          </span>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
            {examinerSummary}
          </p>
        </div>
      )}

      {/* AGENT 1: QUESTION DIRECTIVE & SCOPE ALIGNMENT CARD */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', padding: '10px 12px', borderRadius: 'var(--radius-md)', marginBottom: '0.85rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Compass size={14} color="var(--accent-blue)" />
            <span>Directive & Scope Alignment</span>
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
            <strong style={{ color: 'var(--text-muted)' }}>Verb:</strong>{' '}
            <span style={{ color: 'var(--accent-blue)' }}>{directiveAnalysis.directiveWord || 'Discuss'}</span>
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
            <span>Autonomous Examiner Insights</span>
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

      {/* AGENT 4: HIGH-IMPACT THINGS TO INCLUDE */}
      {thingsToInclude.length > 0 && (
        <div style={{ background: 'rgba(56, 189, 248, 0.06)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '10px 12px', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <Lightbulb size={14} color="var(--accent-blue)" />
            <span>What to Add for 70%+ Marks (Examiner Blueprint)</span>
          </span>
          <ul style={{ margin: '0 0 0 1.2rem', padding: 0, fontSize: '0.72rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
            {thingsToInclude.map((item, idx) => (
              <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Subject-Adaptive Rubric Breakdown Cards with Marks & Progress Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {displayDiagnosticComponents.map((comp) => {
          const isSatisfactory = comp.status === 'Satisfactory';
          const isMissing = comp.status === 'Missing';
          const badgeColor = isSatisfactory ? 'var(--pass-green)' : isMissing ? 'var(--fail-red)' : 'var(--warning-amber)';
          const badgeBg = isSatisfactory
            ? 'rgba(16, 185, 129, 0.14)'
            : isMissing
            ? 'rgba(239, 68, 68, 0.14)'
            : 'rgba(245, 158, 11, 0.14)';

          const pct = Math.min(100, Math.round((comp.score / comp.maxMarks) * 100));

          return (
            <div
              key={comp.id}
              style={{
                background: 'var(--bg-card)',
                border: !isSatisfactory ? '1px solid rgba(245, 158, 11, 0.22)' : '1px solid var(--border)',
                padding: '9px 11px',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {comp.name}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {comp.score}/{comp.maxMarks}
                  </span>
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '3px',
                      background: badgeBg,
                      color: badgeColor,
                      border: `1px solid ${badgeColor}`
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
                    background: badgeColor
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
