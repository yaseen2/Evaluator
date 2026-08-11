import React from 'react';
import { AlertTriangle, CheckCircle2, Info, BookOpen, FileText, Lightbulb, Compass, Sparkles, MessageSquare } from 'lucide-react';

export const ScorecardSummary = ({ evaluation }) => {
  if (!evaluation) return null;

  const currentSubject = evaluation.subject || 'Islamic History & Culture';
  const topic = evaluation.topic || 'Candidate Answer Script';
  const wordCount = evaluation.wordCount || 0;
  const introWordCount = evaluation.introWordCount || 0;
  const breakdown = evaluation.scoreBreakdown || {};
  const annotations = evaluation.annotations || [];
  const examinerSummary = evaluation.examinerSummary || null;
  const customObservations = evaluation.customObservations || [];

  const directiveAnalysis = evaluation.directiveAnalysis || {};

  const thingsToInclude = evaluation.thingsToInclude || [];

  const redCount = annotations.filter(a => a.type === 'red').length;
  const amberCount = annotations.filter(a => a.type === 'amber').length;
  const greenCount = annotations.filter(a => a.type === 'green').length;

  const displayDiagnosticComponents = [
    {
      name: 'Substantive Introduction',
      status: breakdown.introduction?.status || (introWordCount >= 100 ? 'Satisfactory' : 'Needs Improvement'),
      feedback: breakdown.introduction?.feedback || `Introduction contains ${introWordCount} words. Target is at least 100 words offering a broad general overview.`
    },
    {
      name: 'Self-Explanatory & Descriptive Headings',
      status: breakdown.headings?.status || 'Needs Improvement',
      feedback: breakdown.headings?.feedback || 'Headings should be descriptive academic titles rather than generic single-word labels.'
    },
    {
      name: 'Visual Diagrams & Flowcharts',
      status: breakdown.diagrams?.status || 'Satisfactory',
      feedback: breakdown.diagrams?.feedback || 'Check the inline suggested visual diagram embedded in your transcribed booklet!'
    },
    {
      name: 'Structural Causality & Cause-Effect Depth',
      status: breakdown.critical_analysis?.status || 'Satisfactory',
      feedback: breakdown.critical_analysis?.feedback || 'Evaluates systemic root causes ("Why & How") over passive chronological storytelling ("What").'
    },
    {
      name: 'General English Grammar Check',
      status: breakdown.grammar_syntax?.status || (redCount === 0 ? 'Satisfactory' : 'Needs Improvement'),
      feedback: breakdown.grammar_syntax?.feedback || 'Line-by-line grammar, spelling, tense consistency, and academic register audit.'
    }
  ];

  return (
    <div style={{ marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
      
      {/* Subject Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
            {currentSubject} FPSC Diagnostic
          </div>
          <h3 style={{ margin: '2px 0 0 0', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
            {topic}
          </h3>
        </div>

        {/* Deterministic Programmatic Word Count Display */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-card)', padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          <FileText size={13} color="var(--accent-blue)" />
          <span>{wordCount} Words Total</span>
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
            <span>Agent 1: Directive & Scope Alignment</span>
          </span>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: '3px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--pass-green)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            {directiveAnalysis.alignmentStatus}
          </span>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: directiveAnalysis.targetTimeframe ? '1fr 1fr 1fr' : '1fr 1fr', gap: '6px', margin: '6px 0', fontSize: '0.7rem', background: 'var(--bg-panel)', padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
          <div><strong style={{ color: 'var(--text-muted)' }}>Verb:</strong> <span style={{ color: 'var(--accent-blue)' }}>{directiveAnalysis.directiveWord}</span></div>
          {directiveAnalysis.targetTimeframe && (
            <div><strong style={{ color: 'var(--text-muted)' }}>Timeframe:</strong> <span style={{ color: 'var(--text-primary)' }}>{directiveAnalysis.targetTimeframe}</span></div>
          )}
          <div><strong style={{ color: 'var(--text-muted)' }}>Dimension:</strong> <span style={{ color: 'var(--text-primary)' }}>{directiveAnalysis.requiredDimensions}</span></div>
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
                <div style={{ fontWeight: 600, color: obs.type === 'strength' ? 'var(--pass-green)' : obs.type === 'concern' ? 'var(--fail-red)' : 'var(--accent-blue)', marginBottom: '2px' }}>
                  [{obs.category || 'Insight'}]
                </div>
                <div style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>{obs.observation}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Summary Pills */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '1rem' }}>
        <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '8px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--fail-red)', fontFamily: 'var(--font-mono)' }}>
            {redCount}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--fail-red)', fontWeight: 600 }}>Critical Errors</div>
        </div>

        <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '8px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)' }}>
            {amberCount}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--accent-blue)', fontWeight: 600 }}>Improvement Notes</div>
        </div>

        <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '8px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--pass-green)', fontFamily: 'var(--font-mono)' }}>
            {greenCount}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--pass-green)', fontWeight: 600 }}>Strong Elements</div>
        </div>
      </div>

      {/* AGENT 4: THINGS YOU CAN INCLUDE TO IMPROVE YOUR ANSWER CARD */}
      {thingsToInclude.length > 0 && (
        <div style={{ background: 'rgba(56, 189, 248, 0.06)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '10px 12px', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <Lightbulb size={14} color="var(--accent-blue)" />
            <span>Agent 4: Structural Causality & Improvements</span>
          </span>
          <ul style={{ margin: '0 0 0 1.2rem', padding: 0, fontSize: '0.72rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
            {thingsToInclude.map((item, idx) => (
              <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Qualitative Component Diagnostic Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {displayDiagnosticComponents.map((comp, idx) => {
          const isWarning = comp.status === 'Needs Improvement' || comp.status === 'Missing';
          return (
            <div
              key={idx}
              style={{
                background: 'var(--bg-card)',
                border: isWarning ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid var(--border)',
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {comp.name}
                </span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '3px',
                    background: comp.status === 'Satisfactory' ? 'rgba(16, 185, 129, 0.15)' : comp.status === 'Missing' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                    color: comp.status === 'Satisfactory' ? 'var(--pass-green)' : comp.status === 'Missing' ? 'var(--fail-red)' : 'var(--accent-blue)',
                    border: `1px solid ${comp.status === 'Satisfactory' ? 'rgba(16, 185, 129, 0.3)' : comp.status === 'Missing' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`
                  }}
                >
                  {comp.status}
                </span>
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
