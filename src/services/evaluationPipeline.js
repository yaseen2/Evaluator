/**
 * FPSC 6-Agent Task Force Pipeline Runner
 * Wires the sequential multi-agent evaluation engine to the UI progress stepper.
 */

import { executeMultiAgentPipeline, detectExamQuestionPreCheck, getStoredApiKey } from './geminiApi';

export const PIPELINE_STEPS = [
  { id: 'directive', label: 'Agent 1: Question Directive & Scope Auditor', basePercent: 15 },
  { id: 'transcribe', label: 'Agent 2: Digitizer & Transcription Specialist', basePercent: 35 },
  { id: 'accuracy', label: 'Agent 3: Historical Accuracy & Factual Verifier', basePercent: 60 },
  { id: 'coverage', label: 'Agent 4: Structural Causality & Analytical Depth', basePercent: 70 },
  { id: 'visuals', label: 'Agent 5: Headings & Contextual Visual Architect', basePercent: 80 },
  { id: 'grammar', label: 'Agent 6: Universal Error & Strength Highlighter', basePercent: 90 }
];

export const executeEvaluationPipeline = async ({ text, imageArray, subject, examQuestion, mode, apiKey, selectedModel, onProgress }) => {
  const effectiveKey = apiKey || getStoredApiKey();

  // ── Pre-Check: Question Detection (15%) ──
  onProgress({ currentStep: 1, totalSteps: 6, stepLabel: 'Pre-Check: Question Detection', percent: 5 });

  let resolvedQuestion = examQuestion?.trim() || '';

  if (!resolvedQuestion && effectiveKey) {
    const preCheck = await detectExamQuestionPreCheck({ text, imageArray, apiKey: effectiveKey });
    
    if (!preCheck.hasQuestion) {
      throw new Error('MISSING_EXAM_QUESTION');
    } else if (preCheck.extractedQuestion) {
      resolvedQuestion = preCheck.extractedQuestion;
    }
  }

  if (effectiveKey) {
    try {
      // ── Execute True Multi-Agent Pipeline ──
      const liveResult = await executeMultiAgentPipeline({
        text,
        imageArray,
        subject,
        examQuestion: resolvedQuestion,
        apiKey: effectiveKey,
        selectedModel,
        onAgentComplete: ({ agentId, agentName, percent, phase }) => {
          // Map agent completion events to the UI progress stepper
          let stepNum;
          if (agentId === 'agent1') stepNum = 1;
          else if (agentId === 'agent2') stepNum = 2;
          else if (agentId === 'agent3') stepNum = 3;
          else if (agentId === 'agent4') stepNum = 4;
          else if (agentId === 'agent5') stepNum = 5;
          else if (agentId === 'agent6') stepNum = 6;
          else stepNum = 6;

          onProgress({
            currentStep: stepNum,
            totalSteps: 6,
            stepLabel: agentName,
            percent: Math.min(98, percent),
            phase
          });
        }
      });

      return {
        ...liveResult,
        id: `eval-live-${Date.now().toString().slice(-4)}`,
        type: mode,
        subject: subject,
        examQuestion: resolvedQuestion || liveResult.topic || '',
        candidateName: 'Candidate Submission',
        date: new Date().toISOString().split('T')[0],
        imagePages: imageArray || [],
        isLive: true
      };
    } catch (err) {
      if (err.message === 'MISSING_EXAM_QUESTION') throw err;
      console.warn('Multi-Agent Pipeline failed:', err);
      throw err;
    }
  }

  throw new Error('NO_API_KEY_OR_FAILED');
};
