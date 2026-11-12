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

  // Provide weak/flawed paragraphs + thesis to Agent 4 for Surgical Rewrites
  const sampleParagraphsForRewrite = preprocessed.paragraphs
    .map((p) => `[${p.id} | Role: ${agent1Output.paragraphRoleMap?.[p.id] || 'BODY_MAIN'} | ${p.wordCount}w]: ${p.fullText}`)
    .join('\n\n');

  return `
You are Agent 4: FPSC CHIEF EXAMINER QA VERIFIER & SURGICAL WRITING COACH.
Your job is to act as the final quality-assurance gatekeeper over Agents 1, 2, and 3, eliminate every false positive, and coach the candidate with surgical "Before → After" rewrites.

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
7. Delete any flag demanding "Hence" or "Therefore" in a paragraph's concluding sentence.
8. Delete any flag penalizing "committing mistakes" or "commit an error" (which is 100% valid formal English) or flagging literal fainting uses of "pass out".
9. Delete any flag that accuses a candidate of "fabricating" a quote without proof; ensure unverified/paraphrased quotes are at most 🔵 "TIER_3_POLISH".
10. Delete duplicate flags where Agent 2 and Agent 3 flagged the exact same phrase/sentence for the same issue.
11. Verify that every surviving annotation's "exact_verbatim_quote" actually appears in the candidate's text.

=== RAW DIAGNOSTIC FLAGS FROM AGENTS 1, 2 & 3 (${combinedCandidateFlags.length} items) ===
${JSON.stringify(combinedCandidateFlags, null, 2)}

=== CANDIDATE OUTLINE & PARAGRAPHS (FOR VERIFICATION & SURGICAL REWRITES) ===
Outline:
${preprocessed.outlineNodes.map((o) => o.taggedText).join('\n') || '(No outline)'}

Paragraphs:
${sampleParagraphsForRewrite || '(Outline-only submission)'}
=============================================================================

YOUR 5 CORE TASKS:
1. AUDIT & FILTER DIAGNOSTICS ("verifiedDiagnostics" & "qaAuditLog"):
   - Review all raw flags from Agents 1–3.
   - Record how many false positives or duplicates you deleted in "qaAuditLog".
   - Output the clean, verified diagnostics categorized by tier:
     * "TIER_1_FATAL" (🔴 Fatal Deal-Breaker)
     * "TIER_2_MAJOR" (🟠 Structural / Analytical Risk)
     * "TIER_3_POLISH" (🔵 Polish & Topper Upgrade)
     * "EARNED_SIGNIFIER" (🟢 Earned Topper Signifier — strictly when earned with an exact verbatim quote; zero generic praise!)

2. GENERATE 3–4 SURGICAL "BEFORE → AFTER" REWRITES ("surgicalRewrites"):
   - Rewrite #1: The candidate's Thesis Statement (if weak, vague, one-dimensional, or missing) upgraded into a 70+ mark CSS Qualifier Thesis Statement.
   - Rewrites #2–#4: Select the 2–3 weakest Topic Sentences or Body Paragraphs (or Outline Sections if Outline-Only) from the candidate's script (e.g., a Grafted paragraph, a Mode-Lock failure, a Hawai-Firing paragraph, or a weak Topic Sentence).
   - For each rewrite, provide:
     * "locationId": e.g. "Thesis Statement (P1)", "P4 (Body Paragraph)", "P7.S1 (Topic Sentence)"
     * "targetType": "THESIS" | "TOPIC_SENTENCE" | "BODY_PARAGRAPH" | "OUTLINE_SECTION"
     * "issueDiagnosed": Specific flaw in the student's original version
     * "original": Exact verbatim original text written by the student
     * "basic": Grammar-corrected version keeping the student's simple phrasing
     * "cssStandard": Solid 50-mark CSS pass version with clear academic structure
     * "highScorer": 70+ mark FPSC Qualifier version (demonstrating clear analytical claim, causal mechanism, integrated proof, and natural closure—keeping the student's own core idea!)
     * "whatChanged": 1–2 sentences explaining the exact surgical technique used so the student learns how to replicate it.

3. GENERATE INLINE ANNOTATIONS FOR PAPER VIEWER ("annotations"):
   - Convert the top 14–20 verified diagnostics into inline paper callouts:
     * "type": "red" (for TIER_1_FATAL and TIER_2_MAJOR), "amber" (for TIER_3_POLISH), "green" (for EARNED_SIGNIFIER).
     * "targetPhrase": MUST be an EXACT 2 to 10 word verbatim substring copied from the candidate's text so the UI highlighter matches it 100% accurately.

4. DESIGN MODEL TOPPER OUTLINE BLUEPRINT ("suggestedVisual") & REMEDIAL DIRECTIVES ("thingsToInclude"):
   - Provide 4–5 high-impact remedial directives / missing analytical dimensions in "thingsToInclude".
   - Build a clean Unicode tree "Model FPSC Topper Outline Blueprint" for "${examQuestion}" using ├──, └──, │.

5. EXECUTIVE READINESS VERDICT (ZERO NUMERICAL SCORES):
   - "overallReadiness": Choose one:
     * "Competitive Qualifier Draft" (0 Fatal Deal-Breakers, strong structure & argument)
     * "Balanced Draft — Structural Risks to Resolve" (0–1 Fatal Deal-Breakers, moderate Tier 2 issues)
     * "High-Risk Draft — Fatal Deal-Breakers Detected" (Multiple Tier 1 Fatal Deal-Breakers)
   - "examinerSummary": 3–4 authoritative, non-sycophantic sentences summarizing the essay's exact standing, its strongest earned quality, and the #1 priority to fix.

Return ONLY this JSON object:
{
  "overallReadiness": "Competitive Qualifier Draft" | "Balanced Draft — Structural Risks to Resolve" | "High-Risk Draft — Fatal Deal-Breakers Detected",
  "examinerSummary": "string",
  "qaAuditLog": {
    "totalFlagsReviewed": 0,
    "falsePositivesDeleted": 0,
    "deletionNotes": ["string (Brief note on any false positive or duplicate deleted)"]
  },
  "verifiedDiagnostics": [
    {
      "location_id": "string (e.g. O3, P4.S2)",
      "exact_verbatim_quote": "string (Exact verbatim quote from student text)",
      "tier": "TIER_1_FATAL" | "TIER_2_MAJOR" | "TIER_3_POLISH" | "EARNED_SIGNIFIER",
      "category": "string",
      "observation": "string",
      "suggested_fix": "string",
      "micro_rule": "string"
    }
  ],
  "surgicalRewrites": [
    {
      "locationId": "string (e.g. P1 Thesis, P4 Body Paragraph)",
      "targetType": "THESIS" | "TOPIC_SENTENCE" | "BODY_PARAGRAPH" | "OUTLINE_SECTION",
      "issueDiagnosed": "string",
      "original": "string (Exact verbatim original)",
      "basic": "string",
      "cssStandard": "string",
      "highScorer": "string (70+ Mark CSS Qualifier Rewrite)",
      "whatChanged": "string"
    }
  ],
  "annotations": [
    {
      "id": "ann-1",
      "locationId": "string (e.g. P2.S1)",
      "tier": "TIER_1_FATAL" | "TIER_2_MAJOR" | "TIER_3_POLISH" | "EARNED_SIGNIFIER",
      "targetPhrase": "string (EXACT 2-10 word verbatim substring from candidate script)",
      "type": "red" | "amber" | "green",
      "category": "string",
      "comment": "string",
      "suggestion": "string or null",
      "microLesson": "string"
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
    maxOutputTokens: 6144,
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
    annotations: Array.isArray(result?.annotations) ? result.annotations : [],
    thingsToInclude: Array.isArray(result?.thingsToInclude)
      ? result.thingsToInclude
      : [],
    suggestedVisual: result?.suggestedVisual || null
  };
};
