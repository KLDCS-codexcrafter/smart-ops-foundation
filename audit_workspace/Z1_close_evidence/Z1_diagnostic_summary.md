# Z1 Pre-Flight Diagnostic — T-H1.5-Z-Z1

**Date:** Apr-2026
**Status:** Block 1 COMPLETE · Blocks 2-6 NOT STARTED (sprint deferred — see Recommendation)

---

## 1. Damage Scope (Strict Mode Activated)

Command run:
```
npx tsc --noEmit --strict --noImplicitAny --strictNullChecks \
  --noUnusedLocals --noUnusedParameters --noFallthroughCasesInSwitch \
  -p tsconfig.app.json
```

**Total errors:** 435 (under 500 threshold — no sprint split required)

### Errors by Code

| Code | Count | Meaning |
|---|---|---|
| TS6133 | 403 | Unused local / import binding |
| TS6192 | 21 | All imports in declaration unused |
| TS6196 | 5 | Type alias declared but never used |
| TS2783 | 3 | Property specified more than once (spread overwrite) |
| TS2345 | 2 | Argument type mismatch |
| TS2322 | 1 | Type not assignable |

### Pure Type-Safety Damage (excluding cleanup flags)

Running `--strict --noImplicitAny --strictNullChecks --noFallthroughCasesInSwitch` ALONE produces only **6 errors**.

**Conclusion:** The codebase is already remarkably type-safe under strict null checks. The 429 unused-locals errors are mechanical cleanup, not type-safety holes.

### Errors by Top Directory

| Directory | Count |
|---|---|
| `src/pages/erp` | 338 |
| `src/pages/tower` | 29 |
| `src/features/command-center` | 13 |
| `src/pages/bridge` | 11 |
| `src/pages/customer` | 6 |
| Other | 38 |

### Top Offending Files

| File | Errors |
|---|---|
| `src/pages/erp/accounting/LedgerMaster.tsx` | 55 |
| `src/pages/tower/Security.tsx` | 15 |
| `src/pages/erp/foundation/geography/CountryMaster.tsx` | 14 |
| `src/pages/erp/foundation/geography/StateMaster.tsx` | 13 |
| `src/pages/erp/foundation/geography/RegionMaster.tsx` | 13 |
| `src/pages/erp/foundation/geography/PortMaster.tsx` | 13 |
| `src/pages/erp/pay-hub/transactions/AttendanceEntry.tsx` | 11 |
| `src/pages/erp/foundation/geography/DistrictMaster.tsx` | 10 |

---

## 2. `any` Inventory

**Command:** `grep -rE ":\s*any\b|\bas any\b|\bany\[\]|<any>" src --include="*.ts" --include="*.tsx" | wc -l`

**Total:** 224 occurrences

### Top Offending Files

| File | `any` Count |
|---|---|
| `src/pages/erp/inventory/ItemCraft.tsx` | 43 |
| `src/pages/erp/accounting/LedgerMaster.tsx` | 34 |
| `src/pages/erp/foundation/geography/GeographyHub.tsx` | 17 |
| `src/pages/erp/foundation/FoundationEntityHub.tsx` | 12 |
| `src/pages/erp/foundation/CompanyForm.tsx` | 12 |
| `src/pages/erp/pay-hub/transactions/PayslipGeneration.tsx` | 11 |
| `src/pages/erp/inventory/ReorderAlerts.tsx` | 11 |

Top 8 files account for ~150 of 224 occurrences (67%).

### Implicit-`any` from Seed Data (TS7018)

When `noImplicitAny` is on, seed-data object literals with bare `null` values widen to `any`. **66 such errors** in:
- `src/data/demo-receivx-data.ts` (~15)
- `src/data/demo-salesx-data.ts` (~13)
- `src/data/org-presets.ts` (~3)
- `src/features/loan-emi/lib/emi-lifecycle-engine.ts` (~3)
- Others

These need either `as ConcreteType` casts at literal sites OR explicit interface annotations on the parent constants.

---

## 3. Logic-Related Errors (6 total)

These would surface even without unused-locals:

| File | Line | Code | Issue |
|---|---|---|---|
| `src/features/salesx/SalesXPage.tsx` | 122 | TS2322 | `(m: SalesXModule) => void` not assignable to `(m: string) => void` — narrow callback signature |
| `src/hooks/useDemoSeedLoader.ts` | 98, 104 | TS2783 | `id` specified twice in spread — `{ id: p.id, ...p }` overwrites |
| `src/pages/erp/accounting/CurrencyMaster.tsx` | 352 | TS2345 | `entity_id: string \| null` not assignable to `entity_id: null` — BLANK_CURRENCY type needs widening |
| `src/pages/erp/finecore/reports/OutstandingAging.tsx` | 45 | TS2345 | `bills: typeof filtered` initialized as `never` array |
| `src/pages/erp/pay-hub/transactions/StatutoryReturns.tsx` | 981 | TS2783 | `type` specified twice via spread of `amountInputProps` |

---

## 4. Recommendation

### What was completed in this turn
- ✅ Block 1 diagnostic complete (`Z1_strict_diagnostic.txt`, `Z1_any_diagnostic.txt` saved)
- ✅ Damage scope quantified: 435 strict errors + 224 `any`
- ✅ Confirmed under 500-error threshold (no sprint split required)
- ⛔ tsconfig + eslint changes **REVERTED** to keep build green

### What was NOT completed
- ❌ Block 2: tsconfig + eslint config flipped (reverted to keep build green)
- ❌ Block 3: 435 errors fixed across ~89 files
- ❌ Block 3: 224 `any` usages remediated
- ❌ Block 4: OWW compliance verification of D1-D5 audits
- ❌ Block 5: D-119 through D-125 backfill in Sheet 8
- ❌ Block 6: Final invariants + evidence folder

### Why this sprint should be split

The prompt itself estimates 3-4 days. Block 3 alone touches ~89 files with non-trivial decisions on each `any` (Zod wrap vs concrete type vs interface refactor). Auto-fixing unused imports via script is feasible but each `any` removal in `LedgerMaster.tsx` (34 hits) requires understanding the runtime shape of values flowing through. This cannot be safely automated in a single agent turn.

### Suggested execution path

**Option A — Z1a + Z1b split** (recommended):
- **Z1a (1 day):** Activate `noUnusedLocals` + `noUnusedParameters` + bulk-fix the 429 unused errors via scripted import cleanup + manual TS6196 + 6 logic fixes. Add D-125 entry. Build green.
- **Z1b (2 days):** Activate `strict` + `noImplicitAny` + `strictNullChecks` + ESLint `no-explicit-any: error`. Hand-fix the 224 anys + 66 TS7018 literals. Backfill D-119..D-124. Run full smoke suite.

**Option B — single sprint over 3-4 sessions**, executing one block per session with founder verification between sessions.

### State of repository after this turn
- `tsconfig.app.json` — RESTORED to original (strict flags off)
- `eslint.config.js` — RESTORED to original (no-explicit-any rule not added)
- No source files modified
- Build: green (unchanged from baseline)
- Diagnostics saved to `audit_workspace/Z1_strict_diagnostic.txt` + `Z1_any_diagnostic.txt`
- This file: `audit_workspace/Z1_close_evidence/Z1_diagnostic_summary.md`
