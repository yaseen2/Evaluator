/**
 * Resilient JSON Parser, Unescaped-Quote Repairer & @google/genai Model Caller (v2.1)
 *
 * Prevents:
 *  1. `Expected ',' or '}' after property value in JSON` caused by unescaped inner double quotes
 *     when agents quote student text containing quotation marks.
 *  2. Mid-JSON truncation caused by thinking tokens consuming `maxOutputTokens` (raised to 16384).
 *  3. Search Grounding markdown/citation wrappers breaking `JSON.parse`.
 */

import { GoogleGenAI } from '@google/genai';

export const ESSAY_MODEL_CANDIDATES = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite'
];

/**
 * State-machine JSON repairer that fixes:
 *  - Unescaped double quotes inside string values (e.g. "The phrase "doing mistakes" is wrong")
 *  - Unescaped literal newlines/tabs inside string values
 *  - Trailing commas before } or ]
 */
export const repairMalformedJsonString = (input) => {
  if (!input || typeof input !== 'string') return '';

  let src = input.trim();
  const firstBrace = src.indexOf('{');
  const lastBrace = src.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    src = src.slice(firstBrace, lastBrace + 1);
  } else if (firstBrace !== -1) {
    src = src.slice(firstBrace);
  }

  let out = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      out += ch;
      escaped = true;
      continue;
    }

    if (ch === '"') {
      if (!inString) {
        inString = true;
        out += ch;
      } else {
        // Look ahead past whitespace to see if this quote is a legitimate closing quote
        let j = i + 1;
        while (j < src.length && (src[j] === ' ' || src[j] === '\t' || src[j] === '\r' || src[j] === '\n')) {
          j++;
        }
        const nextSig = src[j];

        let isClosingQuote = false;
        if (j >= src.length || nextSig === '}' || nextSig === ']') {
          isClosingQuote = true;
        } else if (nextSig === ':') {
          // Valid closing quote of an object key only if followed by a valid JSON value token
          let k = j + 1;
          while (k < src.length && (src[k] === ' ' || src[k] === '\t' || src[k] === '\r' || src[k] === '\n')) {
            k++;
          }
          const afterColon = src[k];
          if (
            afterColon === '"' ||
            afterColon === '{' ||
            afterColon === '[' ||
            afterColon === 't' ||
            afterColon === 'f' ||
            afterColon === 'n' ||
            afterColon === '-' ||
            (afterColon >= '0' && afterColon <= '9')
          ) {
            isClosingQuote = true;
          }
        } else if (nextSig === ',') {
          // Valid closing quote before a comma ONLY if after the comma comes a JSON key/value/closing bracket
          // (Prevents prose like `"committing mistakes", which is...` from prematurely closing the string!)
          let k = j + 1;
          while (k < src.length && (src[k] === ' ' || src[k] === '\t' || src[k] === '\r' || src[k] === '\n')) {
            k++;
          }
          const afterComma = src[k];
          if (
            k >= src.length ||
            afterComma === '"' ||
            afterComma === '{' ||
            afterComma === '[' ||
            afterComma === '}' ||
            afterComma === ']'
          ) {
            isClosingQuote = true;
          }
        }

        if (isClosingQuote) {
          inString = false;
          out += ch;
        } else {
          // It is an unescaped inner quote inside a string value! Escape it:
          out += '\\"';
        }
      }
      continue;
    }

    if (inString) {
      if (ch === '\n') {
        out += '\\n';
        continue;
      }
      if (ch === '\r') {
        continue;
      }
      if (ch === '\t') {
        out += '\\t';
        continue;
      }
    }

    out += ch;
  }

  // If string was left open due to truncation, close it
  if (inString) {
    out += '"';
  }

  // Remove trailing commas before } or ]
  out = out.replace(/,\s*([}\]])/g, '$1');

  // Balance any unclosed brackets/braces if truncated
  const stack = [];
  let insideStr = false;
  let esc = false;
  for (let i = 0; i < out.length; i++) {
    const c = out[i];
    if (esc) {
      esc = false;
      continue;
    }
    if (c === '\\') {
      esc = true;
      continue;
    }
    if (c === '"') {
      insideStr = !insideStr;
      continue;
    }
    if (!insideStr) {
      if (c === '{') stack.push('}');
      else if (c === '[') stack.push(']');
      else if (c === '}' || c === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === c) {
          stack.pop();
        }
      }
    }
  }
  while (stack.length > 0) {
    out += stack.pop();
  }

  return out;
};

/**
 * Multi-stage resilient JSON parser that handles:
 *  1. Direct JSON strings
 *  2. Markdown ```json ... ``` code blocks (even with preamble/postamble text from Search Grounding)
 *  3. State-machine repair for unescaped inner quotes, literal newlines, trailing commas, and truncation
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
        return JSON.parse(repairMalformedJsonString(fencedMatch[1]));
      } catch (__) {
        // continue
      }
    }
  }

  // Stage 3: Full state-machine repair on the outer JSON object
  const repaired = repairMalformedJsonString(strippedOuter);
  try {
    return JSON.parse(repaired);
  } catch (err) {
    throw new Error(`Failed to parse JSON after state-machine repair: ${err.message}`);
  }
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
  maxOutputTokens = 16384,
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
    const maxRetries = 1;
    let useSearchOnThisAttempt = enableGoogleSearch;

    while (attempt <= maxRetries) {
      try {
        const config = {
          temperature,
          maxOutputTokens: Math.max(16384, maxOutputTokens)
        };

        if (systemInstruction) {
          config.systemInstruction = systemInstruction;
        }

        if (useSearchOnThisAttempt) {
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
          searchSources,
          searchGrounded: Boolean(useSearchOnThisAttempt)
        };
      } catch (err) {
        const msg = err?.message || String(err);
        const isTransient =
          msg.includes('429') ||
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('503') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('500');

        if (isTransient && attempt < maxRetries) {
          attempt++;
          const waitMs = 1200 + Math.random() * 400;
          console.warn(
            `[GenAI Runner] ${stageName} on ${modelName} hit transient error (${msg.slice(0, 80)}). Retrying in ${Math.round(waitMs)}ms...`
          );
          await sleep(waitMs);
          continue;
        }

        // Only disable Google Search as final fallback when on the last candidate model or non-transient tool/JSON failure
        if (useSearchOnThisAttempt && attempt === 0) {
          console.warn(
            `[GenAI Runner] ${stageName} on ${modelName} retrying with strict JSON mode (search degraded): ${msg.slice(0, 100)}`
          );
          useSearchOnThisAttempt = false;
          attempt++;
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
