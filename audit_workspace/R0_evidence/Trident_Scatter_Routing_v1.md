# Trident Scatter Routing — Reconciliation v1
**Sprint:** R0 · Step-2 · Block 2 (EVIDENCE ONLY · no code changes)
**Predecessor HEAD:** `09682149`
**Scope:** 11 routed enhancements (5 SalesX · 5 Inventory · 1 RequestX)
**Walls held:** ecomx · webstorex · fincore · party engines · applications.ts · seed/role/route maps = ZERO DIFF · NO new deps.

Legend: ✅ BUILT · 🔶 PARTIAL · ❌ NOT BUILT · 🔵 SEAM-CLASS (Wave-2 infra).

---

## SalesX (5)

| # | Item | Verdict | Evidence (file:line) | Routing note |
|---|------|---------|----------------------|--------------|
| TR-SX-01 | Order-amendment trail | ❌ NOT BUILT | No `amendmentTrail` / `order_amendment_log` / `sales_order_amend*` symbols in `src/` (grep neg.). `commission-engine.ts`, `lc-engine.ts` carry "amendment" but for LC/commission contexts, not SO. | Lives in **SalesX (C-SX)** backlog. |
| TR-SX-02 | Credit-block visibility | 🔶 PARTIAL | Engine + types present — `src/types/credit-hold.ts:8,10,22,28,45` (`CreditHoldMode hard_block\|soft_warn\|disabled`, `CreditHoldCheck`, `CreditHoldOverride`, audit key). Engine `src/lib/credit-hold-engine.ts`. Picker hint at `src/components/fincore/pickers/PartyPicker.tsx`. **Missing:** a dedicated SalesX "credit block visibility" panel/badge surface in the SO voucher. | Lives in **SalesX (C-SX)** backlog — engine wiring already merged. |
| TR-SX-03 | Price-approval queue | ❌ NOT BUILT | No `price.?approval(_queue)?` / `priceApproval` symbol in `src/` (grep neg.). | Lives in **SalesX (C-SX)** backlog. |
| TR-SX-04 | Dispatch-readiness flag | ❌ NOT BUILT | No `dispatch.?readiness` / `dispatchReady` symbol in `src/` (grep neg.). Adjacent: dispatch staging godown kind `src/types/godown.ts:103,121` ("dispatch staging") — infra exists, flag does not. | Lives in **SalesX (C-SX)** / **Dispatch (C-5)** seam backlog. |
| TR-SX-05 | Backorder register | 🔶 PARTIAL | Backorder concept present in storefront/webstorex — `src/lib/webstorex-engine.ts`, `src/types/webstorex.ts`, `src/pages/erp/webstorex/storefront/StorefrontComparePage.tsx`, `src/test/sprint-152/webstorex-visualizer.test.ts`. **Missing:** SalesX-side back-order register panel (open SO lines not allocatable today). | Lives in **SalesX (C-SX)** backlog — storefront engine is the data source. |

## Inventory / Store-Hub (5)

| # | Item | Verdict | Evidence (file:line) | Routing note |
|---|------|---------|----------------------|--------------|
| TR-IN-01 | Reorder suggestions | ✅ BUILT | Sidebar item `src/apps/erp/configs/store-hub-sidebar-config.ts:87-91` (`id: 'sh-r-reorder-suggestions'`, label "Reorder Suggestions"). Routes: `src/App.tsx:296,696` (`ReorderAlerts` lazy + `/erp/main-store-hub/reorder-alerts`). Page `src/pages/erp/inventory/ReorderAlerts.tsx`, matrix `src/pages/erp/inventory/ReorderMatrix.tsx`. Bridge to indents `src/lib/reorder-indent-bridge.ts` (D-385, ReorderSuggestion → MaterialIndent). Command Center panel `src/features/command-center/pages/CommandCenterPage.tsx:63,510`. | Lives in **Store-Hub** — shipped. |
| TR-IN-02 | Slow-moving report | ✅ BUILT | Panel `src/pages/erp/inventory/reports/SlowMovingDeadStockReport.tsx`. Wired `src/pages/erp/inventory/MainStoreHubPage.tsx:38,107` (`SlowMovingDeadStockReportPanel`, case `'r-slow-moving-dead'`). Group `src/pages/erp/inventory/MainStoreHubSidebar.groups.ts:26`. | Lives in **Store-Hub → Reports** — shipped. |
| TR-IN-03 | Batch-expiry alerts | 🔶 PARTIAL | Batch infra present `src/components/batch-grid/BatchList.tsx`, `BatchFormDialog.tsx` (batch + expiry fields). Contract-expiry alert engine `src/types/contract-expiry-alert.ts` exists for a different domain. **Missing:** a batch-expiry **alert** surface (dashboard widget / register) in Store-Hub. | Lives in **Store-Hub** backlog — data exists, alerting surface does not. |
| TR-IN-04 | Min-max review | ❌ NOT BUILT | No `MinMax` / `min_max` / `minMax` review surface in `src/` (only `minmax(...)` CSS grid utilities — false matches). Reorder min/max levels exist on item master (`inventory-item.ts`) but no review/audit panel. | Lives in **Store-Hub** backlog. |
| TR-IN-05 | Stock-aging buckets | ❌ NOT BUILT | No `stockAging` / `stock_aging` / `aging.?bucket` symbol in `src/` (`aging` matches are AR aging in `src/features/receivx/*` and `po-aging-cross-dept` in procure360 — different domains). | Lives in **Store-Hub** backlog. |

## RequestX (1)

| # | Item | Verdict | Evidence (file:line) | Routing note |
|---|------|---------|----------------------|--------------|
| TR-RX-01 | Indent-to-PO traceability | 🔶 PARTIAL | Forward bridge ReorderSuggestion → MaterialIndent shipped (`src/lib/reorder-indent-bridge.ts`, D-385, sibling of Card #6 gateflow-inward-bridge D-309). Demo indents promoted from reorder in `src/data/demo-store-hub-workflow-data.ts:4,12`. **Missing:** the downstream Indent → PO trace link (no `indent.?to.?po` / `indentTraceability` symbol; PO does not currently back-reference originating indent in a queryable trace surface). | Lives in **RequestX ↔ Procure360** seam backlog. |

---

## Counts

| Verdict | Count |
|---------|-------|
| ✅ BUILT | 2 |
| 🔶 PARTIAL | 4 |
| ❌ NOT BUILT | 5 |
| 🔵 SEAM-CLASS | 0 |
| **Total** | **11** |

## ❌/🔶 list — Trident remainder for founder triage

- TR-SX-01 Order-amendment trail (❌)
- TR-SX-02 Credit-block visibility (🔶 — UI surface only)
- TR-SX-03 Price-approval queue (❌)
- TR-SX-04 Dispatch-readiness flag (❌)
- TR-SX-05 Backorder register (🔶 — SalesX side)
- TR-IN-03 Batch-expiry alerts (🔶 — alert surface)
- TR-IN-04 Min-max review (❌)
- TR-IN-05 Stock-aging buckets (❌)
- TR-RX-01 Indent-to-PO traceability (🔶 — downstream leg)

Founder decides routing/scope at C-SX / C-5 / Store-Hub / RequestX cards.

## Walls

- ecomx engines: 0-diff ✅
- webstorex engines: 0-diff ✅ (read-only evidence)
- fincore engines: 0-diff ✅
- party engines: 0-diff ✅
- `applications.ts` / seed / role / route maps: 0-diff ✅
- No new deps ✅
- No feature code touched in Block 2 ✅

---
*R0 · Step-2 · Block 2 complete · awaiting "continue" for Block 3 (ImportHub honesty).*
