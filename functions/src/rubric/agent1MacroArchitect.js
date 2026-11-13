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
import {
  ESSAY_GENRE_PLAYBOOKS,
  PROMPT_DECODING_TRAP_RULES,
  SHARED_SAFE_HARBOR_DIRECTIVE,
  PLAIN_ENGLISH_AND_TONE_DIRECTIVE
} from './essayRubricConfig.js';

const buildAgent1Prompt = ({ examQuestion, preprocessed, essayMode = 'full' }) => `
You are Agent 1: FPSC CSS MACRO-ARCHITECT & TOPIC STRATEGIST (v3.1).
You evaluate the macro-architecture of an FPSC CSS English Essay with surgical accuracy, zero sycophancy, and zero hallucinated rules.
CRITICAL JSON RULE: Never use unescaped double quotes (") inside JSON string values; always use single quotes ('...') when quoting words or phrases inside a string.

SUBMISSION MODE: ${essayMode === 'outline_only' ? 'OUTLINE & THESIS ONLY' : 'FULL CSS ESSAY'}

=== MACRO-SLICED CANDIDATE SUBMISSION ===
${preprocessed.macroSliceForAgent1}
=========================================

GENRE PLAYBOOKS:
${JSON.stringify(ESSAY_GENRE_PLAYBOOKS, null, 2)}

ESSAY TITLE DECODING & GEOGRAPHIC SCOPE RULES:
${PROMPT_DECODING_TRAP_RULES.map((r, i) => `${i + 1}. ${r}`).join('\n')}

${SHARED_SAFE_HARBOR_DIRECTIVE}

${PLAIN_ENGLISH_AND_TONE_DIRECTIVE}

YOUR 6 CORE TASKS:
1. CLASSIFY "essayGenre":
   Choose exact one: "DESCRIPTIVE_ISSUE" | "ARGUMENTATIVE_DEBATE" | "RELATIONAL_TWO_CONCEPT" | "ABSTRACT_PHILOSOPHICAL".

2. DETERMINE "requiresCounterArgument" (boolean):
   - CRITICAL RULE: Full-sentence Essay Titles expressing universal consensus, proverbs, or moral/constitutional axioms (e.g., "Democracy and illiteracy cannot move together", "Great nations win without fighting a war", "Instruction in youth is like engraving in stone") do NOT have a credible opposing side—set "requiresCounterArgument": false!
   - Set "requiresCounterArgument": true ONLY when the Essay Title is a genuinely debatable, controversial two-sided proposition where a reasonable opposing school of thought exists. Even when true, remember Counter-Argument inclusion is a helpful recommendation (🔵 TIER_3_POLISH), NEVER mandatory or a Fatal/Major fail risk if omitted.

3. BUILD "paragraphRoleMap" (For all paragraphs P1..P${preprocessed.paragraphs.length}) & OPTIONAL BOUNDARY CHECK:
   Tag every paragraph ID ("P1", "P2", ..., "P${preprocessed.paragraphs.length}") with its TRUE structural role:
   - "INTRO": Opening introduction paragraph (typically P1). Note: Gently recommend a single cohesive Intro paragraph (🔵 TIER_3_POLISH) if split across 2 opening paragraphs.
   - "CONTEXT_OVERVIEW": A single-paragraph contextual/historical/definitional overview matching a secondary Outline heading (typically P2).
   - "BODY_MAIN": Standard substantive argument paragraph developing an outline sub-point.
   - "TRANSITION_BRIDGE": A short 1–3 sentence transitional bridge paragraph connecting two major sections of the essay (e.g., shifting from Causes to Consequences or Way Forward). Note gently as 🔵 TIER_3_POLISH if placed directly after P1 Intro or immediately before PN Conclusion.
   - "COUNTER_ARGUMENT": A paragraph dedicated to addressing and refuting an opposing viewpoint.
   - "CONCLUSION": Final concluding synthesis paragraph (typically P${preprocessed.paragraphs.length}).
   - Boundary Verification: ONLY if the pre-processor accidentally split the Outline vs. Essay Body at the wrong spot (e.g., outline lines ended up inside P1 or the real Introduction ended up inside the Outline), set "aiBoundaryCorrection.firstBodyParagraphStartQuote" to the exact opening words of the real Essay Introduction; otherwise set it to null.

4. AUDIT TOPIC DECODING, THESIS STATEMENT & OUTLINE ARCHITECTURE:
   - 80:20 Relevance Rule & Scope-Drift Check: Did the candidate dedicate ~75–80% of the outline/essay to the exact dimensions asked in the Essay Title, respecting Global vs. Pakistan 80:20 geographic bounds and avoiding keyword swaps that narrow or dodge the topic?
   - Relational "AND" Rule (if RELATIONAL_TWO_CONCEPT): Do the essay and its major body sections clearly sustain the causal/reciprocal nexus between Concept A and Concept B rather than splitting into two disconnected essays? (1–2 early foundation paragraphs focusing on one concept before connecting both are natural and valid.)
   - Abstract Playbook (if ABSTRACT_PHILOSOPHICAL): Welcome philosophical/historical/societal levels of analysis. Do NOT demand Causes -> Consequences -> Government Way Forward! Check if personal proverbs were elevated to societal/historical/international levels.
   - Outline Mechanics, Unity & Parallelism:
     * Sweet Spot Count: Ideal CSS outlines have 12–20 substantial points total (outline points should NOT be fewer than 12; gently flag sparse <12 or bloated >30 outlines as 🔵 TIER_3_POLISH).
     * Rule of Unity & Parallelism: One Outline point/phrase should convey ONE distinct idea (flag cramming two unrelated ideas into one bullet via "and", such as "Corruption and nepotism"). Uniform Noun Phrases OR uniform Full Declarative Sentences are BOTH acceptable if consistent. Flag mismatched sibling formats, single-word labels ("Economy"), and fake question marks attached to declarative statements ("How classrooms decide...?").
     * Case Formatting: Recommend Title Case for main Roman/numeric headers and Sentence case for sub-points (🔵 TIER_3_POLISH).
     * Conclusion Outline Rule: The Outline's "Conclusion" entry MUST NOT have a/b/c or 3.1/3.2 sub-points (flag as 🟠 TIER_2_MAJOR if sub-points exist under Conclusion).
     * Single Sub-Point Rule (with CONTEXT_OVERVIEW Exception): An argumentative section with sub-points should ideally have at least two (1.1 and 1.2)—EXCEPT a single contextual overview heading ("2. Contextualizing the Crisis") mapping to one overview paragraph.
     * Counter-Argument Recommendation: If requiresCounterArgument === true and omitted, recommend adding a Counter-Argument & Rebuttal section gently as 🔵 TIER_3_POLISH (NEVER Tier 1 or Tier 2).
     * Debate Way-Forward Note: Only flag a bureaucratic "Way Forward / Policy Recommendations" section (🔵 TIER_3_POLISH, or 🟠 TIER_2_MAJOR if excessive) when bolted onto a pure philosophical or binary-choice debate where policy recommendations do not fit.

5. AUDIT INTRODUCTION, CONCLUSION & 1:1 OUTLINE-TO-BODY SYNC (Skip prose comparison if Outline-Only):
   - Introduction ([P1]): Check Hook -> Contextual Funnel -> Explicit Thesis Statement (valid ANYWHERE inside P1, though the very end of P1 is recommended as the ideal and strongest position -> at most 🔵 TIER_3_POLISH if placed earlier). Flag dumping heavy statistics in Intro (🟠 TIER_2_MAJOR). If Intro is weak ("Needs Polish" or "Critical Gap"), recommend in simple English: "You can write ~65% of your Introduction directly from your Outline points."
   - Conclusion ([P${preprocessed.paragraphs.length}]): Check Thesis restatement with >=60% fresh wording from Intro AND a fulfilled tense shift ("will prove" -> "has demonstrated"), holistic synthesis without brand-new stats or new arguments (🟠 TIER_2_MAJOR if raw stats dumped), and a measured optimistic close. If Conclusion is weak ("Needs Polish" or "Critical Gap"), recommend in simple English: "You can write ~65% of your Conclusion from your Outline (using the remaining 35% of Outline points not covered in the Intro plus 30% core repeated threads restated clearly)."
   - 1:1 Synchronization (CRITICAL PASS/FAIL CHECK): Compare [O1..O${preprocessed.outlineNodes.length}] against [P1..P${preprocessed.paragraphs.length}] (including Mid-Para Cues for P3..P(N-1)). Missing promised Outline points in the essay body (especially running out of time and skipping the last Outline points) or adding orphan body paragraphs not in the Outline is a MAJOR error (🟠 TIER_2_MAJOR, or 🔴 TIER_1_FATAL when multiple promised sections are missing).

6. OUTPUT QUOTE-LOCKED "macroDiagnostics" & "headerUpgrades" (IN SIMPLE, CLEAR ENGLISH):
   - Every item in "macroDiagnostics" MUST include an exact "location_id" (e.g., "O3", "P1.S1", "P14.S4") and "exact_verbatim_quote" copied directly from the candidate's text.
   - Populate "outlineAlignment.parallelismStatus": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap".
   - Tiers (write all category names and explanations in simple, everyday English any student understands):
     * "TIER_1_FATAL" (🔴 Serious Mistake): Off-topic essay, missing/contradictory thesis, split 50/50 two-concept essay ignoring the connection, taking a metaphor too literally, or skipping multiple promised Outline sections.
     * "TIER_2_MAJOR" (🟠 Major Mistake): Disproportionate outline (<60% on core Essay Title), 80:20 geographic scope error, skipped Outline points in body / extra body paragraphs missing from Outline, sub-points under Conclusion in Outline, or dumping raw statistics in Intro/Conclusion.
     * "TIER_3_POLISH" (🔵 Improvement & Tip): Omitted optional Counter-Argument on debate topics, outline <12 or >30 points, uneven sibling outline phrasing, overloaded two-idea outline point, fake "?" headers, minor capitalization mix, Thesis placed early in Intro instead of at the end of P1, 2-paragraph Intro split, transition placement tips, or repeated Intro/Conclusion wording.
     * "EARNED_SIGNIFIER" (🟢 Strong Point): Genuine strong work (e.g., clear Thesis answering all parts, uniform 1-idea outline headings, or smooth Intro flow).

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
    "extractedThesis": "string (Verbatim thesis from Outline or P1, or 'Not explicitly stated')",
    "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap",
    "critique": "string (Precise diagnosis of the candidate's thesis stance and structure)",
    "modelTopperThesis": "string (A 1-2 sentence 70+ mark CSS Qualifier Thesis Statement for this exact topic)"
  },
  "outlineAlignment": {
    "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap",
    "parallelismStatus": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap",
    "summary": "string (Assessment of Outline-to-Body 1:1 synchronization and 80:20 ratio)",
    "missingFromBody": ["string (Outline points skipped in the essay body, if any)"],
    "orphanBodyParagraphs": ["string (Body paragraphs not listed in the Outline, if any)"],
    "bodyHeadingWarning": "string or null"
  },
  "paragraphRoleMap": {
    "P1": "INTRO"
  },
  "aiBoundaryCorrection": {
    "firstBodyParagraphStartQuote": null
  },
  "headerUpgrades": [
    {
      "originalHeader": "string (Verbatim weak header from candidate's outline)",
      "issue": "string (e.g. Single-Word Label / Non-Parallel Phrasing / Missing Prompt Keyword / Conclusion Sub-point)",
      "upgradedHeader": "string (Rewritten CSS Topper parallel analytical phrase)",
      "rule": "string (1-sentence takeaway rule)"
    }
  ],
  "macroDiagnostics": [
    {
      "location_id": "string (e.g. O4, P1.S3, P12.S1)",
      "exact_verbatim_quote": "string (Exact verbatim substring from the submission)",
      "tier": "TIER_1_FATAL" | "TIER_2_MAJOR" | "TIER_3_POLISH" | "EARNED_SIGNIFIER",
      "category": "string (Simple student-friendly heading: e.g. Off-Topic / Imbalanced Outline, Weak Thesis, Weak Introduction, Outline & Essay Mismatch, Weak Conclusion, Strong Point)",
      "observation": "string (Simple, clear explanation of why this is a mistake or strong point)",
      "suggested_fix": "string (Actionable fix or rewrite in plain English)"
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
    maxOutputTokens: 16384,
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
    aiBoundaryCorrection: result?.aiBoundaryCorrection || { firstBodyParagraphStartQuote: null },
    headerUpgrades: Array.isArray(result?.headerUpgrades) ? result.headerUpgrades : [],
    macroDiagnostics: Array.isArray(result?.macroDiagnostics) ? result.macroDiagnostics : [],
    pillarStatuses: result?.pillarStatuses || {}
  };
};

