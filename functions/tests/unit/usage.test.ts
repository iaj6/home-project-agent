/**
 * Tests for the usage gate — the only thing standing between an attacker
 * and an unbounded Anthropic/Crawlbase bill. These are the highest-value
 * tests in the entire codebase right now.
 *
 * Strategy: stub firebase-admin (db, transactions, queries) with a
 * deterministic in-memory implementation. We're not testing Firestore;
 * we're testing the gate logic on top of it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Build a minimal in-memory Firestore that supports the surface the
//     usage service actually uses: .doc().get/.set/.update, transactions
//     with tx.get/.set, and .collection().where().limit().get().
// ────────────────────────────────────────────────────────────────────
interface FakeQueryResult {
  docs: { id: string; get: (field: string) => unknown; data: () => Record<string, unknown> }[];
  size: number;
}

function makeFakeDb() {
  const store = new Map<string, Record<string, unknown>>();
  const runs: Record<string, unknown>[] = [];

  const docRef = (path: string) => ({
    path,
    get: async () => {
      const data = store.get(path);
      return {
        exists: data !== undefined,
        data: () => data ?? null,
      };
    },
    set: async (data: Record<string, unknown>, opts?: { merge?: boolean }) => {
      const prev = opts?.merge ? store.get(path) ?? {} : {};
      store.set(path, { ...prev, ...data });
    },
    update: async (data: Record<string, unknown>) => {
      const prev = store.get(path) ?? {};
      store.set(path, { ...prev, ...data });
    },
  });

  const fakeRunsCollection = {
    where(field: string, _op: string, value: unknown) {
      const filters: Array<(d: Record<string, unknown>) => boolean> = [];
      filters.push((d) => {
        if (field === 'userId') return d.userId === value;
        if (field === 'status') {
          const arr = value as string[];
          return arr.includes(d.status as string);
        }
        return true;
      });
      const chain = {
        where(f: string, _op: string, v: unknown) {
          filters.push((d) => {
            if (f === 'userId') return d.userId === v;
            if (f === 'status') {
              const arr = v as string[];
              return arr.includes(d.status as string);
            }
            return true;
          });
          return chain;
        },
        limit(_n: number) {
          return chain;
        },
        async get(): Promise<FakeQueryResult> {
          const matching = runs.filter((r) => filters.every((f) => f(r)));
          return {
            size: matching.length,
            docs: matching.map((r, i) => ({
              id: `run-${i}`,
              get: (field: string) => r[field],
              data: () => r,
            })),
          };
        },
      };
      return chain;
    },
  };

  return {
    store,
    runs,
    db: {
      doc: docRef,
      collection: (name: string) => {
        if (name === 'agentRuns') return fakeRunsCollection;
        return { where: () => fakeRunsCollection } as never;
      },
      runTransaction: async <T>(fn: (tx: {
        get: (ref: ReturnType<typeof docRef>) => Promise<{ exists: boolean; data: () => Record<string, unknown> | null }>;
        set: (ref: ReturnType<typeof docRef>, data: Record<string, unknown>, opts?: { merge?: boolean }) => void;
      }) => Promise<T>): Promise<T> => {
        return fn({
          get: async (ref) => ref.get(),
          set: (ref, data, opts) => {
            void ref.set(data, opts);
          },
        });
      },
    },
  };
}

let fake = makeFakeDb();

vi.mock('firebase-admin', () => ({
  initializeApp: vi.fn(),
  apps: [],
  firestore: () => fake.db,
  auth: () => ({}),
  default: {
    initializeApp: vi.fn(),
    apps: [],
    firestore: () => fake.db,
    auth: () => ({}),
  },
}));

vi.mock('../../src/config', () => ({
  db: { /* will be replaced via re-import */ } as never,
}));

// Import after mocks are set up.
let usage: typeof import('../../src/services/usage');
beforeEach(async () => {
  fake = makeFakeDb();
  vi.resetModules();
  vi.doMock('../../src/config', () => ({ db: fake.db }));
  usage = await import('../../src/services/usage');
});

afterEach(() => {
  vi.useRealTimers();
});

// ────────────────────────────────────────────────────────────────────

describe('assertCanStartRun', () => {
  it('allows the first run', async () => {
    await expect(usage.assertCanStartRun('user-a')).resolves.toBeUndefined();
  });

  it('increments per-user + global counters', async () => {
    await usage.assertCanStartRun('user-a');
    await usage.assertCanStartRun('user-a');
    const u = fake.store.get('usage/user-a');
    const g = fake.store.get('usage/_global');
    expect((u as { runsToday: number }).runsToday).toBe(2);
    expect((g as { runsToday: number }).runsToday).toBe(2);
  });

  it('rejects when the per-user daily cap is reached', async () => {
    const cap = usage.USAGE_LIMITS.perUserPerDay;
    for (let i = 0; i < cap; i++) {
      await usage.assertCanStartRun('user-a');
    }
    await expect(usage.assertCanStartRun('user-a')).rejects.toThrow(
      /daily limit reached/i,
    );
  });

  it('rejects when the global daily cap is reached', async () => {
    const cap = usage.USAGE_LIMITS.globalPerDay;
    // Different users each, so we never hit per-user cap.
    for (let i = 0; i < cap; i++) {
      await usage.assertCanStartRun(`u-${i}`);
    }
    await expect(usage.assertCanStartRun('u-overflow')).rejects.toThrow(
      /daily usage cap/i,
    );
  });

  it('does NOT count stale (>20min old) queued/running runs as concurrent', async () => {
    // Inject a stuck run that started 30 minutes ago.
    fake.runs.push({
      userId: 'user-a',
      status: 'queued',
      startedAt: { toMillis: () => Date.now() - 30 * 60_000 },
    });
    // Should still be allowed.
    await expect(usage.assertCanStartRun('user-a')).resolves.toBeUndefined();
  });

  it('rejects when a live (<20min old) concurrent run exists', async () => {
    fake.runs.push({
      userId: 'user-a',
      status: 'running',
      startedAt: { toMillis: () => Date.now() - 60_000 },
    });
    await expect(usage.assertCanStartRun('user-a')).rejects.toThrow(
      /already have a project being analyzed/i,
    );
  });

  it("does not double-count a different user's runs", async () => {
    fake.runs.push({
      userId: 'someone-else',
      status: 'running',
      startedAt: { toMillis: () => Date.now() - 60_000 },
    });
    await expect(usage.assertCanStartRun('user-a')).resolves.toBeUndefined();
  });

  it('rolls the daily counter on day change', async () => {
    // Day 1 — burn the cap.
    const cap = usage.USAGE_LIMITS.perUserPerDay;
    for (let i = 0; i < cap; i++) {
      await usage.assertCanStartRun('user-a');
    }
    // Simulate yesterday's record by rewriting the stored day.
    const yesterday = '2020-01-01';
    fake.store.set('usage/user-a', { day: yesterday, runsToday: cap });
    fake.store.set('usage/_global', { day: yesterday, runsToday: cap });
    // Now today's first call should succeed.
    await expect(usage.assertCanStartRun('user-a')).resolves.toBeUndefined();
    const u = fake.store.get('usage/user-a');
    expect((u as { runsToday: number }).runsToday).toBe(1);
  });
});

describe('assertCanStartProject', () => {
  it('allows the first project', async () => {
    await expect(usage.assertCanStartProject('user-a')).resolves.toBeUndefined();
  });

  it('increments per-user + global project counters', async () => {
    await usage.assertCanStartProject('user-a');
    await usage.assertCanStartProject('user-a');
    const u = fake.store.get('usage/user-a');
    expect((u as { projectsToday: number }).projectsToday).toBe(2);
  });

  it('rejects when the per-user project cap is reached', async () => {
    const cap = usage.USAGE_LIMITS.perUserProjectsPerDay;
    for (let i = 0; i < cap; i++) {
      await usage.assertCanStartProject('user-a');
    }
    await expect(usage.assertCanStartProject('user-a')).rejects.toThrow(
      /project creation limit/i,
    );
  });

  it('rejects when the global project cap is reached', async () => {
    const cap = usage.USAGE_LIMITS.globalProjectsPerDay;
    for (let i = 0; i < cap; i++) {
      await usage.assertCanStartProject(`u-${i}`);
    }
    await expect(usage.assertCanStartProject('u-overflow')).rejects.toThrow(
      /project-creation cap/i,
    );
  });

  it('does not interfere with the runs counter', async () => {
    await usage.assertCanStartProject('user-a');
    await usage.assertCanStartRun('user-a');
    const u = fake.store.get('usage/user-a') as {
      runsToday: number;
      projectsToday: number;
    };
    expect(u.runsToday).toBe(1);
    expect(u.projectsToday).toBe(1);
  });
});

describe('assertCanSendMessage', () => {
  it('allows when current count is below the cap', async () => {
    await expect(
      usage.assertCanSendMessage('proj-1', 5),
    ).resolves.toBeUndefined();
  });

  it('rejects when current count is at or over the cap', async () => {
    const cap = usage.USAGE_LIMITS.maxMessagesPerProject;
    await expect(
      usage.assertCanSendMessage('proj-1', cap),
    ).rejects.toThrow(/message cap/i);
    await expect(
      usage.assertCanSendMessage('proj-1', cap + 5),
    ).rejects.toThrow(/message cap/i);
  });

  it('uses the cap from USAGE_LIMITS', () => {
    expect(usage.USAGE_LIMITS.maxMessagesPerProject).toBeGreaterThan(0);
  });
});
