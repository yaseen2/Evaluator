import React, { useState } from 'react';
import { DocumentViewer } from './DocumentViewer';
import { ScorecardSummary } from './ScorecardSummary';
import { RubricTabs } from './RubricTabs';
import { CamScannerLoadingOverlay } from './CamScannerLoadingOverlay';
import { PracticeHub } from './PracticeHub';
import sampleEssayEvaluation from '../data/evaluations/sample-essay-evaluation.json';
import {
  FileText,
  ArrowLeft,
  Columns,
  Maximize2
} from 'lucide-react';

export const EvaluationStudio = ({
  activeView = 'report',
  setActiveView,
  evaluation,
  activeSubject,
  setActiveSubject,
  mode,
  setMode,
  isEvaluating,
  pipelineProgress,
  submissionImages = [],
  evaluationHistory = [],
  onSelectEvaluation,
  onDeleteEvaluation,
  onSubmitEvaluation,
  user,
  userProfile,
  onOpenUpload,
  onOpenAuth,
  onOpenSubscription
}) => {
  const [selectedAnnId, setSelectedAnnId] = useState(null);
  const [isFocusMode, setIsFocusMode] = useState(false);

  // If in HUB view, delegate to dedicated PracticeHub (Stitch screen 3d101cd842df4c74adebf0c9139c10c0)
  if (activeView === 'hub') {
    return (
      <PracticeHub
        activeSubject={activeSubject}
        setActiveSubject={setActiveSubject}
        onSubmitEvaluation={onSubmitEvaluation}
        isEvaluating={isEvaluating}
        pipelineProgress={pipelineProgress}
        evaluationHistory={evaluationHistory}
        onSelectEvaluation={onSelectEvaluation}
        onDeleteEvaluation={onDeleteEvaluation}
        onTrySample={() => {
          onSelectEvaluation?.(sampleEssayEvaluation);
          setActiveView?.('report');
        }}
        user={user}
        userProfile={userProfile}
        onOpenPricing={onOpenSubscription}
        onOpenAuth={onOpenAuth}
        setActiveView={setActiveView}
      />
    );
  }

  // Fallback if no evaluation loaded
  if (!evaluation && !isEvaluating) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', background: 'var(--bg-app)' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#ffffff', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--accent-blue)' }}>
          <FileText size={24} />
        </div>
        <h2 style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          No Evaluation Selected
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Select an evaluation from your history or go to the Practice Hub to submit an answer.
        </p>
        <button
          className="btn-superkalam-primary"
          onClick={() => setActiveView?.('hub')}
          style={{ padding: '8px 18px', fontSize: '0.85rem' }}
        >
          <span>✍️ Go to Evaluate Hub</span>
        </button>
      </div>
    );
  }

  // Active View is REPORT: Render SuperKalam Split Studio / Focus Report
  return (
    <div style={{ position: 'relative', flex: 1, height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top Report Navigation Ribbon */}
      <div
        style={{
          height: '42px',
          background: '#ffffff',
          borderBottom: '1px solid var(--border)',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          zIndex: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setActiveView?.('hub')}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--accent-blue)',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 6px'
            }}
          >
            <ArrowLeft size={14} />
            <span>Practice Hub</span>
          </button>
          <span style={{ color: 'var(--border)' }}>|</span>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {evaluation?.subject}
          </span>
          <span
            style={{
              fontSize: '0.76rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              maxWidth: '380px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {evaluation?.topic || evaluation?.examQuestion}
          </span>
        </div>

        {/* Focus Mode Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setIsFocusMode(!isFocusMode)}
            style={{
              border: '1px solid var(--border)',
              background: isFocusMode ? 'var(--accent-blue-soft)' : '#ffffff',
              color: isFocusMode ? 'var(--accent-blue)' : 'var(--text-secondary)',
              fontSize: '0.72rem',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
            title={isFocusMode ? 'Switch to side-by-side split view' : 'Focus only on evaluation report'}
          >
            {isFocusMode ? <Columns size={12} /> : <Maximize2 size={12} />}
            <span>{isFocusMode ? 'Split View' : 'Focus Report'}</span>
          </button>
        </div>
      </div>

      {isEvaluating && (
        <CamScannerLoadingOverlay
          pipelineProgress={pipelineProgress}
          mode={mode}
          subject={activeSubject}
          images={submissionImages}
        />
      )}

      {evaluation && (
        <div className={`studio-layout ${isFocusMode ? 'focus-mode' : ''}`} style={{ flex: 1, overflow: 'hidden' }}>
          {!isFocusMode && (
            <DocumentViewer
              evaluation={evaluation}
              mode={mode}
              setMode={setMode}
              selectedAnnId={selectedAnnId}
              onSelectAnnId={setSelectedAnnId}
              submissionImages={submissionImages}
            />
          )}

          <div className="panel-right" style={{ flex: 1, overflowY: 'auto' }}>
            <div className="panel-content">
              <ScorecardSummary evaluation={evaluation} />

              <RubricTabs
                evaluation={evaluation}
                selectedAnnId={selectedAnnId}
                onSelectAnnId={setSelectedAnnId}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
