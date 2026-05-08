import { db } from "../config";
import type { MessageRole, ConversationPhase, ConversationMessage } from "../../../shared/src/index";

export async function addMessage(
  projectId: string,
  role: MessageRole,
  content: string,
  phase: ConversationPhase
): Promise<ConversationMessage> {
  const ref = db.collection(`projects/${projectId}/messages`).doc();
  const message: ConversationMessage = {
    id: ref.id,
    role,
    content,
    phase,
    createdAt: new Date(),
  };
  await ref.set(message);
  return message;
}

export async function getMessages(
  projectId: string
): Promise<ConversationMessage[]> {
  const snapshot = await db
    .collection(`projects/${projectId}/messages`)
    .orderBy("createdAt", "asc")
    .get();

  return snapshot.docs.map((doc) => doc.data() as ConversationMessage);
}
