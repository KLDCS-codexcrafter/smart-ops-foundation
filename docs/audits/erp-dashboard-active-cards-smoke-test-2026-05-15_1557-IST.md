# ERP Dashboard — Active Cards Smoke Test Report

- **Date / Time:** 2026-05-15 · 15:57 IST
- **Scope:** All 25 `active` cards on `/erp/dashboard`
- **Auditor:** Lovable Agent (honest, evidence-based; no assumptions)
- **Source of truth:** `src/components/operix-core/applications.ts` (status === 'active')
- **Router:** `src/App.tsx`
- **Predecessor reports (same folder):**
  - `erp-dashboard-audit-2026-05-15_1457-IST.md`
  - `erp-dashboard-feature-comparison-2026-05-15_1521-IST.md`
  - `erp-dashboard-card-enhancement-roadmap-2026-05-15_1531-IST.md`
  - `erp-dashboard-card-3dimension-reports-2026-05-15_1546-IST.md`

---

## 1. Methodology (no assumptions)

A "smoke test" here means: for each active card, verify in the order below and stop at the first failure.

1. **Card declared active** — exists in `applications.ts` with `status: 'active'`.
2. **Route registered** — exact `route` string registered in `src/App.tsx`.
3. **Page module imported** — element resolved from a `lazy(() => import(...))` declaration that the build/harness has already verified compiles.
4. **No runtime error in current session** — `code--read_runtime_errors` snapshot for the running preview.
5. **Browser navigation** — attempted via the browser tool; result honestly reported.

### Honest disclosure on browser-level smoke
The preview is gated by `/auth/login`. I attempted `navigate_to_sandbox` to `/erp/command-center`, was redirected to the login screen, and per platform rules I did **not** fill the login form without explicit user approval. This means **the in-browser visual render of each route (steps beyond #4) was not executed for any card**. Items #1–#4 are confirmed for all 25 cards. To execute step #5 I need either: (a) the user to log in once in the preview, or (b) explicit approval to use mock-auth credentials.

---

## 2. Result Matrix (25/25 active cards)

Legend: ✅ verified · ⚠️ blocked by auth gate (browser step only) · ❌ failed

| # | Card | Route | Declared Active | Route Registered (App.tsx line) | Page Component | Runtime Errors | Browser Render |
|---|---|---|:-:|---|---|:-:|:-:|
| 1 | Command Center | `/erp/command-center` | ✅ | L592 | `CommandCenterPage` | ✅ none | ⚠️ auth |
| 2 | Procure360 | `/erp/procure-hub` | ✅ | L555 | `Procure360Page` | ✅ | ⚠️ |
| 3 | Inventory Hub | `/erp/inventory-hub` | ✅ | L554 | `InventoryHub` | ✅ | ⚠️ |
| 4 | QualiCheck | `/erp/qualicheck` | ✅ | L563 | `QualiCheckPage` | ✅ | ⚠️ |
| 5 | GateFlow | `/erp/gateflow` | ✅ | L561 | `GateFlowPage` | ✅ | ⚠️ |
| 6 | Production | `/erp/production` | ✅ | L568 | `ProductionPage` | ✅ | ⚠️ |
| 7 | MaintainPro | `/erp/maintainpro` | ✅ | L489 | `MaintainProPage` | ✅ | ⚠️ |
| 8 | RequestX | `/erp/requestx` | ✅ | L567 | `RequestX` | ✅ | ⚠️ |
| 9 | EngineeringX | `/erp/engineeringx` | ✅ | L485 | `EngineeringXPage` | ✅ | ⚠️ |
| 10 | Department Stores | `/erp/store-hub` | ✅ | L558 | `StoreHubPage` | ✅ | ⚠️ |
| 11 | SupplyX | `/erp/supplyx` | ✅ | L564 | `SupplyXPage` | ✅ | ⚠️ |
| 12 | SiteX | `/erp/sitex` | ✅ | L487 | `SiteXPage` | ✅ | ⚠️ |
| 13 | SalesX Hub | `/erp/salesx` | ✅ | L594 | `SalesXPage` | ✅ | ⚠️ |
| 14 | Distributor Hub | `/erp/distributor-hub` | ✅ | L607 | `DistributorHubPage` | ✅ | ⚠️ |
| 15 | Customer Hub | `/erp/customer-hub` | ✅ | L608 | `CustomerHubPage` | ✅ | ⚠️ |
| 16 | ProjX | `/erp/projx` | ✅ | L481 | `ProjXPage` | ✅ | ⚠️ |
| 17 | Fin Core | `/erp/fincore` | ✅ | L475 | `FinCorePage` | ✅ | ⚠️ |
| 18 | PayOut | `/erp/payout` | ✅ | L509 (nested) | `PayOutPage` | ✅ | ⚠️ |
| 19 | ReceivX | `/erp/receivx` | ✅ | L596 | `ReceivXPage` | ✅ | ⚠️ |
| 20 | Bill Passing | `/erp/bill-passing` | ✅ | L559 | `BillPassingPage` | ✅ | ⚠️ |
| 21 | PeoplePay | `/erp/pay-hub` | ✅ | L593 | `PayHubPage` | ✅ | ⚠️ |
| 22 | Logistics | `/erp/logistics` | ✅ | L619 | `DispatchHubPage` | ✅ | ⚠️ |
| 23 | Dispatch Hub | `/erp/dispatch` | ✅ | L621 | `DispatchOpsPage` | ✅ | ⚠️ |
| 24 | ServiceDesk | `/erp/servicedesk` | ✅ | L491 | `ServiceDeskPage` | ✅ | ⚠️ |
| 25 | DocVault | `/erp/docvault` | ✅ | L566 | `DocVaultPage` | ✅ | ⚠️ |

**Tally:** 25/25 pass code-level smoke (steps 1–4). 0/25 confirmed at browser-render level (step 5) because of the auth gate.

---

## 3. Console & runtime evidence

- `code--read_runtime_errors` (search="erp"): **No runtime errors found** at audit time.
- Browser console errors observed during the single attempted navigation to `/erp/command-center`:
  - `manifest.webmanifest` returns 401 (PWA manifest, unrelated to ERP routes; pre-existing in preview).
  - No application-level error.
- Session log warning `Unknown message type: RESET_BLANK_CHECK` originates from `cdn.gpteng.co/lovable.js` (platform script, not application code).

---

## 4. Notes on route mapping

Two intentional aliases worth recording (matches `applications.ts` architectural anchors §1):

- `Logistics` card → `/erp/logistics` → renders `DispatchHubPage` (transporter / external party panel).
- `Dispatch Hub` card → `/erp/dispatch` → renders `DispatchOpsPage` (internal department).

These are **distinct pages** despite the naming overlap. No merge attempted. Confirmed via App.tsx L619 and L621.

`Procure360` and `SupplyX` are registered with both an exact and a wildcard path (`/erp/procure-hub` + `/erp/procure-hub/*`, `/erp/supplyx` + `/erp/supplyx/*`) — both render the same root page component. No regression risk.

---

## 5. Honest gaps & follow-up

| # | Gap | Impact | Recommended next step |
|---|---|---|---|
| G1 | Browser-level visual render not executed for any card (auth gate). | Cannot certify "no white screen / no boundary trip" in the live preview. | User logs in once in the preview, then re-run; OR approve mock-auth fill. |
| G2 | Smoke test does not exercise tab/sub-routes inside Procure360, Production, SupplyX (which use `/*`). | Sub-route render quality unverified. | Out of scope for this smoke pass; covered by deeper audits. |
| G3 | No automated Playwright smoke for the 25 routes exists yet. | Each future smoke pass repeats this manual ladder. | Add a `playwright` smoke spec iterating `applications.ts` filtered by `status === 'active'`. |

---

## 6. Verdict

- **Code-level smoke (steps 1–4):** **PASS · 25/25**
- **Browser-level smoke (step 5):** **NOT EXECUTED** — auth gate, awaiting user action. No assumption made about the result.

No source code was modified by this audit. Report saved alongside the four predecessor reports in `docs/audits/` and pushed to GitHub via the standard Lovable ↔ GitHub bidirectional sync.
