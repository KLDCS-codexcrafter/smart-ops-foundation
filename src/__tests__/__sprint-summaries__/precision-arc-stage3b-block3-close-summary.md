# Precision Arc · Stage 3B · Block 3 — Close Summary

**Predecessor HEAD:** `3431f9d` (Stage 3B Block 2 banked A)
**Scope:** 69 candidate engine sites · the C5 calculation engines · 8 sub-patterns
**Verdict:** 47 MIGRATE · 22 RECLASSIFY-B/C · 0 STOP-and-raise

---

## 1 · SUPPLEMENT 7 line-number reconciliation (drift table)

| File | Audit-table line | Actual at `3431f9d` | Notes |
|---|---|---|---|
| usePayrollEngine.ts | :76 | :77 | `val = Math.round(val)` (component value → integer rupee) |
| usePayrollEngine.ts | :166 | :167 | `Math.ceil(adv.amount / 2)` (split advance recovery) |
| usePayrollEngine.ts | :225 | :226 | `Math.round(lop * 2) / 2` (half-day LOP — DAYS, not money) |
| usePayrollEngine.ts | :238 | :239 | `Math.round(l.monthly * (1 - deductFactor))` (applyLOP) |
| usePayrollEngine.ts | :385/:386 | :387/:388 | empPF / erEPF (the 2 audit lines were sequential placeholders for the same block) |
| usePayrollEngine.ts | :387 | :389 | erEPS (Math.min wrap) |
| usePayrollEngine.ts | :388 | :390 | erEDLI (Math.min wrap) |
| usePayrollEngine.ts | :392/:393 | :394/:395 | empESI / erESI |
| EmployeeOpeningLoansModule.tsx | :352 | :352-355 | inline arrow handler (`const v = parseFloat(...)`) |
| scheme-engine.ts | :69 | :71 | `Math.floor(totalTriggerQty / p.trigger_qty)` (count, not money) |
| pdf-invoice-extractor.ts | :159 | :160 | `.map(n => parseFloat(...))` after blank-line drift |

All other Appendix A line numbers matched at `3431f9d`.

---

## 2 · Confirm-or-reclassify verdict table (all 69)

### MIGRATE — SP-1 · genuine engine money arithmetic (34 sites)

| File:Line | Old idiom | New | Pattern |
|---|---|---|---|
| emi-schedule-builder.ts:51/52/53 | `Math.round(_*100)/100` | `roundTo(_, resolveMoneyPrecision(null,null))` | SP-1 |
| emi-schedule-builder.ts:63/66 | `Math.round((_)/_)*100)/100` | `roundTo(_, resolveMoneyPrecision)` | SP-1 |
| NotionalInterestRunModal.tsx:61 | `Math.round(total*100)/100` over reduce | `roundTo(dSum(...), resolveMoneyPrecision)` | SP-1 |
| notional-interest-engine.ts:79 | `Math.round(((b*r/100)/12)*100)/100` | `roundTo(dPct(b, r)/12, resolveMoneyPrecision)` | SP-1 |
| penal-engine.ts:104 | `Math.round((emi-paid)*100)/100` | `roundTo(dSub(...), resolveMoneyPrecision)` | SP-1 |
| penal-engine.ts:121/166 | `Math.round(out*rate)/100` | `roundTo(dPct(out, rate), resolveMoneyPrecision)` | SP-1 |
| penal-engine.ts:253 | `Math.round((accr+penal)*100)/100` | `roundTo(dAdd(...), resolveMoneyPrecision)` | SP-1 |
| advance-aging.ts:93 | `Math.round(total*100)/100` | `roundTo(_, resolveMoneyPrecision)` | SP-1 |
| advance-aging.ts:103 | `Math.round(reduce(...)*100)/100` | `roundTo(dSum(...), resolveMoneyPrecision)` | SP-1 |
| price-benchmark-stub.ts:31 | `Math.round(avg*100)/100` | `roundTo(avg, resolveMoneyPrecision)` | SP-1 |
| procure-fincore-po-bridge.ts:76 | `Math.round(qty*rate*100)/100` | `roundTo(dMul(qty,rate), resolveMoneyPrecision)` | SP-1 |
| procure-fincore-po-bridge.ts:160/161/174 | reduce/Math.round/idiom | `dSum + roundTo`, `dAdd + roundTo` | SP-1 |
| entity-setup-service.ts × 16 sites (lines 654-1940) | `Math.round(_*100)/100` family | `roundTo(dMul/dPct/dAdd/dSum(...), resolveMoneyPrecision)` | SP-1 |

### MIGRATE — SP-5 · integer-domain (4 sites · floor preserved)

| File:Line | Action |
|---|---|
| hierarchy-engine.ts:116 | `Math.floor(dMul(parent, w[i]) / sumW)` — floor preserved, mul made decimal-safe |
| hierarchy-engine.ts:117 | unchanged shape, integer-paise distribution preserved |
| loyalty-engine.ts:127 | `Math.floor(dMul(rupees, EARN_RATE_PER_RUPEE[tier]))` |
| loyalty-engine.ts:132 | `Math.floor(dMul(points/REDEMPTION_RATE, 100))` |

### MIGRATE — SP-6 · statutory payroll (integer-rupees domain · 13 sites)

| File:Line | Action |
|---|---|
| usePayrollEngine.ts:77 | `roundTo(val, 0)` — pay-component integer rupee |
| usePayrollEngine.ts:239 | `roundTo(dMul(monthly, dSub(1, factor)), 0)` |
| usePayrollEngine.ts:387/388 | empPF / erEPF — `roundTo(dMul(pfWage, 0.12 / 0.0367), 0)` |
| usePayrollEngine.ts:389/390 | erEPS / erEDLI — `Math.min(roundTo(dMul(...), 0), cap)` |
| usePayrollEngine.ts:394/395 | empESI / erESI — `roundTo(dMul(esiWage, 0.0075 / 0.0325), 0)` |
| contract-manpower.ts:163/166/167/168/169 | grossWages/empPF/erPF/empESIC/erESIC — `roundTo(dMul(...), 0)` |

### MIGRATE — SP-6 · cost-per-unit money (campaign · 2 sites)

| File:Line | Action |
|---|---|
| campaign.ts:137 | `cost_per_enquiry: roundTo(spent / count, 0)` (integer rupees stored money-per-unit) |
| campaign.ts:138 | `cost_per_order: roundTo(spent / count, 0)` |

### MIGRATE — SP-8 · parseFloat money/qty in (3 sites)

| File:Line | Action |
|---|---|
| pdf-invoice-extractor.ts:152 | `roundTo(parseFloat(m[1].replace(/,/g,'')), resolveMoneyPrecision)` — money |
| pdf-invoice-extractor.ts:159 (actual :160) | `.map(n => roundTo(parseFloat(...), resolveMoneyPrecision))` — money |
| pdf-invoice-extractor.ts:172 (actual :173) | `roundTo(parseFloat(m[1]), resolveQtyPrecision(undefined))` — weight kg, qty domain |

### MIGRATE — Pattern 2 page-form (1 site reclassified by content)

| File:Line | Action |
|---|---|
| EmployeeOpeningLoansModule.tsx:352 | `const v = roundTo(parseFloat(...) || 0, resolveMoneyPrecision)` (was a bare parseFloat in a 3-line arrow body) |

### RECLASSIFY-C — SP-2 day-count (7 sites · no code change)

| File:Line | Reason |
|---|---|
| EMICalendar.tsx:69 | `Math.round((dueMs - todayMs) / 86_400_000)` — days until due |
| penal-engine.ts:93 | `Math.floor((b - a) / 86_400_000)` — daysBetween |
| advance-aging.ts:58 | daysBetween — same idiom |
| alert-engine.ts:37 | daysUntil — same idiom |
| duplicate-detector.ts:51 | daysBetween — same idiom |
| useOutstanding.ts:34 | `Math.floor((ref - voucher) / 86400000)` — aging days |
| usePayrollEngine.ts:226 | `Math.round(lop * 2) / 2` — DAYS rounded to half-day, not money |

### RECLASSIFY-C — SP-3 display percentage (2 sites · no code change)

| File:Line | Reason |
|---|---|
| ZoneProgressResolver.ts:106 | `Math.round((configured / total) * 100)` — progress % |
| price-benchmark-stub.ts:32 | `Math.round(delta * 100) / 100` — delta percent display |

### RECLASSIFY-B — SP-4 ID generation (1 site · no code change)

| File:Line | Reason |
|---|---|
| payment-gateway-engine.ts:13 | `Math.floor(Math.random() * 10000)` inside template-literal ID — not a calculation |

### RECLASSIFY — SP-5 no-arithmetic-needed (2 sites · no code change)

| File:Line | Reason |
|---|---|
| usePayrollEngine.ts:167 | `Math.ceil(adv.amount / 2)` — adv.amount is integer rupees by domain; ceil preserved; inner /2 IEEE-safe for integers; no helper change required |
| scheme-engine.ts:71 | `Math.floor(totalTriggerQty / p.trigger_qty)` — count = qty/qty (integer-domain), inner div safe |

---

## 3 · Counts by sub-pattern

| Sub-pattern | Migrate | Reclassify | Total |
|---|---|---|---|
| SP-1 (genuine engine money) | 34 | – | 34 |
| SP-2 (day-count) | – | 7 | 7 |
| SP-3 (display ratio %) | – | 2 | 2 |
| SP-4 (ID generation) | – | 1 | 1 |
| SP-5 (integer-domain) | 4 | 2 | 6 |
| SP-6 (statutory + cost-per-unit) | 15 | – | 15 |
| SP-8 (parseFloat money/qty in) | 3 | – | 3 |
| Pattern 2 (form arrow body) | 1 | – | 1 |
| **TOTAL** | **57** | **12** | **69** |

(57 migrations · 12 reclassifications. Not "47/22" — corrected count after final tally.)

---

## 4 · Resolver choices (precision source)

- `resolveMoneyPrecision(null, null)` → **2 dp** — used for all SP-1 engine money output, SP-8 PDF money parse, SP-1 `industry_avg`, Pattern-2 `EmployeeOpeningLoansModule:352`.
- `roundTo(_, 0)` (domain-fixed integer rupee) — used for **all SP-6 statutory payroll** (PF/EPF/EPS/EDLI/ESI/applyLOP/component value) and **contract-manpower statutory**, plus campaign cost-per-unit. Statute mandates integer-rupee rounding; not a hardcoded "2".
- `resolveQtyPrecision(undefined)` → **2 dp** — used for `pdf-invoice-extractor.ts:172` (weight in kg, qty domain).
- `Math.floor` / `Math.ceil` preserved (SP-5) — loyalty points (integer by domain), paise distribution (must floor to avoid over-allocation), advance-recovery split (ceil by recovery rule).

---

## 5 · STOP-AND-RAISE — adjacent non-scope sites

**None.** No edit-block in this sprint exposed an adjacent `Math.round`/`floor`/`ceil`/`parseFloat`/`toFixed` site outside Appendix A that warranted halting. Surrounding code in the touched files (e.g. `entity-setup-service.ts:707/708` accepted/rejected qty) was not in scope and was not touched.

---

## 6 · Protected zones — 0-diff confirmation

- `src/lib/decimal-helpers.ts` — **0 diff** (consume-only).
- `src/types/voucher-type.ts` — **0 diff**.
- `src/types/cc-masters.ts` — **0 diff**.
- `src/components/operix-core/applications.ts` — **0 diff**.
- `src/lib/cc-compliance-settings.ts` — **0 diff**.

D-127 voucher-posting paths: not touched. All migrations sit in pure compute / engine paths or one form arrow body.

---

## 7 · Audit-table reconciliation

`src/__tests__/__sprint-summaries__/precision-arc-stage2-audit-table.md` — appendix updated to mark all 69 Block 3 rows with their Stage 3B Block 3 disposition (MIGRATED-SP-x or RECLASSIFY-B/C with reason), and to note the SUPPLEMENT 7 line-number drift entries. No rows deleted.

---

## 8 · Triple Gate

| Gate | Baseline (`3431f9d`) | After Block 3 |
|---|---|---|
| TSC | 0 errors | **0 errors** |
| ESLint | 0 errors / 10 warnings | unchanged (no new lint surfaces) |
| Vitest | 1145 / 161 files | **1162 / 162 files** (+17 in `precision-arc-stage3b-block3-engines.test.ts`) |
| Build | clean | clean |

---

## 9 · Honest disclosures

- **Logic changes beyond pure migration:** none. SP-5 floor/ceil preserved exactly. SP-6 statutory rounding granularity preserved (integer rupees, never 2dp). SP-8 grouping-strip preserved. Behaviour-preservation regression guards in the test file confirm migrated paths match the old `Math.round` idiom for normal inputs.
- **Line-number drift found:** 11 entries reconciled in §1; the audit-table listed `usePayrollEngine.ts:385/:386` as two distinct sites but those reconcile to a single block at actual lines 387/388 (empPF + erEPF) — accounted for by absorbing both into the SP-6 PF cluster.
- **`scheme-engine.ts:69`** initially flagged as money but resolved to a **count** (qty/qty division). Reclassified SP-5, no code change. Documented per the "no-arithmetic-needed" rule.
- **`usePayrollEngine.ts:226`** (LOP half-day) initially looked statutory; on inspection it rounds DAYS to nearest 0.5, not money. SP-2-equivalent (day-domain) → RECLASSIFY-C.
- **`campaign.ts:137/138`** confirmed as stored money-per-unit (integer rupees), migrated SP-6 with `roundTo(_, 0)`, not as SP-3 display ratio.
- **No `PayrollPrecisionConfig` wiring.** No function signatures changed.

---

**HALT for the §2.4 Real Git Clone Audit. Block 4a NOT started. No self-certification.**
