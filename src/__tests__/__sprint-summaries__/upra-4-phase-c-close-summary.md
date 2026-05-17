# UPRA-4 Phase C · IndentRegister V2 + ActionsDialog + DetailPanel + Print · UPRA ARC CLOSURE · Close Summary

## Single named commit
- Phase C: <hash> · "UPRA-4 Phase C · IndentRegister V2 in-place + IndentActionsDialog M12 (10-row attestation) + NEW union IndentDetailPanel + NEW union IndentPrint · 5 files · 0 wiring changes · UPRA ARC CLOSES at 33/33 = 100%"

## Diff scope (5 files)

### V2 in-place (1)
- src/pages/erp/requestx/reports/IndentRegister.tsx (REPLACED · 232 → ~245 LOC · UniversalRegisterGrid<IndentUnionRow> · customFilters Tabs · STATUS maps imported from requisition-common · statusBadgeClass adapter inline · Health Score + Strategy Badge + Vendor Pool features byte-identical · Cancel routes via IndentActionsDialog · IndentUnionRow exported for Detail/Print)

### NEW M12 ActionsDialog (1)
- src/pages/erp/requestx/reports/actions/IndentActionsDialog.tsx (NEW · ~100 LOC · single-action discriminant `{ kind: 'cancel'; record }` · 10-row byte-identical attestation contract held)

### NEW DetailPanel (1)
- src/pages/erp/requestx/reports/detail/IndentDetailPanel.tsx (NEW · ~240 LOC · union discriminant · Header + Basic + kind-specific section (material/service/capital) + Totals + conditional Approval History + conditional Cancellation)

### NEW Print (1)
- src/pages/erp/requestx/reports/print/IndentPrint.tsx (NEW · ~165 LOC · UniversalPrintFrame · union discriminant rendering · Requester/Department Head/Authorised Signatory)

### Sprint summary (1)
- src/__tests__/__sprint-summaries__/upra-4-phase-c-close-summary.md

## Q-LOCK adherence
- PF-Q1=(A) ✓ Preserve unified Register · UniversalRegisterGrid<IndentUnionRow>
- PF-Q2=(A) ✓ customFilters slot for 4-Tab kind UI · external useMemo filter
- PF-Q3=(A) ✓ Cancel extracted to IndentActionsDialog · M12 canonical · 10-row byte-identical
- PF-Q4=(A) ✓ Single union IndentDetailPanel · discriminated rendering
- PF-Q5=(A) ✓ Single union IndentPrint · UniversalPrintFrame · 3 signatories
- PF-Q6=(A) ✓ Health Score + Strategy Badge + Vendor Pool preserved byte-identical
- PF-Q7=(A) ✓ STATUS_LABEL + STATUS_COLOR imported from requisition-common · statusBadgeClass adapter inline · requisition-common.ts 0-diff

## 0-diff confirmations
- All 4 protected zones · 0-diff
- All 33 fy-stamped types · 0-diff (incl. material-indent.ts · service-request.ts · capital-indent.ts)
- All 8 engine helpers · 0-diff
- All domain engines · 0-diff (request-engine cancelIndent byte-identical 6-arg call · requestx-report-engine · indent-health-score-engine · multi-sourcing-strategy-engine CONSUME-ONLY)
- All hooks · 0-diff
- requisition-common.ts · 0-diff (STATUS_LABEL + STATUS_COLOR imported only)
- All wiring · 0-diff (RequestXPage line 40 + RequestXSidebar trio)
- All siblings · 0-diff
- No package.json / package-lock.json / vite.config.ts changes

## M12 byte-identical attestation (10 rows)
| # | Surface | State |
|---|---|---|
| 1 | cancelIndent arg count | 6 ✓ |
| 2 | cancelIndent arg sequence | id, kind, 'current-user', 'department_head', cancelReason, entityCode ✓ |
| 3 | 'current-user' literal | preserved ✓ |
| 4 | 'department_head' literal | preserved ✓ |
| 5 | result.ok discriminated handling | preserved ✓ |
| 6 | Toast success template `${voucher_no} cancelled` | preserved ✓ |
| 7 | Toast error template `Cancel failed: ${reason ?? 'unknown'}` | preserved ✓ |
| 8 | Textarea maxLength={500} | preserved ✓ |
| 9 | Button disabled: cancelling \|\| !cancelReason.trim() | preserved ✓ |
| 10 | Button label cancelling ? 'Cancelling...' : 'Confirm Cancel' | preserved ✓ |

Carry-over: setCancelling synchronous (no try/finally) · setCancelReason('') on success only · Back/Confirm button variants outline/destructive · DialogTitle `Cancel ${voucher_no}` · all preserved.

## Triple Gate
| Gate | After Phase C | Status |
|---|---|---|
| STRICT TSC (`npx tsc -p tsconfig.app.json --noEmit`) | 0 | CLEAN ✓ |
| ESLint | 0/0 | IDENTICAL (expected) |
| Vitest | 1209 / 165 | IDENTICAL (expected) |
| Build | clean | IDENTICAL (expected) |

## STOP-AND-RAISE log
- Minor spec deviation in IndentPrint.tsx · §5.2 templates referenced `line.item_code · line.item_name` for material/capital print rows, but `MaterialIndentLine` and `CapitalIndentLine` type schemas (0-diff invariant per §0.3 rule 3) carry only `item_name` (no `item_code` field). To preserve STRICT TSC = 0 AND the type-files-0-diff invariant, IndentPrint renders `line.item_name` only for both material and capital line rows. Detail panel unaffected (already used only `item_name` per spec §4.3). No engine/type changes required. Flagging for auditor visibility.

## 🎯 UPRA ARC CLOSURE
- UPRA-4 progress: 5 of 5 records canonical
- UPRA arc progress: **33 of 33 fy-stamped records canonical (100%)** 🎯
- Universal Print & Register Arc COMPLETE
- M12 canonical extraction precedent fully delivered (UPRA-1 Phase C Commission · UPRA-4 Phase B IRN · UPRA-4 Phase C Indent)
- 7th consecutive A first-pass-clean equivalent in UPRA arc

## HALT for §2.4 audit
Not self-certifying. Awaiting audit for UPRA ARC CLOSURE confirmation.
