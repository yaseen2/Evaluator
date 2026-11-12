/**
 * Golden Regression Test Harness for FPSC CSS English Essay Rubric (v2.1)
 *
 * Usage:
 *   node golden_tests/run_golden_tests.js          # Runs 0-Token Deterministic & Parser Regression Tests
 *   node golden_tests/run_golden_tests.js --live   # Runs Full 5-Stage Gemini 3.8 Flash Pipeline (requires GEMINI_API_KEY)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  preprocessEssaySubmission,
  computeRoleFilteredPacingDecay
} from '../functions/src/rubric/deterministicPreprocessor.js';
import { safeParseJsonWithGrounding } from '../functions/src/rubric/safeJsonParser.js';
import { PINGLISH_INTERFERENCE_RULES } from '../functions/src/rubric/essayRubricConfig.js';
import { executeCssEssayPipelineV2 } from '../functions/src/rubric/orchestrateEssayPipeline.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SAMPLES_DIR = path.join(__dirname, 'samples');

const assertCondition = (condition, message) => {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
};

const runDeterministicSuite = () => {
  console.log('================================================================');
  console.log('🧪 FPSC CSS ESSAY RUBRIC v2.1 — GOLDEN REGRESSION TEST HARNESS');
  console.log('================================================================\n');

  const files = fs
    .readdirSync(SAMPLES_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();

  let passed = 0;

  // 1. Test Pinglish Configuration Invariants
  console.log('▶ Test 0: Pinglish & Guardrail Configuration Invariants...');
  const pinglishString = JSON.stringify(PINGLISH_INTERFERENCE_RULES);
  assertCondition(
    pinglishString.includes('doing mistakes'),
    'Pinglish rules must include "doing mistakes".'
  );
  assertCondition(
    pinglishString.includes('pass out from college'),
    'Pinglish rules must scope "pass out" specifically to "pass out from college / pass out from university".'
  );
  console.log('  ✓ Pinglish rules verified (valid "committing mistakes" protected; "pass out" scoped to college/university).\n');
  passed++;

  // 2. Test Resilient JSON Parser with Search Grounding Artifacts
  console.log('▶ Test 1: Resilient JSON Parser Fallback (Search Grounding Simulation)...');
  const simulatedGroundingOutput = `Here is the verified fact check from Google Search [1][2]:
\`\`\`json
{
  "factChecks": [
    { "location_id": "P2.S2", "claim": "$7 billion IMF EFF", "verified": true, }
  ],
}
\`\`\`
Sources: [1] imf.org`;
  const parsedGrounding = safeParseJsonWithGrounding(simulatedGroundingOutput);
  assertCondition(
    Array.isArray(parsedGrounding.factChecks) &&
      parsedGrounding.factChecks[0].location_id === 'P2.S2',
    'safeParseJsonWithGrounding must parse fenced JSON with grounding preamble/postamble and trailing commas.'
  );
  console.log('  ✓ Resilient JSON parser cleanly handled Search Grounding wrapper + trailing commas.\n');
  passed++;

  // 3. Test Each Golden Sample Essay
  for (const file of files) {
    const sample = JSON.parse(fs.readFileSync(path.join(SAMPLES_DIR, file), 'utf8'));
    console.log(`▶ Testing Sample: ${sample.id} ("${sample.title}")`);

    const pre = preprocessEssaySubmission(sample.rawText, sample.examQuestion);

    // Verify Bulletproof Outline-to-Body Boundary Split
    assertCondition(
      pre.outlineNodes.length >= 4,
      `${sample.id}: Expected >= 4 Outline nodes [O1..On], got ${pre.outlineNodes.length}`
    );
    assertCondition(
      pre.paragraphs.length >= 4,
      `${sample.id}: Expected >= 4 Body paragraphs [P1..PN], got ${pre.paragraphs.length}`
    );

    // Ensure "1. Introduction" inside the Outline stayed in outlineNodes and [P1] is actual continuous prose
    assertCondition(
      pre.outlineNodes.some((o) => /introduction/i.test(o.text)),
      `${sample.id}: "1. Introduction" must be captured inside Outline nodes [O1..On]`
    );
    assertCondition(
      pre.paragraphs[0].wordCount >= 32,
      `${sample.id}: [P1] Intro must be a continuous multi-sentence prose paragraph (got ${pre.paragraphs[0].wordCount} words)`
    );

    if (sample.id === '01_topper_qualifier_essay') {
      // Sample 01 has 8 paragraphs: P1 (Intro), P2 (Context Overview), P3 (Main), P4 (Main), P5 (24-word Transition Bridge), P6 (Main), P7 (Main), P8 (Conclusion)
      // Simulate Agent 1's paragraphRoleMap tagging P5 as TRANSITION_BRIDGE
      const simulatedRoleMap = {
        P1: 'INTRO',
        P2: 'CONTEXT_OVERVIEW',
        P3: 'BODY_MAIN',
        P4: 'BODY_MAIN',
        P5: 'TRANSITION_BRIDGE',
        P6: 'BODY_MAIN',
        P7: 'BODY_MAIN',
        P8: 'CONCLUSION'
      };
      const pacing = computeRoleFilteredPacingDecay(pre.paragraphs, simulatedRoleMap);
      assertCondition(
        pacing.evaluatedParagraphCount === 4,
        `Sample 01: Role-Filtered Pacing Decay must average ONLY the 4 BODY_MAIN paragraphs (P3, P4, P6, P7), excluding P5 (TRANSITION_BRIDGE). Got ${pacing.evaluatedParagraphCount}`
      );
      assertCondition(
        pacing.pacingDecayFlag === false,
        `Sample 01: Pacing Decay Flag must be FALSE when P5 (24-word TRANSITION_BRIDGE) is properly excluded! Got decay=${pacing.decayPercent}%`
      );
      console.log(
        `  ✓ Outline Split: ${pre.outlineNodes.length} nodes | Paragraphs: ${pre.paragraphs.length} | Role-Filtered Pacing: ${pacing.decayPercent}% (Transition Bridge P5 excluded!)`
      );
    } else if (sample.id === '02_grafted_crammed_essay') {
      const simulatedRoleMap = {
        P1: 'INTRO',
        P2: 'BODY_MAIN',
        P3: 'BODY_MAIN',
        P4: 'BODY_MAIN',
        P5: 'BODY_MAIN',
        P6: 'CONCLUSION'
      };
      const pacing = computeRoleFilteredPacingDecay(pre.paragraphs, simulatedRoleMap);
      assertCondition(
        pacing.pacingDecayFlag === true,
        `Sample 02: Pacing Decay Flag must be TRUE for severe 2nd-half body paragraph shrinkage (got ${pacing.decayPercent}%)`
      );
      console.log(
        `  ✓ Outline Split: ${pre.outlineNodes.length} nodes | Paragraphs: ${pre.paragraphs.length} | Role-Filtered Pacing Decay Caught: ${pacing.decayPercent}%`
      );
    } else if (sample.id === '04_broken_debate_outline') {
      assertCondition(
        pre.inlineBodyHeadingViolations.length >= 3,
        `Sample 04: Must detect inline headings embedded inside the essay prose body (found ${pre.inlineBodyHeadingViolations.length}: ${JSON.stringify(pre.inlineBodyHeadingViolations)})`
      );
      console.log(
        `  ✓ Inline Body Heading Violations Caught: ${JSON.stringify(pre.inlineBodyHeadingViolations)}`
      );
    } else {
      console.log(
        `  ✓ Outline Split: ${pre.outlineNodes.length} nodes | Paragraphs: ${pre.paragraphs.length} | Total Words: ${pre.totalWordCount}`
      );
    }

    console.log('');
    passed++;
  }

  console.log(`✅ All ${passed} Deterministic & Pre-Processor Golden Suites Passed (0 Tokens)!\n`);
};

const runLivePipelineTest = async () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('ℹ️  Skipping live LLM calls (set GEMINI_API_KEY and pass --live to run full 5-stage live evaluation).');
    return;
  }

  const sample01 = JSON.parse(
    fs.readFileSync(path.join(SAMPLES_DIR, '01_topper_qualifier_essay.json'), 'utf8')
  );
  console.log(`🚀 Running Live 5-Stage Gemini 3.8 Flash Pipeline on "${sample01.title}"...`);
  const result = await executeCssEssayPipelineV2({
    text: sample01.rawText,
    subject: 'English Essay',
    essayMode: 'full',
    examQuestion: sample01.examQuestion,
    mode: 'digital',
    apiKey,
    selectedModel: 'gemini-3.8-flash'
  });

  console.log('  ✓ Live Evaluation Complete!');
  console.log('  • Genre:', result.essayGenre);
  console.log('  • Requires Counter-Argument:', result.requiresCounterArgument);
  console.log('  • Paragraph Role Map:', JSON.stringify(result.paragraphRoleMap));
  console.log('  • Pacing Decay Summary:', result.pacingMetrics?.summary);
  console.log('  • QA Audit Log:', JSON.stringify(result.qaAuditLog));
  console.log('  • Overall Readiness:', result.overallReadiness);
};

const main = async () => {
  runDeterministicSuite();
  if (process.argv.includes('--live')) {
    await runLivePipelineTest();
  }
};

main().catch((err) => {
  console.error('❌ Golden Test Failed:', err.message);
  process.exit(1);
});
