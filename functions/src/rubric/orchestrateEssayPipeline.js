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
  computeRoleFilteredPacingDecay,
  reconcileAiStructuralBoundary
} from './deterministicPreprocessor.js';
import { runAgent1MacroArchitect } from './agent1MacroArchitect.js';
import { runAgent2ParagraphInspector } from './agent2ParagraphInspector.js';
import { runAgent3FactLanguageCritic } from './agent3FactLanguageCritic.js';
import { runAgent4QaVerifierCoach } from './agent4QaVerifierCoach.js';

export const WEIGHTED_TOKENS_PER_CREDIT = 2500;
export const OUTPUT_TOKEN_MULTIPLIER = 3;
export const THINKING_TOKEN_MULTIPLIER = 2;

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
        inputTokens +
          OUTPUT_TOKEN_MULTIPLIER * outputTokens +
          THINKING_TOKEN_MULTIPLIER * thinkingTokens
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
        totalInputTokens +
          OUTPUT_TOKEN_MULTIPLIER * totalOutputTokens +
          THINKING_TOKEN_MULTIPLIER * totalThinkingTokens
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
        thinkingMultiplier: THINKING_TOKEN_MULTIPLIER,
        stages
      };
    }
  };
};

/**
 * Extracts a concise 1-to-5 word verbatim substring from the student's text
 * so DocumentViewer underlines only the specific faulty word/phrase rather than full sentences.
 */
const resolveVerbatimHighlightPhrase = (quote = '', fullText = '') => {
  if (!quote || !fullText) return '';
  const cleaned = String(quote)
    .replace(/^\[[A-Z0-9.]+\]\s*/i, '')
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';

  const lowerFull = fullText.toLowerCase();
  const words = cleaned.split(/\s+/).filter(Boolean);

  if (lowerFull.includes(cleaned.toLowerCase())) {
    if (words.length <= 5) {
      return cleaned;
    }
    const slice4 = words.slice(0, 4).join(' ');
    if (lowerFull.includes(slice4.toLowerCase())) return slice4;
    const slice3 = words.slice(0, 3).join(' ');
    if (lowerFull.includes(slice3.toLowerCase())) return slice3;
    return words.slice(0, 5).join(' ');
  }

  // Try matching a 2–5 word sliding window from the quote against fullText
  for (let len = Math.min(5, words.length); len >= 2; len--) {
    for (let start = 0; start <= words.length - len; start++) {
      const candidate = words.slice(start, start + len).join(' ');
      if (candidate.length >= 4 && lowerFull.includes(candidate.toLowerCase())) {
        return candidate;
      }
    }
  }

  return words.slice(0, 4).join(' ').slice(0, 60);
};

export const executeCssEssayPipelineV2 = async ({
  text = '',
  imageArray = [],
  subject = 'English Essay',
  essayMode = 'full',
  examQuestion = '',
  mode = 'digital',
  apiKey,
  selectedModel = 'auto',
  onStageProgress = null
}) => {
  const ledger = createEssayTokenLedger();
  const reportProgress = (currentStep, percent, stepLabel, detail) => {
    if (typeof onStageProgress === 'function') {
      Promise.resolve(
        onStageProgress({
          currentStep,
          percent,
          stepLabel,
          detail
        })
      ).catch(() => {});
    }
  };

  // ── STAGE 0A: Agent 0 Vision OCR (Bypassed if typed digital text) ──
  reportProgress(1, 10, 'Stage 0A • Vision OCR Digitizer', 'Transcribing script verbatim without premature corrections...');
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
  reportProgress(2, 22, 'Stage 0B • Structural Indexer', 'Indexing [O1..On] Outline & [P1.S1..PN.SM] sentences + Spotlight Zones...');
  let preprocessed = preprocessEssaySubmission(effectiveText, effectiveTopic);
  const initialEssayMode =
    essayMode === 'outline_only' || preprocessed.isOutlineOnly ? 'outline_only' : 'full';

  // ── STAGE 1A: Agent 1 Macro-Architect Runs FIRST (~2s on macro-sliced input) ──
  reportProgress(3, 36, 'Stage 1A • Macro-Architect', 'Auditing genre, Essay Title & 80:20 scope, thesis, and 1:1 alignment...');
  const agent1Output = await runAgent1MacroArchitect({
    examQuestion: effectiveTopic,
    preprocessed,
    essayMode: initialEssayMode,
    apiKey,
    preferredModel: selectedModel,
    ledger
  });

  // Apply AI boundary reconciliation only if Agent 1 flagged a boundary mismatch
  preprocessed = reconcileAiStructuralBoundary(
    preprocessed,
    agent1Output,
    effectiveText,
    effectiveTopic
  );
  const effectiveEssayMode =
    essayMode === 'outline_only' || preprocessed.isOutlineOnly ? 'outline_only' : 'full';

  // ── STAGE 1A-POST: Role-Filtered Paragraph Word Metrics (0 Tokens, Post-Agent 1) ──
  reportProgress(5, 52, 'Stage 1A-Post • Role Map & Metrics', 'Tagging structural roles and computing body paragraph word counts...');
  const pacingMetrics = computeRoleFilteredPacingDecay(
    preprocessed.paragraphs,
    agent1Output.paragraphRoleMap
  );

  // ── STAGE 1B: Branch by Submission Mode with Graceful Partial Recovery (Promise.allSettled) ──
  const stageDegradations = [];
  let agent2Output = {
    paragraphDiagnostics: [],
    pillarStatuses: {}
  };
  let agent3Output = {
    factChecks: [],
    languageAndFactDiagnostics: [],
    pillarStatuses: {},
    searchSources: [],
    searchGrounded: false
  };

  if (effectiveEssayMode === 'outline_only') {
    reportProgress(7, 68, 'Stage 1B • Outline Syntax Critic', 'Auditing outline phrasing, Pinglish interference, and terminology...');
    try {
      agent3Output = await runAgent3FactLanguageCritic({
        examQuestion: effectiveTopic,
        preprocessed,
        agent1Output,
        essayMode: 'outline_only',
        apiKey,
        preferredModel: selectedModel,
        ledger
      });
    } catch (err) {
      stageDegradations.push(`Outline language critic degraded: ${err.message}`);
    }
  } else {
    reportProgress(6, 66, 'Stage 1B • Parallel Critics (+Search Grounding)', 'Running Paragraph Inspector alongside Search-Grounded Fact & British Syntax Critics...');
    const [settled2, settled3] = await Promise.allSettled([
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
        essayMode: 'full',
        apiKey,
        preferredModel: selectedModel,
        ledger
      })
    ]);

    if (settled2.status === 'fulfilled') {
      agent2Output = settled2.value;
    } else {
      stageDegradations.push(`Paragraph Inspector partial skip: ${settled2.reason?.message || 'Error'}`);
    }

    if (settled3.status === 'fulfilled') {
      agent3Output = settled3.value;
    } else {
      stageDegradations.push(`Fact & Language Critic partial skip: ${settled3.reason?.message || 'Error'}`);
    }

    if (settled2.status === 'rejected' && settled3.status === 'rejected') {
      throw new Error(
        `Stage 1B critics both failed: ${settled2.reason?.message || ''} | ${settled3.reason?.message || ''}`
      );
    }
  }

  // ── STAGE 2: Agent 4 Chief Examiner QA Verifier & Surgical Coach ──
  reportProgress(9, 86, 'Stage 2 • Chief Examiner QA & Coach', 'Pruning false positives, recalibrating pillars, and drafting Topper rewrites...');
  let agent4Failed = false;
  let agent4Output = {
    overallReadiness: 'Fair Draft — Major Mistakes to Fix',
    examinerSummary: '',
    qaAuditLog: { totalFlagsReviewed: 0, falsePositivesDeleted: 0, deletionNotes: [] },
    recalibratedPillarStatuses: {},
    verifiedDiagnostics: null,
    surgicalRewrites: [],
    strategicHighlightingPicks: [],
    thingsToInclude: [],
    suggestedVisual: null
  };

  try {
    agent4Output = await runAgent4QaVerifierCoach({
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
  } catch (err) {
    agent4Failed = true;
    stageDegradations.push(`QA Gate degraded: ${err.message}`);
  }

  // Strictly trust Agent 4 verifiedDiagnostics (never re-inject pruned false positives when verifiedDiagnostics is [])
  const rawCombined = [
    ...(agent1Output.macroDiagnostics || []),
    ...(agent2Output.paragraphDiagnostics || []),
    ...(agent3Output.languageAndFactDiagnostics || [])
  ];
  const verifiedList =
    Array.isArray(agent4Output.verifiedDiagnostics)
      ? agent4Output.verifiedDiagnostics
      : agent4Failed
      ? rawCombined
      : [];

  const tier1Fatal = verifiedList.filter((d) => d.tier === 'TIER_1_FATAL');
  const tier2Major = verifiedList.filter((d) => d.tier === 'TIER_2_MAJOR');
  const tier3Polish = verifiedList.filter((d) => d.tier === 'TIER_3_POLISH');
  const earnedSignifiers = verifiedList.filter((d) => d.tier === 'EARNED_SIGNIFIER');

  // Combine Pillar Statuses + apply Agent 4 QA Recalibrations (100% Non-Scored)
  const mergedPillars = {
    ...(agent1Output.pillarStatuses || {}),
    ...(agent2Output.pillarStatuses || {}),
    ...(agent3Output.pillarStatuses || {}),
    ...(agent4Output.recalibratedPillarStatuses || {})
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

  const scoreBreakdown =
    effectiveEssayMode === 'outline_only'
      ? {
          topic_decoding: buildPillarEntry(
            'topic_relevance',
            agent1Output.directiveAnalysis?.alignmentStatus === 'Aligned' ? 'Strong' : 'Balanced',
            agent1Output.directiveAnalysis?.feedback
          ),
          thesis: buildPillarEntry(
            'thesis',
            agent1Output.thesisAudit?.status || 'Balanced',
            agent1Output.thesisAudit?.critique
          ),
          outline_structure: buildPillarEntry(
            'outline',
            agent1Output.outlineAlignment?.status || 'Balanced',
            agent1Output.outlineAlignment?.summary
          ),
          parallelism: {
            status:
              agent1Output.outlineAlignment?.parallelismStatus ||
              (agent1Output.headerUpgrades?.length > 2 ? 'Needs Polish' : 'Balanced'),
            score: null,
            scored: false,
            isNonScored: true,
            feedback:
              'Checks whether all outline headings follow a clear, consistent style without vague one-word labels.'
          },
          coverage_originality: buildPillarEntry(
            'analytical_depth',
            'Balanced',
            agent1Output.directiveAnalysis?.feedback
          )
        }
      : {
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
          coherence: buildPillarEntry('coherence', 'Balanced', pacingMetrics.summary),
          analytical_depth: buildPillarEntry('analytical_depth', 'Balanced'),
          expression: buildPillarEntry('expression', 'Balanced'),
          grammar_syntax: buildPillarEntry('grammar_syntax', 'Balanced'),
          conclusion: buildPillarEntry('conclusion', 'Balanced')
        };

  const isEvidenceDiscrepancyCategory = (category = '') =>
    /(fact|outdated|discrepanc|citation|reference|evidence|stat|figure|data|quote|number|date)/i.test(
      String(category || '')
    ) && !/strong|good|unverified/i.test(String(category || ''));

  // Deterministically map verifiedDiagnostics into concise inline paper annotations
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
      category: d.category || 'Feedback',
      inSpotlightZone: Boolean(d.inSpotlightZone),
      isDiscrepantEvidence:
        d.tier !== 'EARNED_SIGNIFIER' && isEvidenceDiscrepancyCategory(d.category),
      comment: d.observation || '',
      suggestion: null,
      microLesson: ''
    });
  }

  // Ensure every discrepant factCheck from Agent 3A highlights in red font on the essay paper
  for (const fc of agent3Output.factChecks || []) {
    if (!fc || fc.verified !== false || fc.status === 'UNVERIFIED_CITATION' || !fc.claim) {
      continue;
    }
    const targetPhrase = resolveVerbatimHighlightPhrase(fc.claim, effectiveText);
    if (!targetPhrase || targetPhrase.length < 2) continue;

    const key = targetPhrase.toLowerCase();
    const existing = finalAnnotations.find(
      (a) =>
        a.targetPhrase.toLowerCase() === key ||
        fc.claim.toLowerCase().includes(a.targetPhrase.toLowerCase())
    );
    if (existing) {
      existing.isDiscrepantEvidence = true;
      continue;
    }
    seenPhrases.add(key);

    finalAnnotations.push({
      id: `ann-${finalAnnotations.length + 1}`,
      locationId: fc.location_id || fc.locationId || '',
      tier: 'TIER_2_MAJOR',
      targetPhrase,
      type: 'red',
      category: fc.status === 'OUTDATED_2026' ? 'Outdated Fact / Data' : 'Wrong Fact / Reference',
      inSpotlightZone: false,
      isDiscrepantEvidence: true,
      comment: fc.correctedFact || `Check this number or fact: '${fc.claim}'.`,
      suggestion: null,
      microLesson: ''
    });
  }

  const introWordCount = preprocessed.paragraphs[0]?.wordCount || 0;
  const tokenUsage = ledger.finalize();

  const normalizeFlagForTrace = (f = {}) => ({
    locationId: f.location_id || f.locationId || '',
    severity: f.tier || f.severity || '',
    category: f.category || '',
    targetPhrase: f.exact_verbatim_quote || f.targetPhrase || '',
    comment: f.observation || f.comment || ''
  });

  const verifiedQuoteSet = new Set(
    verifiedList
      .map((v) => `${String(v.location_id || '').trim().toLowerCase()}::${String(v.exact_verbatim_quote || '').trim().toLowerCase().slice(0, 40)}`)
  );
  const prunedFlags = rawCombined
    .filter((r) => {
      const k = `${String(r.location_id || '').trim().toLowerCase()}::${String(r.exact_verbatim_quote || '').trim().toLowerCase().slice(0, 40)}`;
      return !verifiedQuoteSet.has(k);
    })
    .map(normalizeFlagForTrace);

  const agentTrace = {
    rawOcrText: effectiveText,
    outlineNodes: preprocessed.outlineNodes.map((o) => ({
      id: o.id,
      text: o.text,
      wordCount: o.wordCount
    })),
    paragraphs: preprocessed.paragraphs.map((p) => ({
      id: p.id,
      wordCount: p.wordCount,
      sentenceCount: p.sentenceCount,
      preview: p.rawFirstSentence
    })),
    stage0_ocr: {
      skipped: Boolean(ocrOutput.skipped),
      pagesProcessed: imageArray?.length || 0,
      detectedTitle: ocrOutput.detectedTitle || effectiveTopic,
      handwritingAudit: ocrOutput.handwritingAudit || null
    },
    stage0b_splitter: {
      outlineCount: preprocessed.outlineNodes.length,
      paragraphCount: preprocessed.paragraphs.length,
      outlineWordCount: preprocessed.outlineWordCount,
      bodyWordCount: preprocessed.bodyWordCount,
      totalWordCount: preprocessed.totalWordCount,
      inlineHeadingsCaught: preprocessed.inlineBodyHeadingViolations || [],
      aiBoundaryAdjusted: Boolean(
        agent1Output?.aiBoundaryCorrection?.firstBodyParagraphStartQuote
      )
    },
    stage1_macro: {
      essayGenre: agent1Output.essayGenre,
      requiresCounterArgument: agent1Output.requiresCounterArgument,
      genreRationale: agent1Output.genreRationale,
      directiveAnalysis: agent1Output.directiveAnalysis,
      thesisAudit: agent1Output.thesisAudit,
      outlineAlignment: agent1Output.outlineAlignment,
      headerUpgrades: agent1Output.headerUpgrades || [],
      paragraphRoleMap: agent1Output.paragraphRoleMap,
      pillarStatuses: agent1Output.pillarStatuses || {},
      rawFlagsCount: (agent1Output.macroDiagnostics || []).length,
      rawFlags: (agent1Output.macroDiagnostics || []).map(normalizeFlagForTrace)
    },
    stage1post_pacing: pacingMetrics,
    stage2_paragraphs: {
      skipped: effectiveEssayMode === 'outline_only',
      rawFlagsCount: (agent2Output.paragraphDiagnostics || []).length,
      rawFlags: (agent2Output.paragraphDiagnostics || []).map(normalizeFlagForTrace),
      pillarStatuses: agent2Output.pillarStatuses || {}
    },
    stage3_fact_language: {
      searchGrounded: Boolean(agent3Output.searchGrounded),
      searchSources: agent3Output.searchSources || [],
      factChecksCount: (agent3Output.factChecks || []).length,
      factChecks: agent3Output.factChecks || [],
      rawFlagsCount: (agent3Output.languageAndFactDiagnostics || []).length,
      rawFlags: (agent3Output.languageAndFactDiagnostics || []).map(normalizeFlagForTrace),
      pillarStatuses: agent3Output.pillarStatuses || {}
    },
    stage4_qa_coach: {
      overallReadiness: agent4Output.overallReadiness,
      examinerSummary: agent4Output.examinerSummary,
      thingsToInclude: agent4Output.thingsToInclude || [],
      qaAuditLog: agent4Output.qaAuditLog,
      verifiedFlagsCount: verifiedList.length,
      prunedFlags,
      rewritesCount: (agent4Output.surgicalRewrites || []).length,
      recalibratedPillars: agent4Output.recalibratedPillarStatuses || {}
    },
    tokenStages: tokenUsage.stages || []
  };

  return {
    id: `eval-${Date.now()}`,
    subject,
    essayMode: effectiveEssayMode,
    scored: false,
    isNonScoredEssay: true,
    rubricVersion: '3.3',
    archetypeId: effectiveEssayMode === 'outline_only' ? 'essay_outline' : 'essay',
    archetypeLabel:
      effectiveEssayMode === 'outline_only'
        ? 'Essay Outline & Thesis Review'
        : 'CSS English Essay Evaluation',
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
    spotlightZoneIds: preprocessed.spotlightZoneIds || [],
    qaAuditLog: agent4Output.qaAuditLog,
    agentTrace,
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
    strategicHighlightingPicks: agent4Output.strategicHighlightingPicks || [],
    factCheck: agent3Output.factChecks,
    searchSources: agent3Output.searchSources || [],
    searchGrounded: Boolean(agent3Output.searchGrounded),
    stageDegradations,
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
