/**
 * Plain-English Text Sanitizer
 * Strictly removes pedantic academic jargon, "FPSC", "CSS", "PMS", "examiner", etc.
 * Keeps feedback clear, direct, and simple (QuillBot style).
 */
export const cleanSimpleText = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\b(fpsc|css|pms|upsc)\s*(examiner|commission|board|report|guideline|rubric)?\b/gi, '')
    .replace(/\bthe examiner\b/gi, 'this')
    .replace(/\bexaminer(?:'s)?\b/gi, 'reader')
    .replace(/\bpenaliz(?:ed|es|ing)\b/gi, 'flagged')
    .replace(/\bpenalty\b/gi, 'issue')
    .replace(/\bdeduction(?:s)?\b/gi, 'improvement')
    .replace(/\bmarking rubric\b/gi, 'writing guidelines')
    .replace(/\bcolloquialism\b/gi, 'informal phrasing')
    .replace(/\bdiction\b/gi, 'word choice')
    .replace(/\bsyntax\b/gi, 'sentence structure')
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

