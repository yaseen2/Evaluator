/**
 * Plain-English Text Sanitizer & Coordinate Humanizer (v3.3)
 * Converts internal agent coordinate tokens (O15, P2, P1.S5), stiff third-person
 * examiner phrasing ("the candidate"), and technical category labels into simple,
 * student-friendly everyday English.
 */
export const formatLocationLabel = (locationId = '') => {
  const raw = String(locationId || '')
    .replace(/^\[+|\]+$/g, '')
    .trim();
  if (!raw) return '';

  const exactO = raw.match(/^O(\d+)$/i);
  if (exactO) return `Outline Point ${exactO[1]}`;

  const exactPS = raw.match(/^P(\d+)\.S(\d+)$/i);
  if (exactPS) return `Paragraph ${exactPS[1]}, Sentence ${exactPS[2]}`;

  const exactP = raw.match(/^P(\d+)$/i);
  if (exactP) {
    return exactP[1] === '1' ? 'Paragraph 1 (Introduction)' : `Paragraph ${exactP[1]}`;
  }

  return raw
    .replace(/\bP(\d+)\.S(\d+)\b/gi, 'Paragraph $1, Sentence $2')
    .replace(/\bO(\d+)\b/gi, 'Outline Point $1')
    .replace(/\bP(\d+)\b/gi, 'Paragraph $1');
};

export const formatRoleLabel = (role = '') => {
  const key = String(role || '').trim().toUpperCase();
  const map = {
    INTRO: 'Introduction',
    CONTEXT_OVERVIEW: 'Background Overview',
    BODY_MAIN: 'Main Body Paragraph',
    TRANSITION_BRIDGE: 'Transition Paragraph',
    COUNTER_ARGUMENT: 'Counter-Argument',
    CONCLUSION: 'Conclusion'
  };
  return map[key] || String(role || '').replace(/_/g, ' ');
};

export const simplifyCategoryTitle = (category = '', ann = null) => {
  const raw = String(category || '').trim();
  const upper = raw.toUpperCase();

  if (!raw) return getSimpleHeadline(ann);

  if (upper.includes('ARTICLE OMISSION') || upper.includes('MISSING ARTICLE')) {
    return "Missing 'A', 'An', or 'The'";
  }
  if (upper.includes('INTRO FUNNEL')) {
    return 'Weak Introduction Flow';
  }
  if (upper.includes('THESIS ARCHITECTURE') || upper.includes('WEAK THESIS')) {
    return 'Weak Thesis Statement';
  }
  if (upper.includes('PREMATURE TERMINATION') || upper.includes('MISSING SUBSTANTIVE BODY')) {
    return 'Incomplete Essay';
  }
  if (
    ann?.isDiscrepantEvidence === true ||
    upper.includes('FACT') ||
    upper.includes('OUTDATED') ||
    upper.includes('2026') ||
    upper.includes('CITATION') ||
    upper.includes('STATISTIC') ||
    upper.includes('DISCREPANCY')
  ) {
    return 'Incorrect Fact / Reference';
  }
  if (upper.includes('EARNED') || upper.includes('SIGNIFIER') || ann?.type === 'green') {
    return upper === 'GOOD POINT' || upper === 'STRONG POINT' ? raw : 'Good Point';
  }
  if (upper.includes('SUBJECT-VERB') || upper.includes('AGREEMENT') || upper.includes('TENSE')) {
    return 'Grammar Mistake';
  }
  if (upper.includes('PINGLISH') || upper.includes('PREPOSITION')) {
    return 'Wrong Word Choice';
  }
  if (upper.includes('SYNTAX') && !upper.includes('GRAMMAR MISTAKE')) {
    return 'Grammar Mistake';
  }

  return raw
    .replace(/\bFPSC\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

export const isDiscrepantEvidenceAnnotation = (ann) => {
  if (!ann) return false;
  if (ann.isDiscrepantEvidence === true) return true;
  if (ann.type !== 'red' && ann.type !== 'amber') return false;

  const haystack = `${ann.category || ''} ${ann.comment || ''}`.toLowerCase();
  return /(incorrect fact|outdated|discrepancy|unverified quote|unverified citation|wrong number|wrong stat|wrong date|census|imf|gdp|citation|fact check|false claim|inaccurate data|evidence discrepancy)/.test(
    haystack
  );
};

export const cleanSimpleText = (text) => {
  if (!text || typeof text !== 'string') return '';

  const replaceWithCase = (str, regex, lowerRep, upperRep) =>
    str.replace(regex, (match, offset, full) => {
      const prev = full.slice(Math.max(0, offset - 3), offset);
      const isSentenceStart = offset === 0 || /[.!?]\s*$/.test(prev);
      return isSentenceStart ? upperRep : lowerRep;
    });

  let out = text
    .replace(/\*\*/g, '')
    .replace(/\[Spotlight Zone(?:\s*[—–-]\s*2x Examiner Visibility)?\]\s*/gi, '')
    .replace(
      /\bSentences?\s+\[?P(\d+)\.S(\d+)\]?\s+(?:through|to|-|–)\s+\[?P\1\.S(\d+)\]?\b/gi,
      'Sentences $2 to $3 of Paragraph $1'
    )
    .replace(/\b\[?P1\.S(\d+)\]?\b/g, 'Sentence $1 of the Introduction (Paragraph 1)')
    .replace(/\b\[?P(\d+)\.S(\d+)\]?\b/g, 'Paragraph $1 (Sentence $2)')
    .replace(/\b(?:paragraph|para)\s+\[?P1\]?\b/gi, 'Paragraph 1 (Introduction)')
    .replace(/\b(?:paragraph|para)\s+\[?P(\d+)\]?\b/gi, 'Paragraph $1')
    .replace(/\b(?:outline\s*point|point|item)\s+\[?O(\d+)\]?\b/gi, 'Outline Point $1')
    .replace(/(^|[\s([,"'])(\[?P1\]?)(?=$|[\s.,;:)\]'"!?])/g, '$1Paragraph 1 (Introduction)')
    .replace(/(^|[\s([,"'])\[?P(\d+)\]?(?=$|[\s.,;:)\]'"!?])/g, '$1Paragraph $2')
    .replace(/(^|[\s([,"'])\[?O(\d+)\]?(?=$|[\s.,;:)\]'"!?])/g, '$1Outline Point $2');

  out = replaceWithCase(out, /\bthe candidate's\b/gi, 'your', 'Your');
  out = replaceWithCase(out, /\bthe candidate\b/gi, 'you', 'You');
  out = replaceWithCase(out, /\bthis candidate\b/gi, 'you', 'You');
  out = replaceWithCase(out, /\bthe written script\b/gi, 'your essay', 'Your essay');
  out = replaceWithCase(out, /\bcandidates\b/gi, 'students', 'Students');

  return out.replace(/\s{2,}/g, ' ').trim();
};

export const getSimpleHeadline = (ann) => {
  if (!ann) return 'Tip';
  const comment = (ann.comment || '').toLowerCase();
  const cat = (ann.category || '').toLowerCase();

  if (ann.type === 'red') {
    if (comment.includes('punct') || comment.includes('comma') || comment.includes('question mark') || comment.includes('period')) {
      return 'Punctuation Mistake';
    }
    if (comment.includes('spell') || cat.includes('spell')) {
      return 'Spelling Mistake';
    }
    if (comment.includes('tense') || comment.includes('verb') || comment.includes('plural') || comment.includes('agreement') || comment.includes('article')) {
      return 'Grammar Mistake';
    }
    return 'Mistake';
  }

  if (ann.type === 'amber') {
    if (comment.includes('informal') || comment.includes('word') || comment.includes('vocabulary') || cat.includes('diction')) {
      return 'Better Word';
    }
    if (comment.includes('clear') || comment.includes('flow') || comment.includes('structure')) {
      return 'Clearer Wording';
    }
    return 'Improvement Tip';
  }

  if (ann.type === 'green') {
    return 'Good Point';
  }

  return 'Tip';
};

