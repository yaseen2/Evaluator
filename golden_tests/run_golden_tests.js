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
  computeRoleFilteredPacingDecay,
  splitIntoSentences,
  normalizeOutlineLineBreaks,
  countInlineOutlineMarkers
} from '../functions/src/rubric/deterministicPreprocessor.js';
import { safeParseJsonWithGrounding } from '../functions/src/rubric/safeJsonParser.js';
import {
  PINGLISH_INTERFERENCE_RULES,
  PINGLISH_DIRECTION_TEXT,
  PROMPT_DECODING_TRAP_RULES,
  CONCEPTUAL_PRECISION_PAIRS,
  CSS_LANGUAGE_AND_FORMAT_RULES,
  SHARED_SAFE_HARBOR_DIRECTIVE
} from '../functions/src/rubric/essayRubricConfig.js';
import {
  estimateCreditsPreFlight,
  calculateActualCredits
} from '../functions/src/services/creditsManager.js';
import { executeCssEssayPipelineV2 } from '../functions/src/rubric/orchestrateEssayPipeline.js';
import { normalizeModelOutlinePayload } from '../functions/src/rubric/agent5ModelOutline.js';
import {
  tokenizeQuotedSegments,
  formatPopoverLocationLabel,
  parseLegacyModelOutlineText
} from '../src/utils/textUtils.js';

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
    typeof PINGLISH_DIRECTION_TEXT === 'string' &&
      PINGLISH_DIRECTION_TEXT.includes('Pinglish') &&
      pinglishString.includes('making/committing mistakes'),
    'Pinglish direction and streamlined rules must protect valid "making/committing mistakes".'
  );
  console.log('  ✓ Pinglish rules verified (open-ended AI direction + valid "making/committing mistakes" protected).\n');
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

  // 2B. Test State-Machine JSON Repair for Unescaped Inner Quotes & Literal Newlines
  console.log('▶ Test 1B: State-Machine JSON Repair (Unescaped Inner Quotes & Truncation)...');
  const unescapedInnerQuotesResponse = `{\n  "languageFlags": [\n    {\n      "location_id": "P2.S1",\n      "exact_verbatim_quote": "doing mistakes",\n      "observation": "The candidate wrote "doing mistakes" instead of "making mistakes" or "committing mistakes",\nwhich is a classic Pakistani L1 interference",\n      "fix": "making mistakes"\n    }\n  ]\n}`;
  const parsedInnerQuotes = safeParseJsonWithGrounding(unescapedInnerQuotesResponse);
  assertCondition(
    parsedInnerQuotes.languageFlags?.[0]?.fix === 'making mistakes',
    'safeParseJsonWithGrounding failed to repair unescaped inner double quotes and literal newlines'
  );
  console.log('  ✓ State-Machine JSON Repair fixed unescaped inner quotes & literal newlines.\n');
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

  // 4. Test v3 Rubric Config, Preprocessor Boundary, Abbreviations, Spotlight Zones & Outline Credits
  console.log('▶ Test 4: v3 Rubric Exports, Abbreviations, Bounded Conclusion Split, Single-Newline Fallback & Credits...');
  assertCondition(
    PROMPT_DECODING_TRAP_RULES.length >= 4 &&
      CONCEPTUAL_PRECISION_PAIRS.length >= 5 &&
      CSS_LANGUAGE_AND_FORMAT_RULES.length >= 5 &&
      SHARED_SAFE_HARBOR_DIRECTIVE.includes('Valid Standard Words'),
    'v3 rubric rules and safe harbors must be exported completely.'
  );

  const abbrSentences = splitIntoSentences(
    'In 2026, U.S. foreign policy and Rs. 500 billion fiscal shifts reshaped trade. Pakistan responded strategically.'
  );
  assertCondition(
    abbrSentences.length === 2,
    `Expected 2 sentences with U.S. and Rs. protected, got ${abbrSentences.length}`
  );

  const lateConclusionAndShortParaScript = [
    'Outline\n1. Introduction\n2. Economic Reform\n3. Conclusion',
    'Public finance reform anchors macroeconomic stability across developing states in the contemporary global economy. Structural deficits persist unless direct taxation broadens fairly across all high-income sectors.',
    'This transitional bridge connects structural revenue diagnosis directly to institutional administrative reform. Every tier of public finance requires statutory transparency and auditing.',
    'Conclusion',
    'Long-term fiscal stabilization depends on revenue modernization, expenditure discipline, and targeted social protection working together. Sound democratic governance endures beyond short-term electoral and partisan cycles.'
  ].join('\n\n');

  const lateCheck = preprocessEssaySubmission(lateConclusionAndShortParaScript, 'Economic Reform');
  assertCondition(
    lateCheck.outlineNodes.length === 4 && lateCheck.paragraphs.length === 3,
    `Bounded conclusion scan + short transition check failed: outline=${lateCheck.outlineNodes.length}, paras=${lateCheck.paragraphs.length}`
  );
  assertCondition(
    lateCheck.spotlightZoneIds.includes('O1') && lateCheck.spotlightZoneIds.includes('P1.S1'),
    'Expected spotlightZoneIds to include O1 and P1.S1.'
  );

  const singleNewlineScript = [
    'Outline',
    '1. Introduction',
    '2. Conclusion',
    'Governance reform begins with transparent municipal institutions, meritocratic recruitment, and fiscal devolution across provinces. Weak oversight routinely entrenches public service delivery failures and administrative bottlenecks nationwide.',
    'Civil service modernization replaces discretionary red tape with verifiable digital workflows and open procurement audits across departments. Public trust rises sharply whenever citizens observe predictable administrative enforcement.',
    'Judicial efficiency reinforces impartial contract enforcement and attracts durable private capital investment across emerging industrial corridors. Citizens also gain timely constitutional remedies against arbitrary executive overreach.',
    'Ultimately, durable state capacity relies on constitutional accountability rather than ad-hoc administrative decrees issued during crises. Sustained structural reform secures collective economic prosperity and democratic stability.'
  ].join('\n');

  const singleNlPre = preprocessEssaySubmission(singleNewlineScript, 'Governance Reform');
  assertCondition(
    singleNlPre.outlineNodes.length === 3 && singleNlPre.paragraphs.length === 4,
    `Single-newline fallback failed: outline=${singleNlPre.outlineNodes.length}, paras=${singleNlPre.paragraphs.length}`
  );

  const outlineCredits = estimateCreditsPreFlight({ isEssay: true, essayMode: 'outline_only' });
  assertCondition(
    outlineCredits === 9,
    `Expected outline_only digital preflight credits === 9, got ${outlineCredits}`
  );
  console.log('  ✓ v3 Pre-Processor, Abbreviations, Bounded Split, Spotlight Zones & Outline Credits Verified.\n');
  passed++;

  // 5. Regression Test: Jammed Handwritten Parenthesis Outline (Exact User Sample + Edge Cases)
  console.log('▶ Test 5: Jammed Parenthesis/Mixed Outline Splitting & Abbreviation/Prose Guards...');
  const jammedParenOutlineSample = [
    '2) Undastanding the increasing Role of AI in Modern World',
    '3) Arguments Which Prove that AI is a Catalyst for Human Development A) The democratization of knowledge by AI has transformed passive audience into informed participants through technical insight B) Large language Models provide value inputs in research and academic progress. C) Online chatbots and learning platforms help individuals learn new skills empowering their economic development. D) Automated outbound sales agent and specialized tools can perform bussiness and official tasks without any breaks, thus maximizing efficiency E) AI powered robotic nurses can provide personalized care and companionship for elderly and vulnerable individuals F) Data gathering and analysis by AI models can give better and neutral performance reviews increasing political accountability and transparency G) Algorithms can aid judical system in connecting precedents and fast tracking the case filling process H) Automated one window operations can overcome bureaucratic redtapism and enhance service delivery. I) LLM backed audits and financial scrutiny along with automated E-tendering can reduce corruption J) Continuous monitoring of remote areas by AI can enhance efficiency of Early warning systems which are essential for combating climate change and natural disasters. K) constant monitoring of soil conditions and specially devised solutions by AI can encourage optimum soil growth while preventing heavy metals leaching in ground water. I) live data sharing and AI monitored traffic signals along with structural health monitoring can reduce damage caused by accidents J) AI powered robots can increase the pace of intergalactic missions and spacial discoveries.',
    'Artificial intelligence has emerged as a defining technological force of the twenty-first century, transforming economic productivity, public administration, and scientific inquiry across developing and industrialized states alike. Nations that invest in digital literacy and accountable algorithms capture sustained human development gains, whereas unprepared societies risk widening structural inequalities.',
    'Nevertheless, unchecked automation also creates profound ethical, legal, and labor-market disruptions that demand deliberate constitutional and regulatory oversight. Governments must therefore pair algorithmic innovation with transparent procurement rules, social safety nets, and inclusive technical education so technological progress genuinely empowers citizens.'
  ].join('\n\n');

  const jammedPre = preprocessEssaySubmission(
    jammedParenOutlineSample,
    'Role of AI in Modern World'
  );
  assertCondition(
    jammedPre.outlineNodes.length >= 14,
    `Jammed parenthesis outline must split into >= 14 outlineNodes, got ${jammedPre.outlineNodes.length}`
  );
  assertCondition(
    jammedPre.paragraphs.length === 2,
    `Expected 2 body paragraphs after jammed parenthesis outline, got ${jammedPre.paragraphs.length}`
  );
  assertCondition(
    !jammedPre.paragraphs[0].fullText.includes('Arguments Which Prove') &&
      !jammedPre.paragraphs[0].fullText.includes('A) The democratization'),
    'paragraphs[0] must NOT contain "3) Arguments... A) ... J) ..." outline block!'
  );
  assertCondition(
    jammedPre.outlineNodes.some((o) => o.text.startsWith('3) Arguments Which Prove')) &&
      jammedPre.outlineNodes.some((o) => o.text.startsWith('E) AI powered robotic nurses')) &&
      jammedPre.outlineNodes.some((o) => o.text.startsWith('I) LLM backed audits')) &&
      jammedPre.outlineNodes.some((o) => o.text.startsWith('K) constant monitoring')) &&
      jammedPre.outlineNodes.some((o) => o.text.startsWith('I) live data sharing')) &&
      jammedPre.outlineNodes.some((o) => o.text.startsWith('J) AI powered robots')),
    'All parenthesis outline sub-items (including ALL-CAPS E/I and lowercase K/I) must become separate outlineNodes.'
  );

  // Verify mixed CSS outline formats + abbreviation/initial/year protection
  const mixedOutline =
    'Outline: A. Introduction: a. Background in U.S. and U.K.; b. Thesis Statement: M. A. Jinnah and A.Q. Khan shaped national resilience. B. Policy Challenges in 2024. (1) Fiscal deficit (a) Revenue shortfall (i) Tax evasion C. Conclusion';
  const expandedMixed = normalizeOutlineLineBreaks(mixedOutline);
  const expandedLines = expandedMixed.split('\n').map((l) => l.trim()).filter(Boolean);
  assertCondition(
    expandedLines.length >= 9 &&
      expandedLines.some((l) => l.includes('U.S. and U.K.')) &&
      expandedLines.some((l) => l.includes('M. A. Jinnah and A.Q. Khan')) &&
      expandedLines.some((l) => l.includes('2024.') && l.startsWith('B. Policy Challenges')),
    `Mixed outline expansion failed or broke abbreviations/initials/year: ${JSON.stringify(expandedLines)}`
  );

  const proseStartingWithInitials =
    'M. A. Jinnah envisioned a constitutional democracy anchored in rule of law, civic equality, and institutional accountability across every province. Throughout his addresses, he urged citizens and civil servants to uphold integrity above partisan interest.';
  const initialsOutlinePlusProse = [
    '1) Historical Foundations 2) Constitutional Vision',
    proseStartingWithInitials
  ].join('\n\n');
  const initialsPre = preprocessEssaySubmission(initialsOutlinePlusProse, 'Vision of Pakistan');
  assertCondition(
    initialsPre.outlineNodes.length === 2 &&
      initialsPre.paragraphs.length === 1 &&
      initialsPre.paragraphs[0].fullText.startsWith('M. A. Jinnah envisioned'),
    `Prose starting with initials M. A. Jinnah was misclassified: outline=${initialsPre.outlineNodes.length}, paras=${initialsPre.paragraphs.length}`
  );

  const proseWithAbbrevs =
    'In 2024. U.S. foreign policy and U.K. trade agreements shifted rapidly while Dr. Ahmed and Mr. Ali examined historical speeches by M. A. Jinnah and A. Q. Khan (e.g. constitutionalism; i.e. institutional parity, etc.). Meanwhile, domestic economic reforms progressed steadily across federal and provincial ministries throughout the fiscal quarter.';
  assertCondition(
    countInlineOutlineMarkers(proseWithAbbrevs) === 0,
    `Expected 0 inline outline markers in prose with abbreviations/initials, got ${countInlineOutlineMarkers(proseWithAbbrevs)}`
  );
  assertCondition(
    normalizeOutlineLineBreaks(proseWithAbbrevs) === proseWithAbbrevs,
    'normalizeOutlineLineBreaks must NOT modify continuous body prose containing abbreviations, initials, or 4-digit years.'
  );

  // Verifier regression guards: title/label prefixes + mid-title Roman numerals & names
  const titleInitialsLine = 'Dr. A. Khan and Mr. B. Ali wrote about U.S. policy.';
  assertCondition(
    countInlineOutlineMarkers(titleInitialsLine) === 0 &&
      normalizeOutlineLineBreaks(titleInitialsLine) === titleInitialsLine,
    `Title-prefixed initials must not count or split as markers: ${normalizeOutlineLineBreaks(titleInitialsLine)}`
  );

  const worldWarLine =
    '1. Growth of 3.5 percent in 2024. 2. World War I. and World War II. 3. M. A. Jinnah and A. Q. Khan';
  const worldWarLines = normalizeOutlineLineBreaks(worldWarLine)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  assertCondition(
    countInlineOutlineMarkers(worldWarLine) === 3 &&
      worldWarLines.length === 3 &&
      worldWarLines[0] === '1. Growth of 3.5 percent in 2024.' &&
      worldWarLines[1] === '2. World War I. and World War II.' &&
      worldWarLines[2] === '3. M. A. Jinnah and A. Q. Khan',
    `Mid-title Roman numerals or initials split unexpectedly: ${JSON.stringify(worldWarLines)}`
  );

  const entityAbbrevBoundary = 'A. Impact in U.S. B. Impact in China';
  const entityLines = normalizeOutlineLineBreaks(entityAbbrevBoundary)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  assertCondition(
    entityLines.length === 2 &&
      entityLines[0] === 'A. Impact in U.S.' &&
      entityLines[1] === 'B. Impact in China',
    `Entity abbreviation ending ("U.S.") must still allow splitting before next marker: ${JSON.stringify(entityLines)}`
  );

  const mixedPrefixGuard =
    '1. Phase I. and Phase II. 2. King George V. and by A. Smith 3. Fig. 1. and Art. 2. overview';
  const mixedPrefixLines = normalizeOutlineLineBreaks(mixedPrefixGuard)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  assertCondition(
    countInlineOutlineMarkers(mixedPrefixGuard) === 3 && mixedPrefixLines.length === 3,
    `Title/label/preposition prefix guard failed: ${JSON.stringify(mixedPrefixLines)}`
  );

  console.log(
    `  ✓ Jammed Parenthesis Outline Split: ${jammedPre.outlineNodes.length} outlineNodes | ${jammedPre.paragraphs.length} body paragraphs | Abbreviations & prose guarded.\n`
  );
  passed++;

  // 6. Test Popover Text Tokenizer & Compact Location Formatting
  console.log('▶ Test 6: Popover Inline Quote Tokenizer & Compact Location Labels...');
  const sampleExplanation =
    "You missed a word here. Write 'transformed a passive audience' or use 'Pakistan's economy'—it isn't vague.";
  const quoteSegments = tokenizeQuotedSegments(sampleExplanation);
  const quotedOnly = quoteSegments.filter((s) => s.isQuoted).map((s) => s.text);
  assertCondition(
    quotedOnly.length === 2 &&
      quotedOnly[0] === 'transformed a passive audience' &&
      quotedOnly[1] === "Pakistan's economy" &&
      quoteSegments.some((s) => !s.isQuoted && s.text.includes("isn't vague.")),
    `Expected balanced quote tokens without splitting apostrophes, got: ${JSON.stringify(quoteSegments)}`
  );

  assertCondition(
    formatPopoverLocationLabel('O5') === 'Outline' &&
      formatPopoverLocationLabel('[P1.S3]') === 'Introduction' &&
      formatPopoverLocationLabel('P4.S2') === 'Paragraph 4',
    'formatPopoverLocationLabel failed compact label mapping.'
  );
  console.log('  ✓ Quoted phrase tokenization & compact popover locations verified.\n');
  passed++;

  // 7. Regression Test: Agent 5 Model Outline Rules, Legacy ASCII Tree Parser & Argon 3x Credits
  console.log('▶ Test 7: Model Outline Guardrails (Standalone Intro/Conclusion), ASCII Cleanup & Argon Weighted Credits...');
  const normalizedOutline = normalizeModelOutlinePayload(
    {
      title: '├── Model Improved Outline: Climate Justice',
      thesisStatement: '',
      sections: [
        {
          marker: 'I.',
          heading: 'Introduction',
          kind: 'intro',
          items: [{ marker: 'A.', text: 'Forbidden hook subpoint inside intro' }]
        },
        {
          marker: 'II.',
          heading: '├── Core Climate Vulnerabilities in Developing States',
          kind: 'body',
          items: [
            { marker: 'A.', text: 'Glacial melt threatening river basins' },
            { marker: 'B.', text: 'Agricultural yield losses affecting rural incomes' }
          ]
        },
        {
          marker: 'III.',
          heading: 'Conclusion',
          kind: 'conclusion',
          items: [{ marker: 'A.', text: 'Forbidden restated thesis subpoint inside conclusion' }]
        }
      ]
    },
    'Climate Justice',
    'gemini-4-argon'
  );

  assertCondition(
    normalizedOutline.modelLabel === 'Gemini 4 Argon',
    `Expected modelLabel === 'Gemini 4 Argon', got ${normalizedOutline.modelLabel}`
  );
  assertCondition(
    normalizedOutline.sections[0].kind === 'intro' && normalizedOutline.sections[0].items.length === 0,
    'Introduction in model outline MUST have zero sub-points (items.length === 0).'
  );
  assertCondition(
    normalizedOutline.sections[2].kind === 'conclusion' && normalizedOutline.sections[2].items.length === 0,
    'Conclusion in model outline MUST have zero sub-points (items.length === 0).'
  );
  assertCondition(
    normalizedOutline.sections[1].items.length === 2 && normalizedOutline.totalBodyPoints === 2,
    `Expected 2 body sub-points preserved, got ${normalizedOutline.totalBodyPoints}`
  );
  assertCondition(
    !/[├└│─]/.test(normalizedOutline.diagramText) && normalizedOutline.thesisStatement === '',
    'Model outline must strip ASCII tree glyphs and keep omitted optional thesis empty.'
  );

  const legacyParsed = parseLegacyModelOutlineText([
    '├── I. Introduction',
    '│   └── A. Legacy hook that must not nest under Intro',
    '├── II. Institutional Reform',
    '│   ├── A. Tax digitization',
    '│   └── B. Local government autonomy',
    '└── III. Conclusion',
    '    └── A. Legacy closing subpoint'
  ].join('\n'));
  assertCondition(
    legacyParsed.sections.length === 3 &&
      legacyParsed.sections[0].items.length === 0 &&
      legacyParsed.sections[1].items.length === 2 &&
      legacyParsed.sections[2].items.length === 0,
    'parseLegacyModelOutlineText must strip ASCII glyphs and forbid Intro/Conclusion sub-points.'
  );

  const weightedCredits = calculateActualCredits({
    inputTokens: 1000,
    outputTokens: 1000,
    thinkingTokens: 500,
    weightedTokens: 22500
  });
  assertCondition(
    weightedCredits === 9,
    `Expected calculateActualCredits to honor weightedTokens (22500 -> 9 credits), got ${weightedCredits}`
  );
  console.log('  ✓ Model outline guardrails, legacy ASCII tree parser & Argon weighted credits verified.\n');
  passed++;

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

