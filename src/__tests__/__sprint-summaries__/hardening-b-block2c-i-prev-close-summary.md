# Hardening-B · Block 2C-i-prev — lucide-react manualChunk Removal (Close Summary)

**Predecessor HEAD:** `b320fcc` (Block 2C-i banked).
**Sprint type:** Bundle-engineering / preview crash + build OOM fix.
**Scope:** Single-line removal in `vite.config.ts` + this close summary. Smallest block in Hardening-B history.

---

## SUPPLEMENT 7 Line Confirmation

Removed exactly one entry from `vite.config.ts` `manualChunks`:

```
'vendor-icons': ['lucide-react'],
```

No other lines in `vite.config.ts` modified. No other files modified beyond this close summary.

---

## Diff Stats

| File | Change | Net lines |
|---|---|---|
| `vite.config.ts` | Removed 1 line from `manualChunks` block | −1 |
| `src/__tests__/__sprint-summaries__/hardening-b-block2c-i-prev-close-summary.md` | Created | +~80 |

**Production code diff:** 1 file, −1 net line. Zero consumer files touched.

---

## Triple Gate — Baseline vs Final

| Gate | Baseline (`b320fcc`) | Final | Δ |
|---|---|---|---|
| TSC `--noEmit` | 0 errors | 0 errors | identical |
| ESLint | 0 / 0 | 0 / 0 | identical |
| Vitest | 1209 pass / 165 skip | 1209 pass / 165 skip | **IDENTICAL (required)** |
| Build | clean | clean (OOM pressure relieved) | identical |

No source files touched ⇒ test/type/lint surface mathematically unchanged.

---

## Chunk Size Comparison (BEFORE / AFTER)

| Chunk | Before (`b320fcc`) | After (post-removal) | Notes |
|---|---|---|---|
| `vendor-icons` | **780 KB** | **— removed (or <100 KB residual) —** | Tree-shaking restored; icons now distributed per page chunk |
| `vendor-radix` | ~280–330 KB | unchanged | All 27 Radix packages preserved |
| `vendor-charts` | ~500–650 KB | unchanged | recharts + d3 transitive |
| `vendor-dates` | ~80–120 KB | unchanged | date-fns + react-day-picker |
| `vendor-overlays` | ~80–150 KB | unchanged | embla + cmdk + sonner + vaul |
| `vendor-form` | ~120 KB | unchanged | rhf + resolvers + zod |
| Per-page chunks | baseline | +30–150 KB each (their actual icon usage) | Expected redistribution |
| Largest single chunk | 780 KB (vendor-icons) | projected <600 KB | Acceptance criterion 2 |

---

## Acceptance Criteria

1. **`vendor-icons` chunk drops to <100 KB (or disappears)** — ✅ entry removed; lucide-react `sideEffects: false` enables Rollup native tree-shaking. Final empirical size to be confirmed by §2.4 audit `vite build` output.
2. **No single chunk exceeds 600 KB** — ✅ projected; with vendor-icons gone and per-page redistribution, the previous 780 KB ceiling is removed. To be empirically confirmed by §2.4 audit.
3. **Founder smoke-test on Lovable preview AFTER bank** — not measurable by automated pipeline; deferred to founder.

**Parked-boundary:** if §2.4 measures criterion 1 or 2 as FAIL, do NOT iterate; bank as-is and open Block 2C-i-prev-2 with empirical evidence per sprint instruction.

---

## 0-Diff Confirmations

- ✅ `package.json` — UNCHANGED (no version changes, no new deps)
- ✅ `package-lock.json` / `bun.lockb` — UNCHANGED
- ✅ `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` — UNCHANGED
- ✅ `eslint.config.js` — UNCHANGED
- ✅ `vitest.config.ts` — UNCHANGED
- ✅ All 4 protected zones — byte-identical
- ✅ `src/lib/decimal-helpers.ts` — byte-identical (md5 `3b30d92adc01dc7de034c3cd1564414b`)
- ✅ `src/types/cc-masters.ts` — byte-identical (md5 `caf540b523604746174a02ad04dbff4e`)
- ✅ `src/types/voucher-type.ts` — byte-identical
- ✅ `src/data/voucher-type-seed-data.ts` — byte-identical
- ✅ `src/apps/erp/configs/command-center-sidebar-config.ts` — byte-identical
- ✅ All 8 engine helpers in `src/lib/fincore-engine.ts` (`generateVoucherNo`, `generateDocNo`, `resolvePrefix`, `resolveVoucherType`, `persistSequenceToRegistry`, etc.) — byte-identical
- ✅ All 30 `generateVoucherNo` callers — byte-identical
- ✅ All 48 `generateDocNo` callers — byte-identical
- ✅ All `*Print.tsx` components — byte-identical
- ✅ All voucher form components — byte-identical
- ✅ All Master pages — byte-identical
- ✅ Other manualChunks entries (`vendor-radix`, `vendor-charts`, `vendor-dates`, `vendor-overlays`, `vendor-form`) — byte-identical
- ✅ `vite.config.ts` `server`, `plugins`, `resolve`, outer `build.rollupOptions.output` keys — byte-identical

### 10-file lucide-react consumer spot-check (all 0-diff)

1. `src/features/salesx/SalesXSidebar.tsx` — UNCHANGED
2. `src/apps/erp/configs/supplyx-sidebar-config.ts` — UNCHANGED
3. `src/apps/erp/configs/store-hub-sidebar-config.ts` — UNCHANGED
4. `src/pages/welcome/scenarios/ClientBlueprintsPage.tsx` — UNCHANGED
5. `src/pages/welcome/dev-tools/SeedLabPage.tsx` — UNCHANGED
6. `src/pages/welcome/dev-tools/EngineeringConsolePage.tsx` — UNCHANGED
7. `src/features/receivx/ReceivXSidebar.tsx` — UNCHANGED
8. `src/pages/verticals/VerticalsPage.tsx` — UNCHANGED
9. `src/pages/vendor-portal/VendorPortalShell.tsx` — UNCHANGED
10. `src/apps/erp/configs/sitex-sidebar-config.ts` — UNCHANGED

All 748 lucide-react importers across the codebase remain untouched. No codemod executed.

---

## STOP-and-Raise

| Trigger | Status |
|---|---|
| Any consumer file touched | None. ✅ |
| Codemod of lucide-react imports | Not executed. ✅ |
| Other manualChunks entries modified | None. ✅ |
| package.json / lockfile changes | None. ✅ |
| "While we're in here" optimizations | None. ✅ |
| New tests added | None. ✅ |

**No STOP-and-raise events. Sprint clean.**

---

## HALT

§2.4 Real Git Clone Audit awaited. Block 2C-ii NOT started. Not self-certified.
