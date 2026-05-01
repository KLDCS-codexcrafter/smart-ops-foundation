/**
 * validate-first-deep.test.ts — Sprint T-Phase-1.2.5h-c1 · M-1
 */
import { describe, it, expect } from 'vitest';
import {
  makeFieldValidator, fieldErrorClass, fieldErrorText, clearFieldError,
  type FieldRule,
} from '@/lib/validate-first';

interface FormA { name: string; qty: number; rate: number }

describe('validate-first · deep', () => {
  const rules: Array<FieldRule<FormA>> = [
    { field: 'name', test: v => typeof v === 'string' && v.length > 0, message: 'Name required' },
    { field: 'qty', test: v => typeof v === 'number' && v > 0, message: 'Qty must be > 0' },
    { field: 'rate', test: v => typeof v === 'number' && v >= 0, message: 'Rate must be ≥ 0' },
  ];
  const validate = makeFieldValidator<FormA>(rules);

  it('VF1 · all valid → ok=true · empty errors', () => {
    const r = validate({ name: 'Steel', qty: 10, rate: 100 });
    expect(r.ok).toBe(true);
    expect(Object.keys(r.errors)).toHaveLength(0);
  });
  it('VF2 · single failure flagged · others clean', () => {
    const r = validate({ name: '', qty: 10, rate: 100 });
    expect(r.ok).toBe(false);
    expect(r.errors.name).toBe('Name required');
    expect(r.errors.qty).toBeUndefined();
  });
  it('VF3 · multiple failures all flagged', () => {
    const r = validate({ name: '', qty: 0, rate: -1 });
    expect(r.ok).toBe(false);
    expect(Object.keys(r.errors)).toHaveLength(3);
  });
  it('VF4 · fieldErrorClass returns destructive border on error', () => {
    expect(fieldErrorClass({ name: 'Name required' }, 'name')).toContain('border-destructive');
    expect(fieldErrorClass({}, 'name')).toBe('');
  });
  it('VF5 · fieldErrorText returns the message or null', () => {
    expect(fieldErrorText({ name: 'X' }, 'name')).toBe('X');
    expect(fieldErrorText({}, 'name')).toBeNull();
  });
  it('VF6 · clearFieldError immutably removes one field', () => {
    const errs = { name: 'X', qty: 'Y' };
    const next = clearFieldError(errs, 'name');
    expect(next).not.toBe(errs);
    expect(next.name).toBeUndefined();
    expect(next.qty).toBe('Y');
  });
});
