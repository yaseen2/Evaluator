/**
 * Stage 1B (Parallel Branch 1): Agent 2 — Paragraph & Logic Inspector (v2.1)
 *
 * Uses Agent 1's essayGenre, requiresCounterArgument, extractedThesis, and paragraphRoleMap,
 * plus the Post-Agent-1 Role-Filtered Pacing Decay metrics, to audit every paragraph according
 * to its TRUE structural role.
 */

import { callGenAiAgentWithFailover } from './safeJsonParser.js';
import {
  ESSAY_GENRE_PLAYBOOKS,
  SHARED_SAFE_HARBOR_DIRECTIVE,
  PLAIN_ENGLISH_AND_TONE_DIRECTIVE
} from './essayRubricConfig.js';

const buildAgent2Prompt = ({
  examQuestion,
  preprocessed,
  agent1Output,
  pacingMetrics
}) => {
  const genrePlaybook =
    ESSAY_GENRE_PLAYBOOKS[agent1Output.essayGenre] ||
    ESSAY_GENRE_PLAYBOOKS.DESCRIPTIVE_ISSUE;

  return `
You are Agent 2: FPSC CSS PARAGRAPH & LOGIC INSPECTOR.
You audit body paragraph anatomy, internal causal cohesion, evidence integration, and cross-paragraph logic.
CRITICAL JSON RULE: Never use unescaped double quotes (") inside JSON string values; always use single quotes ('...') when quoting words or phrases inside a string.

=== CONTEXT FROM AGENT 1 (MACRO-ARCHITECT) ===
- Essay Topic: "${examQuestion}"
- Classified Essay Genre: ${agent1Output.essayGenre} (${genrePlaybook.label})
- Requires Counter-Argument: ${agent1Output.requiresCounterArgument}
- Extracted Thesis Statement: "${agent1Output.thesisAudit?.extractedThesis || 'Not explicitly stated'}"
- Paragraph Role Map (Authoritative):
${JSON.stringify(agent1Output.paragraphRoleMap, null, 2)}

=== ROLE-FILTERED PACING DECAY MATH (0-TOKEN VERIFIED) ===
- ${pacingMetrics.summary}
- 1st-Half Substantive Body Avg: ${pacingMetrics.firstHalfAvgWords} words (${pacingMetrics.firstHalfIds.join(', ')})
- 2nd-Half Substantive Body Avg: ${pacingMetrics.secondHalfAvgWords} words (${pacingMetrics.secondHalfIds.join(', ')})
- Pacing Decay Percentage: ${pacingMetrics.decayPercent}% (Flagged >= -35% Decay: ${pacingMetrics.pacingDecayFlag})

=== GENRE EVIDENCE & STRUCTURE EXPECTATION ===
- ${genrePlaybook.outlineRatioRule}
- ${genrePlaybook.evidenceExpectation}

=== ${SHARED_SAFE_HARBOR_DIRECTIVE}

${PLAIN_ENGLISH_AND_TONE_DIRECTIVE}

=== FULL TAGGED ESSAY TRANSCRIPT ===
${preprocessed.fullTaggedTranscript}
====================================

YOUR 6 DIAGNOSTIC AUDIT TASKS (Use Simple, Student-Friendly Feedback Headings):
1. ROLE-AWARE PARAGRAPH EVALUATION (Respect paragraphRoleMap!):
   - For paragraphs tagged "TRANSITION_BRIDGE" or "CONTEXT_OVERVIEW":
     * Evaluate ONLY whether they smoothly connect sections or contextualize the Essay Title.
     * NEVER penalize a "TRANSITION_BRIDGE" or "CONTEXT_OVERVIEW" paragraph for being short (<100 words) or lacking empirical statistics!
   - For paragraphs tagged "BODY_MAIN":
     * Topic Sentence ([Pk.S1]): Must state a clear point directly answering the Essay Title. Flag bare textbook definitions, announcements ("In this paragraph..."), or raw facts without an argument.
     * Paragraph Unity (1 Paragraph = 1 Main Idea): Flag overcrowded paragraphs that cram 3–4 separate ideas into a single paragraph without depth. (Remember: citing multiple complementary proofs for ONE single idea is valid, and a brief closing bridge sentence previewing the next paragraph is valid!)
     * Logical Flow vs. Unrelated Paragraph: Check if the middle sentences [S2..S(m-1)] genuinely develop [S1], or if the student forced a memorized, unrelated paragraph onto a made-up opening/closing sentence (🔴 TIER_1_FATAL or 🟠 TIER_2_MAJOR).
     * Section Focus Discipline:
       - In a "Causes / Drivers" paragraph: Does it explain HOW the cause impacts the Essay Title's subject?
       - In a "Way Forward / Solutions" paragraph: Does it explain HOW to implement the solution and its outcome, rather than wasting most of the paragraph re-explaining the problem and adding one weak closing sentence?
     * Natural Closing Sentence: Check whether the final sentence [Pk.Sm] ties the paragraph's point back smoothly to the Essay Title/Thesis.

2. OPEN EVIDENCE PRINCIPLE & EXPLANATION OF PROOF:
   - Any verifiable proof that substantiates the claim counts (statistics, historical examples, constitutional/legal articles, scholarly books, institutional examples, case studies, or logical reasoning).
   - If essayGenre === "ABSTRACT_PHILOSOPHICAL", NEVER demand Economic Survey GDP stats—welcome philosophical, historical, literary, psychological, and deductive proofs.
   - Audit Evidence Quality & Explanation:
     * Flag Unproved Claims (big sweeping claims with zero supporting example, data, or reasoning -> 🟠 TIER_2_MAJOR).
     * Flag Unnamed Sources ("According to a report...", "Experts say..." with no named institution, author, or year -> 🔵 TIER_3_POLISH or 🟠 TIER_2_MAJOR).
     * Flag Unexplained Quotes or Stats (dropping a number or quote without 1–2 sentences explaining how it proves your Topic Sentence).

3. COUNTER-ARGUMENT & REBUTTAL CHECK (Optional Advice Only):
   - NEVER penalize omitting a Counter-Argument as TIER_1_FATAL or TIER_2_MAJOR (Agent 1 handles optional 🔵 TIER_3_POLISH tips where helpful).
   - ONLY if the candidate ACTUALLY WROTE a "COUNTER_ARGUMENT" paragraph: check that they briefly present the opposing view ("Critics argue...") and clearly refute it in the SAME paragraph rather than agreeing with the opposition unrefuted (🟠 TIER_2_MAJOR).

4. CONTRADICTIONS, REASONING MISTAKES & TONE CHECK:
   - Scan across P1..P${preprocessed.paragraphs.length} for contradictions across paragraphs (arguing one claim early and its opposite later).
   - Catch clear reasoning fallacies (e.g., mistaking correlation for cause, black-and-white extremes, overgeneralizing from one incident, strawman arguments, circular reasoning).
   - Catch inappropriate tone (preachy sermonizing, dry bullet-style policy report without prose flow, or casual newspaper/blog opinion tone).

5. LATE-ESSAY SHORT PARAGRAPHS (USING WORD COUNTS):
   - Check the exact word counts "[Pk | Xw]" printed on each paragraph. Only if later main body paragraphs shrink into rushed, weak, underdeveloped skeletons lacking proof or explanation (for instance, due to running out of time), note that gently in simple English. NEVER penalize valid short transition bridges or conclusions.

6. STRONG POINTS ("EARNED_SIGNIFIER"):
   - Whenever a body paragraph shows strong unity, smooth transitions, or well-explained proof, record it as "EARNED_SIGNIFIER" with an exact verbatim quote.

CRITICAL QUOTE-LOCK RULE:
Every item in "paragraphDiagnostics" MUST carry an exact "location_id" (e.g., "P4.S1", "P7.S3") and an "exact_verbatim_quote" copied verbatim from the transcript.

Return ONLY this JSON object:
{
  "paragraphDiagnostics": [
    {
      "location_id": "string (e.g. P3.S1, P6.S4)",
      "exact_verbatim_quote": "string (Exact verbatim substring from that paragraph/sentence)",
      "tier": "TIER_1_FATAL" | "TIER_2_MAJOR" | "TIER_3_POLISH" | "EARNED_SIGNIFIER",
      "category": "string (Simple student-friendly heading: e.g. Unrelated Paragraph, Wrong Section Focus, Overcrowded Paragraph, Weak Topic Sentence, Unproved Claim, Unnamed Source, Unexplained Quote/Stat, Short Late Paragraph, Strong Point)",
      "observation": "string (Simple, clear explanation any CSS student can understand)",
      "suggested_fix": "string (Concrete fix or rewritten sentence in plain English)"
    }
  ],
  "pillarStatuses": {
    "body_paragraphs": { "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap", "feedback": "string" },
    "coherence": { "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap", "feedback": "string" },
    "evidences": { "status": "Strong" | "Balanced" | "Needs Polish" | "Critical Gap", "feedback": "string" }
  }
}
`;
};

export const runAgent2ParagraphInspector = async ({
  examQuestion,
  preprocessed,
  agent1Output,
  pacingMetrics,
  apiKey,
  preferredModel = 'auto',
  ledger = null
}) => {
  // If Outline-Only submission (0 body paragraphs), return clean empty structure immediately (0 tokens)
  if (preprocessed.isOutlineOnly || preprocessed.paragraphs.length === 0) {
    return {
      paragraphDiagnostics: [],
      pillarStatuses: {
        body_paragraphs: {
          status: 'Needs Polish',
          feedback: 'Outline-only submission; body paragraphs were not included in this draft.'
        },
        coherence: {
          status: 'Balanced',
          feedback: 'Evaluated based on outline progression.'
        },
        evidences: {
          status: 'Needs Polish',
          feedback: 'Outline-only submission; empirical/analytical evidence in prose not yet written.'
        }
      }
    };
  }

  const prompt = buildAgent2Prompt({
    examQuestion,
    preprocessed,
    agent1Output,
    pacingMetrics
  });

  const { result } = await callGenAiAgentWithFailover({
    apiKey,
    prompt,
    enableGoogleSearch: false,
    temperature: 0.2,
    maxOutputTokens: 16384,
    preferredModel,
    stageName: 'Agent 2: Paragraph & Logic Inspector',
    ledger
  });

  return {
    paragraphDiagnostics: Array.isArray(result?.paragraphDiagnostics)
      ? result.paragraphDiagnostics
      : [],
    pillarStatuses: result?.pillarStatuses || {}
  };
};

