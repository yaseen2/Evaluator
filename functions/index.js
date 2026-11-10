import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import crypto from 'crypto';

import { executeMultiAgentPipeline } from './src/pipeline/geminiRunner.js';
import {
  estimateCreditsPreFlight,
  reserveUserCredits,
  settleUserCredits,
  refundUserCreditsOnFailure
} from './src/services/creditsManager.js';
import { PLATFORM_PLANS } from './src/data/plans.js';

initializeApp();
const db = getFirestore();
const auth = getAuth();

const ADMIN_EMAIL = 'yaseenwazir953@gmail.com';

const verifyIsAdmin = (authContext) => {
  if (!authContext) return false;
  return (
    authContext.token?.admin === true ||
    (authContext.token?.email && authContext.token.email.toLowerCase() === ADMIN_EMAIL.toLowerCase())
  );
};

// ─────────────────────────────────────────────────────────────
// 1. EVALUATE SUBMISSION (Core Secure Server DAG Pipeline)
// ─────────────────────────────────────────────────────────────

export const evaluateSubmission = onCall(
  {
    region: 'asia-south1',
    timeoutSeconds: 300,
    memory: '1GiB',
    maxInstances: 50
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'You must be signed in to evaluate an answer script.');
    }

    const {
      text,
      imageArray,
      subject = 'English Essay',
      essayMode = 'full',
      examQuestion = '',
      mode = 'digital',
      apiKey: userApiKey,
      selectedModel = 'auto'
    } = request.data || {};

    if (!text && (!imageArray || imageArray.length === 0)) {
      throw new HttpsError('invalid-argument', 'Please provide either typed text or scanned answer pages.');
    }

    // Input Validation to prevent resource abuse
    if (imageArray && imageArray.length > 14) {
      throw new HttpsError('invalid-argument', 'Maximum 14 pages allowed per single evaluation.');
    }

    const wordCount = text ? text.trim().split(/\s+/).length : 0;
    if (wordCount > 9000) {
      throw new HttpsError('invalid-argument', 'Submission exceeds maximum length of 9,000 words.');
    }

    const isEssay = (subject || '').toLowerCase().includes('essay');
    const imageCount = imageArray?.length || 0;
    const jobId = `job-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

    // 1. Determine API Key (BYOK vs Platform Master Key)
    let effectiveKey = '';
    let isByok = false;

    if (userApiKey && typeof userApiKey === 'string' && userApiKey.trim().length >= 30) {
      effectiveKey = userApiKey.trim();
      isByok = true;
    } else {
      // Read platform key securely on server (Never exposed to browser clients)
      effectiveKey = process.env.GEMINI_API_KEY || '';
      if (!effectiveKey) {
        try {
          const cfgSnap = await db.doc('platform_config/gemini').get();
          if (cfgSnap.exists && cfgSnap.data()?.apiKey) {
            effectiveKey = cfgSnap.data().apiKey.trim();
          }
        } catch (err) {
          console.warn('[CloudFunctions] Could not read platform_config/gemini:', err.message);
        }
      }

      if (!effectiveKey) {
        throw new HttpsError(
          'failed-precondition',
          'The evaluation engine is temporarily unconfigured. Please contact support or configure the platform key in Admin Console.'
        );
      }
    }

    // 2. Pre-Flight Credit Calculation
    const estimatedCredits = estimateCreditsPreFlight({
      isEssay,
      essayMode,
      imageCount,
      wordCount
    });

    // 3. Atomic Credit Reservation & Concurrency Lock
    let reservation = null;
    try {
      reservation = await reserveUserCredits(db, uid, estimatedCredits, isByok, jobId);
    } catch (err) {
      if (err.code === 'resource-exhausted') {
        throw new HttpsError('resource-exhausted', err.message);
      }
      if (err.code === 'failed-precondition') {
        throw new HttpsError('failed-precondition', err.message);
      }
      throw new HttpsError('internal', err.message || 'Failed to verify account credits.');
    }

    // 4. Run the 6-Agent DAG Pipeline with Backoff & Retries
    try {
      const result = await executeMultiAgentPipeline({
        text,
        imageArray,
        subject,
        essayMode,
        examQuestion,
        mode,
        apiKey: effectiveKey,
        selectedModel
      });

      // 5. Atomic Settlement & Cloud Firestore Save
      const evaluationId = result.id || `eval-${Date.now()}`;
      result.id = evaluationId;
      result.userId = uid;
      result.verifiedBy = 'server';
      result.completedAt = new Date().toISOString();

      const settlement = await settleUserCredits(
        db,
        uid,
        reservation,
        result.tokenUsage,
        jobId,
        evaluationId
      );

      // Save evaluation document directly from server
      const { imagePages, ...cloudSafeEvaluation } = result;
      await db.doc(`evaluations/${evaluationId}`).set({
        ...cloudSafeEvaluation,
        userId: uid,
        jobId,
        createdAt: new Date().toISOString()
      });

      return {
        success: true,
        evaluation: result,
        creditsConsumed: settlement?.actualCredits || estimatedCredits,
        remainingCredits: settlement?.finalCredits
      };
    } catch (pipelineErr) {
      console.error('[CloudFunctions] Pipeline failed, executing refund:', pipelineErr);
      // Automatic full refund on any pipeline error
      await refundUserCreditsOnFailure(db, uid, reservation, jobId, pipelineErr.message);

      throw new HttpsError(
        'internal',
        pipelineErr.message || 'Evaluation pipeline encountered an error. Your credits have been restored.'
      );
    }
  }
);

// ─────────────────────────────────────────────────────────────
// 2. REDEEM VOUCHER (Atomic Server-Side Code Validation)
// ─────────────────────────────────────────────────────────────

export const redeemVoucher = onCall(
  { region: 'asia-south1' },
  async (request) => {
    const uid = request.auth?.uid;
    const userEmail = request.auth?.token?.email || '';

    if (!uid) {
      throw new HttpsError('unauthenticated', 'Please sign in first to activate a voucher code.');
    }

    const rawCode = request.data?.code;
    const cleanCode = (rawCode || '').trim().toUpperCase();
    if (!cleanCode) {
      throw new HttpsError('invalid-argument', 'Please enter a valid activation code.');
    }

    const voucherRef = db.doc(`vouchers/${cleanCode}`);
    const userRef = db.doc(`users/${uid}`);
    const ledgerRef = db.collection('credit_ledger').doc();

    return await db.runTransaction(async (tx) => {
      const voucherSnap = await tx.get(voucherRef);
      if (!voucherSnap.exists) {
        throw new HttpsError('not-found', `Activation code "${cleanCode}" is invalid.`);
      }

      const voucher = voucherSnap.data();
      if (voucher.isRedeemed) {
        throw new HttpsError('already-exists', 'This activation code has already been redeemed.');
      }

      const userSnap = await tx.get(userRef);
      const currentCredits = userSnap.exists ? Number(userSnap.data().credits || 0) : 0;
      const addedCredits = Number(voucher.credits || 30);
      const updatedCredits = currentCredits + addedCredits;
      const updatedTier = voucher.tier || 'pro';
      const nowIso = new Date().toISOString();

      tx.update(voucherRef, {
        isRedeemed: true,
        redeemedByUid: uid,
        redeemedByEmail: userEmail,
        redeemedAt: nowIso
      });

      tx.update(userRef, {
        credits: updatedCredits,
        tier: updatedTier,
        updatedAt: nowIso
      });

      tx.set(ledgerRef, {
        userId: uid,
        type: 'voucher_redemption',
        voucherCode: cleanCode,
        amount: addedCredits,
        balanceAfter: updatedCredits,
        createdAt: nowIso
      });

      return {
        success: true,
        addedCredits,
        updatedCredits,
        updatedTier,
        planLabel: voucher.label || `${addedCredits} Credits`
      };
    });
  }
);

// ─────────────────────────────────────────────────────────────
// 3. APPROVE PAYMENT REQUEST (Admin-Controlled & Plan-Validated)
// ─────────────────────────────────────────────────────────────

export const approvePayment = onCall(
  { region: 'asia-south1' },
  async (request) => {
    if (!verifyIsAdmin(request.auth)) {
      throw new HttpsError('permission-denied', 'Only administrators can approve payment requests.');
    }

    const requestId = request.data?.requestId;
    if (!requestId) {
      throw new HttpsError('invalid-argument', 'Missing requestId.');
    }

    const reqRef = db.doc(`payment_requests/${requestId}`);
    const ledgerRef = db.collection('credit_ledger').doc();

    return await db.runTransaction(async (tx) => {
      const reqSnap = await tx.get(reqRef);
      if (!reqSnap.exists) {
        throw new HttpsError('not-found', 'Payment request not found.');
      }

      const reqData = reqSnap.data();
      if (reqData.status === 'approved') {
        throw new HttpsError('already-exists', 'This payment request has already been approved.');
      }

      // Authoritative plan lookup (Prevents client credit injection)
      const authoritativePlan = PLATFORM_PLANS[reqData.planId] || {
        credits: 30,
        tier: 'aspirant'
      };
      const addedCredits = Number(authoritativePlan.credits);
      const targetTier = authoritativePlan.tier || reqData.planId || 'pro';

      const userRef = db.doc(`users/${reqData.userId}`);
      const userSnap = await tx.get(userRef);
      const currentCredits = userSnap.exists ? Number(userSnap.data().credits || 0) : 0;
      const updatedCredits = currentCredits + addedCredits;
      const nowIso = new Date().toISOString();

      tx.update(reqRef, {
        status: 'approved',
        approvedAt: nowIso,
        approvedBy: request.auth.token.email || 'admin',
        creditsGranted: addedCredits,
        updatedAt: nowIso
      });

      if (userSnap.exists) {
        tx.update(userRef, {
          credits: updatedCredits,
          tier: targetTier,
          updatedAt: nowIso
        });
      } else {
        tx.set(userRef, {
          uid: reqData.userId,
          email: reqData.userEmail || '',
          displayName: reqData.userName || 'CSS Candidate',
          role: 'candidate',
          tier: targetTier,
          credits: updatedCredits,
          evaluationsCount: 0,
          createdAt: nowIso,
          updatedAt: nowIso
        });
      }

      tx.set(ledgerRef, {
        userId: reqData.userId,
        type: 'payment_approval',
        requestId,
        planId: reqData.planId,
        amount: addedCredits,
        balanceAfter: updatedCredits,
        approvedBy: request.auth.token.email || 'admin',
        createdAt: nowIso
      });

      return {
        success: true,
        status: 'approved',
        updatedCredits,
        addedCredits
      };
    });
  }
);

// ─────────────────────────────────────────────────────────────
// 4. REJECT PAYMENT REQUEST
// ─────────────────────────────────────────────────────────────

export const rejectPayment = onCall(
  { region: 'asia-south1' },
  async (request) => {
    if (!verifyIsAdmin(request.auth)) {
      throw new HttpsError('permission-denied', 'Only administrators can reject payment requests.');
    }

    const requestId = request.data?.requestId;
    if (!requestId) {
      throw new HttpsError('invalid-argument', 'Missing requestId.');
    }

    const reqRef = db.doc(`payment_requests/${requestId}`);
    const nowIso = new Date().toISOString();

    await reqRef.update({
      status: 'rejected',
      rejectedAt: nowIso,
      rejectedBy: request.auth.token.email || 'admin',
      updatedAt: nowIso
    });

    return { success: true, status: 'rejected' };
  }
);

// ─────────────────────────────────────────────────────────────
// 5. ADMIN DIRECT CREDIT GRANT
// ─────────────────────────────────────────────────────────────

export const adminGrantCredits = onCall(
  { region: 'asia-south1' },
  async (request) => {
    if (!verifyIsAdmin(request.auth)) {
      throw new HttpsError('permission-denied', 'Only administrators can grant credits.');
    }

    const { targetUid, addedCredits = 30, tier = 'aspirant' } = request.data || {};
    if (!targetUid) {
      throw new HttpsError('invalid-argument', 'Missing targetUid.');
    }

    const userRef = db.doc(`users/${targetUid}`);
    const ledgerRef = db.collection('credit_ledger').doc();

    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) {
        throw new HttpsError('not-found', 'User does not exist.');
      }

      const currentCredits = Number(snap.data().credits || 0);
      const updatedCredits = currentCredits + Number(addedCredits);
      const nowIso = new Date().toISOString();

      tx.update(userRef, {
        credits: updatedCredits,
        tier,
        updatedAt: nowIso
      });

      tx.set(ledgerRef, {
        userId: targetUid,
        type: 'admin_manual_grant',
        amount: Number(addedCredits),
        balanceAfter: updatedCredits,
        grantedBy: request.auth.token.email || 'admin',
        createdAt: nowIso
      });

      return {
        success: true,
        updatedCredits,
        tier
      };
    });
  }
);

// ─────────────────────────────────────────────────────────────
// 6. CREATE VOUCHER (Cryptographically Secure Codes)
// ─────────────────────────────────────────────────────────────

export const createVoucher = onCall(
  { region: 'asia-south1' },
  async (request) => {
    if (!verifyIsAdmin(request.auth)) {
      throw new HttpsError('permission-denied', 'Only administrators can generate vouchers.');
    }

    const { credits = 500, tier = 'pro', label = 'Aspirant Pro (500 Credits)', customCode = '' } = request.data || {};

    const secureHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const code = (customCode || `CSS-${tier.toUpperCase()}-${secureHex}`).trim().toUpperCase();

    const voucherData = {
      code,
      credits: Number(credits),
      tier,
      label,
      isRedeemed: false,
      redeemedByEmail: null,
      redeemedByUid: null,
      redeemedAt: null,
      createdBy: request.auth.token.email || 'admin',
      createdAt: new Date().toISOString()
    };

    await db.doc(`vouchers/${code}`).set(voucherData);
    return { success: true, voucher: voucherData };
  }
);

// ─────────────────────────────────────────────────────────────
// 7. SET ADMIN CUSTOM CLAIM (Bootstrap Script / Admin Anchor)
// ─────────────────────────────────────────────────────────────

export const setAdminClaim = onCall(
  { region: 'asia-south1' },
  async (request) => {
    const callerEmail = request.auth?.token?.email || '';
    if (callerEmail.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      throw new HttpsError('permission-denied', 'Unauthorized.');
    }

    await auth.setCustomUserClaims(request.auth.uid, { admin: true });
    return { success: true, message: `Admin custom claim set on ${callerEmail}` };
  }
);
