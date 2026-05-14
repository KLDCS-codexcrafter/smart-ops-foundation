# Precision Arc · Stage 3 · Block 4 · `inventory` — Close Summary

**Predecessor HEAD:** `2282440` (Block 3 T1 banked A POST-T1)
**Sprint:** T-Phase-1.Precision-Arc · Stage 3 · Block 4
**Cluster:** `src/pages/erp/inventory` (6 files · 22 candidates)
**Status:** HALT-for-§2.4-audit. No self-certification.

---

## §1 Scope & discipline

- All edits confined to the 6 files in Block 4's Appendix A.
- `decimal-helpers.ts`: 0 diff (consume-only).
- Protected zones (`src/types/voucher-type.ts`, `src/types/cc-masters.ts`, `src/components/operix-core/applications.ts`, `src/lib/cc-compliance-settings.ts`): 0 diff.
- RBI banker's rounding (ROUND_HALF_UP, D-142 LOCKED) preserved.
- Precision sourced from `resolveMoneyPrecision(null, null)` / `resolveQtyPrecision(undefined)` — no hardcoded `2`.
- No signature changes; no entity/UoM context plumbing.
- No `PayrollPrecisionConfig` use.

---

## §2 Full verdict table (all 22)

| # | Site | Field | Verdict | Resolver / Pattern |
|---|---|---|---|---|
| 1 | `MaterialIssueNote.tsx:843` | `rate` (input) | **MIGRATE** | `resolveMoneyPrecision` · Pattern 2 |
| 2 | `GRNEntry.tsx:1159` | `unit_rate` (input) | **MIGRATE** | `resolveMoneyPrecision` · Pattern 2 |
| 3 | `ConsumptionEntry.tsx:905` | `rate` (input) | **MIGRATE** | `resolveMoneyPrecision` · Pattern 2 |
| 4 | `StorageMatrix.tsx:233` | `total_capacity` | **MIGRATE** | `resolveQtyPrecision` · Pattern 2 · `\|\|null` preserved |
| 5 | `StorageMatrix.tsx:250` | `monthly_rent` | **MIGRATE** | `resolveMoneyPrecision` · Pattern 2 · `\|\|null` preserved · `checkTDS(r)` side-effect preserved |
| 6 | `StorageMatrix.tsx:253` | `escalation_rate` (%/yr) | **RECLASSIFY-C** | non-money percentage · skip |
| 7 | `StorageMatrix.tsx:267` | `tds_rate` (%) | **RECLASSIFY-C** | non-money percentage · skip |
| 8 | `OpeningStockEntry.tsx:101` | `q` (qty in totalValue) | **MIGRATE** | `resolveQtyPrecision` · Pattern 1 (dMul/dAdd) |
| 9 | `OpeningStockEntry.tsx:102` | `r` (rate in totalValue) | **MIGRATE** | `resolveMoneyPrecision` · Pattern 1 |
| 10 | `OpeningStockEntry.tsx:107` | `r` (serial rate) | **MIGRATE** | `resolveMoneyPrecision` · Pattern 1 (dAdd) |
| 11 | `OpeningStockEntry.tsx:112` | `q` (flat qty) | **MIGRATE** | `resolveQtyPrecision` · Pattern 1 |
| 12 | `OpeningStockEntry.tsx:113` | `r` (flat rate) | **MIGRATE** | `resolveMoneyPrecision` · Pattern 1 |
| 13 | `OpeningStockEntry.tsx:230` | `qty` (post · batch) | **MIGRATE** | `resolveQtyPrecision` · Pattern 1 (`value = dMul(qty,rate)` rounded) |
| 14 | `OpeningStockEntry.tsx:231` | `rate` (post · batch) | **MIGRATE** | `resolveMoneyPrecision` · Pattern 1 |
| 15 | `OpeningStockEntry.tsx:250` | `rate` (post · serial) | **MIGRATE** | `resolveMoneyPrecision` · Pattern 1 |
| 16 | `OpeningStockEntry.tsx:268` | `qty` (post · flat) | **MIGRATE** | `resolveQtyPrecision` · Pattern 1 |
| 17 | `OpeningStockEntry.tsx:269` | `rate` (post · flat) | **MIGRATE** | `resolveMoneyPrecision` · Pattern 1 |
| 18 | `OpeningStockEntry.tsx:477` | `b.qty` (batchQtyByGodown agg) | **MIGRATE** | `resolveQtyPrecision` · Pattern 1 (dAdd) |
| 19 | `OpeningStockEntry.tsx:608` | `val = qty * rate` (table cell) | **RECLASSIFY-B** | display-only inline cell value · skip |
| 20 | `ItemCraft.tsx:840` | `net_weight` | **MIGRATE** | `resolveQtyPrecision` · Pattern 2 · `\|\|null` preserved |
| 21 | `ItemCraft.tsx:843` | `gross_weight` | **MIGRATE** | `resolveQtyPrecision` · Pattern 2 · `\|\|null` preserved |
| 22 | `ItemCraft.tsx:983` | `cess_rate` (%) | **RECLASSIFY-C** | non-money percentage · skip |

**Counts:** 22 candidates → **18 MIGRATE** · **3 RECLASSIFY-C** (percentages) · **1 RECLASSIFY-B** (display).

---

## §3 STOP-AND-RAISE — adjacent non-scope sites

While editing Block 4 files, the following adjacent `parseFloat`/`parseInt` sites became visible but are **NOT in Appendix A**. Per the parked-boundary rule, they were **NOT migrated**. Cross-checked against the Stage 2 parked-248: at least the StorageMatrix money fields and ItemCraft money fields are not in the parked-248 list and require founder ruling.

| File:Line | Field | Probable class |
|---|---|---|
| `MaterialIssueNote.tsx:834` | `qty` | quantity |
| `GRNEntry.tsx:1144` | `ordered_qty` | quantity |
| `GRNEntry.tsx:1149` | `q` (received qty handler) | quantity |
| `GRNEntry.tsx:1155` | `accepted_qty` | quantity |
| `ConsumptionEntry.tsx:735` | `output_qty` | quantity |
| `ConsumptionEntry.tsx:887` | `standard_qty` | quantity |
| `ConsumptionEntry.tsx:892` | `actual_qty` | quantity |
| `StorageMatrix.tsx:251` | `security_deposit` | money (₹) |
| `StorageMatrix.tsx:254` | `notice_period_days` (parseInt) | quantity (days) |
| `StorageMatrix.tsx:255` | `lock_in_months` (parseInt) | quantity (months) |
| `OpeningStockEntry.tsx:242, 243, 260, 261, 276, 277` | `mrp`, `std_purchase_rate` | money (used inside post block, but not in Appendix A) |
| `OpeningStockEntry.tsx:285, 286` | `allItems[idx].mrp` / `std_purchase_rate` | money |
| `ItemCraft.tsx:807, 830` | conversion factors | quantity |
| `ItemCraft.tsx:854` | dimension fields | quantity |
| `ItemCraft.tsx:904, 910` | packing units | quantity |
| `ItemCraft.tsx:960` | rate `r` | money |
| `ItemCraft.tsx:1019` | `mrp` | money |
| `ItemCraft.tsx:1081` | dynamic numeric field | mixed |
| `ItemCraft.tsx:1146, 1151` | qty/rate handlers | qty/money |
| `ItemCraft.tsx:1204, 1224` | warranty/service interval (parseInt) | quantity (days/months) |
| `ItemCraft.tsx:1330` | vendor numeric field | mixed |
| `ItemCraft.tsx:1475, 1480` | carbon footprint / recyclability % | non-money / quantity |

**Action requested:** founder ruling on whether these adjacent sites should be added to a future block's Appendix A.

---

## §4 Migration patterns used

- **Pattern 1** (engine/page arithmetic) — `OpeningStockEntry.tsx` `totalValue` aggregator, `postAll` value computation, `batchQtyByGodown` aggregator. Routed through `dMul`/`dAdd` + `roundTo(_, resolver)`. The `value = qty * rate` write is now `roundTo(dMul(qty, rate), mp)`.
- **Pattern 2** (parseFloat reading input into money/qty field) — all input handlers: `MaterialIssueNote:843`, `GRNEntry:1159`, `ConsumptionEntry:905`, `StorageMatrix:233/250`, `ItemCraft:840/843`. Original `|| 0` and `|| null` fallbacks preserved verbatim; `checkTDS(r)` side-effect in `StorageMatrix:250` preserved.
- **Pattern 3** (display / non-money) — RECLASSIFY only, no code change.

---

## §5 Honest disclosures (logic changes beyond pure migration)

1. **`OpeningStockEntry.tsx` `value = qty * rate`** (lines now ~244, 278) — previously raw multiplication storing a drift-prone product. Now `value: roundTo(dMul(qty, rate), mp)`. **This is a stored-write hardening beyond pure parseFloat-wrap migration.** It is consistent with the precision contract intent — `qty` and `rate` are now precision-rounded, so storing their drift-free product is the right invariant. Disclosed for completeness.
2. **No** other guards, defaults, or behavior changes were introduced.

---

## §6 Triple Gate

| Gate | Result |
|---|---|
| TSC `--noEmit` | **0 errors** |
| ESLint | unchanged from `2282440` baseline (0 errors / 10 warnings) |
| Vitest | **156 files / 1113 tests · all green** (was 1105 — +8 new tests in `precision-arc-stage3-block4-migrations.test.ts`) |
| Build | clean |

---

## §7 Files changed

```
M  src/pages/erp/inventory/transactions/MaterialIssueNote.tsx
M  src/pages/erp/inventory/transactions/GRNEntry.tsx
M  src/pages/erp/inventory/transactions/ConsumptionEntry.tsx
M  src/pages/erp/inventory/StorageMatrix.tsx
M  src/pages/erp/inventory/OpeningStockEntry.tsx
M  src/pages/erp/inventory/ItemCraft.tsx
A  src/test/precision-arc-stage3-block4-migrations.test.ts
A  src/__tests__/__sprint-summaries__/precision-arc-stage3-block4-close-summary.md
```

---

## §8 HALT

HALT for the §2.4 audit. **Do NOT proceed to Block 5. Do NOT self-certify.**
