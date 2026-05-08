import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { z } from 'zod';
import { log } from './util/logger';
import { runAgent } from './runner';

const app = new Hono();

const AgentRunBody = z.object({
  runId: z.string(),
  projectId: z.string(),
  userId: z.string(),
  mode: z.enum(['full', 'followup']).default('full'),
  followupQuestion: z.string().optional(),
});

app.get('/health', (c) => c.json({ ok: true, service: 'agent-worker' }));

app.post('/agent-run', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = AgentRunBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid body', details: parsed.error.format() }, 400);
  }
  const job = parsed.data;

  // Fire and forget — run completes asynchronously, progress streams to Firestore.
  void runAgent(job).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    log.error('agent run failed', { runId: job.runId, error: message });
  });

  return c.json({ accepted: true, runId: job.runId }, 202);
});

const PORT = Number(process.env.PORT ?? 8787);

if (require.main === module) {
  serve({ fetch: app.fetch, port: PORT }, (info) => {
    log.info('agent-worker listening', { port: info.port });
  });
}

export { app };
