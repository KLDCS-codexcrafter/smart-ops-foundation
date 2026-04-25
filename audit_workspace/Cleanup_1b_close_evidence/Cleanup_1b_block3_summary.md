# Cleanup-1b · Block 3 (Cluster 2) — Close Summary

## Scope
28 `react-hooks/exhaustive-deps` warnings across 13 pay-hub files where the
missing dep is a **BLANK_*** / **FLEXI_COMPONENTS** / per-site helper
defined inside the component body but semantically stable.

## Strategy
**Pattern B — suppression with rationale.** The BLANK_* objects are
component-scope shape constants (recreated per render but never read for
identity). Adding them to the dep array would either:
- cause infinite re-runs (unstable object identity), or
- require hoisting them to module scope (out-of-scope refactor).

A targeted `// eslint-disable-next-line` comment with rationale is the
correct mechanical fix per the sprint guidance.

## Files modified (13)
| File | Sites |
|---|---|
| pay-hub/transactions/ContractManpower.tsx | 5 |
| pay-hub/transactions/DocumentManagement.tsx | 1 |
| pay-hub/transactions/DocumentsAndPolicies.tsx | 2 |
| pay-hub/transactions/EmployeeFinance.tsx | 4 |
| pay-hub/transactions/ExitAndFnF.tsx | 1 |
| pay-hub/transactions/LearningAndDevelopment.tsx | 4 |
| pay-hub/transactions/LeaveRequests.tsx | 2 |
| pay-hub/transactions/Onboarding.tsx | 1 |
| pay-hub/transactions/PayrollProcessing.tsx | 1 |
| pay-hub/transactions/PerformanceAndTalent.tsx | 4 |
| pay-hub/transactions/Recruitment.tsx | 2 |
| pay-hub/masters/EmployeeMaster.tsx | 1 |
| **Total** | **28** |

## Verification
- `npx tsc --noEmit` → **0 errors**
- `npm run build` → **success in 29.69s**
- `npx eslint src` → **0 errors, 53 warnings**
  - `exhaustive-deps`: 41 → **13** (−28 ✓ Cluster 2 fully cleared)
  - `react-refresh`: 40 (unchanged — out of scope)

## Voucher safety
No voucher-adjacent files touched. No save/post signatures or posting
logic altered. D-127 / D-128 unaffected.

## Remaining work
- **Block 4 (Cluster 3)**: 13 per-site judgment fixes covering vouchers
  (SalesInvoice, ReceiptNote), inventory (OpeningStockEntry), and salesx
  (SalesReturnMemo / Register). Queue in next loop.
