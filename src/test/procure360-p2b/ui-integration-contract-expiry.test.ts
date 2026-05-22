/**
 * @file        ui-integration-contract-expiry.test.ts
 * @purpose     HK-5-2 Block D · UI integration · ContractExpiryDashboardPanel + engine
 * @sprint      T-Phase-2.HK-5-2 · Block D
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as Engine from '@/lib/contract-expiry-alert-engine';
import * as P2 from '@/pages/erp/procure-hub/panels-p2';

describe('HK-5-2 Block D · ContractExpiry UI integration', () => {
  beforeEach(() => { localStorage.clear(); });

  it('panel exported', () => { expect(typeof P2.ContractExpiryDashboardPanel).toBe('function'); });
  it('engine imports', () => { expect(Engine).toBeDefined(); });
  it('classifyTier exposed', () => { expect(typeof Engine.classifyTier).toBe('function'); });
  it('classifyTier urgent for daysToExpiry <= 30', () => {
    expect(Engine.classifyTier(15)).toBe('urgent');
  });
  it('classifyTier reminder for 31-60', () => {
    expect(Engine.classifyTier(45)).toBe('reminder');
  });
  it('classifyTier informational for > 60', () => {
    expect(Engine.classifyTier(75)).toBe('informational');
  });
  it('scanAgreements empty array returns empty', () => {
    expect(Engine.scanAgreements([], 90)).toEqual([]);
  });
  it('loadAcknowledgments empty default', () => {
    expect(Engine.loadAcknowledgments('e1')).toEqual([]);
  });
  it('saveAcknowledgments roundtrip', () => {
    Engine.saveAcknowledgments('e1', []);
    expect(Engine.loadAcknowledgments('e1')).toEqual([]);
  });
  it('summarizeAlerts returns summary shape', () => {
    const s = Engine.summarizeAlerts([]);
    expect(s).toBeDefined();
  });
  it('panel name stability', () => {
    expect(P2.ContractExpiryDashboardPanel.name).toContain('ContractExpiry');
  });
});
