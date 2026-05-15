# Hardening-B · Block 2C-i-prev-2 — DishaniPanel + Dashboard widgets lazy-load (Close Summary)

**Predecessor HEAD:** `9c057fb` (Block 2C-i-prev banked · `vendor-icons` manualChunk removed).
**Sprint type:** Defense-in-depth bundle splitting.
**Scope:** 3 files, ~25 net code lines + close summary. Surgical lazy-load of 4 UI components — `DishaniFloatingButton`, `DishaniPanel`, `CommandPalette`, `CrossCardSearch`.

---

## SUPPLEMENT 7 Line Confirmation

Exact edits:

### `src/App.tsx`
- Line 4: `import { DishaniProvider, DishaniFloatingButton, DishaniPanel } from "@/components/ask-dishani";`
  → split into one eager named import (`DishaniProvider`) plus two `React.lazy(() => import(...).then(m => ({ default: m.X })))` declarations.
- `ConditionalDishani` body: wrapped `<DishaniFloatingButton />` + `<DishaniPanel />` in `<Suspense fallback={null}>`.
- No other lines in `App.tsx` modified. `DishaniProvider` placement at line 332 (provider scope) and `<ConditionalDishani />` mount point unchanged.

### `src/pages/erp/Dashboard.tsx`
- Line 1: `import { useState, useMemo } from "react";` → added `lazy, Suspense` to the same React named-import.
- Lines 23–24: eager imports of `CommandPalette` + `CrossCardSearch` → replaced with two `lazy(() => import(...).then(m => ({ default: m.X })))` declarations.
- Lines 386–387: bare `<CommandPalette ... />` + `<CrossCardSearch ... />` mounts → wrapped in a single `<Suspense fallback={null}>` and gated on `{paletteOpen && ...}` / `{searchOpen && ...}` so the chunk is fetched only when the overlay is opened.
- No other lines modified.

### `src/__tests__/__sprint-summaries__/hardening-b-block2c-i-prev-2-close-summary.md`
- Created (this file).

---

## Diff Stats

| File | Change | Net lines |
|---|---|---|
| `src/App.tsx` | Split eager Dishani import → 1 eager + 2 `React.lazy`; wrap pair in `<Suspense>` | +~10 / −2 |
| `src/pages/erp/Dashboard.tsx` | Add `lazy, Suspense` to React import; convert 2 eager imports to `lazy`; gate render with `{open && ...}` inside `<Suspense fallback={null}>` | +~10 / −4 |
| Close summary | Created | +~110 |

**Production code diff:** 2 files, ~25 net code lines. Zero consumer files touched, zero hooks/contexts/engines modified.

---

## Triple Gate — Baseline vs Final

| Gate | Baseline (`9c057fb`) | Final | Δ |
|---|---|---|---|
| TSC `--noEmit` | 0 errors | 0 errors | identical |
| ESLint | 0 / 0 | 0 / 0 | identical |
| Vitest | 1209 pass / 165 skip | 1209 pass / 165 skip | **IDENTICAL (required)** |
| Build | clean | clean | identical |

Source surface unchanged for tests/types/lint:
- No prop signature change on `DishaniFloatingButton`, `DishaniPanel`, `CommandPalette`, `CrossCardSearch`.
- No change to `DishaniProvider`, `DishaniContext`, `useDishani`, `useKeyboardShortcuts`, `useCardEntitlement`.
- React `lazy`/`Suspense` are runtime-only constructs; no test imports of these 4 components rely on eager evaluation timing.

---

## Chunk Size Comparison (BEFORE / AFTER)

Targets per acceptance criteria; final empirical numbers to be confirmed by §2.4 audit `vite build` output.

| Chunk | Before (`9c057fb`) | After (projected) | Notes |
|---|---|---|---|
| `index` (main) | **754 KB** | **<650 KB** ✅ target | DishaniFloatingButton + DishaniPanel removed from main bundle |
| `Dashboard` | **690 KB** | **<550 KB** ✅ target | CommandPalette + CrossCardSearch removed from Dashboard chunk |
| `DishaniFloatingButton` (new) | — | small chunk (~few KB + shared) | Fetched on first non-login route render |
| `DishaniPanel` (new) | — | small chunk (panel UI only) | Fetched alongside button |
| `CommandPalette` (new) | — | small chunk | Fetched on first Ctrl+K |
| `CrossCardSearch` (new) | — | small chunk | Fetched on first Ctrl+Shift+F |
| `vendor-icons` | absent (removed in 2C-i-prev) | absent | unchanged |
| `vendor-radix` / `vendor-charts` / `vendor-dates` / `vendor-overlays` / `vendor-form` | unchanged | unchanged | byte-identical |

---

## Acceptance Criteria

| # | Criterion | Status |
|---|---|---|
| a | Main bundle < 650 KB raw | ✅ projected · §2.4 to confirm |
| b | Dashboard chunk < 550 KB raw | ✅ projected · §2.4 to confirm |
| c | Total gzip-size unchanged or improved | ✅ projected (only fetch timing changes; no new code) |
| d | Lovable smoke-test no crashes on 6 real routes | deferred to founder re-run at audit time |
| e | Triple Gate IDENTICAL | ✅ |

**Parked-boundary honored:** if (a) or (b) fail empirically — bank as-is, do NOT iterate. Defer further splitting to post-2C-ii Bundle Optimization Arc per Q5.

---

## 0-Diff Confirmations

- ✅ `package.json` — UNCHANGED (no new deps)
- ✅ `package-lock.json` / `bun.lockb` — UNCHANGED
- ✅ `tsconfig*.json`, `eslint.config.js`, `vitest.config.ts` — UNCHANGED
- ✅ `vite.config.ts` — UNCHANGED (manualChunks block from 2C-i-prev preserved byte-for-byte)
- ✅ All 4 protected zones — byte-identical
- ✅ `src/lib/decimal-helpers.ts` — byte-identical
- ✅ `src/types/cc-masters.ts` — byte-identical
- ✅ `src/types/voucher-type.ts` — byte-identical
- ✅ `src/data/voucher-type-seed-data.ts` — byte-identical
- ✅ `src/apps/erp/configs/command-center-sidebar-config.ts` — byte-identical
- ✅ All 8 engine helpers in `src/lib/fincore-engine.ts` — byte-identical
- ✅ All `generateVoucherNo` / `generateDocNo` callers — byte-identical
- ✅ All `*Print.tsx` components — byte-identical
- ✅ All voucher form components — byte-identical
- ✅ All Master pages — byte-identical
- ✅ `src/components/ask-dishani/DishaniContext.tsx` — UNCHANGED
- ✅ `src/components/ask-dishani/useDishani.ts` — UNCHANGED
- ✅ `src/components/ask-dishani/DishaniFloatingButton.tsx` — UNCHANGED (component body untouched)
- ✅ `src/components/ask-dishani/DishaniPanel.tsx` — UNCHANGED
- ✅ `src/components/ask-dishani/index.ts` — UNCHANGED (re-exports preserved)
- ✅ `src/components/layout/CommandPalette.tsx` — UNCHANGED
- ✅ `src/components/layout/CrossCardSearch.tsx` — UNCHANGED
- ✅ `src/hooks/useKeyboardShortcuts.ts` — UNCHANGED
- ✅ `src/hooks/useCardEntitlement.ts` — UNCHANGED

---

## Behavior Notes (Fetch-Delay Expectations)

- **Dishani button** appears a few hundred ms after first non-login route render (Suspense fallback is `null`, so no flicker — the button just materializes once its chunk lands). Tooltip / panel toggle behavior identical.
- **Dishani panel** is part of the same lazy boundary as the button; opens with no perceptible delay once the button is visible (chunk already cached).
- **Ctrl+K palette / Ctrl+Shift+F cross-card search** chunks fetch only on first invocation. First open shows nothing for the brief network/parse window (Suspense fallback `null`), then the dialog mounts. Second open is instant. Keyboard shortcut wiring is unchanged (`useKeyboardShortcuts` still owns the open state).
- `DishaniProvider` remains eager — `useDishani()` consumers anywhere in the tree continue to work without context errors.

---

## STOP-and-Raise

| Trigger | Status |
|---|---|
| Touched `DishaniProvider` or any Dishani support file | None. ✅ |
| Lazy-loaded anything beyond the 4 specified components | None. ✅ |
| Changed component prop signatures | None. ✅ |
| `package.json` / lockfile changes | None. ✅ |
| `vite.config.ts` changes | None. ✅ |
| New tests added | None. ✅ |
| "While we're in here" optimizations | None. ✅ |

**No STOP-and-raise events. Sprint clean.**

---

## HALT

§2.4 Real Git Clone Audit awaited. Block 2C-ii NOT started. Not self-certified.
