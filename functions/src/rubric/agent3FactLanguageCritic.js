/**
 * Stage 1B (Parallel Branch 2): Agent 3 — Split Fact/Concept & Language/CSS Format Critic (v3)
 *
 * Splits overloaded single-pass Agent 3 into focused concurrent critics:
 *  - Agent 3A (Fact, 2026 Time-Warp, Quote Fairness & Conceptual Precision) WITH Google Search Grounding.
 *  - Agent 3B (British Syntax, Pinglish, Acronyms, Modals, 80:20 Sentence Variety & Spotlight Zones)
 *    which automatically chunks essays > 1,600 words or > 10 paragraphs into two parallel slices
 *    so later paragraphs (P10–P18) never suffer attention drop or output truncation.
 *  - Outline-Only Light Mode: Checks only [O1..On] for Pinglish, grammar, and acronyms without
 *    expecting body paragraphs or triggering unnecessary Search Grounding.
 */

import { callGenAiAgentWithFailover } from './safeJsonParser.js';
import {
  PINGLISH_INTERFERENCE_RULES,
  CONCEPTUAL_PRECISION_PAIRS,
  CSS_LANGUAGE_AND_FORMAT_RULES,
  PAKISTAN_2026_BASELINES,
  SHARED_SAFE_HARBOR_DIRECTIVE,
  PLAIN_ENGLISH_AND_TONE_DIRECTIVE
} from './essayRubricConfig.js';

const buildTranscriptFromParagraphs = (paragraphs = []) =>
  paragraphs.map((p) => `[${p.id} | ${p.wordCount}w] ${p.taggedText}`).join('\n\n');

const buildAgent3aFactPrompt = ({ examQuestion, preprocessed, agent1Output }) => `
You are Agent 3A: FPSC CSS FACT, TIME-WARP & CONCEPTUAL PRECISION CRITIC (with Selective Google Search Grounding).
CRITICAL JSON RULE: Never use unescaped double quotes (") inside JSON string values; always use single quotes ('...') when quoting words or phrases inside a string.

=== CONTEXT ===
- Essay Topic: "${examQuestion}"
- Classified Essay Genre: ${agent1Output.essayGenre}

${PAKISTAN_2026_BASELINES}

=== CONCEPTUAL & TERMINOLOGICAL PRECISION PAIRS ===
${JSON.stringify(CONCEPTUAL_PRECISION_PAIRS, null, 2)}

${SHARED_SAFE_HARBOR_DIRECTIVE}

${PLAIN_ENGLISH_AND_TONE_DIRECTIVE}

RULES FOR FACT & CONCEPT AUDIT:
1. SELECTIVE GOOGLE SEARCH RULE: Query Google Search ONLY when verifying specific statistics, global index rankings, macroeconomic numbers, constitutional articles, treaties, historical dates, or suspect quotes. Do NOT run search queries for general conceptual prose.
2. TIME-WARP CHECK: Flag outdated facts presented as current in 2026 (e.g., claiming Pakistan is still on FATF Grey List after Oct 2022 exit, quoting 2017/207M census instead of 2023 Digital Census ~241.5M, citing expired MDGs instead of SDGs, or unmerged FATA/FCR).
3. EPISTEMIC FAIRNESS ON QUOTES: NEVER accuse a candidate of "fabricating" a quote (especially translated Iqbal/Jinnah/classical quotes) unless Google Search proves it factually false or misattributed. If merely unverified, classify gently as 🔵 "TIER_3_POLISH" ("UNVERIFIED_CITATION").
4. CONCEPTUAL CONFUSION CHECK: Flag conflating terms from CONCEPTUAL_PRECISION_PAIRS (e.g., calling IMF loans "foreign aid", confusing State vs. Government, Growth vs. Development, Equality vs. Equity, Literacy vs. Education).

=== FULL TAGGED ESSAY TRANSCRIPT ===
${preprocessed.fullTaggedTranscript}
====================================

Return ONLY this JSON object:
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
  "factAndConceptDiagnostics": [
    {
      "location_id": "string (e.g. P4.S2)",
      "exact_verbatim_quote": "string (EXACT 2-12 word verbatim substring from the candidate's text)",
      "tier": "TIER_1_FATAL" | "TIER_2_MAJOR" | "TIER_3_POLISH" | "EARNED_SIGNIFIER",
      "category": "string (e.g. Outdated Statistic / Time-Warp, Factual Error, Conceptual Precision, Unverified Citation, Authoritative Evidence)",
      "observation": "string (Clear explanation referencing 2026 data or social-science terminology)",
      "suggested_fix": "string (Exact factual or terminological correction)",
      "micro_rule": "string (1-sentence exam takeaway rule)"
    }
  ],
  "analyticalDepthStatus": {
    "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap",
    "feedback": "string"
  }
}
`;

const buildAgent3bLanguagePrompt = ({
  examQuestion,
  preprocessed,
  agent1Output,
  sliceLabel,
  sliceTranscript
}) => `
You are Agent 3B: FPSC CSS BRITISH SYNTAX, PINGLISH & FORMAT CRITIC (${sliceLabel}).
CRITICAL JSON RULE: Never use unescaped double quotes (") inside JSON string values; always use single quotes ('...') when quoting words or phrases inside a string.

=== CONTEXT ===
- Essay Topic: "${examQuestion}"
- Essay Genre: ${agent1Output.essayGenre}
- Detected Inline Body Headings (Taboo Check): ${
  preprocessed.inlineBodyHeadingViolations?.length > 0
    ? JSON.stringify(preprocessed.inlineBodyHeadingViolations)
    : 'None'
}
- Highlighted Spotlight Zone Coordinates (Double Examiner Weight): ${JSON.stringify(
  (preprocessed.spotlightZoneIds || []).slice(0, 30)
)}

=== PAKISTANI "PINGLISH" (URDU-TO-ENGLISH L1 INTERFERENCE) RULES ===
${JSON.stringify(PINGLISH_INTERFERENCE_RULES, null, 2)}

=== CSS FORMATTING & LANGUAGE CONVENTIONS ===
${CSS_LANGUAGE_AND_FORMAT_RULES.map((r, i) => `${i + 1}. ${r}`).join('\n')}

${SHARED_SAFE_HARBOR_DIRECTIVE}

${PLAIN_ENGLISH_AND_TONE_DIRECTIVE}

STRICT CALIBRATION OVERRIDES (NEVER VIOLATE):
- CRITICAL GRAMMAR PRIORITY: In FPSC CSS English Essay, real English grammar mistakes fail essays. Scan EVERY sentence in the target slice from start to finish so NO genuine grammar error is missed. Classify clear grammar, syntax, subject-verb agreement, tense shift, fragment, comma-splice, preposition, or article errors as 🟠 "TIER_2_MAJOR" (or 🔴 "TIER_1_FATAL" when recurring/pervasive or breaking sentence meaning).
- GENERIC MODIFIERS ([WW]): Calling an issue "important", "key", "big", or "huge" is valid standard English. Suggesting academic upgrades ("grave", "chronic", "pervasive") is STRICTLY 🔵 "TIER_3_POLISH" — NEVER Tier 1 or Tier 2.
- ZERO AI-BUZZWORD PENALTY: NEVER flag or penalize words such as "delve into", "intricate tapestry", "testament to", "beacon of hope", "multifaceted landscape", or "paradigm shift".
- SLIP VS. DEAL-BREAKER: 1–2 isolated contractions ("it's", "don't") or first-person pronouns ("we", "our") are 🔵 "TIER_3_POLISH". Reserve 🔴/🟠 for genuine grammar mistakes, pervasive errors, or structural taboos (inline headings, bullets, tables).
- VALID COLLOCATIONS: NEVER flag "commit a mistake/error" or literal fainting uses of "pass out".

=== TARGET TEXT SLICE TO AUDIT ===
${sliceTranscript}
=================================

YOUR OUTPUT TASKS:
Audit EVERY paragraph and EVERY sentence in the target slice using your full native command of formal British English + Pakistani L1 interference detection:
1. COMPREHENSIVE GRAMMAR & SYNTAX AUDIT (CRITICAL PRIORITY): Scan EVERY sentence from start to finish so you DO NOT miss any grammar or language mistake. Catch subject-verb disagreement, wrong tense shifts, sentence fragments, comma splices/run-on sentences, wrong prepositions, missing/wrong articles, dangling modifiers, unanchored opening pronouns, British spelling inconsistency, and broken syntax. Mark genuine grammar flaws as 🟠 "TIER_2_MAJOR" (or 🔴 "TIER_1_FATAL" if pervasive or breaking meaning).
2. Pinglish Interference ("cope up with", "discuss about", "comprise of", "doing corruption/mistakes", "concerned authorities", "avail the opportunity", "pass out from college/university").
3. CSS Formatting & Style Preferences (Keep strictly 🔵 "TIER_3_POLISH" unless structural taboo): First-mention unexpanded acronyms like IMF/UNO/FBR, unspelled single-digit numbers "4 pillars", monotonous "The government should..." vs Constitutional "must", 80:20 sentence variety, >15-word unpunctuated Subject-Verb separation, topic praise, slashes like "his/her".
4. Earned Topper Signifiers ("EARNED_SIGNIFIER"): Cite specific verbatim sentences showing clear, natural, accurate English prose (right word in the right place).

Return ONLY this JSON object:
{
  "languageDiagnostics": [
    {
      "location_id": "string (e.g. O2, P1.S2, P12.S3)",
      "exact_verbatim_quote": "string (EXACT 2-12 word verbatim substring from the slice)",
      "tier": "TIER_1_FATAL" | "TIER_2_MAJOR" | "TIER_3_POLISH" | "EARNED_SIGNIFIER",
      "category": "string (e.g. Subject-Verb Agreement, Pinglish Interference, Acronym Expansion, Clause Punctuation, Modal Variety, Expression Polish, Earned Signifier)",
      "observation": "string (Clear British English or CSS convention explanation)",
      "suggested_fix": "string (Exact drop-in replacement phrase/sentence)",
      "micro_rule": "string (Concise 1-sentence rule)"
    }
  ],
  "pillarStatuses": {
    "grammar_syntax": { "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap", "feedback": "string" },
    "expression": { "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap", "feedback": "string" }
  }
}
`;

const buildOutlineOnlyLanguagePrompt = ({ examQuestion, preprocessed }) => `
You are Agent 3: FPSC CSS OUTLINE LANGUAGE & TERMINOLOGY CRITIC (Outline-Only Mode).
CRITICAL JSON RULE: Never use unescaped double quotes (") inside JSON string values; always use single quotes ('...') when quoting words or phrases inside a string.

Essay Topic: "${examQuestion}"

=== PAKISTANI "PINGLISH" & CSS RULES ===
${JSON.stringify(PINGLISH_INTERFERENCE_RULES, null, 2)}

${SHARED_SAFE_HARBOR_DIRECTIVE}

${PLAIN_ENGLISH_AND_TONE_DIRECTIVE}

=== OUTLINE TEXT ===
${preprocessed.outlineNodes.map((o) => o.taggedText).join('\n') || '(Empty outline)'}
====================

Audit EVERY Outline line [O1..On] thoroughly for British grammar (mark clear grammar errors as 🟠 TIER_2_MAJOR or 🔴 TIER_1_FATAL if pervasive), Pinglish interference, spelling, unexpanded acronyms, fake question marks, and clarity in simple English. Do NOT invent body-paragraph complaints.

Return ONLY this JSON object:
{
  "languageDiagnostics": [
    {
      "location_id": "string (e.g. O4)",
      "exact_verbatim_quote": "string (EXACT 2-12 word substring from that outline line)",
      "tier": "TIER_1_FATAL" | "TIER_2_MAJOR" | "TIER_3_POLISH" | "EARNED_SIGNIFIER",
      "category": "string",
      "observation": "string",
      "suggested_fix": "string",
      "micro_rule": "string"
    }
  ],
  "pillarStatuses": {
    "grammar_syntax": { "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap", "feedback": "string" },
    "expression": { "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap", "feedback": "string" }
  }
}
`;

const tagSpotlightZones = (items = [], spotlightZoneIds = []) => {
  const spotSet = new Set(spotlightZoneIds || []);
  return items.map((item) => {
    const loc = String(item.location_id || '').trim();
    const inSpotlightZone = spotSet.has(loc);
    return {
      ...item,
      inSpotlightZone,
      observation:
        inSpotlightZone && item.tier !== 'EARNED_SIGNIFIER' && !String(item.observation || '').includes('[Spotlight Zone]')
          ? `[Spotlight Zone — 2x Examiner Visibility] ${item.observation || ''}`.trim()
          : item.observation || ''
    };
  });
};

export const runAgent3FactLanguageCritic = async ({
  examQuestion,
  preprocessed,
  agent1Output,
  essayMode = 'full',
  apiKey,
  preferredModel = 'auto',
  ledger = null
}) => {
  // Fast Outline-Only Path: skip Search Grounding & body prose prompts completely
  if (essayMode === 'outline_only' || preprocessed.isOutlineOnly || preprocessed.paragraphs.length === 0) {
    const outlinePrompt = buildOutlineOnlyLanguagePrompt({ examQuestion, preprocessed });
    const { result } = await callGenAiAgentWithFailover({
      apiKey,
      prompt: outlinePrompt,
      enableGoogleSearch: false,
      temperature: 0.15,
      maxOutputTokens: 16384,
      preferredModel,
      stageName: 'Agent 3 (Outline Mode): Syntax & Terminology Critic',
      ledger
    });

    const tagged = tagSpotlightZones(
      Array.isArray(result?.languageDiagnostics) ? result.languageDiagnostics : [],
      preprocessed.spotlightZoneIds
    );

    return {
      factChecks: [],
      languageAndFactDiagnostics: tagged,
      pillarStatuses: {
        grammar_syntax: result?.pillarStatuses?.grammar_syntax || {
          status: 'Balanced',
          feedback: 'Evaluated on outline phrasing.'
        },
        expression: result?.pillarStatuses?.expression || {
          status: 'Balanced',
          feedback: 'Evaluated on outline diction.'
        },
        analytical_depth: {
          status: 'Balanced',
          feedback: 'Outline blueprint depth audited in Macro Architecture.'
        }
      },
      searchSources: [],
      searchGrounded: false
    };
  }

  // Decide whether Agent 3B should chunk long scripts (> 10 paragraphs or > 1,600 words)
  const paras = preprocessed.paragraphs || [];
  const shouldChunk3b = paras.length > 10 || preprocessed.bodyWordCount > 1600;
  const languageCalls = [];

  if (shouldChunk3b) {
    const mid = Math.ceil(paras.length / 2);
    const firstHalfParas = paras.slice(0, mid);
    const secondHalfParas = paras.slice(mid);
    const outlineHeader =
      preprocessed.outlineNodes.length > 0
        ? `=== OUTLINE CONTEXT ===\n${preprocessed.outlineNodes.map((o) => o.taggedText).join('\n')}\n\n`
        : '';

    languageCalls.push(
      callGenAiAgentWithFailover({
        apiKey,
        prompt: buildAgent3bLanguagePrompt({
          examQuestion,
          preprocessed,
          agent1Output,
          sliceLabel: `First Half: P1..${firstHalfParas[firstHalfParas.length - 1]?.id}`,
          sliceTranscript: `${outlineHeader}${buildTranscriptFromParagraphs(firstHalfParas)}`
        }),
        enableGoogleSearch: false,
        temperature: 0.15,
        maxOutputTokens: 16384,
        preferredModel,
        stageName: 'Agent 3B-1: Language & CSS Critic (First Half)',
        ledger
      }),
      callGenAiAgentWithFailover({
        apiKey,
        prompt: buildAgent3bLanguagePrompt({
          examQuestion,
          preprocessed,
          agent1Output,
          sliceLabel: `Second Half: ${secondHalfParas[0]?.id}..${secondHalfParas[secondHalfParas.length - 1]?.id}`,
          sliceTranscript: buildTranscriptFromParagraphs(secondHalfParas)
        }),
        enableGoogleSearch: false,
        temperature: 0.15,
        maxOutputTokens: 16384,
        preferredModel,
        stageName: 'Agent 3B-2: Language & CSS Critic (Second Half)',
        ledger
      })
    );
  } else {
    languageCalls.push(
      callGenAiAgentWithFailover({
        apiKey,
        prompt: buildAgent3bLanguagePrompt({
          examQuestion,
          preprocessed,
          agent1Output,
          sliceLabel: 'Full Script',
          sliceTranscript: preprocessed.fullTaggedTranscript
        }),
        enableGoogleSearch: false,
        temperature: 0.15,
        maxOutputTokens: 16384,
        preferredModel,
        stageName: 'Agent 3B: Language & CSS Format Critic',
        ledger
      })
    );
  }

  // Run Agent 3A (Search Grounding Fact & Concept) concurrently with Agent 3B slice(s)
  const factCall = callGenAiAgentWithFailover({
    apiKey,
    prompt: buildAgent3aFactPrompt({ examQuestion, preprocessed, agent1Output }),
    enableGoogleSearch: true,
    temperature: 0.15,
    maxOutputTokens: 16384,
    preferredModel,
    stageName: 'Agent 3A: Fact, 2026 Grounding & Conceptual Critic',
    ledger
  });

  const [factSettled, ...langSettled] = await Promise.allSettled([factCall, ...languageCalls]);

  const factData = factSettled.status === 'fulfilled' ? factSettled.value : null;
  const langResults = langSettled
    .filter((s) => s.status === 'fulfilled')
    .map((s) => s.value?.result)
    .filter(Boolean);

  if (!factData && langResults.length === 0) {
    throw new Error(factSettled.reason?.message || 'Agent 3 fact and language sub-critics failed.');
  }

  const factChecks = Array.isArray(factData?.result?.factChecks) ? factData.result.factChecks : [];
  const factDiagnostics = Array.isArray(factData?.result?.factAndConceptDiagnostics)
    ? factData.result.factAndConceptDiagnostics
    : [];
  const langDiagnostics = langResults.flatMap((r) =>
    Array.isArray(r?.languageDiagnostics) ? r.languageDiagnostics : []
  );

  const combinedDiagnostics = tagSpotlightZones(
    [...factDiagnostics, ...langDiagnostics],
    preprocessed.spotlightZoneIds
  );

  const primaryLangPillars = langResults[0]?.pillarStatuses || {};
  const statusRank = { 'Critical Gap': 4, 'Needs Polish': 3, Balanced: 2, Strong: 1 };
  const mergeDualPillar = (key) => {
    const candidates = langResults.map((r) => r?.pillarStatuses?.[key]).filter(Boolean);
    if (candidates.length === 0) return { status: 'Balanced', feedback: 'Audited across full text.' };
    candidates.sort((a, b) => (statusRank[b.status] || 0) - (statusRank[a.status] || 0));
    return candidates[0];
  };

  return {
    factChecks,
    languageAndFactDiagnostics: combinedDiagnostics,
    pillarStatuses: {
      grammar_syntax: mergeDualPillar('grammar_syntax') || primaryLangPillars.grammar_syntax,
      expression: mergeDualPillar('expression') || primaryLangPillars.expression,
      analytical_depth: factData?.result?.analyticalDepthStatus || {
        status: 'Balanced',
        feedback: 'Factual & conceptual depth reviewed.'
      }
    },
    searchSources: factData?.searchSources || [],
    searchGrounded: Boolean(factData?.searchGrounded)
  };
};
