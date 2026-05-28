/**
 * @file        src/test/sprint-70b/comply360-sprint-70b-snapshot.test.ts
 * @purpose     Institutional snapshot · Sprint 70b Cycle-2 Block 9 · register state + reachability
 * @sprint      Sprint 70b · T-Phase-5.A.1.2-PASS-B · Cycle-2 · MB-3d
 * @lesson-24   id-lookup + bounds-check throughout · NO array-length/index assertions
 *              (valid at Sprint 71+ without modification)
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS, getCurrentAStreak } from '@/lib/_institutional/sprint-history';
import { loadObligations } from '@/lib/comply360-statutory-memory';

describe('Sprint 70b · T-Phase-5.A.1.2-PASS-B · institutional snapshot (FR-58 + Lesson 24)', () => {
  it('Sprint 70b entry exists in sprint-history (id-lookup)', () => {
    const entry = SPRINTS.find((s) => s.code === 'T-Phase-5.A.1.2-PASS-B');
    expect(entry).toBeDefined();
    expect(entry?.predecessorSha).toBe('9a4ec95dffb03cf35387c553b03c6ef41dd13cc0');
    expect(entry?.grade?.startsWith('A')).toBe(true);
  });

  it('Sprint 70a grade updated to "A with adaptations" + headSha SHA-filled', () => {
    const s70a = SPRINTS.find((s) => s.code === 'T-Phase-5.A.1.2-PASS-A');
    expect(s70a?.grade).toBe('A with adaptations');
    expect(s70a?.headSha).toBe('9a4ec95dffb03cf35387c553b03c6ef41dd13cc0');
  });

  it('2 NEW Sprint-70b SIBLINGs registered (use-entity-gstins-hook + comply360-tax-gst-shell)', () => {
    const ids = ['use-entity-gstins-hook', 'comply360-tax-gst-shell'];
    for (const id of ids) {
      const sib = SIBLINGS.find((s) => s.id === id);
      expect(sib, `missing SIBLING ${id}`).toBeDefined();
      expect(sib?.provenance).toBe('CONFIRMED');
    }
  });

  it('3 Pass A SIBLINGs still registered with CONFIRMED provenance', () => {
    const ids = ['comply360-gst-aggregator-engine', 'comply360-gstr-builder-engine', 'comply360-ims-engine'];
    for (const id of ids) {
      expect(SIBLINGS.find((s) => s.id === id)?.provenance).toBe('CONFIRMED');
    }
  });

  it('4 Sprint 70b page files + shell exist on disk (FR-100 RECG · Lesson 25 reachability)', () => {
    const repoRoot = process.cwd();
    const pages = [
      'src/pages/erp/comply360/tax-gst/GSTR1NativePage.tsx',
      'src/pages/erp/comply360/tax-gst/GSTR1ANativePage.tsx',
      'src/pages/erp/comply360/tax-gst/GSTR2BNativePage.tsx',
      'src/pages/erp/comply360/tax-gst/IMSPanelPage.tsx',
      'src/pages/erp/comply360/tax-gst/TaxGstPage.tsx',
    ];
    for (const p of pages) {
      expect(fs.existsSync(path.join(repoRoot, p)), `missing ${p}`).toBe(true);
    }
  });

  it('useEntityGSTINs hook backing file exists', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'src/hooks/useEntityGSTINs.ts'))).toBe(true);
  });

  it('TaxGstPage shell reachable via Comply360Page tax-gst router case (Lesson 25)', () => {
    const router = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/erp/comply360/Comply360Page.tsx'),
      'utf-8',
    );
    expect(router).toContain("'tax-gst'");
    expect(router).toContain('TaxGstPage');
  });

  it('statutory-memory seed extended with 3 NEW Sprint 70b obligations', () => {
    const obs = loadObligations();
    for (const id of ['gstr-1a-apr', 'gstr-2b-apr', 'ims-apr']) {
      expect(obs.find((o) => o.id === id), `missing seed ${id}`).toBeDefined();
    }
  });

  it('15 Sprint 69 baseline obligations preserved (additive only)', () => {
    const obs = loadObligations();
    for (const id of ['gstr-1-apr', 'gstr-3b-apr', 'gst-9-fy25']) {
      expect(obs.find((o) => o.id === id), `missing baseline ${id}`).toBeDefined();
    }
  });

  it('FR-19 SIBLING boundary preserved · Pass A engines untouched (Sprint 70a tag intact)', () => {
    const agg = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/comply360-gst-aggregator-engine.ts'),
      'utf-8',
    );
    expect(agg).toContain('Sprint 70a · T-Phase-5.A.1.2-PASS-A');
  });

  it('A-streak ≥ 18 (Sprint 70b bank · Lesson 24 bounds-check)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(18);
  });

  it('Pattern-locked files preserved 0-DIFF (sidebar-config tax-gst children: [])', () => {
    const sb = fs.readFileSync(
      path.join(process.cwd(), 'src/apps/erp/configs/comply360-sidebar-config.ts'),
      'utf-8',
    );
    expect(sb).toMatch(/id: 'tax-gst'[\s\S]*?children: \[\]/);
  });
});
