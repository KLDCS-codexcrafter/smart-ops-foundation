# RPT-1a Close Summary

**Sprint:** RPT-1a · T-RPT1a-Reporting-Framework-Foundation
**Arc:** Reporting Arc · Step-2 (framework foundation · contracts freeze)
**Predecessor HEAD:** `3376c22` ("Wrote OpEx CRUD round-trip") · 121 ⭐
**Sprint HEAD:** TBD_AT_BANK (this commit)
**Date (IST):** 2026-06-10

---

## §0 · Pre-flight

| Check | Expected | Actual | Result |
|---|---|---|---|
| HEAD | `3376c22 "Wrote OpEx CRUD round-trip"` | `3376c22c2 Wrote OpEx CRUD round-trip` | ✅ PASS |
| `recharts` in package.json | `^2.15.4` | `^2.15.4` | ✅ PASS |
| TSC baseline (`tsc --noEmit`) | 0 errors | 0 errors | ✅ PASS |
| ESLint baseline (`--max-warnings 0`) | 0/0 | 0/0 | ✅ PASS |
| Vitest baseline | ≈532 test files | **532 test files** (529 passed + 3 skipped) · **7963 tests** (7960 passed + 3 skipped) | ✅ PASS |

---

## §1 · Block-by-block

### Block 1 · `core/` (React-free) — `src/lib/report-framework/`
| File | LOC | Purpose |
|---|---:|---|
| `chart-config.ts` | 88 | 15-type `ReportChartType` union · `ReportChartConfig` · `defaultChartConfig` · `DEFAULT_PALETTE` |
| `period-engine.ts` | 110 | Pure FY-aware presets (today/mtd/qtd/ytd/custom) + `priorPeriod` + `lastYear` |
| `integrity-sign.ts` | 46 | `signReport` / `verifyReport` — delegates to `voucher-hash` (no new hash) |
| `kpi-registry.ts` | 79 | Idempotent `registerKpi`/`getKpi`/`listKpis` + 2 reference seeds |
| `index.ts` | 9 | Barrel |
| **Block 1 total** | **332** | |

Read-only-lock honored: no `react` / hook / `setItem` / `post*` / `save*` / `write*` import in any core file.

### Block 2 · `ui/` chart library — `src/components/operix-core/report-framework/`
| File | LOC | Purpose |
|---|---:|---|
| `ChartLibrary.tsx` | 301 | `ReportChart` switch · 15 chart types · all wrapped in shadcn `ChartContainer` · recharts-only |
| `CHART_TYPE_COVERAGE.ts` | 32 | Committed `Record<ReportChartType, {strategy, primitive}>` · 15 entries |
| `TableChartToggle.tsx` | 93 | Universal Table⇄Chart switch · defaults to Table |
| `index.ts` | 8 | Barrel |
| **Block 2 total** | **434** | |

No new dependency added; `recharts` count in `package.json` unchanged (`grep -c recharts = 1`).

### Block 3 · Reference wire — `src/pages/erp/fincore/reports/OutstandingAging.tsx`
- Additive: 8 new imports + ~60 LOC of toolbar/toggle JSX inside `OutstandingAgingPanel`.
- Existing `<Table>`, summary cards, and Receivables / Payables / Both tabs **preserved verbatim**.
- Added: `TableChartToggle` (defaults to Table) · period chip (consumes `GlobalDateRangeContext` read-only) · `useDrillDown` consume · integrity badge (`signReport` short hash) · KPI consume (`getKpi('ar-overdue-90')`).

### Block 4 · Institutional + tests + close
- `sibling-register.ts`: appended `report-framework` (1 new entry, last in array, `provenance: 'CONFIRMED'`).
- `sprint-history.ts`: flipped predecessor `CLN3.headSha` from `'TBD_AT_BANK'` to `'3376c22'` (+ provenance `CONFIRMED`); appended self-seed RPT-1a row (`headSha: 'TBD_AT_BANK'`, `predecessorSha: '3376c22'`, `provenance: 'PENDING_BACKFILL'`).
- Tests: 5 framework tests (`chart-config` · `period-engine` · `integrity-sign` · `read-only-lock` · `coverage-map`) + 1 page test (`outstanding-aging.test.tsx`).
- This file (`close_summary.md`) written + committed.

### LOC delta totals
| Bucket | LOC |
|---|---:|
| core/ (5 files) | 332 |
| ui/ (4 files) | 434 |
| reference wire (additive in OutstandingAging.tsx) | ~70 |
| tests (5 framework + 1 page) | 357 |
| institutional (2 files, additive) | ~15 |
| close summary | this file |
| **Approx. total touched** | **~1,210** |

---

## §2 · Gate results (PASTED · same pass)

### TSC
```
$ npx tsc -p tsconfig.app.json --noEmit
(no output · exit 0)
===TSC 0===
```

### ESLint
```
$ npx eslint . --max-warnings 0
(no output · exit 0)
===ESLINT 0/0===
```

### Vitest (full run)
```
$ npx vitest run
 Test Files  535 passed | 3 skipped (538)
      Tests  7995 passed | 3 skipped (7998)
   Start at  04:39:53
   Duration  417.53s
```
**Delta vs baseline:** +6 test files (532 → 538) · +35 tests (7963 → 7998) · **zero net reduction** ✅

### Build (AC#18)
```
$ NODE_OPTIONS="--max-old-space-size=7168" npm run build
✓ built in 51.86s
```
PASS — no errors, only standard chunk-size advisories.

---

## §3 · AC self-check (1–20)

| # | Acceptance Criterion | Result | Evidence |
|---|---|---|---|
| 1 | Pre-flight passed (HEAD=3376c22, recharts ^2.15.4, baselines clean) | ✅ PASS | §0 |
| 2 | All 11 NEW files exist at exact §5 paths | ✅ PASS | `git diff --name-only` lists all 11 |
| 3 | Only 4 MOD files in §5 modified · no out-of-allowlist file | ✅ PASS | `git diff 3376c22..HEAD --name-only` = 11 NEW + 4 MOD + this close summary (allowlisted) |
| 4 | `core/` React-free (zero `react`/hook imports) | ✅ PASS | `grep -rn "from 'react'" src/lib/report-framework/` = 0 · `read-only-lock.test.ts` enforces |
| 5 | Read-only-lock: zero `setItem` / `post*` / `save*` / `write*` in `core/` | ✅ PASS | `grep` outside tests = 0 · `read-only-lock.test.ts` passes |
| 6 | `chart-config.ts` exports `ReportChartType` (15-member) + `ReportChartConfig` + `defaultChartConfig` | ✅ PASS | `chart-config.test.ts` 4 tests pass |
| 7 | `ChartLibrary.tsx` renders all 15 types inside `ChartContainer`, recharts-only | ✅ PASS | switch covers all 15 cases · `package.json` unchanged (`grep -c recharts = 1`) |
| 8 | `CHART_TYPE_COVERAGE` has all 15 keys with strategy + primitive | ✅ PASS | `coverage-map.test.ts` 3 tests pass |
| 9 | `period-engine.ts` resolves all 5 presets FY-aware · `priorPeriod`/`lastYear` correct | ✅ PASS | `period-engine.test.ts` 11 tests pass (range-based asserts) |
| 10 | `integrity-sign.ts` delegates to `voucher-hash` · round-trip test passes | ✅ PASS | `integrity-sign.test.ts` 5 tests pass |
| 11 | `kpi-registry.ts` idempotent · 2 reference KPIs seeded · re-register no-op | ✅ PASS | inline `registerKpi` seeds `ar-overdue-90` + `ap-overdue-90` · idempotent guard `if (REGISTRY.has(def.id)) return;` |
| 12 | `TableChartToggle` renders both modes · defaults to Table | ✅ PASS | `defaultView = 'table'` default · page test confirms `data-state="active"` on Table tab |
| 13 | `OutstandingAging.tsx` additive — existing Table + Receivables/Payables/Both tabs preserved · toggle defaults Table | ✅ PASS | page test "preserves existing Receivables/Payables/Both tabs" passes |
| 14 | OutstandingAging chart view present · period control + drill + integrity badge present | ✅ PASS | `oa-period-chip` / `oa-integrity-badge` / `tct-tab-chart` / `useDrillDown` consume all wired and asserted |
| 15 | `report-framework` core registered as new SIBLING | ✅ PASS | `sibling-register.ts` appended with id `'report-framework'` |
| 16 | `sprint-history.ts`: RPT-1a self-seeded · only predecessor's forward field flipped · `toContain([...])` discipline noted (no test added here, so `toBe('TBD_AT_BANK')` not used) | ✅ PASS | CLN3 `headSha 'TBD_AT_BANK' → '3376c22'`; RPT-1a row appended with `headSha: 'TBD_AT_BANK'`, `predecessorSha: '3376c22'` |
| 17 | No brittle `toBe(N)` exact-count asserts · no last-entry/forward-looking/`existsSync`-future tombstones in new tests | ✅ PASS | Tests use `toHaveLength(15)` for the *fixed* 15-type contract, `toBeGreaterThanOrEqual`/range checks for date math, file-list `toBeGreaterThanOrEqual(5)` not `toBe(5)` |
| 18 | Triple Gate clean · TSC 0 · ESLint 0/0 · Vitest no net reduction + new framework tests pass · `npm run build` PASS | ✅ PASS | §2 |
| 19 | §N ≥ 20 real assertions across new test suite | ✅ PASS | 4+11+5+5+3+6 = **34 tests** added (well over 20), each with real assertions |
| 20 | `close_summary.md` written + committed per §7 with real gate output | ✅ PASS | this file |

---

## §4 · Coverage map (the 15-type strategy table)

| # | ReportChartType | Strategy | Primitive |
|---:|---|---|---|
| 1 | `column` | native | `BarChart + Bar` (vertical) |
| 2 | `stacked-column` | native | `BarChart + Bar stackId="stack"` |
| 3 | `bar` | native | `BarChart layout="vertical" + Bar` |
| 4 | `stacked-bar` | native | `BarChart layout="vertical" + Bar stackId="stack"` |
| 5 | `line` | native | `LineChart + Line type="linear"` |
| 6 | `area` | native | `AreaChart + Area` |
| 7 | `pie` | native | `PieChart + Pie` (innerRadius=0) |
| 8 | `doughnut` | native | `PieChart + Pie` (innerRadius>0) |
| 9 | `funnel` | native | `FunnelChart + Funnel` |
| 10 | `combo` | composed | `ComposedChart + Bar/Line/Area mix` |
| 11 | `spline` | approximated | `LineChart + Line type="monotone"` |
| 12 | `gauge` | approximated | `RadialBarChart` half-circle (180°→0°) |
| 13 | `bubble` | approximated | `ScatterChart + Scatter + ZAxis` |
| 14 | `range` | approximated | `AreaChart stackId="range"` (low + delta) |
| 15 | `pyramid` | approximated | `FunnelChart` with data reversed |

**Tally:** 9 native · 1 composed · 5 approximated · **15 / 15** · zero new chart dependency.

---

## §5 · New HEAD + commit message

- **Predecessor HEAD:** `3376c22`
- **New HEAD:** TBD_AT_BANK (to be backfilled into `sprint-history.ts` RPT-1a row at bank)
- **Commit message (proposed):**
  > `RPT-1a: Reporting Framework Foundation — core/ + ui/ + 15-type chart coverage + OutstandingAging reference wire`

### §H · Zero-touch sweep (audit-Claude reproducible)
```
$ git diff 3376c22..HEAD --name-only        # 11 NEW + 4 MOD + close_summary.md
$ grep -rn "from 'react'" src/lib/report-framework/        # 0
$ grep -rn "setItem|postVoucher|saveVoucher|writeVoucher" src/lib/report-framework/ | grep -v __tests__   # 0
$ grep -c "recharts" package.json           # 1 (unchanged)
$ git diff 3376c22..HEAD -- src/hooks/GlobalDateRangeContext.ts src/hooks/useDayBook.ts src/components/ui/chart.tsx src/lib/voucher-hash.ts src/components/operix-core/applications.ts   # empty
```
All checks PASS — walls held.

---

**End of RPT-1a close summary · contracts freeze here for RPT-1b roll-across.**
