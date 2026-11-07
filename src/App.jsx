import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { EvaluationStudio } from './components/EvaluationStudio';
import { SettingsModal } from './components/SettingsModal';
import { UploadModal } from './components/UploadModal';
import { AlertModal } from './components/AlertModal';
import { getGroundingUsage, getStoredApiKey, getStoredModel } from './services/geminiApi';
import { executeEvaluationPipeline } from './services/evaluationPipeline';

import sampleEvaluation from './data/evaluations/eval-graph-latest.json';

const HISTORY_STORAGE_KEY = 'css_evaluator_saved_history_v2';

const loadSavedHistory = () => {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not load saved evaluation history:', e);
  }
  return [sampleEvaluation];
};

const persistHistorySafely = (historyList) => {
  const trimmed = historyList.slice(0, 15);
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (_) {
    // If base64 images exceed localStorage quota, store lightweight copies without raw base64 arrays
    try {
      const lightweight = trimmed.map((item, idx) =>
        idx === 0 ? item : { ...item, imagePages: [] }
      );
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(lightweight));
    } catch (__) {
      const textOnly = trimmed.map((item) => ({ ...item, imagePages: [] }));
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(textOnly));
    }
  }
};

export default function App() {
  const [evaluationHistory, setEvaluationHistory] = useState(loadSavedHistory);
  const [evaluation, setEvaluation] = useState(() => loadSavedHistory()[0] || sampleEvaluation);
  const [activeSubject, setActiveSubject] = useState(() => loadSavedHistory()[0]?.subject || 'Islamic History & Culture');
  const [mode, setMode] = useState('digital'); // 'digital' | 'handwritten'
  const [currentSubmissionImages, setCurrentSubmissionImages] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [groundingUsage, setGroundingUsage] = useState(getGroundingUsage());
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [pipelineProgress, setPipelineProgress] = useState(null);

  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    actionLabel: null,
    onAction: null
  });

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

  const handleSelectHistoryItem = (item) => {
    if (!item) return;
    setEvaluation(item);
    if (item.subject) setActiveSubject(item.subject);
    if (item.imagePages?.length > 0) {
      setCurrentSubmissionImages(item.imagePages);
    } else {
      setCurrentSubmissionImages([]);
    }
  };

  const handleDeleteHistoryItem = (idToDelete) => {
    setEvaluationHistory((prev) => {
      const updated = prev.filter((item) => item.id !== idToDelete);
      const nextList = updated.length > 0 ? updated : [sampleEvaluation];
      persistHistorySafely(nextList);
      if (evaluation?.id === idToDelete) {
        setEvaluation(nextList[0]);
      }
      return nextList;
    });
  };

  const handleRunEvaluation = async (submissionData) => {
    const apiKey = getStoredApiKey();
    if (!apiKey) {
      setUploadOpen(false);
      showAlert({
        title: 'Gemini API Key Required',
        message: 'Please configure your Google AI Studio Gemini API Key in Platform Settings before running a live 6-agent evaluation.',
        type: 'warning',
        actionLabel: 'Open Settings',
        onAction: () => setSettingsOpen(true)
      });
      return;
    }

    setIsEvaluating(true);
    setUploadOpen(false);
    if (submissionData?.imageArray) {
      setCurrentSubmissionImages(submissionData.imageArray);
    } else {
      setCurrentSubmissionImages([]);
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
        apiKey,
        selectedModel: getStoredModel(),
        onProgress: (progress) => setPipelineProgress(progress)
      });

      setEvaluation(result);
      setEvaluationHistory((prev) => {
        const nextHistory = [result, ...prev.filter((item) => item.id !== result.id)];
        persistHistorySafely(nextHistory);
        return nextHistory;
      });
      setGroundingUsage({ ...getGroundingUsage() });
    } catch (err) {
      showAlert({
        title: 'Evaluation Could Not Complete',
        message: err.message || 'An unexpected error occurred during the evaluation pipeline.',
        type: 'error'
      });
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
        evaluationHistory={evaluationHistory}
        activeEvaluationId={evaluation?.id}
        onSelectEvaluation={handleSelectHistoryItem}
        onDeleteEvaluation={handleDeleteHistoryItem}
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
        onClose={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        actionLabel={alertConfig.actionLabel}
        onAction={alertConfig.onAction}
      />
    </div>
  );
}
