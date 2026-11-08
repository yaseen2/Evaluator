/**
 * FPSC Multi-Agent Evaluation Engine (Subject-Adaptive, Pedagogical & Token-Optimized)
 *
 * Supports 3 Specialized Execution Modes:
 *   1. FPSC Essay Outline & Thesis Only Mode (Fast 1–2 Call DAG, Score-Free Qualitative Diagnostics)
 *   2. FPSC Full English Essay Mode (Token-Optimized Anatomical 4-Call DAG, Score-Free Qualitative Diagnostics,
 *      Outline-to-Body Alignment Audit, Thesis Critique, & 4-Part Pedagogical Micro-Lesson Callouts)
 *   3. FPSC 20-Mark Subjective & Precis Mode (Quantitative Marks + 4-Part Pedagogical Callouts)
 */

import { resolveSubjectProfile } from './fpscRubrics';

// ─────────────────────────────────────────────────────────────
// CONFIGURATION & LOCAL STORAGE HELPERS
// ─────────────────────────────────────────────────────────────

const API_KEY_STORAGE = 'css_eval_gemini_api_key';
const MODEL_STORAGE = 'css_eval_gemini_model';

export const AVAILABLE_MODELS = [
  { id: 'auto', name: 'Auto (Recommended — Smart Failover)' },
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Ultra-Fast Latest)' },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (High-Speed Reasoning)' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash (Balanced FPSC Standard)' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite (Low Latency)' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Legacy Fallback)' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Deep Analytical)' }
];

const MODEL_CANDIDATES = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash'
];

export const getStoredApiKey = () => localStorage.getItem(API_KEY_STORAGE) || '';
export const setStoredApiKey = (key) => localStorage.setItem(API_KEY_STORAGE, (key || '').trim());

export const getStoredModel = () => localStorage.getItem(MODEL_STORAGE) || 'auto';
export const setStoredModel = (model) => localStorage.setItem(MODEL_STORAGE, model || 'auto');

// Monthly usage counter persisted in localStorage
const monthlyGroundingUsage = {
  count: parseInt(localStorage.getItem('css_eval_api_usage_count') || '0', 10),
  limit: 5000,
  lastReset: new Date().toISOString()
};

export const getGroundingUsage = () => monthlyGroundingUsage;

const incrementUsage = (calls = 1) => {
  monthlyGroundingUsage.count += calls;
  try {
    localStorage.setItem('css_eval_api_usage_count', String(monthlyGroundingUsage.count));
  } catch (_) {
    // ignore storage quota errors
  }
};

/**
 * 100% Programmatic JavaScript Word Counter — eliminates AI hallucinations.
 */
export const countWords = (text) => {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
};

/**
 * Programmatic Essay Anatomy Segmenter:
 * Separates an FPSC English Essay into:
 *   - outlineText (Formal Outline headers & Thesis Statement at top)
 *   - introParagraph (First true continuous prose paragraph after the Outline)
 *   - bodyParagraphs (Subsequent prose paragraphs)
 *   - bodyTopicSentences (First sentence of each body paragraph for low-token Outline-to-Body alignment check)
 *   - conclusionParagraph (Final substantive prose paragraph)
 *   - bodyHeadingViolations (Any inline headings mistakenly inserted inside the essay prose body)
 */
export const segmentEssayAnatomy = (fullText) => {
  if (!fullText || typeof fullText !== 'string') {
    return {
      outlineText: '',
      introParagraph: '',
      bodyParagraphs: [],
      bodyTopicSentences: [],
      conclusionParagraph: '',
      bodyHeadingViolations: []
    };
  }

  const rawBlocks = fullText
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const isOutlineLikeBlock = (block) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const words = countWords(block);
    const startsWithOutlineMarker = /^(?:outline|thesis\s*statement|[ivxlcdm]+\.|[0-9]+\.|[a-z]\)|[a-z]\.|[-•*])/i.test(lines[0] || '');
    // Multi-line short list or explicit outline marker or short heading before prose begins
    if (lines.length >= 2 && words / lines.length < 18) return true;
    if (startsWithOutlineMarker && words < 55) return true;
    if (words < 32 && !/[.!?].*[.!?]/.test(block)) return true;
    return false;
  };

  const outlineBlocks = [];
  const proseBlocks = [];
  const bodyHeadingViolations = [];
  let proseStarted = false;

  for (const block of rawBlocks) {
    const words = countWords(block);
    if (!proseStarted) {
      if (isOutlineLikeBlock(block)) {
        outlineBlocks.push(block);
      } else if (words >= 35) {
        proseStarted = true;
        proseBlocks.push(block);
      } else {
        outlineBlocks.push(block);
      }
    } else {
      // Once continuous essay prose has started, short standalone header lines are FPSC Essay violations!
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length === 1 && words <= 14 && !/[.!?]$/.test(lines[0])) {
        bodyHeadingViolations.push(lines[0]);
      } else {
        // Check if a prose block starts with a short single-line heading followed by a newline
        if (lines.length >= 2 && countWords(lines[0]) <= 12 && !/[.!?]$/.test(lines[0])) {
          bodyHeadingViolations.push(lines[0]);
          proseBlocks.push(lines.slice(1).join(' '));
        } else {
          proseBlocks.push(block);
        }
      }
    }
  }

  const introParagraph = proseBlocks[0] || '';
  const conclusionParagraph = proseBlocks.length > 2 ? proseBlocks[proseBlocks.length - 1] : '';
  const bodyParagraphs =
    proseBlocks.length > 2
      ? proseBlocks.slice(1, -1)
      : proseBlocks.length > 1
      ? proseBlocks.slice(1)
      : [];

  const bodyTopicSentences = bodyParagraphs.map((para, idx) => {
    const cleaned = para.replace(/\s+/g, ' ').trim();
    const firstSentenceMatch = cleaned.match(/^[^.!?]+[.!?]/);
    const topicSentence = firstSentenceMatch ? firstSentenceMatch[0].trim() : cleaned.slice(0, 140);
    return `P${idx + 1}: ${topicSentence}`;
  });

  return {
    outlineText: outlineBlocks.join('\n\n'),
    introParagraph,
    bodyParagraphs,
    bodyTopicSentences,
    conclusionParagraph,
    bodyHeadingViolations
  };
};

/**
 * Accurately extracts the introduction paragraph word count, skipping formal outlines or short title lines.
 */
export const countIntroWords = (fullText, isEssay = false) => {
  if (!fullText || typeof fullText !== 'string') return 0;

  if (isEssay) {
    const anatomy = segmentEssayAnatomy(fullText);
    if (anatomy.introParagraph) {
      return countWords(anatomy.introParagraph);
    }
  }

  const blocks = fullText
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  for (const block of blocks) {
    const cleaned = block.replace(/^(?:[0-9A-Za-z]+[.-]\s*)?introduction\s*[:\-–—]?\s*/i, '').trim();
    const words = countWords(cleaned);
    if (words >= 25) {
      return words;
    }
  }

  return countWords(blocks[1] || blocks[0] || '');
};

/**
 * Human-readable display name from model ID.
 */
const getModelDisplayName = (modelName = '') => {
  if (modelName.includes('3.8-flash')) return 'Gemini 3.8 Flash';
  if (modelName.includes('3.6-flash')) return 'Gemini 3.6 Flash';
  if (modelName.includes('3.5-flash-lite')) return 'Gemini 3.5 Flash-Lite';
  if (modelName.includes('3.5-pro')) return 'Gemini 3.5 Pro';
  if (modelName.includes('3.5-flash')) return 'Gemini 3.5 Flash';
  if (modelName.includes('2.5-pro')) return 'Gemini 2.5 Pro';
  if (modelName.includes('2.5-flash')) return 'Gemini 2.5 Flash';
  return modelName || 'Gemini 3.5 Flash';
};

/**
 * Extracts accurate MIME type and raw base64 payload from a Data URL.
 */
const parseDataUrl = (imgData) => {
  if (!imgData || typeof imgData !== 'string') {
    return { mimeType: 'image/jpeg', base64Data: '' };
  }
  const match = imgData.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], base64Data: match[2] };
  }
  return {
    mimeType: 'image/jpeg',
    base64Data: imgData.replace(/^data:image\/[^;]+;base64,/, '')
  };
};

/**
 * Resilient JSON parser that strips markdown code fences and repairs minor trailing commas.
 */
const safeParseJSON = (rawText) => {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty response from AI agent');
  }

  let cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (_) {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const sub = cleaned
        .slice(firstBrace, lastBrace + 1)
        .replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(sub);
    }
    throw new Error('Failed to parse structured JSON from AI agent response');
  }
};

// ─────────────────────────────────────────────────────────────
// TOKEN-SYNCED MICRO-CREDIT METERING ENGINE (Option A: 1 Credit = 2,500 Weighted Tokens)
// ─────────────────────────────────────────────────────────────

export const WEIGHTED_TOKENS_PER_CREDIT = 2500;
export const OUTPUT_TOKEN_MULTIPLIER = 3.5;

/**
 * Creates a thread-safe per-evaluation token accumulator that tracks exact Gemini usageMetadata
 * across Vision OCR and all parallel diagnostic agents, while ignoring failed failover attempts.
 */
export const createTokenLedger = () => {
  const stages = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalThinkingTokens = 0;
  let totalRawTokens = 0;

  return {
    recordStage(stageName, modelName, usage = {}) {
      const inputTokens = Math.max(0, Number(usage.inputTokens || 0));
      const outputTokens = Math.max(0, Number(usage.outputTokens || 0));
      const thinkingTokens = Math.max(0, Number(usage.thinkingTokens || 0));
      const rawTokens = Math.max(0, Number(usage.totalTokens || inputTokens + outputTokens + thinkingTokens));
      const stageWeighted = Math.round(inputTokens + OUTPUT_TOKEN_MULTIPLIER * (outputTokens + thinkingTokens));

      totalInputTokens += inputTokens;
      totalOutputTokens += outputTokens;
      totalThinkingTokens += thinkingTokens;
      totalRawTokens += rawTokens;

      stages.push({
        stage: stageName,
        model: getModelDisplayName(modelName),
        inputTokens,
        outputTokens,
        thinkingTokens,
        totalTokens: rawTokens,
        weightedTokens: stageWeighted
      });
    },

    finalize() {
      const weightedTokens = Math.round(
        totalInputTokens + OUTPUT_TOKEN_MULTIPLIER * (totalOutputTokens + totalThinkingTokens)
      );
      const creditsConsumed = Math.max(2, Math.min(60, Math.ceil(weightedTokens / WEIGHTED_TOKENS_PER_CREDIT)));

      return {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        thinkingTokens: totalThinkingTokens,
        totalTokens: totalRawTokens,
        weightedTokens,
        creditsConsumed,
        weightedTokensPerCredit: WEIGHTED_TOKENS_PER_CREDIT,
        outputMultiplier: OUTPUT_TOKEN_MULTIPLIER,
        stages
      };
    }
  };
};

/**
 * Pre-flight token & credit estimator used in UploadModal and App.jsx before running the pipeline.
 */
export const estimateCreditsPreFlight = ({
  isEssay = false,
  essayMode = 'full',
  activeTab = 'image',
  imageCount = 0,
  wordCount = 0
}) => {
  const pages = activeTab === 'image' ? Math.max(1, Number(imageCount || 0)) : 0;
  const words = activeTab === 'text' ? Math.max(0, Number(wordCount || 0)) : 0;

  let estimatedWeightedTokens = 0;
  let minRequiredCredits = 3;

  if (isEssay && essayMode === 'outline_only') {
    // 1-2 call Outline & Thesis pipeline
    estimatedWeightedTokens = 9500 + pages * 3200 + Math.max(0, words - 200) * 10;
    minRequiredCredits = pages > 0 ? 4 + pages : 4;
  } else if (isEssay) {
    // 3-4 call Anatomical Essay DAG
    estimatedWeightedTokens = 44000 + pages * 4200 + Math.max(0, words - 1200) * 14;
    minRequiredCredits = pages > 0 ? 18 + pages : 18;
  } else {
    // 20-Mark Subjective / Precis 6-agent pipeline
    estimatedWeightedTokens = 21000 + pages * 3500 + Math.max(0, words - 450) * 12;
    minRequiredCredits = pages > 0 ? 9 + pages : 9;
  }

  const estimatedCredits = Math.max(
    minRequiredCredits,
    Math.min(60, Math.ceil(estimatedWeightedTokens / WEIGHTED_TOKENS_PER_CREDIT))
  );

  return {
    estimatedCredits,
    minRequiredCredits,
    estimatedWeightedTokens
  };
};

// ─────────────────────────────────────────────────────────────
// CORE LLM CALLER WITH AUTOMATIC MODEL FAILOVER & USAGE TELEMETRY
// ─────────────────────────────────────────────────────────────

const callSingleAgent = async ({ prompt, apiKey, modelName, imageArray, text, maxTokens = 4096, temperature = 0.2 }) => {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const parts = [{ text: prompt }];

  if (imageArray && imageArray.length > 0) {
    imageArray.forEach((imgData) => {
      const { mimeType, base64Data } = parseDataUrl(imgData);
      if (base64Data) {
        parts.push({
          inline_data: {
            mime_type: mimeType,
            data: base64Data
          }
        });
      }
    });
  } else if (text) {
    parts.push({ text: `\n\nCANDIDATE SUBMISSION TEXT:\n${text}` });
  }

  const payload = {
    contents: [{ parts }],
    generationConfig: {
      temperature,
      response_mime_type: 'application/json',
      maxOutputTokens: maxTokens
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let errText = '';
    try {
      const errJson = await response.json();
      errText = errJson.error?.message || response.statusText;
    } catch (_) {
      errText = response.statusText;
    }
    throw new Error(`HTTP ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error('Agent returned empty response');
  }

  const parsed = safeParseJSON(rawText);

  const meta = data.usageMetadata || {};
  const fallbackInput =
    Math.ceil(((prompt?.length || 0) + (text?.length || 0)) / 4) +
    (imageArray && imageArray.length > 0 ? imageArray.length * 258 : 0);
  const fallbackOutput = Math.ceil((rawText?.length || 0) / 4);

  const inputTokens = Number(meta.promptTokenCount) || fallbackInput;
  const outputTokens = Number(meta.candidatesTokenCount) || fallbackOutput;
  const thinkingTokens = Number(meta.thoughtsTokenCount) || 0;
  const totalTokens = Number(meta.totalTokenCount) || inputTokens + outputTokens + thinkingTokens;

  return {
    parsed,
    usage: {
      inputTokens,
      outputTokens,
      thinkingTokens,
      totalTokens
    }
  };
};

const callAgentWithFailover = async ({
  prompt,
  apiKey,
  candidateList,
  imageArray,
  text,
  maxTokens,
  temperature,
  stageName = 'Diagnostic Agent',
  ledger = null
}) => {
  let lastError = null;
  for (const modelName of candidateList) {
    try {
      const { parsed, usage } = await callSingleAgent({
        prompt,
        apiKey,
        modelName,
        imageArray,
        text,
        maxTokens,
        temperature
      });
      if (ledger) {
        ledger.recordStage(stageName, modelName, usage);
      }
      return { result: parsed, modelName, usage };
    } catch (err) {
      console.warn(`[FPSC Engine] Agent failed on ${modelName}:`, err.message);
      lastError = err;
    }
  }
  throw new Error(`Evaluation failed across available models: ${lastError?.message || 'Unknown API error'}`);
};

// ─────────────────────────────────────────────────────────────
// SHARED DIGITIZER PROMPT (SINGLE-VISION PASS)
// ─────────────────────────────────────────────────────────────

const buildAgent2TranscriberPrompt = (subject, userExamQuestion) => `
You are Agent 1: DIGITIZER, OCR TRANSCRIPTION & QUESTION EXTRACTOR for FPSC CSS (${subject || 'Competitive Examination'}).

YOUR TASK:
1. Transcribe the FULL candidate submission verbatim from the provided pages/text.
   - Preserve all paragraphs, outline hierarchies (Roman numerals I, II, III, A, B, 1, 2), headings, and line breaks using double newlines (\\n\\n) between sections/paragraphs.
   - Do NOT fix grammar or rewrite anything during transcription — transcribe 100% faithfully so the student's real mistakes can be taught.
2. Identify the main topic/title of the script ("topic").
3. Detect if an explicit exam question or essay prompt is written at the top of the script ("extractedQuestion").
   ${userExamQuestion ? `Note: The candidate provided this prompt: "${userExamQuestion}".` : ''}

Return ONLY this JSON:
{
  "topic": "string (main title or essay topic)",
  "extractedQuestion": "string or null (explicit exam prompt written on the script, if any)",
  "fullTranscribedText": "string (the ENTIRE verbatim transcribed text with \\n\\n section breaks)"
}
`;

// ═════════════════════════════════════════════════════════════
// MODE 1: FPSC ESSAY OUTLINE & THESIS ONLY MENTOR PROMPT
// ═════════════════════════════════════════════════════════════

const buildOutlineOnlyMentorPrompt = (examQuestion, outlineText) => `
You are a Senior FPSC CSS English Essay Mentor (trained on official FPSC Examiner Reports, NOA, KIPS, and World Times evaluation standards).
The candidate has submitted an **ESSAY OUTLINE & THESIS STATEMENT** for diagnostic review.

Essay Topic / Prompt: "${examQuestion}"

CANDIDATE'S SUBMITTED OUTLINE & THESIS:
---
${outlineText}
---

EVALUATION PHILOSOPHY (BALANCED & PEDAGOGICAL — BEYOND ACADEMY RED CIRCLES):
- Be balanced, constructive, and encouraging—neither harshly dismissive nor overly lenient.
- Do NOT assign numeric scores. Use qualitative readiness ratings: "Strong", "Balanced", "Needs Polish", or "Critical Gap".
- In traditional academies, teachers merely circle outline headers in red ink without explaining WHY. Your job is to teach the student the exact rule behind every flaw and show them how to fix it.

YOUR TASK:
1. Overall Readiness & Mentor Summary:
   - "overallReadiness": Choose one: "Well-Structured FPSC Blueprint" | "Balanced Blueprint — Needs Reframing" | "Foundational Outline — Needs Structural Revision"
   - "examinerSummary": 3–4 encouraging, specific sentences summarizing what works well in this outline and the #1 priority to fix.
2. Prompt Decoding ("directiveAnalysis"):
   - Decode the core keyword/qualifier of the essay topic, required dimensions, and whether the outline is "Aligned", "Partially Aligned", or "Off-Topic".
3. Thesis Statement Audit ("thesisAudit"):
   - "candidateThesis": Extract the candidate's thesis statement verbatim (or "Not explicitly stated in outline" if missing).
   - "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap"
   - "critique": Explain clearly whether the thesis takes a debatable stance and signposts the essay's trajectory, or if it is tautological/vague.
   - "modelTopperThesis": Write a 1–2 sentence FPSC Topper-level Thesis Statement for this exact topic so the student can compare.
4. Header-by-Header Parallelism & Phrasing Upgrades ("headerUpgrades"):
   - Pick 3 to 5 weak, vague, non-parallel, or overly wordy headers from the candidate's outline.
   - For each, provide:
     - "originalHeader": Exact header written by the candidate.
     - "issue": Specific diagnosis (e.g., "Single-Word Noun Dump", "Non-Parallel Grammar", "Full Sentence Instead of Phrase", "Tangent / Off-Prompt").
     - "upgradedHeader": Rewritten FPSC Topper header using crisp, parallel phrasing.
     - "rule": A 1-sentence takeaway rule (e.g., "All sub-headers under a major section should share the same grammatical form, such as gerund phrases or analytical noun phrases.").
5. 5-Pillar Qualitative Outline Rubric:
   - Evaluate each pillar with "status" ("Strong" | "Balanced" | "Needs Polish" | "Critical Gap") and actionable "feedback":
     - "scoreBreakdown_topic_decoding"
     - "scoreBreakdown_thesis"
     - "scoreBreakdown_outline_structure"
     - "scoreBreakdown_parallelism"
     - "scoreBreakdown_coverage_originality"
6. Missing Dimensions ("thingsToInclude"):
   - 4 to 5 specific analytical angles, counter-arguments, or empirical case studies the student should add to make this outline comprehensive.
7. Model Topper Outline Blueprint ("suggestedVisual"):
   - Design a complete, parallel "Model FPSC Essay Outline Blueprint" for "${examQuestion}" using clean Unicode tree characters (├──, └──, │).
8. Inline Pedagogical Callouts ("annotations"):
   - Generate 6 to 12 inline callouts ("red" for structural/grammar errors, "amber" for phrasing/parallelism improvements, "green" for strong headers).
   - CRITICAL VERBATIM RULE: Every "targetPhrase" MUST be an EXACT 2 to 10 word substring copied VERBATIM from the candidate's outline text above.
   - Every callout MUST include "category", "comment" (why the examiner flagged it), "suggestion" (exact rewritten header/phrase), and "microLesson" (1-line rule to remember).

Return ONLY this JSON:
{
  "overallReadiness": "Well-Structured FPSC Blueprint" | "Balanced Blueprint — Needs Reframing" | "Foundational Outline — Needs Structural Revision",
  "examinerSummary": "string",
  "directiveAnalysis": {
    "directiveWord": "string (e.g. Expository / Argumentative / Reflective Essay)",
    "targetTimeframe": "string or null",
    "requiredDimensions": "string",
    "alignmentStatus": "Aligned" | "Partially Aligned" | "Off-Topic",
    "feedback": "string"
  },
  "thesisAudit": {
    "candidateThesis": "string",
    "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap",
    "critique": "string",
    "modelTopperThesis": "string"
  },
  "headerUpgrades": [
    {
      "originalHeader": "string",
      "issue": "string",
      "upgradedHeader": "string",
      "rule": "string"
    }
  ],
  "thingsToInclude": ["string"],
  "suggestedVisual": {
    "title": "string",
    "description": "string",
    "insertAfterHeading": "string",
    "diagramText": "string (Unicode tree blueprint using ├──, └──, │)"
  },
  "annotations": [
    {
      "id": "ann-1",
      "targetPhrase": "string (EXACT verbatim substring from candidate text)",
      "type": "red" | "amber" | "green",
      "category": "string",
      "comment": "string (Why the examiner circled this)",
      "suggestion": "string (Exact rewritten replacement)",
      "microLesson": "string (1-line rule to remember)"
    }
  ],
  "scoreBreakdown_topic_decoding": { "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap", "feedback": "string" },
  "scoreBreakdown_thesis": { "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap", "feedback": "string" },
  "scoreBreakdown_outline_structure": { "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap", "feedback": "string" },
  "scoreBreakdown_parallelism": { "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap", "feedback": "string" },
  "scoreBreakdown_coverage_originality": { "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap", "feedback": "string" }
}
`;

// ═════════════════════════════════════════════════════════════
// MODE 2: FULL ENGLISH ESSAY — 3 SPECIALIZED PARALLEL AGENTS
// (Token-Optimized via Anatomical Slicing, Zero Numeric Score)
// ═════════════════════════════════════════════════════════════

/**
 * Essay Agent A: Macro-Structure, Thesis, Intro Funnel & Outline-to-Body Alignment
 * Token-optimized: Receives ONLY the anatomical skeleton (~600 words instead of 3,000 words!)
 */
const buildEssayAgentAMacroPrompt = (examQuestion, anatomy, introWordCount, totalWords) => `
You are Essay Agent A: FPSC MACRO-STRUCTURE, THESIS & OUTLINE-TO-BODY ALIGNMENT MENTOR (trained on FPSC Examiner Reports, NOA, KIPS, and World Times rubrics).

Essay Topic: "${examQuestion}"
Total Essay Length: ${totalWords} words | Detected Introduction Length: ${introWordCount} words (Balanced Target: ~180–250 words)
${
  anatomy.bodyHeadingViolations.length > 0
    ? `⚠️ DETECTED INLINE BODY HEADINGS (FPSC Essay Violation): ${JSON.stringify(anatomy.bodyHeadingViolations)}`
    : 'Inline Body Headings Check: Clean (no forbidden headings detected inside prose body).'
}

1. CANDIDATE'S EXTRACTED OUTLINE SECTION:
---
${anatomy.outlineText || '(No separate formal outline detected at the start of the script)'}
---

2. CANDIDATE'S OPENING INTRODUCTION PARAGRAPH:
---
${anatomy.introParagraph || '(No introduction paragraph detected)'}
---

3. SEQUENCE OF BODY PARAGRAPH TOPIC SENTENCES (P1 to P${anatomy.bodyTopicSentences.length}):
---
${anatomy.bodyTopicSentences.join('\n') || '(No body paragraphs detected)'}
---

4. CANDIDATE'S CONCLUSION PARAGRAPH:
---
${anatomy.conclusionParagraph || '(No separate conclusion paragraph detected)'}
---

EVALUATION PHILOSOPHY:
- Be balanced, constructive, and pedagogical. Do NOT output numeric marks.
- Use qualitative statuses: "Strong", "Balanced", "Needs Polish", or "Critical Gap".
- Check the #1 FPSC Examiner complaint: **Outline-to-Body Alignment** — do the body paragraph topic sentences (P1..Pn) actually follow the candidate's Outline headers, or were outline headers skipped/ignored in the essay body?

Return ONLY this JSON:
{
  "overallReadiness": "Strong Competitive Essay" | "Balanced Draft — Needs Structural Polish" | "Foundational Draft — Needs Revision",
  "examinerSummary": "string (3–4 sentences of balanced, constructive mentorship highlighting key strengths and top priorities)",
  "directiveAnalysis": {
    "directiveWord": "string (e.g. Argumentative / Expository / Analytical Essay)",
    "targetTimeframe": "string or null",
    "requiredDimensions": "string (key dimensions required by this topic)",
    "alignmentStatus": "Aligned" | "Partially Aligned" | "Off-Topic",
    "feedback": "string (how well the candidate decoded the prompt nuances)"
  },
  "thesisAudit": {
    "candidateThesis": "string (exact thesis statement extracted from Outline or end of Introduction, or 'Not clearly stated')",
    "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap",
    "critique": "string (why the thesis works or how it falls short)",
    "modelTopperThesis": "string (a 1–2 sentence FPSC Topper-level thesis statement for this topic)"
  },
  "outlineAlignment": {
    "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap",
    "summary": "string (assessment of how well the body paragraphs match the outline roadmap)",
    "missingFromBody": ["string (outline points that were skipped or under-developed in the body, if any)"],
    "bodyHeadingWarning": "string or null (warning if the student mistakenly put headings inside the essay prose body)"
  },
  "headerUpgrades": [
    {
      "originalHeader": "string (a weak or non-parallel header from the candidate's outline, or a weak topic focus)",
      "issue": "string (e.g. Non-Parallel Phrasing / Single-Word Label / Vague)",
      "upgradedHeader": "string (rewritten parallel FPSC Topper header)",
      "rule": "string (1-line rule to remember)"
    }
  ],
  "scoreBreakdown_topic_relevance": { "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap", "feedback": "string" },
  "scoreBreakdown_outline": { "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap", "feedback": "string" },
  "scoreBreakdown_thesis": { "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap", "feedback": "string" },
  "scoreBreakdown_introduction": { "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap", "feedback": "string" },
  "scoreBreakdown_coherence": { "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap", "feedback": "string" }
}
`;

/**
 * Essay Agent B: Body Paragraph PEEL Coach, Empirical Evidence Verifier & 3-Tier Rewriter
 */
const buildEssayAgentBBodyPrompt = (examQuestion, transcribedText) => `
You are Essay Agent B: FPSC BODY PARAGRAPH (PEEL) COACH, EMPIRICAL EVIDENCE AUDITOR & TOPPER REWRITER.
Essay Topic: "${examQuestion}"

CANDIDATE'S ESSAY SCRIPT:
---
${transcribedText}
---

YOUR TASK:
1. Audit Body Paragraph Architecture (PEEL: Point/Topic Sentence → Explanation → Empirical Evidence/Case Study → Link back to Thesis):
   - Evaluate "scoreBreakdown_body_paragraphs" with qualitative status ("Strong" | "Balanced" | "Needs Polish" | "Critical Gap") and constructive feedback.
2. Verify Factual & Empirical Claims ("factCheck"):
   - Check 4 to 7 notable statistics, reports, historical references, constitutional articles, or scholarly claims in the essay.
   - If inaccurate or overly vague, provide the exact correction and authoritative source.
3. High-Impact Evidence & Perspectives to Add ("thingsToInclude"):
   - Provide 4 to 6 specific, authentic data points, global indices (e.g., UNDP, World Bank, IMF, WEF, Economic Survey of Pakistan), philosophical quotes, or counter-arguments the candidate can use to elevate this essay.
4. Custom Mentor Observations ("customObservations"):
   - 3 to 4 balanced observations on "Topic Sentences & PEEL", "Empirical Backing", "Counter-Argumentation", and "Concluding Way Forward".
5. Model Topper Outline Blueprint ("suggestedVisual"):
   - Design a clean "Ideal FPSC Essay Outline Blueprint" for "${examQuestion}" using Unicode tree characters (├──, └──, │).
6. 3-Tier Level-Up Paragraph Rewrites ("rewrites"):
   - Select 2 to 3 weak or average paragraphs from the candidate's essay.
   - Provide:
     - "original": Exact original paragraph from the script.
     - "basic": Corrected version fixing grammar while keeping the student's simple phrasing.
     - "cssStandard": Upgraded paragraph with a clear assertive Topic Sentence and formal academic register.
     - "highScorer": FPSC Topper version demonstrating complete PEEL structure (Topic Sentence + Analytical Depth + Empirical Citation + Link back to Thesis) in natural, lucid English (no artificial dictionary bombast).
     - "whatChanged": 1–2 sentences explaining *why* the Topper version is stronger so the student learns the technique.

Return ONLY this JSON:
{
  "scoreBreakdown_body_paragraphs": {
    "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap",
    "feedback": "string"
  },
  "factCheck": [
    {
      "claim": "string (exact claim from the essay)",
      "verified": true,
      "correctedFact": "string or null",
      "source": "string (authoritative report, book, or institution)"
    }
  ],
  "thingsToInclude": ["string"],
  "customObservations": [
    {
      "category": "string",
      "observation": "string",
      "type": "strength" | "concern" | "recommendation"
    }
  ],
  "suggestedVisual": {
    "title": "string",
    "description": "string",
    "insertAfterHeading": "string",
    "diagramText": "string (Unicode tree blueprint using ├──, └──, │)"
  },
  "rewrites": [
    {
      "original": "string",
      "basic": "string",
      "cssStandard": "string",
      "highScorer": "string",
      "whatChanged": "string"
    }
  ]
}
`;

/**
 * Essay Agent C: Pedagogical Language Mentor & 4-Part Micro-Lesson Highlighter
 * ("Beyond Academy Red Circles" — Explains WHY + Exact Fix + Rule to Remember)
 */
const buildEssayAgentCPedagogicalPrompt = (transcribedText) => `
You are Essay Agent C: FPSC PEDAGOGICAL LANGUAGE MENTOR & LINE-BY-LINE DIAGNOSTIC HIGHLIGHTER.

CANDIDATE'S ESSAY SCRIPT:
---
${transcribedText}
---

FPSC LANGUAGE & PEDAGOGY STANDARD:
- Official FPSC Examiner Reports repeatedly state: "Simple, correct, natural English with intellectual clarity scores far higher than forced, bombastic vocabulary riddled with grammatical errors."
- In traditional CSS academies, teachers only circle mistakes in red ink with no explanation. Your mission is to turn every highlight into a **4-Part Micro-Lesson** so the student learns from every mistake.

YOUR TASK:
1. Scan the essay from start to finish and generate 12 to 18 inline annotations across:
   - "red" (Grammar, Syntax, Factual, or FPSC Rule Errors): Subject-verb disagreement, sentence fragments, run-ons, wrong prepositions/articles, tense shifts, tautological thesis, or forbidden inline body headings.
   - "amber" (Style, Coherence & PEEL Improvements): Weak/missing topic sentence, abrupt transition, unsupported generalization, repetitive phrasing, or unnatural/forced vocabulary.
   - "green" (Strong Elements to Keep Doing): Lucid topic sentence, effective transitional signpost, well-integrated empirical evidence, or balanced analytical synthesis.
2. CRITICAL VERBATIM RULE:
   - Every "targetPhrase" MUST be an EXACT 3 to 10 word substring copied VERBATIM from the candidate's text above (exact spelling, punctuation, and case).
3. 4-PART MICRO-LESSON STRUCTURE FOR EVERY CALLOUT:
   - "category": Specific diagnostic badge (e.g., "Subject-Verb Agreement", "Weak Topic Sentence", "Missing Transition", "Unnatural Diction", "Unsupported Claim", "Strong PEEL Link").
   - "comment": Clear, encouraging explanation of WHY the examiner flagged (or praised) this phrase.
   - "suggestion": Exact drop-in rewritten phrase or sentence (for red and amber items; null or optional reinforcement for green).
   - "microLesson": A concise 1-sentence grammar or essay-writing rule so the student never repeats the mistake.
4. Evaluate "scoreBreakdown_grammar_syntax":
   - Qualitative status ("Strong" | "Balanced" | "Needs Polish" | "Critical Gap") and balanced feedback on the candidate's grammar, sentence variety, and clarity of expression.

Return ONLY this JSON:
{
  "annotations": [
    {
      "id": "ann-1",
      "targetPhrase": "string (EXACT 3-10 word verbatim substring from text)",
      "type": "red" | "amber" | "green",
      "category": "string",
      "comment": "string (Why the examiner flagged this)",
      "suggestion": "string or null (Exact rewritten fix)",
      "microLesson": "string (1-sentence rule to remember)"
    }
  ],
  "scoreBreakdown_grammar_syntax": {
    "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap",
    "feedback": "string"
  }
}
`;

// ═════════════════════════════════════════════════════════════
// MODE 3: 20-MARK SUBJECTIVE & PRECIS AGENT PROMPTS
// ═════════════════════════════════════════════════════════════

const buildAgent1DirectivePrompt = (profile, examQuestion, transcribedText) => `
You are Agent 1: QUESTION DIRECTIVE & SCOPE AUDITOR for the FPSC CSS Competitive Examination.

Subject: ${profile.subjectName} (${profile.archetypeLabel})
Domain Lens: ${profile.lens.domainLabel}
Exam Question / Prompt: "${examQuestion}"

CANDIDATE'S TRANSCRIBED ANSWER (Excerpt for Scope Check):
---
${transcribedText.slice(0, 3500)}
---

YOUR TASK:
1. Identify the primary directive word (e.g., Discuss, Critically Examine, Analyze, Evaluate, Compare, Elucidate, Precis).
2. Identify the target timeframe, geographical scope, or conceptual boundary if applicable.
3. Identify the required analytical dimensions.
4. Determine whether the candidate's answer is "Aligned", "Partially Aligned", or "Off-Topic".
5. Provide concise, actionable FPSC examiner feedback on how well the candidate addressed the question's scope.

Return ONLY this JSON:
{
  "directiveAnalysis": {
    "directiveWord": "string",
    "targetTimeframe": "string or null",
    "requiredDimensions": "string",
    "alignmentStatus": "Aligned" | "Partially Aligned" | "Off-Topic",
    "feedback": "string"
  }
}
`;

const buildAgent3FactualPrompt = (profile, examQuestion, transcribedText) => `
You are Agent 3: FACTUAL ACCURACY, SCHOLARLY CITATION & EMPIRICAL DATA AUDITOR for FPSC CSS ${profile.subjectName}.
Exam Question: "${examQuestion}"
Domain Verification Focus: ${profile.lens.factFocus}

CANDIDATE'S TRANSCRIBED ANSWER:
---
${transcribedText}
---

YOUR SINGLE TASK:
1. Cross-check all verifiable claims, dates, statistics, treaties, constitutional/statutory articles, books, theories, and scholarly references in the candidate's text.
2. For each notable claim (aim for 4 to 8 claims), state whether it is verified (true) or a blunder/inaccuracy (false).
3. If false or imprecise, provide the exact corrected fact and an authoritative source reference.
4. Evaluate the candidate's overall use of scholarly citations, facts, and empirical data:
   - Status: "Satisfactory" | "Needs Improvement" | "Missing"
   - Numeric score out of 3 (integer or half-mark from 0 to 3).

${profile.lens.examinerDirective}

Return ONLY this JSON:
{
  "factCheck": [
    {
      "claim": "string (exact claim from the candidate's text)",
      "verified": true,
      "correctedFact": "string or null (required if verified is false)",
      "source": "string (authoritative book, scholar, report, or statute)"
    }
  ],
  "scoreBreakdown_citations_evidence": {
    "status": "Satisfactory" | "Needs Improvement" | "Missing",
    "score": number,
    "feedback": "string"
  }
}
`;

const buildAgent4CausalityPrompt = (profile, examQuestion, directiveAnalysis, transcribedText) => {
  const isPrecis = profile.archetypeId === 'precis';

  return `
You are Agent 4: SENIOR FPSC EXAMINER FOR STRUCTURAL CAUSALITY, ANALYTICAL DEPTH & SCORING (${profile.subjectName}).
Assessment Type: ${profile.archetypeLabel} (Total Marks: ${profile.totalScore}, Passing Marks: ${profile.passingScore})
Exam Question: "${examQuestion}"
Directive Word: "${directiveAnalysis?.directiveWord || 'Discuss'}"
Required Dimensions: "${directiveAnalysis?.requiredDimensions || 'Multi-dimensional analysis'}"
Analytical Focus: ${profile.lens.causalityFocus}

CANDIDATE'S TRANSCRIBED ANSWER:
---
${transcribedText}
---

YOUR TASK:
1. RIGOROUSLY AUDIT ANALYTICAL DEPTH & STRUCTURAL CAUSALITY ("WHY & HOW" vs "WHAT"):
   - Penalize passive, elementary chronological storytelling or generic guidebook assertions.
   - Reward systemic root-cause analysis, theoretical grounding, institutional mechanisms, and multi-dimensional synthesis.
2. Generate 4 to 6 specific, high-scoring "thingsToInclude" — exact scholarly references, theoretical arguments, empirical indicators, or structural cause-effect points the candidate should add.
3. Write a cohesive "examinerSummary" (3–4 sentences) synthesizing the paper's core strengths, primary flaws, and FPSC allocation potential.
4. Provide 3 to 4 "customObservations" across categories like "${profile.lens.domainLabel}", "Argumentative Coherence", "Concluding Synthesis", or "Empirical Rigor".
5. Score the analytical rubric components realistically according to FPSC marking standards:
   ${
     isPrecis
       ? `- "scoreBreakdown_precis_rules": score out of 30
   - "scoreBreakdown_comprehension": score out of 25`
       : `- "scoreBreakdown_critical_analysis": score out of 6`
   }

Return ONLY this JSON:
{
  "examinerSummary": "string",
  "customObservations": [
    {
      "category": "string",
      "observation": "string",
      "type": "strength" | "concern" | "recommendation"
    }
  ],
  "thingsToInclude": [
    "string (actionable, subject-specific point with scholar/data reference)"
  ],
  "scoreBreakdown_critical_analysis": {
    "status": "Satisfactory" | "Needs Improvement" | "Missing",
    "score": number,
    "feedback": "string"
  },
  "scoreBreakdown_precis_rules": {
    "status": "Satisfactory" | "Needs Improvement" | "Missing",
    "score": number,
    "feedback": "string"
  },
  "scoreBreakdown_comprehension": {
    "status": "Satisfactory" | "Needs Improvement" | "Missing",
    "score": number,
    "feedback": "string"
  }
}
`;
};

const buildAgent5VisualsAndRewritesPrompt = (profile, examQuestion, transcribedText) => {
  const isPrecis = profile.archetypeId === 'precis';

  return `
You are Agent 5: STRUCTURAL ARCHITECT, VISUAL DESIGNER & TOPPER PARAGRAPH REWRITER for FPSC CSS ${profile.subjectName}.
Exam Question: "${examQuestion}"
Assessment Type: ${profile.archetypeLabel}

CANDIDATE'S TRANSCRIBED ANSWER:
---
${transcribedText}
---

YOUR TASK:
1. STRUCTURAL & HEADINGS AUDIT:
   ${
     isPrecis
       ? `- Audit the candidate's Precis Title ("scoreBreakdown_title", score out of 10).`
       : `- Audit the candidate's headings ("scoreBreakdown_headings", score out of 3): Are they self-explanatory academic headings or weak single-word labels?
   - Audit visual schematic usage ("scoreBreakdown_diagrams", score out of 2).`
   }

2. DESIGN ONE "suggestedVisual":
   - ${
     isPrecis
       ? 'Design a "Core Arguments Compression Map & Model Title" using Unicode box-drawing characters (├──, └──, │).'
       : 'Design a high-scoring schematic flowchart, causal matrix, or hierarchy tree using clean Unicode box-drawing characters (├──, └──, │, ──►) that the candidate should draw in their answer booklet.'
   }
   - Do NOT output raw Mermaid code; always use clean, human-readable Unicode tree/flowchart formatting.
   - Set "insertAfterHeading" to an exact heading or paragraph phrase from the candidate's text where this visual fits best.

3. GENERATE 2 TO 3 "rewrites" (3-TIER LEVEL-UP PARAGRAPH REWRITER):
   - Select 2 or 3 weak/average paragraphs from the candidate's script.
   - Provide "original", "basic", "cssStandard", "highScorer", and "whatChanged" (1–2 sentences explaining why the topper rewrite scores higher).

Return ONLY this JSON:
{
  "suggestedVisual": {
    "title": "string",
    "description": "string",
    "insertAfterHeading": "string (exact heading or phrase from text)",
    "diagramText": "string (clean Unicode tree/flowchart using ├──, └──, │, ──►)"
  },
  "rewrites": [
    {
      "original": "string",
      "basic": "string",
      "cssStandard": "string",
      "highScorer": "string",
      "whatChanged": "string"
    }
  ],
  "scoreBreakdown_headings": {
    "status": "Satisfactory" | "Needs Improvement" | "Missing",
    "score": number,
    "feedback": "string"
  },
  "scoreBreakdown_diagrams": {
    "status": "Satisfactory" | "Needs Improvement" | "Missing",
    "score": number,
    "feedback": "string"
  },
  "scoreBreakdown_title": {
    "status": "Satisfactory" | "Needs Improvement" | "Missing",
    "score": number,
    "feedback": "string"
  }
}
`;
};

const buildAgent6AnnotationsPrompt = (profile, transcribedText, introWordCount) => {
  const introMax = 3;
  const grammarMax = profile.archetypeId === 'precis' ? 35 : 3;

  return `
You are Agent 6: UNIVERSAL ERROR & STRENGTH HIGHLIGHTER — a meticulous line-by-line FPSC proofreader and pedagogical mentor for ${profile.subjectName}.

CANDIDATE'S TRANSCRIBED ANSWER:
---
${transcribedText}
---

YOUR SINGLE TASK:
1. Scan EVERY sentence from beginning to end and generate 10 to 16 annotations across these categories:
   - "red" (Critical Errors): Factual/historical/statutory blunders, English grammar/tense/agreement errors, spelling mistakes, or FPSC rule violations.
   - "amber" (Improvement Notes): Weak chronological storytelling lacking "Why & How" causality, informal diction/register, generic headings, or unsupported assertions.
   - "green" (Strong Elements): Strong analytical causality, apt scholarly/technical terminology, comparative insights, or effective synthesis.

CRITICAL VERBATIM RULE:
- Every "targetPhrase" MUST be an EXACT 3 to 10 word substring copy-pasted VERBATIM from the transcribed text above.

2. Include a 1-sentence "microLesson" ("Rule to Remember") for every red or amber annotation so the student learns the underlying grammar or analytical principle.
3. Evaluate Introduction & English Expression for the scoreBreakdown:
   - Detected Introduction Word Count: ${introWordCount} words (Target: ≥ ${profile.targetIntroWords} words).
   - "scoreBreakdown_introduction": status ("Satisfactory" | "Needs Improvement" | "Missing"), numeric score out of ${introMax}, and specific feedback.
   - "scoreBreakdown_grammar_syntax": status ("Satisfactory" | "Needs Improvement" | "Missing"), numeric score out of ${grammarMax}, and specific feedback.

Return ONLY this JSON:
{
  "annotations": [
    {
      "id": "ann-1",
      "targetPhrase": "string (EXACT 3-10 word verbatim substring from text)",
      "type": "red" | "amber" | "green",
      "category": "string",
      "comment": "string",
      "suggestion": "string or null",
      "microLesson": "string"
    }
  ],
  "scoreBreakdown_introduction": {
    "status": "Satisfactory" | "Needs Improvement" | "Missing",
    "score": number,
    "feedback": "string"
  },
  "scoreBreakdown_grammar_syntax": {
    "status": "Satisfactory" | "Needs Improvement" | "Missing",
    "score": number,
    "feedback": "string"
  }
}
`;
};

// ─────────────────────────────────────────────────────────────
// POST-PROCESSING: Validate annotations & normalize statuses
// ─────────────────────────────────────────────────────────────

const validateAnnotations = (annotations, fullText) => {
  if (!Array.isArray(annotations) || !fullText) return [];

  const textLower = fullText.toLowerCase();
  const seenPhrases = new Set();

  return annotations
    .filter((ann) => {
      if (!ann || !ann.targetPhrase || typeof ann.targetPhrase !== 'string') return false;
      const phrase = ann.targetPhrase.trim();
      if (phrase.length < 2) return false;

      const key = phrase.toLowerCase();
      if (seenPhrases.has(key)) return false;

      const exists = textLower.includes(key);
      if (exists) {
        seenPhrases.add(key);
      }
      return exists;
    })
    .map((ann, idx) => ({
      ...ann,
      id: ann.id || `ann-${idx + 1}`,
      type: ['red', 'amber', 'green'].includes(ann.type) ? ann.type : 'amber'
    }));
};

const resolveQualitativeCriterion = (rawObj, defaultFeedback = '') => {
  const rawStatus = (rawObj?.status || '').trim();
  const validStatuses = ['Strong', 'Balanced', 'Needs Polish', 'Critical Gap', 'Satisfactory', 'Needs Improvement', 'Missing'];
  const status = validStatuses.includes(rawStatus) ? rawStatus : 'Balanced';
  return {
    status,
    scored: false,
    feedback: rawObj?.feedback || defaultFeedback
  };
};

const resolveCriterionScore = (rawObj, maxMarks, fallbackStatus = 'Needs Improvement') => {
  const status = rawObj?.status || fallbackStatus;
  let numeric = Number(rawObj?.score);

  if (Number.isNaN(numeric) || numeric < 0) {
    if (status === 'Satisfactory' || status === 'Strong') numeric = Math.round(maxMarks * 0.72 * 2) / 2;
    else if (status === 'Needs Improvement' || status === 'Balanced' || status === 'Needs Polish') numeric = Math.round(maxMarks * 0.48 * 2) / 2;
    else numeric = Math.round(maxMarks * 0.2 * 2) / 2;
  }

  const clamped = Math.min(maxMarks, Math.max(0, Math.round(numeric * 2) / 2));
  return {
    status,
    scored: true,
    score: clamped,
    maxMarks,
    feedback: rawObj?.feedback || ''
  };
};

// ─────────────────────────────────────────────────────────────
// MAIN ORCHESTRATOR: executeMultiAgentPipeline
// ─────────────────────────────────────────────────────────────

export const executeMultiAgentPipeline = async ({
  text,
  imageArray,
  subject,
  essayMode = 'full',
  examQuestion,
  apiKey,
  selectedModel,
  onAgentComplete
}) => {
  const effectiveKey = apiKey || getStoredApiKey();
  if (!effectiveKey) throw new Error('NO_API_KEY');

  const profile = resolveSubjectProfile(subject, { essayMode });

  const userModelChoice = selectedModel || getStoredModel();
  const candidateList =
    userModelChoice !== 'auto'
      ? [userModelChoice, ...MODEL_CANDIDATES.filter((m) => m !== userModelChoice)]
      : MODEL_CANDIDATES;

  let resolvedModelName = candidateList[0];
  let apiCallsCount = 0;
  const ledger = createTokenLedger();

  // ═══════════════════════════════════════════════════════════
  // STEP 1: Single-Pass Vision OCR / Script Ingestion
  // ═══════════════════════════════════════════════════════════

  onAgentComplete?.({
    agentId: 'agent2',
    agentName:
      profile.archetypeId === 'essay_outline'
        ? 'Step 1/2: Digitizing Essay Outline & Thesis'
        : profile.archetypeId === 'essay'
        ? 'Node 1/4: Vision OCR & Essay Anatomy Segmenter'
        : 'Agent 1/6: Vision OCR & Script Digitizer',
    detail: 'Digitizing pages and extracting FPSC topic header...',
    percent: 15,
    phase: 'starting'
  });

  let transcribedText = (text || '').trim();
  let topic = '';
  let extractedQuestion = '';

  if (imageArray && imageArray.length > 0) {
    const { result: agent2Result, modelName } = await callAgentWithFailover({
      prompt: buildAgent2TranscriberPrompt(subject, examQuestion),
      apiKey: effectiveKey,
      candidateList,
      imageArray,
      text,
      maxTokens: 8192,
      temperature: 0.1,
      stageName: 'Vision OCR & Digitizer',
      ledger
    });
    apiCallsCount++;
    resolvedModelName = modelName;
    transcribedText = agent2Result.fullTranscribedText || transcribedText;
    topic = agent2Result.topic || '';
    extractedQuestion = agent2Result.extractedQuestion || '';
  } else if (transcribedText) {
    const firstLine = transcribedText.split('\n')[0]?.trim() || '';
    topic = firstLine.length < 110 ? firstLine : `${subject} Submission`;
  }

  if (!transcribedText || transcribedText.length < 10) {
    throw new Error('Could not extract readable text from the submitted script. Please upload clearer page photos or paste your text.');
  }

  const resolvedQuestion =
    (examQuestion || '').trim() ||
    (extractedQuestion || '').trim() ||
    topic ||
    `${subject} FPSC Topic`;

  const totalWords = countWords(transcribedText);

  // ═══════════════════════════════════════════════════════════
  // BRANCH A: ESSAY OUTLINE & THESIS ONLY MODE (Fast 1–2 Call DAG!)
  // ═══════════════════════════════════════════════════════════

  if (profile.archetypeId === 'essay_outline') {
    onAgentComplete?.({
      agentId: 'agent4',
      agentName: 'Step 2/2: FPSC Outline & Thesis Mentor Audit',
      detail: 'Auditing thesis stance, grammatical parallelism, and outline structure...',
      percent: 55,
      phase: 'starting'
    });

    const { result: outlineResult, modelName } = await callAgentWithFailover({
      prompt: buildOutlineOnlyMentorPrompt(resolvedQuestion, transcribedText),
      apiKey: effectiveKey,
      candidateList,
      maxTokens: 6144,
      temperature: 0.2,
      stageName: 'FPSC Outline & Thesis Mentor',
      ledger
    });
    apiCallsCount++;
    resolvedModelName = modelName;
    incrementUsage(apiCallsCount);

    const validatedAnnotations = validateAnnotations(outlineResult.annotations || [], transcribedText);

    const rawBreakdownPool = {
      topic_decoding: outlineResult.scoreBreakdown_topic_decoding,
      thesis: outlineResult.scoreBreakdown_thesis,
      outline_structure: outlineResult.scoreBreakdown_outline_structure,
      parallelism: outlineResult.scoreBreakdown_parallelism,
      coverage_originality: outlineResult.scoreBreakdown_coverage_originality
    };

    const scoreBreakdown = {};
    for (const comp of profile.breakdown) {
      const resolved = resolveQualitativeCriterion(rawBreakdownPool[comp.id], comp.defaultFeedback);
      scoreBreakdown[comp.id] = {
        name: comp.name,
        status: resolved.status,
        scored: false,
        feedback: resolved.feedback
      };
    }

    const modelDisplayName = getModelDisplayName(resolvedModelName);
    const tokenUsage = ledger.finalize();

    onAgentComplete?.({
      agentId: 'merge',
      agentName: 'Outline Diagnostic Complete',
      detail: `${outlineResult.overallReadiness || 'FPSC Outline Audit Ready'} (${tokenUsage.creditsConsumed} Credits • ${(tokenUsage.totalTokens / 1000).toFixed(1)}k tokens)`,
      percent: 100,
      phase: 'complete'
    });

    return {
      topic: topic || resolvedQuestion,
      examQuestion: resolvedQuestion,
      essayMode: 'outline_only',
      scored: false,
      archetypeId: profile.archetypeId,
      archetypeLabel: profile.archetypeLabel,
      domainLabel: profile.lens.domainLabel,
      fullTranscribedText: transcribedText,
      overallReadiness: outlineResult.overallReadiness || 'Balanced Blueprint — Needs Reframing',
      gradeBand: outlineResult.overallReadiness || 'Balanced Blueprint — Needs Reframing',
      directiveAnalysis: outlineResult.directiveAnalysis || {
        directiveWord: 'Essay Outline',
        alignmentStatus: 'Aligned',
        requiredDimensions: 'Multi-dimensional Essay Blueprint',
        feedback: 'Outline evaluated against FPSC structural and parallelism standards.'
      },
      thesisAudit: outlineResult.thesisAudit || null,
      headerUpgrades: outlineResult.headerUpgrades || [],
      outlineAlignment: null,
      factCheck: [],
      examinerSummary: outlineResult.examinerSummary || null,
      customObservations: [],
      thingsToInclude: outlineResult.thingsToInclude || [],
      suggestedVisual: outlineResult.suggestedVisual || null,
      rewrites: [],
      annotations: validatedAnnotations,
      scoreBreakdown,
      wordCount: totalWords,
      introWordCount: totalWords,
      targetIntroWords: profile.targetIntroWords,
      evaluatedModelId: resolvedModelName,
      evaluatedModelName: modelDisplayName,
      tokenUsage,
      creditsConsumed: tokenUsage.creditsConsumed
    };
  }

  // ═══════════════════════════════════════════════════════════
  // BRANCH B: FULL ENGLISH ESSAY MODE (Token-Optimized 3-Agent Parallel DAG, Score-Free)
  // ═══════════════════════════════════════════════════════════

  if (profile.archetypeId === 'essay') {
    const anatomy = segmentEssayAnatomy(transcribedText);
    const introWords = countIntroWords(transcribedText, true);

    onAgentComplete?.({
      agentId: 'agent1',
      agentName: 'Node 2/4: Macro-Structure, Thesis & Outline-to-Body Auditor',
      detail: `Auditing Outline-to-Body alignment across ${anatomy.bodyTopicSentences.length} body paragraphs...`,
      percent: 38,
      phase: 'starting'
    });

    const essayPromises = [
      // Agent A: Macro-Structure, Thesis & Outline-to-Body Alignment (Receives ~600w anatomical slice!)
      callAgentWithFailover({
        prompt: buildEssayAgentAMacroPrompt(resolvedQuestion, anatomy, introWords, totalWords),
        apiKey: effectiveKey,
        candidateList,
        maxTokens: 4096,
        temperature: 0.2,
        stageName: 'Macro-Structure & Thesis Audit',
        ledger
      }).then(({ result }) => {
        apiCallsCount++;
        onAgentComplete?.({
          agentId: 'agent4',
          agentName: 'Node 2/4: Macro-Structure & Thesis Audit Complete',
          detail: 'Completed Thesis critique and Outline-to-Body alignment matrix.',
          percent: 58,
          phase: 'complete'
        });
        return result;
      }),

      // Agent B: PEEL Body Paragraph Coach, Evidence Verifier & 3-Tier Rewriter
      callAgentWithFailover({
        prompt: buildEssayAgentBBodyPrompt(resolvedQuestion, transcribedText),
        apiKey: effectiveKey,
        candidateList,
        maxTokens: 5120,
        temperature: 0.25,
        stageName: 'PEEL Paragraph & Rewrites Coach',
        ledger
      }).then(({ result }) => {
        apiCallsCount++;
        onAgentComplete?.({
          agentId: 'agent5',
          agentName: 'Node 3/4: PEEL Paragraph Coach & Topper Rewriter',
          detail: 'Audited body paragraphs, empirical evidence, and 3-tier rewrites.',
          percent: 78,
          phase: 'complete'
        });
        return result;
      }),

      // Agent C: Pedagogical Language Mentor & 4-Part Micro-Lesson Highlighter
      callAgentWithFailover({
        prompt: buildEssayAgentCPedagogicalPrompt(transcribedText),
        apiKey: effectiveKey,
        candidateList,
        maxTokens: 6144,
        temperature: 0.2,
        stageName: 'Pedagogical Micro-Lesson Highlighter',
        ledger
      }).then(({ result }) => {
        apiCallsCount++;
        onAgentComplete?.({
          agentId: 'agent6',
          agentName: 'Node 4/4: Pedagogical Micro-Lesson Highlighter',
          detail: 'Mapped line-by-line explanations, fixes, and grammar rules.',
          percent: 94,
          phase: 'complete'
        });
        return result;
      })
    ];

    const settled = await Promise.allSettled(essayPromises);
    const macroResult = settled[0].status === 'fulfilled' ? settled[0].value : {};
    const bodyResult = settled[1].status === 'fulfilled' ? settled[1].value : {};
    const pedResult = settled[2].status === 'fulfilled' ? settled[2].value : {};

    if (settled.every((s) => s.status === 'rejected')) {
      const firstReason = settled[0]?.reason;
      throw new Error(firstReason?.message || 'Essay diagnostic agents failed to respond.');
    }

    incrementUsage(apiCallsCount);

    const validatedAnnotations = validateAnnotations(pedResult.annotations || [], transcribedText);

    const rawBreakdownPool = {
      topic_relevance: macroResult.scoreBreakdown_topic_relevance,
      outline: macroResult.scoreBreakdown_outline,
      thesis: macroResult.scoreBreakdown_thesis,
      introduction: macroResult.scoreBreakdown_introduction,
      body_paragraphs: bodyResult.scoreBreakdown_body_paragraphs,
      coherence: macroResult.scoreBreakdown_coherence,
      grammar_syntax: pedResult.scoreBreakdown_grammar_syntax
    };

    const scoreBreakdown = {};
    for (const comp of profile.breakdown) {
      const resolved = resolveQualitativeCriterion(rawBreakdownPool[comp.id], comp.defaultFeedback);
      scoreBreakdown[comp.id] = {
        name: comp.name,
        status: resolved.status,
        scored: false,
        feedback: resolved.feedback
      };
    }

    const overallReadiness = macroResult.overallReadiness || 'Balanced Draft — Needs Structural Polish';
    const modelDisplayName = getModelDisplayName(resolvedModelName);
    const tokenUsage = ledger.finalize();

    onAgentComplete?.({
      agentId: 'merge',
      agentName: 'Essay Diagnostic Complete',
      detail: `${overallReadiness} (${tokenUsage.creditsConsumed} Credits • ${(tokenUsage.totalTokens / 1000).toFixed(1)}k tokens)`,
      percent: 100,
      phase: 'complete'
    });

    return {
      topic: topic || resolvedQuestion,
      examQuestion: resolvedQuestion,
      essayMode: 'full',
      scored: false,
      archetypeId: profile.archetypeId,
      archetypeLabel: profile.archetypeLabel,
      domainLabel: profile.lens.domainLabel,
      fullTranscribedText: transcribedText,
      overallReadiness,
      gradeBand: overallReadiness,
      directiveAnalysis: macroResult.directiveAnalysis || {
        directiveWord: 'English Essay',
        alignmentStatus: 'Aligned',
        requiredDimensions: 'Multi-dimensional Argumentative Essay',
        feedback: 'Evaluated against FPSC Essay Examiner standards.'
      },
      thesisAudit: macroResult.thesisAudit || null,
      outlineAlignment: macroResult.outlineAlignment || null,
      headerUpgrades: macroResult.headerUpgrades || [],
      factCheck: bodyResult.factCheck || [],
      examinerSummary: macroResult.examinerSummary || null,
      customObservations: bodyResult.customObservations || [],
      thingsToInclude: bodyResult.thingsToInclude || [],
      suggestedVisual: bodyResult.suggestedVisual || null,
      rewrites: bodyResult.rewrites || [],
      annotations: validatedAnnotations,
      scoreBreakdown,
      wordCount: totalWords,
      introWordCount: introWords,
      targetIntroWords: profile.targetIntroWords,
      evaluatedModelId: resolvedModelName,
      evaluatedModelName: modelDisplayName,
      tokenUsage,
      creditsConsumed: tokenUsage.creditsConsumed
    };
  }

  // ═══════════════════════════════════════════════════════════
  // BRANCH C: 20-MARK SUBJECTIVE & PRECIS MODE (Quantitative Scoring + Micro-Lessons)
  // ═══════════════════════════════════════════════════════════

  onAgentComplete?.({
    agentId: 'agent1',
    agentName: 'Agent 2/6: Question Directive & Scope Auditor',
    detail: `Auditing alignment with "${resolvedQuestion.slice(0, 65)}..."`,
    percent: 38,
    phase: 'starting'
  });

  let directiveAnalysis = {
    directiveWord: 'Discuss / Analyze',
    targetTimeframe: null,
    requiredDimensions: profile.lens.domainLabel,
    alignmentStatus: 'Aligned',
    feedback: 'The answer addresses the core subject theme.'
  };

  try {
    const { result: agent1Result, modelName } = await callAgentWithFailover({
      prompt: buildAgent1DirectivePrompt(profile, resolvedQuestion, transcribedText),
      apiKey: effectiveKey,
      candidateList,
      maxTokens: 1024,
      temperature: 0.15,
      stageName: 'Directive & Scope Auditor',
      ledger
    });
    apiCallsCount++;
    resolvedModelName = modelName;
    if (agent1Result?.directiveAnalysis) {
      directiveAnalysis = agent1Result.directiveAnalysis;
    }
  } catch (err) {
    console.warn('[FPSC Engine] Agent 1 degraded gracefully:', err.message);
  }

  const introWords = countIntroWords(transcribedText, false);

  onAgentComplete?.({
    agentId: 'agent3',
    agentName: `Agent 3/6: ${profile.lens.domainLabel} & Fact Auditor`,
    detail: 'Verifying claims, scholarly citations, dates, and empirical data...',
    percent: 52,
    phase: 'starting'
  });

  const phase2Promises = [
    callAgentWithFailover({
      prompt: buildAgent3FactualPrompt(profile, resolvedQuestion, transcribedText),
      apiKey: effectiveKey,
      candidateList,
      maxTokens: 4096,
      temperature: 0.15,
      stageName: 'Empirical & Fact Verifier',
      ledger
    }).then(({ result }) => {
      apiCallsCount++;
      onAgentComplete?.({
        agentId: 'agent3',
        agentName: 'Agent 3/6: Factual & Citation Verifier',
        detail: `Verified ${(result.factCheck || []).length} claims & references.`,
        percent: 64,
        phase: 'complete'
      });
      return result;
    }),

    callAgentWithFailover({
      prompt: buildAgent4CausalityPrompt(profile, resolvedQuestion, directiveAnalysis, transcribedText),
      apiKey: effectiveKey,
      candidateList,
      maxTokens: 4096,
      temperature: 0.25,
      stageName: 'Structural Causality & FPSC Scorer',
      ledger
    }).then(({ result }) => {
      apiCallsCount++;
      onAgentComplete?.({
        agentId: 'agent4',
        agentName: 'Agent 4/6: Structural Causality & FPSC Scorer',
        detail: 'Completed structural cause-effect & marks evaluation.',
        percent: 76,
        phase: 'complete'
      });
      return result;
    }),

    callAgentWithFailover({
      prompt: buildAgent5VisualsAndRewritesPrompt(profile, resolvedQuestion, transcribedText),
      apiKey: effectiveKey,
      candidateList,
      maxTokens: 4096,
      temperature: 0.25,
      stageName: 'Visual Architect & Topper Rewriter',
      ledger
    }).then(({ result }) => {
      apiCallsCount++;
      onAgentComplete?.({
        agentId: 'agent5',
        agentName: 'Agent 5/6: Visual Architect & Topper Rewriter',
        detail: 'Generated schematic blueprint & 3-tier paragraph rewrites.',
        percent: 86,
        phase: 'complete'
      });
      return result;
    }),

    callAgentWithFailover({
      prompt: buildAgent6AnnotationsPrompt(profile, transcribedText, introWords),
      apiKey: effectiveKey,
      candidateList,
      maxTokens: 6144,
      temperature: 0.2,
      stageName: 'Pedagogical Micro-Lesson Highlighter',
      ledger
    }).then(({ result }) => {
      apiCallsCount++;
      onAgentComplete?.({
        agentId: 'agent6',
        agentName: 'Agent 6/6: Line-by-Line Error & Strength Highlighter',
        detail: 'Mapped pedagogical callouts across answer script.',
        percent: 94,
        phase: 'complete'
      });
      return result;
    })
  ];

  const settled = await Promise.allSettled(phase2Promises);

  const agent3Result = settled[0].status === 'fulfilled' ? settled[0].value : {};
  const agent4Result = settled[1].status === 'fulfilled' ? settled[1].value : {};
  const agent5Result = settled[2].status === 'fulfilled' ? settled[2].value : {};
  const agent6Result = settled[3].status === 'fulfilled' ? settled[3].value : {};

  if (settled.every((s) => s.status === 'rejected')) {
    const firstReason = settled.find((s) => s.status === 'rejected')?.reason;
    throw new Error(firstReason?.message || 'All analytical agents failed to respond.');
  }

  const validatedAnnotations = validateAnnotations(agent6Result.annotations || [], transcribedText);
  incrementUsage(apiCallsCount);

  const rawBreakdownPool = {
    introduction: agent6Result.scoreBreakdown_introduction,
    headings: agent5Result.scoreBreakdown_headings,
    diagrams: agent5Result.scoreBreakdown_diagrams,
    title: agent5Result.scoreBreakdown_title,
    critical_analysis: agent4Result.scoreBreakdown_critical_analysis,
    precis_rules: agent4Result.scoreBreakdown_precis_rules,
    comprehension: agent4Result.scoreBreakdown_comprehension,
    citations_evidence: agent3Result.scoreBreakdown_citations_evidence,
    grammar_syntax: agent6Result.scoreBreakdown_grammar_syntax
  };

  const scoreBreakdown = {};
  let calculatedTotalScore = 0;

  for (const comp of profile.breakdown) {
    const rawComp = rawBreakdownPool[comp.id];
    const resolved = resolveCriterionScore(rawComp, comp.maxMarks);
    scoreBreakdown[comp.id] = {
      name: comp.name,
      status: resolved.status,
      scored: true,
      score: resolved.score,
      maxMarks: comp.maxMarks,
      feedback: resolved.feedback || comp.defaultFeedback
    };
    calculatedTotalScore += resolved.score;
  }

  const overallScore = Math.min(profile.totalScore, Math.round(calculatedTotalScore * 2) / 2);
  const maxScore = profile.totalScore;
  const passStatus = overallScore >= profile.passingScore;
  const scorePercent = Math.round((overallScore / maxScore) * 100);

  let gradeBand = 'Needs Substantial Revision';
  if (scorePercent >= 70) gradeBand = 'Top Allocation Standard (Distinction)';
  else if (scorePercent >= 55) gradeBand = 'Strong Competitive Standard';
  else if (passStatus) gradeBand = 'Qualifying / Borderline Pass';
  else gradeBand = `Below FPSC Passing Threshold (<${profile.passingScore}/${maxScore})`;

  const modelDisplayName = getModelDisplayName(resolvedModelName);
  const tokenUsage = ledger.finalize();

  onAgentComplete?.({
    agentId: 'merge',
    agentName: 'Evaluation Complete',
    detail: `Scored ${overallScore}/${maxScore} (${tokenUsage.creditsConsumed} Credits • ${(tokenUsage.totalTokens / 1000).toFixed(1)}k tokens)`,
    percent: 100,
    phase: 'complete'
  });

  return {
    topic: topic || resolvedQuestion,
    examQuestion: resolvedQuestion,
    essayMode: 'full',
    scored: true,
    archetypeId: profile.archetypeId,
    archetypeLabel: profile.archetypeLabel,
    domainLabel: profile.lens.domainLabel,
    fullTranscribedText: transcribedText,
    overallScore,
    maxScore,
    passingScore: profile.passingScore,
    passStatus,
    gradeBand,
    directiveAnalysis,
    factCheck: agent3Result.factCheck || [],
    examinerSummary: agent4Result.examinerSummary || null,
    customObservations: agent4Result.customObservations || [],
    thingsToInclude: agent4Result.thingsToInclude || [],
    suggestedVisual: agent5Result.suggestedVisual || null,
    rewrites: agent5Result.rewrites || [],
    annotations: validatedAnnotations,
    scoreBreakdown,
    wordCount: totalWords,
    introWordCount: introWords,
    targetIntroWords: profile.targetIntroWords,
    evaluatedModelId: resolvedModelName,
    evaluatedModelName: modelDisplayName,
    tokenUsage,
    creditsConsumed: tokenUsage.creditsConsumed
  };
};
