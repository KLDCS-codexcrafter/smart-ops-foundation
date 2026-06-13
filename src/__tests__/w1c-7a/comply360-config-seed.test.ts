/**
 * W1C-7a · Block 1 — Compliance Settings & Automation demo seed.
 * After seed, the summary key exists with the required Comply360ConfigSummary
 * fields, the sub-config keys (group/rcm/settlement/outstanding/lc) populate
 * with the shapes the ComplianceSettingsAutomation component reads, and
 * isConfigured('erp_comply360_config') (the OverviewModule check) flips true.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  seedCCConfigForDemoEntities,
  comply360ConfigKey,
  DEMO_ENTITY_CODES,
} from '@/lib/cc-config-seed';
import {
  COMPLY360_GROUP_KEY,
  comply360RCMKey,
  comply360SettlementKey,
  comply360OutstandingKey,
  comply360LCKey,
} from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import { isConfigured } from '@/features/command-center/components/ZoneProgressResolver';

beforeEach(() => localStorage.clear());

describe('W1C-7a · comply360 config seed', () => {
  it('writes the summary marker for every demo entity', () => {
    seedCCConfigForDemoEntities();
    for (const e of DEMO_ENTITY_CODES) {
      const raw = localStorage.getItem(comply360ConfigKey(e));
      expect(raw).toBeTruthy();
      const obj = JSON.parse(raw!);
      expect(obj.seededBy).toBe('demo');
      expect(obj.schemaVersion).toBe(1);
      expect(obj.gstEnabled).toBe(true);
      expect(obj.tdsEnabled).toBe(true);
      expect(obj.einvoiceEnabled).toBe(true);
      expect(obj.ewayEnabled).toBe(true);
      expect(typeof obj.seededAt).toBe('string');
    }
  });

  it('populates the sub-config keys with the component schema shape', () => {
    seedCCConfigForDemoEntities();
    const group = JSON.parse(localStorage.getItem(COMPLY360_GROUP_KEY)!);
    expect(group.enableAdvancedGST).toBe(true);
    expect(group.enableAutoRCM).toBe(true);
    expect(group.enableAutoTDSPayable).toBe(true);
    expect(group.enableAutoTDSReceivable).toBe(true);
    // Schema preservation — DEFAULT_GROUP_CONFIG keys remain present.
    expect(group).toHaveProperty('itemInvoiceByDefault');
    expect(group).toHaveProperty('defaultReceiveGodown');

    for (const e of DEMO_ENTITY_CODES) {
      const rcm = JSON.parse(localStorage.getItem(comply360RCMKey(e))!);
      expect(rcm).toHaveProperty('rcmCGSTLedger');
      expect(rcm).toHaveProperty('inputCGSTLedger');
      const set = JSON.parse(localStorage.getItem(comply360SettlementKey(e))!);
      expect(set.settlementMethod).toBe('fifo');
      const out = JSON.parse(localStorage.getItem(comply360OutstandingKey(e))!);
      expect(Array.isArray(out.agingBuckets)).toBe(true);
      const lc = JSON.parse(localStorage.getItem(comply360LCKey(e))!);
      expect(lc.defaultAllocationMethod).toBe('by_value');
    }
  });

  it('flips OverviewModule isConfigured(erp_comply360_config) to true post-seed', () => {
    expect(isConfigured('erp_comply360_config')).toBe(false);
    seedCCConfigForDemoEntities();
    expect(isConfigured('erp_comply360_config')).toBe(true);
  });

  it('is idempotent (second call does not overwrite)', () => {
    seedCCConfigForDemoEntities();
    const before = localStorage.getItem(comply360ConfigKey('SMRT'));
    seedCCConfigForDemoEntities();
    const after = localStorage.getItem(comply360ConfigKey('SMRT'));
    expect(after).toBe(before);
  });
});
