/**
 * FPSC 6-Agent Task Force Pipeline Runner
 * Wires the Subject-Adaptive Multi-Agent Evaluation Engine to the UI progress stepper.
 */

import { executeMultiAgentPipeline, getStoredApiKey } from './geminiApi';

export const PIPELINE_STEPS = [
  { id: 'transcribe', label: 'Agent 1/6: Vision OCR & Script Digitizer', basePercent: 25 },
  { id: 'directive', label: 'Agent 2/6: Question Directive & Scope Auditor', basePercent: 42 },
  { id: 'accuracy', label: 'Agent 3/6: Factual & Scholarly Citation Verifier', basePercent: 60 },
  { id: 'coverage', label: 'Agent 4/6: Structural Causality & FPSC Scorer', basePercent: 74 },
  { id: 'visuals', label: 'Agent 5/6: Visual Architect & Topper Rewriter', basePercent: 86 },
  { id: 'grammar', label: 'Agent 6/6: Universal Error & Strength Highlighter', basePercent: 95 }
];

export const executeEvaluationPipeline = async ({
  text,
  imageArray,
  subject,
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

  onProgress?.({
    currentStep: 1,
    totalSteps: 6,
    stage: 'Initializing FPSC 6-Agent Pipeline',
    stepLabel: 'Initializing FPSC 6-Agent Pipeline',
    detail: `Calibrating ${subject || 'FPSC CSS'} rubric and preparing submission...`,
    percent: 5,
    phase: 'starting'
  });

  const liveResult = await executeMultiAgentPipeline({
    text,
    imageArray,
    subject,
    examQuestion: examQuestion?.trim() || '',
    apiKey: effectiveKey,
    selectedModel,
    onAgentComplete: ({ agentId, agentName, detail, percent, phase }) => {
      let stepNum = 1;
      if (agentId === 'agent2') stepNum = 1;
      else if (agentId === 'agent1') stepNum = 2;
      else if (agentId === 'agent3') stepNum = 3;
      else if (agentId === 'agent4') stepNum = 4;
      else if (agentId === 'agent5') stepNum = 5;
      else if (agentId === 'agent6') stepNum = 6;
      else stepNum = 6;

      onProgress?.({
        currentStep: stepNum,
        totalSteps: 6,
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
    subject: subject,
    examQuestion: liveResult.examQuestion || examQuestion || liveResult.topic || '',
    candidateName: 'Candidate Submission',
    date: new Date().toISOString().split('T')[0],
    imagePages: imageArray || [],
    isLive: true
  };
};
