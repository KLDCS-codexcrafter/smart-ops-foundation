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
  // 🆕 Sprint 91 T-Phase-5.F.5.3 · Comply360 Floor 5.3 · Waste Management · Q35 · 1 NEW SIBLING (6 sub-regimes consolidated) · 17-streak ⭐ target
  { id: 'comply360-waste-management-engine', name: 'Comply360 Waste Management Engine (DP-F5-1 · Q35 · 6 sub-regimes consolidated: Hazardous Waste Rules 2016 + E-Waste Rules 2022 + Plastic Waste Rules 2022 + Battery Waste Rules 2022 + Bio-Medical Waste Rules + EPR Consolidated · 20th USE-SITE READ application MAXIMUM SCALE)', path: 'src/lib/comply360-waste-management-engine.ts', sprintAdded: 91, compositeAdded: 91, functionCount: 22, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 92 T-Phase-5.F.5.4 · Comply360 Floor 5.4 · DPDP Act 2023 + Cyber Security CERT-In · Q36 · 2 NEW SIBLINGs · 18-streak ⭐
  { id: 'comply360-dpdp-engine', name: 'Comply360 DPDP Engine (Q36 · DPDP Act 2023 · Privacy Policy + Data Principal Requests access/correction/erasure/grievance/nominate + Consent management granular/withdrawable + DPO register + DPIA + 72-hour Breach Notification · 21st USE-SITE READ MAXIMUM SCALE · servicedesk + peoplepay-skill cross-card)', path: 'src/lib/comply360-dpdp-engine.ts', sprintAdded: 92, compositeAdded: 92, functionCount: 15, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-cyber-security-engine', name: 'Comply360 Cyber Security Engine (Q36 · CERT-In Directions 2022 · 6-hour incident reporting + Vulnerability disclosure + Access Control Matrix + Cyber Security Policy · 22nd USE-SITE READ MAXIMUM SCALE)', path: 'src/lib/comply360-cyber-security-engine.ts', sprintAdded: 92, compositeAdded: 92, functionCount: 11, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 93 T-Phase-5.F.5.5 · Comply360 Floor 5.5 · Quality + Labour Tier-2 · Q37 · 2 NEW SIBLINGs · 19-streak ⭐
  { id: 'comply360-quality-standards-engine', name: 'Comply360 Quality Standards Engine (Q37 · Schedule H/H1 + FSSAI + BIS + ISO 9001/14001/27001/45001 + NABL + Legal Metrology · 9 entity types module licenses · 23rd USE-SITE READ MAXIMUM SCALE)', path: 'src/lib/comply360-quality-standards-engine.ts', sprintAdded: 93, compositeAdded: 93, functionCount: 14, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-labour-tier2-engine', name: 'Comply360 Labour Tier-2 Engine (Q37 · Bonus Act + Maternity Benefit + Equal Remuneration + Apprentices + CLRA + Shops & Establishments + Factories Form 21 + OSH Annual Health Check-up · 8 entity types module payroll · 24th USE-SITE READ · cross-card reads peoplepay-skill)', path: 'src/lib/comply360-labour-tier2-engine.ts', sprintAdded: 93, compositeAdded: 93, functionCount: 12, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 94 T-Phase-5.F.5.6 · Comply360 Floor 5.6 CAPSTONE · CLOSES FLOOR 5 · Q38 MCA T2 + PMLA + IPR + Legal Contracts + Tier-2 Extensions · 5 NEW SIBLINGs · 20-streak ⭐ · 161/161 obligations native 100%
  { id: 'comply360-mca-tier2-engine', name: 'Comply360 MCA Tier-2 Engine (Q38 · CSR-2 + Section 135 2pct CSR + MR-3 Secretarial Audit + CSR Committee · 25th USE-SITE READ)', path: 'src/lib/comply360-mca-tier2-engine.ts', sprintAdded: 94, compositeAdded: 94, functionCount: 10, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-pmla-engine', name: 'Comply360 PMLA Engine (Q38 · PMLA Act 2002 · STR + CTR + FIU-IND filings + Risk Alerts + Policy publish · 26th USE-SITE READ)', path: 'src/lib/comply360-pmla-engine.ts', sprintAdded: 94, compositeAdded: 94, functionCount: 11, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-ipr-engine', name: 'Comply360 IPR Engine (Q38 · Trademark + Patent + Copyright + Design registrations + Renewal scheduler · 27th USE-SITE READ)', path: 'src/lib/comply360-ipr-engine.ts', sprintAdded: 94, compositeAdded: 94, functionCount: 11, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-legal-contracts-engine', name: 'Comply360 Legal Contracts Engine (Q38 · Vendor + Customer + NDA + Stamp Duty computation + Renewal alerts · 28th USE-SITE READ · cross-card reads vendor)', path: 'src/lib/comply360-legal-contracts-engine.ts', sprintAdded: 94, compositeAdded: 94, functionCount: 11, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'comply360-tier2-extensions-engine', name: 'Comply360 Tier-2 Extensions Engine (Q38 · GSTR-4/5/7/8 + e-Invoicing + e-Way Bill + TDS u/s 195 + Advance Tax + AD Code + BRC + FEMA · wrapper avoiding D-127 core touch · 29th USE-SITE READ · CLOSES FLOOR 5 161/161 native 100%)', path: 'src/lib/comply360-tier2-extensions-engine.ts', sprintAdded: 94, compositeAdded: 94, functionCount: 14, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 96 T-Phase-6.A.0.1 · Arc 0 Master Data Foundation kickoff · 3 NEW SIBLINGs · 22-streak ⭐ target · Tally TDL Mechanism A native + Idea 1 Time-Travel Masters + Idea 4 Smart Master Sync
  { id: 'master-replication-engine', name: 'Master Replication Engine (Sprint 96 · Tally TDL Mechanism A native · "Create In All Company?" prompt-on-save · walk-collection + persistent preference Q2=C + owner-company tag + conflict detection · READS_FROM: mock-entities + entity-setup-service USE-SITE · 3 audit types: master_replication_event + master_conflict_resolution + master_sync_run)', path: 'src/lib/master-replication-engine.ts', sprintAdded: 96, compositeAdded: 96, functionCount: 8, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'idea-1-time-travel-masters-engine', name: 'Time-Travel Masters Engine (Sprint 96 · 💡 Idea 1 · effective-dated version chain · getMasterAsOf historical query · NetSuite-class capability for SMB · READS_FROM: master-replication-engine · audit type: master_version_change)', path: 'src/lib/idea-1-time-travel-masters-engine.ts', sprintAdded: 96, compositeAdded: 96, functionCount: 3, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'idea-4-smart-master-sync-engine', name: 'Smart Master Sync Engine (Sprint 96 · 💡 Idea 4 · usage-aware replication · items 6-month window + customer/vendor active-balance · UNIQUE to Operix · READS_FROM: master-replication-engine · reuses master_sync_run audit type · no new audit type · no §P claim)', path: 'src/lib/idea-4-smart-master-sync-engine.ts', sprintAdded: 96, compositeAdded: 96, functionCount: 2, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 97 T-Phase-6.A.0.2 · 7-tier Hierarchical Ledger + Master DNA · 2 NEW SIBLINGs · 23-streak ⭐ target · Standalone Page #24 (HierarchicalLedgerTreePage)
  { id: 'hierarchical-ledger-engine', name: 'Hierarchical Ledger Engine (Sprint 97 · 7-tier auto-creation: Parent/Subsidiary/Branch/Division/Department/Project/Site · L4/L5 nesting via FinFrame USE-SITE READ · bidirectional reciprocal for subsidiaries · project-only cost-centre linking · createBDLedgers reimplemented privately · audit type: hierarchical_ledger_created)', path: 'src/lib/hierarchical-ledger-engine.ts', sprintAdded: 97, compositeAdded: 97, functionCount: 4, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'idea-2-master-dna-engine', name: 'Master DNA Engine (Sprint 97 · 💡 Idea 2 · state-aware inheritance · auto-adjusts GST state code + Place of Supply + TDS sections + state-to-state logistic rate buckets · deterministic §L stub for rate lookup · READS_FROM: master-replication-engine + idea-1-time-travel-masters-engine · audit type: master_dna_inheritance)', path: 'src/lib/idea-2-master-dna-engine.ts', sprintAdded: 97, compositeAdded: 97, functionCount: 1, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 98 T-Phase-6.A.0.3 · Arc 0 Master Data Foundation Block 3-5 · 3 NEW SIBLINGs · 24-streak ⭐ target · DP-PH6-NEW-24 ACCEPT group-shared model
  { id: 'field-lock-metadata-engine', name: 'Field Lock Metadata Engine (Sprint 98 · per (master_type, field_path) lock-mode = locked | overrideable | request_approval · governs sibling-entity overrides on shared/group masters · seeded with Indian compliance-critical fields GSTIN/PAN/HSN/UOM · READS_FROM: audit-trail-engine + master-replication-engine · audit type: field_lock_rule_change)', path: 'src/lib/field-lock-metadata-engine.ts', sprintAdded: 98, compositeAdded: 98, functionCount: 5, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'idea-3-conflict-resolution-engine', name: 'Conflict Resolution Engine (Sprint 98 · 💡 Idea 3 · within-store dedup for shared/group masters · Levenshtein-ratio name similarity + exact-match fields HSN/GSTIN/PAN · survivor-wins merge plan with audit · READS_FROM: master-replication-engine + audit-trail-engine · reuses master_conflict_resolution audit type · no new audit type)', path: 'src/lib/idea-3-conflict-resolution-engine.ts', sprintAdded: 98, compositeAdded: 98, functionCount: 3, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'idea-11-sync-throttle-engine', name: 'Sync Throttle Engine (Sprint 98 · 💡 Idea 11 · token-bucket per (entity, master_type) · default 30 cap / 10 refill-per-minute · prevents bulk-import audit-log flooding · READS_FROM: audit-trail-engine + master-replication-engine · reuses master_sync_run audit type · no new audit type)', path: 'src/lib/idea-11-sync-throttle-engine.ts', sprintAdded: 98, compositeAdded: 98, functionCount: 4, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 99 T-Phase-6.A.0.4 · Arc 0 Master Data Foundation · 4 inter-scope price lists (6 rule_types · 7 pricing methods) + 💡 Idea 7 Transfer-Pricing Audit Orchestrator (THE MOAT) · 2 NEW SIBLINGs + 1 NEW Standalone Page (#25 InternalPricingHubPage) · 25-streak ⭐ target · effective-dating via idea-1 (no reimpl) · idea-7 orchestrates tp-benchmarking + form-3ceb (USE-SITE READS) · comply360-transfer-pricing-engine 0-DIFF (FR-44 separation)
  { id: 'internal-pricing-engine', name: 'Internal Pricing Engine (Sprint 99 · 4 inter-scope price lists · 6 rule_types: inter_entity/branch/division/department/project/site · 7 pricing methods: cost_plus_markup / arms_length_market / standard_cost / budget_rate / lowest_external_rate / mrp_minus_discount / actual_cost_plus_overhead · decimal-safe (FR-31) · effective-dating via idea-1 recordMasterVersion+getMasterAsOf · audit type: pricing_rule_change · READS_FROM: idea-1-time-travel-masters-engine)', path: 'src/lib/internal-pricing-engine.ts', sprintAdded: 99, compositeAdded: 99, functionCount: 5, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'idea-7-transfer-pricing-audit-engine', name: 'Transfer Pricing Audit Engine (Sprint 99 · 💡 Idea 7 · THE MOAT · orchestrator generating Section 92 documentation for internal inter-scope pricing · USE-SITE READS: internal-pricing-engine + tp-benchmarking-engine.recommendALPMethod/isAboveThreshold + form-3ceb-engine.buildForm3CEBSnapshot/saveForm3CEBSnapshot · DOES NOT reimplement ALP/3CEB/international filings · comply360-transfer-pricing-engine (Master File 3CEAA/CbCR/Eq-Levy) is SEPARATE concern untouched (FR-44 no-duplication) · committee approval workflow · audit type: transfer_pricing_event)', path: 'src/lib/idea-7-transfer-pricing-audit-engine.ts', sprintAdded: 99, compositeAdded: 99, functionCount: 3, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 100 T-Phase-6.A.0.5 · Arc 0 Master Data Foundation · 9 Cross-Company Reports + Master Visibility Heatmap (#26) + 💡 Idea 5 Master Access Matrix + 💡 Idea 6 Inter-Dept Approval Bridge (ORCHESTRATOR · §P-exemption · bridges approval-matrix + approval-workflow · 0-DIFF on both · FR-44) + 💡 Idea 8 Cost-Centre Cross-Stitch · 4 NEW SIBLINGs + 1 NEW Standalone Page (#26) · 26-streak ⭐ target
  { id: 'cross-company-reports-engine', name: 'Cross-Company Reports Engine (Sprint 100 · Tally TDL Mechanism A native · 9 reports: multi-co Cash/Bank Books + Group Sales/Purchase Registers + multi-co Payable/Receivable Outstandings + multi-co Graph + Group Comparison + multi-co Ledger Voucher · walks loadEntities() + per-entity vouchersKey USE-SITE READS · owner_company tagging on every row · drill-back to source entity · READ-ONLY · NO new audit type · READS_FROM: mock-entities + fincore-engine + voucher-org-tag-engine)', path: 'src/lib/cross-company-reports-engine.ts', sprintAdded: 100, compositeAdded: 100, functionCount: 2, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'idea-5-master-access-matrix-engine', name: 'Master Access Matrix Engine (Sprint 100 · 💡 Idea 5 · per-master × per-entity × per-role permission grid · permissions: edit | view | view_request_approval · field-level overrides additive · DEFAULT_ACCESS_RULES seeded for hq_finance/branch_manager/project_manager · complements field-lock-metadata-engine (fields vs roles boundary · FR-44) · READS_FROM: master-replication-engine + field-lock-metadata-engine · audit type: master_access_change)', path: 'src/lib/idea-5-master-access-matrix-engine.ts', sprintAdded: 100, compositeAdded: 100, functionCount: 5, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'idea-6-inter-dept-approval-bridge-engine', name: 'Inter-Dept Approval Bridge Engine (Sprint 100 · 💡 Idea 6 · ORCHESTRATOR · v1.31 §P @orchestrator-exemption · BRIDGES approval-matrix-engine (chain lookup) + approval-workflow-engine (6-state machine) for cross-department transfers above 5% budget variance · NO new audit type — routes through approval-workflow-engine native logging · 0-DIFF on both source engines (FR-44 no-duplicity) · READS_FROM: approval-matrix-engine + approval-workflow-engine + internal-pricing-engine)', path: 'src/lib/idea-6-inter-dept-approval-bridge-engine.ts', sprintAdded: 100, compositeAdded: 100, functionCount: 3, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'idea-8-cost-centre-cross-stitch-engine', name: 'Cost-Centre Cross-Stitch Engine (Sprint 100 · 💡 Idea 8 · stitches Project ↔ Division ↔ Department ↔ Cost Centre · Cost Centre is PROJECT-ONLY (locked · Q-LOCK S100) · reads ProjectCentre.division_id + .department_id · slicing via VoucherOrgTag · READS_FROM: projx/project-centre + voucher-org-tag-engine · audit type: cost_centre_cross_stitch)', path: 'src/lib/idea-8-cost-centre-cross-stitch-engine.ts', sprintAdded: 100, compositeAdded: 100, functionCount: 2, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 101 T-Phase-6.A.0.6 · 🏁 ARC 0 CAPSTONE · 3 NEW SIBLINGs + 1 NEW Standalone Page (#27 MasterLifecycleWizardPage) · completes all 12 deep ideas · 1 shared audit type master_lifecycle_event (action discriminator: sleeping_flagged / cross_entity_reorder / compliance_block) · 27-streak ⭐ target
  { id: 'idea-9-sleeping-master-detector-engine', name: 'Sleeping Master Detector Engine (Sprint 101 · 💡 Idea 9 · scans voucher/transaction localStorage references to derive last_used_at per master · classifies active (<dormant_days) / dormant (dormant_days..sleeping_days) / sleeping (>sleeping_days) · DEFAULT_DORMANT_DAYS=90 · DEFAULT_SLEEPING_DAYS=180 · markReviewed mutes flag · READS_FROM: voucher localStorage walk (read-only) + master-replication-engine · audit type: master_lifecycle_event action sleeping_flagged)', path: 'src/lib/idea-9-sleeping-master-detector-engine.ts', sprintAdded: 101, compositeAdded: 101, functionCount: 3, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'idea-10-cross-entity-reorder-engine', name: 'Cross-Entity Reorder Engine (Sprint 101 · 💡 Idea 10 · ORCHESTRATOR · suggests inter-entity transfer (surplus available elsewhere) OR consolidated reorder (no surplus) for short-stocked items · executeReorderAsIndent USE-SITE CALLS reorder-indent-bridge.promoteReorderToIndent (0-DIFF FR-44 no-dup) · reads per-entity stock via localStorage walk · READS_FROM: reorder-indent-bridge + mock-entities + store-hub-engine ReorderSuggestion shape · audit type: master_lifecycle_event action cross_entity_reorder)', path: 'src/lib/idea-10-cross-entity-reorder-engine.ts', sprintAdded: 101, compositeAdded: 101, functionCount: 2, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'idea-12-compliance-aware-master-save-engine', name: 'Compliance-Aware Master Save Engine (Sprint 101 · 💡 Idea 12 · ORCHESTRATOR · pre-save GATE invoked before any master persists · USE-SITE CALLS gstin-validator.validateGSTIN + india-validations PAN/CIN/TAN/UDYAM regexes + hsn-resolver.lookupHSN (0-DIFF FR-44 no-dup) · returns {ok, blocks, warnings} · ok:false hard-blocks save · URP sentinel + missing-optional emit warnings · audit type: master_lifecycle_event action compliance_block (blocks logged only) · READS_FROM: gstin-validator + india-validations + hsn-resolver)', path: 'src/lib/idea-12-compliance-aware-master-save-engine.ts', sprintAdded: 101, compositeAdded: 101, functionCount: 1, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🎬 Sprint 105 T-Phase-6.C.1.1 · Arc 2 OPENER · Pillar C.1 Intercompany Foundation · 1 NEW SIBLING + 1 NEW Standalone Page (#34 IntercompanyGroupStructurePage) · 1 new audit type group_structure_change under 'mca-roc' · WRAPS §H-frozen mock-entities via loadEntities (DP-A2-1) · side-store erp_group_structure (voucher-org-tag pattern) · 3 Ind AS consolidation methods full/proportional/equity (Ind AS 110/111/28) · DP-A2-9 scope wall (NO consolidated statements / eliminations / multi-currency · those land in S108/Arc 3) · 31-streak ⭐ target
  { id: 'intercompany-group-structure-engine', name: 'Intercompany Group Structure Engine (Sprint 105 · 🎬 Arc 2 Opener · WRAPS §H-frozen mock-entities via loadEntities (DP-A2-1) · side-store erp_group_structure keyed by entity_id (voucher-org-tag pattern) · ownership % + relationship (parent/subsidiary/branch/joint_venture/associate) + 3 Ind AS consolidation methods (full/proportional/equity per Ind AS 110/111/28) · recommendConsolidationMethod + getGroupTree + idempotent upsert with FK validation against loadEntities · audit type: group_structure_change · READS_FROM: mock-entities loadEntities · SCOPE WALL DP-A2-9 STRUCTURE ONLY)', path: 'src/lib/intercompany-group-structure-engine.ts', sprintAdded: 105, compositeAdded: 105, functionCount: 6, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🆕 Sprint 106 T-Phase-6.C.1.2 · Arc 2 · Pillar C.1 · IC Transactions Pt 1 · 1 NEW SIBLING + 1 NEW Standalone Page (#35 IntercompanyTransactionsHubPage) · 1 new audit type intercompany_transaction under 'mca-roc' · FR-44 ORCHESTRATION SPINE · v1.31 §P @orchestrator (TP+voucher audits downstream) · 32-streak ⭐ target
  { id: 'intercompany-transaction-engine', name: 'Intercompany Transaction Engine (Sprint 106 · 🏁 Arc 2 IC Pt 1 · FR-44 ORCHESTRATION SPINE · 4 of 8 types: stock_transfer/service_charge/capital_infusion/loan · postICTransaction PIPES resolvePrice (internal-pricing-engine) → generateTPAudit (idea-7) → postVoucher (fincore) for two reciprocal entries · validates both parties via getGroupStructure (S105) · capital_infusion + loan skip pricing (equity/principal · §L) · per-type ledger mapping (IC-RECV/IC-PAY/IC-INVEST/IC-EQUITY/IC-LOAN-RECV/IC-LOAN-PAY) · decimal-safe balanced reciprocals · audit type: intercompany_transaction · v1.31 §P @orchestrator exemption · SCOPE WALL DP-A2-9 NO matching/eliminations/consolidation · READS_FROM: internal-pricing + idea-7 + fincore + intercompany-group-structure)', path: 'src/lib/intercompany-transaction-engine.ts', sprintAdded: 106, compositeAdded: 106, functionCount: 5, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🏁 Sprint 108 T-Phase-6.C.1.4 · 🏁 ARC 2 CAPSTONE · Pillar C.1 · 2 NEW SIBLINGs (matching + eliminations) + NEW Standalone Page #36 GroupEliminationsPage · 2 new audit types intercompany_match + group_elimination under 'mca-roc' · ELIMINATION_TYPES length EXACTLY 7 · DP-A2-9 SCOPE WALL: ENTRIES ONLY (NO consolidated statements / NCI / Goodwill / multi-currency · Arc 3) · 34-streak ⭐ target
  { id: 'intercompany-matching-engine', name: 'Intercompany Matching Engine (Sprint 108 · 🏁 Arc 2 Capstone · auto-matches the two sides of each posted IC transaction · break taxonomy: missing_counterparty_voucher / amount_mismatch / status_mismatch / unposted · runICMatching + getMatchBreaks + getMatchSummary · decimal-safe variance via dSub/dEq · audit type: intercompany_match · READS listICTransactions (0-DIFF) + fincore vouchersKey + decimal-helpers · SCOPE WALL DP-A2-9 reconciliation of existing IC postings ONLY · NO consolidation)', path: 'src/lib/intercompany-matching-engine.ts', sprintAdded: 108, compositeAdded: 108, functionCount: 3, moatsRealized: [], provenance: 'CONFIRMED' },
  { id: 'group-eliminations-engine', name: 'Group Eliminations Engine (Sprint 108 · 🏁 Arc 2 Capstone · 7-type E1–E7 elimination ENTRIES catalogue · E1 IC sales/purchases · E2 IC balances · E3 unrealized profit inventory · E4 IC dividends · E5 IC loans/interest · E6 investment-vs-equity using getGroupStructure.ownership_pct with minority_share=dSub(100, ownership_pct) · E7 unrealized profit fixed-assets from S107 asset_transfer · ELIMINATION_TYPES length EXACTLY 7 · generateEliminations + generateEliminationsByType + getEliminationSummary · ALL money math via decimal-helpers (dAdd/dSub/dMul/dPct/dSum/roundTo) · zero-source category returns zero entries (no fabrication FR-91 §L-noted) · audit type: group_elimination · READS listICTransactions + getGroupStructure (0-DIFF) · SCOPE WALL DP-A2-9 ENTRIES ONLY · NO consolidated P&L/BS/CF · NO NCI rollup · NO Goodwill · NO multi-currency · those land in Arc 3 S109-S112)', path: 'src/lib/group-eliminations-engine.ts', sprintAdded: 108, compositeAdded: 108, functionCount: 3, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🎬 Sprint 109 T-Phase-6.C.2.1 · Arc 3 OPENER · Pillar C.2 Group Consolidation · 1 NEW SIBLING + 1 NEW Standalone Page (#37 GroupConsolidationPage) · 1 new audit type group_consolidation_run under 'mca-roc' · FR-44 ORCHESTRATION SPINE · 35-streak ⭐ target
  { id: 'group-consolidation-engine', name: 'Group Consolidation Engine (Sprint 109 · 🎬 Arc 3 Opener · FR-44 ORCHESTRATION SPINE · @orchestrator · walks fincore per-entity vouchers via vouchersKey · classifies ledger_group_code → P&L/BS by MIRRORING ProfitLoss.tsx via reportUtils getL1Code/getL2Code (no parallel classifier) · applies each entity\'s consolidation_method from intercompany-group-structure (full=100% line-by-line · proportional=ownership_pct share via dPct · equity=NOT line-by-line · single-line IC-EQUITY-INVEST roll-up of parent share of sub net result) · SUBTRACTS group-eliminations-engine.generateEliminations({fy}) as offsetting Dr/Cr pairs (preserves Dr=Cr balance via dEq) · produces ConsolidatedTrialBalance + ConsolidatedPnL (revenue−cogs=gross · −expenses=operating · +other_income=PBT · all decimal-helpers) + getConsolidationSummary per-entity contribution · audit type: group_consolidation_run · READS_FROM fincore-engine + intercompany-group-structure-engine + group-eliminations-engine + reportUtils · SCOPE WALL DP-A3-9: P&L+TB ONLY · NO BalanceSheet/CashFlow/NCI/Goodwill (S111) · NO multi-currency (S110: feeds via OPTIONAL entityTBProvider §H-waiver param · default 0-DIFF) · NO disclosure (S112) · NO OOB (Arc 4) · scope-wall test asserts those exports do NOT exist)', path: 'src/lib/group-consolidation-engine.ts', sprintAdded: 109, compositeAdded: 109, functionCount: 4, moatsRealized: [], provenance: 'CONFIRMED' },
  // 🎬 Sprint 110 T-Phase-6.C.2.2 · Arc 3 · Pillar C.2 · Multi-Currency Translation (Ind AS 21 / IAS 21) · 1 NEW SIBLING + 1 NEW Standalone Page (#38 MultiCurrencyTranslationPage) · 1 new audit type fx_translation_run under 'mca-roc' · 36-streak ⭐ target
  { id: 'fx-translation-engine', name: 'FX Translation Engine (Sprint 110 · Arc 3 · Ind AS 21 / IAS 21 Current Rate method · translateForeignEntity translates a foreign subsidiary\'s real balances into INR · closing rate→BS (assets/liabilities) · average rate→P&L (income/expense) · historical rate→equity · FCTR residual exchange difference→OCI · balanced_pre_fctr indicator · translateEntityTB returns S109-compatible EntityTrialBalance with synthetic FCTR-OCI line so consolidated TB stays balanced · consolidateWithTranslation calls S109 consolidate via §H-waiver entityTBProvider hook (S109 default path 0-DIFF · regression-tested) · INR-functional entities pass through (rate 1 · FCTR 0) · getFunctionalCurrency/setFunctionalCurrency side-store erp_entity_functional_currencies · listTranslations persists runs per FY · ALL money math via decimal-helpers (dAdd/dSub/dMul/dSum/round2) · audit type: fx_translation_run · READS_FROM dual-rate-engine loadForexRates (NOT a parallel rate store) + currency master (world-currencies) + idea-1-time-travel-masters-engine getMasterAsOf for historical rate + group-consolidation-engine computeEntityTrialBalance & consolidate (§H-waiver) · FR-44 WALL: DISTINCT from fx-what-if-engine simulator — does NOT import/call/wrap/duplicate fx-what-if · fx-what-if 0-DIFF · SCOPE WALL DP-A3-9 TRANSLATION ONLY · NO BS/CF (S111) · NO NCI/Goodwill (S111) · NO disclosure (S112) · NO scenario simulation)', path: 'src/lib/fx-translation-engine.ts', sprintAdded: 110, compositeAdded: 110, functionCount: 9, moatsRealized: [], provenance: 'CONFIRMED' },
];



export function getSiblingCount(): number {
  return SIBLINGS.length;
}

export function getSiblingsByProvenance(provenance: SiblingEntry['provenance']): SiblingEntry[] {
  return SIBLINGS.filter((s) => s.provenance === provenance);
}
