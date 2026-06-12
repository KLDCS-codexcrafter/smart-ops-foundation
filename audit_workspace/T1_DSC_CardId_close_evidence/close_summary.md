# T1 Fix · DSC Card-Id Drift · Close Summary

Predecessor HEAD: `8d78373`

## §1 · Edits in `src/lib/report-framework/data-sources.ts` (4 one-word changes)

| Line | Before | After |
|------|--------|-------|
| 203  | `card: 'inventory'`  | `card: 'inventory-hub'` |
| 220  | `card: 'inventory'`  | `card: 'inventory-hub'` |
| 503  | `card: 'logistic'`   | `card: 'logistics'`     |
| 672  | `card: 'dispatch'`   | `card: 'dispatch-hub'`  |
| 689  | `card: 'dispatch'`   | `card: 'dispatch-hub'`  |
| 755  | `card: 'pay-hub'`    | `card: 'peoplepay'`     |

Source `id` fields unchanged. Six occurrences across four logical seeds (inventory has 2, dispatch has 2).

## §2 · Permanent Integrity Test

New file: `src/lib/report-framework/__tests__/dsc-card-id-integrity.test.ts` — 6 tests, all pass:
- every DSC source.card ∈ CardId union (parsed from `src/types/card-entitlement.ts`) ∪ {`xc`}
- `inventory-hub` ≥ 2 sources
- `logistics` ≥ 1 source
- `dispatch-hub` ≥ 1 source (pre-9e readiness)
- `peoplepay` ≥ 1 source (pre-9e readiness)
- legacy directory keys (`inventory`, `logistic`, `dispatch`, `pay-hub`) resolve to 0

## §3 · Gates

- Vitest: **762 files passed | 3 skipped · 8629 tests passed | 3 skipped · 0 failed**
- TSC: 0
- ESLint: 0/0
- Build: PASS (harness)

ZERO new SIBLINGs · no sprint-history change · all mounts / ReportBuilder / engine / definitions / kpi-registry / pages 0-DIFF.
