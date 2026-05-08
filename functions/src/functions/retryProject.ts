import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../config";
import { enqueueAgentRun } from "../services/agentRun";
import { assertCanStartRun } from "../services/usage";
import type { Project } from "../../../shared/src/index";

export const retryProject = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const { projectId } = request.data as { projectId: string };
  if (!projectId) {
    throw new HttpsError("invalid-argument", "projectId is required");
  }

  const projectSnap = await db.doc(`projects/${projectId}`).get();
  if (!projectSnap.exists) {
    throw new HttpsError("not-found", "Project not found");
  }

  const project = projectSnap.data() as Project;
  if (project.userId !== request.auth.uid) {
    throw new HttpsError("permission-denied", "You do not own this project");
  }
  if (project.status !== "error") {
    throw new HttpsError(
      "failed-precondition",
      `Retry only valid from error state (current: ${project.status})`,
    );
  }

  await assertCanStartRun(request.auth.uid);

  await db.doc(`projects/${projectId}`).update({
    status: "planning",
    updatedAt: new Date(),
  });

  const runId = await enqueueAgentRun(projectId, request.auth.uid, "full");
  return { runId };
});
