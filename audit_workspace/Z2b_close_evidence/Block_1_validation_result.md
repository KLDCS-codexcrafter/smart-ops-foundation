# Block 1 — D-140 Pre-Flight Validation (tds-engine.ts)

## Pattern tested
Migrate all math in tds-engine.ts to use shared `decimal-helpers` utility
(dAdd, dSub, dPct, dSum). Validates: (a) shared helpers compose cleanly,
(b) tds-engine produces identical results to pre-migration, (c) no
floating-point drift in TDS calculation chain.

## Site validated
tds-engine.ts (full file · 4 sites · highest-stakes engine in Z2b)
- L35-38: aggregate YTD reducer → `dSum`
- L69: `Math.round(grossAmount * rate / 100)` → `Math.round(dPct(grossAmount, rate))` (preserves integer-paise rounding semantics at boundary)
- L73: `grossAmount - tdsAmount` → `dSub(...)` for netAmount
- L75: `ytd + grossAmount` → `dAdd(...)`
- L86: aggregateYTD + currentPayment threshold check → `dAdd(...)`

## Verification
- tsc --noEmit: 0 errors
- tds-engine imports decimal-helpers: yes
- No inline Decimal helpers in tds-engine: verified
- TDS spot test ₹100,000 × 10% = ₹10,000 exactly: PASS (dPct(100000,10)=10000; Math.round preserves integer)

## Verdict
- [x] PATTERN VALIDATED · proceed to Block 2 (other engines)
- [ ] PATTERN FAILED · STOP · surface to founder
