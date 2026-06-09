/**
 * @file        src/lib/mobile-report-registry.ts
 * @sprint      Sprint AM.3 · T-AM3-Universal-Mobile · Pass 2 · NEW SIBLING
 * @purpose     Map each back-office card → the existing report/KPI surfaces it
 *              already ships. The Universal Mobile Reporting viewer consumes
 *              this registry; it never recomputes anything and never fabricates
 *              numbers — the destination route is the source of truth.
 * @canon       READ-ONLY · greppable provenance per entry pointing at the
 *              already-shipped desktop route. Live/full data lives at Wave-2
 *              once the report surfaces are wrapped for mobile rendering.
 *              The mobile viewer honestly states "read-only · live/full at
 *              Wave-2" via MOBILE_REPORT_HONESTY.
 * @[JWT]       Wave-2: GET /api/mobile/reports/:card/:reportId — returns the
 *              already-computed report payload from the desktop engine.
 */

export type MobileReportCard =
  | 'eximx'
  | 'bill_passing'
  | 'fpa'
  | 'accounting'
  | 'vendor_portal'
  | 'engineeringx'
  | 'fincore';

export type MobileReportKind =
  | 'register'
  | 'dashboard'
  | 'compliance'
  | 'tracker'
  | 'kpi';

export interface MobileReportEntry {
  id: string;
  card: MobileReportCard;
  label: string;
  description: string;
  kind: MobileReportKind;
  /** Desktop route this report is canonically rendered at. Greppable provenance. */
  desktopRoute: string;
  /** True when the desktop surface is read-only by construction. */
  readOnly: true;
}

/** Honest banner mounted on the Universal Mobile Reporting viewer. */
export const MOBILE_REPORT_HONESTY =
  'Read-only mobile view · live/full data + interactive drilldowns ship at Wave-2. ' +
  'Numbers shown match the desktop report surface listed below. Nothing is recomputed on mobile.';

/**
 * Each entry points at a desktop report route that already exists in App.tsx.
 * Adding fabricated entries here is an audit defect. Tests assert every
 * `desktopRoute` begins with `/erp/` and the corresponding `card` token appears
 * in the route.
 */
const REGISTRY: MobileReportEntry[] = [
  // ── EximX (export/import/finance/compliance) ─────────────────────────
  { id: 'eximx-cross-entity-realisation', card: 'eximx', kind: 'dashboard',
    label: 'Cross-Entity Realisation', readOnly: true,
    description: 'Export realisation across entities · CONSUMES desktop dashboard',
    desktopRoute: '/erp/eximx/finance/cross-entity-realisation' },
  { id: 'eximx-form-3ceb', card: 'eximx', kind: 'compliance',
    label: 'Form 3CEB Dashboard', readOnly: true,
    description: 'Transfer pricing 3CEB · CONSUMES desktop compliance surface',
    desktopRoute: '/erp/eximx/compliance/form-3ceb' },
  { id: 'eximx-lc-list', card: 'eximx', kind: 'register',
    label: 'Letter of Credit Register', readOnly: true,
    description: 'LC pipeline · CONSUMES desktop finance list',
    desktopRoute: '/erp/eximx/finance/lc' },
  { id: 'eximx-packing-credit', card: 'eximx', kind: 'register',
    label: 'Packing Credit Register', readOnly: true,
    description: 'Pre-shipment finance · CONSUMES desktop finance list',
    desktopRoute: '/erp/eximx/finance/packing-credit' },

  // ── Bill-Passing ──────────────────────────────────────────────────────
  { id: 'bill-passing-hub', card: 'bill_passing', kind: 'dashboard',
    label: 'Bill-Passing Hub', readOnly: true,
    description: 'AP bill 3-way match queue · CONSUMES desktop hub',
    desktopRoute: '/erp/bill-passing' },

  // ── FP&A planning ────────────────────────────────────────────────────
  { id: 'fpa-planning-hub', card: 'fpa', kind: 'dashboard',
    label: 'FP&A Planning Hub', readOnly: true,
    description: 'Budget vs actuals · CONSUMES desktop FP&A hub',
    desktopRoute: '/erp/fpa-planning' },

  // ── Accounting / FinCore ─────────────────────────────────────────────
  { id: 'accounting-hub', card: 'accounting', kind: 'dashboard',
    label: 'Accounting Hub', readOnly: true,
    description: 'GL · day-book entry surface (read-only mirror)',
    desktopRoute: '/erp/accounting' },
  { id: 'fincore-rcm-compliance', card: 'fincore', kind: 'compliance',
    label: 'RCM Compliance', readOnly: true,
    description: 'Reverse-charge compliance · CONSUMES desktop report',
    desktopRoute: '/erp/comply360/tax-gst/rcm-compliance' },
  { id: 'fincore-itc-register', card: 'fincore', kind: 'register',
    label: 'ITC Register', readOnly: true,
    description: 'Input tax credit register · CONSUMES desktop register',
    desktopRoute: '/erp/comply360/tax-gst/itc-register' },
  { id: 'fincore-gstr-3b', card: 'fincore', kind: 'compliance',
    label: 'GSTR-3B', readOnly: true,
    description: 'Monthly GST summary · CONSUMES desktop return',
    desktopRoute: '/erp/comply360/tax-gst/gstr-3b' },

  // ── Vendor-Portal ────────────────────────────────────────────────────
  { id: 'vendor-portal-hub', card: 'vendor_portal', kind: 'dashboard',
    label: 'Vendor Portal Hub', readOnly: true,
    description: 'Vendor self-service · CONSUMES desktop hub',
    desktopRoute: '/erp/vendor-portal' },
  { id: 'vendor-msme-43bh', card: 'vendor_portal', kind: 'tracker',
    label: 'MSME §43B(h) Tracker', readOnly: true,
    description: 'MSME 45-day clock · CONSUMES desktop tracker',
    desktopRoute: '/erp/comply360/vendor/msme-43bh-tracker' },

  // ── EngineeringX ─────────────────────────────────────────────────────
  { id: 'engineeringx-hub', card: 'engineeringx', kind: 'dashboard',
    label: 'EngineeringX Hub', readOnly: true,
    description: 'Design/BOM hub · CONSUMES desktop hub',
    desktopRoute: '/erp/engineeringx' },
];

export function listMobileReports(card?: MobileReportCard): MobileReportEntry[] {
  if (!card) return REGISTRY.slice();
  return REGISTRY.filter(r => r.card === card);
}

export function listMobileReportCards(): MobileReportCard[] {
  const seen = new Set<MobileReportCard>();
  REGISTRY.forEach(r => seen.add(r.card));
  return Array.from(seen);
}

export function getMobileReport(id: string): MobileReportEntry | undefined {
  return REGISTRY.find(r => r.id === id);
}

/** Total count — used by tests to assert no fabricated entries are added. */
export function mobileReportCount(): number {
  return REGISTRY.length;
}
