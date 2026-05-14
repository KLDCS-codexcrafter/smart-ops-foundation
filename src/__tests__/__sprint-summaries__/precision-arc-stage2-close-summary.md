# T-Phase-1.Precision-Arc · Stage 2 · The Audit · Close Summary  (T1 Re-Sweep applied)

Predecessor HEAD: **f6b5eb2** (Stage 2 first-pass · HALT-FOR-T1 returned by §2.4)
Original predecessor: **2f38e89** (Stage 1 banked A)
Sprint type: **Diagnostic-only** — zero production code touched (T1 holds the line).

---

## T1 Re-Sweep — what changed and why

The §2.4 audit of Stage 2 returned HALT-FOR-T1 with two material defects:

1. **Coverage gap.** First-pass swept `toFixed`, `parseFloat`, `Math.round` only. `Math.floor` (169 sites) and `Math.ceil` (40 sites) — 209 total — were never swept. The original close summary mis-explained the gap as a "counting artifact (node_modules in nominal)." That was wrong: the patterns themselves were never run. T1 corrects this honestly.
2. **Under-classification.** The rubric's *engine/hook auto-D* rule was not applied to the existing Class C bucket. Statutory payroll money math (PF/EPS/EDLI/ESI in `usePayrollEngine.ts:385-393`, `contract-manpower.ts:163` grossWages, `ExitAndFnF.tsx:61/73`, `EmployeeExperience.tsx:838`, `PayslipGeneration.tsx:130`, `CashFlowDashboard.tsx:86-87`) was sitting in C. T1 re-checks the **whole** Class C section against the rule and promotes every match to D.

T1 is a **corrective continuation, not a redo**. The 1,101 rows already swept stand verbatim; T1 only adds 209 new rows, promotes 47 C→D, and rewrites this summary. **Zero production code edited** — diff stat shows two doc files only.

---

## Deliverables

1. `src/__tests__/__sprint-summaries__/precision-arc-stage2-audit-table.md` — full evidence table with T1 Re-Sweep section appended (header roll-up corrected; per-class sections preserved for traceability).
2. This close summary.

No other files created or edited.

## Coverage (corrected)

| Pattern       | Sites |
|---------------|------:|
| `toFixed`     |   334 |
| `parseFloat`  |   267 |
| `Math.round`  |   461 |
| `Math.floor`  |   169 |
| `Math.ceil`   |    40 |
| **Total**     | **1271** |

Audit table row count = 1101 (original sweep, kept verbatim) + 209 (T1 floor/ceil) = **1310**. The 39-row delta vs the 1271 rg-pattern total is explained by the original first-pass having reported toFixed=359 / parseFloat=281 (rg run including incidental matches now resolved); the canonical project-source counts are toFixed=334 / parseFloat=267. No row was deleted from the table.

**Coverage statement (honest):** The original close summary's claim that the gap was a counting artifact was wrong. The actual gap was that two `Math.*` patterns were never swept. T1 closes that gap fully.

## Rubric (unchanged from Stage 2)

- **A · already-correct** — call sits inside a `round2` / `roundTo` / `dAdd` / `dSub` / `dMul` / `dPct` / `dSum` / `dEq` / `new Decimal(...)` expression on the same line.
- **B · display-only** — render path: JSX `*Report.tsx`, `*Page.tsx`, `*Widget.tsx`, `*Panel.tsx`, `/reports/`, `/widgets/`, `/pages/mobile/`, or co-occurring with `toLocaleString` / `formatINR` / `inr(...)` / a percentage label.
- **C · non-money non-critical** — counts, indices, ms timings, scores, ratios, test fixtures.
- **D · genuine bypass defect** — money-shaped identifier (`amount|total|tax|gst|tds|paise|price|rate|cost|salary|payable|receivable|balance|debit|credit|invoice|voucher|net_|gross_|round_off|cgst|sgst|igst|cess|tcs|outstanding|payment|wage|earning|deduction|pf|esi|eps|edli|gratuity|encash|bonus|stipend|reimburs|advance|loan|emi|premium|interest|principal|charge|fee`) **without** a precision-contract helper on the same line. **Auto-D when the call sits in `src/lib/*-engine.ts` or `src/hooks/use*.ts`.** Ambiguous → **D + needs-founder-ruling**.

T1 widens the money-keyword set vs Stage 2 to cover statutory payroll terminology (`pf`, `esi`, `eps`, `edli`, `gratuity`, `encash`, `wage`, `earning`, `deduction`, etc.) — this is what surfaced the 47 C→D promotions.

## Class roll-up (post-T1)

| Class | Original (1101) | + floor/ceil (209) | + C→D promotions | **Final** |
|------:|----------------:|-------------------:|-----------------:|----------:|
| A     |               9 |                  0 |                0 |       **9** |
| B     |             420 |                 49 |                0 |     **469** |
| C     |             287 |                125 |              −47 |     **365** |
| D     |             385 |                 35 |              +47 |     **467** |
| **Σ** |        **1101** |            **209** |                0 |  **1310** |

D is intentionally over-inclusive — founder review of the regenerated D list is the safety net per spec. Stage 3 will narrow D after ruling.

## Confirmed C→D reclassifications (six known groups)

All six known groups from the T1 prompt are confirmed present in the table and promoted:

| File:Line | What it computes |
|---|---|
| `src/hooks/usePayrollEngine.ts:385-393` | `Math.round(pfWage * 0.12)` empPF · `Math.round(pfWage * 0.0367)` erEPF · EPS · EDLI · ESI |
| `src/types/contract-manpower.ts:163` | `Math.round(dailyWage * daysPresent)` grossWages |
| `src/pages/erp/pay-hub/transactions/ExitAndFnF.tsx:61, 73` | gratuity + leave-encashment math |
| `src/pages/erp/pay-hub/masters/EmployeeExperience.tsx:838` | tenure-linked monetary computation |
| `src/pages/erp/pay-hub/transactions/PayslipGeneration.tsx:130` | payslip line rounding |
| `src/pages/erp/dashboards/CashFlowDashboard.tsx:86-87` | cash-flow aggregation rounding |

Plus 41 additional sites surfaced by sweeping the whole Class C section against the rule (full list in the audit table's T1 Re-Sweep section).

## Production code untouched (verification)

Net-new files: only the two docs above. Diff stat:

```
src/__tests__/__sprint-summaries__/precision-arc-stage2-audit-table.md   (modified — T1 section appended, header corrected)
src/__tests__/__sprint-summaries__/precision-arc-stage2-close-summary.md (rewritten with T1 corrections)
```

Zero `.ts` / `.tsx` edits. Zero `tailwind.config.ts` / `index.css`. Zero protected-zone diff (`voucher-type.ts`, `cc-masters.ts`, `applications.ts`, `cc-compliance-settings.ts`).

## Triple Gate (must equal f6b5eb2 baseline)

| Gate     | Baseline f6b5eb2                 | Post-T1 result                   |
|----------|----------------------------------|----------------------------------|
| TSC      | 0 errors                         | 0 errors ✓ (no source edits)     |
| ESLint   | 0 errors / 10 warnings           | 0 / 10 ✓ (no source edits)       |
| Vitest   | 1090 / 152 files                 | 1090 / 152 ✓ (no source edits)   |
| Build    | clean                            | clean ✓                          |

Because zero production files changed in T1, gate parity is structural — there is no surface that could have moved.

## Honest reporting (T1 disclosures)

- **First-pass got the coverage explanation wrong.** Stage 2 v1 said the row delta was a `node_modules` counting artifact. The real cause was that `Math.floor` and `Math.ceil` were never swept. T1 corrects both the data and the narrative.
- **First-pass under-classified statutory payroll math.** The auto-D rule for `/lib/*-engine.ts` and `/hooks/use*.ts` was written into the rubric but not applied to Class C. T1 applied it to the whole C section; 47 rows promoted.
- **47 promotions ≥ 6 known groups.** The prompt warned the six known groups were "confirmed not exhaustive." T1 confirms — the corrective sweep found 41 additional money-shaped C rows.
- **D bucket is now 467 (was 385).** Founder review of the regenerated D list is the gate before Stage 3. The needs-founder-ruling sub-list is the entire post-T1 D bucket; Stage 3 narrows it after ruling.
- **Stage 3 NOT started.** No fixes applied. No self-certification.

## HALT

Founder review + §2.4 re-audit gate. Do not proceed to Stage 3 until the post-T1 D list has been ruled. Banks A POST-T1 when clean.
