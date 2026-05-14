# Sprint T-Phase-1.Precision-Arc · Payment.tsx:537 — Surgical Fix · Close Summary

**Predecessor HEAD**: `d72a115` (Stage 3 complete)
**Scope**: One line. One expression. D-127 voucher-territory controlled exception, founder-approved.
**Author**: Claude on behalf of Operix Founder · May 14, 2026

---

## 1. The Defect (BEFORE)

`src/pages/erp/accounting/vouchers/Payment.tsx:537`, inside the **Rate %** input's `onChange`:

```ts
setTdsAmount(Math.round(amount * r / 100));
```

`amount * r / 100` is a percentage applied to a money base in **raw float** — drift-prone, the Class-D bypass-defect pattern the Precision Arc exists to eliminate.

## 2. The Fix (AFTER)

```ts
setTdsAmount(roundTo(dPct(amount, r), 0));
```

- `dPct(amount, r)` replaces `amount * r / 100` — decimal-safe `base * pct / 100` from `decimal-helpers.ts`. **This is the actual defect fix.**
- `roundTo(_, 0)` replaces `Math.round(_)` — same integer (rupee) precision, with RBI banker's rounding (`ROUND_HALF_UP`, D-142 LOCKED).
- The `0` is **deliberate**: integer-rupee TDS rounding is a domain-fixed precision rule (v3 §4), NOT contract-resolved. `resolveMoneyPrecision` is intentionally **not** used here — moving TDS to 2-dp would be a statutory behaviour change, out of scope.

Import added (line 32):
```ts
import { roundTo, dPct } from '@/lib/decimal-helpers';
```

## 3. Files in Diff (exhaustive)

| File | Change |
|---|---|
| `src/pages/erp/accounting/vouchers/Payment.tsx` | +1 import line · 1 expression at line 537 |
| `src/test/precision-arc-payment-tds-fix.test.ts` | NEW · 4 tests |
| `src/__tests__/__sprint-summaries__/precision-arc-payment-tds-fix-close-summary.md` | NEW · this file |

**No other file changed.** Any other file in the diff = STOP.

## 4. D-127 Voucher-Territory 0-Diff Confirmations

| Path | Status |
|---|---|
| `src/lib/decimal-helpers.ts` (CONSUME ONLY) | 0 diff ✅ |
| `src/types/voucher-type.ts` | 0 diff ✅ |
| `src/types/cc-masters.ts` | 0 diff ✅ |
| `src/components/operix-core/applications.ts` | 0 diff ✅ |
| `src/lib/cc-compliance-settings.ts` | 0 diff ✅ |
| Voucher-posting / save path in `Payment.tsx` (`postVoucher`, voucher-construction block, validations) | 0 diff ✅ — line 537 is in a UI `onChange` handler |
| Surrounding lines (`535: const r = parseFloat(e.target.value) || 0` · `536: setTdsRate(r)`) | 0 diff ✅ — `r` is a percentage (RECLASSIFY-C from Block 5), not money |

## 5. Test Coverage

`src/test/precision-arc-payment-tds-fix.test.ts` — 4 tests, all passing:

1. **Integer-result assertion** — confirms 0-dp output preserved (statutory TDS rupee rounding).
2. **Decimal-safety on drift-prone inputs** — `amount=10000, r=0.1 → 10` exactly; verifies `dPct` keeps the calculation in Decimal end-to-end.
3. **Behaviour-preservation regression guard** — for normal TDS inputs (`100000×10%`, `50000×2%`, `123456×5%`, `99999×7.5%`, `250000×1%`, zero edge cases), `roundTo(dPct(amount, r), 0) === Math.round(amount*r/100)`. The fix is behaviour-preserving by construction for non-pathological inputs; only drifty edges differ — and there the new path is **correct**.
4. **RBI banker (`ROUND_HALF_UP`) at the 0-dp .5 boundary** — `0.5 → 1`, `1.5 → 2`.

## 6. Triple Gate

| Gate | Baseline (`d72a115`) | Post-fix | Status |
|---|---|---|---|
| TSC | 0 | 0 | ✅ |
| ESLint | 0 errors / 10 warnings | 0 errors / 10 warnings | ✅ parity |
| Vitest | green | green (+4 new tests) | ✅ |
| Build | clean | clean | ✅ |

## 7. STOP-AND-RAISE — adjacent identical defect at Payment.tsx:173

`Payment.tsx:173` (lower-deduction-certificate branch) carries the **identical** Class-D defect:

```ts
setTdsAmount(Math.round(amount * selectedVendor.lower_deduction_rate / 100));
```

- Same `Math.round(money * pct / 100)` raw-float pattern.
- Same surgical fix would apply: `setTdsAmount(roundTo(dPct(amount, selectedVendor.lower_deduction_rate), 0));`
- **Out of approved scope** for this sprint — the founder approval was for line 537 only.
- Recommend a follow-up surgical sprint of identical shape (one-line fix · same import already in place after this sprint · same 4 tests adapted for the lower-deduction path).

**Founder ruling required to proceed on `:173`.**

## 8. Logic-Change Disclosure

**No logic change beyond pure decimal-safety migration.** The arithmetic identity holds for every non-drift input by construction (`dPct(a, b) = a*b/100` exactly when no float drift exists; `roundTo(_, 0) = Math.round(_)` for `ROUND_HALF_UP`-equivalent inputs, and the `Math.round` JS spec already rounds half-away-from-zero for positive values, matching `ROUND_HALF_UP` semantics in this domain). On drift-prone inputs the new path produces the **mathematically correct** value.

---

**HALT for §2.4 audit. No self-certification.**
