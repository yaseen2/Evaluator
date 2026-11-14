/**
 * Plain-English Text Sanitizer & Coordinate Humanizer (v3.3)
 * Converts internal agent coordinate tokens (O15, P2, P1.S5), stiff third-person
 * examiner phrasing ("the candidate"), and technical category labels into simple,
 * student-friendly everyday English.
 */
export const formatLocationLabel = (locationId = '') => {
  const raw = String(locationId || '')
    .replace(/^\[+|\]+$/g, '')
    .trim();
  if (!raw) return '';

  const exactO = raw.match(/^O(\d+)$/i);
  if (exactO) return `Outline Point ${exactO[1]}`;

  const exactPS = raw.match(/^P(\d+)\.S(\d+)$/i);
  if (exactPS) return `Paragraph ${exactPS[1]}, Sentence ${exactPS[2]}`;

  const exactP = raw.match(/^P(\d+)$/i);
  if (exactP) {
    return exactP[1] === '1' ? 'Paragraph 1 (Introduction)' : `Paragraph ${exactP[1]}`;
  }

  return raw
    .replace(/\bP(\d+)\.S(\d+)\b/gi, 'Paragraph $1, Sentence $2')
    .replace(/\bO(\d+)\b/gi, 'Outline Point $1')
    .replace(/\bP(\d+)\b/gi, 'Paragraph $1');
};

/**
 * Compact location subtitle tailored for the inline paper popover, where the
 * pointer notch already anchors directly onto the underlined phrase.
 */
export const formatPopoverLocationLabel = (locationId = '') => {
  const raw = String(locationId || '')
    .replace(/^\[+|\]+$/g, '')
    .trim();
  if (!raw) return '';

  if (/^O\d+$/i.test(raw)) return 'Outline';
  if (/^P1(?:\.S\d+)?$/i.test(raw)) return 'Introduction';

  const bodyMatch = raw.match(/^P(\d+)(?:\.S\d+)?$/i);
  if (bodyMatch) return `Paragraph ${bodyMatch[1]}`;

  return formatLocationLabel(raw);
};

export const formatRoleLabel = (role = '') => {
  const key = String(role || '').trim().toUpperCase();
  const map = {
    INTRO: 'Introduction',
    CONTEXT_OVERVIEW: 'Background Overview',
    BODY_MAIN: 'Main Body Paragraph',
    TRANSITION_BRIDGE: 'Transition Paragraph',
    COUNTER_ARGUMENT: 'Counter-Argument',
    CONCLUSION: 'Conclusion'
  };
  return map[key] || String(role || '').replace(/_/g, ' ');
};

export const simplifyCategoryTitle = (category = '', ann = null) => {
  const raw = String(category || '').trim();
  const upper = raw.toUpperCase();

  if (!raw) return getSimpleHeadline(ann);

  if (upper.includes('ARTICLE OMISSION') || upper.includes('MISSING ARTICLE')) {
    return "Missing 'A', 'An', or 'The'";
  }
  if (upper.includes('INTRO FUNNEL')) {
    return 'Weak Introduction Flow';
  }
  if (upper.includes('THESIS ARCHITECTURE') || upper.includes('WEAK THESIS')) {
    return 'Weak Thesis Statement';
  }
  if (upper.includes('PREMATURE TERMINATION') || upper.includes('MISSING SUBSTANTIVE BODY')) {
    return 'Incomplete Essay';
  }
  if (
    ann?.isDiscrepantEvidence === true ||
    upper.includes('FACT') ||
    upper.includes('OUTDATED') ||
    upper.includes('2026') ||
    upper.includes('CITATION') ||
    upper.includes('STATISTIC') ||
    upper.includes('DISCREPANCY')
  ) {
    return 'Incorrect Fact / Reference';
  }
  if (upper.includes('EARNED') || upper.includes('SIGNIFIER') || ann?.type === 'green') {
    return upper === 'GOOD POINT' || upper === 'STRONG POINT' ? raw : 'Good Point';
  }
  if (upper.includes('SUBJECT-VERB') || upper.includes('AGREEMENT') || upper.includes('TENSE')) {
    return 'Grammar Mistake';
  }
  if (upper.includes('PINGLISH') || upper.includes('PREPOSITION')) {
    return 'Wrong Word Choice';
  }
  if (upper.includes('SYNTAX') && !upper.includes('GRAMMAR MISTAKE')) {
    return 'Grammar Mistake';
  }

  return raw
    .replace(/\bFPSC\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

export const isDiscrepantEvidenceAnnotation = (ann) => {
  if (!ann) return false;
  if (ann.isDiscrepantEvidence === true) return true;
  if (ann.type !== 'red' && ann.type !== 'amber') return false;

  const haystack = `${ann.category || ''} ${ann.comment || ''}`.toLowerCase();
  return /(incorrect fact|outdated|discrepancy|unverified quote|unverified citation|wrong number|wrong stat|wrong date|census|imf|gdp|citation|fact check|false claim|inaccurate data|evidence discrepancy)/.test(
    haystack
  );
};

export const cleanSimpleText = (text) => {
  if (!text || typeof text !== 'string') return '';

  const replaceWithCase = (str, regex, lowerRep, upperRep) =>
    str.replace(regex, (match, offset, full) => {
      const prev = full.slice(Math.max(0, offset - 3), offset);
      const isSentenceStart = offset === 0 || /[.!?]\s*$/.test(prev);
      return isSentenceStart ? upperRep : lowerRep;
    });

  let out = text
    .replace(/\*\*/g, '')
    .replace(/\[Spotlight Zone(?:\s*[—–-]\s*2x Examiner Visibility)?\]\s*/gi, '')
    .replace(
      /\bSentences?\s+\[?P(\d+)\.S(\d+)\]?\s+(?:through|to|-|–)\s+\[?P\1\.S(\d+)\]?\b/gi,
      'Sentences $2 to $3 of Paragraph $1'
    )
    .replace(/\b\[?P1\.S(\d+)\]?\b/g, 'Sentence $1 of the Introduction (Paragraph 1)')
    .replace(/\b\[?P(\d+)\.S(\d+)\]?\b/g, 'Paragraph $1 (Sentence $2)')
    .replace(/\b(?:paragraph|para)\s+\[?P1\]?\b/gi, 'Paragraph 1 (Introduction)')
    .replace(/\b(?:paragraph|para)\s+\[?P(\d+)\]?\b/gi, 'Paragraph $1')
    .replace(/\b(?:outline\s*point|point|item)\s+\[?O(\d+)\]?\b/gi, 'Outline Point $1')
    .replace(/(^|[\s([,"'])(\[?P1\]?)(?=$|[\s.,;:)\]'"!?])/g, '$1Paragraph 1 (Introduction)')
    .replace(/(^|[\s([,"'])\[?P(\d+)\]?(?=$|[\s.,;:)\]'"!?])/g, '$1Paragraph $2')
    .replace(/(^|[\s([,"'])\[?O(\d+)\]?(?=$|[\s.,;:)\]'"!?])/g, '$1Outline Point $2');

  out = replaceWithCase(out, /\bthe candidate's\b/gi, 'your', 'Your');
  out = replaceWithCase(out, /\bthe candidate\b/gi, 'you', 'You');
  out = replaceWithCase(out, /\bthis candidate\b/gi, 'you', 'You');
  out = replaceWithCase(out, /\bthe written script\b/gi, 'your essay', 'Your essay');
  out = replaceWithCase(out, /\bcandidates\b/gi, 'students', 'Students');

  return out.replace(/\s{2,}/g, ' ').trim();
};

export const getSimpleHeadline = (ann) => {
  if (!ann) return 'Tip';
  const comment = (ann.comment || '').toLowerCase();
  const cat = (ann.category || '').toLowerCase();

  if (ann.type === 'red') {
    if (comment.includes('punct') || comment.includes('comma') || comment.includes('question mark') || comment.includes('period')) {
      return 'Punctuation Mistake';
    }
    if (comment.includes('spell') || cat.includes('spell')) {
      return 'Spelling Mistake';
    }
    if (comment.includes('tense') || comment.includes('verb') || comment.includes('plural') || comment.includes('agreement') || comment.includes('article')) {
      return 'Grammar Mistake';
    }
    return 'Mistake';
  }

  if (ann.type === 'amber') {
    if (comment.includes('informal') || comment.includes('word') || comment.includes('vocabulary') || cat.includes('diction')) {
      return 'Better Word';
    }
    if (comment.includes('clear') || comment.includes('flow') || comment.includes('structure')) {
      return 'Clearer Wording';
    }
    return 'Improvement Tip';
  }

  if (ann.type === 'green') {
    return 'Good Point';
  }

  return 'Tip';
};

/**
 * Splits plain-English explanation prose into plain segments and single-quoted
 * example suggestions ('like this') while leaving mid-word apostrophes untouched.
 */
export const tokenizeQuotedSegments = (text = '') => {
  const input = String(text || '');
  if (!input) return [];

  const regex = /(^|[\s([{"“/—–])'((?:[^'\n]|'(?=[a-zA-Z]))+?)'(?=$|[\s.,;:!?)\]}"”/—–])/g;
  const segments = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(input)) !== null) {
    const lead = match[1];
    const quotedText = match[2];
    const quoteStart = match.index + lead.length;

    if (!quotedText.trim() || quotedText.length > 120) {
      continue;
    }

    if (quoteStart > lastIndex) {
      segments.push({ text: input.slice(lastIndex, quoteStart), isQuoted: false });
    }
    segments.push({ text: quotedText, isQuoted: true });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < input.length) {
    segments.push({ text: input.slice(lastIndex), isQuoted: false });
  }

  return segments.length > 0 ? segments : [{ text: input, isQuoted: false }];
};

const ROMAN_NUMERALS = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'
];

const OUTLINE_ROMAN_SECTION_MAP = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
  VIII: 8,
  IX: 9,
  X: 10,
  XI: 11,
  XII: 12,
  XIII: 13,
  XIV: 14,
  XV: 15,
  XVI: 16,
  XVII: 17,
  XVIII: 18,
  XIX: 19,
  XX: 20
};

const getLineTreeDepthWidth = (rawLine = '') => {
  const prefixMatch = String(rawLine || '').match(/^[\s│|├└─┌┐┘┤┬┴┼•*>-]*/);
  return prefixMatch ? prefixMatch[0].length : 0;
};

const extractInlineIntroThesis = (heading = '') => {
  const parenMatch = String(heading || '').match(
    /^introduction\b[\s:–—-]*\((?:optional\s+)?thesis(?:\s+statement)?\s*:\s*(.+)\)\s*$/i
  );
  if (parenMatch) {
    return {
      heading: 'Introduction',
      extractedThesis: parenMatch[1].trim()
    };
  }
  const colonMatch = String(heading || '').match(
    /^introduction\b\s*[:–—-]\s*(?:optional\s+)?thesis(?:\s+statement)?\s*:\s*(.+)$/i
  );
  if (colonMatch) {
    return {
      heading: 'Introduction',
      extractedThesis: colonMatch[1].trim()
    };
  }
  return { heading, extractedThesis: '' };
};

export const stripOutlineTreeArtifacts = (line = '') => {
  return String(line || '')
    .replace(/\*\*([^*]*?)\*\*/g, '$1')
    .replace(/^[\s│|├└─┌┐┘┤┬┴┼•*>-]+/g, '')
    .replace(/^\*+|\*+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Parses legacy plain-text or ASCII-tree `diagramText` model outlines into the
 * structured `{ thesisStatement, sections }` shape used by the clean CSS outline viewer.
 */
export const parseLegacyModelOutlineText = (diagramText = '') => {
  const rawLines = String(diagramText || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/\r/g, ''))
    .filter((line) => line.trim().length > 0);

  if (!rawLines.length) {
    return { thesisStatement: '', sections: [] };
  }

  const parsedEntries = rawLines
    .map((rawLine) => ({
      rawLine,
      depth: getLineTreeDepthWidth(rawLine),
      clean: stripOutlineTreeArtifacts(rawLine)
    }))
    .filter((entry) => entry.clean.length > 0);

  if (!parsedEntries.length) {
    return { thesisStatement: '', sections: [] };
  }

  // Detect whether top-level sections use numeric markers (1., 2., 3.) or Roman numerals (I., II., III.)
  const hasMultiRoman = parsedEntries.some((e) =>
    /^(?:II|III|IV|VI{1,3}|IX|XI{0,3})[.):]\s+/.test(e.clean)
  );
  const hasRomanIntro = parsedEntries.some((e) =>
    /^I[.):]\s+(?:introduction|outline|overview|thesis)\b/i.test(e.clean)
  );
  const hasNumericIntroOrConc = parsedEntries.some((e) =>
    /^\d{1,2}[.):]\s+(?:introduction|conclusion)\b/i.test(e.clean)
  );
  const numericLineCount = parsedEntries.filter((e) => /^\d{1,2}[.):]\s+/.test(e.clean)).length;
  const isNumericTopScheme =
    hasNumericIntroOrConc || (!hasMultiRoman && !hasRomanIntro && numericLineCount >= 2);

  let thesisStatement = '';
  const sections = [];
  let currentSection = null;
  let currentSectionDepth = null;
  let lastRomanVal = 0;
  let lastNumericSectionVal = 0;
  let currentItem = null;
  let currentItemDepth = null;
  let currentSectionItemStyle = null;
  let lastItemCharCode = null;
  let parenItemMode = false;

  const ensureSection = () => {
    if (!currentSection) {
      currentSection = {
        marker: `${ROMAN_NUMERALS[sections.length] || sections.length + 1}.`,
        heading: 'Core Arguments',
        kind: 'body',
        items: []
      };
      sections.push(currentSection);
      currentSectionDepth = 0;
      currentSectionItemStyle = null;
      lastItemCharCode = null;
      parenItemMode = false;
    }
    return currentSection;
  };

  for (let idx = 0; idx < parsedEntries.length; idx += 1) {
    const { depth, clean } = parsedEntries[idx];

    const thesisMatch = clean.match(
      /^\[?(?:optional\s+)?thesis(?:\s+statement)?\]?\s*:?\s*(.+)$/i
    );
    if (thesisMatch) {
      if (!thesisStatement) {
        thesisStatement = thesisMatch[1].trim();
      }
      continue;
    }

    const candRomanMatch = !isNumericTopScheme ? clean.match(/^([IVX]+)[.):]\s+(.+)$/) : null;
    const candRomanVal = candRomanMatch ? OUTLINE_ROMAN_SECTION_MAP[candRomanMatch[1]] || 0 : 0;
    const continuesAlphaSequence =
      Boolean(candRomanMatch) &&
      lastItemCharCode !== null &&
      candRomanMatch[1].length === 1 &&
      candRomanMatch[1].charCodeAt(0) === lastItemCharCode + 1;
    const isRomanHeading =
      Boolean(candRomanVal) &&
      !continuesAlphaSequence &&
      (candRomanMatch[1] === 'I'
        ? sections.length === 0
        : candRomanMatch[1] === 'V' || candRomanMatch[1] === 'X'
          ? candRomanVal > lastRomanVal &&
            candRomanVal <= lastRomanVal + 2 &&
            (currentSectionDepth === null || depth <= currentSectionDepth + 1)
          : candRomanVal > lastRomanVal || sections.length === 0);

    const candNumericMatch = isNumericTopScheme ? clean.match(/^(\d{1,2})[.):]\s+(.+)$/) : null;
    const candNumericVal = candNumericMatch ? Number(candNumericMatch[1]) : 0;
    const isTopNumericHeading =
      Boolean(candNumericMatch) &&
      (currentSectionDepth === null ||
        depth <= currentSectionDepth + 1 ||
        candNumericVal > lastNumericSectionVal);

    const introConcMatch =
      !isRomanHeading &&
      !isTopNumericHeading &&
      /^(introduction|conclusion)\b(?:\s*[:\-–—(].*)?$/i.test(clean) &&
      (!currentSection ||
        depth <= (currentSectionDepth ?? depth) + 1 ||
        /^(introduction|conclusion)\s*(?:\(|$|:)/i.test(clean));

    if (isRomanHeading || isTopNumericHeading || introConcMatch) {
      const marker = `${ROMAN_NUMERALS[sections.length] || sections.length + 1}.`;
      let heading = clean;

      if (isRomanHeading) {
        lastRomanVal = candRomanVal;
        heading = candRomanMatch[2].trim();
      } else if (isTopNumericHeading) {
        lastNumericSectionVal = candNumericVal;
        heading = candNumericMatch[2].trim();
      }

      const lower = heading.toLowerCase();
      const kind = lower.startsWith('introduction')
        ? 'intro'
        : lower.startsWith('conclusion')
          ? 'conclusion'
          : 'body';

      if (kind === 'intro') {
        const extracted = extractInlineIntroThesis(heading);
        heading = extracted.heading;
        if (!thesisStatement && extracted.extractedThesis) {
          thesisStatement = extracted.extractedThesis;
        }
      } else if (kind === 'conclusion') {
        heading = 'Conclusion';
      }

      currentSection = { marker, heading, kind, items: [] };
      sections.push(currentSection);
      currentSectionDepth = depth;
      currentItem = null;
      currentItemDepth = null;
      currentSectionItemStyle = null;
      lastItemCharCode = null;
      parenItemMode = false;
      continue;
    }

    // Ignore document wrapper/title header lines before the first section starts
    if (!currentSection) {
      continue;
    }

    // Never nest sub-points under standalone Introduction or Conclusion
    if (currentSection.kind === 'intro' || currentSection.kind === 'conclusion') {
      continue;
    }

    const parenSubMatch = clean.match(/^\(([a-z0-9]+)\)\s+(.+)$/i);
    const letterMarkerMatch = clean.match(/^([A-Za-z])[.):]\s+(.+)$/);
    const numMarkerMatch = clean.match(/^(\d{1,2})[.):]\s+(.+)$/);

    let isSubItem = false;
    if (currentItem) {
      if (parenSubMatch && !parenItemMode) {
        isSubItem = true;
      } else if (letterMarkerMatch) {
        const ch = letterMarkerMatch[1];
        const isLower = ch >= 'a' && ch <= 'z';
        const code = ch.toUpperCase().charCodeAt(0);
        const matchesSectionItemSeq =
          lastItemCharCode !== null &&
          code === lastItemCharCode + 1 &&
          ((currentSectionItemStyle === 'lower' && isLower) ||
            (currentSectionItemStyle === 'upper' && !isLower));

        if (currentSectionItemStyle === 'upper' && isLower && !matchesSectionItemSeq) {
          isSubItem = true;
        } else if (
          currentItemDepth !== null &&
          depth >= currentItemDepth + 2 &&
          !matchesSectionItemSeq
        ) {
          isSubItem = true;
        }
      } else if (numMarkerMatch && !isNumericTopScheme) {
        if (
          currentSectionItemStyle === 'upper' ||
          currentSectionItemStyle === 'lower' ||
          (currentItemDepth !== null && depth >= currentItemDepth + 2)
        ) {
          isSubItem = true;
        }
      } else if (currentItemDepth !== null && depth >= currentItemDepth + 2) {
        isSubItem = true;
      }
    }

    if (isSubItem && currentItem) {
      const explicitSub =
        (parenSubMatch && parenSubMatch[1]) ||
        (letterMarkerMatch && letterMarkerMatch[1]) ||
        (numMarkerMatch && numMarkerMatch[1]);
      const marker = explicitSub
        ? `(${explicitSub.toLowerCase()})`
        : `(${String.fromCharCode(97 + (currentItem.subItems.length % 26))})`;
      const subText = (
        (parenSubMatch && parenSubMatch[2]) ||
        (letterMarkerMatch && letterMarkerMatch[2]) ||
        (numMarkerMatch && numMarkerMatch[2]) ||
        clean
      ).trim();

      currentItem.subItems.push({ marker, text: subText });
      continue;
    }

    const target = ensureSection();
    if (!currentSectionItemStyle) {
      if (letterMarkerMatch) {
        currentSectionItemStyle =
          letterMarkerMatch[1] >= 'a' && letterMarkerMatch[1] <= 'z' ? 'lower' : 'upper';
      } else if (numMarkerMatch) {
        currentSectionItemStyle = 'numeric';
      } else if (parenSubMatch) {
        currentSectionItemStyle = 'paren';
        parenItemMode = true;
      } else {
        currentSectionItemStyle = 'plain';
      }
    }

    const fallbackAlpha = String.fromCharCode(65 + (target.items.length % 26));
    let marker = `${fallbackAlpha}.`;
    let text = clean;

    if (letterMarkerMatch) {
      const upper = letterMarkerMatch[1].toUpperCase();
      marker = `${upper}.`;
      text = letterMarkerMatch[2].trim();
      lastItemCharCode = upper.charCodeAt(0);
    } else if (numMarkerMatch) {
      marker = `${fallbackAlpha}.`;
      text = numMarkerMatch[2].trim();
      lastItemCharCode = fallbackAlpha.charCodeAt(0);
    } else if (parenSubMatch) {
      marker = `${fallbackAlpha}.`;
      text = parenSubMatch[2].trim();
      lastItemCharCode = fallbackAlpha.charCodeAt(0);
    } else {
      lastItemCharCode = fallbackAlpha.charCodeAt(0);
    }

    currentItem = { marker, text, subItems: [] };
    currentItemDepth = depth;
    target.items.push(currentItem);
  }

  return { thesisStatement, sections };
};

