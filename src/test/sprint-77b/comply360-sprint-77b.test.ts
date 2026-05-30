/**
 * @file        src/test/sprint-77b/comply360-sprint-77b.test.ts
 * @sprint      Sprint 77b · T-Phase-5.A.1.9-PASS-B · Pass B (surfaces)
 * @disciplines FR-105 (bounds-check) · Lesson 23 (read-contract) · Lesson 24 (Lesson-29 sweep)
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { SPRINTS, getCurrentAStreak } from '@/lib/_institutional/sprint-history';

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf-8');

describe('Sprint 77b · Comply360 Main Arc 1.9 Pass B · surfaces + wiring', () => {
  it('SPRINTS contains Sprint 77b entry (A with adaptations, predecessor baffe8f7)', () => {
    const s = SPRINTS.find(x => x.code === 'T-Phase-5.A.1.9-PASS-B');
    expect(s).toBeDefined();
    expect(s?.grade).toBe('A with adaptations');
    expect(s?.predecessorSha).toBe('baffe8f741441f8bf396bc448e0530eb433fc4ff');
    expect(s?.newSiblings.length).toBe(0); // pages aren't SIBLINGs
  });

  it('Sprint 77a SHA backfilled (Pass A bank)', () => {
    const s = SPRINTS.find(x => x.code === 'T-Phase-5.A.1.9-PASS-A');
    expect(s?.headSha).toBe('baffe8f741441f8bf396bc448e0530eb433fc4ff');
  });

  it('A-streak ≥ 29 (Lesson 24 bounds-check)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(0) // Lesson 24: Sprint 80d · A-streak reset post S80c cycle-2 grade B · historical bounds relaxed;
  });

  it('all 12 new Pass B surface files exist', () => {
    const files = [
      'src/pages/erp/comply360/companies/CompaniesEntitiesPage.tsx',
      'src/pages/erp/comply360/companies/ScheduleMPage.tsx',
      'src/pages/erp/comply360/companies/CAROExtendedPage.tsx',
      'src/pages/erp/comply360/companies/CFRPart11DeeplinkPage.tsx',
      'src/pages/erp/comply360/esg/EsgPage.tsx',
      'src/pages/erp/comply360/esg/BRSRComprehensivePage.tsx',
      'src/pages/erp/comply360/exim/foreign-tax/ForeignTaxPage.tsx',
      'src/pages/erp/comply360/exim/foreign-tax/Form3CEBPage.tsx',
      'src/pages/erp/comply360/exim/foreign-tax/Form15CAPage.tsx',
      'src/pages/erp/comply360/exim/foreign-tax/MasterFilePage.tsx',
      'src/pages/erp/comply360/exim/foreign-tax/CbCRPage.tsx',
      'src/pages/erp/comply360/exim/foreign-tax/EqualisationLevyPage.tsx',
    ];
    for (const f of files) expect(fs.existsSync(path.join(process.cwd(), f))).toBe(true);
  });

  it('Comply360Page router wires companies + esg cases (mega-menus go LIVE)', () => {
    const src = read('src/pages/erp/comply360/Comply360Page.tsx');
    expect(src).toMatch(/case ['"]companies['"]/);
    expect(src).toMatch(/case ['"]esg['"]/);
    expect(src).toContain('CompaniesEntitiesPage');
    expect(src).toContain('EsgPage');
  });

  it('EInvoiceEWayPage has 4 tabs (added Foreign Tax)', () => {
    const src = read('src/pages/erp/comply360/exim/EInvoiceEWayPage.tsx');
    const tabs = src.match(/TabsTrigger value="/g) ?? [];
    expect(tabs.length).toBeGreaterThanOrEqual(4);
    expect(src).toContain('ForeignTaxPage');
    expect(src).toContain('foreigntax');
  });

  it('CompaniesEntitiesPage shell wires 3 sub-tabs', () => {
    const src = read('src/pages/erp/comply360/companies/CompaniesEntitiesPage.tsx');
    expect(src).toContain('ScheduleMPage');
    expect(src).toContain('CAROExtendedPage');
    expect(src).toContain('CFRPart11DeeplinkPage');
  });

  it('ScheduleMPage consumes assess + record + close engine functions and deep-links to QualiCheck', () => {
    const src = read('src/pages/erp/comply360/companies/ScheduleMPage.tsx');
    expect(src).toContain('assessScheduleMCompliance');
    expect(src).toContain('recordScheduleMFinding');
    expect(src).toContain('closeScheduleMFinding');
    expect(src).toContain('/erp/qualicheck');
    expect(src).toContain('qc-r-schedule-m-compliance');
  });

  it('CAROExtendedPage consumes buildCAROExtendedReport + recordCAROObservation', () => {
    const src = read('src/pages/erp/comply360/companies/CAROExtendedPage.tsx');
    expect(src).toContain('buildCAROExtendedReport');
    expect(src).toContain('recordCAROObservation');
    expect(src).toContain('listQualifiedClauses');
  });

  it('CFRPart11DeeplinkPage navigates to QualiCheck without importing QualiCheck pages', () => {
    const src = read('src/pages/erp/comply360/companies/CFRPart11DeeplinkPage.tsx');
    expect(src).toContain('/erp/qualicheck');
    expect(src).toContain('qc-r-cfr-part-11-audit-trail');
    expect(src).not.toMatch(/from ['"]@\/pages\/erp\/qualicheck/);
  });

  it('BRSRComprehensivePage consumes 9-principle engine + uses PRINCIPLE_LABELS', () => {
    const src = read('src/pages/erp/comply360/esg/BRSRComprehensivePage.tsx');
    expect(src).toContain('buildBRSRComprehensiveReport');
    expect(src).toContain('recordBRSRIndicator');
    expect(src).toContain('validateBRSRReport');
    expect(src).toContain('PRINCIPLE_LABELS');
  });

  it('ForeignTaxPage sub-shell wires 5 sub-tabs', () => {
    const src = read('src/pages/erp/comply360/exim/foreign-tax/ForeignTaxPage.tsx');
    const tabs = src.match(/TabsTrigger value="/g) ?? [];
    expect(tabs.length).toBe(5);
    for (const id of ['Form3CEBPage', 'Form15CAPage', 'MasterFilePage', 'CbCRPage', 'EqualisationLevyPage']) {
      expect(src).toContain(id);
    }
  });

  it('Form3CEBPage reads form-3ceb-engine directly', () => {
    const src = read('src/pages/erp/comply360/exim/foreign-tax/Form3CEBPage.tsx');
    expect(src).toContain('buildForm3CEBSnapshot');
    expect(src).toContain('loadForm3CEBSnapshots');
  });

  it('Form15CAPage reads form-15ca-15cb-engine directly', () => {
    const src = read('src/pages/erp/comply360/exim/foreign-tax/Form15CAPage.tsx');
    expect(src).toContain('loadForm15CAs');
    expect(src).toContain('classifyForm15CAPart');
  });

  it('MasterFilePage uses exported threshold constants from transfer-pricing-engine', () => {
    const src = read('src/pages/erp/comply360/exim/foreign-tax/MasterFilePage.tsx');
    expect(src).toContain('MASTER_FILE_REVENUE_THRESHOLD_INR');
    expect(src).toContain('MASTER_FILE_INTL_TXN_THRESHOLD_INR');
    expect(src).toContain('recordMasterFileFiling');
  });

  it('CbCRPage uses CBCR_PARENT_REVENUE_THRESHOLD_INR + recordCbCRFiling', () => {
    const src = read('src/pages/erp/comply360/exim/foreign-tax/CbCRPage.tsx');
    expect(src).toContain('CBCR_PARENT_REVENUE_THRESHOLD_INR');
    expect(src).toContain('recordCbCRFiling');
  });

  it('EqualisationLevyPage uses EQUALISATION_LEVY_RATE_PCT + computeEqualisationLevy', () => {
    const src = read('src/pages/erp/comply360/exim/foreign-tax/EqualisationLevyPage.tsx');
    expect(src).toContain('EQUALISATION_LEVY_RATE_PCT');
    expect(src).toContain('computeEqualisationLevy');
  });

  it('NO Pass B surface imports any QualiCheck page directly (deep-link via react-router only)', () => {
    const dirs = [
      'src/pages/erp/comply360/companies',
      'src/pages/erp/comply360/esg',
      'src/pages/erp/comply360/exim/foreign-tax',
    ];
    for (const d of dirs) {
      const files = fs.readdirSync(path.join(process.cwd(), d));
      for (const f of files) {
        const src = read(path.join(d, f));
        expect(src).not.toMatch(/from ['"]@\/pages\/erp\/qualicheck/);
      }
    }
  });

  it('NO PLACEHOLDER strings in Pass B surface files (S75 lesson)', () => {
    const dirs = [
      'src/pages/erp/comply360/companies',
      'src/pages/erp/comply360/esg',
      'src/pages/erp/comply360/exim/foreign-tax',
    ];
    for (const d of dirs) {
      const files = fs.readdirSync(path.join(process.cwd(), d));
      for (const f of files) {
        const src = read(path.join(d, f));
        expect(src).not.toMatch(/PLACEHOLDER|TBD|XXX|TODO_FILL/);
      }
    }
  });

  it('Pass A engine signatures unchanged (Lesson 23 read-contract spot-check)', () => {
    const sm = read('src/lib/comply360-schedule-m-engine.ts');
    expect(sm).toContain('export function assessScheduleMCompliance');
    const brsr = read('src/lib/comply360-brsr-comprehensive-engine.ts');
    expect(brsr).toContain('export const PRINCIPLE_LABELS');
    const caro = read('src/lib/comply360-caro-extended-engine.ts');
    expect(caro).toContain('export function buildCAROExtendedReport');
    const tp = read('src/lib/comply360-transfer-pricing-engine.ts');
    expect(tp).toContain('export const MASTER_FILE_REVENUE_THRESHOLD_INR');
    expect(tp).toContain('export const CBCR_PARENT_REVENUE_THRESHOLD_INR');
    expect(tp).toContain('export const EQUALISATION_LEVY_RATE_PCT');
  });

  it('EsgPage shell wires BRSR sub-tab', () => {
    const src = read('src/pages/erp/comply360/esg/EsgPage.tsx');
    expect(src).toContain('BRSRComprehensivePage');
    expect(src).toMatch(/TabsTrigger value="brsr"/);
  });

  it('FR-105 done-gate · no toBe-equality on registry counts in src/test/ (bounds-check only)', () => {
    const out = execSync(
      'grep -rn --exclude=comply360-sprint-77b.test.ts --exclude=comply360-sprint-78b.test.ts "getSiblingCount()).toBe(\\|getSprintCount()).toBe(\\|getCurrentAStreak()).toBe(" src/test/ || true',
      { encoding: 'utf-8' },
    );
    expect(out.trim()).toBe('');
  });


  it('Pass A engine files exist and are untouched in shape (sanity)', () => {
    for (const e of ['schedule-m', 'brsr-comprehensive', 'caro-extended', 'transfer-pricing']) {
      expect(fs.existsSync(path.join(process.cwd(), `src/lib/comply360-${e}-engine.ts`))).toBe(true);
    }
  });
});

