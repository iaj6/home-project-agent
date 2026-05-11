import { describe, it, expect } from 'vitest';
import { assertStringField, INPUT_LIMITS } from '../../src/services/input-limits';

describe('assertStringField', () => {
  it('accepts a normal string under the cap', () => {
    expect(assertStringField('Replace bathroom vanity', 'title')).toBe(
      'Replace bathroom vanity',
    );
  });

  it('trims whitespace', () => {
    expect(assertStringField('  hello  ', 'title')).toBe('hello');
  });

  it('rejects undefined when required', () => {
    expect(() => assertStringField(undefined, 'title')).toThrow(/required/);
  });

  it('rejects empty string when required', () => {
    expect(() => assertStringField('', 'title')).toThrow(/required/);
  });

  it('rejects whitespace-only string', () => {
    expect(() => assertStringField('   ', 'title')).toThrow(/blank/);
  });

  it('rejects non-string types', () => {
    expect(() => assertStringField(123, 'title')).toThrow(/must be a string/);
    expect(() => assertStringField({}, 'title')).toThrow(/must be a string/);
    expect(() => assertStringField(null, 'title', { required: false })).not.toThrow();
  });

  it('allows undefined when optional', () => {
    expect(assertStringField(undefined, 'title', { required: false })).toBe('');
    expect(assertStringField(null, 'title', { required: false })).toBe('');
  });

  it('rejects strings longer than the cap', () => {
    const big = 'x'.repeat(INPUT_LIMITS.description + 1);
    expect(() => assertStringField(big, 'description')).toThrow(/too long/);
  });

  it('accepts strings exactly at the cap', () => {
    const exact = 'x'.repeat(INPUT_LIMITS.description);
    expect(assertStringField(exact, 'description')).toBe(exact);
  });

  it('different fields have different caps', () => {
    expect(INPUT_LIMITS.title).toBeLessThan(INPUT_LIMITS.description);
    expect(INPUT_LIMITS.message).toBeLessThan(INPUT_LIMITS.description);
  });

  it('a 50KB context-stuffing payload gets rejected at the description cap', () => {
    const stuffing = 'inject '.repeat(10_000); // ~70KB
    expect(() => assertStringField(stuffing, 'description')).toThrow(/too long/);
  });
});
