/**
 * @file        src/lib/_institutional/sibling-register.ts
 * @purpose     Source-of-truth register for the 36 institutional SIBLING engines
 * @sprint      T-Phase-3.HK-D14-InstitutionalRegisters
 * @disciplines NOT FR-19 SIBLING · institutional reference data (sui generis category)
 *              Reading-only by domain code · curated by founder + auditor only
 *              Backfill batch for entries 1-29 scheduled in Sprint 61.HK
 */

export interface SiblingEntry {
  id: string;
  name: string;
  path: string | null;
  sprintAdded: number | null;
  compositeAdded: number | null;
  functionCount: number | null;
  moatsRealized: string[];
  provenance: 'CONFIRMED' | 'PENDING_BACKFILL';
}

const PENDING = (n: number): SiblingEntry => ({
  id: `sibling-${String(n).padStart(2, '0')}-pending`,
  name: 'PENDING_BACKFILL',
  path: null,
  sprintAdded: null,
  compositeAdded: null,
  functionCount: null,
  moatsRealized: [],
  provenance: 'PENDING_BACKFILL',
});

export const SIBLINGS: SiblingEntry[] = [
  // ── Entries 1-24 · PENDING BACKFILL in Sprint 61.HK ──────────────────────
  ...Array.from({ length: 24 }, (_, i) => PENDING(i + 1)),
  // ── Entry 25 · KB-confirmed (FR-90 known #25) ────────────────────────────
  {
    id: 'sample-expense-voucher-engine',
    name: 'Sample Expense Voucher Engine',
    path: 'src/lib/sample-expense-voucher-engine.ts',
    sprintAdded: 46,
    compositeAdded: 51,
    functionCount: null,
    moatsRealized: [],
    provenance: 'PENDING_BACKFILL',
  },
  // ── Entries 26-29 · PENDING (between Sprint 47-HK6) ──────────────────────
  ...Array.from({ length: 4 }, (_, i) => ({
    ...PENDING(i + 26),
    name: 'PENDING_BACKFILL · between Sprint 47-HK6',
  })),
  // ── Entries 30-36 · CONFIRMED · v2 era Phase 3 Production Arc ────────────
  {
    id: 'sales-production-bridge',
    name: 'Sales-Production Bridge',
    path: 'src/lib/sales-production-bridge.ts',
    sprintAdded: 55,
    compositeAdded: 55,
    functionCount: 12,
    moatsRealized: ['MOAT-29'],
    provenance: 'CONFIRMED',
  },
  {
    id: 'iot-machine-bridge',
    name: 'IoT Machine Bridge',
    path: 'src/lib/iot-machine-bridge.ts',
    sprintAdded: 59,
    compositeAdded: 59,
    functionCount: 30,
    moatsRealized: ['MOAT-31'],
    provenance: 'CONFIRMED',
  },
  {
    id: 'process-batch-engine',
    name: 'Process Batch Engine',
    path: 'src/lib/process-batch-engine.ts',
    sprintAdded: 60,
    compositeAdded: 60,
    functionCount: 15,
    moatsRealized: [],
    provenance: 'CONFIRMED',
  },
  {
    id: 'recipe-formula-engine',
    name: 'Recipe Formula Engine',
    path: 'src/lib/recipe-formula-engine.ts',
    sprintAdded: 60,
    compositeAdded: 60,
    functionCount: 11,
    moatsRealized: [],
    provenance: 'CONFIRMED',
  },
  {
    id: 'spc-quality-engine',
    name: 'SPC Quality Engine',
    path: 'src/lib/spc-quality-engine.ts',
    sprintAdded: 60,
    compositeAdded: 60,
    functionCount: 9,
    moatsRealized: [],
    provenance: 'CONFIRMED',
  },
  {
    id: 'process-genealogy-engine',
    name: 'Process Genealogy Engine',
    path: 'src/lib/process-genealogy-engine.ts',
    sprintAdded: 60,
    compositeAdded: 60,
    functionCount: 8,
    moatsRealized: [],
    provenance: 'CONFIRMED',
  },
  {
    id: 'tank-flow-inventory-engine',
    name: 'Tank Flow Inventory Engine',
    path: 'src/lib/tank-flow-inventory-engine.ts',
    sprintAdded: 60,
    compositeAdded: 60,
    functionCount: 9,
    moatsRealized: [],
    provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 61 PROD-4 PASS 1 · 37th SIBLING · AI-driven demand forecast (CAP-26)
  {
    id: 'demand-forecast-engine',
    name: 'Demand Forecast Engine',
    path: 'src/lib/demand-forecast-engine.ts',
    sprintAdded: 61,
    compositeAdded: 61,
    functionCount: 11,
    moatsRealized: ['MOAT-35'],
    provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 62 PROD-4.5 · 38th SIBLING · 21 CFR Part 11 Engine (CAP-28)
  {
    id: 'cfr-part-11-engine',
    name: '21 CFR Part 11 Engine',
    path: 'src/lib/cfr-part-11-engine.ts',
    sprintAdded: 62,
    compositeAdded: 62,
    functionCount: 9,
    moatsRealized: ['MOAT-37'],
    provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 63 PROD-5 · 39th SIBLING · Carbon Planning Engine (CAP-27 · MOAT-38) · ⭐ PHASE 3 v2 CLOSES
  {
    id: 'carbon-planning-engine',
    name: 'Carbon Planning Engine',
    path: 'src/lib/carbon-planning-engine.ts',
    sprintAdded: 63,
    compositeAdded: 63,
    functionCount: 8,
    moatsRealized: ['MOAT-38'],
    provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 65 FAR-1 · 40th SIBLING · CARO 2020 Engine (MOAT-39)
  {
    id: 'caro-2020-engine',
    name: 'CARO 2020 Engine',
    path: 'src/lib/caro-2020-engine.ts',
    sprintAdded: 65,
    compositeAdded: 65,
    functionCount: 7,
    moatsRealized: ['MOAT-39'],
    provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 65 FAR-1 · 41st SIBLING · Ind AS 116 Lease Engine (FAR-CAP-9)
  {
    id: 'ind-as-116-lease-engine',
    name: 'Ind AS 116 Lease Engine',
    path: 'src/lib/ind-as-116-lease-engine.ts',
    sprintAdded: 65,
    compositeAdded: 65,
    functionCount: 6,
    moatsRealized: [],
    provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 65 FAR-1 · 42nd SIBLING · EPCG FA Bridge (FAR-CAP-11 · MOAT-41)
  {
    id: 'epcg-fa-bridge',
    name: 'EPCG FA Bridge',
    path: 'src/lib/epcg-fa-bridge.ts',
    sprintAdded: 65,
    compositeAdded: 65,
    functionCount: 5,
    moatsRealized: ['MOAT-41'],
    provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 66 FAR-2 · 43rd SIBLING · Vehicle FA Bridge (FAR-CAP-15 · MOAT-44)
  {
    id: 'vehicle-fa-bridge',
    name: 'Vehicle FA Bridge',
    path: 'src/lib/vehicle-fa-bridge.ts',
    sprintAdded: 66,
    compositeAdded: 66,
    functionCount: 5,
    moatsRealized: ['MOAT-44'],
    provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 67 FAR-3 · 44th/45th/46th SIBLINGs · Compute Engine trio
  {
    id: 'multi-gaap-depreciation-engine',
    name: 'Multi-GAAP Depreciation Engine',
    path: 'src/lib/multi-gaap-depreciation-engine.ts',
    sprintAdded: 67, compositeAdded: 67, functionCount: 3,
    moatsRealized: ['MOAT-45'], provenance: 'CONFIRMED',
  },
  {
    id: 'uop-depreciation-engine',
    name: 'UOP Depreciation Engine',
    path: 'src/lib/uop-depreciation-engine.ts',
    sprintAdded: 67, compositeAdded: 67, functionCount: 5,
    moatsRealized: ['MOAT-46'], provenance: 'CONFIRMED',
  },
  {
    id: 'component-depreciation-engine',
    name: 'Component Depreciation Engine',
    path: 'src/lib/component-depreciation-engine.ts',
    sprintAdded: 67, compositeAdded: 67, functionCount: 2,
    moatsRealized: ['MOAT-47'], provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 68 FAR-4 · 47th-54th SIBLINGs · AI + Document AI + IoT + RFID + PM + BRSR + Audit + InsightX
  { id: 'ai-fa-classification-engine', name: 'AI FA Classification Engine', path: 'src/lib/ai-fa-classification-engine.ts', sprintAdded: 68, compositeAdded: 68, functionCount: 4, moatsRealized: ['MOAT-48'], provenance: 'CONFIRMED' },
  { id: 'document-ai-fa-engine', name: 'Document AI FA Engine', path: 'src/lib/document-ai-fa-engine.ts', sprintAdded: 68, compositeAdded: 68, functionCount: 4, moatsRealized: ['MOAT-50'], provenance: 'CONFIRMED' },
  { id: 'iot-asset-bridge', name: 'IoT Asset Bridge', path: 'src/lib/iot-asset-bridge.ts', sprintAdded: 68, compositeAdded: 68, functionCount: 5, moatsRealized: ['MOAT-49'], provenance: 'CONFIRMED' },
  { id: 'rfid-asset-bridge', name: 'RFID Asset Bridge', path: 'src/lib/rfid-asset-bridge.ts', sprintAdded: 68, compositeAdded: 68, functionCount: 6, moatsRealized: ['MOAT-49'], provenance: 'CONFIRMED' },
  { id: 'predictive-maintenance-fa-engine', name: 'Predictive Maintenance FA Engine', path: 'src/lib/predictive-maintenance-fa-engine.ts', sprintAdded: 68, compositeAdded: 68, functionCount: 4, moatsRealized: ['MOAT-51'], provenance: 'CONFIRMED' },
  { id: 'brsr-fa-engine', name: 'BRSR FA Engine', path: 'src/lib/brsr-fa-engine.ts', sprintAdded: 68, compositeAdded: 68, functionCount: 3, moatsRealized: ['MOAT-52'], provenance: 'CONFIRMED' },
  { id: 'fa-audit-trail-engine', name: 'FA Audit Trail Engine', path: 'src/lib/fa-audit-trail-engine.ts', sprintAdded: 68, compositeAdded: 68, functionCount: 4, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'insightx-fa-staging-engine', name: 'InsightX FA Staging Engine', path: 'src/lib/insightx-fa-staging-engine.ts', sprintAdded: 68, compositeAdded: 68, functionCount: 5, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 69 T-Phase-5.A.1.1 · Comply360 Main Arc 1.1 · 2 NEW SIBLINGs · DP-S69-3 (Health Score) + OOB-5 (Statutory Memory) · A with adaptations ⭐ · 16-streak
  { id: 'comply360-health-score-engine', name: 'Comply360 Health Score Engine', path: 'src/lib/comply360-health-score-engine.ts', sprintAdded: 69, compositeAdded: 69, functionCount: 7, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-statutory-memory', name: 'Comply360 Statutory Memory', path: 'src/lib/comply360-statutory-memory.ts', sprintAdded: 69, compositeAdded: 69, functionCount: 3, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 70a T-Phase-5.A.1.2-PASS-A · Comply360 Main Arc 1.2 · 3 NEW SIBLINGs · DP-S70-1/2/3 (GST aggregator + GSTR builder + IMS) · A first-pass-clean ⭐ · 17-streak NEW RECORD
  { id: 'comply360-gst-aggregator-engine', name: 'Comply360 GST Aggregator Engine', path: 'src/lib/comply360-gst-aggregator-engine.ts', sprintAdded: 70, compositeAdded: 70, functionCount: 6, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-gstr-builder-engine', name: 'Comply360 GSTR Builder Engine', path: 'src/lib/comply360-gstr-builder-engine.ts', sprintAdded: 70, compositeAdded: 70, functionCount: 6, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-ims-engine', name: 'Comply360 IMS Engine', path: 'src/lib/comply360-ims-engine.ts', sprintAdded: 70, compositeAdded: 70, functionCount: 5, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 70b T-Phase-5.A.1.2-PASS-B · Comply360 Main Arc 1.2 · 2 NEW SIBLINGs (multi-GSTIN hook + tax-gst tab-shell · PATTERN-S70b-NAVIGATION-CANONICAL) · A with adaptations ⭐ · 18-streak NEW RECORD
  { id: 'use-entity-gstins-hook', name: 'useEntityGSTINs Multi-GSTIN Hook', path: 'src/hooks/useEntityGSTINs.ts', sprintAdded: 70, compositeAdded: 70, functionCount: 1, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-tax-gst-shell', name: 'Comply360 Tax-GST Tab Shell (canonical nav pattern)', path: 'src/pages/erp/comply360/tax-gst/TaxGstPage.tsx', sprintAdded: 70, compositeAdded: 70, functionCount: 1, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 71 T-Phase-5.A.1.3 · Comply360 Main Arc 1.3 · 2 NEW SIBLINGs (tax-tolerance engine + ECRS engine) · GSTR-3B builder extended in place
  { id: 'comply360-tax-tolerance-engine', name: 'Comply360 Tax Tolerance Engine', path: 'src/lib/comply360-tax-tolerance-engine.ts', sprintAdded: 71, compositeAdded: 71, functionCount: 4, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-ecrs-engine', name: 'Comply360 ECRS Engine', path: 'src/lib/comply360-ecrs-engine.ts', sprintAdded: 71, compositeAdded: 71, functionCount: 4, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 72 T-Phase-5.A.1.4 · Comply360 Main Arc 1.4 · 4 NEW SIBLINGs · NATIVE TDS suite (194Q + 194-O + SFT + Form 26AS reco) · 24th `tds` mega-menu (Option C) · A first-pass-clean ⭐ · 20-streak NEW RECORD
  { id: 'comply360-tds-aggregator-engine', name: 'Comply360 TDS Aggregator Engine', path: 'src/lib/comply360-tds-aggregator-engine.ts', sprintAdded: 72, compositeAdded: 72, functionCount: 5, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-tds-194q-engine', name: 'Comply360 TDS 194Q / 194-O Engine', path: 'src/lib/comply360-tds-194q-engine.ts', sprintAdded: 72, compositeAdded: 72, functionCount: 4, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-sft-engine', name: 'Comply360 SFT Engine', path: 'src/lib/comply360-sft-engine.ts', sprintAdded: 72, compositeAdded: 72, functionCount: 3, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-form26as-reco-engine', name: 'Comply360 Form 26AS Reconciliation Engine', path: 'src/lib/comply360-form26as-reco-engine.ts', sprintAdded: 72, compositeAdded: 72, functionCount: 4, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 73a T-Phase-5.A.1.5-PASS-A · Comply360 Main Arc 1.5 · Pass A · 4 NEW SIBLINGs (e-invoice aggregator + e-way + MSME Form 1 + Section 393) · Path α split · A first-pass-clean ⭐ · 21-streak NEW RECORD
  { id: 'comply360-einvoice-aggregator-engine', name: 'Comply360 E-Invoice Aggregator Engine', path: 'src/lib/comply360-einvoice-aggregator-engine.ts', sprintAdded: 73, compositeAdded: 73, functionCount: 5, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-eway-engine', name: 'Comply360 E-Way Bill Engine', path: 'src/lib/comply360-eway-engine.ts', sprintAdded: 73, compositeAdded: 73, functionCount: 5, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-msme-form1-engine', name: 'Comply360 MSME Form 1 Engine', path: 'src/lib/comply360-msme-form1-engine.ts', sprintAdded: 73, compositeAdded: 73, functionCount: 4, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-section393-engine', name: 'Comply360 Section 393 Arrangements Engine', path: 'src/lib/comply360-section393-engine.ts', sprintAdded: 73, compositeAdded: 73, functionCount: 4, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 74a T-Phase-5.A.1.6-PASS-A · Comply360 Main Arc 1.6 · Pass A · 2 NEW SIBLINGs (gstr9-reco + tax-audit-3cd · 3CD reads caro-2020 §Y frozen) · Q19 annual returns + tax audit · 23-streak NEW RECORD ⭐
  { id: 'comply360-gstr9-reco-engine', name: 'Comply360 GSTR-9C Reconciliation Engine', path: 'src/lib/comply360-gstr9-reco-engine.ts', sprintAdded: 74, compositeAdded: 74, functionCount: 4, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-tax-audit-3cd-engine', name: 'Comply360 Tax Audit 3CA/3CB/3CD Engine', path: 'src/lib/comply360-tax-audit-3cd-engine.ts', sprintAdded: 74, compositeAdded: 74, functionCount: 5, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 74b T-Phase-5.A.1.6-PASS-B · Comply360 Main Arc 1.6 · Pass B · 2 NEW SIBLINGs (form16-engine reads S72 tds-aggregator 0-DIFF + tds-notice-engine) · Q20 Form 16/16A + TDS notice · Main Arc 1.6 COMPLETE · target 24-streak NEW RECORD ⭐
  { id: 'comply360-form16-engine', name: 'Comply360 Form 16 / 16A Engine', path: 'src/lib/comply360-form16-engine.ts', sprintAdded: 74, compositeAdded: 74, functionCount: 5, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-tds-notice-engine', name: 'Comply360 TDS Notice / Demand Engine', path: 'src/lib/comply360-tds-notice-engine.ts', sprintAdded: 74, compositeAdded: 74, functionCount: 5, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 76a T-Phase-5.A.1.8-PASS-A · Comply360 Main Arc 1.8 · Q28 Part 2 · Pass A (engines) · 4 NEW SIBLINGs (tcs-27eq + ewb02-consolidation + stamp-duty + itr6) · ITC-04/REG-01/REG-31 = builder extensions (NOT SIBLINGs) · tds-aggregator + eway-engine read-only 0-DIFF · target 26-streak NEW RECORD ⭐
  { id: 'comply360-tcs-27eq-engine', name: 'Comply360 TCS 27EQ Engine', path: 'src/lib/comply360-tcs-27eq-engine.ts', sprintAdded: 76, compositeAdded: 76, functionCount: 4, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-ewb02-consolidation-engine', name: 'Comply360 EWB-02 Consolidation Engine', path: 'src/lib/comply360-ewb02-consolidation-engine.ts', sprintAdded: 76, compositeAdded: 76, functionCount: 3, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-stamp-duty-engine', name: 'Comply360 Stamp Duty Engine', path: 'src/lib/comply360-stamp-duty-engine.ts', sprintAdded: 76, compositeAdded: 76, functionCount: 4, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-itr6-engine', name: 'Comply360 ITR-6 Engine', path: 'src/lib/comply360-itr6-engine.ts', sprintAdded: 76, compositeAdded: 76, functionCount: 4, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 77a T-Phase-5.A.1.9-PASS-A · Comply360 Main Arc 1.9 · Pass A (engines) · 4 NEW SIBLINGs spanning 6 regimes (schedule-m greenfield · brsr-comprehensive reads brsr-fa 0-DIFF · caro-extended reads caro-2020 §Y FROZEN 0-DIFF · transfer-pricing reads form-3ceb + form-15ca-15cb 0-DIFF) · target 28-streak NEW RECORD ⭐
  { id: 'comply360-schedule-m-engine', name: 'Comply360 Schedule M (Pharma GMP) Engine', path: 'src/lib/comply360-schedule-m-engine.ts', sprintAdded: 77, compositeAdded: 77, functionCount: 5, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-brsr-comprehensive-engine', name: 'Comply360 BRSR Comprehensive (9-Principle) Engine', path: 'src/lib/comply360-brsr-comprehensive-engine.ts', sprintAdded: 77, compositeAdded: 77, functionCount: 5, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-caro-extended-engine', name: 'Comply360 CARO Extended (Paragraph 3 ii-xxi) Engine', path: 'src/lib/comply360-caro-extended-engine.ts', sprintAdded: 77, compositeAdded: 77, functionCount: 5, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-transfer-pricing-engine', name: 'Comply360 Transfer Pricing (Master File + CbCR + Equalisation Levy) Engine', path: 'src/lib/comply360-transfer-pricing-engine.ts', sprintAdded: 77, compositeAdded: 77, functionCount: 6, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 78a T-Phase-5.A.1.10-PASS-A · Comply360 Main Arc 1.10 · Pass A (5 NEW · forward-extensible Floor 2-4 APIs)
  { id: 'comply360-msme-aggregator-engine', name: 'Comply360 MSME Aggregator (Q9 · 43Bh + Form 1 + OOB-8 ApprovalRisk)', path: 'src/lib/comply360-msme-aggregator-engine.ts', sprintAdded: 78, compositeAdded: 78, functionCount: 3, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-audit-trail-aggregator-engine', name: 'Comply360 Audit Trail Aggregator (Q10 · registry · entity-agnostic snapshots)', path: 'src/lib/comply360-audit-trail-aggregator-engine.ts', sprintAdded: 78, compositeAdded: 78, functionCount: 5, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-calendar-engine', name: 'Comply360 Calendar (Q11 · 80+ statutory dates · pluggable obligation sources)', path: 'src/lib/comply360-calendar-engine.ts', sprintAdded: 78, compositeAdded: 78, functionCount: 4, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-time-machine-engine', name: 'Comply360 Time Machine (Q16 · forensic replay · entity-agnostic)', path: 'src/lib/comply360-time-machine-engine.ts', sprintAdded: 78, compositeAdded: 78, functionCount: 3, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-statutory-payments-engine', name: 'Comply360 Statutory Payments Hub (PMT · register + auto-compute + challan-prep stub)', path: 'src/lib/comply360-statutory-payments-engine.ts', sprintAdded: 78, compositeAdded: 78, functionCount: 4, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 79a T-Phase-5.A.1.11-PASS-A · Comply360 Main Arc 1.11 · Pass A · 3 NEW SIBLINGs (challan-vault · licenses-registry · esg-aggregator) · FK-CAP-7 reads · Floor-1 finale
  { id: 'comply360-challan-vault-engine', name: 'Comply360 Challan Vault Engine (Q24 · stores executed challans · OCR stub · reconciliation)', path: 'src/lib/comply360-challan-vault-engine.ts', sprintAdded: 79, compositeAdded: 79, functionCount: 5, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-licenses-registry-engine', name: 'Comply360 Licenses Registry Engine (Q25 · 13 license types · reads 6 EximX masters)', path: 'src/lib/comply360-licenses-registry-engine.ts', sprintAdded: 79, compositeAdded: 79, functionCount: 5, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-esg-aggregator-engine', name: 'Comply360 ESG/Safety Aggregator Engine (Q26 · reads MaintainPro + SiteX + BRSR)', path: 'src/lib/comply360-esg-aggregator-engine.ts', sprintAdded: 79, compositeAdded: 79, functionCount: 4, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 80a T-Phase-5.B.2.1-PASS-A · Comply360 Floor 2 Audit-Suite OPENS · 2 NEW SIBLINGs (audit-framework · auditor-workspace) · OOB-6/10/12 integrated · target 36-streak ⭐
  { id: 'comply360-audit-framework-engine', name: 'Comply360 Audit Framework (DP-S80-9 · BAP visibility · SA 530 sampling · working papers · findings · FFR · CARO tagging)', path: 'src/lib/comply360-audit-framework-engine.ts', sprintAdded: 80, compositeAdded: 80, functionCount: 14, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-auditor-workspace-engine', name: 'Comply360 Auditor Workspace (OOB-6 · DP-S80-19 · engagement persistence · multi-CA collaboration)', path: 'src/lib/comply360-auditor-workspace-engine.ts', sprintAdded: 80, compositeAdded: 80, functionCount: 7, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 80b T-Phase-5.B.2.1-PASS-B · Comply360 Floor 2 Audit-Suite · Pass B · 2 NEW SIBLINGs (audit-analytics · payroll-audit) · 18 Tally-equivalent procedures + 27 payroll-audit modules across 5 Layers · target 37-streak ⭐
  { id: 'comply360-audit-analytics-engine', name: 'Comply360 Audit Analytics (DP-S80-10/14 · 18 Tally-equivalent analytical procedures · feeds Statutory/Internal/External Audit)', path: 'src/lib/comply360-audit-analytics-engine.ts', sprintAdded: 80, compositeAdded: 80, functionCount: 9, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-payroll-audit-engine', name: 'Comply360 Payroll Audit (DP-S80-2 · Q23 · 27 modules across 5 Layers · reads PayHub types + storage keys via FR-19 boundary)', path: 'src/lib/comply360-payroll-audit-engine.ts', sprintAdded: 80, compositeAdded: 80, functionCount: 5, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 80d T-Phase-5.B.2.1-PASS-D · Comply360 Floor 2 Audit-Suite · Pass D · MCA Rule 11(g) Hardening · 3 NEW SIBLINGs (mca-coverage · audit-retention · audit-continuity) · DP-S80-24/25/26/27 · OOB-8 + 4 MCA-hardening DPs · target 1-streak (post cycle-2 reset · 37 holds as record)
  { id: 'comply360-mca-coverage-engine', name: 'Comply360 MCA Coverage Engine (DP-S80-25 · OOB-14 · Rule 11(g)(b) Universal Coverage Verification · generates MCA_COVERAGE_REPORT.json)', path: 'src/lib/comply360-mca-coverage-engine.ts', sprintAdded: 80, compositeAdded: 80, functionCount: 4, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-audit-retention-engine', name: 'Comply360 Audit Retention Engine (DP-S80-26 · OOB-15 · Rule 11(g)(c) Section 128(5) 8-year preservation · cold-storage export workflow)', path: 'src/lib/comply360-audit-retention-engine.ts', sprintAdded: 80, compositeAdded: 80, functionCount: 5, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-audit-continuity-engine', name: 'Comply360 Audit Continuity Engine (Rule 11(g)(d) operated-throughout-year report · feeds S80f Rule 11(g) Generator)', path: 'src/lib/comply360-audit-continuity-engine.ts', sprintAdded: 80, compositeAdded: 80, functionCount: 3, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 80e T-Phase-5.B.2.1-PASS-E · Comply360 Floor 2 Audit-Suite · Pass E · Headline Differentiator UX · 3 NEW SIBLINGs (audit-replay · cross-card-lineage · audit-ready-score) · OOB-1 + OOB-3 + OOB-7 + OOB-11
  { id: 'comply360-audit-replay-engine', name: 'Comply360 Audit Replay Engine (OOB-3 · cinematic frame-by-frame replay · diffs + downstream impact)', path: 'src/lib/comply360-audit-replay-engine.ts', sprintAdded: 80, compositeAdded: 80, functionCount: 3, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-cross-card-lineage-engine', name: 'Comply360 Cross-Card Lineage Engine (OOB-11 · drill from finding to root-cause across modules)', path: 'src/lib/comply360-cross-card-lineage-engine.ts', sprintAdded: 80, compositeAdded: 80, functionCount: 3, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-audit-ready-score-engine', name: 'Comply360 Audit-Ready Score Engine (OOB-1 · composite 0-100 across 8 sub-scores · band classification)', path: 'src/lib/comply360-audit-ready-score-engine.ts', sprintAdded: 80, compositeAdded: 80, functionCount: 4, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 80f T-Phase-5.B.2.1-PASS-F · Comply360 Floor 2 Audit-Suite FINALE · THE HEADLINE · 2 NEW SIBLINGs (rule-11g-report · nlp-audit-ask-stub) + Rule11gReportPage + AuditorShareLinkPage + OOB-2/4/5/9 + 16 of 16 OOBs · target 3-streak ⭐
  { id: 'comply360-rule-11g-report-engine', name: 'Comply360 Rule 11(g) Report Engine (THE HEADLINE · auto-generates ICAI 4-question audit-readiness report · aggregates 8 S80 engines · CARO Pre-Flight + Audit Calendar Pre-Pop helpers)', path: 'src/lib/comply360-rule-11g-report-engine.ts', sprintAdded: 80, compositeAdded: 80, functionCount: 7, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-nlp-audit-ask-engine', name: 'Comply360 NLP Audit-Ask Engine (OOB-2 · DP-S80-23 · Phase 5 pattern-match stub · S87 promotes to LLM-driven)', path: 'src/lib/comply360-nlp-audit-ask-engine.ts', sprintAdded: 80, compositeAdded: 80, functionCount: 3, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 81a T-Phase-5.B.2.2-PASS-A · Comply360 Floor 2 Internal Audit Arc 2.2 OPENS · 4 NEW SIBLINGs (internal-audit + ia-risk-register + ia-walkthrough + ia-control-testing) · 8 of 12 Q17 modules · target 4-streak ⭐
  { id: 'comply360-internal-audit-engine', name: 'Comply360 Internal Audit Engine (DP-S81-1/DP-S81-2 · master IA workflow · 5 of 12 Q17 modules: Engagement Plan + Audit Universe + Audit Programs Library + Audit Charter + Issue Log · consumes S80a audit-framework + S80a auditor-workspace + S80b audit-analytics)', path: 'src/lib/comply360-internal-audit-engine.ts', sprintAdded: 81, compositeAdded: 81, functionCount: 16, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-ia-risk-register-engine', name: 'Comply360 IA Risk Register Engine (DP-S81-7 · Q17 Module 3 · Risk Register & Heat-Map specialist · separate SIBLING for S82 External Audit independent consumption)', path: 'src/lib/comply360-ia-risk-register-engine.ts', sprintAdded: 81, compositeAdded: 81, functionCount: 6, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-ia-walkthrough-engine', name: 'Comply360 IA Walkthrough Engine (DP-S81-8 · Q17 Module 6 · auto-extracts walkthroughs from audit-trail-aggregator · consumes time-machine reconstructSnapshotAt)', path: 'src/lib/comply360-ia-walkthrough-engine.ts', sprintAdded: 81, compositeAdded: 81, functionCount: 4, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-ia-control-testing-engine', name: 'Comply360 IA Control Testing Engine (DP-S81-9 · Q17 Module 7 · maps controls to S80b procedures · auto-populates S80a working papers)', path: 'src/lib/comply360-ia-control-testing-engine.ts', sprintAdded: 81, compositeAdded: 81, functionCount: 9, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 81c T-Phase-5.B.2.2-PASS-C · Comply360 Floor 2 Internal Audit Arc 2.2 · 3 NEW SIBLINGs (mock-audit-simulator THE HEADLINE + walkthrough-automation + ia-recommendation STUB) · OOB-6 extension · target 6-streak ⭐
  { id: 'comply360-mock-audit-simulator-engine', name: 'Comply360 Mock Audit Simulator Engine (DP-S81-3 · DP-S81-10 · THE OPERATIONALIZATION HEADLINE · OOB-6 extension · Big-4 grade engagement readiness checker · orchestrates 18 analytics + 27 payroll modules + Audit-Ready Score + expected External Auditor questions + likely findings + mock engagement letter)', path: 'src/lib/comply360-mock-audit-simulator-engine.ts', sprintAdded: 81, compositeAdded: 81, functionCount: 8, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-walkthrough-automation-engine', name: 'Comply360 Walkthrough Automation Engine (extends S81a ia-walkthrough · heuristic process-name inference + control-gap detection · batch auto-generation for Mock Audit pre-population)', path: 'src/lib/comply360-walkthrough-automation-engine.ts', sprintAdded: 81, compositeAdded: 81, functionCount: 4, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-ia-recommendation-engine', name: 'Comply360 IA Recommendation Engine (DP-S81-11 · Phase 5 pattern-match STUB · 7 heuristic patterns · S87 promotes to LLM-driven · AI-ready foundation)', path: 'src/lib/comply360-ia-recommendation-engine.ts', sprintAdded: 81, compositeAdded: 81, functionCount: 3, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 81d T-Phase-5.B.2.2-PASS-D · Comply360 Floor 2 Internal Audit Arc 2.2 FINALE · 2 NEW SIBLINGs (sample-engagement-seed · ia-external-handoff) · S81 ARC CLOSES · target 7-streak ⭐
  { id: 'comply360-sample-engagement-seed', name: 'Comply360 Sample Engagement Seed (idempotent demo-ready IA engagement seeder · plan + universe + risks + walkthroughs + control tests + issues)', path: 'src/lib/comply360-sample-engagement-seed.ts', sprintAdded: 81, compositeAdded: 81, functionCount: 6, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-ia-external-handoff-engine', name: 'Comply360 IA → External Audit Handoff Engine (S81 ARC CLOSER · bundles Rule 11(g) + IA summary + Mock Audit + Audit-Ready Score · Quarterly AC Reports · pre-populated External Audit working papers)', path: 'src/lib/comply360-ia-external-handoff-engine.ts', sprintAdded: 81, compositeAdded: 81, functionCount: 5, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 82 T-Phase-5.B.2.3 · Comply360 Floor 2 FINALE · External Audit + Survival Kit + DSC + Legal & Notices · 5 NEW SIBLINGs · FLOOR 2 OFFICIALLY CLOSES · target 8-streak ⭐
  { id: 'comply360-external-audit-engine', name: 'Comply360 External Audit Engine (Q18 · 11 modules · engagement letter + materiality + risk assessment + sampling + final audit pack · consumes S81 IA handoff)', path: 'src/lib/comply360-external-audit-engine.ts', sprintAdded: 82, compositeAdded: 82, functionCount: 11, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-external-confirmation-engine', name: 'Comply360 External Confirmation Engine (debtor/creditor balance confirmations · send/receive/reconcile workflow · SA 505)', path: 'src/lib/comply360-external-confirmation-engine.ts', sprintAdded: 82, compositeAdded: 82, functionCount: 5, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-survival-kit-engine', name: 'Comply360 Survival Kit Engine (OOB-4 · pre-audit readiness toolkit · physical verification checklists + AI-likely-questions + readiness scoring)', path: 'src/lib/comply360-survival-kit-engine.ts', sprintAdded: 82, compositeAdded: 82, functionCount: 6, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-dsc-engine', name: 'Comply360 DSC Engine (Digital Signature Certificate · deterministic hash-based signing stub · registry + sign + verify)', path: 'src/lib/comply360-dsc-engine.ts', sprintAdded: 82, compositeAdded: 82, functionCount: 5, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-legal-notices-engine', name: 'Comply360 Legal & Notices Engine (Q27a · IT/ROC/GST notices · appeals + litigation register + voluntary payments + response templates)', path: 'src/lib/comply360-legal-notices-engine.ts', sprintAdded: 82, compositeAdded: 82, functionCount: 7, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 83 T-Phase-5.C.3.1 · Comply360 Floor 3 ROC-Suite Arc 3.1 OPENS · Q29 Part 1 · 5 NEW SIBLINGs · target 9-streak ⭐ · SPRINT #100 MILESTONE
  { id: 'comply360-dir3-kyc-engine', name: 'Comply360 DIR-3 KYC Engine (DP-S83-1 · Director Master + annual DIR-3 KYC filing · Section 153 · September 30 deadline · DIR-12 resignation + DIN status tracking · Phase 5 draft · Phase 8 MCA portal)', path: 'src/lib/comply360-dir3-kyc-engine.ts', sprintAdded: 83, compositeAdded: 83, functionCount: 13, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-aoc4-engine', name: 'Comply360 AOC-4 Engine (DP-S83-2 · 3 variants: standalone + consolidated + XBRL · Section 137 · 30-day deadline · slab fee · Phase 5 JSON-bundle · Phase 8 iXBRL + MCA portal)', path: 'src/lib/comply360-aoc4-engine.ts', sprintAdded: 83, compositeAdded: 83, functionCount: 10, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-mgt7-engine', name: 'Comply360 MGT-7 Engine (DP-S83-3 · Annual Return · Section 92 · MGT-7 + MGT-7A variants · 60-day deadline · shareholding + board composition + meeting summary)', path: 'src/lib/comply360-mgt7-engine.ts', sprintAdded: 83, compositeAdded: 83, functionCount: 10, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-adt1-engine', name: 'Comply360 ADT-1 Engine (DP-S83-4 · Auditor Appointment · Section 139 · 15-day deadline + ADT-3 Resignation + Cooling-Off tracker + DSC Vault extends S82 dsc-engine via use-site reads)', path: 'src/lib/comply360-adt1-engine.ts', sprintAdded: 83, compositeAdded: 83, functionCount: 11, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-statutory-registers-engine', name: 'Comply360 Statutory Registers Engine (DP-S83-5 · 7 register types: Members + Directors + Charges + Loans + Share Certificates + Sweat Equity + ESOP · append-only with supersedence)', path: 'src/lib/comply360-statutory-registers-engine.ts', sprintAdded: 83, compositeAdded: 83, functionCount: 5, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 84 T-Phase-5.C.3.2 · Comply360 Floor 3 ROC-Suite Arc 3.2 · Q29 Part 2 · 5 NEW SIBLINGs · 10-streak ⭐ target · USE-SITE READ extension applied 5×
  { id: 'comply360-event-filings-engine', name: 'Comply360 Event Filings Engine (DP-S84-1 · 6 event types: MGT-14 + DIR-12 + CHG-1 + CHG-4 + INC-22 + INC-28 · discriminated union · 30-day deadlines · USE-SITE READS S83 dir3-kyc + statutory-registers + adt1)', path: 'src/lib/comply360-event-filings-engine.ts', sprintAdded: 84, compositeAdded: 84, functionCount: 8, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-xbrl-builder-engine', name: 'Comply360 iXBRL Builder Engine (DP-S84-2 · matures S83 AOC-4 XBRL JSON-bundle to iXBRL · Schedule III taxonomy · USE-SITE READ extension of S83 aoc4 · Phase 5 client-side · Phase 8 MCA portal)', path: 'src/lib/comply360-xbrl-builder-engine.ts', sprintAdded: 84, compositeAdded: 84, functionCount: 6, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-schedule-iv-engine', name: 'Comply360 Schedule IV Engine (DP-S84-3 · Code for Independent Directors · Section 149(8) · 7-criteria check + annual declaration · USE-SITE READS S83 dir3-kyc)', path: 'src/lib/comply360-schedule-iv-engine.ts', sprintAdded: 84, compositeAdded: 84, functionCount: 6, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-schedule-v-engine', name: 'Comply360 Schedule V Engine (DP-S84-4 · Managerial Remuneration Parts I-IV · 11% overall + 5%/10% per MD/WTD limits + minimum remuneration slabs · USE-SITE READS S83 dir3-kyc + mgt7)', path: 'src/lib/comply360-schedule-v-engine.ts', sprintAdded: 84, compositeAdded: 84, functionCount: 6, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-schedule-vii-engine', name: 'Comply360 Schedule VII Engine (DP-S84-5 · CSR 11 thematic areas + spend allocation + Section 135 applicability · feeds S85 CSR framework)', path: 'src/lib/comply360-schedule-vii-engine.ts', sprintAdded: 84, compositeAdded: 84, functionCount: 5, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 85 T-Phase-5.C.3.3 · Comply360 Floor 3 ROC-Suite Arc 3.3 · Q29 Part 3 · 4 NEW SIBLINGs + 1 NEW PAGE · OOB-7 FUNCTIONAL · FLOOR 3 CLOSES
  { id: 'comply360-csr-engine', name: 'Comply360 CSR Engine (DP-S85-1 · Section 135 framework · CSR Committee + CSR-1 + CSR-2 + Implementation Agencies · USE-SITE READS S84 schedule-vii)', path: 'src/lib/comply360-csr-engine.ts', sprintAdded: 85, compositeAdded: 85, functionCount: 8, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-meetings-engine', name: 'Comply360 Meetings Engine (DP-S85-4 · AGM + EGM + Board + Committee minutes · discriminated union · USE-SITE READS S83 mgt7)', path: 'src/lib/comply360-meetings-engine.ts', sprintAdded: 85, compositeAdded: 85, functionCount: 6, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-whistleblower-engine', name: 'Comply360 Whistleblower Engine (DP-S85-2 v2 · OOB-7 FUNCTIONAL · Vigil Mechanism Section 177(9) · first-class engine paired with standalone WhistleblowerPage at case whistleblower · complaint intake + investigation + audit committee escalation + anonymous protection)', path: 'src/lib/comply360-whistleblower-engine.ts', sprintAdded: 85, compositeAdded: 85, functionCount: 10, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-cost-audit-engine', name: 'Comply360 Cost Audit Engine (DP-S85-3 · Section 148 · CRA-1/2/3/4 + Cost Auditor appointment + cooling-off + Cost Audit Report)', path: 'src/lib/comply360-cost-audit-engine.ts', sprintAdded: 85, compositeAdded: 85, functionCount: 7, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 86 T-Phase-5.D.4.1 · Comply360 Floor 4 Sector-Pack Arc 4.1 OPENS · Q30 Labour Codes 2026 + POSH + Gig Workers · 3 NEW SIBLINGs + 3 NEW PAGES · target 12-streak ⭐
  { id: 'comply360-labour-codes-engine', name: 'Comply360 Labour Codes 2026 Engine (DP-S86-1 · 4 consolidated codes via discriminated union: Wages + Social Security + Industrial Relations + OSH&WC · provisions registry + compliance tracker + filing draft · USE-SITE READS S80b payroll-audit Layer E)', path: 'src/lib/comply360-labour-codes-engine.ts', sprintAdded: 86, compositeAdded: 86, functionCount: 8, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-posh-engine', name: 'Comply360 POSH Act 2013 Engine (DP-S86-2 · ICC composition Section 4(2) verification · complaint intake + investigation + Section 21 Annual Report · USE-SITE READS S85 meetings + whistleblower)', path: 'src/lib/comply360-posh-engine.ts', sprintAdded: 86, compositeAdded: 86, functionCount: 10, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-gig-workers-engine', name: 'Comply360 Gig Workers Social Security Engine (DP-S86-3 · Code on Social Security 2020 Section 113A/114 · platform aggregator registration + worker enrolment + welfare board contributions 1-2% turnover · USE-SITE READS S80b payroll-audit)', path: 'src/lib/comply360-gig-workers-engine.ts', sprintAdded: 86, compositeAdded: 86, functionCount: 9, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 87 T-Phase-5.D.4.2 · Comply360 Floor 4 Sector-Pack Arc 4.2 CLOSES · Q31 Sector-Specific + Q27b AI Control Center + OOB-2/3/9 · 6 NEW SIBLINGs + 6 NEW PAGES · target 13-streak ⭐
  { id: 'comply360-sector-nbfc-engine', name: 'Comply360 NBFC Sector-Pack Engine (DP-S87-1 · RBI Master Directions · NPA classification (6-class) + ALM 9-bucket + LCR HQLA/outflow)', path: 'src/lib/comply360-sector-nbfc-engine.ts', sprintAdded: 87, compositeAdded: 87, functionCount: 7, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-sector-sebi-lodr-engine', name: 'Comply360 SEBI LODR Sector-Pack Engine (DP-S87-2 · Reg 33 quarterly filings + Reg 49 Audit Committee verification + Reg 30 material disclosures · USE-SITE READS S85 meetings-engine)', path: 'src/lib/comply360-sector-sebi-lodr-engine.ts', sprintAdded: 87, compositeAdded: 87, functionCount: 9, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-sector-rera-engine', name: 'Comply360 RERA Sector-Pack Engine (DP-S87-3 · Real Estate Act 2016 · project registration + Quarterly Progress Report filing)', path: 'src/lib/comply360-sector-rera-engine.ts', sprintAdded: 87, compositeAdded: 87, functionCount: 6, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-sector-fema-engine', name: 'Comply360 FEMA Sector-Pack Engine (DP-S87-4 · FEMA 1999 · FC-GPR + FC-TRS + Annual Foreign Liabilities Return)', path: 'src/lib/comply360-sector-fema-engine.ts', sprintAdded: 87, compositeAdded: 87, functionCount: 7, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-ai-control-center-engine', name: 'Comply360 AI Control Center Engine (DP-S87-6/7/8/9 · OOB-2 Compliance ROI + OOB-9 AI Tutor + 11-module orchestrator · USE-SITE READS S80c nlp-audit-ask + S81d mock-audit-simulator)', path: 'src/lib/comply360-ai-control-center-engine.ts', sprintAdded: 87, compositeAdded: 87, functionCount: 10, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-cfo-pitch-deck-engine', name: 'Comply360 CFO Pitch Deck Engine (DP-S87-5 · OOB-3 FUNCTIONAL · jspdf 6-section CFO compliance pitch deck · USE-SITE READS S87 ai-control-center ROI)', path: 'src/lib/comply360-cfo-pitch-deck-engine.ts', sprintAdded: 87, compositeAdded: 87, functionCount: 4, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 88 T-Phase-5.E.5.0 · Comply360 Polish Slot · 1 NEW SIBLING · 15th USE-SITE READ MAXIMUM SCALE application (reads across Floor 1-4 engines · idempotent + clearable demo data seeder)
  { id: 'comply360-demo-seed-engine', name: 'Comply360 Demo Seed Engine (DP-S88 · idempotent + clearable demo seeder · 15th USE-SITE READ application at MAXIMUM SCALE · seeds obligations + loan accounts + RERA projects + AI ROI samples for first-impression demo)', path: 'src/lib/comply360-demo-seed-engine.ts', sprintAdded: 88, compositeAdded: 88, functionCount: 3, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 89 T-Phase-5.F.5.1 · Comply360 Floor 5.1 · FLOOR 5 OPENS · 2 NEW SIBLINGs · 15-streak ⭐ target
  { id: 'comply360-fire-safety-engine', name: 'Comply360 Fire Safety Engine (DP-F5-1 · Q33 · NBC 2025 Part 4 framework · Fire NOC + Audit + Equipment AMC + Drills + Building Fire Certificate · 16th USE-SITE READ application MAXIMUM SCALE)', path: 'src/lib/comply360-fire-safety-engine.ts', sprintAdded: 89, compositeAdded: 89, functionCount: 12, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-industrial-safety-engine', name: 'Comply360 Industrial Safety Engine (DP-F5-1 · Q33 · PESO + Boiler Act 1923 + SMPV 1981 + Electrical Safety CEA + Lift Act · 17th USE-SITE READ application MAXIMUM SCALE)', path: 'src/lib/comply360-industrial-safety-engine.ts', sprintAdded: 89, compositeAdded: 89, functionCount: 12, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 90 T-Phase-5.F.5.2 · Comply360 Floor 5.2 · Environmental Compliance Pt 1 · Q34 · 2 NEW SIBLINGs · 16-streak ⭐ target
  { id: 'comply360-environmental-engine', name: 'Comply360 Environmental Engine (DP-F5-1 · Q34 · EP Act 1986 + Air Act 1981 CTE/CTO + Water Act 1974 CTE/CTO + Form 5 + Form V · 18th USE-SITE READ application MAXIMUM SCALE)', path: 'src/lib/comply360-environmental-engine.ts', sprintAdded: 90, compositeAdded: 90, functionCount: 10, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-eia-engine', name: 'Comply360 EIA Engine (DP-F5-1 · Q34 · EIA 2006 Notification + CRZ 2019 + public consultation log · 19th USE-SITE READ application MAXIMUM SCALE)', path: 'src/lib/comply360-eia-engine.ts', sprintAdded: 90, compositeAdded: 90, functionCount: 6, moatsRealized: [], provenance: 'CONFIRMED' },
];



export function getSiblingCount(): number {
  return SIBLINGS.length;
}

export function getSiblingsByProvenance(provenance: SiblingEntry['provenance']): SiblingEntry[] {
  return SIBLINGS.filter((s) => s.provenance === provenance);
}
