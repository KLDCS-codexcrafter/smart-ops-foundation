# Dispatch True Remainder — FT-DISPATCH-001…023
**Sprint R0 · Block 1 · evidence only · predecessor HEAD `09682149`**

Source register: `docs/Future_Task_Register_Dispatch_Hub.md` + carry-over from `Future_Task_Register_RequestX.md` + Card 6 closure scoping (FT-DISPATCH-001…023 expanded from the Future Task envelope and the EX-1/15-series sprint backlog).

Method: ripgrep across `src/` against the named feature surface; verdict assigned per the criteria below.

Legend: ✅ BUILT · 🔶 PARTIAL · ❌ NOT BUILT · 🔵 SEAM-CLASS (needs live infra)

| # | Title | Verdict | Evidence / Seam |
|---|------|---------|-----------------|
| 001 | GRN Inward (physical receipt) | ✅ BUILT | `src/types/grn.ts:1-30` (D-128 boundary doc) · `src/pages/erp/dispatch/inward/InwardReceiptEntry.tsx` · `src/pages/erp/dispatch/inward/InwardReceiptRegister.tsx` · `src/lib/inward-receipt-engine.ts` |
| 002 | POD mobile wiring | 🔶 PARTIAL | POD register + detail UI exists (`src/pages/erp/dispatch/reports/PODRegister.tsx`, `src/pages/erp/dispatch/components/PODDetailDialog.tsx`); mobile capture surface NOT wired (`src/pages/mobile/MobileRouter.tsx` has no POD route). FT-DISPATCH-002 in register confirms partial closure 6-pre-3. |
| 003 | E-Way Bill | 🔶 PARTIAL | EWB UI lives in Comply360 (`src/pages/erp/comply360/exim/EWayBillPage.tsx`, `EWB02Page.tsx`, `EInvoiceEWayPage.tsx`); zero linkage from Dispatch (`rg "eway" src/pages/erp/dispatch` → empty). Dispatch-side trigger not wired. |
| 004 | GateFlow linkage | ❌ NOT BUILT | `rg -li "gateflow" src/pages/erp/dispatch` → empty. GateFlow sidebar/page exist (`src/apps/erp/configs/gateflow-sidebar-config.ts`) but no dispatch hand-off. |
| 005 | Sample / demo non-refundable expense booking | ❌ NOT BUILT | No sample-expense voucher route under dispatch or fincore (`rg -lin "sample.*expense\|demo.*expense" src` → empty). |
| 006 | Refundable sample return → stock transfer | ❌ NOT BUILT | `rg -lin "sample.return" src` → empty. ReturnablePackaging exists but is packaging-only, not sample-unit. |
| 007 | Packing material purchase → replenishment | 🔶 PARTIAL | `src/pages/erp/dispatch/masters/PackingMaterialMaster.tsx` + reorder count in `DispatchHubWelcome` (`packingReorderCount`). Purchase-loop closing PR/PO not wired (no procurement bridge file). |
| 008 | LR tracker rate-card validation | 🔶 PARTIAL | `src/pages/erp/dispatch/transactions/LRTracker.tsx` exists; `src/lib/freight-match-engine.ts` + `freight-calc-engine.ts` + `logistic-rate-utils.ts` provide rate-card math; LRTracker UI does NOT call match engine inline (`rg "rateCard\|rate.card" LRTracker.tsx` → empty). Reconciliation lives in `reports/ReconciliationSummaryReport.tsx`. |
| 009 | Packing slip → DLN auto-link | 🔶 PARTIAL | `src/pages/erp/dispatch/transactions/PackingSlipPrint.tsx` + `reports/print/PackingSlipPrint.tsx`; DLN entry at `transactions/DeliveryMemoEntry.tsx`. Auto-link field exists on DM (memo references supply_request_memo_no) but packing-slip→DLN handoff is manual. |
| 010 | Transporter portal LR acceptance visibility | ❌ NOT BUILT | No transporter portal surface (`rg -lin "transporter.portal" src` → empty). VendorPortal exists but is procurement-side. |
| 011 | Bin location for dispatch | ❌ NOT BUILT | `rg -lin "bin.location\|binLocation" src/pages/erp/dispatch` → empty. Storage/bin exists in Inventory (`StorageMatrix.tsx`) but not surfaced in dispatch flow. |
| 012 | Demo-unit serial tracking | ❌ NOT BUILT | `rg -lin "demo.serial\|demoUnit" src` → empty. Generic serial tracking exists (`useSerialNumbers.ts`) but no demo-unit lifecycle. |
| 013 | Handoff tracker GRN stage | ❌ NOT BUILT | `rg -lin "handoff" src/pages/erp/dispatch` → empty. |
| 014 | Welcome KPIs | ✅ BUILT | `src/pages/erp/dispatch/DispatchHubWelcome.tsx` — 4+ KPI tiles (inwardCount, quarantineCount, vendorReturnCount, releasedTodayCount, pendingAcksCount, packingReorderCount). |
| 015 | PDF invoice-extraction accuracy report | 🔵 SEAM-CLASS | `rg -lin "invoice.extract" src` → empty. Needs OCR/AI seam (Wave-2 seam: **DocAI/OCR pipeline**). |
| 016 | Real-time vehicle tracking | 🔵 SEAM-CLASS | `rg -lin "vehicle.tracking\|GPS" src` → empty. Needs live telemetry feed (Wave-2 seam: **GPS/Telematics ingest**). |
| 017 | AI freight audit | 🔵 SEAM-CLASS | `rg -lin "freight.audit" src` → empty; deterministic `freight-match-engine.ts` exists. AI variance-classifier needs LLM seam (Wave-2 seam: **AI Gateway · freight-audit prompt**). |
| 018 | Packing BOM variance → supplier loop | 🔶 PARTIAL | `src/pages/erp/dispatch/masters/PackingBOMMaster.tsx` exists; variance computation and supplier-feedback hook NOT present. |
| 019 | International shipment EximX linkage | ❌ NOT BUILT | `rg -lin "eximx" src/pages/erp/dispatch` → empty. EximX modules exist but no dispatch-side trigger. |
| 020 | Reusable packing-material return | 🔶 PARTIAL | `src/pages/erp/inventory/ReturnablePackagingMaster.tsx` + `useReturnablePackaging.ts` master exists; return-cycle transaction (out → back) not wired from Dispatch DLN. |
| 021 | OperixGo driver app | 🔵 SEAM-CLASS | `rg -lin "OperixGo" src` → empty under app routes (only `README-OperixGo-Native.md`). Needs Capacitor driver shell (Wave-2 seam: **OperixGo Native — Driver lane**). |
| 022 | Courier rate comparison | ❌ NOT BUILT | `rg -lin "courier.rate" src` → empty. LogisticMaster covers transporters; no courier-tier comparison UI. |
| 023 | Dispatch analytics → InsightX | 🔶 PARTIAL | InsightX cockpit exists (`src/features/insightx-cockpit/InsightXCockpitPage.tsx`); dispatch-specific tiles/feed not present (`rg "dispatch" src/features/insightx-cockpit` → empty). |

## Counts

| Verdict | Count |
|---|---|
| ✅ BUILT | 2 (001, 014) |
| 🔶 PARTIAL | 8 (002, 003, 007, 008, 009, 018, 020, 023) |
| ❌ NOT BUILT | 9 (004, 005, 006, 010, 011, 012, 013, 019, 022) |
| 🔵 SEAM-CLASS | 4 (015, 016, 017, 021) |
| **Total** | **23** |

## C5 candidate scope (❌ + 🔶, founder decides)
004 · 005 · 006 · 007 · 008 · 009 · 010 · 011 · 012 · 013 · 018 · 019 · 020 · 022 · 023 (= 15 items). The 4 seam-class items (015, 016, 017, 021) are Wave-2 by definition and excluded from C5.

— end Block 1 evidence · no code changed · WALLS honored.
