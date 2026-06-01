/**
 * @file        src/test/sprint-95/comply360-sprint-95.test.ts
 * @sprint      Sprint 95 · T-Phase-5.F.5.7-Final · Phase 5 CLOSE CEREMONY · FINAL POLISH
 * @purpose     Institutional + Floor 5 Welcome tile + Phase 5 milestone + §H 0-DIFF assertions.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { SPRINTS, getCurrentAStreak, getSprintCount } from '@/lib/_institutional/sprint-history';
import { getSiblingCount } from '@/lib/_institutional/sibling-register';

const SRC = (p: string): string => path.resolve(__dirname, '../../..', p);
const readWelcome = (): string =>
  fs.readFileSync(SRC('src/pages/erp/comply360/Comply360Welcome.tsx'), 'utf-8');

describe('Sprint 95 · T-Phase-5.F.5.7-Final · Phase 5 CLOSE CEREMONY · FINAL POLISH', () => {
  // ─── Institutional (6) ───
  it('Sprint 95 entry exists · code T-Phase-5.F.5.7-Final · grade A first-pass-clean', () => {
    const s95 = SPRINTS.find((s) => s.sprintNumber === 95);
    expect(s95).toBeDefined();
    expect(s95?.code).toBe('T-Phase-5.F.5.7-Final');
    expect(s95?.grade).toBe('A first-pass-clean');
  });
  it('Sprint 94 SHA backfilled to df1b9b71...', () => {
    const s94 = SPRINTS.find((s) => s.sprintNumber === 94);
    expect(s94?.headSha).toBe('df1b9b713fdda0ba687177f103d0c94c0433914c');
  });
  it('Sprint 94 loc corrected to 1710', () => {
    const s94 = SPRINTS.find((s) => s.sprintNumber === 94);
    expect(s94?.loc).toBe(1710);
  });
  it('A-streak >= 20 (target 21 post-bank)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(20);
  });
  it('SPRINTS count >= 112', () => {
    expect(getSprintCount()).toBeGreaterThanOrEqual(112);
  });
  it('SIBLINGs runtime stays >= 155 (no new SIBLINGs · final polish)', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(155);
  });

  // ─── DP-S95-16A · Floor 5 Welcome tile navigation fix (11 tests) ───
  it('Comply360Welcome has >= 17 tile entries (was 7 + 10 Floor 5 tiles)', () => {
    const src = readWelcome();
    const matches = src.match(/target:\s*'[a-z0-9-]+'/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(17);
  });
  const floor5Targets = [
    'fire-safety', 'industrial-safety', 'environmental', 'waste-management',
    'dpdp', 'cyber-security', 'quality-standards', 'labour-tier2',
    'mca-tier2', 'legal-ipr',
  ] as const;
  for (const target of floor5Targets) {
    it(`Comply360Welcome tiles include ${target} target`, () => {
      expect(readWelcome()).toContain(`target: '${target}'`);
    });
  }

  // ─── Phase 5 milestone assertions (3) ───
  it('Phase 5 close-ceremony declaration file exists', () => {
    expect(fs.existsSync(SRC('docs/Operix_Comply360_Phase5_Close_Ceremony.md'))).toBe(true);
  });
  it('S94 close-summary backfilled at audit_workspace/T-Phase-5.F.5.6/Z_close_evidence/', () => {
    expect(
      fs.existsSync(SRC('audit_workspace/T-Phase-5.F.5.6/Z_close_evidence/sprint-94-arc-summary.md')),
    ).toBe(true);
  });
  it('Phase 5 declaration asserts 161/161 obligations native (100%)', () => {
    const decl = fs.readFileSync(SRC('docs/Operix_Comply360_Phase5_Close_Ceremony.md'), 'utf-8');
    expect(decl).toContain('161 of 161');
    expect(decl).toContain('100%');
  });

  // ─── §H 0-DIFF anchors (5) ───
  it('S94 mca-tier2 engine still present (0-DIFF anchor)', () => {
    expect(fs.existsSync(SRC('src/lib/comply360-mca-tier2-engine.ts'))).toBe(true);
  });
  it('S94 MCATier2 + LegalIPR Standalone Pages still present (0-DIFF anchor)', () => {
    expect(fs.existsSync(SRC('src/pages/erp/comply360/mca-tier2/MCATier2DashboardPage.tsx'))).toBe(true);
    expect(fs.existsSync(SRC('src/pages/erp/comply360/legal-ipr/LegalIPRDashboardPage.tsx'))).toBe(true);
  });
  it('Comply360Sidebar.types union unchanged (mca-tier2 + legal-ipr present)', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/Comply360Sidebar.types.ts'), 'utf-8');
    expect(src).toContain("'mca-tier2'");
    expect(src).toContain("'legal-ipr'");
  });
  it('comply360-sidebar-config present (0-DIFF anchor)', () => {
    expect(fs.existsSync(SRC('src/apps/erp/configs/comply360-sidebar-config.ts'))).toBe(true);
  });
  it('Shell infrastructure unchanged (DP-S95-16A Option A · ShellSidebar present)', () => {
    expect(fs.existsSync(SRC('src/shell/sidebar/ShellSidebar.tsx'))).toBe(true);
    expect(fs.existsSync(SRC('src/shell/utils/filterSidebarByMatrix.ts'))).toBe(true);
  });
});
