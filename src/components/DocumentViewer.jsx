import React, { useState, useRef } from 'react';
import { FileText, ChevronDown, ChevronUp, BarChart2, Cpu } from 'lucide-react';

export const DocumentViewer = ({ evaluation, selectedAnnId, onSelectAnnId }) => {
  const [isVisualExpanded, setIsVisualExpanded] = useState(false);
  const containerRef = useRef(null);

  if (!evaluation) return null;

  const evaluatedModelName = evaluation.evaluatedModelName || 'Gemini 2.5 Flash';

  // Real AI-generated annotations only — no hardcoded fallbacks.
  // Post-processing validation already removed orphaned annotations in geminiApi.js
  const allAnnotations = evaluation.annotations || [];

  const suggestedVisual = evaluation.suggestedVisual || null;

  // Real transcribed text from Agent 2 — no hardcoded fallback text
  const fullText = evaluation.fullTranscribedText || evaluation.text || '';

  const paragraphs = fullText.split('\n\n');

  // Identify exact paragraph index where the suggested visual belongs inline
  const targetHeading = suggestedVisual?.insertAfterHeading?.toLowerCase() || '';
  let visualInsertIndex = paragraphs.findIndex(p => p.toLowerCase().includes(targetHeading));
  if (visualInsertIndex === -1) visualInsertIndex = 2; // Default after intro if no matching heading

  const handleTranscribedClick = (e, ann) => {
    e.stopPropagation();
    if (onSelectAnnId) {
      onSelectAnnId(ann.id || `ann-${ann.targetPhrase}`);
    }
  };

  /**
   * Case-Insensitive Robust Regex Highlighter (Supporting 1-10 word target phrases sorted by length)
   */
  const renderHighlightedParagraph = (text) => {
    if (!allAnnotations || allAnnotations.length === 0) return text;

    const validAnns = allAnnotations.filter(a => {
      if (!a.targetPhrase) return false;
      const escaped = a.targetPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(escaped, 'i').test(text);
    });

    if (validAnns.length === 0) return text;

    // Sort valid annotations by length descending so longer 1-10 word phrases match before shorter sub-phrases
    validAnns.sort((a, b) => b.targetPhrase.length - a.targetPhrase.length);

    // Create regex matching any of the valid target phrases
    const regexPattern = new RegExp(
      `(${validAnns.map(a => a.targetPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
      'gi'
    );

    const parts = text.split(regexPattern);

    return parts.map((part, i) => {
      const matchedAnn = validAnns.find(a => a.targetPhrase.toLowerCase() === part.toLowerCase());
      if (matchedAnn) {
        const annId = matchedAnn.id || `ann-${matchedAnn.targetPhrase}`;
        const isSelected = selectedAnnId === annId;

        return (
          <span
            key={`${annId}-${i}`}
            onClick={(e) => handleTranscribedClick(e, matchedAnn)}
            className={`word-highlight ${matchedAnn.type}`}
            style={{
              position: 'relative',
              display: 'inline-block',
              padding: '1px 4px',
              margin: '0 1px',
              cursor: 'pointer',
              borderRadius: '3px',
              boxShadow: isSelected ? '0 0 0 2px #38bdf8, 0 4px 12px rgba(56, 189, 248, 0.4)' : 'none',
              transform: isSelected ? 'scale(1.05)' : 'none',
              transition: 'all 0.15s ease'
            }}
            title={`Click to focus comment in side panel: ${matchedAnn.comment}`}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const renderSuggestedVisualDropdown = () => (
    <div
      style={{
        margin: '1.25rem 0',
        background: '#f8fafc',
        border: '1.5px dashed #0284c7',
        borderRadius: '6px',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)'
      }}
    >
      {/* Clickable Header Bar */}
      <div
        onClick={(e) => { e.stopPropagation(); setIsVisualExpanded(!isVisualExpanded); }}
        style={{
          padding: '8px 12px',
          background: 'rgba(2, 132, 199, 0.08)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#0369a1',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart2 size={16} color="#0284c7" />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, fontFamily: 'Arial, sans-serif' }}>
            📊 {suggestedVisual.title || 'Suggested Visual Diagram'}
          </span>
          <span style={{ fontSize: '0.68rem', background: '#0284c7', color: 'white', padding: '1px 6px', borderRadius: '10px', fontWeight: 600 }}>
            Click to Expand
          </span>
        </div>
        {isVisualExpanded ? <ChevronUp size={16} color="#0369a1" /> : <ChevronDown size={16} color="#0369a1" />}
      </div>

      {/* Collapsible Diagram Content */}
      {isVisualExpanded && (
        <div style={{ padding: '12px 14px', borderTop: '1px solid #e2e8f0', background: '#ffffff' }}>
          {suggestedVisual.description && (
            <p style={{ margin: '0 0 8px 0', fontSize: '0.78rem', color: '#475569', lineHeight: 1.4, fontFamily: 'sans-serif' }}>
              💡 <strong>Examiner Insight:</strong> {suggestedVisual.description}
            </p>
          )}

          {suggestedVisual.diagramText && (
            <pre
              style={{
                margin: 0,
                padding: '10px 12px',
                background: '#0f172a',
                color: '#38bdf8',
                borderRadius: '4px',
                fontSize: '0.78rem',
                fontFamily: 'JetBrains Mono, monospace',
                lineHeight: 1.5,
                overflowX: 'auto',
                border: '1px solid #1e293b'
              }}
            >
              {suggestedVisual.diagramText}
            </pre>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="paper-container"
      onClick={() => onSelectAnnId && onSelectAnnId(null)}
      style={{
        flex: 1,
        height: '100%',
        minHeight: 0,
        overflowY: 'auto',
        padding: '1.5rem 1.5rem 4rem 1.5rem',
        background: 'var(--bg-app)'
      }}
    >
      {/* Top Booklet Banner */}
      <div style={{ maxWidth: '760px', margin: '0 auto 1rem auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={16} color="var(--accent-blue)" />
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Transcribed Academic Answer Sheet
          </span>
        </div>

        {/* AI MODEL ENGINE BADGE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '3px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)' }}>
          <Cpu size={12} color="var(--accent-blue)" />
          <span>Evaluated by: <strong>{evaluatedModelName}</strong></span>
        </div>
      </div>

      {/* AUTHENTIC FPSC CSS PHYSICAL ANSWER SHEET */}
      <div className="physical-paper" style={{ position: 'relative' }}>
        
        {/* Paper Meta Header */}
        <div className="paper-meta">
          <div>
            <strong>Subject:</strong> {evaluation.subject || 'Islamic History & Culture'}
          </div>
          <div>
            <strong>Evaluated By:</strong> {evaluatedModelName}
          </div>
        </div>

        {/* Formatted Transcribed Content Paragraphs with Synchronized Highlighting */}
        {paragraphs.map((para, pIdx) => {
          const isHeading = para.length < 80 && !para.endsWith('.') && (para.includes(':') || para.match(/^[0-9A-Z]/));
          const highlightedContent = renderHighlightedParagraph(para);

          return (
            <React.Fragment key={pIdx}>
              {isHeading ? (
                <h4
                  style={{
                    fontFamily: 'Arial, sans-serif',
                    fontWeight: 700,
                    fontSize: '1.08rem',
                    color: '#0f172a',
                    marginTop: '1.5rem',
                    marginBottom: '0.65rem',
                    borderBottom: '1px solid #e2e8f0',
                    paddingBottom: '4px'
                  }}
                >
                  {highlightedContent}
                </h4>
              ) : (
                <p
                  style={{
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '1rem',
                    lineHeight: 1.85,
                    color: '#1e293b',
                    marginBottom: '1.25rem'
                  }}
                >
                  {highlightedContent}
                </p>
              )}

              {/* CONTEXTUAL INLINE PLACEMENT: Insert Suggested Visual dropdown right after its target section! */}
              {pIdx === visualInsertIndex && suggestedVisual && renderSuggestedVisualDropdown()}
            </React.Fragment>
          );
        })}

      </div>
    </div>
  );
};
