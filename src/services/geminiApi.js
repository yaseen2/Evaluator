/**
 * Client-Side Model Preferences & Pre-Flight Credit Estimator
 *
 * SECURITY NOTE:
 * All FPSC CSS Essay Rubric configurations, multi-agent prompts, and Gemini API execution
 * live strictly on the server inside `functions/src/rubric/` and `functions/src/pipeline/`.
 * Zero prompts or rubric IP are bundled into client-side code.
 */

import { callEvaluateSubmission } from './firebase';

const API_KEY_STORAGE = 'css_eval_gemini_api_key';
const MODEL_STORAGE = 'css_eval_gemini_model';

export const AVAILABLE_MODELS = [
  { id: 'auto', name: 'Auto (Recommended — Smart Failover)' },
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Ultra-Fast Latest)' },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (High-Speed Reasoning)' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash (Balanced FPSC Standard)' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite (Low Latency)' }
];

export const getStoredApiKey = () => localStorage.getItem(API_KEY_STORAGE) || '';
export const setStoredApiKey = (key) => localStorage.setItem(API_KEY_STORAGE, (key || '').trim());

export const getStoredModel = () => localStorage.getItem(MODEL_STORAGE) || 'auto';
export const setStoredModel = (model) => localStorage.setItem(MODEL_STORAGE, model || 'auto');

const monthlyGroundingUsage = {
  count: parseInt(localStorage.getItem('css_eval_api_usage_count') || '0', 10),
  limit: 5000,
  lastReset: new Date().toISOString()
};

export const getGroundingUsage = () => monthlyGroundingUsage;

export const countWords = (text) => {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
};

export const countIntroWords = (fullText) => {
  if (!fullText || typeof fullText !== 'string') return 0;
  const blocks = fullText
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  for (const block of blocks) {
    const words = countWords(block);
    if (words >= 35) return words;
  }
  return countWords(blocks[0] || '');
};

export const WEIGHTED_TOKENS_PER_CREDIT = 2500;
export const OUTPUT_TOKEN_MULTIPLIER = 3;

export const estimateCreditsPreFlight = ({
  isEssay = false,
  essayMode = 'full',
  activeTab = 'image',
  imageCount = 0,
  wordCount = 0
}) => {
  const pages = activeTab === 'image' ? Math.max(1, Number(imageCount || 0)) : 0;
  const words = activeTab === 'text' ? Math.max(0, Number(wordCount || 0)) : 0;

  let estimatedWeightedTokens = 0;
  let minRequiredCredits = 4;

  if (isEssay && (essayMode === 'outline_only' || essayMode === 'outline')) {
    estimatedWeightedTokens = 14000 + pages * 1500 + Math.max(0, words - 200) * 10;
    minRequiredCredits = pages > 0 ? 6 + Math.ceil(pages * 0.6) : 6;
  } else if (isEssay) {
    estimatedWeightedTokens = 44000 + pages * 2500 + Math.max(0, words - 1200) * 14;
    minRequiredCredits = pages > 0 ? Math.min(45, 16 + pages) : 18;
  } else {
    estimatedWeightedTokens = 21000 + pages * 2500 + Math.max(0, words - 450) * 12;
    minRequiredCredits = pages > 0 ? Math.min(18, 8 + pages) : 9;
  }

  const estimatedCredits = Math.max(
    minRequiredCredits,
    Math.min(60, Math.ceil(estimatedWeightedTokens / WEIGHTED_TOKENS_PER_CREDIT))
  );

  return {
    estimatedCredits,
    minRequiredCredits,
    estimatedWeightedTokens
  };
};

/**
 * Delegates evaluation execution strictly to the secure Firebase Cloud Function.
 */
export const executeMultiAgentPipeline = async (payload) => {
  const response = await callEvaluateSubmission(payload);
  return response.evaluation;
};
