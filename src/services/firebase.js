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
  onSnapshot,
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
    credits: 30,
    badge: '30 Free Credits',
    features: [
      '30 Token-Synced Credits (~1.25L Weighted Tokens)',
      'Essay Outline (~4–6 Credits) or 20m Answer (~9 Credits)',
      'Full 100m English Essay Audit (~18–28 Credits)',
      '4-Part Micro-Lesson Callouts & Thesis Audit'
    ]
  },
  {
    id: 'aspirant',
    name: 'CSS Aspirant Monthly',
    pricePKR: 'PKR 1,500',
    period: '/ month',
    credits: 500,
    badge: 'Most Popular',
    highlight: true,
    features: [
      '500 Token-Synced Credits (1.25M Weighted Compute Tokens)',
      '~20–25 Full Essays, ~55 Subjective Answers, or ~110 Outlines',
      'Exact Token Metering (Pay Less for Shorter Scripts)',
      '3-Tier PEEL Paragraph Rewrites & Cloud History'
    ]
  },
  {
    id: 'pro',
    name: 'CSS Allocation Pro',
    pricePKR: 'PKR 3,500',
    period: '/ exam pass',
    credits: 1500,
    badge: 'Best Value',
    features: [
      '1,500 Token-Synced Credits (3.75M Weighted Compute Tokens)',
      '~65+ Full Essays or ~160+ Subjective Answers / Outlines',
      'All 47 Official FPSC Compulsory & Optional Subjects',
      'Priority Gemini 3.8 Flash Engine & PDF Dossiers'
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
        await updateDoc(userRef, { role: 'admin', tier: 'pro', credits: 99999, creditScaleVersion: 2 });
        return { ...existing, role: 'admin', tier: 'pro', credits: 99999, creditScaleVersion: 2 };
      }
      // Auto-migrate v1 flat-credit balances (2/30/100) to v2 Token-Synced Micro-Credits (30/500/1500)
      if (!existing.creditScaleVersion || existing.creditScaleVersion < 2) {
        const migratedCredits = isAdmin ? 99999 : Math.max(0, Math.round((Number(existing.credits) || 0) * 15));
        await updateDoc(userRef, {
          credits: migratedCredits,
          creditScaleVersion: 2
        });
        return { ...existing, credits: migratedCredits, creditScaleVersion: 2 };
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
      credits: isAdmin ? 99999 : 30,
      creditScaleVersion: 2,
      evaluationsCount: 0,
      totalTokensConsumed: 0,
      totalCreditsUsed: 0,
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
      credits: isAdmin ? 99999 : 30,
      creditScaleVersion: 2,
      evaluationsCount: 0
    };
  }
};

export const deductUserCredits = async (uid, creditCost = 4, tokenUsage = null) => {
  if (!uid) return null;
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;

  const data = snap.data();
  const nextCount = (Number(data.evaluationsCount) || 0) + 1;
  const addedTokens = Number(tokenUsage?.totalTokens || 0);
  const nextTotalTokens = (Number(data.totalTokensConsumed) || 0) + addedTokens;
  const nextTotalCreditsUsed = (Number(data.totalCreditsUsed) || 0) + Number(creditCost || 0);

  if (data.role === 'admin') {
    await updateDoc(userRef, {
      evaluationsCount: nextCount,
      totalTokensConsumed: nextTotalTokens,
      totalCreditsUsed: nextTotalCreditsUsed,
      lastEvaluatedAt: new Date().toISOString()
    });
    return {
      ...data,
      evaluationsCount: nextCount,
      totalTokensConsumed: nextTotalTokens,
      totalCreditsUsed: nextTotalCreditsUsed
    };
  }

  const nextCredits = Math.max(0, (Number(data.credits) || 0) - creditCost);

  await updateDoc(userRef, {
    credits: nextCredits,
    evaluationsCount: nextCount,
    totalTokensConsumed: nextTotalTokens,
    totalCreditsUsed: nextTotalCreditsUsed,
    lastEvaluatedAt: new Date().toISOString()
  });

  return {
    ...data,
    credits: nextCredits,
    evaluationsCount: nextCount,
    totalTokensConsumed: nextTotalTokens,
    totalCreditsUsed: nextTotalCreditsUsed
  };
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

export const savePaymentConfig = async ({
  whatsappNumber,
  paymentAccountTitle,
  paymentAccountNumber,
  bankOrWalletName,
  aspirantCheckoutUrl,
  proCheckoutUrl
}) => {
  await setDoc(doc(db, 'platform_config', 'payment'), {
    whatsappNumber: (whatsappNumber || '').trim(),
    paymentAccountTitle: (paymentAccountTitle || '').trim(),
    paymentAccountNumber: (paymentAccountNumber || '').trim(),
    bankOrWalletName: (bankOrWalletName || 'JazzCash / EasyPaisa / RAAST').trim(),
    aspirantCheckoutUrl: (aspirantCheckoutUrl || '').trim(),
    proCheckoutUrl: (proCheckoutUrl || '').trim(),
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

// ─────────────────────────────────────────────────────────────
// IN-APP PAYMENT VERIFICATION QUEUE (JazzCash / EasyPaisa / RAAST TID)
// ─────────────────────────────────────────────────────────────

export const submitPaymentRequest = async ({
  uid,
  email,
  displayName,
  planId,
  planName,
  pricePKR,
  credits,
  paymentMethod,
  transactionId,
  senderAccount,
  receiptImageDataUrl
}) => {
  if (!uid) throw new Error('Please sign in first.');
  const cleanTid = (transactionId || '').trim();
  if (!cleanTid && !receiptImageDataUrl) {
    throw new Error('Please enter your Transaction ID (TID) or attach your payment receipt screenshot.');
  }

  const requestId = `pay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const payload = {
    id: requestId,
    userId: uid,
    userEmail: email || '',
    userName: displayName || 'CSS Candidate',
    planId: planId || 'aspirant',
    planName: planName || 'CSS Aspirant Monthly',
    pricePKR: pricePKR || 'PKR 1,500',
    credits: Number(credits || 30),
    paymentMethod: paymentMethod || 'JazzCash / EasyPaisa / RAAST',
    transactionId: cleanTid || 'Receipt Attached',
    senderAccount: (senderAccount || '').trim(),
    receiptImageDataUrl: receiptImageDataUrl || null,
    status: 'pending', // 'pending' | 'approved' | 'rejected'
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await setDoc(doc(db, 'payment_requests', requestId), payload);
  return payload;
};

export const subscribeToUserProfile = (uid, callback) => {
  if (!uid) return () => {};
  const userRef = doc(db, 'users', uid);
  return onSnapshot(
    userRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data());
      }
    },
    () => {
      // ignore snapshot permission error on sign-out
    }
  );
};

export const subscribeToPendingPaymentCount = (callback) => {
  const q = query(collection(db, 'payment_requests'), where('status', '==', 'pending'));
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.size);
    },
    () => {
      callback(0);
    }
  );
};

export const fetchUserPaymentRequests = async (uid) => {
  if (!uid) return [];
  try {
    const q = query(collection(db, 'payment_requests'), where('userId', '==', uid));
    const snap = await getDocs(q);
    const list = [];
    snap.forEach((docSnap) => list.push(docSnap.data()));
    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return list;
  } catch (_) {
    return [];
  }
};

export const fetchAllPaymentRequests = async () => {
  try {
    const snap = await getDocs(collection(db, 'payment_requests'));
    const list = [];
    snap.forEach((docSnap) => list.push(docSnap.data()));
    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return list;
  } catch (_) {
    return [];
  }
};

export const approvePaymentRequest = async (requestId) => {
  const reqRef = doc(db, 'payment_requests', requestId);

  return runTransaction(db, async (tx) => {
    const reqSnap = await tx.get(reqRef);
    if (!reqSnap.exists()) {
      throw new Error('Payment request not found.');
    }
    const reqData = reqSnap.data();
    if (reqData.status === 'approved') {
      throw new Error('This payment request has already been approved.');
    }

    const userRef = doc(db, 'users', reqData.userId);
    const userSnap = await tx.get(userRef);
    const currentCredits = userSnap.exists() ? Number(userSnap.data().credits || 0) : 0;
    const addedCredits = Number(reqData.credits || 30);
    const updatedCredits = currentCredits + addedCredits;
    const updatedTier = reqData.planId || 'aspirant';
    const nowIso = new Date().toISOString();

    tx.update(reqRef, {
      status: 'approved',
      approvedAt: nowIso,
      updatedAt: nowIso
    });

    if (userSnap.exists()) {
      tx.update(userRef, {
        credits: updatedCredits,
        tier: updatedTier,
        updatedAt: nowIso
      });
    } else {
      tx.set(userRef, {
        uid: reqData.userId,
        email: reqData.userEmail || '',
        displayName: reqData.userName || 'CSS Candidate',
        role: 'candidate',
        tier: updatedTier,
        credits: updatedCredits,
        evaluationsCount: 0,
        createdAt: nowIso,
        updatedAt: nowIso
      });
    }

    return {
      ...reqData,
      status: 'approved',
      approvedAt: nowIso,
      updatedCredits
    };
  });
};

export const rejectPaymentRequest = async (requestId) => {
  const reqRef = doc(db, 'payment_requests', requestId);
  const nowIso = new Date().toISOString();
  await updateDoc(reqRef, {
    status: 'rejected',
    updatedAt: nowIso
  });
  return { id: requestId, status: 'rejected', updatedAt: nowIso };
};
