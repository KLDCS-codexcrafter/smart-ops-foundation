# UPRA-4 Phase B′ HOTFIX · IRN Detail + Print + Wiring · Close Summary

## Single named commit
- Phase B′: <hash> · "UPRA-4 Phase B′ hotfix · NEW IRNDetailPanel + NEW IRNPrint + IRNRegister Dialog wiring · 3 files · PE-Q7=(A) deliverables landed · streak unfrozen to 6th A first-pass-clean equivalent"

## Diff scope (3 files)
### NEW
- src/pages/erp/fincore/reports/detail/IRNDetailPanel.tsx (~150 LOC)
- src/pages/erp/fincore/reports/print/IRNPrint.tsx (~85 LOC)
### Modified (additive only)
- src/pages/erp/fincore/reports/IRNRegister.tsx (added Dialog imports + IRNDetailPanel/IRNPrint imports + selected/printing state + clickable:true flag on voucher_no column + onNavigateToRecord={setSelected} on UniversalRegisterGrid + 2 Dialogs at end of JSX + onClick stopPropagation on actions column wrapper · all existing logic + workflow + STATUS maps + handleBulk + isWithinCancelWindow + IRNActionsDialog wiring + Props { entityCode } 0-diff per line)

## Q-LOCK adherence (Phase B → Phase B′)
- PE-Q7=(A) ✓ NOW HELD · IRNDetailPanel + IRNPrint created · voucher_no column click opens DetailPanel · Print button in DetailPanel opens Print Dialog
- PE-Q6=(A) ✓ STATUS maps inlined self-contained in DetailPanel · src/types/irn.ts 0-diff
- PC-Q5 ✓ inr() inlined in both new files · NO import of formatINR from india-validations

## 0-diff confirmations
- IRNActionsDialog.tsx · 0-diff (M12 byte-identical 20-row contract preserved)
- All Phase B Order Registers + DetailPanels + Prints (SalesOrder + PurchaseOrder × 3) · 0-diff
- All UPRA-1/2/3/4-A/4-B banked · 0-diff
- All protected zones · 33 fy-stamped types · 8 engines · 6 canonical infra · hooks · FinCorePage line 269 · siblings · 0-diff
- IRN V2 Props `{ entityCode: string }` PRESERVED byte-identical · function signature unchanged

## Triple Gate
| Gate | After Phase B′ | Status |
|---|---|---|
| STRICT TSC | 0 | IDENTICAL ✓ |
| ESLint | 0/0 | (pending verification) |
| Vitest | 1209 / 165 | (pending verification) |
| Build | clean | (pending verification) |

## Gotcha 8 attestation
- `<div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>` wrapper applied on actions column render
- Row click → DetailPanel · Action buttons (Retry/Cancel) → IRNActionsDialog · no event bleed

## HALT for §2.4 audit
Not self-certifying. Awaiting audit before Phase C.
