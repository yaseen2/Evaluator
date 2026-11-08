import React, { useState, useRef } from 'react';
import { DocumentViewer } from './DocumentViewer';
import { ScorecardSummary } from './ScorecardSummary';
import { RubricTabs } from './RubricTabs';
import { CamScannerLoadingOverlay } from './CamScannerLoadingOverlay';
import { SearchableSubjectSelect } from './SearchableSubjectSelect';
import { estimateCreditsPreFlight } from '../services/geminiApi';
import sampleEssayEvaluation from '../data/evaluations/sample-essay-evaluation.json';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Sparkles,
  ArrowLeft,
  Columns,
  Maximize2,
  Trash2,
  CheckCircle2,
  BookOpen,
  Calendar,
  Zap,
  HelpCircle,
  Plus
} from 'lucide-react';

const compressImageFile = (file, maxDimension = 1600, quality = 0.84) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result;
      if (!rawDataUrl) {
        resolve('');
        return;
      }

      const img = new window.Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } catch (_) {
          resolve(rawDataUrl);
        }
      };
      img.onerror = () => resolve(rawDataUrl);
      img.src = rawDataUrl;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

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

  // Hub Form State
  const [hubSubject, setHubSubject] = useState(activeSubject || 'English Essay');
  const [hubEssayMode, setHubEssayMode] = useState('full'); // 'full' | 'outline_only'
  const [hubInputType, setHubInputType] = useState('image'); // 'image' | 'text'
  const [hubTopic, setHubTopic] = useState('');
  const [hubText, setHubText] = useState('');
  const [hubImages, setHubImages] = useState([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const isEssay = (hubSubject || '').toLowerCase().includes('essay');
  const typedWordCount = hubText.trim() ? hubText.trim().split(/\s+/).length : 0;
  const preFlightEstimate = estimateCreditsPreFlight({
    isEssay,
    essayMode: isEssay ? hubEssayMode : 'full',
    activeTab: hubInputType,
    imageCount: hubImages.length,
    wordCount: typedWordCount
  });

  const canSubmitHub =
    !isEvaluating &&
    !isCompressing &&
    ((hubInputType === 'image' && hubImages.length > 0) ||
      (hubInputType === 'text' && hubText.trim().length > 0));

  const handleFiles = async (filesList) => {
    const files = Array.from(filesList || []).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    setIsCompressing(true);
    try {
      const compressedList = await Promise.all(files.map((file) => compressImageFile(file)));
      const valid = compressedList.filter(Boolean);
      setHubImages((prev) => [...prev, ...valid]);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer?.files?.length) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveImage = (index) => {
    setHubImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleHubSubmit = () => {
    if (!canSubmitHub) return;
    onSubmitEvaluation?.({
      subject: hubSubject,
      essayMode: isEssay ? hubEssayMode : 'full',
      examQuestion: hubTopic.trim(),
      mode: hubInputType === 'text' ? 'digital' : 'handwritten',
      text: hubInputType === 'text' ? hubText : '',
      imageArray: hubInputType === 'image' ? hubImages : []
    });
  };

  const handleTrySample = () => {
    onSelectEvaluation?.(sampleEssayEvaluation);
    setActiveView?.('report');
  };

  // If in HUB view, render SuperKalam Mains Practice Hub
  if (activeView === 'hub') {
    return (
      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-app)', padding: '28px 16px 60px' }}>
        <div className="sk-hub-container">
          {/* Hero Section */}
          <div className="sk-hub-hero">
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--accent-blue)',
                background: 'var(--accent-blue-soft)',
                padding: '4px 12px',
                borderRadius: '9999px',
                marginBottom: '10px'
              }}
            >
              <Sparkles size={13} color="var(--accent-blue)" />
              <span>FPSC Benchmark Mains Evaluation</span>
            </span>
            <h1>Instant Mains Evaluation in 60 Seconds</h1>
            <p>
              Upload handwritten answer sheet photos or paste typed text. Get line-by-line pedagogical callouts,
              grammatical precision, and 7-pillar qualitative examiner diagnostics.
            </p>
          </div>

          {/* Practice / Submission Studio Card */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
              marginBottom: '32px'
            }}
          >
            {/* Step 1: Subject & Essay Mode */}
            <div style={{ marginBottom: '18px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: '8px'
                }}
              >
                1. Select Examination Subject
              </label>
              <SearchableSubjectSelect
                value={hubSubject}
                onChange={(sub) => {
                  setHubSubject(sub);
                  setActiveSubject?.(sub);
                }}
                disabled={isEvaluating}
              />
            </div>

            {/* If Essay: Full Essay vs Outline Only Switcher */}
            {isEssay && (
              <div
                style={{
                  marginBottom: '18px',
                  background: 'var(--bg-app)',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Essay Evaluation Scope:
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent-blue)', fontWeight: 600 }}>
                    {hubEssayMode === 'outline_only' ? '⚡ 5-Pillar Outline & Thesis' : '🌟 7-Pillar Full Essay (100 Marks)'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setHubEssayMode('full')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: hubEssayMode === 'full' ? '2px solid var(--accent-blue)' : '1px solid var(--border)',
                      background: hubEssayMode === 'full' ? 'var(--accent-blue-soft)' : '#ffffff',
                      color: hubEssayMode === 'full' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                      fontWeight: hubEssayMode === 'full' ? 700 : 500,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>✍️</span>
                    <span>Full Essay (100 Marks)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHubEssayMode('outline_only')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: hubEssayMode === 'outline_only' ? '2px solid var(--accent-blue)' : '1px solid var(--border)',
                      background: hubEssayMode === 'outline_only' ? 'var(--accent-blue-soft)' : '#ffffff',
                      color: hubEssayMode === 'outline_only' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                      fontWeight: hubEssayMode === 'outline_only' ? 700 : 500,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>📝</span>
                    <span>Outline & Thesis Only</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Topic / Question */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  2. Essay Topic / Question Title
                </label>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  (Optional — Auto-detected if on Page 1)
                </span>
              </div>
              <input
                type="text"
                value={hubTopic}
                onChange={(e) => setHubTopic(e.target.value)}
                placeholder={
                  isEssay
                    ? 'e.g. "Global Warming and the Future of Pakistan: Challenges and Opportunities"'
                    : 'e.g. "Evaluate the socio-economic impacts of CPEC Phase II."'
                }
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-app)',
                  fontSize: '0.82rem',
                  color: 'var(--text-primary)',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Step 3: Input Mode Switcher (Upload Photos vs Type Text) */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <button
                  type="button"
                  onClick={() => setHubInputType('image')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: hubInputType === 'image' ? '1px solid var(--accent-blue)' : '1px solid var(--border)',
                    background: hubInputType === 'image' ? 'var(--accent-blue-soft)' : '#ffffff',
                    color: hubInputType === 'image' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    fontWeight: hubInputType === 'image' ? 700 : 500,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <ImageIcon size={14} />
                  <span>Upload Multi-Page Photos</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHubInputType('text')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: hubInputType === 'text' ? '1px solid var(--accent-blue)' : '1px solid var(--border)',
                    background: hubInputType === 'text' ? 'var(--accent-blue-soft)' : '#ffffff',
                    color: hubInputType === 'text' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    fontWeight: hubInputType === 'text' ? 700 : 500,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <FileText size={14} />
                  <span>Type / Paste Text</span>
                </button>
              </div>

              {/* Photo Dropzone */}
              {hubInputType === 'image' && (
                <div>
                  <div
                    className={`sk-dropzone ${isDragging ? 'drag-over' : ''}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        handleFiles(e.target.files);
                        e.target.value = '';
                      }}
                    />
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: 'var(--accent-blue-soft)',
                        color: 'var(--accent-blue)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px'
                      }}
                    >
                      <Upload size={22} />
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      Click or Drag Answer Sheet Photos (Page 1, 2, 3...)
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      JPEG, PNG, WebP supported • Automatic Camera Compression
                    </div>
                  </div>

                  {/* Thumbnail Previews */}
                  {hubImages.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Selected Answer Pages ({hubImages.length}):
                        </span>
                        <button
                          type="button"
                          onClick={() => setHubImages([])}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--fail-red)',
                            fontSize: '0.7rem',
                            cursor: 'pointer'
                          }}
                        >
                          Clear All
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
                        {hubImages.map((img, idx) => (
                          <div
                            key={idx}
                            style={{
                              position: 'relative',
                              width: '76px',
                              height: '96px',
                              borderRadius: '8px',
                              border: '1px solid var(--border)',
                              overflow: 'hidden',
                              flexShrink: 0,
                              background: '#fff'
                            }}
                          >
                            <img
                              src={img}
                              alt={`Page ${idx + 1}`}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <div
                              style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                background: 'rgba(0,0,0,0.65)',
                                color: '#ffffff',
                                fontSize: '0.62rem',
                                textAlign: 'center',
                                padding: '2px 0',
                                fontWeight: 600
                              }}
                            >
                              Page {idx + 1}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveImage(idx);
                              }}
                              style={{
                                position: 'absolute',
                                top: '2px',
                                right: '2px',
                                background: 'rgba(239, 68, 68, 0.9)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '18px',
                                height: '18px',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: 0
                              }}
                              title="Remove page"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Text Area */}
              {hubInputType === 'text' && (
                <div>
                  <textarea
                    rows={9}
                    value={hubText}
                    onChange={(e) => setHubText(e.target.value)}
                    placeholder="Paste or type your complete handwritten transcript, outline, or essay draft here..."
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-app)',
                      fontSize: '0.82rem',
                      fontFamily: 'inherit',
                      lineHeight: 1.6,
                      color: 'var(--text-primary)',
                      boxSizing: 'border-box',
                      resize: 'vertical'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {typedWordCount} Words
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border)'
              }}
            >
              {/* Left: Pre-flight Estimate & 1-Click Sample Tryout */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.74rem',
                    color: 'var(--accent-blue)',
                    background: 'var(--accent-blue-soft)',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600
                  }}
                >
                  <Zap size={12} />
                  <span>Est: ~{preFlightEstimate.estimatedCredits} Credits</span>
                </div>

                <button
                  type="button"
                  onClick={handleTrySample}
                  style={{
                    border: '1px solid var(--border)',
                    background: '#ffffff',
                    color: 'var(--text-secondary)',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    padding: '5px 12px',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease'
                  }}
                  title="Load and review pre-evaluated 100-mark sample essay"
                >
                  <Sparkles size={12} color="var(--accent-blue)" />
                  <span>Try Sample 100-Mark Essay</span>
                </button>
              </div>

              {/* Right: Primary Evaluate Button */}
              <button
                type="button"
                className="btn-superkalam-primary"
                onClick={handleHubSubmit}
                disabled={!canSubmitHub}
                style={{
                  padding: '10px 24px',
                  fontSize: '0.86rem',
                  opacity: canSubmitHub ? 1 : 0.6,
                  cursor: canSubmitHub ? 'pointer' : 'not-allowed'
                }}
              >
                <Sparkles size={16} />
                <span>Evaluate Answer</span>
              </button>
            </div>
          </div>

          {/* "My Evaluations" Section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  My Evaluations
                </h2>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    background: 'var(--bg-card-hover)',
                    color: 'var(--text-muted)'
                  }}
                >
                  {evaluationHistory.length}
                </span>
              </div>
            </div>

            {evaluationHistory.length === 0 ? (
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '32px',
                  textAlign: 'center',
                  color: 'var(--text-muted)'
                }}
              >
                <BookOpen size={28} color="var(--accent-blue)" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  No previous evaluations yet
                </div>
                <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>
                  Submit an answer above or click "Try Sample 100-Mark Essay" to see a live diagnostic report.
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                {evaluationHistory.map((item) => {
                  const isCur = item.id === evaluation?.id;
                  const hasScore = typeof item.overallScore === 'number';
                  const readiness = item.overallReadiness || item.gradeBand || (hasScore ? `${item.overallScore}/${item.maxScore || 20}` : 'Evaluated');

                  return (
                    <div
                      key={item.id}
                      className="sk-eval-card"
                      onClick={() => {
                        onSelectEvaluation?.(item);
                        setActiveView?.('report');
                      }}
                      style={{
                        borderColor: isCur ? 'var(--accent-blue)' : 'var(--border)',
                        background: isCur ? 'rgba(37, 122, 243, 0.02)' : '#ffffff'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              color: 'var(--accent-blue)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.03em'
                            }}
                          >
                            {item.subject || 'English Essay'}
                          </span>
                          <span
                            style={{
                              fontSize: '0.64rem',
                              marginLeft: '6px',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: 'var(--bg-app)',
                              color: 'var(--text-muted)'
                            }}
                          >
                            {item.essayMode === 'outline_only' ? 'Outline' : 'Full'}
                          </span>
                        </div>

                        {hasScore ? (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: '6px',
                              background: item.passStatus !== false ? 'rgba(29, 168, 72, 0.12)' : 'rgba(217, 52, 43, 0.12)',
                              color: item.passStatus !== false ? 'var(--pass-green)' : 'var(--fail-red)'
                            }}
                          >
                            {item.overallScore}/{item.maxScore || 20}
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.66rem',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: '6px',
                              background: 'var(--accent-blue-soft)',
                              color: 'var(--accent-blue)'
                            }}
                          >
                            Qualitative
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          fontSize: '0.84rem',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          marginBottom: '8px',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.35
                        }}
                      >
                        {item.topic || item.examQuestion || 'Candidate Answer Script'}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          <Calendar size={12} />
                          <span>{item.date || 'Recent'}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--accent-blue)' }}>
                            View Report →
                          </span>
                          {evaluationHistory.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteEvaluation?.(item.id);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '2px'
                              }}
                              title="Delete evaluation"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
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
