/**
 * @file Sprint 65 FAR-1 · Ind AS 116 lease ROU engine · ID-lookup test pattern per Lesson 19
 * @sprint T-Phase-4.FAR-1.TFix
 */
import { describe, it, expect } from 'vitest';
import {
  computeROUAtCommencement,
  computeMonthlyAmortization,
  computeInterestExpense,
  handleLeaseModification,
  generateROUSchedule,
  generateAggregateDisclosure,
  leasesKey,
} from '@/lib/ind-as-116-lease-engine';
import type { LeaseTerms, LeaseModification } from '@/types/statutory-pack';

const E = 'BCPL';

const LEASE: LeaseTerms = {
  leaseId: 'lease-test-001',
  entityCode: E,
  description: 'Test warehouse lease',
  commencementDate: '2025-04-01',
  termMonths: 60,
  monthlyRentInr: 100000,
  discountRatePct: 9,
};

describe('Ind AS 116 lease ROU engine · ID-lookup smoke', () => {
  it('leasesKey returns entity-scoped storage key per FR-26', () => {
    const key = leasesKey(E);
    expect(key).toContain(E);
  });

  it('computeROUAtCommencement returns ROUSchedule with positive initial values', () => {
    const rou = computeROUAtCommencement(LEASE);
    expect(rou.leaseId).toBe(LEASE.leaseId);
    expect(rou.entityCode).toBe(E);
    expect(rou.initialRou).toBeGreaterThan(0);
    expect(rou.initialLiability).toBeGreaterThan(0);
    expect(Array.isArray(rou.rows)).toBe(true);
  });

  it('ROU schedule produces termMonths-length row series', () => {
    const rou = computeROUAtCommencement(LEASE);
    expect(rou.rows.length).toBe(LEASE.termMonths);
  });

  it('computeMonthlyAmortization returns shape with amortization + remainingRou', () => {
    const rou = computeROUAtCommencement(LEASE);
    const result = computeMonthlyAmortization(rou, 1);
    expect(typeof result.amortization).toBe('number');
    expect(typeof result.remainingRou).toBe('number');
  });

  it('computeInterestExpense returns non-negative number', () => {
    const interest = computeInterestExpense(5000000, 9, 12);
    expect(interest).toBeGreaterThanOrEqual(0);
  });

  it('handleLeaseModification returns ROUSchedule preserving leaseId', () => {
    const rou = computeROUAtCommencement(LEASE);
    const mod: LeaseModification = {
      effectiveFromMonthIndex: 12,
      newMonthlyRentInr: 110000,
      newTermMonths: 48,
    };
    const modified = handleLeaseModification(rou, mod);
    expect(modified.leaseId).toBe(rou.leaseId);
  });

  it('generateROUSchedule for unknown lease returns empty rows', () => {
    const empty = generateROUSchedule('does-not-exist', E);
    expect(empty.rows.length).toBe(0);
  });

  it('generateAggregateDisclosure returns array of ROUDisclosureRow', () => {
    const rows = generateAggregateDisclosure(E, '2025-04-01', '2026-03-31');
    expect(Array.isArray(rows)).toBe(true);
  });
});
