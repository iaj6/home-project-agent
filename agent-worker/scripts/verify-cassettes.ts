#!/usr/bin/env tsx
// Replay-mode pass: count products / cost ranges from current cassettes.
process.env.CASSETTE_MODE = 'replay';

import { fetchHomeDepot } from '../src/pricing/home-depot';
import { fetchCostGuideTool } from '../src/tools/cost-guide';

const ZIP = '94110';
const CTX = { runId: 'ver', projectId: 'ver', zipCode: ZIP };

async function main() {
  console.log('Home Depot:');
  for (const query of [
    '36 inch bathroom vanity',
    'bathroom vanity faucet',
    'bathroom vanity light',
    'pressure treated 2x6 8ft',
    'deck screws 3 inch',
    'composite decking board',
  ]) {
    const r = await fetchHomeDepot({ query, zipCode: ZIP });
    console.log(`  ${query.padEnd(30)} → ${r.products.length} products${r.warnings.length ? ` [${r.warnings.length} warn]` : ''}`);
    if (r.products[0]) {
      console.log(`      e.g. ${r.products[0].name} — $${r.products[0].unitPrice} (sku ${r.products[0].sku})`);
    }
  }

  console.log('\nCost guides:');
  for (const category of ['bathroom-vanity', 'deck-building']) {
    const r = await fetchCostGuideTool.run({ category, zipCode: ZIP, site: 'any' }, CTX);
    for (const site of r.sites) {
      console.log(`  ${category.padEnd(16)} ${site.siteName.padEnd(14)} status=${site.status} low=${site.lowUsd ?? '-'} high=${site.highUsd ?? '-'} avg=${site.nationalAvgUsd ?? '-'}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
