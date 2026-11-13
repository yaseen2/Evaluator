import React, { useState, useEffect } from 'react';
import {
  FileSearch,
  ShieldCheck,
  Cpu,
  Zap,
  Layers,
  Search,
  Sparkles,
  CheckCircle2,
  Clock,
  BookOpen
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// DETAILED STAGES FOR FPSC CSS ESSAY (v2.1 Master Rubric)
// ─────────────────────────────────────────────────────────────
const ESSAY_STEPS = [
  {
    id: 'ocr',
    stageBadge: 'Stage 0A • Digitizer',
    title: 'High-Resolution Vision Ingestion',
    detail: 'Digitizing script verbatim across pages without premature edits to preserve candidate phrasing...',
    icon: FileSearch,
    color: '#38bdf8',
    checkpoint: 'Verbatim Digitization',
    targetTag: '[OCR] Verbatim Script'
  },
  {
    id: 'ast',
    stageBadge: 'Stage 0B • Structural Indexer',
    title: 'Deterministic Boundary & AST Tagger',
    detail: 'Isolating Outline [O1..On] from Prose [P1..PN] and indexing sentence coordinates [P1.S1..PN.SM]...',
    icon: Layers,
    color: '#38bdf8',
    checkpoint: 'Coordinate Indexing',
    targetTag: '[AST] [P1.S1..PN.SM]'
  },
  {
    id: 'macro',
    stageBadge: 'Stage 1A • Macro-Architect',
    title: 'Topic Decoding & 80:20 Scope Check',
    detail: 'Decoding 80:20 scope, classifying Essay Genre, and auditing requiresCounterArgument rule...',
    icon: ShieldCheck,
    color: '#818cf8',
    checkpoint: 'Genre & 80:20 Scope',
    targetTag: '[Genre] 80:20 Scope'
  },
  {
    id: 'thesis',
    stageBadge: 'Stage 1A • Thesis Auditor',
    title: 'Thesis Architecture & Stance Audit',
    detail: 'Auditing candidate thesis statement for debatability, tautology, and trajectory signposting...',
    icon: ShieldCheck,
    color: '#818cf8',
    checkpoint: 'Thesis Stance',
    targetTag: '[Thesis] Stance Verified'
  },
  {
    id: 'pacing',
    stageBadge: 'Stage 1A-Post • Cadence Engine',
    title: 'Role-Filtered Pacing & Role Map',
    detail: 'Tagging paragraph roles and computing 1st-half vs. 2nd-half pacing decay on body paragraphs...',
    icon: Cpu,
    color: '#a855f7',
    checkpoint: 'Pacing Decay',
    targetTag: '[Pacing] Cadence Delta'
  },
  {
    id: 'paragraphs',
    stageBadge: 'Stage 1B • Paragraph Inspector',
    title: '1-Paragraph-1-Argument & Mode-Lock',
    detail: 'Auditing Topic Sentences, PEEL causal chains, and catching Grafted/Franken-paragraphs...',
    icon: ShieldCheck,
    color: '#06b6d4',
    checkpoint: 'Paragraph Unity',
    targetTag: '[PEEL] Paragraph Unity'
  },
  {
    id: 'grounding',
    stageBadge: 'Stage 1B • Fact & Evidence Critic',
    title: 'Live Google Search Grounding',
    detail: "Auditing Gondal's 54-evidence spectrum & querying 2026 Pakistan economic and constitutional baselines...",
    icon: Search,
    color: '#10b981',
    checkpoint: 'Search Grounding',
    targetTag: '[Facts] 2026 Grounded'
  },
  {
    id: 'pinglish',
    stageBadge: 'Stage 1B • Language Critic',
    title: 'British Syntax & Pinglish Detection',
    detail: 'Scanning British English syntax, clause punctuation, and Urdu-to-English (Pinglish) interference...',
    icon: Sparkles,
    color: '#f59e0b',
    checkpoint: 'Pinglish & Syntax',
    targetTag: '[L1 Shield] British Register'
  },
  {
    id: 'qa_gate',
    stageBadge: 'Stage 2 • Chief Examiner QA',
    title: 'Active False-Positive Deletion Gate',
    detail: 'Auditing diagnostics against verbatim quotes, pruning nitpicks, and locking 🟢 Earned Topper Signifiers...',
    icon: ShieldCheck,
    color: '#10b981',
    checkpoint: 'QA Gatekeeper',
    targetTag: '[QA Gate] False Positives Pruned'
  },
  {
    id: 'synthesis',
    stageBadge: 'Stage 2 • Surgical Coach',
    title: '3-Tier Rewrites & Master Report',
    detail: 'Synthesizing 10-pillar diagnostics and generating Before → After Topper surgical upgrades...',
    icon: Zap,
    color: '#38bdf8',
    checkpoint: 'Surgical Rewrites',
    targetTag: '[Report] Final Synthesis'
  }
];

// ─────────────────────────────────────────────────────────────
// DETAILED STAGES FOR 20-MARK SUBJECTIVE & PRECIS PAPERS
// ─────────────────────────────────────────────────────────────
const SUBJECTIVE_STEPS = [
  {
    id: 'ocr',
    stageBadge: 'Agent 1/6 • Digitizer',
    title: 'Optical Character Recognition',
    detail: 'Scanning page boundaries and digitizing candidate answers verbatim...',
    icon: FileSearch,
    color: '#38bdf8',
    checkpoint: 'Script Digitization',
    targetTag: '[OCR] Verbatim Answer'
  },
  {
    id: 'directive',
    stageBadge: 'Agent 2/6 • Directive Auditor',
    title: 'Question Directive & Scope Audit',
    detail: 'Auditing primary directive (Discuss, Analyze, Evaluate) and analytical dimensions...',
    icon: ShieldCheck,
    color: '#818cf8',
    checkpoint: 'Directive Alignment',
    targetTag: '[Directive] Scope Mapped'
  },
  {
    id: 'facts',
    stageBadge: 'Agent 3/6 • Factual Critic',
    title: 'Scholarly Citations & Historical Data',
    detail: 'Verifying treaties, dates, constitutional articles, and primary historians/theorists...',
    icon: Search,
    color: '#10b981',
    checkpoint: 'Scholarly Citations',
    targetTag: '[Citations] Primary Sources'
  },
  {
    id: 'causality',
    stageBadge: 'Agent 4/6 • Structural Scorer',
    title: 'Structural Causality & FPSC Marks',
    detail: 'Evaluating "Why & How" institutional causality over elementary storytelling...',
    icon: Cpu,
    color: '#a855f7',
    checkpoint: 'Causality & Marks',
    targetTag: '[Causality] Why & How'
  },
  {
    id: 'visuals',
    stageBadge: 'Agent 5/6 • Visual Architect',
    title: 'Schematic Diagrams & 3-Tier Rewrites',
    detail: 'Designing contextual flowchart blueprint and generating Topper paragraph rewrites...',
    icon: Layers,
    color: '#06b6d4',
    checkpoint: 'Schematic Diagrams',
    targetTag: '[Blueprint] Flowchart'
  },
  {
    id: 'pedagogy',
    stageBadge: 'Agent 6/6 • Language Mentor',
    title: 'Verbatim Pedagogical Callouts',
    detail: 'Mapping line-by-line Red / Amber / Green micro-lessons across candidate text...',
    icon: Zap,
    color: '#f59e0b',
    checkpoint: 'Pedagogical Callouts',
    targetTag: '[Callouts] Micro-Lessons'
  }
];

// ─────────────────────────────────────────────────────────────
// ROTATING FPSC EXAMINER INSIGHTS & GOLDEN RULES (Engaging for Students)
// ─────────────────────────────────────────────────────────────
const FPSC_EXAMINER_INSIGHTS = [
  {
    tag: 'OFFICIAL FPSC EXAMINER ADVICE',
    tip: 'Over 80% of candidates fail the Essay because they reproduce pre-memorized textbook material rather than addressing the specific qualifiers of the prompt.'
  },
  {
    tag: 'THESIS ARCHITECTURE',
    tip: 'A Topper thesis never merely echoes the prompt; it defines the conditional mechanism (HOW and WHY) that anchors the argument.'
  },
  {
    tag: '1-PARAGRAPH-1-ARGUMENT RULE',
    tip: 'Never cram 3 separate ideas into one paragraph. Start with an assertive Topic Sentence, develop the causal chain, cite evidence, and link back to the thesis.'
  },
  {
    tag: 'OUTLINE SYNCHRONIZATION',
    tip: 'Every Roman-numeral header and sub-point in your Outline must have a 1:1 corresponding prose paragraph in the essay body. Omissions cost marks.'
  },
  {
    tag: 'EVIDENCE INTEGRATION',
    tip: 'An isolated statistic is not an argument. Always add an analytical sentence explaining what the data proves constitutionally or economically.'
  },
  {
    tag: 'PAKISTANI L1 INTERFERENCE',
    tip: "'Cope up with' is an Urdu-interference error. Standard British English is strictly 'cope with'. Avoid common Pinglish expressions."
  },
  {
    tag: 'MODE-LOCK DISCIPLINE',
    tip: 'In "Way Forward" paragraphs, never re-narrate the problem. Explain the exact reform mechanism, institutional actors, and policy sequence.'
  },
  {
    tag: 'CONCLUSION SYNTHESIS',
    tip: 'Never introduce unargued new statistics in your conclusion. Re-synthesize your core stance and project a forward-looking trajectory.'
  }
];

export const CamScannerLoadingOverlay = ({
  pipelineProgress,
  subject = 'English Essay',
  images = []
}) => {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeTipIndex, setActiveTipIndex] = useState(0);

  const isEssay = (subject || '').toLowerCase().includes('essay');
  const activeStepList = isEssay ? ESSAY_STEPS : SUBJECTIVE_STEPS;

  // Multi-page image carousel
  useEffect(() => {
    if (!images || images.length <= 1) return;
    const imgTimer = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % images.length);
    }, 3200);
    return () => clearInterval(imgTimer);
  }, [images]);

  // Rotating FPSC examiner tips (every 4.5s)
  useEffect(() => {
    const tipTimer = setInterval(() => {
      setActiveTipIndex((prev) => (prev + 1) % FPSC_EXAMINER_INSIGHTS.length);
    }, 4500);
    return () => clearInterval(tipTimer);
  }, []);

  // Smooth realistic elapsed time tracker (100ms ticks)
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedMs((prev) => prev + 100);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  const elapsedSeconds = elapsedMs / 1000;

  // Realistic progressive multi-stage timeline calculation
  // Total target window: ~38 to 44 seconds for multi-agent DAG
  let computedStepIndex = 0;
  let simulatedPercent = 5;

  if (isEssay) {
    if (elapsedSeconds < 3.5) {
      computedStepIndex = 0; // Stage 0A: OCR
      simulatedPercent = Math.min(18, 5 + elapsedSeconds * 3.7);
    } else if (elapsedSeconds < 7.5) {
      computedStepIndex = 1; // Stage 0B: AST & Coordinates
      simulatedPercent = Math.min(30, 18 + (elapsedSeconds - 3.5) * 3);
    } else if (elapsedSeconds < 12.5) {
      computedStepIndex = 2; // Stage 1A: Macro & Genre
      simulatedPercent = Math.min(44, 30 + (elapsedSeconds - 7.5) * 2.8);
    } else if (elapsedSeconds < 17.0) {
      computedStepIndex = 3; // Stage 1A: Thesis Stance
      simulatedPercent = Math.min(54, 44 + (elapsedSeconds - 12.5) * 2.2);
    } else if (elapsedSeconds < 21.5) {
      computedStepIndex = 4; // Stage 1A-Post: Pacing Engine
      simulatedPercent = Math.min(64, 54 + (elapsedSeconds - 17.0) * 2.2);
    } else if (elapsedSeconds < 26.5) {
      computedStepIndex = 5; // Stage 1B: Paragraph Inspector
      simulatedPercent = Math.min(74, 64 + (elapsedSeconds - 21.5) * 2.0);
    } else if (elapsedSeconds < 31.5) {
      computedStepIndex = 6; // Stage 1B: Search Grounding
      simulatedPercent = Math.min(84, 74 + (elapsedSeconds - 26.5) * 2.0);
    } else if (elapsedSeconds < 36.0) {
      computedStepIndex = 7; // Stage 1B: Pinglish & Syntax
      simulatedPercent = Math.min(90, 84 + (elapsedSeconds - 31.5) * 1.3);
    } else if (elapsedSeconds < 41.0) {
      computedStepIndex = 8; // Stage 2: Chief Examiner QA Gate
      simulatedPercent = Math.min(95, 90 + (elapsedSeconds - 36.0) * 1.0);
    } else {
      computedStepIndex = 9; // Stage 2: Synthesis & Rewrites
      simulatedPercent = Math.min(98, 95 + (elapsedSeconds - 41.0) * 0.4);
    }
  } else {
    // 20-Mark Subjective 6-Agent Timeline
    if (elapsedSeconds < 4.0) {
      computedStepIndex = 0;
      simulatedPercent = Math.min(20, 5 + elapsedSeconds * 3.7);
    } else if (elapsedSeconds < 9.0) {
      computedStepIndex = 1;
      simulatedPercent = Math.min(38, 20 + (elapsedSeconds - 4.0) * 3.6);
    } else if (elapsedSeconds < 15.0) {
      computedStepIndex = 2;
      simulatedPercent = Math.min(58, 38 + (elapsedSeconds - 9.0) * 3.3);
    } else if (elapsedSeconds < 22.0) {
      computedStepIndex = 3;
      simulatedPercent = Math.min(75, 58 + (elapsedSeconds - 15.0) * 2.4);
    } else if (elapsedSeconds < 30.0) {
      computedStepIndex = 4;
      simulatedPercent = Math.min(88, 75 + (elapsedSeconds - 22.0) * 1.6);
    } else {
      computedStepIndex = 5;
      simulatedPercent = Math.min(98, 88 + (elapsedSeconds - 30.0) * 0.7);
    }
  }

  // If external pipelineProgress is provided, bind to it
  const activeStepIdx = pipelineProgress?.currentStep
    ? Math.max(0, Math.min(activeStepList.length - 1, pipelineProgress.currentStep - 1))
    : computedStepIndex;

  const currentStep = activeStepList[activeStepIdx] || activeStepList[0];
  const StepIcon = currentStep.icon;

  const displayPercent = pipelineProgress?.percent
    ? Math.max(Math.round(simulatedPercent), Math.round(pipelineProgress.percent))
    : Math.round(simulatedPercent);

  const displayTitle = pipelineProgress?.stepLabel || pipelineProgress?.stage || currentStep.title;
  const displayDetail = pipelineProgress?.detail || currentStep.detail;

  const currentImg = images && images.length > 0 ? images[activeImageIndex] : null;
  const activeTip = FPSC_EXAMINER_INSIGHTS[activeTipIndex];

  // Format MM:SS for the elapsed timer
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = Math.floor(elapsedSeconds % 60);
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(4, 7, 18, 0.96)',
        backdropFilter: 'blur(16px)',
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        overflowY: 'auto'
      }}
    >
      {/* BACKGROUND PARTICLES & DEEP CYAN/BLUE GLOW */}
      <div
        style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.16) 0%, rgba(2, 132, 199, 0.06) 50%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none',
          animation: 'pulseGlow 5s infinite alternate ease-in-out'
        }}
      />

      {/* TOP HEADER STATUS PILL */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '6px 16px',
          borderRadius: '9999px',
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          marginBottom: '1rem',
          zIndex: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#38bdf8',
              boxShadow: '0 0 10px #38bdf8',
              animation: 'ping 1.5s infinite'
            }}
          />
          <span
            style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: '#38bdf8',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-mono)'
            }}
          >
            FPSC Multi-Agent Orchestrator
          </span>
        </div>
        <span style={{ color: 'rgba(148, 163, 184, 0.5)' }}>•</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#94a3b8', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
          <Clock size={12} style={{ color: '#38bdf8' }} />
          <span>{formattedTime}</span>
        </div>
        <span style={{ color: 'rgba(148, 163, 184, 0.5)' }}>•</span>
        <span style={{ fontSize: '0.72rem', color: '#e2e8f0', fontWeight: 600 }}>
          Gemini 3.8 Flash
        </span>
      </div>

      {/* MAIN CONTAINER: SCANNER & PROGRESS HUD */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.75rem',
          maxWidth: '860px',
          width: '100%',
          zIndex: 10
        }}
      >
        {/* HOLOGRAPHIC CAMSCANNER CANVAS */}
        <div
          style={{
            position: 'relative',
            width: '260px',
            height: '350px',
            background: '#040711',
            borderRadius: '12px',
            boxShadow: '0 30px 70px rgba(0,0,0,0.9), 0 0 35px rgba(56, 189, 248, 0.25)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'scale(0.98)',
            animation: 'floatPaper 6s ease-in-out infinite'
          }}
        >
          {/* CAMERA VIEWFINDER RETICLES (CORNERS) */}
          <div style={{ position: 'absolute', top: 12, left: 12, width: 14, height: 14, borderTop: '2px solid #38bdf8', borderLeft: '2px solid #38bdf8', zIndex: 30 }} />
          <div style={{ position: 'absolute', top: 12, right: 12, width: 14, height: 14, borderTop: '2px solid #38bdf8', borderRight: '2px solid #38bdf8', zIndex: 30 }} />
          <div style={{ position: 'absolute', bottom: 12, left: 12, width: 14, height: 14, borderBottom: '2px solid #38bdf8', borderLeft: '2px solid #38bdf8', zIndex: 30 }} />
          <div style={{ position: 'absolute', bottom: 12, right: 12, width: 14, height: 14, borderBottom: '2px solid #38bdf8', borderRight: '2px solid #38bdf8', zIndex: 30 }} />

          {/* SCRIPT IMAGE OR SYNTHETIC PAPER */}
          {currentImg ? (
            <img
              src={currentImg}
              alt="Scanning Page"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: 'contrast(1.08) brightness(0.92)',
                transition: 'opacity 0.6s ease-in-out'
              }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', padding: '1.75rem 1.25rem', background: '#f8fafc', color: '#1e293b' }}>
              <div style={{ height: '14px', width: '70%', background: '#1e293b', borderRadius: '3px', marginBottom: '1.25rem' }} />
              <div style={{ height: '8px', width: '35%', background: '#38bdf8', borderRadius: '2px', marginBottom: '1.5rem' }} />
              <div style={{ height: '7px', width: '95%', background: '#64748b', borderRadius: '2px', marginBottom: '8px' }} />
              <div style={{ height: '7px', width: '100%', background: '#64748b', borderRadius: '2px', marginBottom: '8px' }} />
              <div style={{ height: '7px', width: '90%', background: '#64748b', borderRadius: '2px', marginBottom: '8px' }} />
              <div style={{ height: '7px', width: '96%', background: '#64748b', borderRadius: '2px', marginBottom: '8px' }} />
              <div style={{ height: '7px', width: '84%', background: '#64748b', borderRadius: '2px', marginBottom: '8px' }} />
            </div>
          )}

          {/* VIGNETTE OVERLAY */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(ellipse at center, rgba(4, 7, 18, 0.15) 0%, rgba(4, 7, 18, 0.75) 100%)',
              pointerEvents: 'none',
              zIndex: 10
            }}
          />

          {/* FLOATING DETECTION BADGE OVERLAY */}
          <div
            key={currentStep.id}
            style={{
              position: 'absolute',
              bottom: '22px',
              left: '14px',
              right: '14px',
              padding: '6px 10px',
              borderRadius: '6px',
              background: 'rgba(15, 23, 42, 0.88)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 35,
              animation: 'fadeInUp 0.35s ease'
            }}
          >
            <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#38bdf8' }}>
              {currentStep.targetTag}
            </span>
            <span style={{ fontSize: '0.62rem', color: '#10b981', fontWeight: 700 }}>
              ACTIVE
            </span>
          </div>

          {/* PAGE COUNTER PILL (IF MULTIPLE PAGES) */}
          {images && images.length > 1 && (
            <div
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                padding: '3px 8px',
                borderRadius: '4px',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                fontSize: '0.65rem',
                fontFamily: 'var(--font-mono)',
                color: '#f8fafc',
                zIndex: 35
              }}
            >
              Page {activeImageIndex + 1}/{images.length}
            </div>
          )}

          {/* HOLOGRAPHIC LASER SCANNING BEAM */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: '3px',
              background: 'linear-gradient(90deg, transparent 0%, #38bdf8 20%, #ffffff 50%, #38bdf8 80%, transparent 100%)',
              boxShadow: '0 0 25px #00f2fe, 0 0 45px #38bdf8, 0 0 10px #ffffff',
              animation: 'laserScan 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate',
              zIndex: 25
            }}
          />

          {/* LASER GLOW TRAIL */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: '75px',
              background: 'linear-gradient(180deg, rgba(56, 189, 248, 0.35) 0%, rgba(0, 242, 254, 0.1) 60%, transparent 100%)',
              animation: 'laserTrail 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate',
              zIndex: 24,
              pointerEvents: 'none'
            }}
          />
        </div>

        {/* PROGRESS HUD & TELEMETRY PANEL */}
        <div
          style={{
            flex: '1 1 380px',
            maxWidth: '480px',
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '16px',
            padding: '1.35rem 1.5rem',
            boxShadow: '0 25px 50px rgba(0,0,0,0.7)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}
        >
          {/* STAGE HEADER & PERCENTAGE */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: currentStep.color,
                    fontSize: '0.68rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <StepIcon size={12} />
                  {currentStep.stageBadge}
                </div>
              </div>
              <span
                style={{
                  fontSize: '1.15rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 800,
                  color: '#38bdf8',
                  letterSpacing: '-0.02em'
                }}
              >
                {displayPercent}%
              </span>
            </div>

            <h3
              style={{
                margin: '4px 0 6px 0',
                fontSize: '1.02rem',
                fontWeight: 700,
                color: '#f8fafc',
                letterSpacing: '-0.01em',
                textAlign: 'left'
              }}
            >
              {displayTitle}
            </h3>

            <p
              style={{
                margin: 0,
                fontSize: '0.8rem',
                color: '#94a3b8',
                lineHeight: 1.45,
                textAlign: 'left',
                minHeight: '2.5rem'
              }}
            >
              {displayDetail}
            </p>
          </div>

          {/* CONTINUOUS SMOOTH PROGRESS BAR */}
          <div>
            <div
              style={{
                height: '6px',
                width: '100%',
                background: 'rgba(30, 41, 59, 0.9)',
                borderRadius: '9999px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                position: 'relative'
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${displayPercent}%`,
                  background: 'linear-gradient(90deg, #0284c7, #38bdf8, #818cf8)',
                  boxShadow: '0 0 14px rgba(56, 189, 248, 0.7)',
                  transition: 'width 0.35s ease'
                }}
              />
            </div>

            {/* MULTI-STAGE STEP SEGMENTS */}
            <div style={{ display: 'flex', gap: '3px', marginTop: '6px' }}>
              {activeStepList.map((st, idx) => {
                const isCompleted = idx < activeStepIdx;
                const isActive = idx === activeStepIdx;
                return (
                  <div
                    key={st.id}
                    title={st.title}
                    style={{
                      height: '3px',
                      flex: 1,
                      borderRadius: '2px',
                      background: isCompleted ? '#10b981' : isActive ? '#38bdf8' : 'rgba(51, 65, 85, 0.6)',
                      boxShadow: isActive ? '0 0 8px #38bdf8' : 'none',
                      transition: 'all 0.3s ease'
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* AUDITED CHECKPOINTS PILLS */}
          <div>
            <div
              style={{
                fontSize: '0.67rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: '#64748b',
                marginBottom: '6px',
                textAlign: 'left'
              }}
            >
              Core Audit Pillars
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '5px'
              }}
            >
              {activeStepList.slice(0, 6).map((st, idx) => {
                const isDone = idx < activeStepIdx;
                const isCurrent = idx === activeStepIdx;
                return (
                  <div
                    key={st.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: isCurrent
                        ? 'rgba(56, 189, 248, 0.12)'
                        : isDone
                        ? 'rgba(16, 185, 129, 0.08)'
                        : 'rgba(30, 41, 59, 0.45)',
                      border: isCurrent
                        ? '1px solid rgba(56, 189, 248, 0.35)'
                        : isDone
                        ? '1px solid rgba(16, 185, 129, 0.25)'
                        : '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {isDone ? (
                      <CheckCircle2 size={11} style={{ color: '#10b981', flexShrink: 0 }} />
                    ) : isCurrent ? (
                      <div
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: '#38bdf8',
                          boxShadow: '0 0 6px #38bdf8',
                          animation: 'ping 1.2s infinite',
                          flexShrink: 0
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '5px',
                          height: '5px',
                          borderRadius: '50%',
                          background: '#475569',
                          flexShrink: 0
                        }}
                      />
                    )}
                    <span
                      style={{
                        fontSize: '0.71rem',
                        color: isCurrent ? '#f8fafc' : isDone ? '#cbd5e1' : '#64748b',
                        fontWeight: isCurrent ? 700 : 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        textAlign: 'left'
                      }}
                    >
                      {st.checkpoint}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ROTATING FPSC EXAMINER INSIGHTS CARD (ENGAGING FOR STUDENTS) */}
      <div
        key={activeTipIndex}
        style={{
          marginTop: '1.25rem',
          maxWidth: '860px',
          width: '100%',
          padding: '0.85rem 1.25rem',
          borderRadius: '12px',
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          zIndex: 10,
          animation: 'fadeInUp 0.4s ease'
        }}
      >
        <div
          style={{
            padding: '6px',
            borderRadius: '8px',
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            color: '#38bdf8',
            marginTop: '2px',
            flexShrink: 0
          }}
        >
          <BookOpen size={16} />
        </div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            <span
              style={{
                fontSize: '0.66rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                color: '#38bdf8',
                fontFamily: 'var(--font-mono)'
              }}
            >
              💡 {activeTip.tag}
            </span>
            <span style={{ fontSize: '0.62rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
              (Tip {activeTipIndex + 1}/{FPSC_EXAMINER_INSIGHTS.length})
            </span>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: '0.78rem',
              color: '#e2e8f0',
              lineHeight: 1.45,
              fontWeight: 500
            }}
          >
            {activeTip.tip}
          </p>
        </div>
      </div>

      {/* ANIMATION STYLES */}
      <style>{`
        @keyframes laserScan {
          0% { top: 4%; }
          100% { top: 92%; }
        }
        @keyframes laserTrail {
          0% { top: 0%; opacity: 0.95; }
          100% { top: 85%; opacity: 0.95; }
        }
        @keyframes floatPaper {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-7px) rotate(0.3deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes pulseGlow {
          0% { transform: scale(0.9); opacity: 0.55; }
          100% { transform: scale(1.1); opacity: 0.95; }
        }
        @keyframes ping {
          0% { transform: scale(0.85); opacity: 1; }
          50% { transform: scale(1.35); opacity: 0.45; }
          100% { transform: scale(0.85); opacity: 1; }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
