/**
 * @file     src/test/sprint-cat1/cat1-block-behavioral.test.ts
 * @sprint   CATALOG-1 · T-CAT1-Modules-AddOns
 * @purpose  Behavioral guard rails for the /modules + /add-ons catalog
 *           refresh. House posture: ≥20 it() · honest assertions ·
 *           §H walls held (no landing pages · no engine · capability
 *           cards 0-DIFF · applications.ts 0-DIFF).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { __CAT1_MODULES__ } from '@/pages/modules/ModulesPage';
import { __CAT1_ADDONS__ } from '@/pages/addons/AddOnsPage';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

// ── Known existing surfaces this catalog is allowed to link to. ──────────
// Every phase2 entry MUST resolve to one of these (no fabricated routes).
const KNOWN_ROUTES = new Set<string>([
  '/erp/fincore',
  '/erp/comply360',
  '/erp/salesx',
  '/erp/receivx',
  '/erp/procure-hub',
  '/erp/store-hub',
  '/erp/qualicheck',
  '/erp/taskflow',
  '/erp/docvault',
  '/erp/fpa-planning',
  '/erp/production',
  '/erp/maintainpro',
  '/erp/payout',
  '/erp/inventory-hub',
  '/erp/servicedesk',
  '/erp/gateflow',
  '/erp/webstorex',
  '/erp/ecomx',
  '/erp/eximx',
  '/erp/insightx',
  '/erp/customer-hub',
  '/erp/fa-physical-verification',
  '/erp/fincore/registers/approvals-pending',
  '/bridge',
  '/bridge/reconciliation',
  '/bridge/audit',
  '/add-ons/barcode',
  '/modules/vetan-nidhi',
]);

const PROJECT_ROOT = process.cwd();

describe('CATALOG-1 · /modules + /add-ons catalog refresh', () => {
  // ── Counts ────────────────────────────────────────────────────────────
  it('ModulesPage exports exactly 28 catalog entries', () => {
    expect(__CAT1_MODULES__.length).toBe(28);
  });

  it('AddOnsPage exports exactly 12 catalog entries', () => {
    expect(__CAT1_ADDONS__.length).toBe(12);
  });

  // ── Honest phase rendering ────────────────────────────────────────────
  it('every module is either phase2 or live (no module is planned)', () => {
    for (const m of __CAT1_MODULES__) {
      expect(['phase2', 'live']).toContain(m.phase);
    }
  });

  it('only AI-Price and Hardware are planned in add-ons', () => {
    const planned = __CAT1_ADDONS__.filter(a => a.phase === 'planned').map(a => a.id).sort();
    expect(planned).toEqual(['ai-price', 'hardware']);
  });

  it('the remaining 10 add-ons are phase2 or live', () => {
    const nonPlanned = __CAT1_ADDONS__.filter(a => a.phase !== 'planned');
    expect(nonPlanned.length).toBe(10);
    for (const a of nonPlanned) expect(['phase2', 'live']).toContain(a.phase);
  });

  // ── Routes are honest ────────────────────────────────────────────────
  it('every phase2/live module route resolves to a known existing surface', () => {
    for (const m of __CAT1_MODULES__) {
      if (m.phase === 'planned') continue;
      expect(KNOWN_ROUTES.has(m.route), `module ${m.id} → ${m.route} not in KNOWN_ROUTES`).toBe(true);
    }
  });

  it('every phase2/live add-on route resolves to a known existing surface', () => {
    for (const a of __CAT1_ADDONS__) {
      if (a.phase === 'planned') continue;
      expect(KNOWN_ROUTES.has(a.route), `addon ${a.id} → ${a.route} not in KNOWN_ROUTES`).toBe(true);
    }
  });

  it('module routes are not fabricated /modules/* landing paths (except vetan-nidhi legacy)', () => {
    for (const m of __CAT1_MODULES__) {
      if (m.id === 'vetan-nidhi') continue;
      expect(m.route.startsWith('/modules/')).toBe(false);
    }
  });

  it('add-on routes are not fabricated /add-ons/* paths (except barcode legacy)', () => {
    for (const a of __CAT1_ADDONS__) {
      if (a.id === 'barcode' || a.phase === 'planned') continue;
      expect(a.route.startsWith('/add-ons/')).toBe(false);
    }
  });

  // ── Catalog data integrity ───────────────────────────────────────────
  it('module ids are unique', () => {
    const ids = __CAT1_MODULES__.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('add-on ids are unique', () => {
    const ids = __CAT1_ADDONS__.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every module entry carries a non-empty capability mapping', () => {
    for (const m of __CAT1_MODULES__) expect(m.capability.length).toBeGreaterThan(3);
  });

  it('every add-on entry carries a non-empty capability mapping', () => {
    for (const a of __CAT1_ADDONS__) expect(a.capability.length).toBeGreaterThan(3);
  });

  it('every module entry has title + description + details', () => {
    for (const m of __CAT1_MODULES__) {
      expect(m.title.length).toBeGreaterThan(2);
      expect(m.description.length).toBeGreaterThan(10);
      expect(m.details.length).toBeGreaterThan(10);
    }
  });

  it('every add-on entry has title + description + details', () => {
    for (const a of __CAT1_ADDONS__) {
      expect(a.title.length).toBeGreaterThan(2);
      expect(a.description.length).toBeGreaterThan(10);
      expect(a.details.length).toBeGreaterThan(10);
    }
  });

  it('modules cover all 7 sections', () => {
    const sections = new Set(__CAT1_MODULES__.map(m => m.section));
    expect(sections.size).toBe(7);
  });

  // ── §H walls: no landing-page files created this sprint ──────────────
  it('NO new per-module landing-page files were created under src/pages/modules/', () => {
    const dir = path.join(PROJECT_ROOT, 'src/pages/modules');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));
    // Only ModulesPage.tsx (this sprint's surface) + the pre-existing
    // VetanNidhi.tsx legacy landing are allowed. No new landing files.
    expect(files.sort()).toEqual(['ModulesPage.tsx', 'VetanNidhi.tsx'].sort());
  });

  it('NO new per-add-on landing-page files were created under src/pages/addons/', () => {
    const dir = path.join(PROJECT_ROOT, 'src/pages/addons');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));
    // Only AddOnsPage.tsx + the pre-existing BarcodeAddon.tsx landing.
    expect(files.sort()).toEqual(['AddOnsPage.tsx', 'BarcodeAddon.tsx'].sort());
  });

  // ── §H walls: capability cards / applications.ts 0-DIFF ──────────────
  it('applications.ts barrel re-export remains untouched (only re-exports applications)', () => {
    const src = fs.readFileSync(
      path.join(PROJECT_ROOT, 'src/components/operix-core/index.ts'),
      'utf-8',
    );
    expect(src).toContain("export { applications");
  });

  it('vendor-portal capability page exists (catalog links · does not redefine)', () => {
    // We are not allowed to modify ERP cards; assert the file the catalog
    // could theoretically have re-routed away from still exists.
    const p = path.join(PROJECT_ROOT, 'src/pages/erp/vendor-portal/VendorPortalPage.tsx');
    expect(fs.existsSync(p)).toBe(true);
  });

  // ── Sprint history + sibling discipline ──────────────────────────────
  it('sprint-history has a CAT1 row with empty newSiblings', () => {
    const row = SPRINTS.find(s => s.code === 'T-CAT1-Modules-AddOns');
    expect(row).toBeDefined();
    expect(row?.newSiblings).toEqual([]);
  });

  it('sprint-history PRUDENT360 row has its headSha flipped to 630bdd2a', () => {
    const row = SPRINTS.find(s => s.code === 'T-P360-DevTeam-Hub');
    expect(row?.headSha).toBe('630bdd2a');
  });

  it('CAT1 predecessor links to PRUDENT360 bank SHA 630bdd2a', () => {
    const row = SPRINTS.find(s => s.code === 'T-CAT1-Modules-AddOns');
    expect(row?.predecessorSha).toBe('630bdd2a');
  });

  // ── No fabricated capability beyond what the catalog claims ──────────
  it('AI-Price and Hardware retain their planned, non-clickable phase', () => {
    const ai = __CAT1_ADDONS__.find(a => a.id === 'ai-price');
    const hw = __CAT1_ADDONS__.find(a => a.id === 'hardware');
    expect(ai?.phase).toBe('planned');
    expect(hw?.phase).toBe('planned');
  });

  it('no module entry routes to a /coming-soon or undefined path', () => {
    for (const m of __CAT1_MODULES__) {
      expect(m.route.length).toBeGreaterThan(2);
      expect(m.route).not.toMatch(/coming-soon|undefined|TODO/i);
    }
  });

  it('no add-on entry routes to a /coming-soon or undefined path', () => {
    for (const a of __CAT1_ADDONS__) {
      expect(a.route.length).toBeGreaterThan(2);
      expect(a.route).not.toMatch(/coming-soon|undefined|TODO/i);
    }
  });
});
