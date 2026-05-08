import { db } from "../config";
import { getJobQueue } from "../queue/job-queue";
import type { AgentRun } from "../../../shared/src/index";

export async function enqueueAgentRun(
  projectId: string,
  userId: string,
  mode: "full" | "followup",
  followupQuestion?: string,
): Promise<string> {
  const ref = db.collection("agentRuns").doc();
  const now = new Date();
  const run: AgentRun = {
    id: ref.id,
    projectId,
    userId,
    status: "queued",
    mode,
    followupQuestion,
    startedAt: now,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    estimatedCostUsd: 0,
    toolCallCount: 0,
  };
  await ref.set(run);
  await db.doc(`projects/${projectId}`).update({
    currentAgentRunId: ref.id,
    updatedAt: now,
  });

  const queue = getJobQueue();
  await queue.publishAgentRun({
    runId: ref.id,
    projectId,
    userId,
    mode,
    followupQuestion,
  });
  return ref.id;
}
