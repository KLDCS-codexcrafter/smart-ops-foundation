# T-Phase-2.B-2 · EximX Medium D-NEWs · Close Summary

## §0 · Sprint
- Name: T-Phase-2.B-2-EximX-MediumDNEWs (Sprint 39 · 3rd of Phase 2)
- Predecessor HEAD: 5628513f
- 3 D-NEWs closed: FA (cross-entity Realisation aggregation) · FB (Hedge accrual · 7th D-NEW-FG consumer) · FE (Form 3CEB · 8th SIBLING)
- 0 production code mutations to 8 canonical engines + 4 B-1 canonical engines + 5 B-1 NEW files

## §1 · Block A · D-NEW-FA
- NEW src/lib/realisation-aggregation-engine.ts (pure helper · READ-ONLY consumer)
- NEW src/pages/erp/eximx/finance/CrossEntityRealisationDashboard.tsx
- ADDITIVE tile in ExportRealisationSaathiPanel.tsx
- export-realisation-engine.ts 0-DIFF preserved

## §2 · Block B · D-NEW-FB (7th D-NEW-FG consumer)
- NEW src/lib/hedge-accrual-engine.ts (Ind AS 109 effectiveness 80-125% band)
- ADDITIVE accrual tile in HedgeContractList.tsx
- ADDITIVE hc-sinha-003 in sinha-tt-hedge-seed-data.ts
- hedge-contract-engine.ts + voucher-runtime-engine.ts 0-DIFF preserved

## §3 · Block C · D-NEW-FE (8th SIBLING)
- NEW src/types/form-3ceb.ts (SIBLING type · FR-26 key form3CEBSnapshotKey)
- NEW src/lib/form-3ceb-engine.ts (PURE HELPER · returns NEW snapshots via spread)
- NEW src/pages/erp/eximx/compliance/Form3CEBDashboard.tsx
- ADDITIVE Form 3CEB tile in ComplianceSaathiPanel.tsx
- 1 NEW FR-26 persistence layer: erp_${entity}_eximx_form_3ceb_snapshots
- tp-benchmarking + form-15ca-15cb + import-po + export-po 0-DIFF preserved

## §4 · Block D · Tests (6 NEW files)
- src/test/eximx-b2/realisation-aggregation-engine.test.ts (6 tests)
- src/test/eximx-b2/hedge-accrual-engine.test.ts (8 tests)
- src/test/eximx-b2/form-3ceb-engine.test.ts (9 tests)
- src/test/eximx-b2/form-3ceb-type.test.ts (5 tests)
- src/test/eximx-b2/cross-entity-realisation-ui.test.ts (3 tests)
- src/test/eximx-b2/form-3ceb-ui.test.ts (4 tests)

## §5 · Invariants preserved
- 8 canonical engines 0-DIFF (voucher-runtime, hedge-contract, tp-benchmarking, export-realisation, form-15ca-15cb, import-po, export-po, month-end-reval)
- 4 B-1 canonical engines 0-DIFF (duty-waterfall, bill-of-entry, cth-history, reconciliation)
- 5 B-1 NEW code files 0-DIFF
- 211 Phase 1 EximX NEW code files 0-DIFF
- package.json + lock files 0-DIFF (16th consecutive)
- 11-file Sinha seed manifest preserved
- TB-1 + B-1 keystone tests stay GREEN
- `as any` / `@ts-ignore` not used in new code

## §6 · App.tsx routing (additive)
- /erp/eximx/finance/cross-entity-realisation → CrossEntityRealisationDashboard
- /erp/eximx/compliance/form-3ceb → Form3CEBDashboard

## §7 · SIBLING progression
- 6 (post B-1) → 8 (this sprint): +1 D-NEW-FG consumer (hedge-accrual) + 1 NEW SIBLING (form-3ceb)

## §8 · D-decisions registered CLOSED
- D-NEW-FA · cross-entity Realisation aggregation
- D-NEW-FB · Forex Hedge accrual (7th D-NEW-FG consumer)
- D-NEW-FE · TP Form 3CEB automation (8th SIBLING)
- Phase 1 EximX-carried D-NEWs now cleared to 0.
