/**
 * @sprint T-FIX · OperixGo phase-badge truth guard
 * Mirrors welcome-badge-truth: every MOBILE_PRODUCTS tile with phase:'phase2'
 * must NOT have a built page at its route. A stale badge fails the suite forever after.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

const src = readFileSync('src/pages/mobile/OperixGoPage.tsx', 'utf8');

// Routes known to be wired in MobileRouter / app routers → representative page file(s).
const ROUTE_TO_TARGETS: Record<string, string[]> = {
  '/operix-go/vetan-nidhi': ['src/pages/mobile/vetan-nidhi'],
  '/operix-go/salesx':      ['src/pages/mobile/salesman'],
  '/operix-go/receivx':     ['src/pages/mobile/receivx', 'src/pages/mobile/collection'],
  '/mobile/transporter/home': ['src/pages/mobile/transporter/MobileTransporterHome.tsx'],
  '/mobile/vendor/home':      ['src/pages/mobile/vendor/MobileVendorHome.tsx'],
};

function extractPhase2Tiles(s: string): { route: string }[] {
  const blocks = s.split(/\{\s*\n\s*id:/).slice(1);
  const out: { route: string }[] = [];
  for (const b of blocks) {
    if (/phase:\s*'phase2'/.test(b)) {
      const m = b.match(/route:\s*'([^']+)'/);
      if (m) out.push({ route: m[1] });
    }
  }
  return out;
}

describe('T-FIX · OperixGo phase:phase2 badge truth guard', () => {
  const stale = extractPhase2Tiles(src);

  it('after T-FIX, Vetan Nidhi / SalesX Go / ReceivX Go are NOT phase2 (built + routed)', () => {
    const routes = stale.map(s => s.route);
    expect(routes).not.toContain('/operix-go/vetan-nidhi');
    expect(routes).not.toContain('/operix-go/salesx');
    expect(routes).not.toContain('/operix-go/receivx');
  });

  for (const tile of stale) {
    it(`phase:'phase2' tile ${tile.route} must NOT have a built page (else flip to 'live')`, () => {
      const targets = ROUTE_TO_TARGETS[tile.route] ?? [];
      const built = targets.some(p => existsSync(p));
      expect(built, `${tile.route} is marked phase2 but a built target exists — flip to 'live'`).toBe(false);
    });
  }
});
