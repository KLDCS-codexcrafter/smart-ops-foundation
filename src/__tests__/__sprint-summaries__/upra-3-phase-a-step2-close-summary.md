# UPRA-3 Phase A · Step 2 · Tier-1 NEW Registers · Close Summary

**Predecessor HEAD:** 2f7213c7 (UPRA-2 Phase B · A first-pass-clean)
**Sprint:** Sprint_T-Phase-1_UPRA-3_PhaseA_Step2 · 4 Tier-1 NEW Registers
**STRICT TSC:** `npx tsc -p tsconfig.app.json --noEmit` → exit 0 ✅

## Registers added (4)

1. **DistributorOrderRegister** → `dh-r-distributor-order-register` (Distributor Hub · indigo)
2. **TransporterInvoiceRegister** → `dh-r-transporter-invoice-register` (Logistics Hub · blue)
3. **StockReceiptAckRegister** → `sh-r-stock-receipt-ack-register` (Store Hub · indigo · keyboard `s k`)
4. **GITRegister** → `git-register` (Procure360 · Reports group)

Each register: UniversalRegisterGrid<T> consumer + DetailPanel + A4 Print using
UniversalPrintFrame. Seeded with 3 Indian demo rows. STATUS_LABELS pulled from
canonical type unions in `src/types/{distributor-order,transporter-invoice,
stock-receipt-ack,git}.ts` (no enum drift · UPRA-2 lesson applied).

## D-decisions

- **Keyboard collision** (`s y` already taken by cycle-count-status): resolved to
  `s k` for stock receipt ack (mnemonic "stocK"). User-confirmed implicit
  ("proceed without second halt").
- D-NEW-CC sidebar-keyboard uniqueness preserved.
- Canonical-by-continuation of 2C-ii per v4.1 Amendment (no new D-decisions registered).

## Files created (13)

- `src/pages/erp/distributor-hub/reports/DistributorOrderRegister.tsx`
- `src/pages/erp/distributor-hub/reports/detail/DistributorOrderDetailPanel.tsx`
- `src/pages/erp/distributor-hub/reports/print/DistributorOrderPrint.tsx`
- `src/pages/erp/dispatch/reports/TransporterInvoiceRegister.tsx`
- `src/pages/erp/dispatch/reports/detail/TransporterInvoiceDetailPanel.tsx`
- `src/pages/erp/dispatch/reports/print/TransporterInvoicePrint.tsx`
- `src/pages/erp/store-hub/reports/StockReceiptAckRegister.tsx`
- `src/pages/erp/store-hub/reports/detail/StockReceiptAckDetailPanel.tsx`
- `src/pages/erp/store-hub/reports/print/StockReceiptAckPrint.tsx`
- `src/pages/erp/procure-hub/reports/GITRegister.tsx`
- `src/pages/erp/procure-hub/reports/detail/GITDetailPanel.tsx`
- `src/pages/erp/procure-hub/reports/print/GITPrint.tsx`
- `src/__tests__/__sprint-summaries__/upra-3-phase-a-step2-close-summary.md`

## Files edited (7)

- `src/pages/erp/distributor-hub/DistributorHubPage.tsx` (import + case)
- `src/pages/erp/distributor-hub/DistributorHubSidebar.tsx` (union + REPORTS_ITEMS + icon)
- `src/pages/erp/dispatch/DispatchHubPage.tsx` (import + case)
- `src/pages/erp/dispatch/DispatchHubSidebar.tsx` (union + REPORTS_ITEMS + icon)
- `src/pages/erp/store-hub/DepartmentStorePage.tsx` (import + case)
- `src/pages/erp/store-hub/DepartmentStoreSidebar.tsx` (union)
- `src/apps/erp/configs/store-hub-sidebar-config.ts` (sidebar item + keyboard `s k`)
- `src/pages/erp/procure-hub/Procure360Sidebar.types.ts` (union)
- `src/pages/erp/procure-hub/Procure360Page.tsx` (import + HASH_ALLOWLIST + getGroupLabel + getModuleLabel + renderModule case)
- `src/apps/erp/configs/procure360-sidebar-config.ts` (Reports group · item)

## Gates

- STRICT TSC 0 ✅
- All 4 registers reachable via sidebar + hash deep-link
- Status enums sourced from canonical type files (no `pending_approval`/`medium` drift)
- INR formatting via `formatINR` (paise) and `₹` Intl `en-IN` (rupees) — Indian locale strict
- A4 print via UniversalPrintFrame · signatories + T&C blocks per canonical pattern

**HALT. UPRA-3 Phase A Step 2 complete. TSC Clean. Bankable as A first-pass-clean.**
