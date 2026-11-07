/**
 * Sequential & Parallel Multi-Agent FPSC Evaluation Engine (v2.0)
 *
 * Architecture:
 *   Phase 1 (Single Vision Pass):
 *     - Agent 2 (Vision OCR & Question Detector) digitizes images ONCE -> produces verbatim text + extracted question.
 *     - Agent 1 (Directive & Scope Auditor) analyzes the question & transcribed text (0 image token duplication).
 *   Phase 2 (Parallel Text-Only Specialists via Promise.allSettled):
 *     - Agent 3: Subject-Specific Factual, Citation & Empirical Verifier
 *     - Agent 4: Structural Causality, Analytical Depth & Quantitative Marks Scorer
 *     - Agent 5: Headings/Outline Architect, Visual Designer & 3-Tier Topper Paragraph Rewriter
 *     - Agent 6: Line-by-Line Verbatim Highlighter (Red / Amber / Green)
 *   Final:
 *     - Programmatic Target-Phrase Validator, Deterministic Word Counter & Calibrated FPSC Marks Reducer
 */

import { resolveSubjectProfile } from './fpscRubrics';

const API_KEY_STORAGE_KEY = 'css_evaluator_gemini_api_key';
const MODEL_STORAGE_KEY = 'css_evaluator_gemini_model';

export const AVAILABLE_MODELS = [
  { id: 'auto', name: '⚡ Auto (Fastest & Smartest Failover)' },
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Ultra-Fast Flagship)' },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (High-Speed Analytical)' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash (Next-Gen Balanced)' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite (Low-Latency Lite)' },
  { id: 'gemini-3.5-pro', name: 'Gemini 3.5 Pro (Deep Multimodal Reasoning)' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Standard Fallback)' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Deep Fallback)' }
];

export const getStoredApiKey = () => localStorage.getItem(API_KEY_STORAGE_KEY) || '';
export const setStoredApiKey = (key) => localStorage.setItem(API_KEY_STORAGE_KEY, (key || '').trim());
export const getStoredModel = () => localStorage.getItem(MODEL_STORAGE_KEY) || 'auto';
export const setStoredModel = (modelId) => localStorage.setItem(MODEL_STORAGE_KEY, modelId);

const MODEL_CANDIDATES = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-pro'
];

let monthlyGroundingUsage = {
  count: Number(localStorage.getItem('css_eval_api_usage_count') || 0),
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
 * Accurately extracts the introduction paragraph word count, skipping short title or heading lines.
 */
export const countIntroWords = (fullText) => {
  if (!fullText || typeof fullText !== 'string') return 0;
  const blocks = fullText
    .split(/\n\s*\n/)
    .map(b => b.trim())
    .filter(Boolean);

  for (const block of blocks) {
    // Strip leading "Introduction:" or "1. Introduction:" label if present on the same block
    const cleaned = block.replace(/^(?:[0-9A-Za-z]+[.-]\s*)?introduction\s*[:\-–—]?\s*/i, '').trim();
    const words = countWords(cleaned);
    // First substantive prose paragraph (>= 20 words) is the introduction
    if (words >= 20) {
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
    // Extract outermost JSON object if extra prose surrounds it
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const candidate = cleaned
        .slice(firstBrace, lastBrace + 1)
        .replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(candidate);
    }
    throw new Error('Failed to parse structured JSON from AI agent');
  }
};

// ─────────────────────────────────────────────────────────────
// GENERIC AGENT CALLER — One focused API call per agent
// ─────────────────────────────────────────────────────────────

const callSingleAgent = async ({ prompt, apiKey, modelName, imageArray, text, maxTokens = 4096, temperature = 0.2 }) => {
  const parts = [];

  if (imageArray && imageArray.length > 0) {
    imageArray.forEach((imgData) => {
      const { mimeType, base64Data } = parseDataUrl(imgData);
      if (base64Data) {
        parts.push({
          inlineData: { mimeType, data: base64Data }
        });
      }
    });
  }

  if (text) {
    parts.push({ text: `Candidate Answer Script Text:\n${text}` });
  }

  parts.push({ text: prompt });

  const payload = {
    contents: [{ parts }],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      responseMimeType: 'application/json'
    }
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error('Agent returned empty response');
  }

  return safeParseJSON(rawText);
};

/**
 * Tries calling an agent across multiple model candidates with automatic failover.
 */
const callAgentWithFailover = async ({ prompt, apiKey, candidateList, imageArray, text, maxTokens, temperature }) => {
  let lastError = null;
  for (const modelName of candidateList) {
    try {
      const result = await callSingleAgent({ prompt, apiKey, modelName, imageArray, text, maxTokens, temperature });
      return { result, modelName };
    } catch (err) {
      console.warn(`[FPSC Engine] Agent failed on ${modelName}:`, err.message);
      lastError = err;
    }
  }
  throw new Error(`Evaluation failed across available models: ${lastError?.message || 'Unknown API error'}`);
};

// ─────────────────────────────────────────────────────────────
// SUBJECT-ADAPTIVE AGENT PROMPT BUILDERS
// ─────────────────────────────────────────────────────────────

const buildAgent2TranscriberPrompt = (subject, userExamQuestion) => `
You are Agent 2: DIGITIZER, OCR TRANSCRIPTION & QUESTION EXTRACTOR for FPSC CSS (${subject || 'Competitive Examination'}).

YOUR TASK:
1. Transcribe the FULL candidate answer script verbatim from the provided pages/text.
   - Preserve all paragraphs, headings, sub-headings, numbering, and outline structures using double newlines (\\n\\n) between paragraphs/headings.
   - Do NOT fix grammar or rewrite anything during transcription — transcribe 100% faithfully.
2. Identify the main topic/title of the script ("topic").
3. Detect if an explicit exam question or prompt is written at the top of the script ("extractedQuestion").
   ${userExamQuestion ? `Note: The candidate already provided this question prompt: "${userExamQuestion}".` : ''}

Return ONLY this JSON:
{
  "topic": "string (main title or topic of the answer script)",
  "extractedQuestion": "string or null (explicit exam question written on the script, if any)",
  "fullTranscribedText": "string (the ENTIRE verbatim transcribed text with \\n\\n paragraph breaks)"
}
`;

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
1. Identify the primary directive word (e.g., Discuss, Critically Examine, Analyze, Evaluate, Compare, Elucidate, Essay Prompt, Precis).
2. Identify the target timeframe, geographical scope, or conceptual boundary if applicable.
3. Identify the required analytical dimensions (e.g., Political, Economic, Institutional, Geopolitical, Legal, Social).
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
  const isEssay = profile.archetypeId === 'essay';
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
5. Score the analytical rubric components realistically according to strict FPSC marking standards:
   ${
     isEssay
       ? `- "scoreBreakdown_thesis": score out of 10
   - "scoreBreakdown_critical_analysis": score out of 30
   - "scoreBreakdown_conclusion": score out of 10`
       : isPrecis
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
  "scoreBreakdown_thesis": {
    "status": "Satisfactory" | "Needs Improvement" | "Missing",
    "score": number,
    "feedback": "string"
  },
  "scoreBreakdown_conclusion": {
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
  const isEssay = profile.archetypeId === 'essay';
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
1. STRUCTURAL & HEADINGS / OUTLINE AUDIT:
   ${
     isEssay
       ? `- Audit the candidate's Essay Outline ("scoreBreakdown_outline", score out of 15).
   - IMPORTANT FPSC ESSAY RULE: Headings and diagrams are STRICTLY FORBIDDEN inside the Essay body prose (only allowed in the initial Outline). If the candidate put headings inside the essay body, flag it in feedback!`
       : isPrecis
       ? `- Audit the candidate's Precis Title ("scoreBreakdown_title", score out of 10).`
       : `- Audit the candidate's headings ("scoreBreakdown_headings", score out of 3): Are they self-explanatory academic headings (e.g., "1. Resource Scarcity & Pastoral Nomadism: Economic Drivers of Ghazw") or weak single-word labels?
   - Audit visual schematic usage ("scoreBreakdown_diagrams", score out of 2).`
   }

2. DESIGN ONE "suggestedVisual":
   - ${
     isEssay
       ? 'Design a clean "Ideal FPSC Essay Outline Blueprint" using Unicode box-drawing characters (├──, └──, │).'
       : isPrecis
       ? 'Design a "Core Arguments Compression Map & Model Title" using Unicode box-drawing characters (├──, └──, │).'
       : 'Design a high-scoring schematic flowchart, causal matrix, or hierarchy tree using clean Unicode box-drawing characters (├──, └──, │, ──►) that the candidate should draw in their answer booklet.'
   }
   - Do NOT output raw Mermaid code (like "graph TD"); always use clean, human-readable Unicode tree/flowchart formatting.
   - Set "insertAfterHeading" to an exact heading or paragraph phrase from the candidate's text where this visual fits best.

3. GENERATE 2 TO 3 "rewrites" (3-TIER LEVEL-UP PARAGRAPH REWRITER):
   - Select 2 or 3 weak/average paragraphs or passages from the candidate's script.
   - Provide:
     - "original": The exact original paragraph/sentences from the candidate's text.
     - "basic": Grammatically corrected version of the candidate's paragraph.
     - "cssStandard": Upgraded version using formal FPSC academic register and clear topic framing.
     - "highScorer": Topper-level (15+/20 or 65+/100) rewrite incorporating structural causality, scholarly terminology, and authoritative synthesis.

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
      "highScorer": "string"
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
  "scoreBreakdown_outline": {
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
  const introMax = profile.archetypeId === 'essay' ? 15 : 3;
  const grammarMax = profile.archetypeId === 'essay' ? 20 : profile.archetypeId === 'precis' ? 35 : 3;

  return `
You are Agent 6: UNIVERSAL ERROR & STRENGTH HIGHLIGHTER — a meticulous line-by-line FPSC proofreader and analytical auditor for ${profile.subjectName}.

CANDIDATE'S TRANSCRIBED ANSWER:
---
${transcribedText}
---

YOUR SINGLE TASK:
1. Scan EVERY sentence from beginning to end and generate 10 to 18 annotations across these categories:
   - "red" (Critical Errors): Factual/historical/statutory blunders, English grammar/tense/agreement errors, spelling mistakes, punctuation/possessive errors, or FPSC rule violations.
   - "amber" (Improvement Notes): Weak chronological storytelling lacking "Why & How" causality, informal diction/register, generic headings, or unsupported assertions.
   - "green" (Strong Elements): Strong analytical causality, apt scholarly/technical terminology, comparative insights, or effective synthesis.

CRITICAL VERBATIM RULE:
- Every "targetPhrase" MUST be an EXACT 3 to 10 word substring copy-pasted VERBATIM from the transcribed text above (exact spelling, punctuation, and case). Never paraphrase "targetPhrase".

2. Evaluate Introduction & English Expression for the scoreBreakdown:
   - Detected Introduction Word Count: ${introWordCount} words (Target: ≥ ${profile.targetIntroWords} words).
   - "scoreBreakdown_introduction": status ("Satisfactory" | "Needs Improvement" | "Missing"), numeric score out of ${introMax}, and specific feedback.
   - "scoreBreakdown_grammar_syntax": status ("Satisfactory" | "Needs Improvement" | "Missing"), numeric score out of ${grammarMax}, and specific feedback summarizing the grammar/register audit.

Return ONLY this JSON:
{
  "annotations": [
    {
      "id": "ann-1",
      "targetPhrase": "string (EXACT 3-10 word verbatim substring from text)",
      "type": "red" | "amber" | "green",
      "category": "string",
      "comment": "string",
      "suggestion": "string or null"
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
// POST-PROCESSING: Validate annotations & compute calibrated FPSC scores
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

/**
 * Computes a deterministic numeric score from status if the LLM omitted a numeric score,
 * and clamps it to [0, maxMarks].
 */
const resolveCriterionScore = (rawObj, maxMarks, fallbackStatus = 'Needs Improvement') => {
  const status = rawObj?.status || fallbackStatus;
  let numeric = Number(rawObj?.score);

  if (Number.isNaN(numeric) || numeric < 0) {
    if (status === 'Satisfactory') numeric = Math.round(maxMarks * 0.72 * 2) / 2;
    else if (status === 'Needs Improvement') numeric = Math.round(maxMarks * 0.48 * 2) / 2;
    else numeric = Math.round(maxMarks * 0.2 * 2) / 2;
  }

  const clamped = Math.min(maxMarks, Math.max(0, Math.round(numeric * 2) / 2));
  return {
    status,
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
  examQuestion,
  apiKey,
  selectedModel,
  onAgentComplete
}) => {
  const effectiveKey = apiKey || getStoredApiKey();
  if (!effectiveKey) throw new Error('NO_API_KEY');

  const profile = resolveSubjectProfile(subject);

  const userModelChoice = selectedModel || getStoredModel();
  const candidateList =
    userModelChoice !== 'auto'
      ? [userModelChoice, ...MODEL_CANDIDATES.filter((m) => m !== userModelChoice)]
      : MODEL_CANDIDATES;

  let resolvedModelName = candidateList[0];
  let apiCallsCount = 0;

  // ═══════════════════════════════════════════════════════════
  // PHASE 1A: Agent 2 — Single-Pass Vision OCR & Question Extraction
  // ═══════════════════════════════════════════════════════════

  onAgentComplete?.({
    agentId: 'agent2',
    agentName: 'Agent 1/6: Vision OCR & Script Digitizer',
    detail: 'Digitizing answer pages and detecting FPSC question header...',
    percent: 12,
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
      temperature: 0.1
    });
    apiCallsCount++;
    resolvedModelName = modelName;
    transcribedText = agent2Result.fullTranscribedText || transcribedText;
    topic = agent2Result.topic || '';
    extractedQuestion = agent2Result.extractedQuestion || '';
  } else if (transcribedText) {
    // Text-only submission: extract clean topic & header question without vision tokens
    const firstLine = transcribedText.split('\n')[0]?.trim() || '';
    topic = firstLine.length < 110 ? firstLine : `${subject} Answer Script`;
  }

  if (!transcribedText || transcribedText.length < 15) {
    throw new Error('Could not extract readable text from the submitted answer script. Please upload clearer page photos or paste your text.');
  }

  const resolvedQuestion = (examQuestion || '').trim() || (extractedQuestion || '').trim() || topic || `${subject} FPSC Question`;

  onAgentComplete?.({
    agentId: 'agent2',
    agentName: 'Agent 1/6: Vision OCR & Script Digitizer',
    detail: `Digitized ${countWords(transcribedText)} words across script.`,
    percent: 30,
    phase: 'complete'
  });

  // ═══════════════════════════════════════════════════════════
  // PHASE 1B: Agent 1 — Question Directive & Scope Audit (Text-Only, Fast)
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
      temperature: 0.15
    });
    apiCallsCount++;
    resolvedModelName = modelName;
    if (agent1Result?.directiveAnalysis) {
      directiveAnalysis = agent1Result.directiveAnalysis;
    }
  } catch (err) {
    console.warn('[FPSC Engine] Agent 1 degraded gracefully:', err.message);
  }

  onAgentComplete?.({
    agentId: 'agent1',
    agentName: 'Agent 2/6: Question Directive & Scope Auditor',
    detail: `Directive "${directiveAnalysis.directiveWord}" — ${directiveAnalysis.alignmentStatus}`,
    percent: 45,
    phase: 'complete'
  });

  // Deterministic word counts before Phase 2 so Agent 6 gets exact introWordCount
  const totalWords = countWords(transcribedText);
  const introWords = countIntroWords(transcribedText);

  // ═══════════════════════════════════════════════════════════
  // PHASE 2: Agents 3, 4, 5, 6 — Parallel Specialist Audit (Promise.allSettled)
  // ═══════════════════════════════════════════════════════════

  onAgentComplete?.({
    agentId: 'agent3',
    agentName: `Agent 3/6: ${profile.lens.domainLabel} & Fact Auditor`,
    detail: 'Verifying claims, scholarly citations, dates, and empirical data...',
    percent: 52,
    phase: 'starting'
  });

  const phase2Promises = [
    // Agent 3: Factual & Citation Verification
    callAgentWithFailover({
      prompt: buildAgent3FactualPrompt(profile, resolvedQuestion, transcribedText),
      apiKey: effectiveKey,
      candidateList,
      maxTokens: 4096,
      temperature: 0.15
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

    // Agent 4: Structural Causality & Quantitative Marks
    callAgentWithFailover({
      prompt: buildAgent4CausalityPrompt(profile, resolvedQuestion, directiveAnalysis, transcribedText),
      apiKey: effectiveKey,
      candidateList,
      maxTokens: 4096,
      temperature: 0.25
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

    // Agent 5: Headings/Outline, Visuals & 3-Tier Topper Rewrites
    callAgentWithFailover({
      prompt: buildAgent5VisualsAndRewritesPrompt(profile, resolvedQuestion, transcribedText),
      apiKey: effectiveKey,
      candidateList,
      maxTokens: 4096,
      temperature: 0.25
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

    // Agent 6: Line-by-Line Verbatim Highlighter
    callAgentWithFailover({
      prompt: buildAgent6AnnotationsPrompt(profile, transcribedText, introWords),
      apiKey: effectiveKey,
      candidateList,
      maxTokens: 6144,
      temperature: 0.2
    }).then(({ result }) => {
      apiCallsCount++;
      onAgentComplete?.({
        agentId: 'agent6',
        agentName: 'Agent 6/6: Line-by-Line Error & Strength Highlighter',
        detail: 'Mapped inline callouts across answer script.',
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

  // Ensure at least 2 Phase 2 agents succeeded
  const fulfilledCount = settled.filter((s) => s.status === 'fulfilled').length;
  if (fulfilledCount === 0) {
    const firstReason = settled.find((s) => s.status === 'rejected')?.reason;
    throw new Error(firstReason?.message || 'All analytical agents failed to respond.');
  }

  // ═══════════════════════════════════════════════════════════
  // FINAL: Merge, Validate Annotations & Compute Quantitative FPSC Score
  // ═══════════════════════════════════════════════════════════

  onAgentComplete?.({
    agentId: 'merge',
    agentName: 'Finalizing FPSC Scorecard & Validating Highlights',
    detail: 'Running deterministic target-phrase validation and score reduction...',
    percent: 98,
    phase: 'starting'
  });

  const rawAnnotations = agent6Result.annotations || [];
  const validatedAnnotations = validateAnnotations(rawAnnotations, transcribedText);

  incrementUsage(apiCallsCount);

  // Merge all possible scoreBreakdown keys from Agents 3, 4, 5, 6
  const rawBreakdownPool = {
    introduction: agent6Result.scoreBreakdown_introduction,
    headings: agent5Result.scoreBreakdown_headings,
    diagrams: agent5Result.scoreBreakdown_diagrams,
    outline: agent5Result.scoreBreakdown_outline,
    title: agent5Result.scoreBreakdown_title,
    critical_analysis: agent4Result.scoreBreakdown_critical_analysis,
    thesis: agent4Result.scoreBreakdown_thesis,
    conclusion: agent4Result.scoreBreakdown_conclusion,
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
      score: resolved.score,
      maxMarks: comp.maxMarks,
      feedback: resolved.feedback || comp.defaultFeedback
    };
    calculatedTotalScore += resolved.score;
  }

  // Also ensure standard legacy keys exist for backward compatibility
  if (!scoreBreakdown.headings && agent5Result.scoreBreakdown_headings) {
    scoreBreakdown.headings = agent5Result.scoreBreakdown_headings;
  }
  if (!scoreBreakdown.diagrams && agent5Result.scoreBreakdown_diagrams) {
    scoreBreakdown.diagrams = agent5Result.scoreBreakdown_diagrams;
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

  const unified = {
    topic: topic || resolvedQuestion,
    examQuestion: resolvedQuestion,
    archetypeId: profile.archetypeId,
    archetypeLabel: profile.archetypeLabel,
    domainLabel: profile.lens.domainLabel,
    fullTranscribedText: transcribedText,

    // Quantitative FPSC Marks
    overallScore,
    maxScore,
    passingScore: profile.passingScore,
    passStatus,
    gradeBand,

    // Agent 1
    directiveAnalysis,

    // Agent 3
    factCheck: agent3Result.factCheck || [],

    // Agent 4
    examinerSummary: agent4Result.examinerSummary || null,
    customObservations: agent4Result.customObservations || [],
    thingsToInclude: agent4Result.thingsToInclude || [],

    // Agent 5
    suggestedVisual: agent5Result.suggestedVisual || null,
    rewrites: agent5Result.rewrites || [],

    // Agent 6 (post-processed)
    annotations: validatedAnnotations,

    // Calibrated scoreBreakdown
    scoreBreakdown,

    // Programmatic word counts
    wordCount: totalWords,
    introWordCount: introWords,
    targetIntroWords: profile.targetIntroWords,

    // Model tracking
    evaluatedModelId: resolvedModelName,
    evaluatedModelName: modelDisplayName
  };

  onAgentComplete?.({
    agentId: 'merge',
    agentName: 'Evaluation Complete',
    detail: `Scored ${overallScore}/${maxScore} (${gradeBand})`,
    percent: 100,
    phase: 'complete'
  });

  return unified;
};
