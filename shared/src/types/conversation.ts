export type MessageRole = 'user' | 'assistant';

export type ConversationPhase = 'clarification' | 'report';

export interface ConversationMessage {
  id: string;
  role: MessageRole;
  content: string;
  phase: ConversationPhase;
  createdAt: Date;
}
