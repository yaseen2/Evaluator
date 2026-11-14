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
import {
  cleanSimpleText,
  getSimpleHeadline,
  formatLocationLabel,
  simplifyCategoryTitle,
  isDiscrepantEvidenceAnnotation
} from '../utils/textUtils';

const ABBREVIATIONS_GUARD =
  /(?:U\.S\.A|U\.S|U\.K|U\.N|U\.A\.E|P\.M|C\.M|A\.D|B\.C|Mr|Mrs|Ms|Dr|Prof|St|vs|etc|e\.g|i\.e|Fig|Art|Sec|Vol|No)$/i;

const isOutlineStartOrMarkersBlock = (blockText = '') => {
  const trimmed = blockText.trim();
  if (!trimmed) return false;
  if (/^outline\b/i.test(trimmed)) return true;
  const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
  const words = trimmed.split(/\s+/).filter(Boolean).length;
  const markerHits = (
    trimmed.match(
      /(?:^|[\n:;.]\s*)(?:Outline\b|Thesis\s*Statement\b|[IVXLCDM]+[.)]\s+[A-Z]|[A-Z][.)]\s+[A-Z][a-z]{2,}|\d{1,2}(?:\.\d+)?[.)]\s+[A-Za-z])/g
    ) || []
  ).length;
  if (markerHits >= 2) return true;
  if (lines.length === 1 && words < 35 && /^(?:[IVXLCDM]+|[A-Z]|\d+(?:\.\d+)*)[.):\-]\s+/i.test(trimmed)) {
    return true;
  }
  return false;
};

const expandInlineOutlineMarkers = (blockText = '') => {
  // Split single jammed outline paragraphs into individual hierarchy lines
  const normalized = blockText.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  // Break after "Outline:" or standalone "Outline"
  let expanded = normalized.replace(/^(Outline\s*:?)\s+/i, '$1\n');

  // Break before Roman numeral or Capital-letter main headings (avoiding U.S., Dr., etc.)
  expanded = expanded.replace(
    /([:;.?!)\]]\s+|\s+)(?=(?:[IVXLCDM]{1,5}[.)]\s+[A-Z][a-z]{2,}|[A-Z][.)]\s+(?:Introduction|Conclusion|[A-Z][a-z]{2,})))/g,
    (match, sep, offset, full) => {
      const before = full.slice(Math.max(0, offset - 10), offset).trim();
      if (ABBREVIATIONS_GUARD.test(before)) return match;
      return '\n';
    }
  );

  // Break before Thesis Statement
  expanded = expanded.replace(
    /([:;.]\s+|\s+)(?=(?:[a-z][.)]\s+)?Thesis\s+Statement\s*:)/gi,
    '\n'
  );

  // Break before numbered sub-headings (1. , 2. , 1.1 ) when preceded by punctuation or list marker
  expanded = expanded.replace(
    /([:;.?!)]\s+)(?=\d{1,2}(?:\.\d+)?[.)]\s+[A-Za-z]{2,})/g,
    '\n'
  );

  // Break before lettered sub-points (a. , b. , c. ) after ":", ";", or sentence end (not e.g. / i.e.)
  expanded = expanded.replace(
    /([:;.]\s+)(?!(?:e\.g\.|i\.e\.))(?:(?=[a-z][.)]\s+[A-Za-z]))/g,
    '\n'
  );

  return expanded
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
};

const classifyOutlineLine = (line = '') => {
  const t = line.trim();
  if (/^outline\s*:?$/i.test(t) || (/^outline\s*:/i.test(t) && t.length < 24)) {
    return 'outline_title';
  }
  if (/^(?:[a-z][.)]\s*)?thesis\s*statement\s*:/i.test(t) || /^thesis\s*statement\b/i.test(t)) {
    return 'outline_thesis';
  }
  if (/^(?:[IVXLCDM]{1,5}|[A-Z])[.):\-]\s+/.test(t)) {
    return 'outline_main';
  }
  if (/^\d{1,2}(?:\.\d+)*[.):\-]\s+/.test(t)) {
    return 'outline_sub';
  }
  if (/^(?:[a-z][.)]\s+|[-•*▪→]\s+)/.test(t)) {
    return 'outline_point';
  }
  return 'outline_sub';
};

const parseDocumentSections = (fullText = '') => {
  const rawBlocks = String(fullText || '')
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  if (rawBlocks.length === 0) return { renderItems: [], bodyBlocks: [] };

  // Find where the essay body begins (after the Outline's Conclusion or first continuous prose block)
  let bodyStartIdx = -1;
  let sawOutline = false;
  let sawOutlineConclusion = false;

  for (let i = 0; i < rawBlocks.length; i++) {
    const blk = rawBlocks[i];
    const hasMarkers = isOutlineStartOrMarkersBlock(blk);
    const words = blk.split(/\s+/).filter(Boolean).length;
    const isShortConclusion = /(?:^|\n|\s)(?:[0-9ivxlcdma-z]+[.):\-]\s*)?conclusion\s*:?\s*$/i.test(blk);

    if (hasMarkers) {
      sawOutline = true;
      if (isShortConclusion || /(?:^|\n|\s)(?:[A-Z]|[IVXLCDM]+|\d+)[.)]\s*Conclusion\b:?/i.test(blk)) {
        sawOutlineConclusion = true;
      }
      continue;
    }

    // Pure essay prose block (multi-sentence, not an outline header list)
    const lines = blk.split('\n').map((l) => l.trim()).filter(Boolean);
    const sentences = blk.split(/[.!?]+\s+/).filter(Boolean).length;
    if (lines.length === 1 && words >= 25 && sentences >= 2) {
      bodyStartIdx = i;
      break;
    }
    if (!sawOutline && words >= 30) {
      bodyStartIdx = i;
      break;
    }
    if (sawOutlineConclusion && words >= 18) {
      bodyStartIdx = i;
      break;
    }
  }

  const outlineBlocks = bodyStartIdx === -1 ? (sawOutline ? rawBlocks : []) : rawBlocks.slice(0, bodyStartIdx);
  const bodyBlocks = bodyStartIdx === -1 ? (sawOutline ? [] : rawBlocks) : rawBlocks.slice(bodyStartIdx);

  const renderItems = [];
  outlineBlocks.forEach((blk) => {
    const lines = expandInlineOutlineMarkers(blk);
    lines.forEach((line) => {
      renderItems.push({
        id: `outline-${renderItems.length}`,
        kind: classifyOutlineLine(line),
        text: line
      });
    });
  });

  if (outlineBlocks.length > 0 && bodyBlocks.length > 0) {
    renderItems.push({ id: 'essay-divider', kind: 'essay_divider', text: 'Essay' });
  }

  bodyBlocks.forEach((blk, bIdx) => {
    renderItems.push({
      id: `body-${bIdx}`,
      kind: 'body',
      bodyParaNumber: bIdx + 1,
      text: blk
    });
  });

  return { renderItems, bodyBlocks };
};

const getConcisePhrase = (phrase = '', blockText = '') => {
  const clean = String(phrase || '').trim();
  if (!clean) return '';
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length <= 5) return clean;
  const shortened = words.slice(0, 4).join(' ');
  if (blockText && blockText.toLowerCase().includes(shortened.toLowerCase())) {
    return shortened;
  }
  return clean;
};

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
  const suggestedVisual = evaluation.suggestedVisual || null;
  const fullText = evaluation.fullTranscribedText || evaluation.text || '';
  const imagePages = evaluation.imagePages?.length > 0 ? evaluation.imagePages : submissionImages;

  // Merge discrepant factCheck claims that are not already in annotations so wrong facts appear in red font
  const allAnnotations = useMemo(() => {
    const base = Array.isArray(evaluation.annotations) ? [...evaluation.annotations] : [];
    const existingLower = new Set(base.map((a) => String(a.targetPhrase || '').toLowerCase().trim()));
    const factChecks = Array.isArray(evaluation.factCheck) ? evaluation.factCheck : [];
    const lowerFull = fullText.toLowerCase();

    factChecks.forEach((fc, idx) => {
      if (!fc || fc.verified === true || fc.status === 'VERIFIED') return;
      const claim = String(fc.claim || '').trim();
      if (!claim || claim.length < 3 || !lowerFull.includes(claim.toLowerCase())) return;

      // Trim very long claims to <= 5 words for concise red-font highlighting
      const words = claim.split(/\s+/);
      const displayClaim =
        words.length > 5 && lowerFull.includes(words.slice(0, 5).join(' ').toLowerCase())
          ? words.slice(0, 5).join(' ')
          : claim;

      const key = displayClaim.toLowerCase();
      const alreadyCovered = Array.from(existingLower).some(
        (p) => p && (p.includes(key) || key.includes(p))
      );
      if (alreadyCovered) return;
      existingLower.add(key);

      base.push({
        id: `fact-ann-${idx + 1}`,
        locationId: fc.location_id || '',
        tier: fc.status === 'UNVERIFIED_CITATION' ? 'TIER_3_POLISH' : 'TIER_2_MAJOR',
        type: fc.status === 'UNVERIFIED_CITATION' ? 'amber' : 'red',
        isDiscrepantEvidence: true,
        targetPhrase: displayClaim,
        category: 'Incorrect Fact / Reference',
        comment: fc.correctedFact
          ? `${fc.correctedFact}${fc.source ? ` (${fc.source})` : ''}`
          : 'This fact or reference needs verification.'
      });
    });

    return base;
  }, [evaluation.annotations, evaluation.factCheck, fullText]);

  const { renderItems } = useMemo(() => parseDocumentSections(fullText), [fullText]);

  // Map logical essay coordinates ([O...], [P1..PN]) to renderItems indexes so
  // repeated phrases only highlight inside their intended target line or paragraph.
  const annotationTargetIndexMap = useMemo(() => {
    const map = {};
    if (renderItems.length === 0 || allAnnotations.length === 0) return map;

    allAnnotations.forEach((ann, idx) => {
      const annId = ann.id || `ann-${idx}`;
      const rawPhrase = String(ann.targetPhrase || '').trim();
      if (!rawPhrase) return;

      const loc = String(ann.locationId || '').trim();
      const pMatch = loc.match(/^P(\d+)/i);
      if (pMatch) {
        const targetBodyNum = parseInt(pMatch[1], 10);
        const itemIdx = renderItems.findIndex(
          (item) => item.kind === 'body' && item.bodyParaNumber === targetBodyNum
        );
        if (itemIdx !== -1) {
          const concise = getConcisePhrase(rawPhrase, renderItems[itemIdx].text);
          const regex = new RegExp(concise.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
          if (regex.test(renderItems[itemIdx].text)) {
            map[annId] = itemIdx;
            return;
          }
        }
      } else if (/^O\d+/i.test(loc)) {
        const outlineIdx = renderItems.findIndex((item) => {
          if (!item.kind.startsWith('outline_')) return false;
          const concise = getConcisePhrase(rawPhrase, item.text);
          return new RegExp(concise.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(item.text);
        });
        if (outlineIdx !== -1) {
          map[annId] = outlineIdx;
        }
      }
    });

    return map;
  }, [renderItems, allAnnotations]);

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
   * Coordinate-Aware Concise Underline & Discrepant Evidence Color Highlighter
   */
  const renderHighlightedParagraph = (text, itemIdx) => {
    if (!allAnnotations || allAnnotations.length === 0) return text;

    const validAnns = [];
    const seenKeysInBlock = new Set();

    allAnnotations.forEach((a, idx) => {
      if (!a.targetPhrase || typeof a.targetPhrase !== 'string') return;
      const annId = a.id || `ann-${idx}`;
      const lockedIdx = annotationTargetIndexMap[annId];
      if (typeof lockedIdx === 'number' && lockedIdx !== itemIdx) {
        return;
      }
      const matchPhrase = getConcisePhrase(a.targetPhrase, text);
      if (!matchPhrase || matchPhrase.length < 2) return;
      const escaped = matchPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(escaped, 'i').test(text)) {
        const key = matchPhrase.toLowerCase();
        if (!seenKeysInBlock.has(key)) {
          seenKeysInBlock.add(key);
          validAnns.push({ ann: a, matchPhrase });
        }
      }
    });

    if (validAnns.length === 0) return text;

    // Longest first to avoid partial substring collisions
    validAnns.sort((a, b) => b.matchPhrase.length - a.matchPhrase.length);

    const regexPattern = new RegExp(
      `(${validAnns.map((v) => v.matchPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
      'gi'
    );

    const parts = text.split(regexPattern);

    return parts.map((part, i) => {
      const matchedEntry = validAnns.find(
        (v) => v.matchPhrase.toLowerCase() === part.toLowerCase()
      );
      if (matchedEntry) {
        const matchedAnn = matchedEntry.ann;
        const annId = matchedAnn.id || `ann-${matchedAnn.targetPhrase}`;
        const isSelected = selectedAnnId === annId;
        const isDiscrepantEvidence = isDiscrepantEvidenceAnnotation(matchedAnn);
        const colorType = matchedAnn.type || 'amber';
        const underlineClass = isDiscrepantEvidence
          ? 'mark-evidence-error'
          : colorType === 'red'
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
            title={cleanSimpleText(matchedAnn.comment || simplifyCategoryTitle(matchedAnn.category, matchedAnn))}
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
              <span>{evaluation.subject || 'CSS English Essay'}</span>
              <span className="font-mono text-slate-400">
                {evaluation.date || new Date().toISOString().split('T')[0]}
              </span>
            </div>

            {/* Recommended Sample Outline (if provided) */}
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
                      {suggestedVisual.title
                        ? cleanSimpleText(
                            suggestedVisual.title
                              .replace(/\bModel\s+FPSC\s+Topper\s+Outline\s+Blueprint\b/gi, 'Sample Improved Outline')
                              .replace(/\bModel\s+Topper\s+Outline\s+Blueprint\b/gi, 'Sample Improved Outline')
                              .replace(/\bFPSC\b/gi, '')
                          )
                        : 'Sample Improved Outline'}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-brand-600 inline-flex items-center gap-1 shrink-0">
                    <span>{isVisualExpanded ? 'Hide Sample Outline' : 'View Sample Outline'}</span>
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
                        {cleanSimpleText(suggestedVisual.description)}
                      </p>
                    )}
                    <pre className="text-[11px] leading-relaxed font-mono bg-white border border-slate-200 rounded-md p-3 text-slate-800 overflow-x-auto whitespace-pre">
                      {suggestedVisual.diagramText}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Formatted Outline Hierarchy & Transcribed Essay Paragraphs on Ruled Canvas */}
            <div className="notebook-ruled-body text-slate-900 pl-6 sm:pl-10 font-academic">
              {renderItems.map((item, idx) => {
                if (item.kind === 'essay_divider') {
                  return (
                    <div
                      key={item.id}
                      className="my-5 pt-2 border-t border-slate-300/70 text-center font-sans text-[11px] font-bold uppercase tracking-widest text-slate-400"
                    >
                      Essay
                    </div>
                  );
                }

                const highlightedContent = renderHighlightedParagraph(item.text, idx);

                if (item.kind === 'outline_title') {
                  return (
                    <div
                      key={item.id}
                      className="font-bold text-slate-950 uppercase tracking-wide text-[16px] mt-1 mb-1.5 leading-snug"
                    >
                      {highlightedContent}
                    </div>
                  );
                }
                if (item.kind === 'outline_main') {
                  return (
                    <div
                      key={item.id}
                      className="font-bold text-slate-950 text-[15.5px] mt-2.5 mb-0.5 leading-snug"
                    >
                      {highlightedContent}
                    </div>
                  );
                }
                if (item.kind === 'outline_thesis') {
                  return (
                    <div
                      key={item.id}
                      className="font-semibold text-slate-900 pl-4 my-1.5 py-0.5 bg-amber-50/70 border-l-2 border-amber-400 rounded-r text-[15px] leading-snug"
                    >
                      {highlightedContent}
                    </div>
                  );
                }
                if (item.kind === 'outline_sub') {
                  return (
                    <div
                      key={item.id}
                      className="font-semibold text-slate-900 pl-5 sm:pl-6 my-0.5 text-[15px] leading-snug"
                    >
                      {highlightedContent}
                    </div>
                  );
                }
                if (item.kind === 'outline_point') {
                  return (
                    <div
                      key={item.id}
                      className="font-normal text-slate-800 pl-10 sm:pl-12 my-0.5 text-[14.5px] leading-snug"
                    >
                      {highlightedContent}
                    </div>
                  );
                }

                return (
                  <p
                    key={item.id}
                    className="font-normal text-slate-900 font-academic"
                  >
                    {highlightedContent}
                  </p>
                );
              })}
            </div>

            {/* SIMPLE COMPACT FEEDBACK POP-UP CARD */}
            {activeAnnotation && popoverPos && (
              <div
                className="grammarly-card animate-in fade-in duration-200 text-left"
                onClick={(e) => e.stopPropagation()}
                style={{
                  top: `${popoverPos.top}px`,
                  left: `${popoverPos.left}px`,
                  width: `${Math.min(320, popoverPos.width)}px`
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

                {/* Header: Dot + Simple Heading + Close */}
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 font-sans gap-2">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full inline-block flex-shrink-0 ${
                        activeAnnotation.type === 'red'
                          ? 'bg-rose-500'
                          : activeAnnotation.type === 'green'
                          ? 'bg-emerald-500'
                          : 'bg-amber-500'
                      }`}
                    />
                    <span className="text-[11px] font-bold text-slate-700 tracking-wide truncate">
                      {simplifyCategoryTitle(activeAnnotation.category, activeAnnotation)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {activeAnnotation.locationId && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        {formatLocationLabel(activeAnnotation.locationId)}
                      </span>
                    )}
                    <button
                      aria-label="Close feedback card"
                      className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md transition-colors cursor-pointer"
                      onClick={() => onSelectAnnId && onSelectAnnId(null)}
                      type="button"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>

                {/* Simple Highlighted Word/Phrase + Plain Explanation */}
                <div className="my-2 space-y-1.5 font-sans">
                  {activeAnnotation.targetPhrase && (
                    <div
                      className={`text-xs font-medium px-2 py-1 rounded border inline-block max-w-full ${
                        activeAnnotation.type === 'green'
                          ? 'bg-emerald-50/70 text-emerald-800 border-emerald-200'
                          : isDiscrepantEvidenceAnnotation(activeAnnotation)
                          ? 'bg-rose-50 text-red-700 border-rose-200'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      "{getConcisePhrase(activeAnnotation.targetPhrase, fullText)}"
                    </div>
                  )}
                  {activeAnnotation.comment && (
                    <p className="text-[12.5px] text-slate-700 leading-relaxed font-normal">
                      {cleanSimpleText(activeAnnotation.comment)}
                    </p>
                  )}
                </div>

                {/* Single Clean Action Button */}
                <div className="pt-2 border-t border-slate-100 mt-1.5 font-sans">
                  <button
                    onClick={() =>
                      handleToggleBookmark(
                        activeAnnotation.id || `ann-${activeAnnotation.targetPhrase}`
                      )
                    }
                    className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-colors border active:scale-95 cursor-pointer ${
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
                        ? 'Saved in Correction Book'
                        : 'Add to Correction Book'}
                    </span>
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
