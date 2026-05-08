#!/usr/bin/env tsx
// Verifies both parsers against the committed fixtures without any network or API access.
// Always runs green if the parsers work on canned data.
import * as fs from 'fs';
import * as path from 'path';
import { parseHomeDepotSearchHtml } from '../src/pricing/home-depot';
import { parseLowesSearchHtml } from '../src/pricing/lowes';
import { extractCostRange } from '../src/tools/cost-guide';

const fixtures = path.resolve(__dirname, '..', 'tests', 'fixtures');

function load(name: string): string {
  return fs.readFileSync(path.join(fixtures, name), 'utf-8');
}

function check(label: string, cond: boolean) {
  console.log(`${cond ? '✓' : '✗'} ${label}`);
  if (!cond) process.exitCode = 1;
}

const hdJsonLd = parseHomeDepotSearchHtml(load('hd-search-deck.html'), 3);
console.log('\n-- Home Depot (JSON-LD) --');
console.log(JSON.stringify(hdJsonLd, null, 2));
check('HD JSON-LD returned 3 products', hdJsonLd.products.length === 3);
check('HD JSON-LD used json-ld strategy', hdJsonLd.strategyUsed === 'json-ld');
check('HD first SKU is 252036080', hdJsonLd.products[0]?.sku === '252036080');

const hdNext = parseHomeDepotSearchHtml(load('hd-search-nextdata.html'), 3);
console.log('\n-- Home Depot (__NEXT_DATA__) --');
console.log(JSON.stringify(hdNext, null, 2));
check('HD next-data returned 2 products', hdNext.products.length === 2);
check('HD next-data used next-data strategy', hdNext.strategyUsed === 'next-data');

const lowes = parseLowesSearchHtml(load('lowes-search.html'), 3);
console.log("\n-- Lowe's --");
console.log(JSON.stringify(lowes, null, 2));
check("Lowe's returned 2 products", lowes.products.length === 2);

const cost = extractCostRange(load('cost-guide-deck.html'));
console.log('\n-- Cost guide --');
console.log(cost);
check('cost range low=4000', cost.lowUsd === 4000);
check('cost range high=14000', cost.highUsd === 14000);
check('cost national avg=8200', cost.nationalAvgUsd === 8200);

if (process.exitCode) {
  console.log('\nFAIL — one or more checks failed');
} else {
  console.log('\nOK — all parser checks pass');
}
