/**
 * Stage 1B (Parallel Branch 2): Agent 3 — Fact, Discourse & Language Critic (v2.1)
 *
 * Runs in parallel with Agent 2 using @google/genai with Selective Google Search Grounding
 * and Resilient JSON Parsing.
 *
 * Enforces:
 * 1. Selective Google Search Grounding for specific stats, indices, laws, dates & suspect quotes
 *    (checked against 2026 Pakistan & Global baselines).
 * 2. Epistemic Fairness Rule on Quotes: Never accuses a candidate of "fabricating" a quote
 *    unless proven false/misattributed; flags unverified/paraphrased quotes gently in 🔵 TIER_3_POLISH.
 * 3. Domain 4 Recalibrations:
 *    - 1–2 isolated pronoun/contraction slips = 🔵 TIER_3_POLISH (reserve Tier 1/2 for pervasive violations or inline body headings/bullets/tables).
 *    - Generic modifiers ("important", "big", "key") = 🔵 TIER_3_POLISH Expression Upgrade.
 *    - Zero penalty for "AI buzzwords" (delve into, multifaceted).
 *    - Native British English syntax + Corrected Pakistani "Pinglish" L1 Interference detector.
 */

import { callGenAiAgentWithFailover } from './safeJsonParser.js';
import {
  PINGLISH_INTERFERENCE_RULES,
  PAKISTAN_2026_BASELINES,
  GUARDRAIL_EXCEPTIONS
} from './essayRubricConfig.js';

const buildAgent3Prompt = ({ examQuestion, preprocessed, agent1Output }) => `
You are Agent 3: FPSC CSS FACT, DISCOURSE & LANGUAGE CRITIC (equipped with Google Search Grounding).
CRITICAL JSON RULE: Never use unescaped double quotes (") inside JSON string values; always use single quotes ('...') when quoting words or phrases inside a string.

=== CONTEXT ===
- Essay Topic: "${examQuestion}"
- Classified Essay Genre: ${agent1Output.essayGenre}
- Detected Inline Body Headings (Taboo Check): ${
  preprocessed.inlineBodyHeadingViolations.length > 0
    ? JSON.stringify(preprocessed.inlineBodyHeadingViolations)
    : 'None'
}

${PAKISTAN_2026_BASELINES}

=== CORRECTED PAKISTANI "PINGLISH" (URDU-TO-ENGLISH L1 INTERFERENCE) RULES ===
${JSON.stringify(PINGLISH_INTERFERENCE_RULES, null, 2)}

=== MANDATORY CALIBRATION & GUARDRAIL RULES ===
${GUARDRAIL_EXCEPTIONS.map((g, i) => `${i + 1}. ${g}`).join('\n')}
- SELECTIVE GOOGLE SEARCH RULE: Query Google Search ONLY when verifying specific statistics, global index rankings, macroeconomic numbers, constitutional articles, historical dates, or suspect quotes. Do NOT run search queries for general conceptual statements.
- EPISTEMIC FAIRNESS ON QUOTES: Students often write translated or slightly paraphrased quotes from Allama Iqbal, Quaid-e-Azam, Rumi, or classical thinkers from memory. NEVER accuse a student of "fabricating" a quote unless Google Search proves it is factually false or a famous misattribution. If a quote cannot be verified verbatim online, classify it gently in 🔵 "TIER_3_POLISH" as "Unverified / Paraphrased Citation — Add Clearer Source Context".
- SLIP VS. DEAL-BREAKER CALIBRATION:
  * 1–2 isolated occurrences of a contraction ("it's", "don't") or first-person pronoun ("we", "our") across an essay -> classify as 🔵 "TIER_3_POLISH" (Slip of the Pen).
  * Pervasive/repeated first-person pronouns or contractions, OR structural taboos (inline headings, bullet points, tables, or flowcharts inside the essay prose body) -> classify as 🔴 "TIER_1_FATAL" or 🟠 "TIER_2_MAJOR".
- GENERIC MODIFIERS ([WW]): Calling a problem "important", "key", "big", or "huge" is valid standard English. Suggesting academic upgrades ("grave", "chronic", "pervasive", "deep-rooted") is strictly 🔵 "TIER_3_POLISH", never Tier 1 or Tier 2.
- NUANCED SUPERLATIVES & ZERO AI-BUZZWORD PENALTY: Do NOT mechanically ban "best" or "most" (only flag unsubstantiated absolutist reductionism like claiming a multi-causal crisis has "only one cause", or emotional/vigilante rants). Do NOT penalize words like "delve into", "multifaceted", "paradigm shift", or "underscore".
- NATIVE BRITISH ENGLISH INTELLIGENCE: Use your full native command of formal British English to catch subject-verb disagreement, dangling modifiers, comma splices, fragments, faulty parallelism, wrong prepositions/articles, and malapropisms (e.g., "economical pathways" instead of "economic pathways").

=== FULL TAGGED ESSAY TRANSCRIPT ===
${preprocessed.fullTaggedTranscript}
====================================

YOUR 4 OUTPUT TASKS:
1. "factChecks": Audit 4 to 8 specific factual claims, statistics, rankings, constitutional articles, historical dates, or quotes in the script. Verify against 2026 baselines and selective Google Search.
2. "languageAndFactDiagnostics": Generate 10 to 18 quote-locked diagnostic items across:
   - Grammar & Syntax Errors (Subject-verb agreement, tense, articles, prepositions, clause punctuation, fragments/run-ons).
   - Pakistani "Pinglish" L1 Interference ("cope up with", "discuss about", "comprise of", "doing corruption", "making hurdles", "doing mistakes", "concerned authorities", "avail the opportunity", "pass out from college/university"). Remember: NEVER flag valid formal English like "committing mistakes/errors" or literal fainting uses of "pass out"!
   - Logical Fallacies & Discourse Tone (Sweeping generalizations, reductionism, emotional/vigilante tone, or CSS structural taboos like inline body headings).
   - Expression Polish ([WW] generic modifier upgrades, rhythmic prose refinements).
   - Earned Topper Signifiers ("EARNED_SIGNIFIER"): Specific verbatim sentences demonstrating exceptional formal diction, rhythmic adjective+noun triads, or authoritative citation integration.
3. CRITICAL VERBATIM QUOTE RULE:
   Every item in "languageAndFactDiagnostics" MUST include:
   - "location_id": Exact coordinate (e.g., "O3", "P2.S4").
   - "exact_verbatim_quote": Exact 2 to 12 word substring copied VERBATIM from the candidate's transcript (exact spelling, case, and punctuation) so it can be highlighted directly on the answer sheet.
4. "pillarStatuses": Evaluate "grammar_syntax", "expression", and "analytical_depth".

Return ONLY a valid JSON object matching this exact schema (no markdown commentary outside the JSON):
{
  "factChecks": [
    {
      "location_id": "string (e.g. P4.S2)",
      "claim": "string (Exact verbatim claim/stat/quote from the essay)",
      "status": "VERIFIED" | "OUTDATED_2026" | "FACTUAL_DISCREPANCY" | "UNVERIFIED_CITATION",
      "verified": true,
      "correctedFact": "string or null (Updated 2026 figure, accurate source, or gentle note for unverified quote)",
      "source": "string (Authoritative institution, report, or constitution)"
    }
  ],
  "languageAndFactDiagnostics": [
    {
      "location_id": "string (e.g. O2, P1.S2, P5.S3)",
      "exact_verbatim_quote": "string (EXACT 2-12 word verbatim substring from the candidate's text)",
      "tier": "TIER_1_FATAL" | "TIER_2_MAJOR" | "TIER_3_POLISH" | "EARNED_SIGNIFIER",
      "category": "string (e.g. Subject-Verb Agreement, Pinglish Interference, Diction / Malapropism, Outdated Statistic, Unverified Citation, Expression Polish, Earned Signifier)",
      "observation": "string (Clear pedagogical explanation of WHY this was flagged or praised)",
      "suggested_fix": "string (Exact drop-in replacement phrase/sentence)",
      "micro_rule": "string (Concise 1-sentence grammar or CSS discourse rule to remember)"
    }
  ],
  "pillarStatuses": {
    "grammar_syntax": { "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap", "feedback": "string" },
    "expression": { "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap", "feedback": "string" },
    "analytical_depth": { "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap", "feedback": "string" }
  }
}
`;

export const runAgent3FactLanguageCritic = async ({
  examQuestion,
  preprocessed,
  agent1Output,
  apiKey,
  preferredModel = 'auto',
  ledger = null
}) => {
  const prompt = buildAgent3Prompt({
    examQuestion,
    preprocessed,
    agent1Output
  });

  const { result, searchSources } = await callGenAiAgentWithFailover({
    apiKey,
    prompt,
    enableGoogleSearch: true,
    temperature: 0.15,
    maxOutputTokens: 6144,
    preferredModel,
    stageName: 'Agent 3: Fact, Discourse & Language Critic (+Search Grounding)',
    ledger
  });

  return {
    factChecks: Array.isArray(result?.factChecks) ? result.factChecks : [],
    languageAndFactDiagnostics: Array.isArray(result?.languageAndFactDiagnostics)
      ? result.languageAndFactDiagnostics
      : [],
    pillarStatuses: result?.pillarStatuses || {},
    searchSources: searchSources || []
  };
};

