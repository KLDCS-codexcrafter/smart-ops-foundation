/**
 * Hardening-A · Block A · Source-level test for divisionsKey / departmentsKey.
 * Mirrors maintainpro-status-flip.test.ts pattern.
 */
import { describe, it, expect } from 'vitest';
import { divisionsKey, departmentsKey } from '@/types/org-structure';

describe('Hardening-A · Block A · Entity-scoped key helpers', () => {
  it('divisionsKey scopes by entityCode', () => {
    expect(divisionsKey('SMRT')).toBe('erp_divisions_SMRT');
  });
  it('divisionsKey falls back to legacy global key when entity empty', () => {
    expect(divisionsKey('')).toBe('erp_divisions');
  });
  it('departmentsKey scopes by entityCode', () => {
    expect(departmentsKey('SMRT')).toBe('erp_departments_SMRT');
  });
  it('departmentsKey falls back to legacy global key when entity empty', () => {
    expect(departmentsKey('')).toBe('erp_departments');
  });
});
