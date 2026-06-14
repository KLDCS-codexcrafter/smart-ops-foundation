# CL-3c · Close Evidence — T-CL3c-ConstHardcode-Remainder

**Predecessor HEAD:** `90cc909`  
**Target HEAD:** TBD_AT_BANK  
**Scope:** Close the const-hardcode mechanism across 7 small clusters (~20 files).

## Cluster tally (pre-flight matched 6/4/3/3/2/1/1)

| Cluster | Files | Status |
| --- | --- | --- |
| vendor-portal | 6 | ✅ Converted + guard green |
| distributor | 4 | ✅ Converted (default-param wrappers → hook) + guard green |
| payout | 3 | ✅ Converted + guard green |
| servicedesk/settings | 3 | ✅ Converted (`const E='DEMO'` → `const { entityCode: E } = useEntityCode()`) + guard green |
| masters | 2 | ✅ Helpers threaded with entityCode + guard green |
| fincore | 1 | ✅ Financial — entity correctness verified + guard green |
| salesx | 1 | ✅ Default-param wrapper → hook + guard green |
| **TOTAL** | **20** | **20/20** |

## Conversion pattern

- Removed module-scope `const E = 'DEMO'` / `const ENTITY = DEFAULT_ENTITY_SHORTCODE` / `const entityCode = DEFAULT_ENTITY_SHORTCODE`.
- Added `const { entityCode } = useEntityCode()` at component TOP LEVEL (never module / callback / useMemo body).
- Removed every now-unused `DEFAULT_ENTITY_SHORTCODE` import (CL-2b lesson).
- Default-param wrappers (distributor + salesx): prop made optional, hook fallback inside component, outer default export drops the literal.
- masters/SchemeMaster: refactored module-scope `SCHEME_IMPORT_SCHEMA` → `buildSchemeImportSchema(entityCode)` factory wrapped in `useMemo`; threaded entityCode through readSchemes/writeSchemes/blankScheme.
- masters/CustomerSegmentMaster: threaded entityCode through readSegments/writeSegments/seedDemoSegments/blankSegment.
- fincore/AssetCentreMaster: hook swap + removed `|| DEFAULT_ENTITY_SHORTCODE` fallback in logAudit.

## Verification — Triple Gate

| Gate | Result |
| --- | --- |
| `npx tsc -p tsconfig.app.json --noEmit` | **0 errors** |
| `npx eslint . --max-warnings 0` | **0 warnings** |
| `npx vitest run src/__tests__/cl-3c` | **7/7 PASS** |

## Guards (one per cluster)

```
src/__tests__/cl-3c/vendor-portal-entity-hook-guard.test.ts
src/__tests__/cl-3c/distributor-entity-hook-guard.test.ts
src/__tests__/cl-3c/payout-entity-hook-guard.test.ts
src/__tests__/cl-3c/servicedesk-settings-entity-hook-guard.test.ts
src/__tests__/cl-3c/masters-entity-hook-guard.test.ts
src/__tests__/cl-3c/fincore-entity-hook-guard.test.ts
src/__tests__/cl-3c/salesx-entity-hook-guard.test.ts
```

Each scans its cluster's `.tsx` files for the 5 forbidden regex patterns and asserts `offenders.toEqual([])`.

## Non-goals (deferred per sprint contract)

- **CL-3d:** components(16) + mobile(15) — mobile has a local-helper wrinkle.
- **CL-3e:** the 23 raw `getItem('active_entity_code')` readers — different mechanism.

## ZERO new SIBLINGs.

Sprint history appended at `src/lib/_institutional/sprint-history.ts` (Grade A).
