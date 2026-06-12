# W1C-2 · Polish Bundle + Audit Riders · Close Summary

**Predecessor HEAD:** `9a47f31` (W1C-1)
**Sprint:** T-W1C2-Polish-Riders · Wave-1 Close Arc · sprint 2 of 3
**ZERO new SIBLINGs**

---

## Block 1 — InlineMasterCreate REAL FORMS  ✅
- `src/components/fincore/pickers/PartyPicker.tsx` — replaced 2 `toast.info(...)` TODO stubs with a real shadcn `<Dialog>` inline-create form (name + type + GSTIN-optional). Writes through `erp_group_customer_master` / `erp_group_vendor_master` (same storage key + record shape the full Customer/Vendor Master pages persist into). New record auto-selected via `onChange`. Both Polish-1.5 TODO comments removed.
- `src/components/fincore/pickers/LedgerPicker.tsx` — same recipe: real Dialog (name + group). Writes through `erp_group_ledger_definitions` (same key the `LedgerMaster` page persists into). Group options cover the 9 standard parents (cash/bank/sundry-d/sundry-c/dir-exp/ind-exp/dir-inc/ind-inc/duty). Both Polish-1.5 TODO comments removed.
- Removed obsolete `InlineMasterCreate` import (the stub Sheet is no longer wired).

## Block 2 — T10-pre.2 ItemPicker  ✅
- Created `src/components/fincore/pickers/ItemPicker.tsx` following the GodownPicker pattern. Reads `erp_inventory_items` (the same store `useInventoryItems` hook owns). NOTE: pre-flight search found no pre-existing reusable ItemPicker in the tree; the one in `webstorex/commerce/SchemesPage.tsx` is a local file-scoped `<Select>` (not reusable). The new picker is a thin consume of the existing inventory storage — not a new engine.
- `src/components/fincore/StockTransferLineGrid.tsx` — plain-text `<Input>` swapped for `<ItemPicker>`. Selection populates `item_id`, `item_name`, and `uom` on the line; qty/rate flow untouched. Header TODO note removed.

## Block 3 — RIDER: VendorPerformanceView migration  ✅
- `src/pages/vendor-portal/VendorPerformanceView.tsx`:
  - Removed `recharts` import (`RadarChart`, `PolarGrid`, `PolarAngleAxis`, `PolarRadiusAxis`, `Radar`, `ResponsiveContainer`).
  - Replaced with `<ReportChart chartType='bar'/>` over the SAME `score.factor_breakdown` computed data (no data-logic change). Bar substitutes for radar — same 6 factors visualized.
  - Integrity badge wired via `signReport(radarData)` with `data-testid="vp-performance-integrity-badge"` and chart-host `data-testid="vp-performance-chart-host"`.
- `src/lib/report-framework/__tests__/arc-close-sweep.test.ts` — removed `'src/pages/vendor-portal/VendorPerformanceView.tsx'` from `RECHARTS_LEGACY_ALLOWLIST`. The vendor-portal entry is now gone; only the 5 non-ERP non-vendor-portal entries remain (Welcome, 2 bridge workbenches, customer dashboard, tower billing).

## Block 4 — RIDER: SiteTwin honest-data pass  ✅
- `src/pages/erp/sitex/reports/SiteTwinDashboard.tsx`:
  - Removed all 6 hardcoded `trend: [...]` literals + `trend: number[]` field on `RAGCardSpec` + the per-card `<ReportChart>` sparkline element. Pre-flight inspection of `site-health-score-engine.ts` and `sitex-imprest-engine.ts` confirmed **no real historical series exists** — both engines return single-snapshot scores. NO invented series.
  - RAG cards now stand on real engine values only (Safety/Schedule/Cost/Quality/Imprest from `computeSiteHealthScore` + `computeImprestHealthMetrics`; Stock card declares "No variance data" rather than fake `<2%`).
  - A single page-level `<ReportChart chartType='bar'/>` over the already-real `aggregated` array preserves the chart-host integrity testid and `ReportChart` import (so arc-close-sweep stays green).
  - Signed `aggregated` (real engine values) untouched.

## Block 5 — RIDER: sprint-81a relaxation + institutional + close  ✅
- `src/test/sprint-81a/comply360-sprint-81a.test.ts` — the ESLint-inside-vitest case at line 425 converted to `it.skip(...)` with rationale: *"superseded by direct pipeline gate"*. The other 52 structural cases untouched.
- `src/lib/_institutional/sprint-history.ts`:
  - Backfilled W1C-1 `headSha` to `'9a47f31'`, provenance `'CONFIRMED'`.
  - Self-seeded W1C-2 as `T-W1C2-Polish-Riders`, `newSiblings: []`.
- **ZERO new SIBLINGs** declared.

## Tests · 5 new files (one per block) + regression
```
src/__tests__/w1c-2/inline-master-create.test.ts          (Block 1 · 8 assertions)
src/__tests__/w1c-2/item-picker-swap.test.ts              (Block 2 · 5 assertions)
src/__tests__/w1c-2/vendor-performance-migration.test.ts  (Block 3 · 6 assertions)
src/__tests__/w1c-2/site-twin-honest.test.ts              (Block 4 · 7 assertions)
src/__tests__/w1c-2/institutional.test.ts                 (Block 5 · 5 assertions)
                                                          --- Σ 31 (≥ 16) ---
```

## Gate Output
**TSC (`npx tsc -p tsconfig.app.json --noEmit`):** 0 errors.
**ESLint (`npx eslint <touched files> --max-warnings 0`):** 0 errors / 0 warnings.

**Scoped Vitest (`w1c-2/ + arc-close-sweep + rpt-12c + w1c-1`):**
```
 Test Files  29 passed (29)
      Tests  155 passed (155)
```

Allowlist after W1C-2 (vendor-portal removed):
```
RECHARTS_LEGACY_ALLOWLIST = {
  src/pages/Welcome.tsx,
  src/pages/bridge/ExceptionWorkbench.tsx,
  src/pages/bridge/ReconciliationWorkbench.tsx,
  src/pages/customer/CustomerDashboard.tsx,
  src/pages/tower/Billing.tsx,
}
```

## Files Modified
- `src/components/fincore/pickers/PartyPicker.tsx`
- `src/components/fincore/pickers/LedgerPicker.tsx`
- `src/components/fincore/StockTransferLineGrid.tsx`
- `src/pages/vendor-portal/VendorPerformanceView.tsx`
- `src/pages/erp/sitex/reports/SiteTwinDashboard.tsx`
- `src/lib/report-framework/__tests__/arc-close-sweep.test.ts`
- `src/test/sprint-81a/comply360-sprint-81a.test.ts`
- `src/lib/_institutional/sprint-history.ts`

## Files Created
- `src/components/fincore/pickers/ItemPicker.tsx`
- `src/__tests__/w1c-2/inline-master-create.test.ts`
- `src/__tests__/w1c-2/item-picker-swap.test.ts`
- `src/__tests__/w1c-2/vendor-performance-migration.test.ts`
- `src/__tests__/w1c-2/site-twin-honest.test.ts`
- `src/__tests__/w1c-2/institutional.test.ts`
- `audit_workspace/W1C_2_close_evidence/close_summary.md`

## Triple Gate ·  Clean ✅
TSC 0 · ESLint 0/0 · Scoped Vitest 155/155 · Arc-close-sweep absolute (vendor-portal allowlist entry removed).
