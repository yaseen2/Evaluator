/**
 * Stage 2: Agent 4 — Chief Examiner QA Verifier & Surgical Coach (v2.1)
 *
 * 1. Active False-Positive Deletion Gatekeeper:
 *    Audits every diagnostic item from Agents 1, 2, and 3 against its location_id,
 *    exact_verbatim_quote, essayGenre, requiresCounterArgument, and paragraphRoleMap.
 *    DELETES any false-positive grammar nitpicks, hallucinated rules (e.g., "Hence/Therefore"
 *    mandates, penalizing TRANSITION_BRIDGE paragraphs for being short, demanding counter-arguments
 *    when requiresCounterArgument === false, or demanding stats in ABSTRACT_PHILOSOPHICAL essays),
 *    and deduplicates overlapping flags.
 * 2. Extracts Quote-Locked 🟢 Earned Topper Signifiers (zero generic sycophancy).
 * 3. Generates 3–4 "Before → After" Surgical Rewrites (Thesis + 2–3 weakest Topic Sentences / Body Paragraphs).
 */

import { callGenAiAgentWithFailover } from './safeJsonParser.js';
import {
  SHARED_SAFE_HARBOR_DIRECTIVE,
  PLAIN_ENGLISH_AND_TONE_DIRECTIVE
} from './essayRubricConfig.js';

/**
 * Selects P1 (Intro/Thesis) + the 3 most heavily flagged or weakest body paragraphs
 * so Agent 4 only reads the exact paragraphs needed for Surgical Rewrites (~600 tokens instead of 3,000).
 */
const selectTargetParagraphsForRewrite = (preprocessed, agent1Output, agent2Output) => {
  const paras = preprocessed.paragraphs || [];
  if (paras.length === 0) return '(Outline-only submission)';

  const flaggedIds = new Set(
    (agent2Output.paragraphDiagnostics || [])
      .filter((d) => d.tier === 'TIER_1_FATAL' || d.tier === 'TIER_2_MAJOR')
      .map((d) => String(d.location_id || '').split('.')[0])
      .filter(Boolean)
  );

  const selected = [];
  // Always include P1 (Intro / Thesis)
  selected.push(paras[0]);

  // Add up to 3 flagged BODY_MAIN / COUNTER_ARGUMENT paragraphs
  for (const p of paras.slice(1)) {
    if (selected.length >= 4) break;
    if (flaggedIds.has(p.id)) {
      selected.push(p);
    }
  }

  // Fallback: fill remaining slots with body paragraphs
  for (const p of paras.slice(1)) {
    if (selected.length >= 4) break;
    if (!selected.some((s) => s.id === p.id)) {
      selected.push(p);
    }
  }

  return selected
    .map(
      (p) =>
        `[${p.id} | Role: ${agent1Output.paragraphRoleMap?.[p.id] || 'BODY_MAIN'} | ${p.wordCount}w]: ${p.fullText}`
    )
    .join('\n\n');
};

const buildAgent4Prompt = ({
  examQuestion,
  preprocessed,
  agent1Output,
  pacingMetrics,
  agent2Output,
  agent3Output,
  handwritingAudit,
  essayMode = 'full'
}) => {
  const combinedCandidateFlags = [
    ...(agent1Output.macroDiagnostics || []).map((d) => ({ source: 'Agent1_Macro', ...d })),
    ...(agent2Output.paragraphDiagnostics || []).map((d) => ({ source: 'Agent2_Paragraph', ...d })),
    ...(agent3Output.languageAndFactDiagnostics || []).map((d) => ({ source: 'Agent3_LanguageFact', ...d }))
  ];

  const targetParagraphsText = selectTargetParagraphsForRewrite(
    preprocessed,
    agent1Output,
    agent2Output
  );

  return `
You are Agent 4: Final Quality Checker & Supportive Essay Coach (v3.3).
Your job is to remove false alarms from Agents 1–3, simplify every feedback note into everyday English for Pakistani students, and write helpful rewrites.

CRITICAL JSON FORMATTING RULE:
Never use unescaped double quotes (") inside JSON string values; always use single quotes ('...') when quoting words or phrases inside a string.

=== ESSAY CONTEXT ===
- Essay Topic: "${examQuestion}"
- Submission Mode: ${essayMode === 'outline_only' ? 'OUTLINE & THESIS ONLY' : 'FULL CSS ESSAY'}
- Essay Genre: ${agent1Output.essayGenre}
- Requires Counter-Argument: ${agent1Output.requiresCounterArgument}
- Extracted Thesis: "${agent1Output.thesisAudit?.extractedThesis || 'Not explicitly stated'}"
- Paragraph Role Map: ${JSON.stringify(agent1Output.paragraphRoleMap)}
- Role-Filtered Pacing Decay: ${pacingMetrics.summary}
${
  handwritingAudit
    ? `- Objective Paper Layout Check: ${JSON.stringify(handwritingAudit)}`
    : '- Input Type: Typed Digital Text (Paper layout checks disabled)'
}

=== MANDATORY QA DELETION & SEVERITY RULES ===
${SHARED_SAFE_HARBOR_DIRECTIVE}
${PLAIN_ENGLISH_AND_TONE_DIRECTIVE}
5. Delete any flag that accuses a candidate of 'fabricating' a quote without proof; keep unverified/paraphrased quotes at most 🔵 'TIER_3_POLISH'.
6. Ensure 'important', 'key', 'big', or 'huge' are NEVER TIER_1_FATAL or TIER_2_MAJOR (keep at most as 🔵 'TIER_3_POLISH' word-upgrade tip, or delete if noisy).
7. Delete duplicate flags where Agent 2 and Agent 3 flagged the exact same phrase/sentence for the same issue.
8. PROTECT CRITICAL GRAMMAR FLAGS: NEVER delete genuine English grammar, tense, agreement, preposition, article, punctuation, or syntax errors (keep them as 🟠 'TIER_2_MAJOR' or 🔴 'TIER_1_FATAL' when repeated/meaning-breaking).
9. DOWNGRADE NON-MANDATORY PREFERENCES: Ensure any flag for omitting an optional Counter-Argument, writing a 2-paragraph Intro, or placing the Thesis early inside P1 instead of the end of P1 is NEVER TIER_1_FATAL or TIER_2_MAJOR (keep strictly at 🔵 'TIER_3_POLISH' or remove if unhelpful).

=== RAW DIAGNOSTIC FLAGS FROM AGENTS 1, 2 & 3 (${combinedCandidateFlags.length} items) ===
${JSON.stringify(combinedCandidateFlags, null, 2)}

=== CANDIDATE OUTLINE & TARGET PARAGRAPHS FOR REWRITES ===
Outline:
${preprocessed.outlineNodes.map((o) => o.taggedText).join('\n') || '(No outline)'}

Target Paragraphs:
${targetParagraphsText}
===================================================================

YOUR 5 CORE TASKS:
1. AUDIT, SIMPLIFY & FILTER DIAGNOSTICS ("verifiedDiagnostics" & "qaAuditLog"):
   - Review all raw flags from Agents 1–3.
   - Delete any false positive or duplicate flag and record the exact count in "qaAuditLog".
   - Rewrite EVERY kept item's "category" (2–4 words) and "observation" (1–2 short sentences, max 28 words) into warm, crystal-clear everyday English using "you"/"your".
   - STRICT CLEANUP FILTER: Strip out ANY "O1/O15/P1/P2/P1.S5" codes, "FPSC", "the candidate", "examiner", and difficult jargon ("definite/indefinite article", "countable noun", "determiner", "syntax", "introductory funnel", "terminal sentence", "thesis architecture", "premature termination") from every student-facing string!
   - TIGHT 1–4 WORD QUOTE RULE: Shrink EVERY "exact_verbatim_quote" to ONLY 1 to 4 exact words showing JUST the wrong word, wrong number/fact, or tiny broken phrase (NEVER underline a full sentence!).
   - Categorize cleanly by tier:
     * "TIER_1_FATAL" (🔴 Serious Mistake)
     * "TIER_2_MAJOR" (🟠 Major Mistake)
     * "TIER_3_POLISH" (🔵 Improvement & Tip)
     * "EARNED_SIGNIFIER" (🟢 Strong Point — strictly when earned with an exact verbatim quote; zero empty praise!)

2. RECALIBRATE PILLAR STATUSES ("recalibratedPillarStatuses"):
   - After deleting false positives above, provide the authoritative calibrated status ("Strong" | "Balanced" | "Needs Polish" | "Critical Gap") ONLY for any pillar whose initial rating was overstated because you deleted its false-positive flags (leave empty object {} if initial pillar ratings remain accurate). Any feedback text must be simple 1-sentence everyday English.

3. GENERATE 3–4 "BEFORE → AFTER" REWRITES ("surgicalRewrites"):
   - Rewrite #1: The student's Thesis Statement (if weak, vague, or missing) upgraded into a clear, strong thesis statement.
   - Rewrites #2–#3: Select 2 weak Topic Sentences or Body Paragraphs from the Target Paragraphs above (or Outline Sections if Outline-Only).
   - Write "locationId" in plain words ("Paragraph 1 Thesis", "Paragraph 3") — NEVER "P1" or "P3".
   - PLAIN ENGLISH REWRITE RULE: Write all rewrites ("basic", "cssStandard", "highScorer") and "whatChanged" in crisp, natural, easy-to-read English that a Pakistani student can learn from right away—NEVER difficult thesaurus words!

4. SAMPLE IMPROVED OUTLINE ("suggestedVisual"), TOP STEPS ("thingsToInclude") & EXAM UNDERLINING PICKS ("strategicHighlightingPicks"):
   - Provide 3–4 practical improvement steps in "thingsToInclude" formatted as 'Simple Title: Short clear step' using "you"/"your".
   - 65% OUTLINE FORMULA FOR WEAK INTRO / CONCLUSION: Whenever the student's Introduction or Conclusion needs improvement, include this practical method in "thingsToInclude": 'Outline-to-Intro & Conclusion Method: You can write ~65% of your Introduction directly from your Outline, and build ~65% of your Conclusion from your Outline (using the remaining 35% of Outline points plus key repeated threads restated clearly).'
   - In "strategicHighlightingPicks", provide 3–5 short key phrases (echoing main Topic keywords—NOT bare numbers) that the student can underline with a marker in the exam.
   - SAMPLE OUTLINE ("suggestedVisual"): Set title to "Sample Improved Outline: ${examQuestion}" and write a short 1-sentence description. Build a clean Unicode tree using ├──, └──, │ in VERY SIMPLE, CLEAR ENGLISH (max 8–10 words per line; strictly AVOID complex words like "demarcating", "quagmire", "rentierism", "hemorrhage", "extractive architecture", or heavy academic jargon).

5. OVERALL DRAFT VERDICT (ZERO NUMERICAL SCORES, SIMPLE ENGLISH):
   - "overallReadiness": "Strong Draft — Ready for Exam" | "Fair Draft — Major Mistakes to Fix" | "Weak Draft — Serious Mistakes to Fix"
   - "examinerSummary": 2–3 friendly, direct sentences using "you"/"your" explaining what you did well and your #1 step to improve next (NO "FPSC", NO "candidate", NO P/O codes).

Return ONLY this JSON object:
{
  "overallReadiness": "Strong Draft — Ready for Exam" | "Fair Draft — Major Mistakes to Fix" | "Weak Draft — Serious Mistakes to Fix",
  "examinerSummary": "string (Simple 2-3 sentences using you/your)",
  "qaAuditLog": {
    "totalFlagsReviewed": 0,
    "falsePositivesDeleted": 0,
    "deletionNotes": ["string"]
  },
  "recalibratedPillarStatuses": {},
  "verifiedDiagnostics": [
    {
      "location_id": "string (e.g. O3, P4.S2 — internal coordinate only)",
      "exact_verbatim_quote": "string (ONLY 1 to 4 exact words pointing to JUST the wrong word/phrase — NEVER a full sentence)",
      "tier": "TIER_1_FATAL" | "TIER_2_MAJOR" | "TIER_3_POLISH" | "EARNED_SIGNIFIER",
      "category": "string (Simple 2-4 word label: Grammar Mistake, Missing 'a' / 'the', Wrong Fact / Data, Unclear Sentence, Outline Missing Point, Strong Point)",
      "observation": "string (1-2 short everyday sentences using 'you'/'your'; ZERO grammar jargon, ZERO P/O codes, ZERO FPSC mentions)"
    }
  ],
  "surgicalRewrites": [
    {
      "locationId": "string (e.g. Paragraph 1 Thesis, Paragraph 3)",
      "targetType": "THESIS" | "TOPIC_SENTENCE" | "BODY_PARAGRAPH" | "OUTLINE_SECTION",
      "issueDiagnosed": "string (Simple 2-5 word label)",
      "original": "string (Exact verbatim original)",
      "basic": "string (Simple fix in natural everyday English)",
      "cssStandard": "string (Clear standard rewrite in easy natural English)",
      "highScorer": "string (Strong, clear, natural top-standard rewrite without dictionary jargon)",
      "whatChanged": "string (1-2 simple sentences using 'you'/'your' explaining what improved)"
    }
  ],
  "strategicHighlightingPicks": [
    "string (Short topic-focused key phrase to underline in the exam)"
  ],
  "thingsToInclude": [
    "string (Format as 'Simple Title: Clear practical tip using you/your')"
  ],
  "suggestedVisual": {
    "title": "string (Sample Improved Outline: ...)",
    "description": "string (1 short sentence in easy English)",
    "insertAfterHeading": "Outline",
    "diagramText": "string (Unicode tree blueprint using ├──, └──, │ in simple everyday English)"
  }
}
`;
};

export const runAgent4QaVerifierCoach = async ({
  examQuestion,
  preprocessed,
  agent1Output,
  pacingMetrics,
  agent2Output,
  agent3Output,
  handwritingAudit = null,
  essayMode = 'full',
  apiKey,
  preferredModel = 'auto',
  ledger = null
}) => {
  const prompt = buildAgent4Prompt({
    examQuestion,
    preprocessed,
    agent1Output,
    pacingMetrics,
    agent2Output,
    agent3Output,
    handwritingAudit,
    essayMode
  });

  const { result } = await callGenAiAgentWithFailover({
    apiKey,
    prompt,
    enableGoogleSearch: false,
    temperature: 0.2,
    maxOutputTokens: 16384,
    preferredModel,
    stageName: 'Agent 4: Chief Examiner QA Verifier & Surgical Coach',
    ledger
  });

  return {
    overallReadiness:
      result?.overallReadiness || 'Fair Draft — Major Mistakes to Fix',
    examinerSummary: result?.examinerSummary || '',
    qaAuditLog: result?.qaAuditLog || {
      totalFlagsReviewed: 0,
      falsePositivesDeleted: 0,
      deletionNotes: []
    },
    recalibratedPillarStatuses: result?.recalibratedPillarStatuses || {},
    verifiedDiagnostics: Array.isArray(result?.verifiedDiagnostics)
      ? result.verifiedDiagnostics
      : null,
    surgicalRewrites: Array.isArray(result?.surgicalRewrites)
      ? result.surgicalRewrites
      : [],
    strategicHighlightingPicks: Array.isArray(result?.strategicHighlightingPicks)
      ? result.strategicHighlightingPicks
      : [],
    thingsToInclude: Array.isArray(result?.thingsToInclude)
      ? result.thingsToInclude
      : [],
    suggestedVisual: result?.suggestedVisual || null
  };
};
