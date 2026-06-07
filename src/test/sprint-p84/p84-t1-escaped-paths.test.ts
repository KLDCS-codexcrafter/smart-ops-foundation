/**
 * Sprint P8.4.T1 · ESCAPED-PATH WIRING TESTS (+4 it())
 *
 * Asserts that the three previously-escaped leverage points now emit through the
 * universal logAudit/readAuditTrail spine, and that the Block-4 meta enumerator's
 * recursive FS walk reaches nested /reports/ pages (depth proof).
 *
 *   1. vendor-return-engine.postDebitNote → dispatch_txn_event
 *   2. scheduling-engine.rescheduleProductionOrder → production_event
 *      (true leverage point for useProductionOrders/useProductionPlans callers —
 *       the hooks themselves are read-only; reschedule lives in scheduling-engine
 *       and covers SchedulingBoard + any other caller in one place.)
 *   3. servicedesk-oem-engine.createOEMClaim → service_event (13th P8.4 literal)
 *   4. Block-4 enumerator depth proof — walk reaches pages/erp/<tree>/reports/*
 *
 * Wall: zero mutation of production sources; tests only consume instrumented
 * engines + universal logAudit/readAuditTrail + FS walk.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { readAuditTrail } from '../../lib/audit-trail-engine';
import { postDebitNote } from '../../lib/vendor-return-engine';
import { rescheduleProductionOrder } from '../../lib/scheduling-engine';
import { createOEMClaim } from '../../lib/servicedesk-oem-engine';
import type { VendorReturn } from '../../types/vendor-return';
import { vendorReturnsKey } from '../../types/vendor-return';
import type { ProductionOrder } from '../../types/production-order';

const E = 'P84-T1';

beforeEach(() => { localStorage.clear(); });

// ─────────────────────────────────────────────────────────────────────────────
// (1) vendor-return-engine.postDebitNote · dispatch_txn_event
// ─────────────────────────────────────────────────────────────────────────────
describe('P8.4.T1 · vendor-return-engine.postDebitNote emits dispatch_txn_event', () => {
  it('logs a dispatch_txn_event for debit-note post on vendor return', async () => {
    const rtv: VendorReturn = {
      id: 'rtv-t1-001',
      return_no: 'RTV/T1/000001',
      entity_id: E,
      vendor_id: 'vnd-1',
      vendor_name: 'Acme Pvt Ltd',
      vendor_gstin: '27ABCDE1234F1Z5',
      branch_id: null,
      return_date: '2026-06-07',
      reason: 'quality_reject',
      reason_notes: '',
      narration: '',
      lines: [],
      total_qty: 0,
      total_value: 12345,
      status: 'draft',
      debit_note_id: null,
      debit_note_no: null,
      source_inward_id: null,
      source_inward_no: null,
      created_at: new Date().toISOString(),
      created_by: 'tester',
      updated_at: new Date().toISOString(),
      updated_by: 'tester',
    } as unknown as VendorReturn;
    localStorage.setItem(vendorReturnsKey(E), JSON.stringify([rtv]));

    const result = await postDebitNote(rtv.id, E, 'tester');
    expect(result.ok).toBe(true);

    const trail = readAuditTrail(E).filter(e => e.entity_type === 'dispatch_txn_event');
    expect(trail.length).toBeGreaterThanOrEqual(1);
    const entry = trail.find(e => e.record_id === rtv.id);
    expect(entry).toBeDefined();
    expect(entry!.action).toBe('post');
    expect(entry!.record_label).toContain('debit note posted');
    expect(entry!.source_module).toBe('logistic');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (2) scheduling-engine.rescheduleProductionOrder · production_event
// ─────────────────────────────────────────────────────────────────────────────
describe('P8.4.T1 · scheduling-engine.rescheduleProductionOrder emits production_event', () => {
  it('logs a production_event on PO reschedule (leverage point for SchedulingBoard)', () => {
    const po: ProductionOrder = {
      id: 'po-t1-001',
      doc_no: 'PO/T1/000001',
      entity_id: E,
      status: 'released',
      start_date: '2026-06-01',
      target_end_date: '2026-06-10',
      linked_production_plan_ids: [],
      status_history: [],
      machine_id: null,
      department_id: 'dept-1',
      updated_at: new Date().toISOString(),
      updated_by: 'tester',
    } as unknown as ProductionOrder;

    const result = rescheduleProductionOrder({
      po,
      new_start_date: '2026-06-05',
      new_target_end_date: '2026-06-15',
      user: { id: 'u1', name: 'Tester' },
      reason: 'p84-t1-fixture',
      parent_plans: [],
      pos: [po],
    });
    expect(result.success).toBe(true);

    const trail = readAuditTrail(E).filter(e => e.entity_type === 'production_event');
    expect(trail.length).toBeGreaterThanOrEqual(1);
    const entry = trail.find(e => e.record_id === po.id);
    expect(entry).toBeDefined();
    expect(entry!.action).toBe('update');
    expect(entry!.record_label).toContain('rescheduled');
    expect(entry!.source_module).toBe('production');
    expect(entry!.after_state).toMatchObject({
      start_date: '2026-06-05',
      target_end_date: '2026-06-15',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (3) servicedesk-oem-engine.createOEMClaim · service_event (13th P8.4 literal)
// ─────────────────────────────────────────────────────────────────────────────
describe('P8.4.T1 · servicedesk-oem-engine.createOEMClaim emits service_event', () => {
  it('logs a service_event on OEM claim create (new 13th P8.4 literal)', () => {
    const claim = createOEMClaim({
      entity_id: E,
      branch_id: 'br-1',
      ticket_id: 'tkt-1',
      oem_name: 'Hitachi',
      total_claim_value_paise: 100_000,
      created_by: 'tester',
      claim_lines: [],
    } as unknown as Parameters<typeof createOEMClaim>[0]);

    expect(claim.id).toBeTruthy();
    const trail = readAuditTrail(E).filter(e => e.entity_type === 'service_event');
    expect(trail.length).toBeGreaterThanOrEqual(1);
    const entry = trail.find(e => e.record_id === claim.id);
    expect(entry).toBeDefined();
    expect(entry!.action).toBe('create');
    expect(entry!.source_module).toBe('servicedesk');
    expect(entry!.record_label).toContain('oem claim created');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (4) Meta enumerator depth proof — walk reaches pages/erp/<tree>/reports/*.tsx
// ─────────────────────────────────────────────────────────────────────────────
describe('P8.4.T1 · meta enumerator depth proof (recursive FS walk)', () => {
  it('recursive walk reaches at least one nested /reports/ page across Wave-2 trees', () => {
    const PAGES_ROOT = resolve(__dirname, '../../pages/erp');
    function walk(dir: string, out: string[] = []): string[] {
      if (!existsSync(dir)) return out;
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        let s;
        try { s = statSync(p); } catch { continue; }
        if (s.isDirectory()) walk(p, out);
        else if (/\.tsx?$/.test(name) && !/\.(test|spec)\./.test(name)) out.push(p);
      }
      return out;
    }
    const TREES = [
      'inventory', 'dispatch', 'production', 'qualicheck', 'gateflow',
      'maintainpro', 'requestx', 'pay-hub', 'servicedesk', 'frontdesk',
      'webstorex', 'ecomx', 'store-hub', 'sitex', 'engineeringx',
      'logistic', 'projx', 'taskflow', 'docvault', 'customer-hub',
      'distributor-hub', 'vendor-portal', 'comply360',
    ];
    const allFiles: string[] = [];
    for (const t of TREES) walk(join(PAGES_ROOT, t), allFiles);

    // Depth proof: at least one nested /reports/ page is reached.
    const nestedReports = allFiles.filter(f =>
      /\/(reports|transactions|oem-claims|masters|inward)\//.test(f),
    );
    expect(nestedReports.length).toBeGreaterThan(0);

    // Specific anchor: production/reports/SchedulingBoard.tsx must be reached
    // (this is the page that calls the wired scheduling-engine reschedule path).
    const schedulingBoard = allFiles.find(f =>
      f.endsWith('/production/reports/SchedulingBoard.tsx'),
    );
    expect(
      schedulingBoard,
      'recursive walk must reach pages/erp/production/reports/SchedulingBoard.tsx',
    ).toBeDefined();

    // And the enumerator must reach into 2+ sub-folders below pages/erp/<tree>/.
    const deepFiles = allFiles.filter(f => {
      const tail = f.split('/pages/erp/')[1] ?? '';
      return tail.split('/').length >= 3; // tree / subfolder / file
    });
    expect(deepFiles.length).toBeGreaterThan(20);
  });
});
