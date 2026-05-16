# UPRA-1 · SalesX/Dispatch Domain · Close Summary

## Three sequential commits banked
- HOTFIX-A: wire 6 Phase A Registers · breadcrumbLabels exhaustive · Dispatch sidebar+routing added
- Phase B: sales-return-memo V2 + workflow-shell extraction · behaviour parity attested
- Phase C: commission-register V2 + workflow-shell extraction · TDS+GL byte-identical parity verified

## HOTFIX-A scope
- `src/features/salesx/SalesXPage.tsx`: +3 imports (CustomerOrder/CustomerVoucher/InvoiceDispute RegisterPanel) +3 breadcrumb entries +3 case handlers
- `src/pages/erp/dispatch/DispatchHubSidebar.tsx`: +3 lucide icons (PackageCheck/ClipboardList/FileCheck2) +3 module enum values (`dh-r-dispatch-receipt-register` · `dh-r-packing-slip-register` · `dh-r-pod-register`) +3 REPORTS_ITEMS entries
- `src/pages/erp/dispatch/DispatchHubPage.tsx`: +3 imports +3 case handlers

## Phase B scope
- `src/pages/erp/salesx/reports/SalesReturnMemoRegister.tsx`: REPLACED (399 → ~225 LOC) · UniversalRegisterGrid<SalesReturnMemo> consumer · export name `SalesReturnMemoRegisterPanel` preserved · Props `{ entityCode }` preserved
- `src/pages/erp/salesx/reports/actions/SalesReturnMemoActionsDialog.tsx`: NEW (~195 LOC)
- `src/pages/erp/salesx/reports/detail/SalesReturnMemoDetailPanel.tsx`: NEW (~105 LOC)

### Phase B behaviour parity attestation
- Approve action: PASS · `'pending' → 'approved'` · `approved_by_user='Current User'` · `approval_notes` trim-or-null · toast `Memo ${no} approved` preserved
- Reject action: PASS · ≥10-char validation toast preserved · `'pending' → 'rejected'` · `rejection_reason` trim · toast preserved
- Convert-to-CN action: PASS · `navigate('/erp/accounting/vouchers/credit-note?from_memo=' + id)` preserved verbatim · CN engine not modified
- Send-to-Customer: NOT PRESENT in source-of-truth Register (no helper call existed in original 399-LOC file); no surface added

## Phase C scope
- `src/pages/erp/salesx/reports/CommissionRegister.tsx`: REPLACED (897 → ~325 LOC) · UniversalRegisterGrid<CommissionEntry> consumer · export name `CommissionRegisterPanel` preserved · Props `{ entityCode }` preserved
- `src/pages/erp/salesx/reports/actions/CommissionPaymentDialog.tsx`: NEW (~285 LOC)
- `src/pages/erp/salesx/reports/detail/CommissionDetailPanel.tsx`: NEW (~155 LOC)

### Phase C byte-identical parity attestation
- TDS calc · `round2(dPct(commissionOnReceipt, tds_rate))` · 10000 INR @ 194H (5%) → 500.00 INR · IDENTICAL
- GL posting (Post GL Voucher) · `computeCommissionGL(...)` + `generateVoucherNo('PV', entityCode)` + `postVoucher(pv, entityCode)` · ledger lines / narration / amounts / status: IDENTICAL (lifted verbatim into V2 register)
- Pay Agent bank payout · `round2(dAdd(net_paid_to_date, collection_bonus_amount))` · two ledger lines (party Dr / Bank Cr) · narration / instrument 'NEFT' / from='Bank': IDENTICAL
- tdsDeductionsKey write · Quarter (`getQuarter(payDate)`) / AY (`getAssessmentYear(payDate)`) / `gross_amount`, `nature_of_payment`, `party_pan`, `deductee_type`, `tds_section`, `tds_rate`: IDENTICAL
- 194H threshold (15000) vs default (30000) · YTD aggregate filter (party_id + section + AY + status≠cancelled): IDENTICAL
- comply360SAMKey reads · same call site (loaded once into `samCfg` memo): IDENTICAL
- decimal-helpers calls · `dMul`, `dPct`, `dSub`, `dAdd`, `dSum`, `round2` · no reordering, no substitution: VERIFIED
- generateVoucherNo + postVoucher · same args, same order: VERIFIED
- Deferred: Agent GST Invoice reconciliation (inline-row UI) is not reachable through the V2 register canonical grid. Agent invoice handlers preserved in commission-engine; UI re-entry deferred to a follow-up if required.

## Phase A (banked previously at 8a225cf7)
- 6 Tier-1 NEW Registers + 6 DetailPanels + 6 Prints — preserved 0-diff through HOTFIX-A · Phase B · Phase C
- HONEST DEVIATION: PackingSlipPrint reuse decision was a defensive new file (preserved as-is)

## Triple Gate before/after (STRICT app config)
| Gate | Baseline | After UPRA-1 | Status |
|---|---|---|---|
| TSC (tsconfig.app.json) | 0 errors | 0 errors | IDENTICAL |
| Build | clean | clean | (Lovable harness) |

## 0-diff confirmations
- 4 protected zones (voucher-type, cc-masters, applications, cc-compliance-settings): 0 diff
- decimal-helpers.ts: 0 diff
- vite.config.ts / package.json / package-lock.json: 0 diff
- 33 fy-stamped record-type interfaces: 0 diff
- 8 engine helpers (generateVoucherNo · generateDocNo · resolvePrefix · resolveVoucherType · persistSequenceToRegistry · loadVoucherTypesForResolve · fyForDate · getFY): byte-identical
- UniversalRegisterGrid + UniversalRegisterTypes: 0 diff
- FinCore RegisterGrid + 13 FinCore voucher registers: 0 diff
- 16 already-canonical V2 register consumers: 0 diff
- 18 Phase A files from 8a225cf7: 0 diff

## STOP-AND-RAISE log
- Agent GST Invoice inline-row UI removed from V2 register (does not fit UniversalRegisterGrid canonical grid model). Engine helpers preserved. Re-introduction deferred to follow-up if required.
- All other surfaces clean.
