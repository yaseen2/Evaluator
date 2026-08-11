/**
 * Sequential Multi-Agent FPSC Evaluation Engine
 * 
 * Architecture:
 *   Phase 1 (Parallel):  Agent 1 (Directive & Scope) + Agent 2 (Transcription)
 *   Phase 2 (Parallel):  Agent 3 (Facts) + Agent 4 (Causality) + Agent 5 (Visuals) + Agent 6 (Annotations)
 *   Final:               Merge + Post-Processing Validation
 * 
 * Each agent gets 100% focused attention via its own dedicated Gemini API call.
 */

import { FPSC_EXAMINER_CRITERIA } from './fpscRubrics';

const API_KEY_STORAGE_KEY = 'css_evaluator_gemini_api_key';
const MODEL_STORAGE_KEY = 'css_evaluator_gemini_model';

export const AVAILABLE_MODELS = [
  { id: 'auto', name: '⚡ Auto (Fastest & Smartest Failover)' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash (Next-Gen Ultra Fast)' },
  { id: 'gemini-3.5-pro', name: 'Gemini 3.5 Pro (Deep Multimodal Reasoning)' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Recommended)' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' }
];

export const getStoredApiKey = () => localStorage.getItem(API_KEY_STORAGE_KEY) || '';
export const setStoredApiKey = (key) => localStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
export const getStoredModel = () => localStorage.getItem(MODEL_STORAGE_KEY) || 'auto';
export const setStoredModel = (modelId) => localStorage.setItem(MODEL_STORAGE_KEY, modelId);

const MODEL_CANDIDATES = [
  'gemini-3.5-flash',
  'gemini-3.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash'
];

let monthlyGroundingUsage = { count: 0, limit: 5000, lastReset: new Date().toISOString() };
export const getGroundingUsage = () => monthlyGroundingUsage;

/**
 * 100% Programmatic JavaScript Word Counter — eliminates AI hallucinations.
 */
export const countWords = (text) => {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
};

/**
 * Human-readable display name from model ID.
 */
const getModelDisplayName = (modelName) => {
  if (modelName.includes('3.5-pro')) return 'Gemini 3.5 Pro';
  if (modelName.includes('3.5-flash')) return 'Gemini 3.5 Flash';
  if (modelName.includes('2.5-pro')) return 'Gemini 2.5 Pro';
  if (modelName.includes('2.5-flash')) return 'Gemini 2.5 Flash';
  if (modelName.includes('2.0-flash')) return 'Gemini 2.0 Flash';
  return modelName;
};

// ─────────────────────────────────────────────────────────────
// GENERIC AGENT CALLER — One focused API call per agent
// ─────────────────────────────────────────────────────────────

/**
 * Makes a single focused Gemini API call for one agent.
 * @param {Object} options
 * @param {string} options.prompt - The agent's focused system prompt
 * @param {string} options.apiKey - Gemini API key
 * @param {string} options.modelName - Model to use
 * @param {Array} [options.imageArray] - Optional images (only needed for Phase 1)
 * @param {string} [options.text] - Optional candidate text input
 * @param {number} [options.maxTokens] - Max output tokens for this agent
 * @param {number} [options.temperature] - Temperature for this agent
 * @returns {Object} Parsed JSON response from the agent
 */
const callSingleAgent = async ({ prompt, apiKey, modelName, imageArray, text, maxTokens = 4096, temperature = 0.2 }) => {
  const parts = [];

  // Attach images only if provided (Phase 1 agents)
  if (imageArray && imageArray.length > 0) {
    imageArray.forEach((imgData) => {
      const base64Data = imgData.replace(/^data:image\/\w+;base64,/, '');
      parts.push({
        inlineData: { mimeType: 'image/jpeg', data: base64Data }
      });
    });
  }

  // Attach candidate text if provided
  if (text) {
    parts.push({ text: `Candidate Answer Script Text:\n${text}` });
  }

  // Attach the agent's focused prompt
  parts.push({ text: prompt });

  const payload = {
    contents: [{ parts }],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      responseMimeType: "application/json"
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

  return JSON.parse(rawText);
};

/**
 * Tries calling an agent across multiple model candidates with failover.
 */
const callAgentWithFailover = async ({ prompt, apiKey, candidateList, imageArray, text, maxTokens, temperature }) => {
  let lastError = null;
  for (const modelName of candidateList) {
    try {
      const result = await callSingleAgent({ prompt, apiKey, modelName, imageArray, text, maxTokens, temperature });
      return { result, modelName };
    } catch (err) {
      console.warn(`Agent failed on ${modelName}:`, err.message);
      lastError = err;
    }
  }
  throw new Error(`Agent failed across all models: ${lastError?.message || 'Unknown error'}`);
};


// ─────────────────────────────────────────────────────────────
// AGENT PROMPT BUILDERS — Each returns a focused, short prompt
// ─────────────────────────────────────────────────────────────

const buildAgent1Prompt = (subject, examQuestion) => `
You are Agent 1: QUESTION DIRECTIVE & SCOPE AUDITOR for the FPSC CSS Competitive Examination.

Subject: ${subject || 'CSS Examination'}
FPSC Exam Question: "${examQuestion}"

YOUR SINGLE TASK:
- Identify the directive word (Discuss, Analyze, Critically Examine, Compare, Explain, etc.).
- Identify the required dimension (Political, Economic, Social, Cultural, etc.).
- Identify the target timeframe or historical period if applicable.
- Verify if the candidate's answer directly addresses the directive (e.g., actual discussion vs generic narrative).
- Provide brief feedback on alignment.

Return ONLY this JSON:
{
  "directiveAnalysis": {
    "directiveWord": string,
    "targetTimeframe": string or null,
    "requiredDimensions": string,
    "alignmentStatus": "Aligned" | "Partially Aligned" | "Off-Topic",
    "feedback": string
  }
}
`;

const buildAgent2Prompt = () => `
You are Agent 2: DIGITIZER & TRANSCRIPTION SPECIALIST for FPSC CSS examination answer scripts.

YOUR SINGLE TASK:
- Transcribe the FULL candidate answer script text verbatim.
- Preserve all paragraphs, headings, numbering, and formatting.
- Identify the main topic/title of the paper.
- Do NOT evaluate, correct, or comment on the content. Just transcribe faithfully.

Return ONLY this JSON:
{
  "topic": string (the main title/heading of the paper),
  "fullTranscribedText": string (the ENTIRE transcribed text preserving paragraphs and headings)
}
`;

const buildAgent3Prompt = (transcribedText, subject, examQuestion) => `
You are Agent 3: HISTORICAL ACCURACY & FACTUAL VERIFIER for FPSC CSS ${subject || 'Examination'}.
Exam Question: "${examQuestion}"

CANDIDATE'S TRANSCRIBED ANSWER:
---
${transcribedText}
---

YOUR SINGLE TASK:
- Cross-check ALL historical dates, caliphate eras, personalities, treaty names, and historical claims in the text above.
- For each verifiable historical claim, state whether it is correct or incorrect.
- If incorrect, provide the corrected fact with a brief source reference.
- Flag any factual blunder, treaty mixing, or reform confusion.
- Be thorough — check EVERY claim, not just obvious ones.

FPSC EXAMINER DIRECTIVES:
- CSS 2020: "Penalize severely for historical event blunders."
- CSS 2019: "Penalize for quoting casual traditional stories having no academic value."

Return ONLY this JSON:
{
  "factCheck": [
    {
      "claim": string (the exact claim from the text),
      "verified": boolean,
      "correctedFact": string or null (correction if verified is false),
      "source": string (brief reference like "Historical consensus", "Ibn Khaldun, Muqaddimah", etc.)
    }
  ]
}
`;

const buildAgent4Prompt = (transcribedText, subject, examQuestion, directiveAnalysis) => `
You are Agent 4: STRUCTURAL CAUSALITY & ANALYTICAL DEPTH SPECIALIST for FPSC CSS ${subject || 'Examination'}.
Exam Question: "${examQuestion}"
Directive Word: "${directiveAnalysis?.directiveWord || 'Discuss'}"
Required Dimensions: "${directiveAnalysis?.requiredDimensions || 'General'}"

CANDIDATE'S TRANSCRIBED ANSWER:
---
${transcribedText}
---

YOUR SINGLE TASK:
1. RIGOROUSLY AUDIT STRUCTURAL CAUSALITY ("WHY & HOW" vs "WHAT"):
   - Distinguish weak elementary storytelling ("First X happened, then Y happened, then Z died") from high-scoring STRUCTURAL CAUSALITY ("The structural absence of central state apparatus incentivized inter-tribal raid economics...").
   - Evaluate whether the candidate explains systemic root causes, institutional dynamics, and socio-economic drivers behind historical events.

2. Generate actionable "thingsToInclude" — specific structural cause-effect arguments, systemic root causes, or historical context the candidate should add to elevate their paper.

3. Provide an overall "examinerSummary" — a high-level qualitative synthesis summarizing core strengths, flaws, and trajectory.

4. Add "customObservations" — your autonomous insights on any unique aspect of the paper (original synthesis, historiographical depth, argumentative flow, etc.).

5. Evaluate "critical_analysis" status for the scoreBreakdown.

FPSC EXAMINER DIRECTIVES:
- CSS 2018: "Major weakness is lack of analytical sense."
- CSS 2017: "Scripts offered neither analysis nor focus, relying on superficial knowledge."

Return ONLY this JSON:
{
  "examinerSummary": string or null,
  "customObservations": [
    {
      "category": string (e.g. "Historiographical Depth", "Argumentative Flow", "Original Synthesis"),
      "observation": string,
      "type": "strength" | "concern" | "recommendation"
    }
  ],
  "thingsToInclude": [
    string (specific actionable structural cause-effect suggestions)
  ],
  "scoreBreakdown_critical_analysis": {
    "status": "Satisfactory" | "Needs Improvement" | "Missing",
    "feedback": string
  }
}
`;

const buildAgent5Prompt = (transcribedText, subject) => `
You are Agent 5: HEADINGS & CONTEXTUAL VISUAL ARCHITECT for FPSC CSS ${subject || 'Examination'}.

CANDIDATE'S TRANSCRIBED ANSWER:
---
${transcribedText}
---

YOUR SINGLE TASK:
1. Audit all headings in the candidate's answer:
   - Are they descriptive academic titles (e.g. "Nomadic Pastoralism: Environmental Aridity & Subsistence Economy") or weak generic labels (e.g. "Economy")?
   - Provide specific feedback.

2. Design ONE "suggestedVisual" — a flowchart or diagram that would strengthen the paper:
   - Provide a title, description of why it helps, the exact section heading after which it should be inserted, and a clean text/ascii/mermaid diagram.

3. Evaluate "headings" and "diagrams" status for the scoreBreakdown.

Return ONLY this JSON:
{
  "suggestedVisual": {
    "title": string,
    "description": string,
    "insertAfterHeading": string (exact section heading string from the text),
    "diagramText": string (clean ascii/mermaid flowchart)
  },
  "scoreBreakdown_headings": {
    "status": "Satisfactory" | "Needs Improvement" | "Missing",
    "feedback": string
  },
  "scoreBreakdown_diagrams": {
    "status": "Satisfactory" | "Needs Improvement" | "Missing",
    "feedback": string
  }
}
`;

const buildAgent6Prompt = (transcribedText) => `
You are Agent 6: UNIVERSAL ERROR & STRENGTH HIGHLIGHTER — a meticulous line-by-line proofreader and analytical auditor.

CANDIDATE'S TRANSCRIBED ANSWER:
---
${transcribedText}
---

YOUR SINGLE TASK:
Generate COMPREHENSIVE annotations across ALL these categories. Be thorough — scan every single sentence:

a) **Factual & Historical Errors** (type: "red") — Wrong dates, misattributed events, incorrect personalities.
b) **English Grammar & Syntax Errors** (type: "red") — Spelling mistakes, subject-verb disagreement, wrong tense, missing articles, run-on sentences, missing punctuation, capitalization errors.
c) **Weak Storytelling & Lack of Structural Causality** (type: "amber") — Elementary chronological narration without explaining systemic causes.
d) **Diction & Academic Register** (type: "amber") — Informal language, imprecise translations, colloquialisms.
e) **Technical Terminology & Strong Analytical Arguments** (type: "green") — Excellent use of academic vocabulary, structural analysis, cause-effect reasoning.

CRITICAL REQUIREMENTS:
1. Each annotation MUST quote an EXACT 3-10 word substring that appears VERBATIM in the transcribed text above as "targetPhrase". Copy-paste it exactly — same capitalization, same spelling, same punctuation.
2. Provide at least 8-15 annotations covering multiple categories. Cover the entire text, not just the first paragraph.
3. For grammar errors, quote the exact erroneous phrase and explain what's wrong.
4. For strengths, quote the exact strong phrase and explain why it's effective.

Also evaluate:
- "introduction" status: Does the intro meet the 100-word substantive threshold?
- "grammar_syntax" status: Overall English quality assessment.

Return ONLY this JSON:
{
  "annotations": [
    {
      "id": string (unique like "ann-1", "ann-2", etc.),
      "targetPhrase": string (EXACT 3-10 word verbatim substring from the text above),
      "type": "red" | "amber" | "green",
      "category": string (e.g. "Factual Error", "Grammar & Syntax", "Weak Storytelling", "Diction & Register", "Technical Terminology", "Strong Argument", "Structural Causality"),
      "comment": string (clear diagnostic explanation),
      "suggestion": string or null (recommended fix or encouragement)
    }
  ],
  "scoreBreakdown_introduction": {
    "status": "Satisfactory" | "Needs Improvement" | "Missing",
    "feedback": string
  },
  "scoreBreakdown_grammar_syntax": {
    "status": "Satisfactory" | "Needs Improvement" | "Missing",
    "feedback": string
  }
}
`;


// ─────────────────────────────────────────────────────────────
// STAGE 1: ULTRA LIGHTWEIGHT QUESTION PRE-CHECK (150 tokens)
// ─────────────────────────────────────────────────────────────

export const detectExamQuestionPreCheck = async ({ text, imageArray, apiKey }) => {
  const effectiveKey = apiKey || getStoredApiKey();
  if (!effectiveKey) return { hasQuestion: false, extractedQuestion: null };

  const contents = [];
  const parts = [];

  if (text) {
    parts.push({ text: `Answer Script Text snippet:\n${text.substring(0, 800)}` });
  }

  if (imageArray && imageArray.length > 0) {
    const base64Data = imageArray[0].replace(/^data:image\/\w+;base64,/, '');
    parts.push({
      inlineData: { mimeType: 'image/jpeg', data: base64Data }
    });
  }

  parts.push({
    text: `Look at page 1 header snippet or text above. Is there an explicit FPSC exam question or essay title written on paper or typed? 
Return JSON: {"hasQuestion": boolean, "extractedQuestion": string or null}`
  });

  contents.push({ parts });

  const payload = {
    contents,
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 150,
      responseMimeType: "application/json"
    }
  };

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${effectiveKey}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        return JSON.parse(rawText);
      }
    }
  } catch (e) {
    console.warn('Question pre-check failed:', e);
  }

  return { hasQuestion: false, extractedQuestion: null };
};


// ─────────────────────────────────────────────────────────────
// POST-PROCESSING: Validate annotations against transcribed text
// ─────────────────────────────────────────────────────────────

/**
 * Removes annotations whose targetPhrase doesn't actually exist in the text.
 * This eliminates broken highlights caused by AI hallucinating phrases.
 */
const validateAnnotations = (annotations, fullText) => {
  if (!annotations || !fullText) return [];

  const textLower = fullText.toLowerCase();

  return annotations.filter(ann => {
    if (!ann.targetPhrase || ann.targetPhrase.trim().length < 2) return false;

    // Case-insensitive check: does this exact phrase exist in the text?
    const phraseExists = textLower.includes(ann.targetPhrase.toLowerCase());

    if (!phraseExists) {
      console.warn(`[Post-Processing] Removed orphaned annotation: "${ann.targetPhrase}" — not found in transcribed text`);
    }

    return phraseExists;
  });
};


// ─────────────────────────────────────────────────────────────
// MAIN ORCHESTRATOR: executeMultiAgentPipeline
// ─────────────────────────────────────────────────────────────

/**
 * Executes the full 6-Agent FPSC evaluation pipeline with true sequential/parallel API calls.
 * 
 * @param {Object} options
 * @param {string} options.text - Candidate's typed text
 * @param {Array} options.imageArray - Array of base64 image strings
 * @param {string} options.subject - Subject name
 * @param {string} options.examQuestion - The exam question
 * @param {string} options.apiKey - Gemini API key
 * @param {string} options.selectedModel - User's model choice
 * @param {Function} options.onAgentComplete - Callback when each agent finishes: ({ agentId, agentName, percent })
 * @returns {Object} Unified evaluation object with all agent results merged
 */
export const executeMultiAgentPipeline = async ({ text, imageArray, subject, examQuestion, apiKey, selectedModel, onAgentComplete }) => {
  const effectiveKey = apiKey || getStoredApiKey();
  if (!effectiveKey) throw new Error('NO_API_KEY');

  const userModelChoice = selectedModel || getStoredModel();
  const candidateList = userModelChoice !== 'auto'
    ? [userModelChoice, ...MODEL_CANDIDATES.filter(m => m !== userModelChoice)]
    : MODEL_CANDIDATES;

  let resolvedModelName = candidateList[0]; // Will be updated with first successful model

  // ═══════════════════════════════════════════════════════════
  // PHASE 1: Agent 1 (Directive) + Agent 2 (Transcription) — PARALLEL
  // ═══════════════════════════════════════════════════════════

  onAgentComplete?.({ agentId: 'agent1', agentName: 'Agent 1: Question Directive & Scope Auditor', percent: 5, phase: 'starting' });
  onAgentComplete?.({ agentId: 'agent2', agentName: 'Agent 2: Digitizer & Transcription Specialist', percent: 5, phase: 'starting' });

  const phase1Results = await Promise.all([
    // Agent 1: Directive & Scope (doesn't need transcription, reads raw input)
    callAgentWithFailover({
      prompt: buildAgent1Prompt(subject, examQuestion),
      apiKey: effectiveKey,
      candidateList,
      imageArray,
      text,
      maxTokens: 512,
      temperature: 0.1
    }).then(({ result, modelName }) => {
      resolvedModelName = modelName;
      onAgentComplete?.({ agentId: 'agent1', agentName: 'Agent 1: Question Directive & Scope Auditor', percent: 15, phase: 'complete' });
      return result;
    }),

    // Agent 2: Transcription (reads raw input, produces fullTranscribedText)
    callAgentWithFailover({
      prompt: buildAgent2Prompt(),
      apiKey: effectiveKey,
      candidateList,
      imageArray,
      text,
      maxTokens: 8192,
      temperature: 0.1
    }).then(({ result, modelName }) => {
      resolvedModelName = modelName;
      onAgentComplete?.({ agentId: 'agent2', agentName: 'Agent 2: Digitizer & Transcription Specialist', percent: 35, phase: 'complete' });
      return result;
    })
  ]);

  const agent1Result = phase1Results[0];
  const agent2Result = phase1Results[1];

  const transcribedText = agent2Result.fullTranscribedText || text || '';
  const topic = agent2Result.topic || '';
  const directiveAnalysis = agent1Result.directiveAnalysis || {};

  // ═══════════════════════════════════════════════════════════
  // PHASE 2: Agents 3, 4, 5, 6 — PARALLEL (all receive transcribed text)
  // ═══════════════════════════════════════════════════════════

  onAgentComplete?.({ agentId: 'agent3', agentName: 'Agent 3: Historical Accuracy & Factual Verifier', percent: 40, phase: 'starting' });
  onAgentComplete?.({ agentId: 'agent4', agentName: 'Agent 4: Structural Causality & Analytical Depth', percent: 40, phase: 'starting' });
  onAgentComplete?.({ agentId: 'agent5', agentName: 'Agent 5: Headings & Visual Architect', percent: 40, phase: 'starting' });
  onAgentComplete?.({ agentId: 'agent6', agentName: 'Agent 6: Universal Error & Strength Highlighter', percent: 40, phase: 'starting' });

  const phase2Results = await Promise.all([
    // Agent 3: Factual Verification
    callAgentWithFailover({
      prompt: buildAgent3Prompt(transcribedText, subject, examQuestion),
      apiKey: effectiveKey,
      candidateList,
      maxTokens: 4096,
      temperature: 0.15
    }).then(({ result }) => {
      onAgentComplete?.({ agentId: 'agent3', agentName: 'Agent 3: Historical Accuracy & Factual Verifier', percent: 60, phase: 'complete' });
      return result;
    }),

    // Agent 4: Structural Causality
    callAgentWithFailover({
      prompt: buildAgent4Prompt(transcribedText, subject, examQuestion, directiveAnalysis),
      apiKey: effectiveKey,
      candidateList,
      maxTokens: 4096,
      temperature: 0.25
    }).then(({ result }) => {
      onAgentComplete?.({ agentId: 'agent4', agentName: 'Agent 4: Structural Causality & Analytical Depth', percent: 70, phase: 'complete' });
      return result;
    }),

    // Agent 5: Headings & Visuals
    callAgentWithFailover({
      prompt: buildAgent5Prompt(transcribedText, subject),
      apiKey: effectiveKey,
      candidateList,
      maxTokens: 2048,
      temperature: 0.2
    }).then(({ result }) => {
      onAgentComplete?.({ agentId: 'agent5', agentName: 'Agent 5: Headings & Visual Architect', percent: 80, phase: 'complete' });
      return result;
    }),

    // Agent 6: Annotations (Grammar, Errors, Strengths)
    callAgentWithFailover({
      prompt: buildAgent6Prompt(transcribedText),
      apiKey: effectiveKey,
      candidateList,
      maxTokens: 6144,
      temperature: 0.2
    }).then(({ result }) => {
      onAgentComplete?.({ agentId: 'agent6', agentName: 'Agent 6: Universal Error & Strength Highlighter', percent: 90, phase: 'complete' });
      return result;
    })
  ]);

  const agent3Result = phase2Results[0];
  const agent4Result = phase2Results[1];
  const agent5Result = phase2Results[2];
  const agent6Result = phase2Results[3];

  // ═══════════════════════════════════════════════════════════
  // FINAL: Merge all agent results + Post-Processing Validation
  // ═══════════════════════════════════════════════════════════

  onAgentComplete?.({ agentId: 'merge', agentName: 'Merging & Validating Results', percent: 95, phase: 'starting' });

  // Post-process: validate every annotation targetPhrase exists in text
  const rawAnnotations = agent6Result.annotations || [];
  const validatedAnnotations = validateAnnotations(rawAnnotations, transcribedText);

  console.log(`[Post-Processing] Annotations: ${rawAnnotations.length} raw → ${validatedAnnotations.length} validated (${rawAnnotations.length - validatedAnnotations.length} orphaned removed)`);

  // Deterministic Programmatic Word Counting
  const totalWords = countWords(transcribedText);
  const firstParagraph = transcribedText.split('\n\n')[1] || transcribedText.split('\n\n')[0] || '';
  const introWords = countWords(firstParagraph);

  // Track API usage
  monthlyGroundingUsage.count += 6; // 6 agent calls

  const modelDisplayName = getModelDisplayName(resolvedModelName);

  // Merge into unified evaluation object matching the UI component expectations
  const unified = {
    topic,
    fullTranscribedText: transcribedText,

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

    // Agent 6 (post-processed)
    annotations: validatedAnnotations,

    // Merged scoreBreakdown from Agents 4, 5, 6
    scoreBreakdown: {
      introduction: agent6Result.scoreBreakdown_introduction || { status: 'Needs Improvement', feedback: 'Unable to assess.' },
      headings: agent5Result.scoreBreakdown_headings || { status: 'Needs Improvement', feedback: 'Unable to assess.' },
      diagrams: agent5Result.scoreBreakdown_diagrams || { status: 'Needs Improvement', feedback: 'Unable to assess.' },
      critical_analysis: agent4Result.scoreBreakdown_critical_analysis || { status: 'Needs Improvement', feedback: 'Unable to assess.' },
      grammar_syntax: agent6Result.scoreBreakdown_grammar_syntax || { status: 'Needs Improvement', feedback: 'Unable to assess.' }
    },

    // Programmatic word counts
    wordCount: totalWords,
    introWordCount: introWords,

    // Model tracking
    evaluatedModelId: resolvedModelName,
    evaluatedModelName: modelDisplayName
  };

  onAgentComplete?.({ agentId: 'merge', agentName: 'Evaluation Complete', percent: 100, phase: 'complete' });

  return unified;
};
