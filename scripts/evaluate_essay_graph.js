/**
 * FPSC English Essay DAG Task Force — Graph State Reducer & Deal-Breaker Validator
 *
 * Programmatic state reducer for evaluating 100-mark FPSC CSS English Essays.
 *
 * Execution Steps:
 *   1. Ingests isolated node state JSON files from .graph_state/essay/
 *   2. Validates annotations verbatim against transcribed text (culls hallucinations/orphans)
 *   3. Enforces FPSC Deal Breakers (Outline mismatch, forbidden inline body headings, tautological thesis)
 *   4. Computes deterministic word counts and scores the 7 FPSC Essay Rubrics (Total 100, Passing 40)
 *   5. Writes unified evaluation object to src/data/evaluations/eval-essay-graph-latest.json
 */

import fs from 'fs';
import path from 'path';

const GRAPH_STATE_DIR = path.resolve('.graph_state/essay');
const OUTPUT_DIR = path.resolve('src/data/evaluations');

const readNodeFile = (nodeFileName) => {
  const filePath = path.join(GRAPH_STATE_DIR, nodeFileName);
  if (!fs.existsSync(filePath)) {
    console.warn(`[EssayGraphEngine] Node file not found: ${filePath}`);
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[EssayGraphEngine] Failed to parse ${filePath}:`, err.message);
    return null;
  }
};

const countWords = (text) => {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
};

const validateAnnotations = (annotations, fullText) => {
  if (!annotations || !fullText) return { valid: [], removed: [] };

  const textLower = fullText.toLowerCase();
  const valid = [];
  const removed = [];

  for (const ann of annotations) {
    if (!ann.targetPhrase || ann.targetPhrase.trim().length < 2) {
      removed.push(ann);
      continue;
    }
    if (textLower.includes(ann.targetPhrase.toLowerCase())) {
      valid.push(ann);
    } else {
      removed.push(ann);
      console.log(`  ❌ Removed orphan annotation: "${ann.targetPhrase}"`);
    }
  }

  return { valid, removed };
};

const scoreFromStatus = (comp, maxMarks) => {
  if (typeof comp?.score === 'number') return comp.score;
  const status = (comp?.status || '').toLowerCase();
  if (status.includes('strong') || status.includes('satisfactory') || status.includes('excellent')) {
    return Math.round(maxMarks * 0.75 * 2) / 2;
  }
  if (status.includes('balanced') || status.includes('needs polish') || status.includes('needs improvement')) {
    return Math.round(maxMarks * 0.5 * 2) / 2;
  }
  return Math.round(maxMarks * 0.3 * 2) / 2;
};

console.log('╔═════════════════════════════════════════════════════════════════════╗');
console.log('║   FPSC English Essay Graph Engine — State Reducer & Deal-Breaker    ║');
console.log('║   Architecture: 6-Agent Isolated DAG with Programmatic Reducer      ║');
console.log('╚═════════════════════════════════════════════════════════════════════╝\n');

// 1. Ingest Nodes
const node0 = readNodeFile('node0_transcription.json');
const node1 = readNodeFile('node1_directive_relevance.json');
const node2 = readNodeFile('node2_outline_thesis.json');
const node3 = readNodeFile('node3_intro_conclusion.json');
const node4 = readNodeFile('node4_peel_evidence.json');
const node5 = readNodeFile('node5_grammar_annotations.json');

if (!node0) {
  console.error('[FATAL] Node 0 (Transcription) is missing. Cannot proceed with essay evaluation.');
  process.exit(1);
}

const fullTranscribedText = node0.fullTranscribedText || '';
const topic = node0.topic || node1?.examQuestion || 'CSS English Essay';
const totalWords = countWords(fullTranscribedText);
const introWords = node3?.introWordCount || countWords(node0.introParagraph || '');

// 2. Validate Annotations
const rawAnnotations = node5?.annotations || [];
const { valid: validAnnotations, removed: removedAnnotations } = validateAnnotations(rawAnnotations, fullTranscribedText);

// 3. Detect Deal Breakers Programmatically
const dealBreakerFlags = [];

// Deal Breaker 1: Outline-to-Body Mismatch
const outlineAlignment = node2?.outlineAlignment || { status: 'Satisfactory', missingFromBody: [] };
if (outlineAlignment.missingFromBody && outlineAlignment.missingFromBody.length > 0) {
  dealBreakerFlags.push({
    code: 'OUTLINE_BODY_MISMATCH',
    severity: 'High',
    description: `Points listed in the Outline were omitted in the Essay body: ${outlineAlignment.missingFromBody.join('; ')}`
  });
}

// Deal Breaker 2: Forbidden Inline Headings in Essay Body
const inlineHeadingPattern = /\n\s*(?:[A-Z0-9]+[\.\-\)]|[I|V|X]+[\.\-\)]|[A-Z][A-Za-z\s]{3,30}:)\s*\n/g;
const hasInlineHeadings = outlineAlignment.bodyHeadingWarning || inlineHeadingPattern.test(node0.bodyProseText || '');
if (hasInlineHeadings) {
  dealBreakerFlags.push({
    code: 'INLINE_HEADINGS_IN_BODY',
    severity: 'High',
    description: 'Inline headings/subheadings detected inside essay body. In FPSC English Essay, headings are strictly restricted to the Outline.'
  });
}

// Deal Breaker 3: Tautological or Missing Thesis
const thesisAudit = node2?.thesisAudit || {};
if (thesisAudit.status === 'Tautological' || thesisAudit.status === 'Needs Polish') {
  dealBreakerFlags.push({
    code: 'WEAK_TAUTOLOGICAL_THESIS',
    severity: 'Medium',
    description: 'Thesis statement merely mirrors the prompt without asserting a debatable stance.'
  });
}

// Deal Breaker 4: Forced Dictionary Bombast / Grammar
const grammarErrors = validAnnotations.filter((a) => a.category?.toLowerCase().includes('grammar') || a.type === 'red');
if (grammarErrors.length >= 5) {
  dealBreakerFlags.push({
    code: 'EXCESSIVE_GRAMMATICAL_ERRORS',
    severity: 'High',
    description: `Frequent grammar/syntax errors (${grammarErrors.length} severe infractions) undermine academic register.`
  });
}

// 4. Score 7 Rubric Dimensions
const scoreBreakdown = {
  topic_relevance: {
    name: '1. Topic Decoding & Prompt Relevance',
    maxMarks: 15,
    status: node1?.scoreBreakdown_topic_relevance?.status || 'Balanced',
    feedback: node1?.directiveAnalysis?.feedback || 'Evaluates prompt decoding and avoidance of pre-memorized cramming.'
  },
  outline: {
    name: '2. Formal Outline & Outline-to-Body Alignment',
    maxMarks: 15,
    status: outlineAlignment.status || 'Needs Polish',
    feedback: outlineAlignment.summary || 'Audits outline parallelism and fulfillment of headers in body.'
  },
  thesis: {
    name: '3. Thesis Statement Clarity & Stance',
    maxMarks: 10,
    status: thesisAudit.status || 'Needs Polish',
    feedback: thesisAudit.critique || 'Assesses whether thesis takes an arguable position.'
  },
  introduction: {
    name: '4. Introduction Funnel (Hook → Context → Thesis)',
    maxMarks: 15,
    status: node3?.scoreBreakdown_introduction?.status || 'Balanced',
    feedback: node3?.scoreBreakdown_introduction?.feedback || `Intro length: ${introWords} words (Target 180-250 words).`
  },
  body_paragraphs: {
    name: '5. Body Paragraph Depth (PEEL) & Empirical Evidence',
    maxMarks: 20,
    status: node4?.scoreBreakdown_body_paragraphs?.status || 'Balanced',
    feedback: node4?.scoreBreakdown_body_paragraphs?.feedback || 'Audits topic sentences, causal analysis, and empirical proof.'
  },
  coherence: {
    name: '6. Coherence, Transitions & Concluding Synthesis',
    maxMarks: 10,
    status: node3?.scoreBreakdown_coherence?.status || (hasInlineHeadings ? 'Needs Polish' : 'Balanced'),
    feedback: hasInlineHeadings
      ? 'Deduction: Forbidden inline headings inserted into essay body prose.'
      : (node3?.scoreBreakdown_coherence?.feedback || 'Smooth transitions and balanced conclusion.')
  },
  grammar_syntax: {
    name: '7. Language Clarity, Grammar & Natural Register',
    maxMarks: 15,
    status: node5?.scoreBreakdown_grammar?.status || (grammarErrors.length > 3 ? 'Needs Polish' : 'Strong'),
    feedback: node5?.scoreBreakdown_grammar?.feedback || 'Line-by-line grammar, academic diction, and register.'
  }
};

// Calculate calibrated scores
for (const key of Object.keys(scoreBreakdown)) {
  scoreBreakdown[key].score = scoreFromStatus(scoreBreakdown[key], scoreBreakdown[key].maxMarks);
}

// Penalty deduction if severe deal breakers are triggered
if (dealBreakerFlags.some((f) => f.code === 'OUTLINE_BODY_MISMATCH')) {
  scoreBreakdown.outline.score = Math.min(scoreBreakdown.outline.score, 6);
}
if (dealBreakerFlags.some((f) => f.code === 'INLINE_HEADINGS_IN_BODY')) {
  scoreBreakdown.coherence.score = Math.min(scoreBreakdown.coherence.score, 4);
}

const overallScore = Object.values(scoreBreakdown).reduce((sum, item) => sum + (item.score || 0), 0);
const isPassed = overallScore >= 40 && dealBreakerFlags.filter((d) => d.severity === 'High').length === 0;

const gradeBand = overallScore >= 60
  ? 'Distinction Standard (60%+)'
  : overallScore >= 45
    ? 'Solid FPSC Pass Band (45–59)'
    : overallScore >= 40
      ? 'Borderline Pass Band (40–44)'
      : 'Unprepared / Did Not Qualify (<40)';

// 5. Construct Unified FPSC Essay Evaluation Schema
const mergedEssayEvaluation = {
  id: `essay-graph-eval-${Date.now()}`,
  type: 'graph_dag_evaluation',
  subject: 'English Essay',
  essayMode: 'full',
  scored: false, // Diagnostic display per FPSC standards
  archetypeId: 'essay',
  archetypeLabel: 'FPSC English Essay Diagnostic',
  domainLabel: 'FPSC English Essay & Argumentation Mentor',
  candidateName: node0.candidateName || 'Candidate Essay Submission',
  date: new Date().toISOString().split('T')[0],
  topic,
  examQuestion: node1?.examQuestion || topic,
  evaluatedModelName: 'Gemini 3.8 Flash (Essay DAG Task Force)',

  overallScore,
  maxScore: 100,
  passingScore: 40,
  passStatus: isPassed,
  gradeBand,
  overallReadiness: isPassed ? 'FPSC Ready / Solid Passing Trajectory' : 'Critical Deal-Breakers Present — Needs Structural Overhaul',

  wordCount: totalWords,
  introWordCount: introWords,
  targetIntroWords: 180,

  dealBreakerFlags,
  directiveAnalysis: node1?.directiveAnalysis || {},
  thesisAudit,
  outlineAlignment,
  headerUpgrades: node2?.headerUpgrades || [],
  examinerSummary: node4?.examinerSummary || node1?.examinerSummary || 'Multi-agent structural evaluation completed.',
  customObservations: [
    ...(node3?.customObservations || []),
    ...(node4?.customObservations || []),
    ...(node5?.customObservations || [])
  ],
  thingsToInclude: node4?.thingsToInclude || [],
  rewrites: node4?.rewrites || [],
  factCheck: node4?.factCheck || [],
  suggestedVisual: node2?.suggestedVisual || {
    title: 'Model FPSC Parallel Essay Outline Blueprint',
    description: 'Corrected, grammatically parallel outline blueprint.',
    insertAfterHeading: 'OUTLINE',
    diagramText: 'MODEL OUTLINE BLUEPRINT'
  },
  annotations: validAnnotations,
  scoreBreakdown
};

// 6. Write Output
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const outputPath = path.join(OUTPUT_DIR, 'eval-essay-graph-latest.json');
fs.writeFileSync(outputPath, JSON.stringify(mergedEssayEvaluation, null, 2), 'utf-8');

console.log(`✅ Essay Graph Reduction Finished -> ${outputPath}`);
console.log(`   Total Score: ${overallScore}/100 | Pass: ${isPassed ? 'YES (Qualified)' : 'NO (Failed Deal Breakers)'}`);
console.log(`   Words: ${totalWords} (Intro: ${introWords}) | Valid Annotations: ${validAnnotations.length} (Removed: ${removedAnnotations.length})`);
console.log(`   Deal Breakers Triggered: ${dealBreakerFlags.length > 0 ? dealBreakerFlags.map((d) => d.code).join(', ') : 'None'}\n`);
