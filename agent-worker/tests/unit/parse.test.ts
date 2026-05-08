import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseHomeDepotSearchHtml } from '../../src/pricing/home-depot';
import { parseLowesSearchHtml } from '../../src/pricing/lowes';

const fixtures = path.join(__dirname, '..', 'fixtures');

function load(name: string): string {
  return fs.readFileSync(path.join(fixtures, name), 'utf-8');
}

describe('Home Depot parser', () => {
  it('extracts products from a JSON-LD ItemList', () => {
    const html = load('hd-search-deck.html');
    const result = parseHomeDepotSearchHtml(html, 3);
    expect(result.strategyUsed).toBe('json-ld');
    expect(result.products.length).toBe(3);

    const first = result.products[0];
    expect(first.name).toMatch(/Pressure-Treated/);
    expect(first.sku).toBe('252036080');
    expect(first.unitPrice).toBeCloseTo(8.42);
    expect(first.productUrl).toMatch(/^https:\/\/www\.homedepot\.com\//);
    expect(first.inStock).toBe(true);
    expect(first.retailer).toBe('home_depot');
  });

  it('extracts products from __NEXT_DATA__ when JSON-LD is absent', () => {
    const html = load('hd-search-nextdata.html');
    const result = parseHomeDepotSearchHtml(html, 3);
    expect(result.strategyUsed).toBe('next-data');
    expect(result.products.length).toBe(2);
    expect(result.products[0].name).toMatch(/Lag Screw/);
    expect(result.products[0].sku).toBe('204272650');
    expect(result.products[0].unitPrice).toBeCloseTo(24.97);
    expect(result.products[0].inStock).toBe(true);
  });

  it('returns empty with a warning on totally empty html', () => {
    const result = parseHomeDepotSearchHtml('', 3);
    expect(result.products).toHaveLength(0);
    expect(result.warnings).toContain('empty html');
  });

  it('respects the limit parameter', () => {
    const html = load('hd-search-deck.html');
    const result = parseHomeDepotSearchHtml(html, 1);
    expect(result.products).toHaveLength(1);
  });
});

describe("Lowe's parser", () => {
  it('extracts products from JSON-LD array with bare Product entries', () => {
    const html = load('lowes-search.html');
    const result = parseLowesSearchHtml(html, 3);
    expect(result.products.length).toBe(2);

    const first = result.products[0];
    expect(first.name).toMatch(/Trex Transcend/);
    expect(first.sku).toBe('4562100');
    expect(first.unitPrice).toBeCloseTo(72.98);
    expect(first.productUrl).toMatch(/^https:\/\/www\.lowes\.com\//);
    expect(first.retailer).toBe('lowes');
  });
});
