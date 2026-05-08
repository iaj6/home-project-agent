import { anthropic } from "../config";
import { SYSTEM_PROMPT } from "../prompts/system";
import { buildClarificationPrompt, ProjectIntake } from "../prompts/clarification";
import { CATEGORIES } from "../../../shared/src/constants/categories";
import type { ProjectCategory } from "../../../shared/src/index";

interface MessageParam {
  role: "user" | "assistant";
  content: string;
}

export const CLARIFICATION_MODEL = "claude-sonnet-4-6";

export async function getClarificationResponse(
  messages: MessageParam[],
  category: ProjectCategory,
  intake: ProjectIntake,
): Promise<string> {
  const categoryMeta = CATEGORIES[category];
  const clarificationPrompt = buildClarificationPrompt(
    categoryMeta.clarificationGuidance,
    intake,
  );

  const response = await anthropic.messages.create({
    model: CLARIFICATION_MODEL,
    max_tokens: 1024,
    system: `${SYSTEM_PROMPT}\n\n${clarificationPrompt}`,
    messages,
  });

  const block = response.content[0];
  if (block.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }
  return block.text;
}
