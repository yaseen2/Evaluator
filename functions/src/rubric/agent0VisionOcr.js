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
import { normalizeOutlineLineBreaks } from './deterministicPreprocessor.js';

const BATCH_SIZE = 4;

const buildBatchOcrPrompt = ({ batchIndex, startPage, endPage, totalPages, userExamQuestion }) => `
You are Agent 0: Verbatim Handwritten Paper Digitizer & Layout Auditor.
You are transcribing Pages ${startPage} to ${endPage} (out of ${totalPages} total pages).
${userExamQuestion ? `Student's Selected Topic: "${userExamQuestion}"` : ''}

CRITICAL VERBATIM TRANSCRIPTION RULES:
1. Transcribe the handwritten text 100% VERBATIM in exact sequential page order.
2. NEVER auto-correct spelling mistakes, grammatical errors, missing articles ("a"/"the"), wrong prepositions, or punctuation errors—preserve every mistake exactly as written on the paper.
3. OUTLINE & PARAGRAPH NEWLINE PRESERVATION (STRICT — READ CAREFULLY):
   - Every single Outline title, heading, numbered item, lettered sub-heading, or bullet MUST start on its OWN SEPARATE LINE (\\n), indented proportionally just like on the handwritten page.
   - NEVER join outline points on the same line with spaces or semicolons if they appeared on separate lines on the page!
   - Example of how your "transcribedText" MUST format an outline:
Outline:
A. Introduction
   a. First point
   b. Thesis statement: ...
B. Main Heading
   1. Sub-heading
      a. Supporting detail
   2. Second sub-heading
C. Conclusion

   - Separate normal essay body paragraphs using double newlines (\\n\\n).
4. If the student crossed out a phrase, omit the crossed-out words from the main text.
5. Audit ONLY these 4 objective page-layout facts on these pages: paragraph indentation consistency, left/right margin discipline, excessive scratch-outs, and whether the Essay body prose starts on the same page where the Outline ends (do NOT attempt to judge handwriting beauty, neatness, or font size).

Return ONLY this JSON object:
{
  "detectedTitle": "string or null (Essay title/topic if written on these pages, else null)",
  "transcribedText": "string (Full verbatim transcription of pages ${startPage}–${endPage} with each Outline point on its own newline \\n and body paragraphs separated by \\n\\n)",
  "handwritingAudit": {
    "indentationConsistent": true,
    "marginsRespected": true,
    "excessiveScratchOuts": false,
    "samePageOutlineBodyStart": false
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
        maxOutputTokens: 16384,
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

  const stitchedText = normalizeOutlineLineBreaks(
    batchResults
      .map((r) => r.transcribedText)
      .filter(Boolean)
      .join('\n\n')
  );

  const detectedTitle =
    batchResults.find((r) => r.detectedTitle)?.detectedTitle || examQuestion || '';

  // Aggregate objective physical page layout checks across batches
  const indentationConsistent = batchResults.every(
    (r) => r.handwritingAudit?.indentationConsistent !== false
  );
  const marginsRespected = batchResults.every(
    (r) => r.handwritingAudit?.marginsRespected !== false
  );
  const excessiveScratchOuts = batchResults.some(
    (r) => r.handwritingAudit?.excessiveScratchOuts === true
  );
  const samePageOutlineBodyStart = batchResults.some(
    (r) => r.handwritingAudit?.samePageOutlineBodyStart === true
  );

  return {
    skipped: false,
    detectedTitle,
    fullTranscribedText: stitchedText || String(text || '').trim(),
    handwritingAudit: {
      indentationConsistent,
      marginsRespected,
      excessiveScratchOuts,
      samePageOutlineBodyStart
    }
  };
};

