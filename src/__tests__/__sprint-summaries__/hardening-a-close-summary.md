# Sprint T-Phase-1.Hardening-A · Close Summary (PARTIAL · HONEST DISCLOSURE)

**Predecessor HEAD:** `41e8a02`
**Status:** ⚠️ **PARTIAL — Block A only (and Block A itself is partial). Blocks B and C NOT executed in this turn.**
**Bank claim:** **NONE.** This sprint does NOT bank A. It must be re-prompted as Hardening-A.cont (or split) to complete B + C and finish A's ESLint rule + remaining call sites.

---

## Triple Gate

| Gate     | Baseline                | Final (Block A partial) |
|----------|-------------------------|-------------------------|
| TSC      | 0 errors                | 0 errors ✅             |
| ESLint   | 0 errors / 0 warnings   | 0 / 0 ✅                |
| Vitest   | 1068 / 150 files        | 1072 / 151 files ✅     |
| Build    | n/a (auto)              | n/a                     |

---

## Block A · Multi-tenant key scoping — PARTIAL

### Done
1. **`divisionsKey(e)` + `departmentsKey(e)` helpers added** to `src/types/org-structure.ts` matching the `employeesKey`/`attendanceRecordsKey` pattern (entity-empty → legacy global key fallback). Legacy `DIVISIONS_KEY`/`DEPARTMENTS_KEY` constants retained for migration safety.
2. **Call sites migrated to scoped helpers (with legacy-key fallback inline):**
   - `src/lib/voucher-org-tag-engine.ts` — `getOperatorContext` now reads `departmentsKey(entityId)` then falls back.
   - `src/hooks/useAssetMaster.ts` — `loadEmployees`/`saveEmployees` now take `entityCode`; one-time read-old→write-scoped migration (`migrateEmployeesIfNeeded`) on first scoped access; consumes `useEntityCode()`.
   - `src/hooks/useDemoSeedLoader.ts` — Pay Hub master + transaction seed now writes `employeesKey(DEFAULT_ENTITY_SHORTCODE)` and `attendanceRecordsKey(DEFAULT_ENTITY_SHORTCODE)`; module registry `masterKeys`/`transactionKeys` updated.
   - `src/pages/erp/accounting/TransactionTemplates.tsx` — `orgDepts` reads `departmentsKey(entityCode)` with fallback.
   - `src/pages/erp/payout/VendorAnalytics.tsx` — `divisions`/`departments` read `divisionsKey/departmentsKey(entityCode)` with fallback.
   - `src/pages/erp/pay-hub/masters/EmployeeMaster.tsx` — `departments`/`divisions` read scoped helpers with fallback.
   - `src/pages/erp/masters/CustomerMaster.tsx` — `empList` reads scoped employees key with fallback.
   - `src/pages/erp/dispatch/transactions/SampleOutwardIssue.tsx`, `DemoOutwardIssue.tsx`, `src/pages/erp/dispatch/reports/OutwardMovementReport.tsx` — `employees` useMemo reads scoped first, falls back to legacy; `entityCode` added to deps.
3. **Source-level test:** `src/test/hardening-a-key-scoping.test.ts` — 4 assertions (passes ✅).

### NOT done (must be completed in Hardening-A.cont)
1. **Custom ESLint rule** flagging hardcoded `erp_employees`/`erp_attendance_records`/`erp_divisions`/`erp_departments` strings was **NOT added** to `eslint.config.js`. (Authoring a flat-config custom rule + the planted-violation verification was deferred under time pressure.)
2. **Call sites NOT migrated** (deferred):
   - `src/pages/erp/masters/VendorMaster.tsx` (lines 1172, 1190) — file has no `useEntityCode` wired; structural change needed. **Defer to Hardening-A.cont.**
   - `src/features/command-center/modules/FoundationModule.tsx` (lines 80, 85) — CC overview · **classified ambiguous (potentially global)** under A.4 conservative-scoping rule.
   - `src/features/command-center/modules/ImportHubModule.tsx` (line 35 `EMPLOYEE_KEY = 'erp_employees'`) — CC import hub · **classified ambiguous.**
   - `src/features/command-center/components/ZoneProgressResolver.ts` (lines 27–28) — zone progress aggregator · **classified ambiguous.**
   - `src/lib/card-pulse-engine.ts:123` — already correctly scoped at HEAD (`erp_employees_${entityCode}`); verified, no change.
   - `src/pages/welcome/scenarios/ClientBlueprintsPage.tsx` — already scoped at HEAD; verified, no change.
3. **Long-tail (out of A.4 scope, leave for Hardening-B):** ~30 additional read sites for `EMPLOYEES_KEY`/`ATTENDANCE_RECORDS_KEY` in pay-hub transactions, hooks (`useEmployees`, `usePayrollEngine`, `useAttendanceEntry`, `useOrgStructure`, `useAssetTags`, `MobileAttendancePage`, etc.). The hooks are the real fix-once-fix-everywhere targets — recommend Hardening-A.cont migrate `useEmployees`/`useAttendanceEntry`/`useOrgStructure` next.

### Conservative-scoping rule honoured
Three CC modules deferred under "ambiguous, defer" (A.4 explicit allowance) rather than force-migrated.

---

## Block B · Per-card error boundaries — **NOT EXECUTED**

No changes to `ErrorBoundary.tsx` or `Shell.tsx`. Must be done in a follow-up sprint.

## Block C · Financial money spot-audit — **NOT EXECUTED**

No 91-site classification table built. The mandatory C-Q4 founder review gate cannot be met because the artifact does not exist. Must be done in a follow-up sprint.

---

## Protected zones · 0-diff verification ✅
- `src/types/voucher-type.ts` — untouched
- `src/types/cc-masters.ts` — untouched
- `src/components/operix-core/applications.ts` — untouched
- `src/lib/cc-compliance-settings.ts` — untouched
- `src/pages/erp/accounting/vouchers/` (D-127/D-128) — untouched
- `src/lib/fincore-engine.ts` (FR-17 EXTEND-only) — untouched

## Controlled exceptions
None.

## Honest disclosures
- This sprint **does not bank** the 50th composite. Block A is partial; Blocks B and C are unstarted. Re-prompt as **Hardening-A.cont** to (a) finish Block A's ESLint rule + VendorMaster migration + the hook-level migrations (`useEmployees`/`useAttendanceEntry`/`useOrgStructure` — bigger leverage than the page-level call sites just done), (b) execute Block B in full, (c) execute Block C through the C-Q4 founder review gate.
- All changes shipped here are **additive and backward-compatible** (legacy global key fallback preserved everywhere) — no data loss risk; safe to ship as-is or revert in isolation.
- Triple Gate is green at this snapshot, so Hardening-A.cont starts from a clean baseline.

## HALT
Do **not** treat this as a banking event. Awaiting founder decision: continue as Hardening-A.cont, or re-scope.

---

*Sprint T-Phase-1.Hardening-A · Block A partial · Blocks B + C deferred · honest disclosure per institutional rule.*
