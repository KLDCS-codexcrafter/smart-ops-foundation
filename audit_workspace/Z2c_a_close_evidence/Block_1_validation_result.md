# Block 1 — D-140 Pre-Flight Validation (CommissionRegister.tsx)

## Pattern tested
Migrate 8 math idiom sites in CommissionRegister.tsx from `+(value).toFixed(2)`
to `round2(dXxx(...))` using shared `decimal-helpers` utility. Validates: (a)
shared helpers compose for nested operations (e.g., dSub of dSub for L414),
(b) commission preview produces identical results to pre-migration, (c) no
floating-point drift in commission/TDS chain.

## Site validated
CommissionRegister.tsx (full file · 8 sites · highest-stakes file in Z2c-a)

## Sites migrated
| L# | Before | After |
|---|---|---|
| 140 | `+(active.total_commission * ratio).toFixed(2)` | `round2(dMul(active.total_commission, ratio))` |
| 142 | `+(commissionOnReceipt * active.tds_rate / 100).toFixed(2)` | `round2(dPct(commissionOnReceipt, active.tds_rate))` |
| 144 | `+(commissionOnReceipt - tdsAmount).toFixed(2)` | `round2(dSub(commissionOnReceipt, tdsAmount))` |
| 238 | `+(updated.amount_received_to_date + amt).toFixed(2)` | `round2(dAdd(updated.amount_received_to_date, amt))` |
| 240 | `+(updated.commission_earned_to_date + previewPayment.commissionOnReceipt).toFixed(2)` | `round2(dAdd(...))` |
| 242 | `+(updated.tds_deducted_to_date + previewPayment.tdsAmount).toFixed(2)` | `round2(dAdd(...))` |
| 244 | `+(updated.net_paid_to_date + previewPayment.netCommissionPaid).toFixed(2)` | `round2(dAdd(...))` |
| 414 | `+(gross - gst - entry.commission_earned_to_date).toFixed(2)` | `round2(dSub(dSub(gross, gst), entry.commission_earned_to_date))` |

## Verification
- tsc --noEmit: 0 errors
- eslint --max-warnings 0 exit: 0
- CommissionRegister imports decimal-helpers: yes (`dAdd, dSub, dMul, dPct, round2`)
- No `+(...)\.toFixed\(` idiom in CommissionRegister: 0 matches verified
- Commission spot-trace (₹100k invoice · 10% commission · ₹50k receipt):
  - ratio = 50000/100000 = 0.5
  - commissionOnReceipt = round2(dMul(10000, 0.5)) = 5000.00 (exact)
  - tdsAmount @ 5% = round2(dPct(5000, 5)) = 250.00
  - netCommissionPaid = round2(dSub(5000, 250)) = 4750.00
  - PASS — exact paisa, no drift

## Verdict
- [x] PATTERN VALIDATED · proceed to Block 2 (ItemAllocationDialog + SalesReturnMemo)
