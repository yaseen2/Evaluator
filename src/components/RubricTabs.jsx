import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Compass, FileText, Sparkles, BarChart2, CheckCircle2, MessageSquare, AlertCircle, Info } from 'lucide-react';
import { FPSC_EXAMINER_CRITERIA } from '../services/fpscRubrics';

export const RubricTabs = ({ evaluation, selectedAnnId, onSelectAnnId }) => {
  const [activeTab, setActiveTab] = useState('callouts');
  const cardRefs = useRef({});

  if (!evaluation) return null;

  const ihcRubric = FPSC_EXAMINER_CRITERIA.islamic_history;
  const dealBreakers = ihcRubric.dealBreakers;

  const factChecks = evaluation.factCheck || [];
  const breakdown = evaluation.scoreBreakdown || {};
  const directiveAnalysis = evaluation.directiveAnalysis || {};

  // Real AI-generated annotations only — no hardcoded fallbacks
  const allAnnotations = evaluation.annotations || [];

  // Auto-switch to callouts tab and scroll to card when user clicks a highlight on paper!
  useEffect(() => {
    if (selectedAnnId) {
      setActiveTab('callouts');
      const targetCard = cardRefs.current[selectedAnnId];
      if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedAnnId]);

  return (
    <div>
      {/* Subject-Specific Rubric Tabs Header */}
      <div className="nav-tabs">
        <button
          className={`tab-item ${activeTab === 'callouts' ? 'active' : ''}`}
          onClick={() => setActiveTab('callouts')}
        >
          Line Callouts ({allAnnotations.length})
        </button>
        <button
          className={`tab-item ${activeTab === 'directive' ? 'active' : ''}`}
          onClick={() => setActiveTab('directive')}
        >
          Directive & Scope
        </button>
        <button
          className={`tab-item ${activeTab === 'accuracy' ? 'active' : ''}`}
          onClick={() => setActiveTab('accuracy')}
        >
          Factual Audit ({factChecks.length})
        </button>
      </div>

      {/* TAB 1: LINE-BY-LINE CALLOUT ANNOTATIONS FEED (SYNCHRONIZED WITH PAPER HIGHLIGHTS) */}
      {activeTab === 'callouts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MessageSquare size={13} color="var(--accent-blue)" />
            <span>Click any callout below to highlight its exact location on paper:</span>
          </div>

          {allAnnotations.map((ann, idx) => {
            const annId = ann.id || `ann-${idx}`;
            const isSelected = selectedAnnId === annId;

            return (
              <div
                key={annId}
                ref={el => cardRefs.current[annId] = el}
                onClick={() => onSelectAnnId && onSelectAnnId(annId)}
                style={{
                  background: 'var(--bg-card)',
                  border: isSelected ? '2px solid var(--accent-blue)' : '1px solid var(--border)',
                  boxShadow: isSelected ? '0 0 16px rgba(56, 189, 248, 0.3)' : 'none',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  borderLeft: ann.type === 'red' ? '4px solid var(--fail-red)' : ann.type === 'green' ? '4px solid var(--pass-green)' : '4px solid var(--accent-blue)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: ann.type === 'red' ? 'var(--fail-red)' : ann.type === 'green' ? 'var(--pass-green)' : 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {ann.category || 'Diagnostic Callout'}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    "{ann.targetPhrase}"
                  </span>
                </div>

                <p style={{ margin: '4px 0', fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: 1.45, fontWeight: 500 }}>
                  {ann.comment}
                </p>

                {ann.suggestion && (
                  <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', padding: '5px 8px', borderRadius: '4px', fontSize: '0.72rem', color: 'var(--accent-blue)', marginTop: '4px' }}>
                    💡 <strong>Recommendation:</strong> {ann.suggestion}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: QUESTION DIRECTIVE & SCOPE AUDIT */}
      {activeTab === 'directive' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Compass size={16} color="var(--accent-blue)" />
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Examiner Directive Word Audit
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              The question directive is <strong>"{directiveAnalysis.directiveWord}"</strong> targeting <strong>"{directiveAnalysis.targetTimeframe}"</strong>. Ensure your writing adheres to discussion and analysis rather than generic narrative.
            </p>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <FileText size={16} color="var(--accent-blue)" />
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Substantive Introduction Audit (~100 Words Target)
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              {breakdown.introduction?.feedback || 'Ensure your introduction defines analytical scope, thesis statement, and primary historical themes in at least 100 words.'}
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: DYNAMIC FACTUAL AUDIT ONLY */}
      {activeTab === 'accuracy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {factChecks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Historical Claims & Factual Verifications:
              </span>
              {factChecks.map((fc, idx) => (
                <div key={idx} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: 'var(--radius-md)', fontSize: '0.78rem' }}>
                  <div style={{ fontWeight: 600, color: fc.verified ? 'var(--pass-green)' : 'var(--fail-red)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {fc.verified ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                    <span>{fc.verified ? 'Claim Verified' : 'Historical Blunder Detected'}</span>
                  </div>
                  <div style={{ color: 'var(--text-primary)', marginBottom: '4px', lineHeight: 1.4 }}>"{fc.claim}"</div>
                  {fc.correctedFact && (
                    <div style={{ color: 'var(--accent-blue)', fontSize: '0.72rem', background: 'var(--bg-panel)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                      <strong>Correction:</strong> {fc.correctedFact}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <CheckCircle2 size={20} color="var(--pass-green)" style={{ marginBottom: '4px' }} />
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--pass-green)' }}>
                No Factual Blunders Detected
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                All historical claims, dates, and names in this answer script are factually accurate.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
