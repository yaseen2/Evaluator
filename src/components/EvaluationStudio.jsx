import React, { useState } from 'react';
import { DocumentViewer } from './DocumentViewer';
import { ScorecardSummary } from './ScorecardSummary';
import { RubricTabs } from './RubricTabs';
import { CamScannerLoadingOverlay } from './CamScannerLoadingOverlay';
import { Upload, FileText } from 'lucide-react';

export const EvaluationStudio = ({ evaluation, mode, setMode, isEvaluating, pipelineProgress, onOpenUpload, activeSubject, submissionImages = [] }) => {
  const [selectedAnnId, setSelectedAnnId] = useState(null);

  if (!evaluation && !isEvaluating) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', background: 'var(--bg-app)' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--accent-blue)' }}>
          <FileText size={24} />
        </div>
        <h2 style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>
          No Answer Script Submitted
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Upload a handwritten answer sheet photo or paste typed essay text to run an FPSC-calibrated evaluation.
        </p>
        <button className="btn-accent" onClick={onOpenUpload} style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
          <Upload size={15} />
          <span>Submit Paper for Evaluation</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', flex: 1, height: 'calc(100vh - 52px)', overflow: 'hidden' }}>
      {isEvaluating && (
        <CamScannerLoadingOverlay
          pipelineProgress={pipelineProgress}
          mode={mode}
          subject={activeSubject}
          images={submissionImages}
        />
      )}

      {evaluation && (
        <div className="studio-layout">
          <DocumentViewer
            evaluation={evaluation}
            mode={mode}
            setMode={setMode}
            selectedAnnId={selectedAnnId}
            onSelectAnnId={setSelectedAnnId}
            submissionImages={submissionImages}
          />

          <div className="panel-right">
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
