/**
 * FPSC CSS English Essay Living Modular Rubric Configuration (v2.1)
 *
 * Strictly Server-Side IP — Never import or bundle into client-side src/.
 *
 * Core Principles:
 * 1. Zero Redundant "Accept" Instructions: Do not instruct the LLM to accept valid English variations
 *    it already accepts by default. Only state explicit Guardrail Exceptions where a strict rule could
 *    otherwise misfire.
 * 2. Non-Scored 4-Tier Diagnostic Verdicts:
 *    - TIER_1_FATAL (🔴 Fatal Deal-Breaker)
 *    - TIER_2_MAJOR (🟠 Structural / Analytical Risk)
 *    - TIER_3_POLISH (🔵 Polish & Topper Upgrade)
 *    - EARNED_SIGNIFIER (🟢 Earned Topper Signifier)
 * 3. Gondal's Open Evidence Philosophy + 1 Paragraph = 1 Central Argument.
 */

export const ESSAY_GENRE_PLAYBOOKS = {
  DESCRIPTIVE_ISSUE: {
    id: 'DESCRIPTIVE_ISSUE',
    label: 'Descriptive / Issue-Based Essay',
    examples: [
      'Global Warming: Causes and Consequences',
      'Pathways to Pakistan’s Prosperity',
      'Energy Crisis in Pakistan: Challenges and Prospects'
    ],
    outlineRatioRule:
      'Maintain the 80:20 Rule: At least 75–80% of major sections and sub-points must directly address the core headers explicitly demanded in the prompt. Maximum 1 short contextual/overview heading and 1 pragmatic Way Forward section.',
    thesisRequirement:
      'Two-Dimensional Thesis Statement covering both the primary problem/causes and the pragmatic trajectory/remedies.',
    counterArgumentDefault: false,
    evidenceExpectation:
      'Any verifiable proof that substantiates the claim (empirical data, institutional reports, historical precedents, constitutional/legal provisions, regional/global case studies, structural mechanisms).'
  },

  ARGUMENTATIVE_DEBATE: {
    id: 'ARGUMENTATIVE_DEBATE',
    label: 'Argumentative / Controversial Debate Essay',
    examples: [
      'Has Democracy Failed to Deliver in Pakistan?',
      'Not Economy, but Politics is the Key to Success',
      'Universal Human Equality is a Utopian Myth'
    ],
    outlineRatioRule:
      'Take a clear, unambiguous stance (or nuanced split-stance on binary superiority prompts without 50/50 fence-sitting). Dedicate 70–80% of body arguments to proving the chosen stance. If requiresCounterArgument is true, include a dedicated Counter-Argument & Rebuttal section (1–2 paragraphs) before the Conclusion. Do NOT append a bureaucratic "Way Forward / Policy Recommendations" section to a philosophical/debate prompt unless the prompt asks for policy solutions.',
    thesisRequirement:
      'Debatable, persuasive thesis taking a clear position while acknowledging complexity.',
    counterArgumentDefault: true,
    evidenceExpectation:
      'Historical precedents, comparative political/economic models, empirical evidence, scholarly frameworks, and logical refutation.'
  },

  RELATIONAL_TWO_CONCEPT: {
    id: 'RELATIONAL_TWO_CONCEPT',
    label: 'Relational / Two-Concept ("A and B") Essay',
    examples: [
      'Human Development and Economic Sustainability',
      'Literature and Society',
      'Artificial Intelligence and the Future of Diplomacy'
    ],
    outlineRatioRule:
      'Every major section and body paragraph Topic Sentence MUST explicitly connect BOTH Variable A and Variable B (showing how A shapes B, how B reinforces A, or what happens when the nexus breaks). Never write the first half solely on Variable A and the second half solely on Variable B.',
    thesisRequirement:
      'Relational Thesis establishing the reciprocal, causal, or dialectical relationship between Concept A and Concept B.',
    counterArgumentDefault: false,
    evidenceExpectation:
      'Comparative case studies, cross-disciplinary examples, empirical correlations, and historical syntheses linking both variables.'
  },

  ABSTRACT_PHILOSOPHICAL: {
    id: 'ABSTRACT_PHILOSOPHICAL',
    label: 'Abstract / Literary / Philosophical / Proverb Essay',
    examples: [
      'Hope: The Greatest Driving Force',
      'Instruction in Youth is Like Engraving in Stone',
      'Great Nations Win Without Fighting a War',
      'A Friend Walks In When Everyone Else Walks Out'
    ],
    outlineRatioRule:
      'DO NOT force a bureaucratic policy template (Causes → Consequences → Government Way Forward). Welcome thematic, temporal (Past → Present → Future), or levels-of-analysis (Individual → Societal → National → Civilizational/Global) frameworks. Check that personal-sounding proverbs are elevated to macro-historical, societal, statecraft, and civilizational planes rather than restricted to domestic stories.',
    thesisRequirement:
      'Philosophical, interpretive thesis unpacking the metaphor/maxim and establishing its universal trajectory across human, societal, and historical dimensions.',
    counterArgumentDefault: false,
    evidenceExpectation:
      'DO NOT demand Economic Survey GDP percentages or bureaucratic reports. Welcome historical movements, philosophical treatises, literary archetypes, psychological phenomena, civilizational case studies, and deductive reasoning.'
  }
};

export const PARAGRAPH_ROLES = {
  INTRO: 'INTRO',
  CONTEXT_OVERVIEW: 'CONTEXT_OVERVIEW',
  BODY_MAIN: 'BODY_MAIN',
  TRANSITION_BRIDGE: 'TRANSITION_BRIDGE',
  COUNTER_ARGUMENT: 'COUNTER_ARGUMENT',
  CONCLUSION: 'CONCLUSION'
};

export const GUARDRAIL_EXCEPTIONS = [
  'TRANSITION_BRIDGE Guardrail: A 1-to-3 sentence transitional bridge paragraph connecting two major sections of the essay (e.g., shifting from Causes to Consequences or Remedies) is a valid structural device. NEVER penalize a TRANSITION_BRIDGE paragraph for being under 100 words or lacking empirical evidence.',
  'CONTEXT_OVERVIEW Guardrail: A secondary contextual heading in the Outline (e.g., "2. Contextualizing the Crisis in Pakistan") may legitimately map to a single overview paragraph without 1.1/1.2 sub-points. Do not flag it as a missing sub-point error.',
  'Forward Transition Hook Guardrail: If the final clause or sentence of a BODY_MAIN paragraph briefly previews the theme of the next paragraph (Mentor 4 Forward Hook), do NOT flag it as a Paragraph Unity violation.',
  'Multiple Complementary Evidences Guardrail: Under "1 Paragraph = 1 Central Argument", a student may cite 1 or multiple complementary pieces of evidence inside a single paragraph as long as they all substantiate that same single central argument.',
  'Consensus Prompt Guardrail: When requiresCounterArgument === false (e.g., universal truths, moral axioms, or consensus prompts like "Democracy and illiteracy cannot move together"), NEVER penalize the student for omitting a Counter-Argument/Rebuttal section.',
  'Valid English Collocation Guardrail: Phrases like "commit a mistake" or "commit an error" are 100% standard formal English—never flag them as Pinglish. Similarly, calling an issue "important", "key", "big", or "huge" is grammatically valid standard English and must only be suggested as 🔵 Tier 3 Expression Polish, never a Tier 1/2 error.'
];

export const PINGLISH_INTERFERENCE_RULES = [
  {
    flawedPattern: 'cope up with',
    correction: 'cope with',
    explanation: 'In standard British English, the verb is "cope with" (never "cope up with").'
  },
  {
    flawedPattern: 'discuss about / comprise of / emphasize on / stress upon / demand for (as verb) / request for (as verb)',
    correction: 'discuss / comprise (or "consist of") / emphasize / stress / demand / request',
    explanation: 'Transitive verbs in formal British English take a direct object without a redundant preposition (note: "is comprised of" is passive Pinglish; use "comprises" or "consists of").'
  },
  {
    flawedPattern: 'doing corruption / doing mistakes / making hurdles',
    correction: 'engaging in corruption (or perpetrating corruption) / making mistakes (or committing errors/mistakes) / creating impediments (or erecting barriers)',
    explanation: 'Urdu-to-English calqued verb collocations ("kerna"). Note: "committing mistakes" or "committing errors" IS valid formal English and must NEVER be flagged.'
  },
  {
    flawedPattern: 'concerned authorities / concerned ministry / concerned citizens (when meaning relevant)',
    correction: 'the authorities concerned / the relevant ministry',
    explanation: 'Pre-nominal "concerned" means "worried/anxious"; post-nominal "authorities concerned" or "relevant authorities" means "responsible/applicable".'
  },
  {
    flawedPattern: 'avail the opportunity',
    correction: 'avail oneself of the opportunity / seize the opportunity',
    explanation: '"Avail" requires a reflexive pronoun + "of" in formal English.'
  },
  {
    flawedPattern: 'pass out from college / pass out from university / pass out from academy',
    correction: 'graduate from college/university',
    explanation: 'Strictly when referring to academic graduation, "pass out" is South Asian colloquialism ("pass out" in standard English means to faint/lose consciousness). Never flag "pass out" when used literally for fainting from heat or exhaustion.'
  },
  {
    flawedPattern: 'on war footing basis / need of the hour / by leaps and bounds / each and every',
    correction: 'as an urgent priority / an immediate imperative / exponentially (or rapidly) / every',
    explanation: 'Overworn bureaucratic clichés and tautological redundancies weaken civil service academic register (🔵 Tier 3 Polish).'
  }
];

export const PAKISTAN_2026_BASELINES = `
2026 PAKISTAN & GLOBAL VERIFICATION BASELINES (For Selective Search Grounding):
- Current Year Context: 2026.
- Population of Pakistan: ~241.5 million (7th Population & Housing Digital Census 2023; ~250M+ by 2026 projections). Flag essays citing "207 million" (2017 Census) or "220 million" as current in 2026.
- Constitutional Milestones: 26th Constitutional Amendment passed in October 2024 (judicial appointments / constitutional benches). 25th Amendment (2018) merged FATA into KP.
- IMF Program Context: 37-month $7 billion Extended Fund Facility (EFF) approved in September 2024 (running 2024–2027). Flag essays claiming Pakistan has "yet to enter the 2023 SBA" as outdated.
- Outdated Data Rule: If a candidate presents 2018–2022 inflation, GDP growth, circular debt, or literacy figures as "current today" without historical qualification, flag gently with updated 2025–2026 context.
`;

