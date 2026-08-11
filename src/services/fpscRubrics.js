/**
 * Official FPSC Competitive Examination Benchmark Standards & Rubrics
 * Internal AI Calibration Guidelines (Clean & Dynamic UI Only)
 */

export const FPSC_EXAMINER_CRITERIA = {
  essay: {
    passingScore: 40,
    totalScore: 100,
    breakdown: [
      { id: 'outline', name: 'Outline & Hierarchy' },
      { id: 'thesis', name: 'Thesis Statement & Focus' },
      { id: 'arguments', name: 'Analytical Arguments & Depth' },
      { id: 'expression', name: 'English Expression & Register' },
      { id: 'conclusion', name: 'Policy Synthesis & Conclusion' }
    ],
    commonFailReasons: [
      'Superficial arguments without empirical data or citations',
      'Off-topic outline or failing to address all dimensions of prompt',
      'Tautological thesis statements repeating the prompt title',
      'Informal register, colloquialisms, and passive voice overuse'
    ]
  },

  islamic_history: {
    passingScore: 40,
    totalScore: 100,
    breakdown: [
      { id: 'introduction', name: 'Substantive Introduction (Min 100 Words Target)' },
      { id: 'headings', name: 'Self-Explanatory & Descriptive Headings' },
      { id: 'diagrams', name: 'Visual Diagrams & Schematics' },
      { id: 'critical_analysis', name: 'Critical Analytical Depth vs Pure Storytelling' },
      { id: 'grammar_syntax', name: 'Comprehensive English Grammar Audit' }
    ],
    mandatoryGrammarRule: 'Comprehensive English grammar checking of the whole text (spelling, syntax, tense consistency, punctuation, and academic register).',
    dealBreakers: [
      'Factual & Historical Blunders',
      'Sectarian Bias or Polemics'
    ]
  },

  precis: {
    passingScore: 33,
    totalScore: 100,
    breakdown: [
      { id: 'precis_rules', name: 'Precis Ratio & Rule of 1/3' },
      { id: 'comprehension', name: 'Comprehension & Key Points' },
      { id: 'title', name: 'Title Relevance' },
      { id: 'grammar', name: 'Correction & Idioms' }
    ]
  }
};
