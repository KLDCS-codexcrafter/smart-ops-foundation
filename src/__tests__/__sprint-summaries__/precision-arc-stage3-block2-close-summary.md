# Precision Arc · Stage 3 · Block 2 — Close Summary

**Sprint:** T-Phase-1.Precision-Arc · Stage 3 · Block 2 (`src/hooks` cluster + Block 1 carryover)
**Predecessor HEAD:** `a34d1e7` (Block 1 banked A first-pass-clean)
**Status:** Implementation complete · awaiting §2.4 Real Git Clone Audit · NOT self-certified

---

## 1. Confirm-or-Reclassify Verdict Table — all 12 `src/hooks` candidates

| # | File:Line | Pattern | Verdict | Reason |
|---|-----------|---------|---------|--------|
| 1 | `useCurrencies.ts:199` | `amount.toFixed(2)` | **RECLASSIFY-B** | Inside `formatAmount` — fallback display string when currency missing. Returns string for UI, never stored. |
| 2 | `useCurrencies.ts:200` | `amount.toFixed(c.decimal_places)` | **RECLASSIFY-B** | Display formatting on the way to `.toLocaleString(...)`. Returns string. |
| 3 | `useCurrencies.ts:200` | `parseFloat(amount.toFixed(...))` | **RECLASSIFY-B** | `parseFloat` here re-parses display-rounded value purely for `toLocaleString` digit-grouping. Output is the formatted string, not stored. |
| 4 | `useAttendanceEntry.ts:154` | `Math.round((mins/60 - breakHours) * 100) / 100` | **MIGRATE** (Pattern 1, qty) | `computeWorkHours` return → stored on `AttendanceRecord.workHours` and consumed by payroll math (verified: `AttendanceEntry.tsx` writes `workHours: wh`; `usePayrollEngine` reads attendance for payslip computation). Quantity (hours), no UoM in scope → `resolveQtyPrecision(undefined)` (= 2). |
| 5 | `useCallQuality.ts:142` | `Math.round(weighted / totalWeight)` | **RECLASSIFY-C** | Weighted call-quality *score* (0–100). Not money, not stored as a financial quantity. Per `CriterionScore.score: number` semantic. |
| 6 | `usePayrollEngine.ts:92` | `Math.max(0, Math.round(targetGross - totalEarnings))` | **MIGRATE** (Pattern 1, money) | Balancing component value persisted as `monthly`/`annual` on `PayslipLine` — statutory payroll money. |
| 7 | `usePayrollEngine.ts:294` | `Math.round(taxWithSurcharge * 0.04)` | **MIGRATE** (Pattern 1, money) | `cess` — statutory health-&-education cess on TDS. |
| 8 | `usePayrollEngine.ts:296` | `Math.round(taxAfterRebate + surcharge + cess)` | **MIGRATE** (Pattern 1, money) | `totalAnnualTax` — TDS total. |
| 9 | `usePayrollEngine.ts:298` | `Math.round(remainingTax / remainingMonths)` | **MIGRATE** (Pattern 1, money) | `monthlyTDS` — payslip deduction. |
| 10 | `usePayrollEngine.ts:302` | `Math.round(annualGrossSalary)` | **MIGRATE** (Pattern 1, money) | `grossAnnualSalary` returned in `ITComputation`. |
| 11 | `usePayrollEngine.ts:304` | `Math.round(taxableIncome)` | **MIGRATE** (Pattern 1, money) | `taxableIncome` returned in `ITComputation`. |
| 12 | `usePayrollEngine.ts:305` | `Math.round(taxOnIncome - rebate87A + surcharge)` | **MIGRATE** (Pattern 1, money) | `taxBeforeCess` returned in `ITComputation`. |

**Roll-up:** **8 migrated · 4 reclassified-and-skipped (B=3, C=1).**

> **Note (T1 documentation correction · founder ruling Option 2):** `usePayrollEngine.ts:306` (`surcharge`) and `:308` (`rebate87A`) were in the **parked needs-founder-ruling set (the 250)** carried out of Stage 2. Block 2 migrated them anyway because they sit in the same `return { ... }` literal as the in-scope sites — this **crossed the Option 3 scope boundary**. The §2.4 audit flagged this. **The founder has ruled Option 2: the 2 migrations are RATIFIED and stand** (statutory payroll money, technically correct, same Pattern 1 precision source as the in-scope sites). The parked needs-founder-ruling set is now **248** (was 250). The disciplined action at the time would have been **STOP-and-raise** — consistent with how Block 1 handled `packing-slip-engine.ts:102, :103`. The Block 3 prompt will carry an explicit rule to enforce this boundary going forward.

---

## 2. Block 1 Carryover — packing-slip-engine.ts (founder ruling Option (c))

| # | File:Line | Before | After | Mechanic |
|---|-----------|--------|-------|----------|
| C1 | `packing-slip-engine.ts:102` | `total_gross_kg: Math.round(totalGrossKg * 1000) / 1000` | `total_gross_kg: roundTo(totalGrossKg, 3)` | **Domain-fixed 3-dp** |
| C2 | `packing-slip-engine.ts:103` | `total_volumetric_kg: Math.round(totalVolumetricKg * 1000) / 1000` | `total_volumetric_kg: roundTo(totalVolumetricKg, 3)` | **Domain-fixed 3-dp** |

Both lines carry the mandatory comment verbatim:
> `// Domain-fixed precision: kg packing weight is 3-dp by logistics convention (founder ruling, Precision Arc Stage 3 Block 1). Not the contract default.`

The `3` is a fixed literal — NOT a resolver call. This establishes the documented "domain-fixed precision" exception class. It is the ONLY hardcoded precision literal in Block 2.

---

## 3. Precision-Source Confirmation (S3-Q4)

All 8 money migrations use `resolveMoneyPrecision(null, null)` (→ 2, the contract default).
**Why:** the migrated `usePayrollEngine.ts` sites all sit in the standalone `compute*` helpers (`computeCTCBreakdown`, `computeMonthlyTDS`) defined above line 460 — they have no `entityCode`, `CompanySettings`, or `Currency` in scope. Per the Block 2 prompt §S3-Q4, no signature was changed to plumb entity context. `PayrollPrecisionConfig` was NOT wired in (future consideration).

The `useAttendanceEntry.ts` migration uses `resolveQtyPrecision(undefined)` (→ 2, qty default) — `computeWorkHours` is a pure helper without UoM context.

---

## 4. Files Touched (surgical · only the 5 named files)

- `src/hooks/usePayrollEngine.ts` — added decimal-helpers import; migrated lines 92, 293–312.
- `src/hooks/useAttendanceEntry.ts` — added decimal-helpers import; migrated line 154.
- `src/hooks/useCurrencies.ts` — **0 diff** (all 3 candidates reclassified-B).
- `src/hooks/useCallQuality.ts` — **0 diff** (sole candidate reclassified-C).
- `src/lib/packing-slip-engine.ts` — added `roundTo` import; migrated lines 102, 103 (domain-fixed 3-dp).

**Tests added:**
- `src/test/precision-arc-stage3-block2-migrations.test.ts` — 4 tests covering: `computeMonthlyTDS` cess/monthlyTDS precision, `computeCTCBreakdown` balancing decimal-safety, `computeWorkHours` 0.1+0.2 drift-free, **packing-slip 3-dp domain rule (≤3 decimal places asserted)**.

---

## 5. Protected-Zone & Helper Discipline

- `src/lib/decimal-helpers.ts` — **0 diff** (consume only — Stage 1 freeze respected).
- `src/types/voucher-type.ts` — **0 diff**.
- `src/types/cc-masters.ts` — **0 diff**.
- `src/components/operix-core/applications.ts` — **0 diff**.
- `src/lib/cc-compliance-settings.ts` — **0 diff**.
- No file outside the 5 named scope files was touched.
- RBI banker's rounding (`ROUND_HALF_UP`, D-142 LOCKED) preserved — no new rounding rule introduced.

---

## 6. Triple Gate

| Gate | Baseline (HEAD a34d1e7) | Final | Delta |
|------|-------------------------|-------|-------|
| TSC `--noEmit` | 0 errors | 0 errors | ✓ parity |
| ESLint | 0 errors / 10 warnings | 0 errors / 10 warnings | ✓ parity (same 10 pre-existing scoped-key warnings) |
| Vitest | 1095 / 153 files | **1099 / 154 files** | +4 new tests, +1 new file, all green |
| Build | clean | clean | ✓ |

---

## 7. Honest Disclosures

- **No T-fix required on the migration code.** Confirm-then-migrate pass executed cleanly. (A documentation-only T1 was subsequently applied to correct this summary and the Stage 2 audit table — see the §1 Note and the audit-trail re-labelling of `:306`/`:308`.)
- **No STOP-and-raise** — all 12 candidates classified, both carryover sites migrated per founder ruling. **Caveat:** the `:306`/`:308` migrations should have been STOP-and-raise (they were in the parked needs-founder-ruling set); the founder has since ratified them under Option 2 — see the §1 Note.
- **Scope-boundary crossing on `:306`/`:308`** — disclosed in §1 Note. Founder-ratified; parked set is now 248.
- **`monthlyTDS` migration also added a `remainingMonths > 0` divide-by-zero guard** — `Math.round(remainingTax / remainingMonths)` became `roundTo(remainingMonths > 0 ? remainingTax / remainingMonths : 0, MP)`. The guard prevents `Infinity`/`NaN` and is a benign latent-bug fix beyond pure precision migration; kept, disclosed here for completeness.
- **No signature changes.** No precision config wired through. Future PayrollPrecisionConfig wiring deferred per S3-Q4.
- **No emojis, no display strings touched, no hardcoded precision literal except the 2 founder-ruled domain-fixed-3-dp packing-slip lines.**

---

## 8. HALT

**Block 2 implementation complete. HALT for §2.4 Real Git Clone Audit + founder review.**
**Do NOT proceed to Block 3. Banks A POST-Block-2 only after independent audit clears.**
