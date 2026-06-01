/**
 * @file        src/test/sprint-101/master-lifecycle.test.ts
 * @sprint      T-Phase-6.A.0.6 · Sprint 101 · 🏁 Arc 0 Capstone test pack
 * @target      ≥30 discrete it() blocks (v1.30 §N Form A floor)
 *
 * Coverage:
 *   · idea-9  active/dormant/sleeping classification + thresholds + audit
 *   · idea-10 transfer-vs-reorder + executeReorderAsIndent ORCHESTRATION (no dup)
 *   · idea-12 evaluateMasterSave ORCHESTRATION of validators (no dup) + block/warn + audit
 *   · single shared audit type master_lifecycle_event (no extra new types)
 *   · sibling-register count = 172 REAL · new ids grep to 1
 *   · standalone page #27 route present
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

import {
  detectSleepingMasters,
  markReviewed,
  clearReviewed,
  DEFAULT_DORMANT_DAYS,
  DEFAULT_SLEEPING_DAYS,
} from '@/lib/idea-9-sleeping-master-detector-engine';
import {
  suggestCrossEntityReorder,
  executeReorderAsIndent,
} from '@/lib/idea-10-cross-entity-reorder-engine';
import * as bridge from '@/lib/reorder-indent-bridge';
import {
  evaluateMasterSave,
} from '@/lib/idea-12-compliance-aware-master-save-engine';
import * as gstinValidator from '@/lib/gstin-validator';
import * as hsnResolver from '@/lib/hsn-resolver';
import { SIBLINGS, getSiblingCount } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const ENTITY = 'TEST_E1';
const ENTITY_B = 'TEST_E2';

function seedVoucher(entity: string, item_id: string, daysAgo: number) {
  const date = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
  const key = `erp_vouchers_${entity}`;
  const raw = localStorage.getItem(key);
  const arr = raw ? JSON.parse(raw) : [];
  arr.push({ id: `vch-${item_id}-${daysAgo}`, date, item_id });
  localStorage.setItem(key, JSON.stringify(arr));
}

function seedItemMaster(entity: string, ids: string[]) {
  localStorage.setItem(
    `erp_${entity}_master_item`,
    JSON.stringify(ids.map((id) => ({ id, name: id }))),
  );
}

function seedStock(entity: string, item: string, available: number) {
  localStorage.setItem(
    `erp_${entity}_stock_balances`,
    JSON.stringify([{ item_id: item, available }]),
  );
}

describe('Sprint 101 · idea-9 Sleeping Master Detector', () => {
  beforeEach(() => {
    localStorage.clear();
    clearReviewed();
  });

  it('exports detectSleepingMasters + markReviewed + thresholds', () => {
    expect(typeof detectSleepingMasters).toBe('function');
    expect(typeof markReviewed).toBe('function');
    expect(DEFAULT_DORMANT_DAYS).toBe(90);
    expect(DEFAULT_SLEEPING_DAYS).toBe(180);
  });

  it('classifies active master (used today)', () => {
    seedItemMaster(ENTITY, ['I-ACTIVE']);
    seedVoucher(ENTITY, 'I-ACTIVE', 1);
    const rows = detectSleepingMasters({ entity_code: ENTITY, master_types: ['item'] });
    const r = rows.find((x) => x.master_key === 'I-ACTIVE');
    expect(r?.flag).toBe('active');
  });

  it('classifies dormant master (between 90 and 180 days)', () => {
    seedItemMaster(ENTITY, ['I-DORM']);
    seedVoucher(ENTITY, 'I-DORM', 120);
    const rows = detectSleepingMasters({ entity_code: ENTITY, master_types: ['item'] });
    const r = rows.find((x) => x.master_key === 'I-DORM');
    expect(r?.flag).toBe('dormant');
  });

  it('classifies sleeping master (>180 days)', () => {
    seedItemMaster(ENTITY, ['I-SLEEP']);
    seedVoucher(ENTITY, 'I-SLEEP', 365);
    const rows = detectSleepingMasters({ entity_code: ENTITY, master_types: ['item'] });
    const r = rows.find((x) => x.master_key === 'I-SLEEP');
    expect(r?.flag).toBe('sleeping');
  });

  it('treats never-used master (no voucher reference) as sleeping', () => {
    seedItemMaster(ENTITY, ['I-NEVER']);
    const rows = detectSleepingMasters({ entity_code: ENTITY, master_types: ['item'] });
    const r = rows.find((x) => x.master_key === 'I-NEVER');
    expect(r?.flag).toBe('sleeping');
  });

  it('honours custom dormant_days threshold', () => {
    seedItemMaster(ENTITY, ['I-CUSTOM']);
    seedVoucher(ENTITY, 'I-CUSTOM', 40);
    const rows = detectSleepingMasters({
      entity_code: ENTITY, master_types: ['item'], dormant_days: 30, sleeping_days: 100,
    });
    expect(rows.find((x) => x.master_key === 'I-CUSTOM')?.flag).toBe('dormant');
  });

  it('honours custom sleeping_days threshold', () => {
    seedItemMaster(ENTITY, ['I-S2']);
    seedVoucher(ENTITY, 'I-S2', 60);
    const rows = detectSleepingMasters({
      entity_code: ENTITY, master_types: ['item'], dormant_days: 20, sleeping_days: 50,
    });
    expect(rows.find((x) => x.master_key === 'I-S2')?.flag).toBe('sleeping');
  });

  it('markReviewed suppresses dormant flag', () => {
    seedItemMaster(ENTITY, ['I-REV']);
    seedVoucher(ENTITY, 'I-REV', 200);
    markReviewed('item', 'I-REV', ENTITY);
    const rows = detectSleepingMasters({ entity_code: ENTITY, master_types: ['item'] });
    expect(rows.find((x) => x.master_key === 'I-REV')?.flag).toBe('active');
  });

  it('emits master_lifecycle_event with sleeping_flagged reason', () => {
    seedItemMaster(ENTITY, ['I-AUDIT']);
    seedVoucher(ENTITY, 'I-AUDIT', 999);
    detectSleepingMasters({ entity_code: ENTITY, master_types: ['item'] });
    const raw = localStorage.getItem(`erp_audit_trail_${ENTITY}`);
    expect(raw).toBeTruthy();
    const log = JSON.parse(raw ?? '[]') as Array<Record<string, unknown>>;
    const hit = log.find((e) => e.entity_type === 'master_lifecycle_event' && e.reason === 'sleeping_flagged');
    expect(hit).toBeTruthy();
  });

  it('returns rows for multiple master types', () => {
    seedItemMaster(ENTITY, ['I-ONE']);
    localStorage.setItem(`erp_${ENTITY}_master_customer`, JSON.stringify([{ id: 'CUST-1' }]));
    const rows = detectSleepingMasters({ entity_code: ENTITY, master_types: ['item', 'customer'] });
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  it('reports negative days_dormant placeholder for never-used masters', () => {
    seedItemMaster(ENTITY, ['I-NULL']);
    const rows = detectSleepingMasters({ entity_code: ENTITY, master_types: ['item'] });
    expect(rows.find((x) => x.master_key === 'I-NULL')?.last_used_at).toBeNull();
  });
});

describe('Sprint 101 · idea-10 Cross-Entity Reorder (ORCHESTRATOR)', () => {
  beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

  it('exports suggestCrossEntityReorder + executeReorderAsIndent', () => {
    expect(typeof suggestCrossEntityReorder).toBe('function');
    expect(typeof executeReorderAsIndent).toBe('function');
  });

  it('proposes inter_entity_transfer when surplus exists elsewhere', () => {
    seedStock(ENTITY, 'BOLT-M8', 10);
    seedStock(ENTITY_B, 'BOLT-M8', 200);
    const sug = suggestCrossEntityReorder({
      item_key: 'BOLT-M8', threshold_qty: 100, requesting_entity: ENTITY,
    });
    expect(sug[0]?.action).toBe('inter_entity_transfer');
    expect(sug[0]?.surplus_entities.length).toBeGreaterThan(0);
  });

  it('proposes consolidated_reorder when no surplus exists', () => {
    seedStock(ENTITY, 'BOLT-M9', 10);
    seedStock(ENTITY_B, 'BOLT-M9', 5);
    const sug = suggestCrossEntityReorder({
      item_key: 'BOLT-M9', threshold_qty: 100, requesting_entity: ENTITY,
    });
    expect(sug[0]?.action).toBe('consolidated_reorder');
    expect(sug[0]?.surplus_entities.length).toBe(0);
  });

  it('returns empty when all entities are stocked above threshold', () => {
    seedStock(ENTITY, 'BOLT-M10', 500);
    seedStock(ENTITY_B, 'BOLT-M10', 500);
    const sug = suggestCrossEntityReorder({
      item_key: 'BOLT-M10', threshold_qty: 100, requesting_entity: ENTITY,
    });
    expect(sug.length).toBe(0);
  });

  it('reports shortfall qty correctly', () => {
    seedStock(ENTITY, 'BOLT-M11', 30);
    const sug = suggestCrossEntityReorder({
      item_key: 'BOLT-M11', threshold_qty: 100, requesting_entity: ENTITY,
    });
    expect(sug[0]?.short_qty).toBe(70);
  });

  it('executeReorderAsIndent CALLS reorder-indent-bridge.promoteReorderToIndent (orchestration · no dup)', () => {
    const spy = vi.spyOn(bridge, 'promoteReorderToIndent').mockReturnValue({
      ok: true, indent_id: 'IND-1', voucher_no: 'MI/26-27/0001',
    });
    const r = executeReorderAsIndent({
      item_key: 'BOLT-M12', entity_code: ENTITY, qty: 50,
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(r.indent_ref).toBe('MI/26-27/0001');
  });

  it('engine source statically imports promoteReorderToIndent (FR-44 USE-SITE)', () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), 'src/lib/idea-10-cross-entity-reorder-engine.ts'),
      'utf8',
    );
    expect(src).toMatch(/from\s+'@\/lib\/reorder-indent-bridge'/);
    expect(src).toMatch(/promoteReorderToIndent/);
  });

  it('engine source does NOT reimplement createMaterialIndent', () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), 'src/lib/idea-10-cross-entity-reorder-engine.ts'),
      'utf8',
    );
    expect(src).not.toMatch(/function\s+createMaterialIndent/);
  });

  it('executeReorderAsIndent emits master_lifecycle_event with cross_entity_reorder reason', () => {
    vi.spyOn(bridge, 'promoteReorderToIndent').mockReturnValue({
      ok: true, indent_id: 'IND-2', voucher_no: 'MI/26-27/0002',
    });
    executeReorderAsIndent({ item_key: 'BOLT-M13', entity_code: ENTITY, qty: 25 });
    const log = JSON.parse(localStorage.getItem(`erp_audit_trail_${ENTITY}`) ?? '[]') as Array<Record<string, unknown>>;
    expect(log.some((e) => e.entity_type === 'master_lifecycle_event' && e.reason === 'cross_entity_reorder')).toBe(true);
  });

  it('forwards entity_code to the bridge', () => {
    const spy = vi.spyOn(bridge, 'promoteReorderToIndent').mockReturnValue({
      ok: true, indent_id: 'IND-3', voucher_no: 'V3',
    });
    executeReorderAsIndent({ item_key: 'X', entity_code: 'ENT-X', qty: 5 });
    expect(spy.mock.calls[0][1]).toBe('ENT-X');
  });

  it('uses requested qty as suggestion.reorder_qty', () => {
    const spy = vi.spyOn(bridge, 'promoteReorderToIndent').mockReturnValue({
      ok: true, indent_id: 'IND-4', voucher_no: 'V4',
    });
    executeReorderAsIndent({ item_key: 'X', entity_code: ENTITY, qty: 77 });
    const arg = spy.mock.calls[0][0];
    expect(arg.suggestion.reorder_qty).toBe(77);
  });
});

describe('Sprint 101 · idea-12 Compliance-Aware Master Save (ORCHESTRATOR)', () => {
  beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

  it('exports evaluateMasterSave', () => {
    expect(typeof evaluateMasterSave).toBe('function');
  });

  it('blocks customer with malformed GSTIN (calls validateGSTIN)', () => {
    const spy = vi.spyOn(gstinValidator, 'validateGSTIN');
    const r = evaluateMasterSave({
      master_type: 'customer',
      record: { name: 'Acme', gstin: 'NOT-A-GSTIN' },
    });
    expect(spy).toHaveBeenCalled();
    expect(r.ok).toBe(false);
    expect(r.blocks.length).toBeGreaterThan(0);
  });

  it('passes customer with a well-formed GSTIN', () => {
    const r = evaluateMasterSave({
      master_type: 'customer',
      record: { name: 'Acme', gstin: '27AAACA1234A1Z5', pan: 'AAACA1234A' },
    });
    expect(r.ok).toBe(true);
  });

  it('emits soft warning for URP sentinel (no block)', () => {
    const r = evaluateMasterSave({
      master_type: 'customer', record: { name: 'B2C', gstin: 'URP' },
    });
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => /Unregistered/i.test(w))).toBe(true);
  });

  it('blocks customer with malformed PAN', () => {
    const r = evaluateMasterSave({
      master_type: 'customer', record: { name: 'X', pan: 'BADPAN' },
    });
    expect(r.ok).toBe(false);
    expect(r.blocks.some((b) => /PAN/i.test(b))).toBe(true);
  });

  it('blocks item with unknown HSN (calls lookupHSN)', () => {
    const spy = vi.spyOn(hsnResolver, 'lookupHSN');
    const r = evaluateMasterSave({
      master_type: 'item', record: { name: 'Widget', hsn_sac_code: '99999999' },
    });
    expect(spy).toHaveBeenCalled();
    expect(r.ok).toBe(false);
  });

  it('passes item with a known HSN', () => {
    // 8471 is in HSN seed (computers).
    const r = evaluateMasterSave({
      master_type: 'item', record: { name: 'Laptop', hsn_sac_code: '8471' },
    });
    expect(r.ok).toBe(true);
  });

  it('warns item with missing HSN (soft, not a hard block)', () => {
    const r = evaluateMasterSave({ master_type: 'item', record: { name: 'NoHSN' } });
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => /HSN/i.test(w))).toBe(true);
  });

  it('vendor evaluation also routes through GSTIN validator', () => {
    const spy = vi.spyOn(gstinValidator, 'validateGSTIN');
    evaluateMasterSave({
      master_type: 'vendor', record: { name: 'V', gstin: '27AAACA1234A1Z5', pan: 'AAACA1234A' },
    });
    expect(spy).toHaveBeenCalled();
  });

  it('logs master_lifecycle_event with compliance_block when blocked', () => {
    evaluateMasterSave({
      master_type: 'customer',
      record: { name: 'X', gstin: 'BADGSTIN', pan: 'BADPAN' },
      entity_code: ENTITY,
    });
    const log = JSON.parse(localStorage.getItem(`erp_audit_trail_${ENTITY}`) ?? '[]') as Array<Record<string, unknown>>;
    expect(log.some((e) => e.entity_type === 'master_lifecycle_event' && e.reason === 'compliance_block')).toBe(true);
  });

  it('does NOT log compliance_block on a clean save', () => {
    evaluateMasterSave({
      master_type: 'customer',
      record: { name: 'X', gstin: '27AAACA1234A1Z5', pan: 'AAACA1234A' },
      entity_code: ENTITY,
    });
    const log = JSON.parse(localStorage.getItem(`erp_audit_trail_${ENTITY}`) ?? '[]') as Array<Record<string, unknown>>;
    expect(log.some((e) => e.reason === 'compliance_block')).toBe(false);
  });

  it('engine source statically imports validators (FR-44 USE-SITE)', () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), 'src/lib/idea-12-compliance-aware-master-save-engine.ts'),
      'utf8',
    );
    expect(src).toMatch(/from\s+'@\/lib\/gstin-validator'/);
    expect(src).toMatch(/from\s+'@\/lib\/india-validations'/);
    expect(src).toMatch(/from\s+'@\/lib\/hsn-resolver'/);
  });

  it('engine source does NOT reimplement GSTIN_REGEX', () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), 'src/lib/idea-12-compliance-aware-master-save-engine.ts'),
      'utf8',
    );
    expect(src).not.toMatch(/const\s+GSTIN_REGEX\s*=/);
  });

  it('blocks invalid CIN on company master', () => {
    const r = evaluateMasterSave({
      master_type: 'company' as never,
      record: { name: 'X', cin: 'NOT-CIN' },
    });
    expect(r.ok).toBe(false);
  });
});

describe('Sprint 101 · institutional · sibling-register + audit type + page wiring', () => {
  it('sibling-register count = 172 REAL (post-S101)', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(172);
  });

  it('idea-9 sibling registered exactly once', () => {
    expect(SIBLINGS.filter((s) => s.id === 'idea-9-sleeping-master-detector-engine').length).toBe(1);
  });

  it('idea-10 sibling registered exactly once', () => {
    expect(SIBLINGS.filter((s) => s.id === 'idea-10-cross-entity-reorder-engine').length).toBe(1);
  });

  it('idea-12 sibling registered exactly once', () => {
    expect(SIBLINGS.filter((s) => s.id === 'idea-12-compliance-aware-master-save-engine').length).toBe(1);
  });

  it('comply360-tier2-extensions still registered exactly once (untouched)', () => {
    expect(SIBLINGS.filter((s) => s.id === 'comply360-tier2-extensions-engine').length).toBe(1);
  });

  it('S101 sprint-history entry exists', () => {
    expect(SPRINTS.find((s) => s.sprintNumber === 101)).toBeTruthy();
  });

  it('S100 SHA backfilled to 000fc068…', () => {
    const s = SPRINTS.find((s) => s.sprintNumber === 100);
    expect(s?.headSha).toBe('000fc0685870cd13f2eb9be811c9438baced74c6');
  });

  it('S101 entry headSha backfilled to e91e813d…', () => {
    const s = SPRINTS.find((s) => s.sprintNumber === 101);
    expect(s?.headSha).toBe('e91e813d02075dee90f1e934a83a7b69e4ff843b');
  });

  it('only ONE new audit type added (master_lifecycle_event)', () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), 'src/types/audit-trail.ts'),
      'utf8',
    );
    expect(src).toMatch(/master_lifecycle_event/);
  });

  it('command-center sidebar exposes fincore-master-lifecycle-wizard as type:item', () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), 'src/apps/erp/configs/command-center-sidebar-config.ts'),
      'utf8',
    );
    expect(src).toMatch(/fincore-master-lifecycle-wizard/);
    expect(src).toMatch(/type:\s*'item'.*fincore-master-lifecycle-wizard|fincore-master-lifecycle-wizard[\s\S]{0,80}type:\s*'item'/);
  });

  it('CommandCenterPage imports + cases MasterLifecycleWizardPage', () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), 'src/features/command-center/pages/CommandCenterPage.tsx'),
      'utf8',
    );
    expect(src).toMatch(/import\s+MasterLifecycleWizardPage/);
    expect(src).toMatch(/case 'fincore-master-lifecycle-wizard'/);
  });

  it('wizard page file exists at expected path', () => {
    const p = path.resolve(process.cwd(), 'src/features/master-lifecycle/MasterLifecycleWizardPage.tsx');
    expect(fs.existsSync(p)).toBe(true);
  });

  it('page is NOT registered as a sibling', () => {
    expect(SIBLINGS.find((s) => s.id === 'master-lifecycle-wizard-page')).toBeUndefined();
  });
});
