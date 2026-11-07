/**
 * Official FPSC Competitive Examination Benchmark Standards, Archetype Router & Domain Lenses
 * Dynamically calibrates evaluation rubrics, marks allocation, and examiner rules across all 45+ CSS subjects.
 */

export const FPSC_EXAMINER_CRITERIA = {
  essay: {
    id: 'essay',
    label: 'FPSC 100-Mark English Essay',
    passingScore: 40,
    totalScore: 100,
    targetIntroWords: 180,
    allowInlineHeadings: false,
    allowInlineDiagrams: false,
    breakdown: [
      {
        id: 'outline',
        name: 'Outline Structure & Hierarchy',
        maxMarks: 15,
        defaultFeedback: 'Assesses logical progression, parallel phrasing, and multi-dimensional coverage in the formal outline.'
      },
      {
        id: 'thesis',
        name: 'Thesis Statement & Central Stance',
        maxMarks: 10,
        defaultFeedback: 'Evaluates whether the thesis takes a clear, non-tautological analytical position.'
      },
      {
        id: 'introduction',
        name: 'Substantive Introduction & Hook (~180–250 Words)',
        maxMarks: 15,
        defaultFeedback: 'Checks opening hook, contextualization, and seamless culmination into the thesis statement.'
      },
      {
        id: 'critical_analysis',
        name: 'Argumentative Depth, Coherence & Empirical Evidence',
        maxMarks: 30,
        defaultFeedback: 'Audits topic sentences, global/national citations, structural transitions, and strict avoidance of body headings.'
      },
      {
        id: 'grammar_syntax',
        name: 'Academic Register, Diction & Grammar Audit',
        maxMarks: 20,
        defaultFeedback: 'Line-by-line audit of syntax, punctuation, tense consistency, and formal academic prose.'
      },
      {
        id: 'conclusion',
        name: 'Concluding Synthesis & Pragmatic Way Forward',
        maxMarks: 10,
        defaultFeedback: 'Evaluates whether the conclusion synthesizes core arguments without introducing new tangential topics.'
      }
    ],
    dealBreakers: [
      'Inserting headings, sub-headings, or diagrams inside the Essay prose body (strictly forbidden outside the Outline)',
      'Tautological thesis statement that merely repeats the prompt words',
      'Superficial assertions without empirical data, global indices, or scholarly references',
      'Grammatical blunders, subject-verb disagreement, or informal register in the opening pages'
    ]
  },

  precis: {
    id: 'precis',
    label: 'FPSC English Precis & Composition',
    passingScore: 33,
    totalScore: 100,
    targetIntroWords: 50,
    allowInlineHeadings: false,
    allowInlineDiagrams: false,
    breakdown: [
      {
        id: 'precis_rules',
        name: '1/3rd Length Ratio, Own Words & Indirect Speech',
        maxMarks: 30,
        defaultFeedback: 'Audits strict adherence to the 1/3rd word-count rule, third-person indirect voice, and zero verbatim copying.'
      },
      {
        id: 'comprehension',
        name: 'Core Thematic Fidelity & Conciseness',
        maxMarks: 25,
        defaultFeedback: 'Evaluates whether all essential arguments are retained while eliminating examples, idioms, and repetition.'
      },
      {
        id: 'title',
        name: 'Title Suitability & Precision',
        maxMarks: 10,
        defaultFeedback: 'Assesses whether the suggested title is concise (4–7 words) and captures the central theme.'
      },
      {
        id: 'grammar_syntax',
        name: 'Comprehensive English Grammar, Idioms & Syntax',
        maxMarks: 35,
        defaultFeedback: 'Line-by-line evaluation of sentence structure, punctuation, tense consistency, and idiomatic usage.'
      }
    ],
    dealBreakers: [
      'Copying sentences verbatim from the original passage',
      'Writing in first/second person instead of third-person indirect speech',
      'Exceeding or falling significantly short of the required 1/3rd word count',
      'Including personal opinions, external examples, or multiple paragraphs in a single precis'
    ]
  },

  subjective_20: {
    id: 'subjective_20',
    label: 'FPSC 20-Mark Subjective Question',
    passingScore: 8,
    totalScore: 20,
    targetIntroWords: 100,
    allowInlineHeadings: true,
    allowInlineDiagrams: true,
    breakdown: [
      {
        id: 'introduction',
        name: 'Substantive Introduction & Thesis (Min 100 Words)',
        maxMarks: 3,
        defaultFeedback: 'Evaluates whether the introduction frames the historical/conceptual scope and thesis in at least 100 words.'
      },
      {
        id: 'headings',
        name: 'Self-Explanatory & Analytical Headings',
        maxMarks: 3,
        defaultFeedback: 'Headings should be thesis-driven academic titles rather than generic single-word labels.'
      },
      {
        id: 'diagrams',
        name: 'Contextual Visual Diagrams, Maps & Flowcharts',
        maxMarks: 2,
        defaultFeedback: 'Examiners reward structured schematic diagrams, causal flowcharts, and comparative matrices.'
      },
      {
        id: 'critical_analysis',
        name: 'Structural Causality ("Why & How") & Analytical Depth',
        maxMarks: 6,
        defaultFeedback: 'Audits systemic root causes and institutional drivers ("Why & How") over elementary storytelling ("What").'
      },
      {
        id: 'citations_evidence',
        name: 'Scholarly Citations, Facts & Empirical Evidence',
        maxMarks: 3,
        defaultFeedback: 'Evaluates use of authoritative scholars, books, treaties, constitutional articles, or empirical statistics.'
      },
      {
        id: 'grammar_syntax',
        name: 'English Expression, Register & Conclusion',
        maxMarks: 3,
        defaultFeedback: 'Line-by-line grammar, spelling, academic register, and concluding synthesis.'
      }
    ],
    dealBreakers: [
      'Elementary chronological storytelling ("What happened") without structural causality ("Why & How")',
      'Factual, historical, date, treaty, or constitutional blunders',
      'Generic single-word guidebook headings devoid of analytical framing',
      'Absence of scholarly citations, theorists, or empirical evidence'
    ]
  },

  // Backward-compatible alias
  get islamic_history() {
    return this.subjective_20;
  }
};

/**
 * Domain-specific academic expectations injected into the AI agents based on the chosen FPSC subject.
 */
const SUBJECT_DOMAIN_LENSES = [
  {
    match: ['islamic history', 'history of pakistan', 'british history', 'european history', 'history of usa'],
    domainLabel: 'Historiography & Historical Causality',
    factFocus: 'historical dates, eras, dynasties, treaties, primary/secondary historians (e.g., Ibn Khaldun, Philip Hitti, Toynbee, Mubarak Ali, I.H. Qureshi, Palmer, Kennedy), and geographical trade/military routes',
    causalityFocus: 'systemic socio-economic, institutional, fiscal, and geopolitical drivers ("Why & How") rather than passive chronological narration of rulers and battles',
    examinerDirective: 'CSS Examiner Reports: Penalize severely for historical/treaty blunders and casual traditional stories devoid of historiographical citations.'
  },
  {
    match: ['international relations', 'political science'],
    domainLabel: 'IR Theory, Geopolitics & Political Philosophy',
    factFocus: 'treaties, UN resolutions, geopolitical alliances, theoretical paradigms (Realism, Neorealism, Liberal Institutionalism, Constructivism, Marxism), and scholars (Waltz, Mearsheimer, Keohane, Nye, Wendt, Hobbes, Locke, Montesquieu, Ibn Khaldun)',
    causalityFocus: 'structural balance-of-power shifts, security dilemmas, institutional norms, and national interest calculus rather than journalistic news summaries',
    examinerDirective: 'CSS Examiner Reports: Answers without theoretical frameworks (Realism/Liberalism/Constructivism) and scholarly citations are graded as ordinary newspaper columns.'
  },
  {
    match: ['pakistan affairs', 'current affairs'],
    domainLabel: 'Policy Analysis, Empirical Indicators & Strategic Studies',
    factFocus: 'Constitutional Articles (1973 Constitution), Pakistan Economic Survey figures, World Bank/IMF/UNDP reports, treaties, regional connectivity corridors (CPEC), and official policy frameworks',
    causalityFocus: 'structural governance bottlenecks, institutional capacity, macroeconomic fundamentals, and actionable multi-tiered policy recommendations',
    examinerDirective: 'CSS Examiner Reports: Avoid emotional rhetoric or baseless conspiracy theories; substantiate every claim with empirical statistics, constitutional articles, and pragmatic policy roadmaps.'
  },
  {
    match: ['islamic studies', 'comparative study of major religions'],
    domainLabel: 'Quranic Exegesis, Hadith & Contemporary Ijtihad',
    factFocus: 'accurate Quranic Surah/Ayah references, authentic Hadith citations, Seerah precedents (Charter of Madinah, Khutbah Hajjat-ul-Wida), classical jurists (Fuqaha), and contemporary Muslim scholars',
    causalityFocus: 'connecting eternal Islamic legal/moral principles (Maqasid al-Shariah) with modern socio-political, economic, and governance challenges',
    examinerDirective: 'CSS Examiner Reports: Avoid sectarian polemics or sermon-style preaching; maintain high academic objectivity backed by primary scriptural references and contemporary synthesis.'
  },
  {
    match: ['economics', 'accountancy', 'business administration', 'public administration', 'governance & public policies'],
    domainLabel: 'Economic Theory, Fiscal Policy & Institutional Governance',
    factFocus: 'economic models, macroeconomic indicators (GDP, CPI, fiscal deficit, current account), public administration paradigms (Weberian bureaucracy, New Public Management, Good Governance), and institutional case studies',
    causalityFocus: 'incentive structures, market failures, fiscal/monetary transmission mechanisms, and institutional accountability reforms',
    examinerDirective: 'CSS Examiner Reports: Use economic/administrative terminology, theoretical models, and graphical/schematic illustrations to explain policy trade-offs.'
  },
  {
    match: ['law', 'constitutional law', 'international law', 'muslim law', 'mercantile law', 'criminology'],
    domainLabel: 'Jurisprudence, Statutory Frameworks & Case Law',
    factFocus: 'statutory sections (PPC, CrPC, Qanun-e-Shahadat), landmark judicial precedents, ICJ cases, international conventions, and criminological theories (Strain, Differential Association, Labeling, Rational Choice)',
    causalityFocus: 'legal reasoning (ratio decidendi), statutory interpretation, systemic criminal justice bottlenecks, and institutional reform',
    examinerDirective: 'CSS Examiner Reports: Cite exact statutory articles, landmark cases, or criminological theorists rather than writing general moral commentary.'
  },
  {
    match: ['general science', 'environmental sciences', 'physics', 'chemistry', 'botany', 'zoology', 'geography', 'geology', 'agriculture'],
    domainLabel: 'Scientific Accuracy, Technical Mechanisms & Schematics',
    factFocus: 'scientific laws, biochemical/physical processes, environmental protocols (Paris Agreement, COP summits, IPCC metrics), geographical data, and quantitative accuracy',
    causalityFocus: 'mechanistic cause-and-effect chains, scientific principles, and structured labeled diagrams/flowcharts',
    examinerDirective: 'CSS Examiner Reports: Award maximum marks to crisp, point-wise technical explanations accompanied by clean labeled schematics and accurate data.'
  },
  {
    match: ['gender studies', 'sociology', 'anthropology', 'psychology', 'philosophy', 'journalism', 'town planning'],
    domainLabel: 'Social Science Theory & Empirical Case Studies',
    factFocus: 'foundational theorists (e.g., Durkheim, Weber, Foucault, Butler, Crenshaw, Freud, Piaget, Habermas), waves/schools of thought, statutory acts, and global gender/social indices (WEF Global Gender Gap Report)',
    causalityFocus: 'structural social institutions, intersectionality, cultural norms, and policy interventions backed by sociological frameworks',
    examinerDirective: 'CSS Examiner Reports: Ground arguments in established sociological/feminist/psychological theories and Pakistan-specific legislative/empirical realities.'
  }
];

/**
 * Resolves the complete evaluation profile (archetype, rubric breakdown, scoring scale, and domain lens)
 * for any selected FPSC CSS subject.
 *
 * @param {string} subjectName - Selected CSS subject name
 * @returns {Object} Complete subject evaluation profile
 */
export const resolveSubjectProfile = (subjectName = 'Islamic History & Culture') => {
  const normalized = (subjectName || '').toLowerCase().trim();

  // 1. Determine Archetype
  let archetype = FPSC_EXAMINER_CRITERIA.subjective_20;
  if (normalized.includes('essay')) {
    archetype = FPSC_EXAMINER_CRITERIA.essay;
  } else if (normalized.includes('precis') || normalized.includes('composition')) {
    archetype = FPSC_EXAMINER_CRITERIA.precis;
  }

  // 2. Determine Domain Lens
  let lens = SUBJECT_DOMAIN_LENSES.find(l =>
    l.match.some(keyword => normalized.includes(keyword))
  );

  if (!lens) {
    if (archetype.id === 'essay') {
      lens = {
        domainLabel: 'FPSC Interdisciplinary Essay Discourse',
        factFocus: 'global and national empirical statistics (UN, World Bank, IMF, Economic Survey of Pakistan), historical precedents, constitutional provisions, and authoritative books/thinkers',
        causalityFocus: 'multi-dimensional thesis-driven argumentation (political, economic, social, institutional, global) with smooth paragraph transitions and zero body headings',
        examinerDirective: 'CSS Essay Examiner Reports: An essay is a continuous, cohesive literary and analytical argument—never a collection of note-style headings or bullet points.'
      };
    } else if (archetype.id === 'precis') {
      lens = {
        domainLabel: 'FPSC English Precis & Composition Standards',
        factFocus: 'strict fidelity to the source passage claims without adding external facts or personal opinions, accurate idiomatic usage, and grammatical precision',
        causalityFocus: 'logical condensation to exactly one-third (1/3) of the original length in indirect third-person prose with a crisp title',
        examinerDirective: 'CSS Precis Examiner Reports: Penalize verbatim lifting of phrases, first-person pronouns, and failure to supply a concise thematic title.'
      };
    } else {
      lens = {
        domainLabel: 'FPSC Academic & Analytical Scholarship',
        factFocus: 'dates, scholars, authoritative texts, empirical statistics, and conceptual definitions relevant to ' + subjectName,
        causalityFocus: 'structural cause-and-effect reasoning ("Why & How") rather than descriptive textbook narration ("What")',
        examinerDirective: 'CSS Examiner Reports: Differentiate top allocations through critical analysis, self-explanatory headings, scholarly citations, and conceptual diagrams.'
      };
    }
  }

  return {
    subjectName,
    archetypeId: archetype.id,
    archetypeLabel: archetype.label,
    passingScore: archetype.passingScore,
    totalScore: archetype.totalScore,
    targetIntroWords: archetype.targetIntroWords,
    allowInlineHeadings: archetype.allowInlineHeadings,
    allowInlineDiagrams: archetype.allowInlineDiagrams,
    breakdown: archetype.breakdown,
    dealBreakers: archetype.dealBreakers,
    lens
  };
};
