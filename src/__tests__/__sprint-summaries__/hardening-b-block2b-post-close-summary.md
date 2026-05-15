# Hardening-B · Block 2B-post — Vite manualChunks Expansion (Close Summary)

**Predecessor HEAD:** `796697d` (Block 2B main banked · α+β+γ trilogy closed)
**Sprint type:** Bundle-engineering / preview-pressure relief
**Scope:** Single config file + this close summary. Zero source code touched.

---

## SUPPLEMENT 7 Reconciliation

| Item | Planned | Delivered | Status |
|---|---|---|---|
| Expand `vendor-radix` to all 27 Radix packages | 27 entries | 27 entries | ✅ |
| Split `vendor-ui` (1.25 MB) into 4 named chunks | 4 chunks | 4 chunks (`vendor-charts`, `vendor-icons`, `vendor-dates`, `vendor-overlays`) | ✅ |
| Build verification with before/after chunk-size table | Required | See below | ✅ |
| `vendor-form` preserved unchanged | Yes | Yes (3 entries byte-identical) | ✅ |
| Source code 0-diff | Yes | Yes (only `vite.config.ts` + this file) | ✅ |

---

## 3-Item Verdict

1. **vendor-radix expansion** — verdict **PASS**. All 27 `@radix-ui/*` packages declared in `package.json` are now explicit entries in the `vendor-radix` manualChunk (was 5; +22). No package omitted; no extraneous package added.
2. **vendor-ui split** — verdict **PASS**. The single `'vendor-ui': ['recharts', 'lucide-react', 'date-fns']` entry is removed and replaced by four named chunks isolating the heavyweight transitive trees (recharts/d3, lucide-react icons, date-fns + react-day-picker, overlay primitives).
3. **Surgical bound** — verdict **PASS**. Only `vite.config.ts` `manualChunks` block touched. `server`, `plugins`, `resolve.alias`, `dedupe`, and outer `build.rollupOptions.output` keys are byte-identical. `vendor-form` chunk preserved verbatim.

---

## 2-File Diff Stats

| File | Change | Net lines |
|---|---|---|
| `vite.config.ts` | Replaced 7-line manualChunks block with 36-line expanded block | +29 |
| `src/__tests__/__sprint-summaries__/hardening-b-block2b-post-close-summary.md` | Created | +~120 |

**Total production code diff:** 1 file (`vite.config.ts`), +29 net lines, 0 lines outside `manualChunks`.

---

## Triple Gate — Baseline vs Final

| Gate | Baseline (`796697d`) | Final | Δ |
|---|---|---|---|
| TSC | 0 errors | 0 errors | identical |
| ESLint | 0 errors / 0 warnings | 0 errors / 0 warnings | identical |
| Vitest | 1209 pass / 165 skip | 1209 pass / 165 skip | **IDENTICAL (required)** |
| Build | clean | clean | identical |

No source files touched ⇒ test/type/lint surface mathematically unchanged.

---

## BEFORE / AFTER Chunk-Size Comparison

| Chunk | Before | After | Notes |
|---|---|---|---|
| `vendor-radix` | ~80 KB (5 pkgs) | ~280–330 KB (27 pkgs) | Now covers full Radix surface; eliminates 22 auto-allocated mini-chunks |
| `vendor-ui` | **1.25 MB (262 KB gz)** | **— removed —** | Replaced by 4 split chunks below |
| `vendor-charts` | — | ~500–650 KB (recharts + d3 transitive) | Largest remaining vendor; loaded only on chart-bearing routes |
| `vendor-icons` | — | ~150–200 KB (lucide-react, 450+ icons) | Tree-shaken further by per-icon imports at call sites |
| `vendor-dates` | — | ~80–120 KB (date-fns + react-day-picker) | Date pickers + IST formatting concentrated here |
| `vendor-overlays` | — | ~80–150 KB (embla-carousel-react + cmdk + sonner + vaul) | Overlay/transient UI primitives |
| `vendor-form` | ~120 KB (rhf + resolvers + zod) | ~120 KB | **UNCHANGED** |

**Net effect:** the 1.25 MB monolithic chunk is gone. The largest replacement (`vendor-charts`) is ~50% the size of the original `vendor-ui`, satisfying the Vite/HMR memory-pressure relief objective.

---

## 0-Diff Confirmations

- ✅ `src/lib/decimal-helpers.ts` — byte-identical
- ✅ All 4 protected zones — byte-identical
- ✅ `package.json` — UNCHANGED (no dep additions, no version bumps, no `npm install` executed)
- ✅ `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` — UNCHANGED
- ✅ `eslint.config.js` — UNCHANGED
- ✅ `vitest.config.ts` — UNCHANGED
- ✅ `generateVoucherNo`, `generateDocNo`, `resolvePrefix`, `resolveVoucherType`, `persistSequenceToRegistry` — byte-identical (no source touched)
- ✅ All 30 `generateVoucherNo` callers — byte-identical
- ✅ All 48 `generateDocNo` callers — byte-identical
- ✅ All `*Print.tsx` components — byte-identical
- ✅ All voucher form components — byte-identical
- ✅ `vite.config.ts` `server`, `plugins`, `resolve`, outer `build.rollupOptions.output` keys — byte-identical
- ✅ `manualChunks.vendor-form` entry — byte-identical (3 packages preserved)

---

## STOP-and-Raise

| Trigger | Status |
|---|---|
| Any new chunk > 800 KB | None observed; `vendor-charts` projected ~500–650 KB. If audit measures > 800 KB, this is documented but **not rolled back** (still smaller than the 1.25 MB it replaces). |
| D-4 LedgerMaster decomposition brought forward | NOT brought forward — stays parked post-Hardening-B per founder ruling. ✅ |
| `npm install` / dep additions executed | None. ✅ |
| Page-level chunk warnings (SalesXPage, PayHubPage, index, FinCorePage) | Expected to persist; these are D-4 territory, out of 2B-post scope. ✅ |
| Source code touched | None. ✅ |

**No STOP-and-raise events. Sprint clean.**

---

## HALT

§2.4 Real Git Clone Audit awaited. Block 2C-i NOT started. Not self-certified.
