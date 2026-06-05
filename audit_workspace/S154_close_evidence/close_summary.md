# Sprint 154 · EcomX Money Suite — CLOSE SUMMARY

Predecessor HEAD: `92fcc021` (S153 banked) · two-pass · ONE commit (Block 9) · gates LAST · ~1,650 LOC zone

## Disposition table (enumerate-or-fail · 1:1 to Blocks 0.1–8)

| #     | Item | Status | Evidence (file:line) |
|-------|------|--------|----------------------|
| 0.1   | HEAD = `92fcc021` · tree clean at sprint start | CONFIRMED | `git log -1` / `git status --porcelain` empty |
| 0.2   | S153 `TBD_AT_BANK` backfill (adaptive: row inserted, then `'92fcc021'`) | DELIVERED | `src/lib/_institutional/sprint-history.ts:928-933` |
| 0.3   | `ecomx-engine` call-only surface (`listMarketplaces`/`listEcOrders`/`resolveListing` + S154 additive `markOrderReturned`) | DELIVERED · 0-DIFF on prior 19 + 1 additive | `src/lib/ecomx-engine.ts:70, 254, 790, 831` |
| 0.4   | Stock-on-hand engine read — adaptive: manual `availableQtyEntered` + Σ-guard | DELIVERED · honest label "entered manually — Inventory Hub live link is a Phase-2 seam" | `src/types/ecomx.ts:240` · `src/lib/ecomx-recon-engine.ts:720, 753-767` |
| 0.5   | Godown engine read — adaptive: free-text facility label | DELIVERED | `src/types/ecomx.ts:226-227` · `src/lib/ecomx-recon-engine.ts:331-332` |
| 0.6   | CSV helper — adaptive: created local `ecomx-csv.ts` delegating to `downloadBlob`/`csvEscapeCell`/`buildExportFilename` | DELIVERED · ~17 LOC, no dup | `src/pages/erp/ecomx/lib/ecomx-csv.ts:1-22` |
| 0.7   | Sibling-register adds `ecomx-recon-engine` (N → N+1) | DELIVERED · N = 177 minimum | `src/lib/_institutional/sibling-register.ts` (entry registered) |
| 1     | Additive types (`EcSettlementTemplate`/`EcSettlementRow`/`EcStagedSettlementRow`/`EcVarianceClass`/`EcReconLine`/`EcReconRun`/`EcClaim`/`EcReturn`/`EcChannelAllocation`) | DELIVERED · APPEND ONLY (S153 types 0-DIFF) | `src/types/ecomx.ts:121-252` |
| 2     | `ecomx-recon-engine.ts` · templates + suggest + parse + commit (idempotent) + recon + tax-credits + claims + returns + allocation + stock export | DELIVERED · 821 LOC | `src/lib/ecomx-recon-engine.ts:1-821` |
| 3     | `markOrderReturned` — sole additive export on `ecomx-engine` | DELIVERED · idempotent | `src/lib/ecomx-engine.ts:831-844` |
| 4     | DP-EC-6 statutory honesty: configured % flags rate-anomaly notes only; file-reported TDS/TCS NEVER overwritten; no hardcoded `0.1`/`1.0` literals | DELIVERED · text-asserted in tests | `src/lib/ecomx-recon-engine.ts:435-450` · tests `src/test/sprint-154/ecomx-money.test.ts:357-371` |
| 5     | DP-EC-7 claim history append-only · mandatory note | DELIVERED · throws on empty note · only appends to `statusHistory` | `src/lib/ecomx-recon-engine.ts:627-657` |
| 6.1   | Sidebar adds Settlements/Reconciliation/Claims/Returns/Allocation (e s / e r / e c / e t / e a) | DELIVERED · ZERO per-item requiredCards | `src/apps/erp/configs/ecomx-sidebar-config.ts:24-29` |
| 6.2   | Module switch wires the 5 new panels | DELIVERED | `src/pages/erp/ecomx/EcomXPage.tsx:11-39` |
| 6.3   | Settlements page (template + upload + parse triad + commit + tax-credit accumulators + CSV export) | DELIVERED | `src/pages/erp/ecomx/settlements/EcomXSettlementsPage.tsx` |
| 6.4   | Reconciliation page (run controls + variance dashboard + 6-class register + claim shortcut + CSV export) | DELIVERED | `src/pages/erp/ecomx/reconciliation/EcomXReconciliationPage.tsx` |
| 6.5   | Claims page (stats KPIs + status transitions with mandatory note + history length) | DELIVERED | `src/pages/erp/ecomx/claims/EcomXClaimsPage.tsx` |
| 6.6   | Returns page (filter + register) | DELIVERED | `src/pages/erp/ecomx/returns/EcomXReturnsPage.tsx` |
| 6.7   | Allocation page (Σ-guard input + buffer % + stock-file CSV export) | DELIVERED | `src/pages/erp/ecomx/allocation/EcomXAllocationPage.tsx` |
| 7     | Mobile-honest at 380px (stack, table inside `overflow-x-auto`, single-col forms grow to multi-col on `sm:`) | DELIVERED | all 5 new panels use `p-4 sm:p-6 md:p-10` + `grid-cols-1 sm:grid-cols-3/5` |
| 8.1   | ≥34 behavioral it() in `src/test/sprint-154/ecomx-money.test.ts` | DELIVERED · **48 it() pass** | `src/test/sprint-154/ecomx-money.test.ts` |
| 8.2   | Settlement idempotency (re-commit = ZERO new rows) | ASSERTED in 3 it() | `src/test/sprint-154/ecomx-money.test.ts` (`SECOND commit of same importId adds ZERO rows`; `re-parsing then committing identical rows produces ZERO inserts`) |
| 8.3   | All SIX EcVarianceClass classified | ASSERTED · one it() per class + a summary it() | `src/test/sprint-154/ecomx-money.test.ts` (`runRecon · 6 EcVarianceClass coverage` describe block) |
| 8.4   | Claim statusHistory append-only | ASSERTED | test `updateClaimStatus APPENDS to statusHistory (never rewrites prior entries)` |
| 8.5   | Allocation Σ-guard throws | ASSERTED | test `Σ-guard THROWS when total across marketplaces exceeds availableQtyEntered` |
| 8.6   | No hardcoded 0.1/1.0 in recon math | ASSERTED · text-scan on engine source | tests `source does NOT contain numeric tax-rate fallback 0.1 / 1.0` |
| 9     | This close summary (Block-9 commit) | DELIVERED | this file |

## Gates (real outputs)

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | **0 errors** |
| `npx eslint . --max-warnings 0` | **0 errors / 0 warnings** |
| `npx vitest run src/test/sprint-153 src/test/sprint-154 src/test/seed-entitlement-coverage.test.ts` | **122 / 122 passed** (S153 39 · S154 48 · seed 35) |
| tick-grep (`Date.now()` / `new Date()` inside `useMemo`/`useEffect`) | **clean** |

## §H 0-DIFF walls (verified clean)

| File | Status |
|------|--------|
| `src/lib/webstorex-order-engine.ts` | 0-DIFF |
| `src/lib/webstorex-engine.ts` | 0-DIFF |
| `src/lib/webstorex-commerce-engine.ts` | 0-DIFF |
| `src/lib/party-master-engine.ts` | 0-DIFF |
| `src/lib/fincore-engine.ts` | 0-DIFF (recon engine does NOT import it) |
| `src/lib/breadcrumb-memory.ts` | 0-DIFF |
| `src/components/operix-core/applications.ts` | 0-DIFF |
| `src/lib/ecomx-engine.ts` — prior 19 exports | 0-DIFF · ONE additive `markOrderReturned` permitted by spec |
| seed/role files | 0-DIFF |

## Files created (S154)

- `src/lib/ecomx-recon-engine.ts` (NEW SIBLING)
- `src/pages/erp/ecomx/lib/ecomx-csv.ts`
- `src/pages/erp/ecomx/settlements/EcomXSettlementsPage.tsx`
- `src/pages/erp/ecomx/reconciliation/EcomXReconciliationPage.tsx`
- `src/pages/erp/ecomx/claims/EcomXClaimsPage.tsx`
- `src/pages/erp/ecomx/returns/EcomXReturnsPage.tsx`
- `src/pages/erp/ecomx/allocation/EcomXAllocationPage.tsx`
- `src/test/sprint-154/ecomx-money.test.ts`
- `audit_workspace/S154_close_evidence/close_summary.md` (this file)

## Files edited (S154 · additive only)

- `src/types/ecomx.ts` — appended S154 type block (line 121+)
- `src/lib/ecomx-engine.ts` — appended `markOrderReturned` (lines 823-844)
- `src/lib/_institutional/sibling-register.ts` — registered `ecomx-recon-engine`
- `src/lib/_institutional/sprint-history.ts` — inserted S153 record (backfilled `'92fcc021'`) + appended S154 record
- `src/apps/erp/configs/ecomx-sidebar-config.ts` — added Money-Suite items
- `src/pages/erp/ecomx/EcomXSidebar.types.ts` — extended `EcomXModule` union
- `src/pages/erp/ecomx/EcomXPage.tsx` — extended module switch

## DP-EC-6 posting

OFF — FinCore journal rider for settlement-side TDS/TCS receivables is named as a `[JWT]` seam in the engine docstring (`src/lib/ecomx-recon-engine.ts:18-19`). NO `postVoucher`/`createVoucher` call · NO import of `fincore-engine`.
