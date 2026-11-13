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
  AlertCircle,
  Bookmark,
  EyeOff
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
  const [bookmarkedAnnIds, setBookmarkedAnnIds] = useState({});
  const [popoverPos, setPopoverPos] = useState(null);

  const containerRef = useRef(null);
  const paperRef = useRef(null);
  const highlightRefs = useRef({});

  const handleToggleBookmark = (id) => {
    setBookmarkedAnnIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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

  // Map logical essay coordinates ([O...], [P1..PN]) to UI paragraph block indexes so
  // repeated phrases only highlight inside their intended target paragraph.
  const annotationTargetIndexMap = useMemo(() => {
    const map = {};
    if (paragraphs.length === 0 || allAnnotations.length === 0) return map;

    const firstProseIdx = paragraphs.findIndex((blk) => {
      const words = blk.trim().split(/\s+/).filter(Boolean).length;
      const isHeadingOnly =
        /^(?:outline\b|thesis\s*statement\b|[ivxlcdm]+\s*[.):\-]|[0-9]+(?:\.[0-9]+)*\s*[.):\-])/i.test(
          blk.trim()
        ) && words < 45;
      return !isHeadingOnly && words >= 22 && /[.!?]/.test(blk);
    });

    const proseIndices =
      firstProseIdx === -1
        ? []
        : paragraphs.map((_, idx) => idx).filter((idx) => idx >= firstProseIdx);

    allAnnotations.forEach((ann, idx) => {
      const annId = ann.id || `ann-${idx}`;
      const phrase = String(ann.targetPhrase || '').trim();
      if (!phrase) return;
      const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');

      const loc = String(ann.locationId || '').trim();
      const pMatch = loc.match(/^P(\d+)/i);
      if (pMatch) {
        const targetProseNum = parseInt(pMatch[1], 10);
        const candidateIdx = proseIndices[targetProseNum - 1];
        if (typeof candidateIdx === 'number' && regex.test(paragraphs[candidateIdx])) {
          map[annId] = candidateIdx;
          return;
        }
      } else if (/^O\d+/i.test(loc) && firstProseIdx > 0) {
        const outlineIdx = paragraphs
          .slice(0, firstProseIdx)
          .findIndex((blk) => regex.test(blk));
        if (outlineIdx !== -1) {
          map[annId] = outlineIdx;
          return;
        }
      }
    });

    return map;
  }, [paragraphs, allAnnotations]);

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
    const cardWidth = isMobile ? Math.min(320, window.innerWidth - 32) : 360;

    // Position relative to paper container
    let top = targetRect.bottom - paperRect.top + 8;
    let left = targetRect.left - paperRect.left + targetRect.width / 2 - cardWidth / 2;

    // Clamp horizontally inside paper container
    const minLeft = 8;
    const maxLeft = paperRect.width - cardWidth - 8;
    left = Math.max(minLeft, Math.min(left, maxLeft));

    // Calculate pointer arrow notch position pointing directly to the target word
    const targetCenterOnPaper = targetRect.left - paperRect.left + targetRect.width / 2;
    const notchLeft = Math.max(16, Math.min(cardWidth - 24, targetCenterOnPaper - left));

    // Check vertical clearance
    const spaceBelow = window.innerHeight - targetRect.bottom;
    let placement = 'bottom';
    if (spaceBelow < 220 && targetRect.top > 230) {
      top = targetRect.top - paperRect.top - 180;
      placement = 'top';
    }

    setPopoverPos({ top, left, width: cardWidth, placement, notchLeft });
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
   * Coordinate-Aware Underline Highlighter
   */
  const renderHighlightedParagraph = (text, paraIdx) => {
    if (!allAnnotations || allAnnotations.length === 0) return text;

    const validAnns = allAnnotations.filter((a, idx) => {
      if (!a.targetPhrase || typeof a.targetPhrase !== 'string') return false;
      const annId = a.id || `ann-${idx}`;
      const lockedIdx = annotationTargetIndexMap[annId];
      if (typeof lockedIdx === 'number' && lockedIdx !== paraIdx) {
        return false;
      }
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
        const underlineClass =
          colorType === 'red'
            ? 'mark-error'
            : colorType === 'green'
            ? 'mark-good'
            : 'mark-polish';

        return (
          <span
            key={`${annId}-${i}`}
            ref={(el) => {
              if (el && !highlightRefs.current[annId]) {
                highlightRefs.current[annId] = el;
              }
            }}
            onClick={(e) => handleTranscribedClick(e, matchedAnn)}
            className={`${underlineClass} cursor-pointer relative z-10 transition-colors inline ${
              isSelected ? 'ring-2 ring-[#008560] ring-offset-1 rounded-xs' : ''
            }`}
            title={cleanSimpleText(matchedAnn.comment || matchedAnn.category || '')}
          >
            {part}
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
                <span>Original Script ({imagePages.length} {imagePages.length === 1 ? 'Page' : 'Pages'})</span>
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
        /* VIEW 2: AUTHENTIC ANSWER SHEET WITH GRAMMARLY-STYLE POPOVER & RULED PAPER */
        <div className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6 lg:p-8 flex justify-center">
          <article
            ref={paperRef}
            className="w-full max-w-2xl bg-white shadow-xs border border-slate-200/90 rounded-lg p-4 sm:p-7 md:p-8 relative ruled-notebook-paper flex flex-col min-h-[580px] font-academic"
            style={{ position: 'relative' }}
          >
            {/* Classic FPSC Margin Indicator Line */}
            <div
              aria-hidden="true"
              className="absolute left-6 sm:left-10 top-0 bottom-0 w-[1.5px] bg-red-400/50 pointer-events-none"
            />

            {/* Document Meta Header */}
            <div className="pb-3 border-b border-slate-200/60 mb-4 pl-6 sm:pl-10 font-sans text-xs text-slate-500 flex justify-between items-center">
              <span>{evaluation.subject || 'FPSC Answer Paper'}</span>
              <span className="font-mono text-slate-400">
                {evaluation.date || new Date().toISOString().split('T')[0]}
              </span>
            </div>

            {/* Recommended Structural Visual Blueprint (if provided by Stage 2 Coach) */}
            {suggestedVisual && suggestedVisual.diagramText && (
              <div className="mb-4 ml-6 sm:ml-10 rounded-lg border border-slate-200 bg-slate-50/90 font-sans overflow-hidden">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsVisualExpanded((prev) => !prev);
                  }}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-slate-100/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles size={14} className="text-brand-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {suggestedVisual.title || 'Model Topper Outline Blueprint'}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-brand-600 inline-flex items-center gap-1 shrink-0">
                    <span>{isVisualExpanded ? 'Hide Blueprint' : 'View Blueprint'}</span>
                    {isVisualExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </span>
                </button>
                {isVisualExpanded && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="px-3.5 pb-3 pt-1 border-t border-slate-200/80 space-y-2"
                  >
                    {suggestedVisual.description && (
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {suggestedVisual.description}
                      </p>
                    )}
                    <pre className="text-[11px] leading-relaxed font-mono bg-white border border-slate-200 rounded-md p-3 text-slate-800 overflow-x-auto whitespace-pre">
                      {suggestedVisual.diagramText}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Formatted Transcribed Paragraphs on Ruled Canvas */}
            <div className="notebook-ruled-body text-slate-900 pl-6 sm:pl-10 font-academic">
              {paragraphs.map((para, pIdx) => {
                const trimmed = para.trim();
                const isHeading =
                  trimmed.length < 90 &&
                  !trimmed.endsWith('.') &&
                  (trimmed.includes(':') || /^[0-9A-IVX]+[.\-)]/.test(trimmed));
                const highlightedContent = renderHighlightedParagraph(para, pIdx);

                return (
                  <p
                    key={pIdx}
                    className={
                      isHeading
                        ? 'font-bold tracking-tight text-slate-950 font-academic'
                        : 'font-normal text-slate-900 font-academic'
                    }
                  >
                    {highlightedContent}
                  </p>
                );
              })}
            </div>

            {/* GRAMMARLY-STYLE CORRECTION POP-UP CARD */}
            {activeAnnotation && popoverPos && (
              <div
                className="grammarly-card animate-in fade-in duration-200 text-left"
                onClick={(e) => e.stopPropagation()}
                style={{
                  top: `${popoverPos.top}px`,
                  left: `${popoverPos.left}px`,
                  width: `${popoverPos.width}px`
                }}
              >
                {/* Pointer Notch */}
                <div
                  className={
                    popoverPos.placement === 'top'
                      ? 'grammarly-pointer-bottom'
                      : 'grammarly-pointer-top'
                  }
                  style={{ left: `${popoverPos.notchLeft || 28}px` }}
                />

                {/* Header: Dot + Category + Close */}
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 font-sans">
                  <div className="flex items-center space-x-1.5">
                    <span
                      className={`w-2 h-2 rounded-full inline-block flex-shrink-0 animate-pulse ${
                        activeAnnotation.type === 'red'
                          ? 'bg-rose-500'
                          : activeAnnotation.type === 'green'
                          ? 'bg-emerald-500'
                          : 'bg-amber-500'
                      }`}
                    />
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {activeAnnotation.category || getSimpleHeadline(activeAnnotation)}
                    </span>
                  </div>
                  <button
                    aria-label="Close correction card"
                    className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md transition-colors cursor-pointer"
                    onClick={() => onSelectAnnId && onSelectAnnId(null)}
                    type="button"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Main Suggestion: Grammarly Replacement */}
                {activeAnnotation.suggestion ? (
                  activeAnnotation.suggestion.length > 25 ? (
                    /* Multi-line / Sentence Rewrite: Stacked layout with clean accent card */
                    <div className="my-2.5 space-y-1.5 font-sans">
                      {activeAnnotation.targetPhrase && (
                        <div className="text-xs text-slate-400 font-normal">
                          <span className="line-through decoration-rose-400 decoration-1 text-slate-500">
                            {activeAnnotation.targetPhrase}
                          </span>
                        </div>
                      )}
                      <div
                        onClick={handleCopyFix}
                        className="bg-emerald-50/80 hover:bg-emerald-100/70 border border-emerald-300/80 rounded-lg p-2.5 cursor-pointer transition-all flex items-start justify-between gap-2.5 group"
                        title="Click to copy / apply suggestion"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-0.5">
                            Suggested Improvement
                          </div>
                          <p className="text-[13px] font-medium text-emerald-950 leading-snug font-academic">
                            {activeAnnotation.suggestion}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="flex-shrink-0 bg-[#008560] group-hover:bg-[#006e50] text-white text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-2xs inline-flex items-center gap-1 transition-all"
                        >
                          {copied ? (
                            <>
                              <Check size={12} />
                              <span>Applied</span>
                            </>
                          ) : (
                            <span>Apply</span>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Short Word / Phrase Replacement: Sleek Grammarly emerald pill */
                    <div className="flex items-center space-x-2 my-2.5 font-sans flex-wrap gap-y-1.5">
                      {activeAnnotation.targetPhrase && (
                        <span className="line-through text-slate-400 text-xs sm:text-[13px] font-normal decoration-rose-400 decoration-1">
                          {activeAnnotation.targetPhrase}
                        </span>
                      )}
                      <span className="text-slate-300 font-semibold text-xs">→</span>
                      <button
                        className="bg-[#008560] hover:bg-[#006e50] text-white px-2.5 py-1 rounded-md text-[13px] font-semibold tracking-tight shadow-2xs transition-all inline-flex items-center gap-1.5 active:scale-95 cursor-pointer"
                        type="button"
                        onClick={handleCopyFix}
                        title="Click to copy / apply suggestion"
                      >
                        <span>{activeAnnotation.suggestion}</span>
                        {copied && <Check size={13} className="text-white" />}
                      </button>
                    </div>
                  )
                ) : (
                  <div className="my-2">
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 inline-block font-sans">
                      ✓ Strong Academic Phrasing
                    </span>
                  </div>
                )}

                {/* Contextual Pedagogical Explanation + Micro-Lesson */}
                {activeAnnotation.comment && (
                  <p className="text-xs sm:text-[12.5px] text-slate-700 leading-relaxed my-2 font-normal font-sans">
                    {cleanSimpleText(activeAnnotation.comment)}
                  </p>
                )}
                {activeAnnotation.microLesson &&
                  cleanSimpleText(activeAnnotation.microLesson) !==
                    cleanSimpleText(activeAnnotation.comment || '') && (
                    <div className="my-2 px-2.5 py-2 rounded-md bg-slate-50 border border-slate-200 text-[11.5px] text-slate-600 leading-relaxed font-sans">
                      <span className="font-bold text-slate-800">Examiner Rule: </span>
                      {cleanSimpleText(activeAnnotation.microLesson)}
                    </div>
                  )}

                {/* Action Buttons Row */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 mt-2 font-sans">
                  <button
                    onClick={() =>
                      handleToggleBookmark(
                        activeAnnotation.id || `ann-${activeAnnotation.targetPhrase}`
                      )
                    }
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-colors border active:scale-95 cursor-pointer ${
                      bookmarkedAnnIds[
                        activeAnnotation.id || `ann-${activeAnnotation.targetPhrase}`
                      ]
                        ? 'bg-[#008560] text-white border-[#008560]'
                        : 'bg-[#008560]/10 hover:bg-[#008560]/20 text-[#008560] border-[#008560]/30'
                    }`}
                    type="button"
                  >
                    <Bookmark size={13} />
                    <span>
                      {bookmarkedAnnIds[
                        activeAnnotation.id || `ann-${activeAnnotation.targetPhrase}`
                      ]
                        ? 'Saved in Mistake Book'
                        : 'Add to Correction Book'}
                    </span>
                  </button>

                  <button
                    onClick={() => onSelectAnnId && onSelectAnnId(null)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    type="button"
                  >
                    <EyeOff size={13} />
                    <span>Ignore</span>
                  </button>
                </div>
              </div>
            )}
          </article>
        </div>
      )}

      {/* SINGLE PERSISTENT FLOATING ANNOTATION & STEPPER DOCK (STITCH / GRAMMARLY PILL) */}
      {viewMode === 'transcribed' && allAnnotations.length > 0 && (
        <div className="floating-annotation-dock no-print font-sans">
          {/* Category Filter Pills */}
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setActiveCategoryFilter('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors cursor-pointer ${
                activeCategoryFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All ({allAnnotations.length})
            </button>
            {redCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('red')}
                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors flex items-center gap-1 cursor-pointer ${
                  activeCategoryFilter === 'red'
                    ? 'bg-rose-600 text-white'
                    : 'text-rose-700 hover:bg-rose-50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                <span>Errors ({redCount})</span>
              </button>
            )}
            {amberCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('amber')}
                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors flex items-center gap-1 cursor-pointer ${
                  activeCategoryFilter === 'amber'
                    ? 'bg-amber-600 text-white'
                    : 'text-amber-700 hover:bg-amber-50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                <span>Polish ({amberCount})</span>
              </button>
            )}
            {greenCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('green')}
                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors flex items-center gap-1 cursor-pointer ${
                  activeCategoryFilter === 'green'
                    ? 'bg-emerald-600 text-white'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                <span>Good ({greenCount})</span>
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="w-[1px] h-4 bg-slate-200 mx-1" />

          {/* Stepper Controls */}
          <div className="flex items-center space-x-1">
            <button
              aria-label="Previous issue"
              onClick={handlePrevAnnotation}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center cursor-pointer"
              title="Previous issue"
              type="button"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-mono font-medium text-slate-600 px-1 whitespace-nowrap">
              {activeIndexInFiltered >= 0 ? activeIndexInFiltered + 1 : 0} / {filteredAnnotations.length}
            </span>
            <button
              aria-label="Next issue"
              onClick={handleNextAnnotation}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center cursor-pointer"
              title="Next issue"
              type="button"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
