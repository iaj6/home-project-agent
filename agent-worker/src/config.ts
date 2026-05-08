import * as admin from 'firebase-admin';
import Anthropic from '@anthropic-ai/sdk';

if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();
try {
  db.settings({ ignoreUndefinedProperties: true });
} catch {
  // settings() throws if Firestore has already been used (e.g. when a host script
  // seeded data before importing this module). The host is responsible for setting
  // ignoreUndefinedProperties in that case.
}
export const anthropic = new Anthropic();

export const AGENT_MODEL = 'claude-sonnet-4-6';
export const CHEAP_MODEL = 'claude-haiku-4-5-20251001';

export const BUDGET = {
  maxToolCalls: 40,
  // Cumulative across all phases. HD product pages run ~1.5MB each; 16 calls in
  // the price phase routinely push past 250k input tokens before synthesize gets
  // its first turn.
  maxInputTokens: 1_000_000,
  maxWallClockMs: 15 * 60 * 1000,
  perToolTimeoutMs: 10_000,
  urlLivenessTimeoutMs: 5_000,
} as const;

export const PRICING = {
  inputPerMTok: 3.0,
  outputPerMTok: 15.0,
  haikuInputPerMTok: 0.8,
  haikuOutputPerMTok: 4.0,
} as const;

export function modelCost(inputTokens: number, outputTokens: number, model: string): number {
  const isHaiku = model.includes('haiku');
  const inRate = isHaiku ? PRICING.haikuInputPerMTok : PRICING.inputPerMTok;
  const outRate = isHaiku ? PRICING.haikuOutputPerMTok : PRICING.outputPerMTok;
  return (inputTokens / 1_000_000) * inRate + (outputTokens / 1_000_000) * outRate;
}

// Cassette mode + dir are resolved lazily in src/cassette/cassette.ts from process.env.
