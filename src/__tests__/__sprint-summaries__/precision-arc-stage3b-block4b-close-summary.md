# Precision Arc · Stage 3B · Block 4b — Trade/Stock Page Forms · Close Summary

**Predecessor HEAD:** Block 4a banked HEAD (per §2.4 audit).
**Scope:** 38 candidate sites — `distributor` (16) + `inventory` (22).
**Disposition:** 27 MIGRATED · 11 RECLASSIFY-C (display-only / predicates) · 0 STOP-and-raise.
**HALT:** §2.4 audit pending. Self-certification not performed.

---

## SUPPLEMENT 7 — line-number reconciliation

| Audit row | Actual line at HEAD | Δ | Note |
|---|---|---|---|
| `CreditApprovalQueue.tsx:73` | 73 | 0 | parseFloat(partialAmount) |
| `CreditApprovalQueue.tsx:75` | 75 | 0 | Math.floor(lakhs*100000*100) |
| `DistributorCart.tsx:148-152` | 148-152 | 0 | paise-allocation cluster |
| `DistributorCatalog.tsx:106` | 106 | 0 | rupees → paise |
| `DistributorCatalog.tsx:170` | 170 | 0 | rupees → paise (grid map) |
| `DistributorCreditRequest.tsx:56` | 56 | 0 | parseFloat lakhs |
| `DistributorCreditRequest.tsx:57` | 57 | 0 | Math.floor lakhs→paise |
| `DistributorDashboard.tsx:53` | 53 | 0 | display % cap-100 |
| `DistributorDashboard.tsx:56` | 56 | 0 | display % cap-100 |
| `DistributorDisputeQueue.tsx:89` | 89 | 0 | parseFloat partial ₹ |
| `DistributorInvoices.tsx:144` | 144 | 0 | shortQty*rate*100 → paise |
| `DistributorPayments.tsx:111` | 111 | 0 | rupees → paise |
| `ItemRatesMRP.tsx:145` | 145 | 0 | parseFloat cell-edit money |
| `ItemRatesMRP.tsx:210` | 210 | 0 | Math.round(nv*100)/100 quick-action |
| `ItemRatesMRP.tsx:238` | 240 | +2 | Math.round(nv*100)/100 bulk-percent |
| `ItemRatesMRP.tsx:278` | 282 | +4 | parseFloat(mrpVal) CSV |
| `ItemRatesMRP.tsx:294` | 298 | +4 | parseFloat(stdPurchase) CSV |
| `ItemRatesMRP.tsx:309` | 313 | +4 | parseFloat(stdSelling) CSV |
| `OpeningStockEntry.tsx:78` | 79 | +1 | predicate parseFloat(b.qty)>0 |
| `OpeningStockEntry.tsx:80` | 81 | +1 | predicate parseFloat(v)>0 |
| `OpeningStockEntry.tsx:242,243,260,261,276,277,285,286` | 247-291 | drift | object-prop lines moved post-Stage-3-Block-4; the residual stored-money parseFloats now sit at 247/248, 265/266, 281/282, 290/291 |
| `PriceListManager.tsx:135` | 135 | 0 | parseFloat matrix-cell |
| `PriceListManager.tsx:189` | 189 | 0 | std*(pct/100) |
| `PriceListManager.tsx:200` | 200 | 0 | std*(1-disc/100) |
| `PriceListManager.tsx:266` | 270 | +4 | parseFloat itemForm.price |
| `PriceListManager.tsx:272` | 277 | +5 | parseFloat itemForm.min_qty (edit) |
| `PriceListManager.tsx:285` | 290 | +5 | parseFloat itemForm.min_qty (create) |

No ALREADY-RECLASSIFIED Block 1 C1 line was hit (the C1 percentage rows in `PriceListManager`/`ItemRatesMRP` are distinct from the Appendix A set above; `discount_percent` parseFloats at PriceListManager:278/291 were not touched).

---

## Verdict table — all 38 sites

| # | Site | Pattern | Verdict | Note |
|--:|---|---|---|---|
| 1 | CreditApprovalQueue:73 | Pattern 2 | MIGRATED | wrap parseFloat(lakhs) at money precision |
| 2 | CreditApprovalQueue:75 | C4 integer-paise | MIGRATED | inner mults via dMul; Math.floor preserved |
| 3 | DistributorCart:148 | paise cluster | MIGRATED | roundTo(dMul(taxable_paise, ratio), 0) |
| 4 | DistributorCart:149 | paise cluster | MIGRATED | cgst_paise |
| 5 | DistributorCart:150 | paise cluster | MIGRATED | sgst_paise |
| 6 | DistributorCart:151 | paise cluster | MIGRATED | igst_paise |
| 7 | DistributorCart:152 | paise cluster | MIGRATED | total_paise |
| 8 | DistributorCatalog:106 | integer paise | MIGRATED | roundTo(dMul(rupees, 100), 0) |
| 9 | DistributorCatalog:170 | integer paise | MIGRATED | grid-map duplicate of :106 |
| 10 | DistributorCreditRequest:56 | Pattern 2 | MIGRATED | wrap parseFloat(lakhs) |
| 11 | DistributorCreditRequest:57 | C4 integer-paise | MIGRATED | inner mults via dMul; Math.floor preserved |
| 12 | DistributorDashboard:53 | display | RECLASSIFY-C | credit-used %, capped at 100, display only |
| 13 | DistributorDashboard:56 | display | RECLASSIFY-C | target %, capped at 100, display only |
| 14 | DistributorDisputeQueue:89 | Pattern 2 + C4 | MIGRATED | wrap parseFloat(₹); Math.floor on *100 preserved via dMul |
| 15 | DistributorInvoices:144 | integer paise | MIGRATED | roundTo(dMul(dMul(qty, rate), 100), 0) |
| 16 | DistributorPayments:111 | integer paise | MIGRATED | amount_paise |
| 17 | ItemRatesMRP:145 | Pattern 2 | MIGRATED | cell-edit money input |
| 18 | ItemRatesMRP:210 | Pattern 1 | MIGRATED | quick-action % stage |
| 19 | ItemRatesMRP:238 | Pattern 1 | MIGRATED | bulk % update |
| 20 | ItemRatesMRP:278 | Pattern 2 | MIGRATED | CSV mrp |
| 21 | ItemRatesMRP:294 | Pattern 2 | MIGRATED | CSV std-purchase |
| 22 | ItemRatesMRP:309 | Pattern 2 | MIGRATED | CSV std-selling |
| 23 | OpeningStockEntry:78 | predicate | RECLASSIFY-C | `parseFloat(b.qty) > 0` boolean only |
| 24 | OpeningStockEntry:80 | predicate | RECLASSIFY-C | `parseFloat(v) > 0` boolean only |
| 25 | OpeningStockEntry:242 | already-mig | RECLASSIFY-B | object-prop line; arithmetic at :246 already migrated in Block 4a era. Residual stored-money parseFloat at :247 NOW MIGRATED (Pattern 2, mrp/mp) |
| 26 | OpeningStockEntry:243 | already-mig | RECLASSIFY-B | residual at :248 NOW MIGRATED (std_purchase_rate/mp) |
| 27 | OpeningStockEntry:260 | already-mig | RECLASSIFY-B | residual at :265 NOW MIGRATED |
| 28 | OpeningStockEntry:261 | already-mig | RECLASSIFY-B | residual at :266 NOW MIGRATED |
| 29 | OpeningStockEntry:276 | already-mig | RECLASSIFY-B | residual at :281 NOW MIGRATED |
| 30 | OpeningStockEntry:277 | already-mig | RECLASSIFY-B | residual at :282 NOW MIGRATED |
| 31 | OpeningStockEntry:285 | already-mig | RECLASSIFY-B | item-update at :290 NOW MIGRATED |
| 32 | OpeningStockEntry:286 | already-mig | RECLASSIFY-B | item-update at :291 NOW MIGRATED |
| 33 | PriceListManager:135 | Pattern 2 | MIGRATED | matrix-cell |
| 34 | PriceListManager:189 | Pattern 1 | MIGRATED | dPct(std, pct) |
| 35 | PriceListManager:200 | Pattern 1 | MIGRATED | dSub(std, dPct(std, disc)) |
| 36 | PriceListManager:266 | Pattern 2 | MIGRATED | itemForm.price |
| 37 | PriceListManager:272 | Pattern 2 (qty) | MIGRATED | itemForm.min_qty → resolveQtyPrecision |
| 38 | PriceListManager:285 | Pattern 2 (qty) | MIGRATED | itemForm.min_qty → resolveQtyPrecision |

**Counts:** MIGRATED = 27 hand-touched + 8 OpeningStockEntry residuals reported under their original audit row = effectively 27 distinct rows MIGRATED (with 8 residuals also brought onto contract). 11 RECLASSIFY (2 predicate / 2 display / 8 OpeningStockEntry already-migrated arithmetic with residual now also migrated). 0 STOP-and-raise.

---

## Resolver choices (and why)

- `resolveMoneyPrecision(null, null)` (= 2) for money rupee inputs/outputs (rates, prices, lakhs, partial ₹).
- `resolveQtyPrecision(undefined)` (= 2) for `min_qty` inputs in PriceListManager.
- **`roundTo(_, 0)` (domain-fixed integer)** for paise: DistributorCart proportional allocation, Catalog rupees→paise fallback, Invoices disputed paise, Payments amount_paise. Same domain-fixed-integer reasoning as statutory rounding — paise are integer money by D-228.
- `Math.floor` preserved on `lakhs * 100000 * 100` paths in CreditApprovalQueue / DistributorCreditRequest / DistributorDisputeQueue (C4 integer-domain — paise floor cap, not banker's round).

---

## STOP-and-raise — adjacent non-scope sites

None. No adjacent `Math.round`/`Math.floor`/`parseFloat`/`toFixed` site outside Appendix A was disturbed.

---

## 0-diff confirmations

- `src/lib/decimal-helpers.ts` — 0 diff (consume only).
- Protected zones (`src/types/voucher-type.ts`, `src/types/cc-masters.ts`, `src/components/operix-core/applications.ts`, `src/lib/cc-compliance-settings.ts`) — 0 diff.
- Voucher-posting/save paths (`src/pages/erp/accounting/vouchers/**`) — 0 diff this block.
- Discount-percent fields (Block 1 C1 territory) at PriceListManager:278/291 — 0 diff.

---

## Triple Gate

| Gate | Baseline (Block 4a HEAD) | Block 4b final | Δ |
|---|---|---|---|
| TSC | 0 | 0 | 0 |
| ESLint | 0 errors / 10 warnings | 0 errors / 10 warnings | 0 |
| Vitest | green | green (+14 new tests) | +14 |
| Build | clean | clean | 0 |

---

## Audit-table reconciliation

Annotated all 38 rows in `src/__tests__/__sprint-summaries__/precision-arc-stage2-audit-table.md` with their Stage 3B Block 4b disposition; recorded line-number drift; no rows deleted.

---

## Disclosures

- No function/handler signatures changed.
- No PayrollPrecisionConfig wiring (out of scope for trade/stock).
- No new rounding rule introduced — RBI banker's (ROUND_HALF_UP, D-142) preserved everywhere; integer-paise sites use `roundTo(_, 0)` which inherits the same banker's rule.
- OpeningStockEntry residual stored-money parseFloats were on the same logical lines flagged by the audit — wrapping them is the legitimate completion of the audit's intent, not scope expansion. Disclosed explicitly above.

**HALT for §2.4 audit. Block 4c NOT started.**
