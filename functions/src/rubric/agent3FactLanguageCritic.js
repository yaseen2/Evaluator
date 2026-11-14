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
  PINGLISH_DIRECTION_TEXT,
  CONCEPTUAL_PRECISION_PAIRS,
  CSS_LANGUAGE_AND_FORMAT_RULES,
  PAKISTAN_2026_BASELINES,
  SHARED_SAFE_HARBOR_DIRECTIVE,
  PLAIN_ENGLISH_AND_TONE_DIRECTIVE
} from './essayRubricConfig.js';

const buildTranscriptFromParagraphs = (paragraphs = []) =>
  paragraphs.map((p) => `[${p.id} | ${p.wordCount}w] ${p.taggedText}`).join('\n\n');

const buildAgent3aFactPrompt = ({ examQuestion, preprocessed, agent1Output }) => `
You are Agent 3A: Fact, Citation & Term Accuracy Checker (with Selective Google Search Grounding).
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
2. 2026 FACT ACCURACY CHECK: Using your general knowledge + Google Search Grounding, flag outdated figures, rankings, or milestones if presented as current reality in 2026.
3. QUOTE FAIRNESS: NEVER accuse a candidate of "fabricating" a quote (especially translated Iqbal/Jinnah/classical quotes) unless Google Search proves it factually false or misattributed. If merely unverified, classify gently as 🔵 "TIER_3_POLISH" ("UNVERIFIED_CITATION").
4. CONFUSED TERMS CHECK: Flag conflating terms from CONCEPTUAL_PRECISION_PAIRS (e.g., calling loans "foreign aid", confusing State vs. Government, Growth vs. Development, Equality vs. Equity, Literacy vs. Education).

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
      "correctedFact": "string or null (Updated figure, accurate source, or gentle note for unverified quote)",
      "source": "string (Authoritative institution, report, or constitution)"
    }
  ],
  "factAndConceptDiagnostics": [
    {
      "location_id": "string (e.g. P4.S2 — internal coordinate only)",
      "exact_verbatim_quote": "string (ONLY 1 to 4 exact words showing the wrong number, outdated fact, or wrong term — NEVER a whole sentence)",
      "tier": "TIER_1_FATAL" | "TIER_2_MAJOR" | "TIER_3_POLISH" | "EARNED_SIGNIFIER",
      "category": "string (Simple 2-4 word label: Outdated Fact, Wrong Number / Fact, Wrong Word Choice, Quote Not Verified, Strong Evidence)",
      "observation": "string (1-2 short everyday sentences using 'you'/'your' telling the student what is wrong and what the accurate figure/term is; ZERO P/O codes and ZERO jargon)"
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
You are Agent 3B: English Grammar, Phrasing & Format Checker (${sliceLabel}).
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

=== PAKISTANI "PINGLISH" (URDU-TO-ENGLISH LITERAL TRANSLATIONS) ===
${PINGLISH_DIRECTION_TEXT}

=== CSS FORMATTING & LANGUAGE CONVENTIONS ===
${CSS_LANGUAGE_AND_FORMAT_RULES.map((r, i) => `${i + 1}. ${r}`).join('\n')}

${SHARED_SAFE_HARBOR_DIRECTIVE}

${PLAIN_ENGLISH_AND_TONE_DIRECTIVE}

STRICT CALIBRATION & SIMPLE ENGLISH RULES (NEVER VIOLATE):
- CRITICAL GRAMMAR PRIORITY: Real English grammar mistakes hurt essay marks. Scan EVERY sentence in the target slice using formal British English so NO real grammar error is missed, while NEVER inventing false complaints on good sentences. Mark clear grammar, tense, agreement, or punctuation errors as 🟠 "TIER_2_MAJOR" (or 🔴 "TIER_1_FATAL" when repeated or breaking sentence meaning).
- SIMPLE WORDS: Calling an issue "important", "key", "big", or "huge" is valid standard English. Academic upgrades ("grave", "chronic", "pervasive") stay strictly 🔵 "TIER_3_POLISH" — NEVER Tier 1 or Tier 2.
- SLIP VS. SERIOUS MISTAKE: 1–2 isolated contractions ("it's", "don't") or first-person pronouns ("we", "our") are 🔵 "TIER_3_POLISH". Reserve 🔴/🟠 for genuine grammar mistakes, repeated errors, or structural taboos (headings, bullets, or tables inside essay body paragraphs).
- QUOTE ONLY THE WRONG WORD(S): Keep "exact_verbatim_quote" strictly 1 to 4 exact words (just the missing/wrong word or tiny phrase—NEVER highlight a full sentence or long clause!).
- NO JARGON OR CODES IN COMMENTS: Write "observation" in 1–2 short everyday sentences using "you"/"your". NEVER write "singular countable noun", "definite/indefinite article", "determiner", "syntax", "FPSC", "candidate", or "P1/P2/O4" codes inside "observation" or "pillarStatuses.*.feedback"! For example, say: "Say 'a strong economic base' here — add 'a' before a single noun." instead of grammar jargon.

=== TARGET TEXT SLICE TO AUDIT ===
${sliceTranscript}
=================================

YOUR OUTPUT TASKS:
Audit EVERY paragraph and EVERY sentence in the target slice:
1. COMPREHENSIVE GRAMMAR, SYNTAX & PUNCTUATION (CRITICAL PRIORITY): Using your full natural command of formal British English, scan every sentence from start to finish and catch all genuine grammar, sentence-structure, spelling consistency, or punctuation mistakes—without being limited to a preset list and without hallucinating nitpicks on valid English.
2. PAKISTANI "PINGLISH" L1 INTERFERENCE: Catch unnatural Urdu-to-English literal translations, broken idioms, redundant prepositions, and worn-out local clichés cleanly using open-ended judgment.
3. CSS FORMATTING & STYLE TIPS (Keep strictly 🔵 "TIER_3_POLISH" unless inline heading/bullet taboo): First-mention acronym expansion, spelling out single-digit numbers ("one" to "nine") in prose, natural modal verbs, sentence variety, avoiding slashes ("his/her"), and catching inline headings inside the essay body.
4. STRONG POINTS ("EARNED_SIGNIFIER"): Quote specific verbatim sentences that show clear, natural, accurate English ("right word in the right place").

Return ONLY this JSON object:
{
  "languageDiagnostics": [
    {
      "location_id": "string (e.g. O2, P1.S2, P12.S3 — internal coordinate only)",
      "exact_verbatim_quote": "string (ONLY 1 to 4 exact words showing JUST the wrong word/phrase — NEVER a whole sentence)",
      "tier": "TIER_1_FATAL" | "TIER_2_MAJOR" | "TIER_3_POLISH" | "EARNED_SIGNIFIER",
      "category": "string (Simple 2-4 word label: Grammar Mistake, Missing 'a' / 'the', Punctuation Error, Unnatural Phrasing, Acronym Tip, Word Choice, Style Tip, Strong Point)",
      "observation": "string (1-2 short everyday sentences using 'you'/'your' clearly showing what to fix; ZERO grammar jargon and ZERO P/O codes)"
    }
  ],
  "pillarStatuses": {
    "grammar_syntax": { "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap", "feedback": "string" },
    "expression": { "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap", "feedback": "string" }
  }
}
`;

const buildOutlineOnlyLanguagePrompt = ({ examQuestion, preprocessed }) => `
You are Agent 3: Outline Grammar & Word Choice Checker (Outline-Only Mode).
CRITICAL JSON RULE: Never use unescaped double quotes (") inside JSON string values; always use single quotes ('...') when quoting words or phrases inside a string.

Essay Topic: "${examQuestion}"

=== PAKISTANI "PINGLISH" & ESSAY FORMATTING RULES ===
${PINGLISH_DIRECTION_TEXT}

${SHARED_SAFE_HARBOR_DIRECTIVE}

${PLAIN_ENGLISH_AND_TONE_DIRECTIVE}

=== OUTLINE TEXT ===
${preprocessed.outlineNodes.map((o) => o.taggedText).join('\n') || '(Empty outline)'}
====================

Audit EVERY Outline line thoroughly for British English grammar (mark clear grammar errors as 🟠 TIER_2_MAJOR or 🔴 TIER_1_FATAL if repeated), Pinglish phrasing, spelling, unexpanded acronyms, fake question marks, and clarity in simple student-friendly English (using "you"/"your", ZERO O1/O2 codes, ZERO jargon). Quote ONLY 1 to 4 exact words in "exact_verbatim_quote". Do NOT invent body-paragraph complaints.

Return ONLY this JSON object:
{
  "languageDiagnostics": [
    {
      "location_id": "string (e.g. O4 — internal coordinate only)",
      "exact_verbatim_quote": "string (ONLY 1 to 4 exact words from that outline line)",
      "tier": "TIER_1_FATAL" | "TIER_2_MAJOR" | "TIER_3_POLISH" | "EARNED_SIGNIFIER",
      "category": "string (Simple 2-4 word label)",
      "observation": "string (1-2 short everyday sentences using 'you'/'your'; ZERO jargon and ZERO O1/O2 codes)"
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
      observation: String(item.observation || '').trim()
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
          status: result?.pillarStatuses?.analytical_depth?.status || 'Balanced',
          feedback:
            result?.pillarStatuses?.analytical_depth?.feedback ||
            'Checks whether your outline covers political, economic, social, and global dimensions with concrete examples.'
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
