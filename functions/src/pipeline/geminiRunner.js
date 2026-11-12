/**
 * FPSC Multi-Agent Evaluation Engine for 20-Mark Subjective & Precis Papers
 * (100-Mark English Essays are evaluated by functions/src/rubric/orchestrateEssayPipeline.js)
 */

import { resolveSubjectProfile } from './fpscRubrics.js';
import { safeParseJsonWithGrounding } from '../rubric/safeJsonParser.js';

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
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite (Low Latency)' }
];

const MODEL_CANDIDATES = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite'
];

export const getStoredApiKey = () => '';
export const setStoredApiKey = () => {};

export const getStoredModel = () => 'auto';
export const setStoredModel = () => {};

// In-memory usage counter for Cloud Functions instance
let instanceGroundingUsage = 0;
export const getGroundingUsage = () => ({ count: instanceGroundingUsage, limit: 5000 });
const incrementUsage = (calls = 1) => {
  instanceGroundingUsage += calls;
};

/**
 * 100% Programmatic JavaScript Word Counter — eliminates AI hallucinations.
 */
export const countWords = (text) => {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
};

/**
 * Accurately extracts the introduction paragraph word count, skipping short title lines.
 */
export const countIntroWords = (fullText) => {
  if (!fullText || typeof fullText !== 'string') return 0;

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
 * Resilient JSON parser backed by state-machine quote/truncation repairer.
 */
const safeParseJSON = (rawText) => {
  return safeParseJsonWithGrounding(rawText);
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

const callSingleAgent = async ({ prompt, apiKey, modelName, imageArray, text, maxTokens = 8192, temperature = 0.2 }) => {
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const callSingleAgentWithRetry = async (params, maxRetries = 2) => {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      return await callSingleAgent(params);
    } catch (err) {
      const msg = err.message || '';
      const isRateLimit = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota');
      const isServerUnavailable = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('500');

      if ((isRateLimit || isServerUnavailable) && attempt < maxRetries) {
        attempt++;
        const backoffMs = Math.min(6000, 1000 * Math.pow(2, attempt) + Math.random() * 500);
        console.warn(`[GeminiRunner] ${params.modelName} hit ${isRateLimit ? 'RateLimit/429' : 'Server/503'}. Backing off ${Math.round(backoffMs)}ms (attempt ${attempt}/${maxRetries})...`);
        await sleep(backoffMs);
        continue;
      }
      throw err;
    }
  }
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
      const { parsed, usage } = await callSingleAgentWithRetry({
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
// 20-MARK SUBJECTIVE & PRECIS AGENT PROMPTS
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
  // 20-MARK SUBJECTIVE & PRECIS MODE (Quantitative Scoring + Micro-Lessons)
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
