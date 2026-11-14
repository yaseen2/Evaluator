import React, { useState } from 'react';
import { Copy, Check, Sparkles } from 'lucide-react';
import { cleanSimpleText, formatLocationLabel } from '../utils/textUtils';

const TIER_LABELS = {
  basic: 'Simple Fix',
  cssStandard: 'Good Standard',
  highScorer: 'Top Standard'
};

export const ParagraphRewriter = ({ rewrites, headerUpgrades }) => {
  const [selectedTier, setSelectedTier] = useState('highScorer'); // 'basic' | 'cssStandard' | 'highScorer'
  const [copiedIdx, setCopiedIdx] = useState(null);

  const safeRewrites = Array.isArray(rewrites) ? rewrites : [];
  const safeHeaders = Array.isArray(headerUpgrades) ? headerUpgrades : [];

  if (safeRewrites.length === 0 && safeHeaders.length === 0) {
    return (
      <div className="studio-surface p-6 text-center text-xs studio-text-muted">
        No sentence rewrites or heading upgrades generated for this script.
      </div>
    );
  }

  const handleCopy = (text, key) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
    setCopiedIdx(key);
    setTimeout(() => setCopiedIdx(null), 1800);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* SECTION 1: OUTLINE HEADING UPGRADES */}
      {safeHeaders.length > 0 && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-brand-500" />
              <h4 className="studio-section-eyebrow">
                Outline Heading Upgrades ({safeHeaders.length})
              </h4>
            </div>
          </div>

          <div className="space-y-3">
            {safeHeaders.map((item, idx) => (
              <div key={`hdr-${idx}`} className="studio-surface p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold studio-text-secondary">
                    Heading {idx + 1}
                  </span>
                  {item.issue && (
                    <span className="studio-pill studio-pill-warning">
                      {cleanSimpleText(item.issue)}
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="studio-diff-before">
                    <div
                      className="text-[10px] font-semibold uppercase tracking-wider mb-0.5"
                      style={{ color: 'var(--fail-red)' }}
                    >
                      Original
                    </div>
                    <p className="studio-text-secondary leading-relaxed">
                      "{item.originalHeader}"
                    </p>
                  </div>

                  <div className="studio-diff-after">
                    <div
                      className="text-[10px] font-semibold uppercase tracking-wider mb-0.5"
                      style={{ color: 'var(--pass-green)' }}
                    >
                      Improved Heading
                    </div>
                    <p className="studio-text-primary font-medium leading-relaxed">
                      "{item.upgradedHeader}"
                    </p>
                    <button
                      type="button"
                      onClick={() => handleCopy(item.upgradedHeader, `hdr-${idx}`)}
                      className="editorial-popover-close"
                      style={{ position: 'absolute', right: '6px', top: '6px' }}
                      title="Copy improved heading"
                      aria-label="Copy improved heading"
                    >
                      {copiedIdx === `hdr-${idx}` ? (
                        <Check size={13} className="text-emerald-600" />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                  </div>
                </div>

                {item.rule && (
                  <p className="pt-2 border-t border-[var(--border)] text-[11.5px] studio-text-muted leading-relaxed">
                    <strong className="studio-text-secondary font-semibold">Why: </strong>
                    {cleanSimpleText(item.rule)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECTION 2: BEFORE -> AFTER PARAGRAPH & THESIS IMPROVEMENTS */}
      {safeRewrites.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h4 className="studio-section-eyebrow">
              Paragraph &amp; Thesis Upgrades ({safeRewrites.length})
            </h4>

            <div className="studio-segmented" role="tablist" aria-label="Rewrite quality level">
              {Object.entries(TIER_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={selectedTier === key}
                  onClick={() => setSelectedTier(key)}
                  className={`studio-segmented-btn ${selectedTier === key ? 'is-active' : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {safeRewrites.map((rw, idx) => {
              if (!rw) return null;
              const currentRewriteText =
                rw[selectedTier] || rw.highScorer || rw.cssStandard || rw.basic || '';

              return (
                <div key={idx} className="studio-surface p-3.5 space-y-2.5">
                  {(rw.locationId || rw.issueDiagnosed || rw.targetType) && (
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[11px] font-semibold studio-text-primary">
                        {rw.locationId
                          ? formatLocationLabel(rw.locationId)
                          : rw.targetType || `Section ${idx + 1}`}
                      </span>
                      {rw.issueDiagnosed && (
                        <span className="studio-pill studio-pill-warning">
                          {cleanSimpleText(rw.issueDiagnosed)}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="space-y-2 text-xs">
                    {rw.original && (
                      <div className="studio-diff-before">
                        <div
                          className="text-[10px] font-semibold uppercase tracking-wider mb-0.5"
                          style={{ color: 'var(--fail-red)' }}
                        >
                          Your Draft
                        </div>
                        <p className="studio-text-secondary leading-relaxed">
                          "{rw.original}"
                        </p>
                      </div>
                    )}

                    <div className="studio-diff-after">
                      <div
                        className="text-[10px] font-semibold uppercase tracking-wider mb-0.5"
                        style={{ color: 'var(--pass-green)' }}
                      >
                        Improved ({TIER_LABELS[selectedTier]})
                      </div>
                      <p className="studio-text-primary font-academic text-[13.5px] leading-relaxed">
                        "{currentRewriteText}"
                      </p>
                      <button
                        type="button"
                        onClick={() => handleCopy(currentRewriteText, `rw-${idx}`)}
                        className="editorial-popover-close"
                        style={{ position: 'absolute', right: '6px', top: '6px' }}
                        title="Copy rewrite"
                        aria-label="Copy rewrite"
                      >
                        {copiedIdx === `rw-${idx}` ? (
                          <Check size={13} className="text-emerald-600" />
                        ) : (
                          <Copy size={13} />
                        )}
                      </button>
                    </div>
                  </div>

                  {rw.whatChanged && (
                    <p className="pt-2 border-t border-[var(--border)] text-[11.5px] studio-text-muted leading-relaxed">
                      <strong className="studio-text-secondary font-semibold">What changed: </strong>
                      {cleanSimpleText(rw.whatChanged)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
