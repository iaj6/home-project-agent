export type AgentRunStatus = 'queued' | 'running' | 'complete' | 'error';

export type AgentPhase = 'plan' | 'price' | 'labor' | 'synthesize';

export type AgentRunMode = 'full' | 'followup';

export interface AgentRun {
  id: string;
  projectId: string;
  userId: string;
  status: AgentRunStatus;
  mode: AgentRunMode;
  followupQuestion?: string;
  phase?: AgentPhase;
  startedAt: Date;
  completedAt?: Date;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCostUsd: number;
  toolCallCount: number;
  errorMessage?: string;
}

export type AgentStepKind = 'think' | 'tool_call' | 'tool_result' | 'final' | 'phase_transition';

export interface AgentStep {
  id: string;
  index: number;
  kind: AgentStepKind;
  phase?: AgentPhase;
  tool?: string;
  input?: unknown;
  output?: unknown;
  summary: string;
  startedAt: Date;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
  errorMessage?: string;
}

export interface PlannedMaterial {
  id: string;
  genericName: string;
  spec: string;
  qty: number;
  unit: string;
  reasoning: string;
}

export interface PlannedTask {
  name: string;
  description: string;
  estimatedHours: number;
  difficulty: 'easy' | 'moderate' | 'hard';
  requiresPermit: boolean;
  order: number;
}

export interface PlanDraft {
  summary: string;
  complexityScore: number;
  diyFeasibilityScore: number;
  estimatedDuration: string;
  tasks: PlannedTask[];
  materials: PlannedMaterial[];
  laborCategory: string;
  openQuestions: string[];
}
