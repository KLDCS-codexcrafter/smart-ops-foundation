## RPT-3a · DayBook Generalize + Source Registry · Close Summary

**Predecessor HEAD:** `071db3e`
**Sprint:** RPT-3a · Reporting Arc · Phase B sprint 1 (structural)
**Grade target:** A
**New HEAD:** `TBD_AT_BANK`

---

### Pre-flight
- HEAD = `071db3e` ✓
- `useDayBook.ts` baseline contract present (`DayBookFamily`, `DayBookEntry`, `export`).
- TSC clean, ESLint clean.

### Block 1 — Generalize hook + registry
- NEW · `src/lib/report-framework/daybook-source-registry.ts` (React-free):
  - `DayBookDomain = string` (open · was the 2-value `DayBookFamily`)
  - `DayBookSource { cardId, domain, label, read(entityCode) }`
  - `registerDayBookSource` (idempotent append by `cardId+domain`)
  - `listDayBookSources`, `getDayBookSource`
  - `getDayBookEntries(entityCode, filter?)` — merged + date-sorted (newest-first).
  - `__resetDayBookSourcesForTests` (test-only)
- EDIT · `src/hooks/useDayBook.ts` — `DayBookFamily` widened to `DayBookDomain`
  (back-compat alias preserved). When called with a non-finance / non-people
  domain the hook delegates to the registry. `finance` / `people` paths are
  byte-identical → PayHubDayBook + `fincore/DayBook` callers unchanged.
- Barrel · `src/lib/report-framework/index.ts` re-exports the registry.

### Block 2 — Register all card DayBook sources (7)
- NEW · `src/lib/report-framework/daybook-sources.ts` — side-effect module,
  idempotent. Auto-registers on import. Wired into `src/main.tsx` on app boot.
- Sources registered (each `read()` wraps the SAME loader the existing page uses):
  1. `fc-fincore-daybook` · `finance` · vouchers (`vouchersKey`)
  2. `ph-payhub-daybook` · `people` · payroll runs (`payrollRunsKey`)
  3. `sd-service-daybook` · `service` · `listServiceTickets()` raised/resolved/closed
  4. `p360-goods-inward` · `procure` · `listGitStage1()`
  5. `mp-maintenance-entry` · `maintenance-entry` · `listBreakdownReports()` + `listWorkOrders()`
  6. `mp-spares-issue` · `maintenance-spares` · `listSparesIssues()`
  7. `ex-custom` · `eximx` · `loadTTPayments()`
- 6 bespoke DayBook **pages 0-DIFF** (DayBook.tsx, PayHubDayBook,
  ServiceDayBook, GoodsInwardDayBookPanel, MaintenanceEntryDayBook,
  SparesIssueDayBook, CustomDayBook).

### Block 3 — Institutional + tests + close
- SIBLING REGISTER · appended `daybook-source-registry` as a NEW SIBLING.
- SPRINT HISTORY ·
  - Back-filled `RPT-2e-iii.headSha` from `TBD_AT_BANK` → `071db3e`,
    provenance flipped `PENDING_BACKFILL` → `CONFIRMED`.
  - Added `RPT-3a` row (`headSha: TBD_AT_BANK`, `predecessorSha: 071db3e`,
    `newSiblings: ['daybook-source-registry']`).
- Tests added (≥20 §N assertions):
  - `daybook-source-registry.test.ts` — registry idempotency, merge+sort,
    filter by cardId, filter by domain, defensive throw handling. (7 cases)
  - `daybook-sources.test.ts` — count ≥ 7 + per-source assertion (8 cases).
  - `useDayBook-backcompat.test.ts` — legacy `finance` / `people` signatures
    still resolve to arrays (2 cases).

### Triple Gate
- **TSC** — `npx tsc -p tsconfig.app.json --noEmit` → 0 errors.
- **ESLint** — `npx eslint . --max-warnings 0` → 0 / 0.
- **Vitest** — new tests pass; full suite zero failures.
- **Build** — `NODE_OPTIONS="--max-old-space-size=7168" npm run build` → PASS.

### Touch ledger
- NEW: `src/lib/report-framework/daybook-source-registry.ts`
- NEW: `src/lib/report-framework/daybook-sources.ts`
- NEW: `src/lib/report-framework/__tests__/daybook-source-registry.test.ts`
- NEW: `src/lib/report-framework/__tests__/daybook-sources.test.ts`
- NEW: `src/hooks/__tests__/useDayBook-backcompat.test.ts`
- EDIT: `src/hooks/useDayBook.ts` (generalize · back-compat)
- EDIT: `src/lib/report-framework/index.ts` (barrel)
- EDIT: `src/main.tsx` (register sources on app boot)
- EDIT: `src/lib/_institutional/sibling-register.ts` (new SIBLING row)
- EDIT: `src/lib/_institutional/sprint-history.ts` (backfill + new row)
- NEW: `audit_workspace/RPT_3a_close_evidence/close_summary.md`

### 0-DIFF walls held
- All 6 bespoke DayBook **pages** (DayBook · PayHubDayBook · ServiceDayBook ·
  GoodsInwardDayBookPanel · MaintenanceEntryDayBook · SparesIssueDayBook ·
  CustomDayBook) — sources are registered, pages are not rewritten.
- All banked report/dashboard pages.
- All report-framework chart/KPI/scorecard files
  (`chart-config`, `period-engine`, `integrity-sign`, `kpi-registry`,
  `rag`, `ChartLibrary`, `TableChartToggle`, `CHART_TYPE_COVERAGE`,
  `ScorecardTile`).
- `src/test/setup.ts`.
- All hubs.
