import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { EvaluationStudio } from './components/EvaluationStudio';
import { SettingsModal } from './components/SettingsModal';
import { UploadModal } from './components/UploadModal';
import { AlertModal } from './components/AlertModal';
import { AuthModal } from './components/AuthModal';
import { SubscriptionModal } from './components/SubscriptionModal';
import { AdminModal } from './components/AdminModal';
import { getGroundingUsage, getStoredApiKey, getStoredModel, estimateCreditsPreFlight } from './services/geminiApi';
import { executeEvaluationPipeline } from './services/evaluationPipeline';
import {
  subscribeToAuthChanges,
  ensureUserProfile,
  logoutUser,
  deductUserCredits,
  saveEvaluationToFirestore,
  fetchUserEvaluationsFromFirestore,
  deleteEvaluationFromFirestore,
  getPlatformGeminiConfig,
  subscribeToUserProfile,
  subscribeToPendingPaymentCount
} from './services/firebase';

import sampleEssayEvaluation from './data/evaluations/sample-essay-evaluation.json';
import sampleEvaluation from './data/evaluations/eval-graph-latest.json';

const HISTORY_STORAGE_KEY = 'css_evaluator_saved_history_v3';

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
  return [sampleEssayEvaluation, sampleEvaluation];
};

const persistHistorySafely = (historyList) => {
  const trimmed = historyList.slice(0, 15);
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (_) {
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
  const [evaluation, setEvaluation] = useState(() => loadSavedHistory()[0] || sampleEssayEvaluation);
  const [activeSubject, setActiveSubject] = useState(() => loadSavedHistory()[0]?.subject || 'English Essay');
  const [mode, setMode] = useState('digital');
  const [currentSubmissionImages, setCurrentSubmissionImages] = useState([]);

  // Modals State
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  // Firebase User & Profile State
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [pendingAdminPayments, setPendingAdminPayments] = useState(0);

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

  // Listen to Firebase Auth & Sync Cloud History
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        const profile = await ensureUserProfile(fbUser);
        setUserProfile(profile);

        // Load Cloud Evaluations from Firestore
        const cloudEvals = await fetchUserEvaluationsFromFirestore(fbUser.uid);
        if (cloudEvals.length > 0) {
          setEvaluationHistory((prev) => {
            const existingIds = new Set(cloudEvals.map((c) => c.id));
            const merged = [...cloudEvals, ...prev.filter((p) => !existingIds.has(p.id))];
            persistHistorySafely(merged);
            return merged;
          });
          setEvaluation(cloudEvals[0]);
          if (cloudEvals[0].subject) setActiveSubject(cloudEvals[0].subject);
        }
      } else {
        setUserProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time listener on user profile (credits & tier update live when Admin approves payment)
  useEffect(() => {
    if (!user?.uid) return;
    const unsubProfile = subscribeToUserProfile(user.uid, (liveProfile) => {
      setUserProfile(liveProfile);
    });
    return () => unsubProfile();
  }, [user?.uid]);

  // Real-time listener on pending payments for Admin badge
  useEffect(() => {
    if (userProfile?.role !== 'admin') {
      setPendingAdminPayments(0);
      return;
    }
    const unsubPayments = subscribeToPendingPaymentCount((count) => {
      setPendingAdminPayments(count);
    });
    return () => unsubPayments();
  }, [userProfile?.role]);

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

  const handleDeleteHistoryItem = async (idToDelete) => {
    if (user) {
      await deleteEvaluationFromFirestore(idToDelete);
    }
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

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    setUserProfile(null);
  };

  const handleRunEvaluation = async (submissionData) => {
    const effectiveSubject = submissionData?.subject || activeSubject;
    const essayMode = submissionData?.essayMode || 'full';
    const isEssay = effectiveSubject.toLowerCase().includes('essay');
    const typedWords = submissionData?.text ? submissionData.text.trim().split(/\s+/).length : 0;
    const preFlight = estimateCreditsPreFlight({
      isEssay,
      essayMode,
      activeTab: submissionData?.mode === 'digital' ? 'text' : 'image',
      imageCount: submissionData?.imageArray?.length || 0,
      wordCount: typedWords
    });

    // 1. Check if user has a personal BYOK key configured in local Settings
    let activeApiKey = getStoredApiKey();
    let activeModel = getStoredModel();
    let usingPlatformCredits = false;

    if (!activeApiKey) {
      // 2. If no personal BYOK key, check if user is signed in to use Platform Credits
      if (!user) {
        setUploadOpen(false);
        setAuthOpen(true);
        return;
      }

      const isAdmin = userProfile?.role === 'admin';
      const availableCredits = Number(userProfile?.credits ?? 0);

      if (!isAdmin && availableCredits < preFlight.minRequiredCredits) {
        setUploadOpen(false);
        setSubscriptionOpen(true);
        return;
      }

      // Fetch central Platform Gemini Key configured by Admin in Firestore
      const platformCfg = await getPlatformGeminiConfig();
      if (platformCfg?.apiKey) {
        activeApiKey = platformCfg.apiKey;
        if (platformCfg.defaultModel && activeModel === 'auto') {
          activeModel = platformCfg.defaultModel;
        }
        usingPlatformCredits = true;
      } else {
        setUploadOpen(false);
        showAlert({
          title: 'API Key Setup Required',
          message: isAdmin
            ? 'Please set your Platform Master Gemini API Key in the Admin Portal (or in Settings ⚙️) to activate evaluations.'
            : 'Please add your Gemini API Key in Settings (⚙️) or contact the platform administrator.',
          type: 'warning',
          actionLabel: isAdmin ? 'Open Admin Portal' : 'Open Settings',
          onAction: () => (isAdmin ? setAdminOpen(true) : setSettingsOpen(true))
        });
        return;
      }
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
      const examQuestion = submissionData?.examQuestion || '';

      const result = await executeEvaluationPipeline({
        text: submissionData?.text,
        imageArray: submissionData?.imageArray,
        subject: effectiveSubject,
        essayMode,
        examQuestion,
        mode: selectedMode,
        apiKey: activeApiKey,
        selectedModel: activeModel,
        onProgress: (progress) => setPipelineProgress(progress)
      });

      setEvaluation(result);
      setEvaluationHistory((prev) => {
        const nextHistory = [result, ...prev.filter((item) => item.id !== result.id)];
        persistHistorySafely(nextHistory);
        return nextHistory;
      });

      // Cloud Sync & Exact Token-Synced Credit Deduction
      if (user) {
        await saveEvaluationToFirestore(user.uid, result);
        const actualCredits =
          result.creditsConsumed ||
          result.tokenUsage?.creditsConsumed ||
          preFlight.estimatedCredits;

        if (usingPlatformCredits || userProfile?.role !== 'admin') {
          const updatedProfile = await deductUserCredits(user.uid, actualCredits, result.tokenUsage);
          if (updatedProfile) {
            setUserProfile(updatedProfile);
          }
        } else {
          // Even for Admin, record token telemetry on profile
          await deductUserCredits(user.uid, actualCredits, result.tokenUsage);
        }
      }

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
        onOpenAuth={() => setAuthOpen(true)}
        onOpenSubscription={() => setSubscriptionOpen(true)}
        onOpenAdmin={() => setAdminOpen(true)}
        onLogout={handleLogout}
        user={user}
        userProfile={userProfile}
        pendingAdminPayments={pendingAdminPayments}
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

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthSuccess={({ user: fbUser, profile }) => {
          setUser(fbUser);
          setUserProfile(profile);
        }}
      />

      <SubscriptionModal
        isOpen={subscriptionOpen}
        onClose={() => setSubscriptionOpen(false)}
        user={user}
        userProfile={userProfile}
        onProfileUpdated={(nextProfile) => setUserProfile(nextProfile)}
        onOpenAuth={() => setAuthOpen(true)}
      />

      <AdminModal
        isOpen={adminOpen}
        onClose={() => setAdminOpen(false)}
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
