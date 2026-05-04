/**
 * mobile-gate-guard-capture.test.ts — Sprint 4-pre-3 · Block C · D-312
 * Tests the canProceed step-validation logic (pure function · no DOM needed).
 */
import { describe, it, expect } from 'vitest';
import { canProceedForTests as canProceed } from '@/components/mobile/MobileGateGuardCapture';

const base = {
  direction: 'inward' as const,
  vehicleNo: '', vehicleType: 'truck',
  driverName: '', driverPhone: '', driverLicenseNo: '',
  purpose: '', counterpartyName: '',
  linkedVoucherType: null, linkedVoucherNo: '', remarks: '',
  podImageUrls: [] as string[],
};

describe('MobileGateGuardCapture · canProceed', () => {
  it('Step 1 · requires vehicle no >= 4 chars', () => {
    expect(canProceed(base, 1)).toBe(false);
    expect(canProceed({ ...base, vehicleNo: 'KA' }, 1)).toBe(false);
    expect(canProceed({ ...base, vehicleNo: 'KA01' }, 1)).toBe(true);
  });
  it('Step 2 · requires driver name + valid 10-digit phone (6-9 prefix)', () => {
    expect(canProceed({ ...base, driverName: 'Ram' }, 2)).toBe(false);
    expect(canProceed({ ...base, driverName: 'Ram', driverPhone: '5876543210' }, 2)).toBe(false);
    expect(canProceed({ ...base, driverName: 'Ram', driverPhone: '9876543210' }, 2)).toBe(true);
  });
  it('Step 3 · requires purpose + counterparty', () => {
    expect(canProceed({ ...base, purpose: 'Del' }, 3)).toBe(false);
    expect(canProceed({ ...base, purpose: 'Del', counterpartyName: 'Acme' }, 3)).toBe(true);
  });
  it('Step 4 · photos optional · always proceeds', () => {
    expect(canProceed(base, 4)).toBe(true);
  });
});
