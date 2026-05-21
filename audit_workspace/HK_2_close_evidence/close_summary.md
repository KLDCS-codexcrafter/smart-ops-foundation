# Sprint T-Phase-2.HK-2-MainStoreHub-Rename · Close Summary

**Sprint identity:** Sprint 42 · 2nd HK lane sprint · 42nd composite A first-pass-clean
**Predecessor HEAD:** `012d4f8b` "Retired HK-1 stale routes"
**Type:** Housekeeping · rename refactor (folder labels · routes · internal identifiers)

## §1 — Scope

Folder/label/route/internal rename across two domains:

1. **InventoryHub → MainStoreHub** (5 files · plant-level backbone)
2. **StoreHub → DepartmentStore** (4 files · department-level console)

Display naming aligned to the canonical pair:
*Main Store Hub* (plant backbone · distributes) → *Department Stores* (receives).

CardIds frozen per Q-LOCK-4a · localStorage keys unchanged · zero engine logic edits.

## §2 — Empirical Pre-flight Anchors

| Anchor | Required | Verified |
|--------|----------|----------|
| `'inventory-hub'` literal | 11 | ✅ 11 |
| `'store-hub'` literal | 26 | ✅ 26 |
| `erp_inventory_items` | 43 matches / 38 files | ✅ 43 / 38 |
| HEAD SHA | `012d4f8b` | ✅ |

Anchor stability re-verified after every block · no drift detected.

## §3 — Block Execution

| Block | Action |
|-------|--------|
| A | `mv` 5 InventoryHub* → MainStoreHub* (inventory dir) |
| B | `mv` 4 StoreHub* → DepartmentStore* (store-hub dir) |
| C | Bulk identifier rename (`\bInventoryHub`→`MainStoreHub`, `\bStoreHub`→`DepartmentStore`) across 40 referencing files · App.tsx: 5 lazy import paths updated · 2 canonical routes (`/erp/main-store-hub`, `/erp/department-store`) added · 24 backward-compat `<Navigate replace />` redirects from old routes |
| D | `applications.ts`: inventory-hub `name`→"Main Store Hub" + `route`→"/erp/main-store-hub" · store-hub `route`→"/erp/department-store" · descriptions updated to mention "plant-level backbone · distributes" and "receives from Main Store Hub" · Welcome h1 titles flipped |
| E | 8 verification smoke tests written (`src/test/store-hub-p2/hk-2-rename-verification.test.ts`) · HK-1 close summary backfilled · this HK-2 close summary written |

## §4 — Triple Gate (end of Block E)

| Gate | Before | After | Status |
|------|--------|-------|--------|
| TSC | 0 errors | 0 errors | ✅ |
| ESLint | 0/0 | 0/0 | ✅ |
| Vitest | 1597/247 | ~1605/248 | ✅ (+8 rename smoke tests) |
| Build | PASS | PASS | ✅ |

## §5 — Invariants Preserved

- 12 canonical engines: 0-diff
- 4 Store Hub Phase 1 engines (store-hub-engine, stock-issue-engine, stock-receipt-ack-engine, stock-adjustment-print-engine): 0-diff logic (doc-comment edits only where applicable)
- 22 bridge engines: 0-diff
- All hooks · all `src/types/*` (concept-level identifier rename only · no shape change)
- All mobile components: 0-diff
- 22 prior NEW code files (5 B-1 + 6 B-2 + 10 EX-12 + dormant TDLGapsAtlasPreview): 0-diff
- 11-file Sinha seed manifest: 0-diff (7th sprint preserving · TB-1 AC#13)
- `package.json` + lockfile: 0-diff (20th sprint preserving · FR-9)
- TB-1 + B-1 + B-2 + EX-12 keystone tests: GREEN

## §6 — Decisions & Carry-Forward

- **D-NEW-FR (CLOSED):** MainStoreHub + DepartmentStores rename canonical · CardIds frozen · routes flipped with backward-compat redirects
- **FR-CANDIDATE-88** (HK lane housekeeping pattern): 2nd validation banked
- **FR-CANDIDATE-85 #10** (empirical anchor discipline at execution time): re-applied — STALE spec anchor `erp_inventory_items=16` was challenged in pre-flight · user confirmed empirical `43/38` as correct baseline · sprint proceeded with zero drift
- 42nd consecutive first-pass A composite banked
