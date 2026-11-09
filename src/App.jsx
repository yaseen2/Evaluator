import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { PublicHeader } from './components/PublicHeader';
import { EvaluationStudio } from './components/EvaluationStudio';
import { LandingPage } from './components/LandingPage';
import { PracticeHub } from './components/PracticeHub';
import { PricingPage } from './components/PricingPage';
import { CandidateDashboard } from './components/CandidateDashboard';
import { AdminConsole } from './components/AdminConsole';
import { SettingsModal } from './components/SettingsModal';
import { AlertModal } from './components/AlertModal';
import { AuthModal } from './components/AuthModal';
import { Sparkles, Eye } from 'lucide-react';
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

// Legacy global cache key (shared across all accounts on a device) — purged on load to prevent cross-user leaks
const LEGACY_HISTORY_KEY = 'css_evaluator_saved_history_v4';
const historyKeyFor = (uid) => `jawabcheck_history_${uid}`;

// Views available to each role
const GUEST_VIEWS = ['landing', 'pricing', 'report'];
const CANDIDATE_VIEWS = ['dashboard', 'hub', 'report', 'pricing'];

const loadUserHistory = (uid) => {
  if (!uid) return [];
  try {
    const raw = localStorage.getItem(historyKeyFor(uid));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const persistUserHistory = (uid, historyList) => {
  if (!uid) return;
  const trimmed = historyList.slice(0, 15);
  const key = historyKeyFor(uid);
  try {
    localStorage.setItem(key, JSON.stringify(trimmed));
  } catch {
    try {
      // Quota exceeded: keep page images only for the newest evaluation
      localStorage.setItem(key, JSON.stringify(trimmed.map((item, idx) => (idx === 0 ? item : { ...item, imagePages: [] }))));
    } catch {
      localStorage.setItem(key, JSON.stringify(trimmed.map((item) => ({ ...item, imagePages: [] }))));
    }
  }
};

export default function App() {
  const [evaluationHistory, setEvaluationHistory] = useState([]);
  const [evaluation, setEvaluation] = useState(sampleEssayEvaluation);
  const [activeSubject, setActiveSubject] = useState('English Essay');
  const [mode, setMode] = useState('digital');
  const [currentSubmissionImages, setCurrentSubmissionImages] = useState([]);

  // Modals State
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  // Firebase User & Profile State
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authResolved, setAuthResolved] = useState(false);
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

  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('css_eval_theme') || 'light');

  // Views: 'landing' | 'pricing' | 'report' (guest) — 'dashboard' | 'hub' | 'report' | 'pricing' (candidate) — + 'admin'
  const [activeView, setActiveView] = useState('landing');

  const isAdmin = userProfile?.role === 'admin';

  const openAuth = (modeToOpen = 'login') => {
    setAuthMode(modeToOpen === 'register' ? 'register' : 'login');
    setAuthOpen(true);
  };

  // Purge legacy shared-device history cache once
  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_HISTORY_KEY);
    } catch {}
  }, []);

  // Listen to Firebase Auth & load this user's own history
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        const profile = await ensureUserProfile(fbUser);
        setUserProfile(profile);

        const localHistory = loadUserHistory(fbUser.uid);
        const cloudEvals = await fetchUserEvaluationsFromFirestore(fbUser.uid);
        const cloudIds = new Set(cloudEvals.map((c) => c.id));
        const merged = [...cloudEvals, ...localHistory.filter((p) => !cloudIds.has(p.id))];
        setEvaluationHistory(merged);
        persistUserHistory(fbUser.uid, merged);
        if (merged[0]) {
          setEvaluation(merged[0]);
          if (merged[0].subject) setActiveSubject(merged[0].subject);
        }

        // Signed-in users land in their workspace, not the marketing page
        setActiveView((prev) => (prev === 'landing' ? 'dashboard' : prev));
      } else {
        setUserProfile(null);
        setEvaluationHistory([]);
        setEvaluation(sampleEssayEvaluation);
        setCurrentSubmissionImages([]);
        setActiveView((prev) => (GUEST_VIEWS.includes(prev) ? prev : 'landing'));
      }
      setAuthResolved(true);
    });
    return () => unsubscribe();
  }, []);

  // Real-time listener on user profile (credits & tier update live when Admin approves payment)
  useEffect(() => {
    if (!user?.uid) return;
    const unsubProfile = subscribeToUserProfile(user.uid, (liveProfile) => setUserProfile(liveProfile));
    return () => unsubProfile();
  }, [user?.uid]);

  // Real-time listener on pending payments for Admin badge
  useEffect(() => {
    if (!isAdmin) {
      setPendingAdminPayments(0);
      return;
    }
    const unsubPayments = subscribeToPendingPaymentCount((count) => setPendingAdminPayments(count));
    return () => unsubPayments();
  }, [isAdmin]);

  // Route guard: keep each role inside the views it is allowed to see
  useEffect(() => {
    if (!authResolved) return;
    if (!user) {
      if (!GUEST_VIEWS.includes(activeView)) {
        setActiveView('landing');
        openAuth('login');
      }
    } else if (activeView === 'admin' && userProfile && !isAdmin) {
      setActiveView('dashboard');
    } else if (activeView === 'landing') {
      setActiveView('dashboard');
    } else if (!CANDIDATE_VIEWS.includes(activeView) && activeView !== 'admin') {
      setActiveView('dashboard');
    }
  }, [activeView, user, userProfile, isAdmin, authResolved]);

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
    setAlertConfig({ isOpen: true, title, message, type, actionLabel, onAction });
  };

  const handleSelectHistoryItem = (item) => {
    if (!item) return;
    setEvaluation(item);
    if (item.subject) setActiveSubject(item.subject);
    setCurrentSubmissionImages(item.imagePages?.length > 0 ? item.imagePages : []);
    setActiveView('report');
  };

  const handleOpenSample = () => handleSelectHistoryItem(sampleEssayEvaluation);

  const handleDeleteHistoryItem = async (idToDelete) => {
    if (user) {
      await deleteEvaluationFromFirestore(idToDelete);
    }
    setEvaluationHistory((prev) => {
      const nextList = prev.filter((item) => item.id !== idToDelete);
      persistUserHistory(user?.uid, nextList);
      if (evaluation?.id === idToDelete) {
        setEvaluation(nextList[0] || sampleEssayEvaluation);
      }
      return nextList;
    });
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    setUserProfile(null);
    setEvaluationHistory([]);
    setEvaluation(sampleEssayEvaluation);
    setCurrentSubmissionImages([]);
    setActiveView('landing');
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

    if (!user) {
      openAuth('register');
      return;
    }

    // 1. Personal BYOK key (Advanced setting) takes precedence over platform credits
    let activeApiKey = getStoredApiKey();
    let activeModel = getStoredModel();
    let usingPlatformCredits = false;

    if (!activeApiKey) {
      const availableCredits = Number(userProfile?.credits ?? 0);

      if (!isAdmin && availableCredits < preFlight.minRequiredCredits) {
        showAlert({
          title: 'Not Enough Credits',
          message: `This evaluation needs about ${preFlight.minRequiredCredits} credits, but your balance is ${availableCredits}. Top up to continue.`,
          type: 'warning',
          actionLabel: 'View Plans',
          onAction: () => setActiveView('pricing')
        });
        return;
      }

      // 2. Central Platform Gemini Key configured by Admin in Firestore
      const platformCfg = await getPlatformGeminiConfig();
      if (platformCfg?.apiKey) {
        activeApiKey = platformCfg.apiKey;
        if (platformCfg.defaultModel && activeModel === 'auto') {
          activeModel = platformCfg.defaultModel;
        }
        usingPlatformCredits = true;
      } else {
        showAlert({
          title: isAdmin ? 'Platform AI Key Not Configured' : 'Evaluation Service Unavailable',
          message: isAdmin
            ? 'Set the Platform Master Gemini API Key in the Admin Console → Master AI & Bank Settings to activate evaluations for all candidates.'
            : 'The evaluation engine is temporarily unavailable. Please try again shortly or contact support.',
          type: 'warning',
          actionLabel: isAdmin ? 'Open Admin Console' : null,
          onAction: isAdmin ? () => setActiveView('admin') : null
        });
        return;
      }
    }

    setIsEvaluating(true);
    setCurrentSubmissionImages(submissionData?.imageArray || []);

    try {
      const result = await executeEvaluationPipeline({
        text: submissionData?.text,
        imageArray: submissionData?.imageArray,
        subject: effectiveSubject,
        essayMode,
        examQuestion: submissionData?.examQuestion || '',
        mode: submissionData?.mode || mode,
        apiKey: activeApiKey,
        selectedModel: activeModel,
        onProgress: (progress) => setPipelineProgress(progress)
      });

      setEvaluation(result);
      setActiveView('report');
      setEvaluationHistory((prev) => {
        const nextHistory = [result, ...prev.filter((item) => item.id !== result.id)];
        persistUserHistory(user.uid, nextHistory);
        return nextHistory;
      });

      // Cloud sync & token-synced credit deduction (admins only record telemetry)
      await saveEvaluationToFirestore(user.uid, result);
      const actualCredits =
        result.creditsConsumed || result.tokenUsage?.creditsConsumed || preFlight.estimatedCredits;
      if (usingPlatformCredits || isAdmin) {
        const updatedProfile = await deductUserCredits(user.uid, actualCredits, result.tokenUsage);
        if (updatedProfile) setUserProfile(updatedProfile);
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

  // ─────────────────────────────────────────────────────────────
  // VIEW RENDERING
  // ─────────────────────────────────────────────────────────────

  const renderPricing = () => (
    <PricingPage
      user={user}
      userProfile={userProfile}
      onOpenAuth={() => openAuth('login')}
      setActiveView={setActiveView}
      onProfileUpdated={async () => {
        if (user?.uid) setUserProfile(await ensureUserProfile(user));
      }}
    />
  );

  const renderStudio = () => (
    <EvaluationStudio
      activeView={activeView}
      setActiveView={(view) => (!user && view === 'hub' ? openAuth('register') : setActiveView(view))}
      evaluation={evaluation}
      activeSubject={activeSubject}
      setActiveSubject={setActiveSubject}
      mode={mode}
      setMode={setMode}
      isEvaluating={isEvaluating}
      pipelineProgress={pipelineProgress}
      submissionImages={currentSubmissionImages}
      evaluationHistory={evaluationHistory}
      onSelectEvaluation={handleSelectHistoryItem}
      onDeleteEvaluation={handleDeleteHistoryItem}
      onSubmitEvaluation={handleRunEvaluation}
      user={user}
      userProfile={userProfile}
    />
  );

  const renderGuestContent = () => {
    if (activeView === 'pricing') return renderPricing();
    if (activeView === 'report') {
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="shrink-0 bg-gradient-to-r from-[#1d6ef2] to-indigo-600 text-white px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
              <Eye size={16} className="shrink-0" />
              <span>
                <strong>Demo mode:</strong> you are viewing a sample FPSC evaluation report.
              </span>
            </div>
            <button
              type="button"
              onClick={() => openAuth('register')}
              className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3.5 py-1.5 rounded-lg bg-white text-[#1d6ef2] text-xs font-bold hover:bg-blue-50 transition-colors cursor-pointer"
            >
              <Sparkles size={13} />
              <span>Evaluate my own paper — 30 free credits</span>
            </button>
          </div>
          {renderStudio()}
        </div>
      );
    }
    return (
      <LandingPage
        onStartEvaluation={() => openAuth('register')}
        onTrySample={handleOpenSample}
        onOpenPricing={() => setActiveView('pricing')}
        onOpenAuth={() => openAuth('login')}
        user={null}
        userProfile={null}
      />
    );
  };

  const renderWorkspaceContent = () => {
    if (activeView === 'admin' && isAdmin) {
      return <AdminConsole onNavigate={setActiveView} />;
    }
    if (activeView === 'dashboard') {
      return (
        <CandidateDashboard
          user={user}
          userProfile={userProfile}
          evaluationHistory={evaluationHistory}
          onSelectEvaluation={handleSelectHistoryItem}
          onDeleteEvaluation={handleDeleteHistoryItem}
          onStartNewEvaluation={() => setActiveView('hub')}
          onSelectSubjectAndStart={(subject) => {
            setActiveSubject(subject);
            setActiveView('hub');
          }}
          onTrySample={handleOpenSample}
          onOpenPricing={() => setActiveView('pricing')}
          onOpenAdmin={() => setActiveView('admin')}
        />
      );
    }
    if (activeView === 'hub') {
      return (
        <PracticeHub
          activeSubject={activeSubject}
          setActiveSubject={setActiveSubject}
          onSubmitEvaluation={handleRunEvaluation}
          isEvaluating={isEvaluating}
          pipelineProgress={pipelineProgress}
          evaluationHistory={evaluationHistory}
          onSelectEvaluation={handleSelectHistoryItem}
          onDeleteEvaluation={handleDeleteHistoryItem}
          onTrySample={handleOpenSample}
          user={user}
          userProfile={userProfile}
          onOpenPricing={() => setActiveView('pricing')}
          onOpenAuth={() => openAuth('login')}
          setActiveView={setActiveView}
        />
      );
    }
    if (activeView === 'pricing') return renderPricing();
    return renderStudio();
  };

  const modals = (
    <>
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        groundingUsage={groundingUsage}
        user={user}
        userProfile={userProfile}
        onOpenPricing={() => setActiveView('pricing')}
      />

      <AuthModal
        isOpen={authOpen}
        initialMode={authMode}
        onClose={() => setAuthOpen(false)}
        onAuthSuccess={({ user: fbUser, profile }) => {
          setUser(fbUser);
          setUserProfile(profile);
          setActiveView((prev) => (prev === 'landing' || prev === 'report' ? 'dashboard' : prev));
        }}
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
    </>
  );

  // Avoid flashing the marketing page to signed-in users while Firebase restores the session
  if (!authResolved) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-10 h-10 rounded-full border-4 border-blue-100 border-t-[#1d6ef2] animate-spin" />
          <span className="text-xs font-semibold tracking-wide">Loading JawabCheck…</span>
        </div>
      </div>
    );
  }

  // 1. Guest shell: public top header, no workspace sidebar
  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--bg-app)' }}>
        <PublicHeader
          activeView={activeView}
          setActiveView={setActiveView}
          onOpenAuth={openAuth}
          onTrySample={handleOpenSample}
        />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
          {renderGuestContent()}
        </main>
        {modals}
      </div>
    );
  }

  // 2. Candidate & Admin workspace shell
  return (
    <div className="app-container">
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenAuth={() => openAuth('login')}
        onOpenSubscription={() => setActiveView('pricing')}
        onOpenAdmin={() => setActiveView('admin')}
        onLogout={handleLogout}
        user={user}
        userProfile={userProfile}
        pendingAdminPayments={pendingAdminPayments}
        isEvaluating={isEvaluating}
        evaluationHistory={evaluationHistory}
        activeEvaluationId={evaluation?.id}
        onSelectEvaluation={handleSelectHistoryItem}
        onDeleteEvaluation={handleDeleteHistoryItem}
        onTrySample={handleOpenSample}
      />

      <main className="app-main-content">{renderWorkspaceContent()}</main>

      {modals}
    </div>
  );
}
