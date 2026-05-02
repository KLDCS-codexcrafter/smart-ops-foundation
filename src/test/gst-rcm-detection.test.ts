/**
 * gst-rcm-detection.test.ts — 8 tests for GST + RCM Auto-Detection (Sprint 2.7-a)
 * Covers: gstin-validator (GST1), URP/composition (GST2), state code (GST3),
 * place-of-supply intra/inter (GST4), HSN baseline (GST5), RCM HSN-only (GST6),
 * RCM URP HIGH (GST7), RCM no-signal INFO (GST8).
 */
import { describe, it, expect } from 'vitest';
import { validateGSTIN, isUnregisteredParty, gstinStateCode } from '@/lib/gstin-validator';
import { determinePlaceOfSupply } from '@/lib/place-of-supply-engine';
import {
  detectRCMForVoucher,
  isHSNNotified,
  type DetectionLine,
  type VendorMasterSnapshot,
} from '@/lib/rcm-detection-engine';

const VALID_GSTIN = '29ABCDE1234F1Z5';     // Karnataka
const URP_GSTIN = 'URP';

const REG_VENDOR: VendorMasterSnapshot = {
  id: 'v1', name: 'Reg Vendor', gstin: VALID_GSTIN,
  is_composition: false, party_registration_type: 'regular', state_code: '29',
};
const URP_VENDOR: VendorMasterSnapshot = {
  id: 'v2', name: 'URP Vendor', gstin: null,
  is_composition: false, party_registration_type: 'urp', state_code: '27',
};
const COMP_VENDOR: VendorMasterSnapshot = {
  id: 'v3', name: 'Comp Vendor', gstin: VALID_GSTIN,
  is_composition: true, party_registration_type: 'composition', state_code: '29',
};

const cleanLine = (id: string, hsn: string | null): DetectionLine => ({
  id, hsn_sac_code: hsn, taxable_amount_paise: 100000,
});

describe('GST1 — gstin-validator format', () => {
  it('accepts valid GSTIN and rejects malformed', () => {
    expect(validateGSTIN(VALID_GSTIN).valid).toBe(true);
    expect(validateGSTIN(VALID_GSTIN).state_code).toBe('29');
    expect(validateGSTIN('29ABCDE1234F1Z').valid).toBe(false); // 14-char
    expect(validateGSTIN('29abcde1234f1z5').valid).toBe(true); // case-insensitive
    expect(validateGSTIN('29ABCDE12345Z1Z5').valid).toBe(false); // bad PAN
  });
});

describe('GST2 — URP / composition detection', () => {
  it('isUnregisteredParty handles URP, null, empty, invalid', () => {
    expect(isUnregisteredParty(null)).toBe(true);
    expect(isUnregisteredParty('')).toBe(true);
    expect(isUnregisteredParty('URP')).toBe(true);
    expect(isUnregisteredParty('garbage')).toBe(true);
    expect(isUnregisteredParty(VALID_GSTIN)).toBe(false);
    expect(isUnregisteredParty(URP_GSTIN)).toBe(true);
  });
});

describe('GST3 — state code extraction', () => {
  it('gstinStateCode returns first 2 chars when valid', () => {
    expect(gstinStateCode(VALID_GSTIN)).toBe('29');
    expect(gstinStateCode('27ABCDE1234F1Z5')).toBe('27');
    expect(gstinStateCode('99ABCDE1234F1Z5')).toBe('99');
    expect(gstinStateCode('garbage')).toBeNull();
  });
});

describe('GST4 — place-of-supply intra vs inter', () => {
  it('intra-state when supplier=ship_to', () => {
    const r = determinePlaceOfSupply('29', '29', '27');
    expect(r.is_interstate).toBe(false);
    expect(r.state_code).toBe('29');
    expect(r.source).toBe('ship_to');
  });
  it('inter-state when supplier ≠ ship_to', () => {
    const r = determinePlaceOfSupply('29', '27', '29');
    expect(r.is_interstate).toBe(true);
    expect(r.state_code).toBe('27');
    expect(r.state_name).toBe('Maharashtra');
  });
  it('falls back to bill_to when ship_to absent', () => {
    const r = determinePlaceOfSupply('29', null, '27');
    expect(r.source).toBe('bill_to');
    expect(r.state_code).toBe('27');
  });
});

describe('GST5 — HSN baseline notification list', () => {
  it('flags Section 9(3) baseline codes', () => {
    expect(isHSNNotified('9961')).toBe(true);  // GTA
    expect(isHSNNotified('9962')).toBe(true);  // Legal
    expect(isHSNNotified('5201')).toBe(true);  // Raw cotton
    expect(isHSNNotified('1234')).toBe(false); // not on list
    expect(isHSNNotified(null)).toBe(false);
    expect(isHSNNotified('')).toBe(false);
  });
});

describe('GST6 — RCM detection: HSN-only triggers MED', () => {
  it('registered vendor + 9(3) HSN → MED severity', () => {
    const r = detectRCMForVoucher(REG_VENDOR, [cleanLine('l1', '9961'), cleanLine('l2', '1234')]);
    expect(r.detected).toBe(true);
    expect(r.severity).toBe('MED');
    expect(r.signals.signal_hsn_notified).toBe(true);
    expect(r.signals.signal_urp).toBe(false);
    expect(r.signals.recommended_section).toBe('9(3)');
    expect(r.affected_line_ids).toEqual(['l1']);
    expect(r.taxable_amount_paise).toBe(100000);
  });
});

describe('GST7 — RCM detection: URP triggers HIGH 9(4)', () => {
  it('URP vendor + clean HSN → HIGH all-lines', () => {
    const r = detectRCMForVoucher(URP_VENDOR, [cleanLine('l1', '1234'), cleanLine('l2', '5678')]);
    expect(r.detected).toBe(true);
    expect(r.severity).toBe('HIGH');
    expect(r.signals.signal_urp).toBe(true);
    expect(r.signals.recommended_section).toBe('9(4)');
    expect(r.affected_line_ids).toHaveLength(2);
    expect(r.taxable_amount_paise).toBe(200000);
  });
  it('Composition vendor → HIGH 9(4)', () => {
    const r = detectRCMForVoucher(COMP_VENDOR, [cleanLine('l1', '1234')]);
    expect(r.severity).toBe('HIGH');
    expect(r.signals.signal_composition).toBe(true);
    expect(r.signals.recommended_section).toBe('9(4)');
  });
});

describe('GST8 — RCM detection: clean → INFO no detection', () => {
  it('registered vendor + non-notified HSN → INFO not detected', () => {
    const r = detectRCMForVoucher(REG_VENDOR, [cleanLine('l1', '1234')]);
    expect(r.detected).toBe(false);
    expect(r.severity).toBe('INFO');
    expect(r.affected_line_ids).toEqual([]);
    expect(r.taxable_amount_paise).toBe(0);
    expect(r.signals.recommended_section).toBeNull();
  });
});
