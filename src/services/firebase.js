/**
 * Firebase SaaS Backend Service — Authentication, Cloud Firestore Sync, Credit Metering & Voucher Engine
 * Provisioned for project: fpsc-css-evaluator-pk
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  runTransaction
} from 'firebase/firestore';

export const ADMIN_EMAIL = 'yaseenwazir953@gmail.com';

const firebaseConfig = {
  apiKey: 'AIzaSyCUdBcPL5XgfDIDs22jUYg46qYBkLfqGUE',
  authDomain: 'fpsc-css-evaluator-pk.firebaseapp.com',
  projectId: 'fpsc-css-evaluator-pk',
  storageBucket: 'fpsc-css-evaluator-pk.firebasestorage.app',
  messagingSenderId: '901828982615',
  appId: '1:901828982615:web:0bbce63227928a694cf012'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const SUBSCRIPTION_PLANS = [
  {
    id: 'free',
    name: 'Starter Trial',
    pricePKR: 'Free',
    period: 'on Sign-Up',
    credits: 2,
    badge: '2 Free Credits',
    features: [
      '2 Complimentary Paper Evaluation Credits',
      'Full 6-Agent FPSC Diagnostic Pipeline',
      'Line-by-Line Red / Amber / Green Callouts',
      'Quantitative Marks out of 20 or 100'
    ]
  },
  {
    id: 'aspirant',
    name: 'CSS Aspirant Monthly',
    pricePKR: 'PKR 1,500',
    period: '/ month',
    credits: 30,
    badge: 'Most Popular',
    highlight: true,
    features: [
      '30 Paper Evaluation Credits (All 50+ CSS & PMS Subjects)',
      '3-Tier Topper Paragraph Rewrites',
      'Suggested Visual Flowcharts & Schematics',
      'Cloud Evaluation History & PDF Report Export'
    ]
  },
  {
    id: 'pro',
    name: 'CSS/PMS Allocation Pro',
    pricePKR: 'PKR 3,500',
    period: '/ exam pass',
    credits: 100,
    badge: 'Best Value',
    features: [
      '100 Evaluation Credits (Questions + 100m Essays)',
      'Deep 100-Mark English Essay & Precis Audits',
      'Priority Gemini 3.8 Flash Flagship Engine',
      'Unlimited Cloud History & Printable PDF Dossiers'
    ]
  }
];

// ─────────────────────────────────────────────────────────────
// AUTHENTICATION HELPERS
// ─────────────────────────────────────────────────────────────

export const signInWithGoogle = async () => {
  const cred = await signInWithPopup(auth, googleProvider);
  const profile = await ensureUserProfile(cred.user);
  return { user: cred.user, profile };
};

export const loginWithEmail = async (email, password) => {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  const profile = await ensureUserProfile(cred.user);
  return { user: cred.user, profile };
};

export const registerWithEmail = async (displayName, email, password) => {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (displayName?.trim()) {
    await updateProfile(cred.user, { displayName: displayName.trim() });
  }
  const profile = await ensureUserProfile(cred.user, displayName?.trim());
  return { user: cred.user, profile };
};

export const logoutUser = async () => {
  await signOut(auth);
};

export const subscribeToAuthChanges = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// ─────────────────────────────────────────────────────────────
// USER PROFILE & CREDIT METERING
// ─────────────────────────────────────────────────────────────

export const ensureUserProfile = async (firebaseUser, customName = '') => {
  if (!firebaseUser) return null;

  const userRef = doc(db, 'users', firebaseUser.uid);
  const isAdmin = firebaseUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const existing = snap.data();
      if (isAdmin && existing.role !== 'admin') {
        await updateDoc(userRef, { role: 'admin', tier: 'pro', credits: 9999 });
        return { ...existing, role: 'admin', tier: 'pro', credits: 9999 };
      }
      return existing;
    }

    const newProfile = {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: customName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'CSS Aspirant',
      photoURL: firebaseUser.photoURL || '',
      role: isAdmin ? 'admin' : 'candidate',
      tier: isAdmin ? 'pro' : 'free',
      credits: isAdmin ? 9999 : 2,
      evaluationsCount: 0,
      createdAt: new Date().toISOString()
    };

    await setDoc(userRef, newProfile);
    return newProfile;
  } catch (err) {
    console.warn('[Firebase] Profile sync fallback:', err.message);
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: customName || firebaseUser.displayName || 'CSS Aspirant',
      role: isAdmin ? 'admin' : 'candidate',
      tier: isAdmin ? 'pro' : 'free',
      credits: isAdmin ? 9999 : 2,
      evaluationsCount: 0
    };
  }
};

export const deductUserCredits = async (uid, creditCost = 1) => {
  if (!uid) return null;
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;

  const data = snap.data();
  if (data.role === 'admin') return data;

  const nextCredits = Math.max(0, (Number(data.credits) || 0) - creditCost);
  const nextCount = (Number(data.evaluationsCount) || 0) + 1;

  await updateDoc(userRef, {
    credits: nextCredits,
    evaluationsCount: nextCount,
    lastEvaluatedAt: new Date().toISOString()
  });

  return { ...data, credits: nextCredits, evaluationsCount: nextCount };
};

// ─────────────────────────────────────────────────────────────
// CLOUD EVALUATION HISTORY SYNC
// ─────────────────────────────────────────────────────────────

export const saveEvaluationToFirestore = async (uid, evaluation) => {
  if (!uid || !evaluation?.id) return;

  try {
    const evalRef = doc(db, 'evaluations', String(evaluation.id));
    const { imagePages, ...cloudSafeEvaluation } = evaluation;
    await setDoc(evalRef, {
      ...cloudSafeEvaluation,
      userId: uid,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[Firebase] Could not save evaluation to cloud:', err.message);
  }
};

export const fetchUserEvaluationsFromFirestore = async (uid) => {
  if (!uid) return [];
  try {
    const q = query(collection(db, 'evaluations'), where('userId', '==', uid));
    const snap = await getDocs(q);
    const items = [];
    snap.forEach((docSnap) => {
      items.push(docSnap.data());
    });
    items.sort((a, b) => (b.createdAt || b.date || '').localeCompare(a.createdAt || a.date || ''));
    return items;
  } catch (err) {
    console.warn('[Firebase] Failed to load cloud evaluations:', err.message);
    return [];
  }
};

export const deleteEvaluationFromFirestore = async (evalId) => {
  if (!evalId) return;
  try {
    await deleteDoc(doc(db, 'evaluations', String(evalId)));
  } catch (err) {
    console.warn('[Firebase] Failed to delete cloud evaluation:', err.message);
  }
};

// ─────────────────────────────────────────────────────────────
// VOUCHER REDEMPTION, CANDIDATE MANAGEMENT & ADMIN CONFIG
// ─────────────────────────────────────────────────────────────

export const redeemSubscriptionVoucher = async (uid, userEmail, rawCode) => {
  if (!uid) throw new Error('Please sign in first to redeem a subscription code.');
  const cleanCode = (rawCode || '').trim().toUpperCase();
  if (!cleanCode) throw new Error('Please enter a valid activation code.');

  const voucherRef = doc(db, 'vouchers', cleanCode);
  const userRef = doc(db, 'users', uid);

  return await runTransaction(db, async (transaction) => {
    const voucherSnap = await transaction.get(voucherRef);
    if (!voucherSnap.exists()) {
      throw new Error(`Invalid activation code "${cleanCode}". Please check the code and try again.`);
    }

    const voucher = voucherSnap.data();
    if (voucher.isRedeemed) {
      throw new Error('This activation code has already been redeemed.');
    }

    const userSnap = await transaction.get(userRef);
    const currentCredits = userSnap.exists() ? Number(userSnap.data().credits || 0) : 0;
    const addedCredits = Number(voucher.credits || 30);
    const updatedCredits = currentCredits + addedCredits;
    const updatedTier = voucher.tier || 'aspirant';

    transaction.update(voucherRef, {
      isRedeemed: true,
      redeemedByUid: uid,
      redeemedByEmail: userEmail || '',
      redeemedAt: new Date().toISOString()
    });

    transaction.update(userRef, {
      credits: updatedCredits,
      tier: updatedTier,
      updatedAt: new Date().toISOString()
    });

    return {
      addedCredits,
      updatedCredits,
      updatedTier,
      planLabel: voucher.label || `${addedCredits} Credits`
    };
  });
};

export const createSubscriptionVoucher = async ({ credits = 30, tier = 'aspirant', label = 'CSS Aspirant Monthly (30 Credits)', customCode = '' }) => {
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
  const code = (customCode || `CSS-${tier.toUpperCase()}-${randomPart}`).trim().toUpperCase();

  const voucherData = {
    code,
    credits: Number(credits),
    tier,
    label,
    isRedeemed: false,
    redeemedByEmail: null,
    redeemedByUid: null,
    redeemedAt: null,
    createdAt: new Date().toISOString()
  };

  await setDoc(doc(db, 'vouchers', code), voucherData);
  return voucherData;
};

export const fetchAllVouchers = async () => {
  const snap = await getDocs(collection(db, 'vouchers'));
  const list = [];
  snap.forEach((d) => list.push(d.data()));
  list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return list;
};

export const fetchAllCandidates = async () => {
  const snap = await getDocs(collection(db, 'users'));
  const list = [];
  snap.forEach((d) => list.push(d.data()));
  list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return list;
};

export const adminGrantCreditsToUser = async (targetUid, addedCredits = 30, tier = 'aspirant') => {
  const userRef = doc(db, 'users', targetUid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) throw new Error('User not found');
  const current = Number(snap.data().credits || 0);
  const updatedCredits = current + Number(addedCredits);
  await updateDoc(userRef, {
    credits: updatedCredits,
    tier,
    updatedAt: new Date().toISOString()
  });
  return { ...snap.data(), credits: updatedCredits, tier };
};

export const savePlatformGeminiConfig = async ({ apiKey, defaultModel = 'auto' }) => {
  await setDoc(doc(db, 'platform_config', 'gemini'), {
    apiKey: (apiKey || '').trim(),
    defaultModel,
    updatedAt: new Date().toISOString()
  });
};

export const getPlatformGeminiConfig = async () => {
  try {
    const snap = await getDoc(doc(db, 'platform_config', 'gemini'));
    if (snap.exists()) {
      return snap.data();
    }
  } catch (_) {
    // ignore
  }
  return null;
};

export const savePaymentConfig = async ({ whatsappNumber, paymentAccountTitle, paymentAccountNumber, bankOrWalletName }) => {
  await setDoc(doc(db, 'platform_config', 'payment'), {
    whatsappNumber: (whatsappNumber || '').trim(),
    paymentAccountTitle: (paymentAccountTitle || '').trim(),
    paymentAccountNumber: (paymentAccountNumber || '').trim(),
    bankOrWalletName: (bankOrWalletName || 'JazzCash / EasyPaisa / RAAST').trim(),
    updatedAt: new Date().toISOString()
  });
};

export const getPaymentConfig = async () => {
  try {
    const snap = await getDoc(doc(db, 'platform_config', 'payment'));
    if (snap.exists()) {
      return snap.data();
    }
  } catch (_) {
    // ignore
  }
  return null;
};
