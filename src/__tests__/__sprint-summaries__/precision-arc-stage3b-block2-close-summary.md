# Sprint T-Phase-1.Precision-Arc · Stage 3B · Block 2 — C6 TDS Voucher Cluster · Close Summary

**Predecessor HEAD**: `42b3656` (Stage 3B Block 1 banked A — reclassify-pass complete)
**Scope**: 3 expressions across 2 files. Identical defect, identical fix. D-127 voucher-territory controlled exception, founder-approved as a coherent cluster with the `Payment.tsx:537` precedent (`7250cf9`).
**Author**: Claude on behalf of Operix Founder · May 14, 2026

---

## 1. The Cluster (BEFORE → AFTER)

All 3 sites carry the identical Class-D defect: `Math.round(money * tds_rate / 100)` — a percentage applied to a money base in raw float. All 3 sit in `useCallback` field-update handlers, NOT in the voucher-posting/save path.

### Site 1 — `src/pages/erp/accounting/vouchers/Payment.tsx:174`

Lower-deduction-certificate auto-compute path.

**BEFORE**
```ts
setTdsAmount(Math.round(amount * selectedVendor.lower_deduction_rate / 100));
```
**AFTER**
```ts
setTdsAmount(roundTo(dPct(amount, selectedVendor.lower_deduction_rate), 0));
```

### Site 2 — `src/pages/erp/accounting/vouchers/Receipt.tsx:132`

`updateTdsLine` — gross_amount / tds_rate field-change handler.

**BEFORE**
```ts
updated.tds_amount = Math.round(updated.gross_amount * updated.tds_rate / 100);
```
**AFTER**
```ts
updated.tds_amount = roundTo(dPct(updated.gross_amount, updated.tds_rate), 0);
```

### Site 3 — `src/pages/erp/accounting/vouchers/Receipt.tsx:140` (post-import: line 141)

`updateTdsLine` — tds_section field-change handler. Compound statement; ONLY the `updated.tds_amount` sub-expression changed. The `updated.tds_rate = sec.rateIndividual` and `updated.net_received = updated.gross_amount - updated.tds_amount` siblings on the same line are unchanged (they are not defects).

**BEFORE**
```ts
if (sec) { updated.tds_rate = sec.rateIndividual; updated.tds_amount = Math.round(updated.gross_amount * sec.rateIndividual / 100); updated.net_received = updated.gross_amount - updated.tds_amount; }
```
**AFTER**
```ts
if (sec) { updated.tds_rate = sec.rateIndividual; updated.tds_amount = roundTo(dPct(updated.gross_amount, sec.rateIndividual), 0); updated.net_received = updated.gross_amount - updated.tds_amount; }
```

## 2. The Fix Rationale (identical to Payment.tsx:537)

- `dPct(base, rate)` replaces `base * rate / 100` — decimal-safe `base × pct ÷ 100` from `decimal-helpers.ts`. **This is the actual defect being fixed.**
- `roundTo(_, 0)` replaces `Math.round(_)` — same integer-rupee result, with RBI banker's rounding (`ROUND_HALF_UP`, D-142 LOCKED).
- The `0` is **deliberate**: integer-rupee TDS rounding is a domain-fixed precision rule (v3 §4), NOT contract-resolved. `resolveMoneyPrecision` is intentionally **not** used — moving TDS to 2-dp would be a statutory behaviour change, out of scope.

## 3. Imports

| File | Status |
|---|---|
| `Payment.tsx` line 32 — `import { roundTo, dPct } from '@/lib/decimal-helpers';` | Already present from `:537` fix at `7250cf9`. **Confirmed present, NOT duplicated.** |
| `Receipt.tsx` line 43 — `import { roundTo, dPct } from '@/lib/decimal-helpers';` | **Added** (1 new import line). |

## 4. Files in Diff (exhaustive)

| File | Change |
|---|---|
| `src/pages/erp/accounting/vouchers/Payment.tsx` | 1 expression at line 174 |
| `src/pages/erp/accounting/vouchers/Receipt.tsx` | +1 import line · 2 expressions (lines 133 & 141 post-import) |
| `src/test/precision-arc-stage3b-block2-tds-cluster.test.ts` | NEW · 4 tests |
| `src/__tests__/__sprint-summaries__/precision-arc-stage3b-block2-close-summary.md` | NEW · this file |
| `src/__tests__/__sprint-summaries__/precision-arc-stage2-audit-table.md` | Appendix annotated — 3 rows reconciled as MIGRATED |

**No other file changed.** Any other file in the diff = STOP.

## 5. D-127 Voucher-Territory 0-Diff Confirmations

| Path | Status |
|---|---|
| `src/lib/decimal-helpers.ts` (CONSUME ONLY) | 0 diff ✅ |
| `src/types/voucher-type.ts` | 0 diff ✅ |
| `src/types/cc-masters.ts` | 0 diff ✅ |
| `src/components/operix-core/applications.ts` | 0 diff ✅ |
| `src/lib/cc-compliance-settings.ts` | 0 diff ✅ |
| Voucher-posting / save path in `Payment.tsx` (`postVoucher`, voucher-construction block, validations) | 0 diff ✅ — line 174 is in a `useCallback` field handler |
| Voucher-posting / save path in `Receipt.tsx` (`postVoucher` ~line 218 onward) | 0 diff ✅ — lines 133/141 are inside `updateTdsLine` `useCallback` |
| Adjacent `setTdsRate(...)` / `updated.tds_rate = ...` assignments | 0 diff ✅ — rate-set is correct, only amount-compute was the defect |
| Adjacent `updated.net_received = gross - tds_amount` lines | 0 diff ✅ — plain integer-rupee subtraction, not a defect |

## 6. Test Coverage

`src/test/precision-arc-stage3b-block2-tds-cluster.test.ts` — 4 tests, all passing:

1. **Integer-result assertion** — confirms 0-dp output preserved (statutory TDS rupee rounding).
2. **Decimal-safety on drift-prone inputs** — `base=10000, rate=0.1 → 10` exactly; verifies `dPct` keeps the calculation in Decimal end-to-end.
3. **Behaviour-preservation regression guard** — for normal TDS inputs (`100000×10%`, `50000×2%`, `250000×1%`, `99999×7.5%`, `123456×5%`, zero edges), `roundTo(dPct(base, rate), 0) === Math.round(base*rate/100)`. Behaviour-preserving by construction for non-pathological inputs; only drifty edges differ — and there the new path is **mathematically correct**.
4. **RBI banker (`ROUND_HALF_UP`) at the 0-dp .5 boundary** — `0.5 → 1`, `1.5 → 2`.

## 7. Triple Gate

| Gate | Baseline (`42b3656`) | Post-block | Status |
|---|---|---|---|
| TSC | 0 | 0 | ✅ |
| ESLint | 0 errors / 10 warnings | 0 errors / 10 warnings | ✅ parity |
| Vitest | green | green (+4 new tests) | ✅ |
| Build | clean | clean | ✅ |

Diff vs `42b3656`: +1 test file, +1 close summary, +1 audit-table appendix, 1 import line in `Receipt.tsx`, 3 expression substitutions across `Payment.tsx` + `Receipt.tsx`.

## 8. Audit-Table Reconciliation

Appended to `src/__tests__/__sprint-summaries__/precision-arc-stage2-audit-table.md`:

- `Payment.tsx:174` annotated as **MIGRATED (Stage 3B Block 2, C6)**, with note that this is the parked `:173` from Stage 2 shifted to `:174` by the `:537` surgical fix at `7250cf9` (which added one import line).
- `Receipt.tsx:132` annotated as **MIGRATED (Stage 3B Block 2, C6)** — `updateTdsLine` gross/rate handler.
- `Receipt.tsx:140` annotated as **MIGRATED (Stage 3B Block 2, C6)** — `updateTdsLine` section-change handler; compound-statement scoped fix.

No rows deleted. Historical disposition preserved.

## 9. Logic-Change Disclosure

**No logic change beyond pure decimal-safety migration.** The arithmetic identity holds for every non-drift input by construction (`dPct(a, b) = a*b/100` exactly when no float drift exists; `roundTo(_, 0)` matches `Math.round` for `ROUND_HALF_UP`-equivalent positive inputs). On drift-prone inputs the new path produces the **mathematically correct** value.

---

**HALT for §2.4 audit. Block 3 NOT started. No self-certification.**
