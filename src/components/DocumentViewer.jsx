import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  ChevronDown,
  ChevronUp,
  Cpu,
  Image as ImageIcon,
  Printer,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Copy,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { cleanSimpleText, getSimpleHeadline } from '../utils/textUtils';

export const DocumentViewer = ({
  evaluation,
  selectedAnnId,
  onSelectAnnId,
  submissionImages = []
}) => {
  const [viewMode, setViewMode] = useState('transcribed'); // 'transcribed' | 'original'
  const [isVisualExpanded, setIsVisualExpanded] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all'); // 'all' | 'red' | 'amber' | 'green'
  const [copied, setCopied] = useState(false);
  const [popoverPos, setPopoverPos] = useState(null);

  const containerRef = useRef(null);
  const paperRef = useRef(null);
  const highlightRefs = useRef({});

  // Reset refs when evaluation changes
  useEffect(() => {
    highlightRefs.current = {};
    setViewMode('transcribed');
    setPopoverPos(null);
  }, [evaluation?.id]);

  if (!evaluation) return null;

  const evaluatedModelName = evaluation.evaluatedModelName || 'Gemini 3.8 Flash';
  const allAnnotations = evaluation.annotations || [];
  const suggestedVisual = evaluation.suggestedVisual || null;
  const fullText = evaluation.fullTranscribedText || evaluation.text || '';
  const imagePages = evaluation.imagePages?.length > 0 ? evaluation.imagePages : submissionImages;

  const paragraphs = useMemo(() => fullText.split(/\n\s*\n/).filter(Boolean), [fullText]);

  // Identify currently selected annotation
  const activeAnnotation = useMemo(() => {
    if (!selectedAnnId) return null;
    return allAnnotations.find(
      (a, idx) => (a.id || `ann-${idx}`) === selectedAnnId || `ann-${a.targetPhrase}` === selectedAnnId
    ) || null;
  }, [selectedAnnId, allAnnotations]);

  // Filtered annotations for the stepper
  const filteredAnnotations = useMemo(() => {
    if (activeCategoryFilter === 'all') return allAnnotations;
    return allAnnotations.filter((a) => a.type === activeCategoryFilter);
  }, [allAnnotations, activeCategoryFilter]);

  const activeIndexInFiltered = useMemo(() => {
    if (!activeAnnotation) return -1;
    const activeId = activeAnnotation.id || `ann-${activeAnnotation.targetPhrase}`;
    return filteredAnnotations.findIndex(
      (a, idx) => (a.id || `ann-${idx}`) === activeId || `ann-${a.targetPhrase}` === activeId
    );
  }, [filteredAnnotations, activeAnnotation]);

  // Calculate Popover Position Anchored to Underlined Word
  const updatePopoverPosition = useCallback(() => {
    if (!selectedAnnId || !paperRef.current) {
      setPopoverPos(null);
      return;
    }

    const targetEl = highlightRefs.current[selectedAnnId];
    if (!targetEl) {
      setPopoverPos(null);
      return;
    }

    const targetRect = targetEl.getBoundingClientRect();
    const paperRect = paperRef.current.getBoundingClientRect();
    const isMobile = window.innerWidth < 640;
    const cardWidth = isMobile ? Math.min(320, window.innerWidth - 32) : 340;

    // Position relative to paper container
    let top = targetRect.bottom - paperRect.top + 8;
    let left = targetRect.left - paperRect.left + targetRect.width / 2 - cardWidth / 2;

    // Clamp horizontally inside paper container
    const minLeft = 8;
    const maxLeft = paperRect.width - cardWidth - 8;
    left = Math.max(minLeft, Math.min(left, maxLeft));

    // Check vertical clearance
    const spaceBelow = window.innerHeight - targetRect.bottom;
    let placement = 'bottom';
    if (spaceBelow < 210 && targetRect.top > 230) {
      top = targetRect.top - paperRect.top - 170;
      placement = 'top';
    }

    setPopoverPos({ top, left, width: cardWidth, placement });
  }, [selectedAnnId]);

  // Update position on selection change, resize, or scroll
  useEffect(() => {
    if (selectedAnnId && viewMode === 'transcribed') {
      const targetEl = highlightRefs.current[selectedAnnId];
      if (targetEl && typeof targetEl.scrollIntoView === 'function') {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      // Allow DOM to settle scroll before calculating rect
      const timeoutId = setTimeout(updatePopoverPosition, 160);
      return () => clearTimeout(timeoutId);
    } else {
      setPopoverPos(null);
    }
  }, [selectedAnnId, viewMode, updatePopoverPosition]);

  useEffect(() => {
    window.addEventListener('resize', updatePopoverPosition);
    return () => window.removeEventListener('resize', updatePopoverPosition);
  }, [updatePopoverPosition]);

  // Stepper Handlers
  const handleNextAnnotation = (e) => {
    e?.stopPropagation();
    if (filteredAnnotations.length === 0) return;
    const nextIdx = (activeIndexInFiltered + 1) % filteredAnnotations.length;
    const nextAnn = filteredAnnotations[nextIdx];
    if (nextAnn && onSelectAnnId) {
      onSelectAnnId(nextAnn.id || `ann-${nextAnn.targetPhrase}`);
    }
  };

  const handlePrevAnnotation = (e) => {
    e?.stopPropagation();
    if (filteredAnnotations.length === 0) return;
    const prevIdx =
      (activeIndexInFiltered - 1 + filteredAnnotations.length) % filteredAnnotations.length;
    const prevAnn = filteredAnnotations[prevIdx];
    if (prevAnn && onSelectAnnId) {
      onSelectAnnId(prevAnn.id || `ann-${prevAnn.targetPhrase}`);
    }
  };

  const handleCopyFix = (e) => {
    e?.stopPropagation();
    if (!activeAnnotation) return;
    const textToCopy = activeAnnotation.suggestion || activeAnnotation.targetPhrase || '';
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTranscribedClick = (e, ann) => {
    e.stopPropagation();
    const annId = ann.id || `ann-${ann.targetPhrase}`;
    if (selectedAnnId === annId) {
      // Toggle off if already selected
      if (onSelectAnnId) onSelectAnnId(null);
    } else {
      if (onSelectAnnId) onSelectAnnId(annId);
    }
  };

  /**
   * Underline Highlighter with QuillBot Aesthetics
   */
  const renderHighlightedParagraph = (text) => {
    if (!allAnnotations || allAnnotations.length === 0) return text;

    const validAnns = allAnnotations.filter((a) => {
      if (!a.targetPhrase || typeof a.targetPhrase !== 'string') return false;
      const escaped = a.targetPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(escaped, 'i').test(text);
    });

    if (validAnns.length === 0) return text;

    // Longest first to avoid partial substring collisions
    validAnns.sort((a, b) => b.targetPhrase.length - a.targetPhrase.length);

    const regexPattern = new RegExp(
      `(${validAnns.map((a) => a.targetPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
      'gi'
    );

    const parts = text.split(regexPattern);

    return parts.map((part, i) => {
      const matchedAnn = validAnns.find(
        (a) => a.targetPhrase.toLowerCase() === part.toLowerCase()
      );
      if (matchedAnn) {
        const annId = matchedAnn.id || `ann-${matchedAnn.targetPhrase}`;
        const isSelected = selectedAnnId === annId;
        const colorType = matchedAnn.type || 'amber';

        return (
          <span
            key={`${annId}-${i}`}
            ref={(el) => {
              if (el) highlightRefs.current[annId] = el;
            }}
            onClick={(e) => handleTranscribedClick(e, matchedAnn)}
            className={`paper-underline ${colorType} ${isSelected ? 'active' : ''}`}
            title={cleanSimpleText(matchedAnn.comment || matchedAnn.category || '')}
          >
            {part}
            {isSelected && <span className="quillbot-pin" />}
          </span>
        );
      }
      return part;
    });
  };

  // Counts for Category Dock
  const redCount = allAnnotations.filter((a) => a.type === 'red').length;
  const amberCount = allAnnotations.filter((a) => a.type === 'amber').length;
  const greenCount = allAnnotations.filter((a) => a.type === 'green').length;

  return (
    <div
      ref={containerRef}
      className="paper-container relative"
      onClick={() => onSelectAnnId && onSelectAnnId(null)}
      style={{
        flex: 1,
        height: '100%',
        minHeight: 0,
        overflowY: 'auto',
        padding: '1.25rem 1rem 6rem 1rem',
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
        {/* View Mode Switcher (Transcribed vs Original Scanned Pages) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {imagePages && imagePages.length > 0 ? (
            <div
              style={{
                display: 'flex',
                background: 'var(--bg-card)',
                padding: '2px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)'
              }}
            >
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
                <span>Text Script</span>
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
                <span>Original Photos ({imagePages.length})</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} color="var(--accent-blue)" />
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Evaluated Script
              </span>
            </div>
          )}
        </div>

        {/* Right Actions: AI Model Badge + Print Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.7rem',
              color: 'var(--accent-blue)',
              fontFamily: 'var(--font-mono)'
            }}
          >
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
            title="Export evaluation as PDF"
          >
            <Printer size={13} color="var(--accent-blue)" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: ORIGINAL UPLOADED HANDWRITTEN PAGES */}
      {viewMode === 'original' && imagePages && imagePages.length > 0 ? (
        <div
          style={{
            maxWidth: '760px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}
        >
          {imagePages.map((imgSrc, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-strong)',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
              }}
            >
              <div
                style={{
                  padding: '6px 12px',
                  background: 'var(--bg-panel)',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.72rem',
                  color: 'var(--text-secondary)'
                }}
              >
                <span>Submitted Script — Page {idx + 1} of {imagePages.length}</span>
                <span>{evaluation.subject || 'Paper Evaluation'}</span>
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
        /* VIEW 2: AUTHENTIC ANSWER SHEET WITH QUILLBOT-STYLE UNDERLINES & ANCHORED CARD */
        <div
          ref={paperRef}
          className="physical-paper relative"
          style={{ position: 'relative' }}
        >
          {/* Paper Meta Header */}
          <div className="paper-meta">
            <div>
              <strong>Subject:</strong> {evaluation.subject || 'English Essay'}
            </div>
            {evaluation.examQuestion && (
              <div
                style={{
                  maxWidth: '420px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                title={evaluation.examQuestion}
              >
                <strong>Topic:</strong> {evaluation.examQuestion}
              </div>
            )}
            <div>
              <strong>Date:</strong> {evaluation.date || new Date().toISOString().split('T')[0]}
            </div>
          </div>

          {/* Formatted Transcribed Paragraphs with Subtle Wavy Underlines */}
          {paragraphs.map((para, pIdx) => {
            const trimmed = para.trim();
            const isHeading =
              trimmed.length < 90 &&
              !trimmed.endsWith('.') &&
              (trimmed.includes(':') || /^[0-9A-IVX]+[.\-)]/.test(trimmed));
            const highlightedContent = renderHighlightedParagraph(para);

            return (
              <React.Fragment key={pIdx}>
                {isHeading ? (
                  <h4
                    style={{
                      fontFamily: 'Arial, sans-serif',
                      fontWeight: 700,
                      fontSize: '1.02rem',
                      color: '#0f172a',
                      marginTop: '1.25rem',
                      marginBottom: '0.55rem',
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
                      fontSize: '0.96rem',
                      lineHeight: 1.85,
                      color: '#1e293b',
                      marginBottom: '1.15rem',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {highlightedContent}
                  </p>
                )}
              </React.Fragment>
            );
          })}

          {/* QUILLBOT ANCHORED CONTEXTUAL POPOVER */}
          {activeAnnotation && popoverPos && (
            <div
              className="quillbot-card"
              onClick={(e) => e.stopPropagation()}
              style={{
                top: `${popoverPos.top}px`,
                left: `${popoverPos.left}px`,
                width: `${popoverPos.width}px`
              }}
            >
              {/* Header: Dot + Simple Title + Dismiss */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background:
                        activeAnnotation.type === 'red'
                          ? '#ef4444'
                          : activeAnnotation.type === 'green'
                          ? '#10b981'
                          : '#f59e0b'
                    }}
                  />
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)'
                    }}
                  >
                    {getSimpleHeadline(activeAnnotation)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectAnnId && onSelectAnnId(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Close popup"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Bold Proposed Replacement (QuillBot style) */}
              {activeAnnotation.suggestion && (
                <div
                  style={{
                    fontSize: '0.98rem',
                    fontWeight: 700,
                    color: '#059669',
                    marginBottom: '6px',
                    letterSpacing: '-0.01em'
                  }}
                >
                  {activeAnnotation.suggestion}
                </div>
              )}

              {/* Inline Diff (~~strikethrough~~ -> green suggestion) */}
              <div
                style={{
                  fontSize: '0.78rem',
                  lineHeight: 1.45,
                  color: 'var(--text-secondary)',
                  marginBottom: '8px',
                  background: 'var(--bg-card-hover)',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)'
                }}
              >
                {activeAnnotation.targetPhrase && (
                  <del
                    style={{
                      textDecoration: 'line-through',
                      color: '#ef4444',
                      marginRight: '6px',
                      opacity: 0.85
                    }}
                  >
                    {activeAnnotation.targetPhrase}
                  </del>
                )}
                {activeAnnotation.suggestion && (
                  <ins
                    style={{
                      textDecoration: 'none',
                      color: '#059669',
                      fontWeight: 600
                    }}
                  >
                    {activeAnnotation.suggestion}
                  </ins>
                )}
              </div>

              {/* Simple, Direct 1-Sentence Reason (Strictly no jargon, no "FPSC" or "examiner") */}
              {(activeAnnotation.comment || activeAnnotation.microLesson) && (
                <p
                  style={{
                    fontSize: '0.76rem',
                    lineHeight: 1.4,
                    color: 'var(--text-secondary)',
                    margin: '0 0 10px 0'
                  }}
                >
                  {cleanSimpleText(activeAnnotation.comment || activeAnnotation.microLesson)}
                </p>
              )}

              {/* Action Buttons: Accept / Copy Fix + Stepper */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '6px',
                  borderTop: '1px solid var(--border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleCopyFix}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: copied ? '#059669' : '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      padding: '5px 12px',
                      borderRadius: '9999px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background 0.15s ease'
                    }}
                    title="Copy suggestion to clipboard"
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copied ? 'Copied!' : 'Accept Fix'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectAnnId && onSelectAnnId(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      padding: '4px 6px'
                    }}
                  >
                    Dismiss
                  </button>
                </div>

                {/* Micro Stepper Inside Popover */}
                {filteredAnnotations.length > 1 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.7rem',
                      color: 'var(--text-muted)'
                    }}
                  >
                    <span>
                      {activeIndexInFiltered >= 0 ? activeIndexInFiltered + 1 : 1}/
                      {filteredAnnotations.length}
                    </span>
                    <button
                      type="button"
                      onClick={handlePrevAnnotation}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Previous issue"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextAnnotation}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Next issue"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PERSISTENT FLOATING BOTTOM CATEGORY & STEPPER DOCK (QUILLBOT STYLE) */}
      {viewMode === 'transcribed' && allAnnotations.length > 0 && (
        <div className="quillbot-bottom-dock no-print">
          {/* Category Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              onClick={() => setActiveCategoryFilter('all')}
              style={{
                background:
                  activeCategoryFilter === 'all'
                    ? 'var(--accent-blue-soft)'
                    : 'transparent',
                color:
                  activeCategoryFilter === 'all'
                    ? 'var(--accent-blue)'
                    : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '9999px',
                padding: '4px 9px',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>All ({allAnnotations.length})</span>
            </button>

            {redCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('red')}
                style={{
                  background:
                    activeCategoryFilter === 'red'
                      ? 'rgba(239, 68, 68, 0.12)'
                      : 'transparent',
                  color: activeCategoryFilter === 'red' ? '#dc2626' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '4px 8px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#dc2626'
                  }}
                />
                <span>Errors ({redCount})</span>
              </button>
            )}

            {amberCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('amber')}
                style={{
                  background:
                    activeCategoryFilter === 'amber'
                      ? 'rgba(245, 158, 11, 0.14)'
                      : 'transparent',
                  color:
                    activeCategoryFilter === 'amber' ? '#d97706' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '4px 8px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#d97706'
                  }}
                />
                <span>Polish ({amberCount})</span>
              </button>
            )}

            {greenCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('green')}
                style={{
                  background:
                    activeCategoryFilter === 'green'
                      ? 'rgba(16, 185, 129, 0.14)'
                      : 'transparent',
                  color:
                    activeCategoryFilter === 'green' ? '#059669' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '4px 8px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#059669'
                  }}
                />
                <span>Good ({greenCount})</span>
              </button>
            )}
          </div>

          <div
            style={{
              width: '1px',
              height: '16px',
              background: 'var(--border)',
              margin: '0 2px'
            }}
          />

          {/* Stepper (‹ 1/6 ›) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              onClick={handlePrevAnnotation}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Previous issue"
            >
              <ChevronLeft size={16} />
            </button>

            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                minWidth: '32px',
                textAlign: 'center'
              }}
            >
              {activeIndexInFiltered >= 0 ? activeIndexInFiltered + 1 : 0}/
              {filteredAnnotations.length}
            </span>

            <button
              type="button"
              onClick={handleNextAnnotation}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Next issue"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
