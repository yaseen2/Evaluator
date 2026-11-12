/**
 * Stage 1B (Parallel Branch 1): Agent 2 — Paragraph & Logic Inspector (v2.1)
 *
 * Uses Agent 1's essayGenre, requiresCounterArgument, extractedThesis, and paragraphRoleMap,
 * plus the Post-Agent-1 Role-Filtered Pacing Decay metrics, to audit every paragraph according
 * to its TRUE structural role.
 */

import { callGenAiAgentWithFailover } from './safeJsonParser.js';
import { ESSAY_GENRE_PLAYBOOKS, GUARDRAIL_EXCEPTIONS } from './essayRubricConfig.js';

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

=== MANDATORY GUARDRAIL EXCEPTIONS (NEVER VIOLATE) ===
${GUARDRAIL_EXCEPTIONS.map((g, i) => `${i + 1}. ${g}`).join('\n')}

=== FULL TAGGED ESSAY TRANSCRIPT ===
${preprocessed.fullTaggedTranscript}
====================================

YOUR 6 DIAGNOSTIC AUDIT TASKS:
1. ROLE-AWARE PARAGRAPH EVALUATION (Respect paragraphRoleMap!):
   - For paragraphs tagged "TRANSITION_BRIDGE" or "CONTEXT_OVERVIEW":
     * Evaluate ONLY whether they smoothly connect sections or contextualize the topic.
     * NEVER penalize a "TRANSITION_BRIDGE" or "CONTEXT_OVERVIEW" paragraph for being short (<100 words) or lacking empirical statistics!
   - For paragraphs tagged "BODY_MAIN":
     * Topic Sentence ([Pk.S1]): Must state a clear analytical claim linked to the prompt. Flag bare textbook definitions, announcements ("In this paragraph..."), or raw facts without an argument.
     * Paragraph Unity (1 Paragraph = 1 Central Argument): Flag "Laundry-List Paragraphs" that cram 3–4 separate arguments into a single paragraph without analytical depth. (Remember: citing 2 complementary pieces of evidence to prove ONE single argument is 100% valid! Also, a brief Forward Transition Hook in the final clause previewing the next paragraph is 100% valid!)
     * Causal Chain vs. "Grafted / Franken-Paragraph": Check if the middle sentences [S2..S(m-1)] genuinely develop [S1], or if the candidate bolted a pre-memorized paragraph from another topic onto a forced first/last sentence ("Grafted Paragraph" -> 🔴 TIER_1_FATAL or 🟠 TIER_2_MAJOR).
     * Mode-Lock Check:
       - In a "Causes / Drivers" paragraph: Does the paragraph explain HOW the cause impacts the prompt's main subject?
       - In a "Way Forward / Solutions" paragraph: Does it explain the solution mechanism (HOW to implement + expected outcome), or does it suffer from "Mode-Lock Failure" (spending 80% of the paragraph re-describing the problem and tacking on "Therefore, the government must act" in the last line)?
     * Natural Analytical Closure (NO "Burger Prison"): Check whether the final sentence [Pk.Sm] synthesizes the paragraph's point back to the prompt/thesis. NEVER demand formulaic words like "Hence," or "Therefore,".

2. GONDAL'S OPEN EVIDENCE PHILOSOPHY & POST-EVIDENCE INTEGRATION:
   - Anything that verifiably substantiates, illustrates, or proves the claim counts as valid evidence (empirical statistics, historical precedents, constitutional/legal provisions, scholarly books, institutional mechanisms, case studies, comparative models, philosophical deductions, sociological observations).
   - If essayGenre === "ABSTRACT_PHILOSOPHICAL", NEVER demand Economic Survey GDP stats—welcome philosophical, historical, psychological, literary, and deductive proofs.
   - Audit Evidence Quality & Integration:
     * Flag "Hawai Firing" (sweeping assertions with zero substantiation of any kind -> 🟠 TIER_2_MAJOR).
     * Flag "Heirless / Nameless Proof" ("According to a report...", "Experts say..." with no named source -> 🔵 TIER_3_POLISH or 🟠 TIER_2_MAJOR).
     * Flag "Dropped / Unintegrated Proof" (citing a quote/stat without 1–2 sentences explaining how it proves the Topic Sentence).

3. COUNTER-ARGUMENT & REBUTTAL AUDIT (Only when requiresCounterArgument === true):
   - If requiresCounterArgument === false, do NOT penalize the absence of counter-arguments.
   - If requiresCounterArgument === true:
     * Check whether the essay includes a Counter-Argument section.
     * Check the 50/50 Self-Contained Rebuttal Rule on any "COUNTER_ARGUMENT" paragraph: Did the student briefly state the opposing view ("Critics contend...") and immediately refute it with stronger evidence inside the SAME paragraph, or did they leave a whole paragraph validating the opposing side unrefuted ("Self-Sabotage")?

4. CROSS-PARAGRAPH CONTRADICTION DETECTOR:
   - Scan across P1..P${preprocessed.paragraphs.length} for internal self-contradictions (e.g., arguing in P4 that state institutions are completely paralysed, then claiming in P10 that those same institutions have effortlessly resolved regional crises).

5. ROLE-FILTERED PACING DECAY:
   - If pacingMetrics.pacingDecayFlag === true (decay <= -35%), include a diagnostic item explaining how the 2nd-half substantive body paragraphs (${pacingMetrics.secondHalfIds.join(', ')}) shrank to an average of ${pacingMetrics.secondHalfAvgWords} words compared to ${pacingMetrics.firstHalfAvgWords} words in the 1st half ("2nd-Half Exam Fatigue / Skeleton Paragraphs").

6. EXTRACT EARNED TOPPER SIGNIFIERS:
   - Whenever a body paragraph demonstrates exceptional Topic-to-Clincher cohesion, seamless Forward-Hook transition, or multi-disciplinary evidence integration, record it as an "EARNED_SIGNIFIER" with its exact verbatim quote.

CRITICAL QUOTE-LOCK RULE:
Every item in "paragraphDiagnostics" MUST carry an exact "location_id" (e.g., "P4.S1", "P7.S3") and an "exact_verbatim_quote" copied verbatim from the transcript.

Return ONLY this JSON object:
{
  "paragraphDiagnostics": [
    {
      "location_id": "string (e.g. P3.S1, P6.S4)",
      "exact_verbatim_quote": "string (Exact verbatim substring from that paragraph/sentence)",
      "tier": "TIER_1_FATAL" | "TIER_2_MAJOR" | "TIER_3_POLISH" | "EARNED_SIGNIFIER",
      "category": "string (e.g. Grafted Paragraph, Mode-Lock Failure, Laundry-List Unity Breach, Hawai Firing, Heirless Citation, 50/50 Rebuttal, Pacing Decay, Earned Signifier)",
      "observation": "string (Specific analytical diagnosis)",
      "suggested_fix": "string (Concrete fix or rewritten sentence)"
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
    maxOutputTokens: 6144,
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

