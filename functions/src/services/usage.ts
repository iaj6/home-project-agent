import { db } from "../config";
import { HttpsError } from "firebase-functions/v2/https";

export const USAGE_LIMITS = {
  /** Max concurrent agent runs per user (queued or running). */
  perUserConcurrent: 1,
  /** Max agent runs per user per UTC day (counts retries). */
  perUserPerDay: 5,
  /** Hard wallet ceiling — agent runs across all users per UTC day. ~$1/run. */
  globalPerDay: 75,
  /** Runs older than this in queued/running state are treated as stale and
   *  ignored by the concurrent check. Prevents stuck runs from soft-locking
   *  the user. Wall-clock budget for a real run is ~15 min. */
  staleRunMs: 20 * 60 * 1000,
  /** Max new projects per user per UTC day. Bounds the cost of
   *  startProject (which makes one Claude clarification call). */
  perUserProjectsPerDay: 10,
  /** Wallet ceiling on new projects globally per UTC day. */
  globalProjectsPerDay: 150,
  /** Max clarification messages per project before sendMessage refuses.
   *  Each message is one Claude call. Real conversations rarely exceed 8. */
  maxMessagesPerProject: 30,
};

interface DailyUsageDoc {
  day: string; // YYYY-MM-DD UTC
  runsToday: number;
  projectsToday?: number;
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
  // We additionally filter out stale runs (CPU throttling, container restart,
  // etc.) so a stuck run never soft-locks the user.
  const activeRunsSnap = await db
    .collection("agentRuns")
    .where("userId", "==", userId)
    .where("status", "in", ["queued", "running"])
    .limit(10)
    .get();
  const staleCutoff = Date.now() - USAGE_LIMITS.staleRunMs;
  const liveActive = activeRunsSnap.docs.filter((d) => {
    const started = d.get("startedAt");
    const ms = started?.toMillis ? started.toMillis() : new Date(started).getTime();
    return ms >= staleCutoff;
  });
  if (liveActive.length >= USAGE_LIMITS.perUserConcurrent) {
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

/**
 * Gate on project creation. Each startProject call makes one Claude
 * clarification call (~$0.02-0.05) so unbounded creation = unbounded spend.
 * Caps per-user + globally per UTC day.
 */
export async function assertCanStartProject(userId: string): Promise<void> {
  const day = todayUtc();
  const userRef = db.doc(`usage/${userId}`);
  const globalRef = db.doc(`usage/_global`);

  await db.runTransaction(async (tx) => {
    const [userSnap, globalSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(globalRef),
    ]);
    const userData = userSnap.exists ? (userSnap.data() as DailyUsageDoc) : null;
    const globalData = globalSnap.exists ? (globalSnap.data() as DailyUsageDoc) : null;
    const userToday = userData && userData.day === day ? (userData.projectsToday ?? 0) : 0;
    const globalToday = globalData && globalData.day === day ? (globalData.projectsToday ?? 0) : 0;

    if (userToday >= USAGE_LIMITS.perUserProjectsPerDay) {
      throw new HttpsError(
        "resource-exhausted",
        `Daily project creation limit reached (${USAGE_LIMITS.perUserProjectsPerDay}/day per user). Try again tomorrow.`,
      );
    }
    if (globalToday >= USAGE_LIMITS.globalProjectsPerDay) {
      throw new HttpsError(
        "resource-exhausted",
        "This demo has hit its daily project-creation cap. Try again tomorrow.",
      );
    }

    tx.set(
      userRef,
      { day, projectsToday: userToday + 1 },
      { merge: true },
    );
    tx.set(
      globalRef,
      { day, projectsToday: globalToday + 1 },
      { merge: true },
    );
  });
}

/**
 * Gate on a single clarification message. Caps the total number of user
 * messages on a single project so a user can't spam the clarification model
 * to inflate Claude spend. Real conversations end in 4-8 turns; we cap at 30.
 */
export async function assertCanSendMessage(
  projectId: string,
  currentMessageCount: number,
): Promise<void> {
  if (currentMessageCount >= USAGE_LIMITS.maxMessagesPerProject) {
    throw new HttpsError(
      "resource-exhausted",
      `Conversation has reached the message cap (${USAGE_LIMITS.maxMessagesPerProject}) for project ${projectId}. Start a fresh project if you need to keep iterating.`,
    );
  }
}
