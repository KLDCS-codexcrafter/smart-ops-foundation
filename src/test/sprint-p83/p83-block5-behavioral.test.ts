/**
 * Sprint P8.3 · Block 5 — BEHAVIORAL TESTS (≥28)
 *
 * Drives real engine calls (Class-B wiring) AND the universal logAudit primitive
 * to prove every P83 W1 audit literal lands an end-to-end entry in the
 * `erp_audit_trail_<entityCode>` localStorage bucket with the right shape:
 *   - entity_type matches the catalog literal
 *   - record_id / record_label / reason / source_module round-trip verbatim
 *   - before_state / after_state preserved (append-only)
 *   - id carries `aud_` prefix · timestamp is ISO-8601
 *   - entity-scoped buckets are isolated across tenants
 *
 * The 8 P83 W1 literals (Block 1 + 2):
 *   treasury_event · procure_master_event · eximx_event · fincore_settings_event
 *   salesx_master_event · foundation_master_event · receivx_master_event
 *   salesx_txn_event
 *
 * Wall: no production-source mutation. Uses real engine APIs end-to-end.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  logAudit,
  readAuditTrail,
  AUDIT_TRAIL_DISABLED,
} from '../../lib/audit-trail-engine';
import {
  ADDITIVE_INLINE_AUDIT_TYPES,
  auditTrailKey,
  type AuditEntityType,
} from '../../types/audit-trail';


// Real engines (Class-B wiring under test)
import { createBudget } from '../../lib/budget-allocation-engine';
import { setPeriodLock } from '../../lib/period-lock-engine';
import { writeFiscalYears, buildFiscalYear } from '../../lib/fiscal-year-engine';
import { saveRegisterConfig, registerConfigKey } from '../../lib/register-config-storage';
import { createRateContract } from '../../lib/rate-contract-engine';
import { createRule as createAutoPayRule } from '../../lib/auto-pay-engine';

const E = 'P83-BLOCK5';
const E2 = 'P83-BLOCK5-ALT';

// Reset audit + per-engine storage per test for hermetic runs.
beforeEach(() => {
  localStorage.clear();
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 1 — Per-literal direct logAudit (8 tests).
// One test per P83 literal: drives logAudit, asserts entry shape via readAuditTrail.
// ─────────────────────────────────────────────────────────────────────────────
const P83_LITERALS: AuditEntityType[] = [
  'treasury_event',
  'procure_master_event',
  'eximx_event',
  'fincore_settings_event',
  'salesx_master_event',
  'foundation_master_event',
  'receivx_master_event',
  'salesx_txn_event',
];

describe('P83 · Block 5 · per-literal round-trip', () => {
  for (const literal of P83_LITERALS) {
    it(`literal ${literal} round-trips through logAudit → readAuditTrail`, () => {
      const recordId = `rec-${literal}-001`;
      const label = `Test · ${literal}`;
      const reason = `behavioral_fixture_${literal}`;
      const sourceModule = `p83-block5/${literal}`;
      const after = { kind: literal, k1: 'v1', n: 42 };

      logAudit({
        entityCode: E,
        action: 'create',
        entityType: literal,
        recordId,
        recordLabel: label,
        beforeState: null,
        afterState: after,
        reason,
        sourceModule,
      });

      const entries = readAuditTrail(E, { entityType: literal });
      expect(entries).toHaveLength(1);
      const e = entries[0];
      expect(e.entity_type).toBe(literal);
      expect(e.record_id).toBe(recordId);
      expect(e.record_label).toBe(label);
      expect(e.reason).toBe(reason);
      expect(e.source_module).toBe(sourceModule);
      expect(e.before_state).toBeNull();
      expect(e.after_state).toEqual(after);
      expect(e.action).toBe('create');
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 2 — Real engine drive-throughs (8 tests).
// Each calls a real engine function (Class-B wiring) and asserts that an audit
// entry was emitted with the correct literal + matching record id.
// ─────────────────────────────────────────────────────────────────────────────
describe('P83 · Block 5 · engine drive-through', () => {
  it('budget-allocation-engine.createBudget emits procure_master_event', () => {
    const rec = createBudget(E, {
      entity_id: E,
      fiscal_year: 'FY26-27',
      scope: 'entity',
      scope_ref_id: null,
      scope_ref_label: 'Entity-wide',
      allocated_amount: 1_00_000,
      warning_threshold_pct: 80,
      is_active: true,
      notes: 'fixture',
    });
    const entries = readAuditTrail(E, { entityType: 'procure_master_event' });
    expect(entries).toHaveLength(1);
    expect(entries[0].record_id).toBe(rec.id);
    expect(entries[0].source_module).toBe('budget-allocation-engine');
    expect(entries[0].reason).toBe('budget_allocation_created');
  });

  it('period-lock-engine.setPeriodLock (first call) emits fincore_settings_event create', () => {
    setPeriodLock(E, '2026-03-31', 'tester-1');
    const entries = readAuditTrail(E, { entityType: 'fincore_settings_event' });
    expect(entries).toHaveLength(1);
    expect(entries[0].action).toBe('create');
    expect(entries[0].source_module).toBe('period-lock-engine');
  });

  it('period-lock-engine.setPeriodLock (second call) emits fincore_settings_event update', async () => {
    setPeriodLock(E, '2026-03-31', 'tester-1');
    await new Promise(r => setTimeout(r, 5));
    setPeriodLock(E, '2026-06-30', 'tester-2');
    const entries = readAuditTrail(E, { entityType: 'fincore_settings_event' });
    expect(entries).toHaveLength(2);
    expect(entries.filter(e => e.action === 'create')).toHaveLength(1);
    expect(entries.filter(e => e.action === 'update')).toHaveLength(1);
  });


  it('fiscal-year-engine.writeFiscalYears emits fincore_settings_event per new FY', () => {
    const fy = buildFiscalYear(2026, 4);
    writeFiscalYears(E, [fy]);
    const entries = readAuditTrail(E, { entityType: 'fincore_settings_event' });
    expect(entries).toHaveLength(1);
    expect(entries[0].record_id).toBe(fy.id);
    expect(entries[0].source_module).toBe('fiscal-year-engine');
  });

  it('fiscal-year-engine.writeFiscalYears DOES NOT re-emit when same FY is rewritten', () => {
    const fy = buildFiscalYear(2026, 4);
    writeFiscalYears(E, [fy]);
    writeFiscalYears(E, [fy]); // same id, no new audit
    const entries = readAuditTrail(E, { entityType: 'fincore_settings_event' });
    expect(entries).toHaveLength(1);
  });

  it('register-config-storage.saveRegisterConfig emits fincore_settings_event update', () => {
    saveRegisterConfig(E, { version: 1, byRegisterType: {} });
    const entries = readAuditTrail(E, { entityType: 'fincore_settings_event' });
    expect(entries).toHaveLength(1);
    expect(entries[0].action).toBe('update');
    expect(entries[0].record_id).toBe(`register-config:${E}`);
    expect(entries[0].source_module).toBe('register-config-storage');
    // sanity: storage key is reachable for downstream readers
    expect(localStorage.getItem(registerConfigKey(E))).not.toBeNull();
  });

  it('rate-contract-engine.createRateContract emits procure_master_event', () => {
    const rc = createRateContract({
      entity_code: E,
      entity_id: E,
      vendor_id: 'v-1',
      vendor_name: 'Acme Steel Pvt Ltd',
      valid_from: '2026-04-01',
      valid_to: '2027-03-31',
      payment_terms: 'NET-30',
      delivery_terms: 'FOR',
      lines: [{
        item_id: 'i-1', item_name: 'HR Coil',
        uom: 'KG', agreed_rate: 55, max_qty: 1000, currency: 'INR',
      }] as never,
      notes: 'fixture',
      created_by: 'tester',
    });
    const entries = readAuditTrail(E, { entityType: 'procure_master_event' });
    expect(entries).toHaveLength(1);
    expect(entries[0].record_id).toBe(rc.id);
    expect(entries[0].reason).toBe('rate_contract_created');
  });

  it('auto-pay-engine.createRule emits treasury_event', () => {
    const rule = createAutoPayRule({
      entityCode: E,
      name: 'Monthly rent',
      enabled: true,
      trigger_type: 'threshold',
      threshold_amount: 50_000,
      payment_template_id: 'pt-1',
      payment_template_label: 'Vendor wire',
    });
    const entries = readAuditTrail(E, { entityType: 'treasury_event' });
    expect(entries).toHaveLength(1);
    expect(entries[0].record_id).toBe(rule.id);
    expect(entries[0].source_module).toBe('auto-pay-engine');
    expect(entries[0].reason).toBe('auto_pay_rule_created');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 3 — Cross-cutting invariants (≥14 tests).
// ─────────────────────────────────────────────────────────────────────────────
describe('P83 · Block 5 · MCA Rule 3(1) invariants', () => {
  it('AUDIT_TRAIL_DISABLED constant is false (cannot be disabled)', () => {
    expect(AUDIT_TRAIL_DISABLED).toBe(false);
  });

  it('append-only: a second logAudit does not mutate the first entry', () => {
    logAudit({
      entityCode: E, action: 'create', entityType: 'treasury_event',
      recordId: 'r-1', recordLabel: 'first',
      beforeState: null, afterState: { v: 1 },
      reason: 'first_write', sourceModule: 'p83-block5',
    });
    const first = readAuditTrail(E)[0];
    const firstSnapshot = JSON.stringify(first);
    logAudit({
      entityCode: E, action: 'create', entityType: 'treasury_event',
      recordId: 'r-2', recordLabel: 'second',
      beforeState: null, afterState: { v: 2 },
      reason: 'second_write', sourceModule: 'p83-block5',
    });
    const all = readAuditTrail(E);
    expect(all).toHaveLength(2);
    // Find the original by record_id; its serialized snapshot must be untouched.
    const original = all.find(e => e.record_id === 'r-1');
    expect(original).toBeDefined();
    expect(JSON.stringify(original)).toBe(firstSnapshot);
  });

  it('entity scoping: writes for E do not appear in E2 bucket', () => {
    logAudit({
      entityCode: E, action: 'create', entityType: 'eximx_event',
      recordId: 'r-iso', recordLabel: 'scoped',
      beforeState: null, afterState: { v: 1 },
      reason: 'scope_test', sourceModule: 'p83-block5',
    });
    expect(readAuditTrail(E)).toHaveLength(1);
    expect(readAuditTrail(E2)).toHaveLength(0);
  });

  it('storage key matches auditTrailKey(entityCode)', () => {
    logAudit({
      entityCode: E, action: 'create', entityType: 'eximx_event',
      recordId: 'r-k', recordLabel: 'key',
      beforeState: null, afterState: { v: 1 },
      reason: 'key_check', sourceModule: 'p83-block5',
    });
    const raw = localStorage.getItem(auditTrailKey(E));
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toHaveLength(1);
  });

  it('entry id carries aud_ prefix', () => {
    const e = logAudit({
      entityCode: E, action: 'create', entityType: 'eximx_event',
      recordId: 'r-id', recordLabel: 'id',
      beforeState: null, afterState: { v: 1 },
      reason: 'id_check', sourceModule: 'p83-block5',
    });
    expect(e.id).toMatch(/^aud_/);
  });

  it('entry timestamp parses as a valid ISO-8601 instant', () => {
    const e = logAudit({
      entityCode: E, action: 'create', entityType: 'eximx_event',
      recordId: 'r-ts', recordLabel: 'ts',
      beforeState: null, afterState: { v: 1 },
      reason: 'ts_check', sourceModule: 'p83-block5',
    });
    expect(e.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(Number.isNaN(Date.parse(e.timestamp))).toBe(false);
  });

  it('readAuditTrail filters by entityType', () => {
    logAudit({
      entityCode: E, action: 'create', entityType: 'treasury_event',
      recordId: 't-1', recordLabel: 'tr',
      beforeState: null, afterState: { v: 1 },
      reason: 'r', sourceModule: 'p83-block5',
    });
    logAudit({
      entityCode: E, action: 'create', entityType: 'eximx_event',
      recordId: 'x-1', recordLabel: 'xx',
      beforeState: null, afterState: { v: 1 },
      reason: 'r', sourceModule: 'p83-block5',
    });
    expect(readAuditTrail(E, { entityType: 'treasury_event' })).toHaveLength(1);
    expect(readAuditTrail(E, { entityType: 'eximx_event' })).toHaveLength(1);
    expect(readAuditTrail(E)).toHaveLength(2);
  });

  it('readAuditTrail filters by action', () => {
    logAudit({
      entityCode: E, action: 'create', entityType: 'treasury_event',
      recordId: 'a-1', recordLabel: 'a',
      beforeState: null, afterState: { v: 1 },
      reason: 'r', sourceModule: 'p83-block5',
    });
    logAudit({
      entityCode: E, action: 'update', entityType: 'treasury_event',
      recordId: 'a-1', recordLabel: 'a',
      beforeState: { v: 1 }, afterState: { v: 2 },
      reason: 'r', sourceModule: 'p83-block5',
    });
    expect(readAuditTrail(E, { action: 'create' })).toHaveLength(1);
    expect(readAuditTrail(E, { action: 'update' })).toHaveLength(1);
  });

  it('readAuditTrail filters by recordId', () => {
    logAudit({
      entityCode: E, action: 'create', entityType: 'treasury_event',
      recordId: 'r-A', recordLabel: 'A',
      beforeState: null, afterState: { v: 1 },
      reason: 'r', sourceModule: 'p83-block5',
    });
    logAudit({
      entityCode: E, action: 'create', entityType: 'treasury_event',
      recordId: 'r-B', recordLabel: 'B',
      beforeState: null, afterState: { v: 1 },
      reason: 'r', sourceModule: 'p83-block5',
    });
    const onlyA = readAuditTrail(E, { recordId: 'r-A' });
    expect(onlyA).toHaveLength(1);
    expect(onlyA[0].record_id).toBe('r-A');
  });

  it('readAuditTrail returns descending by timestamp', async () => {
    logAudit({
      entityCode: E, action: 'create', entityType: 'treasury_event',
      recordId: 't-old', recordLabel: 'old',
      beforeState: null, afterState: { v: 1 },
      reason: 'r', sourceModule: 'p83-block5',
    });
    // Small async gap to force a later timestamp.
    await new Promise(r => setTimeout(r, 5));
    logAudit({
      entityCode: E, action: 'create', entityType: 'treasury_event',
      recordId: 't-new', recordLabel: 'new',
      beforeState: null, afterState: { v: 2 },
      reason: 'r', sourceModule: 'p83-block5',
    });
    const all = readAuditTrail(E);
    expect(all[0].record_id).toBe('t-new');
    expect(all[1].record_id).toBe('t-old');
  });

  it('empty entityCode bucketed under UNKNOWN — never silently dropped', () => {
    logAudit({
      entityCode: '', action: 'create', entityType: 'treasury_event',
      recordId: 'u-1', recordLabel: 'u',
      beforeState: null, afterState: { v: 1 },
      reason: 'r', sourceModule: 'p83-block5',
    });
    const all = readAuditTrail('UNKNOWN');
    expect(all).toHaveLength(1);
    expect(all[0].record_id).toBe('u-1');
  });

  it('catalog contains exactly 14 ADDITIVE_INLINE_AUDIT_TYPES (6 prior + 8 P83 W1)', () => {
    expect(ADDITIVE_INLINE_AUDIT_TYPES).toHaveLength(14);
  });

  it('all 8 P83 W1 literals are present in the catalog', () => {
    for (const lit of P83_LITERALS) {
      expect(ADDITIVE_INLINE_AUDIT_TYPES).toContain(lit);
    }
  });

  it('before/after state shapes survive JSON round-trip via localStorage', () => {
    const before = { a: 1, nested: { b: [1, 2, 3] } };
    const after = { a: 2, nested: { b: [4, 5, 6] } };
    logAudit({
      entityCode: E, action: 'update', entityType: 'eximx_event',
      recordId: 'r-diff', recordLabel: 'diff',
      beforeState: before, afterState: after,
      reason: 'shape_check', sourceModule: 'p83-block5',
    });
    const e = readAuditTrail(E)[0];
    expect(e.before_state).toEqual(before);
    expect(e.after_state).toEqual(after);
  });

  it('reason is preserved verbatim (≥ 1 char) and not null-defaulted', () => {
    logAudit({
      entityCode: E, action: 'create', entityType: 'treasury_event',
      recordId: 'r-rs', recordLabel: 'rs',
      beforeState: null, afterState: { v: 1 },
      reason: 'detailed_reason_for_audit',
      sourceModule: 'p83-block5',
    });
    expect(readAuditTrail(E)[0].reason).toBe('detailed_reason_for_audit');
  });
});
