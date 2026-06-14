/**
 * CL-2 · Block 2/3 · Engine-strip behavioural test.
 * servicedesk-oem-engine: the 5 stripped fns require entity_id (TSC compile gate
 * already proves callers pass it). This test asserts entity-scoped reads under
 * the new signatures — entity X writes route to X's bucket and round-trip via
 * getOEMClaim(id, X). qr-login: generateDemoQR is callable with required entity.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createOEMClaim,
  submitOEMClaimToProcure360,
  markOEMClaimApproved,
  markOEMClaimPaid,
  getOEMClaim,
} from '@/lib/servicedesk-oem-engine';
import { generateDemoQR } from '@/lib/qr-login-engine';
import { oemClaimKey } from '@/types/oem-claim';

const X = 'TENANTX';
const Y = 'TENANTY';

function seedClaim(entity: string): string {
  const c = createOEMClaim({
    entity_id: entity,
    branch_id: 'br-1',
    ticket_id: 'st-001',
    oem_name: 'ACME',
    total_claim_value_paise: 1_000_000,
    created_by: 'tester',
    line_items: [],
  } as Parameters<typeof createOEMClaim>[0]);
  return c.id;
}

describe('CL-2 · servicedesk-oem-engine strip', () => {
  beforeEach(() => localStorage.clear());

  it('stripped fns route to the entity bucket explicitly passed', () => {
    const idX = seedClaim(X);
    const idY = seedClaim(Y);

    submitOEMClaimToProcure360(idX, 'tester', 'WAR-X-1', X);
    markOEMClaimApproved(idX, 'tester', 1_000_000, X);
    markOEMClaimPaid(idX, 'tester', 1_000_000, X);

    const afterX = getOEMClaim(idX, X);
    const afterY = getOEMClaim(idY, Y);

    expect(afterX?.status).toBe('paid');
    expect(afterY?.status).toBe('pending');

    // No bleed: X's mutations did not write to Y's bucket
    const rawY = localStorage.getItem(oemClaimKey(Y));
    const rawX = localStorage.getItem(oemClaimKey(X));
    expect(rawY).toContain('"pending"');
    expect(rawX).toContain('"paid"');
    expect(rawY).not.toContain('WAR-X-1');
  });

  it('getOEMClaim with wrong entity returns null', () => {
    const idX = seedClaim(X);
    expect(getOEMClaim(idX, Y)).toBeNull();
    expect(getOEMClaim(idX, X)?.id).toBe(idX);
  });
});

describe('CL-2 · qr-login-engine strip', () => {
  it('generateDemoQR requires entity and uses it', () => {
    const qr = generateDemoQR('cred-1', X);
    // base64 payload encodes entity
    const decoded = atob(qr);
    expect(decoded).toContain(X);
  });
});
