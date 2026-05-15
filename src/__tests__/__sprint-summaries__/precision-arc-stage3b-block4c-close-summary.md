# Precision Arc · Stage 3B · Block 4c · Close Summary

**Sprint:** T-Phase-1.Precision-Arc · Stage 3B · Block 4c — The Long Tail
**Predecessor HEAD:** Block 4b banked
**Author:** Lovable on behalf of Operix Founder · May 15, 2026
**Status:** Migrations applied, Triple Gate green. **HALT for §2.4 audit.** Not self-certified.

---

## ⭐ MILESTONE — Stage 3B COMPLETE · Precision & Calculation Integrity Arc COMPLETE

When this block banks, the entire Precision & Calculation Integrity Arc is complete.

### Full arc tally (458 Stage-2 Class-D sites)

| Stage / Block | Sites | Action |
| --- | ---: | --- |
| Stage 3 (Blocks 1–7, prior) | 211 | migrated onto contract |
| Stage 3B · Block 1 — Reclassify-Pass | 48 | reclassified B/C (no code change) |
| Stage 3B · Block 2 — C6 TDS Cluster | 3 | migrated (Payment.tsx + Receipt.tsx ×2) |
| Stage 3B · Block 3 — C5 Engine Cluster | 69 | 57 migrated · 12 reclassified |
| Stage 3B · Block 4a — Financial-Core Forms | 51 | 29 migrated · 15 reclassified · 7 already-resolved |
| Stage 3B · Block 4b — Trade/Stock Forms | 38 | 27 migrated · 11 reclassified |
| Stage 3B · Block 4c — Long Tail (this block) | 43 | 18 migrated · 24 reclassified · 1 already-migrated |
| **Total** | **458** | All 247 originally-parked dispositioned. RC-5 FR fully audit-satisfiable. |

---

## Block 4c at a glance

- 43 candidate sites, 17 areas, most heterogeneous block of Stage 3B.
- **18 MIGRATED** · **24 RECLASSIFY-B/C** · **1 ALREADY-MIGRATED** (VendorPaymentEntry.tsx:411 banked previously).
- 11 files touched. `decimal-helpers.ts` consume-only (0-diff). Voucher-posting paths 0-diff. Protected zones 0-diff.
- Test file added: `src/test/precision-arc-stage3b-block4c-tail.test.ts` — 12 tests, green.

## SUPPLEMENT 7 — Line-number reconciliation

| Audit line | Verified at | Notes |
| --- | --- | --- |
| VendorPaymentEntry.tsx:413 | now :414 | +1 (TDS comment line) |
| RFQPublicForm.tsx:148/149/150 | now :151/152/153 | +3 (decimal-helpers import + comment) |
| All other Appendix A lines | unchanged at predecessor HEAD | confirmed |
| Mobile/SyncMonitor/Telecaller already-Block-1 lines | not re-touched | RECLASSIFY-C re-confirmed in Block 4c table |

## Migration patterns applied

### Pattern 1 — page arithmetic computing stored money
Sites: `RFQPublicForm.tsx:79, :151, :152, :153` (RFQ tax/total math).
Idiom: replaced `Math.round(_ * 100) / 100` with `roundTo(_, resolveMoneyPrecision(null, null))`. Inner arithmetic upgraded to `dMul`/`dSub` to remove float drift before the precision boundary.

### Pattern 2 — `parseFloat` form input → resolver-backed money
Sites: `panels.tsx:193 (rate)`, `:194 (tax%)`, `LogisticDisputes.tsx:86 (resolution_amount)`.
Idiom: kept `parseFloat` + finite-guard, wrapped the result with `roundTo(_, resolveMoneyPrecision(null, null))`. `panels.tsx` preserves the existing `Number.isFinite` short-circuit so an invalid line still skips.

### C4 — integer-domain (paise / redeem cap), preserved `Math.floor` / kept `Math.round` semantics for paise
- **rupees → paise integer (servicedesk cluster, 8 sites):** `Math.round(Number(form.x) * 100)` → `roundTo(dMul(Number(form.x), 100), 0)`. Result is an integer paise value by contract; the test floor asserts integerness.
- **CustomerCart redeem cap (`:133`):** `Math.floor(_)` preserved (integer-paise domain). Inner arithmetic moved to `Math.floor(dMul(dSub(subtotal, schemeDiscount), MAX_REDEEM_PCT))`.
- **VendorPaymentEntry TDS (`:413/now:414`):** integer-rupee per India Sec 194 — `roundTo(dPct(amount, r), 0)`.

### RECLASSIFY-B/C
24 sites — display-only strings (toasts, % labels), dashboard chart datapoints, KPI averages, day-counts, pagination `Math.ceil`, ratio metrics. None feed a stored money field. No code change. Reasons recorded in the audit-table appendix.

### Resolver choices · why
- Money page values: `resolveMoneyPrecision(null, null)` (entity override null · base-currency null → contract default 2dp).
- Integer-paise / TDS-rupee outputs: `roundTo(_, 0)` (statutory / domain-fixed).
- No `resolveQtyPrecision` use in this block — no quantity-stored fields among the 43.

## Files touched (11)

1. `src/pages/erp/bill-passing/panels.tsx` — Pattern 2 (rate, tax%) + import
2. `src/pages/erp/customer-hub/transactions/CustomerCart.tsx` — C4 floor preserved + import
3. `src/pages/erp/payout/VendorPaymentEntry.tsx` — TDS integer-rupee (added `dPct` to existing import)
4. `src/pages/erp/servicedesk/marketplace/EngineerMarketplace.tsx` — paise + import
5. `src/pages/erp/servicedesk/refurbished/RefurbishedUnitLifecycle.tsx` — paise ×2 + import
6. `src/pages/erp/servicedesk/repair-routing/RepairRouteList.tsx` — paise + import
7. `src/pages/erp/servicedesk/service-tickets/CustomerOutDialog.tsx` — paise + import
8. `src/pages/erp/servicedesk/service-tickets/ServiceTicketDetail.tsx` — paise ×3 + import
9. `src/pages/erp/servicedesk/standby-loans/StandbyLoanList.tsx` — paise + import
10. `src/pages/vendor-portal/RFQPublicForm.tsx` — Pattern 1 ×4 + import
11. `src/pages/erp/logistic/LogisticDisputes.tsx` — Pattern 2 + import

## STOP-and-raise

None. No adjacent non-scope site disturbed. No voucher-posting path touched. The servicedesk standby-loans / service-tickets sites are confirmed form/compute handlers (call site is local state-set or engine-bridge call, not a posting voucher).

## 0-diff confirmations

- `src/lib/decimal-helpers.ts` — 0-diff (consume-only).
- Protected zones — 0-diff.
- Voucher-posting paths — 0-diff.
- `audit_workspace/` Z-evidence — 0-diff (per Operix Execution Discipline §1).
- Files outside Appendix A — 0-diff (only import additions inside the 11 listed targets).

## Triple Gate

| Gate | Baseline (Block 4b) | Final (Block 4c) |
| --- | --- | --- |
| TSC errors | 0 | **0** |
| ESLint errors / warnings | 0 / 10 | **0 / 10** |
| Vitest | green | **green (+12 new tests)** |
| Build | clean | **clean** |

## Audit-table reconciliation

Appendix appended to `src/__tests__/__sprint-summaries__/precision-arc-stage2-audit-table.md` ("Stage 3B Block 4c Appendix — The Long Tail"). All 43 rows present with verdict, pattern, and reason. Predecessor rows preserved (no deletions); line-number drift annotated where applicable.

## Honest disclosures

- `panels.tsx` line 192 (`qty`) was not in Appendix A and was not migrated; only :193 and :194 (Appendix scope) were touched. The pre-existing `Number.isFinite(qty)` guard is preserved.
- `RFQPublicForm.tsx:79` rewrote `lineAfterTax` to use decimal-safe inner arithmetic. Behaviour preserved at 2dp; tests assert equivalence.
- `VendorPaymentEntry.tsx` already had `roundTo`/`resolveMoneyPrecision` imported (banked earlier). Only `dPct` was added to that line.
- `CustomerCart.tsx:136` (`Math.ceil(loyaltyDiscount * 10 / 100)`) was NOT in Appendix A and was not touched; it remains as-is.

## HALT for §2.4 audit

Block 4c migrations applied. Stage 3B and the Precision Arc are functionally complete; awaiting §2.4 sign-off. Not self-certified.
