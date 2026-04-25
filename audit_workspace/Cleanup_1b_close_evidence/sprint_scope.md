# Cleanup-1b Sites In Scope (53 total)

Inventory captured from `npx eslint src` on baseline `fd51170` (Cleanup-1a closed).
Counts: 53 exhaustive-deps · 40 react-refresh · 0 errors.

## Cluster 1 — `handleXSave` useCallback wrapping (12 sites)

| File | Line | Hook | Function |
|---|---|---|---|
| accounting/LedgerMaster.tsx | 2071 | useCallback (L2978 dep) | handleAssetSave |
| accounting/LedgerMaster.tsx | 2262 | useCallback (L2978 dep) | handleCashSave |
| accounting/LedgerMaster.tsx | 2340 | useCallback (L2978 dep) | handleBankSave |
| accounting/LedgerMaster.tsx | 2425 | useCallback (L2978 dep) | handleLiabilitySave |
| accounting/LedgerMaster.tsx | 2480 | useCallback (L2978 dep) | handleCapitalSave |
| accounting/LedgerMaster.tsx | 2551 | useCallback (L2978 dep) | handleLoanRecSave |
| accounting/LedgerMaster.tsx | 2620 | useCallback (L2978 dep) | handleBorrowingSave |
| accounting/LedgerMaster.tsx | 2695 | useCallback (L2978 dep) | handleIncomeSave |
| accounting/LedgerMaster.tsx | 2764 | useCallback (L2978 dep) | handleExpenseSave |
| accounting/LedgerMaster.tsx | 2845 | useCallback (L2978 dep) | handleDutiesTaxSave |
| accounting/LedgerMaster.tsx | 2906 | useCallback (L2978 dep) | handlePayrollStatSave |
| accounting/TransactionTemplates.tsx | 105 | useCallback (L121 dep) | handleSave |

## Cluster 2 — Missing BLANK / FLEXI constant deps (~28 sites — Pattern A default)

| File | Line | Missing dep |
|---|---|---|
| pay-hub/transactions/ContractManpower.tsx | 129 | BLANK_AGENCY |
| pay-hub/transactions/ContractManpower.tsx | 166 | BLANK_WORKER |
| pay-hub/transactions/ContractManpower.tsx | 206 | BLANK_ORDER, computedOrderValue |
| pay-hub/transactions/ContractManpower.tsx | 235 | BLANK_INVOICE |
| pay-hub/transactions/ContractManpower.tsx | 268 | BLANK_ATTENDANCE |
| pay-hub/transactions/DocumentManagement.tsx | 200 | BLANK_DOC |
| pay-hub/transactions/DocumentsAndPolicies.tsx | 101 | BLANK_DOC, nextDocCode |
| pay-hub/transactions/DocumentsAndPolicies.tsx | 136 | BLANK_POL, nextPolCode |
| pay-hub/transactions/EmployeeFinance.tsx | 249 | BLANK_LOAN |
| pay-hub/transactions/EmployeeFinance.tsx | 276 | BLANK_ADV |
| pay-hub/transactions/EmployeeFinance.tsx | 308 | BLANK_EXP |
| pay-hub/transactions/EmployeeFinance.tsx | 348 | FLEXI_COMPONENTS |
| pay-hub/transactions/ExitAndFnF.tsx | 199 | BLANK_EXIT |
| pay-hub/transactions/LearningAndDevelopment.tsx | 128 | BLANK_COURSE |
| pay-hub/transactions/LearningAndDevelopment.tsx | 160 | BLANK_ENROLL |
| pay-hub/transactions/LearningAndDevelopment.tsx | 192 | BLANK_SKILL |
| pay-hub/transactions/LearningAndDevelopment.tsx | 226 | BLANK_CERT |
| pay-hub/transactions/LeaveRequests.tsx | 201 | BLANK_REQ |
| pay-hub/transactions/LeaveRequests.tsx | 222 | BLANK_CO |
| pay-hub/transactions/Onboarding.tsx | 140 | BLANK_JOURNEY_FORM, nextCode |
| pay-hub/transactions/PayrollProcessing.tsx | 73 | BLANK_HOLD |
| pay-hub/transactions/PerformanceAndTalent.tsx | 132 | BLANK_CYCLE |
| pay-hub/transactions/PerformanceAndTalent.tsx | 164 | BLANK_REVIEW |
| pay-hub/transactions/PerformanceAndTalent.tsx | 188 | BLANK_SUCC |
| pay-hub/transactions/PerformanceAndTalent.tsx | 219 | BLANK_COMP |
| pay-hub/transactions/Recruitment.tsx | 132 | BLANK_JR, nextReqCode |
| pay-hub/transactions/Recruitment.tsx | 173 | BLANK_APP, nextAppCode |
| pay-hub/masters/EmployeeMaster.tsx | 179 | uf |

## Cluster 3 — Per-site judgment (13 sites)

| File | Line | Issue | Likely pattern |
|---|---|---|---|
| accounting/vouchers/SalesInvoice.tsx | 476 | missing `customers`, `placeOfSupply` | Pattern A — voucher-adjacent (no save/post change) |
| accounting/vouchers/ReceiptNote.tsx | 83 | unnecessary `inventoryLines` | Pattern B-remove — voucher-adjacent |
| accounting/ComplianceSettingsAutomation.tsx | 426 | missing `groupConfig.enableAutoRCM` | per-site |
| inventory/OpeningStockEntry.tsx | 62 (×3 hooks at 115/165/194) | activeCols conditional definition | Pattern A — wrap activeCols in useMemo |
| pay-hub/transactions/EmployeeExperience.tsx | 259 | unnecessary `today` | Pattern B-remove |
| pay-hub/transactions/EmployeeExperience.tsx | 262 | unnecessary `today` | Pattern B-remove |
| salesx/reports/SalesReturnMemoRegister.tsx | 71 | unnecessary `refreshTick` | Pattern B-suppress (manual refresh tick) |
| salesx/reports/SalesReturnMemoRegister.tsx | 114 | missing `persistAll` | Pattern A |
| salesx/reports/SalesReturnMemoRegister.tsx | 135 | missing `persistAll` | Pattern A |
| salesx/transactions/SalesReturnMemo.tsx | 194 | missing `validate` | Pattern A |
| salesx/transactions/SalesReturnMemo.tsx | 206 | missing `validate` | Pattern A |

Total: 12 + 28 + 13 = **53** ✓
