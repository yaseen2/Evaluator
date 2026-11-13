import { FieldValue } from 'firebase-admin/firestore';

const WEIGHTED_TOKENS_PER_CREDIT = 2500;

export const estimateCreditsPreFlight = ({
  isEssay = true,
  essayMode = 'full',
  imageCount = 0,
  wordCount = 0
}) => {
  if (isEssay && (essayMode === 'outline_only' || essayMode === 'outline')) {
    return 6 + Math.ceil((Number(imageCount) || 0) * 0.6);
  }
  if (isEssay) {
    if (imageCount > 0) {
      return Math.min(45, Math.max(18, 16 + imageCount));
    }
    const words = wordCount || 500;
    return Math.min(28, Math.max(18, Math.ceil((44000 + Math.max(0, words - 1200) * 14) / WEIGHTED_TOKENS_PER_CREDIT)));
  }
  if (imageCount > 0) {
    return Math.min(18, Math.max(9, 8 + imageCount));
  }
  const words = wordCount || 400;
  return Math.min(18, Math.max(9, Math.ceil((21000 + Math.max(0, words - 450) * 12) / WEIGHTED_TOKENS_PER_CREDIT)));
};

export const calculateActualCredits = (tokenUsage, fallbackEstimate = 12) => {
  if (!tokenUsage) return fallbackEstimate;
  const input = Number(tokenUsage.inputTokens) || 0;
  const output = Number(tokenUsage.outputTokens) || 0;
  const thinking = Number(tokenUsage.thinkingTokens) || 0;
  const weighted = input + output * 3 + thinking * 2;
  return Math.max(2, Math.min(60, Math.ceil(weighted / WEIGHTED_TOKENS_PER_CREDIT)));
};

/**
 * Atomically reserve credits and lock activeJob to enforce single concurrency
 */
export const reserveUserCredits = async (db, uid, estimatedCredits, isByok = false, jobId) => {
  const userRef = db.doc(`users/${uid}`);

  return await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) {
      throw new Error('User profile does not exist.');
    }
    const user = snap.data();
    const isAdmin = user.role === 'admin';

    // 1. Enforce Concurrency Limit (1 active job at a time; auto-clears immediately when finished, 3-min crash safety expiry)
    if (user.activeJob && user.activeJob.startedAt) {
      const elapsed = Date.now() - user.activeJob.startedAt;
      const THREE_MINUTES = 3 * 60 * 1000;
      if (elapsed < THREE_MINUTES) {
        const err = new Error('An evaluation is already running on this account. Please wait for it to finish.');
        err.code = 'resource-exhausted';
        throw err;
      }
    }

    // 2. Check Credit Balance if not BYOK and not Admin
    const currentCredits = Number(user.credits) || 0;
    const toReserve = isByok || isAdmin ? 0 : estimatedCredits;

    if (!isByok && !isAdmin && currentCredits < toReserve) {
      const err = new Error(`Insufficient credits. This evaluation requires ~${toReserve} credits, but your balance is ${currentCredits}.`);
      err.code = 'failed-precondition';
      throw err;
    }

    const updatedCredits = Math.max(0, currentCredits - toReserve);
    const activeJobData = {
      jobId,
      reservedCredits: toReserve,
      isByok,
      startedAt: Date.now()
    };

    tx.update(userRef, {
      credits: updatedCredits,
      activeJob: activeJobData,
      updatedAt: new Date().toISOString()
    });

    return {
      currentCredits,
      reservedCredits: toReserve,
      remainingCredits: updatedCredits,
      isAdmin,
      isByok
    };
  });
};

/**
 * Atomically settle credits based on actual token usage, refund remainder, and record ledger
 */
export const settleUserCredits = async (db, uid, reservation, tokenUsage, jobId, evaluationId) => {
  const userRef = db.doc(`users/${uid}`);
  const ledgerRef = db.collection('credit_ledger').doc();

  return await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) return null;
    const user = snap.data();

    const actualCredits = reservation.isByok || reservation.isAdmin
      ? 0
      : calculateActualCredits(tokenUsage, reservation.reservedCredits);

    const currentCredits = Number(user.credits) || 0;
    const diff = reservation.reservedCredits - actualCredits;
    // diff > 0 means we reserved more than needed -> refund the surplus!
    // diff < 0 means slight overshoot -> deduct small remaining if available
    const finalCredits = Math.max(0, currentCredits + diff);

    const totalTokens = Number(tokenUsage?.totalTokens) || 0;
    const nextTotalTokens = (Number(user.totalTokensConsumed) || 0) + totalTokens;
    const nextTotalCreditsUsed = (Number(user.totalCreditsUsed) || 0) + actualCredits;
    const nextEvalsCount = (Number(user.evaluationsCount) || 0) + 1;

    tx.update(userRef, {
      credits: finalCredits,
      activeJob: null, // Clear concurrency lock
      evaluationsCount: nextEvalsCount,
      totalTokensConsumed: nextTotalTokens,
      totalCreditsUsed: nextTotalCreditsUsed,
      lastEvaluatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    if (actualCredits > 0) {
      tx.set(ledgerRef, {
        userId: uid,
        jobId,
        evaluationId: evaluationId || null,
        type: 'evaluation_deduction',
        amount: -actualCredits,
        balanceAfter: finalCredits,
        tokenUsage: tokenUsage || null,
        createdAt: new Date().toISOString()
      });
    }

    return {
      finalCredits,
      actualCredits,
      evaluationsCount: nextEvalsCount
    };
  });
};

/**
 * In case of pipeline error: automatically refund reserved credits and release the lock
 */
export const refundUserCreditsOnFailure = async (db, uid, reservation, jobId, errorMessage) => {
  if (!uid || !reservation) return;
  const userRef = db.doc(`users/${uid}`);
  const ledgerRef = db.collection('credit_ledger').doc();

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) return;
      const user = snap.data();

      const refundAmount = Number(reservation.reservedCredits) || 0;
      const currentCredits = Number(user.credits) || 0;
      const restoredCredits = currentCredits + refundAmount;

      tx.update(userRef, {
        credits: restoredCredits,
        activeJob: null, // Clear concurrency lock
        updatedAt: new Date().toISOString()
      });

      if (refundAmount > 0) {
        tx.set(ledgerRef, {
          userId: uid,
          jobId,
          type: 'evaluation_refund',
          amount: refundAmount,
          balanceAfter: restoredCredits,
          reason: errorMessage || 'Pipeline error refund',
          createdAt: new Date().toISOString()
        });
      }
    });
  } catch (err) {
    console.error(`[CreditsManager] Failed to refund credits for user ${uid}:`, err);
  }
};

