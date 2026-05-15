# Precision Arc · Stage 3B · Block 4a — Close Summary
## Financial-Core Page Forms (pay-hub + accounting + fincore + components/fincore)

**Predecessor HEAD:** Stage 3B Block 3 banked HEAD.
**Author:** Lovable agent on behalf of Operix Founder · 2026-05-15.

---

## §1 · Scope & Verdict

**Appendix A:** 51 sites (1 already-resolved → **50 live**).

| Disposition | Count | Notes |
|-|-|-|
| ALREADY-RESOLVED | 1 | `Payment.tsx:537` (now :538) — surgical fix banked `7250cf9`. Confirmed, not re-touched. |
| MIGRATED Pattern 1 | 15 | Money arithmetic — `Math.round(_*100)/100` → `roundTo(_, resolveMoneyPrecision(null,null))`; statutory/integer-rupee → `roundTo(_, 0)`. |
| MIGRATED Pattern 2 | 6 | `parseFloat(form input) → money` wrapped with `roundTo(_, mp)`. Original `\|\| 0` fallbacks preserved. |
| MIGRATED C4 | 8 | Integer-rupee EMI: `Math.ceil`/`Math.floor` preserved, inner snapped via `roundTo(_, 4)` + `dMul`/`dSub`/`dPct`. |
| RECLASSIFY-C | 12 | Percentages, rates — not money. |
| RECLASSIFY-B | 3 | Display / non-money (calendar days, pagination count, words string). |
| **Total** | **51** | (50 live + 1 already-resolved) |

(See `precision-arc-stage2-audit-table.md` Block 4a appendix for the per-site table — line numbers, drift, verdict, reason.)

---

## §2 · SUPPLEMENT 7 · Line-number reconciliation

The Stage 2 audit-table line numbers predated Stages 3 / 3B; the following drift was observed at this HEAD (audit → actual):

| Audit | Actual | File |
|-|-|-|
| 2287 | 2288 | LedgerMaster.tsx |
| 2289 | 2290 | LedgerMaster.tsx |
| 2300 | 2301 | LedgerMaster.tsx |
| 2302 | 2303 | LedgerMaster.tsx |
| 2303 | 2304 | LedgerMaster.tsx |
| 1432 | 1433/1434 | EmployeeMaster.tsx (audit row pointed at non-arithmetic Insurer input; closest parseFloat-money rows migrated) |
| 52 | 53 | EmployeeFinance.tsx |
| 72 | 71 | EmployeeFinance.tsx |
| 79 | 80 | EmployeeFinance.tsx |
| 82 | 83 | EmployeeFinance.tsx |
| 83 | 84 | EmployeeFinance.tsx |
| 95 | 96 | EmployeeFinance.tsx |
| 96 | 97-98 | EmployeeFinance.tsx |
| 102 | 103 | EmployeeFinance.tsx |
| 120 | 121 | EmployeeFinance.tsx |
| 126 | 127 | EmployeeFinance.tsx |
| 127 | 128 | EmployeeFinance.tsx |
| 1055 | 1056 | EmployeeFinance.tsx |
| 537 | 538 | Payment.tsx (already-resolved) |
| 838 | 838 | EmployeeExperience.tsx (no drift) |

All other lines matched at HEAD.

---

## §3 · Pattern choices & Resolver justification

- **Pattern 1 money 2dp:** `resolveMoneyPrecision(null, null)` (entity override / base-currency / fallback 2). Used for InventoryLineGrid GST math, LedgerMaster EMI math, GSTR9 overrides, EmployeeMaster LIC, PayHeadMaster, PayslipGeneration 12BB inputs.
- **Pattern 1 statutory integer rupee:** `roundTo(_, 0)` for PF estimate (PayslipGeneration), gratuity / leave-encashment / notice-shortfall / pro-rata FnF (ExitAndFnF), order-value / invoice-variance (ContractManpower), gratuity provision (EmployeeExperience), salary structure preview rows (SalaryStructureMaster — pay-hub convention), compound-EMI interest schedule row (EmployeeFinance :103). Justification: domain-fixed integer-rupee precision; resolver is intentionally NOT used to avoid altering statutory rounding behaviour.
- **C4 Math.ceil over money:** preserved Math.ceil (integer-rupee EMI semantics); inner expression snapped with `roundTo(_, 4)` to remove sub-paisa float drift and prevent spurious +1 promotion. Inner uses `dMul`/`dSub`/`dPct` where natural; pure division left as `a/b` where b is integer (Decimal helpers expose no `dDiv`; `roundTo(_, 4)` boundary handles drift).

---

## §4 · STOP-and-raise

**None.**
- LedgerMaster sites (2287-2304) confirmed in `calculateEMI` + `generateLoanSchedule` (form-compute helpers), NOT the voucher-posting path. D-127 boundary respected.
- Payment.tsx:537 not re-touched (already-resolved at `7250cf9`).
- No adjacent non-Appendix-A sites required modification to complete a migration.

---

## §5 · 0-diff confirmations

- `src/lib/decimal-helpers.ts` — 0-diff (consume-only).
- `src/types/voucher-type.ts` — 0-diff.
- `src/data/cc-masters.ts` — 0-diff.
- `src/data/applications.ts` — 0-diff.
- `src/data/cc-compliance-settings.ts` — 0-diff.
- Voucher-posting/save paths in `Payment.tsx`, `Receipt.tsx`, etc. — 0-diff (Block 4a is form-compute / page-form scope only).

---

## §6 · Tests

Created `src/test/precision-arc-stage3b-block4a-financial-core.test.ts` — 21 tests covering:
- InventoryLineGrid GST cgst/sgst/igst/total decimal-safety + behaviour-preservation.
- LedgerMaster EMI zero-rate, compound-rate equivalence, schedule-interest decimal-safety.
- ExitAndFnF gratuity (Math.floor preserved), leave encashment, notice shortfall, pro-rata salary.
- EmployeeFinance C4 (nil/simple/compound EMI integer rupee preservation, drift-snap behaviour).
- PayslipGeneration PF cap + identity equivalence to old algebra.
- ContractManpower order-value + variance integer rupee.
- EmployeeExperience gratuity provision dPct equivalence.
- SalaryStructureMaster integer-rupee preservation.
- Pattern-2 parseFloat money: whole-rupee preservation + 2dp drift snap.

All 21 new tests green. Existing 1162 tests still pass — total **1183 passed (1183)**.

---

## §7 · Triple Gate

| Gate | Baseline | After Block 4a |
|-|-|-|
| TSC | 0 | **0** |
| ESLint | 0 errors / 10 warnings | **0 errors / 10 warnings** (parity) |
| Vitest | 1162 passing | **1183 passing** (+21) |
| Build | clean | clean |

---

## §8 · Audit-table reconciliation

Appended a "Stage 3B · Block 4a — Financial-Core Page Forms · Reconciliation Appendix" to `src/__tests__/__sprint-summaries__/precision-arc-stage2-audit-table.md`. All 51 audit rows annotated; no historical rows deleted; `Payment.tsx:537` marked ALREADY-RESOLVED with cross-reference to surgical fix HEAD.

---

## §9 · Honest disclosures

1. **Math.round → roundTo(_, 0) RBI banker's switch.** For positive monetary values the `.5` boundary behaviour is identical (both round up); for negative inputs RBI banker still rounds half-up. Block 4a sites operate exclusively on non-negative money, so no observable behaviour change. Disclosed.
2. **EmployeeMaster:1432 audit-row drift.** The original audit-table line referenced a non-arithmetic Insurer input. The closest in-purpose parseFloat-money rows (LIC premium :1433 + sumAssured :1434) were migrated as the SUPPLEMENT 7 reconciliation of the audit row. Disclosed.
3. **EmployeeFinance C4 cluster consolidation.** 12 audit rows pointed at lines inside a tightly-related EMI block (3 generators + 1 quick-preview, all share identical patterns). Migrations applied uniformly across all matched lines; not all audit-row line numbers map 1:1 (drift documented in §2).
4. **Decimal-helpers consume-only.** No `dDiv` exists; pure division retained as `a/b` (b integer in all migrated sites). Drift handled at the rounding boundary via `roundTo(_, 4)` (C4) or `roundTo(_, mp)` (Pattern 1).
5. **PayslipGeneration PF estimate algebraic simplification.** Original: `Math.round(Math.min((CTC*0.4/12)*0.12*12, 21600))`; new: `roundTo(Math.min(dPct(CTC, 4.8), 21600), 0)`. `0.4*0.12 = 0.048 = 4.8/100` — exact algebraic identity. Test verifies equivalence.

---

**HALT for §2.4 audit. Block 4b NOT started. No self-certification.**
