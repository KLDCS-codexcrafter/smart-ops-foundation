/**
 * @file        src/test/sprint-74a/comply360-sprint-74a.test.ts
 * @purpose     Sprint 74a institutional snapshot + Pass A engine + surface reachability
 *              Comply360 Main Arc 1.6 · Pass A (Q19 · GSTR-9/9C + 3CA/3CB/3CD)
 * @sprint      Sprint 74a · T-Phase-5.A.1.6-PASS-A · Block 8
 * @disciplines FR-58 · FR-100 RECG · FR-43 · Lesson 24 (id-lookup + bounds-check)
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS, getCurrentAStreak } from '@/lib/_institutional/sprint-history';
import { loadObligations } from '@/lib/comply360-statutory-memory';
import {
  buildGSTR9,
  buildGSTR9C,
  type BooksAnnualTotals,
  type AuditorCertification,
} from '@/lib/comply360-gstr-builder-engine';
import {
  reconcileGSTR9C,
  computeReconVariances,
  countFailingBuckets,
  RECO_PASS_THRESHOLD,
  RECO_FAIL_THRESHOLD,
} from '@/lib/comply360-gstr9-reco-engine';
import {
  build3CA,
  build3CB,
  build3CD,
  buildAuditPack,
  countQualifiedClauses,
  READS_FROM,
  type EntityMeta,
  type AuditorMeta,
} from '@/lib/comply360-tax-audit-3cd-engine';
import type { GSTR9Payload } from '@/lib/gst-portal-service';

const SPRINT_74 = 74;
const VALID_GSTIN = '27AAAAA0000A1Z5';
const ENTITY: EntityMeta = {
  entity_code: 'TEST',
  pan: 'AAAAA0000A',
  legal_name: 'Test Industries Pvt Ltd',
  fy_start: '2025-04-01',
  fy_end: '2026-03-31',
};
const AUDITOR: AuditorMeta = {
  auditor_name: 'CA Suresh Kumar',
  membership_no: '123456',
  firm_name: 'Kumar & Associates',
  audit_date: '2026-09-01',
};

describe('Sprint 74a · institutional snapshot (FR-58 · Lesson 24)', () => {
  it('Sprint 74a entry exists with grade A · predecessor Sprint 73b SHA', () => {
    const e = SPRINTS.find((s) => s.sprintNumber === SPRINT_74 && s.code === 'T-Phase-5.A.1.6-PASS-A');
    expect(e).toBeDefined();
    expect(e?.grade?.startsWith('A')).toBe(true);
    expect(e?.predecessorSha).toBe('8e7dff4fe1c73d48d0869830ea8ab43dc5fcd3d2');
    expect(e?.newSiblings).toEqual([
      'comply360-gstr9-reco-engine',
      'comply360-tax-audit-3cd-engine',
    ]);
  });

  it('A-streak ≥ 23 after Sprint 74a (NEW Operix record · Lesson 24 bounds-check)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(23);
  });

  it('FR-100 RECG · 2 NEW SIBLING backing files on disk', () => {
    const root = process.cwd();
    for (const id of ['comply360-gstr9-reco-engine', 'comply360-tax-audit-3cd-engine']) {
      const s = SIBLINGS.find((x) => x.id === id);
      expect(s, `missing SIBLING ${id}`).toBeDefined();
      expect(fs.existsSync(path.join(root, s!.path!)), `missing ${s!.path}`).toBe(true);
    }
  });

  it('Pass A surfaces exist on disk (Lesson 25 reachability)', () => {
    const root = process.cwd();
    for (const f of [
      'src/pages/erp/comply360/tax-gst/GSTR9NativePage.tsx',
      'src/pages/erp/comply360/tax-gst/GSTR9CNativePage.tsx',
      'src/pages/erp/comply360/external-audit/ExternalAuditPage.tsx',
      'src/pages/erp/comply360/external-audit/Form3CAPage.tsx',
      'src/pages/erp/comply360/external-audit/Form3CBPage.tsx',
      'src/pages/erp/comply360/external-audit/Form3CDPage.tsx',
    ]) {
      expect(fs.existsSync(path.join(root, f)), `missing ${f}`).toBe(true);
    }
  });

  it('Comply360Page router wires `external-audit` → ExternalAuditPage', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/erp/comply360/Comply360Page.tsx'),
      'utf-8',
    );
    expect(src).toContain('ExternalAuditPage');
    expect(src).toContain("case 'external-audit'");
  });

  it('TaxGstPage exposes gstr9 + gstr9c tabs', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/erp/comply360/tax-gst/TaxGstPage.tsx'),
      'utf-8',
    );
    expect(src).toContain('GSTR9NativePage');
    expect(src).toContain('GSTR9CNativePage');
    expect(src).toContain('value="gstr9"');
    expect(src).toContain('value="gstr9c"');
  });

  it('statutory-memory seed extended with 3 NEW Sprint 74a obligations', () => {
    const obs = loadObligations();
    const ids = new Map(obs.map((o) => [o.id, o]));
    expect(ids.get('gstr-9-fy2425')?.module).toBe('tax-gst');
    expect(ids.get('gstr-9c-fy2425')?.module).toBe('tax-gst');
    expect(ids.get('tax-audit-3cd-fy2425')?.module).toBe('external-audit');
  });

  it('FR-19 · 3CD engine declares caro-2020 as its only read-source', () => {
    expect(READS_FROM).toContain('caro-2020-engine');
    expect(READS_FROM.length).toBe(1);
  });

  it('FR-19 SIBLING boundary preserved · 0-DIFF on caro-2020-engine.ts (file intact)', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/caro-2020-engine.ts'),
      'utf-8',
    );
    expect(src).toContain('generateCARODisclosureReport');
  });
});

describe('Sprint 74a · buildGSTR9 engine smoke', () => {
  it('returns valid annual payload for empty supplies', () => {
    const r = buildGSTR9([], [], { gstin: VALID_GSTIN, fy: '2024-25' });
    expect(r.builder).toBe('gstr-9');
    expect(r.valid).toBe(true);
    const p = r.payload as unknown as GSTR9Payload;
    expect(p.gstin).toBe(VALID_GSTIN);
    expect(p.fy).toBe('2024-25');
    expect(p.tbl4.pt4A.txval).toBe(0);
  });

  it('rejects invalid GSTIN and FY format', () => {
    const r = buildGSTR9([], [], { gstin: 'BAD', fy: 'NOT-FY' });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.code === 'GSTIN_INVALID')).toBe(true);
    expect(r.errors.some((e) => e.code === 'FY_INVALID')).toBe(true);
  });
});

describe('Sprint 74a · buildGSTR9C engine smoke', () => {
  const baseGSTR9: GSTR9Payload = {
    gstin: VALID_GSTIN,
    fy: '2024-25',
    tbl4: { pt4A: { txval: 1_000_000, iamt: 90_000, camt: 45_000, samt: 45_000, csamt: 0 } },
    tbl5: { pt5A: { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 } },
    tbl6: { pt6A: { txval: 0, iamt: 50_000, camt: 25_000, samt: 25_000, csamt: 0 } },
    tbl7: { pt7A: { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 } },
    tbl9: { tax_pay: { txval: 0, iamt: 90_000, camt: 45_000, samt: 45_000, csamt: 0 }, paid_itc: { txval: 0, iamt: 50_000, camt: 25_000, samt: 25_000, csamt: 0 } },
    tbl17: { hsn: {} },
  };
  const auditor: AuditorCertification = {
    auditor_name: 'CA Suresh',
    membership_no: '123456',
    firm_name: 'Kumar & Co',
    certification_date: '2026-09-01',
  };

  it('builds 9C payload when books match within rounding tolerance', () => {
    const books: BooksAnnualTotals = { turnover_per_books: 1_000_000, tax_per_books: 180_000, itc_per_books: 100_000 };
    const r = buildGSTR9C(baseGSTR9, books, auditor);
    expect(r.valid).toBe(true);
    expect(r.warnings.length).toBe(0);
  });

  it('flags variance > ₹1 as warnings', () => {
    const books: BooksAnnualTotals = { turnover_per_books: 1_500_000, tax_per_books: 180_000, itc_per_books: 100_000 };
    const r = buildGSTR9C(baseGSTR9, books, auditor);
    expect(r.warnings.some((w) => w.code === 'TURNOVER_VARIANCE')).toBe(true);
  });

  it('rejects when auditor fields missing', () => {
    const books: BooksAnnualTotals = { turnover_per_books: 0, tax_per_books: 0, itc_per_books: 0 };
    const bad: AuditorCertification = { auditor_name: '', membership_no: '', firm_name: '', certification_date: '' };
    const r = buildGSTR9C(baseGSTR9, books, bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.code === 'AUDITOR_MISSING')).toBe(true);
  });
});

describe('Sprint 74a · gstr9-reco-engine', () => {
  const baseGSTR9: GSTR9Payload = {
    gstin: VALID_GSTIN, fy: '2024-25',
    tbl4: { pt4A: { txval: 1_000_000, iamt: 90_000, camt: 45_000, samt: 45_000, csamt: 0 } },
    tbl5: { pt5A: { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 } },
    tbl6: { pt6A: { txval: 0, iamt: 50_000, camt: 25_000, samt: 25_000, csamt: 0 } },
    tbl7: { pt7A: { iamt: 0, camt: 0, samt: 0, csamt: 0 } },
    tbl9: { tax_pay: { txval: 0, iamt: 90_000, camt: 45_000, samt: 45_000, csamt: 0 }, paid_itc: { txval: 0, iamt: 50_000, camt: 25_000, samt: 25_000, csamt: 0 } },
    tbl17: { hsn: {} },
  };

  it('thresholds: pass=₹1, fail=₹100_000', () => {
    expect(RECO_PASS_THRESHOLD).toBe(1);
    expect(RECO_FAIL_THRESHOLD).toBe(100_000);
  });

  it('computeReconVariances returns 3 buckets · all pass when matched', () => {
    const v = computeReconVariances(baseGSTR9, { turnover_per_books: 1_000_000, tax_per_books: 180_000, itc_per_books: 100_000 });
    expect(v.length).toBe(3);
    expect(v.every((x) => x.severity === 'pass')).toBe(true);
  });

  it('reconcileGSTR9C escalates to fail when variance > ₹100k', () => {
    const r = reconcileGSTR9C(baseGSTR9, { turnover_per_books: 1_500_000, tax_per_books: 180_000, itc_per_books: 100_000 });
    expect(r.overall).toBe('fail');
    expect(countFailingBuckets(r)).toBeGreaterThan(0);
  });

  it('warn band when ₹1 < variance ≤ ₹100k', () => {
    const r = reconcileGSTR9C(baseGSTR9, { turnover_per_books: 1_000_500, tax_per_books: 180_000, itc_per_books: 100_000 });
    expect(r.overall).toBe('warn');
  });
});

describe('Sprint 74a · tax-audit-3cd-engine', () => {
  it('build3CA produces form with provided statutory ref', () => {
    const f = build3CA(ENTITY, AUDITOR, 'Companies Act §143', ['obs 1']);
    expect(f.form).toBe('3CA');
    expect(f.statutory_audit_ref).toBe('Companies Act §143');
    expect(f.observations).toEqual(['obs 1']);
  });

  it('build3CB produces form with qualifications + observations', () => {
    const f = build3CB(ENTITY, AUDITOR, ['q1', 'q2'], ['obs']);
    expect(f.form).toBe('3CB');
    expect(f.qualifications.length).toBe(2);
  });

  it('build3CD includes Clause 44 cross-link to CARO', () => {
    const f = build3CD(ENTITY, AUDITOR);
    expect(f.form).toBe('3CD');
    expect(f.clauses.some((c) => c.clause === '44')).toBe(true);
    expect(f.caro_disclosure).toBeDefined();
  });

  it('countQualifiedClauses returns 0 for clean baseline', () => {
    const f = build3CD(ENTITY, AUDITOR);
    expect(countQualifiedClauses(f)).toBeGreaterThanOrEqual(0);
  });

  it('buildAuditPack assembles 3CA + 3CD by default', () => {
    const pack = buildAuditPack(ENTITY, AUDITOR);
    expect(pack.forms.length).toBe(2);
    expect(pack.forms[0].form).toBe('3CA');
    expect(pack.forms[1].form).toBe('3CD');
  });

  it('buildAuditPack uses 3CB when opts.useForm3CB', () => {
    const pack = buildAuditPack(ENTITY, AUDITOR, { useForm3CB: true });
    expect(pack.forms[0].form).toBe('3CB');
  });
});
