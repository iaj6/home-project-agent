import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, ANTHROPIC_API_KEY_SECRET } from "../config";
import { getClarificationResponse } from "../services/claude";
import { addMessage } from "../services/conversation";
import { ensureHome } from "../services/home";
import { assertCanStartProject } from "../services/usage";
import { assertStringField } from "../services/input-limits";
import type {
  Project,
  ProjectCategory,
  StartProjectInput,
} from "../../../shared/src/index";
import { CATEGORY_IDS } from "../../../shared/src/constants/categories";

export const startProject = onCall({ secrets: [ANTHROPIC_API_KEY_SECRET] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in to start a project");
  }

  const input = request.data as StartProjectInput;

  if (!input.category || !CATEGORY_IDS.includes(input.category as ProjectCategory)) {
    throw new HttpsError("invalid-argument", "A valid category is required");
  }
  // Length-capped + trimmed. These bound both context-stuffing attacks and
  // copy-paste injection payloads. Real user input is well under the caps.
  const title = assertStringField(input.title, "title");
  const description = assertStringField(input.description, "description");
  const zipCode = assertStringField(input.zipCode, "zipCode");
  input.title = title;
  input.description = description;
  input.zipCode = zipCode;

  const userId = request.auth.uid;

  // Wallet guardrail: cap project creation per user + globally before we
  // spend a clarification Claude call.
  await assertCanStartProject(userId);

  const homeId = input.homeId ?? (await ensureHome(userId, input.zipCode));

  const projectRef = db.collection("projects").doc();
  const now = new Date();

  const project: Project = {
    id: projectRef.id,
    userId,
    homeId,
    category: input.category,
    title: input.title,
    description: input.description,
    zipCode: input.zipCode,
    budget: input.budget,
    timeline: input.timeline,
    experienceLevel: input.experienceLevel,
    status: "clarifying",
    messageCount: 2,
    createdAt: now,
    updatedAt: now,
  };

  await projectRef.set(project);

  await addMessage(projectRef.id, "user", input.description, "clarification");

  const assistantMessage = await getClarificationResponse(
    [{ role: "user", content: input.description }],
    input.category,
    {
      title: input.title,
      description: input.description,
      zipCode: input.zipCode,
      budget: input.budget,
      timeline: input.timeline,
      experienceLevel: input.experienceLevel,
    },
  );

  await addMessage(projectRef.id, "assistant", assistantMessage, "clarification");

  return { projectId: projectRef.id, assistantMessage };
});
