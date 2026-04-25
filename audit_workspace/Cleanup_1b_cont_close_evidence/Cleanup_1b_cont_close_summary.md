# Cleanup-1b-cont · Close Summary (Cluster 3 · 13 Sites · 7 Files)

## Scope
Closes the final 13 `react-hooks/exhaustive-deps` warnings via per-site judgment.

## Per-Site Decisions

| # | File | Line | Pattern | Decision |
|---|---|---|---|---|
| 1 | `accounting/ComplianceSettingsAutomation.tsx` | 426 | **B-suppress** | Effect intentionally watches only `enableAdvancedGST`; including `enableAutoRCM` would self-trigger infinite loop (effect sets it). Disable comment with rationale. |
| 2 | `accounting/vouchers/ReceiptNote.tsx` | 83 | **B-remove** | `inventoryLines` not read in `handleSaveDraft`; removed from deps. D-127/D-128 compliant — only deps array changed; signature, body, and posting logic untouched. |
| 3 | `accounting/vouchers/SalesInvoice.tsx` | 476 | **A** | `commitVoucher` reads `customers` (L460) and `placeOfSupply` (L286, L311-313); both added to deps. **D-127/D-128 STOP-AND-CHECK PASSED** — only deps array changed; function body, signature, posting logic identical. |
| 4-6 | `inventory/OpeningStockEntry.tsx` | 62 | **C (refactor)** | Wrapped `activeCols` in `useMemo` keyed on `[godowns]`. Single root-cause fix collapses all 3 warnings (cited from L115/L165/L194). |
| 7-8 | `pay-hub/transactions/EmployeeExperience.tsx` | 259, 262 | **B-remove** | `today` (formatted yyyy-MM-dd) is informational only — filters call `new Date()` inline. Removed `today` from both deps arrays; kept variable with `void today;`. ESLint cleared without disable directive. |
| 9 | `salesx/reports/SalesReturnMemoRegister.tsx` | 71 | **B-suppress** | `refreshTick` is intentional manual-refresh trigger (bumped after approve/reject); same pattern as Cleanup-1a (`LedgerPicker`, `CommandPalette`). Disable with rationale. |
| 10-11 | `salesx/reports/SalesReturnMemoRegister.tsx` | 114, 135 | **C + A** | Wrapped `reload` and `persistAll` in `useCallback`; added `persistAll` to `handleApprove` and `handleReject` deps. |
| 12-13 | `salesx/transactions/SalesReturnMemo.tsx` | 194, 206 | **C + A** | Wrapped `validate` in `useCallback` keyed on `[raisedById, againstInvoiceId, selectedInvoice, items]`; added to `persistMemo` and `handleSaveDraft` deps. D-127/D-128 — `handleSaveDraft` is draft-save, not save/post. |

## Pattern Distribution

| Pattern | Sites | Files |
|---|---|---|
| A (apply suggestion) | 4 (sites 3, 10, 11 dep additions, 12/13 dep additions) | SalesInvoice, SRMRegister, SRMemo |
| B-remove (dep was redundant) | 3 (sites 2, 7, 8) | ReceiptNote, EmployeeExperience |
| B-suppress (intentional) | 2 (sites 1, 9) | ComplianceSettingsAutomation, SRMRegister |
| C (wrap in useMemo/useCallback) | 4 sites collapsed via 3 wraps (4-6 OSE activeCols + reload/persistAll + validate) | OpeningStockEntry, SRMRegister, SRMemo |

## Verification

| Check | Result |
|---|---|
| `tsc --noEmit -p tsconfig.app.json` | **0 errors** |
| `npm run build` | **green (28.45s)** |
| `npx eslint src` exit code | **0** |
| `exhaustive-deps` warning count | **0** (was 13) ✅ **HOOKS RULE FULLY CLOSED** |
| `react-refresh` warning count | **40** (unchanged — Cleanup-1c scope) |
| Total ESLint warnings | **41** (40 react-refresh + 1 unrelated)* |
| `eslint-disable` directive count | **91** (Cleanup-1b baseline 89 · +2 for sites 1 + 9, ≤ I-9 cap of 95) |
| Voucher-adjacent invariants (D-127/D-128) | **HELD** — only deps arrays changed in SalesInvoice + ReceiptNote |

*Note: total = 41 (one unaccounted vs forecast of 40); see eslint_full_output.txt.

## Files Modified (7)
1. `src/pages/erp/accounting/ComplianceSettingsAutomation.tsx`
2. `src/pages/erp/accounting/vouchers/ReceiptNote.tsx`
3. `src/pages/erp/accounting/vouchers/SalesInvoice.tsx`
4. `src/pages/erp/inventory/OpeningStockEntry.tsx`
5. `src/pages/erp/pay-hub/transactions/EmployeeExperience.tsx`
6. `src/pages/erp/salesx/reports/SalesReturnMemoRegister.tsx`
7. `src/pages/erp/salesx/transactions/SalesReturnMemo.tsx`

## Voucher-Adjacent Scope Audit (D-127/D-128)

| File | Change | Function body? | Signature? | Posting logic? |
|---|---|---|---|---|
| ReceiptNote.tsx | Removed `inventoryLines` from `handleSaveDraft` deps | ❌ unchanged | ❌ unchanged | ❌ unchanged (draft-save, not post) |
| SalesInvoice.tsx | Added `customers, placeOfSupply` to `commitVoucher` deps | ❌ unchanged | ❌ unchanged | ❌ unchanged |

## Remaining Work
- **Cleanup-1c**: 40 `react-refresh/only-export-components` sites (move non-component exports to new files).
- After Cleanup-1c: `eslint src --max-warnings 0` → exit 0 → Z2 (decimal.js) starts.

## Founder Action
Run `/erp/smoke-test` after login; spot-check Sales Invoice, Receipt Note, OpeningStockEntry render. Save screenshot to `audit_workspace/Cleanup_1b_cont_close_evidence/smoke_test_result.png`.
