/**
 * Plain-English Text Sanitizer (v3)
 * Preserves authentic CSS / FPSC analytical terminology ("CSS", "FPSC", "examiner",
 * "rubric", "syntax", "diction", "colloquialism") so mentor diagnostics remain complete
 * while tidying residual markdown artifacts and stray whitespace.
 */
export const cleanSimpleText = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\*\*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

export const getSimpleHeadline = (ann) => {
  if (!ann) return 'Suggestion';
  const comment = (ann.comment || '').toLowerCase();
  const cat = (ann.category || '').toLowerCase();

  if (ann.type === 'red') {
    if (comment.includes('punct') || comment.includes('comma') || comment.includes('question mark') || comment.includes('period')) {
      return 'Fix punctuation';
    }
    if (comment.includes('spell') || cat.includes('spell')) {
      return 'Correct spelling';
    }
    if (comment.includes('tense') || comment.includes('verb') || comment.includes('plural') || comment.includes('agreement')) {
      return 'Fix grammar';
    }
    return 'Fix error';
  }

  if (ann.type === 'amber') {
    if (comment.includes('informal') || comment.includes('word') || comment.includes('vocabulary') || cat.includes('diction')) {
      return 'Improve word choice';
    }
    if (comment.includes('clear') || comment.includes('flow') || comment.includes('structure')) {
      return 'Clarify wording';
    }
    return 'Improve sentence';
  }

  if (ann.type === 'green') {
    return 'Well phrased';
  }

  return 'Suggestion';
};

