import React, { useState } from 'react';
import { DocumentViewer } from './DocumentViewer';
import { RubricTabs } from './RubricTabs';
import { CamScannerLoadingOverlay } from './CamScannerLoadingOverlay';
import {
  FileText,
  ArrowLeft,
  Columns,
  Maximize2,
  BarChart3,
  Printer
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
      {/* Top Report Navigation Ribbon (Theme-Reactive Editorial Header) */}
      <header className="studio-top-header h-14 px-3 sm:px-6 flex items-center justify-between z-20 flex-shrink-0 sticky top-0 font-sans">
        {/* Left: Breadcrumbs / Navigation */}
        <div className="flex items-center space-x-2 sm:space-x-3 overflow-hidden">
          <button
            type="button"
            onClick={() => setActiveView?.('hub')}
            className="inline-flex items-center text-xs font-semibold transition-colors py-1 group flex-shrink-0 cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
            title="Back to Practice Hub"
          >
            <ArrowLeft className="w-4 h-4 mr-1 transition-colors" style={{ color: 'var(--text-muted)' }} />
            <span className="hidden sm:inline">Practice Hub</span>
          </button>
          <span className="hidden sm:inline" style={{ color: 'var(--border-strong)' }}>/</span>
          <span className="text-xs font-medium hidden md:inline truncate" style={{ color: 'var(--text-muted)' }}>
            {evaluation?.subject || 'English Essay'}
          </span>
          <span className="hidden md:inline" style={{ color: 'var(--border-strong)' }}>/</span>
          <h1
            className="text-xs sm:text-sm font-semibold tracking-tight font-academic italic truncate max-w-[150px] xs:max-w-[180px] sm:max-w-xs md:max-w-md"
            style={{ color: 'var(--text-primary)' }}
          >
            {evaluation?.topic || evaluation?.examQuestion}
          </h1>
          <span
            className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-medium flex-shrink-0"
            style={{
              backgroundColor: 'var(--bg-ribbon)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)'
            }}
          >
            {evaluation?.essayMode === 'outline_only' || evaluation?.archetypeId === 'essay_outline'
              ? 'Outline Only'
              : 'Full Evaluation'}
          </span>
        </div>

        {/* Right: Metrics & Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
          <div
            className="hidden sm:flex items-center space-x-2.5 text-xs pr-3 font-mono"
            style={{ color: 'var(--text-muted)', borderRight: '1px solid var(--border)' }}
          >
            <span className="inline-flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
              <FileText className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              {evaluation?.wordCount || 0}w
            </span>
            {userProfile?.role === 'admin' && (
              <>
                <span className="hidden lg:inline" style={{ color: 'var(--border-strong)' }}>•</span>
                <span className="hidden lg:inline" style={{ color: 'var(--text-muted)' }}>
                  {((evaluation?.tokenUsage?.totalTokens || 12000) / 1000).toFixed(1)}k tok
                </span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsFocusMode(!isFocusMode)}
            className="hidden md:inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-md shadow-xs transition-colors cursor-pointer"
            style={{
              backgroundColor: isFocusMode ? 'var(--accent-blue-soft)' : 'var(--bg-card)',
              color: isFocusMode ? 'var(--accent-blue)' : 'var(--text-secondary)',
              border: `1px solid ${isFocusMode ? 'var(--accent-blue-border)' : 'var(--border)'}`
            }}
            title={isFocusMode ? 'Switch to side-by-side split view' : 'Focus only on evaluation report'}
          >
            {isFocusMode ? <Columns size={13} className="mr-1" /> : <Maximize2 size={13} className="mr-1" />}
            <span>Focus</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center px-2.5 sm:px-3 py-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-md shadow-xs transition-colors cursor-pointer"
          >
            <Printer size={13} className="sm:mr-1.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </header>

      {/* Mobile-Only View Switcher (Annotated Script vs Scorecard) */}
      {evaluation && (
        <div className="studio-mobile-tabs lg:hidden flex items-center justify-center p-1 mx-3 my-1 rounded-xl shrink-0 z-10 font-sans">
          <button
            type="button"
            onClick={() => setMobileTab('paper')}
            className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            style={{
              backgroundColor: mobileTab === 'paper' ? 'var(--bg-panel)' : 'transparent',
              color: mobileTab === 'paper' ? 'var(--accent-blue)' : 'var(--text-secondary)',
              boxShadow: mobileTab === 'paper' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              fontWeight: mobileTab === 'paper' ? 700 : 600
            }}
          >
            <FileText size={13} />
            <span>Annotated Script ({annotationsCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('scorecard')}
            className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            style={{
              backgroundColor: mobileTab === 'scorecard' ? 'var(--bg-panel)' : 'transparent',
              color: mobileTab === 'scorecard' ? 'var(--accent-blue)' : 'var(--text-secondary)',
              boxShadow: mobileTab === 'scorecard' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              fontWeight: mobileTab === 'scorecard' ? 700 : 600
            }}
          >
            <BarChart3 size={13} />
            <span>Diagnostic Report</span>
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
            <div className="p-4 sm:p-6 lg:p-7 max-w-2xl mx-auto w-full">
              <RubricTabs
                evaluation={evaluation}
                selectedAnnId={selectedAnnId}
                isAdmin={userProfile?.role === 'admin'}
                onSelectAnnId={(id) => {
                  setSelectedAnnId(id);
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
