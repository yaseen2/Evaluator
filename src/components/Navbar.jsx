import React, { useState, useRef, useEffect } from 'react';
import { Settings, Upload, RefreshCw, History, Trash2, ChevronDown, BookOpen } from 'lucide-react';

export const Navbar = ({
  onOpenSettings,
  onOpenUpload,
  isEvaluating,
  evaluationHistory = [],
  activeEvaluationId,
  onSelectEvaluation,
  onDeleteEvaluation
}) => {
  const [historyOpen, setHistoryOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setHistoryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="navbar">
      {/* Brand Title & Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span className="brand-title">FPSC Evaluator</span>
        <span
          style={{
            fontSize: '0.65rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            color: 'var(--accent-blue)',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            padding: '1px 7px',
            borderRadius: '10px'
          }}
        >
          CSS Studio v2.0
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Saved Evaluations History Dropdown */}
        {evaluationHistory.length > 0 && (
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              className="btn-minimal"
              onClick={() => setHistoryOpen(!historyOpen)}
              title="Switch between saved paper evaluations"
            >
              <History size={14} color="var(--accent-blue)" />
              <span>History ({evaluationHistory.length})</span>
              <ChevronDown size={12} color="var(--text-muted)" />
            </button>

            {historyOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  width: '340px',
                  maxHeight: '380px',
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.45)',
                  zIndex: 9999,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}
              >
                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Saved Evaluations ({evaluationHistory.length})
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
                  {evaluationHistory.map((item) => {
                    const isCurrent = item.id === activeEvaluationId;
                    const hasScore = typeof item.overallScore === 'number';
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          onSelectEvaluation?.(item);
                          setHistoryOpen(false);
                        }}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)',
                          background: isCurrent ? 'var(--bg-card-hover)' : 'transparent',
                          border: isCurrent ? '1px solid var(--border-strong)' : '1px solid transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          marginBottom: '4px'
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                            <BookOpen size={11} color="var(--accent-blue)" />
                            <span style={{ fontSize: '0.68rem', color: 'var(--accent-blue)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.subject}
                            </span>
                            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>• {item.date}</span>
                          </div>
                          <div style={{ fontSize: '0.76rem', fontWeight: isCurrent ? 600 : 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.topic || item.examQuestion || 'Evaluated Script'}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          {hasScore && (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: item.passStatus !== false ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)',
                                color: item.passStatus !== false ? 'var(--pass-green)' : 'var(--fail-red)'
                              }}
                            >
                              {item.overallScore}/{item.maxScore || 20}
                            </span>
                          )}

                          {evaluationHistory.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteEvaluation?.(item.id);
                              }}
                              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                              title="Delete from history"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settings Button */}
        <button
          className="btn-minimal"
          onClick={onOpenSettings}
          title="Platform Settings (API Keys, Models, Themes, Quotas)"
        >
          <Settings size={14} color="var(--accent-gold)" />
          <span>Settings</span>
        </button>

        {/* Primary Evaluation CTA */}
        <button className="btn-accent" onClick={onOpenUpload} disabled={isEvaluating}>
          {isEvaluating ? <RefreshCw size={13} className="spin" /> : <Upload size={13} />}
          <span>{isEvaluating ? 'Evaluating...' : 'Evaluate Paper'}</span>
        </button>
      </div>
    </nav>
  );
};
