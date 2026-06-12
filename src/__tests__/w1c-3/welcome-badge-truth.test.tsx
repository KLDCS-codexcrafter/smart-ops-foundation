/**
 * @sprint W1C-3 Block 3 — Welcome WIP-badge truth guard
 * Permanent guard: every panelCard with badge:"wip" must point at a target file
 * containing a genuine WIP / coming-soon / not-wired marker. A stale badge fails
 * this suite forever after.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

const welcomeSrc = readFileSync('src/pages/Welcome.tsx', 'utf8');

// Map known welcome routes → representative target file(s) on disk.
const ROUTE_TO_TARGETS: Record<string, string[]> = {
  '/erp/dashboard':       ['src/pages/erp/Dashboard.tsx'],
  '/partner/dashboard':   ['src/pages/partner/PartnerDashboard.tsx'],
  '/customer/dashboard':  ['src/pages/customer/Orders.tsx'],
  '/verticals':           ['src/pages/verticals/VerticalsPage.tsx'],
  '/modules':             ['src/pages/Welcome.tsx'],
  '/operix-go':           ['src/pages/Welcome.tsx'],
  '/client-customized':   ['src/pages/client-customized/ClientCustomizedPage.tsx'],
  '/welcome/scenarios':   ['src/pages/Welcome.tsx'],
  '/welcome/dev-tools':   ['src/pages/welcome/dev-tools/EngineeringConsolePage.tsx'],
  '/prudent360':          ['src/pages/Welcome.tsx'],
};

function extractWipRoutes(src: string): string[] {
  // Parse very loosely: each card object literal is small; pair `route:` with `badge:`.
  const blocks = src.split(/\{\s*\n\s*title:/).slice(1);
  const wipRoutes: string[] = [];
  for (const b of blocks) {
    if (/badge:\s*"wip"/.test(b)) {
      const m = b.match(/route:\s*"([^"]+)"/);
      if (m) wipRoutes.push(m[1]);
    }
  }
  return wipRoutes;
}

describe('W1C-3 · Welcome WIP-badge truth guard', () => {
  const wipRoutes = extractWipRoutes(welcomeSrc);

  it('expected wip count after W1C-3 truth pass (0 = all lifted honestly)', () => {
    // The pass lifted all 10 stale wip badges; if any return, they MUST point to a
    // target that genuinely declares WIP.
    expect(wipRoutes.length).toBe(0);
  });

  for (const route of wipRoutes) {
    it(`wip badge for ${route} must point at a target containing a WIP marker`, () => {
      const targets = ROUTE_TO_TARGETS[route] ?? [];
      expect(targets.length, `unknown route ${route} — add mapping`).toBeGreaterThan(0);
      const haveMarker = targets.some((p) => {
        if (!existsSync(p)) return false;
        const t = readFileSync(p, 'utf8');
        return /coming soon|not yet wired|work in progress|wave-2|WIP|TODO/i.test(t);
      });
      expect(haveMarker, `${route} badge is stale — no WIP marker in target`).toBe(true);
    });
  }
});
