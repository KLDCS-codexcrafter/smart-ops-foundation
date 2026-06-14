# CL-3a · T-CL3a-Maintainpro-HookSweep · Close Evidence

**Predecessor SHA:** `c7f7204`
**New HEAD:** `TBD_AT_BANK`
**Sprint:** Hardcode→hook sweep · MAINTAINPRO cluster (first of CL-3a/b/c/d sub-arc)

## Block 1 — Conversion (24 files)

All 24 `.tsx` under `src/pages/erp/maintainpro/{reports,transactions}/` converted:

- Module-scope `const E = 'DEMO';` **DELETED**
- `import { useEntityCode } from '@/hooks/useEntityCode';` added
- `const { entityCode } = useEntityCode();` injected as **first line inside the
  component function** (component TOP LEVEL, never in callback / useMemo /
  IIFE — the hooks-at-top-level canon)
- Every reference to `E` rewritten to `entityCode` (whole-word, `\bE\b`)
- `entityCode` added to `useMemo` dependency arrays where the memo body
  consumes the entity code → reactive entity-switch

Files (24):

```
reports/AMCOutToVendorStatus.tsx
reports/AgingTicketsReport.tsx
reports/CalibrationStatusReport.tsx
reports/EnergyESGDashboard.tsx
reports/EquipmentHistory.tsx
reports/FireSafetyExpiryReport.tsx
reports/MTBFMTTRReport.tsx
reports/MaintenanceEntryDayBook.tsx
reports/OpenTicketsLive.tsx
reports/OpenWOStatusReport.tsx
reports/PMComplianceReport.tsx
reports/ProductionCapacityLiveDashboard.tsx
reports/SLAPerformanceReport.tsx
reports/SparesIssueDayBook.tsx
reports/TopReportersByDepartment.tsx
transactions/AMCOutToVendor.tsx
transactions/AssetCapitalization.tsx
transactions/BreakdownReport.tsx
transactions/CalibrationCertificate.tsx
transactions/EquipmentMovement.tsx
transactions/InternalMaintenanceTicket.tsx
transactions/PMTickoffEntry.tsx
transactions/SparesIssueEntry.tsx
transactions/WorkOrderEntry.tsx
```

## Block 2 — Guard + Behavioural Tests + Institutional

### Completeness guard test (build-time proof)

`src/__tests__/cl-3a/maintainpro-entity-hook-guard.test.ts` — recursive
directory scan of `src/pages/erp/maintainpro/**/*.tsx` asserts ZERO files
contain `const E = 'DEMO'` / `const ENTITY = 'DEMO'` / `= DEFAULT_ENTITY_SHORTCODE`
at module scope. Mirrors Tower/Bridge theme guards.

### Behavioural test (entity-correct reads)

`src/__tests__/cl-3a/maintainpro-entity-scope.test.ts` — seed X=`OPRX` +
Y=`SMRT`, assert:

- `listEquipment(X)` returns ONLY X's equipment (no Y leak)
- `listWorkOrders(X)` returns ONLY X's WOs
- `listPMTickoffs(X)` returns ONLY X's PM tick-offs

### Institutional

`src/lib/_institutional/sprint-history.ts` — appended
`T-CL3a-Maintainpro-HookSweep` (Grade A, predecessor `c7f7204`,
headSha `TBD_AT_BANK`). ZERO new SIBLINGs.

## Triple Gate (pasted clean)

```
$ grep -rln "const E = 'DEMO'\|const ENTITY = 'DEMO'\|= DEFAULT_ENTITY_SHORTCODE" \
    src/pages/erp/maintainpro --include=*.tsx | wc -l
0

$ npx tsc -p tsconfig.app.json --noEmit
(0 errors)

$ npx eslint --no-cache . --max-warnings 0
(0 warnings)

$ npx vitest run src/__tests__/cl-3a
 ✓ maintainpro-entity-hook-guard.test.ts (1 test)
 ✓ maintainpro-entity-scope.test.ts       (3 tests)
 Test Files  2 passed (2)
 Tests       4 passed (4)
```

## Explicit non-goals (later clusters)

- CL-3b: customer-hub / projx / sitex / distributor-hub (~40 files)
- CL-3c: vendor-portal / payout / distributor / misc (~30 files)
- CL-3d: remaining (masters / salesx / fincore / components)
- Class B (state propagation) + Class C (QA event bus) — pending founder
  decisions.

Files outside `src/pages/erp/maintainpro/**` are 0-DIFF (touch-only:
sprint-history + 2 new tests + this close summary).
