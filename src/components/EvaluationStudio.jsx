import React, { useState } from 'react';
import { DocumentViewer } from './DocumentViewer';
import { ScorecardSummary } from './ScorecardSummary';
import { RubricTabs } from './RubricTabs';
import { CamScannerLoadingOverlay } from './CamScannerLoadingOverlay';
import {
  FileText,
  ArrowLeft,
  Columns,
  Maximize2,
  BarChart3
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
  const [mobileTab, setMobileTab] = useState('paper'); // 'paper' | 'scorecard'

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

  const annotationsCount = evaluation?.annotations?.length || 0;
  const overallPercentage = evaluation?.overallScore || evaluation?.totalScore || 0;

  // Active View is REPORT: Render Split Studio / Focus Report
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

      {/* Mobile-Only View Switcher (Annotated Script vs Scorecard) */}
      {evaluation && (
        <div className="lg:hidden flex items-center justify-center bg-slate-100 p-1 mx-3 my-1 rounded-xl border border-slate-200 shrink-0 z-10">
          <button
            type="button"
            onClick={() => setMobileTab('paper')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              mobileTab === 'paper'
                ? 'bg-white text-[#1d6ef2] shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText size={13} />
            <span>Annotated Script ({annotationsCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('scorecard')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              mobileTab === 'scorecard'
                ? 'bg-white text-[#1d6ef2] shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 size={13} />
            <span>Scorecard ({overallPercentage}%)</span>
          </button>
        </div>
      )}

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
            <div
              className={`viewer-pane ${mobileTab === 'scorecard' ? 'mobile-hidden' : ''}`}
              style={{ flex: 1, height: '100%', minHeight: 0, overflow: 'hidden' }}
            >
              <DocumentViewer
                evaluation={evaluation}
                mode={mode}
                setMode={setMode}
                selectedAnnId={selectedAnnId}
                onSelectAnnId={(id) => {
                  setSelectedAnnId(id);
                  if (id && mobileTab === 'scorecard') setMobileTab('paper');
                }}
                submissionImages={submissionImages}
              />
            </div>
          )}

          <div
            className={`panel-right ${mobileTab === 'paper' ? 'mobile-hidden' : ''}`}
            style={{ flex: 1, overflowY: 'auto' }}
          >
            <div className="panel-content">
              <ScorecardSummary evaluation={evaluation} />

              <RubricTabs
                evaluation={evaluation}
                selectedAnnId={selectedAnnId}
                onSelectAnnId={(id) => {
                  setSelectedAnnId(id);
                  // When user selects a callout in RubricTabs on mobile, flip to paper so they see the anchored popover
                  if (id) setMobileTab('paper');
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
