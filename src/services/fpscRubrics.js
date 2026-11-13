/**
 * Official FPSC Competitive Examination Benchmark Standards, Archetype Router & Domain Lenses
 * Dynamically calibrates evaluation rubrics, qualitative/quantitative assessment, and examiner rules across all CSS subjects.
 */

export const FPSC_EXAMINER_CRITERIA = {
  essay: {
    id: 'essay',
    label: 'FPSC CSS English Essay Diagnostic (v3)',
    scored: false,
    passingScore: 40,
    totalScore: 100,
    targetIntroWords: 200,
    allowInlineHeadings: false,
    allowInlineDiagrams: false,
    breakdown: [
      {
        id: 'topic_relevance',
        name: '1. Topic Decoding & 80:20 Scope',
        maxMarks: 10,
        defaultFeedback: 'Evaluates genre classification, 80:20 relevance ratio, Global vs. Pakistan geographic bounds, and scope-drift prevention.'
      },
      {
        id: 'thesis',
        name: '2. Thesis Stance & Architecture',
        maxMarks: 10,
        defaultFeedback: 'Audits whether the thesis takes a clear debatable, causal, or relational stance inside the Introduction.'
      },
      {
        id: 'outline',
        name: '3. Outline Parallelism & 1:1 Sync',
        maxMarks: 10,
        defaultFeedback: 'Checks grammatical parallelism, mutually exclusive sub-points (no Conclusion sub-points), and 1:1 Outline-to-Body sync.'
      },
      {
        id: 'introduction',
        name: '4. Introduction Funnel & Hook',
        maxMarks: 10,
        defaultFeedback: 'Evaluates opening hook, contextual funnel, single-paragraph unity (~180–250 words), and absence of raw statistical dumps.'
      },
      {
        id: 'body_paragraphs',
        name: '5. Paragraph Unity & Causal Chain',
        maxMarks: 10,
        defaultFeedback: 'Audits Topic Sentences, 1-Paragraph-1-Argument unity, Mode-Lock adherence, and absence of grafted middle sentences.'
      },
      {
        id: 'evidences',
        name: '6. Evidence Quality & Integration',
        maxMarks: 10,
        defaultFeedback: 'Evaluates Gondal’s 54-type open evidence spectrum, live 2026 factual grounding, and analytical integration.'
      },
      {
        id: 'coherence',
        name: '7. Transitions, Role Map & Pacing',
        maxMarks: 10,
        defaultFeedback: 'Checks role-filtered 1st-half vs. 2nd-half body pacing decay, valid transition bridge placement, and organic forward hooks.'
      },
      {
        id: 'analytical_depth',
        name: '8. Analytical Depth & Counter-Arg',
        maxMarks: 10,
        defaultFeedback: 'Audits multi-level causal depth, fallacy avoidance, and Counter-Argument rebuttal (when requiresCounterArgument is true).'
      },
      {
        id: 'expression',
        name: '9. Academic Register & Diction',
        maxMarks: 10,
        defaultFeedback: 'Evaluates impartial critic tone, modal variety, conceptual precision pairs, and Spotlight Zone polish.'
      },
      {
        id: 'grammar_syntax',
        name: '10. British Syntax & Pinglish Check',
        maxMarks: 10,
        defaultFeedback: 'Audits formal British English syntax, clause punctuation, acronym expansion, and Pakistani Urdu-to-English (Pinglish) interference.'
      },
      {
        id: 'conclusion',
        name: '11. Conclusion & Synthesis',
        maxMarks: 10,
        defaultFeedback: 'Checks fulfilled-tense thesis restatement (60% non-overlap with Intro), holistic synthesis without new data, and measured close.'
      }
    ],
    dealBreakers: [
      'Theme-Dumping / 80:20 Breach: Dedicating less than 75% of the essay to the core dimensions demanded by the prompt',
      'Grafted / Franken-Paragraphs: Bolting pre-memorized paragraphs from another topic onto a forced first/last sentence',
      '1:1 Outline-to-Body Desynchronization: Listing points in the Outline that are skipped in the Essay prose body',
      'CSS Structural Taboos: Inserting inline headings, bullet points, tables, or flowcharts inside the Essay prose body',
      'Mode-Lock Failure: Spending "Way Forward" paragraphs re-narrating the problem instead of explaining the solution mechanism'
    ]
  },

  essay_outline: {
    id: 'essay_outline',
    label: 'FPSC Essay Outline & Thesis Blueprint Audit (v3)',
    scored: false,
    passingScore: 40,
    totalScore: 100,
    targetIntroWords: 40,
    allowInlineHeadings: true,
    allowInlineDiagrams: false,
    breakdown: [
      {
        id: 'topic_decoding',
        name: '1. Prompt Decoding & Dimensional Scope',
        maxMarks: 20,
        defaultFeedback: 'Checks whether your outline addresses exact prompt variables, dual/metaphor rules, and 80:20 Global vs. Pakistan scope.'
      },
      {
        id: 'thesis',
        name: '2. Thesis Statement Debatability & Signposting',
        maxMarks: 20,
        defaultFeedback: 'Evaluates whether your thesis statement takes a clear, arguable position and previews the essay roadmap.'
      },
      {
        id: 'outline_structure',
        name: '3. Logical Funneling & Conclusion Hygiene',
        maxMarks: 20,
        defaultFeedback: 'Audits section flow (11–20 total points sweet spot), non-overlapping pillars, and ensuring Conclusion has NO sub-points.'
      },
      {
        id: 'parallelism',
        name: '4. Grammatical Parallelism & Phrasing',
        maxMarks: 20,
        defaultFeedback: 'Accepts consistent noun phrases OR consistent full declarative sentences; flags mixed/broken phrasing and fake question-mark headers.'
      },
      {
        id: 'coverage_originality',
        name: '5. Multi-Dimensional Depth & Case-Study Signals',
        maxMarks: 20,
        defaultFeedback: 'Evaluates diversity of analytical lenses (political, economic, institutional, social, global) and concrete example cues.'
      }
    ],
    dealBreakers: [
      'Single-word generic headers (e.g., "Economy", "Politics") instead of self-explanatory analytical phrases',
      'Mixing incompatible formats randomly across sibling outline points (e.g., fragments, fake "?" questions, and declarative clauses)',
      'Writing full paragraph-length prose blocks inside the Outline instead of focused outline points',
      'Omitting a clear Thesis Statement, adding sub-points under Conclusion, or AND-coupling unrelated ideas'
    ]
  },

  precis: {
    id: 'precis',
    label: 'FPSC English Precis & Composition',
    scored: true,
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
    scored: true,
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
 * Resolves the complete evaluation profile (archetype, rubric breakdown, scoring mode, and domain lens)
 * for any selected FPSC CSS subject and optional essay mode ('full' | 'outline_only').
 *
 * @param {string} subjectName - Selected CSS subject name
 * @param {Object} [options] - Optional settings such as { essayMode: 'full' | 'outline_only', archetypeId }
 * @returns {Object} Complete subject evaluation profile
 */
export const resolveSubjectProfile = (subjectName = 'Islamic History & Culture', options = {}) => {
  const normalized = (subjectName || '').toLowerCase().trim();
  const essayMode = options?.essayMode || (options?.archetypeId === 'essay_outline' ? 'outline_only' : 'full');

  // 1. Determine Archetype
  let archetype = FPSC_EXAMINER_CRITERIA.subjective_20;
  if (normalized.includes('essay')) {
    archetype = essayMode === 'outline_only' ? FPSC_EXAMINER_CRITERIA.essay_outline : FPSC_EXAMINER_CRITERIA.essay;
  } else if (normalized.includes('precis') || normalized.includes('composition')) {
    archetype = FPSC_EXAMINER_CRITERIA.precis;
  }

  // 2. Determine Domain Lens
  let lens = SUBJECT_DOMAIN_LENSES.find((l) =>
    l.match.some((keyword) => normalized.includes(keyword))
  );

  if (!lens) {
    if (archetype.id === 'essay' || archetype.id === 'essay_outline') {
      lens = {
        domainLabel: 'FPSC English Essay & Argumentation Mentor',
        factFocus: 'credible empirical evidence (UN, World Bank, IMF, Economic Survey of Pakistan), historical/global case studies, constitutional principles, and relevant thinkers',
        causalityFocus: 'balanced, thesis-driven argumentation (political, economic, social, institutional, global) with parallel outline headers, strong topic sentences, and natural, clear English prose',
        examinerDirective: 'FPSC Essay Examiner Standard: Be constructive and balanced—reward clear, natural, grammatically sound English and coherent structure over artificial dictionary bombast.'
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
    essayMode,
    scored: archetype.scored !== false,
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
