import React, { useState } from 'react';
import { Copy, Check, Sparkles, BookOpen } from 'lucide-react';
import { cleanSimpleText, formatLocationLabel } from '../utils/textUtils';

export const ParagraphRewriter = ({ rewrites, headerUpgrades }) => {
  const [selectedTier, setSelectedTier] = useState('highScorer'); // 'basic' | 'cssStandard' | 'highScorer'
  const [copiedIdx, setCopiedIdx] = useState(null);

  const safeRewrites = Array.isArray(rewrites) ? rewrites : [];
  const safeHeaders = Array.isArray(headerUpgrades) ? headerUpgrades : [];

  if (safeRewrites.length === 0 && safeHeaders.length === 0) {
    return (
      <div
        style={{
          padding: '1rem',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.8rem'
        }}
      >
        No surgical rewrites or outline header upgrades generated for this script.
      </div>
    );
  }

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(key);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
      {/* SECTION 1: OUTLINE HEADER PARALLELISM UPGRADES */}
      {safeHeaders.length > 0 && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '0.65rem'
            }}
          >
            <Sparkles size={14} color="var(--accent-blue)" />
            <span
              style={{
                fontSize: '0.76rem',
                fontWeight: 700,
                color: 'var(--text-primary)'
              }}
            >
              Outline Heading Improvements ({safeHeaders.length})
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {safeHeaders.map((item, idx) => (
              <div
                key={`hdr-${idx}`}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '5px'
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      color: 'var(--warning-amber)',
                      textTransform: 'uppercase'
                    }}
                  >
                    Issue: {cleanSimpleText(item.issue || 'Unclear Heading')}
                  </span>
                </div>

                <div
                  style={{
                    fontSize: '0.73rem',
                    color: 'var(--fail-red)',
                    padding: '5px 8px',
                    background: 'rgba(239, 68, 68, 0.07)',
                    borderRadius: '4px',
                    border: '1px solid rgba(239, 68, 68, 0.16)',
                    marginBottom: '6px'
                  }}
                >
                  <strong>Before:</strong> "{item.originalHeader}"
                </div>

                <div
                  style={{
                    position: 'relative',
                    fontSize: '0.76rem',
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    padding: '6px 28px 6px 8px',
                    background: 'rgba(16, 185, 129, 0.08)',
                    borderRadius: '4px',
                    border: '1px solid rgba(16, 185, 129, 0.22)'
                  }}
                >
                  <span style={{ color: 'var(--pass-green)' }}>Improved Heading:</span> "
                  {item.upgradedHeader}"
                  <button
                    type="button"
                    onClick={() => handleCopy(item.upgradedHeader, `hdr-${idx}`)}
                    style={{
                      position: 'absolute',
                      right: '6px',
                      top: '6px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                    title="Copy header"
                  >
                    {copiedIdx === `hdr-${idx}` ? (
                      <Check size={13} color="var(--pass-green)" />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                </div>

                {item.rule && (
                  <div
                    style={{
                      marginTop: '5px',
                      fontSize: '0.69rem',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '5px'
                    }}
                  >
                    <BookOpen
                      size={12}
                      color="var(--accent-blue)"
                      style={{ flexShrink: 0, marginTop: '2px' }}
                    />
                    <span>
                      <strong>Why:</strong> {cleanSimpleText(item.rule)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: SURGICAL BEFORE -> AFTER REWRITES */}
      {safeRewrites.length > 0 && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem'
            }}
          >
            <span
              style={{
                fontSize: '0.76rem',
                fontWeight: 700,
                color: 'var(--text-primary)'
              }}
            >
              "Before → After" Paragraph &amp; Thesis Improvements ({safeRewrites.length})
            </span>
            <div
              style={{
                display: 'flex',
                gap: '4px',
                background: 'var(--bg-card)',
                padding: '2px',
                borderRadius: '6px',
                border: '1px solid var(--border)'
              }}
            >
              <button
                type="button"
                className={`tab-item ${selectedTier === 'basic' ? 'active' : ''}`}
                style={{ padding: '4px 8px', fontSize: '0.68rem' }}
                onClick={() => setSelectedTier('basic')}
              >
                Simple Fix
              </button>
              <button
                type="button"
                className={`tab-item ${selectedTier === 'cssStandard' ? 'active' : ''}`}
                style={{ padding: '4px 8px', fontSize: '0.68rem' }}
                onClick={() => setSelectedTier('cssStandard')}
              >
                Good Standard
              </button>
              <button
                type="button"
                className={`tab-item ${selectedTier === 'highScorer' ? 'active' : ''}`}
                style={{ padding: '4px 8px', fontSize: '0.68rem' }}
                onClick={() => setSelectedTier('highScorer')}
              >
                Top Standard
              </button>
            </div>
          </div>

          {safeRewrites.map((rw, idx) => {
            if (!rw) return null;
            const currentRewriteText =
              rw[selectedTier] || rw.highScorer || rw.cssStandard || rw.basic || '';

            return (
              <div
                key={idx}
                style={{
                  marginBottom: '0.85rem',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px'
                }}
              >
                {(rw.locationId || rw.issueDiagnosed || rw.targetType) && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '6px'
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.66rem',
                        fontWeight: 700,
                        color: 'var(--accent-blue)',
                        textTransform: 'uppercase'
                      }}
                    >
                      {rw.locationId
                        ? formatLocationLabel(rw.locationId)
                        : rw.targetType || 'Paragraph Improvement'}
                    </span>
                    {rw.issueDiagnosed && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          color: 'var(--warning-amber)'
                        }}
                      >
                        {cleanSimpleText(rw.issueDiagnosed)}
                      </span>
                    )}
                  </div>
                )}

                <div
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--fail-red)',
                    marginBottom: '6px',
                    padding: '6px 8px',
                    background: 'rgba(239, 68, 68, 0.07)',
                    borderRadius: '4px',
                    border: '1px solid rgba(239, 68, 68, 0.15)',
                    lineHeight: 1.45
                  }}
                >
                  <strong>Before (Your Draft):</strong> "{rw.original || ''}"
                </div>

                <div
                  style={{
                    position: 'relative',
                    fontSize: '0.77rem',
                    color: 'var(--text-primary)',
                    lineHeight: 1.5,
                    background: 'rgba(16, 185, 129, 0.08)',
                    padding: '8px 28px 8px 10px',
                    borderRadius: '4px',
                    border: '1px solid rgba(16, 185, 129, 0.22)'
                  }}
                >
                  <strong style={{ color: 'var(--pass-green)' }}>
                    After (
                    {selectedTier === 'basic'
                      ? 'Simple Fix'
                      : selectedTier === 'cssStandard'
                      ? 'Good Standard'
                      : 'Top Standard'}
                    ):
                  </strong>{' '}
                  "{currentRewriteText}"
                  <button
                    type="button"
                    onClick={() => handleCopy(currentRewriteText, `rw-${idx}`)}
                    style={{
                      position: 'absolute',
                      right: '6px',
                      top: '6px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                    title="Copy rewrite"
                  >
                    {copiedIdx === `rw-${idx}` ? (
                      <Check size={14} color="var(--pass-green)" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>

                {rw.whatChanged && (
                  <div
                    style={{
                      marginTop: '6px',
                      fontSize: '0.7rem',
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-panel)',
                      padding: '5px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border)'
                    }}
                  >
                    💡 <strong>What Changed &amp; Why:</strong> {cleanSimpleText(rw.whatChanged)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
