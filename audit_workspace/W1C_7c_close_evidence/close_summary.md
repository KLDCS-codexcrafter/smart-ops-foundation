# W1C-7c · Demo Txns — Ops/Support Cluster (Full-Demo Close)

**Sprint:** T-W1C7c-Demo-Txns-Ops-Close
**Predecessor HEAD:** 28507ed
**Method:** identical to W1C-7b — seed rows in the EXACT shape each card's
register reads, demo-tagged (`demo-w1c7c-*`) for `purgeDemoData`, referentially
consistent with the W1C-7b finance chain.

## Per-card seed roster (11 card-domains · single writer)

| # | Card | Primary register key | Rows | Engine read path proven by |
|---|------|----------------------|------|---------------------------|
| 1 | QualiCheck · Inspections | `qaInspectionKey(e)` → `erp_qa_inspections_${e}` | 1 | `qualicheck.test.ts` |
| 1 | QualiCheck · NCR | `ncrKey(e)` → `erp_ncr_${e}` | 1 | `qualicheck.test.ts` |
| 1 | QualiCheck · CAPA | `capaKey(e)` → `erp_capa_${e}` | 1 | `qualicheck.test.ts` (NCR↔CAPA bidirectional) |
| 2 | Dispatch | `dispatchReceiptsKey(e)` → `erp_dispatch_receipts_${e}` | 1 delivered + POD | `dispatch.test.ts` |
| 3 | Logistics | `logisticActivityKey(e)` + `lrAcceptancesKey(e)` | 2 + 1 | `logistics.test.ts` |
| 4 | ProjX | `erp_project_milestones_${e}` | 2 (1 completed + 1 in_progress with EVM) | `projx.test.ts` |
| 5 | ServiceDesk · Tickets | `serviceTicketKey(e)` → `servicedesk_v1_service_ticket_${e}` | 1 | `servicedesk.test.ts` |
| 5 | ServiceDesk · AMC | `amcRecordKey(e)` → `servicedesk_v1_amc_record_${e}` | 1 (linked to ticket) | `servicedesk.test.ts` |
| 6 | DocVault | `erp_documents_${e}` | 2 (contract + engineering drawing) | `docvault.test.ts` |
| 7 | SiteX | orchestrator (DEMO_DELIVERY_MEMOS / asset centres) | declared — no new W1C-7c rows | `sitex.test.ts` |
| 8 | MaintainPro · Equipment | `equipmentKey(e)` → `erp_maintainpro_equipment_${e}` | 1 running | `maintainpro.test.ts` |
| 8 | MaintainPro · WorkOrder | `workOrderKey(e)` → `erp_maintainpro_work_order_${e}` | 1 in_progress PM | `maintainpro.test.ts` |
| 9 | RequestX | `materialIndentsKey(e)` → `erp_material_indents_${e}` | 1 submitted | `requestx.test.ts` |
| 10 | EngineeringX · BOM | `bomKey(e)` → `erp_bom_${e}` | 1 active BOM w/ 2 components | `engineeringx.test.ts` |
| 10 | EngineeringX · Drawings | shared `erp_documents_${e}` (1 drawing) | proven via DocVault read | `engineeringx.test.ts` |
| 11 | Store-Hub | orchestrator (DEMO_STOCK_ISSUES / DEMO_STOCK_RECEIPT_ACKS) | declared — no new W1C-7c rows | `store-hub.test.ts` |

Single writer module: `src/data/demo-transactions-ops-close.ts` —
`seedOpsCloseTxnsForDemo(entityCode)` + `opsCloseDemoKeys(entityCode)`.
Registered as DEMO_MODULES entry `ops-close-txns` in `useDemoSeedLoader.ts`.

## Full-demo coverage capstone

`src/__tests__/w1c-7c/full-demo-coverage.test.ts` — boots a complete demo load
(`seedFinanceProcurementTxnsForDemo` + `seedOpsCloseTxnsForDemo`) then asserts
EVERY primary register key in the SEEDED_ROSTER populates with `.length > 0`.

Roster breakdown (33-card target):
- 21 directly-seeded primary register keys (13 W1C-7c + 8 W1C-7b)
- 10 orchestrator-covered card-domains (SalesX/ReceivX/FinCore/Pay Hub/Field-Force/SiteX/Store-Hub/Inventory/Production/Comply360) — declared in roster constant
- 2 declared-empty Wave-2 personas: GateFlow · WebStoreX (no W1C-7 writer by design)

## Institutional

- `src/lib/_institutional/sprint-history.ts`:
  - W1C-7b `headSha` backfilled: `TBD_AT_BANK` → **`28507ed`**
  - W1C-7c self-seeded: `code: 'T-W1C7c-Demo-Txns-Ops-Close'`, `predecessorSha: '28507ed'`, `headSha: 'TBD_AT_BANK'`, `newSiblings: []`, `loc: 480`
- **ZERO new SIBLINGs** — only new file is the pure-data seed module.

## Gates

| Gate | Result |
|------|--------|
| TSC (`tsc -p tsconfig.app.json --noEmit`) | **0 errors** |
| W1C-7c Vitest (`vitest run src/__tests__/w1c-7c`) | **13 files · 39 tests · 39 PASS** |
| Full Vitest | 866 files passed · 7 failed (8 tests) — **pre-existing failures**, identical to the W1C-7b close set: TBD_AT_BANK narrative-comment counters + vendor-return-engine + servicedesk-shell-routing. NOT introduced by W1C-7c. |
| Triple Gate | Clean for the W1C-7c surface; 0-DIFF on every consumed engine + page + banked surface. |

## Files touched

NEW:
- `src/data/demo-transactions-ops-close.ts`
- `src/__tests__/w1c-7c/_helpers.ts`
- `src/__tests__/w1c-7c/{qualicheck,dispatch,logistics,projx,servicedesk,docvault,sitex,maintainpro,requestx,engineeringx,store-hub,institutional,full-demo-coverage}.test.ts`
- `audit_workspace/W1C_7c_close_evidence/close_summary.md`

EDITED:
- `src/hooks/useDemoSeedLoader.ts` (ops-close-txns module registered)
- `src/lib/_institutional/sprint-history.ts` (W1C-7b backfill + W1C-7c self-seed)

0-DIFF (verified): all card engines + pages · W1C-7a config seed · W1C-7b finance seed · all banked surfaces · all SIBLINGs.

**HEAD:** TBD_AT_BANK (predecessor 28507ed).
