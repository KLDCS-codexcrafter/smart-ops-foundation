/**
 * @file        src/test/sprint-74b/comply360-sprint-74b.test.ts
 * @purpose     Sprint 74b institutional snapshot + Pass B engine + surface reachability.
 *              Comply360 Main Arc 1.6 · Pass B (Q20 · Form 16/16A + TDS Notice).
 * @sprint      Sprint 74b · T-Phase-5.A.1.6-PASS-B · Block 8
 * @disciplines FR-58 · FR-100 RECG · FR-43 · Lesson 24 (id-lookup + bounds-check)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS, getCurrentAStreak } from '@/lib/_institutional/sprint-history';
import { loadObligations } from '@/lib/comply360-statutory-memory';
import {
  buildForm16,
  buildForm16A,
  bulkGenerateForm16,
  bulkGenerateForm16A,
  getCertificateContext,
  READS_FROM as FORM16_READS,
} from '@/lib/comply360-form16-engine';
import {
  recordNotice,
  loadNotices,
  trackResolution,
  computeNoticeResponse,
  summarizeNotices,
} from '@/lib/comply360-tds-notice-engine';

const SPRINT_74B_CODE = 'T-Phase-5.A.1.6-PASS-B';
const ENTITY = 'TEST_S74B';
const FY = 'FY25-26';

describe('Sprint 74b · institutional snapshot', () => {
  it('Sprint 74b banked with 2 new SIBLINGs', () => {
    const s = SPRINTS.find((sp) => sp.sprintNumber === 74 && sp.code === SPRINT_74B_CODE);
    expect(s).toBeDefined();
    expect(s?.newSiblings).toEqual(['comply360-form16-engine', 'comply360-tds-notice-engine']);
  });

  it('both new SIBLINGs exist in register', () => {
    const ids = SIBLINGS.map((x) => x.id);
    expect(ids).toContain('comply360-form16-engine');
    expect(ids).toContain('comply360-tds-notice-engine');
  });

  it('A-streak ≥ 24 (NEW record)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(24);
  });

  it('3 new statutory obligations seeded (form16 + form16a + notice tracker)', () => {
    const obs = loadObligations();
    const ids = obs.map((o) => o.id);
    expect(ids).toContain('form16-fy25');
    expect(ids).toContain('form16a-q4');
    expect(ids).toContain('tds-notice-tracker');
  });
});

describe('Form 16 engine · §192 salary certificates', () => {
  it('READS_FROM declares S72 tds-aggregator (0-DIFF boundary)', () => {
    expect(FORM16_READS.tdsAggregatorEngine).toBe('src/lib/comply360-tds-aggregator-engine.ts');
  });

  it('buildForm16 produces an empty-shape certificate when no deductions', () => {
    const cert = buildForm16('P-X', 'Demo Employee', { entity_code: ENTITY, fy: FY });
    expect(cert.certificate_type).toBe('FORM_16');
    expect(cert.certificate_no).toBe(`F16-${FY}-P-X`);
    expect(cert.total_tds).toBe(0);
    expect(cert.part_a).toEqual([]);
    expect(cert.part_b.standard_deduction).toBe(50000);
  });

  it('buildForm16A returns Q-scoped certificate', () => {
    const cert = buildForm16A('V-1', 'Acme Pvt Ltd', 'Q4', { entity_code: ENTITY, fy: FY });
    expect(cert.certificate_type).toBe('FORM_16A');
    expect(cert.quarter).toBe('Q4');
    expect(cert.certificate_no).toBe(`F16A-${FY}-Q4-V-1`);
    expect(cert.section_rows).toEqual([]);
  });

  it('bulk generators return arrays (deterministic on empty stream)', () => {
    expect(bulkGenerateForm16({ entity_code: ENTITY, fy: FY })).toEqual([]);
    expect(bulkGenerateForm16A({ entity_code: ENTITY, fy: FY }, 'Q4')).toEqual([]);
  });

  it('getCertificateContext re-exports aggregator probe', () => {
    const ctx = getCertificateContext({ entity_code: ENTITY, fy: FY });
    expect(Array.isArray(ctx.sections)).toBe(true);
    expect(typeof ctx.probe).toBe('function');
  });
});

describe('TDS notice engine · lifecycle', () => {
  beforeEach(() => {
    localStorage.removeItem(`comply360.tdsnotice.${ENTITY}`);
  });

  it('recordNotice persists and computes demand', () => {
    const today = new Date().toISOString().slice(0, 10);
    const due = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const n = recordNotice({
      id: 'n-1', entity_code: ENTITY, fy: FY, notice_type: 'short_deduction',
      notice_no: 'TDS/01', notice_date: today, tds_amount: 1000, interest_amount: 100,
      late_fee_amount: 50, demand_amount: 0, due_date: due, status: 'open', paid_amount: 0,
    });
    expect(n.demand_amount).toBe(1150);
    expect(loadNotices(ENTITY)).toHaveLength(1);
  });

  it('computeNoticeResponse recommends pay_full when open and within due', () => {
    const due = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    const n = recordNotice({
      id: 'n-2', entity_code: ENTITY, fy: FY, notice_type: 'late_fee_234e',
      notice_no: 'TDS/02', notice_date: today, tds_amount: 0, interest_amount: 0,
      late_fee_amount: 5000, demand_amount: 5000, due_date: due, status: 'open', paid_amount: 0,
    });
    const r = computeNoticeResponse(n);
    expect(r.outstanding).toBe(5000);
    expect(r.recommended_action).toBe('pay_full');
  });

  it('trackResolution closes a notice and updates paid_amount', () => {
    const due = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    recordNotice({
      id: 'n-3', entity_code: ENTITY, fy: FY, notice_type: 'short_payment',
      notice_no: 'TDS/03', notice_date: today, tds_amount: 2000, interest_amount: 0,
      late_fee_amount: 0, demand_amount: 2000, due_date: due, status: 'open', paid_amount: 0,
    });
    const updated = trackResolution(ENTITY, 'n-3', 'paid', { paid_amount: 2000, resolution_ref: 'CH-9' });
    expect(updated?.status).toBe('paid');
    expect(updated?.paid_amount).toBe(2000);
    expect(updated?.resolution_ref).toBe('CH-9');
  });

  it('summarizeNotices aggregates outstanding + overdue', () => {
    const past = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    recordNotice({
      id: 'n-4', entity_code: ENTITY, fy: FY, notice_type: 'default_notice',
      notice_no: 'TDS/04', notice_date: today, tds_amount: 1000, interest_amount: 0,
      late_fee_amount: 0, demand_amount: 1000, due_date: past, status: 'open', paid_amount: 0,
    });
    const s = summarizeNotices(ENTITY);
    expect(s.total).toBeGreaterThanOrEqual(1);
    expect(s.outstanding_demand).toBeGreaterThanOrEqual(1000);
    expect(s.overdue).toBeGreaterThanOrEqual(1);
  });

  it('mismatch_26as routes to file_response', () => {
    const due = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    const n = recordNotice({
      id: 'n-5', entity_code: ENTITY, fy: FY, notice_type: 'mismatch_26as',
      notice_no: 'TDS/05', notice_date: today, tds_amount: 500, interest_amount: 0,
      late_fee_amount: 0, demand_amount: 500, due_date: due, status: 'open', paid_amount: 0,
    });
    expect(computeNoticeResponse(n).recommended_action).toBe('file_response');
  });
});

describe('Surface reachability (FR-100 RECG)', () => {
  const root = path.resolve(__dirname, '../../..');
  const surfaces = [
    'src/pages/erp/comply360/tds/Form16Page.tsx',
    'src/pages/erp/comply360/tds/Form16APage.tsx',
    'src/pages/erp/comply360/tds/TdsNoticePage.tsx',
  ];
  for (const rel of surfaces) {
    it(`exists: ${rel}`, () => {
      expect(fs.existsSync(path.join(root, rel))).toBe(true);
    });
  }

  it('TdsPage wires all 7 sub-tabs', () => {
    const src = fs.readFileSync(path.join(root, 'src/pages/erp/comply360/tds/TdsPage.tsx'), 'utf8');
    expect(src).toContain('Form16Page');
    expect(src).toContain('Form16APage');
    expect(src).toContain('TdsNoticePage');
    const triggerCount = (src.match(/<TabsTrigger /g) ?? []).length;
    expect(triggerCount).toBe(7);
  });
});

describe('§H frozen-boundary 0-DIFF (Lesson 28)', () => {
  const root = path.resolve(__dirname, '../../..');
  it('S72 comply360-tds-aggregator-engine.ts present (Form 16 reads · 0-DIFF)', () => {
    expect(fs.existsSync(path.join(root, 'src/lib/comply360-tds-aggregator-engine.ts'))).toBe(true);
  });
  it('S74a caro-2020-engine.ts present (untouched in Pass B)', () => {
    expect(fs.existsSync(path.join(root, 'src/lib/caro-2020-engine.ts'))).toBe(true);
  });
});
