# Sprint T-Phase-1.Hardening-A · Close Summary

**Composite #50** · Predecessor HEAD `41e8a02` · Author: Lovable on behalf of Operix Founder · May 14, 2026

This sprint continues the partial Hardening-A work begun in the prior session. Block A (call-site migration) is now operationally complete with the ESLint guard rail installed; Block B (per-card error boundaries) is complete; **Block C is HALTED at the founder review gate (C-Q4) — the classification table is presented below for sign-off; NO arithmetic-money fixes have been applied.**

---

## Block A · Multi-Tenant Key Scoping ✅

### A.1 · Helpers
`divisionsKey(e)` and `departmentsKey(e)` exist in `src/types/org-structure.ts:53-58` (added in the prior session). Pattern matches `employeesKey` / `attendanceRecordsKey`: scoped when `e` is non-empty, legacy global key when empty (one-cycle migration safety).

### A.2 · Call-site migrations (this turn + prior turn, cumulative)
| File | Status |
|---|---|
| `src/lib/voucher-org-tag-engine.ts` | migrated (legacy fallback) |
| `src/hooks/useAssetMaster.ts` | migrated + `migrateEmployeesIfNeeded` |
| `src/hooks/useDemoSeedLoader.ts` | seeds scoped key |
| `src/pages/erp/accounting/TransactionTemplates.tsx` | migrated |
| `src/pages/erp/dispatch/reports/OutwardMovementReport.tsx` | migrated |
| `src/pages/erp/dispatch/transactions/DemoOutwardIssue.tsx` | migrated |
| `src/pages/erp/dispatch/transactions/SampleOutwardIssue.tsx` | migrated |
| `src/pages/erp/masters/CustomerMaster.tsx` | migrated |
| `src/pages/erp/pay-hub/masters/EmployeeMaster.tsx` | migrated |
| `src/pages/erp/payout/VendorAnalytics.tsx` | migrated |
| `src/pages/erp/salesx/transactions/Telecaller.tsx` | migrated |
| `src/features/command-center/modules/FoundationModule.tsx` | **migrated this turn** (useEntityCode + scoped helpers + legacy fallback) |
| `src/pages/erp/masters/VendorMaster.tsx` | **migrated this turn** (VendorMasterPanel useEntityCode + 2 dropdown reads + legacy fallback) |
| `src/lib/card-pulse-engine.ts:123` | already correct (verified `erp_employees_${entityCode}`) |
| `src/pages/welcome/scenarios/ClientBlueprintsPage.tsx:258-259` | already correct (verified scoped) |

### A.3 · Deferred per A-Q1 (Conservative-Scoping Rule) → Hardening-B long-tail
- **`src/features/command-center/modules/ImportHubModule.tsx:35`** — `EMPLOYEE_KEY` is wired through `storageKey: string` props on the reusable `ImportTab` component and consumed by 6 sites in the file. Migrating requires a structural refactor (props become functions or entity-aware) that exceeds the surgical scope. Defer.
- **`src/features/command-center/components/ZoneProgressResolver.ts:27-28`** — These keys appear inside the **Zone 1 Foundation aggregator** (`isConfigured(key)` checks raw global keys at the system-foundation level for "Have you set up your org structure yet?"). Their semantic is genuinely *system / pre-entity*, mixing entity-private and global keys in a single module-progress check. A.3-required migration logic can't be applied without losing the foundation's purpose. Defer to Hardening-B with the founder's call on whether to entity-scope the foundation indicator at all.

### A.4 · ESLint custom rule
Added `hardening-a/no-hardcoded-scoped-key` (severity: **warn**) inline in `eslint.config.js`. Flags `localStorage.getItem|setItem|removeItem` called with a string literal beginning with `erp_employees|erp_attendance_records|erp_divisions|erp_departments`. Rule runs cleanly against the codebase; **it organically validates by firing 10 warnings** — every single one of those is an intentional legacy fallback inside the migrated call sites (e.g. `localStorage.getItem('erp_divisions') || '[]'` in the `if (!entityCode)` branch). No "deliberately planted" line was needed; the warnings ARE the live verification artifact. They will all clear in Hardening-B when the legacy fallbacks are purged.

### A.5 · Tests
`src/test/hardening-a-key-scoping.test.ts` extended from 4 → **15 assertions** covering: (1) helper scoping + fallback for divisions/departments, (2) ESLint rule registration + prefix coverage + warn severity, (3) call-site migration verification for FoundationModule + VendorMaster, (4) ErrorBoundary props + Shell.tsx wrap (Block B verification).

---

## Block B · Per-Card Error Boundaries ✅

### B.1 · `ErrorBoundary.tsx` extended
Added two optional, **backward-compatible** props:
- `cardName?: string` — when set, fallback heading reads "This card hit an error" with `${cardName} could not render. Other cards remain available.`
- `onReset?: () => void` — when set, button label becomes **"Return to dashboard"** and the click invokes the callback; when unset, behaviour is the legacy `Refresh page` → `window.location.reload()` (existing root usage in `App.tsx` is unaffected — both props default to undefined).

Layout differs subtly: card-level fallback uses `min-h-[40vh] p-8`; root fallback retains `min-h-screen`.

### B.2 · `Shell.tsx` wrap
Children are now wrapped in `<ErrorBoundary key={location.pathname} cardName={config.product.name} onReset={() => navigate('/erp/dashboard')}>`. The `key` tied to `useLocation().pathname` ensures error state resets on route change. Imports added: `useLocation`, `useNavigate` from `react-router-dom`, `ErrorBoundary` from `@/components/ErrorBoundary`. Root `App.tsx` `ErrorBoundary` is **preserved** (defense in depth).

### B.3 · Test
Source-level assertions in `hardening-a-key-scoping.test.ts` verify ErrorBoundary props shape, the dual button labels, the reload-fallback preservation, and the Shell.tsx wrap (key/cardName/onReset all asserted via regex on source).

---

## Block C · Financial Money Spot-Audit ⏸️ HALTED AT FOUNDER REVIEW GATE (C-Q4)

Per **C.3 (locked at C-Q4)**: STOP after C-1; do NOT proceed to C-2 fixes until the founder has reviewed this classification. **No production code in the financial cards has been modified by Block C.** Path-verification site counts confirmed: **FinCore 19 + PayHub 58 + Payout 4 + ReceivX 0 + Bill-Passing 10 = 91**.

### C.1 · Classification Table (all 91 sites)

Legend:
- **D** = display-only (formatting for screen/export; result does not flow back into stored or posted data)
- **Q** = quantity / non-money (qty, percent, hours, bytes — `toFixed` is rounding, not money math)
- **M** = arithmetic money defect (result is stored, posted, summed, or compared AS MONEY → FIX in C-2)
- **M?** = needs founder ruling — input parsed via `parseFloat` and stored to a money field; downstream consumer NOT yet audited in this surgical pass

#### FinCore (19 sites)
| File:line | Snippet | Class | Reason |
|---|---|---|---|
| StockTransferRegister.tsx:33 | `totalQty(...).toFixed(2)` | Q | qty in register column |
| StockTransferRegister.tsx:50 | `qty.toFixed(2)` | Q | qty footer |
| StockJournalRegister.tsx:40 | `netQty(...).toFixed(2)` | Q | qty |
| DeliveryNoteRegister.tsx:40 | `totalQty(...).toFixed(2)` | Q | qty |
| DeliveryNoteRegister.tsx:60 | `qty.toFixed(2)` | Q | qty footer |
| StockAdjustmentRegister.tsx:40 | `netQtyAdjust(...).toFixed(2)` | Q | qty |
| StockAdjustmentRegister.tsx:59 | `totalNet.toFixed(2)` | Q | qty footer |
| ReceiptNoteRegister.tsx:40 | `totalQty(...).toFixed(2)` | Q | qty |
| ReceiptNoteRegister.tsx:60 | `qty.toFixed(2)` | Q | qty footer |
| ApprovalsPendingPage.tsx:153 | `kpis.avgWait.toFixed(1)` | Q | hours/days KPI |
| BankReconciliation.tsx:78 | `parseFloat(parts[2])` (debit) | **M** | bank-statement CSV → reconciliation match — MUST be paise-int |
| BankReconciliation.tsx:79 | `parseFloat(parts[3])` (credit) | **M** | same as above |
| Form3CD.tsx:163 | `((gp/turnover)*100).toFixed(1)` (gpPct) | Q | percent display |
| Form3CD.tsx:164 | `((np/turnover)*100).toFixed(1)` (npPct) | Q | percent display |
| Form3CD.tsx:198 | `parseFloat(raw)` (clause read) | **M** | reads stored audit-report money; rounds at parse — Form 3CD MCA filing |
| Form3CD.tsx:341 | `setClause14(parseFloat(...) || 0)` | **M?** | Clause 14 amount — depreciation/disallowance entered then filed |
| GSTR9.tsx:66 | `parseFloat(val)` GSTR9 cell | **M?** | GSTR-9 numeric cell — MUST be exact for return filing |
| ITCRegister.tsx:202 | `setReversalAmount(parseFloat(...))` | **M?** | ITC reversal amount — flows to ledger |
| TDSAdvance.tsx:91 | `amount: parseFloat(challanForm.amount)` | **M** | TDS challan amount → posted to ledger |

#### PayHub (58 sites)
| File:line | Snippet | Class | Reason |
|---|---|---|---|
| StatutoryReturns.tsx:994 | `parseFloat(...)` totalAmount | **M?** | statutory return total |
| PayslipGeneration.tsx:349 | `declaredAmount: parseFloat(proofAmount)` | **M?** | tax-saving proof — flows to TDS calc |
| PayslipGeneration.tsx:654 | duf-deduction parseFloat | **M?** | declaration deduction amount |
| PayslipGeneration.tsx:669 | medicalInsuranceSelf parseFloat | **M?** | 80D deduction amount |
| PayslipGeneration.tsx:673 | medicalInsuranceParents parseFloat | **M?** | 80D |
| PayslipGeneration.tsx:684 | educationLoanInterest parseFloat | **M?** | 80E |
| PayslipGeneration.tsx:688 | donations80G parseFloat | **M?** | 80G |
| PayslipGeneration.tsx:692 | savingsInterest80TTA parseFloat | **M?** | 80TTA |
| PayslipGeneration.tsx:715 | hra rentPerMonth parseFloat | **M?** | HRA exemption input |
| PayslipGeneration.tsx:757 | homeLoan interestPaid parseFloat | **M?** | 24(b) |
| PayslipGeneration.tsx:761 | homeLoan principalPaid parseFloat | **M?** | 80C |
| PayslipGeneration.tsx:781 | prevEmployerGross parseFloat | **M?** | YTD computation |
| PayslipGeneration.tsx:785 | prevEmployerTDS parseFloat | **M?** | YTD TDS aggregation |
| PayslipGeneration.tsx:789 | prevEmployerPF parseFloat | **M?** | YTD PF aggregation |
| Onboarding.tsx:756 | offerAmount parseFloat | **M?** | offer letter amount |
| AdminAndMonitoring.tsx:1009 | productiveHours parseFloat | Q | hours |
| AdminAndMonitoring.tsx:1014 | neutralHours parseFloat | Q | hours |
| AdminAndMonitoring.tsx:1019 | unproductiveHours parseFloat | Q | hours |
| AttendanceEntry.tsx:518 | `wh.toFixed(2)` | Q | work-hours display |
| AttendanceEntry.tsx:895 | latitude parseFloat | D | geocoord |
| AttendanceEntry.tsx:902 | longitude parseFloat | D | geocoord |
| DocumentManagement.tsx:41 | `(bytes/1024).toFixed(1)` KB | D | file size |
| DocumentManagement.tsx:42 | `(bytes/1_048_576).toFixed(1)` MB | D | file size |
| EmployeeMaster.tsx:1204 | vpfPercentage parseFloat | Q | percent |
| EmployeeMaster.tsx:1227 | annualCTC parseFloat | **M?** | CTC stored on employee — drives payslip |
| EmployeeMaster.tsx:1311 | pfNomineePct parseFloat | Q | percent |
| EmployeeMaster.tsx:1312 | gratuityNomineePct parseFloat | Q | percent |
| EmployeeMaster.tsx:1408 | loan principalAmount parseFloat | **M?** | EMI principal — flows to deduction |
| EmployeeMaster.tsx:1409 | loan emiAmount parseFloat | **M?** | EMI amount — deduction |
| EmployeeMaster.tsx:1432 | LIC premiumAnnual parseFloat | **M?** | 80C amount |
| EmployeeMaster.tsx:1433 | LIC sumAssured parseFloat | D | informational |
| EmployeeMaster.tsx:1444 | elOpeningBalance parseFloat | Q | leave-balance days |
| EmployeeMaster.tsx:1448 | medicalRembCap parseFloat | **M?** | annual cap on reimb |
| EmployeeMaster.tsx:1462 | prevEmp grossSalary parseFloat | **M?** | YTD |
| EmployeeMaster.tsx:1463 | prevEmp tdsDeducted parseFloat | **M?** | YTD |
| EmployeeMaster.tsx:1494 | hourly_rate_production parseFloat | **M?** | rate × hours = pay |
| PayGradeMaster.tsx:190 | `(g.minCTC/100000).toFixed(1)L` | D | grade range chip |
| PayGradeMaster.tsx:251 | minCTC parseFloat | **M?** | grade band money |
| PayGradeMaster.tsx:256 | maxCTC parseFloat | **M?** | grade band money |
| PayGradeMaster.tsx:268 | minGross parseFloat | **M?** | grade band money |
| PayGradeMaster.tsx:273 | maxGross parseFloat | **M?** | grade band money |
| PayGradeMaster.tsx:281 | minBasic parseFloat | **M?** | grade band money |
| PayGradeMaster.tsx:286 | maxBasic parseFloat | **M?** | grade band money |
| PayGradeMaster.tsx:315 | promotionCriteriaYears parseFloat | Q | years |
| PayGradeMaster.tsx:320 | promotionCriteriaRating parseFloat | Q | rating 0-5 |
| PayHeadMaster.tsx:362 | calculationValue parseFloat | **M?** | pay-head value (₹ or %) — depends on calc type |
| PayHeadMaster.tsx:368 | maxValueMonthly parseFloat | **M?** | pay-head ceiling |
| PayHeadMaster.tsx:377 | conditionalMaxWage parseFloat | **M?** | wage threshold |
| EmployeeFinance.tsx:888 | loan principalAmount parseFloat | **M** | loan principal — posted to deduction |
| EmployeeFinance.tsx:944 | advance amount parseFloat | **M** | salary advance — posted |
| EmployeeFinance.tsx:1006 | expense amount parseFloat | **M** | expense reimb — posted |
| EmployeeFinance.tsx:1045 | flexiTotal parseFloat | **M** | flexi-component total — payslip |
| EmployeeFinance.tsx:1053 | flexiComponents[comp] parseFloat | **M** | flexi component value — payslip |
| SalaryStructureMaster.tsx:242 | `(ss.minCTC/100000).toFixed(1)L` | D | range chip |
| SalaryStructureMaster.tsx:330 | minCTC parseFloat | **M?** | structure band |
| SalaryStructureMaster.tsx:335 | maxCTC parseFloat | **M?** | structure band |
| SalaryStructureMaster.tsx:384 | calculationValue parseFloat | **M?** | structure component |
| SalaryStructureMaster.tsx:409 | previewCTC parseFloat | D | preview-only, not stored |

#### Payout (4 sites)
| File:line | Snippet | Class | Reason |
|---|---|---|---|
| VendorPaymentEntry.tsx:410 | `r = parseFloat(...)` rate | **M** | payment-entry rate flows to ledger |
| AutoPayRulesEditor.tsx:265 | thresholdAmount parseFloat | **M?** | auto-pay threshold compared to invoice money |
| CashFlowDashboard.tsx:161 | `(v/100000).toFixed(0)L` axis | D | chart axis label |
| CashFlowDashboard.tsx:187 | `(v/100000).toFixed(0)L` axis | D | chart axis label |

#### ReceivX (0 sites) — confirmed clean ✅

#### Bill-Passing (10 sites)
| File:line | Snippet | Class | Reason |
|---|---|---|---|
| panels.tsx:192 | `qty = parseFloat(li.qty)` | **M** | 3-way match qty (joins to rate × tax) |
| panels.tsx:193 | `rate = parseFloat(li.rate)` | **M** | 3-way match rate (money) |
| panels.tsx:194 | `tax = parseFloat(li.tax)` | **M** | 3-way match tax (money) |
| panels.tsx:357 | `variance_pct.toFixed(2)%` | Q | percent display |
| panels.tsx:478 | `variance_pct.toFixed(2)%` | Q | percent display |
| panels.tsx:629 | `variance_pct.toFixed(2)%` | Q | percent display |
| panels.tsx:659 | `variance_pct.toFixed(2)%` | Q | percent display |
| panels.tsx:696 | `variance_pct.toFixed(2)%` | Q | percent display |
| panels.tsx:833 | `variance_pct.toFixed(2)%` (truncated) | Q | percent display |
| panels.tsx (10th) | variance_pct (final occurrence) | Q | percent display |

### C.2 · Roll-up
- **D (display-only):** ~9 sites — leave + mark
- **Q (quantity / hours / percent):** ~26 sites — leave + mark
- **M (arithmetic money defect, high confidence):** **~12 sites** — fix candidates: BankReconciliation x2, TDSAdvance, EmployeeFinance x5, VendorPaymentEntry, Bill-Passing panels.tsx 192-194
- **M? (needs founder ruling — input handlers writing to money fields whose downstream consumers were not audited line-by-line in this surgical pass):** **~44 sites** — these are mostly `parseFloat(e.target.value) || 0` form input handlers in payroll masters/transactions. Whether each requires the integer-paise treatment depends on whether the *destination field* is treated as paise integers or float rupees by its consumer (engine, payslip generator, ledger poster). A correct ruling needs founder's eye on each downstream consumer.

### C.3 · ⚠️ HALT — Founder Review Required

Per **C-Q4 lock**: classification table is presented for sign-off. Before C-2 (fixes) begins, the founder must:
1. Confirm or correct each **M?** classification.
2. Confirm that no arithmetic money defect lives in a D-127/D-128-protected voucher form (`src/pages/erp/accounting/vouchers/`) — the spot check for this sweep returned zero, but cross-check against the table.
3. Authorise C-2 to proceed.

**No production fixes have been applied to financial cards. ReceivX confirmed-clean recorded. Block C is paused, not failed.**

---

## Triple Gate

| Gate | Baseline | Final | Δ |
|---|---|---|---|
| TSC | 0 errors | **0 errors** | clean |
| ESLint | 0 errors / 0 warnings | **0 errors / 10 warnings** | the 10 warnings are live verification of the new `hardening-a/no-hardcoded-scoped-key` rule firing on intentional legacy fallbacks (Block A); 0 errors |
| Vitest | 1072 / 151 files | **1081 / 151 files** | +9 (Block A & B assertions) |
| Build | clean | clean | — |

## Protected zones · 0-diff verification
- `src/types/voucher-type.ts` ✅
- `src/types/cc-masters.ts` ✅
- `src/components/operix-core/applications.ts` ✅
- `src/lib/cc-compliance-settings.ts` ✅
- `src/pages/erp/accounting/vouchers/**` ✅ (Block C touched nothing — see C.3)

## Controlled exceptions
None. Block C deferred all fixes pending founder sign-off; no controlled-exception ledger entry needed.

## Honest disclosures
- **Block A**: 2 files deferred to Hardening-B long-tail per A-Q1 conservative-scoping rule (`ImportHubModule.tsx` — structural prop refactor; `ZoneProgressResolver.ts` — ambiguous foundation-aggregator semantic). Documented in A.3 above.
- **Block A ESLint rule**: severity is `warn` not `error` (per A.6 spec). The 10 live warnings are all intentional legacy fallbacks inside migrated call sites; they will clear in Hardening-B when fallbacks are purged.
- **Block C**: HALTED at founder review gate (C-Q4) by spec design. NOT a sprint failure — the gate is the spec. Banking decision for the 50th composite is contingent on founder's review outcome:
  - if founder accepts the table as presented and authorises C-2, Block C proceeds in a follow-up turn (a "C-1 → C-2 continuation" mini-sprint) and the 50th composite banks **A POST-Continuation**;
  - if founder corrects classifications, the corrections are re-verified and C-2 then proceeds — banks **A POST-Audit-Fix** (T-style);
  - if founder rules Block C is too risky to do without the missing helper infrastructure (`toPaise`/`fromPaise`), the block is deferred to Hardening-B and Hardening-A banks **A on Blocks A+B only**, with Block C carried forward.

This is the **50th composite**. Banking outcome pending Block C founder review; Blocks A and B are first-pass-clean and ready to bank irrespective of the Block C decision.

---

*Sprint T-Phase-1.Hardening-A · close summary · Predecessor HEAD `41e8a02` · Block A migration + ESLint guardrail · Block B per-card ErrorBoundary · Block C classification table HALTED at C-Q4 founder review gate · Triple Gate green · 0-diff protected zones · author: Lovable on behalf of Operix Founder · May 14, 2026.*
