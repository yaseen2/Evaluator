/**
 * Stage 0B & Stage 1A-Post: Deterministic Code Pre-Processor (0 Tokens, <5ms)
 *
 * 1. Bulletproof Outline-to-Body Boundary Detection:
 *    - Never splits on a naive /Introduction/i regex (since "1. Introduction" is inside the Outline).
 *    - Locates the Outline's Conclusion entry followed by the first continuous multi-sentence prose
 *      paragraph ([P1] Intro), with a line-density heuristic fallback if headers are formatted unusually.
 * 2. Coordinate Tagging:
 *    - Tags Outline nodes [O1..On] and Paragraph/Sentence IDs [P1.S1..PN.SM].
 * 3. Per-Paragraph Word & Sentence Counts (Pre-Agent 1).
 * 4. Post-Agent-1 Role-Filtered Pacing Decay Calculator:
 *    - Averages ONLY paragraphs tagged BODY_MAIN and COUNTER_ARGUMENT by Agent 1 so valid 25-word
 *      TRANSITION_BRIDGE or CONTEXT_OVERVIEW paragraphs never trigger false -35% pacing decay penalties.
 */

export const countExactWords = (str) => {
  if (!str || typeof str !== 'string') return 0;
  return str.trim().split(/\s+/).filter(Boolean).length;
};

/**
 * Splits a prose paragraph into individual sentences while preserving abbreviations like
 * "U.S.", "Dr.", "Mr.", "e.g.", "i.e.", "vs.", "Fig.", "Art.", "No." and decimals "3.5%".
 */
export const splitIntoSentences = (paragraphText) => {
  if (!paragraphText || typeof paragraphText !== 'string') return [];
  const cleaned = paragraphText.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  // Protect common abbreviations with a placeholder before splitting on sentence boundaries
  const PLACEHOLDER = '\u0000';
  const protectedText = cleaned.replace(
    /\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|e\.g|i\.e|U\.S\.A|U\.S|U\.K|U\.N|U\.A\.E|Rs|P\.M|C\.M|B\.C|A\.D|Fig|Art|Sec|Vol|No|Gen|Col|Lt|Govt|Dept|viz|cf|al)\./gi,
    `$1${PLACEHOLDER}`
  );

  const rawSentences = protectedText
    .split(/(?<=[.!?]["'”’)\]]*)\s+(?=[A-Z0-9"“‘(\[])/)
    .map((s) => s.replaceAll(PLACEHOLDER, '.').trim())
    .filter(Boolean);

  return rawSentences.length > 0 ? rawSentences : [cleaned];
};

const STARTS_WITH_LIST_MARKER_REGEX =
  /^(?:(?:i{1,3}|iv|vi{0,3}|ix|x{1,3}|[ivxlcdm]{1,5})\s*[.):\-]|[0-9]+(?:\.[0-9]+)*\s*[.):\-]|[a-z]\s*[.):\-]|\((?:[ivxlcdm]{1,5}|[a-z]|\d{1,2})\)\s+|[-•*▪→])/i;

const outlineMarkerRegexSafe = (blockText) => {
  const trimmed = String(blockText || '').trim();
  if (/^(?:outline\b|thesis\s*statement\b)/i.test(trimmed)) return true;
  return STARTS_WITH_LIST_MARKER_REGEX.test(maskNonOutlinePeriods(trimmed));
};

// Sentinel characters for masking non-outline dots (abbreviations and double initials)
const ABBREV_INTERNAL_DOT = '\u0000';
const ABBREV_TRAILING_DOT = '\u0001';

// Roman numerals I..XXXIX (avoids false positives on acronyms like LLM, ML, CD, DVD, LCD)
const ROMAN_OR_CAP_MARKER = '(?:X{1,3}(?:IX|IV|V?I{0,3})|IX|IV|V?I{1,3}|[A-Z])';
const LOWER_ROMAN_OR_LETTER = '(?:i{1,3}|iv|vi{0,3}|ix|x{1,3}|[a-z])';
const OUTLINE_NUMBER_MARKER = '(?:[1-9]|1\\d|2[0-5])(?:\\.\\d{1,2})*';

const NON_MARKER_PREFIX_WORD_REGEX =
  /\b(?:war|phase|part|stage|chapter|section|article|title|schedule|annex|appendix|volume|book|act|rule|clause|class|grade|tier|level|type|category|group|division|plan|option|model|factor|generation|vitamin|king|queen|pope|emperor|prince|princess|duke|tsar|czar|sultan|shah|caliph|george|edward|henry|charles|elizabeth|louis|john|paul|pius|leo|gregory|nicholas|alexander|peter|philip|richard|james|william|napoleon|frederick|constantine|justinian|by|of|with|from|to|for|in|on|at|as|and|or|nor|but|the|a|an|between|among|under|over|into|onto|per|against|via|versus)$/i;

const NON_NUMBER_PREFIX_WORD_REGEX =
  /\b(?:article|section|chapter|part|phase|stage|tier|level|clause|rule|grade|class|figure|table|annex|appendix|schedule|item|point|step|page|para|paragraph)$/i;

/**
 * Masks periods inside abbreviations (U.S., Dr., Mr., e.g., i.e., etc.) and consecutive
 * single-letter initials (M. A. Jinnah, A. Q. Khan) so outline detection and splitting never
 * break mid-abbreviation or mid-name.
 *
 * Prefix titles/labels/connectors use ABBREV_INTERNAL_DOT so a following initial or number
 * ("Dr. A. Khan", "Mr. B. Ali", "Fig. 1.", "e.g. a.") is never mistaken for an outline marker.
 * Entity/sentence-ending abbreviations use ABBREV_TRAILING_DOT on their final dot so an
 * outline item ending in "U.S.", "U.K.", or "etc." can still break before the next marker.
 */
const maskNonOutlinePeriods = (text) => {
  if (!text) return '';
  let masked = String(text);

  // Prefix titles, labels, and Latin introducers: keep final dot as ABBREV_INTERNAL_DOT
  masked = masked.replace(
    /\b(e\.g|i\.e|viz|vs|cf|Mrs|Mr|Ms|Dr|Prof|Rev|Hon|Sr|Jr|St|Gen|Col|Lt|Govt|Dept|Fig|Art|Sec|Vol|No|Ch|Rs)\./gi,
    (m) => m.replaceAll('.', ABBREV_INTERNAL_DOT)
  );

  // Entity, time, and clause-ending abbreviations: final dot becomes ABBREV_TRAILING_DOT
  masked = masked.replace(
    /\b(U\.S\.A|U\.S|U\.K|U\.N|U\.A\.E|P\.M|C\.M|B\.C|A\.D|A\.M|Ph\.D|a\.m|p\.m|etc|al)\./gi,
    (m) => {
      const lastDot = m.lastIndexOf('.');
      const head = m.slice(0, lastDot).replaceAll('.', ABBREV_INTERNAL_DOT);
      return `${head}${ABBREV_TRAILING_DOT}`;
    }
  );

  // Double or multiple initials such as "M. A. Jinnah" / "M.A. Jinnah" / "A. Q. Khan" / "I. H. Qureshi"
  masked = masked.replace(
    /(?<![A-Za-z0-9.])([A-Z]\.(?:\s*[A-Z]\.)+)(?=\s|$)/g,
    (m) => m.replaceAll('.', ABBREV_INTERNAL_DOT)
  );

  return masked;
};

const unmaskNonOutlinePeriods = (text) =>
  String(text || '')
    .replaceAll(ABBREV_INTERNAL_DOT, '.')
    .replaceAll(ABBREV_TRAILING_DOT, '.');

const isInsideUnclosedParen = (str, offset) => {
  const lastNewline = str.lastIndexOf('\n', offset);
  const lastClose = str.lastIndexOf(')', offset);
  const segment = str.slice(Math.max(lastNewline, lastClose) + 1, offset);
  return /\([^()]*$/.test(segment);
};

/**
 * Returns true when a space-separated period marker at `offset` is part of an abbreviation-prefixed
 * name/label ("Dr. A. Khan", "Fig. 1."), historical/legal title ("World War I.", "Phase II."),
 * or preposition-led name ("by A. Smith") rather than a standalone outline marker.
 */
const isGuardedInlinePeriodPrefix = (str, offset, isNumericMarker = false) => {
  if (offset <= 0) return false;
  const before = str.slice(0, offset);
  if (new RegExp(`${ABBREV_INTERNAL_DOT}[ \\t]*$`).test(before)) {
    return true;
  }
  const trimmedRight = before.replace(/[ \t]+$/, '');
  if (!trimmedRight || trimmedRight.endsWith('\n')) return false;
  if (new RegExp(`[:;.?!\\)\\]${ABBREV_TRAILING_DOT}]$`).test(trimmedRight)) {
    return false;
  }
  return isNumericMarker
    ? NON_NUMBER_PREFIX_WORD_REGEX.test(trimmedRight)
    : NON_MARKER_PREFIX_WORD_REGEX.test(trimmedRight);
};

/**
 * Counts inline outline markers across all CSS formats:
 * - Parenthesis markers: 2), 3), A), a), (1), (a), (i)
 * - Period markers: I., A., 1., 1.1., a. (guarding abbreviations, double initials, & mid-title Romans)
 */
export const countInlineOutlineMarkers = (text) => {
  if (!text || typeof text !== 'string') return 0;
  const masked = maskNonOutlinePeriods(text);
  let count = 0;

  // 1a. Suffix parenthesis markers: 2), 3), A)..Z), a)..z), i)..xiii), 1.1)
  const parenSuffixRegex = new RegExp(
    `(?:^|(?<=\\s))(?:${ROMAN_OR_CAP_MARKER}|\\d{1,2}(?:\\.\\d+)*|${LOWER_ROMAN_OR_LETTER})\\)\\s+(?=[A-Za-z0-9"'“(])`,
    'g'
  );
  for (const match of masked.matchAll(parenSuffixRegex)) {
    if (!isInsideUnclosedParen(masked, match.index)) {
      count++;
    }
  }

  // 1b. Wrapped parenthesis markers: (1), (A), (a), (i), (iv)
  const parenWrappedRegex = new RegExp(
    `(?:^|(?<=\\s))\\((?:${ROMAN_OR_CAP_MARKER}|${LOWER_ROMAN_OR_LETTER}|\\d{1,2})\\)\\s+(?=[A-Za-z0-9"'“(])`,
    'g'
  );
  const wrappedMatches = masked.match(parenWrappedRegex);
  if (wrappedMatches) count += wrappedMatches.length;

  // 2a. Roman numeral / Capital / Numbered period markers: I., A., 1., 1.1.
  const periodMainRegex = new RegExp(
    `(?:^|(?<=[\\s:;.)\\]${ABBREV_TRAILING_DOT}]))(?:${ROMAN_OR_CAP_MARKER}|${OUTLINE_NUMBER_MARKER})\\.\\s+(?=[A-Za-z0-9"'“(])`,
    'g'
  );
  for (const match of masked.matchAll(periodMainRegex)) {
    const isNumeric = /^\d/.test(match[0]);
    if (!isGuardedInlinePeriodPrefix(masked, match.index, isNumeric)) {
      count++;
    }
  }

  // 2b. Lowercase period markers after :, ;, . (or at start of text)
  const periodLowerRegex = new RegExp(
    `(?:^|[:;.${ABBREV_TRAILING_DOT}]\\s+)[a-z]\\.\\s+(?=[A-Za-z0-9"'“(])`,
    'g'
  );
  const periodLowerMatches = masked.match(periodLowerRegex);
  if (periodLowerMatches) count += periodLowerMatches.length;

  return count;
};

/**
 * Checks if a single line or block looks like an Outline header/sub-point rather than continuous essay prose.
 */
const isOutlineLineOrBlock = (blockText) => {
  const trimmed = String(blockText || '').trim();
  if (!trimmed) return false;

  if (/^outline\b/i.test(trimmed) || countInlineOutlineMarkers(trimmed) >= 2) {
    return true;
  }

  const lines = trimmed
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return false;

  const totalWords = countExactWords(trimmed);
  const sentences = splitIntoSentences(trimmed);

  // Multi-line block where average line length is short (< 20 words per line)
  if (lines.length >= 2 && totalWords / lines.length < 20) {
    return true;
  }

  // Single short line (< 35 words) with fewer than 3 sentences (unless clearly 2+ prose sentences >= 20w without marker)
  if (
    lines.length === 1 &&
    totalWords < 35 &&
    sentences.length <= 2 &&
    !(sentences.length >= 2 && totalWords >= 20 && !outlineMarkerRegexSafe(lines[0]))
  ) {
    return true;
  }

  // Starts with an outline marker and is not a long multi-sentence paragraph
  if (outlineMarkerRegexSafe(lines[0]) && (totalWords < 55 || sentences.length <= 2)) {
    return true;
  }

  return false;
};

/**
 * Checks if a block is a true continuous multi-sentence prose paragraph (e.g., [P1] Essay Introduction).
 */
const isContinuousProseParagraph = (blockText) => {
  const trimmed = String(blockText || '').trim();
  if (!trimmed) return false;

  if (/^outline\b/i.test(trimmed) || countInlineOutlineMarkers(trimmed) >= 2) {
    return false;
  }

  const lines = trimmed
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return false;

  const totalWords = countExactWords(trimmed);
  const sentences = splitIntoSentences(trimmed);

  // If it's a multi-line list of short bullet points, it is NOT a continuous prose paragraph
  if (lines.length >= 3 && totalWords / lines.length < 18) {
    return false;
  }

  // A genuine essay paragraph has either >= 45 words OR >= 3 connected sentences totaling >= 32 words
  if (totalWords >= 45 && sentences.length >= 2) {
    return true;
  }
  if (sentences.length >= 3 && totalWords >= 32) {
    return true;
  }
  // Also recognize concise 2-sentence paragraphs (e.g., short Intro/Transition) not formatted as outline markers
  if (
    lines.length === 1 &&
    !outlineMarkerRegexSafe(trimmed) &&
    totalWords >= 22 &&
    sentences.length >= 2 &&
    /[.!?]["'”’)]*$/.test(trimmed)
  ) {
    return true;
  }

  return false;
};

/**
 * Detects whether the outline uses numbered top-level headings (e.g. 1), 2), 3) or 1., 2.)
 * with capital-letter sub-items (A), B) or A., B.) nested beneath them.
 */
const isNumericTopOutlineContext = (text) => {
  const numIdx = text.search(/(?:^|\n|\s)\d{1,2}[.)]\s+[A-Za-z0-9"'“(]/);
  if (numIdx === -1) return false;
  const alphaIdx = text.search(/(?:^|\n|\s)[A-Z][.)]\s+[A-Za-z0-9"'“(]/);
  if (alphaIdx === -1) return true;
  return numIdx < alphaIdx;
};

/**
 * Expands jammed single-line outlines (e.g. "3) Arguments... A) ... B) ..." or
 * "Outline: A. Intro: a. ...; b. ... B. Causes:") into proper line-by-line outline entries
 * BEFORE essay prose begins, without ever modifying continuous body prose.
 */
export const normalizeOutlineLineBreaks = (rawText = '') => {
  const normalized = String(rawText || '').replace(/\r\n/g, '\n');
  if (!normalized.trim()) return normalized;

  const lines = normalized.split('\n');
  const outLines = [];
  let proseStarted = false;
  const numericTopContext = isNumericTopOutlineContext(normalized);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      outLines.push('');
      continue;
    }

    const inlineMarkerCount = countInlineOutlineMarkers(trimmed);

    if (
      !proseStarted &&
      countExactWords(trimmed) >= 45 &&
      splitIntoSentences(trimmed).length >= 2 &&
      !outlineMarkerRegexSafe(trimmed) &&
      inlineMarkerCount < 2
    ) {
      proseStarted = true;
    }

    if (proseStarted) {
      outLines.push(trimmed);
      continue;
    }

    if (/^outline\b\s*:/i.test(trimmed) || inlineMarkerCount >= 2) {
      let expanded = maskNonOutlinePeriods(trimmed);

      // 1. Break after "Outline:" at line start when content follows
      expanded = expanded.replace(/^(outline\s*:)[ \t]*(?=\S)/i, '$1\n');

      // 2. Break before "(marker)? Thesis Statement:" while keeping any marker attached to Thesis Statement
      const thesisClauseRegex = new RegExp(
        `(?<=\\S)[ \\t]+((?:(?:${ROMAN_OR_CAP_MARKER}|[A-Za-z]|\\d{1,2}(?:\\.\\d+)*)[.)][ \\t]+|\\((?:${ROMAN_OR_CAP_MARKER}|[A-Za-z]|\\d{1,2})\\)[ \\t]+)?Thesis[ \\t]+Statement[ \\t]*:)`,
        'gi'
      );
      expanded = expanded.replace(thesisClauseRegex, (full, clause, offset, str) => {
        const linePrefix = str.slice(str.lastIndexOf('\n', offset) + 1, offset);
        const startsWithMarker = /^(?:[IVXLCDM]{1,5}|[A-Za-z]|\d{1,2}(?:\.\d+)*)[.)]|\((?:[IVXLCDM]{1,5}|[A-Za-z]|\d{1,2})\)/.test(
          clause
        );
        const prefixIsOnlyMarker = /^(?:\s*(?:[IVXLCDM]{1,5}|[A-Za-z]|\d{1,2}(?:\.\d+)*)[.)]|\s*\((?:[IVXLCDM]{1,5}|[A-Za-z]|\d{1,2})\))$/i.test(
          linePrefix
        );
        if (!startsWithMarker && prefixIsOnlyMarker) {
          return full;
        }
        const indent = /^(?:[a-z][.)]|\([a-z]\))/i.test(clause) && !/^[A-Z][.)]/.test(clause)
          ? '    '
          : '  ';
        return `\n${indent}${clause}`;
      });

      // 3a. Parenthesis suffix markers: 2), 3), A)..Z), a)..z), i)..xiii), 1.1)
      const parenSuffixSplitRegex = new RegExp(
        `(?<=\\S)[ \\t]+((?:${ROMAN_OR_CAP_MARKER}|${OUTLINE_NUMBER_MARKER}|${LOWER_ROMAN_OR_LETTER})\\)\\s+(?=[A-Za-z0-9"'“(]))`,
        'g'
      );
      expanded = expanded.replace(parenSuffixSplitRegex, (full, marker, offset, str) => {
        if (isInsideUnclosedParen(str, offset)) {
          return full;
        }
        if (/^(?:[a-z]|i{1,3}|iv|vi{0,3}|ix|x{1,3})\)/.test(marker)) {
          return `\n    ${marker}`;
        }
        if (/^[A-Z]\)/.test(marker) && numericTopContext) {
          return `\n  ${marker}`;
        }
        if (/^\d/.test(marker) && !numericTopContext) {
          return `\n  ${marker}`;
        }
        return `\n${marker}`;
      });

      // 3b. Wrapped parenthesis markers: (1), (A), (a), (i)
      const parenWrappedSplitRegex = new RegExp(
        `(?<=\\S)[ \\t]+(\\((?:${ROMAN_OR_CAP_MARKER}|${LOWER_ROMAN_OR_LETTER}|${OUTLINE_NUMBER_MARKER})\\)\\s+(?=[A-Za-z0-9"'“(]))`,
        'g'
      );
      expanded = expanded.replace(parenWrappedSplitRegex, '\n    $1');

      // 4. Roman numeral / Capital period markers: I., II., A., B.
      const capRomanPeriodSplitRegex = new RegExp(
        `(?<=\\S)([:;.?!\\)\\]${ABBREV_TRAILING_DOT}]?[ \\t]+|[:;.?!\\)\\]${ABBREV_TRAILING_DOT}][ \\t]*)(${ROMAN_OR_CAP_MARKER}\\.\\s+(?=[A-Za-z0-9"'“(]))`,
        'g'
      );
      expanded = expanded.replace(
        capRomanPeriodSplitRegex,
        (full, punct, marker, offset, str) => {
          if (isGuardedInlinePeriodPrefix(str, offset + punct.length, false)) {
            return full;
          }
          return `${punct.trimEnd()}\n${marker}`;
        }
      );

      // 5. Numbered period markers (1..25 or decimals like 1.1., never 4-digit years like 2024.)
      const numPeriodSplitRegex = new RegExp(
        `(?<=\\S)([:;.?!\\)\\]${ABBREV_TRAILING_DOT}]?[ \\t]+|[:;.?!\\)\\]${ABBREV_TRAILING_DOT}][ \\t]*)(${OUTLINE_NUMBER_MARKER}\\.\\s+(?=[A-Za-z0-9"'“(]))`,
        'g'
      );
      expanded = expanded.replace(numPeriodSplitRegex, (full, punct, marker, offset, str) => {
        if (isGuardedInlinePeriodPrefix(str, offset + punct.length, true)) {
          return full;
        }
        const isSubDecimal = /^\d+\.\d+/.test(marker);
        const indent = isSubDecimal || !numericTopContext ? '  ' : '';
        return `${punct.trimEnd()}\n${indent}${marker}`;
      });

      // 6. Lowercase period markers after :, ;, . (abbreviations like e.g./i.e./viz./vs./etc. stay masked)
      const lowerPeriodSplitRegex = new RegExp(
        `(?<=\\S)([:;.${ABBREV_TRAILING_DOT}]|\\([A-Z]+\\))[ \\t]+([a-z]\\.\\s+(?=[A-Za-z0-9"'“(]))`,
        'g'
      );
      expanded = expanded.replace(
        lowerPeriodSplitRegex,
        (_, punct, marker) => `${punct}\n    ${marker}`
      );

      expanded = unmaskNonOutlinePeriods(expanded)
        .split('\n')
        .map((l) => l.trimEnd())
        .join('\n');
      outLines.push(expanded);
    } else {
      outLines.push(trimmed);
    }
  }

  return outLines.join('\n').trim();
};

/**
 * Splits digital scripts pasted with single newlines (\n) when standard \n\n splitting
 * collapses multiple long prose paragraphs into <= 2 giant blocks.
 */
const segmentRawBlocksWithNewlineFallback = (normalized) => {
  const initialBlocks = normalized
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  if (initialBlocks.length > 2) {
    return initialBlocks;
  }

  const lines = normalized.split('\n').map((l) => l.trim()).filter(Boolean);
  const longProseLines = lines.filter(
    (l) =>
      countExactWords(l) >= 25 &&
      splitIntoSentences(l).length >= 2 &&
      !outlineMarkerRegexSafe(l) &&
      countInlineOutlineMarkers(l) < 2
  );

  // Only invoke single-newline splitting if we genuinely see >= 3 single-line prose paragraphs jammed together
  if (lines.length < 4 || longProseLines.length < 3) {
    return initialBlocks;
  }

  const blocks = [];
  let outlineBuffer = [];
  let proseStarted = false;

  for (const line of lines) {
    const isProseLine =
      countExactWords(line) >= 22 &&
      splitIntoSentences(line).length >= 2 &&
      !outlineMarkerRegexSafe(line) &&
      countInlineOutlineMarkers(line) < 2;

    if (!proseStarted && !isProseLine) {
      outlineBuffer.push(line);
    } else {
      if (outlineBuffer.length > 0) {
        blocks.push(outlineBuffer.join('\n'));
        outlineBuffer = [];
      }
      proseStarted = true;
      blocks.push(line);
    }
  }

  if (outlineBuffer.length > 0) {
    blocks.push(outlineBuffer.join('\n'));
  }

  return blocks.length > 0 ? blocks : initialBlocks;
};

/**
 * Bulletproof Outline-to-Body Boundary Detector.
 * Strategy:
 *  1. Break script into paragraphs/blocks.
 *  2. Scan for the Outline's Conclusion header/entry (since CSS Outlines end with "Conclusion").
 *     The first continuous multi-sentence prose block AFTER the Outline's Conclusion entry is [P1] (Intro).
 *  3. Safe Fallback: If the student omitted "Conclusion" in their outline or formatted headers unusually,
 *     find the first continuous prose paragraph (>= 45 words / >= 3 sentences) that is NOT followed by
 *     more outline-marker lists.
 */
export const preprocessEssaySubmission = (rawText = '', examQuestion = '') => {
  const normalized = normalizeOutlineLineBreaks(rawText);

  if (!normalized) {
    return {
      isOutlineOnly: true,
      outlineNodes: [],
      paragraphs: [],
      inlineBodyHeadingViolations: [],
      inlineHeadingDetails: [],
      spotlightZoneIds: [],
      totalWordCount: 0,
      outlineWordCount: 0,
      bodyWordCount: 0,
      macroSliceForAgent1: '',
      fullTaggedTranscript: ''
    };
  }

  const rawBlocks = segmentRawBlocksWithNewlineFallback(normalized);

  // Step 1: Locate candidate boundary using Outline Conclusion anchor + first continuous prose paragraph
  let proseStartIndex = -1;
  let outlineConclusionBlockIdx = -1;

  for (let i = 0; i < rawBlocks.length; i++) {
    const blk = rawBlocks[i];
    // Stop scanning once essay prose has started after an Outline Conclusion anchor
    if (
      outlineConclusionBlockIdx !== -1 &&
      (isContinuousProseParagraph(blk) || !isOutlineLineOrBlock(blk))
    ) {
      break;
    }

    // Check if this outline block contains an Outline "Conclusion" line (short header, not a 150-word paragraph)
    const lines = blk.split('\n').map((l) => l.trim()).filter(Boolean);
    const hasShortConclusionHeader = lines.some(
      (line) =>
        /^(?:(?:\([a-z0-9]{1,5}\)|[a-z0-9]{1,5}[.):\-])\s+)?conclusion\b/i.test(line) &&
        countExactWords(line) <= 20
    );

    if (hasShortConclusionHeader && !isContinuousProseParagraph(blk)) {
      outlineConclusionBlockIdx = i;
    }
  }

  // Primary Anchor: If we found the Outline's Conclusion entry, [P1] is the first continuous prose paragraph after it
  if (outlineConclusionBlockIdx !== -1) {
    for (let j = outlineConclusionBlockIdx + 1; j < rawBlocks.length; j++) {
      if (isContinuousProseParagraph(rawBlocks[j])) {
        proseStartIndex = j;
        break;
      }
    }
  }

  // Safe Heuristic Fallback: If Outline had no explicit "Conclusion" line (or no prose found after it),
  // scan for the transition from outline lines to continuous multi-sentence prose paragraphs.
  if (proseStartIndex === -1) {
    for (let i = 0; i < rawBlocks.length; i++) {
      if (isContinuousProseParagraph(rawBlocks[i])) {
        // Verify that this isn't an isolated long Thesis Statement inside the middle of the Outline:
        // Check if there are multiple outline-marker blocks immediately after it.
        const nextTwo = rawBlocks.slice(i + 1, i + 3);
        const followedByOutlineList =
          nextTwo.length > 0 &&
          nextTwo.every(
            (nb) =>
              isOutlineLineOrBlock(nb) &&
              STARTS_WITH_LIST_MARKER_REGEX.test(nb.trim())
          );

        if (!followedByOutlineList) {
          proseStartIndex = i;
          break;
        }
      }
    }
  }

  const outlineRawBlocks =
    proseStartIndex === -1 ? rawBlocks : rawBlocks.slice(0, proseStartIndex);
  const bodyRawBlocks =
    proseStartIndex === -1 ? [] : rawBlocks.slice(proseStartIndex);

  // Step 2: Tag Outline Nodes [O1..On]
  const outlineNodes = [];
  let oCounter = 1;
  for (const blk of outlineRawBlocks) {
    const lines = blk
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    for (const line of lines) {
      const id = `O${oCounter++}`;
      outlineNodes.push({
        id,
        text: line,
        wordCount: countExactWords(line),
        taggedText: `[${id}] ${line}`
      });
    }
  }

  // Step 3: Process Body Blocks -> Detect Inline Body Headings & Tag [P1.S1..PN.SM]
  const inlineBodyHeadingViolations = [];
  const inlineHeadingDetails = [];
  const cleanProseBlocks = [];

  for (const blk of bodyRawBlocks) {
    const lines = blk
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const words = countExactWords(blk);
    const targetParagraphId = `P${cleanProseBlocks.length + 1}`;

    // Standalone short heading inside the essay body (CSS Taboo)
    if (lines.length === 1 && words <= 14 && !/[.!?]["'”’)]*$/.test(lines[0])) {
      inlineBodyHeadingViolations.push(lines[0]);
      inlineHeadingDetails.push({ heading: lines[0], beforeParagraphId: targetParagraphId });
      continue;
    }

    // Prose block that starts with an inline sub-heading on the first line followed by paragraph text
    if (
      lines.length >= 2 &&
      countExactWords(lines[0]) <= 12 &&
      !/[.!?]["'”’)]*$/.test(lines[0])
    ) {
      inlineBodyHeadingViolations.push(lines[0]);
      inlineHeadingDetails.push({ heading: lines[0], beforeParagraphId: targetParagraphId });
      const remainder = lines.slice(1).join(' ').trim();
      if (remainder) {
        cleanProseBlocks.push(remainder);
      }
    } else {
      cleanProseBlocks.push(lines.join(' ').trim());
    }
  }

  // Step 4: Tag each Paragraph [P1..PN] and Sentence [Pk.S1..Pk.Sm]
  const paragraphs = cleanProseBlocks.map((paraText, idx) => {
    const pId = `P${idx + 1}`;
    const sentences = splitIntoSentences(paraText);
    const taggedSentences = sentences.map((sText, sIdx) => ({
      id: `${pId}.S${sIdx + 1}`,
      text: sText,
      taggedText: `[${pId}.S${sIdx + 1}] ${sText}`
    }));

    const wordCount = countExactWords(paraText);
    return {
      id: pId,
      index: idx + 1,
      wordCount,
      sentenceCount: sentences.length,
      firstSentence: taggedSentences[0]?.taggedText || '',
      lastSentence:
        taggedSentences.length > 1
          ? taggedSentences[taggedSentences.length - 1]?.taggedText
          : '',
      rawFirstSentence: sentences[0] || '',
      rawLastSentence: sentences[sentences.length - 1] || '',
      fullText: paraText,
      taggedText: taggedSentences.map((s) => s.taggedText).join(' '),
      sentences: taggedSentences
    };
  });

  const outlineWordCount = outlineNodes.reduce((sum, n) => sum + n.wordCount, 0);
  const bodyWordCount = paragraphs.reduce((sum, p) => sum + p.wordCount, 0);
  const totalWordCount = outlineWordCount + bodyWordCount;
  const isOutlineOnly = paragraphs.length === 0;

  // Step 5: Build Macro-Slice for Agent 1 (~1,200 tokens instead of full 3,000-word essay)
  const outlineTaggedString =
    outlineNodes.length > 0
      ? outlineNodes.map((o) => o.taggedText).join('\n')
      : '(No formal Outline section detected at the start of the script)';

  const macroParagraphSummaries = paragraphs.map((p, idx) => {
    // Include full text for P1 (Intro), P2 (potential second intro/context), and PN (Conclusion)
    if (idx === 0 || idx === 1 || idx === paragraphs.length - 1) {
      return `--- ${p.id} (${p.wordCount} words, ${p.sentenceCount} sentences — FULL TEXT) ---\n${p.taggedText}`;
    }
    // Extract compact middle-sentence/evidence cue so Agent 1 can verify 3rd-level Outline promises
    const middleSentences = p.sentences.slice(1, -1);
    const midCue =
      middleSentences.length > 0
        ? middleSentences
            .map((s) => s.text)
            .join(' ')
            .split(/\s+/)
            .slice(0, 24)
            .join(' ')
        : '';
    return [
      `--- ${p.id} (${p.wordCount} words, ${p.sentenceCount} sentences — SLICED BOUNDARIES) ---`,
      `First Sentence: ${p.firstSentence}`,
      midCue ? `Mid-Para Cue: ${midCue}...` : '',
      `Last Sentence: ${p.lastSentence || '(Single-sentence paragraph)'}`
    ]
      .filter(Boolean)
      .join('\n');
  });

  // Compute the 4 Spotlight Zones coordinates (Examiner Eye-Tracking Zones)
  const spotlightSet = new Set();
  if (outlineNodes.length > 0) {
    outlineNodes.slice(0, 2).forEach((o) => spotlightSet.add(o.id));
    outlineNodes.slice(-2).forEach((o) => spotlightSet.add(o.id));
  }
  paragraphs.forEach((p, idx) => {
    const isIntroOrConclusion = idx === 0 || idx === paragraphs.length - 1;
    if (isIntroOrConclusion) {
      p.sentences.slice(0, 3).forEach((s) => spotlightSet.add(s.id));
      p.sentences.slice(-3).forEach((s) => spotlightSet.add(s.id));
    } else {
      if (p.sentences[0]) spotlightSet.add(p.sentences[0].id);
      if (p.sentences.length > 1) {
        spotlightSet.add(p.sentences[p.sentences.length - 1].id);
      }
    }
  });
  const spotlightZoneIds = Array.from(spotlightSet);

  const macroSliceForAgent1 = [
    `ESSAY TITLE / TOPIC: "${examQuestion || 'Not explicitly provided'}"`,
    `TOTAL SCRIPT WORDS: ${totalWordCount} (Outline: ${outlineWordCount} words | Essay Body: ${bodyWordCount} words across ${paragraphs.length} paragraphs)`,
    inlineBodyHeadingViolations.length > 0
      ? `DETECTED INLINE HEADINGS IN ESSAY BODY (TABOO): ${JSON.stringify(inlineHeadingDetails)}`
      : `INLINE HEADINGS IN ESSAY BODY: None (Clean)`,
    `\n=== TAGGED OUTLINE [O1..O${outlineNodes.length}] ===\n${outlineTaggedString}`,
    `\n=== MACRO PARAGRAPH MAP [P1..P${paragraphs.length}] ===\n${
      macroParagraphSummaries.join('\n\n') || '(No body prose paragraphs detected — Outline-Only submission)'
    }`
  ].join('\n');

  const fullTaggedTranscript = [
    outlineNodes.length > 0
      ? `=== OUTLINE ===\n${outlineNodes.map((o) => o.taggedText).join('\n')}`
      : '',
    paragraphs.length > 0
      ? `=== ESSAY PROSE BODY ===\n${paragraphs.map((p) => `[${p.id} | ${p.wordCount}w] ${p.taggedText}`).join('\n\n')}`
      : ''
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    isOutlineOnly,
    outlineNodes,
    paragraphs,
    inlineBodyHeadingViolations,
    inlineHeadingDetails,
    spotlightZoneIds,
    totalWordCount,
    outlineWordCount,
    bodyWordCount,
    macroSliceForAgent1,
    fullTaggedTranscript
  };
};

/**
 * Stage 1A-Post: Role-Filtered Pacing Decay Calculator (0 Tokens)
 *
 * Runs AFTER Agent 1 returns paragraphRoleMap.
 * Averages ONLY paragraphs tagged as 'BODY_MAIN' or 'COUNTER_ARGUMENT',
 * excluding 'INTRO', 'CONTEXT_OVERVIEW', 'TRANSITION_BRIDGE', and 'CONCLUSION'.
 *
 * Flags PACING_DECAY_DETECTED if 2nd-half substantive body paragraphs drop by >= 35% in average word count.
 */
export const computeRoleFilteredPacingDecay = (paragraphs = [], paragraphRoleMap = {}) => {
  const substantiveParas = paragraphs.filter((p) => {
    const role = (paragraphRoleMap?.[p.id] || 'BODY_MAIN').toUpperCase();
    return role === 'BODY_MAIN' || role === 'COUNTER_ARGUMENT';
  });

  if (substantiveParas.length < 4) {
    return {
      evaluatedParagraphCount: substantiveParas.length,
      firstHalfIds: substantiveParas.map((p) => p.id),
      secondHalfIds: [],
      firstHalfAvgWords:
        substantiveParas.length > 0
          ? Math.round(
              substantiveParas.reduce((s, p) => s + p.wordCount, 0) /
                substantiveParas.length
            )
          : 0,
      secondHalfAvgWords: 0,
      decayPercent: 0,
      pacingDecayFlag: false,
      summary:
        'Fewer than 4 substantive BODY_MAIN/COUNTER_ARGUMENT paragraphs; pacing decay check not applicable.'
    };
  }

  const mid = Math.floor(substantiveParas.length / 2);
  const firstHalf = substantiveParas.slice(0, mid);
  const secondHalf = substantiveParas.slice(mid);

  const firstHalfAvgWords = Math.round(
    firstHalf.reduce((sum, p) => sum + p.wordCount, 0) / firstHalf.length
  );
  const secondHalfAvgWords = Math.round(
    secondHalf.reduce((sum, p) => sum + p.wordCount, 0) / secondHalf.length
  );

  const decayPercent =
    firstHalfAvgWords > 0
      ? Math.round(((secondHalfAvgWords - firstHalfAvgWords) / firstHalfAvgWords) * 100)
      : 0;

  const pacingDecayFlag = decayPercent <= -35;

  return {
    evaluatedParagraphCount: substantiveParas.length,
    firstHalfIds: firstHalf.map((p) => p.id),
    secondHalfIds: secondHalf.map((p) => p.id),
    firstHalfAvgWords,
    secondHalfAvgWords,
    decayPercent,
    pacingDecayFlag,
    summary: pacingDecayFlag
      ? `Your later body paragraphs (${secondHalf.map((p) => p.id.replace(/^P(\d+)$/i, 'Paragraph $1')).join(', ')}) average ${secondHalfAvgWords} words, dropping ${Math.abs(decayPercent)}% compared to your earlier paragraphs (${firstHalf.map((p) => p.id.replace(/^P(\d+)$/i, 'Paragraph $1')).join(', ')}, avg ${firstHalfAvgWords} words). Try to keep later paragraphs strong and well-explained.`
      : `Balanced paragraph lengths: earlier paragraphs average ${firstHalfAvgWords} words and later paragraphs average ${secondHalfAvgWords} words (${decayPercent >= 0 ? '+' : ''}${decayPercent}%).`
  };
};

/**
 * Hybrid AI-Verified Boundary Reconciliation:
 * Allows Agent 1 to override the deterministic Outline-to-Body split point when a student's
 * unusual formatting caused outline points and prose blocks to misalign, while keeping word counts
 * and [O1..On] / [P1.S1..PN.SM] coordinate indexing 100% deterministic.
 */
export const reconcileAiStructuralBoundary = (
  preprocessed,
  agent1Output = {},
  rawText = '',
  examQuestion = ''
) => {
  if (!preprocessed) return preprocessed;

  const correctionQuote = String(
    agent1Output?.aiBoundaryCorrection?.firstBodyParagraphStartQuote || ''
  )
    .replace(/^\[[A-Z0-9.]+\]\s*/i, '')
    .trim();

  if (!correctionQuote || correctionQuote.length < 12 || !rawText) {
    return preprocessed;
  }

  const normalized = normalizeOutlineLineBreaks(rawText);
  const blocks = segmentRawBlocksWithNewlineFallback(normalized);
  const needle = correctionQuote.toLowerCase().slice(0, 48);
  const splitIdx = blocks.findIndex((blk) => blk.toLowerCase().includes(needle));

  if (splitIdx === -1) {
    return preprocessed;
  }

  const currentFirstBody = preprocessed.paragraphs?.[0]?.rawFirstSentence || '';
  if (currentFirstBody && currentFirstBody.toLowerCase().includes(needle)) {
    return preprocessed;
  }

  const outlineRawBlocks = blocks.slice(0, splitIdx);
  const bodyRawBlocks = blocks.slice(splitIdx);

  const outlineNodes = [];
  let oCounter = 1;
  for (const blk of outlineRawBlocks) {
    for (const line of blk.split('\n').map((l) => l.trim()).filter(Boolean)) {
      const id = `O${oCounter++}`;
      outlineNodes.push({
        id,
        text: line,
        wordCount: countExactWords(line),
        taggedText: `[${id}] ${line}`
      });
    }
  }

  const inlineBodyHeadingViolations = [];
  const inlineHeadingDetails = [];
  const cleanProseBlocks = [];

  for (const blk of bodyRawBlocks) {
    const lines = blk.split('\n').map((l) => l.trim()).filter(Boolean);
    const words = countExactWords(blk);
    const targetParagraphId = `P${cleanProseBlocks.length + 1}`;
    if (lines.length === 1 && words <= 14 && !/[.!?]["'”’)]*$/.test(lines[0])) {
      inlineBodyHeadingViolations.push(lines[0]);
      inlineHeadingDetails.push({ heading: lines[0], beforeParagraphId: targetParagraphId });
      continue;
    }
    if (lines.length >= 2 && countExactWords(lines[0]) <= 12 && !/[.!?]["'”’)]*$/.test(lines[0])) {
      inlineBodyHeadingViolations.push(lines[0]);
      inlineHeadingDetails.push({ heading: lines[0], beforeParagraphId: targetParagraphId });
      const remainder = lines.slice(1).join(' ').trim();
      if (remainder) cleanProseBlocks.push(remainder);
    } else {
      cleanProseBlocks.push(lines.join(' ').trim());
    }
  }

  const paragraphs = cleanProseBlocks.map((paraText, idx) => {
    const pId = `P${idx + 1}`;
    const sentences = splitIntoSentences(paraText);
    const taggedSentences = sentences.map((sText, sIdx) => ({
      id: `${pId}.S${sIdx + 1}`,
      text: sText,
      taggedText: `[${pId}.S${sIdx + 1}] ${sText}`
    }));
    const wordCount = countExactWords(paraText);
    return {
      id: pId,
      index: idx + 1,
      wordCount,
      sentenceCount: sentences.length,
      firstSentence: taggedSentences[0]?.taggedText || '',
      lastSentence:
        taggedSentences.length > 1
          ? taggedSentences[taggedSentences.length - 1]?.taggedText
          : '',
      rawFirstSentence: sentences[0] || '',
      rawLastSentence: sentences[sentences.length - 1] || '',
      fullText: paraText,
      taggedText: taggedSentences.map((s) => s.taggedText).join(' '),
      sentences: taggedSentences
    };
  });

  const outlineWordCount = outlineNodes.reduce((sum, n) => sum + n.wordCount, 0);
  const bodyWordCount = paragraphs.reduce((sum, p) => sum + p.wordCount, 0);
  const totalWordCount = outlineWordCount + bodyWordCount;
  const spotlightSet = new Set();
  if (outlineNodes.length > 0) {
    outlineNodes.slice(0, 2).forEach((o) => spotlightSet.add(o.id));
    outlineNodes.slice(-2).forEach((o) => spotlightSet.add(o.id));
  }
  paragraphs.forEach((p, idx) => {
    const isIntroOrConclusion = idx === 0 || idx === paragraphs.length - 1;
    if (isIntroOrConclusion) {
      p.sentences.slice(0, 3).forEach((s) => spotlightSet.add(s.id));
      p.sentences.slice(-3).forEach((s) => spotlightSet.add(s.id));
    } else {
      if (p.sentences[0]) spotlightSet.add(p.sentences[0].id);
      if (p.sentences.length > 1) spotlightSet.add(p.sentences[p.sentences.length - 1].id);
    }
  });

  const fullTaggedTranscript = [
    outlineNodes.length > 0 ? `=== OUTLINE ===\n${outlineNodes.map((o) => o.taggedText).join('\n')}` : '',
    paragraphs.length > 0
      ? `=== ESSAY PROSE BODY ===\n${paragraphs.map((p) => `[${p.id} | ${p.wordCount}w] ${p.taggedText}`).join('\n\n')}`
      : ''
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    ...preprocessed,
    isOutlineOnly: paragraphs.length === 0,
    outlineNodes,
    paragraphs,
    inlineBodyHeadingViolations,
    inlineHeadingDetails,
    spotlightZoneIds: Array.from(spotlightSet),
    totalWordCount,
    outlineWordCount,
    bodyWordCount,
    fullTaggedTranscript
  };
};

