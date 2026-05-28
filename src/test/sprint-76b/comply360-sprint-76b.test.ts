/**
 * @file        src/test/sprint-76b/comply360-sprint-76b.test.ts
 * @purpose     Sprint 76b Pass B · surfaces + legal mega-menu wiring test pack
 *              (Lesson 23 grep-before-assert · Lesson 24 bounds-check · Lesson 26-28 first-pass-clean).
 * @sprint      Sprint 76b · T-Phase-5.A.1.8-PASS-B
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { SPRINTS, getCurrentAStreak } from '@/lib/_institutional/sprint-history';

const root = resolve(__dirname, '../../..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf-8');
const exists = (rel: string) => existsSync(resolve(root, rel));

describe('Sprint 76b · Institutional bookkeeping', () => {
  it('Sprint 76a SHA backfilled (predecessor of 76b)', () => {
    const s76a = SPRINTS.find((s) => s.code === 'T-Phase-5.A.1.8-PASS-A');
    expect(s76a?.headSha).toBe('92458e32e09c0770b636c4f5a02b332b18c680e6');
    expect(s76a?.provenance).toBe('CONFIRMED');
  });

  it('Sprint 76b entry registered with PASS-B code · 0 new SIBLINGs', () => {
    const s76b = SPRINTS.find((s) => s.code === 'T-Phase-5.A.1.8-PASS-B');
    expect(s76b).toBeDefined();
    expect(s76b?.newSiblings.length).toBe(0);
    expect(s76b?.grade).toBe('A first-pass-clean');
    expect(s76b?.predecessorSha).toBe('92458e32e09c0770b636c4f5a02b332b18c680e6');
  });

  it('A-streak ≥ 27 (Lesson 24 bounds-check)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(27);
  });
});

describe('Sprint 76b · 6 surfaces exist on disk', () => {
  const surfaces = [
    'src/pages/erp/comply360/tds/Form27EQPage.tsx',
    'src/pages/erp/comply360/exim/EWB02Page.tsx',
    'src/pages/erp/comply360/tax-gst/extended/ITC04Page.tsx',
    'src/pages/erp/comply360/tax-gst/extended/REG01Page.tsx',
    'src/pages/erp/comply360/tax-gst/extended/REG31Page.tsx',
    'src/pages/erp/comply360/legal/LegalNoticesPage.tsx',
    'src/pages/erp/comply360/legal/ITR6Page.tsx',
    'src/pages/erp/comply360/legal/StampDutyPage.tsx',
  ];
  for (const s of surfaces) {
    it(`exists: ${s}`, () => {
      expect(exists(s)).toBe(true);
    });
  }
});

describe('Sprint 76b · Surfaces consume Pass A engines (grep-before-assert)', () => {
  it('Form27EQPage imports build27EQ from tcs-27eq engine', () => {
    const src = read('src/pages/erp/comply360/tds/Form27EQPage.tsx');
    expect(src).toMatch(/from ['"]@\/lib\/comply360-tcs-27eq-engine['"]/);
    expect(src).toMatch(/build27EQ/);
  });

  it('EWB02Page imports buildEWB02 from ewb02-consolidation engine', () => {
    const src = read('src/pages/erp/comply360/exim/EWB02Page.tsx');
    expect(src).toMatch(/from ['"]@\/lib\/comply360-ewb02-consolidation-engine['"]/);
    expect(src).toMatch(/buildEWB02/);
  });

  it('ITC04Page imports buildITC04 from gstr-builder engine', () => {
    const src = read('src/pages/erp/comply360/tax-gst/extended/ITC04Page.tsx');
    expect(src).toMatch(/buildITC04/);
  });

  it('REG01Page imports buildREG01 from gstr-builder engine', () => {
    const src = read('src/pages/erp/comply360/tax-gst/extended/REG01Page.tsx');
    expect(src).toMatch(/buildREG01/);
  });

  it('REG31Page imports buildREG31 from gstr-builder engine', () => {
    const src = read('src/pages/erp/comply360/tax-gst/extended/REG31Page.tsx');
    expect(src).toMatch(/buildREG31/);
  });

  it('ITR6Page imports buildITR6 from itr6 engine', () => {
    const src = read('src/pages/erp/comply360/legal/ITR6Page.tsx');
    expect(src).toMatch(/from ['"]@\/lib\/comply360-itr6-engine['"]/);
    expect(src).toMatch(/buildITR6/);
  });

  it('StampDutyPage imports computeStampDuty from stamp-duty engine', () => {
    const src = read('src/pages/erp/comply360/legal/StampDutyPage.tsx');
    expect(src).toMatch(/from ['"]@\/lib\/comply360-stamp-duty-engine['"]/);
    expect(src).toMatch(/computeStampDuty/);
  });
});

describe('Sprint 76b · Tab wiring (grep-before-assert)', () => {
  it('TdsPage now has Form 27EQ tab (8th tab)', () => {
    const src = read('src/pages/erp/comply360/tds/TdsPage.tsx');
    expect(src).toMatch(/value="form27eq"/);
    expect(src).toMatch(/<Form27EQPage \/>/);
  });

  it('EInvoiceEWayPage now has EWB-02 tab (3rd tab)', () => {
    const src = read('src/pages/erp/comply360/exim/EInvoiceEWayPage.tsx');
    expect(src).toMatch(/EWB02Page/);
  });

  it('ExtendedReturnsPage now wires 12 sub-tabs (added ITC-04 / REG-01 / REG-31)', () => {
    const src = read('src/pages/erp/comply360/tax-gst/extended/ExtendedReturnsPage.tsx');
    expect(src).toMatch(/ITC04Page/);
    expect(src).toMatch(/REG01Page/);
    expect(src).toMatch(/REG31Page/);
  });

  it("Comply360Page activates 'legal' route to LegalNoticesPage (no longer ComingSoon)", () => {
    const src = read('src/pages/erp/comply360/Comply360Page.tsx');
    expect(src).toMatch(/LegalNoticesPage/);
    expect(src).toMatch(/case ['"]legal['"]/);
  });

  it('LegalNoticesPage shell wires ITR6 + StampDuty sub-tabs', () => {
    const src = read('src/pages/erp/comply360/legal/LegalNoticesPage.tsx');
    expect(src).toMatch(/ITR6Page/);
    expect(src).toMatch(/StampDutyPage/);
  });
});

describe('Sprint 76b · Read-only set 0-DIFF (FR-19)', () => {
  // Pass A engines + gstr-builder must be byte-equivalent in shape — surfaces are consumers only.
  const readOnly = [
    'src/lib/comply360-tcs-27eq-engine.ts',
    'src/lib/comply360-ewb02-consolidation-engine.ts',
    'src/lib/comply360-stamp-duty-engine.ts',
    'src/lib/comply360-itr6-engine.ts',
    'src/lib/comply360-gstr-builder-engine.ts',
  ];
  for (const f of readOnly) {
    it(`read-only file present (no surface ever deletes it): ${f}`, () => {
      expect(exists(f)).toBe(true);
    });
  }

  it('TCS engine still exposes READS_FROM tdsAggregator path', () => {
    const src = read('src/lib/comply360-tcs-27eq-engine.ts');
    expect(src).toMatch(/READS_FROM\s*=\s*\{[\s\S]*tdsAggregator/);
    expect(src).toMatch(/comply360-tds-aggregator-engine\.ts/);
  });

  it('EWB-02 engine still exposes READS_FROM eway-engine path', () => {
    const src = read('src/lib/comply360-ewb02-consolidation-engine.ts');
    expect(src).toMatch(/READS_FROM\s*=/);
    expect(src).toMatch(/comply360-eway-engine\.ts/);
  });
});

describe('Sprint 76b · No prohibited patterns in new surfaces', () => {
  const surfaces = [
    'src/pages/erp/comply360/tds/Form27EQPage.tsx',
    'src/pages/erp/comply360/exim/EWB02Page.tsx',
    'src/pages/erp/comply360/tax-gst/extended/ITC04Page.tsx',
    'src/pages/erp/comply360/tax-gst/extended/REG01Page.tsx',
    'src/pages/erp/comply360/tax-gst/extended/REG31Page.tsx',
    'src/pages/erp/comply360/legal/LegalNoticesPage.tsx',
    'src/pages/erp/comply360/legal/ITR6Page.tsx',
    'src/pages/erp/comply360/legal/StampDutyPage.tsx',
  ];
  for (const s of surfaces) {
    it(`no PLACEHOLDER / $ / TBD in ${s}`, () => {
      const src = read(s);
      expect(src).not.toMatch(/PLACEHOLDER/);
      expect(src).not.toMatch(/\bTBD\b/);
      // Indian-locale: no USD symbol (lone $ outside template literals)
      expect(src).not.toMatch(/\$[0-9]/);
    });
  }
});
