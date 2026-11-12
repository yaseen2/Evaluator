/**
 * Stage 0A: Agent 0 — Vision OCR Digitizer & Handwritten Layout Auditor (v2.1)
 *
 * 1. Conditional Bypass: If input is typed digital text (zero images), Agent 0 is skipped (0 tokens)
 *    and physical handwriting layout checks are disabled.
 * 2. Parallel Batching (<10s for 15 pages): Transcribes handwritten page scans in parallel batches
 *    of 4 pages via Promise.all, stitching pages back in exact sequential order.
 * 3. Verbatim Mandate: Never auto-corrects spelling, grammar, or punctuation during transcription.
 */

import { callGenAiAgentWithFailover } from './safeJsonParser.js';

const BATCH_SIZE = 4;

const buildBatchOcrPrompt = ({ batchIndex, startPage, endPage, totalPages, userExamQuestion }) => `
You are Agent 0: FPSC CSS VERBATIM OCR DIGITIZER & HANDWRITTEN SCRIPT INSPECTOR.
You are transcribing Pages ${startPage} to ${endPage} (out of ${totalPages} total pages).
${userExamQuestion ? `Candidate's Selected Essay Prompt: "${userExamQuestion}"` : ''}

CRITICAL VERBATIM TRANSCRIPTION RULES:
1. Transcribe the handwritten text 100% VERBATIM in exact sequential page order.
2. NEVER auto-correct spelling mistakes, grammatical errors, missing articles, wrong prepositions, or punctuation errors—preserve every mistake exactly as written on the paper so downstream examiners can teach the student.
3. Preserve all Outline numbering (I, II, A, B, 1, 2, 1.1) and paragraph breaks using double newlines (\\n\\n).
4. If the student crossed out a phrase, omit the crossed-out words from the main text and note heavy scratch-outs in "handwritingNotes".
5. Audit physical handwritten presentation on these pages (paragraph indentation, left/right margin discipline, legibility, and whether body pages contain roughly 2 paragraphs per page).

Return ONLY this JSON object:
{
  "detectedTitle": "string or null (Essay title/topic if written on these pages, else null)",
  "transcribedText": "string (Full verbatim transcription of pages ${startPage}–${endPage} with \\n\\n paragraph breaks)",
  "handwritingAudit": {
    "indentationConsistent": true,
    "marginsRespected": true,
    "excessiveScratchOuts": false,
    "paragraphsPerPageEstimate": "string (e.g. '2 paragraphs per page' or 'Wall-to-wall single paragraph')",
    "observations": ["string (Any physical presentation warning or strength on these pages)"]
  }
}
`;

export const runAgent0VisionOcr = async ({
  text = '',
  imageArray = [],
  examQuestion = '',
  mode = 'digital',
  apiKey,
  preferredModel = 'auto',
  ledger = null
}) => {
  // Fast Path: Typed Digital Text -> Skip Agent 0 completely (0 Tokens)
  if (!imageArray || imageArray.length === 0 || mode === 'digital') {
    return {
      skipped: true,
      detectedTitle: examQuestion || '',
      fullTranscribedText: String(text || '').trim(),
      handwritingAudit: null
    };
  }

  // Split imageArray into parallel batches of 4 pages
  const batches = [];
  for (let i = 0; i < imageArray.length; i += BATCH_SIZE) {
    batches.push({
      batchIndex: Math.floor(i / BATCH_SIZE),
      startPage: i + 1,
      endPage: Math.min(i + BATCH_SIZE, imageArray.length),
      pages: imageArray.slice(i, i + BATCH_SIZE)
    });
  }

  // Execute all OCR batches concurrently via Promise.all
  const batchResults = await Promise.all(
    batches.map(async (b) => {
      const prompt = buildBatchOcrPrompt({
        batchIndex: b.batchIndex,
        startPage: b.startPage,
        endPage: b.endPage,
        totalPages: imageArray.length,
        userExamQuestion: examQuestion
      });

      const { result } = await callGenAiAgentWithFailover({
        apiKey,
        prompt,
        imageArray: b.pages,
        enableGoogleSearch: false,
        temperature: 0.1,
        maxOutputTokens: 6144,
        preferredModel,
        stageName: `Agent 0: Vision OCR (Pages ${b.startPage}-${b.endPage})`,
        ledger
      });

      return {
        batchIndex: b.batchIndex,
        detectedTitle: result?.detectedTitle || null,
        transcribedText: (result?.transcribedText || '').trim(),
        handwritingAudit: result?.handwritingAudit || null
      };
    })
  );

  // Sort strictly by batchIndex to guarantee exact sequential page stitching
  batchResults.sort((a, b) => a.batchIndex - b.batchIndex);

  const stitchedText = batchResults
    .map((r) => r.transcribedText)
    .filter(Boolean)
    .join('\n\n');

  const detectedTitle =
    batchResults.find((r) => r.detectedTitle)?.detectedTitle || examQuestion || '';

  // Aggregate physical handwriting observations across batches
  const observations = batchResults
    .flatMap((r) => r.handwritingAudit?.observations || [])
    .filter(Boolean);

  const indentationConsistent = batchResults.every(
    (r) => r.handwritingAudit?.indentationConsistent !== false
  );
  const marginsRespected = batchResults.every(
    (r) => r.handwritingAudit?.marginsRespected !== false
  );
  const excessiveScratchOuts = batchResults.some(
    (r) => r.handwritingAudit?.excessiveScratchOuts === true
  );

  return {
    skipped: false,
    detectedTitle,
    fullTranscribedText: stitchedText || String(text || '').trim(),
    handwritingAudit: {
      indentationConsistent,
      marginsRespected,
      excessiveScratchOuts,
      observations
    }
  };
};
