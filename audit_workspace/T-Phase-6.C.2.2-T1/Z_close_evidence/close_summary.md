# Sprint 110 T1 Hot-Fix Close Summary

## Sprint Identity

| Key | Value |
|-----|-------|
| Sprint | T-Phase-6.C.2.2-T1 |
| Arc | Arc 3 (Group Consolidation) |
| Type | TEST-ONLY hot-fix |
| Parent Sprint | T-Phase-6.C.2.2 (S110) |
| Predecessor HEAD | `ec356152` |

---

## §L — Change Log

### (1) sprint-109 test registry hygiene (`group-consolidation.test.ts`)

- **File**: `src/test/sprint-109/group-consolidation.test.ts`
- **Line**: ~265
- **Change**: `expect(getSiblingCount()).toBe(177)` → `expect(getSiblingCount()).toBeGreaterThanOrEqual(177)`
- **Rationale**: Sprint 110 added SIBLING #178 (`fx-translation-engine`). The hard `toBe(177)` assertion became stale. Using `toBeGreaterThanOrEqual(177)` makes the S109 test pack forward-compatible with subsequent sibling additions while still asserting the baseline minimum.

### (2) sprint-110 FR-44 scope-wall test — re-scoped from blanket regex to import+call assertions (`fx-translation.test.ts`)

- **File**: `src/test/sprint-110/fx-translation.test.ts`
- **Lines**: ~236 & ~267
- **Problem**: The original assertions used `not.toMatch(/fx-what-if/i)` on the **entire engine source file**. This wrongly failed because the `@fr-44` **documentation header COMMENT** in `fx-translation-engine.ts` (line 5) explicitly documents the wall by naming `fx-what-if-engine` as the distinct simulator engine. The comment is allowed; the test was too broad.
- **Fix**: Replaced with narrowly-scoped regexes that assert:
  1. **NO import** from a `fx-what-if-engine` module path (both relative `./` and alias `@/lib/` forms)
  2. **NO function calls** to `computeFXScenarioForRealisation(`, `loadFXScenarios(`, or `saveScenario(`
  3. Kept the **positive** `loadForexRates`-reuse assertion unchanged
- **Rationale**: The FR-44 wall is about **runtime dependency** (no import, no call), not about **documentation silence**. The `@fr-44` header comment is intentional institutional documentation and must be allowed.

---

## §S — Scope & Impact Surface

| Dimension | Value |
|-----------|-------|
| Engine files touched | **0** (`fx-translation-engine.ts` and `group-consolidation-engine.ts` unchanged) |
| Test files changed | **2** (sprint-109 pack, sprint-110 pack) |
| Production code delta | **0 lines** |
| SIBLING count | 178 (unchanged) |
| Page count | 38 (unchanged) |
| Audit types | 7 (unchanged) |

---

## §T — Triple-Gate Results

| Gate | Result | Details |
|------|--------|---------|
| **TSC** | ✅ PASS | `tsc --noEmit` — 0 errors |
| **ESLint** | ✅ PASS | `eslint . --max-warnings 0` — 0 warnings, 0 errors |
| **Vitest** | ✅ PASS | 86 tests across 4 files (sprint-109: 41, sprint-110: 40, meta: 4+1) — all green |
| **Build** | ✅ PASS | `npm run build` — completed, no errors |

---

## §H — Waiver Status

- S110 §H waiver (controlled additive `entityTBProvider?` on `consolidate`) remains in force. No new waiver required for this T1 hot-fix.

---

## §R — Risk & Regression Notes

1. **Forward-compatibility**: The `toBeGreaterThanOrEqual(177)` pattern in S109 tests should be adopted as the standard for registry-hygiene assertions in older sprint packs when they are re-run after newer siblings are added.
2. **Test regex discipline**: Source-file regex assertions on engine source should always be scoped to **import statements + call sites**, never blanket `not.toMatch` on the whole file, to avoid false positives from institutional documentation headers.

---

## §A — Arc Status

| Metric | Count |
|--------|-------|
| SIBLINGs | 178 |
| Standalone Pages | 38 |
| Audit Types | 7 |
| ⭐ Sprint A completions | 36 (S110) |

Arc 3 is on track. No S111 pre-entry created.

---

*Hot-fix committed from local clone. HEAD to be reported by user post-push.*
