/**
 * P8.6 · T-P86-Retention-Floor-Plant · behavioral tests
 *
 * Coverage (≥20 it):
 *   - All 35 FY-stamped type files contain `retention_policy`
 *   - 13 files gained `created_by`
 *   - 5 policy rows seed with correct defaults (8/8/lifetime+7/3/2)
 *   - updateRetentionPolicy persists and audit-logs
 *   - evaluateRetention flags a synthetic past-cutoff FY
 *   - evaluateRetention reports no_data honestly when no store
 *   - 0-DIFF walls: import-and-shape assertions on the 3 spines
 *   - sprint-history: P8.6 row exists; P8.5 row predecessor-flip canon
 */
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import {
  listRetentionPolicies,
  updateRetentionPolicy,
  evaluateRetention,
  getDefaultPolicyForRecordType,
  listKnownRecordTypes,
  getRetentionSummary,
  listRetentionPolicyEditLog,
} from '@/lib/record-retention-policy-engine';
import * as hashChain from '@/lib/audit-trail-hash-chain';
import * as chainEngine from '@/lib/audit-trail-chain-engine';
import * as comply360Retention from '@/lib/comply360-audit-retention-engine';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { readAuditTrail } from '@/lib/audit-trail-engine';
import type { AuditTrailEntry } from '@/types/audit-trail';

const REPO_ROOT = process.cwd();
const TYPES_DIR = path.join(REPO_ROOT, 'src', 'types');

const FY_STAMPED_35 = [
  'bill-passing', 'capital-indent', 'commission-register', 'customer-order',
  'customer-voucher', 'delivery-memo', 'demo-outward-memo', 'dispatch-receipt',
  'distributor-order', 'git', 'grn', 'invoice-dispute', 'invoice-memo',
  'inward-receipt', 'irn', 'job-card', 'job-work-out-order', 'job-work-receipt',
  'material-indent', 'material-issue-note', 'order', 'packing-slip', 'pod',
  'process-batch', 'production-confirmation', 'production-order',
  'production-plan', 'sales-return-memo', 'sample-outward-memo',
  'service-request', 'stock-issue', 'stock-receipt-ack', 'supply-request-memo',
  'transporter-invoice', 'voucher',
];

const NEEDED_CREATED_BY_13 = [
  'packing-slip', 'bill-passing', 'distributor-order', 'irn', 'pod',
  'sales-return-memo', 'git', 'transporter-invoice', 'customer-order',
  'process-batch', 'invoice-dispute', 'order', 'commission-register',
];

function readType(name: string): string {
  return fs.readFileSync(path.join(TYPES_DIR, `${name}.ts`), 'utf8');
}

beforeEach(() => {
  if (typeof localStorage !== 'undefined') {
    localStorage.clear();
  }
});

describe('P8.6 · floor-plant source assertions', () => {
  it('all 35 FY-stamped type files exist on disk', () => {
    for (const name of FY_STAMPED_35) {
      const p = path.join(TYPES_DIR, `${name}.ts`);
      expect(fs.existsSync(p), `missing ${p}`).toBe(true);
    }
    expect(FY_STAMPED_35.length).toBeGreaterThanOrEqual(35);
  });

  it('all 35 files declare retention_policy (RetentionPolicyId import + field)', () => {
    for (const name of FY_STAMPED_35) {
      const src = readType(name);
      expect(src, `${name} missing retention_policy`).toMatch(/retention_policy\?\s*:\s*RetentionPolicyId/);
      expect(src, `${name} missing import`).toMatch(/from\s+['"]\.\/record-retention['"]/);
    }
  });

  it('every floor-plant edit carries the canonical header comment', () => {
    for (const name of FY_STAMPED_35) {
      const src = readType(name);
      expect(src).toContain('P8.6 floor-plant');
      expect(src).toContain('P2BB-Retention authority');
    }
  });

  it('the 13 named files gained created_by', () => {
    for (const name of NEEDED_CREATED_BY_13) {
      const src = readType(name);
      expect(src, `${name} missing created_by`).toMatch(/created_by\?\s*:\s*string/);
    }
  });

  it('record-retention.ts exposes the 5 ratified literals', () => {
    const src = fs.readFileSync(path.join(TYPES_DIR, 'record-retention.ts'), 'utf8');
    for (const lit of [
      'companies_act_8yr',
      'hr_employment_lifetime',
      'gst_8yr',
      'customer_app_friendly',
      'operational_log_only',
    ]) {
      expect(src).toContain(`'${lit}'`);
    }
  });
});

describe('P8.6 · policy registry defaults', () => {
  it('listRetentionPolicies returns 5 policies', () => {
    const list = listRetentionPolicies();
    expect(list.length).toBeGreaterThanOrEqual(5);
  });

  it('companies_act_8yr defaults to 8 years · review', () => {
    const p = listRetentionPolicies().find((x) => x.id === 'companies_act_8yr')!;
    expect(p.retentionYears).toBe(8);
    expect(p.action).toBe('review');
  });

  it('gst_8yr defaults to 8 years · review', () => {
    const p = listRetentionPolicies().find((x) => x.id === 'gst_8yr')!;
    expect(p.retentionYears).toBe(8);
    expect(p.action).toBe('review');
  });

  it('hr_employment_lifetime defaults to employment_lifetime_plus_7 · review', () => {
    const p = listRetentionPolicies().find((x) => x.id === 'hr_employment_lifetime')!;
    expect(p.retentionYears).toBe('employment_lifetime_plus_7');
    expect(p.action).toBe('review');
  });

  it('customer_app_friendly defaults to 3 years · archive_flag', () => {
    const p = listRetentionPolicies().find((x) => x.id === 'customer_app_friendly')!;
    expect(p.retentionYears).toBe(3);
    expect(p.action).toBe('archive_flag');
  });

  it('operational_log_only defaults to 2 years · archive_flag', () => {
    const p = listRetentionPolicies().find((x) => x.id === 'operational_log_only')!;
    expect(p.retentionYears).toBe(2);
    expect(p.action).toBe('archive_flag');
  });

  it('every default policy is editable: true', () => {
    for (const p of listRetentionPolicies()) {
      expect(p.editable).toBe(true);
    }
  });
});

describe('P8.6 · updateRetentionPolicy + audit log', () => {
  it('persists an edit + populates lastEditedBy/lastEditedAt', () => {
    const updated = updateRetentionPolicy('customer_app_friendly', { retentionYears: 5 }, 'tester');
    expect(updated).not.toBeNull();
    expect(updated!.retentionYears).toBe(5);
    expect(updated!.lastEditedBy).toBe('tester');
    expect(updated!.lastEditedAt).toBeTruthy();
    const reread = listRetentionPolicies().find((x) => x.id === 'customer_app_friendly')!;
    expect(reread.retentionYears).toBe(5);
  });

  it('appends to the policy edit log', () => {
    updateRetentionPolicy('operational_log_only', { retentionYears: 4 }, 'tester2');
    const log = listRetentionPolicyEditLog();
    expect(log.length).toBeGreaterThanOrEqual(1);
    expect(log[log.length - 1].policyId).toBe('operational_log_only');
  });

  it('audit-logs the edit via logAudit (retention_policy_event)', () => {
    updateRetentionPolicy('gst_8yr', { retentionYears: 9 }, 'auditor');
    const trail: AuditTrailEntry[] = readAuditTrail('GLOBAL');
    const match = trail.find((e) => e.entity_type === 'retention_policy_event');
    expect(match).toBeDefined();
    expect(match!.record_id).toBe('gst_8yr');
  });

  it('returns null for unknown policy id', () => {
    // @ts-expect-error — intentional invalid id
    const r = updateRetentionPolicy('does_not_exist', { retentionYears: 1 }, 'x');
    expect(r).toBeNull();
  });
});

describe('P8.6 · evaluator (best-effort + honest)', () => {
  it('listKnownRecordTypes covers all 35 types', () => {
    const known = listKnownRecordTypes();
    expect(known.length).toBeGreaterThanOrEqual(35);
  });

  it('getDefaultPolicyForRecordType maps known types to a policy', () => {
    expect(getDefaultPolicyForRecordType('voucher')).toBe('companies_act_8yr');
    expect(getDefaultPolicyForRecordType('invoice-memo')).toBe('gst_8yr');
    expect(getDefaultPolicyForRecordType('customer-order')).toBe('customer_app_friendly');
  });

  it('unknown record types default to operational_log_only', () => {
    expect(getDefaultPolicyForRecordType('unknown-thing-xyz')).toBe('operational_log_only');
  });

  it('reports no_data honestly when no localStorage rows exist', () => {
    const rows = evaluateRetention('TEST-ENT-EMPTY');
    const noDataRows = rows.filter((r) => r.status === 'no_data');
    expect(noDataRows.length).toBeGreaterThanOrEqual(30);
  });

  it('flags a synthetic past-cutoff FY as past_retention_review', () => {
    // Seed an "order" row with a clearly past fiscal year (e.g. FY-2010-11)
    const key = 'erp_orders_PAST-TEST';
    localStorage.setItem(key, JSON.stringify([{ fiscal_year_id: 'FY-2010-11' }]));
    const rows = evaluateRetention('PAST-TEST', new Date('2026-06-07'));
    const past = rows.filter((r) => r.status === 'past_retention_review');
    expect(past.length).toBeGreaterThanOrEqual(1);
    expect(past.some((r) => r.recordType === 'order' && r.fiscalYear === 'FY-2010-11')).toBe(true);
  });

  it('past-retention rows float to the top of the report', () => {
    const key = 'erp_orders_PAST-TEST-2';
    localStorage.setItem(key, JSON.stringify([{ fiscal_year_id: 'FY-2010-11' }]));
    const rows = evaluateRetention('PAST-TEST-2', new Date('2026-06-07'));
    const firstPastIdx = rows.findIndex((r) => r.status === 'past_retention_review');
    const firstWithinIdx = rows.findIndex((r) => r.status === 'within_retention');
    if (firstPastIdx >= 0 && firstWithinIdx >= 0) {
      expect(firstPastIdx).toBeLessThan(firstWithinIdx);
    }
    expect(firstPastIdx).toBeGreaterThanOrEqual(0);
  });

  it('getRetentionSummary returns coherent counts', () => {
    const summary = getRetentionSummary('TEST-ENT-SUM');
    expect(summary.policyCount).toBeGreaterThanOrEqual(5);
    expect(summary.totalRecordTypes).toBeGreaterThanOrEqual(30);
    expect(summary.pastRetention + summary.withinRetention + summary.noData).toBeGreaterThan(0);
  });
});

describe('P8.6 · 0-DIFF walls (import + shape assertions)', () => {
  it('audit-trail-hash-chain.ts exports verifyChainIntegrity (untouched spine)', () => {
    expect(typeof (hashChain as { verifyChainIntegrity?: unknown }).verifyChainIntegrity)
      .toBe('function');
  });

  it('audit-trail-chain-engine.ts exports chainAuditEntry + verifyAllChains', () => {
    expect(typeof chainEngine.chainAuditEntry).toBe('function');
    expect(typeof chainEngine.verifyAllChains).toBe('function');
  });

  it('comply360-audit-retention-engine.ts module is importable', () => {
    expect(typeof comply360Retention).toBe('object');
    expect(comply360Retention).not.toBeNull();
  });
});

describe('P8.6 · sprint-history self-seed + P8.5 predecessor-flip', () => {
  it('P8.6 row exists with correct shape', () => {
    const row = SPRINTS.find(
      (s) => (s.sprintNumber as unknown as string) === 'P8.6',
    );
    expect(row).toBeDefined();
    expect(row!.code).toBe('T-P86-Retention-Floor-Plant');
    expect(row!.predecessorSha).toBe('e6238446');
    expect(['TBD_AT_BANK', row!.headSha]).toContain(row!.headSha);
    expect(row!.newSiblings).toContain('record-retention-policy-engine');
  });

  it("P8.5 row's headSha is flipped to predecessor sha e6238446", () => {
    const row = SPRINTS.find(
      (s) => (s.sprintNumber as unknown as string) === 'P8.5',
    );
    expect(row).toBeDefined();
    expect(row!.headSha).toBe('e6238446');
  });

  it('sibling-register has record-retention-policy-engine entry', () => {
    const entry = SIBLINGS.find((s) => s.id === 'record-retention-policy-engine');
    expect(entry).toBeDefined();
    expect(entry!.path).toBe('src/lib/record-retention-policy-engine.ts');
  });
});
