# T-H1.5-Z-Z2c-a Close Summary

## Result
All 18 math sites in 7 non-engine files migrated to `decimal-helpers` (or inline Decimal where 1dp/3dp precision required).

## Verification
- tsc: 0 errors
- eslint --max-warnings 0: exit 0
- npm run build: success (31.06s)
- comply360SAMKey: 32 (unchanged)
- eslint-disable: 91 (unchanged)
- Math idiom `+(...).toFixed(` in scope files: 0 across all 7
- Voucher-form .tsx files touched: 0

## Per-Site Decision Table
| # | File | L# | Pattern |
|---|---|---|---|
| 1 | CommissionRegister.tsx | 140 | `round2(dMul(...))` |
| 2 | CommissionRegister.tsx | 142 | `round2(dPct(...))` |
| 3 | CommissionRegister.tsx | 144 | `round2(dSub(...))` |
| 4-7 | CommissionRegister.tsx | 238/240/242/244 | `round2(dAdd(...))` |
| 8 | CommissionRegister.tsx | 414 | `round2(dSub(dSub(...), ...))` |
| 9 | ItemAllocationDialog.tsx | 61 | inline Decimal (3dp qty · helpers are 2dp) |
| 10 | ItemAllocationDialog.tsx | 76 | `round2(dMul(...))` |
| 11 | ItemAllocationDialog.tsx | 77 | `round2(dSub(dMul(...), disc))` |
| 12 | SalesReturnMemo.tsx | 105 | `round2(dMul(...))` |
| 13 | SalesReturnMemo.tsx | 114 | `round2(dMul(...))` |
| 14 | TargetVsAchievement.tsx | 87 | inline Decimal (division-based pct) |
| 15 | TargetVsAchievement.tsx | 107 | inline Decimal (division-based pct) |
| 16 | SecondarySales.tsx | 163 | `round2(dMul(...))` |
| 17 | TransporterScorecard.tsx | 172 | inline Decimal (1dp precision) |
| 18 | SavingsROIDashboard.tsx | 177 | inline Decimal (1dp precision) |

## D-143 Exempt Sites
None — all 18 migrated to Decimal-safe semantics. Inline Decimal used (not exempted) where helpers don't fit (3dp qty, division, 1dp).

## Files Modified
- src/pages/erp/salesx/reports/CommissionRegister.tsx
- src/components/finecore/dialogs/ItemAllocationDialog.tsx
- src/pages/erp/salesx/transactions/SalesReturnMemo.tsx
- src/pages/erp/salesx/reports/TargetVsAchievement.tsx
- src/pages/erp/salesx/transactions/SecondarySales.tsx
- src/pages/erp/dispatch/reports/TransporterScorecard.tsx
- src/pages/erp/dispatch/reports/SavingsROIDashboard.tsx

## ISO 25010 Scorecard
| Characteristic | Pre | Post |
|---|---|---|
| Functional Suitability | HIGH+(0.4) | HIGH+(0.45) |
| Reliability | HIGH+++(0.65) | HIGH+++(0.7) |
| Maintainability | HIGH+++(1.4) | HIGH+++(1.45) |

## 8-Lens Debrief
- WHO: Lovable executed strict-serial per D-141.
- WHAT: 18 math sites migrated · Block 1 D-140 pre-flight validated on CommissionRegister first.
- WHEN: Apr 2026.
- WHERE: 7 source files + audit_workspace/Z2c_a_close_evidence/.
- WHY: Eliminate floating-point drift in commission/allocation/line-amount paths.
- WHICH: shared decimal-helpers (`dAdd/dSub/dMul/dPct/round2`) where 2dp; inline Decimal where 1dp/3dp/division.
- WHOM: 7 D&C clients (commission accuracy), Phase 2 backend, 20-year horizon integrity.
- HOW: 4 blocks executed in sequence; tsc/eslint/build green after each.

## Founder Action Required
- Smoke test `/erp/smoke-test` (14 vouchers).
- Commission Register spot-check: ₹100k invoice · 10% commission · ₹50k receipt → preview must show ₹5,000 commission, ₹250 TDS @5%, ₹4,750 net (exact paisa).
