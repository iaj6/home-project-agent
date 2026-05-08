#!/usr/bin/env tsx
// Smoke test the full agent runner end-to-end against the Firestore emulator.
//
// Usage:
//   1. Start Firebase emulators in another terminal:
//        firebase emulators:start --only firestore,auth,functions
//   2. In this terminal:
//        FIRESTORE_EMULATOR_HOST=127.0.0.1:8402 \
//        GCLOUD_PROJECT=home-helper-706a8 \
//        ANTHROPIC_API_KEY=sk-... \
//        AGENT_QUEUE=local \
//        tsx agent-worker/scripts/smoke-agent.ts
//
// The script seeds a user, home, and project into Firestore, enqueues an agent run,
// runs the agent in-process, then prints the final report summary.
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'home-helper-706a8' });
}
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

async function seed(): Promise<{ userId: string; projectId: string }> {
  const userId = 'smoke-user';
  const homeRef = db.collection('homes').doc();
  const projectRef = db.collection('projects').doc();
  const now = new Date();

  await db.doc(`users/${userId}`).set({
    uid: userId,
    email: 'smoke@example.com',
    displayName: 'Smoke',
    primaryHomeId: homeRef.id,
    projectCount: 1,
    createdAt: now,
  });

  await homeRef.set({
    id: homeRef.id,
    userId,
    nickname: 'Smoke home',
    zipCode: '30303',
    createdAt: now,
    updatedAt: now,
  });

  await projectRef.set({
    id: projectRef.id,
    userId,
    homeId: homeRef.id,
    category: 'deck-building',
    title: 'Smoke test deck',
    description: 'A 12x16 attached deck, 36in off ground, PT lumber.',
    zipCode: '30303',
    status: 'planning',
    messageCount: 2,
    createdAt: now,
    updatedAt: now,
  });

  await db.collection(`projects/${projectRef.id}/messages`).add({
    role: 'user',
    content: 'A 12x16 attached deck, 36in off ground, PT lumber.',
    phase: 'clarification',
    createdAt: now,
  });
  await db.collection(`projects/${projectRef.id}/messages`).add({
    role: 'assistant',
    content: 'Got it — I have what I need to put together a plan.',
    phase: 'clarification',
    createdAt: new Date(now.getTime() + 1000),
  });

  return { userId, projectId: projectRef.id };
}

async function main() {
  console.log('[smoke] seeding firestore…');
  const { userId, projectId } = await seed();
  console.log('[smoke] seeded', { userId, projectId });

  const { runAgent } = await import('../src/runner');
  const runRef = db.collection('agentRuns').doc();
  const now = new Date();
  await runRef.set({
    id: runRef.id,
    projectId,
    userId,
    status: 'queued',
    mode: 'full',
    startedAt: now,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    estimatedCostUsd: 0,
    toolCallCount: 0,
  });

  console.log('[smoke] starting runAgent…', { runId: runRef.id });
  await runAgent({ runId: runRef.id, projectId, userId, mode: 'full' });

  console.log('[smoke] run complete; fetching report…');
  const reportSnap = await db.doc(`projects/${projectId}/report/main`).get();
  if (!reportSnap.exists) {
    console.error('[smoke] FAIL: no report saved');
    process.exit(1);
  }
  const report = reportSnap.data();
  console.log('[smoke] OK');
  console.log(JSON.stringify(report, null, 2).slice(0, 3000));

  const runSnap = await runRef.get();
  console.log('[smoke] run summary:', {
    status: runSnap.get('status'),
    tokens: {
      in: runSnap.get('totalInputTokens'),
      out: runSnap.get('totalOutputTokens'),
    },
    toolCalls: runSnap.get('toolCallCount'),
    cost: runSnap.get('estimatedCostUsd'),
  });
}

main().catch((err) => {
  console.error('[smoke] error', err);
  process.exit(1);
});
