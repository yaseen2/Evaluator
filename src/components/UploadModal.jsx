import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  X,
  Sparkles,
  Trash2,
  HelpCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { SearchableSubjectSelect } from './SearchableSubjectSelect';

/**
 * Compresses & resizes high-resolution phone camera photos on the client side
 * so multi-page scripts upload rapidly without hitting memory or HTTP 413 payload limits.
 */
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

export const UploadModal = ({ isOpen, onClose, onSubmit, isEvaluating, activeSubject, setActiveSubject }) => {
  const [activeTab, setActiveTab] = useState('image'); // 'image' | 'text'
  const [selectedSubject, setSelectedSubject] = useState(activeSubject || 'Islamic History & Culture');
  const [examQuestion, setExamQuestion] = useState('');
  const [essayText, setEssayText] = useState('');
  const [imagePreviews, setImagePreviews] = useState([]); // Array of compressed base64 strings
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isQuestionFocused, setIsQuestionFocused] = useState(false);
  const [isEssayFocused, setIsEssayFocused] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null); // { img, index }
  const [errorWarning, setErrorWarning] = useState('');

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Sync subject if changed externally
  useEffect(() => {
    if (activeSubject) {
      setSelectedSubject(activeSubject);
    }
  }, [activeSubject]);

  // Dynamic Subject-Aware Questionnaire Labels & Hints
  const subjLower = (selectedSubject || '').toLowerCase();
  const isEssay = subjLower.includes('essay');
  const isPrecis = subjLower.includes('precis') || subjLower.includes('composition');

  const questionLabel = isEssay
    ? 'Selected Essay Topic / Title (100 Marks Paper)'
    : isPrecis
    ? 'Precis / Composition Section Prompt (100 Marks Paper)'
    : 'FPSC Exam Question / Prompt (20 Marks Question)';

  const questionPlaceholder = isEssay
    ? 'e.g. "Global Warming and the Future of Pakistan: Challenges and Opportunities"'
    : isPrecis
    ? 'e.g. "Write a Précis of the given passage in 1/3rd length and suggest a suitable title."'
    : 'e.g. Q2. Examine the economic conditions of Pre-Islamic Arabia, focusing on pastoralism, trade caravans, and usury.';

  const questionHelpText = isEssay
    ? 'FPSC English Essay (100 Marks) is evaluated on Formal Outline, Thesis Clarity, Argumentative Depth, Cohesive Transitions (zero body headings), & Register.'
    : isPrecis
    ? 'English Precis & Composition is evaluated on the 1/3rd Length Rule, Indirect Speech, Thematic Fidelity, Title Precision, & Grammar.'
    : '20-Mark CSS questions are evaluated on Substantive Intro (~100w), Self-Explanatory Headings, Structural Causality ("Why & How"), Visuals, & Scholarly Citations.';

  const isReadyToSubmit =
    !isEvaluating &&
    !isCompressing &&
    ((activeTab === 'image' && imagePreviews.length > 0) ||
      (activeTab === 'text' && essayText.trim().length > 0));

  // Keyboard navigation for Lightbox (ArrowLeft / ArrowRight / Escape)
  useEffect(() => {
    if (!lightboxImage) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        handleLightboxPrev();
      } else if (e.key === 'ArrowRight') {
        handleLightboxNext();
      } else if (e.key === 'Escape') {
        setLightboxImage(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxImage, imagePreviews]);

  if (!isOpen) return null;

  const processFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;

    setIsCompressing(true);
    setErrorWarning('');
    try {
      const compressedList = await Promise.all(files.map((file) => compressImageFile(file)));
      const validImages = compressedList.filter(Boolean);
      setImagePreviews((prev) => [...prev, ...validImages]);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleMultipleImagesChange = (e) => {
    processFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer?.files?.length) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveImage = (index) => {
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    if (lightboxImage && lightboxImage.index === index) {
      setLightboxImage(null);
    }
  };

  const handleMoveImage = (index, direction) => {
    const newIndex = direction === 'left' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= imagePreviews.length) return;

    const updated = [...imagePreviews];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    setImagePreviews(updated);
  };

  const handleLightboxNext = () => {
    if (!lightboxImage || imagePreviews.length <= 1) return;
    const nextIdx = (lightboxImage.index + 1) % imagePreviews.length;
    setLightboxImage({ img: imagePreviews[nextIdx], index: nextIdx });
  };

  const handleLightboxPrev = () => {
    if (!lightboxImage || imagePreviews.length <= 1) return;
    const prevIdx = (lightboxImage.index - 1 + imagePreviews.length) % imagePreviews.length;
    setLightboxImage({ img: imagePreviews[prevIdx], index: prevIdx });
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 40;

    if (distance > minSwipeDistance) {
      handleLightboxNext();
    } else if (distance < -minSwipeDistance) {
      handleLightboxPrev();
    }

    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  const handleSubmit = () => {
    if (activeTab === 'text' && !essayText.trim()) {
      setErrorWarning('Please paste your essay or answer text before proceeding.');
      return;
    }
    if (activeTab === 'image' && imagePreviews.length === 0) {
      setErrorWarning('Please select at least 1 answer sheet photo to upload.');
      return;
    }

    if (setActiveSubject) {
      setActiveSubject(selectedSubject);
    }

    onSubmit({
      mode: activeTab === 'text' ? 'digital' : 'handwritten',
      subject: selectedSubject,
      examQuestion: examQuestion.trim(),
      text: activeTab === 'text' ? essayText : '',
      imageArray: activeTab === 'image' ? imagePreviews : []
    });
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-card"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '92%',
            maxWidth: '620px',
            height: 'auto',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '1.25rem 1.35rem',
            boxSizing: 'border-box',
            overflow: 'visible'
          }}
        >
          {/* FIXED HEADER */}
          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '1px solid var(--border)',
              paddingBottom: '0.75rem',
              marginBottom: '0.85rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  background: 'rgba(2, 132, 199, 0.1)',
                  border: '1px solid rgba(2, 132, 199, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <FileText size={17} color="var(--accent-blue)" />
              </div>
              <div>
                <h3
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontWeight: 700,
                    fontSize: '1.02rem',
                    color: 'var(--text-primary)',
                    margin: 0,
                    letterSpacing: '-0.01em'
                  }}
                >
                  Submit Candidate Answer Script
                </h3>
                <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Configure subject & question details, then upload your handwritten pages or typed text.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid transparent',
                borderRadius: '6px',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* MODAL BODY — Full-width alignment so dropdown never clips or leaks background text */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* STEP 1: SUBJECT SELECTOR */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  1. FPSC CSS Examination Subject
                </label>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  47 Official Compulsory & Optional Subjects
                </span>
              </div>
              <SearchableSubjectSelect
                value={selectedSubject}
                onChange={(newSubject) => setSelectedSubject(newSubject)}
              />
            </div>

            {/* STEP 2: QUESTION / TOPIC PROMPT */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  2. {questionLabel}
                </label>
                <span style={{ fontSize: '0.68rem', color: 'var(--accent-blue)', fontWeight: 500 }}>
                  Auto-detected if written on Page 1
                </span>
              </div>
              <textarea
                rows={2}
                value={examQuestion}
                onFocus={() => setIsQuestionFocused(true)}
                onBlur={() => setIsQuestionFocused(false)}
                onChange={(e) => {
                  setExamQuestion(e.target.value);
                  setErrorWarning('');
                }}
                placeholder={questionPlaceholder}
                style={{
                  width: '100%',
                  padding: '8px 11px',
                  background: 'var(--bg-card)',
                  border: isQuestionFocused ? '1px solid var(--accent-blue)' : '1px solid var(--border-strong)',
                  boxShadow: isQuestionFocused ? '0 0 0 3px rgba(2, 132, 199, 0.12)' : 'none',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.8rem',
                  lineHeight: 1.45,
                  outline: 'none',
                  resize: 'none',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                }}
              />
              <p
                style={{
                  fontSize: '0.68rem',
                  color: 'var(--text-muted)',
                  margin: '5px 0 0 0',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '5px',
                  lineHeight: 1.4
                }}
              >
                <HelpCircle size={12} color="var(--accent-blue)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{questionHelpText}</span>
              </p>
            </div>

            {/* STEP 3: SCRIPT INPUT METHOD TABS (Crisp Segmented Control in both Light & Dark Mode) */}
            <div
              style={{
                display: 'flex',
                gap: '6px',
                background: 'var(--bg-card)',
                padding: '4px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-strong)'
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setActiveTab('image');
                  setErrorWarning('');
                }}
                style={{
                  flex: 1,
                  background: activeTab === 'image' ? 'var(--bg-panel)' : 'transparent',
                  color: activeTab === 'image' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  border: activeTab === 'image' ? '1px solid rgba(2, 132, 199, 0.35)' : '1px solid transparent',
                  boxShadow: activeTab === 'image' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <ImageIcon size={14} />
                <span>Upload Multi-Page Photos</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('text');
                  setErrorWarning('');
                }}
                style={{
                  flex: 1,
                  background: activeTab === 'text' ? 'var(--bg-panel)' : 'transparent',
                  color: activeTab === 'text' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  border: activeTab === 'text' ? '1px solid rgba(2, 132, 199, 0.35)' : '1px solid transparent',
                  boxShadow: activeTab === 'text' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <FileText size={14} />
                <span>Type / Paste Answer Text</span>
              </button>
            </div>

            {/* Tab 1: Multi-Page Photo Upload */}
            {activeTab === 'image' ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    3. Upload Answer Sheet Pages & Sequence
                  </label>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      color: imagePreviews.length > 0 ? 'var(--pass-green)' : 'var(--accent-blue)',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 600
                    }}
                  >
                    {isCompressing
                      ? 'Optimizing images...'
                      : `${imagePreviews.length} ${imagePreviews.length === 1 ? 'Page' : 'Pages'} Selected`}
                  </span>
                </div>

                {/* Drag & Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  style={{
                    border: isDragging ? '1.5px dashed var(--accent-blue)' : '1.5px dashed var(--border-strong)',
                    borderRadius: 'var(--radius-md)',
                    padding: imagePreviews.length > 0 ? '0.65rem' : '1.1rem 1rem',
                    textAlign: 'center',
                    background: isDragging ? 'rgba(2, 132, 199, 0.06)' : 'var(--bg-card)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleMultipleImagesChange}
                    style={{ display: 'none' }}
                    id="multi-page-upload"
                  />
                  <label
                    htmlFor="multi-page-upload"
                    style={{
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'rgba(2, 132, 199, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '2px'
                      }}
                    >
                      <Upload size={16} color="var(--accent-blue)" />
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', margin: 0, fontWeight: 600 }}>
                      {isCompressing
                        ? 'Optimizing high-resolution pages for fast OCR...'
                        : 'Click or Drag Answer Sheet Photos (Page 1, 2, 3...)'}
                    </p>
                    <span style={{ fontSize: '0.69rem', color: 'var(--text-muted)' }}>
                      JPEG, PNG, WebP supported • Auto-compressed for high-speed Vision OCR
                    </span>
                  </label>
                </div>

                {/* Page Cards Grid with Magnify & Reordering */}
                {imagePreviews.length > 0 && (
                  <div style={{ marginTop: '0.6rem' }}>
                    <div
                      style={{
                        fontSize: '0.68rem',
                        color: 'var(--text-muted)',
                        marginBottom: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <span>Re-order sequence using ◄ ► arrows, or click page to zoom:</span>
                      <button
                        type="button"
                        onClick={() => setImagePreviews([])}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--fail-red)',
                          fontSize: '0.68rem',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        Clear All
                      </button>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))',
                        gap: '8px',
                        maxHeight: '175px',
                        overflowY: 'auto',
                        padding: '2px'
                      }}
                    >
                      {imagePreviews.map((img, idx) => (
                        <div
                          key={idx}
                          style={{
                            position: 'relative',
                            border: '1px solid var(--border-strong)',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            background: '#0f172a',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                            display: 'flex',
                            flexDirection: 'column'
                          }}
                        >
                          <div
                            onClick={() => setLightboxImage({ img, index: idx })}
                            style={{ position: 'relative', cursor: 'zoom-in', flex: 1, background: '#000' }}
                            title="Click to inspect full page"
                          >
                            <img
                              src={img}
                              alt={`Page ${idx + 1}`}
                              style={{ width: '100%', height: '96px', objectFit: 'cover', display: 'block' }}
                            />

                            <div
                              style={{
                                position: 'absolute',
                                top: 4,
                                left: 4,
                                background: 'rgba(15, 23, 42, 0.88)',
                                color: '#38bdf8',
                                fontSize: '0.64rem',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontFamily: 'var(--font-mono)',
                                border: '1px solid rgba(56, 189, 248, 0.35)'
                              }}
                            >
                              Page {idx + 1}
                            </div>

                            <div
                              style={{
                                position: 'absolute',
                                top: 4,
                                right: 4,
                                background: 'rgba(15, 23, 42, 0.8)',
                                color: 'white',
                                padding: '3px',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <Maximize2 size={11} />
                            </div>
                          </div>

                          <div
                            style={{
                              background: 'var(--bg-panel)',
                              borderTop: '1px solid var(--border)',
                              padding: '4px 6px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveImage(idx, 'left');
                                }}
                                style={{
                                  background: idx === 0 ? 'transparent' : 'var(--bg-card)',
                                  border: '1px solid var(--border)',
                                  color: idx === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
                                  opacity: idx === 0 ? 0.45 : 1,
                                  borderRadius: '4px',
                                  cursor: idx === 0 ? 'default' : 'pointer',
                                  padding: '2px 5px',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                title="Move Left"
                              >
                                <ChevronLeft size={12} />
                              </button>
                              <button
                                type="button"
                                disabled={idx === imagePreviews.length - 1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveImage(idx, 'right');
                                }}
                                style={{
                                  background: idx === imagePreviews.length - 1 ? 'transparent' : 'var(--bg-card)',
                                  border: '1px solid var(--border)',
                                  color: idx === imagePreviews.length - 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                                  opacity: idx === imagePreviews.length - 1 ? 0.45 : 1,
                                  borderRadius: '4px',
                                  cursor: idx === imagePreviews.length - 1 ? 'default' : 'pointer',
                                  padding: '2px 5px',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                title="Move Right"
                              >
                                <ChevronRight size={12} />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveImage(idx);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--fail-red)',
                                cursor: 'pointer',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              title="Remove Page"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Tab 2: Text Area */
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    3. Paste Full Essay or Answer Text
                  </label>
                  <span style={{ fontSize: '0.68rem', color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {essayText.trim() ? `${essayText.trim().split(/\s+/).length} words` : '0 words'}
                  </span>
                </div>
                <textarea
                  rows={5}
                  placeholder="Paste your complete CSS essay or 20-mark answer script text here..."
                  value={essayText}
                  onFocus={() => setIsEssayFocused(true)}
                  onBlur={() => setIsEssayFocused(false)}
                  onChange={(e) => {
                    setEssayText(e.target.value);
                    setErrorWarning('');
                  }}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    background: 'var(--bg-card)',
                    border: isEssayFocused ? '1px solid var(--accent-blue)' : '1px solid var(--border-strong)',
                    boxShadow: isEssayFocused ? '0 0 0 3px rgba(2, 132, 199, 0.12)' : 'none',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.81rem',
                    lineHeight: 1.5,
                    outline: 'none',
                    resize: 'vertical',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                  }}
                />
              </div>
            )}

            {/* Warning Banner */}
            {errorWarning && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '7px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.74rem',
                  color: 'var(--fail-red)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                <span>{errorWarning}</span>
              </div>
            )}
          </div>

          {/* FIXED FOOTER BUTTONS */}
          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid var(--border)',
              paddingTop: '0.75rem',
              marginTop: '0.85rem'
            }}
          >
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: isReadyToSubmit ? 'var(--pass-green)' : 'var(--warning-amber)'
                }}
              />
              <span>
                {isEssay
                  ? '100-Mark Essay Rubric (2 Credits)'
                  : isPrecis
                  ? '100-Mark Précis Rubric (1 Credit)'
                  : '20-Mark FPSC Rubric (1 Credit)'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button type="button" className="btn-minimal" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-accent"
                onClick={handleSubmit}
                disabled={isEvaluating || isCompressing}
                style={{
                  opacity: isReadyToSubmit ? 1 : 0.82
                }}
              >
                <Sparkles size={13} />
                <span>
                  {isEvaluating
                    ? 'Evaluating...'
                    : activeTab === 'image' && imagePreviews.length > 1
                    ? `Evaluate ${imagePreviews.length} Pages`
                    : 'Evaluate Script'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* LIGHTBOX OVERLAY */}
      {lightboxImage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(4, 6, 10, 0.94)',
            backdropFilter: 'blur(12px)',
            zIndex: 20000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            touchAction: 'pan-y'
          }}
          onClick={() => setLightboxImage(null)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div style={{ width: '100%', maxWidth: '850px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 20002 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', padding: '5px 14px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 4px 15px rgba(0,0,0,0.4)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Candidate Script
              </span>
              <span style={{ color: 'var(--border-strong)', fontSize: '0.8rem' }}>•</span>
              <span style={{ color: 'var(--accent-blue)', fontSize: '0.82rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                Page {lightboxImage.index + 1} of {imagePreviews.length}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', borderRadius: '50%', padding: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.4)' }}
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 'auto', maxWidth: '850px', maxHeight: '78vh', margin: 'auto', position: 'relative' }}
          >
            {imagePreviews.length > 1 && (
              <button
                type="button"
                className="desktop-only-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLightboxPrev();
                }}
                style={{
                  position: 'absolute',
                  left: '-54px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 20003,
                  background: 'rgba(15, 23, 42, 0.92)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  color: 'var(--accent-blue)',
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.6)'
                }}
                title="Previous Page (Left Arrow)"
              >
                <ChevronLeft size={22} color="var(--accent-blue)" />
              </button>
            )}

            <img
              src={lightboxImage.img}
              alt={`Page ${lightboxImage.index + 1}`}
              style={{ maxWidth: '100%', maxHeight: '78vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 25px 60px rgba(0,0,0,0.8)', border: '1px solid var(--border-strong)' }}
            />

            {imagePreviews.length > 1 && (
              <button
                type="button"
                className="desktop-only-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLightboxNext();
                }}
                style={{
                  position: 'absolute',
                  right: '-54px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 20003,
                  background: 'rgba(15, 23, 42, 0.92)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  color: 'var(--accent-blue)',
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.6)'
                }}
                title="Next Page (Right Arrow)"
              >
                <ChevronRight size={22} color="var(--accent-blue)" />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 20002, paddingBottom: '4px' }}>
            {imagePreviews.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', padding: '6px 12px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.12)', boxShadow: '0 4px 15px rgba(0,0,0,0.4)' }}>
                {imagePreviews.map((_, idx) => {
                  const isActive = idx === lightboxImage.index;
                  return (
                    <div
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxImage({ img: imagePreviews[idx], index: idx });
                      }}
                      style={{
                        width: isActive ? '18px' : '8px',
                        height: '8px',
                        borderRadius: isActive ? '4px' : '50%',
                        background: isActive ? 'var(--accent-blue)' : 'rgba(255, 255, 255, 0.3)',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                      }}
                      title={`Go to Page ${idx + 1}`}
                    />
                  );
                })}
              </div>
            )}
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
              Swipe left / right on mobile • Click anywhere to close
            </span>
          </div>
        </div>
      )}
    </>
  );
};
