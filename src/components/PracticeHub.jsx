import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Globe,
  TrendingUp,
  Search,
  CheckCircle2,
  Trash2,
  Upload,
  Camera,
  Sparkles,
  Zap,
  BookOpen,
  Plus,
  ChevronRight,
  ArrowRight,
  X,
  FileCheck,
  ChevronLeft,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { OFFICIAL_FPSC_SUBJECTS } from './SearchableSubjectSelect';
import { estimateCreditsPreFlight } from '../services/geminiApi';
import { CamScannerLoadingOverlay } from './CamScannerLoadingOverlay';
import sampleEssayEvaluation from '../data/evaluations/sample-essay-evaluation.json';

/**
 * Compresses & resizes high-resolution camera photos on client-side
 */
const compressImageFile = (file, maxDimension = 1600, quality = 0.84) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result;
      if (!rawDataUrl) {
        resolve({ dataUrl: '', name: file.name, size: file.size });
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
          resolve({
            dataUrl: compressedDataUrl,
            name: file.name,
            size: Math.round(compressedDataUrl.length * 0.75)
          });
        } catch (_) {
          resolve({ dataUrl: rawDataUrl, name: file.name, size: file.size });
        }
      };
      img.onerror = () => resolve({ dataUrl: rawDataUrl, name: file.name, size: file.size });
      img.src = rawDataUrl;
    };
    reader.onerror = () => resolve({ dataUrl: '', name: file.name, size: 0 });
    reader.readAsDataURL(file);
  });
};

const formatFileSize = (bytes) => {
  if (!bytes) return '1.2 MB';
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return 'Recently';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const diffMs = Date.now() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

export const PracticeHub = ({
  activeSubject = 'English Essay',
  setActiveSubject,
  onSubmitEvaluation,
  isEvaluating = false,
  pipelineProgress = null,
  evaluationHistory = [],
  onSelectEvaluation,
  onDeleteEvaluation,
  onTrySample,
  user,
  userProfile,
  onOpenPricing,
  onOpenAuth,
  setActiveView
}) => {
  const [selectedSubject, setSelectedSubject] = useState(activeSubject || 'English Essay');
  const [essayMode, setEssayMode] = useState('full'); // 'full' | 'outline_only'
  const [inputType, setInputType] = useState('image'); // 'image' | 'text'
  const [examQuestion, setExamQuestion] = useState('');
  const [typedText, setTypedText] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [searchSubject, setSearchSubject] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const fileInputRef = useRef(null);
  const searchWrapperRef = useRef(null);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isEssay = selectedSubject.toLowerCase().includes('essay');
  const typedWords = typedText.trim() ? typedText.trim().split(/\s+/).length : 0;

  const preFlight = estimateCreditsPreFlight({
    isEssay,
    essayMode: isEssay ? essayMode : 'full',
    activeTab: inputType,
    imageCount: uploadedFiles.length,
    wordCount: typedWords
  });

  const canSubmit =
    !isEvaluating &&
    !isCompressing &&
    ((inputType === 'image' && uploadedFiles.length > 0) ||
      (inputType === 'text' && typedText.trim().length > 0));

  const handleSelectSubject = (subj) => {
    setSelectedSubject(subj);
    setActiveSubject?.(subj);
    setIsSearchOpen(false);
    setSearchSubject('');
  };

  const handleFiles = async (filesList) => {
    const files = Array.from(filesList || []).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    setIsCompressing(true);
    try {
      const compressedList = await Promise.all(files.map((file) => compressImageFile(file)));
      const valid = compressedList.filter((item) => item.dataUrl);
      setUploadedFiles((prev) => [...prev, ...valid]);
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

  const handleRemovePage = (index) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMovePage = (index, direction) => {
    setUploadedFiles((prev) => {
      const next = [...prev];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmitEvaluation?.({
      subject: selectedSubject,
      essayMode: isEssay ? essayMode : 'full',
      examQuestion: examQuestion.trim(),
      mode: inputType === 'text' ? 'digital' : 'handwritten',
      text: inputType === 'text' ? typedText : '',
      imageArray: inputType === 'image' ? uploadedFiles.map((f) => f.dataUrl) : []
    });
  };

  const filteredSearchSubjects = OFFICIAL_FPSC_SUBJECTS.filter((s) =>
    s.name.toLowerCase().includes(searchSubject.toLowerCase()) ||
    s.group.toLowerCase().includes(searchSubject.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/60 text-slate-900 selection:bg-blue-100 selection:text-blue-900 min-h-[calc(100vh-64px)] py-8 px-4 sm:px-6 lg:px-8 antialiased">
      <div className="max-w-6xl mx-auto">
        
        {/* Top Header Banner */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-[28px] sm:text-[34px] md:text-[38px] font-bold text-slate-900 tracking-tight mb-1">
              AI Essay &amp; Paper Evaluation Hub
            </h1>
            <p className="font-sans text-[14.5px] sm:text-[15.5px] text-slate-600 max-w-2xl">
              Submit your handwritten CSS/PMS answer sheets for multi-agent academic grading, examiner rubrics critique, and actionable score breakdowns.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onTrySample}
              className="bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-blue-300 text-slate-700 hover:text-[#1d6ef2] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <BookOpen size={16} className="text-[#1d6ef2]" />
              <span>Sample Evaluation</span>
            </button>
          </div>
        </div>

        {/* Main 2-Step Evaluation Submission Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden mb-12">
          
          {/* STEP 1: Exam & Subject Selection */}
          <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/30">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-[#1d6ef2] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  1
                </div>
                <h2 className="font-sans text-[19px] sm:text-[21px] font-bold text-slate-900">
                  Exam &amp; Subject Selection
                </h2>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Select target paper
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left 2 Cols: Subject Tiles & Search */}
              <div className="lg:col-span-2 space-y-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Choose Subject
                </label>

                {/* 3 Prominent Quick Subject Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  
                  {/* English Essay */}
                  <div
                    onClick={() => handleSelectSubject('English Essay')}
                    className={`cursor-pointer rounded-2xl p-4 flex flex-col justify-between relative transition-all duration-200 select-none ${
                      selectedSubject === 'English Essay'
                        ? 'border-2 border-[#1d6ef2] bg-blue-50/40 shadow-xs ring-2 ring-blue-100'
                        : 'border border-slate-200/90 bg-white hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    {selectedSubject === 'English Essay' && (
                      <CheckCircle2 size={18} className="absolute top-3.5 right-3.5 text-[#1d6ef2] fill-current" />
                    )}
                    <FileText size={24} className={selectedSubject === 'English Essay' ? 'text-[#1d6ef2] mb-3' : 'text-slate-400 mb-3'} />
                    <div>
                      <h3 className="font-sans font-bold text-[15.5px] text-slate-900 mb-0.5">
                        English Essay
                      </h3>
                      <p className="text-xs text-slate-500">
                        CSS Compulsory • 100 Marks
                      </p>
                    </div>
                  </div>

                  {/* Pakistan Affairs */}
                  <div
                    onClick={() => handleSelectSubject('Pakistan Affairs')}
                    className={`cursor-pointer rounded-2xl p-4 flex flex-col justify-between relative transition-all duration-200 select-none ${
                      selectedSubject === 'Pakistan Affairs'
                        ? 'border-2 border-[#1d6ef2] bg-blue-50/40 shadow-xs ring-2 ring-blue-100'
                        : 'border border-slate-200/90 bg-white hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    {selectedSubject === 'Pakistan Affairs' && (
                      <CheckCircle2 size={18} className="absolute top-3.5 right-3.5 text-[#1d6ef2] fill-current" />
                    )}
                    <Globe size={24} className={selectedSubject === 'Pakistan Affairs' ? 'text-[#1d6ef2] mb-3' : 'text-slate-400 mb-3'} />
                    <div>
                      <h3 className="font-sans font-bold text-[15.5px] text-slate-900 mb-0.5">
                        Pakistan Affairs
                      </h3>
                      <p className="text-xs text-slate-500">
                        CSS Compulsory • 100 Marks
                      </p>
                    </div>
                  </div>

                  {/* Current Affairs */}
                  <div
                    onClick={() => handleSelectSubject('Current Affairs')}
                    className={`cursor-pointer rounded-2xl p-4 flex flex-col justify-between relative transition-all duration-200 select-none ${
                      selectedSubject === 'Current Affairs'
                        ? 'border-2 border-[#1d6ef2] bg-blue-50/40 shadow-xs ring-2 ring-blue-100'
                        : 'border border-slate-200/90 bg-white hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    {selectedSubject === 'Current Affairs' && (
                      <CheckCircle2 size={18} className="absolute top-3.5 right-3.5 text-[#1d6ef2] fill-current" />
                    )}
                    <TrendingUp size={24} className={selectedSubject === 'Current Affairs' ? 'text-[#1d6ef2] mb-3' : 'text-slate-400 mb-3'} />
                    <div>
                      <h3 className="font-sans font-bold text-[15.5px] text-slate-900 mb-0.5">
                        Current Affairs
                      </h3>
                      <p className="text-xs text-slate-500">
                        CSS Compulsory • 100 Marks
                      </p>
                    </div>
                  </div>

                </div>

                {/* Custom Searchable Subject Dropdown Input */}
                <div ref={searchWrapperRef} className="relative mt-2">
                  <div className="relative flex items-center">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Search size={17} />
                    </span>
                    <input
                      type="text"
                      value={searchSubject}
                      onChange={(e) => {
                        setSearchSubject(e.target.value);
                        setIsSearchOpen(true);
                      }}
                      onFocus={() => setIsSearchOpen(true)}
                      placeholder={
                        selectedSubject && !['English Essay', 'Pakistan Affairs', 'Current Affairs'].includes(selectedSubject)
                          ? `Selected: ${selectedSubject} (Click to change)`
                          : 'Search other CSS / PMS subjects (e.g., International Relations, Criminology, Public Admin)...'
                      }
                      className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200/90 rounded-xl text-[13.5px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#1d6ef2] focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
                    />
                    {searchSubject && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchSubject('');
                          setIsSearchOpen(false);
                        }}
                        className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-1"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>

                  {/* Dropdown Options */}
                  {isSearchOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 max-h-60 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-xl z-30 py-1 divide-y divide-slate-100">
                      {filteredSearchSubjects.length === 0 ? (
                        <div className="p-3 text-xs text-slate-500 text-center">
                          No matching subject found. You can still type your topic in the question field.
                        </div>
                      ) : (
                        filteredSearchSubjects.slice(0, 15).map((subj) => (
                          <div
                            key={subj.code}
                            onClick={() => handleSelectSubject(subj.name)}
                            className="px-4 py-2.5 hover:bg-blue-50/70 cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <div>
                              <span className="text-[13.5px] font-semibold text-slate-800 block">
                                {subj.name}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {subj.group}
                              </span>
                            </div>
                            {selectedSubject === subj.name && (
                              <CheckCircle2 size={16} className="text-[#1d6ef2]" />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Active Selected Non-Standard Badge */}
                  {!['English Essay', 'Pakistan Affairs', 'Current Affairs'].includes(selectedSubject) && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#1d6ef2] border border-blue-200 text-xs font-semibold">
                      <span>Active Subject:</span>
                      <strong>{selectedSubject}</strong>
                      <button
                        type="button"
                        onClick={() => handleSelectSubject('English Essay')}
                        className="ml-1 text-blue-500 hover:text-blue-700"
                        title="Reset to English Essay"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right 1 Col: Evaluation Scope Pill Toggle */}
              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Evaluation Scope
                </label>

                <div className="bg-slate-50/80 border border-slate-200/90 p-2 rounded-2xl flex flex-col gap-2.5 h-[calc(100%-2rem)] justify-center">
                  
                  {/* Full 100-Mark Essay */}
                  <div
                    onClick={() => setEssayMode('full')}
                    className={`cursor-pointer w-full text-left p-3.5 rounded-xl transition-all flex items-center justify-between select-none ${
                      essayMode === 'full'
                        ? 'bg-white text-[#1d6ef2] font-semibold shadow-xs border border-blue-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                    }`}
                  >
                    <div>
                      <div className="text-[14px] font-bold text-slate-900">
                        {isEssay ? 'Full 100-Mark Essay' : 'Full Mains Question (20 Marks)'}
                      </div>
                      <div className="text-xs text-slate-500 font-normal mt-0.5">
                        {isEssay ? 'Complete 7-pillar DAG rubric check' : 'Comprehensive examiner diagnostics'}
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      essayMode === 'full' ? 'border-[#1d6ef2]' : 'border-slate-300'
                    }`}>
                      {essayMode === 'full' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#1d6ef2]"></div>
                      )}
                    </div>
                  </div>

                  {/* Outline & Thesis Only */}
                  <div
                    onClick={() => setEssayMode('outline_only')}
                    className={`cursor-pointer w-full text-left p-3.5 rounded-xl transition-all flex items-center justify-between select-none ${
                      essayMode === 'outline_only'
                        ? 'bg-white text-[#1d6ef2] font-semibold shadow-xs border border-blue-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                    }`}
                  >
                    <div>
                      <div className="text-[14px] font-bold text-slate-900">
                        Outline &amp; Thesis Only
                      </div>
                      <div className="text-xs text-slate-500 font-normal mt-0.5">
                        30s rapid structural diagnostic
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      essayMode === 'outline_only' ? 'border-[#1d6ef2]' : 'border-slate-300'
                    }`}>
                      {essayMode === 'outline_only' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#1d6ef2]"></div>
                      )}
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>

          {/* STEP 2: Paper Submission Area */}
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-[#1d6ef2] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  2
                </div>
                <h2 className="font-sans text-[19px] sm:text-[21px] font-bold text-slate-900">
                  Paper Submission Area
                </h2>
              </div>

              {/* Dual-tab Toggle: Photo vs Text */}
              <div className="bg-slate-100 p-1 rounded-xl flex items-center self-start sm:self-auto border border-slate-200/80 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setInputType('image')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                    inputType === 'image'
                      ? 'bg-white text-[#1d6ef2] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 bg-transparent'
                  }`}
                >
                  <Camera size={14} />
                  <span>CamScanner Photo Upload</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputType('text')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                    inputType === 'text'
                      ? 'bg-white text-[#1d6ef2] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 bg-transparent'
                  }`}
                >
                  <FileText size={14} />
                  <span>Direct Text / Transcript Paste</span>
                </button>
              </div>
            </div>

            {/* Topic / Question Input (Optional but helpful) */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Exam Question or Essay Title <span className="text-slate-400 font-normal lowercase">(optional)</span>
              </label>
              <input
                type="text"
                value={examQuestion}
                onChange={(e) => setExamQuestion(e.target.value)}
                placeholder="e.g., 'Globalization and its cultural impact on developing nations' or 'FPSC 2024 Paper II Q.4'..."
                className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-[13.5px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#1d6ef2] focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            {/* Photo Upload Panel */}
            {inputType === 'image' ? (
              <div className="space-y-6">
                
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer relative group ${
                    isDragging
                      ? 'border-[#1d6ef2] bg-blue-50/50 ring-4 ring-blue-100'
                      : 'border-slate-200/90 hover:border-[#1d6ef2] bg-slate-50/40 hover:bg-blue-50/20'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                  />

                  <div className="max-w-md mx-auto flex flex-col items-center">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#1d6ef2] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-xs">
                      <Camera size={30} />
                    </div>
                    <h3 className="font-sans font-bold text-[18px] text-slate-900 mb-1.5">
                      Drag &amp; Drop multi-page handwritten sheets
                    </h3>
                    <p className="text-[13.5px] text-slate-500 mb-5 leading-relaxed">
                      Supports PNG, JPG, or PDF scanned via CamScanner, Genius Scan, or mobile camera.
                    </p>
                    <button
                      type="button"
                      disabled={isCompressing}
                      className="bg-white border border-slate-200/90 hover:border-[#1d6ef2] text-slate-700 hover:text-[#1d6ef2] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer inline-flex items-center gap-2"
                    >
                      <Upload size={15} />
                      <span>{isCompressing ? 'Compressing photos...' : 'Browse Files from Device'}</span>
                    </button>
                  </div>
                </div>

                {/* Uploaded Sheets Thumbnail Gallery */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Uploaded Sheets ({uploadedFiles.length} {uploadedFiles.length === 1 ? 'Page' : 'Pages'})
                      </span>
                      <span className="text-xs text-slate-400">
                        Drag or click arrows to reorder page sequence
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {uploadedFiles.map((fileObj, idx) => (
                        <div
                          key={idx}
                          className="bg-white border border-slate-200/90 hover:border-slate-300 p-3 rounded-2xl flex items-center space-x-3 shadow-xs relative group transition-all"
                        >
                          {/* Image Thumbnail Preview */}
                          <div className="w-16 h-20 bg-slate-100 rounded-xl overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center relative">
                            <img
                              src={fileObj.dataUrl}
                              alt={`Page ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
                          </div>

                          {/* Info */}
                          <div className="flex-grow min-w-0">
                            <div className="text-xs sm:text-[13px] font-bold text-slate-900 truncate">
                              {fileObj.name || `Page_${idx + 1}.jpg`}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {formatFileSize(fileObj.size)} • Ready
                            </div>
                            <div className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                              Page {idx + 1}
                            </div>
                          </div>

                          {/* Actions: Reorder & Remove */}
                          <div className="flex flex-col items-center gap-1 shrink-0">
                            <div className="flex items-center gap-0.5">
                              {idx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleMovePage(idx, -1)}
                                  className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                                  title="Move Left"
                                >
                                  <ChevronLeft size={14} />
                                </button>
                              )}
                              {idx < uploadedFiles.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleMovePage(idx, 1)}
                                  className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                                  title="Move Right"
                                >
                                  <ChevronRight size={14} />
                                </button>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemovePage(idx)}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                              title="Delete Page"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Add More Pages Dashed Button */}
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-200/90 hover:border-[#1d6ef2] rounded-2xl p-4 min-h-[96px] flex items-center justify-center space-x-2 cursor-pointer transition-colors text-slate-500 hover:text-[#1d6ef2] bg-slate-50/30 hover:bg-blue-50/20"
                      >
                        <Plus size={18} />
                        <span className="text-xs font-bold">Add More Pages</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            ) : (
              /* Text Paste Panel */
              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Paste Essay Transcript or Answer Draft
                </label>
                <textarea
                  rows={9}
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  placeholder="Paste or type your complete handwritten transcript, outline, or essay draft here..."
                  className="w-full p-4 bg-slate-50/40 border border-slate-200/90 rounded-2xl text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#1d6ef2] focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all font-mono leading-relaxed resize-y"
                />
                <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
                  <span>{typedWords} Words</span>
                  <span>Markdown &amp; plain text supported</span>
                </div>
              </div>
            )}

            {/* Live Pre-Flight Credit Estimator & Bottom Action Bar */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
              
              {/* Left Credit Estimator Pill */}
              <div className="flex items-center space-x-3 bg-slate-50/90 border border-slate-200/90 px-4 py-2.5 rounded-2xl w-full md:w-auto shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1d6ef2] flex items-center justify-center shrink-0">
                  <Zap size={16} className="fill-current text-[#1d6ef2]" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Estimated: {preFlight.estimatedCredits} Credits
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Vision OCR + 6-Agent DAG Examiner Suite
                  </div>
                </div>
              </div>

              {/* Right Action Buttons */}
              <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <button
                  type="button"
                  onClick={onTrySample}
                  className="bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-slate-300 text-slate-700 px-5 py-3.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles size={16} className="text-amber-500" />
                  <span>Try Sample Essay</span>
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className={`px-7 py-3.5 rounded-2xl text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer flex-1 md:flex-initial ${
                    canSubmit
                      ? 'bg-[#1d6ef2] hover:bg-blue-600 text-white shadow-blue-500/25 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  <Sparkles size={16} />
                  <span>{isEvaluating ? 'Evaluating...' : 'Evaluate Paper (Under 60s)'}</span>
                </button>
              </div>

            </div>

          </div>

        </div>

        {/* Recent Evaluations Gallery */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-serif text-[22px] sm:text-[26px] font-bold text-slate-900 tracking-tight">
                Recent Evaluations
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Review previously graded answer sheets and examiner feedback reports.
              </p>
            </div>

            {evaluationHistory.length > 0 && (
              <span className="text-xs font-bold text-[#1d6ef2] hover:underline flex items-center gap-1 cursor-pointer">
                <span>{evaluationHistory.length} Copies Graded</span>
              </span>
            )}
          </div>

          {evaluationHistory.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-10 text-center shadow-xs">
              <BookOpen size={36} className="text-[#1d6ef2] mx-auto mb-3 opacity-80" />
              <h3 className="font-sans font-bold text-base text-slate-800 mb-1">
                No evaluations yet
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
                Upload your handwritten answer sheet above or explore our 100-mark CSS essay sample report.
              </p>
              <button
                type="button"
                onClick={onTrySample}
                className="bg-blue-50 text-[#1d6ef2] hover:bg-blue-100 font-semibold text-xs px-4 py-2 rounded-xl border border-blue-200 transition-colors cursor-pointer"
              >
                Load Sample Diagnostic Report
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {evaluationHistory.slice(0, 6).map((item) => {
                const isEssaySub = (item.subject || '').toLowerCase().includes('essay');
                const hasScore = typeof item.overallScore === 'number';
                const maxMarks = item.maxScore || (isEssaySub && item.essayMode !== 'outline_only' ? 100 : 20);
                const scoreDisplay = hasScore ? `${item.overallScore} / ${maxMarks} Marks` : 'Qualitative Report';
                const title = item.topic || item.examQuestion || 'Candidate Answer Script';
                const summaryExcerpt =
                  item.examinerSummary?.overallVerdict ||
                  item.summary ||
                  'Comprehensive feedback report highlighting thesis strength, vocabulary diversity, and counter-argument articulation.';

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      onSelectEvaluation?.(item);
                      setActiveView?.('report');
                    }}
                    className="bg-white border border-slate-200/90 hover:border-[#1d6ef2]/60 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer group"
                  >
                    <div>
                      {/* Top Pill & Date */}
                      <div className="flex items-center justify-between mb-3.5">
                        <span className="bg-blue-50 text-[#1d6ef2] border border-blue-100 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          {item.subject || 'English Essay'}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Calendar size={12} />
                          <span>{formatRelativeTime(item.date)}</span>
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="font-sans font-bold text-[16px] text-slate-900 group-hover:text-[#1d6ef2] transition-colors line-clamp-2 mb-2 leading-snug">
                        {title}
                      </h3>

                      {/* Excerpt */}
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                        {summaryExcerpt}
                      </p>
                    </div>

                    {/* Bottom Score & View Report Link */}
                    <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-baseline gap-1">
                        <span className="font-mono text-[16px] font-extrabold text-[#1d6ef2]">
                          {hasScore ? item.overallScore : 'Review'}
                        </span>
                        {hasScore && (
                          <span className="text-xs text-slate-400 font-medium">
                            /{maxMarks} Marks
                          </span>
                        )}
                      </div>

                      <span className="text-xs font-bold text-[#1d6ef2] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                        <span>View Report</span>
                        <ChevronRight size={14} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>

      {/* CamScanner Loading Overlay if evaluation running */}
      {isEvaluating && (
        <CamScannerLoadingOverlay
          pipelineProgress={pipelineProgress}
          mode={inputType === 'text' ? 'digital' : 'handwritten'}
          subject={selectedSubject}
          images={uploadedFiles.map((f) => f.dataUrl)}
        />
      )}
    </div>
  );
};

