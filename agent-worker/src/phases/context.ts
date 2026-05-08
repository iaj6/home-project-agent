import type { AgentRunMode, Home, Project } from '@home-advisor/shared';

export interface TokenTally {
  inputTokens: number;
  outputTokens: number;
  toolCalls: number;
  estimatedCostUsd: number;
}

export interface RunContext {
  runId: string;
  projectId: string;
  userId: string;
  project: Project;
  home: Home | null;
  zipCode: string;
  mode: AgentRunMode;
  followupQuestion?: string;
  tokenTally: TokenTally;
  budgetExhausted: boolean;
}
