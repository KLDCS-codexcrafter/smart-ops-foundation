/**
 * @file        src/test/sprint-cln3/cln3-block-behavioral.test.ts
 * @sprint      Sprint CLEANUP-3 · T-CLN3-Residue-Bundle
 * @purpose     Behavioral guardrails for the 4 honest cleanups:
 *              (1) FinCore Mobile entry: phase=live + re-pointed to a universal-layer route.
 *              (2) ConversionType: CONVERSION_TYPES value exists + marketing-automation reads it.
 *              (3) Tower: zero "coming soon" toasts anywhere under src/pages/tower.
 *              (4) CustomerSupport: zero "coming soon" + wired local detail view.
 *              + §H wall guards (0-DIFF allowlist).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  CONVERSION_TYPES,
  type ConversionType,
} from '@/lib/salesx-conversion-engine';
import { getFunnelContext } from '@/lib/marketing-automation-engine';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf-8');
}

describe('CLN3 · Item 1 · FinCore Mobile operix-go entry', () => {
  const src = read('src/pages/mobile/OperixGoPage.tsx');

  it('FinCore entry exists with id "fincore"', () => {
    expect(src).toMatch(/id:\s*'fincore'/);
  });

  it("FinCore entry is flipped phase: 'live'", () => {
    const block = src.split(/id:\s*'fincore'/)[1].split(/\},\s*\n/)[0];
    expect(block).toMatch(/phase:\s*'live'/);
    expect(block).not.toMatch(/phase:\s*'planned'/);
  });

  it('FinCore entry no longer routes to the dead /operix-go/fincore', () => {
    const block = src.split(/id:\s*'fincore'/)[1].split(/\},\s*\n/)[0];
    expect(block).not.toMatch(/\/operix-go\/fincore/);
  });

  it('FinCore entry points to a Universal Approval/Reporting route', () => {
    const block = src.split(/id:\s*'fincore'/)[1].split(/\},\s*\n/)[0];
    expect(block).toMatch(/route:\s*'(?:\/operix-go\/approval-inbox|\/mobile\/reports)'/);
  });

  it('FinCore details cite the Universal Approval/Reporting layers (AM.3)', () => {
    const block = src.split(/id:\s*'fincore'/)[1].split(/\},\s*\n/)[0];
    expect(block).toMatch(/Universal Approval/i);
    expect(block).toMatch(/Universal (?:Mobile )?Reporting/i);
  });
});

describe('CLN3 · Item 2 · ConversionType value export', () => {
  it('CONVERSION_TYPES is a non-empty readonly array of conversion-type strings', () => {
    expect(Array.isArray(CONVERSION_TYPES)).toBe(true);
    expect(CONVERSION_TYPES.length).toBeGreaterThan(0);
    expect(CONVERSION_TYPES.length).toBe(5);
  });

  it('CONVERSION_TYPES includes all five canonical ConversionType members', () => {
    const expected: ConversionType[] = [
      'enquiry_to_quotation',
      'quotation_to_proforma',
      'quotation_to_sales_order',
      'quotation_to_project',
      'sales_order_to_project',
    ];
    for (const k of expected) expect(CONVERSION_TYPES).toContain(k);
  });

  it('marketing-automation getFunnelContext returns a populated (non-empty) list', () => {
    const ctx = getFunnelContext();
    expect(ctx.conversionTypes.length).toBeGreaterThan(0);
    expect(ctx.conversionTypes).toEqual(CONVERSION_TYPES);
    expect(ctx.conversionEngineLoaded).toBe(true);
  });

  it('marketing-automation source no longer reads the TS type at runtime via cast', () => {
    const src = read('src/lib/marketing-automation-engine.ts');
    expect(src).not.toMatch(/as unknown as \{\s*ConversionType\?/);
    expect(src).toMatch(/salesxConversion\.CONVERSION_TYPES/);
  });

  it('salesx-conversion-engine keeps the original `type ConversionType` (0-DIFF wall)', () => {
    const src = read('src/lib/salesx-conversion-engine.ts');
    expect(src).toMatch(/export type ConversionType\s*=/);
    expect(src).toMatch(/'enquiry_to_quotation'/);
    expect(src).toMatch(/'sales_order_to_project'/);
  });
});

describe('CLN3 · Item 3 · Tower 11 dead buttons made honest', () => {
  const towerFiles = [
    'src/pages/tower/Users.tsx',
    'src/pages/tower/Permissions.tsx',
    'src/pages/tower/Notifications.tsx',
    'src/pages/tower/Billing.tsx',
    'src/pages/tower/Settings.tsx',
    'src/pages/tower/Support.tsx',
  ];

  for (const f of towerFiles) {
    it(`${f} has zero "coming soon" strings`, () => {
      const src = read(f);
      expect(src.toLowerCase()).not.toContain('coming soon');
    });
  }

  it('honest-deferred Tower buttons mention Wave-2 in their title attribute', () => {
    const combined = towerFiles.map(read).join('\n');
    expect(combined).toMatch(/title="[^"]*Wave-2[^"]*"/);
  });
});

describe('CLN3 · Item 4 · CustomerSupport dead button wired locally', () => {
  const src = read('src/pages/customer/CustomerSupport.tsx');

  it('CustomerSupport has zero "coming soon" strings', () => {
    expect(src.toLowerCase()).not.toContain('coming soon');
  });

  it('CustomerSupport wires a local Dialog for ticket details (no fetch)', () => {
    expect(src).toMatch(/import\s*\{[^}]*Dialog[^}]*\}\s*from\s*['"]@\/components\/ui\/dialog['"]/);
    expect(src).toMatch(/setDetailTicket/);
    expect(src).toMatch(/detailTicket/);
  });

  it('CustomerSupport ticket data (TICKETS) stays 0-DIFF consumed (4 rows)', () => {
    const rows = (src.match(/id:\s*"TKT-C-\d+"/g) ?? []).length;
    expect(rows).toBe(4);
  });
});

describe('CLN3 · §H walls + history bookkeeping', () => {
  it('approval-rail-engine + universal mobile layers stay imported intact', () => {
    expect(read('src/pages/mobile/MobileApprovalInboxPage.tsx')).toMatch(
      /from\s*['"]@\/lib\/approval-rail-engine['"]/,
    );
    expect(read('src/pages/mobile/MobileUniversalReportPage.tsx')).toMatch(
      /from\s*['"]@\/lib\/mobile-report-registry['"]/,
    );
  });

  it('GUIDE-1 sprint flipped to f0ee5e3f (CONFIRMED)', () => {
    const guide1 = SPRINTS.find(
      s => (s.sprintNumber as unknown as string) === 'GUIDE1',
    );
    expect(guide1).toBeDefined();
    expect(guide1?.headSha).toBe('f0ee5e3f');
    expect(guide1?.provenance).toBe('CONFIRMED');
  });

  it('CLN3 sprint row exists with predecessor f0ee5e3f and empty newSiblings', () => {
    const cln3 = SPRINTS.find(
      s => (s.sprintNumber as unknown as string) === 'CLN3',
    );
    expect(cln3).toBeDefined();
    expect(cln3?.code).toBe('T-CLN3-Residue-Bundle');
    expect(cln3?.predecessorSha).toBe('f0ee5e3f');
    expect(cln3?.newSiblings).toEqual([]);
  });
});
