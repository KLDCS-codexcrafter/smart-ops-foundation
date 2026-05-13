/**
 * @file        src/test/oem-claim-lifecycle.test.ts
 * @purpose     C.1d · OEM claim 5-state lifecycle + Procure360 bridge emit (D-NEW-DJ 5th consumer)
 * @sprint      T-Phase-1.C.1d · Block H.1
 * @iso         Reliability + Functional Suitability
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createOEMClaim,
  submitOEMClaimToProcure360,
  markOEMClaimApproved,
  markOEMClaimPaid,
  markOEMClaimRejected,
  listOEMClaims,
  getOEMClaim,
} from '@/lib/servicedesk-oem-engine';
import { listProcure360OEMClaimStubs } from '@/lib/servicedesk-bridges';

const ENTITY = 'OPRX';

function seed(overrides: Partial<Parameters<typeof createOEMClaim>[0]> = {}) {
  return createOEMClaim({
    entity_id: ENTITY,
    branch_id: 'BR-1',
    ticket_id: 'st-001',
    oem_name: 'BoschIN',
    spare_id: 'SP-101',
    spare_name: 'Compressor coil',
    qty: 1,
    unit_cost_paise: 1_500_000,
    total_claim_value_paise: 1_500_000,
    warranty_period_status: 'in_warranty',
    notes: '',
    created_by: 'tester',
    ...overrides,
  });
}

describe('OEMClaim 5-state lifecycle', () => {
  beforeEach(() => localStorage.clear());

  it('createOEMClaim starts in pending with sequenced claim_no', () => {
    const c = seed();
    expect(c.status).toBe('pending');
    expect(c.claim_no).toMatch(/^OEM\/OPRX\/000001$/);
    expect(c.audit_trail.length).toBe(1);
  });

  it('pending → submitted fires Procure360 bridge (D-NEW-DJ 5th consumer)', () => {
    const c = seed();
    submitOEMClaimToProcure360(c.id, 'tester', 'WAR-2026-9999', ENTITY);
    const stubs = listProcure360OEMClaimStubs();
    expect(stubs.find((s) => s.oem_claim_packet_id === c.id)).toBeTruthy();
    const after = getOEMClaim(c.id, ENTITY);
    expect(after?.status).toBe('submitted');
    expect(after?.oem_claim_no).toBe('WAR-2026-9999');
    expect(after?.submitted_at).toBeTruthy();
  });

  it('submitted → approved → paid records amounts and timestamps', () => {
    const c = seed();
    submitOEMClaimToProcure360(c.id, 'tester', 'WAR-X', ENTITY);
    markOEMClaimApproved(c.id, 'tester', 1_200_000, ENTITY);
    let after = getOEMClaim(c.id, ENTITY);
    expect(after?.status).toBe('approved');
    expect(after?.approved_at).toBeTruthy();
    expect(after?.paid_amount_paise).toBe(1_200_000);

    markOEMClaimPaid(c.id, 'tester', 1_200_000, ENTITY);
    after = getOEMClaim(c.id, ENTITY);
    expect(after?.status).toBe('paid');
    expect(after?.paid_at).toBeTruthy();
  });

  it('rejection captures reason in audit trail', () => {
    const c = seed();
    submitOEMClaimToProcure360(c.id, 'tester', 'WAR-X', ENTITY);
    markOEMClaimRejected(c.id, 'tester', 'serial_not_in_warranty_db', ENTITY);
    const after = getOEMClaim(c.id, ENTITY);
    expect(after?.status).toBe('rejected');
    expect(after?.rejection_reason).toBe('serial_not_in_warranty_db');
    expect(after?.audit_trail.some((a) => a.reason === 'serial_not_in_warranty_db')).toBe(true);
  });

  it('listOEMClaims filters by status / oem_name / ticket_id', () => {
    seed({ oem_name: 'A' });
    const b = seed({ oem_name: 'B', ticket_id: 'st-002' });
    submitOEMClaimToProcure360(b.id, 'tester', 'WAR-B', ENTITY);
    expect(listOEMClaims({ status: 'pending' }).length).toBe(1);
    expect(listOEMClaims({ status: 'submitted' }).length).toBe(1);
    expect(listOEMClaims({ oem_name: 'B' }).length).toBe(1);
    expect(listOEMClaims({ ticket_id: 'st-002' }).length).toBe(1);
  });
});
