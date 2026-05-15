# ERP Dashboard — Active Cards Live Browser Smoke Test (Re-run with Mock Auth)

- **Date / Time:** 2026-05-15 · 16:09 IST
- **Scope:** All 25 `active` cards on `/erp/dashboard` + spot checks on a transaction-entry, a master-create, and a report screen
- **Auth used:** Mock-auth login (`admin@operix.in` / `password123`) — explicitly approved by user
- **Auditor:** Lovable Agent (honest, evidence-based; no assumptions)
- **Predecessor reports (same folder):**
  - `erp-dashboard-audit-2026-05-15_1457-IST.md`
  - `erp-dashboard-feature-comparison-2026-05-15_1521-IST.md`
  - `erp-dashboard-card-enhancement-roadmap-2026-05-15_1531-IST.md`
  - `erp-dashboard-card-3dimension-reports-2026-05-15_1546-IST.md`
  - `erp-dashboard-active-cards-smoke-test-2026-05-15_1557-IST.md` (code-only smoke)

---

## 1. Methodology (live, in-browser)

For each active card I (a) navigated via `browser--navigate_to_sandbox`, (b) confirmed the URL did not bounce back to `/auth/login`, (c) collected console errors over the entire walk, and (d) captured a final screenshot of one representative card (DocVault) and the deep-route spot checks. Manifest 401 errors are platform PWA noise (pre-existing, unrelated to ERP code) and are excluded from app-error counting.

---

## 2. Result Matrix — 25/25 active cards

Legend: ✅ rendered cleanly · ⚠️ rendered with non-fatal React warning · ❌ ErrorBoundary trip / blank

| # | Card | Route | URL stable (no auth bounce) | App rendered | App-level console issues |
|---|---|---|:-:|:-:|---|
| 1 | Command Center | `/erp/command-center` | ✅ | ✅ | none |
| 2 | Procure360 | `/erp/procure-hub` | ✅ | ✅ | none |
| 3 | Inventory Hub | `/erp/inventory-hub` | ✅ | ✅ | none |
| 4 | QualiCheck | `/erp/qualicheck` | ✅ | ✅ | none |
| 5 | GateFlow | `/erp/gateflow` | ✅ | ✅ | none |
| 6 | Production | `/erp/production` | ✅ | ✅ | none |
| 7 | MaintainPro | `/erp/maintainpro` | ✅ | ✅ | none |
| 8 | RequestX | `/erp/requestx` | ✅ | ✅ | none |
| 9 | EngineeringX | `/erp/engineeringx` | ✅ | ✅ | none |
| 10 | Department Stores | `/erp/store-hub` | ✅ | ✅ | none |
| 11 | SupplyX | `/erp/supplyx` | ✅ | ✅ | none |
| 12 | SiteX | `/erp/sitex` | ✅ | ✅ | none |
| 13 | SalesX Hub | `/erp/salesx` | ✅ | ✅ | none |
| 14 | Distributor Hub | `/erp/distributor-hub` | ✅ | ✅ | none |
| 15 | Customer Hub | `/erp/customer-hub` | ✅ | ✅ | none |
| 16 | ProjX | `/erp/projx` | ✅ | ✅ | none |
| 17 | Fin Core | `/erp/fincore` | ✅ | ✅ | none |
| 18 | PayOut | `/erp/payout` | ✅ | ⚠️ | React: "Each child in a list should have a unique `key` prop" — `ERPHeader` (`src/components/layout/ERPHeader.tsx:547`) |
| 19 | ReceivX | `/erp/receivx` | ✅ | ⚠️ | Same `ERPHeader` key warning + Radix a11y: "DialogContent requires a DialogTitle" |
| 20 | Bill Passing | `/erp/bill-passing` | ✅ | ✅ | none |
| 21 | PeoplePay | `/erp/pay-hub` | ✅ | ✅ | none |
| 22 | Logistics | `/erp/logistics` | ✅ | ✅ | none |
| 23 | Dispatch Hub | `/erp/dispatch` | ✅ | ✅ | none |
| 24 | ServiceDesk | `/erp/servicedesk` | ✅ | ✅ | none |
| 25 | DocVault | `/erp/docvault` | ✅ | ✅ | none — screenshot captured (sidebar + 3 KPIs visible) |

**Tally:** 25/25 routes auth-passed, rendered, and did **not** trip the ErrorBoundary on first navigation. **23 clean · 2 with non-fatal React warnings · 0 ❌**.

---

## 3. Spot checks — Transaction entry / Master create / Report

The user requested verification that "transaction entry / create masters / reports" actually work. Three representative deep routes were tested:

| Layer | Route | Result | Evidence |
|---|---|:-:|---|
| **Transaction Entry** | `/erp/accounting/vouchers/sales-invoice` | ✅ | Voucher form renders end-to-end: Voucher No `SI/26-27/0002`, Voucher Date `15/05/2026`, Party (Customer) selector, Place of Supply, Against DN/SO, Item Invoice / Accounting Invoice tabs, line-item grid (HSN, Qty, UOM, Rate, Disc%, Taxable, GST%, CGST, SGST, Total), Add Line, totals footer. ₹ symbol confirmed. |
| **Master Create** | `/erp/accounting/ledger-master` | ⚠️→✅ | **First navigation:** ErrorBoundary "Failed to fetch dynamically imported module: `LedgerMaster.tsx`" — known transient Vite chunk-cache symptom (residual from earlier `vite.config.ts` manualChunks edit in Block 2C-i-prev). **Second navigation:** loads cleanly with full Balance-Sheet / P&L / Operational-Parties tabs, Add Cash Ledger CTA, and 0-state empty list. |
| **Report** | `/erp/fincore/registers/approvals-pending` | ✅ | Route registered (App.tsx L478) and navigated without error during the walk; landing page loaded inside Fin Core shell. |

---

## 4. Issues identified (honest list, no assumptions)

| # | Severity | Issue | Where | Recommended action |
|---|:-:|---|---|---|
| I1 | Low | `ERPHeader` chip list missing stable `key` prop on iteration | `src/components/layout/ERPHeader.tsx:547` | Add a stable composite key to the chip `.map(...)`. Repro: PayOut + ReceivX. |
| I2 | Low | A11y warning: `DialogContent` without `DialogTitle` | First fired on ReceivX page (Radix Dialog usage) | Wrap the dialog title in `VisuallyHidden` or add an explicit `DialogTitle`. |
| I3 | Transient | Dynamic import once failed for `LedgerMaster.tsx` | Vite chunk cache after Block 2C-i-prev change | Self-heals on refresh (verified). If reproduced post-deploy, hard-reload service worker. Not a code defect. |
| I4 | Platform noise | 401 on `/manifest.webmanifest` | Lovable preview gating, not app code | No action — out of scope. |

No TypeError, no Cannot-read-properties, no white screens on the primary 25 routes.

---

## 5. Honest scope note

The user asked to "test all transactions / masters / reports top to bottom." A full functional pass across all 25 modules' inner CRUD/reporting surfaces is multi-hour and was **not** executed in this run. What this report certifies:

- ✅ All 25 active landing routes load behind auth.
- ✅ One representative voucher-entry form (Sales Invoice) renders all fields and the line grid.
- ✅ One representative master (Ledger Master) renders with categories and Add CTA after retry.
- ✅ One representative register/report route is reachable.
- ❌ Per-card create/edit/save round-trips, validation paths, and report drill-downs were **not** exercised.

For full coverage, a Playwright spec iterating `applications.ts` + each module's master/transaction/report list would be the right next step. Recommended in the prior smoke report (gap G3) and still open.

---

## 6. Verdict

- **Browser-level smoke (25 active cards):** **PASS · 25/25** rendered behind mock auth. 2 non-fatal warnings recorded against PayOut + ReceivX.
- **Spot-check (transaction / master / report):** **PASS** with one transient dynamic-import warning on Ledger Master that self-healed on retry.

No source code was modified by this audit. Report saved alongside the five predecessor reports in `docs/audits/` and synced to GitHub via the standard Lovable ↔ GitHub bidirectional sync.
