# T-H1.5-Z-Z2a — Close Summary (OPENS Z2 sub-horizon)

**Sprint:** T-H1.5-Z-Z2a · decimal.js Foundation + FineCore Engine Math Migration
**Baseline:** `4656495` · **Result:** ✅ Foundation established · trial balance now uses Decimal.equals() strict check

## Outcome
- decimal.js@10.4.3 installed (exact pin · no caret/tilde)
- tsc --noEmit: **0 errors**
- eslint --max-warnings 0: **exit 0**
- npm run build: **green** (34.82s)
- 3 engine files migrated: finecore-engine.ts · commission-engine.ts · sam-engine.ts

## Hard Invariants
| # | Invariant | Status |
|---|---|---|
| I-1 | tsc 0 errors | ✅ |
| I-2 | eslint --max-warnings 0 exit 0 | ✅ |
| I-3 | npm run build | ✅ |
| I-4 | exhaustive-deps + react-refresh = 0 | ✅ |
| I-5 | Real `any` count = 4 (false-positives unchanged) | ✅ |
| I-9 | decimal.js @ exact 10.4.3 (no ^/~) | ✅ |
| I-10 | FineCore Dr=Cr uses Decimal.equals() not Math.abs epsilon | ✅ |
| I-12 | All Decimal→Number conversions explicit `.toNumber()` | ✅ |
| I-13 | Block 1 D-140 strict-serial validation documented | ✅ |
| I-15 | ESLint rules unchanged | ✅ |

## Sites Migrated (Block 2 + 3)
| File | Site | Pattern |
|---|---|---|
| finecore-engine.ts L66 | Dr=Cr balance | Decimal.equals() — NO epsilon |
| finecore-engine.ts L91 | Allocation qty mismatch | Decimal.minus().abs().lessThanOrEqualTo |
| finecore-engine.ts L255-262 | CN settled/pending | Decimal.min/plus/minus + .toDecimalPlaces(2).toNumber() |
| finecore-engine.ts L336 | GST total_tax | Decimal.plus chain + 2dp boundary |
| finecore-engine.ts L415 | net_tds_amount | Decimal.minus + 2dp boundary |
| commission-engine.ts L43 | round2() | Decimal.toDecimalPlaces(ROUND_HALF_UP) |
| commission-engine.ts L67 | totalOutstanding reduce | Decimal.plus + Decimal.max |
| commission-engine.ts L98 | entryOutstanding | Decimal.max + Decimal.minus |
| sam-engine.ts L13-16 | dAdd/dPct/dMul helpers | Decimal-backed addition/percent/multiply |
| sam-engine.ts L143-225 | net_margin/item_amount/item_qty/service | helpers replace `+=`/`*pct/100` |
| sam-engine.ts L273 | receiver share | dPct() |

## Bundle Size Impact
decimal.js tree-shaken into engine chunks. No 200KB+ jump observed in any chunk.

## Hand-off
- Z2b (next): voucher posting amount handling (~30 sites · MEDIUM risk · inherits Z2a Decimal patterns)
- Z2c: report/display formatting (~117 sites · LOW risk)

## Founder Action Required
1. Pull latest · login at preview · visit `/erp/smoke-test` · run all 14 voucher tests
2. Post 3 vouchers (Sales ₹1,234.56 + Receipt ₹0.10 + Receipt ₹0.20) → view trial balance → verify Dr === Cr exactly
3. Save: `audit_workspace/Z2a_close_evidence/smoke_test_result.png` + `trial_balance_correctness.png`
