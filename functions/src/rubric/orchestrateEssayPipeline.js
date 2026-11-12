/**
 * Staged DAG Coordinator for FPSC CSS English Essay Evaluation (v2.1)
 *
 * Execution Order:
 *   Stage 0A: Agent 0 — Vision OCR (Skipped if typed text; parallel 4-page batches if images/PDF)
 *   Stage 0B: Deterministic Code Pre-Processor (Bulletproof Outline/Body boundary + [O/P/S] tags + word counts)
 *   Stage 1A: Agent 1 — Macro-Architect Runs FIRST (~1,200 tokens -> essayGenre, requiresCounterArgument, paragraphRoleMap)
 *   Stage 1A-Post: computeRoleFilteredPacingDecay() (Averages ONLY BODY_MAIN & COUNTER_ARGUMENT paragraphs)
 *   Stage 1B: Agent 2 (Paragraph Inspector) || Agent 3 (Fact & Language Critic + Selective Search Grounding) in Parallel
 *   Stage 2:  Agent 4 — Chief Examiner QA Verifier & Surgical Coach
 */

import { runAgent0VisionOcr } from './agent0VisionOcr.js';
import {
  preprocessEssaySubmission,
  computeRoleFilteredPacingDecay
} from './deterministicPreprocessor.js';
import { runAgent1MacroArchitect } from './agent1MacroArchitect.js';
import { runAgent2ParagraphInspector } from './agent2ParagraphInspector.js';
import { runAgent3FactLanguageCritic } from './agent3FactLanguageCritic.js';
import { runAgent4QaVerifierCoach } from './agent4QaVerifierCoach.js';

export const WEIGHTED_TOKENS_PER_CREDIT = 2500;
export const OUTPUT_TOKEN_MULTIPLIER = 3.5;

const createEssayTokenLedger = () => {
  const stages = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalThinkingTokens = 0;
  let totalRawTokens = 0;

  return {
    recordStage(stageName, modelName, usage = {}) {
      const inputTokens = Math.max(0, Number(usage.inputTokens || 0));
      const outputTokens = Math.max(0, Number(usage.outputTokens || 0));
      const thinkingTokens = Math.max(0, Number(usage.thinkingTokens || 0));
      const rawTokens = Math.max(
        0,
        Number(usage.totalTokens || inputTokens + outputTokens + thinkingTokens)
      );
      const stageWeighted = Math.round(
        inputTokens + OUTPUT_TOKEN_MULTIPLIER * (outputTokens + thinkingTokens)
      );

      totalInputTokens += inputTokens;
      totalOutputTokens += outputTokens;
      totalThinkingTokens += thinkingTokens;
      totalRawTokens += rawTokens;

      stages.push({
        stage: stageName,
        model: modelName,
        inputTokens,
        outputTokens,
        thinkingTokens,
        totalTokens: rawTokens,
        weightedTokens: stageWeighted
      });
    },

    finalize() {
      const weightedTokens = Math.round(
        totalInputTokens + OUTPUT_TOKEN_MULTIPLIER * (totalOutputTokens + totalThinkingTokens)
      );
      const creditsConsumed = Math.max(
        2,
        Math.min(60, Math.ceil(weightedTokens / WEIGHTED_TOKENS_PER_CREDIT))
      );

      return {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        thinkingTokens: totalThinkingTokens,
        totalTokens: totalRawTokens,
        weightedTokens,
        creditsConsumed,
        weightedTokensPerCredit: WEIGHTED_TOKENS_PER_CREDIT,
        outputMultiplier: OUTPUT_TOKEN_MULTIPLIER,
        stages
      };
    }
  };
};

/**
 * Extracts a clean 2-to-12 word verbatim substring from the candidate's text
 * so DocumentViewer can highlight it on the ruled notebook sheet with 100% accuracy.
 */
const resolveVerbatimHighlightPhrase = (quote = '', fullText = '') => {
  if (!quote || !fullText) return '';
  const cleaned = String(quote)
    .replace(/^\[[A-Z0-9.]+\]\s*/i, '')
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
    .trim();

  if (!cleaned) return '';

  const lowerFull = fullText.toLowerCase();
  if (lowerFull.includes(cleaned.toLowerCase())) {
    // If longer than 14 words, take the first 10 words that still match uniquely
    const words = cleaned.split(/\s+/);
    if (words.length > 14) {
      const slice10 = words.slice(0, 10).join(' ');
      if (lowerFull.includes(slice10.toLowerCase())) return slice10;
    }
    return cleaned;
  }

  // Try matching a 4–8 word sliding window from the quote against fullText
  const words = cleaned.split(/\s+/);
  for (let len = Math.min(8, words.length); len >= 3; len--) {
    for (let start = 0; start <= words.length - len; start++) {
      const candidate = words.slice(start, start + len).join(' ');
      if (candidate.length >= 8 && lowerFull.includes(candidate.toLowerCase())) {
        return candidate;
      }
    }
  }

  return cleaned.slice(0, 80);
};

export const executeCssEssayPipelineV2 = async ({
  text = '',
  imageArray = [],
  subject = 'English Essay',
  essayMode = 'full',
  examQuestion = '',
  mode = 'digital',
  apiKey,
  selectedModel = 'auto'
}) => {
  const ledger = createEssayTokenLedger();

  // ── STAGE 0A: Agent 0 Vision OCR (Bypassed if typed digital text) ──
  const ocrOutput = await runAgent0VisionOcr({
    text,
    imageArray,
    examQuestion,
    mode,
    apiKey,
    preferredModel: selectedModel,
    ledger
  });

  const effectiveText = ocrOutput.fullTranscribedText || String(text || '').trim();
  const effectiveTopic =
    examQuestion?.trim() || ocrOutput.detectedTitle || 'FPSC CSS English Essay';

  // ── STAGE 0B: Deterministic Code Pre-Processor (0 Tokens) ──
  const preprocessed = preprocessEssaySubmission(effectiveText, effectiveTopic);
  const effectiveEssayMode =
    essayMode === 'outline_only' || preprocessed.isOutlineOnly ? 'outline_only' : 'full';

  // ── STAGE 1A: Agent 1 Macro-Architect Runs FIRST (~2s on ~1,200 tokens) ──
  const agent1Output = await runAgent1MacroArchitect({
    examQuestion: effectiveTopic,
    preprocessed,
    essayMode: effectiveEssayMode,
    apiKey,
    preferredModel: selectedModel,
    ledger
  });

  // ── STAGE 1A-POST: Role-Filtered Pacing Decay Math (0 Tokens, Post-Agent 1) ──
  // Averages ONLY paragraphs tagged BODY_MAIN and COUNTER_ARGUMENT so short TRANSITION_BRIDGE
  // or CONTEXT_OVERVIEW paragraphs never trigger false -35% pacing decay penalties!
  const pacingMetrics = computeRoleFilteredPacingDecay(
    preprocessed.paragraphs,
    agent1Output.paragraphRoleMap
  );

  // ── STAGE 1B: Agents 2 & 3 Run in Parallel via Promise.all ──
  const [agent2Output, agent3Output] = await Promise.all([
    runAgent2ParagraphInspector({
      examQuestion: effectiveTopic,
      preprocessed,
      agent1Output,
      pacingMetrics,
      apiKey,
      preferredModel: selectedModel,
      ledger
    }),
    runAgent3FactLanguageCritic({
      examQuestion: effectiveTopic,
      preprocessed,
      agent1Output,
      apiKey,
      preferredModel: selectedModel,
      ledger
    })
  ]);

  // ── STAGE 2: Agent 4 Chief Examiner QA Verifier & Surgical Coach ──
  const agent4Output = await runAgent4QaVerifierCoach({
    examQuestion: effectiveTopic,
    preprocessed,
    agent1Output,
    pacingMetrics,
    agent2Output,
    agent3Output,
    handwritingAudit: ocrOutput.handwritingAudit,
    essayMode: effectiveEssayMode,
    apiKey,
    preferredModel: selectedModel,
    ledger
  });

  // Fallback to combined raw diagnostics if Agent 4 returned an empty verifiedDiagnostics array
  const rawCombined = [
    ...(agent1Output.macroDiagnostics || []),
    ...(agent2Output.paragraphDiagnostics || []),
    ...(agent3Output.languageAndFactDiagnostics || [])
  ];
  const verifiedList =
    agent4Output.verifiedDiagnostics && agent4Output.verifiedDiagnostics.length > 0
      ? agent4Output.verifiedDiagnostics
      : rawCombined;

  const tier1Fatal = verifiedList.filter((d) => d.tier === 'TIER_1_FATAL');
  const tier2Major = verifiedList.filter((d) => d.tier === 'TIER_2_MAJOR');
  const tier3Polish = verifiedList.filter((d) => d.tier === 'TIER_3_POLISH');
  const earnedSignifiers = verifiedList.filter((d) => d.tier === 'EARNED_SIGNIFIER');

  // Combine Pillar Statuses (100% Non-Scored Qualitative Readiness)
  const mergedPillars = {
    ...(agent1Output.pillarStatuses || {}),
    ...(agent2Output.pillarStatuses || {}),
    ...(agent3Output.pillarStatuses || {})
  };

  const buildPillarEntry = (key, fallbackStatus = 'Balanced', fallbackFeedback = '') => {
    const p = mergedPillars[key] || {};
    return {
      status: p.status || fallbackStatus,
      score: null,
      scored: false,
      isNonScored: true,
      feedback: p.feedback || fallbackFeedback
    };
  };

  const scoreBreakdown = {
    // Full Essay Pillars (10 Pillars)
    topic_relevance: buildPillarEntry(
      'topic_relevance',
      agent1Output.directiveAnalysis?.alignmentStatus === 'Aligned' ? 'Strong' : 'Balanced',
      agent1Output.directiveAnalysis?.feedback
    ),
    thesis: buildPillarEntry(
      'thesis',
      agent1Output.thesisAudit?.status || 'Balanced',
      agent1Output.thesisAudit?.critique
    ),
    outline: buildPillarEntry(
      'outline',
      agent1Output.outlineAlignment?.status || 'Balanced',
      agent1Output.outlineAlignment?.summary
    ),
    introduction: buildPillarEntry('introduction', 'Balanced'),
    body_paragraphs: buildPillarEntry('body_paragraphs', 'Balanced'),
    evidences: buildPillarEntry('evidences', 'Balanced'),
    coherence: buildPillarEntry(
      'coherence',
      pacingMetrics.pacingDecayFlag ? 'Needs Polish' : 'Balanced',
      pacingMetrics.summary
    ),
    analytical_depth: buildPillarEntry('analytical_depth', 'Balanced'),
    expression: buildPillarEntry('expression', 'Balanced'),
    grammar_syntax: buildPillarEntry('grammar_syntax', 'Balanced'),
    conclusion: buildPillarEntry('conclusion', 'Balanced'),

    // Outline-Only Mode Aliases
    topic_decoding: buildPillarEntry(
      'topic_relevance',
      agent1Output.directiveAnalysis?.alignmentStatus === 'Aligned' ? 'Strong' : 'Balanced',
      agent1Output.directiveAnalysis?.feedback
    ),
    outline_structure: buildPillarEntry(
      'outline',
      agent1Output.outlineAlignment?.status || 'Balanced',
      agent1Output.outlineAlignment?.summary
    ),
    parallelism: buildPillarEntry(
      'expression',
      agent1Output.headerUpgrades?.length > 2 ? 'Needs Polish' : 'Balanced',
      'Evaluated grammatical parallelism and self-explanatory phrasing across Outline sections.'
    ),
    coverage_originality: buildPillarEntry(
      'analytical_depth',
      'Balanced',
      agent1Output.directiveAnalysis?.feedback
    )
  };

  // Deterministically map verifiedDiagnostics into inline paper annotations
  const seenPhrases = new Set();
  const finalAnnotations = [];

  for (let i = 0; i < verifiedList.length; i++) {
    const d = verifiedList[i];
    const targetPhrase = resolveVerbatimHighlightPhrase(
      d.exact_verbatim_quote,
      effectiveText
    );
    if (!targetPhrase || targetPhrase.length < 2) continue;

    const key = targetPhrase.toLowerCase();
    if (seenPhrases.has(key)) continue;
    seenPhrases.add(key);

    finalAnnotations.push({
      id: `ann-${finalAnnotations.length + 1}`,
      locationId: d.location_id || '',
      tier: d.tier || 'TIER_3_POLISH',
      targetPhrase,
      type:
        d.tier === 'TIER_1_FATAL' || d.tier === 'TIER_2_MAJOR'
          ? 'red'
          : d.tier === 'EARNED_SIGNIFIER'
          ? 'green'
          : 'amber',
      category: d.category || 'Diagnostic',
      comment: d.observation || '',
      suggestion: d.suggested_fix || null,
      microLesson: d.micro_rule || ''
    });
  }

  const introWordCount = preprocessed.paragraphs[0]?.wordCount || 0;
  const tokenUsage = ledger.finalize();

  return {
    id: `eval-${Date.now()}`,
    subject,
    essayMode: effectiveEssayMode,
    scored: false,
    isNonScoredEssay: true,
    rubricVersion: '2.1',
    archetypeId: effectiveEssayMode === 'outline_only' ? 'essay_outline' : 'essay',
    archetypeLabel:
      effectiveEssayMode === 'outline_only'
        ? 'FPSC Essay Outline & Thesis Blueprint Audit (v2.1)'
        : 'FPSC CSS English Essay Diagnostic (v2.1)',
    evaluatedModelId: 'gemini-3.8-flash',
    evaluatedModelName: 'Gemini 3.8 Flash',
    topic: effectiveTopic,
    examQuestion: effectiveTopic,
    overallReadiness: agent4Output.overallReadiness,
    gradeBand: agent4Output.overallReadiness,
    examinerSummary: agent4Output.examinerSummary,
    essayGenre: agent1Output.essayGenre,
    requiresCounterArgument: agent1Output.requiresCounterArgument,
    genreRationale: agent1Output.genreRationale,
    paragraphRoleMap: agent1Output.paragraphRoleMap,
    pacingMetrics,
    qaAuditLog: agent4Output.qaAuditLog,
    handwritingAudit: ocrOutput.handwritingAudit,
    diagnosticTiers: {
      tier1Fatal,
      tier2Major,
      tier3Polish,
      earnedSignifiers
    },
    verifiedDiagnostics: verifiedList,
    directiveAnalysis: agent1Output.directiveAnalysis,
    thesisAudit: {
      candidateThesis:
        agent1Output.thesisAudit?.extractedThesis ||
        agent1Output.thesisAudit?.candidateThesis ||
        '',
      extractedThesis:
        agent1Output.thesisAudit?.extractedThesis ||
        agent1Output.thesisAudit?.candidateThesis ||
        '',
      status: agent1Output.thesisAudit?.status || 'Balanced',
      critique: agent1Output.thesisAudit?.critique || '',
      modelTopperThesis: agent1Output.thesisAudit?.modelTopperThesis || ''
    },
    outlineAlignment: agent1Output.outlineAlignment,
    headerUpgrades: agent1Output.headerUpgrades,
    surgicalRewrites: agent4Output.surgicalRewrites,
    rewrites: agent4Output.surgicalRewrites,
    factCheck: agent3Output.factChecks,
    searchSources: agent3Output.searchSources || [],
    annotations: finalAnnotations,
    thingsToInclude: agent4Output.thingsToInclude,
    suggestedVisual: agent4Output.suggestedVisual,
    scoreBreakdown,
    fullTranscribedText: effectiveText,
    transcribedText: effectiveText,
    text: effectiveText,
    wordCount: preprocessed.totalWordCount,
    outlineWordCount: preprocessed.outlineWordCount,
    bodyWordCount: preprocessed.bodyWordCount,
    introWordCount,
    targetIntroWords: 200,
    tokenUsage,
    creditsConsumed: tokenUsage.creditsConsumed
  };
};
