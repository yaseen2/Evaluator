/**
 * FPSC 6-Agent Task Force — Graph State Reducer & Validator
 * 
 * This script is the REAL programmatic part of the DAG pipeline.
 * It does NOT call any LLM. Instead, it:
 * 
 *   1. Reads intermediate node output files written by Antigravity
 *      (one JSON per agent step, stored in .graph_state/)
 *   2. Validates every annotation targetPhrase against the transcribed text
 *   3. Calculates deterministic word counts
 *   4. Merges all node outputs into the unified evaluation object
 *   5. Writes the final result to src/data/evaluations/eval-graph-latest.json
 * 
 * Usage:
 *   node scripts/evaluate_graph.js
 * 
 * Prerequisites:
 *   Antigravity must have already written the 6 node files into .graph_state/
 */

import fs from 'fs';
import path from 'path';

const GRAPH_STATE_DIR = path.resolve('.graph_state');
const OUTPUT_DIR = path.resolve('src/data/evaluations');

// ── Helper: Read a node file safely ──
const readNodeFile = (nodeFileName) => {
  const filePath = path.join(GRAPH_STATE_DIR, nodeFileName);
  if (!fs.existsSync(filePath)) {
    console.warn(`[GraphEngine] Node file not found: ${filePath}`);
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[GraphEngine] Failed to parse ${filePath}:`, err.message);
    return null;
  }
};

// ── Verbatim Target Phrase Validator ──
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
      console.log(`  ❌ Removed orphan: "${ann.targetPhrase}"`);
    }
  }

  return { valid, removed };
};

// ── Deterministic Word Counter ──
const countWords = (text) => {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
};

// ═══════════════════════════════════════════════════════════
// MAIN: State Reducer Pipeline
// ═══════════════════════════════════════════════════════════

console.log('╔══════════════════════════════════════════════════╗');
console.log('║  FPSC Graph Engine — State Reducer & Validator   ║');
console.log('╚══════════════════════════════════════════════════╝');
console.log();

// Step 1: Read all intermediate node files
console.log('[Phase 1] Reading intermediate node state files...');

const node1 = readNodeFile('node1_directive.json');
const node2 = readNodeFile('node2_transcription.json');
const node3 = readNodeFile('node3_factual.json');
const node4 = readNodeFile('node4_causality.json');
const node5 = readNodeFile('node5_visuals.json');
const node6 = readNodeFile('node6_annotations.json');

const nodesLoaded = [node1, node2, node3, node4, node5, node6].filter(Boolean).length;
console.log(`  Loaded ${nodesLoaded}/6 node state files.\n`);

if (!node2) {
  console.error('[FATAL] Node 2 (Transcription) is required but missing. Cannot proceed.');
  process.exit(1);
}

// Step 2: Extract transcribed text
const fullTranscribedText = node2.fullTranscribedText || '';
const topic = node2.topic || 'Answer Script';

console.log(`[Phase 2] Transcription loaded: "${topic}" (${countWords(fullTranscribedText)} words)\n`);

// Step 3: Validate annotations
console.log('[Phase 3] Validating annotation target phrases...');

const rawAnnotations = node6?.annotations || [];
const { valid: validAnnotations, removed: removedAnnotations } = validateAnnotations(rawAnnotations, fullTranscribedText);

console.log(`  Raw annotations: ${rawAnnotations.length}`);
console.log(`  Validated:       ${validAnnotations.length}`);
console.log(`  Removed orphans: ${removedAnnotations.length}\n`);

// Step 4: Calculate deterministic word counts
const totalWords = countWords(fullTranscribedText);
const paragraphs = fullTranscribedText.split('\n\n');
const introParagraph = paragraphs[1] || paragraphs[0] || '';
const introWords = countWords(introParagraph);

console.log(`[Phase 4] Deterministic word counts:`);
console.log(`  Total:  ${totalWords} words`);
console.log(`  Intro:  ${introWords} words (target ≥ 100)\n`);

// Step 5: Merge all node states into final evaluation object
console.log('[Phase 5] Merging graph state...');

const mergedEvaluation = {
  id: `graph-eval-${Date.now()}`,
  type: 'graph_dag_evaluation',
  subject: node1?.subject || node2?.subject || 'Islamic History & Culture',
  examQuestion: node1?.examQuestion || node2?.topic || '',
  topic,
  candidateName: 'Graph DAG Submission',
  date: new Date().toISOString().split('T')[0],
  evaluatedModelName: 'Antigravity DAG Graph Engine',

  fullTranscribedText,
  wordCount: totalWords,
  introWordCount: introWords,

  // Node 1: Directive
  directiveAnalysis: node1?.directiveAnalysis || {},

  // Node 3: Factual
  factCheck: node3?.factCheck || [],

  // Node 4: Causality
  examinerSummary: node4?.examinerSummary || null,
  customObservations: node4?.customObservations || [],
  thingsToInclude: node4?.thingsToInclude || [],

  // Node 5: Visuals
  suggestedVisual: node5?.suggestedVisual || null,

  // Node 6: Annotations (post-validated)
  annotations: validAnnotations,

  // Merged scoreBreakdown
  scoreBreakdown: {
    introduction: node6?.scoreBreakdown_introduction || { status: 'Needs Improvement', feedback: 'Unable to assess.' },
    headings: node5?.scoreBreakdown_headings || { status: 'Needs Improvement', feedback: 'Unable to assess.' },
    diagrams: node5?.scoreBreakdown_diagrams || { status: 'Needs Improvement', feedback: 'Unable to assess.' },
    critical_analysis: node4?.scoreBreakdown_critical_analysis || { status: 'Needs Improvement', feedback: 'Unable to assess.' },
    grammar_syntax: node6?.scoreBreakdown_grammar_syntax || { status: 'Needs Improvement', feedback: 'Unable to assess.' }
  }
};

// Step 6: Write final output
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const outputPath = path.join(OUTPUT_DIR, 'eval-graph-latest.json');
fs.writeFileSync(outputPath, JSON.stringify(mergedEvaluation, null, 2), 'utf-8');

console.log(`\n[Phase 6] Final evaluation written to:`);
console.log(`  ${outputPath}`);
console.log();
console.log('╔══════════════════════════════════════════════════╗');
console.log('║  ✅ Graph Reduction Complete                     ║');
console.log(`║  Words: ${totalWords} | Annotations: ${validAnnotations.length} valid, ${removedAnnotations.length} removed ║`);
console.log('╚══════════════════════════════════════════════════╝');
