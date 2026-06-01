/**
 * @file        src/lib/_institutional/sprint-history.ts
 * @purpose     Source-of-truth register for banked sprints
 * @sprint      T-Phase-3.HK-D14-InstitutionalRegisters
 */

export interface SprintEntry {
  sprintNumber: number;
  code: string;
  composite: boolean;
  grade: 'A' | 'A first-pass-clean' | 'A composite' | 'A with adaptations' | 'B' | 'C' | null;
  headSha: string | null;
  predecessorSha: string | null;
  loc: number | null;
  newSiblings: string[];
  bankDate: string | null;
  provenance: 'CONFIRMED' | 'PENDING_BACKFILL';
}

export const SPRINTS: SprintEntry[] = [
  ...Array.from({ length: 53 }, (_, i) => ({
    sprintNumber: i + 1,
    code: 'PENDING_BACKFILL',
    composite: false,
    grade: null,
    headSha: null,
    predecessorSha: null,
    loc: null,
    newSiblings: [] as string[],
    bankDate: null,
    provenance: 'PENDING_BACKFILL' as const,
  })),
  {
    sprintNumber: 54, code: 'HK-6.T1 Cleanup', composite: true, grade: 'A first-pass-clean',
    headSha: null, predecessorSha: null, loc: null, newSiblings: [], bankDate: null, provenance: 'CONFIRMED',
  },
  {
    sprintNumber: 55, code: 'T-Phase-3.PROD-1', composite: true, grade: 'A',
    headSha: null, predecessorSha: null, loc: 1000, newSiblings: ['sales-production-bridge'], bankDate: null, provenance: 'CONFIRMED',
  },
  {
    sprintNumber: 56, code: 'T-Phase-3.PROD-2', composite: true, grade: 'A',
    headSha: null, predecessorSha: null, loc: 1200, newSiblings: [], bankDate: null, provenance: 'CONFIRMED',
  },
  {
    sprintNumber: 57, code: 'T-Phase-3.PROD-2.5+T1', composite: true, grade: 'A',
    headSha: null, predecessorSha: null, loc: 790, newSiblings: [], bankDate: null, provenance: 'CONFIRMED',
  },
  {
    sprintNumber: 58, code: 'T-Phase-3.PROD-FIX-A', composite: true, grade: 'A composite',
    headSha: '9362729e', predecessorSha: null, loc: 2400, newSiblings: [], bankDate: null, provenance: 'CONFIRMED',
  },
  {
    sprintNumber: 59, code: 'T-Phase-3.PROD-3', composite: true, grade: 'A first-pass-clean',
    headSha: '0cdb7e50', predecessorSha: '9362729e', loc: 1100, newSiblings: ['iot-machine-bridge'], bankDate: null, provenance: 'CONFIRMED',
  },
  {
    sprintNumber: 60, code: 'T-Phase-3.PROD-3.5', composite: true, grade: 'A composite',
    headSha: '3d7483e7', predecessorSha: '0cdb7e50', loc: 3326,
    newSiblings: [
      'process-batch-engine', 'recipe-formula-engine', 'spc-quality-engine',
      'process-genealogy-engine', 'tank-flow-inventory-engine',
    ],
    bankDate: '2026-05-24', provenance: 'CONFIRMED',
  },
  {
    sprintNumber: 61, code: 'T-Phase-3.PROD-4', composite: true, grade: 'A composite',
    headSha: '04c5f2c', predecessorSha: '3d7483e7', loc: 1570,
    newSiblings: ['demand-forecast-engine'], bankDate: '2026-05-25', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 62 PROD-4.5 · Repetitive + Mixed-Mode + GMP Schedule M + 21 CFR Part 11 · 38th SIBLING
  {
    sprintNumber: 62, code: 'T-Phase-3.PROD-4.5', composite: false, grade: 'A first-pass-clean',
    headSha: 'TBD_AT_BANK', predecessorSha: '04c5f2c', loc: 1500,
    newSiblings: ['cfr-part-11-engine'], bankDate: '2026-05-25', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 63 PROD-5 · ESG + Closeout + Carbon-aware · 39th SIBLING · ⭐ PHASE 3 v2 CLOSES · 28/28 CAPABILITY FULL · 10-streak NEW RECORD DOUBLE-DIGIT
  {
    sprintNumber: 63, code: 'T-Phase-3.PROD-5', composite: false, grade: 'A first-pass-clean',
    headSha: 'TBD_AT_BANK', predecessorSha: '2c11f18b', loc: 1200,
    newSiblings: ['carbon-planning-engine'], bankDate: '2026-05-25', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 64 FAR-0 · Demo Seed + Cross-Card-Integrity Schema · Phase 4 FAR Arc OPEN · 6 FAR-CAPs + 4 FK-CAPs schema-staged · 11-streak ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐
  {
    sprintNumber: 64, code: 'T-Phase-4.FAR-0', composite: false, grade: 'A first-pass-clean',
    headSha: 'f60f75d17592557a37d7e5ad9adeca446804dc20', predecessorSha: '567c140c', loc: 1300,
    newSiblings: [], bankDate: '2026-05-25', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 65 FAR-1 · Indian Statutory Auto-Pack · 40/41/42 SIBLINGs · MOAT-39/40/41 · 12-streak ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐ DOUBLE-DIGIT MILESTONE+2
  {
    sprintNumber: 65, code: 'T-Phase-4.FAR-1', composite: false, grade: 'A first-pass-clean',
    headSha: '54433a13ab596c73e992233b340cc894aaa063f6', predecessorSha: '9eeecc23', loc: 1450,
    newSiblings: ['caro-2020-engine', 'ind-as-116-lease-engine', 'epcg-fa-bridge'],
    bankDate: '2026-05-26', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 66 FAR-2 · Cross-Card FK UI · 43rd SIBLING · MOAT-42/43/44 · 13-streak NEW RECORD (baker's-dozen)
  {
    sprintNumber: 66, code: 'T-Phase-4.FAR-2', composite: false, grade: 'A first-pass-clean',
    headSha: 'fc6d521d773ef8fbf5211897c3b991239d786020', predecessorSha: '0ebfc779', loc: 1850,
    newSiblings: ['vehicle-fa-bridge'],
    bankDate: '2026-05-26', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 67 FAR-3 · Compute Engine Best-in-Class · 3 NEW SIBLINGs · MOAT-45/46/47 · 14-streak
  {
    sprintNumber: 67, code: 'T-Phase-4.FAR-3', composite: false, grade: 'A first-pass-clean',
    headSha: '01c62d7e6fd1aecd1f26027a9233d286244bf9cd', predecessorSha: 'ad0e1d2d9029d502ac050df8481add0c08501c34', loc: 2170,
    newSiblings: ['multi-gaap-depreciation-engine', 'uop-depreciation-engine', 'component-depreciation-engine'],
    bankDate: '2026-05-27', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 68 FAR-4 · AI + IoT + RFID + PM + BRSR + Dashboard + Audit · 8 NEW SIBLINGs · MOAT-48..52 · 15-streak NEW RECORD ⭐ · FAR Arc CLOSES at 60/60
  {
    sprintNumber: 68, code: 'T-Phase-4.FAR-4', composite: false, grade: 'A first-pass-clean',
    headSha: '12fae25b1c0db799a3bc4270abf2d3383c7b7555', predecessorSha: '01c62d7e6fd1aecd1f26027a9233d286244bf9cd', loc: 2790,
    newSiblings: [
      'ai-fa-classification-engine', 'document-ai-fa-engine',
      'iot-asset-bridge', 'rfid-asset-bridge',
      'predictive-maintenance-fa-engine', 'brsr-fa-engine',
      'fa-audit-trail-engine', 'insightx-fa-staging-engine',
    ],
    bankDate: '2026-05-27', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 69 T-Phase-5.A.1.1 · Comply360 Main Arc 1.1 · 2-cycle audit chain · graded A with adaptations ⭐ · 16-streak NEW RECORD
  {
    sprintNumber: 69, code: 'T-Phase-5.A.1.1', composite: false, grade: 'A with adaptations',
    headSha: '1919be0f3820204191b481b00479da49c95c6f3d', predecessorSha: '9925e6269e53e5a0d30b8e2669fb3fde5398e9fb', loc: 1290,
    newSiblings: ['comply360-health-score-engine', 'comply360-statutory-memory'],
    bankDate: '2026-05-27', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 70a T-Phase-5.A.1.2-PASS-A · Comply360 Main Arc 1.2 · Path α Pass A (engine layer) · graded A with adaptations ⭐ (2-cycle chain · grade-updated in Sprint 70b Cycle-2) · 17-streak
  {
    sprintNumber: 70, code: 'T-Phase-5.A.1.2-PASS-A', composite: false, grade: 'A with adaptations',
    headSha: '9a4ec95dffb03cf35387c553b03c6ef41dd13cc0', predecessorSha: '1919be0f3820204191b481b00479da49c95c6f3d', loc: 1480,
    newSiblings: ['comply360-gst-aggregator-engine', 'comply360-gstr-builder-engine', 'comply360-ims-engine'],
    bankDate: '2026-05-27', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 70b T-Phase-5.A.1.2-PASS-B · Comply360 Main Arc 1.2 · Path α Pass B (UI layer · 4 NATIVE pages + tab-shell + multi-GSTIN hook · PATTERN-S70b-NAVIGATION-CANONICAL ratified) · A with adaptations ⭐ (2-cycle chain) · 18-streak NEW RECORD
  {
    sprintNumber: 70, code: 'T-Phase-5.A.1.2-PASS-B', composite: false, grade: 'A with adaptations',
    headSha: '16f4ea2b3f320c8f1db8f81e11591b25e01c1bc5', predecessorSha: '9a4ec95dffb03cf35387c553b03c6ef41dd13cc0', loc: 1354,
    newSiblings: ['use-entity-gstins-hook', 'comply360-tax-gst-shell'],
    bankDate: '2026-05-28', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 71 T-Phase-5.A.1.3 · Comply360 Main Arc 1.3 · Q3 Part 2 (GSTR-3B + tax-tolerance + ECRS + cross-return recon) · single-pass · 19-streak NEW RECORD
  {
    sprintNumber: 71, code: 'T-Phase-5.A.1.3', composite: false, grade: 'A with adaptations',
    headSha: '9d47ec68e75552e80363e1656523e6448be02a28', predecessorSha: '16f4ea2b3f320c8f1db8f81e11591b25e01c1bc5', loc: 1200,
    newSiblings: ['comply360-tax-tolerance-engine', 'comply360-ecrs-engine'],
    bankDate: '2026-05-28', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 72 T-Phase-5.A.1.4 · Comply360 Main Arc 1.4 · Q4 NATIVE TDS suite (194Q + 194-O + SFT + Form 26AS reco · NEW 24th `tds` mega-menu · Option C) · 20-streak NEW RECORD ⭐
  {
    sprintNumber: 72, code: 'T-Phase-5.A.1.4', composite: false, grade: 'A first-pass-clean',
    headSha: 'cfff1abc0da6a88ec18a87e6ea7af46afea24446', predecessorSha: '9d47ec68e75552e80363e1656523e6448be02a28', loc: 1710,
    newSiblings: [
      'comply360-tds-aggregator-engine',
      'comply360-tds-194q-engine',
      'comply360-sft-engine',
      'comply360-form26as-reco-engine',
    ],
    bankDate: '2026-05-28', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 73a T-Phase-5.A.1.5-PASS-A · Comply360 Main Arc 1.5 · Pass A (engine layer) · 4 NEW engines (e-invoice aggregator + e-way + MSME Form 1 + Section 393) · Path α split · 21-streak NEW RECORD ⭐
  {
    sprintNumber: 73, code: 'T-Phase-5.A.1.5-PASS-A', composite: false, grade: 'A first-pass-clean',
    headSha: 'cc711d90ae26d7b1e8cb68561d8895a8fc069f5f', predecessorSha: 'cfff1abc0da6a88ec18a87e6ea7af46afea24446', loc: 1150,
    newSiblings: [
      'comply360-einvoice-aggregator-engine',
      'comply360-eway-engine',
      'comply360-msme-form1-engine',
      'comply360-section393-engine',
    ],
    bankDate: '2026-05-28', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 73b T-Phase-5.A.1.5-PASS-B · Comply360 Main Arc 1.5 · Pass B (UI + nav wiring) · 3 surfaces (exim/vendor/roc) consuming Pass A engines · Main Arc 1.5 COMPLETE · 22-streak NEW RECORD ⭐
  {
    sprintNumber: 73, code: 'T-Phase-5.A.1.5-PASS-B', composite: false, grade: 'A first-pass-clean',
    headSha: '8e7dff4fe1c73d48d0869830ea8ab43dc5fcd3d2', predecessorSha: 'cc711d90ae26d7b1e8cb68561d8895a8fc069f5f', loc: 790,
    newSiblings: [],
    bankDate: '2026-05-28', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 74a T-Phase-5.A.1.6-PASS-A · Comply360 Main Arc 1.6 · Pass A (Q19 · GSTR-9/9C + 3CA/3CB/3CD) · 2 NEW SIBLINGs (gstr9-reco + tax-audit-3cd · reads caro-2020 §Y frozen) · Path α split · 23-streak NEW RECORD ⭐
  {
    sprintNumber: 74, code: 'T-Phase-5.A.1.6-PASS-A', composite: false, grade: 'A first-pass-clean',
    headSha: 'bd33a56facb36fa0399b9b0cf347770fa16d5cba', predecessorSha: '8e7dff4fe1c73d48d0869830ea8ab43dc5fcd3d2', loc: 1880,
    newSiblings: [
      'comply360-gstr9-reco-engine',
      'comply360-tax-audit-3cd-engine',
    ],
    bankDate: '2026-05-28', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 74b T-Phase-5.A.1.6-PASS-B · Comply360 Main Arc 1.6 · Pass B (Q20 · Form 16/16A + TDS Notice) · 2 NEW SIBLINGs (form16-engine reads S72 tds-aggregator 0-DIFF + tds-notice-engine) · Main Arc 1.6 COMPLETE · 24-streak NEW RECORD ⭐
  {
    sprintNumber: 74, code: 'T-Phase-5.A.1.6-PASS-B', composite: false, grade: 'A with adaptations',
    headSha: '3cbbbcf041e496fab29fc27db28f51b8d7df2c3e', predecessorSha: 'bd33a56facb36fa0399b9b0cf347770fa16d5cba', loc: 1020,
    newSiblings: [
      'comply360-form16-engine',
      'comply360-tds-notice-engine',
    ],
    bankDate: '2026-05-28', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 75 T-Phase-5.A.1.7 · Comply360 Main Arc 1.7 · Q28 Part 1 · 9 Extended GST Forms (GSTR-4/5/6/7/8/10 + CMP-08 + ITC-03 + DRC-03) via Extended Returns sub-shell · builders extend gstr-builder-engine in place · 25-streak ⭐
  {
    sprintNumber: 75, code: 'T-Phase-5.A.1.7', composite: false, grade: 'A first-pass-clean',
    headSha: '5a83cab349ac5219ddb465cfe82b4831df43c8d3', predecessorSha: '3cbbbcf041e496fab29fc27db28f51b8d7df2c3e', loc: 1600,
    newSiblings: [],
    bankDate: '2026-05-28', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 76a T-Phase-5.A.1.8-PASS-A · Comply360 Main Arc 1.8 · Q28 Part 2 · Pass A (engines) · 4 NEW SIBLINGs (tcs-27eq + ewb02-consolidation + stamp-duty + itr6) · ITC-04/REG-01/REG-31 builders extend gstr-builder in place · 26-streak ⭐
  {
    sprintNumber: 76, code: 'T-Phase-5.A.1.8-PASS-A', composite: false, grade: 'A first-pass-clean',
    headSha: '92458e32e09c0770b636c4f5a02b332b18c680e6', predecessorSha: '5a83cab349ac5219ddb465cfe82b4831df43c8d3', loc: 750,
    newSiblings: [
      'comply360-tcs-27eq-engine',
      'comply360-ewb02-consolidation-engine',
      'comply360-stamp-duty-engine',
      'comply360-itr6-engine',
    ],
    bankDate: '2026-05-28', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 76b T-Phase-5.A.1.8-PASS-B · Comply360 Main Arc 1.8 · Q28 Part 2 · Pass B (surfaces + legal-mega-menu wiring) · 6 surfaces consuming Pass A engines · legal mega-menu goes live · 0 new SIBLINGs (pages aren't SIBLINGs) · 27-streak NEW RECORD ⭐
  {
    sprintNumber: 76, code: 'T-Phase-5.A.1.8-PASS-B', composite: false, grade: 'A first-pass-clean',
    headSha: '0ab62e009cfb681ca06e91c7b289387ebf95ee64', predecessorSha: '92458e32e09c0770b636c4f5a02b332b18c680e6', loc: 400,
    newSiblings: [],
    bankDate: '2026-05-28', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 77a T-Phase-5.A.1.9-PASS-A · Comply360 Main Arc 1.9 · Pass A (engines) · 4 NEW SIBLINGs spanning 6 regimes (schedule-m pharma GMP greenfield · brsr-comprehensive reads brsr-fa · caro-extended reads caro-2020 §Y FROZEN · transfer-pricing reads form-3ceb + form-15ca-15cb) · 28-streak NEW RECORD ⭐
  {
    sprintNumber: 77, code: 'T-Phase-5.A.1.9-PASS-A', composite: false, grade: 'A first-pass-clean',
    headSha: 'baffe8f741441f8bf396bc448e0530eb433fc4ff', predecessorSha: '0ab62e009cfb681ca06e91c7b289387ebf95ee64', loc: 800,
    newSiblings: [
      'comply360-schedule-m-engine',
      'comply360-brsr-comprehensive-engine',
      'comply360-caro-extended-engine',
      'comply360-transfer-pricing-engine',
    ],
    bankDate: '2026-05-29', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 77b T-Phase-5.A.1.9-PASS-B · Comply360 Main Arc 1.9 · Pass B (5 surfaces + 2 mega-menus LIVE: companies/esg + exim 4th tab Foreign Tax sub-shell + 2 QualiCheck deep-links · Schedule M · CARO Extended · CFR Part 11 deep-link · BRSR Comprehensive · Foreign Tax 5-form) · 0 new SIBLINGs (pages not SIBLINGs) · 29-streak ⭐
  {
    sprintNumber: 77, code: 'T-Phase-5.A.1.9-PASS-B', composite: false, grade: 'A with adaptations',
    headSha: '55c667bd9c03e4f37f4214d4098d301f2e359ef0', predecessorSha: 'baffe8f741441f8bf396bc448e0530eb433fc4ff', loc: 1200,
    newSiblings: [],
    bankDate: '2026-05-29', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 78a T-Phase-5.A.1.10-PASS-A · Comply360 Main Arc 1.10 · Pass A (engines · 5 NEW SIBLINGs) · MSME aggregator + Audit-trail aggregator + Calendar + Time-Machine + Statutory Payments · 30-streak NEW RECORD ⭐
  {
    sprintNumber: 78, code: 'T-Phase-5.A.1.10-PASS-A', composite: false, grade: 'A first-pass-clean',
    headSha: 'd5db78986311ed587c47a343790a0b704fa9ad98', predecessorSha: '55c667bd9c03e4f37f4214d4098d301f2e359ef0', loc: 1950,
    newSiblings: [
      'comply360-msme-aggregator-engine',
      'comply360-audit-trail-aggregator-engine',
      'comply360-calendar-engine',
      'comply360-time-machine-engine',
      'comply360-statutory-payments-engine',
    ],
    bankDate: '2026-05-29', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 78b T-Phase-5.A.1.10-PASS-B · Comply360 Main Arc 1.10 · Pass B (3 surfaces + home tab-shell + 2 mega-menu wirings) · CalendarPage + StatutoryPaymentsPage + TimeMachinePage + HomePage (Welcome default + Time-Machine sub-tab · FR-106 recursive · Option B) · 0 new SIBLINGs · DP-S78-7 widget data-source rewire (no widget file edits) · Main Arc 1.10 COMPLETE
  {
    sprintNumber: 78, code: 'T-Phase-5.A.1.10-PASS-B', composite: false, grade: 'A first-pass-clean',
    headSha: 'ebf46f68328143e16e725018c4ab3c89f5d110c7', predecessorSha: 'd5db78986311ed587c47a343790a0b704fa9ad98', loc: 1100,
    newSiblings: [],
    bankDate: '2026-05-29', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 79a T-Phase-5.A.1.11-PASS-A · Comply360 Main Arc 1.11 · Pass A (engines + redirect-target stubs) · 3 NEW SIBLINGs (challan-vault · licenses-registry · esg-aggregator) + 9-11 redirect-target stub pages · FK-CAP-7 reads · 8 new EximX/MaintainPro/SiteX engines joining FR-19 boundary as read-sources · target 32-streak ⭐
  {
    sprintNumber: 79, code: 'T-Phase-5.A.1.11-PASS-A', composite: false, grade: 'A first-pass-clean',
    headSha: '99a163a8c4fbfb966fd651d5afbc88f381a6a2ab', predecessorSha: 'ebf46f68328143e16e725018c4ab3c89f5d110c7', loc: 1250,
    newSiblings: [
      'comply360-challan-vault-engine',
      'comply360-licenses-registry-engine',
      'comply360-esg-aggregator-engine',
    ],
    bankDate: '2026-05-29', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 79b T-Phase-5.A.1.11-PASS-B · Comply360 Main Arc 1.11 · Pass B (3 main surfaces + 2 router cases + EsgPage 3rd tab · FR-106 9th scenario) · 0 new SIBLINGs · target 33-streak ⭐
  {
    sprintNumber: 79, code: 'T-Phase-5.A.1.11-PASS-B', composite: false, grade: 'A first-pass-clean',
    headSha: 'bf1eb97713eb5cfe5a87fecc302673df06b5bc1b', predecessorSha: '99a163a8c4fbfb966fd651d5afbc88f381a6a2ab', loc: 1400,
    newSiblings: [],
    bankDate: '2026-05-29', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 79c T-Phase-5.A.1.11-PASS-C · Comply360 Main Arc 1.11 · Pass C · ATOMIC 29-redirect sweep + 2 deep-links + Lesson 29 cascade · FLOOR 1 FINALE · 0 new SIBLINGs · target 34-streak ⭐
  {
    sprintNumber: 79, code: 'T-Phase-5.A.1.11-PASS-C', composite: false, grade: 'A first-pass-clean',
    headSha: 'e3a0a7d36e2f3fc33e1062498d2959f49ee31caf', predecessorSha: 'bf1eb97713eb5cfe5a87fecc302673df06b5bc1b', loc: 800,
    newSiblings: [],
    bankDate: '2026-05-29', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 79d T-Phase-5.A.1.11-HYGIENE-D · Comply360 Main Arc 1.11 · Hygiene Pass · FA-tile location fix (cards-only invariant restored) + LedgerPackPage tab-shell promotion (FR-106 10th scenario) + 2 bundled hygiene items · 0 new SIBLINGs · target 35-streak ⭐
  {
    sprintNumber: 79, code: 'T-Phase-5.A.1.11-HYGIENE-D', composite: false, grade: 'A first-pass-clean',
    headSha: '75cb0b7636d5d5825e8b5a59e7fb12810f061b3e', predecessorSha: 'e3a0a7d36e2f3fc33e1062498d2959f49ee31caf', loc: 250,
    newSiblings: [],
    bankDate: '2026-05-29', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 80a T-Phase-5.B.2.1-PASS-A · Comply360 Floor 2 Audit-Suite OPENS · Foundation Engines Part 1 · 2 NEW SIBLINGs (audit-framework · auditor-workspace) · OOB-6/10/12 integrated · target 36-streak ⭐
  {
    sprintNumber: 80, code: 'T-Phase-5.B.2.1-PASS-A', composite: false, grade: 'A first-pass-clean',
    headSha: 'd72f3d946a885aa77b9e4655fe7e31191d4c3fd6', predecessorSha: '75cb0b7636d5d5825e8b5a59e7fb12810f061b3e', loc: 1200,
    newSiblings: ['comply360-audit-framework-engine', 'comply360-auditor-workspace-engine'],
    bankDate: '2026-05-29', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 80b T-Phase-5.B.2.1-PASS-B · Comply360 Floor 2 Audit-Suite · Pass B · 2 NEW SIBLINGs (audit-analytics · payroll-audit) · 18 Tally-equivalent procedures + 27 payroll-audit modules across 5 Layers · target 37-streak ⭐
  {
    sprintNumber: 80, code: 'T-Phase-5.B.2.1-PASS-B', composite: false, grade: 'A first-pass-clean',
    headSha: 'b0550dc9d7bd6cbedb9d1ca32dfcd39fd713480a', predecessorSha: 'd72f3d946a885aa77b9e4655fe7e31191d4c3fd6', loc: 1450,
    newSiblings: ['comply360-audit-analytics-engine', 'comply360-payroll-audit-engine'],
    bankDate: '2026-05-29', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 80c T-Phase-5.B.2.1-PASS-C · Cycle-2 hotfix banked · grade B (Lesson 29 cascade · 2 stub-text assertions surgically converted in hotfix · streak resets)
  {
    sprintNumber: 80, code: 'T-Phase-5.B.2.1-PASS-C', composite: false, grade: 'B',
    headSha: 'e989adb608cc3c19500df8e4e580ced362b2db78', predecessorSha: 'b0550dc9d7bd6cbedb9d1ca32dfcd39fd713480a', loc: 1400,
    newSiblings: [],
    bankDate: '2026-05-30', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 80d T-Phase-5.B.2.1-PASS-D · Comply360 Floor 2 Audit-Suite · Pass D · MCA Rule 11(g) Hardening · 3 NEW SIBLINGs (mca-coverage · audit-retention · audit-continuity) · DP-S80-24/25/26/27 · OOB-8 + 4 MCA-hardening DPs · 1-streak (post cycle-2 reset · 37 holds as record)
  {
    sprintNumber: 80, code: 'T-Phase-5.B.2.1-PASS-D', composite: false, grade: 'A first-pass-clean',
    headSha: '5f8ee0210cfbc4245d5b76c69775e439065ead7f', predecessorSha: 'e989adb608cc3c19500df8e4e580ced362b2db78', loc: 1400,
    newSiblings: ['comply360-mca-coverage-engine', 'comply360-audit-retention-engine', 'comply360-audit-continuity-engine'],
    bankDate: '2026-05-30', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 80e T-Phase-5.B.2.1-PASS-E · Comply360 Floor 2 Audit-Suite · Pass E · Headline Differentiator UX · 3 NEW SIBLINGs (audit-replay · cross-card-lineage · audit-ready-score) + OOB-7 Coverage Heatmap surface · target 2-streak ⭐
  {
    sprintNumber: 80, code: 'T-Phase-5.B.2.1-PASS-E', composite: false, grade: 'A first-pass-clean',
    headSha: '5d7be7d999f313420cb69ec9da74843dc95998a0',
    predecessorSha: '5f8ee0210cfbc4245d5b76c69775e439065ead7f', loc: 1400,
    newSiblings: ['comply360-audit-replay-engine', 'comply360-cross-card-lineage-engine', 'comply360-audit-ready-score-engine'],
    bankDate: '2026-05-30', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 80f T-Phase-5.B.2.1-PASS-F · Comply360 Floor 2 Audit-Suite FINALE · THE HEADLINE · Rule 11(g) Auditor Report Generator + OOB-2/4/5/9 + S80 arc close-summary · 16 of 16 OOBs DELIVERED · target 3-streak ⭐ · S80f-hotfix SHA backfilled @ S81a
  {
    sprintNumber: 80, code: 'T-Phase-5.B.2.1-PASS-F', composite: false, grade: 'A first-pass-clean',
    headSha: '5e99848664e6f9defecbcd5e6a2c5398214d8e9e',
    predecessorSha: '5d7be7d999f313420cb69ec9da74843dc95998a0', loc: 1400,
    newSiblings: ['comply360-rule-11g-report-engine', 'comply360-nlp-audit-ask-engine'],
    bankDate: '2026-05-30', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 81a T-Phase-5.B.2.2-PASS-A · Comply360 Floor 2 Internal Audit Arc 2.2 OPENS · 4 NEW SIBLINGs (internal-audit + ia-risk-register + ia-walkthrough + ia-control-testing) · 8 of 12 Q17 modules · re-graded A first-pass-clean post Cycle-2 hotfix
  {
    sprintNumber: 81, code: 'T-Phase-5.B.2.2-PASS-A', composite: false, grade: 'A first-pass-clean',
    headSha: '200b178466d111b10682e64066240f9d9e551cb5', predecessorSha: '5e99848664e6f9defecbcd5e6a2c5398214d8e9e', loc: 1500,
    newSiblings: [
      'comply360-internal-audit-engine',
      'comply360-ia-risk-register-engine',
      'comply360-ia-walkthrough-engine',
      'comply360-ia-control-testing-engine',
    ],
    bankDate: '2026-05-30', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 81b T-Phase-5.B.2.2-PASS-B · Internal Audit Dashboard + AuditTrailExplorer + 2 DP-S79-2 stub fills · FR-106 12th scenario · surface-only pass · 0 new SIBLINGs · target 5-streak ⭐
  {
    sprintNumber: 81, code: 'T-Phase-5.B.2.2-PASS-B', composite: false, grade: 'A first-pass-clean',
    headSha: '39f7dfdd0bb7c1760ff09db49c3fba55532fbb04', predecessorSha: '200b178466d111b10682e64066240f9d9e551cb5', loc: 1400,
    newSiblings: [],
    bankDate: '2026-05-30', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 81c T-Phase-5.B.2.2-PASS-C · Mock Audit Simulator + Walkthrough Automation + IA Recommendation · 3 NEW SIBLINGs · 7th IA Dashboard tab · OOB-6 extension · A first-pass-clean ⭐
  {
    sprintNumber: 81, code: 'T-Phase-5.B.2.2-PASS-C', composite: false, grade: 'A first-pass-clean',
    headSha: 'e4b4180e53494fb937804d0918a6cbeca784244a', predecessorSha: '39f7dfdd0bb7c1760ff09db49c3fba55532fbb04', loc: 1500,
    newSiblings: [
      'comply360-mock-audit-simulator-engine',
      'comply360-walkthrough-automation-engine',
      'comply360-ia-recommendation-engine',
    ],
    bankDate: '2026-05-31', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 81d T-Phase-5.B.2.2-PASS-D · Sample Engagement Seed + IA → External Audit Handoff + S81 ARC CLOSE-SUMMARY · 2 NEW SIBLINGs · 8th IA Dashboard tab · S81 ARC CLOSES · streak 7 ⭐
  {
    sprintNumber: 81, code: 'T-Phase-5.B.2.2-PASS-D', composite: false, grade: 'A first-pass-clean',
    headSha: '99cd1525a3b03780de2267b6c32576e5a63eca3d', predecessorSha: 'e4b4180e53494fb937804d0918a6cbeca784244a', loc: 1400,
    newSiblings: [
      'comply360-sample-engagement-seed',
      'comply360-ia-external-handoff-engine',
    ],
    bankDate: '2026-05-31', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 82 T-Phase-5.B.2.3 · Comply360 Floor 2 FINALE · External Audit + Survival Kit + DSC + Legal & Notices · 5 NEW SIBLINGs · FLOOR 2 OFFICIALLY CLOSES · 8-streak ⭐
  {
    sprintNumber: 82, code: 'T-Phase-5.B.2.3', composite: false, grade: 'A first-pass-clean',
    headSha: '6f9573e1db36beb25e376fa88d144e7a06ab9072', predecessorSha: '99cd1525a3b03780de2267b6c32576e5a63eca3d', loc: 1800,
    newSiblings: [
      'comply360-external-audit-engine',
      'comply360-external-confirmation-engine',
      'comply360-survival-kit-engine',
      'comply360-dsc-engine',
      'comply360-legal-notices-engine',
    ],
    bankDate: '2026-05-31', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 83 T-Phase-5.C.3.1 · Comply360 Floor 3 ROC-Suite Arc 3.1 OPENS · Q29 Part 1 · 5 NEW SIBLINGs · SPRINT #100 MILESTONE
  {
    sprintNumber: 83, code: 'T-Phase-5.C.3.1', composite: false, grade: 'A first-pass-clean',
    headSha: 'b52dadcf80f8575eb92b804ba33770fd22698ffe',
    predecessorSha: '6f9573e1db36beb25e376fa88d144e7a06ab9072', loc: 2400,
    newSiblings: [
      'comply360-dir3-kyc-engine',
      'comply360-aoc4-engine',
      'comply360-mgt7-engine',
      'comply360-adt1-engine',
      'comply360-statutory-registers-engine',
    ],
    bankDate: '2026-05-31', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 84 T-Phase-5.C.3.2 · Comply360 Floor 3 ROC-Suite Arc 3.2 · Q29 Part 2 · 5 NEW SIBLINGs · 10-streak ⭐ target · FLOOR 3 PASS 2 COMPLETE
  {
    sprintNumber: 84, code: 'T-Phase-5.C.3.2', composite: false, grade: 'A first-pass-clean',
    headSha: 'f6389fc933515d4125fd7682f3caa53e390d71b5', predecessorSha: 'b52dadcf80f8575eb92b804ba33770fd22698ffe', loc: 2100,
    newSiblings: [
      'comply360-event-filings-engine',
      'comply360-xbrl-builder-engine',
      'comply360-schedule-iv-engine',
      'comply360-schedule-v-engine',
      'comply360-schedule-vii-engine',
    ],
    bankDate: '2026-05-31', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 85 T-Phase-5.C.3.3 · Comply360 Floor 3 ROC-Suite Arc 3.3 · Q29 Part 3 · 4 NEW SIBLINGs + 1 NEW PAGE · OOB-7 STANDALONE · FLOOR 3 CLOSES
  {
    sprintNumber: 85, code: 'T-Phase-5.C.3.3', composite: false, grade: 'A first-pass-clean',
    headSha: '7fa57f626caa6df61a0acc1afa171abba32e4016', predecessorSha: 'f6389fc933515d4125fd7682f3caa53e390d71b5', loc: 1500,
    newSiblings: [
      'comply360-csr-engine',
      'comply360-meetings-engine',
      'comply360-whistleblower-engine',
      'comply360-cost-audit-engine',
    ],
    bankDate: '2026-05-31', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 86 T-Phase-5.D.4.1 · Comply360 Floor 4 Sector-Pack Arc 4.1 OPENS · Q30 Labour Codes 2026 + POSH + Gig Workers · 3 NEW SIBLINGs + 3 NEW PAGES · 12-streak ⭐
  {
    sprintNumber: 86, code: 'T-Phase-5.D.4.1', composite: false, grade: 'A first-pass-clean',
    headSha: '4aa2a8e71ab35666ff2d1471771ff65c940705e9', predecessorSha: '7fa57f626caa6df61a0acc1afa171abba32e4016', loc: 1400,
    newSiblings: [
      'comply360-labour-codes-engine',
      'comply360-posh-engine',
      'comply360-gig-workers-engine',
    ],
    bankDate: '2026-05-31', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 87 T-Phase-5.D.4.2 · Comply360 Floor 4 Sector-Pack Arc 4.2 CLOSES · Q31 Sector-Specific + Q27b AI Control Center + OOB-2/3/9 · 6 NEW SIBLINGs + 6 NEW PAGES · 13-streak ⭐
  {
    sprintNumber: 87, code: 'T-Phase-5.D.4.2', composite: false, grade: 'A first-pass-clean',
    headSha: '31fb49a09d97dddbef0f6604f6eae5e26c8dc94d', predecessorSha: '4aa2a8e71ab35666ff2d1471771ff65c940705e9', loc: 1900,
    newSiblings: [
      'comply360-sector-nbfc-engine',
      'comply360-sector-sebi-lodr-engine',
      'comply360-sector-rera-engine',
      'comply360-sector-fema-engine',
      'comply360-ai-control-center-engine',
      'comply360-cfo-pitch-deck-engine',
    ],
    bankDate: '2026-05-31', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 88 T-Phase-5.E.5.0 · Comply360 Polish Slot · POLISH SLOT closes · PHASE 5 ENDGAME OPENS · TRIPLE SHA backfill + cross-mega-menu nav polish + perf tuning + demo-seed-engine (15th USE-SITE READ MAXIMUM SCALE) + v1.30 §M/§N enforcement helpers · streak 14 ⭐
  {
    sprintNumber: 88, code: 'T-Phase-5.E.5.0', composite: false, grade: 'A first-pass-clean',
    headSha: '58d4246140ac2ac9681dfafab59cd5209ef7c381', predecessorSha: '31fb49a09d97dddbef0f6604f6eae5e26c8dc94d', loc: 650,
    newSiblings: ['comply360-demo-seed-engine'],
    bankDate: '2026-05-31', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 89 T-Phase-5.F.5.1 · Comply360 Floor 5 Comprehensive Compliance Arc 5.1 · FLOOR 5 OPENS · Q33 Fire Safety + Industrial Safety · 2 NEW SIBLINGs + 2 NEW PAGES · 15-streak ⭐
  {
    sprintNumber: 89, code: 'T-Phase-5.F.5.1', composite: false, grade: 'A first-pass-clean',
    headSha: '59b67d976e9afd8b89f3fda5aed408cb400fe0a0', predecessorSha: '58d4246140ac2ac9681dfafab59cd5209ef7c381', loc: 1800,
    newSiblings: ['comply360-fire-safety-engine', 'comply360-industrial-safety-engine'],
    bankDate: '2026-05-31', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 90 T-Phase-5.F.5.2 · Comply360 Floor 5.2 · Environmental Compliance Pt 1 · Q34 · 2 NEW SIBLINGs + 2 NEW PAGES · 16-streak ⭐
  {
    sprintNumber: 90, code: 'T-Phase-5.F.5.2', composite: false, grade: 'A first-pass-clean',
    headSha: '72aff23747e52e1945829ff68963e148d655a012', predecessorSha: '59b67d976e9afd8b89f3fda5aed408cb400fe0a0', loc: 1400,
    newSiblings: ['comply360-environmental-engine', 'comply360-eia-engine'],
    bankDate: '2026-05-31', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 91 T-Phase-5.F.5.3 · Comply360 Floor 5.3 · Waste Management · Q35 · 1 NEW SIBLING (6 sub-regimes) + 1 NEW PAGE · 17-streak ⭐
  {
    sprintNumber: 91, code: 'T-Phase-5.F.5.3', composite: false, grade: 'A first-pass-clean',
    headSha: 'fa305a277b8a2b1005fbbddea3a5d72fc88ad853', predecessorSha: '72aff23747e52e1945829ff68963e148d655a012', loc: 1500,
    newSiblings: ['comply360-waste-management-engine'],
    bankDate: '2026-05-31', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 92 T-Phase-5.F.5.4 · Comply360 Floor 5.4 · DPDP Act 2023 + Cyber Security · Q36 · 2 NEW SIBLINGs + 2 NEW PAGES · 18-streak ⭐
  {
    sprintNumber: 92, code: 'T-Phase-5.F.5.4', composite: false, grade: 'A first-pass-clean',
    headSha: '98f820391f5bab0193a2195a0562c4cf06eda75b', predecessorSha: 'fa305a277b8a2b1005fbbddea3a5d72fc88ad853', loc: 1200,
    newSiblings: ['comply360-dpdp-engine', 'comply360-cyber-security-engine'],
    bankDate: '2026-05-31', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 93 T-Phase-5.F.5.5 · Comply360 Floor 5.5 · Quality + Labour Tier-2 · Q37 · 2 NEW SIBLINGs + 2 NEW PAGES · 19-streak ⭐
  {
    sprintNumber: 93, code: 'T-Phase-5.F.5.5', composite: false, grade: 'A first-pass-clean',
    headSha: '29e3c6d9946283d821cd257ac1c7b1562f676479', predecessorSha: '98f820391f5bab0193a2195a0562c4cf06eda75b', loc: 1300,
    newSiblings: ['comply360-quality-standards-engine', 'comply360-labour-tier2-engine'],
    bankDate: '2026-05-31', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 94 T-Phase-5.F.5.6 · Comply360 Floor 5.6 CAPSTONE · CLOSES FLOOR 5 · Q38 MCA T2 + PMLA + IPR + Legal Contracts + GST/IT/Exim T2 · 5 NEW SIBLINGs + 2 NEW PAGES · 20-streak ⭐ · 161/161 obligations native 100%
  {
    sprintNumber: 94, code: 'T-Phase-5.F.5.6', composite: false, grade: 'A first-pass-clean',
    headSha: 'df1b9b713fdda0ba687177f103d0c94c0433914c', predecessorSha: '29e3c6d9946283d821cd257ac1c7b1562f676479', loc: 1710,
    newSiblings: [
      'comply360-mca-tier2-engine',
      'comply360-pmla-engine',
      'comply360-ipr-engine',
      'comply360-legal-contracts-engine',
      'comply360-tier2-extensions-engine',
    ],
    bankDate: '2026-05-31', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 95 T-Phase-5.F.5.7-Final · Comply360 Phase 5 CLOSE CEREMONY · final polish · Floor 5 Welcome tile navigation fix + S94 SHA backfill + Phase 5 Close-Ceremony Declaration · 21-streak ⭐ · CLOSES PHASE 5 · 161/161 obligations native 100%
  {
    sprintNumber: 95, code: 'T-Phase-5.F.5.7-Final', composite: false, grade: 'A first-pass-clean',
    headSha: 'c11d640efc435449411d9f89c9de84fb11422cc9', predecessorSha: 'df1b9b713fdda0ba687177f103d0c94c0433914c', loc: 400,
    newSiblings: [],
    bankDate: '2026-05-31', provenance: 'CONFIRMED',
  },
  // 🛠️ Sprint 95.1 HOTFIX T-Phase-5.F.5.7-Final-HOTFIX · cycle-2 correction · sidebar inactivity (44 entries type:'group'→'item') + v1.30 §N enforcement restored · streak 21 ⭐ HOLD per institutional hotfix-grace canon (Lesson 35 v1.24)
  {
    sprintNumber: 95.1, code: 'T-Phase-5.F.5.7-Final-HOTFIX', composite: false, grade: 'C',
    headSha: '5b84d631820b1df077ef564c1bff4281da666676', predecessorSha: 'c11d640efc435449411d9f89c9de84fb11422cc9', loc: 110,
    newSiblings: [],
    bankDate: '2026-06-01', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 96 T-Phase-6.A.0.1 · Arc 0 Master Data Foundation KICKOFF · Tally TDL Mechanism A native + Idea 1 Time-Travel Masters + Idea 4 Smart Master Sync · 3 NEW SIBLINGs · 4 new audit types under 'mca-roc' (master_replication_event/master_conflict_resolution/master_sync_run/master_version_change) · §H 0-DIFF on entity-setup-service + mock-entities + ComplianceModule · 22-streak ⭐ target · A (T1 surfaced at audit · first-pass-clean empirically false · hotfix-grace preserves streak)
  {
    sprintNumber: 96, code: 'T-Phase-6.A.0.1', composite: false, grade: 'A',
    headSha: '7f0cee2d900ace3f91ade9327b8d0641f0738322', predecessorSha: '5b84d631820b1df077ef564c1bff4281da666676', loc: 1070,
    newSiblings: ['master-replication-engine', 'idea-1-time-travel-masters-engine', 'idea-4-smart-master-sync-engine'],
    bankDate: '2026-06-01', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 97 T-Phase-6.A.0.2 · Arc 0 continuation · 7-tier Hierarchical Ledger + Master DNA · 2 NEW SIBLINGs + 1 NEW Standalone Page (#24 HierarchicalLedgerTreePage) · 2 new audit types under 'mca-roc' (hierarchical_ledger_created/master_dna_inheritance) · createBDLedgers PRIVATELY reimplemented inside hierarchical-ledger-engine · 23-streak ⭐ target · §L DESIGN-DECISION-FLAGs: 7-tier ordering · L4/L5 nesting · createBDLedgers reimpl · T1 surfaced at audit (no test pack + unwired hooks · resolved in T-Phase-6.A.0.2-T1)
  {
    sprintNumber: 97, code: 'T-Phase-6.A.0.2', composite: false, grade: 'A',
    headSha: '6eec46a164c9d9cf9e015c49b70da0b48d26c649', predecessorSha: '7f0cee2d900ace3f91ade9327b8d0641f0738322', loc: 1090,
    newSiblings: ['hierarchical-ledger-engine', 'idea-2-master-dna-engine'],
    bankDate: '2026-06-01', provenance: 'CONFIRMED',
  },
  // 🆕 Sprint 98 T-Phase-6.A.0.3 · Arc 0 continuation · Master Data Governance · 3 NEW SIBLINGs (field-lock-metadata-engine, idea-3-conflict-resolution-engine, idea-11-sync-throttle-engine) · 1 new audit type under 'mca-roc' (field_lock_rule_change) · DP-PH6-NEW-24 ratified ACCEPT group-shared model · Voucher-Type-only replication adapter · 24-streak ⭐ target · §L DESIGN-DECISION-FLAGs: group-shared storage tiers · stub→real merge UI mid-sprint · Stock Category deferred · Lesson 24 bounds-check on sibling-count test
  {
    sprintNumber: 98, code: 'T-Phase-6.A.0.3', composite: false, grade: 'A',
    headSha: 'd5788478255ca369982786ee87d0351b76e3e81a', predecessorSha: '6eec46a164c9d9cf9e015c49b70da0b48d26c649', loc: 1050,
    newSiblings: ['field-lock-metadata-engine', 'idea-3-conflict-resolution-engine', 'idea-11-sync-throttle-engine'],
    bankDate: '2026-06-01', provenance: 'CONFIRMED',
  },
];





export function getSprintCount(): number {
  return SPRINTS.length;
}

export function getCurrentAStreak(): number {
  let streak = 0;
  for (let i = SPRINTS.length - 1; i >= 0; i--) {
    // Skip hotfix entries (non-integer sprintNumbers) per institutional hotfix-grace canon
    if (!Number.isInteger(SPRINTS[i].sprintNumber)) continue;
    const g = SPRINTS[i].grade;
    if (g && g.startsWith('A')) streak++;
    else break;
  }
  return streak;
}
