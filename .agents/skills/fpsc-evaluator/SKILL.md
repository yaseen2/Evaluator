---
name: fpsc-evaluator
description: Evaluates CSS answer scripts using the true Graph Engineering DAG architecture (scripts/evaluate_graph.js) inside Antigravity without external API costs.
---

# FPSC CSS 6-Agent DAG Graph Evaluation Skill

This skill enables Antigravity to run a **True Graph Engineering DAG (Directed Acyclic Graph)** evaluation on CSS competitive examination answer papers directly in Antigravity.

---

## 🏗️ DAG Graph Architecture (`scripts/evaluate_graph.js`)

When evaluating a paper, Antigravity executes the following DAG execution flow:

```
                            [Input Paper / State]
                                      │
                      ┌───────────────┴───────────────┐
                      ▼                               ▼
           [Node 1: Directive]              [Node 2: Transcription]
                      │                               │
                      └───────────────┬───────────────┘
                                      ▼
                       ┌──────────────┼──────────────┬──────────────┐
                       ▼              ▼              ▼              ▼
                  [Node 3: Facts] [Node 4: Cause] [Node 5: Vis]  [Node 6: Anns]
                       │              │              │              │
                       └──────────────┴───────┬──────┴──────────────┘
                                              ▼
                                 [Node 7: State Reducer &]
                                 [ Verbatim Phrase Validator]
                                              │
                                              ▼
                                [src/data/evaluations/eval-graph-latest.json]
```

---

## 🔄 Node Execution Steps

### Node 1: Question Directive & Scope Auditor
- Audits directive verb (Discuss, Analyze, Critically Examine, Compare, Explain).
- Audits timeframe & required dimensions (Political, Economic, Social, Cultural).

### Node 2: Digitizer & Transcription Specialist
- Faithfully transcribes full text verbatim into `fullTranscribedText`.

### Node 3: Historical Accuracy & Factual Verifier
- Cross-checks dates, caliphates, treaties, and claims against academic sources.
- Penalizes casual sermon stories from public gatherings ("Mehrab-o-Mimbar / Jurga").

### Node 4: Structural Causality & Analytical Depth Specialist
- Audits **Structural Causality ("Why & How" vs "What")**.
- Generates actionable `thingsToInclude` cause-effect arguments.

### Node 5: Headings & Contextual Visual Architect
- Audits descriptive academic headings vs weak generic titles.
- Designs a `suggestedVisual` (ASCII / Mermaid flowchart) with `insertAfterHeading` target.

### Node 6: Universal Error & Strength Highlighter
- Generates rich annotations across 5 error/strength categories.
- Ensures `targetPhrase` quotes verbatim substrings from Node 2's transcription.

### Node 7: State Reducer & Verbatim Target Validator
- Programmatically validates that every annotation `targetPhrase` exists in the text.
- Filters out orphaned phrases.
- Calculates deterministic word counts.
- Writes output to `src/data/evaluations/eval-graph-latest.json`.

---

## 🛠️ Execution Protocol

When the user asks to evaluate a paper:
1. Initialize `EvaluationGraphState` using `scripts/evaluate_graph.js`.
2. Populate node results for Nodes 1 through 6.
3. Run `validateAndReduceGraphState(state)`.
4. Run `saveGraphResult(mergedState)` to update `src/data/evaluations/eval-graph-latest.json`.
5. Present the full DAG Examiner Report to the user in chat.
