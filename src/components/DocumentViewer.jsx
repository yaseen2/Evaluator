import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  ChevronDown,
  ChevronUp,
  Cpu,
  Image as ImageIcon,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Copy,
  Check
} from 'lucide-react';
import {
  cleanSimpleText,
  formatPopoverLocationLabel,
  simplifyCategoryTitle,
  isDiscrepantEvidenceAnnotation,
  tokenizeQuotedSegments,
  parseLegacyModelOutlineText
} from '../utils/textUtils';

const ABBREVIATIONS_GUARD =
  /(?:^|[\s(\["'])(?:Mr|Mrs|Ms|Dr|Prof|Rev|Hon|Gen|Col|Lt|Sr|Jr|St|Sen|Rep|Gov|Pres|vs|e\.g|i\.e|viz|cf|Fig|Art|Sec|Vol|No|Ch|Rs)\.?$/i;

const ROMAN_UPPER_SRC = '(?:X{1,3}(?:IX|IV|V?I{0,3})|IX|IV|V?I{1,3}|V)';
const ROMAN_LOWER_SRC = '(?:x{1,3}(?:ix|iv|v?i{0,3})|ix|iv|v?i{1,3}|v)';

const NO_SPLIT_BEFORE_ALPHA_PREFIX =
  /(?:^|[\s(\["'])(?:by|of|for|with|from|to|in|at|on|under|via|as|and|or|the|a|an|sir|lord|king|queen|saint|pope)$/i;

const NO_SPLIT_BEFORE_TITLE_OR_NOUN_ALPHA_PREFIX =
  /(?:^|[\s(\["'])(?:henry|louis|charles|edward|george|elizabeth|war|phase|part|grade|type|vitamin|plan|option|appendix|section|article|schedule|table|figure|column|category|group|class|tier|series|model|annex)$/i;

const NO_SPLIT_BEFORE_NUM_PREFIX =
  /(?:^|[\s(\["'])(?:page|para|clause|rule|tier|level|grade|type|phase|step|part|chapter|section|article|amendment|schedule|annex|war|agenda|version|model|fig|table|no|vol|sec|art|ch|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)$/i;

const NO_SPLIT_BEFORE_LOWER_PREFIX =
  /(?:^|[\s(\["'])(?:plan|option|appendix|vitamin|section|part|grade|type|column|annex|schedule|category|group|class|tier|series|model|table|figure|subpart|clause|item|letter|point)$/i;

const startsWithOutlineMarker = (line = '') => {
  const t = String(line || '').trim();
  if (!t) return false;
  if (/^(?:outline\s*(?::|$)|thesis\s*statement\b)/i.test(t)) return true;
  if (/^[-•*▪→]\s+/.test(t)) return true;

  // Parenthesis markers at start: 1), A), a), I), i), (1), (a), (i), 1.1)
  if (
    new RegExp(
      `^(?:(?:${ROMAN_UPPER_SRC}|[A-Z]|${ROMAN_LOWER_SRC}|[a-z]|\\d{1,2}(?:\\.\\d+)*)\\)|\\((?:${ROMAN_UPPER_SRC}|[A-Z]|${ROMAN_LOWER_SRC}|[a-z]|\\d{1,2}(?:\\.\\d+)*)\\))[ \\t]+(?=[A-Za-z0-9"'“‘])`
    ).test(t)
  ) {
    return true;
  }

  // Decimal sub-headings without trailing dot: 1.1 Causes
  if (/^\d{1,2}(?:\.\d+)+[ \t]+(?=[A-Z"'“‘])/.test(t)) return true;

  // Period markers at start: I., A., 1., 1.1., a., i. (excluding initials like M. A. Jinnah or U.S. / Dr.)
  const dotMatch = t.match(
    new RegExp(
      `^(${ROMAN_UPPER_SRC}|[A-Z]|${ROMAN_LOWER_SRC}|[a-z]|\\d{1,2}(?:\\.\\d+)*)\\.[ \\t]+([A-Za-z0-9"'“‘][^\\n]*)`
    )
  );
  if (dotMatch) {
    const marker = dotMatch[1];
    const rest = dotMatch[2];
    if (ABBREVIATIONS_GUARD.test(`${marker}.`)) return false;
    if (/^[A-Z]$/.test(marker) && /^[A-Z]\.(?:[ \t]|$)/.test(rest)) return false;
    return true;
  }

  return false;
};

export const expandInlineOutlineMarkers = (blockText = '') => {
  // Split single jammed outline paragraphs into individual hierarchy lines
  const normalized = String(blockText || '').replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  // 1. Break after "Outline:" or "Outline <marker>"
  let expanded = normalized.replace(/^(Outline\s*:)[ \t]+(?=\S)/gim, '$1\n');
  expanded = expanded.replace(
    new RegExp(
      `^(Outline)[ \\t]+(?=(?:Thesis\\s+Statement\\b|(?:${ROMAN_UPPER_SRC}|[A-Z]|${ROMAN_LOWER_SRC}|[a-z]|\\d{1,2}(?:\\.\\d+)*)[.)][ \\t]+|\\((?:${ROMAN_UPPER_SRC}|[A-Z]|${ROMAN_LOWER_SRC}|[a-z]|\\d{1,2}(?:\\.\\d+)*)\\)[ \\t]+))`,
      'gim'
    ),
    '$1\n'
  );

  // 2. Break before parenthesis markers: A)..Z), 1)..25), a)..z), I)..X), i)..x), (1), (a), (i), 1.1)
  //    when preceded by horizontal whitespace (no "." or ";" required!) and followed by ANY word.
  const parenMarkerPattern = new RegExp(
    `([ \\t]+)(?=(?:(?:${ROMAN_UPPER_SRC}|[A-Z]|${ROMAN_LOWER_SRC}|[a-z]|\\d{1,2}(?:\\.\\d+)*)\\)|\\((?:${ROMAN_UPPER_SRC}|[A-Z]|${ROMAN_LOWER_SRC}|[a-z]|\\d{1,2}(?:\\.\\d+)*)\\))[ \\t]+[A-Za-z0-9"'“‘])`,
    'g'
  );
  expanded = expanded.replace(parenMarkerPattern, (match, sep, offset, full) => {
    const before = full.slice(0, offset);
    const lineBefore = before.slice(before.lastIndexOf('\n') + 1);
    if (!lineBefore.trim()) return match;
    // Guard against closing prose parenthetical like "e.g. (see A) next" or "(Fig. 1) shows"
    if (lineBefore.lastIndexOf('(') > lineBefore.lastIndexOf(')')) {
      return match;
    }
    return '\n';
  });

  // 3. Break before Thesis Statement (preserving any leading list marker like "b)" or "b." on the Thesis line)
  expanded = expanded.replace(
    /([ \t]+)(?=Thesis\s+Statement\s*:)/gi,
    (match, sep, offset, full) => {
      const before = full.slice(0, offset);
      const lineBefore = before.slice(before.lastIndexOf('\n') + 1).trimEnd();
      if (!lineBefore) return match;
      if (
        /(?:^|\s)(?:[A-Za-z]|[ivxlcdm]{1,5}|\d{1,2})[.)]$/.test(lineBefore) ||
        /(?:^|\s)\((?:[A-Za-z]|[ivxlcdm]{1,5}|\d{1,2})\)$/.test(lineBefore) ||
        /(?:^|\s)[-•*▪→]$/.test(lineBefore)
      ) {
        return match;
      }
      return '\n';
    }
  );

  // 4. Break before period "." markers (I., A., 1., 1.1, 1.1., a., i.)
  //    Handles both punctuation-separated and space-separated markers while protecting U.S., Dr., e.g., M. A. Jinnah.
  const dotMarkerPattern = new RegExp(
    `([ \\t]+)(?=(?:(?:${ROMAN_UPPER_SRC}|[A-Z]|${ROMAN_LOWER_SRC}|[a-z]|\\d{1,2}(?:\\.\\d+)*)\\.[ \\t]+[A-Za-z0-9"'“‘]|\\d{1,2}(?:\\.\\d+)+[ \\t]+[A-Z"'“‘][A-Za-z0-9"'“‘]*))`,
    'g'
  );
  expanded = expanded.replace(dotMarkerPattern, (match, sep, offset, full) => {
    const before = full.slice(0, offset);
    const lineBefore = before.slice(before.lastIndexOf('\n') + 1);
    if (!lineBefore.trim()) return match;

    const prefixUpToSpace = lineBefore.trimEnd();
    const trailingPunctMatch = prefixUpToSpace.match(/([:;.?!)\]])$/);
    const punctPrefix = trailingPunctMatch ? trailingPunctMatch[1] : '';
    const afterText = full.slice(offset + sep.length);

    if (ABBREVIATIONS_GUARD.test(prefixUpToSpace)) {
      return match;
    }

    const capDotMatch = afterText.match(/^([A-Z])\.[ \t]+([^\n]*)/);
    if (capDotMatch) {
      const rest = capDotMatch[2];
      // Single-initial check: "M. A. Jinnah" (both before "M." and before "A.")
      if (/^[A-Z]\.(?:[ \t]|$)/.test(rest)) {
        return match;
      }
      if (/(?:^|[\s(\["'])[A-Z]\.$/.test(prefixUpToSpace)) {
        const beforeSingleCap = prefixUpToSpace.replace(/(?:^|[\s(\["'])[A-Z]\.$/, '').trimEnd();
        if (!NO_SPLIT_BEFORE_TITLE_OR_NOUN_ALPHA_PREFIX.test(beforeSingleCap)) {
          return match;
        }
      }
      if (!punctPrefix && NO_SPLIT_BEFORE_TITLE_OR_NOUN_ALPHA_PREFIX.test(prefixUpToSpace)) {
        return match;
      }
      if (
        !punctPrefix &&
        NO_SPLIT_BEFORE_ALPHA_PREFIX.test(prefixUpToSpace) &&
        /^[A-Z][a-z]/.test(rest)
      ) {
        return match;
      }
      return '\n';
    }

    const romanUpperMatch = afterText.match(new RegExp(`^(${ROMAN_UPPER_SRC})\\.[ \\t]+([^\\n]*)`));
    if (romanUpperMatch) {
      const rest = romanUpperMatch[2];
      if (!punctPrefix && NO_SPLIT_BEFORE_TITLE_OR_NOUN_ALPHA_PREFIX.test(prefixUpToSpace)) {
        return match;
      }
      if (
        !punctPrefix &&
        NO_SPLIT_BEFORE_ALPHA_PREFIX.test(prefixUpToSpace) &&
        /^[A-Za-z]/.test(rest)
      ) {
        return match;
      }
      return '\n';
    }

    const numDotMatch = afterText.match(/^(\d{1,2}(?:\.\d+)*)(\.)?[ \t]+([^\n]*)/);
    if (numDotMatch) {
      const hasDot = Boolean(numDotMatch[2]);
      if (!punctPrefix && NO_SPLIT_BEFORE_NUM_PREFIX.test(prefixUpToSpace)) {
        return match;
      }
      if (!hasDot && /(?:[$€£¥]|Rs\.?|PKR|USD|v\.|ver\.|version)$/i.test(prefixUpToSpace)) {
        return match;
      }
      return '\n';
    }

    const lowerDotMatch = afterText.match(new RegExp(`^(?:${ROMAN_LOWER_SRC}|[a-z])\\.[ \\t]+([^\\n]*)`));
    if (lowerDotMatch) {
      if (!punctPrefix && NO_SPLIT_BEFORE_LOWER_PREFIX.test(prefixUpToSpace)) {
        return match;
      }
      return '\n';
    }

    return '\n';
  });

  return expanded
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
};

export const isOutlineStartOrMarkersBlock = (blockText = '') => {
  const trimmed = String(blockText || '').trim();
  if (!trimmed) return false;
  if (/^outline\s*(?::|$)/i.test(trimmed)) return true;

  const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
  const words = trimmed.split(/\s+/).filter(Boolean).length;
  if (/^outline\b/i.test(trimmed) && (words < 12 || lines.length >= 2)) return true;

  if (startsWithOutlineMarker(trimmed)) return true;

  const expanded = expandInlineOutlineMarkers(trimmed);
  const markerLinesCount = expanded.filter((line) => startsWithOutlineMarker(line)).length;
  if (expanded.length >= 2 && markerLinesCount >= 2) {
    // Avoid misclassifying multi-sentence prose with inline "(1) ... and (2) ..." enumerations
    const sentences = trimmed.split(/[.!?]+\s+/).filter(Boolean).length;
    const hasInlineConjunctionEnum = /\b(?:and|or)\s+\((?:\d{1,2}|[a-z])\)\s+/i.test(trimmed);
    if (!(hasInlineConjunctionEnum && sentences >= 2 && words >= 15 && markerLinesCount <= 2)) {
      return true;
    }
  }

  return false;
};

export const detectOutlineScheme = (lines = []) => {
  let firstTopNumIdx = -1;
  let firstCapAlphaIdx = -1;
  let hasMultiRoman = false;
  let hasAlphaAfterTopNum = false;
  let seenTopNum = false;

  const multiRomanRegex = new RegExp(
    `^(?:X{1,3}(?:IX|IV|V?I{0,3})|IX|IV|V?I{2,3}|VI{1,3})[.):\\-]\\s+`
  );
  const topNumRegex = /^\d{1,2}[.):\-]\s+/;
  const capAlphaRegex = /^[A-Z][.):\-]\s+/;

  lines.forEach((rawLine, idx) => {
    const t = String(rawLine || '').trim();
    if (!t) return;
    if (/^outline\b/i.test(t) || /^(?:(?:[a-z][.)]|[-•*▪→])\s*)?thesis\s*statement\b/i.test(t)) {
      return;
    }

    if (multiRomanRegex.test(t)) {
      hasMultiRoman = true;
    }
    if (topNumRegex.test(t)) {
      if (firstTopNumIdx === -1) firstTopNumIdx = idx;
      seenTopNum = true;
    } else if (capAlphaRegex.test(t)) {
      if (firstCapAlphaIdx === -1) firstCapAlphaIdx = idx;
      if (seenTopNum && /^A[.):\-]\s+/.test(t)) {
        hasAlphaAfterTopNum = true;
      }
    }
  });

  if (firstTopNumIdx === -1) return 'ALPHA_TOP';
  if (firstCapAlphaIdx === -1) return 'NUMERIC_TOP';
  if (firstTopNumIdx < firstCapAlphaIdx) return 'NUMERIC_TOP';
  if (!hasMultiRoman && hasAlphaAfterTopNum) return 'NUMERIC_TOP';
  return 'ALPHA_TOP';
};

export const classifyOutlineLine = (line = '', outlineScheme = 'ALPHA_TOP') => {
  const t = String(line || '').trim();
  if (/^outline\s*:?$/i.test(t) || (/^outline\s*:/i.test(t) && t.length < 24) || /^outline\s+of\b/i.test(t)) {
    return 'outline_title';
  }
  if (
    /^(?:(?:[a-z][.)]|[-•*▪→])\s*)?thesis\s*statement\s*:/i.test(t) ||
    /^(?:(?:[a-z][.)]|[-•*▪→])\s*)?thesis\s*statement\b/i.test(t)
  ) {
    return 'outline_thesis';
  }

  if (outlineScheme === 'NUMERIC_TOP') {
    if (/^\d{1,2}[.):\-]\s+/.test(t)) {
      return 'outline_main';
    }
    if (/^(?:[A-Z][.):\-]\s+|\([A-Z]\)\s+|\d{1,2}(?:\.\d+)+[.):\-]?\s+)/.test(t)) {
      return 'outline_sub';
    }
    if (
      new RegExp(
        `^(?:[a-z][.)]\\s+|${ROMAN_LOWER_SRC}[.)]\\s+|\\((?:\\d{1,2}|[a-z]|${ROMAN_LOWER_SRC})\\)\\s+|[-•*▪→]\\s+)`
      ).test(t)
    ) {
      return 'outline_point';
    }
    return 'outline_sub';
  }

  // ALPHA_TOP: Roman numerals & capital letters -> outline_main; numbers -> outline_sub; lowercase/bullets -> outline_point
  if (
    new RegExp(
      `^(?:(?:${ROMAN_UPPER_SRC}|[A-Z])[.):\\-]\\s+|\\((?:${ROMAN_UPPER_SRC}|[A-Z])\\)\\s+)`
    ).test(t)
  ) {
    return 'outline_main';
  }
  if (/^(?:\d{1,2}[.):\-]\s+|\d{1,2}(?:\.\d+)+[.):\-]?\s+|\(\d{1,2}\)\s+)/.test(t)) {
    return 'outline_sub';
  }
  if (
    new RegExp(
      `^(?:[a-z][.)]\\s+|${ROMAN_LOWER_SRC}[.)]\\s+|\\((?:[a-z]|${ROMAN_LOWER_SRC})\\)\\s+|[-•*▪→]\\s+)`
    ).test(t)
  ) {
    return 'outline_point';
  }
  return 'outline_sub';
};

const segmentSingleNewlineProseFallback = (rawBlocks) => {
  if (rawBlocks.length !== 1 || !rawBlocks[0].includes('\n')) {
    return rawBlocks;
  }

  const lines = rawBlocks[0]
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const proseLines = lines.filter((line) => {
    const words = line.split(/\s+/).filter(Boolean).length;
    const sentences = line.split(/[.!?]+\s+/).filter(Boolean).length;
    return (
      !isOutlineStartOrMarkersBlock(line) &&
      words >= 25 &&
      sentences >= 2
    );
  });

  if (proseLines.length < 2) {
    return rawBlocks;
  }

  const blocks = [];
  let buffer = [];
  let proseStarted = false;

  lines.forEach((line) => {
    const words = line.split(/\s+/).filter(Boolean).length;
    const sentences = line.split(/[.!?]+\s+/).filter(Boolean).length;
    const isProse = !isOutlineStartOrMarkersBlock(line) && words >= 25 && sentences >= 2;

    if (!proseStarted && !isProse) {
      buffer.push(line);
    } else {
      if (buffer.length > 0) {
        blocks.push(buffer.join('\n'));
        buffer = [];
      }
      proseStarted = true;
      blocks.push(line);
    }
  });

  if (buffer.length > 0) {
    blocks.push(buffer.join('\n'));
  }

  return blocks.length > 0 ? blocks : rawBlocks;
};

export const parseDocumentSections = (fullText = '', isOutlineOnly = false) => {
  const initialBlocks = String(fullText || '')
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  if (initialBlocks.length === 0) return { renderItems: [], bodyBlocks: [] };

  const rawBlocks = isOutlineOnly
    ? initialBlocks
    : segmentSingleNewlineProseFallback(initialBlocks);

  let outlineBlocks = [];
  let bodyBlocks = [];

  if (isOutlineOnly) {
    outlineBlocks = rawBlocks;
    bodyBlocks = [];
  } else {
    // Full Essay mode: scan rawBlocks for outline vs continuous body prose boundary
    let bodyStartIdx = -1;
    let sawOutline = false;
    let sawOutlineConclusion = false;

    for (let i = 0; i < rawBlocks.length; i++) {
      const blk = rawBlocks[i];
      const expanded = expandInlineOutlineMarkers(blk);
      const hasMarkers =
        isOutlineStartOrMarkersBlock(blk) ||
        (expanded.length >= 2 && expanded.filter(startsWithOutlineMarker).length >= 2);
      const words = blk.split(/\s+/).filter(Boolean).length;

      if (hasMarkers) {
        sawOutline = true;
        const hasConclusionLine = expanded.some(
          (line) =>
            /^(?:(?:[0-9]+|[ivxlcdm]+|[a-z])\s*[.):\-]\s*)?conclusion\b/i.test(line.trim()) &&
            line.trim().split(/\s+/).filter(Boolean).length <= 20
        );
        if (hasConclusionLine) {
          sawOutlineConclusion = true;
        }
        continue;
      }

      const lines = blk.split('\n').map((l) => l.trim()).filter(Boolean);
      const sentences = blk.split(/[.!?]+\s+/).filter(Boolean).length;
      const isContinuousProse =
        (lines.length === 1 && words >= 15 && sentences >= 2) ||
        (words >= 30 && sentences >= 2) ||
        (!sawOutline && words >= 30) ||
        (sawOutlineConclusion && (words >= 18 || sentences >= 2));

      if (isContinuousProse) {
        const nextIsProse =
          i + 1 < rawBlocks.length &&
          !isOutlineStartOrMarkersBlock(rawBlocks[i + 1]) &&
          rawBlocks[i + 1].split(/\s+/).filter(Boolean).length >= 15 &&
          rawBlocks[i + 1].split(/[.!?]+\s+/).filter(Boolean).length >= 2;

        const hasRemainingOutline =
          !sawOutlineConclusion &&
          !nextIsProse &&
          rawBlocks.slice(i + 1).some((laterBlk) => isOutlineStartOrMarkersBlock(laterBlk));

        if (!hasRemainingOutline) {
          bodyStartIdx = i;
          break;
        }
      }
    }

    if (bodyStartIdx === -1) {
      outlineBlocks = sawOutline ? rawBlocks : [];
      bodyBlocks = sawOutline ? [] : rawBlocks;
    } else {
      outlineBlocks = sawOutline ? rawBlocks.slice(0, bodyStartIdx) : [];
      bodyBlocks = sawOutline ? rawBlocks.slice(bodyStartIdx) : rawBlocks;
    }
  }

  const allExpandedOutlineLines = [];
  outlineBlocks.forEach((blk) => {
    allExpandedOutlineLines.push(...expandInlineOutlineMarkers(blk));
  });

  const outlineScheme = detectOutlineScheme(allExpandedOutlineLines);

  const hasFollowingOutlineLine = allExpandedOutlineLines
    .slice(1)
    .some((l) => startsWithOutlineMarker(l));

  const renderItems = allExpandedOutlineLines.map((line, idx) => {
    let kind = classifyOutlineLine(line, outlineScheme);
    if (
      idx === 0 &&
      hasFollowingOutlineLine &&
      !startsWithOutlineMarker(line) &&
      kind !== 'outline_title' &&
      kind !== 'outline_thesis' &&
      line.trim().length <= 240
    ) {
      kind = 'outline_topic';
    }
    return {
      id: `outline-${idx}`,
      kind,
      text: line
    };
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

const POPOVER_MAX_WIDTH = 320;
const getAnnotationKey = (ann, idx) => ann?.id || `ann-${idx}`;

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

const formatModelOutlinePlainText = (visual, sections, thesisText) => {
  const lines = [];
  if (visual?.title) {
    lines.push(cleanSimpleText(visual.title));
  }
  if (thesisText) {
    lines.push(`Thesis Statement: ${thesisText}`);
  }
  if (Array.isArray(sections) && sections.length > 0) {
    sections.forEach((sec) => {
      lines.push(`${sec.marker || ''} ${sec.heading || ''}`.trim());
      if (sec.kind !== 'intro' && sec.kind !== 'conclusion' && Array.isArray(sec.items)) {
        sec.items.forEach((it) => {
          lines.push(`  ${it.marker || ''} ${it.text || ''}`.trimEnd());
          if (Array.isArray(it.subItems)) {
            it.subItems.forEach((sub) => {
              lines.push(`    ${sub.marker || ''} ${sub.text || ''}`.trimEnd());
            });
          }
        });
      }
    });
    return lines.join('\n').trim();
  }
  return String(visual?.diagramText || '').trim();
};

const ModelOutlineCard = ({ suggestedVisual }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const parsedLegacy = useMemo(() => {
    if (!suggestedVisual || (Array.isArray(suggestedVisual.sections) && suggestedVisual.sections.length > 0)) {
      return { thesisStatement: '', sections: [] };
    }
    return parseLegacyModelOutlineText(suggestedVisual.diagramText || '');
  }, [suggestedVisual]);

  const sections = useMemo(() => {
    if (!suggestedVisual) return [];
    if (Array.isArray(suggestedVisual.sections) && suggestedVisual.sections.length > 0) {
      return suggestedVisual.sections;
    }
    return parsedLegacy.sections;
  }, [suggestedVisual, parsedLegacy]);

  const thesisStatement = useMemo(() => {
    if (!suggestedVisual) return '';
    return String(suggestedVisual.thesisStatement || parsedLegacy.thesisStatement || '').trim();
  }, [suggestedVisual, parsedLegacy]);

  if (!suggestedVisual || (sections.length === 0 && !suggestedVisual.diagramText)) {
    return null;
  }

  const cleanedTitle = suggestedVisual.title
    ? cleanSimpleText(
        suggestedVisual.title
          .replace(/\bModel\s+FPSC\s+Topper\s+Outline\s+Blueprint\b/gi, 'Model Improved Outline')
          .replace(/\bModel\s+Topper\s+Outline\s+Blueprint\b/gi, 'Model Improved Outline')
          .replace(/\bSample\s+Improved\s+Outline\b/gi, 'Model Improved Outline')
          .replace(/\bFPSC\b/gi, '')
      )
    : 'Model Improved Outline';

  const modelBadge =
    suggestedVisual.modelLabel ||
    (String(suggestedVisual.modelId || '').toLowerCase().includes('argon') ? 'Gemini 4 Argon' : '');

  const handleCopy = async (e) => {
    e.stopPropagation();
    const copyPayload = formatModelOutlinePlainText(suggestedVisual, sections, thesisStatement);
    if (!copyPayload) return;
    try {
      await navigator.clipboard.writeText(copyPayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (_) {
      // Clipboard API unavailable in restricted contexts
    }
  };

  return (
    <section
      className="model-outline-card no-print"
      aria-label="Model Improved Outline"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded((prev) => !prev);
        }}
        aria-expanded={isExpanded}
        className="model-outline-toggle"
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', minWidth: 0, flex: '1 1 220px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'var(--bg-panel)',
              border: '1px solid var(--accent-blue-border)',
              color: 'var(--accent-blue)',
              flexShrink: 0,
              marginTop: '1px'
            }}
          >
            <Sparkles size={14} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Model Improved Outline
              </span>
              {modelBadge && (
                <span
                  style={{
                    fontSize: '0.66rem',
                    fontWeight: 600,
                    padding: '1px 7px',
                    borderRadius: '9999px',
                    background: 'var(--bg-panel)',
                    color: 'var(--accent-blue)',
                    border: '1px solid var(--accent-blue-border)',
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  {modelBadge}
                </span>
              )}
            </div>
            <p
              style={{
                fontSize: '0.74rem',
                color: 'var(--text-secondary)',
                margin: '2px 0 0 0',
                lineHeight: 1.4
              }}
            >
              {cleanedTitle && !/^model\s+improved\s+outline$/i.test(cleanedTitle)
                ? cleanedTitle
                : 'Compare your plan against a plain, rubric-aligned essay outline'}
            </p>
          </div>
        </div>

        <span className="model-outline-cta">
          <span>{isExpanded ? 'Hide Model Outline' : 'View Model Outline'}</span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {isExpanded && (
        <div className="model-outline-body">
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.6rem',
              marginBottom: '0.9rem'
            }}
          >
            <p
              style={{
                fontSize: '0.78rem',
                lineHeight: 1.55,
                color: 'var(--text-secondary)',
                margin: 0,
                flex: '1 1 240px'
              }}
            >
              {suggestedVisual.description
                ? cleanSimpleText(suggestedVisual.description)
                : 'Clean topic-focused structure in plain English. Introduction and Conclusion stay standalone without sub-points.'}
            </p>

            <button
              type="button"
              onClick={handleCopy}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 10px',
                borderRadius: '7px',
                fontSize: '0.72rem',
                fontWeight: 600,
                border: '1px solid var(--border-strong)',
                background: 'var(--bg-card)',
                color: copied ? 'var(--pass-green)' : 'var(--text-primary)',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span>{copied ? 'Copied' : 'Copy Outline'}</span>
            </button>
          </div>

          {thesisStatement && (
            <div
              style={{
                marginBottom: '1rem',
                padding: '0.7rem 0.9rem',
                borderRadius: '8px',
                borderLeft: '3px solid var(--accent-blue)',
                background: 'var(--accent-blue-soft)',
                fontSize: '0.82rem',
                lineHeight: 1.55,
                color: 'var(--text-primary)'
              }}
            >
              <div
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--accent-blue)',
                  marginBottom: '3px'
                }}
              >
                Thesis Statement (Optional in Outline)
              </div>
              <div style={{ fontFamily: 'var(--font-serif)' }}>{thesisStatement}</div>
            </div>
          )}

          {sections.length > 0 ? (
            <ol className="model-outline-section-list">
              {sections.map((section, sIdx) => {
                const isStandalone = section.kind === 'intro' || section.kind === 'conclusion';
                const subList = !isStandalone && Array.isArray(section.items) ? section.items : [];
                return (
                  <li key={`${section.marker || sIdx}-${sIdx}`}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '0.45rem',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        lineHeight: 1.5,
                        color: 'var(--text-primary)'
                      }}
                    >
                      <span style={{ color: 'var(--accent-blue)', flexShrink: 0 }}>{section.marker}</span>
                      <span>{section.heading}</span>
                    </div>

                    {subList.length > 0 && (
                      <ul className="model-outline-items">
                        {subList.map((item, iIdx) => (
                          <li key={`${item.marker || iIdx}-${iIdx}`} style={{ fontSize: '0.83rem', lineHeight: 1.58 }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-secondary)', flexShrink: 0 }}>
                                {item.marker}
                              </span>
                              <span style={{ color: 'var(--text-primary)' }}>{item.text}</span>
                            </div>

                            {Array.isArray(item.subItems) && item.subItems.length > 0 && (
                              <ul className="model-outline-subitems">
                                {item.subItems.map((sub, subIdx) => (
                                  <li
                                    key={`${sub.marker || subIdx}-${subIdx}`}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'baseline',
                                      gap: '0.35rem',
                                      fontSize: '0.79rem',
                                      lineHeight: 1.52,
                                      color: 'var(--text-secondary)'
                                    }}
                                  >
                                    <span style={{ fontWeight: 600, flexShrink: 0 }}>{sub.marker}</span>
                                    <span>{sub.text}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ol>
          ) : (
            <pre
              style={{
                fontSize: '0.78rem',
                lineHeight: 1.6,
                fontFamily: 'var(--font-sans)',
                background: 'var(--bg-app)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '0.85rem',
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                margin: 0
              }}
            >
              {suggestedVisual.diagramText}
            </pre>
          )}
        </div>
      )}
    </section>
  );
};

export const DocumentViewer = ({
  evaluation,
  selectedAnnId,
  onSelectAnnId,
  submissionImages = []
}) => {
  const [viewMode, setViewMode] = useState('transcribed'); // 'transcribed' | 'original'
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all'); // 'all' | 'red' | 'amber' | 'green'
  const [popoverPos, setPopoverPos] = useState(null);

  const containerRef = useRef(null);
  const paperRef = useRef(null);
  const popoverRef = useRef(null);
  const highlightRefs = useRef({});

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

  const annotationKeyMap = useMemo(() => {
    const map = new Map();
    allAnnotations.forEach((ann, idx) => {
      map.set(ann, getAnnotationKey(ann, idx));
    });
    return map;
  }, [allAnnotations]);

  const resolveAnnKey = useCallback(
    (ann, fallbackIdx = 0) => annotationKeyMap.get(ann) || getAnnotationKey(ann, fallbackIdx),
    [annotationKeyMap]
  );

  const isOutlineOnly =
    evaluation.essayMode === 'outline_only' ||
    evaluation.isOutlineOnly === true ||
    evaluation.archetypeId === 'essay_outline';

  const { renderItems } = useMemo(
    () => parseDocumentSections(fullText, isOutlineOnly),
    [fullText, isOutlineOnly]
  );

  const lastOutlineIdx = useMemo(() => {
    for (let i = renderItems.length - 1; i >= 0; i -= 1) {
      if (renderItems[i]?.kind?.startsWith('outline_')) {
        return i;
      }
    }
    return -1;
  }, [renderItems]);

  // Map logical essay coordinates ([O...], [P1..PN]) to renderItems indexes so
  // repeated phrases only highlight inside their intended target line or paragraph.
  const annotationTargetIndexMap = useMemo(() => {
    const map = {};
    if (renderItems.length === 0 || allAnnotations.length === 0) return map;

    const allOutlineIndices = [];
    const ordinalOutlineIndices = [];
    renderItems.forEach((item, idx) => {
      if (item.kind.startsWith('outline_')) {
        allOutlineIndices.push(idx);
        if (item.kind !== 'outline_title' && item.kind !== 'outline_topic') {
          ordinalOutlineIndices.push(idx);
        }
      }
    });
    const outlineSequence =
      ordinalOutlineIndices.length > 0 ? ordinalOutlineIndices : allOutlineIndices;

    allAnnotations.forEach((ann, idx) => {
      const annKey = resolveAnnKey(ann, idx);
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
            map[annKey] = itemIdx;
            return;
          }
        }
      } else {
        const oMatch = loc.match(/^O(\d+)/i);
        if (oMatch && allOutlineIndices.length > 0) {
          const targetOrdinal = parseInt(oMatch[1], 10);
          const matchingIndices = allOutlineIndices.filter((itemIdx) => {
            const concise = getConcisePhrase(rawPhrase, renderItems[itemIdx].text);
            return new RegExp(concise.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(
              renderItems[itemIdx].text
            );
          });

          if (matchingIndices.length === 1) {
            map[annKey] = matchingIndices[0];
          } else if (matchingIndices.length > 1) {
            // Prefer the match closest in outline order to targetOrdinal (1-based)
            let bestIdx = matchingIndices[0];
            let bestDistance = Infinity;
            matchingIndices.forEach((itemIdx) => {
              const seqPos = outlineSequence.indexOf(itemIdx);
              const ordinal = seqPos >= 0 ? seqPos + 1 : allOutlineIndices.indexOf(itemIdx) + 1;
              const dist = Math.abs(ordinal - targetOrdinal);
              if (dist < bestDistance) {
                bestDistance = dist;
                bestIdx = itemIdx;
              }
            });
            map[annKey] = bestIdx;
          }
        }
      }
    });

    return map;
  }, [renderItems, allAnnotations, resolveAnnKey]);

  // Identify currently selected annotation
  const activeAnnotation = useMemo(() => {
    if (!selectedAnnId) return null;
    return (
      allAnnotations.find(
        (a, idx) => resolveAnnKey(a, idx) === selectedAnnId || `ann-${a.targetPhrase}` === selectedAnnId
      ) || null
    );
  }, [selectedAnnId, allAnnotations, resolveAnnKey]);

  // Filtered annotations for the stepper
  const filteredAnnotations = useMemo(() => {
    if (activeCategoryFilter === 'all') return allAnnotations;
    return allAnnotations.filter((a) => a.type === activeCategoryFilter);
  }, [allAnnotations, activeCategoryFilter]);

  const activeIndexInFiltered = useMemo(() => {
    if (!activeAnnotation) return -1;
    const activeKey = resolveAnnKey(activeAnnotation);
    return filteredAnnotations.findIndex(
      (a, idx) => resolveAnnKey(a, idx) === activeKey || a === activeAnnotation
    );
  }, [filteredAnnotations, activeAnnotation, resolveAnnKey]);

  // Calculate Popover Position Anchored to Underlined Word (handles line wraps & measured height)
  const updatePopoverPosition = useCallback(
    (explicitHeight = null) => {
      if (!selectedAnnId || !paperRef.current) {
        setPopoverPos(null);
        return;
      }

      const targetEl = highlightRefs.current[selectedAnnId];
      if (!targetEl) {
        setPopoverPos(null);
        return;
      }

      const paperRect = paperRef.current.getBoundingClientRect();
      const boundingRect = targetEl.getBoundingClientRect();
      const clientRects = Array.from(targetEl.getClientRects?.() || []).filter(
        (r) => r.width > 0 && r.height > 0
      );

      const firstRect = clientRects[0] || boundingRect;
      const lastRect = clientRects[clientRects.length - 1] || boundingRect;

      const cardWidth = Math.min(POPOVER_MAX_WIDTH, Math.max(240, paperRect.width - 16));
      const measuredHeight =
        typeof explicitHeight === 'number' && explicitHeight > 0
          ? explicitHeight
          : popoverRef.current?.offsetHeight || 156;

      const gap = 10;
      const spaceBelowViewport = window.innerHeight - lastRect.bottom;
      const spaceAboveViewport = firstRect.top;
      const overflowPaperBottom =
        lastRect.bottom - paperRect.top + gap + measuredHeight + 12 > paperRect.height;

      let placement = 'bottom';
      if (
        (overflowPaperBottom || spaceBelowViewport < measuredHeight + 22) &&
        spaceAboveViewport >= measuredHeight + 22 &&
        firstRect.top - paperRect.top >= measuredHeight + gap + 8
      ) {
        placement = 'top';
      }

      // Anchor horizontally onto the exact line fragment nearest the notch (last line for bottom, first line for top)
      const anchorRect = placement === 'top' ? firstRect : lastRect;
      const targetCenterOnPaper = anchorRect.left - paperRect.left + anchorRect.width / 2;

      let left = targetCenterOnPaper - cardWidth / 2;
      const minLeft = 8;
      const maxLeft = Math.max(minLeft, paperRect.width - cardWidth - 8);
      left = Math.max(minLeft, Math.min(left, maxLeft));

      const notchLeft = Math.max(22, Math.min(cardWidth - 22, targetCenterOnPaper - left));

      const top =
        placement === 'top'
          ? Math.max(8, anchorRect.top - paperRect.top - measuredHeight - gap)
          : anchorRect.bottom - paperRect.top + gap;

      setPopoverPos({
        top,
        left,
        width: cardWidth,
        placement,
        notchLeft,
        measuredHeight: typeof explicitHeight === 'number' ? explicitHeight : null
      });
    },
    [selectedAnnId]
  );

  // Update position on selection change; scroll smoothly only if highlight is near/out of viewport
  useEffect(() => {
    if (selectedAnnId && viewMode === 'transcribed') {
      const targetEl = highlightRefs.current[selectedAnnId];
      let scrollTimer = null;

      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        const isOutOfComfortableView =
          rect.top < 96 || rect.bottom > window.innerHeight - 150;
        if (isOutOfComfortableView && typeof targetEl.scrollIntoView === 'function') {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }
      }

      const rafId = requestAnimationFrame(() => updatePopoverPosition());
      scrollTimer = setTimeout(() => updatePopoverPosition(), 240);

      return () => {
        cancelAnimationFrame(rafId);
        if (scrollTimer) clearTimeout(scrollTimer);
      };
    } else {
      setPopoverPos(null);
    }
  }, [selectedAnnId, viewMode, updatePopoverPosition]);

  // Measure actual rendered card height synchronously before paint so top-flip placement is exact
  useLayoutEffect(() => {
    if (!selectedAnnId || !popoverRef.current || !popoverPos) return;
    const actualHeight = popoverRef.current.offsetHeight;
    if (actualHeight > 0 && popoverPos.measuredHeight !== actualHeight) {
      updatePopoverPosition(actualHeight);
    }
  }, [selectedAnnId, activeAnnotation?.comment, popoverPos, updatePopoverPosition]);

  useEffect(() => {
    const handleResize = () => updatePopoverPosition();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updatePopoverPosition]);

  // Stepper Handlers
  const handleNextAnnotation = useCallback(
    (e) => {
      e?.stopPropagation();
      if (filteredAnnotations.length === 0) return;
      const nextIdx = (activeIndexInFiltered + 1) % filteredAnnotations.length;
      const nextAnn = filteredAnnotations[nextIdx];
      if (nextAnn && onSelectAnnId) {
        onSelectAnnId(resolveAnnKey(nextAnn, nextIdx));
      }
    },
    [filteredAnnotations, activeIndexInFiltered, onSelectAnnId, resolveAnnKey]
  );

  const handlePrevAnnotation = useCallback(
    (e) => {
      e?.stopPropagation();
      if (filteredAnnotations.length === 0) return;
      const prevIdx =
        activeIndexInFiltered <= 0
          ? filteredAnnotations.length - 1
          : activeIndexInFiltered - 1;
      const prevAnn = filteredAnnotations[prevIdx];
      if (prevAnn && onSelectAnnId) {
        onSelectAnnId(resolveAnnKey(prevAnn, prevIdx));
      }
    },
    [filteredAnnotations, activeIndexInFiltered, onSelectAnnId, resolveAnnKey]
  );

  // Keyboard navigation while an inline annotation is active
  useEffect(() => {
    if (!selectedAnnId || viewMode !== 'transcribed') return;
    const handleKeyDown = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) {
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onSelectAnnId?.(null);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextAnnotation();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevAnnotation();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAnnId, viewMode, onSelectAnnId, handleNextAnnotation, handlePrevAnnotation]);

  const handleTranscribedClick = (e, ann, annIdx) => {
    e.stopPropagation();
    const annKey = resolveAnnKey(ann, annIdx);
    if (selectedAnnId === annKey) {
      if (onSelectAnnId) onSelectAnnId(null);
    } else {
      if (onSelectAnnId) onSelectAnnId(annKey);
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
      const annKey = resolveAnnKey(a, idx);
      const lockedIdx = annotationTargetIndexMap[annKey];
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
          validAnns.push({ ann: a, annIdx: idx, matchPhrase });
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
        const annKey = resolveAnnKey(matchedAnn, matchedEntry.annIdx);
        const isSelected = selectedAnnId === annKey || selectedAnnId === `ann-${matchedAnn.targetPhrase}`;
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
            key={`${annKey}-${i}`}
            ref={(el) => {
              if (el) {
                if (!highlightRefs.current[annKey] || !highlightRefs.current[annKey].isConnected) {
                  highlightRefs.current[annKey] = el;
                }
              } else if (highlightRefs.current[annKey] && !highlightRefs.current[annKey].isConnected) {
                delete highlightRefs.current[annKey];
              }
            }}
            onClick={(e) => handleTranscribedClick(e, matchedAnn, matchedEntry.annIdx)}
            className={`${underlineClass} ${isSelected ? 'is-selected' : ''} cursor-pointer relative z-10 inline`}
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

  const activeSeverityBadgeClass = activeAnnotation
    ? isDiscrepantEvidenceAnnotation(activeAnnotation)
      ? 'editorial-popover-badge-evidence'
      : activeAnnotation.type === 'red'
      ? 'editorial-popover-badge-error'
      : activeAnnotation.type === 'green'
      ? 'editorial-popover-badge-good'
      : 'editorial-popover-badge-polish'
    : 'editorial-popover-badge-polish';

  const activeCommentSegments = activeAnnotation?.comment
    ? tokenizeQuotedSegments(cleanSimpleText(activeAnnotation.comment))
    : [];
  const activeLocationText = activeAnnotation?.locationId
    ? formatPopoverLocationLabel(activeAnnotation.locationId)
    : '';

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
        padding: '1.25rem 1rem 1.5rem 1rem',
        background: 'var(--bg-app)'
      }}
    >
      {/* Top Booklet Toolbar (shown when uploaded page scans exist) */}
      {imagePages && imagePages.length > 0 && (
        <div
          className="no-print"
          style={{
            maxWidth: '48rem',
            margin: '0 auto 0.85rem auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
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
              type="button"
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
              type="button"
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
        </div>
      )}

      {/* VIEW 1: ORIGINAL UPLOADED HANDWRITTEN PAGES */}
      {viewMode === 'original' && imagePages && imagePages.length > 0 ? (
        <div
          style={{
            maxWidth: '48rem',
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
        /* VIEW 2: CLEAN EDITORIAL PAPER SHEET */
        <div className="flex-1 p-1 sm:p-3 md:p-5 lg:p-6 flex justify-center">
          <article
            ref={paperRef}
            className="w-full max-w-3xl p-5 sm:p-8 md:p-11 relative editorial-paper-sheet flex flex-col min-h-[580px] font-academic"
            style={{ position: 'relative' }}
          >
            {/* Document Meta Header */}
            <div
              className="pb-3 mb-5 font-sans text-xs flex flex-wrap justify-between items-center gap-2"
              style={{
                borderBottom: '1px solid var(--border)',
                color: 'var(--text-muted)'
              }}
            >
              <span>{evaluation.subject || 'CSS English Essay'}</span>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                {(!imagePages || imagePages.length === 0) && (
                  <span style={{ color: 'var(--accent-blue)' }}>{evaluatedModelName}</span>
                )}
                {(!imagePages || imagePages.length === 0) && <span>·</span>}
                <span>{evaluation.date || new Date().toISOString().split('T')[0]}</span>
              </div>
            </div>

            {/* Clean Editorial Canvas: Student Script + Inline Relocated Model Outline */}
            <div className="editorial-document-body font-academic">
              {renderItems.map((item, idx) => {
                if (item.kind === 'essay_divider') {
                  return (
                    <div key={item.id} className="editorial-essay-divider">
                      Essay
                    </div>
                  );
                }

                const highlightedContent = renderHighlightedParagraph(item.text, idx);
                let node = null;

                if (item.kind === 'outline_topic') {
                  node = (
                    <h2 className="editorial-topic-title">
                      {highlightedContent}
                    </h2>
                  );
                } else if (item.kind === 'outline_title') {
                  node = (
                    <div className="editorial-outline-heading uppercase tracking-wide">
                      {highlightedContent}
                    </div>
                  );
                } else if (item.kind === 'outline_main') {
                  node = (
                    <div className="editorial-outline-heading">
                      {highlightedContent}
                    </div>
                  );
                } else if (item.kind === 'outline_thesis') {
                  node = (
                    <div
                      className="font-semibold pl-3.5 my-2.5 py-1.5 rounded-r leading-snug"
                      style={{
                        borderLeft: '3px solid var(--warning-amber)',
                        background: 'var(--warning-amber-soft)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      {highlightedContent}
                    </div>
                  );
                } else if (item.kind === 'outline_sub') {
                  const subWordCount = item.text.trim().split(/\s+/).filter(Boolean).length;
                  node = (
                    <div
                      className="editorial-outline-sub"
                      style={{
                        fontWeight: subWordCount <= 10 ? 600 : 400,
                        color: subWordCount <= 10 ? 'var(--text-primary)' : 'var(--text-secondary)'
                      }}
                    >
                      {highlightedContent}
                    </div>
                  );
                } else if (item.kind === 'outline_point') {
                  node = (
                    <div className="editorial-outline-detail">
                      {highlightedContent}
                    </div>
                  );
                } else {
                  node = (
                    <p style={{ color: 'var(--text-primary)' }}>
                      {highlightedContent}
                    </p>
                  );
                }

                return (
                  <React.Fragment key={item.id}>
                    {node}
                    {idx === lastOutlineIdx && <ModelOutlineCard suggestedVisual={suggestedVisual} />}
                  </React.Fragment>
                );
              })}

              {lastOutlineIdx === -1 && <ModelOutlineCard suggestedVisual={suggestedVisual} />}
            </div>

            {/* REDESIGNED EDITORIAL ANNOTATION POPOVER */}
            {activeAnnotation && popoverPos && (
              <div
                ref={popoverRef}
                role="dialog"
                aria-label={simplifyCategoryTitle(activeAnnotation.category, activeAnnotation)}
                className="editorial-popover text-left"
                onClick={(e) => e.stopPropagation()}
                style={{
                  top: `${popoverPos.top}px`,
                  left: `${popoverPos.left}px`,
                  width: `${popoverPos.width}px`
                }}
              >
                {/* Seamless Pointer Notch Anchored to Phrase Center */}
                <div
                  aria-hidden="true"
                  className={
                    popoverPos.placement === 'top'
                      ? 'editorial-popover-notch-bottom'
                      : 'editorial-popover-notch-top'
                  }
                  style={{ left: `${popoverPos.notchLeft || 28}px` }}
                />

                <div className="editorial-popover-inner">
                  {/* Header: Severity Status Pill + Subtle Location + Close */}
                  <div className="editorial-popover-header">
                    <span className={`editorial-popover-badge ${activeSeverityBadgeClass}`}>
                      <span className="editorial-popover-dot" aria-hidden="true" />
                      <span className="truncate">
                        {simplifyCategoryTitle(activeAnnotation.category, activeAnnotation)}
                      </span>
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {activeLocationText && (
                        <span className="editorial-popover-location">{activeLocationText}</span>
                      )}
                      <button
                        aria-label="Close feedback note"
                        className="editorial-popover-close"
                        onClick={() => onSelectAnnId && onSelectAnnId(null)}
                        title="Close (Esc)"
                        type="button"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Explanation Body with Inline Scannable Phrase Tokens */}
                  <div className="editorial-popover-body">
                    {activeCommentSegments.length > 0 ? (
                      <p>
                        {activeCommentSegments.map((seg, idx) =>
                          seg.isQuoted ? (
                            <span key={idx} className="editorial-popover-token">
                              {seg.text}
                            </span>
                          ) : (
                            <React.Fragment key={idx}>{seg.text}</React.Fragment>
                          )
                        )}
                      </p>
                    ) : (
                      <p>
                        Review{' '}
                        <span className="editorial-popover-token">
                          {getConcisePhrase(activeAnnotation.targetPhrase, fullText)}
                        </span>{' '}
                        carefully for clarity and correctness.
                      </p>
                    )}
                  </div>

                  {/* Quiet Utility Stepper Footer */}
                  {filteredAnnotations.length > 0 && (
                    <div className="editorial-popover-footer">
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={handlePrevAnnotation}
                          disabled={filteredAnnotations.length <= 1}
                          className="editorial-popover-btn"
                          aria-label="Previous note"
                          title="Previous note (←)"
                        >
                          <ChevronLeft size={13} />
                          <span>Prev</span>
                        </button>

                        <span className="editorial-popover-counter">
                          {activeIndexInFiltered >= 0 ? activeIndexInFiltered + 1 : 1} /{' '}
                          {filteredAnnotations.length}
                        </span>

                        <button
                          type="button"
                          onClick={handleNextAnnotation}
                          disabled={filteredAnnotations.length <= 1}
                          className="editorial-popover-btn"
                          aria-label="Next note"
                          title="Next note (→)"
                        >
                          <span>Next</span>
                          <ChevronRight size={13} />
                        </button>
                      </div>

                      <span className="editorial-popover-kbd hidden sm:inline">← → · Esc</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </article>
        </div>
      )}

      {/* SCOPED STICKY ANNOTATION & STEPPER DOCK */}
      {viewMode === 'transcribed' && allAnnotations.length > 0 && (
        <div className="floating-annotation-dock no-print font-sans">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveCategoryFilter('all')}
              className="px-2.5 py-1 text-xs font-medium rounded-full transition-colors cursor-pointer"
              style={
                activeCategoryFilter === 'all'
                  ? { background: 'var(--text-primary)', color: 'var(--bg-panel)' }
                  : { color: 'var(--text-secondary)' }
              }
            >
              All ({allAnnotations.length})
            </button>
            {redCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('red')}
                className="px-2.5 py-1 text-xs font-medium rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                style={
                  activeCategoryFilter === 'red'
                    ? { background: '#e11d48', color: '#ffffff' }
                    : { color: 'var(--fail-red)' }
                }
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                <span>Errors ({redCount})</span>
              </button>
            )}
            {amberCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('amber')}
                className="px-2.5 py-1 text-xs font-medium rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                style={
                  activeCategoryFilter === 'amber'
                    ? { background: '#d97706', color: '#ffffff' }
                    : { color: 'var(--warning-amber)' }
                }
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                <span>Polish ({amberCount})</span>
              </button>
            )}
            {greenCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('green')}
                className="px-2.5 py-1 text-xs font-medium rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                style={
                  activeCategoryFilter === 'green'
                    ? { background: '#059669', color: '#ffffff' }
                    : { color: 'var(--pass-green)' }
                }
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                <span>Good ({greenCount})</span>
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="w-[1px] h-4 mx-1" style={{ background: 'var(--border)' }} />

          {/* Stepper Controls */}
          <div className="flex items-center space-x-1">
            <button
              aria-label="Previous issue"
              onClick={handlePrevAnnotation}
              className="p-1 rounded-full transition-colors flex items-center justify-center cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
              title="Previous issue"
              type="button"
            >
              <ChevronLeft size={16} />
            </button>
            <span
              className="text-xs font-mono font-medium px-1 whitespace-nowrap"
              style={{ color: 'var(--text-secondary)' }}
            >
              {activeIndexInFiltered >= 0 ? activeIndexInFiltered + 1 : 0} / {filteredAnnotations.length}
            </span>
            <button
              aria-label="Next issue"
              onClick={handleNextAnnotation}
              className="p-1 rounded-full transition-colors flex items-center justify-center cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
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
