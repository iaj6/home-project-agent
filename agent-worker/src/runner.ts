import type { AgentRunMode } from '@home-helper/shared';
import {
  createAgentRun,
  finalizeStep,
  loadHome,
  loadProject,
  resetStepCounter,
  saveReport,
  setAgentRunStatus,
  setProjectStatus,
  updateAgentRun,
  writeStep,
} from './firestore';
import { runPlanPhase } from './phases/plan';
import { runPricePhase } from './phases/price';
import { runLaborPhase } from './phases/labor';
import { runSynthesizePhase } from './phases/synthesize';
import { log } from './util/logger';
import type { RunContext } from './phases/context';

export interface AgentRunJob {
  runId: string;
  projectId: string;
  userId: string;
  mode: AgentRunMode;
  followupQuestion?: string;
}

export async function runAgent(job: AgentRunJob): Promise<void> {
  const startedAt = Date.now();
  resetStepCounter(job.runId);

  log.info('agent run starting', {
    runId: job.runId,
    projectId: job.projectId,
    mode: job.mode,
  });

  try {
    const project = await loadProject(job.projectId);
    const home = project.homeId ? await loadHome(project.homeId) : null;
    const zipCode = home?.zipCode ?? project.zipCode;

    await setAgentRunStatus(job.runId, 'running', { phase: 'plan' });
    await setProjectStatus(job.projectId, 'planning');

    const ctx: RunContext = {
      runId: job.runId,
      projectId: job.projectId,
      userId: job.userId,
      project,
      home,
      zipCode,
      mode: job.mode,
      followupQuestion: job.followupQuestion,
      tokenTally: { inputTokens: 0, outputTokens: 0, toolCalls: 0, estimatedCostUsd: 0 },
      budgetExhausted: false,
    };

    // PHASE 1: PLAN
    await writePhaseTransition(job.runId, 'plan', 'Building project plan.');
    const plan = await runPlanPhase(ctx);

    // PHASE 2: PRICE
    await setAgentRunStatus(job.runId, 'running', { phase: 'price' });
    await setProjectStatus(job.projectId, 'pricing');
    await writePhaseTransition(
      job.runId,
      'price',
      `Pricing ${plan.materials.length} items near ${zipCode}.`,
    );
    const materials = await runPricePhase(ctx, plan);

    // PHASE 3: LABOR
    await setAgentRunStatus(job.runId, 'running', { phase: 'labor' });
    await writePhaseTransition(job.runId, 'labor', 'Looking up labor cost ranges.');
    const labor = await runLaborPhase(ctx, plan);

    // PHASE 4: SYNTHESIZE
    await setAgentRunStatus(job.runId, 'running', { phase: 'synthesize' });
    await setProjectStatus(job.projectId, 'synthesizing');
    await writePhaseTransition(job.runId, 'synthesize', 'Writing the final report.');
    const report = await runSynthesizePhase(ctx, { plan, materials, labor });

    await saveReport(job.projectId, report);
    await setProjectStatus(job.projectId, 'complete', { messageCount: project.messageCount });
    await updateAgentRun(job.runId, {
      totalInputTokens: ctx.tokenTally.inputTokens,
      totalOutputTokens: ctx.tokenTally.outputTokens,
      toolCallCount: ctx.tokenTally.toolCalls,
      estimatedCostUsd: ctx.tokenTally.estimatedCostUsd,
    });
    await setAgentRunStatus(job.runId, 'complete');

    await writeStep(job.runId, {
      kind: 'final',
      summary: `Run complete in ${Math.round((Date.now() - startedAt) / 1000)}s, $${ctx.tokenTally.estimatedCostUsd.toFixed(3)}.`,
    });

    log.info('agent run complete', {
      runId: job.runId,
      durationMs: Date.now() - startedAt,
      tally: ctx.tokenTally,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    log.error('agent run error', { runId: job.runId, error: message, stack });
    await setAgentRunStatus(job.runId, 'error', { errorMessage: message });
    await setProjectStatus(job.projectId, 'error');
    throw err;
  }
}

async function writePhaseTransition(runId: string, phase: string, summary: string) {
  const step = await writeStep(runId, {
    kind: 'phase_transition',
    phase: phase as never,
    summary,
  });
  await finalizeStep(runId, step.id, { durationMs: 0 });
}
