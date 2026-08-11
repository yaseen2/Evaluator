import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { EvaluationStudio } from './components/EvaluationStudio';
import { SettingsModal } from './components/SettingsModal';
import { UploadModal } from './components/UploadModal';
import { AlertModal } from './components/AlertModal';
import { getGroundingUsage, getStoredApiKey, getStoredModel } from './services/geminiApi';
import { executeEvaluationPipeline } from './services/evaluationPipeline';

import sampleEvaluation from './data/evaluations/eval-graph-latest.json';

export default function App() {
  const [activeSubject, setActiveSubject] = useState('Islamic History & Culture');
  const [mode, setMode] = useState('digital'); // 'digital' | 'handwritten'
  const [evaluation, setEvaluation] = useState(sampleEvaluation);
  const [currentSubmissionImages, setCurrentSubmissionImages] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [groundingUsage, setGroundingUsage] = useState(getGroundingUsage());
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [pipelineProgress, setPipelineProgress] = useState(null);

  // Modern Alert Modal State
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    actionLabel: null,
    onAction: null
  });

  // Theme State ('dark' | 'light' | 'auto')
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('css_eval_theme') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('css_eval_theme', themeMode);

    const applyTheme = () => {
      if (themeMode === 'auto') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', systemPrefersDark ? 'dark' : 'light');
      } else {
        document.documentElement.setAttribute('data-theme', themeMode);
      }
    };

    applyTheme();

    if (themeMode === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = () => applyTheme();
      
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }
  }, [themeMode]);

  const showAlert = ({ title, message, type = 'warning', actionLabel = null, onAction = null }) => {
    setAlertConfig({
      isOpen: true,
      title,
      message,
      type,
      actionLabel,
      onAction
    });
  };

  const handleRunEvaluation = async (submissionData) => {
    setIsEvaluating(true);
    setUploadOpen(false);
    if (submissionData?.imageArray) {
      setCurrentSubmissionImages(submissionData.imageArray);
    }
    try {
      const selectedMode = submissionData?.mode || mode;
      const effectiveSubject = submissionData?.subject || activeSubject;
      const examQuestion = submissionData?.examQuestion || '';

      const result = await executeEvaluationPipeline({
        text: submissionData?.text,
        imageArray: submissionData?.imageArray,
        subject: effectiveSubject,
        examQuestion,
        mode: selectedMode,
        apiKey: getStoredApiKey(),
        selectedModel: getStoredModel(),
        onProgress: (progress) => setPipelineProgress(progress)
      });
      setEvaluation(result);
      setGroundingUsage(getGroundingUsage());
    } catch (err) {
      if (err.message === 'MISSING_EXAM_QUESTION') {
        showAlert({
          title: 'Exam Question Required',
          message: 'We could not detect an exam question at the top of your uploaded page or in the question box. Please provide the FPSC question so the AI examiner can grade your answer accurately.',
          type: 'warning',
          actionLabel: 'Type Question Now',
          onAction: () => setUploadOpen(true)
        });
      } else {
        showAlert({
          title: 'Evaluation Could Not Complete',
          message: err.message,
          type: 'error'
        });
      }
    } finally {
      setIsEvaluating(false);
      setPipelineProgress(null);
    }
  };

  return (
    <div className="app-container">
      <Navbar
        activeSubject={activeSubject}
        setActiveSubject={setActiveSubject}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenUpload={() => setUploadOpen(true)}
        isEvaluating={isEvaluating}
      />

      <EvaluationStudio
        evaluation={evaluation}
        activeSubject={activeSubject}
        mode={mode}
        setMode={setMode}
        isEvaluating={isEvaluating}
        pipelineProgress={pipelineProgress}
        submissionImages={currentSubmissionImages}
        onOpenUpload={() => setUploadOpen(true)}
      />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        groundingUsage={groundingUsage}
      />

      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSubmit={handleRunEvaluation}
        isEvaluating={isEvaluating}
        activeSubject={activeSubject}
        setActiveSubject={setActiveSubject}
      />

      <AlertModal
        isOpen={alertConfig.isOpen}
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        actionLabel={alertConfig.actionLabel}
        onAction={alertConfig.onAction}
      />
    </div>
  );
}
