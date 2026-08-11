---
name: fpsc-evaluator
description: Evaluates CSS answer scripts using the true Graph Engineering DAG architecture (scripts/evaluate_graph.js) inside Antigravity without external API costs.
---

# FPSC CSS 6-Agent DAG Graph Evaluation Skill

This skill enables Antigravity to run a multi-agent qualitative evaluation on CSS answer papers. Each agent executes as an **isolated step** writing its output to a separate file. A **real Node.js script** (`scripts/evaluate_graph.js`) then programmatically validates, merges, and produces the final evaluation.

---

## ⚠️ CRITICAL EXECUTION RULES

> **You MUST follow these rules exactly. Do NOT combine multiple agent steps into one action.**

1. **ONE AGENT PER STEP.** Each agent below is a separate, focused action. Complete one fully before starting the next.
2. **WRITE INTERMEDIATE FILES.** After each agent step, write the result as a JSON file to `.graph_state/nodeN_name.json` using `write_to_file`.
3. **NO MENTAL MERGING.** Do NOT merge results in your head. The merge is done programmatically by `scripts/evaluate_graph.js`.
4. **RUN THE SCRIPT.** After all 6 agents are done, execute `node scripts/evaluate_graph.js` to programmatically validate and merge.

---

## 📂 File Structure

```
.graph_state/                          ← Intermediate node outputs (created by Antigravity)
  ├── node1_directive.json             ← Agent 1 output
  ├── node2_transcription.json         ← Agent 2 output
  ├── node3_factual.json               ← Agent 3 output
  ├── node4_causality.json             ← Agent 4 output
  ├── node5_visuals.json               ← Agent 5 output
  └── node6_annotations.json           ← Agent 6 output

scripts/evaluate_graph.js              ← Programmatic State Reducer & Validator (Node.js)

src/data/evaluations/
  └── eval-graph-latest.json           ← Final merged output (read by React UI)
```

---

## 🔄 Execution Protocol (6 Steps + 1 Script Run)

### Step 1: Agent 2 — Transcription (DO THIS FIRST)

**Focus:** ONLY transcribe the text. Do NOT evaluate, correct, or comment on it.

- Read all submission images/text files from `submissions/`.
- Transcribe the FULL text verbatim preserving headings, paragraphs, numbering.
- Identify the paper's main topic/title.

**Write output to:** `.graph_state/node2_transcription.json`
```json
{
  "topic": "string",
  "fullTranscribedText": "string (entire text with paragraph breaks)"
}
```

---

### Step 2: Agent 1 — Directive & Scope Audit

**Focus:** ONLY analyze the exam question's directive word and scope alignment.

- Read the exam question (from the paper header or user input).
- Read `.graph_state/node2_transcription.json` to check alignment.
- Identify directive verb, timeframe, required dimensions.

**Write output to:** `.graph_state/node1_directive.json`
```json
{
  "subject": "string",
  "examQuestion": "string",
  "directiveAnalysis": {
    "directiveWord": "string",
    "targetTimeframe": "string or null",
    "requiredDimensions": "string",
    "alignmentStatus": "Aligned | Partially Aligned | Off-Topic",
    "feedback": "string"
  }
}
```

---

### Step 3: Agent 3 — Factual Verification

**Focus:** ONLY fact-check historical claims. Do NOT check grammar or structure.

- Read `.graph_state/node2_transcription.json`.
- Cross-check EVERY historical date, treaty, personality, and claim.
- Flag factual blunders with corrections and sources.

**Write output to:** `.graph_state/node3_factual.json`
```json
{
  "factCheck": [
    {
      "claim": "string (exact claim from text)",
      "verified": true/false,
      "correctedFact": "string or null",
      "source": "string"
    }
  ]
}
```

---

### Step 4: Agent 4 — Structural Causality & Analytical Depth

**Focus:** ONLY analyze structural causality ("Why & How" vs "What"). Do NOT check grammar or facts.

- Read `.graph_state/node2_transcription.json` and `.graph_state/node1_directive.json`.
- Audit whether the candidate explains systemic root causes vs passive storytelling.
- Generate actionable `thingsToInclude` suggestions.
- Write an `examinerSummary` synthesis.

**Write output to:** `.graph_state/node4_causality.json`
```json
{
  "examinerSummary": "string or null",
  "customObservations": [
    { "category": "string", "observation": "string", "type": "strength | concern | recommendation" }
  ],
  "thingsToInclude": ["string"],
  "scoreBreakdown_critical_analysis": {
    "status": "Satisfactory | Needs Improvement | Missing",
    "feedback": "string"
  }
}
```

---

### Step 5: Agent 5 — Headings & Visual Design

**Focus:** ONLY audit headings and design ONE suggested visual. Do NOT check grammar or facts.

- Read `.graph_state/node2_transcription.json`.
- Assess heading quality (descriptive academic titles vs generic labels).
- Design one flowchart/diagram with `insertAfterHeading` target.

**Write output to:** `.graph_state/node5_visuals.json`
```json
{
  "suggestedVisual": {
    "title": "string",
    "description": "string",
    "insertAfterHeading": "string (exact heading from text)",
    "diagramText": "string (ASCII/Mermaid flowchart)"
  },
  "scoreBreakdown_headings": { "status": "string", "feedback": "string" },
  "scoreBreakdown_diagrams": { "status": "string", "feedback": "string" }
}
```

---

### Step 6: Agent 6 — Line-by-Line Annotations

**Focus:** ONLY generate annotations. Scan EVERY sentence for errors and strengths.

- Read `.graph_state/node2_transcription.json`.
- Generate 8-15+ annotations across ALL categories:
  - Factual errors (red), Grammar errors (red), Weak storytelling (amber), Diction (amber), Strong arguments (green)
- **CRITICAL:** Every `targetPhrase` MUST be an EXACT 3-10 word substring copy-pasted from `fullTranscribedText`.

**Write output to:** `.graph_state/node6_annotations.json`
```json
{
  "annotations": [
    {
      "id": "ann-1",
      "targetPhrase": "string (EXACT verbatim substring)",
      "type": "red | amber | green",
      "category": "string",
      "comment": "string",
      "suggestion": "string or null"
    }
  ],
  "scoreBreakdown_introduction": { "status": "string", "feedback": "string" },
  "scoreBreakdown_grammar_syntax": { "status": "string", "feedback": "string" }
}
```

---

### Step 7: Run the State Reducer Script

After ALL 6 node files exist in `.graph_state/`, execute:

```bash
node scripts/evaluate_graph.js
```

This script programmatically:
1. Reads all 6 intermediate node files.
2. Validates every annotation `targetPhrase` exists verbatim in the transcribed text (removes orphans).
3. Calculates deterministic word counts (total + intro).
4. Merges all node states into the unified evaluation object.
5. Writes `src/data/evaluations/eval-graph-latest.json`.

---

## 📊 After Completion

Present the user with:
1. A summary of the evaluation results (key findings from each agent).
2. The command to view it on the web: `npm run dev` → open `http://localhost:3000`.
3. The graph reduction log output showing validated vs removed annotations.
