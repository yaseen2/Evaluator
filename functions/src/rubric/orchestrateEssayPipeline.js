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

  // Group verified diagnostics by Tier for UI badges
  const verifiedList = agent4Output.verifiedDiagnostics || [];
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
      score: null, // Explicitly null: CSS Essay Rubric v2.1 is strictly non-scored
      isNonScored: true,
      feedback: p.feedback || fallbackFeedback
    };
  };

  const scoreBreakdown = {
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
    coherence: buildPillarEntry(
      'coherence',
      pacingMetrics.pacingDecayFlag ? 'Needs Polish' : 'Balanced',
      pacingMetrics.summary
    ),
    evidences: buildPillarEntry('evidences', 'Balanced'),
    analytical_depth: buildPillarEntry('analytical_depth', 'Balanced'),
    expression: buildPillarEntry('expression', 'Balanced'),
    grammar_syntax: buildPillarEntry('grammar_syntax', 'Balanced'),
    conclusion: buildPillarEntry('conclusion', 'Balanced')
  };

  // Ensure annotations carry valid ids and fallback to verifiedList if empty
  const finalAnnotations =
    agent4Output.annotations && agent4Output.annotations.length > 0
      ? agent4Output.annotations.map((ann, idx) => ({
          id: ann.id || `ann-${idx + 1}`,
          locationId: ann.locationId || '',
          tier: ann.tier || (ann.type === 'red' ? 'TIER_2_MAJOR' : ann.type === 'green' ? 'EARNED_SIGNIFIER' : 'TIER_3_POLISH'),
          targetPhrase: ann.targetPhrase || '',
          type: ann.type || 'amber',
          category: ann.category || 'Diagnostic',
          comment: ann.comment || '',
          suggestion: ann.suggestion || null,
          microLesson: ann.microLesson || ''
        }))
      : verifiedList.slice(0, 18).map((d, idx) => ({
          id: `ann-${idx + 1}`,
          locationId: d.location_id || '',
          tier: d.tier,
          targetPhrase: d.exact_verbatim_quote || '',
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
        }));

  const introWordCount = preprocessed.paragraphs[0]?.wordCount || 0;
  const tokenUsage = ledger.finalize();

  return {
    id: `eval-${Date.now()}`,
    subject,
    essayMode: effectiveEssayMode,
    isNonScoredEssay: true,
    rubricVersion: '2.1',
    topic: effectiveTopic,
    examQuestion: effectiveTopic,
    overallReadiness: agent4Output.overallReadiness,
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
    thesisAudit: agent1Output.thesisAudit,
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
    transcribedText: effectiveText,
    wordCount: preprocessed.totalWordCount,
    outlineWordCount: preprocessed.outlineWordCount,
    bodyWordCount: preprocessed.bodyWordCount,
    introWordCount,
    targetIntroWords: 200,
    tokenUsage
  };
};

