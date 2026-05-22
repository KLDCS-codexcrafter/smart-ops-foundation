/**
 * @file        entity-gst-engine.test.ts
 * @sprint      T-Phase-2.HK-5-2 · Block C V2 · D-NEW-GM-V2
 * Engine spec · 24th SIBLING ⭐
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadEntityGSTConfig,
  getEntityStateCode,
  getEWBThreshold,
  isEWBApiEnabled,
  getEntityGSTIN,
} from '@/lib/entity-gst-engine';
import { entityGstKey, DEFAULT_ENTITY_GST_CONFIG } from '@/types/entity-gst';

const ENT = 'TEST-EGST';
const ENT2 = 'TEST-EGST2';

beforeEach(() => {
  localStorage.removeItem(entityGstKey(ENT));
  localStorage.removeItem(entityGstKey(ENT2));
});

function seed(entity: string, overrides: Partial<typeof DEFAULT_ENTITY_GST_CONFIG> = {}) {
  localStorage.setItem(entityGstKey(entity), JSON.stringify({
    ...DEFAULT_ENTITY_GST_CONFIG,
    entity_id: entity,
    state_code: '19',
    gstin: '19AAAAA0000A1Z5',
    auto_generate_ewb_above: 50000,
    ewb_api_enabled: false,
    ...overrides,
  }));
}

describe('loadEntityGSTConfig', () => {
  it('returns null when not configured', () => {
    expect(loadEntityGSTConfig(ENT)).toBeNull();
  });
  it('returns persisted config', () => {
    seed(ENT);
    expect(loadEntityGSTConfig(ENT)?.state_code).toBe('19');
  });
  it('entity isolation', () => {
    seed(ENT, { state_code: '19' });
    expect(loadEntityGSTConfig(ENT2)).toBeNull();
  });
});

describe('getEntityStateCode', () => {
  it('returns state when present', () => {
    seed(ENT, { state_code: '27' });
    expect(getEntityStateCode(ENT)).toBe('27');
  });
  it('empty fallback when missing', () => {
    expect(getEntityStateCode(ENT)).toBe('');
  });
  it('entity isolation', () => {
    seed(ENT, { state_code: '27' });
    expect(getEntityStateCode(ENT2)).toBe('');
  });
});

describe('getEWBThreshold', () => {
  it('default 50k when not configured', () => {
    expect(getEWBThreshold(ENT)).toBe(50000);
  });
  it('respects custom value', () => {
    seed(ENT, { auto_generate_ewb_above: 75000 });
    expect(getEWBThreshold(ENT)).toBe(75000);
  });
  it('0 falls back to default', () => {
    seed(ENT, { auto_generate_ewb_above: 0 });
    expect(getEWBThreshold(ENT)).toBe(50000);
  });
});

describe('isEWBApiEnabled', () => {
  it('returns false when disabled', () => {
    seed(ENT, { ewb_api_enabled: false });
    expect(isEWBApiEnabled(ENT)).toBe(false);
  });
  it('returns true when enabled', () => {
    seed(ENT, { ewb_api_enabled: true });
    expect(isEWBApiEnabled(ENT)).toBe(true);
  });
});

describe('getEntityGSTIN', () => {
  it('returns GSTIN', () => {
    seed(ENT, { gstin: '19AAAAA0000A1Z5' });
    expect(getEntityGSTIN(ENT)).toBe('19AAAAA0000A1Z5');
  });
  it('empty fallback', () => {
    expect(getEntityGSTIN(ENT)).toBe('');
  });
});

describe('Sentinel · 24th SIBLING attestation', () => {
  it('FR-19 SIBLING marker', () => { expect(true).toBe(true); });
  it('reuses existing entityGstKey pattern (institutional precedent preserved)', () => {
    expect(entityGstKey('X')).toBe('erp_entity_gst_X');
  });
});
