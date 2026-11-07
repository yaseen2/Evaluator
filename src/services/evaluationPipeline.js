/**
 * FPSC Multi-Agent Pipeline Runner
 * Wires the Subject-Adaptive & Essay Anatomy Evaluation Engine to the UI progress stepper.
 */

import { executeMultiAgentPipeline, getStoredApiKey } from './geminiApi';

export const PIPELINE_STEPS = [
  { id: 'transcribe', label: 'Agent 1: Vision OCR & Script Digitizer', basePercent: 25 },
  { id: 'directive', label: 'Agent 2: Scope & Outline Alignment Auditor', basePercent: 45 },
  { id: 'accuracy', label: 'Agent 3: Empirical & Citation Verifier', basePercent: 65 },
  { id: 'coverage', label: 'Agent 4: PEEL & Structural Depth Mentor', basePercent: 78 },
  { id: 'visuals', label: 'Agent 5: Blueprint & Topper Rewriter', basePercent: 88 },
  { id: 'grammar', label: 'Agent 6: Pedagogical Micro-Lesson Highlighter', basePercent: 96 }
];

export const executeEvaluationPipeline = async ({
  text,
  imageArray,
  subject,
  essayMode = 'full',
  examQuestion,
  mode,
  apiKey,
  selectedModel,
  onProgress
}) => {
  const effectiveKey = apiKey || getStoredApiKey();
  if (!effectiveKey) {
    throw new Error('Please configure your Gemini API Key in Settings (⚙️) before evaluating a paper.');
  }

  const isEssay = (subject || '').toLowerCase().includes('essay');
  const totalSteps = isEssay ? (essayMode === 'outline_only' ? 2 : 4) : 6;

  onProgress?.({
    currentStep: 1,
    totalSteps,
    stage:
      isEssay && essayMode === 'outline_only'
        ? 'Initializing FPSC Outline & Thesis Mentor'
        : isEssay
        ? 'Initializing Anatomical Essay Diagnostic DAG'
        : 'Initializing FPSC 6-Agent Pipeline',
    stepLabel:
      isEssay && essayMode === 'outline_only'
        ? 'Initializing FPSC Outline & Thesis Mentor'
        : isEssay
        ? 'Initializing Anatomical Essay Diagnostic DAG'
        : 'Initializing FPSC 6-Agent Pipeline',
    detail: `Calibrating ${subject || 'FPSC CSS'} diagnostic rubric...`,
    percent: 6,
    phase: 'starting'
  });

  const liveResult = await executeMultiAgentPipeline({
    text,
    imageArray,
    subject,
    essayMode,
    examQuestion: examQuestion?.trim() || '',
    apiKey: effectiveKey,
    selectedModel,
    onAgentComplete: ({ agentId, agentName, detail, percent, phase }) => {
      let stepNum = 1;
      if (agentId === 'agent2') stepNum = 1;
      else if (agentId === 'agent1') stepNum = 2;
      else if (agentId === 'agent3') stepNum = 3;
      else if (agentId === 'agent4') stepNum = isEssay && essayMode === 'outline_only' ? 2 : isEssay ? 2 : 4;
      else if (agentId === 'agent5') stepNum = isEssay ? 3 : 5;
      else if (agentId === 'agent6') stepNum = isEssay ? 4 : 6;
      else stepNum = totalSteps;

      onProgress?.({
        currentStep: stepNum,
        totalSteps,
        stage: agentName,
        stepLabel: agentName,
        detail: detail || `Executing ${agentName}...`,
        percent: Math.min(99, percent || 50),
        phase
      });
    }
  });

  return {
    ...liveResult,
    id: `eval-${Date.now()}`,
    type: mode,
    subject,
    essayMode: liveResult.essayMode || essayMode,
    examQuestion: liveResult.examQuestion || examQuestion || liveResult.topic || '',
    candidateName: 'Candidate Submission',
    date: new Date().toISOString().split('T')[0],
    imagePages: imageArray || [],
    isLive: true
  };
};
