# Card #6 Inward Logistic FOUNDATION — Closure Audit v1
**Sprint:** T-Phase-1.2.6f-d-2-card6-6-pre-1
**Date:** 05 May 2026
**Status:** ✅ Closed

## Scope
Foundation for inward logistic flow: vendor arrivals → routing (auto-release / quarantine / inspection / reject) → downstream GRN + QualiCheck linkage. NOT a voucher (D-128). Lives in `src/lib/` (D-127).

## Decisions Honored
- **D-127** — engine in `src/lib/`; finecore-engine.ts NOT touched (sibling discipline).
- **D-128** — InwardReceipt is authorization document, no GL post.
- **D-228** — UTH fields stamped (`effective_date`, `created_by`, `updated_by`, `cancel_reason`, `reference_no`, `voucher_hash`).
- **D-285/286/287/309** — Sibling bridge pattern (`gateflow-inward-bridge.ts`) preserves audited engines BYTE-IDENTICAL.
- **D-302/305** — GateEntry separate from GatePass; IR linked via `gate_entry_id`.

## Deliverables (12 blocks)
| Block | Artifact |
|-------|----------|
| A | `src/types/{inward-receipt,dispatch-receipt,vendor-return}.ts` |
| B | `src/lib/inward-receipt-engine.ts` (CRUD + state machine + routing) |
| C | `src/pages/erp/dispatch/DispatchHubSidebar.tsx` (4 inward modules) |
| D | 4 panels in `src/pages/erp/dispatch/inward/` + page wiring |
| E | `src/lib/gateflow-inward-bridge.ts` (sibling bridge · `'inward_receipt'` linked-voucher type) |
| F | `src/data/demo-inward-data.ts` + orchestrator wiring (3 demo IRs) |
| G | KPI tiles `Inward Receipts` + `In Quarantine` on Dispatch Hub Welcome |
| H | Empty states verified across all 4 panels |
| I | This document |
| J | `src/test/inward-receipt-engine.test.ts` (11 tests · routing + state machine + bridge) |
| Q-gate | TSC clean · Vitest 11/11 new pass |
| Q | `audit_workspace/Sprint_6_pre_1_close_evidence/` |

## Routing Engine
Pure function `decideLineRouting`:
- received_qty ≤ 0 → `rejected`
- has QA plan → `inspection_required`
- received > 1.05× expected → `quarantine`
- otherwise → `auto_release`

## State Machine
```
draft → arrived | cancelled
arrived → quarantine | released | rejected | cancelled
quarantine → released | rejected | cancelled
released | rejected | cancelled → (terminal)
```

## Test Coverage
11/11 passing — routing matrix, status creation, transitions, invalid-transition guard, bridge bidirectional linkage, outward-rejection guard, key namespacing.

## Sibling Discipline Streak
**16 sprints** preserved BYTE-IDENTICAL: `finecore-engine.ts`, `gateflow-engine.ts`, `git-engine.ts`, `inward-receipt-engine.ts`.

## Next
Card #6 Phase 2: GRN auto-creation from released IR · QA closure → IR.qa_inspection_ids backfill · Mobile gate-guard IR scan.
