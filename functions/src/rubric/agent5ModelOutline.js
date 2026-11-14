/**
 * Stage 2B: Agent 5 — Model Outline Blueprint Architect (Powered by Gemini 4 Argon)
 *
 * Crafts a strictly CSS-rubric-aligned Model Improved Outline using `gemini-4-argon`
 * (with Flash failover if unavailable), enforcing:
 *   1. Exact Essay Title & Genre alignment + 80:20 Global vs. Pakistan scope
 *   2. Zero sub-points under Introduction AND zero sub-points under Conclusion
 *   3. Optional standalone Thesis Statement (never mandatory inside the outline)
 *   4. 12–18 single-idea, uniform Noun Phrase sub-points (Title Case main headers, Sentence case sub-points)
 *   5. Plain, exact natural English ("right word for the right place" without heavy jargon)
 */

import { callGenAiAgentWithFailover } from './safeJsonParser.js';
import {
  ESSAY_GENRE_PLAYBOOKS,
  PROMPT_DECODING_TRAP_RULES,
  PLAIN_ENGLISH_AND_TONE_DIRECTIVE
} from './essayRubricConfig.js';

export const ARGON_MODEL_OUTLINE_CANDIDATES = [
  'gemini-4-argon',
  'gemini-3.8-flash',
  'gemini-3.6-flash'
];

const ROMAN_MARKERS = ['I.', 'II.', 'III.', 'IV.', 'V.', 'VI.', 'VII.', 'VIII.'];

const ROMAN_SECTION_NUMERALS = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
  'XI',
  'XII',
  'XIII',
  'XIV',
  'XV',
  'XVI',
  'XVII',
  'XVIII',
  'XIX',
  'XX'
];

const stripTreeArtifacts = (text = '') =>
  String(text || '')
    .replace(/\*\*([^*]*?)\*\*/g, '$1')
    .replace(/[├└│─┌┐┘┤┬┴┼▪→]+/g, ' ')
    .replace(/^[-•*▪→]+\s*/, '')
    .replace(/^\*+|\*+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const extractInlineIntroThesisBackend = (heading = '') => {
  const parenMatch = String(heading || '').match(
    /^introduction\b[\s:–—-]*\((?:optional\s+)?thesis(?:\s+statement)?\s*:\s*(.+)\)\s*$/i
  );
  if (parenMatch) {
    return parenMatch[1].trim();
  }
  const colonMatch = String(heading || '').match(
    /^introduction\b\s*[:–—-]\s*(?:optional\s+)?thesis(?:\s+statement)?\s*:\s*(.+)$/i
  );
  return colonMatch ? colonMatch[1].trim() : '';
};

const parseFallbackSectionsFromDiagramText = (rawText = '') => {
  const lines = String(rawText || '')
    .split(/\r?\n/)
    .map((l) => stripTreeArtifacts(l))
    .filter(Boolean);

  if (!lines.length) {
    return { thesisStatement: '', sections: [] };
  }

  const romanMap = Object.fromEntries(ROMAN_SECTION_NUMERALS.map((r, i) => [r, i + 1]));
  const hasMultiRoman = lines.some((l) => /^(?:II|III|IV|VI{1,3}|IX|XI{0,3})[.):]\s+/.test(l));
  const hasNumericIntro = lines.some((l) => /^\d{1,2}[.):]\s+(?:introduction|conclusion)\b/i.test(l));
  const isNumericTop = hasNumericIntro || (!hasMultiRoman && lines.filter((l) => /^\d{1,2}[.):]\s+/.test(l)).length >= 2);

  let extractedThesis = '';
  const sections = [];
  let current = null;
  let lastRoman = 0;

  for (const line of lines) {
    const thesisMatch = line.match(
      /^\[?(?:optional\s+)?thesis(?:\s+statement)?\]?\s*:?\s*(.+)$/i
    );
    if (thesisMatch) {
      if (!extractedThesis) extractedThesis = thesisMatch[1].trim();
      continue;
    }

    const romMatch = !isNumericTop ? line.match(/^([IVX]+)[.):]\s+(.+)$/) : null;
    const romVal = romMatch ? romanMap[romMatch[1]] || 0 : 0;
    const isRomanSec =
      Boolean(romVal) &&
      (romMatch[1] === 'I'
        ? sections.length === 0
        : romMatch[1] === 'V' || romMatch[1] === 'X'
          ? romVal > lastRoman && romVal <= lastRoman + 2
          : romVal > lastRoman || sections.length === 0);

    const numSecMatch = isNumericTop ? line.match(/^(\d{1,2})[.):]\s+(.+)$/) : null;
    const introConcMatch =
      !isRomanSec && !numSecMatch ? line.match(/^(Introduction|Conclusion)\b(?:\s*[:–—(].*)?$/i) : null;

    if (isRomanSec || numSecMatch || introConcMatch) {
      if (isRomanSec) lastRoman = romVal;
      const headingText = isRomanSec
        ? romMatch[2].trim()
        : numSecMatch
          ? numSecMatch[2].trim()
          : line.trim();
      const lower = headingText.toLowerCase();
      const kind = lower.startsWith('introduction')
        ? 'intro'
        : lower.startsWith('conclusion')
          ? 'conclusion'
          : 'body';
      if (kind === 'intro' && !extractedThesis) {
        extractedThesis = extractInlineIntroThesisBackend(headingText);
      }
      current = {
        marker: `${ROMAN_SECTION_NUMERALS[sections.length] || sections.length + 1}.`,
        heading: kind === 'intro' ? 'Introduction' : kind === 'conclusion' ? 'Conclusion' : headingText,
        kind,
        items: []
      };
      sections.push(current);
      continue;
    }

    if (!current || current.kind === 'intro' || current.kind === 'conclusion') {
      continue;
    }

    current.items.push({
      marker: `${String.fromCharCode(65 + (current.items.length % 26))}.`,
      text: line.replace(/^\([A-Za-z0-9]+\)\s+|^(?:[A-Za-z]|\d{1,2})[.):]\s+/, '').trim()
    });
  }

  return { thesisStatement: extractedThesis, sections };
};

const formatReadableModelName = (modelName = '') => {
  const m = String(modelName || '').toLowerCase();
  if (m.includes('4-argon')) return 'Gemini 4 Argon';
  if (m.includes('3.8-flash')) return 'Gemini 3.8 Flash';
  if (m.includes('3.6-flash')) return 'Gemini 3.6 Flash';
  return modelName || 'Gemini 4 Argon';
};

/**
 * Deterministically validates and normalizes the Model Outline structure so:
 *  - Introduction & Conclusion NEVER contain nested sub-points (items === [])
 *  - ASCII tree glyphs are stripped cleanly
 *  - Clean copy-ready `diagramText` is always generated from `sections[]`
 */
export const normalizeModelOutlinePayload = (
  raw = {},
  examQuestion = '',
  modelName = 'gemini-4-argon'
) => {
  const safeQuestion = String(examQuestion || 'Essay Outline').trim();
  const title = stripTreeArtifacts(raw?.title) || `Model Improved Outline: ${safeQuestion}`;
  const description =
    stripTreeArtifacts(raw?.description) ||
    'A structured outline following uniform phrasing, single-idea bullets, and clean Introduction and Conclusion headings.';
  let thesisStatement = stripTreeArtifacts(
    raw?.thesisStatement || raw?.optionalThesis || ''
  ).replace(/^(?:optional\s+)?thesis(?:\s+statement)?\s*:\s*/i, '').trim();

  let rawSections = Array.isArray(raw?.sections) ? raw.sections : [];
  if (rawSections.length === 0 && (raw?.diagramText || raw?.outline)) {
    const parsedFallback = parseFallbackSectionsFromDiagramText(raw?.diagramText || raw?.outline);
    rawSections = parsedFallback.sections;
    if (!thesisStatement && parsedFallback.thesisStatement) {
      thesisStatement = parsedFallback.thesisStatement;
    }
  }
  const normalizedSections = [];

  rawSections.forEach((sec) => {
    if (!sec) return;
    const rawHeading = stripTreeArtifacts(sec.heading || sec.title || '');
    if (!rawHeading) return;

    // Strip duplicate leading Roman/numeric prefix inside heading if marker is also provided
    const cleanHeading =
      rawHeading.replace(/^(?:[IVXLC]+|\d{1,2})[.):]\s*/i, '').trim() || rawHeading;
    const lowerHeading = cleanHeading.toLowerCase();

    const isIntro =
      sec.kind === 'intro' || /^introduction\b/.test(lowerHeading);
    const isConclusion =
      sec.kind === 'conclusion' || /^conclusion\b/.test(lowerHeading);

    if (isIntro && !thesisStatement) {
      thesisStatement = extractInlineIntroThesisBackend(cleanHeading);
    }

    let items = [];
    if (!isIntro && !isConclusion && Array.isArray(sec.items)) {
      items = sec.items
        .map((it, itemIdx) => {
          const itemObj = typeof it === 'string' ? { text: it } : it || {};
          const rawText = stripTreeArtifacts(itemObj.text || itemObj.label || '');
          if (!rawText) return null;
          // Remove redundant "A. " / "a) " / "(a) " prefix if also supplied separately as marker
          const fallbackLetter = `${String.fromCharCode(65 + (itemIdx % 26))}.`;
          const explicitMarker = stripTreeArtifacts(itemObj.marker || '')
            .replace(/^\(([A-Za-z0-9]+)\)$/, '$1.')
            .replace(/\)$/, '.')
            .toUpperCase();
          const cleanText = rawText
            .replace(/^\([A-Za-z0-9]+\)\s+|^(?:[A-Za-z]|\d{1,2})[.)]\s+/, '')
            .trim();
          if (!cleanText) return null;

          const subItems = Array.isArray(itemObj.subItems)
            ? itemObj.subItems
                .map((sub, subIdx) => {
                  const subObj = typeof sub === 'string' ? { text: sub } : sub || {};
                  const subRaw = stripTreeArtifacts(subObj.text || subObj.label || '');
                  if (!subRaw) return null;
                  const subClean = subRaw
                    .replace(/^\([A-Za-z0-9]+\)\s+|^(?:[A-Za-z]|\d{1,2})[.)]\s+/, '')
                    .trim();
                  if (!subClean) return null;
                  const rawSubMarker = stripTreeArtifacts(subObj.marker || '');
                  const subMarker = rawSubMarker
                    ? rawSubMarker.startsWith('(')
                      ? rawSubMarker.toLowerCase()
                      : `(${rawSubMarker.replace(/[.)]/g, '').toLowerCase()})`
                    : `(${String.fromCharCode(97 + (subIdx % 26))})`;
                  return { marker: subMarker, text: subClean };
                })
                .filter(Boolean)
            : [];

          return {
            marker: explicitMarker
              ? /\.$/.test(explicitMarker)
                ? explicitMarker
                : `${explicitMarker}.`
              : fallbackLetter,
            text: cleanText,
            ...(subItems.length > 0 ? { subItems } : {})
          };
        })
        .filter(Boolean);
    }

    const seqMarker = `${ROMAN_SECTION_NUMERALS[normalizedSections.length] || normalizedSections.length + 1}.`;
    normalizedSections.push({
      marker: seqMarker,
      heading: isIntro ? 'Introduction' : isConclusion ? 'Conclusion' : cleanHeading,
      kind: isIntro ? 'intro' : isConclusion ? 'conclusion' : 'body',
      items
    });
  });

  // Build plain, exam-ready hierarchy text for Copy Outline & legacy consumers
  const textLines = [];
  if (normalizedSections.length > 0) {
    normalizedSections.forEach((sec) => {
      textLines.push(`${sec.marker} ${sec.heading}`);
      if (sec.kind === 'intro' && thesisStatement) {
        textLines.push('');
        textLines.push(`Optional Thesis Statement: ${thesisStatement}`);
      }
      if (sec.items.length > 0) {
        sec.items.forEach((it) => {
          textLines.push(`   ${it.marker} ${it.text}`);
          if (Array.isArray(it.subItems) && it.subItems.length > 0) {
            it.subItems.forEach((sub) => {
              textLines.push(`      ${sub.marker} ${sub.text}`);
            });
          }
        });
      }
      textLines.push('');
    });
  }

  const diagramText =
    textLines.join('\n').trim() || stripTreeArtifacts(raw?.diagramText || '');

  const totalBodyPoints = normalizedSections
    .filter((s) => s.kind === 'body')
    .reduce((acc, s) => acc + s.items.length, 0);

  return {
    title,
    description,
    thesisStatement,
    modelId: modelName,
    modelLabel: formatReadableModelName(modelName),
    sections: normalizedSections,
    totalBodyPoints,
    diagramText
  };
};

const buildAgent5Prompt = ({
  examQuestion,
  essayGenre,
  requiresCounterArgument,
  directiveAnalysis,
  thesisAudit,
  outlineAlignment
}) => {
  const playbook =
    ESSAY_GENRE_PLAYBOOKS[essayGenre] || ESSAY_GENRE_PLAYBOOKS.DESCRIPTIVE_ISSUE;

  return `
You are Agent 5: CSS Essay Model Outline Architect.
Your single mission is to build a clean, balanced, strictly rubric-compliant **Model Improved Outline** for a Pakistani CSS candidate to learn from.

CRITICAL JSON RULE:
Never use unescaped double quotes (") inside JSON string values; use single quotes ('...') inside strings when needed.

=== TOPIC & ARCHITECTURAL CONTEXT ===
- Essay Topic: "${examQuestion}"
- Essay Genre: ${essayGenre} (${playbook.label})
- Genre Balance & Structure Playbook: ${playbook.outlineRatioRule}
- Needs Counter-Argument Section: ${requiresCounterArgument ? 'Yes — include one concise counter-argument & rebuttal section or balanced opposing points' : 'No — do not force an artificial counter-argument section'}
- Topic Dimensions to Cover: ${directiveAnalysis?.requiredDimensions || 'All dimensions asked by the Essay Topic'}
- Existing Candidate Thesis Note: ${thesisAudit?.extractedThesis && !/not clearly stated|not included/i.test(thesisAudit.extractedThesis) ? thesisAudit.extractedThesis : '(Optional/not provided in outline)'}
- Weaknesses Seen in Student Outline (Fix these cleanly in your Model Outline): ${outlineAlignment?.summary || 'Ensure clear structure, even phrasing, and full topic coverage.'}

=== TOPIC & GEOGRAPHIC RULES ===
${PROMPT_DECODING_TRAP_RULES.map((r, i) => `${i + 1}. ${r}`).join('\n')}

=== STRICT CSS OUTLINE RUBRIC RULES (ZERO EXCEPTIONS) ===
1. NO SUB-POINTS UNDER INTRODUCTION: Section 1 MUST be "I. Introduction" with "kind": "intro" and "items": [] (ZERO hook/context/thesis sub-bullets underneath Introduction!).
2. NO SUB-POINTS UNDER CONCLUSION: The final section (e.g. "V. Conclusion") MUST have "kind": "conclusion" and "items": [] (ZERO sub-bullets underneath Conclusion!).
3. OPTIONAL STANDALONE THESIS STATEMENT: Put 1 strong, arguable, everyday-English Thesis Statement in the separate top-level "thesisStatement" JSON field (20–45 words answering every part of the Topic). Keep it outside numbered sub-points so students see it is optional in the outline and belongs in Paragraph 1 of a full essay.
4. 12 TO 18 SUBSTANTIVE BODY SUB-POINTS TOTAL: Create 3 or 4 logical body sections ("II.", "III.", "IV.", ...) totaling between 12 and 18 sub-points ("A.", "B.", "C.", ...). Every argumentative body section MUST have at least 2 sub-points.
5. UNIFORM PARALLEL NOUN PHRASES & SINGLE-IDEA UNITY:
   - Main body section headings ("II.", "III.", ...) MUST use Title Case and include the exact Topic keyword(s). Never write vague 1-word labels ("Causes", "Effects", "Solutions").
   - Every sub-point ("A.", "B.", ...) MUST be a crisp, uniform Noun Phrase in Sentence case (6 to 12 words long), conveying ONE distinct idea—never join two separate ideas with "and", never use fake "?" question headers, never dump raw paragraphs.
   - Follow logical domain flow (or Causes -> Consequences -> Remedies ONLY where the genre playbook permits; for ABSTRACT_PHILOSOPHICAL topics, use thematic/historical/levels-of-analysis sections, NOT bureaucratic policy checklists!).
6. PLAIN ENGLISH & EXACT WORD CHOICE ("RIGHT WORD FOR THE RIGHT PLACE"):
   - ${PLAIN_ENGLISH_AND_TONE_DIRECTIVE}
   - Write crystal-clear, natural English that reads authentically for CSS toppers without flashy thesaurus jargon ("demarcating", "rentierism", "quagmire", "algorithmic statecraft", "hemorrhage", "myriad", "plethora" are strictly forbidden). Pick the exact, precise noun or verb that fits the context cleanly.

Return ONLY this JSON object:
{
  "title": "string (Model Improved Outline: ${examQuestion})",
  "description": "string (1 short simple sentence telling the student how this outline fixes balance and structure)",
  "thesisStatement": "string (1 clear 20-45 word optional thesis statement in plain everyday English answering all parts of the Topic)",
  "sections": [
    {
      "marker": "I.",
      "heading": "Introduction",
      "kind": "intro",
      "items": []
    },
    {
      "marker": "II.",
      "heading": "Title Case Main Heading Anchored in Topic",
      "kind": "body",
      "items": [
        { "marker": "A.", "text": "Sentence case parallel noun phrase conveying one clear point" },
        { "marker": "B.", "text": "Sentence case parallel noun phrase conveying one clear point" }
      ]
    },
    {
      "marker": "V.",
      "heading": "Conclusion",
      "kind": "conclusion",
      "items": []
    }
  ]
}
`;
};

export const runAgent5ModelOutline = async ({
  examQuestion,
  agent1Output = {},
  apiKey,
  ledger = null
}) => {
  const prompt = buildAgent5Prompt({
    examQuestion,
    essayGenre: agent1Output.essayGenre || 'DESCRIPTIVE_ISSUE',
    requiresCounterArgument: Boolean(agent1Output.requiresCounterArgument),
    directiveAnalysis: agent1Output.directiveAnalysis || {},
    thesisAudit: agent1Output.thesisAudit || {},
    outlineAlignment: agent1Output.outlineAlignment || {}
  });

  const { result, modelName } = await callGenAiAgentWithFailover({
    apiKey,
    prompt,
    enableGoogleSearch: false,
    temperature: 0.25,
    maxOutputTokens: 8192,
    modelCandidates: ARGON_MODEL_OUTLINE_CANDIDATES,
    thinkingLevel: 'low',
    stageName: 'Agent 5: Model Outline Blueprint',
    ledger
  });

  return normalizeModelOutlinePayload(result, examQuestion, modelName);
};

