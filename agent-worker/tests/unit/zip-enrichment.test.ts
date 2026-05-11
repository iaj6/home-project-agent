/**
 * Tests for ZIP-based enrichment (state, frost depth, climate band, coastal
 * flag). Pure functions, easy to test, and these feed every plan + synthesize
 * prompt — bugs here mean the agent gives wrong frost-depth or coastal advice
 * in every report.
 */
import { describe, it, expect } from 'vitest';
import { enrichZip, formatEnrichmentForPrompt } from '../../src/zip/enrichment';

describe('enrichZip', () => {
  it('resolves a Cape Cod ZIP to MA + cold + coastal + 48" frost', () => {
    const e = enrichZip('02649');
    expect(e.state).toBe('MA');
    expect(e.stateName).toBe('Massachusetts');
    expect(e.climateBand).toBe('cold');
    expect(e.isLikelyCoastal).toBe(true);
    expect(e.frostDepthInches).toBe(48);
    expect(e.notes.some((n) => /48"/.test(n))).toBe(true);
    expect(e.notes.some((n) => /coastal/i.test(n))).toBe(true);
  });

  it('resolves an Atlanta ZIP to GA + hot + inland + minimal frost', () => {
    const e = enrichZip('30303');
    expect(e.state).toBe('GA');
    expect(e.climateBand).toBe('hot');
    expect(e.frostDepthInches).toBe(6);
    // Atlanta is inland.
    expect(e.isLikelyCoastal).toBe(false);
    // Hot climate, low frost — should NOT produce a "dig 36+" inches" note.
    expect(e.notes.some((n) => /48"/.test(n))).toBe(false);
  });

  it('resolves a San Francisco ZIP to CA + mixed + coastal', () => {
    const e = enrichZip('94110');
    expect(e.state).toBe('CA');
    expect(e.climateBand).toBe('mixed');
    expect(e.isLikelyCoastal).toBe(true);
  });

  it('resolves a Miami ZIP to FL + hot + coastal + zero frost', () => {
    const e = enrichZip('33101');
    expect(e.state).toBe('FL');
    expect(e.climateBand).toBe('hot');
    expect(e.frostDepthInches).toBe(0);
    expect(e.isLikelyCoastal).toBe(true);
    expect(e.notes.some((n) => /no frost line/i.test(n))).toBe(true);
  });

  it('resolves a Minneapolis ZIP to MN + very-cold + 60" frost + inland', () => {
    const e = enrichZip('55401');
    expect(e.state).toBe('MN');
    expect(e.climateBand).toBe('very-cold');
    expect(e.frostDepthInches).toBe(60);
    expect(e.isLikelyCoastal).toBe(false);
  });

  it('returns nulls + no notes for a clearly invalid ZIP', () => {
    const e = enrichZip('abc-not-a-zip');
    expect(e.state).toBeNull();
    expect(e.stateName).toBeNull();
    expect(e.frostDepthInches).toBeNull();
    expect(e.climateBand).toBeNull();
  });

  it('handles ZIP+4 format by extracting the first five digits', () => {
    const five = enrichZip('02649');
    const plus4 = enrichZip('02649-1234');
    expect(plus4.state).toBe(five.state);
    expect(plus4.frostDepthInches).toBe(five.frostDepthInches);
  });

  it('boundary check: 172.16/12 → not coastal but inland — different field, but verifies state resolution', () => {
    // 80000-series ZIPs are CO, not coastal.
    const e = enrichZip('80202');
    expect(e.state).toBe('CO');
    expect(e.isLikelyCoastal).toBe(false);
  });

  it('produces a mild-frost note for medium-frost states', () => {
    // NM: 18" frost
    const e = enrichZip('87101');
    expect(e.state).toBe('NM');
    expect(e.frostDepthInches).toBe(18);
    expect(e.notes.some((n) => /mild frost/i.test(n))).toBe(true);
  });

  it('produces a frost-depth note for cold states (>= 36")', () => {
    const e = enrichZip('02649');
    expect(e.notes.some((n) => /frost-depth footings/i.test(n))).toBe(true);
  });
});

describe('formatEnrichmentForPrompt', () => {
  it('formats coastal MA cleanly', () => {
    const out = formatEnrichmentForPrompt(enrichZip('02649'));
    expect(out).toContain('ZIP: 02649');
    expect(out).toContain('Massachusetts (MA)');
    expect(out).toContain('48 inches');
    expect(out).toContain('cold');
    expect(out).toContain('Coastal/wetlands likely: yes');
  });

  it('omits state/frost lines for an unknown ZIP', () => {
    const out = formatEnrichmentForPrompt(enrichZip('abcde'));
    expect(out).toContain('ZIP: abcde');
    expect(out).not.toContain('State:');
    expect(out).not.toContain('Frost depth');
    // Should still include the coastal line (default false).
    expect(out).toContain('Coastal/wetlands likely: no');
  });
});
