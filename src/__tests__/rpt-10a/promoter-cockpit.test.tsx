/**
 * @file        promoter-cockpit.test.tsx
 * @sprint      RPT-10a · Block 2 · PromoterCockpitPage page test
 * @strategy    Source-text + structural assertions (consistent with
 *              RPT-9b/9c/9d/9e mount tests). The frozen primitives the
 *              cockpit composes (ReportChart · ScorecardTile · deriveRoleDashboard
 *              · signReport) have their own unit tests.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const read = (p: string): string => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('RPT-10a · PromoterCockpitPage', () => {
  const src = read('src/features/command-center/pages/PromoterCockpitPage.tsx');
  const app = read('src/App.tsx');
  const cc  = read('src/apps/erp/configs/command-center-sidebar-config.ts');

  it('page file exists and exports default component', () => {
    expect(src).toMatch(/export default function PromoterCockpitPage/);
  });

  it('composes FROZEN primitives only (ReportChart · ScorecardTile)', () => {
    expect(src).toContain('ReportChart');
    expect(src).toContain('ScorecardTile');
    expect(src).toContain('@/components/operix-core/report-framework');
  });

  it('uses deriveRoleDashboard for management-layer Org KPIs', () => {
    expect(src).toContain('deriveRoleDashboard');
    expect(src).toMatch(/'tenant_admin',\s*'management'/);
  });

  it('renders all 4 sections (Org · Cash & AR · Compliance · Ops pulse)', () => {
    expect(src).toContain('cockpit-section-org-kpis');
    expect(src).toContain('cockpit-section-cash-ar');
    expect(src).toContain('cockpit-section-compliance');
    expect(src).toContain('cockpit-section-ops-pulse');
  });

  it('reads real DSC sources (no synthetic data)', () => {
    expect(src).toContain("'receivx.ar'");
    expect(src).toContain("'comply360.aggregate.compliance-pct'");
    expect(src).toContain("'production.orders'");
    expect(src).toContain("'dispatch.shipments'");
  });

  it('integrity badge per section via signReport', () => {
    expect(src).toContain('signReport');
    expect(src).toContain('IntegrityBadge');
  });

  it('honest empty-state per section (no synthetic fallback)', () => {
    expect(src).toContain('EmptyState');
    expect(src).toContain('No data yet');
  });

  it('auto-cycles ~12s and pauses on click/key interaction', () => {
    expect(src).toContain('SECTION_MS');
    expect(src).toMatch(/12_000/);
    expect(src).toContain('setPaused');
    expect(src).toContain("addEventListener('keydown'");
    expect(src).toContain('onClick={togglePause}');
  });

  it('route wired at /erp/command-center/promoter', () => {
    expect(app).toContain('PromoterCockpitPage');
    expect(app).toContain('/erp/command-center/promoter');
  });

  it('CC sidebar carries "Promoter Cockpit" entry', () => {
    expect(cc).toContain('Promoter Cockpit');
    expect(cc).toContain('/erp/command-center/promoter');
  });
});
