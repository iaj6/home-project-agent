import { db } from "../config";
import { HttpsError } from "firebase-functions/v2/https";

export const USAGE_LIMITS = {
  /** Max concurrent agent runs per user (queued or running). */
  perUserConcurrent: 1,
  /** Max agent runs per user per UTC day (counts retries). */
  perUserPerDay: 3,
  /** Hard wallet ceiling — agent runs across all users per UTC day. ~$1/run. */
  globalPerDay: 30,
};

interface DailyUsageDoc {
  day: string; // YYYY-MM-DD UTC
  runsToday: number;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Throws HttpsError("resource-exhausted") if the user is over any cap.
 * Atomically increments per-user + global counters on success.
 *
 * Call BEFORE enqueueAgentRun. If enqueue fails downstream, the counter is
 * slightly inflated for the day — acceptable; failed runs don't cost money
 * and the cap is meant as a wallet guardrail, not exact accounting.
 */
export async function assertCanStartRun(userId: string): Promise<void> {
  const day = todayUtc();
  const userRef = db.doc(`usage/${userId}`);
  const globalRef = db.doc(`usage/_global`);

  // Concurrent check first — common rejection path, no transaction needed.
  const activeRunsSnap = await db
    .collection("agentRuns")
    .where("userId", "==", userId)
    .where("status", "in", ["queued", "running"])
    .limit(USAGE_LIMITS.perUserConcurrent + 1)
    .get();
  if (activeRunsSnap.size >= USAGE_LIMITS.perUserConcurrent) {
    throw new HttpsError(
      "resource-exhausted",
      "You already have a project being analyzed. Please wait for it to finish before starting another.",
    );
  }

  // Daily-cap check + increment, atomic.
  await db.runTransaction(async (tx) => {
    const [userSnap, globalSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(globalRef),
    ]);

    const userData = userSnap.exists ? (userSnap.data() as DailyUsageDoc) : null;
    const globalData = globalSnap.exists ? (globalSnap.data() as DailyUsageDoc) : null;

    const userToday = userData && userData.day === day ? userData.runsToday : 0;
    const globalToday = globalData && globalData.day === day ? globalData.runsToday : 0;

    if (userToday >= USAGE_LIMITS.perUserPerDay) {
      throw new HttpsError(
        "resource-exhausted",
        `Daily limit reached (${USAGE_LIMITS.perUserPerDay} projects per day). Try again tomorrow.`,
      );
    }
    if (globalToday >= USAGE_LIMITS.globalPerDay) {
      throw new HttpsError(
        "resource-exhausted",
        "This demo has hit its daily usage cap. Please try again tomorrow.",
      );
    }

    tx.set(userRef, { day, runsToday: userToday + 1 }, { merge: true });
    tx.set(globalRef, { day, runsToday: globalToday + 1 }, { merge: true });
  });
}
