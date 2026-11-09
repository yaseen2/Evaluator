import React, { useState } from 'react';
import { DocumentViewer } from './DocumentViewer';
import { ScorecardSummary } from './ScorecardSummary';
import { RubricTabs } from './RubricTabs';
import { CamScannerLoadingOverlay } from './CamScannerLoadingOverlay';
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
  userProfile
}) => {
  const [selectedAnnId, setSelectedAnnId] = useState(null);
  const [isFocusMode, setIsFocusMode] = useState(false);

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
    <div style={{ position: 'relative', flex: 1, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top Report Navigation Ribbon */}
      <div className="h-11 bg-white border-b border-slate-200 px-3 sm:px-4 flex items-center justify-between shrink-0 z-10 gap-2 overflow-hidden">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 overflow-hidden">
          <button
            type="button"
            onClick={() => setActiveView?.('hub')}
            className="border-none bg-transparent text-[#1d6ef2] text-xs font-semibold cursor-pointer flex items-center gap-1 p-1 shrink-0 hover:underline"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Practice Hub</span>
            <span className="sm:hidden">Back</span>
          </button>
          <span className="text-slate-200 shrink-0">|</span>
          <span className="text-[11px] sm:text-xs font-bold text-slate-500 shrink-0">
            {evaluation?.subject}
          </span>
          <span className="text-xs font-medium text-slate-800 truncate min-w-0">
            {evaluation?.topic || evaluation?.examQuestion}
          </span>
        </div>

        {/* Focus Mode Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsFocusMode(!isFocusMode)}
            className={`border px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-colors ${
              isFocusMode
                ? 'bg-blue-50 text-[#1d6ef2] border-blue-200'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title={isFocusMode ? 'Switch to side-by-side split view' : 'Focus only on evaluation report'}
          >
            {isFocusMode ? <Columns size={13} /> : <Maximize2 size={13} />}
            <span className="hidden sm:inline">{isFocusMode ? 'Split View' : 'Focus Report'}</span>
            <span className="sm:hidden">{isFocusMode ? 'Split' : 'Focus'}</span>
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
