# Sprint T-Phase-1.Precision-Arc · Stage 3B · Block 1 — Close Summary
## The Reclassify-Pass (C1 + C2 + C3)
**Predecessor HEAD:** `7250cf9` (Payment.tsx:537 surgical fix banked) · **Block scope:** 48 sites · **Expected production-code diff:** 0 lines

---

## Verdict — confirm-or-STOP table (all 48)

### C1 · Percentages mislabelled as money — 8 sites · all CONFIRMED-C1 → RECLASSIFY-C

| # | Site | Code (verified at HEAD `7250cf9`) | Verdict |
|---|---|---|---|
| 1 | src/pages/erp/inventory/PriceListManager.tsx:185 | `const pct = parseFloat(fillPct);` | CONFIRMED-C1 — `fillPct` is a user-entered percentage; downstream `* (pct / 100)` confirms rate semantics |
| 2 | src/pages/erp/inventory/PriceListManager.tsx:196 | `const disc = parseFloat(fillPct);` | CONFIRMED-C1 — same `fillPct` percentage in fixed_pct_discount path |
| 3 | src/pages/erp/inventory/PriceListManager.tsx:273 | `discount_percent: itemForm.discount_percent ? parseFloat(itemForm.discount_percent) : null` | CONFIRMED-C1 — field name is literally `discount_percent` |
| 4 | src/pages/erp/inventory/PriceListManager.tsx:286 | `discount_percent: itemForm.discount_percent ? parseFloat(itemForm.discount_percent) : null` | CONFIRMED-C1 — duplicate of (3) on the create-path |
| 5 | src/pages/erp/inventory/ItemRatesMRP.tsx:200 | `const pct = parseFloat(qaPercent);` | CONFIRMED-C1 — `qaPercent` is a quick-action increase/decrease % |
| 6 | src/pages/erp/inventory/ItemRatesMRP.tsx:232 | `const pct = parseFloat(bulkPercent);` | CONFIRMED-C1 — `bulkPercent` is a bulk-update % |
| 7 | src/pages/erp/inventory/StockMatrix.tsx:280 | `cess_rate: parseFloat(e.target.value) \|\| null` | CONFIRMED-C1 — GST cess rate is a percentage |
| 8 | src/pages/erp/pay-hub/masters/EmployeeMaster.tsx:1312 | `pfNomineePct: parseFloat(e.target.value) \|\| 0` | CONFIRMED-C1 — PF nominee allocation %; field name is `…Pct` |

### C2 · Demo / seed / fixture data — 28 sites · all CONFIRMED-C2 → RECLASSIFY-C (founder ruled out-of-scope)

Importer audit (`rg`-confirmed at HEAD `7250cf9`): every file below is consumed only by demo seed orchestrators (`src/lib/demo-seed-orchestrator.ts`), demo loaders (`src/hooks/useDemoSeedLoader.ts`), entity setup (`src/services/entity-setup-service.ts` — first-run seed), or dev tools (`src/components/dev-tools/FixtureCoverageHeatmap.tsx`). None of these files are imported into a production calculation path that posts/stores money produced *by* their math; they generate illustrative seed values.

| # | Site | Verdict |
|---|---|---|
| 9 | src/data/demo-transactions-pay-hub.ts:43 | CONFIRMED-C2 |
| 10 | src/data/demo-transactions-pay-hub.ts:45 | CONFIRMED-C2 |
| 11 | src/data/demo-transactions-pay-hub.ts:62 | CONFIRMED-C2 |
| 12 | src/data/demo-transactions-pay-hub.ts:64 | CONFIRMED-C2 |
| 13 | src/data/demo-transactions-pay-hub.ts:65 | CONFIRMED-C2 |
| 14 | src/data/demo-transactions-pay-hub.ts:88 | CONFIRMED-C2 |
| 15 | src/data/demo-transactions-pay-hub.ts:90 | CONFIRMED-C2 |
| 16 | src/data/demo-transactions-pay-hub.ts:92 | CONFIRMED-C2 |
| 17 | src/data/demo-transactions-pay-hub.ts:112 | CONFIRMED-C2 |
| 18 | src/data/demo-procurement-data.ts:182 | CONFIRMED-C2 |
| 19 | src/data/demo-procurement-data.ts:271 | CONFIRMED-C2 |
| 20 | src/data/demo-procurement-data.ts:275 | CONFIRMED-C2 |
| 21 | src/data/demo-procurement-data.ts:302 | CONFIRMED-C2 |
| 22 | src/data/demo-procurement-data.ts:303 | CONFIRMED-C2 |
| 23 | src/data/demo-procurement-data.ts:304 | CONFIRMED-C2 |
| 24 | src/data/demo-salesx-data.ts:336 | CONFIRMED-C2 |
| 25 | src/data/demo-salesx-data.ts:436 | CONFIRMED-C2 |
| 26 | src/data/demo-salesx-data.ts:493 | CONFIRMED-C2 |
| 27 | src/data/demo-transactions-salesx.ts:84 | CONFIRMED-C2 |
| 28 | src/data/demo-transactions-salesx.ts:137 | CONFIRMED-C2 |
| 29 | src/data/demo-transactions-salesx.ts:216 | CONFIRMED-C2 |
| 30 | src/data/demo-field-force-data.ts:423 | CONFIRMED-C2 |
| 31 | src/data/demo-field-force-data.ts:426 | CONFIRMED-C2 |
| 32 | src/data/demo-field-force-data.ts:443 | CONFIRMED-C2 |
| 33 | src/data/fixtures/manifest.ts:87 | CONFIRMED-C2 |
| 34 | src/data/fixtures/manifest.ts:88 | CONFIRMED-C2 |
| 35 | src/data/fixtures/manifest.ts:89 | CONFIRMED-C2 |
| 36 | src/data/demo-projects.ts:158 | CONFIRMED-C2 |

### C3 · Print / display engines + display-string sites — 12 sites · all CONFIRMED-C3 → RECLASSIFY-B

| # | Site | Code (verified at HEAD `7250cf9`) | Verdict |
|---|---|---|---|
| 37 | src/lib/invoice-print-engine.ts:130 | `const t = Math.floor(n / 10);` (twoDigits → words) | CONFIRMED-C3 — number-to-words digit extraction |
| 38 | src/lib/invoice-print-engine.ts:136 | `const h = Math.floor(n / 100);` (threeDigits → words) | CONFIRMED-C3 — same |
| 39 | src/lib/invoice-print-engine.ts:151 | `const rupees = Math.floor(abs);` (amountInWordsIN) | CONFIRMED-C3 — display split, not stored |
| 40 | src/lib/invoice-print-engine.ts:158 | `const crore = Math.floor(n / 10000000);` | CONFIRMED-C3 — Indian-numbering display split |
| 41 | src/lib/invoice-print-engine.ts:159 | `const lakh = Math.floor(n / 100000);` | CONFIRMED-C3 — same |
| 42 | src/lib/invoice-print-engine.ts:160 | `const thousand = Math.floor(n / 1000);` | CONFIRMED-C3 — same |
| 43 | src/lib/voucher-print-shared.ts:113 | `const rounded = Math.round(n * 100) / 100;` inside `formatINR` | CONFIRMED-C3 — display-string formatter, returns `string` via `toLocaleString` |
| 44 | src/lib/insight-generators.ts:85 | `const topPct = Math.round((top[1] / total) * 100);` | CONFIRMED-C3 — % concentration in narrative string |
| 45 | src/pages/bridge/SyncMonitor.tsx:537 | `${Math.round((processed/records)*100)}%` in `<p>` | CONFIRMED-C3 — JSX display-string % |
| 46 | src/pages/erp/salesx/transactions/Telecaller.tsx:887 | `${Math.round((successful/calls_made)*100)}% success` | CONFIRMED-C3 — JSX display-string % |
| 47 | src/components/mobile/MobileSiteDPRCapture.tsx:71 | `Math.round(dist)`m inside `toast.success` | CONFIRMED-C3 — metres in toast, non-money |
| 48 | src/components/mobile/MobilePODCapture.tsx:60 | `Math.round(r.accuracy_m)`m inside `toast.success` | CONFIRMED-C3 — metres in toast, non-money |

---

## Counts

| Category | Confirmed-reclassified | STOP-and-raised |
|---|---|---|
| C1 — Percentages mislabelled as money (RECLASSIFY-C) | 8 / 8 | 0 |
| C2 — Demo / seed / fixture data (RECLASSIFY-C, founder out-of-scope) | 28 / 28 | 0 |
| C3 — Print / display engines + display-string sites (RECLASSIFY-B) | 12 / 12 | 0 |
| **Total** | **48 / 48** | **0** |

---

## STOP-AND-RAISE — does not belong in its category

**None.** Every one of the 48 sites was confirmed in its assigned category. The reclassify-pass did not need to launder any defect — the expected and best outcome.

---

## Production-code diff

**Zero lines changed.** No `roundTo` / `decimal-helpers` calls were added. No production code was touched. Block 1 is a documentation reconciliation, exactly as scoped.

---

## Audit-table reconciliation confirmation

`src/__tests__/__sprint-summaries__/precision-arc-stage2-audit-table.md` — appended Stage 3B Block 1 Reconciliation appendix:
- `Payment.tsx:537` marked **RESOLVED — Stage 3B precursor surgical fix, HEAD `7250cf9`** (covers all duplicate occurrences in the audit-table sections).
- All 48 Block 1 sites annotated with their Stage 3B disposition (`RECLASSIFY-C` for C1/C2, `RECLASSIFY-B` for C3, with category and block).
- **Zero rows deleted** — appendix-style reconciliation preserves the historical record.

---

## Protected-zone 0-diff confirmation

| Path | Diff |
|---|---|
| src/lib/decimal-helpers.ts | 0 lines (not even imported in this block) |
| src/types/voucher-type.ts | 0 lines |
| src/types/cc-masters.ts | 0 lines |
| src/components/operix-core/applications.ts | 0 lines |
| src/lib/cc-compliance-settings.ts | 0 lines |

---

## Triple Gate — baseline vs final (expected identical)

| Gate | Baseline (`7250cf9`) | Final (this block) |
|---|---|---|
| TSC | 0 errors | 0 errors |
| ESLint | 0 errors / 10 warnings | 0 errors / 10 warnings |
| Vitest | 1137 / 159 green | 1137 / 159 green |
| Build | clean | clean |

(No production code changed; gate is a confirmation that nothing was disturbed.)

---

## Files touched in Block 1

1. `src/__tests__/__sprint-summaries__/precision-arc-stage2-audit-table.md` — appendix appended (no rows deleted, no rows modified in place except via appendix annotation).
2. `src/__tests__/__sprint-summaries__/precision-arc-stage3b-block1-close-summary.md` — this file (created).

**No production-code files touched.** No tests touched.

---

**HALT for §2.4 Real Git Clone Audit. No self-certification. Block 2 NOT started.**
