import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod/v4';

// Mock firebase-admin so config.ts doesn't call initializeApp or touch Firestore.
vi.mock('firebase-admin', () => {
  const db = {
    collection: () => ({ doc: () => ({ set: vi.fn(), update: vi.fn() }) }),
    doc: () => ({
      get: vi.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
      update: vi.fn(),
      set: vi.fn(),
    }),
  };
  return {
    apps: [],
    initializeApp: vi.fn(),
    firestore: () => db,
    auth: () => ({}),
    default: { apps: [], initializeApp: vi.fn(), firestore: () => db, auth: () => ({}) },
  };
});

// Mock the firestore writer so the phase loop's step-writing doesn't try to hit Firestore.
vi.mock('../../src/firestore', async () => {
  return {
    loadProject: vi.fn(),
    loadHome: vi.fn(),
    setProjectStatus: vi.fn(),
    createAgentRun: vi.fn(),
    updateAgentRun: vi.fn(),
    setAgentRunStatus: vi.fn(),
    resetStepCounter: vi.fn(),
    writeStep: vi.fn().mockImplementation(async (_runId: string, init: { summary: string }) => ({
      id: `step-${Math.random().toString(36).slice(2, 8)}`,
      index: 0,
      kind: 'think',
      summary: init.summary,
      startedAt: new Date(),
      durationMs: 0,
    })),
    finalizeStep: vi.fn(),
    saveReport: vi.fn(),
  };
});

// Stub Claude to return canned tool_use / end_turn sequences.
vi.mock('../../src/util/claude', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  const queue: Array<() => { message: unknown; inputTokens: number; outputTokens: number; model: string; durationMs: number }> = [];
  return {
    ...actual,
    callClaude: vi.fn().mockImplementation(async () => {
      const next = queue.shift();
      if (!next) {
        throw new Error('no queued Claude response; test must prime __setClaudeQueue');
      }
      return next();
    }),
    __setClaudeQueue: (items: typeof queue) => {
      queue.length = 0;
      queue.push(...items);
    },
  };
});

import { runPhase } from '../../src/phases/loop';
import type { RunContext } from '../../src/phases/context';
import { fetchHomeDepotSkuTool } from '../../src/tools';

const claudeMod = await import('../../src/util/claude');
const setQueue = (claudeMod as unknown as {
  __setClaudeQueue: (q: Array<() => { message: unknown; inputTokens: number; outputTokens: number; model: string; durationMs: number }>) => void;
}).__setClaudeQueue;

function mockCtx(): RunContext {
  return {
    runId: 'run-test',
    projectId: 'proj-test',
    userId: 'user-test',
    project: {
      id: 'proj-test',
      userId: 'user-test',
      homeId: 'home-test',
      category: 'deck-building',
      title: 't',
      description: 'd',
      zipCode: '30303',
      status: 'planning',
      messageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    home: null,
    zipCode: '30303',
    mode: 'full',
    tokenTally: { inputTokens: 0, outputTokens: 0, toolCalls: 0, estimatedCostUsd: 0 },
    budgetExhausted: false,
  };
}

describe('runPhase tool-use loop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles a plain JSON response without tool use', async () => {
    const schema = z.object({ summary: z.string(), tasks: z.array(z.unknown()) }).strict();
    setQueue([
      () => ({
        message: {
          stop_reason: 'end_turn',
          content: [{ type: 'text', text: '{"summary": "hi", "tasks": []}' }],
          parsed_output: { summary: 'hi', tasks: [] },
          usage: { input_tokens: 10, output_tokens: 8 },
        },
        inputTokens: 10,
        outputTokens: 8,
        model: 'claude-sonnet-4-6',
        durationMs: 50,
      }),
    ]);

    const ctx = mockCtx();
    const result = await runPhase(ctx, {
      phase: 'plan',
      systemPrompt: 'sys',
      initialUserMessage: 'hi',
      tools: [],
      outputSchema: schema,
    });

    expect(result.parsedOutput?.summary).toBe('hi');
    expect(ctx.tokenTally.inputTokens).toBe(10);
    expect(ctx.tokenTally.outputTokens).toBe(8);
  });

  it('executes tool calls and feeds results back, then finalizes', async () => {
    // Make the HD tool cassette-free: mock its run.
    const origRun = fetchHomeDepotSkuTool.run;
    (fetchHomeDepotSkuTool as unknown as { run: typeof origRun }).run = async () => ({
      retailer: 'home_depot' as const,
      query: '2x6 PT',
      zipCode: '30303',
      products: [
        {
          retailer: 'home_depot' as const,
          name: '2x6x8 PT',
          sku: '999',
          unitPrice: 8.42,
          productUrl: 'https://www.homedepot.com/p/x/999',
          inStock: true,
        },
      ],
      source: 'cassette' as const,
      warnings: [],
    });

    setQueue([
      () => ({
        message: {
          stop_reason: 'tool_use',
          content: [
            {
              type: 'tool_use',
              id: 'toolu_1',
              name: 'fetch_home_depot_sku',
              input: { query: '2x6 PT', zipCode: '30303' },
            },
          ],
          usage: { input_tokens: 20, output_tokens: 4 },
        },
        inputTokens: 20,
        outputTokens: 4,
        model: 'claude-sonnet-4-6',
        durationMs: 60,
      }),
      () => ({
        message: {
          stop_reason: 'end_turn',
          content: [{ type: 'text', text: '{"items": [{"sku":"999","name":"2x6x8 PT"}]}' }],
          parsed_output: { items: [{ sku: '999', name: '2x6x8 PT' }] },
          usage: { input_tokens: 30, output_tokens: 10 },
        },
        inputTokens: 30,
        outputTokens: 10,
        model: 'claude-sonnet-4-6',
        durationMs: 50,
      }),
    ]);

    try {
      const priceSchema = z.object({
        items: z.array(z.object({ sku: z.string(), name: z.string() }).strict()),
      }).strict();
      const ctx = mockCtx();
      const result = await runPhase(ctx, {
        phase: 'price',
        systemPrompt: 'sys',
        initialUserMessage: 'price stuff',
        tools: [fetchHomeDepotSkuTool as never],
        outputSchema: priceSchema,
      });

      expect(result.parsedOutput?.items[0].sku).toBe('999');
      expect(ctx.tokenTally.toolCalls).toBe(1);
      expect(ctx.tokenTally.inputTokens).toBe(50);
    } finally {
      (fetchHomeDepotSkuTool as unknown as { run: typeof origRun }).run = origRun;
    }
  });

  it('respects the iteration cap when Claude keeps requesting tools', async () => {
    setQueue(
      Array.from({ length: 5 }, () => () => ({
        message: {
          stop_reason: 'tool_use',
          content: [
            {
              type: 'tool_use',
              id: 'toolu_loop',
              name: 'fetch_home_depot_sku',
              input: { query: 'x', zipCode: '30303' },
            },
          ],
          usage: { input_tokens: 5, output_tokens: 2 },
        },
        inputTokens: 5,
        outputTokens: 2,
        model: 'claude-sonnet-4-6',
        durationMs: 20,
      })),
    );
    const origRun = fetchHomeDepotSkuTool.run;
    (fetchHomeDepotSkuTool as unknown as { run: typeof origRun }).run = async () => ({
      retailer: 'home_depot' as const,
      query: 'x',
      zipCode: '30303',
      products: [],
      source: 'cassette' as const,
      warnings: [],
    });

    try {
      const ctx = mockCtx();
      const result = await runPhase(ctx, {
        phase: 'price',
        systemPrompt: 'sys',
        initialUserMessage: 'run',
        tools: [fetchHomeDepotSkuTool as never],
        maxIterations: 3,
      });
      expect(result.iterations).toBe(3);
    } finally {
      (fetchHomeDepotSkuTool as unknown as { run: typeof origRun }).run = origRun;
    }
  });
});
