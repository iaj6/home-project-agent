import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  extractCostRange,
  regionalMultiplierForZip,
  zipToState,
} from '../../src/tools/cost-guide';

const fixtures = path.join(__dirname, '..', 'fixtures');

describe('cost guide extraction', () => {
  it('pulls low/high and national average from HomeAdvisor-style prose', () => {
    const html = fs.readFileSync(path.join(fixtures, 'cost-guide-deck.html'), 'utf-8');
    const result = extractCostRange(html);
    expect(result.lowUsd).toBe(4000);
    expect(result.highUsd).toBe(14000);
    expect(result.nationalAvgUsd).toBe(8200);
    expect(result.snippet).toMatch(/cost/i);
  });

  it('returns empty-ish on content with no dollar figures', () => {
    const result = extractCostRange('<html><body><p>hello world</p></body></html>');
    expect(result.lowUsd).toBeUndefined();
    expect(result.highUsd).toBeUndefined();
  });

  it('returns empty snippet on empty input', () => {
    const result = extractCostRange('');
    expect(result.snippet).toBe('');
  });
});

describe('ZIP → state mapping', () => {
  it('maps common ZIP prefixes correctly', () => {
    expect(zipToState('30303')).toBe('GA'); // Atlanta
    expect(zipToState('10001')).toBe('NY'); // Manhattan
    expect(zipToState('94110')).toBe('CA'); // SF
    expect(zipToState('90001')).toBe('CA');
    expect(zipToState('60601')).toBe('IL'); // Chicago
    expect(zipToState('02101')).toBe('MA');
    expect(zipToState('98101')).toBe('WA');
    expect(zipToState('73301')).toBe('OK');
  });

  it('handles ZIP+4 format', () => {
    expect(zipToState('30303-1234')).toBe('GA');
  });

  it('returns null on obvious bad input', () => {
    expect(zipToState('')).toBeNull();
    expect(zipToState('abc')).toBeNull();
  });
});

describe('regional multiplier', () => {
  it('returns state-specific multipliers', () => {
    expect(regionalMultiplierForZip('94110')).toBeCloseTo(1.25);
    expect(regionalMultiplierForZip('30303')).toBeCloseTo(0.96);
  });

  it('falls back to 1.0 for unknown ZIPs', () => {
    expect(regionalMultiplierForZip('99999')).toBeGreaterThan(0);
    expect(regionalMultiplierForZip('invalid')).toBe(1.0);
  });
});
