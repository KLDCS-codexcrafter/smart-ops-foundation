/**
 * @file        src/test/sprint-103/arc1-ux-surfacing.test.ts
 * @purpose     Sprint 103 · T-Phase-6.A.1.2 · Arc 1 UX surfacing test pack
 *              Asserts 4 NEW pages + 2 SURFACED + sidebar/router wiring + engine 0-DIFF read contracts.
 * @sprint      Sprint 103 · T-Phase-6.A.1.2
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import * as costAuditEngine from '@/lib/comply360-cost-audit-engine';
import * as meetingsEngine from '@/lib/comply360-meetings-engine';
import * as survivalKitEngine from '@/lib/comply360-survival-kit-engine';
import * as csrEngine from '@/lib/comply360-csr-engine';
import { comply360SidebarItems } from '@/apps/erp/configs/comply360-sidebar-config';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const ROOT = process.cwd();
const PAGE_ROOT = join(ROOT, 'src/pages/erp/comply360');
function fileExists(rel: string): boolean { return existsSync(join(PAGE_ROOT, rel)); }
function readPage(rel: string): string { return readFileSync(join(PAGE_ROOT, rel), 'utf-8'); }

describe('S103 · Block 0 · engine read contracts (0-DIFF)', () => {
  it('cost-audit-engine exposes appointCostAuditor', () => {
    expect(typeof costAuditEngine.appointCostAuditor).toBe('function');
  });
  it('cost-audit-engine exposes list helpers', () => {
    expect(typeof costAuditEngine.listCostAuditorAppointments).toBe('function');
    expect(typeof costAuditEngine.listCRAFormFilings).toBe('function');
    expect(typeof costAuditEngine.listCostAuditReports).toBe('function');
  });
  it('cost-audit-engine exposes §148(3) cooling-off probe', () => {
    expect(typeof costAuditEngine.isCostAuditorEligible).toBe('function');
  });
  it('meetings-engine exposes recordMeeting + checkQuorum', () => {
    expect(typeof meetingsEngine.recordMeeting).toBe('function');
    expect(typeof meetingsEngine.checkQuorum).toBe('function');
  });
  it('meetings-engine exposes listMeetings', () => {
    expect(typeof meetingsEngine.listMeetings).toBe('function');
  });
  it('survival-kit-engine exposes computeReadinessPercentage', () => {
    expect(typeof survivalKitEngine.computeReadinessPercentage).toBe('function');
  });
  it('survival-kit-engine exposes checklist + likely-questions accessors', () => {
    expect(typeof survivalKitEngine.listChecklistItems).toBe('function');
    expect(typeof survivalKitEngine.listLikelyQuestions).toBe('function');
  });
  it('csr-engine exposes Committee + Agency + CSR-1 + CSR-2 helpers', () => {
    expect(typeof csrEngine.listCSRCommittees).toBe('function');
    expect(typeof csrEngine.listImplementingAgencies).toBe('function');
    expect(typeof csrEngine.listCSR1Filings).toBe('function');
    expect(typeof csrEngine.listCSR2Filings).toBe('function');
  });
  it('csr-engine re-exports Schedule VII helpers (FR-44 read-only)', () => {
    expect(typeof csrEngine.getCSRThematicAreas).toBe('function');
    expect(typeof csrEngine.checkSection135Applicability).toBe('function');
  });
});

describe('S103 · Block 4 · 4 NEW pages exist', () => {
  it('#28 Cost Audit dashboard page exists', () => {
    expect(fileExists('cost-audit/CostAuditDashboardPage.tsx')).toBe(true);
  });
  it('#29 Meetings dashboard page exists', () => {
    expect(fileExists('meetings/MeetingsDashboardPage.tsx')).toBe(true);
  });
  it('#30 Auditor Survival Kit dashboard page exists', () => {
    expect(fileExists('survival-kit/SurvivalKitDashboardPage.tsx')).toBe(true);
  });
  it('#31 CSR dashboard page exists (rescoped SURFACE→BUILD)', () => {
    expect(fileExists('csr/CSRDashboardPage.tsx')).toBe(true);
  });
});

describe('S103 · Block 4 · pages READ engines (USE-SITE, 0-DIFF)', () => {
  it('cost-audit page imports comply360-cost-audit-engine', () => {
    expect(readPage('cost-audit/CostAuditDashboardPage.tsx')).toMatch(/comply360-cost-audit-engine/);
  });
  it('meetings page imports comply360-meetings-engine', () => {
    expect(readPage('meetings/MeetingsDashboardPage.tsx')).toMatch(/comply360-meetings-engine/);
  });
  it('survival-kit page imports comply360-survival-kit-engine', () => {
    expect(readPage('survival-kit/SurvivalKitDashboardPage.tsx')).toMatch(/comply360-survival-kit-engine/);
  });
  it('csr page imports comply360-csr-engine', () => {
    expect(readPage('csr/CSRDashboardPage.tsx')).toMatch(/comply360-csr-engine/);
  });
});

describe('S103 · Block 5 · sidebar wiring (6 modules)', () => {
  const ids = comply360SidebarItems.map((i) => i.id);
  it.each(['cost-audit', 'meetings', 'survival-kit', 'csr', 'form-15ca', 'schedule-m'])(
    'sidebar has %s entry',
    (id) => { expect(ids).toContain(id); },
  );
  it('all new sidebar items use type=item (navigable, S95-HOTFIX canon)', () => {
    for (const id of ['cost-audit', 'meetings', 'survival-kit', 'csr', 'form-15ca', 'schedule-m']) {
      const item = comply360SidebarItems.find((i) => i.id === id);
      expect(item?.type).toBe('item');
    }
  });
});

describe('S103 · Block 5 · router wiring (Comply360Page)', () => {
  const router = readFileSync(join(PAGE_ROOT, 'Comply360Page.tsx'), 'utf-8');
  it.each([
    ['cost-audit', 'CostAuditDashboardPage'],
    ['meetings', 'MeetingsDashboardPage'],
    ['survival-kit', 'SurvivalKitDashboardPage'],
    ['csr', 'CSRDashboardPage'],
    ['form-15ca', 'Form15CAPage'],
    ['schedule-m', 'ScheduleMPage'],
  ])('router routes %s → %s', (caseId, comp) => {
    expect(router).toMatch(new RegExp(`case '${caseId}'`));
    expect(router).toMatch(new RegExp(comp));
  });
});

describe('S103 · Block 5 · welcome tiles', () => {
  const welcome = readFileSync(join(PAGE_ROOT, 'Comply360Welcome.tsx'), 'utf-8');
  it.each(['cost-audit', 'meetings', 'survival-kit', 'csr', 'form-15ca', 'schedule-m'])(
    'welcome includes tile target %s',
    (id) => { expect(welcome).toMatch(new RegExp(`target: '${id}'`)); },
  );
});

describe('S103 · sprint-history entry', () => {
  it('S103 is registered with grade A', () => {
    const s = SPRINTS.find((x) => x.sprintNumber === 103);
    expect(s).toBeDefined();
    expect(s?.grade).toBe('A');
    expect(s?.code).toBe('T-Phase-6.A.1.2');
    expect(s?.predecessorSha).toBe('ba5a81b75132577a7599d6ff0945d0ded2662db5');
  });
  it('S103 introduces ZERO new SIBLINGs (UX-only sprint)', () => {
    const s = SPRINTS.find((x) => x.sprintNumber === 103);
    expect(s?.newSiblings).toEqual([]);
  });
});

describe('S103 · Block 6 · close-summary evidence artifact', () => {
  it('close_summary.md exists under T-Phase-6.A.1.2', () => {
    const p = join(ROOT, 'audit_workspace/T-Phase-6.A.1.2/Z_close_evidence/close_summary.md');
    expect(existsSync(p)).toBe(true);
  });
  it('close_summary mentions §L + CSR rescope rationale', () => {
    const p = join(ROOT, 'audit_workspace/T-Phase-6.A.1.2/Z_close_evidence/close_summary.md');
    const body = readFileSync(p, 'utf-8');
    expect(body).toMatch(/§L/);
    expect(body).toMatch(/CSR/i);
    expect(body).toMatch(/rescope|SURFACE.*BUILD|surface.*build/i);
  });
});
