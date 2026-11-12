/**
 * Resilient JSON Parser & @google/genai Model Caller (v2.1)
 *
 * Ensures Google Search Grounding metadata, markdown code blocks, or minor trailing
 * commas never break JSON.parse during multi-agent execution.
 */

import { GoogleGenAI } from '@google/genai';

export const ESSAY_MODEL_CANDIDATES = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite'
];

/**
 * Multi-stage resilient JSON parser that handles:
 *  1. Direct JSON strings
 *  2. Markdown ```json ... ``` code blocks (even with preamble/postamble text from Search Grounding)
 *  3. Balanced { ... } or [ ... ] extraction with trailing-comma and control-character repair
 */
export const safeParseJsonWithGrounding = (rawInput) => {
  if (!rawInput) {
    throw new Error('Empty response received from Gemini agent.');
  }

  if (typeof rawInput === 'object') {
    return rawInput;
  }

  const text = String(rawInput).trim();

  // Stage 1: Direct parse after stripping outer code fences
  const strippedOuter = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(strippedOuter);
  } catch (_) {
    // continue to fallback stages
  }

  // Stage 2: Extract any fenced ```json ... ``` block embedded inside grounding text
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch && fencedMatch[1]) {
    try {
      return JSON.parse(fencedMatch[1].trim());
    } catch (_) {
      try {
        const repairedFenced = fencedMatch[1]
          .trim()
          .replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(repairedFenced);
      } catch (__) {
        // continue
      }
    }
  }

  // Stage 3: Balanced outer brace { ... } extraction with trailing-comma repair
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = text.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch (_) {
      // Repair common LLM/grounding JSON hiccups: trailing commas & unescaped control newlines inside strings
      const repaired = candidate
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
      try {
        return JSON.parse(repaired);
      } catch (err) {
        throw new Error(`Failed to parse JSON after grounding fallback: ${err.message}`);
      }
    }
  }

  throw new Error('Could not locate a valid JSON object in the Gemini agent response.');
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const extractDataUrlParts = (imgData) => {
  if (!imgData || typeof imgData !== 'string') {
    return { mimeType: 'image/jpeg', data: '' };
  }
  const match = imgData.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], data: match[2] };
  }
  return {
    mimeType: 'image/jpeg',
    data: imgData.replace(/^data:image\/[^;]+;base64,/, '')
  };
};

/**
 * Executes a single @google/genai call with optional Google Search Grounding,
 * multimodal inline images, automatic retry on 429/503, and model failover.
 */
export const callGenAiAgentWithFailover = async ({
  apiKey,
  prompt,
  systemInstruction = '',
  imageArray = [],
  enableGoogleSearch = false,
  temperature = 0.2,
  maxOutputTokens = 6144,
  preferredModel = 'auto',
  stageName = 'Essay Agent',
  ledger = null
}) => {
  const ai = new GoogleGenAI({ apiKey });

  const candidateList =
    preferredModel && preferredModel !== 'auto'
      ? [preferredModel, ...ESSAY_MODEL_CANDIDATES.filter((m) => m !== preferredModel)]
      : ESSAY_MODEL_CANDIDATES;

  const contentsParts = [];
  if (imageArray && imageArray.length > 0) {
    for (const img of imageArray) {
      const { mimeType, data } = extractDataUrlParts(img);
      if (data) {
        contentsParts.push({
          inlineData: {
            mimeType,
            data
          }
        });
      }
    }
  }
  contentsParts.push({ text: prompt });

  let lastError = null;

  for (const modelName of candidateList) {
    let attempt = 0;
    const maxRetries = 2;

    while (attempt <= maxRetries) {
      try {
        const config = {
          temperature,
          maxOutputTokens
        };

        if (systemInstruction) {
          config.systemInstruction = systemInstruction;
        }

        // Note: In Gemini API, combining tools: [{ googleSearch: {} }] with responseMimeType: 'application/json'
        // can be rejected on some model endpoints; when enableGoogleSearch is true, we allow text/fenced JSON
        // and parse with safeParseJsonWithGrounding. When false, we enforce strict application/json.
        if (enableGoogleSearch) {
          config.tools = [{ googleSearch: {} }];
        } else {
          config.responseMimeType = 'application/json';
        }

        const response = await ai.models.generateContent({
          model: modelName,
          contents: [{ role: 'user', parts: contentsParts }],
          config
        });

        const rawText =
          typeof response.text === 'string'
            ? response.text
            : response.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('\n') || '';

        if (!rawText) {
          throw new Error(`Empty response from model ${modelName}`);
        }

        const parsed = safeParseJsonWithGrounding(rawText);

        // Extract grounding sources if Google Search was used
        const groundingChunks =
          response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const searchSources = groundingChunks
          .map((c) => c.web?.uri || c.web?.title)
          .filter(Boolean);

        const meta = response.usageMetadata || {};
        const fallbackInput =
          Math.ceil((prompt?.length || 0) / 4) +
          (imageArray?.length ? imageArray.length * 258 : 0);
        const fallbackOutput = Math.ceil((rawText?.length || 0) / 4);

        const usage = {
          inputTokens: Number(meta.promptTokenCount) || fallbackInput,
          outputTokens: Number(meta.candidatesTokenCount) || fallbackOutput,
          thinkingTokens: Number(meta.thoughtsTokenCount) || 0,
          totalTokens:
            Number(meta.totalTokenCount) ||
            (Number(meta.promptTokenCount) || fallbackInput) +
              (Number(meta.candidatesTokenCount) || fallbackOutput)
        };

        if (ledger && typeof ledger.recordStage === 'function') {
          ledger.recordStage(stageName, modelName, usage);
        }

        return {
          result: parsed,
          modelName,
          usage,
          searchSources
        };
      } catch (err) {
        const msg = err?.message || String(err);
        const isTransient =
          msg.includes('429') ||
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('503') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('500');

        // If search grounding tool failed on a specific model/region, retry once on same model without search tool before failing over
        if (enableGoogleSearch && attempt === 0 && (msg.includes('400') || msg.includes('tool') || msg.includes('search'))) {
          console.warn(`[GenAI Runner] Search grounding tool unsupported on ${modelName}, retrying without search tool...`);
          enableGoogleSearch = false;
          attempt++;
          continue;
        }

        if (isTransient && attempt < maxRetries) {
          attempt++;
          const waitMs = Math.min(5000, 900 * Math.pow(2, attempt) + Math.random() * 400);
          console.warn(
            `[GenAI Runner] ${stageName} on ${modelName} hit transient error (${msg.slice(0, 80)}). Retrying in ${Math.round(waitMs)}ms...`
          );
          await sleep(waitMs);
          continue;
        }

        console.warn(`[GenAI Runner] ${stageName} failed on ${modelName}:`, msg.slice(0, 160));
        lastError = err;
        break;
      }
    }
  }

  throw new Error(
    `${stageName} failed across all Gemini models: ${lastError?.message || 'Unknown error'}`
  );
};

