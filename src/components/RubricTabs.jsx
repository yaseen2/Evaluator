import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Compass, FileText, CheckCircle2, MessageSquare, ShieldAlert, BookOpen } from 'lucide-react';
import { resolveSubjectProfile } from '../services/fpscRubrics';
import { ParagraphRewriter } from './ParagraphRewriter';

export const RubricTabs = ({ evaluation, selectedAnnId, onSelectAnnId }) => {
  const [activeTab, setActiveTab] = useState('callouts');
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

  const redCount = allAnnotations.filter((a) => a.type === 'red').length;
  const amberCount = allAnnotations.filter((a) => a.type === 'amber').length;
  const greenCount = allAnnotations.filter((a) => a.type === 'green').length;

  const filteredAnnotations =
    calloutFilter === 'all'
      ? allAnnotations
      : allAnnotations.filter((a) => a.type === calloutFilter);

  // Auto-switch to callouts tab and scroll to card when user clicks a highlight on paper
  useEffect(() => {
    if (selectedAnnId) {
      setActiveTab('callouts');
      setCalloutFilter('all');
      setTimeout(() => {
        const targetCard = cardRefs.current[selectedAnnId];
        if (targetCard && typeof targetCard.scrollIntoView === 'function') {
          targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 40);
    }
  }, [selectedAnnId]);

  const getTypeColor = (type) => {
    if (type === 'red') return 'var(--fail-red)';
    if (type === 'green') return 'var(--pass-green)';
    return 'var(--warning-amber)';
  };

  return (
    <div>
      {/* Subject-Specific Rubric Tabs Header */}
      <div className="nav-tabs">
        <button
          className={`tab-item ${activeTab === 'callouts' ? 'active' : ''}`}
          onClick={() => setActiveTab('callouts')}
        >
          Callouts ({allAnnotations.length})
        </button>
        <button
          className={`tab-item ${activeTab === 'rewrites' ? 'active' : ''}`}
          onClick={() => setActiveTab('rewrites')}
        >
          {profile.archetypeId === 'essay_outline'
            ? `Header Upgrades (${totalUpgradesCount})`
            : `Topper Rewrites (${totalUpgradesCount})`}
        </button>
        {profile.archetypeId !== 'essay_outline' && (
          <button
            className={`tab-item ${activeTab === 'accuracy' ? 'active' : ''}`}
            onClick={() => setActiveTab('accuracy')}
          >
            Fact Audit ({factChecks.length})
          </button>
        )}
        <button
          className={`tab-item ${activeTab === 'directive' ? 'active' : ''}`}
          onClick={() => setActiveTab('directive')}
        >
          Scope & Rules
        </button>
      </div>

      {/* TAB 1: LINE-BY-LINE PEDAGOGICAL CALLOUT ANNOTATIONS FEED ("BEYOND RED CIRCLES") */}
      {activeTab === 'callouts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Quick Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MessageSquare size={12} color="var(--accent-blue)" />
              <span>Click any card to locate on script:</span>
            </div>

            <div style={{ display: 'flex', gap: '4px' }}>
              {[
                { id: 'all', label: `All (${allAnnotations.length})`, color: 'var(--accent-blue)' },
                { id: 'red', label: `Errors (${redCount})`, color: 'var(--fail-red)' },
                { id: 'amber', label: `Improve (${amberCount})`, color: 'var(--warning-amber)' },
                { id: 'green', label: `Strengths (${greenCount})`, color: 'var(--pass-green)' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setCalloutFilter(f.id)}
                  style={{
                    background: calloutFilter === f.id ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                    border: calloutFilter === f.id ? `1px solid ${f.color}` : '1px solid var(--border)',
                    color: calloutFilter === f.id ? f.color : 'var(--text-muted)',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    padding: '2px 7px',
                    borderRadius: '10px',
                    cursor: 'pointer'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredAnnotations.map((ann, idx) => {
            const annId = ann.id || `ann-${idx}`;
            const isSelected = selectedAnnId === annId;
            const accentColor = getTypeColor(ann.type);

            return (
              <div
                key={annId}
                ref={(el) => (cardRefs.current[annId] = el)}
                onClick={() => onSelectAnnId && onSelectAnnId(annId)}
                style={{
                  background: 'var(--bg-card)',
                  border: isSelected ? `2px solid ${accentColor}` : '1px solid var(--border)',
                  boxShadow: isSelected ? '0 0 16px rgba(56, 189, 248, 0.22)' : 'none',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  borderLeft: `4px solid ${accentColor}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: accentColor,
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em'
                    }}
                  >
                    {ann.category || 'Diagnostic Callout'}
                  </span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                      maxWidth: '55%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                    title={ann.targetPhrase}
                  >
                    "{ann.targetPhrase}"
                  </span>
                </div>

                {/* Why Flagged */}
                <p style={{ margin: '4px 0', fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: 1.45, fontWeight: 500 }}>
                  {ann.comment}
                </p>

                {/* Exact Rewritten Fix */}
                {ann.suggestion && (
                  <div
                    style={{
                      background: 'var(--bg-panel)',
                      border: '1px solid var(--border)',
                      padding: '5px 8px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      color: 'var(--accent-blue)',
                      marginTop: '5px',
                      lineHeight: 1.4
                    }}
                  >
                    💡 <strong>Fix:</strong> {ann.suggestion}
                  </div>
                )}

                {/* 1-Line Pedagogical Micro-Lesson ("Rule to Remember") */}
                {ann.microLesson && (
                  <div
                    style={{
                      marginTop: '5px',
                      fontSize: '0.69rem',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '5px',
                      lineHeight: 1.38
                    }}
                  >
                    <BookOpen size={12} color="var(--accent-blue)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>
                      <strong>Rule:</strong> {ann.microLesson}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: 3-TIER TOPPER PARAGRAPH REWRITES & OUTLINE HEADER UPGRADES */}
      {activeTab === 'rewrites' && (
        <ParagraphRewriter rewrites={rewrites} headerUpgrades={headerUpgrades} />
      )}

      {/* TAB 3: DYNAMIC FACTUAL & CITATION AUDIT */}
      {activeTab === 'accuracy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {factChecks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Verified Claims, Dates, Citations & Empirical Audit ({factChecks.length}):
              </span>
              {factChecks.map((fc, idx) => (
                <div key={idx} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: 'var(--radius-md)', fontSize: '0.78rem' }}>
                  <div style={{ fontWeight: 600, color: fc.verified ? 'var(--pass-green)' : 'var(--fail-red)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {fc.verified ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                    <span>{fc.verified ? 'Claim Verified' : 'Factual / Citation Blunder Detected'}</span>
                  </div>
                  <div style={{ color: 'var(--text-primary)', marginBottom: '4px', lineHeight: 1.4 }}>"{fc.claim}"</div>
                  {fc.correctedFact && (
                    <div style={{ color: 'var(--accent-blue)', fontSize: '0.72rem', background: 'var(--bg-panel)', padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--border)', marginBottom: '4px' }}>
                      <strong>Correction:</strong> {fc.correctedFact}
                    </div>
                  )}
                  {fc.source && (
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      📚 Source: {fc.source}
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
                All verifiable claims, dates, and references in this script passed audit.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: QUESTION DIRECTIVE, SCOPE & FPSC DEAL-BREAKERS */}
      {activeTab === 'directive' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Compass size={16} color="var(--accent-blue)" />
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Examiner Directive & Prompt Audit
              </span>
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              The prompt focus is <strong>"{directiveAnalysis.directiveWord || 'Analytical'}"</strong>
              {directiveAnalysis.targetTimeframe ? <> targeting <strong>"{directiveAnalysis.targetTimeframe}"</strong></> : null}.{' '}
              {directiveAnalysis.feedback}
            </p>
          </div>

          {profile.archetypeId !== 'essay_outline' && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <FileText size={16} color="var(--accent-blue)" />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Substantive Introduction Audit (~{profile.targetIntroWords}+ Words Target)
                </span>
              </div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                {breakdown.introduction?.feedback ||
                  `Ensure your introduction defines analytical scope, thesis statement, and primary themes in at least ${profile.targetIntroWords} words.`}
              </p>
            </div>
          )}

          {dealBreakers.length > 0 && (
            <div style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <ShieldAlert size={16} color="var(--fail-red)" />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--fail-red)' }}>
                  FPSC Critical Deal-Breakers ({profile.archetypeLabel})
                </span>
              </div>
              <ul style={{ margin: '0 0 0 1.15rem', padding: 0, fontSize: '0.73rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {dealBreakers.map((db, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{db}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
