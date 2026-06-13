/**
 * @sprint W1C-10 · T-W1C10-Smoke-Cleanup · F-4
 * Behavioral: ProvisioningManager must merge `demo-entity` and
 * `public-build-your-plan` scopes so BYP-submitted requests appear in the Tower.
 *
 * Engine-level test (no React render) — asserts the merge contract used by
 * ProvisioningManager.refresh() and that the source file imports both scopes.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  createProvisionRequest,
  listProvisionRequests,
} from '@/lib/provisioning-engine';

const DEMO = 'demo-entity';
const BYP = 'public-build-your-plan';

describe('W1C-10 F-4 · ProvisioningManager merges BYP scope', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('source file references both demo-entity and public-build-your-plan', () => {
    const src = readFileSync('src/pages/tower/ProvisioningManager.tsx', 'utf8');
    expect(src).toMatch(/['"]demo-entity['"]/);
    expect(src).toMatch(/['"]public-build-your-plan['"]/);
    // Calls listProvisionRequests against both scopes
    const calls = (src.match(/listProvisionRequests\(/g) ?? []).length;
    expect(calls).toBeGreaterThanOrEqual(2);
  });

  it('a request written under public-build-your-plan shows up in the merged list', () => {
    createProvisionRequest(BYP, {
      type: 'demo',
      requester_name: 'BYP Test Co',
      assigned_variant_id: null,
      partner_id: null,
      notes: 'submitted via /build-your-plan',
    });
    createProvisionRequest(DEMO, {
      type: 'client',
      requester_name: 'Demo Entity Co',
      assigned_variant_id: null,
      partner_id: null,
      notes: '',
    });

    // Mirror ProvisioningManager.refresh merge
    const merged = [
      ...listProvisionRequests(DEMO),
      ...listProvisionRequests(BYP),
    ];

    const names = merged.map(r => r.requester_name);
    expect(names).toContain('BYP Test Co');
    expect(names).toContain('Demo Entity Co');
  });
});
