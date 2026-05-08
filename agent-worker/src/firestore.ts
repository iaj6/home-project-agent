import { db } from './config';
import type {
  AgentPhase,
  AgentRun,
  AgentRunMode,
  AgentRunStatus,
  AgentStep,
  AgentStepKind,
  Project,
  ProjectReport,
  ProjectStatus,
  Home,
} from '@home-advisor/shared';
import { log } from './util/logger';

export async function loadProject(projectId: string): Promise<Project> {
  const snap = await db.doc(`projects/${projectId}`).get();
  if (!snap.exists) throw new Error(`Project not found: ${projectId}`);
  return snap.data() as Project;
}

export async function loadHome(homeId: string): Promise<Home | null> {
  const snap = await db.doc(`homes/${homeId}`).get();
  if (!snap.exists) return null;
  return snap.data() as Home;
}

export async function setProjectStatus(
  projectId: string,
  status: ProjectStatus,
  extra: Record<string, unknown> = {},
): Promise<void> {
  await db.doc(`projects/${projectId}`).update({
    status,
    updatedAt: new Date(),
    ...extra,
  });
}

export async function createAgentRun(
  projectId: string,
  userId: string,
  mode: AgentRunMode,
  followupQuestion?: string,
): Promise<AgentRun> {
  const ref = db.collection('agentRuns').doc();
  const now = new Date();
  const run: AgentRun = {
    id: ref.id,
    projectId,
    userId,
    status: 'queued',
    mode,
    followupQuestion,
    startedAt: now,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    estimatedCostUsd: 0,
    toolCallCount: 0,
  };
  await ref.set(run);
  await db.doc(`projects/${projectId}`).update({
    currentAgentRunId: ref.id,
    updatedAt: now,
  });
  return run;
}

export async function updateAgentRun(
  runId: string,
  patch: Partial<AgentRun>,
): Promise<void> {
  await db.doc(`agentRuns/${runId}`).update(patch as Record<string, unknown>);
}

export async function setAgentRunStatus(
  runId: string,
  status: AgentRunStatus,
  extra: Partial<AgentRun> = {},
): Promise<void> {
  const patch: Partial<AgentRun> = { status, ...extra };
  if (status === 'complete' || status === 'error') {
    patch.completedAt = new Date();
  }
  await db.doc(`agentRuns/${runId}`).update(patch as Record<string, unknown>);
}

let stepCounter = new Map<string, number>();

function nextIndex(runId: string): number {
  const cur = stepCounter.get(runId) ?? 0;
  const next = cur + 1;
  stepCounter.set(runId, next);
  return next;
}

export function resetStepCounter(runId: string): void {
  stepCounter.delete(runId);
}

interface StepInit {
  kind: AgentStepKind;
  phase?: AgentPhase;
  tool?: string;
  input?: unknown;
  summary: string;
  inputTokens?: number;
  outputTokens?: number;
}

export async function writeStep(runId: string, init: StepInit): Promise<AgentStep> {
  const stepsCol = db.collection(`agentRuns/${runId}/steps`);
  const ref = stepsCol.doc();
  const step: AgentStep = {
    id: ref.id,
    index: nextIndex(runId),
    kind: init.kind,
    phase: init.phase,
    tool: init.tool,
    input: init.input,
    summary: init.summary,
    startedAt: new Date(),
    durationMs: 0,
    inputTokens: init.inputTokens,
    outputTokens: init.outputTokens,
  };
  await ref.set(step);
  log.debug('step', {
    runId,
    kind: step.kind,
    phase: step.phase,
    tool: step.tool,
    summary: step.summary,
  });
  return step;
}

export async function finalizeStep(
  runId: string,
  stepId: string,
  patch: Partial<AgentStep>,
): Promise<void> {
  await db.doc(`agentRuns/${runId}/steps/${stepId}`).update(patch as Record<string, unknown>);
}

export async function saveReport(
  projectId: string,
  report: ProjectReport,
): Promise<void> {
  await db.doc(`projects/${projectId}/report/main`).set(report);
}
