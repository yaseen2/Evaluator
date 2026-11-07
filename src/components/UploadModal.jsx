import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  X,
  Sparkles,
  Trash2,
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
  const [selectedSubject, setSelectedSubject] = useState(activeSubject || 'English Essay');
  const [examQuestion, setExamQuestion] = useState('');
  const [essayText, setEssayText] = useState('');
  const [imagePreviews, setImagePreviews] = useState([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isQuestionFocused, setIsQuestionFocused] = useState(false);
  const [isEssayFocused, setIsEssayFocused] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [errorWarning, setErrorWarning] = useState('');

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Sync subject if changed externally
  useEffect(() => {
    if (activeSubject) {
      setSelectedSubject(activeSubject);
    }
  }, [activeSubject]);

  const subjLower = (selectedSubject || '').toLowerCase();
  const isEssay = subjLower.includes('essay');

  const isReadyToSubmit =
    !isEvaluating &&
    !isCompressing &&
    ((activeTab === 'image' && imagePreviews.length > 0) ||
      (activeTab === 'text' && essayText.trim().length > 0));

  // Keyboard navigation for Lightbox
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
      setErrorWarning('Please enter your answer text.');
      return;
    }
    if (activeTab === 'image' && imagePreviews.length === 0) {
      setErrorWarning('Please upload at least 1 page photo.');
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
            maxWidth: '560px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '1.25rem 1.4rem',
            boxSizing: 'border-box',
            overflowY: 'auto'
          }}
        >
          {/* HEADER */}
          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid var(--border)',
              paddingBottom: '0.75rem',
              marginBottom: '1rem'
            }}
          >
            <h3
              style={{
                fontFamily: 'var(--font-sans)',
                fontWeight: 650,
                fontSize: '1rem',
                color: 'var(--text-primary)',
                margin: 0,
                letterSpacing: '-0.01em'
              }}
            >
              Submit Answer Script
            </h3>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* FORM FIELDS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* SUBJECT */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '5px'
                }}
              >
                Subject
              </label>
              <SearchableSubjectSelect
                value={selectedSubject}
                onChange={(newSubject) => setSelectedSubject(newSubject)}
              />
            </div>

            {/* TOPIC / QUESTION */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Topic or Question Prompt
                </label>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  Optional if written on script
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
                placeholder={isEssay ? 'e.g. Global Warming and the Future of Pakistan...' : 'e.g. Q2. Analyze the economic reforms...'}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  background: 'var(--bg-card)',
                  border: isQuestionFocused ? '1px solid var(--accent-blue)' : '1px solid var(--border-strong)',
                  boxShadow: isQuestionFocused ? '0 0 0 3px rgba(2, 132, 199, 0.1)' : 'none',
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
            </div>

            {/* TABS (Upload Photos / Paste Text) */}
            <div
              style={{
                display: 'flex',
                gap: '4px',
                background: 'var(--bg-card)',
                padding: '3px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)'
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
                  border: activeTab === 'image' ? '1px solid rgba(2, 132, 199, 0.3)' : '1px solid transparent',
                  boxShadow: activeTab === 'image' ? '0 1px 2px rgba(0, 0, 0, 0.06)' : 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.12s ease'
                }}
              >
                <ImageIcon size={14} />
                <span>Upload Photos</span>
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
                  border: activeTab === 'text' ? '1px solid rgba(2, 132, 199, 0.3)' : '1px solid transparent',
                  boxShadow: activeTab === 'text' ? '0 1px 2px rgba(0, 0, 0, 0.06)' : 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.12s ease'
                }}
              >
                <FileText size={14} />
                <span>Paste Text</span>
              </button>
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'image' ? (
              <div>
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
                    padding: imagePreviews.length > 0 ? '0.75rem 1rem' : '1.1rem 1rem',
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
                    <Upload size={18} color="var(--accent-blue)" style={{ marginBottom: '2px' }} />
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', margin: 0, fontWeight: 600 }}>
                      {isCompressing
                        ? 'Processing photos...'
                        : 'Click to upload photos or drag & drop'}
                    </p>
                    <span style={{ fontSize: '0.69rem', color: 'var(--text-muted)' }}>
                      JPEG, PNG, WebP
                    </span>
                  </label>
                </div>

                {/* Page Thumbnails */}
                {imagePreviews.length > 0 && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <div
                      style={{
                        fontSize: '0.7rem',
                        color: 'var(--text-secondary)',
                        marginBottom: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontWeight: 500
                      }}
                    >
                      <span>{imagePreviews.length} {imagePreviews.length === 1 ? 'page' : 'pages'} uploaded</span>
                      <button
                        type="button"
                        onClick={() => setImagePreviews([])}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--fail-red)',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          fontWeight: 500
                        }}
                      >
                        Remove all
                      </button>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(115px, 1fr))',
                        gap: '8px',
                        maxHeight: '160px',
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
                            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                            display: 'flex',
                            flexDirection: 'column'
                          }}
                        >
                          <div
                            onClick={() => setLightboxImage({ img, index: idx })}
                            style={{ position: 'relative', cursor: 'zoom-in', flex: 1, background: '#000' }}
                            title="Click to preview"
                          >
                            <img
                              src={img}
                              alt={`Page ${idx + 1}`}
                              style={{ width: '100%', height: '80px', objectFit: 'cover', display: 'block' }}
                            />
                            <div
                              style={{
                                position: 'absolute',
                                top: 3,
                                left: 3,
                                background: 'rgba(0,0,0,0.75)',
                                color: 'white',
                                fontSize: '0.62rem',
                                fontWeight: 600,
                                padding: '1px 5px',
                                borderRadius: '3px',
                                fontFamily: 'var(--font-mono)'
                              }}
                            >
                              P.{idx + 1}
                            </div>
                            <div
                              style={{
                                position: 'absolute',
                                top: 3,
                                right: 3,
                                background: 'rgba(0,0,0,0.65)',
                                color: 'white',
                                padding: '2px',
                                borderRadius: '3px'
                              }}
                            >
                              <Maximize2 size={10} />
                            </div>
                          </div>

                          <div
                            style={{
                              background: 'var(--bg-panel)',
                              borderTop: '1px solid var(--border)',
                              padding: '3px 4px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div style={{ display: 'flex', gap: '3px' }}>
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveImage(idx, 'left');
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: idx === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
                                  opacity: idx === 0 ? 0.3 : 1,
                                  cursor: idx === 0 ? 'default' : 'pointer',
                                  padding: '1px 3px',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                title="Move Left"
                              >
                                <ChevronLeft size={13} />
                              </button>
                              <button
                                type="button"
                                disabled={idx === imagePreviews.length - 1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveImage(idx, 'right');
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: idx === imagePreviews.length - 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                                  opacity: idx === imagePreviews.length - 1 ? 0.3 : 1,
                                  cursor: idx === imagePreviews.length - 1 ? 'default' : 'pointer',
                                  padding: '1px 3px',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                title="Move Right"
                              >
                                <ChevronRight size={13} />
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
                              title="Delete"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Text Area */
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Answer Text
                  </label>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {essayText.trim() ? `${essayText.trim().split(/\s+/).length} words` : '0 words'}
                  </span>
                </div>
                <textarea
                  rows={5}
                  placeholder="Paste your essay or answer text here..."
                  value={essayText}
                  onFocus={() => setIsEssayFocused(true)}
                  onBlur={() => setIsEssayFocused(false)}
                  onChange={(e) => {
                    setEssayText(e.target.value);
                    setErrorWarning('');
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: 'var(--bg-card)',
                    border: isEssayFocused ? '1px solid var(--accent-blue)' : '1px solid var(--border-strong)',
                    boxShadow: isEssayFocused ? '0 0 0 3px rgba(2, 132, 199, 0.1)' : 'none',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.81rem',
                    lineHeight: 1.5,
                    outline: 'none',
                    resize: 'none',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                  }}
                />
              </div>
            )}

            {/* Error message */}
            {errorWarning && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  padding: '6px 10px',
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

          {/* FOOTER */}
          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid var(--border)',
              paddingTop: '0.85rem',
              marginTop: '1.1rem'
            }}
          >
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {isEssay ? '100-Mark Essay (2 Credits)' : '20-Mark Question (1 Credit)'}
            </span>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                <span>{isEvaluating ? 'Evaluating...' : 'Evaluate Script'}</span>
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
            <span style={{ color: 'var(--accent-blue)', fontSize: '0.82rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              Page {lightboxImage.index + 1} of {imagePreviews.length}
            </span>
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', borderRadius: '50%', padding: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
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
                  justifyContent: 'center'
                }}
                title="Previous Page"
              >
                <ChevronLeft size={22} color="var(--accent-blue)" />
              </button>
            )}

            <img
              src={lightboxImage.img}
              alt={`Page ${lightboxImage.index + 1}`}
              style={{ maxWidth: '100%', maxHeight: '78vh', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--border-strong)' }}
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
                  justifyContent: 'center'
                }}
                title="Next Page"
              >
                <ChevronRight size={22} color="var(--accent-blue)" />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 20002 }}>
            {imagePreviews.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(15, 23, 42, 0.85)', padding: '6px 12px', borderRadius: '16px' }}>
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
                        width: isActive ? '16px' : '7px',
                        height: '7px',
                        borderRadius: isActive ? '4px' : '50%',
                        background: isActive ? 'var(--accent-blue)' : 'rgba(255, 255, 255, 0.3)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    />
                  );
                })}
              </div>
            )}
            <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>
              Click anywhere to close
            </span>
          </div>
        </div>
      )}
    </>
  );
};
