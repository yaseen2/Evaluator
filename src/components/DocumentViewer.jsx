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
              if (el) highlightRefs.current[annId] = el;
            }}
            onClick={(e) => handleTranscribedClick(e, matchedAnn)}
            className={`${underlineClass} cursor-pointer relative z-10 transition-colors inline-block ${
              isSelected ? 'ring-2 ring-[#007a64] ring-offset-1 rounded-sm' : ''
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
        /* VIEW 2: AUTHENTIC ANSWER SHEET WITH GRAMMARLY-STYLE POPOVER & RULED PAPER */
        <div className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6 lg:p-8 flex justify-center">
          <article
            ref={paperRef}
            className="w-full max-w-2xl bg-paper shadow-xs border border-slate-200/90 rounded-lg p-3 sm:p-6 md:p-8 relative ruled-canvas flex flex-col min-h-[520px] font-academic"
            style={{ position: 'relative' }}
          >
            {/* Classic FPSC Margin Indicator Line */}
            <div
              aria-hidden="true"
              className="absolute left-3.5 sm:left-6 top-0 bottom-0 w-[1px] bg-red-400/50 pointer-events-none"
            />

            {/* Document Meta Header */}
            <div className="pb-3 border-b border-slate-200/60 mb-4 pl-3 sm:pl-4 font-sans text-xs text-slate-500 flex justify-between items-center">
              <span>{evaluation.subject || 'FPSC Answer Paper'}</span>
              <span className="font-mono text-slate-400">
                {evaluation.date || new Date().toISOString().split('T')[0]}
              </span>
            </div>

            {/* Formatted Transcribed Paragraphs with pl-3 sm:pl-4 */}
            <div className="space-y-4 sm:space-y-5 text-slate-900 leading-8 sm:leading-9 text-base sm:text-[18px] pl-3 sm:pl-4">
              {paragraphs.map((para, pIdx) => {
                const trimmed = para.trim();
                const isHeading =
                  trimmed.length < 90 &&
                  !trimmed.endsWith('.') &&
                  (trimmed.includes(':') || /^[0-9A-IVX]+[.\-)]/.test(trimmed));
                const highlightedContent = renderHighlightedParagraph(para);

                return (
                  <div key={pIdx}>
                    {isHeading ? (
                      <p className="font-bold text-slate-900 pt-1 tracking-tight font-academic">
                        {highlightedContent}
                      </p>
                    ) : (
                      <p className="text-slate-900 leading-relaxed font-normal font-academic">
                        {highlightedContent}
                      </p>
                    )}
                  </div>
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
                      className={`w-2.5 h-2.5 rounded-full inline-block flex-shrink-0 animate-pulse ${
                        activeAnnotation.type === 'red'
                          ? 'bg-rose-500'
                          : activeAnnotation.type === 'green'
                          ? 'bg-emerald-500'
                          : 'bg-amber-500'
                      }`}
                    />
                    <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {activeAnnotation.category || getSimpleHeadline(activeAnnotation)}
                    </span>
                  </div>
                  <button
                    aria-label="Close correction card"
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer"
                    onClick={() => onSelectAnnId && onSelectAnnId(null)}
                    type="button"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Main Suggestion: Strikethrough -> Replacement Pill */}
                {activeAnnotation.suggestion ? (
                  <div className="flex items-center space-x-2 sm:space-x-3 my-3 font-sans">
                    {activeAnnotation.targetPhrase && (
                      <span className="line-through text-red-600 font-serif text-base sm:text-lg font-medium decoration-rose-500 decoration-2">
                        {activeAnnotation.targetPhrase}
                      </span>
                    )}
                    <span className="text-slate-400 font-semibold text-sm">→</span>
                    <button
                      className="bg-[#007a64] hover:bg-[#006352] text-white px-3 py-1.5 rounded-lg text-sm sm:text-base font-semibold shadow-sm transition-all inline-flex items-center gap-1.5 active:scale-95 cursor-pointer"
                      type="button"
                      onClick={handleCopyFix}
                      title="Click to copy / accept suggestion"
                    >
                      <span>{activeAnnotation.suggestion}</span>
                      {copied && <Check size={14} className="text-white" />}
                    </button>
                  </div>
                ) : (
                  <div className="my-2.5">
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 inline-block font-sans">
                      ✓ Strong Academic Phrasing
                    </span>
                  </div>
                )}

                {/* Contextual Pedagogical Explanation */}
                {(activeAnnotation.comment || activeAnnotation.microLesson) && (
                  <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed my-2 font-normal font-sans">
                    {cleanSimpleText(activeAnnotation.comment || activeAnnotation.microLesson)}
                  </p>
                )}

                {/* Action Buttons Row */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-2 font-sans">
                  <button
                    onClick={() =>
                      handleToggleBookmark(
                        activeAnnotation.id || `ann-${activeAnnotation.targetPhrase}`
                      )
                    }
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors border active:scale-95 cursor-pointer ${
                      bookmarkedAnnIds[
                        activeAnnotation.id || `ann-${activeAnnotation.targetPhrase}`
                      ]
                        ? 'bg-[#007a64] text-white border-[#007a64]'
                        : 'bg-[#007a64]/10 hover:bg-[#007a64]/20 text-[#007a64] border-[#007a64]/30'
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
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
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

      {/* DOCKED ANNOTATION NAVIGATION FOOTER (STITCH STYLE) */}
      {viewMode === 'transcribed' && allAnnotations.length > 0 && (
        <footer
          className="h-14 bg-white border-t border-slate-200/80 px-3 sm:px-6 flex items-center justify-between flex-shrink-0 gap-2 z-10 sticky bottom-0 font-sans no-print"
          data-purpose="annotation-dock"
        >
          {/* Annotation Filter Pills */}
          <div className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto">
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
                <span>Strengths ({greenCount})</span>
              </button>
            )}
          </div>

          {/* Stepper Controls */}
          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            <button
              aria-label="Previous Annotation"
              onClick={handlePrevAnnotation}
              className="p-2 sm:p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded border border-slate-200 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
              title="Previous Annotation"
              type="button"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-mono font-medium text-slate-600 px-1 whitespace-nowrap">
              {activeIndexInFiltered >= 0 ? activeIndexInFiltered + 1 : 1} of {filteredAnnotations.length}
            </span>
            <button
              aria-label="Next Annotation"
              onClick={handleNextAnnotation}
              className="p-2 sm:p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded border border-slate-200 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
              title="Next Annotation"
              type="button"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </footer>
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
