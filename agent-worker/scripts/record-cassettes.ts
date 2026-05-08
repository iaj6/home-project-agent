#!/usr/bin/env tsx
// Records live cassettes for canonical bathroom-vanity and deck-building queries.
// Sets CASSETTE_MODE=record before importing so all through() calls write to disk.
process.env.CASSETTE_MODE = 'record';

import { fetchHomeDepot } from '../src/pricing/home-depot';
import { fetchCostGuideTool } from '../src/tools/cost-guide';
import { checkUrlLiveTool } from '../src/tools/check-url-live';

const ZIP = '94110';
const CTX = { runId: 'rec', projectId: 'rec', zipCode: ZIP };

const HD_QUERIES = [
  '36 inch bathroom vanity',
  'bathroom vanity faucet',
  'bathroom vanity light',
  'pressure treated 2x6 8ft',
  'deck screws 3 inch',
  'composite decking board',
];

const CATEGORIES = ['bathroom-vanity', 'deck-building'] as const;

const TRUSTED_URLS = [
  'https://www.familyhandyman.com/list/diy-bathroom-vanity/',
  'https://www.thisoldhouse.com/decks/21017639/how-to-build-a-deck',
  'https://www.bobvila.com/articles/how-to-build-a-deck/',
];

async function step(label: string, fn: () => Promise<unknown>): Promise<void> {
  process.stdout.write(`  ${label} ... `);
  const start = Date.now();
  try {
    await fn();
    console.log(`ok (${Date.now() - start}ms)`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`FAIL — ${msg}`);
    process.exitCode = 1;
  }
}

async function main() {
  console.log('Recording cassettes (CASSETTE_MODE=record). Real network calls follow.\n');

  console.log('Home Depot:');
  for (const query of HD_QUERIES) {
    await step(query, () => fetchHomeDepot({ query, zipCode: ZIP }));
  }

  console.log('\nCost guides (HomeAdvisor + Fixr):');
  for (const category of CATEGORIES) {
    await step(category, () =>
      fetchCostGuideTool.run({ category, zipCode: ZIP, site: 'any' }, CTX),
    );
  }

  console.log('\nURL liveness probes:');
  for (const url of TRUSTED_URLS) {
    await step(url, () => checkUrlLiveTool.run({ url }, CTX));
  }

  console.log('\nDone. Cassettes written to agent-worker/tests/cassettes/.');
}

main().catch((err) => {
  console.error('record-cassettes crashed:', err);
  process.exit(1);
});
