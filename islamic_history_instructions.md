# FPSC Islamic History & Culture (IHC) Qualitative Evaluation Instructions

This document outlines the qualitative feedback rules, diagnostic checks, prompts, deal-breakers, visual suggestion rules, and **Structural Causality ("Why & How" over "What")** evaluation standards coded inside the CSS AI Evaluator platform.

---

## 📍 File Locations in Codebase

| File Path | Description / Role |
| :--- | :--- |
| **[src/services/fpscRubrics.js](file:///d:/Ai%20studio/Evaluator/src/services/fpscRubrics.js#L25-L75)** | Structural Causality definitions, deal-breakers, and diagnostic rubrics. |
| **[src/services/geminiApi.js](file:///d:/Ai%20studio/Evaluator/src/services/geminiApi.js#L155-L165)** | Active AI System Prompt with Agent 4 Structural Causality Audit injected into Gemini 2.5/3.5 Flash & Pro. |
| **[src/components/ScorecardSummary.jsx](file:///d:/Ai%20studio/Evaluator/src/components/ScorecardSummary.jsx)** | Renders the **Structural Causality & Cause-Effect Depth** diagnostic card. |

---

## 🧠 Core Criterion: Structural Causality ("Why & How" vs "What")

In FPSC Competitive Examinations, senior examiners penalize **elementary chronological storytelling** ("What") and award top marks to **Structural Causality** ("Why & How").

### Comparison Matrix:

| Standard | Weak Storytelling ("What") | Structural Causality ("Why & How") |
| :--- | :--- | :--- |
| **Narrative Approach** | Passive chronological sequence of dates, battles, and ruler deaths. | Analyzes underlying systemic root causes, institutional drivers, and socio-economic forces. |
| **Example (Pre-Islamic Arabia)** | *"Arabia had tribes. People fought wars like Harb al-Basus. Then Islam came."* | *"The structural absence of a central state apparatus necessitated pastoral raiding (Ghazw) as an economic mechanism, while tribal solidarity (Asabiyyah) served as the sole legal enforcement system."* |
| **Example (Umayyad Decline)** | *"The Umayyad dynasty fell in 750 CE because Abu Muslim attacked them."* | *"Structural friction between Qays and Yaman tribal factions, coupled with fiscal discontent among non-Arab Muslims (Mawali) over Jizya taxation, crippled central authority."* |

---

## 1. Qualitative Diagnostic Criteria

The evaluation engine audits candidate scripts against 5 qualitative benchmark criteria:

1. **Substantive Introduction:**
   - Minimum **100 words** target.
   - Must provide a general overview of the subject without prematurely diving into deep specifics.

2. **Self-Explanatory & Descriptive Headings:**
   - Headings should be descriptive academic titles (e.g. `"1. Nomadic Pastoralism: Environmental Aridity & Subsistence Economy"`).
   - Flags guidance if headings are weak or generic single words.

3. **Visual Diagrams & Flowcharts (`Suggested Visual` Collapsible Dropdown):**
   - Generates an expandable **`📊 Suggested Visual`** dropdown embedded directly inside the user's transcribed text right under its target section heading!

4. **Structural Causality & Analytical Depth ("Things to Include"):**
   - Audits whether the candidate explains systemic root causes ("Why & How") and generates actionable structural cause-effect suggestions in `thingsToInclude`.

5. **Comprehensive English Grammar & Language Audit:**
   - Line-by-line evaluation of English language quality across the whole text (spelling, syntax, tense consistency, punctuation, and academic register).

---

## 2. FPSC Critical Deal-Breakers

The AI examiner flags a **Critical Deal-Breaker Warning** for the following core violations:

1. **Historical & Treaty Blunders:**
   - Any incorrect historical dates, wrong caliphate eras, misattributed historical events, or mixing treaties.

2. **Casual Sermon Storytelling:**
   - Quoting traditional sermon stories (*"Mehrab-o-Mimbar / Jurga / Otaqs"*) having no academic value standard.

3. **Sectarian Bias or Polemics:**
   - Any non-neutral, biased, or polemical statements.

4. **Stereotype Guidebook Regurgitation:**
   - Rote-memorized generic answers devoid of independent analytical depth.
