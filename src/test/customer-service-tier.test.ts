/**
 * @file        src/test/customer-service-tier.test.ts
 * @sprint      T-Phase-1.C.1e · Block I.2
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  assignCustomerServiceTier,
  getActiveCustomerTier,
  getTierBenefits,
  applyTierToSLAHours,
  listCustomerTiers,
} from '@/lib/servicedesk-engine';

const ENTITY = 'OPRX';

function makeInput(over: Partial<Parameters<typeof assignCustomerServiceTier>[0]> = {}) {
  return {
    entity_id: ENTITY,
    customer_id: 'C-1',
    tier: 'gold' as const,
    assigned_at: new Date().toISOString(),
    assigned_by: 'tester',
    sla_override_id: null,
    cascade_override_id: null,
    reminder_frequency_override: null,
    notes: '',
    ...over,
  };
}

beforeEach(() => localStorage.clear());

describe('CustomerServiceTier', () => {
  it('assigns and persists', () => {
    const t = assignCustomerServiceTier(makeInput());
    expect(t.id).toBeTruthy();
    expect(listCustomerTiers({ entity_id: ENTITY }).length).toBe(1);
  });

  it('supersedes existing tier for same customer', () => {
    assignCustomerServiceTier(makeInput({ tier: 'bronze' }));
    assignCustomerServiceTier(makeInput({ tier: 'platinum', assigned_at: new Date(Date.now() + 1000).toISOString() }));
    const active = getActiveCustomerTier('C-1', ENTITY);
    expect(active?.tier).toBe('platinum');
  });

  it('getTierBenefits returns correct multipliers', () => {
    expect(getTierBenefits('gold').sla_multiplier).toBe(0.7);
    expect(getTierBenefits('platinum').sla_multiplier).toBe(0.5);
    expect(getTierBenefits('bronze').sla_multiplier).toBe(1.0);
  });

  it('applyTierToSLAHours · Gold 100h → 70h', () => {
    assignCustomerServiceTier(makeInput({ tier: 'gold' }));
    expect(applyTierToSLAHours(100, 'C-1', ENTITY)).toBe(70);
  });

  it('applyTierToSLAHours · no tier → unchanged', () => {
    expect(applyTierToSLAHours(100, 'C-NOPE', ENTITY)).toBe(100);
  });

  it('audit trail captures tier transitions', () => {
    const t = assignCustomerServiceTier(makeInput({ tier: 'silver' }));
    expect(t.audit_trail[0].action).toContain('silver');
  });
});
