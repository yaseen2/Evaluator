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
    /\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|e\.g|i\.e|Fig|Art|Sec|Vol|No|Gen|Col|Lt|Govt|Dept|viz|cf|al)\./gi,
    `$1${PLACEHOLDER}`
  );

  const rawSentences = protectedText
    .split(/(?<=[.!?]["'”’)\]]*)\s+(?=[A-Z0-9"“‘(\[])/)
    .map((s) => s.replaceAll(PLACEHOLDER, '.').trim())
    .filter(Boolean);

  return rawSentences.length > 0 ? rawSentences : [cleaned];
};

/**
 * Checks if a single line or block looks like an Outline header/sub-point rather than continuous essay prose.
 */
const isOutlineLineOrBlock = (blockText) => {
  const lines = blockText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return false;

  const totalWords = countExactWords(blockText);
  const sentences = splitIntoSentences(blockText);

  // Explicit outline marker at start of line
  const outlineMarkerRegex =
    /^(?:outline\b|thesis\s*statement\b|[ivxlcdm]+\s*[.):\-]|[0-9]+(?:\.[0-9]+)*\s*[.):\-]|[a-z]\s*[.):\-]|[-•*▪→])/i;

  // Multi-line block where average line length is short (< 20 words per line)
  if (lines.length >= 2 && totalWords / lines.length < 20) {
    return true;
  }

  // Single short line (< 35 words) with fewer than 3 sentences
  if (lines.length === 1 && totalWords < 35 && sentences.length <= 2) {
    return true;
  }

  // Starts with an outline marker and is not a long multi-sentence paragraph
  if (outlineMarkerRegex.test(lines[0]) && (totalWords < 55 || sentences.length <= 2)) {
    return true;
  }

  return false;
};

/**
 * Checks if a block is a true continuous multi-sentence prose paragraph (e.g., [P1] Essay Introduction).
 */
const isContinuousProseParagraph = (blockText) => {
  const lines = blockText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return false;

  const totalWords = countExactWords(blockText);
  const sentences = splitIntoSentences(blockText);

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

  return false;
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
  const normalized = String(rawText || '')
    .replace(/\r\n/g, '\n')
    .trim();

  if (!normalized) {
    return {
      isOutlineOnly: true,
      outlineNodes: [],
      paragraphs: [],
      inlineBodyHeadingViolations: [],
      totalWordCount: 0,
      outlineWordCount: 0,
      bodyWordCount: 0,
      macroSliceForAgent1: '',
      fullTaggedTranscript: ''
    };
  }

  const rawBlocks = normalized
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  // Step 1: Locate candidate boundary using Outline Conclusion anchor + first continuous prose paragraph
  let proseStartIndex = -1;
  let outlineConclusionBlockIdx = -1;

  for (let i = 0; i < rawBlocks.length; i++) {
    const blk = rawBlocks[i];
    // Check if this outline block contains an Outline "Conclusion" line (short header, not a 150-word paragraph)
    const lines = blk.split('\n').map((l) => l.trim()).filter(Boolean);
    const hasShortConclusionHeader = lines.some(
      (line) =>
        /^(?:[0-9ivxlcdm]+[.):\-]?\s*)?conclusion\b/i.test(line) &&
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
              /^(?:[ivxlcdm]+\s*[.):\-]|[0-9]+(?:\.[0-9]+)*\s*[.):\-]|[a-z]\s*[.):\-]|[-•*])/i.test(
                nb.trim()
              )
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
  const cleanProseBlocks = [];

  for (const blk of bodyRawBlocks) {
    const lines = blk
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const words = countExactWords(blk);

    // Standalone short heading inside the essay body (CSS Taboo)
    if (lines.length === 1 && words <= 14 && !/[.!?]["'”’)]*$/.test(lines[0])) {
      inlineBodyHeadingViolations.push(lines[0]);
      continue;
    }

    // Prose block that starts with an inline sub-heading on the first line followed by paragraph text
    if (
      lines.length >= 2 &&
      countExactWords(lines[0]) <= 12 &&
      !/[.!?]["'”’)]*$/.test(lines[0])
    ) {
      inlineBodyHeadingViolations.push(lines[0]);
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
    return `--- ${p.id} (${p.wordCount} words, ${p.sentenceCount} sentences — SLICED BOUNDARIES) ---\nFirst Sentence: ${p.firstSentence}\nLast Sentence: ${p.lastSentence || '(Single-sentence paragraph)'}`;
  });

  const macroSliceForAgent1 = [
    `ESSAY TOPIC / PROMPT: "${examQuestion || 'Not explicitly provided'}"`,
    `TOTAL SCRIPT WORDS: ${totalWordCount} (Outline: ${outlineWordCount} words | Essay Body: ${bodyWordCount} words across ${paragraphs.length} paragraphs)`,
    inlineBodyHeadingViolations.length > 0
      ? `DETECTED INLINE HEADINGS IN ESSAY BODY (TABOO): ${JSON.stringify(inlineBodyHeadingViolations)}`
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
      ? `PACING_DECAY_DETECTED: 2nd-half substantive body paragraphs (${secondHalf.map((p) => p.id).join(', ')}: avg ${secondHalfAvgWords} words) dropped by ${Math.abs(decayPercent)}% compared to 1st-half body paragraphs (${firstHalf.map((p) => p.id).join(', ')}: avg ${firstHalfAvgWords} words).`
      : `Balanced Pacing: 1st-half substantive body paragraphs avg ${firstHalfAvgWords} words vs. 2nd-half avg ${secondHalfAvgWords} words (${decayPercent >= 0 ? '+' : ''}${decayPercent}%).`
  };
};

