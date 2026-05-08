import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../config";
import { getClarificationResponse } from "../services/claude";
import { addMessage, getMessages } from "../services/conversation";
import { enqueueAgentRun } from "../services/agentRun";
import { assertCanStartRun } from "../services/usage";
import type { Project } from "../../../shared/src/index";

const REPORT_READY_RE = /<report_ready>\s*true\s*<\/report_ready>/i;

export const sendMessage = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const { projectId, message } = request.data as {
    projectId: string;
    message: string;
  };

  if (!projectId || !message) {
    throw new HttpsError("invalid-argument", "projectId and message are required");
  }

  const projectRef = db.doc(`projects/${projectId}`);
  const projectSnap = await projectRef.get();

  if (!projectSnap.exists) {
    throw new HttpsError("not-found", "Project not found");
  }

  const project = projectSnap.data() as Project;

  if (project.userId !== request.auth.uid) {
    throw new HttpsError("permission-denied", "You do not own this project");
  }

  if (project.status !== "clarifying") {
    throw new HttpsError(
      "failed-precondition",
      `Project is not in clarifying phase (status=${project.status})`,
    );
  }

  await addMessage(projectId, "user", message, "clarification");

  const history = await getMessages(projectId);
  const apiMessages = history.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const assistantResponse = await getClarificationResponse(
    apiMessages,
    project.category,
    {
      title: project.title,
      description: project.description,
      zipCode: project.zipCode,
      budget: project.budget,
      timeline: project.timeline,
      experienceLevel: project.experienceLevel,
    },
  );

  const reportReady = REPORT_READY_RE.test(assistantResponse);
  const cleanAssistantText = assistantResponse.replace(REPORT_READY_RE, "").trim();
  const visibleMessage =
    cleanAssistantText.length > 0
      ? cleanAssistantText
      : "Great — I have what I need. Generating your project plan now.";

  await addMessage(projectId, "assistant", visibleMessage, "clarification");

  if (reportReady) {
    await assertCanStartRun(request.auth.uid);
    const runId = await enqueueAgentRun(projectId, request.auth.uid, "full");
    await projectRef.update({
      status: "planning",
      currentAgentRunId: runId,
      updatedAt: new Date(),
      messageCount: history.length + 1,
    });
    return {
      assistantMessage: visibleMessage,
      phase: "report" as const,
      runId,
    };
  }

  await projectRef.update({
    updatedAt: new Date(),
    messageCount: history.length + 1,
  });

  return {
    assistantMessage: visibleMessage,
    phase: "clarification" as const,
  };
});
