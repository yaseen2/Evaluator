/**
 * Stage 1A: Agent 1 — Macro-Architect & Topic Strategist (v2.1)
 *
 * Runs FIRST (~2 seconds on ~1,200 tokens of macro-sliced input) before Agents 2 & 3.
 * Outputs:
 *   1. essayGenre ('DESCRIPTIVE_ISSUE' | 'ARGUMENTATIVE_DEBATE' | 'RELATIONAL_TWO_CONCEPT' | 'ABSTRACT_PHILOSOPHICAL')
 *   2. requiresCounterArgument (boolean — false for consensus/proverb/universal-axiom prompts, true ONLY for genuinely debatable two-sided propositions)
 *   3. extractedThesis (string)
 *   4. paragraphRoleMap ({ P1: 'INTRO', P2: 'CONTEXT_OVERVIEW' | 'BODY_MAIN', ..., PN: 'CONCLUSION' })
 *   5. Quote-locked macroDiagnostics + headerUpgrades + modelTopperThesis
 */

import { callGenAiAgentWithFailover } from './safeJsonParser.js';
import { ESSAY_GENRE_PLAYBOOKS, GUARDRAIL_EXCEPTIONS } from './essayRubricConfig.js';

const buildAgent1Prompt = ({ examQuestion, preprocessed, essayMode = 'full' }) => `
You are Agent 1: FPSC CSS MACRO-ARCHITECT & TOPIC STRATEGIST.
You evaluate the macro-architecture of an FPSC CSS English Essay with surgical accuracy, zero sycophancy, and zero hallucinated rules.

SUBMISSION MODE: ${essayMode === 'outline_only' ? 'OUTLINE & THESIS ONLY' : 'FULL CSS ESSAY'}

=== MACRO-SLICED CANDIDATE SUBMISSION ===
${preprocessed.macroSliceForAgent1}
=========================================

GENRE PLAYBOOKS:
${JSON.stringify(ESSAY_GENRE_PLAYBOOKS, null, 2)}

MANDATORY GUARDRAIL EXCEPTIONS (DO NOT VIOLATE):
${GUARDRAIL_EXCEPTIONS.map((g, i) => `${i + 1}. ${g}`).join('\n')}

YOUR 6 CORE TASKS:
1. CLASSIFY "essayGenre":
   Choose exact one: "DESCRIPTIVE_ISSUE" | "ARGUMENTATIVE_DEBATE" | "RELATIONAL_TWO_CONCEPT" | "ABSTRACT_PHILOSOPHICAL".

2. DETERMINE "requiresCounterArgument" (boolean):
   - CRITICAL RULE: Full-sentence prompts that express universal consensus, proverbs, or moral/constitutional axioms (e.g., "Democracy and illiteracy cannot move together", "Great nations win without fighting a war", "Instruction in youth is like engraving in stone") do NOT have a credible opposing side—set "requiresCounterArgument": false!
   - Set "requiresCounterArgument": true ONLY when the prompt is a genuinely debatable, controversial two-sided proposition where a reasonable opposing school of thought exists (e.g., "Has democracy failed in Pakistan?", "Not economy, but politics is the key to success", "Globalization has created more inequalities than opportunities").

3. BUILD "paragraphRoleMap" (For all paragraphs P1..P${preprocessed.paragraphs.length}):
   Tag every paragraph ID ("P1", "P2", ..., "P${preprocessed.paragraphs.length}") with its TRUE structural role:
   - "INTRO": Opening introduction paragraph (typically P1).
   - "CONTEXT_OVERVIEW": A single-paragraph contextual/historical/definitional overview matching a secondary Outline heading (typically P2).
   - "BODY_MAIN": Standard substantive argument paragraph developing an outline sub-point.
   - "TRANSITION_BRIDGE": A short 1–3 sentence transitional bridge paragraph connecting two major sections of the essay (e.g., shifting from Causes to Consequences or Way Forward).
   - "COUNTER_ARGUMENT": A paragraph dedicated to addressing and refuting an opposing viewpoint.
   - "CONCLUSION": Final concluding synthesis paragraph (typically P${preprocessed.paragraphs.length}).

4. AUDIT TOPIC DECODING, THESIS STATEMENT & OUTLINE ARCHITECTURE:
   - 80:20 Relevance Rule: Did the candidate dedicate 75–80% of the outline/essay to the exact dimensions demanded by the prompt, or did they dump a pre-memorized general essay ("Theme-Dumping")?
   - Relational "AND" Rule (if RELATIONAL_TWO_CONCEPT): Do major headings and topic sentences explicitly link BOTH Concept A and Concept B?
   - Abstract Playbook (if ABSTRACT_PHILOSOPHICAL): Welcome philosophical/historical/societal levels of analysis. Do NOT demand Causes → Consequences → Government Way Forward! Check if personal proverbs were elevated to societal/historical/international levels.
   - Outline Mechanics:
     * Keyword Echoing: Major headers should echo the prompt's core keywords (via natural synonyms/paraphrasing, not robotic verbatim repetition).
     * Grammatical Parallelism & Exclusivity: Sibling sub-points under a heading should share parallel phrasing and must not overlap.
     * Single Sub-Point Rule (with CONTEXT_OVERVIEW Exception): If a major argumentative section has sub-points, it must have at least two (1.1 and 1.2)—EXCEPT a single contextual overview heading ("2. Contextualizing the Crisis"), which may map to a single overview paragraph with 0 sub-points.
     * Counter-Argument Check: Demand a Counter-Argument/Rebuttal section ONLY if "requiresCounterArgument" === true.
     * Argumentative Way-Forward Blunder: If the prompt is a philosophical/controversial debate that does NOT ask for policy solutions, flag a bolted-on "Way Forward / Policy Recommendations" section as a 🟠 TIER_2_MAJOR structural flaw.

5. AUDIT INTRODUCTION, CONCLUSION & 1:1 OUTLINE-TO-BODY SYNC (Skip if Outline-Only):
   - Introduction ([P1]): Check Hook → Contextual Funnel → Explicit Thesis Statement at the end of P1. Flag if raw statistical percentages or citations are dumped inside the Introduction (🟠 TIER_2_MAJOR).
   - Conclusion ([P${preprocessed.paragraphs.length}]): Check Thesis restatement, synthesis of main arguments, and a balanced/hopeful closing clincher ("Unit of Impression"). Flag if brand-new arguments/statistics are introduced in the Conclusion or if it ends on a bleak, defeatist note.
   - 1:1 Synchronization: Compare [O1..O${preprocessed.outlineNodes.length}] against [P1..P${preprocessed.paragraphs.length}]. Flag any Outline sub-points skipped in the body or orphan body paragraphs missing from the Outline.

6. OUTPUT QUOTE-LOCKED "macroDiagnostics" & "headerUpgrades":
   - Every item in "macroDiagnostics" MUST include an exact "location_id" (e.g., "O3", "P1.S1", "P14.S4") and "exact_verbatim_quote" copied directly from the candidate's text.
   - Tiers:
     * "TIER_1_FATAL": Off-topic/theme-dumped essay, missing/contradictory thesis, split "AND" essay ignoring connection, or pervasive structural collapse.
     * "TIER_2_MAJOR": Disproportionate outline (<60% on core prompt), skipped outline points in body, raw stats in Intro/Conclusion, missing Counter-Argument when requiresCounterArgument=true, or Way-Forward blunder on pure debate prompts.
     * "TIER_3_POLISH": Non-parallel outline phrasing, slightly long/short Intro, or minor transition/hook refinement.
     * "EARNED_SIGNIFIER": Genuine topper-level macro skill (e.g., razor-sharp Two-Dimensional/Split-Stance Thesis, 100% parallel analytical outline headers, or seamless Intro funnel).

Return ONLY this JSON object:
{
  "essayGenre": "DESCRIPTIVE_ISSUE" | "ARGUMENTATIVE_DEBATE" | "RELATIONAL_TWO_CONCEPT" | "ABSTRACT_PHILOSOPHICAL",
  "requiresCounterArgument": true,
  "genreRationale": "string (1-2 sentences explaining why this genre and requiresCounterArgument setting apply)",
  "directiveAnalysis": {
    "directiveWord": "string (e.g. Argumentative Debate / Relational Nexus / Issue & Remedies / Abstract Philosophical)",
    "targetTimeframe": "string (e.g. Contemporary 2026 & Historical)",
    "requiredDimensions": "string (Core dimensions demanded by the prompt)",
    "alignmentStatus": "Aligned" | "Partially Aligned" | "Off-Topic",
    "feedback": "string (Specific assessment of how well the candidate decoded the prompt and 80:20 balance)"
  },
  "thesisAudit": {
    "extractedThesis": "string (Verbatim thesis from Outline or end of P1, or 'Not explicitly stated')",
    "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap",
    "critique": "string (Precise diagnosis of the candidate's thesis stance and structure)",
    "modelTopperThesis": "string (A 1-2 sentence 70+ mark CSS Qualifier Thesis Statement for this exact topic)"
  },
  "outlineAlignment": {
    "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap",
    "summary": "string (Assessment of Outline-to-Body 1:1 synchronization and 80:20 ratio)",
    "missingFromBody": ["string (Outline points skipped in the essay body, if any)"],
    "orphanBodyParagraphs": ["string (Body paragraphs not listed in the Outline, if any)"],
    "bodyHeadingWarning": "string or null"
  },
  "paragraphRoleMap": {
    "P1": "INTRO"
  },
  "headerUpgrades": [
    {
      "originalHeader": "string (Verbatim weak header from candidate's outline)",
      "issue": "string (e.g. Single-Word Label / Non-Parallel Phrasing / Missing Prompt Keyword)",
      "upgradedHeader": "string (Rewritten CSS Topper parallel analytical phrase)",
      "rule": "string (1-sentence takeaway rule)"
    }
  ],
  "macroDiagnostics": [
    {
      "location_id": "string (e.g. O4, P1.S3, P12.S1)",
      "exact_verbatim_quote": "string (Exact verbatim substring from the submission)",
      "tier": "TIER_1_FATAL" | "TIER_2_MAJOR" | "TIER_3_POLISH" | "EARNED_SIGNIFIER",
      "category": "string (e.g. 80:20 Outline Ratio, Thesis Architecture, Intro Funnel, Outline-to-Body Sync)",
      "observation": "string (Clear explanation of why this is a flaw or earned topper signifier)",
      "suggested_fix": "string (Actionable fix or rewrite)"
    }
  ],
  "pillarStatuses": {
    "topic_relevance": { "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap", "feedback": "string" },
    "outline": { "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap", "feedback": "string" },
    "thesis": { "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap", "feedback": "string" },
    "introduction": { "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap", "feedback": "string" },
    "conclusion": { "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap", "feedback": "string" }
  }
}
`;

export const runAgent1MacroArchitect = async ({
  examQuestion,
  preprocessed,
  essayMode = 'full',
  apiKey,
  preferredModel = 'auto',
  ledger = null
}) => {
  const prompt = buildAgent1Prompt({ examQuestion, preprocessed, essayMode });

  const { result } = await callGenAiAgentWithFailover({
    apiKey,
    prompt,
    enableGoogleSearch: false,
    temperature: 0.15,
    maxOutputTokens: 5120,
    preferredModel,
    stageName: 'Agent 1: Macro-Architect & Topic Strategist',
    ledger
  });

  // Ensure every paragraph P1..PN has a safe default role in paragraphRoleMap
  const rawRoleMap = result?.paragraphRoleMap || {};
  const normalizedRoleMap = {};
  preprocessed.paragraphs.forEach((p, idx) => {
    if (rawRoleMap[p.id]) {
      normalizedRoleMap[p.id] = rawRoleMap[p.id];
    } else if (idx === 0) {
      normalizedRoleMap[p.id] = 'INTRO';
    } else if (idx === preprocessed.paragraphs.length - 1 && preprocessed.paragraphs.length > 1) {
      normalizedRoleMap[p.id] = 'CONCLUSION';
    } else if (p.wordCount < 45 && p.sentenceCount <= 2) {
      normalizedRoleMap[p.id] = 'TRANSITION_BRIDGE';
    } else {
      normalizedRoleMap[p.id] = 'BODY_MAIN';
    }
  });

  return {
    essayGenre: result?.essayGenre || 'DESCRIPTIVE_ISSUE',
    requiresCounterArgument: Boolean(result?.requiresCounterArgument),
    genreRationale: result?.genreRationale || '',
    directiveAnalysis: result?.directiveAnalysis || {},
    thesisAudit: result?.thesisAudit || {},
    outlineAlignment: result?.outlineAlignment || {},
    paragraphRoleMap: normalizedRoleMap,
    headerUpgrades: Array.isArray(result?.headerUpgrades) ? result.headerUpgrades : [],
    macroDiagnostics: Array.isArray(result?.macroDiagnostics) ? result.macroDiagnostics : [],
    pillarStatuses: result?.pillarStatuses || {}
  };
};

