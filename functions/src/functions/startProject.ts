import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../config";
import { getClarificationResponse } from "../services/claude";
import { addMessage } from "../services/conversation";
import { ensureHome } from "../services/home";
import type {
  Project,
  ProjectCategory,
  StartProjectInput,
} from "../../../shared/src/index";
import { CATEGORY_IDS } from "../../../shared/src/constants/categories";

export const startProject = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in to start a project");
  }

  const input = request.data as StartProjectInput;

  if (!input.category || !CATEGORY_IDS.includes(input.category as ProjectCategory)) {
    throw new HttpsError("invalid-argument", "A valid category is required");
  }
  if (!input.title || typeof input.title !== "string") {
    throw new HttpsError("invalid-argument", "Title is required");
  }
  if (!input.description || typeof input.description !== "string") {
    throw new HttpsError("invalid-argument", "Description is required");
  }
  if (!input.zipCode || typeof input.zipCode !== "string") {
    throw new HttpsError("invalid-argument", "Zip code is required");
  }

  const userId = request.auth.uid;
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
