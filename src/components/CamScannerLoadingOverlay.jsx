import React, { useState, useEffect } from 'react';
import { FileSearch, ShieldCheck, Cpu, Zap } from 'lucide-react';

export const CamScannerLoadingOverlay = ({ pipelineProgress, mode = 'handwritten', subject = 'Islamic History & Culture', images = [] }) => {
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const STAGES = [
    { title: 'Vision OCR & Layout Analysis', detail: 'Scanning page margins & digitizing handwriting...', icon: FileSearch },
    { title: 'FPSC Rubric Evaluation', detail: `Applying official ${subject} examination rubrics...`, icon: ShieldCheck },
    { title: 'Historiography & Citation Audit', detail: 'Verifying chronological accuracy & primary sources...', icon: Cpu },
    { title: 'Callout Synthesis & Scorecard', detail: 'Generating precise line-by-line feedback callouts...', icon: Zap }
  ];

  // Rotate through stages and uploaded images dynamically
  useEffect(() => {
    const stageInterval = setInterval(() => {
      setActiveStageIndex((prev) => (prev + 1) % STAGES.length);
    }, 2400);

    let imageInterval;
    if (images && images.length > 1) {
      imageInterval = setInterval(() => {
        setActiveImageIndex((prev) => (prev + 1) % images.length);
      }, 3000);
    }

    return () => {
      clearInterval(stageInterval);
      if (imageInterval) clearInterval(imageInterval);
    };
  }, [images]);

  const currentStage = pipelineProgress ? {
    title: pipelineProgress.stage || STAGES[activeStageIndex].title,
    detail: pipelineProgress.detail || STAGES[activeStageIndex].detail
  } : STAGES[activeStageIndex];

  const currentImg = (images && images.length > 0) ? images[activeImageIndex] : null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(4, 6, 12, 0.95)',
        backdropFilter: 'blur(14px)',
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        overflow: 'hidden'
      }}
    >
      {/* BACKGROUND PARTICLES & DEEP BLUE GLOW */}
      <div
        style={{
          position: 'absolute',
          width: '550px',
          height: '550px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.18) 0%, rgba(2, 132, 199, 0.08) 50%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none',
          animation: 'pulseGlow 4s infinite alternate ease-in-out'
        }}
      />

      {/* CAMSCANNER HOLOGRAPHIC PAPER CANVAS WITH DARK CONTRAST OVERLAY */}
      <div
        style={{
          position: 'relative',
          width: '320px',
          height: '430px',
          background: '#040711',
          borderRadius: '10px',
          boxShadow: '0 30px 70px rgba(0,0,0,0.85), 0 0 40px rgba(56, 189, 248, 0.3)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transform: 'scale(0.96)',
          animation: 'floatPaper 6s ease-in-out infinite'
        }}
      >
        {/* ACTUAL CANDIDATE UPLOADED IMAGE */}
        {currentImg ? (
          <img
            src={currentImg}
            alt="Scanning Page"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'contrast(1.05)',
              transition: 'opacity 0.5s ease-in-out'
            }}
          />
        ) : (
          /* Fallback Clean Paper */
          <div style={{ width: '100%', height: '100%', padding: '2rem 1.5rem', background: '#fafaf7', color: '#1e293b' }}>
            <div style={{ height: '14px', width: '75%', background: '#1e293b', borderRadius: '3px', marginBottom: '1.25rem' }} />
            <div style={{ height: '8px', width: '40%', background: '#38bdf8', borderRadius: '2px', marginBottom: '1.5rem' }} />
            <div style={{ height: '7px', width: '95%', background: '#64748b', borderRadius: '2px', marginBottom: '8px' }} />
            <div style={{ height: '7px', width: '100%', background: '#64748b', borderRadius: '2px', marginBottom: '8px' }} />
            <div style={{ height: '7px', width: '88%', background: '#64748b', borderRadius: '2px', marginBottom: '8px' }} />
          </div>
        )}

        {/* DARK CONTRAST VIGNETTE OVERLAY (MAKES ELECTRIC BLUE LASER POP OUT STUNNINGLY) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(ellipse at center, rgba(4, 6, 12, 0.25) 0%, rgba(4, 6, 12, 0.65) 100%)',
            pointerEvents: 'none',
            zIndex: 10
          }}
        />

        {/* ELECTRIC CYAN / BLUE HOLOGRAPHIC LASER BEAM */}
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

        {/* LASER LIGHT GLOW TRAIL */}
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

      {/* ELECTRIC BLUE REAL-TIME AI PIPELINE HUD */}
      <div
        style={{
          marginTop: '1.75rem',
          textAlign: 'center',
          maxWidth: '460px',
          width: '100%',
          background: 'var(--bg-panel)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          padding: '1.25rem 1.5rem',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
        }}
      >
        {/* Stage Status Badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 10px #38bdf8', animation: 'ping 1.5s infinite' }} />
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
            {currentStage.title}
          </h4>
        </div>

        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
          {currentStage.detail}
        </p>

        {/* Stage Step Indicators */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
          {STAGES.map((s, idx) => {
            const isActive = idx === activeStageIndex;
            return (
              <div
                key={idx}
                style={{
                  height: '4px',
                  flex: 1,
                  maxWidth: '80px',
                  borderRadius: '2px',
                  background: isActive ? '#38bdf8' : 'var(--border)',
                  boxShadow: isActive ? '0 0 10px #38bdf8' : 'none',
                  transition: 'all 0.3s ease'
                }}
              />
            );
          })}
        </div>
      </div>

      {/* KEYFRAME ANIMATIONS INJECTOR */}
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
          50% { transform: translateY(-8px) rotate(0.4deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes pulseGlow {
          0% { transform: scale(0.9); opacity: 0.6; }
          100% { transform: scale(1.1); opacity: 1; }
        }
        @keyframes ping {
          0% { transform: scale(0.9); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.4; }
          100% { transform: scale(0.9); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
