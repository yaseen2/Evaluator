import React, { useState, useRef, useEffect } from 'react';
import { FileText, ChevronDown, ChevronUp, BarChart2, Cpu, Image as ImageIcon, Printer } from 'lucide-react';

export const DocumentViewer = ({ evaluation, selectedAnnId, onSelectAnnId, submissionImages = [] }) => {
  const [isVisualExpanded, setIsVisualExpanded] = useState(false);
  const [viewMode, setViewMode] = useState('transcribed'); // 'transcribed' | 'original'
  const containerRef = useRef(null);
  const highlightRefs = useRef({});

  // Reset highlight refs when evaluation changes
  useEffect(() => {
    highlightRefs.current = {};
    setViewMode('transcribed');
  }, [evaluation?.id]);

  // Bidirectional Scroll Sync: When user selects a callout in RubricTabs, scroll paper to highlight
  useEffect(() => {
    if (selectedAnnId && viewMode === 'transcribed') {
      const targetEl = highlightRefs.current[selectedAnnId];
      if (targetEl && typeof targetEl.scrollIntoView === 'function') {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedAnnId, viewMode]);

  if (!evaluation) return null;

  const evaluatedModelName = evaluation.evaluatedModelName || 'Gemini 3.8 Flash';
  const allAnnotations = evaluation.annotations || [];
  const suggestedVisual = evaluation.suggestedVisual || null;
  const fullText = evaluation.fullTranscribedText || evaluation.text || '';
  const imagePages = evaluation.imagePages?.length > 0 ? evaluation.imagePages : submissionImages;

  const paragraphs = fullText.split(/\n\s*\n/).filter(Boolean);

  // Identify exact paragraph index where the suggested visual belongs inline
  const targetHeading = suggestedVisual?.insertAfterHeading?.toLowerCase()?.trim() || '';
  let visualInsertIndex = targetHeading
    ? paragraphs.findIndex((p) => p.toLowerCase().includes(targetHeading))
    : -1;
  if (visualInsertIndex === -1 && paragraphs.length > 0) {
    visualInsertIndex = Math.min(2, paragraphs.length - 1);
  }

  // Identify currently selected annotation object for inline Micro-Lesson banner
  const activeAnnotation = selectedAnnId
    ? allAnnotations.find((a, idx) => (a.id || `ann-${idx}`) === selectedAnnId || `ann-${a.targetPhrase}` === selectedAnnId)
    : null;

  const renderInlineMicroLessonCard = (ann) => {
    const borderColor =
      ann.type === 'red' ? '#dc2626' : ann.type === 'green' ? '#059669' : '#d97706';
    const bgTint =
      ann.type === 'red'
        ? '#fef2f2'
        : ann.type === 'green'
        ? '#ecfdf5'
        : '#fffbeb';

    return (
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          margin: '0.5rem 0 1rem 0',
          padding: '10px 14px',
          background: bgTint,
          border: `1px solid ${borderColor}`,
          borderLeft: `4px solid ${borderColor}`,
          borderRadius: '6px',
          fontFamily: 'var(--font-sans)',
          fontSize: '0.8rem',
          lineHeight: 1.45,
          color: '#0f172a',
          boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
          animation: 'popIn 0.14s ease'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: borderColor, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            {ann.category || 'Diagnostic Note'} — "{ann.targetPhrase}"
          </span>
          <button
            type="button"
            onClick={() => onSelectAnnId && onSelectAnnId(null)}
            style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}
          >
            Dismiss ×
          </button>
        </div>

        <div style={{ color: '#1e293b', fontWeight: 500, marginBottom: ann.suggestion || ann.microLesson ? '6px' : 0 }}>
          {ann.comment}
        </div>

        {ann.suggestion && (
          <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '5px 8px', borderRadius: '4px', fontSize: '0.76rem', color: '#0369a1', marginBottom: ann.microLesson ? '5px' : 0 }}>
            💡 <strong>Rewrite Fix:</strong> {ann.suggestion}
          </div>
        )}

        {ann.microLesson && (
          <div style={{ fontSize: '0.73rem', color: '#475569' }}>
            📘 <strong>Rule to Remember:</strong> {ann.microLesson}
          </div>
        )}
      </div>
    );
  };
  const handleTranscribedClick = (e, ann) => {
    e.stopPropagation();
    if (onSelectAnnId) {
      onSelectAnnId(ann.id || `ann-${ann.targetPhrase}`);
    }
  };

  /**
   * Case-Insensitive Regex Highlighter with Ref Registration for Bidirectional Scroll
   */
  const renderHighlightedParagraph = (text) => {
    if (!allAnnotations || allAnnotations.length === 0) return text;

    const validAnns = allAnnotations.filter((a) => {
      if (!a.targetPhrase || typeof a.targetPhrase !== 'string') return false;
      const escaped = a.targetPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(escaped, 'i').test(text);
    });

    if (validAnns.length === 0) return text;

    // Sort longest first so longer phrases match before shorter sub-phrases
    validAnns.sort((a, b) => b.targetPhrase.length - a.targetPhrase.length);

    const regexPattern = new RegExp(
      `(${validAnns.map((a) => a.targetPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
      'gi'
    );

    const parts = text.split(regexPattern);

    return parts.map((part, i) => {
      const matchedAnn = validAnns.find((a) => a.targetPhrase.toLowerCase() === part.toLowerCase());
      if (matchedAnn) {
        const annId = matchedAnn.id || `ann-${matchedAnn.targetPhrase}`;
        const isSelected = selectedAnnId === annId;

        return (
          <span
            key={`${annId}-${i}`}
            ref={(el) => {
              if (el) highlightRefs.current[annId] = el;
            }}
            onClick={(e) => handleTranscribedClick(e, matchedAnn)}
            className={`word-highlight ${matchedAnn.type}`}
            style={{
              padding: '1px 4px',
              margin: '0 1px',
              borderRadius: '3px',
              boxShadow: isSelected
                ? '0 0 0 2px #0284c7, 0 4px 14px rgba(2, 132, 199, 0.45)'
                : 'none',
              fontWeight: isSelected ? 600 : 'inherit'
            }}
            title={`[${matchedAnn.category}] ${matchedAnn.comment}`}
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
      <div
        onClick={(e) => {
          e.stopPropagation();
          setIsVisualExpanded(!isVisualExpanded);
        }}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <BarChart2 size={16} color="#0284c7" />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, fontFamily: 'Arial, sans-serif' }}>
            📊 {suggestedVisual.title || 'Suggested Visual Schematic'}
          </span>
          <span style={{ fontSize: '0.68rem', background: '#0284c7', color: 'white', padding: '1px 6px', borderRadius: '10px', fontWeight: 600 }}>
            {isVisualExpanded ? 'Hide Blueprint' : 'Click to Expand'}
          </span>
        </div>
        {isVisualExpanded ? <ChevronUp size={16} color="#0369a1" /> : <ChevronDown size={16} color="#0369a1" />}
      </div>

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
        padding: '1.25rem 1.5rem 4rem 1.5rem',
        background: 'var(--bg-app)'
      }}
    >
      {/* Top Booklet Toolbar */}
      <div
        className="no-print"
        style={{
          maxWidth: '760px',
          margin: '0 auto 0.85rem auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px'
        }}
      >
        {/* View Mode Switcher (Transcribed vs Original Handwritten Pages) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {imagePages && imagePages.length > 0 ? (
            <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '2px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setViewMode('transcribed');
                }}
                style={{
                  background: viewMode === 'transcribed' ? 'var(--bg-card-hover)' : 'transparent',
                  color: viewMode === 'transcribed' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: '3px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <FileText size={13} />
                <span>Annotated Transcript</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setViewMode('original');
                }}
                style={{
                  background: viewMode === 'original' ? 'var(--bg-card-hover)' : 'transparent',
                  color: viewMode === 'original' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: '3px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <ImageIcon size={13} />
                <span>Original Pages ({imagePages.length})</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} color="var(--accent-blue)" />
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Annotated FPSC Answer Booklet
              </span>
            </div>
          )}
        </div>

        {/* Right Actions: Model Badge + Print/PDF Report */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)' }}>
            <Cpu size={12} color="var(--accent-blue)" />
            <span>{evaluatedModelName}</span>
          </div>

          <button
            className="btn-minimal"
            onClick={(e) => {
              e.stopPropagation();
              window.print();
            }}
            style={{ padding: '4px 10px', fontSize: '0.72rem' }}
            title="Print or Save Evaluation Report as PDF"
          >
            <Printer size={13} color="var(--accent-blue)" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: ORIGINAL UPLOADED HANDWRITTEN PAGES */}
      {viewMode === 'original' && imagePages && imagePages.length > 0 ? (
        <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {imagePages.map((imgSrc, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-strong)',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 10px 30px rgba(0,0,0,0.25)'
              }}
            >
              <div style={{ padding: '6px 12px', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                <span>Original Candidate Script — Page {idx + 1} of {imagePages.length}</span>
                <span>{evaluation.subject}</span>
              </div>
              <img
                src={imgSrc}
                alt={`Answer Script Page ${idx + 1}`}
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>
          ))}
        </div>
      ) : (
        /* VIEW 2: AUTHENTIC FPSC CSS PHYSICAL ANSWER SHEET WITH HIGHLIGHTS */
        <div className="physical-paper" style={{ position: 'relative' }}>
          {/* Paper Meta Header */}
          <div className="paper-meta">
            <div>
              <strong>Subject:</strong> {evaluation.subject || 'Islamic History & Culture'}
            </div>
            {evaluation.examQuestion && (
              <div style={{ maxWidth: '420px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={evaluation.examQuestion}>
                <strong>Q:</strong> {evaluation.examQuestion}
              </div>
            )}
            <div>
              <strong>Date:</strong> {evaluation.date || new Date().toISOString().split('T')[0]}
            </div>
          </div>

          {/* Formatted Transcribed Content Paragraphs with Synchronized Highlighting */}
          {paragraphs.map((para, pIdx) => {
            const trimmed = para.trim();
            const isHeading =
              trimmed.length < 90 &&
              !trimmed.endsWith('.') &&
              (trimmed.includes(':') || /^[0-9A-IVX]+[.\-)]/.test(trimmed));
            const highlightedContent = renderHighlightedParagraph(para);

            const hasActiveAnnInParagraph =
              activeAnnotation &&
              activeAnnotation.targetPhrase &&
              para.toLowerCase().includes(activeAnnotation.targetPhrase.toLowerCase());

            return (
              <React.Fragment key={pIdx}>
                {isHeading ? (
                  <h4
                    style={{
                      fontFamily: 'Arial, sans-serif',
                      fontWeight: 700,
                      fontSize: '1.05rem',
                      color: '#0f172a',
                      marginTop: '1.4rem',
                      marginBottom: '0.6rem',
                      borderBottom: '1px solid #e2e8f0',
                      paddingBottom: '4px',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {highlightedContent}
                  </h4>
                ) : (
                  <p
                    style={{
                      fontFamily: 'Arial, sans-serif',
                      fontSize: '0.98rem',
                      lineHeight: 1.85,
                      color: '#1e293b',
                      marginBottom: '1.15rem',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {highlightedContent}
                  </p>
                )}

                {hasActiveAnnInParagraph && renderInlineMicroLessonCard(activeAnnotation)}

                {pIdx === visualInsertIndex && suggestedVisual && renderSuggestedVisualDropdown()}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
