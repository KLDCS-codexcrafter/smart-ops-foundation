/**
 * @file        am3-block-behavioral.test.ts
 * @sprint      Sprint AM.3 · T-AM3-Universal-Mobile · Pass 3 · behavioral guardrails
 * @canon       Greppable consumption proofs (NOT diff-absence). Non-forward-
 *              looking — no rows[0].code style assumptions.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  listMobileReports,
  listMobileReportCards,
  getMobileReport,
  mobileReportCount,
  MOBILE_REPORT_HONESTY,
  type MobileReportCard,
} from '@/lib/mobile-report-registry';
import { listRegisteredAdapters } from '@/lib/approval-rail-engine';
import '@/lib/approval-adapters';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';

const read = (p: string) => readFileSync(resolve(p), 'utf8');

describe('AM.3 · Universal Mobile Approval (CONSUMES B.1 rail · NO reimplement)', () => {
  it('mobile inbox capture imports listPendingMirrors + decideApproval from approval-rail-engine (greppable)', () => {
    const src = read('src/components/mobile/MobileApprovalInboxCapture.tsx');
    expect(src).toMatch(/from '@\/lib\/approval-rail-engine'/);
    expect(src).toMatch(/listPendingMirrors/);
    expect(src).toMatch(/decideApproval/);
  });

  it('mobile inbox capture imports approval-adapters so all adapter types register', () => {
    const src = read('src/components/mobile/MobileApprovalInboxCapture.tsx');
    expect(src).toMatch(/import '@\/lib\/approval-adapters'/);
  });

  it('mobile inbox page also consumes listPendingMirrors (no per-card localStorage probe)', () => {
    const src = read('src/pages/mobile/MobileApprovalInboxPage.tsx');
    expect(src).toMatch(/listPendingMirrors/);
    expect(src).not.toMatch(/materialIndentsKey|serviceRequestsKey|capitalIndentsKey/);
  });

  it('mobile inbox capture does NOT re-implement the rail (no approveIndent/rejectIndent calls)', () => {
    const src = read('src/components/mobile/MobileApprovalInboxCapture.tsx');
    expect(src).not.toMatch(/approveIndent|rejectIndent\(/);
  });

  it('approval-adapters self-register the full B.1 set (≥ 12 adapter types reachable from one inbox)', () => {
    const adapters = listRegisteredAdapters();
    expect(adapters.length).toBeGreaterThanOrEqual(12);
    const types = new Set(adapters.map((a) => a.object_type));
    // Spot-check the canonical types AM.3 explicitly says it covers.
    ['procure_po', 'bill_passing', 'requestx_indent', 'payout_requisition'].forEach((t) => {
      expect(types.has(t as never)).toBe(true);
    });
  });

  it('every registered adapter exposes listPending/approve/reject/recordRoute', () => {
    listRegisteredAdapters().forEach((a) => {
      expect(typeof a.listPending).toBe('function');
      expect(typeof a.approve).toBe('function');
      expect(typeof a.reject).toBe('function');
      expect(typeof a.recordRoute).toBe('function');
    });
  });
});

describe('AM.3 · mobile-report-registry (NEW SIBLING · READ-ONLY)', () => {
  it('lists at least one report for every back-office card the sprint covers', () => {
    const required: MobileReportCard[] = [
      'eximx', 'bill_passing', 'fpa', 'accounting',
      'vendor_portal', 'engineeringx', 'fincore',
    ];
    required.forEach((c) => {
      expect(listMobileReports(c).length).toBeGreaterThan(0);
    });
  });

  it('listMobileReportCards exposes the same card universe as listMobileReports', () => {
    const cards = listMobileReportCards();
    expect(cards.length).toBeGreaterThanOrEqual(7);
    cards.forEach((c) => expect(listMobileReports(c).length).toBeGreaterThan(0));
  });

  it('every entry is readOnly and points at an /erp/ desktop route (no fabricated routes)', () => {
    listMobileReports().forEach((r) => {
      expect(r.readOnly).toBe(true);
      expect(r.desktopRoute.startsWith('/erp/')).toBe(true);
    });
  });

  it('getMobileReport round-trips by id', () => {
    const all = listMobileReports();
    all.forEach((r) => {
      const back = getMobileReport(r.id);
      expect(back?.id).toBe(r.id);
    });
  });

  it('every registry desktopRoute exists as a real Route declaration in App.tsx (greppable provenance)', () => {
    const app = read('src/App.tsx');
    const knownAliases: Record<string, string[]> = {
      '/erp/accounting': ['/erp/accounting', '/erp/fincore'],
      '/erp/engineeringx': ['/erp/engineeringx'],
      '/erp/bill-passing': ['/erp/bill-passing'],
      '/erp/fpa-planning': ['/erp/fpa-planning'],
    };
    listMobileReports().forEach((r) => {
      const candidates = knownAliases[r.desktopRoute] ?? [r.desktopRoute];
      const hit = candidates.some((c) => app.includes(c));
      expect(hit, `route not found in App.tsx for ${r.id} (${r.desktopRoute})`).toBe(true);
    });
  });

  it('honest banner string mentions Wave-2 and read-only', () => {
    expect(MOBILE_REPORT_HONESTY.toLowerCase()).toMatch(/wave-2/);
    expect(MOBILE_REPORT_HONESTY.toLowerCase()).toMatch(/read-only/);
  });

  it('registry has no fabricated computeX / recompute / fetch surface (read-only by construction)', () => {
    const src = read('src/lib/mobile-report-registry.ts');
    expect(src).not.toMatch(/\bfetch\(/);
    expect(src).not.toMatch(/computeReport|recomputeReport|aggregateReport/);
  });

  it('registry count is non-zero and matches REGISTRY enumeration', () => {
    expect(mobileReportCount()).toBe(listMobileReports().length);
    expect(mobileReportCount()).toBeGreaterThanOrEqual(10);
  });
});

describe('AM.3 · Universal Mobile Reporting page (READ-ONLY · no write / no recompute)', () => {
  const src = read('src/pages/mobile/MobileUniversalReportPage.tsx');

  it('imports the registry and mounts the honest banner', () => {
    expect(src).toMatch(/from '@\/lib\/mobile-report-registry'/);
    expect(src).toMatch(/MOBILE_REPORT_HONESTY/);
  });

  it('does not call any write/compute primitive', () => {
    expect(src).not.toMatch(/\bfetch\(/);
    expect(src).not.toMatch(/localStorage\.setItem/);
    expect(src).not.toMatch(/postVoucher|approveIndent|decideApproval/);
  });

  it('navigates to desktop routes only (no fabricated mobile compute path)', () => {
    expect(src).toMatch(/navigate\(r\.desktopRoute\)/);
  });
});

describe('AM.3 · MobileRouter + OperixGo surfacing (additive · core 0-DIFF beyond allowlist)', () => {
  it('MobileRouter wires /mobile/reports → MobileUniversalReportPage', () => {
    const src = read('src/pages/mobile/MobileRouter.tsx');
    expect(src).toMatch(/MobileUniversalReportPage/);
    expect(src).toMatch(/\/mobile\/reports/);
  });

  it('OperixGo surfaces the AM.3 universal-approval + universal-reporting tiles', () => {
    const src = read('src/pages/mobile/OperixGoPage.tsx');
    expect(src).toMatch(/am3-universal-approval/);
    expect(src).toMatch(/am3-universal-reporting/);
    expect(src).toMatch(/\/mobile\/reports/);
  });
});

describe('AM.3 · Walls (no rail / no adapter / no report surface re-implementation)', () => {
  it('approval-rail-engine remains the sole owner of decideApproval (registry/page do not redefine it)', () => {
    const reg = read('src/lib/mobile-report-registry.ts');
    const page = read('src/pages/mobile/MobileUniversalReportPage.tsx');
    expect(reg).not.toMatch(/function decideApproval/);
    expect(page).not.toMatch(/function decideApproval/);
  });

  it('mobile-report-registry never imports any per-card report module (it lists routes, it does not render reports)', () => {
    const src = read('src/lib/mobile-report-registry.ts');
    expect(src).not.toMatch(/from '@\/pages\/erp\//);
    expect(src).not.toMatch(/from '@\/lib\/(eximx|bill-passing|fpa|fincore|engineeringx|vendor-portal)/);
  });
});

describe('AM.3 · sprint-history + sibling-register bookkeeping', () => {
  it('AM3 row exists with predecessor 4c68f639 and newSiblings includes mobile-report-registry', () => {
    const am3 = SPRINTS.find((s) => s.code === 'T-AM3-Universal-Mobile');
    expect(am3).toBeTruthy();
    expect(am3?.predecessorSha).toBe('4c68f639');
    expect(am3?.newSiblings).toContain('mobile-report-registry');
  });

  it('AM.2c row has been flipped off TBD_AT_BANK to the confirmed bank SHA', () => {
    const am2c = SPRINTS.find((s) => s.code === 'T-AM2c-OperixGo-Captures');
    expect(am2c).toBeTruthy();
    expect(am2c?.headSha).toBe('4c68f639');
    expect(am2c?.provenance).toBe('CONFIRMED');
  });

  it('sibling-register has exactly one new entry for mobile-report-registry', () => {
    const hits = SIBLINGS.filter((s) => s.id === 'mobile-report-registry');
    expect(hits.length).toBe(1);
  });
});
