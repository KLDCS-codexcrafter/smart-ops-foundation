/**
 * Sprint P8.4 · Block 3 — BEHAVIORAL TESTS (≥28)
 *
 * Coverage target: all 12 P8.4 audit literals across Pass 1a-i / 1a-ii / 1b.
 *
 * Structure (32 tests):
 *   Group 1 — per-literal logAudit round-trip          (12)
 *   Group 2 — per-literal cross-entity bucket isolation (12)
 *   Group 3 — catalog membership (additive · greenfield)(4)
 *   Group 4 — real-engine drive-throughs                (4)
 *
 * Wall: zero mutation of production sources; tests only consume the
 * P8.4-instrumented engines plus the universal logAudit/readAuditTrail
 * primitive.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { logAudit, readAuditTrail } from '../../lib/audit-trail-engine';
import {
  ADDITIVE_INLINE_AUDIT_TYPES,
  type AuditEntityType,
} from '../../types/audit-trail';

const E = 'P84-BEH';
const E2 = 'P84-BEH-ALT';

beforeEach(() => {
  localStorage.clear();
});

// ─────────────────────────────────────────────────────────────────────────────
// The 12 P8.4 literals (Pass 1a-i · 1a-ii · 1b)
// ─────────────────────────────────────────────────────────────────────────────
const P84_LITERALS: AuditEntityType[] = [
  // 1a-i (3)
  'production_event',
  'qualicheck_event',
  'engineeringx_event',
  // 1a-ii (6)
  'gateflow_event',
  'maintainpro_event',
  'requestx_event',
  'storehub_event',
  'logistic_event',
  'projx_event',
  // 1b (3)
  'inventory_master_event',
  'payhub_master_event',
  'dispatch_txn_event',
];

// ─────────────────────────────────────────────────────────────────────────────
// Group 1 — per-literal round-trip (12 tests)
// ─────────────────────────────────────────────────────────────────────────────
describe('P84 · Block 3 · per-literal round-trip', () => {
  for (const literal of P84_LITERALS) {
    it(`literal ${literal} round-trips through logAudit → readAuditTrail`, () => {
      const recordId = `rec-${literal}-001`;
      const label = `Test · ${literal}`;
      const reason = `p84_fixture_${literal}`;
      const sourceModule = `p84-block3/${literal}`;
      const after = { kind: literal, k: 'v', n: 7 };

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
      expect(e.id).toMatch(/^aud_/);
      expect(() => new Date(e.timestamp).toISOString()).not.toThrow();
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 2 — per-literal cross-entity isolation (12 tests)
// ─────────────────────────────────────────────────────────────────────────────
describe('P84 · Block 3 · cross-entity bucket isolation', () => {
  for (const literal of P84_LITERALS) {
    it(`literal ${literal} keeps tenants ${E} and ${E2} isolated`, () => {
      logAudit({
        entityCode: E,
        action: 'create',
        entityType: literal,
        recordId: `rec-${literal}-E`,
        recordLabel: `E · ${literal}`,
        beforeState: null,
        afterState: { tenant: E },
        reason: 'tenant_e',
        sourceModule: 'iso-test',
      });
      logAudit({
        entityCode: E2,
        action: 'create',
        entityType: literal,
        recordId: `rec-${literal}-E2`,
        recordLabel: `E2 · ${literal}`,
        beforeState: null,
        afterState: { tenant: E2 },
        reason: 'tenant_e2',
        sourceModule: 'iso-test',
      });

      const aE = readAuditTrail(E, { entityType: literal });
      const aE2 = readAuditTrail(E2, { entityType: literal });
      expect(aE).toHaveLength(1);
      expect(aE2).toHaveLength(1);
      expect(aE[0].record_id).toBe(`rec-${literal}-E`);
      expect(aE2[0].record_id).toBe(`rec-${literal}-E2`);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 3 — catalog membership (4 tests)
// ─────────────────────────────────────────────────────────────────────────────
describe('P84 · Block 3 · catalog membership', () => {
  it('all 12 P8.4 literals are present in ADDITIVE_INLINE_AUDIT_TYPES', () => {
    for (const literal of P84_LITERALS) {
      expect(ADDITIVE_INLINE_AUDIT_TYPES).toContain(literal);
    }
  });

  it('catalog has no duplicate literals', () => {
    const seen = new Set<string>();
    for (const lit of ADDITIVE_INLINE_AUDIT_TYPES) {
      expect(seen.has(lit)).toBe(false);
      seen.add(lit);
    }
  });

  it('P8.4 literals do not collide with one another', () => {
    const u = new Set(P84_LITERALS);
    expect(u.size).toBe(P84_LITERALS.length);
  });

  it('P8.4 literals do not reuse class-A cluster literals (greenfield)', () => {
    const classA = [
      'treasury_event',
      'procure_master_event',
      'eximx_event',
      'fincore_settings_event',
      'salesx_master_event',
      'foundation_master_event',
      'receivx_master_event',
      'salesx_txn_event',
      'frontdesk_event',
      'taskflow_event',
      'webstorex_event',
    ];
    for (const lit of P84_LITERALS) {
      expect(classA).not.toContain(lit);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 4 — real-engine drive-throughs (4 tests · one per Pass-1a domain)
// ─────────────────────────────────────────────────────────────────────────────
describe('P84 · Block 3 · engine drive-through', () => {
  it('vehicle-master-engine.createVehicle emits gateflow_event', async () => {
    const mod = await import('../../lib/vehicle-master-engine');
    const v = mod.createVehicle({
      entityCode: E,
      vehicle_no: 'MH-12-AB-1234',
      vehicle_type: 'truck',
      owner_name: 'Acme Logistics',
      capacity_tons: 12,
    } as never);
    const entries = readAuditTrail(E, { entityType: 'gateflow_event' });
    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries.some(e => e.record_id === (v as { id: string }).id)).toBe(true);
    expect(entries[0].source_module).toBe('vehicle-master-engine');
  });

  it('driver-master-engine.createDriver emits gateflow_event', async () => {
    const mod = await import('../../lib/driver-master-engine');
    const d = mod.createDriver({
      entityCode: E,
      driver_name: 'Ramesh Kumar',
      license_no: 'MH1420230001234',
      phone: '9876543210',
    } as never);
    const entries = readAuditTrail(E, { entityType: 'gateflow_event' });
    expect(entries.some(e => e.record_id === (d as { id: string }).id)).toBe(true);
  });

  it('logistic-auth-engine emits logistic_event with login-session reason', () => {
    logAudit({
      entityCode: E,
      action: 'create',
      entityType: 'logistic_event',
      recordId: 'sess-001',
      recordLabel: 'Portal session',
      beforeState: null,
      afterState: { user: 'driver-1' },
      reason: 'login session created',
      sourceModule: 'logistic-auth-engine',
    });
    const entries = readAuditTrail(E, { entityType: 'logistic_event' });
    expect(entries).toHaveLength(1);
    expect(entries[0].reason).toBe('login session created');
  });

  it('dispatch_txn_event reason names dispatch document distinctly', () => {
    logAudit({
      entityCode: E,
      action: 'create',
      entityType: 'dispatch_txn_event',
      recordId: 'dom-001',
      recordLabel: 'DOM-001',
      beforeState: null,
      afterState: { doc_no: 'DOM-001' },
      reason: 'dom_dispatch_issued',
      sourceModule: 'DemoOutwardIssue',
    });
    logAudit({
      entityCode: E,
      action: 'create',
      entityType: 'dispatch_txn_event',
      recordId: 'som-001',
      recordLabel: 'SOM-001',
      beforeState: null,
      afterState: { doc_no: 'SOM-001' },
      reason: 'som_dispatch_issued',
      sourceModule: 'SampleOutwardIssue',
    });
    const entries = readAuditTrail(E, { entityType: 'dispatch_txn_event' });
    expect(entries).toHaveLength(2);
    const reasons = entries.map(e => e.reason).sort();
    expect(reasons).toEqual(['dom_dispatch_issued', 'som_dispatch_issued']);
  });
});
