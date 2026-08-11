/**
 * High-Quality Sample Evaluation Datasets for CSS Aspirants
 * Includes:
 * 1. Digital Text Essay Submission (Global Warming / Pakistan Economy)
 * 2. Handwritten Answer Sheet Submission (Islamic Studies / Pakistan Affairs)
 */

export const SAMPLE_EVALUATIONS = {
  digital_essay: {
    id: 'eval-essay-001',
    type: 'digital',
    subject: 'English Essay',
    topic: 'Global Warming: Causes, Consequences, and Policy Imperatives for Pakistan',
    candidateName: 'Ahmed Raza (CSS Aspirant)',
    date: '2026-08-04',
    wordCount: 2150,
    overallScore: 38,
    maxScore: 100,
    passStatus: false, // FPSC Cutoff is 40
    passProbability: '35% (High Risk of Failure in Essay)',
    
    scoreBreakdown: {
      outline: { score: 6, max: 15, feedback: 'Outline is overly general. Lacks specific economic and climate policy headings.' },
      thesis: { score: 4, max: 10, feedback: 'Thesis statement merely restates the prompt title without taking a clear stance.' },
      arguments: { score: 15, max: 40, feedback: 'Good general knowledge, but lacks empirical data (e.g. Germanwatch Global Climate Risk Index 2023).' },
      expression: { score: 8, max: 20, feedback: 'Frequent passive voice overuse. Several colloquialisms flagged in paragraphs 3 and 7.' },
      conclusion: { score: 5, max: 15, feedback: 'Conclusion is abrupt and fails to offer a clear multi-sectoral roadmap.' }
    },

    // Lines & Paragraphs with visual bounding highlights & teacher comments
    annotations: [
      {
        id: 'ann-1',
        paragraphIndex: 1,
        lineText: 'Global warming is a very big problem facing the entire world today and Pakistan is also facing it.',
        type: 'red',
        category: 'Weak Thesis / Low FPSC Register',
        comment: 'FPSC Warning: Informal register. Avoid words like "very big problem". Use academic phrasing e.g., "presents an existential socio-economic threat".',
        suggestion: 'Global warming poses an existential socio-economic and ecological threat to developing nations, with Pakistan ranking among the most vulnerable.'
      },
      {
        id: 'ann-2',
        paragraphIndex: 3,
        lineText: 'Pakistan lost many billions of dollars in floods recently.',
        type: 'amber',
        category: 'Missing Fact & Data Citation',
        comment: 'Fact Check Required: Unsubstantiated metric. Cite exact NDMA or World Bank Post-Disaster Needs Assessment (PDNA) figures ($30+ billion in 2022 floods).',
        suggestion: 'According to the World Bank 2022 Post-Disaster Needs Assessment (PDNA), Pakistan sustained over $30 billion in economic damages and loss.'
      },
      {
        id: 'ann-3',
        paragraphIndex: 5,
        lineText: 'Furthermore, the melting of northern glaciers threatens water security across the Indus River System.',
        type: 'green',
        category: 'Strong Argument & Transition',
        comment: 'Excellent transitional marker and logical focus on Indus Basin water security.',
        suggestion: null
      }
    ],

    // 3-Tier Level-Up Paragraph Rewrites
    rewrites: [
      {
        original: 'Global warming is a very big problem facing the entire world today and Pakistan is also facing it. It is caused by industrial pollution and cutting of trees.',
        basic: 'Global warming is a major problem facing the world today, and Pakistan is severely affected. It is caused by industrial emissions and deforestation.',
        cssStandard: 'Global warming represents one of the most pressing ecological challenges of the twenty-first century, severely impacting vulnerable agrarian economies like Pakistan through unmitigated industrial emissions and rapid deforestation.',
        highScorer: 'As a non-traditional security threat, global warming has transcended environmental bounds to become a critical determinant of Pakistan’s economic resilience. Accelerating industrial carbon footprints coupled with relentless deforestation continue to exacerbate ecological fragility across the Indus Basin.'
      }
    ],

    // Fact Check Log
    factCheck: [
      {
        claim: 'Pakistan contributes 5% of global greenhouse emissions.',
        verified: false,
        correctedFact: 'Pakistan actually contributes less than 0.9% of global greenhouse gas (GHG) emissions, yet ranks among the top 10 most climate-vulnerable nations.',
        source: 'UNFCCC & Ministry of Climate Change Pakistan'
      },
      {
        claim: 'The National Climate Change Policy was formulated in 2012 and updated in 2021.',
        verified: true,
        correctedFact: null,
        source: 'Government of Pakistan Climate Policy Archive'
      }
    ]
  },

  handwritten_paper: {
    id: 'eval-paper-002',
    type: 'handwritten',
    subject: 'Islamic Studies / Pakistan Affairs',
    topic: 'Governance System under Hazrat Umar (R.A) and its Relevance to Modern Public Administration',
    candidateName: 'Zainab Fatima (CSS Aspirant)',
    date: '2026-08-04',
    overallScore: 54,
    maxScore: 100,
    passStatus: true,
    passProbability: '78% (Good Candidate for Top 50 Allocation)',
    imageUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80',
    
    scoreBreakdown: {
      outline: { score: 12, max: 15, feedback: 'Strong structural outline with distinct headings for Majlis-e-Shoora and Bait-ul-Mal.' },
      thesis: { score: 8, max: 10, feedback: 'Clear thesis connecting classical governance principles with modern public administration.' },
      arguments: { score: 22, max: 40, feedback: 'Solid Quranic references provided. Needs more modern Pakistani administration comparisons.' },
      expression: { score: 12, max: 20, feedback: 'Clean handwriting, legible margins. Few grammatical agreement errors in long sentences.' },
      conclusion: { score: 0, max: 15, feedback: 'Incomplete answer script. Stopped before writing the concluding policy synthesis.' }
    },

    pins: [
      { id: 'pin-1', x: 28, y: 35, type: 'red', text: 'Spelling error in Arabic transliteration. Correct: "Majlis-e-Shoora" (Consultative Assembly).' },
      { id: 'pin-2', x: 62, y: 55, type: 'green', text: 'Outstanding reference to accountability of Governors (Walis) under Hazrat Umar (R.A).' },
      { id: 'pin-3', x: 45, y: 82, type: 'amber', text: 'Margin violation: Answer text bleeds into the left binding margin.' }
    ]
  }
};
