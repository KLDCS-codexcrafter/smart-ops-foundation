/**
 * @file        src/test/installation-verification.test.ts
 * @sprint      T-Phase-1.C.1b · Block I.4
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createInstallationVerification,
  listInstallationVerifications,
  markVerificationComplete,
  isAMCKickoffBlocked,
} from '@/lib/servicedesk-engine';
import type { InstallationVerification } from '@/types/servicedesk';

const baseIV: Omit<InstallationVerification, 'id' | 'created_at' | 'updated_at' | 'audit_trail'> = {
  entity_id: 'OPRX',
  amc_record_id: 'amc-iv-1',
  site_visit_date: '2026-05-10',
  functional_check_passed: false,
  spare_inventory_verified: false,
  service_tier_config_verified: false,
  customer_briefing_done: false,
  emergency_contact_shared: false,
  documentation_handed_over: false,
  customer_acknowledgement: false,
  photos: [],
  customer_signature_url: null,
  notes: '',
  verifier_engineer_id: 'eng-1',
  status: 'in_progress',
  verified_by: null,
  verified_at: null,
  created_by: 'test',
};

beforeEach(() => localStorage.clear());

describe('Installation Verification', () => {
  it('persists on create', () => {
    createInstallationVerification(baseIV);
    expect(listInstallationVerifications()).toHaveLength(1);
  });
  it('filters by amc_record_id', () => {
    createInstallationVerification(baseIV);
    createInstallationVerification({ ...baseIV, amc_record_id: 'amc-iv-2' });
    expect(listInstallationVerifications({ amc_record_id: 'amc-iv-1' })).toHaveLength(1);
  });
  it('filters by status', () => {
    createInstallationVerification(baseIV);
    expect(listInstallationVerifications({ status: 'in_progress' })).toHaveLength(1);
    expect(listInstallationVerifications({ status: 'verified' })).toHaveLength(0);
  });
  it('throws when marking complete without all 7 checks', () => {
    const v = createInstallationVerification(baseIV);
    expect(() => markVerificationComplete(v.id, 'verifier1')).toThrow();
  });
  it('marks verified when all 7 pass', () => {
    const allTrue = {
      ...baseIV,
      functional_check_passed: true,
      spare_inventory_verified: true,
      service_tier_config_verified: true,
      customer_briefing_done: true,
      emergency_contact_shared: true,
      documentation_handed_over: true,
      customer_acknowledgement: true,
    };
    const v = createInstallationVerification(allTrue);
    const done = markVerificationComplete(v.id, 'verifier1');
    expect(done.status).toBe('verified');
    expect(done.verified_by).toBe('verifier1');
    expect(done.verified_at).not.toBeNull();
  });
  it('isAMCKickoffBlocked true when no verified', () => {
    createInstallationVerification(baseIV);
    expect(isAMCKickoffBlocked('amc-iv-1')).toBe(true);
  });
  it('isAMCKickoffBlocked false when at least one verified', () => {
    const allTrue = {
      ...baseIV,
      functional_check_passed: true,
      spare_inventory_verified: true,
      service_tier_config_verified: true,
      customer_briefing_done: true,
      emergency_contact_shared: true,
      documentation_handed_over: true,
      customer_acknowledgement: true,
    };
    const v = createInstallationVerification(allTrue);
    markVerificationComplete(v.id, 'u');
    expect(isAMCKickoffBlocked('amc-iv-1')).toBe(false);
  });
});
