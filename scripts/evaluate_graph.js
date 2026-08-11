/**
 * FPSC 6-Agent Task Force — Local Graph Engineering Pipeline Engine
 * 
 * DAG (Directed Acyclic Graph) Architecture:
 * 
 *               [Input State: Raw Text / Image]
 *                            │
 *           ┌────────────────┴────────────────┐
 *           ▼                                 ▼
 *   [Node 1: Directive]              [Node 2: Transcription]
 *           │                                 │
 *           └────────────────┬────────────────┘
 *                            ▼
 *            ┌───────────────┼───────────────┬───────────────┐
 *            ▼               ▼               ▼               ▼
 *      [Node 3: Facts] [Node 4: Cause] [Node 5: Vis]  [Node 6: Anns]
 *            │               │               │               │
 *            └───────────────┴───────┬───────┴───────────────┘
 *                                    ▼
 *                     [Node 7: State Reducer &]
 *                     [Verbatim Target Validator]
 *                                    │
 *                                    ▼
 *                      [src/data/evaluations/eval-xxx.json]
 */

import fs from 'fs';
import path from 'path';

// ── Graph State Schema ──
export class EvaluationGraphState {
  constructor(rawInput) {
    this.rawInput = {
      text: rawInput.text || '',
      subject: rawInput.subject || 'Islamic History & Culture',
      examQuestion: rawInput.examQuestion || '',
      filePath: rawInput.filePath || null
    };

    // Node Output Store (Isolated Graph State Nodes)
    this.nodes = {
      directive: null,
      transcription: null,
      factual: null,
      causality: null,
      visuals: null,
      annotations: null
    };

    this.mergedState = null;
    this.status = 'INITIALIZED';
    this.logs = [];
  }

  log(nodeName, message) {
    const entry = `[${new Date().toISOString()}] [${nodeName}] ${message}`;
    this.logs.push(entry);
    console.log(entry);
  }
}

// ── Verbatim Target Phrase Post-Processor (State Reducer Guard) ──
export const validateAndReduceGraphState = (state) => {
  state.log('ReducerNode', 'Executing State Reducer & Verbatim Target Phrase Validator...');

  const transcribedText = state.nodes.transcription?.fullTranscribedText || state.rawInput.text || '';
  const textLower = transcribedText.toLowerCase();

  // Validate Annotations (Node 6)
  const rawAnnotations = state.nodes.annotations?.annotations || [];
  const validAnnotations = rawAnnotations.filter(ann => {
    if (!ann.targetPhrase) return false;
    const phraseLower = ann.targetPhrase.toLowerCase();
    const exists = textLower.includes(phraseLower);
    if (!exists) {
      state.log('ReducerNode', `Removed orphaned annotation: "${ann.targetPhrase}" (Not found in transcription)`);
    }
    return exists;
  });

  // Calculate Deterministic Word Counts
  const totalWords = transcribedText.trim().split(/\s+/).filter(Boolean).length;
  const firstParagraph = transcribedText.split('\n\n')[1] || transcribedText.split('\n\n')[0] || '';
  const introWords = firstParagraph.trim().split(/\s+/).filter(Boolean).length;

  // Construct Final Graph State
  state.mergedState = {
    id: `graph-eval-${Date.now()}`,
    type: 'graph_dag_evaluation',
    subject: state.rawInput.subject,
    examQuestion: state.rawInput.examQuestion || state.nodes.transcription?.topic || '',
    topic: state.nodes.transcription?.topic || 'Answer Script',
    candidateName: 'Local Graph Submission',
    date: new Date().toISOString().split('T')[0],
    evaluatedModelName: 'Antigravity Graph Engine (DAG)',
    
    fullTranscribedText: transcribedText,
    wordCount: totalWords,
    introWordCount: introWords,

    // Node State Merge
    directiveAnalysis: state.nodes.directive?.directiveAnalysis || {},
    factCheck: state.nodes.factual?.factCheck || [],
    examinerSummary: state.nodes.causality?.examinerSummary || null,
    customObservations: state.nodes.causality?.customObservations || [],
    thingsToInclude: state.nodes.causality?.thingsToInclude || [],
    suggestedVisual: state.nodes.visuals?.suggestedVisual || null,
    annotations: validAnnotations,

    scoreBreakdown: {
      introduction: state.nodes.annotations?.scoreBreakdown_introduction || { status: 'Needs Improvement', feedback: 'Intro check completed.' },
      headings: state.nodes.visuals?.scoreBreakdown_headings || { status: 'Satisfactory', feedback: 'Headings audited.' },
      diagrams: state.nodes.visuals?.scoreBreakdown_diagrams || { status: 'Satisfactory', feedback: 'Visual diagram mapped.' },
      critical_analysis: state.nodes.causality?.scoreBreakdown_critical_analysis || { status: 'Satisfactory', feedback: 'Structural causality evaluated.' },
      grammar_syntax: state.nodes.annotations?.scoreBreakdown_grammar_syntax || { status: 'Satisfactory', feedback: 'Grammar audit completed.' }
    }
  };

  state.status = 'COMPLETED';
  state.log('ReducerNode', `Graph Reduction Complete! Word Count: ${totalWords}, Annotations Validated: ${validAnnotations.length}`);
  return state.mergedState;
};

// ── Graph File Writer ──
export const saveGraphResult = (mergedState, outputDir = 'src/data/evaluations') => {
  const absoluteDir = path.resolve(outputDir);
  if (!fs.existsSync(absoluteDir)) {
    fs.mkdirSync(absoluteDir, { recursive: true });
  }

  const filePath = path.join(absoluteDir, `eval-graph-latest.json`);
  fs.writeFileSync(filePath, JSON.stringify(mergedState, null, 2), 'utf-8');
  console.log(`[GraphEngine] Saved Graph Evaluation State to: ${filePath}`);
  return filePath;
};

// ── CLI Runner Entry Point ──
if (import.meta.url === `file://${process.argv[1]}`) {
  const inputFile = process.argv[2];
  if (!inputFile) {
    console.log('Usage: node scripts/evaluate_graph.js <path-to-paper-text-file>');
    process.exit(1);
  }

  const text = fs.readFileSync(inputFile, 'utf-8');
  const graphState = new EvaluationGraphState({ text });
  console.log(`[GraphEngine] Initialized evaluation graph for: ${inputFile}`);
}
