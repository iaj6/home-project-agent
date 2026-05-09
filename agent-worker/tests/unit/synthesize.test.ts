import { describe, it, expect } from 'vitest';
import { clamp, normalizeCostSummary, normalizeConfidence } from '../../src/phases/synthesize';
import type { LaborEstimate, MaterialsList } from '@home-helper/shared';

const makeMaterials = (resolved: number, total: number): MaterialsList => ({
  items: Array.from({ length: total }, (_, i) => ({
    id: `m${i}`,
    name: `item ${i}`,
    qty: 1,
    unitPrice: 10,
    totalPrice: 10,
    inStock: true,
    confidence: 'high' as const,
    resolved: i < resolved,
    unresolvedReason: i < resolved ? undefined : 'retailer blocked',
  })),
  subtotal: resolved * 10,
  retailerMix: { home_depot: resolved, lowes: 0 },
  zipCode: '30303',
  fetchedAt: new Date(),
});

const makeLabor = (confidence: 'high' | 'medium' | 'low'): LaborEstimate => ({
  lowUsd: 1000,
  highUsd: 3000,
  sources: [],
  confidence,
});

describe('clamp', () => {
  it('bounds values to [lo, hi]', () => {
    expect(clamp(5, 1, 10)).toBe(5);
    expect(clamp(15, 1, 10)).toBe(10);
    expect(clamp(-2, 1, 10)).toBe(1);
  });
  it('rounds floats', () => {
    expect(clamp(5.7, 1, 10)).toBe(6);
  });
  it('clamps NaN to lo', () => {
    expect(clamp(NaN, 1, 10)).toBe(1);
  });
});

describe('cost summary normalization', () => {
  it('fills in defaults from materials subtotal and labor midpoint', () => {
    const summary = normalizeCostSummary(undefined, 1000, 2000);
    expect(summary.diyTotal).toBe(1000);
    expect(summary.proTotal).toBe(3000);
    expect(summary.savings).toBe(2000);
    expect(summary.savingsPercent).toBe(67);
    expect(summary.assumptions).toEqual([]);
  });

  it('respects explicit values when provided', () => {
    const summary = normalizeCostSummary(
      { diyTotal: 800, proTotal: 2500, assumptions: ['has saw'] },
      1000,
      2000,
    );
    expect(summary.diyTotal).toBe(800);
    expect(summary.proTotal).toBe(2500);
    expect(summary.savings).toBe(1700);
    expect(summary.savingsPercent).toBe(68);
    expect(summary.assumptions).toEqual(['has saw']);
  });

  it('clamps negative savings to zero when diy is greater than pro', () => {
    const summary = normalizeCostSummary(
      { diyTotal: 1000, proTotal: 500 },
      1000,
      0,
    );
    expect(summary.savings).toBe(0);
  });
});

describe('confidence normalization', () => {
  it('derives materials confidence from resolved ratio when missing', () => {
    expect(normalizeConfidence(undefined, makeMaterials(10, 10), makeLabor('high')).materials).toBe('high');
    expect(normalizeConfidence(undefined, makeMaterials(6, 10), makeLabor('high')).materials).toBe('medium');
    expect(normalizeConfidence(undefined, makeMaterials(3, 10), makeLabor('high')).materials).toBe('low');
  });

  it('overall = min(materials, labor) when not explicitly set', () => {
    const report = normalizeConfidence(undefined, makeMaterials(10, 10), makeLabor('low'));
    expect(report.overall).toBe('low');
  });

  it('respects explicit overall from Claude when present', () => {
    const report = normalizeConfidence(
      { materials: 'high', labor: 'low', overall: 'medium', caveats: ['x'] },
      makeMaterials(10, 10),
      makeLabor('low'),
    );
    expect(report.overall).toBe('medium');
    expect(report.caveats).toEqual(['x']);
  });
});
