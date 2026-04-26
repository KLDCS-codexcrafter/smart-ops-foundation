# T-H1.5-Z-Z2b — Close Summary

**Sprint:** T-H1.5-Z-Z2b · Voucher Posting Amount Handling · Engine Layer
**Closed:** Apr 2026
**Result:** PASS · 0 tsc errors · 0 eslint warnings · build green

## Files Modified (4 engines)

| Engine | Sites migrated | Helpers used |
|---|---|---|
| `src/lib/tds-engine.ts` | 5 | dAdd · dSub · dPct · dSum |
| `src/lib/auditEngine.ts` | 11 | dAdd · dSub · dSum |
| `src/lib/freight-match-engine.ts` | 5 | dSub · dPct · dSum · dMul |
| `src/lib/irn-engine.ts` | 3 | dMul · dSub · dSum |

**Total math sites migrated: 24** (lower than estimated ~50 because ewb/card-pulse/event-bus/whatsapp had no monetary math, and all 7 print engines were display-only.)

## Print Engine Triage (per I-17)

| File | Has math? | Action |
|---|---|---|
| contra-print-engine.ts | no | Z2c defer (display-only) |
| credit-note-print-engine.ts | no | Z2c defer (display-only) |
| debit-note-print-engine.ts | no | Z2c defer (display-only) |
| invoice-print-engine.ts | no (only amountInWords paise extraction · display) | Z2c defer |
| payment-print-engine.ts | no | Z2c defer (display-only) |
| purchase-print-engine.ts | no | Z2c defer (display-only) |
| receipt-print-engine.ts | no | Z2c defer (display-only) |

All 7 print engines are display-only (consume pre-computed totals from FineCore output). Number-to-words helper in invoice-print-engine.ts is deferred to Z2c per triage rule.

## Engines with No Math (verified)

- `ewb-engine.ts` — only Math.max/ceil for distance/days (no monetary)
- `card-pulse-engine.ts` — derivations only (no math)
- `event-bus.ts` — pub/sub only
- `distributor-whatsapp-notify.ts` — message text only

## Hard Invariants

| # | Invariant | Result |
|---|---|---|
| I-1 | tsc 0 errors | PASS |
| I-2 | eslint --max-warnings 0 | PASS |
| I-3 | npm run build | PASS (27.57s) |
| I-9 | All migrated engines import from `@/lib/decimal-helpers` (0 inline duplicates) | PASS |
| I-10 | tds-engine uses dPct for rate · final boundary uses Math.round(dPct(...)) preserving paise-integer | PASS |
| I-13 | Block 1 D-140 strict-serial validation executed on tds-engine | PASS · `Block_1_validation_result.md` |
| I-14 | NO voucher-form .tsx files touched | PASS (only src/lib/*.ts) |
| I-15 | No new npm dependencies | PASS |
| I-17 | Print engines correctly triaged (all deferred to Z2c) | PASS |

## TDS Correctness Spot Check

`computeTDS(grossAmount=100000, rate=10)` = `Math.round(dPct(100000, 10))` = `Math.round(10000)` = `10000` exactly (no floating-point drift).

## Post-Sprint Hand-Off to Z2c

Z2c scope unchanged: ~117 report/display sites including:
- All 7 print engines (number-to-words helpers · display formatting)
- Reports under `src/pages/erp/finecore/reports/` and `src/features/`
- Use `round2` from shared util for display rounding
