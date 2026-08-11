---
name: fpsc-evaluator
description: Evaluates CSS answer scripts for Islamic History & Culture (or other subjects) using the 6-Agent FPSC Task Force architecture directly inside Antigravity without using external API keys.
---

# FPSC CSS 6-Agent Task Force Evaluation Skill

This skill enables Antigravity to run a rigorous, multi-agent qualitative evaluation on CSS competitive examination answer papers directly in Antigravity (using Google AI Pro context).

## When to Use
Use this skill whenever the user asks to evaluate an answer paper, image, or text file submitted in `submissions/` or pasted in chat.

---

## The 6-Agent Evaluation Pipeline

When triggered, Antigravity executes the following 6 sequential/parallel agents:

### Agent 1: Question Directive & Scope Auditor
- Identify the directive verb (Discuss, Analyze, Critically Examine, Compare, Explain).
- Identify required timeframe and dimensions (Political, Economic, Social, Cultural).
- Audit whether candidate directly addresses the requested directive vs giving generic narrative.

### Agent 2: Digitizer & Transcription Specialist
- Transcribe full text verbatim into `fullTranscribedText`.
- Preserve headings, paragraphs, and structure.

### Agent 3: Historical Accuracy & Factual Verifier
- Cross-check dates, caliphate eras, personalities, treaty names, and historical claims.
- Flag any factual blunder, treaty mixing, or reform confusion.
- Penalize casual traditional stories from public gatherings ("Mehrab-o-Mimbar / Jurga") lacking academic standard.

### Agent 4: Structural Causality & Analytical Depth Specialist
- Audit **Structural Causality ("Why & How" vs "What")**:
  - Weak storytelling: *"Arabia had tribes. Then wars happened."*
  - High-scoring Structural Causality: *"The structural absence of a central state apparatus necessitated pastoral raiding (Ghazw) as an economic mechanism, while tribal solidarity (Asabiyyah) served as the sole legal enforcement system."*
- Generate actionable `thingsToInclude` array with key cause-effect arguments to elevate the paper.
- Provide senior examiner summary synthesis and custom observations.

### Agent 5: Headings & Contextual Visual Architect
- Audit descriptive academic headings vs weak generic titles.
- Design a `suggestedVisual` (ASCII / Mermaid flowchart) with an `insertAfterHeading` target.

### Agent 6: Universal Error & Strength Highlighter
- Generate rich annotations across 5 categories:
  - Factual & Historical Errors (red)
  - English Grammar & Syntax Errors (red)
  - Weak Storytelling & Lack of Causality (amber)
  - Diction & Academic Register (amber)
  - Technical Terminology & Strong Arguments (green)
- **CRITICAL**: Every `targetPhrase` MUST be an exact 3-10 word substring present VERBATIM in `fullTranscribedText`.

---

## Output Requirements

When evaluating a submission:

1. **Save Local JSON File**:
   Save a structured JSON file to `src/data/evaluations/eval-<timestamp>.json` so the React Web UI (`http://localhost:3000`) displays it dynamically.

2. **Render Rich Markdown Report**:
   Present an interactive report directly in chat including:
   - **Directive Alignment Card**
   - **Scorecard Summary & Word Counts**
   - **Factual Audit & Deal-Breaker Report**
   - **Structural Causality ("Things to Include")**
   - **Suggested Visual Diagram**
   - **Line-by-Line Callout Annotations**
