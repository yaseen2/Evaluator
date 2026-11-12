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
import { GUARDRAIL_EXCEPTIONS } from './essayRubricConfig.js';

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
You are Agent 4: FPSC CHIEF EXAMINER QA VERIFIER & SURGICAL WRITING COACH.
Your job is to act as the final quality-assurance gatekeeper over Agents 1, 2, and 3, eliminate every false positive, and coach the candidate with surgical "Before → After" rewrites.

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
    ? `- Handwritten Physical Layout Audit: ${JSON.stringify(handwritingAudit)}`
    : '- Input Type: Typed Digital Text (Handwritten physical layout rules disabled)'
}

=== MANDATORY QA DELETION RULES (DELETE ANY FLAG THAT VIOLATES THESE) ===
${GUARDRAIL_EXCEPTIONS.map((g, i) => `${i + 1}. ${g}`).join('\n')}
7. Delete any flag demanding 'Hence' or 'Therefore' in a paragraph's concluding sentence.
8. Delete any flag penalizing 'committing mistakes' or 'commit an error' (which is 100% valid formal English) or flagging literal fainting uses of 'pass out'.
9. Delete any flag that accuses a candidate of 'fabricating' a quote without proof; ensure unverified/paraphrased quotes are at most 🔵 'TIER_3_POLISH'.
10. Delete duplicate flags where Agent 2 and Agent 3 flagged the exact same phrase/sentence for the same issue.

=== RAW DIAGNOSTIC FLAGS FROM AGENTS 1, 2 & 3 (${combinedCandidateFlags.length} items) ===
${JSON.stringify(combinedCandidateFlags, null, 2)}

=== CANDIDATE OUTLINE & TARGET PARAGRAPHS FOR SURGICAL REWRITES ===
Outline:
${preprocessed.outlineNodes.map((o) => o.taggedText).join('\n') || '(No outline)'}

Target Paragraphs:
${targetParagraphsText}
===================================================================

YOUR 4 CORE TASKS:
1. AUDIT & FILTER DIAGNOSTICS ("verifiedDiagnostics" & "qaAuditLog"):
   - Review all raw flags from Agents 1–3.
   - Delete any false positive, hallucinated rule, or duplicate flag and record the count in "qaAuditLog".
   - Keep the top 14–20 highest-value verified items categorized by tier:
     * "TIER_1_FATAL" (🔴 Fatal Deal-Breaker)
     * "TIER_2_MAJOR" (🟠 Structural / Analytical Risk)
     * "TIER_3_POLISH" (🔵 Polish & Topper Upgrade)
     * "EARNED_SIGNIFIER" (🟢 Earned Topper Signifier — strictly when earned with an exact verbatim quote; zero generic praise!)
   - Ensure every item's "exact_verbatim_quote" is a concise 2 to 10 word verbatim phrase from the candidate's script.

2. GENERATE 3–4 SURGICAL "BEFORE → AFTER" REWRITES ("surgicalRewrites"):
   - Rewrite #1: The candidate's Thesis Statement (if weak, vague, one-dimensional, or missing) upgraded into a 70+ mark CSS Qualifier Thesis Statement.
   - Rewrites #2–#3: Select 2 weak Topic Sentences or Body Paragraphs from the Target Paragraphs above (or Outline Sections if Outline-Only).
   - Provide "locationId", "targetType", "issueDiagnosed", "original", "basic", "cssStandard", "highScorer", and "whatChanged".

3. DESIGN MODEL TOPPER OUTLINE BLUEPRINT ("suggestedVisual") & REMEDIAL DIRECTIVES ("thingsToInclude"):
   - Provide 3–4 high-impact remedial directives in "thingsToInclude" formatted as 'Action Title: Specific directive'.
   - Build a clean Unicode tree "Model FPSC Topper Outline Blueprint" for "${examQuestion}" using ├──, └──, │.

4. EXECUTIVE READINESS VERDICT (ZERO NUMERICAL SCORES):
   - "overallReadiness": "Competitive Qualifier Draft" | "Balanced Draft — Structural Risks to Resolve" | "High-Risk Draft — Fatal Deal-Breakers Detected"
   - "examinerSummary": 3–4 authoritative, non-sycophantic sentences summarizing the essay's exact standing, its strongest earned quality, and the #1 priority to fix.

Return ONLY this JSON object:
{
  "overallReadiness": "Competitive Qualifier Draft" | "Balanced Draft — Structural Risks to Resolve" | "High-Risk Draft — Fatal Deal-Breakers Detected",
  "examinerSummary": "string",
  "qaAuditLog": {
    "totalFlagsReviewed": 0,
    "falsePositivesDeleted": 0,
    "deletionNotes": ["string"]
  },
  "verifiedDiagnostics": [
    {
      "location_id": "string (e.g. O3, P4.S2)",
      "exact_verbatim_quote": "string (EXACT 2-10 word verbatim substring from student text)",
      "tier": "TIER_1_FATAL" | "TIER_2_MAJOR" | "TIER_3_POLISH" | "EARNED_SIGNIFIER",
      "category": "string",
      "observation": "string",
      "suggested_fix": "string",
      "micro_rule": "string"
    }
  ],
  "surgicalRewrites": [
    {
      "locationId": "string (e.g. P1 Thesis, P3 Body Paragraph)",
      "targetType": "THESIS" | "TOPIC_SENTENCE" | "BODY_PARAGRAPH" | "OUTLINE_SECTION",
      "issueDiagnosed": "string",
      "original": "string (Exact verbatim original)",
      "basic": "string",
      "cssStandard": "string",
      "highScorer": "string (70+ Mark CSS Qualifier Rewrite)",
      "whatChanged": "string"
    }
  ],
  "thingsToInclude": [
    "string (Format as 'Action Title: Specific analytical or structural directive')"
  ],
  "suggestedVisual": {
    "title": "string",
    "description": "string",
    "insertAfterHeading": "Outline",
    "diagramText": "string (Unicode tree blueprint using ├──, └──, │)"
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
      result?.overallReadiness || 'Balanced Draft — Structural Risks to Resolve',
    examinerSummary: result?.examinerSummary || '',
    qaAuditLog: result?.qaAuditLog || {
      totalFlagsReviewed: 0,
      falsePositivesDeleted: 0,
      deletionNotes: []
    },
    verifiedDiagnostics: Array.isArray(result?.verifiedDiagnostics)
      ? result.verifiedDiagnostics
      : [],
    surgicalRewrites: Array.isArray(result?.surgicalRewrites)
      ? result.surgicalRewrites
      : [],
    thingsToInclude: Array.isArray(result?.thingsToInclude)
      ? result.thingsToInclude
      : [],
    suggestedVisual: result?.suggestedVisual || null
  };
};
