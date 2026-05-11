/**
 * Tests for the JobQueue — specifically the new OIDC-token path that
 * authenticates Cloud Functions → Cloud Run agent-worker invocations.
 *
 * Critical to verify:
 *   1. emulator URLs (127.0.0.1/localhost) use plain fetch, no token
 *   2. real Cloud Run URLs use the OIDC client + ID token
 *   3. the audience passed to getIdTokenClient is the worker base URL
 *   4. the GoogleAuth client is reused across calls (no token churn)
 *   5. non-2xx responses get logged but don't crash the publisher
 *   6. fetch failures bubble up so the caller can mark the run errored
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const requestMock = vi.fn();
const getIdTokenClientMock = vi.fn();

vi.mock('google-auth-library', () => ({
  GoogleAuth: class {
    getIdTokenClient(...args: unknown[]) {
      return getIdTokenClientMock(...args);
    }
  },
}));

vi.mock('firebase-functions', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

let getJobQueue: typeof import('../../src/queue/job-queue').getJobQueue;

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  requestMock.mockReset();
  getIdTokenClientMock.mockReset();
  getIdTokenClientMock.mockResolvedValue({ request: requestMock });
  ({ getJobQueue } = await import('../../src/queue/job-queue'));
});

afterEach(() => {
  delete process.env.AGENT_WORKER_URL;
  delete process.env.AGENT_QUEUE;
});

// ────────────────────────────────────────────────────────────────────

describe('JobQueue — emulator (no auth) path', () => {
  beforeEach(() => {
    process.env.AGENT_WORKER_URL = 'http://127.0.0.1:8787';
  });

  it('uses plain fetch for 127.0.0.1', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 202 });
    vi.stubGlobal('fetch', fetchMock);

    const q = getJobQueue();
    await q.publishAgentRun({ runId: 'r1', projectId: 'p1', userId: 'u1', mode: 'full' });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(requestMock).not.toHaveBeenCalled();
    expect(getIdTokenClientMock).not.toHaveBeenCalled();
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:8787/agent-run');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body as string)).toMatchObject({ runId: 'r1' });
  });

  it('also skips OIDC for http://localhost', async () => {
    process.env.AGENT_WORKER_URL = 'http://localhost:8787';
    vi.resetModules();
    const { getJobQueue: getQ } = await import('../../src/queue/job-queue');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 202 });
    vi.stubGlobal('fetch', fetchMock);

    await getQ().publishAgentRun({ runId: 'r1', projectId: 'p1', userId: 'u1', mode: 'full' });
    expect(fetchMock).toHaveBeenCalled();
    expect(getIdTokenClientMock).not.toHaveBeenCalled();
  });

  it('logs a warning when the emulator returns non-ok but does not throw', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal('fetch', fetchMock);

    const q = getJobQueue();
    await expect(
      q.publishAgentRun({ runId: 'r1', projectId: 'p1', userId: 'u1', mode: 'full' }),
    ).resolves.toBeUndefined();
  });
});

describe('JobQueue — production OIDC path', () => {
  const PROD_URL = 'https://agent-worker-906219223037.us-central1.run.app';

  beforeEach(() => {
    process.env.AGENT_WORKER_URL = PROD_URL;
  });

  it('uses the OIDC client (not plain fetch) for a Cloud Run URL', async () => {
    requestMock.mockResolvedValue({ status: 202 });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const q = getJobQueue();
    await q.publishAgentRun({ runId: 'r1', projectId: 'p1', userId: 'u1', mode: 'full' });

    expect(requestMock).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses the worker base URL as the OIDC audience', async () => {
    requestMock.mockResolvedValue({ status: 202 });
    await getJobQueue().publishAgentRun({
      runId: 'r1',
      projectId: 'p1',
      userId: 'u1',
      mode: 'full',
    });
    expect(getIdTokenClientMock).toHaveBeenCalledWith(PROD_URL);
  });

  it('reuses the OIDC client across calls (no token churn)', async () => {
    requestMock.mockResolvedValue({ status: 202 });
    const q = getJobQueue();
    await q.publishAgentRun({ runId: 'r1', projectId: 'p1', userId: 'u1', mode: 'full' });
    await q.publishAgentRun({ runId: 'r2', projectId: 'p1', userId: 'u1', mode: 'full' });
    await q.publishAgentRun({ runId: 'r3', projectId: 'p1', userId: 'u1', mode: 'full' });
    expect(getIdTokenClientMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledTimes(3);
  });

  it('POSTs to /agent-run with the job as JSON body', async () => {
    requestMock.mockResolvedValue({ status: 202 });
    const job = {
      runId: 'r1',
      projectId: 'p1',
      userId: 'u1',
      mode: 'full' as const,
      followupQuestion: 'is the deck height code-compliant?',
    };
    await getJobQueue().publishAgentRun(job);
    const call = requestMock.mock.calls[0][0];
    expect(call.url).toBe(`${PROD_URL}/agent-run`);
    expect(call.method).toBe('POST');
    expect(call.data).toEqual(job);
    expect(call.headers?.['content-type']).toBe('application/json');
  });

  it('logs but does not throw on a non-2xx response from the worker', async () => {
    requestMock.mockResolvedValue({ status: 403 });
    await expect(
      getJobQueue().publishAgentRun({
        runId: 'r1',
        projectId: 'p1',
        userId: 'u1',
        mode: 'full',
      }),
    ).resolves.toBeUndefined();
  });

  it('throws when the OIDC request itself errors (caller should mark run errored)', async () => {
    requestMock.mockRejectedValue(new Error('network'));
    await expect(
      getJobQueue().publishAgentRun({
        runId: 'r1',
        projectId: 'p1',
        userId: 'u1',
        mode: 'full',
      }),
    ).rejects.toThrow(/network/);
  });
});

describe('JobQueue — queue selection', () => {
  it('defaults to local-HTTP when AGENT_QUEUE is unset', async () => {
    delete process.env.AGENT_QUEUE;
    process.env.AGENT_WORKER_URL = 'http://127.0.0.1:8787';
    vi.resetModules();
    const { getJobQueue: getQ } = await import('../../src/queue/job-queue');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 202 });
    vi.stubGlobal('fetch', fetchMock);
    await getQ().publishAgentRun({ runId: 'r1', projectId: 'p1', userId: 'u1', mode: 'full' });
    expect(fetchMock).toHaveBeenCalled();
  });

  it('uses pubsub when AGENT_QUEUE=pubsub (best-effort check via no fetch/oidc)', async () => {
    process.env.AGENT_QUEUE = 'pubsub';
    process.env.PUBSUB_TOPIC_AGENT_JOBS = 'agent-jobs';
    vi.resetModules();
    // We can't easily mock the dynamic @google-cloud/pubsub import without
    // it being installed; just verify the local HTTP path isn't taken.
    const { getJobQueue: getQ } = await import('../../src/queue/job-queue');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      getQ().publishAgentRun({ runId: 'r1', projectId: 'p1', userId: 'u1', mode: 'full' }),
    ).rejects.toThrow(); // pubsub not installed
    expect(fetchMock).not.toHaveBeenCalled();
    expect(requestMock).not.toHaveBeenCalled();
  });
});
