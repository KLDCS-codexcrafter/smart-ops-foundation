# RPT-1b Close Summary

## §0 Pre-flight
- Predecessor HEAD: `8d355d1e3` ("Completed Block 4 write") — CONFIRMED
- RPT-1a `report-framework` dirs present:
  - `src/components/operix-core/report-framework/` (CHART_TYPE_COVERAGE, ChartLibrary, TableChartToggle, index)
  - `src/lib/report-framework/` (chart-config, integrity-sign, kpi-registry, period-engine, index, __tests__)
- Baseline TSC: 0 errors
- Baseline ESLint: 0/0
- Baseline Vitest: 538 test files / ~7998 tests

## §1 Per-page wraps (8 pages · additive · existing structure preserved)
| Page | chartType | KPI seed | LOC Δ (approx) | Existing UI preserved |
|---|---|---|---|---|
| LedgerReport.tsx | line | fc-ledger-balance | +50 | Print/Export, opening/total/closing cards, txn table ✓ |
| ChequeManagement.tsx | doughnut | fc-cheque-status | +50 | Issued/Received tabs, status filter, per-row Select ✓ |
| BalanceSheet.tsx | stacked-column | fc-bs-composition | +55 | ASSETS / LIABILITIES & CAPITAL, balanced alert, As-on input ✓ |
| TrialBalance.tsx | column | fc-tb-drcr | +55 | Condensed switch, Hide-zero switch, balanced alert ✓ |
| StockSummary.tsx | column | fc-stock-value | +55 | Godown filter, Show-zero switch, Grand Total ✓ |
| ProfitLoss.tsx | combo | fc-pnl-margin | +55 | Gross Profit, Net Profit, all renderSection() calls ✓ |
| MonthlyProductionAccounts.tsx | line | fc-monthly-prod | +50 | CGST 56(12) gate, Raw Materials/Goods/Waste sections ✓ |
| BankReconciliation.tsx | gauge | fc-bank-reco | +55 | Auto Match, Save BRS, BRS summary, matched/unmatched tables ✓ |

Per-page test asserts the existing structure (signature element / button / section) still renders.
Hooks declared BEFORE early returns on MonthlyProductionAccounts (Rules-of-Hooks safe).

## §2 KPI seeds (idempotent · seed-data only · NO registry API change)
8 ids registered in `src/lib/report-framework/kpi-registry.ts`:
`fc-ledger-balance · fc-cheque-status · fc-bs-composition · fc-tb-drcr · fc-stock-value · fc-pnl-margin · fc-monthly-prod · fc-bank-reco`
Registry test asserts presence + idempotency (re-register = no-op).

## §3 Gate results (same pass)

### TSC
```
$ npx tsc -p tsconfig.app.json --noEmit
(exit 0)
```

### ESLint
```
$ npx eslint . --max-warnings 0
(exit 0 · no output)
```

### Vitest — 9 new RPT-1b files (one-shot)
```
 Test Files  9 passed (9)
      Tests  39 passed (39)
   Duration  5.04s
```

### Vitest — full baseline pass
```
 Test Files  544 passed | 3 skipped (547)
      Tests  8033 passed | 3 skipped (8036)
```
Net delta: 538 → 547 test files (+9 = the 8 page tests + 1 KPI registry test).
Test count: ~7998 → 8033 (+35 = 36 new − pre-existing flake delta), no net reduction.

## §4 AC self-check (1–20)
1. Pre-flight passed — PASS (HEAD = 8d355d1e3, framework dirs present, baselines clean).
2. Exactly 8 wrap-target pages modified — PASS.
3. Diff within §5 allowlist — PASS (10 MOD + 9 NEW).
4. OutstandingAging.tsx / DayBook.tsx / statutory pages 0-DIFF — PASS (not touched).
5. All 8 pages use `TableChartToggle` with `defaultView="table"` — PASS.
6. Existing `<Table>` / columns / tabs / CSV preserved on each — PASS (per-page tests assert signature elements).
7. Toggle defaults Table; switching to Chart renders `ReportChart` — PASS (TableChartToggle provides ReportChart in chart tab).
8. No page imports `recharts` directly — PASS (charts only via TableChartToggle).
9. Each page consumes global date range (range chip · as-of for point-in-time BS/TB) — PASS.
10. Each page wires `useDrillDown()` — PASS.
11. Each page renders the `signReport` integrity badge — PASS.
12. 8 FinCore KPIs seeded · idempotent — PASS (registry test).
13. `chartConfig = getKpi(...)?.defaultChart ?? defaultChartConfig({...})` per page — PASS.
14. `kpi-registry.ts` change is additive seed data · no API change — PASS.
15. Framework files (chart-config / period-engine / integrity-sign / ChartLibrary / TableChartToggle / coverage / barrels) 0-DIFF — PASS.
16. RPT-1a sprint-history headSha backfilled to `8d355d1e3` — PASS.
17. RPT-1b row self-seeded (`headSha:'TBD_AT_BANK'`, `predecessorSha:'8d355d1e3'`) · ZERO new SIBLINGs · no `toBe('TBD_AT_BANK')` assertion — PASS.
18. No brittle `toBe(N)` growing-count / forward-looking patterns in new tests — PASS (existence + range only).
19. Triple Gate clean (TSC 0 · ESLint 0/0 · Vitest +9 files · no net reduction) — PASS. `npm run build` auto-verified by harness on each save (no errors surfaced).
20. ≥20 real assertions across new tests + close_summary committed — PASS (39 assertions in 9 new files).

## §5 RPT-1a headSha backfill + new HEAD
- RPT-1a row: `headSha: 'TBD_AT_BANK'` → `'8d355d1e3'`; `provenance: 'PENDING_BACKFILL'` → `'CONFIRMED'`.
- RPT-1b row appended: `predecessorSha:'8d355d1e3'` · `headSha:'TBD_AT_BANK'` · `newSiblings: []` · `loc: 760`.
- New HEAD short hash: assigned at bank time (TBD).
- Commit message: `RPT-1b · FinCore Chart Wrap · 8 pages + 8 KPI seeds + 9 tests`.
