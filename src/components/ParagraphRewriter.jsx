import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export const ParagraphRewriter = ({ rewrites }) => {
  const [selectedTier, setSelectedTier] = useState('highScorer'); // 'basic' | 'cssStandard' | 'highScorer'
  const [copiedIdx, setCopiedIdx] = useState(null);

  const safeRewrites = Array.isArray(rewrites) ? rewrites : [];

  if (safeRewrites.length === 0) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        No paragraph rewrites generated for this section.
      </div>
    );
  }

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Level-Up Rewriter
        </span>
        <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-card)', padding: '2px', borderRadius: '4px', border: '1px solid var(--border)' }}>
          <button
            className={`tab-item ${selectedTier === 'basic' ? 'active' : ''}`}
            style={{ padding: '4px 8px', fontSize: '0.7rem' }}
            onClick={() => setSelectedTier('basic')}
          >
            Basic Fix
          </button>
          <button
            className={`tab-item ${selectedTier === 'cssStandard' ? 'active' : ''}`}
            style={{ padding: '4px 8px', fontSize: '0.7rem' }}
            onClick={() => setSelectedTier('cssStandard')}
          >
            CSS Standard
          </button>
          <button
            className={`tab-item ${selectedTier === 'highScorer' ? 'active' : ''}`}
            style={{ padding: '4px 8px', fontSize: '0.7rem' }}
            onClick={() => setSelectedTier('highScorer')}
          >
            High Scorer
          </button>
        </div>
      </div>

      {safeRewrites.map((rw, idx) => {
        if (!rw) return null;
        const currentRewriteText = rw[selectedTier] || rw.highScorer || rw.cssStandard || rw.basic || '';

        return (
          <div key={idx} style={{ marginBottom: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--fail-red)', marginBottom: '4px', padding: '6px 8px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
              "{rw.original || ''}"
            </div>

            <div style={{ position: 'relative', marginTop: '6px', fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: 1.5, background: 'rgba(16, 185, 129, 0.08)', padding: '8px 10px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              "{currentRewriteText}"
              <button
                onClick={() => handleCopy(currentRewriteText, idx)}
                style={{ position: 'absolute', right: '6px', top: '6px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                title="Copy rewrite"
              >
                {copiedIdx === idx ? <Check size={14} color="var(--pass-green)" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
