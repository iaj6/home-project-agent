import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../config";
import { enqueueAgentRun } from "../services/agentRun";
import { assertCanStartRun } from "../services/usage";
import type { Project } from "../../../shared/src/index";

export const requestFollowup = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const { projectId, question } = request.data as {
    projectId: string;
    question: string;
  };

  if (!projectId || !question) {
    throw new HttpsError("invalid-argument", "projectId and question are required");
  }

  const projectSnap = await db.doc(`projects/${projectId}`).get();
  if (!projectSnap.exists) {
    throw new HttpsError("not-found", "Project not found");
  }

  const project = projectSnap.data() as Project;
  if (project.userId !== request.auth.uid) {
    throw new HttpsError("permission-denied", "You do not own this project");
  }
  if (project.status !== "complete") {
    throw new HttpsError(
      "failed-precondition",
      "Follow-ups require a completed report",
    );
  }

  await assertCanStartRun(request.auth.uid);

  const runId = await enqueueAgentRun(
    projectId,
    request.auth.uid,
    "followup",
    question,
  );
  return { runId };
});
