import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../config";
import { getMessages } from "../services/conversation";
import type {
  AgentRun,
  Project,
  ProjectReport,
} from "../../../shared/src/index";

export const getProject = onCall(async (request) => {
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

  const [messages, reportSnap, runSnap] = await Promise.all([
    getMessages(projectId),
    db.doc(`projects/${projectId}/report/main`).get(),
    project.currentAgentRunId
      ? db.doc(`agentRuns/${project.currentAgentRunId}`).get()
      : Promise.resolve(null as never),
  ]);

  const report: ProjectReport | null = reportSnap.exists
    ? (reportSnap.data() as ProjectReport)
    : null;

  const currentRun: AgentRun | null =
    runSnap && runSnap.exists ? (runSnap.data() as AgentRun) : null;

  return { project, messages, report, currentRun };
});
