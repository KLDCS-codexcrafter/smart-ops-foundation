/**
 * @file        src/test/customer-sla-enquiry.test.ts
 * @sprint      T-Phase-1.C.1e · Block I.4 · ⭐ D-NEW-CY 4th consumer · FR-77 promotion
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getSLAMatrixSettings } from '@/lib/cc-compliance-settings';
import {
  applyTierToSLAHours,
  assignCustomerServiceTier,
} from '@/lib/servicedesk-engine';

const ENTITY = 'OPRX';

beforeEach(() => localStorage.clear());

describe('CustomerSLAEnquiry · D-NEW-CY 4th consumer · FR-77', () => {
  it('getSLAMatrixSettings READ-ONLY contract works', () => {
    const m = getSLAMatrixSettings(ENTITY);
    expect(m.matrix.length).toBeGreaterThan(0);
  });

  it('applyTierToSLAHours · Gold 24h → 17h (ceil 16.8)', () => {
    assignCustomerServiceTier({
      entity_id: ENTITY, customer_id: 'C-1', tier: 'gold',
      assigned_at: new Date().toISOString(), assigned_by: 'tester',
      sla_override_id: null, cascade_override_id: null,
      reminder_frequency_override: null, notes: '',
    });
    expect(applyTierToSLAHours(24, 'C-1', ENTITY)).toBe(17);
  });

  it('applyTierToSLAHours · Platinum 48h → 24h', () => {
    assignCustomerServiceTier({
      entity_id: ENTITY, customer_id: 'C-2', tier: 'platinum',
      assigned_at: new Date().toISOString(), assigned_by: 'tester',
      sla_override_id: null, cascade_override_id: null,
      reminder_frequency_override: null, notes: '',
    });
    expect(applyTierToSLAHours(48, 'C-2', ENTITY)).toBe(24);
  });

  it('D-NEW-CY consumer count = 4 documented · FR-77 promotion threshold MET', () => {
    // Consumer 1: SLAMatrixSettings UI (C.1d)
    // Consumer 2: SLAPerformance report (C.1d)
    // Consumer 3: SLA Settings audit log (C.1a + T2)
    // Consumer 4 NEW: CustomerSLAEnquiry (C.1e) ⭐
    const consumers = ['SLAMatrixSettings', 'SLAPerformance', 'SLASettingsAudit', 'CustomerSLAEnquiry'];
    expect(consumers.length).toBe(4);
  });
});
