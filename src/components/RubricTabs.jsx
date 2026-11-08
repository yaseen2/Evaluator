import React, { useState, useEffect, useRef } from 'react';
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
  XCircle
} from 'lucide-react';
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
    <div style={{ marginTop: '16px' }}>
      {/* SuperKalam Rounded Pill Tabs */}
      <div className="sk-tab-list">
        <button
          className={`sk-tab-pill ${activeTab === 'callouts' ? 'active' : ''}`}
          onClick={() => setActiveTab('callouts')}
        >
          💡 Mistakes & Fixes ({allAnnotations.length})
        </button>
        <button
          className={`sk-tab-pill ${activeTab === 'rewrites' ? 'active' : ''}`}
          onClick={() => setActiveTab('rewrites')}
        >
          ✦ {profile.archetypeId === 'essay_outline' ? `Header Upgrades (${totalUpgradesCount})` : `Topper Rewrites (${totalUpgradesCount})`}
        </button>
        {profile.archetypeId !== 'essay_outline' && (
          <button
            className={`sk-tab-pill ${activeTab === 'accuracy' ? 'active' : ''}`}
            onClick={() => setActiveTab('accuracy')}
          >
            📌 Fact Audit ({factChecks.length})
          </button>
        )}
        <button
          className={`sk-tab-pill ${activeTab === 'directive' ? 'active' : ''}`}
          onClick={() => setActiveTab('directive')}
        >
          📘 Rules & Scope
        </button>
      </div>

      {/* TAB 1: SUPERKALAM #mistakes-yes WARM CREAM CARDS */}
      {activeTab === 'callouts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <MessageSquare size={13} color="var(--accent-blue)" />
              <span>Click any card to highlight on answer script:</span>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { id: 'all', label: `All (${allAnnotations.length})`, color: 'var(--accent-blue)' },
                { id: 'red', label: `Mistakes (${redCount})`, color: 'var(--fail-red)' },
                { id: 'amber', label: `Polish (${amberCount})`, color: 'var(--warning-amber)' },
                { id: 'green', label: `Strengths (${greenCount})`, color: 'var(--pass-green)' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setCalloutFilter(f.id)}
                  style={{
                    background: calloutFilter === f.id ? 'var(--accent-blue-soft)' : '#ffffff',
                    border: calloutFilter === f.id ? `1px solid ${f.color}` : '1px solid var(--border)',
                    color: calloutFilter === f.id ? f.color : 'var(--text-muted)',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    padding: '3px 9px',
                    borderRadius: '9999px',
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
            const isMistake = ann.type === 'red' || ann.type === 'amber';

            return (
              <div
                key={annId}
                ref={(el) => (cardRefs.current[annId] = el)}
                onClick={() => onSelectAnnId && onSelectAnnId(annId)}
                className={isMistake ? 'sk-mistake-card' : ''}
                style={{
                  background: isMistake ? 'var(--mistake-bg)' : '#ffffff',
                  border: isSelected ? `2px solid ${accentColor}` : isMistake ? '1px solid var(--mistake-border)' : '1px solid var(--border)',
                  boxShadow: isSelected ? '0 0 16px rgba(37, 122, 243, 0.25)' : '0 2px 8px rgba(0,0,0,0.03)',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Header: Category + Target Phrase */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: accentColor,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    {ann.category || (ann.type === 'red' ? 'Grammar / Logic' : 'Stylistic Polish')}
                  </span>
                  {ann.targetPhrase && (
                    <span
                      style={{
                        fontSize: '0.7rem',
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
                  )}
                </div>

                {/* SuperKalam Pattern: ✕ Mistake Explanation */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '6px' }}>
                  {ann.type === 'red' ? (
                    <XCircle size={14} color="var(--fail-red)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  ) : ann.type === 'green' ? (
                    <CheckCircle2 size={14} color="var(--pass-green)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  ) : (
                    <AlertTriangle size={14} color="var(--warning-amber)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  )}
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.45, fontWeight: 500 }}>
                    {ann.comment}
                  </p>
                </div>

                {/* SuperKalam Pattern: 💡 Exact Rewritten Fix */}
                {ann.suggestion && (
                  <div
                    style={{
                      background: isMistake ? '#ffffff' : 'var(--bg-app)',
                      border: '1px solid var(--border)',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      fontSize: '0.76rem',
                      color: 'var(--accent-blue)',
                      marginTop: '6px',
                      lineHeight: 1.45
                    }}
                  >
                    💡 <strong>Correction:</strong> {ann.suggestion}
                  </div>
                )}

                {/* SuperKalam Pattern: 📘 Rule to Remember (Pedagogical Lesson) */}
                {ann.microLesson && (
                  <div
                    style={{
                      marginTop: '6px',
                      fontSize: '0.72rem',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '6px',
                      lineHeight: 1.4
                    }}
                  >
                    <BookOpen size={13} color="var(--accent-blue)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>
                      <strong>Rule to Remember:</strong> {ann.microLesson}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: 3-TIER TOPPER REWRITES */}
      {activeTab === 'rewrites' && (
        <ParagraphRewriter rewrites={rewrites} headerUpgrades={headerUpgrades} />
      )}

      {/* TAB 3: FACT AUDIT */}
      {activeTab === 'accuracy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {factChecks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Verified Claims, Dates, Citations & Empirical Audit ({factChecks.length}):
              </span>
              {factChecks.map((fc, idx) => (
                <div key={idx} style={{ background: '#ffffff', border: '1px solid var(--border)', padding: '12px 14px', borderRadius: '12px', fontSize: '0.8rem', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                  <div style={{ fontWeight: 600, color: fc.verified ? 'var(--pass-green)' : 'var(--fail-red)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {fc.verified ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                    <span>{fc.verified ? 'Claim Verified' : 'Factual / Citation Blunder Detected'}</span>
                  </div>
                  <div style={{ color: 'var(--text-primary)', marginBottom: '6px', lineHeight: 1.45 }}>"{fc.claim}"</div>
                  {fc.correctedFact && (
                    <div style={{ color: 'var(--accent-blue)', fontSize: '0.75rem', background: 'var(--bg-app)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', marginBottom: '6px' }}>
                      <strong>Correction:</strong> {fc.correctedFact}
                    </div>
                  )}
                  {fc.source && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      📚 Source: {fc.source}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: '#ffffff', border: '1px solid var(--border)', padding: '24px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <CheckCircle2 size={24} color="var(--pass-green)" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--pass-green)' }}>
                No Factual Blunders Detected
              </div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                All verifiable claims, dates, and references in this script passed audit.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: RULES & SCOPE */}
      {activeTab === 'directive' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: '#ffffff', border: '1px solid var(--border)', padding: '14px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Compass size={16} color="var(--accent-blue)" />
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Examiner Directive & Prompt Scope
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              The prompt focus is <strong>"{directiveAnalysis.directiveWord || 'Analytical'}"</strong>
              {directiveAnalysis.targetTimeframe ? <> targeting <strong>"{directiveAnalysis.targetTimeframe}"</strong></> : null}.{' '}
              {directiveAnalysis.feedback}
            </p>
          </div>

          {profile.archetypeId !== 'essay_outline' && (
            <div style={{ background: '#ffffff', border: '1px solid var(--border)', padding: '14px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <FileText size={16} color="var(--accent-blue)" />
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Substantive Introduction Audit (~{profile.targetIntroWords}+ Words Target)
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                {breakdown.introduction?.feedback ||
                  `Ensure your introduction defines analytical scope, thesis statement, and primary themes in at least ${profile.targetIntroWords} words.`}
              </p>
            </div>
          )}

          {dealBreakers.length > 0 && (
            <div style={{ background: 'rgba(217, 52, 43, 0.04)', border: '1px solid rgba(217, 52, 43, 0.25)', padding: '14px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <ShieldAlert size={16} color="var(--fail-red)" />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--fail-red)' }}>
                  FPSC Critical Deal-Breakers ({profile.archetypeLabel})
                </span>
              </div>
              <ul style={{ margin: '0 0 0 1.2rem', padding: 0, fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
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
