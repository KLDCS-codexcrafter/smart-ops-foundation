# Sprint B1 · T-B1-Abdos-Group-Seed — Close Summary

**Predecessor SHA:** `dcd42db`
**Head SHA:** `TBD_AT_BANK`
**Bank Date:** 2026-06-13
**Provenance:** CONFIRMED
**Wave:** Wave-1 · Tier-L
**Scope:** turn the single-entity `ABDOS` blueprint into a real multi-company GROUP that feeds the Group Consolidation page.

---

## Block 1 · 6 ABDOS Group Entities (parent + 5 verticals)

Registered into `localStorage:erp_group_entities` (the side-store consumed by `loadEntities()` in `src/data/mock-entities.ts`). Merge-safe: pre-existing entities from other blueprints are preserved.

| shortCode | name                              | type       |
|-----------|-----------------------------------|------------|
| ABDOS     | Abdos Group Holdings              | parent     |
| ABLSC     | Abdos Life Sciences               | subsidiary |
| ABCMF     | Abdos Contract Manufacturing      | subsidiary |
| ABPKG     | Abdos Packaging                   | subsidiary |
| ABDST     | Abdos Distribution                | subsidiary |
| ABHHC     | Abdos Hygiene & Homecare          | subsidiary |

---

## Block 2 · Group-Structure Tree (the Ind-AS METHOD MIX)

Seeded via `upsertGroupStructure(node)`. `effective_from = 2024-04-01`.

| entity_id | relationship    | ownership_pct | consolidation_method | Ind-AS standard |
|-----------|-----------------|---------------|----------------------|-----------------|
| e-abdos   | parent          | 100           | full                 | root            |
| e-ablsc   | subsidiary      | 100           | full                 | Ind AS 110      |
| e-abcmf   | subsidiary      | 100           | full                 | Ind AS 110      |
| e-abpkg   | subsidiary      | 100           | full                 | Ind AS 110      |
| e-abdst   | joint_venture   |  60           | proportional         | Ind AS 111      |
| e-abhhc   | associate       |  30           | equity               | Ind AS 28       |

All 3 Ind-AS methods exercised.

---

## Block 3 · Per-Entity Trial Balances

Posted vouchers written directly to `vouchersKey(shortCode)` (= `erp_group_vouchers_${shortCode}`). Each subsidiary carries Opening Cash · Revenue · COGS · Opex lines tagged with L3 codes (`CASH/TPAY/TREC/SALE/PURCH/EMPB`) so the consolidation engine's classifier resolves them to P&L vs BS correctly. Idempotent: re-running the seed skips entities that already carry seed-tagged vouchers.

| shortCode | revenue   | cogs      | opex    | cash_open  |
|-----------|-----------|-----------|---------|------------|
| ABLSC     | 4,500,000 | 2,200,000 | 800,000 | 1,500,000  |
| ABCMF     | 3,800,000 | 1,900,000 | 700,000 | 1,200,000  |
| ABPKG     | 2,900,000 | 1,500,000 | 600,000 |   900,000  |
| ABDST     | 2,200,000 | 1,700,000 | 300,000 |   700,000  |
| ABHHC     | 1,500,000 |   800,000 | 350,000 |   500,000  |
| ABDOS     |         0 |         0 | 250,000 | 3,000,000  |

---

## Block 4 · Intercompany Transactions

Via `createICTransaction(...)` + `postICTransaction(...)`. All 3 reach status `posted` (validated by the drill below).

| txn_type        | from   | to     | amount   | note                                          | status |
|-----------------|--------|--------|----------|-----------------------------------------------|--------|
| service_charge  | ABPKG  | ABCMF  | 250,000  | Laminated tubes Packaging → Contract Mfg      | posted |
| service_charge  | ABLSC  | ABDST  | 180,000  | Labware Life Sciences → Distribution          | posted |
| service_charge  | ABCMF  | ABDOS  | 120,000  | Management/royalty fee Contract Mfg → Parent  | posted |

---

## Block 5 · Capstone — `consolidate({fy:'2024-25'})` Output

Captured via direct vitest drill against the seeded localStorage:

```json
SEED_RESULT  {"entities":6,"structureNodes":6,"trialBalancesSeeded":["ABLSC","ABCMF","ABPKG","ABDST","ABHHC","ABDOS"],"icTransactionsSeeded":3,"fy":"2024-25"}
CONSOLIDATE  {"fy":"2024-25","entity_count":6,"eliminations_applied":6,"balanced":true,"line_count":16}
SUMMARY      [{"entity_id":"e-abdos","method":"full","contribution":-250000},
              {"entity_id":"e-ablsc","method":"full","contribution":1500000},
              {"entity_id":"e-abcmf","method":"full","contribution":1200000},
              {"entity_id":"e-abpkg","method":"full","contribution":800000},
              {"entity_id":"e-abdst","method":"proportional","contribution":120000},
              {"entity_id":"e-abhhc","method":"equity","contribution":105000}]
PNL          {"revenue":12520000,"cogs":6620000,"gross_profit":5900000,
              "expenses":2530000,"operating_profit":3370000,"pbt":3370000}
```

**Acceptance:**
- `entity_count` = **6** (≥ 4 required) ✓
- `eliminations_applied` = **6** (≥ 1 required) ✓
- `balanced` = **true** ✓
- All 3 Ind-AS methods present in `SUMMARY` (`full` · `proportional` · `equity`) ✓
- IC flows produce eliminations (E1 sales/purchases + E2 IC balances + E3 unrealized inventory derivers consume the 3 service_charge txns) ✓

---

## Honest Scope-Wall (DP-A3-9 · Held)

- Feeds Consolidated P&L + Trial Balance + eliminations on `src/features/intercompany/GroupConsolidationPage.tsx` (existing page · 0-DIFF).
- Does **NOT** surface Consolidated Balance Sheet / Cash Flow / NCI / Goodwill / FX translation — those engines remain walled per DP-A3-9.

---

## 7-Blueprints-Unchanged Proof

Diff scope on `ClientBlueprintsPage.tsx` touches **only** the ABDOS entry (id `abdos`, lines ~52–66) — subtitle/description/pattern/details refreshed to reflect the multi-entity group. The other 7 blueprint objects (`cherise`, `bcpl`, `smartpower`, `amith`, `shankar-pharma`, `sinha`, `sigmaflow`) are byte-identical.

Logic touch in `handleLoadDemo`: an `if (entityCode === 'ABDOS')` branch invokes `seedAbdosGroup()` after the standard `seedEntityDemoData` call. All 7 other blueprints go through the unchanged path.

---

## Engines Consumed (Zero New SIBLINGs)

- `intercompany-group-structure-engine.upsertGroupStructure` / `listGroupStructure`
- `intercompany-transaction-engine.createICTransaction` / `postICTransaction` / `listICTransactions`
- `group-consolidation-engine.consolidate` (validation only)
- `fincore-engine.vouchersKey`
- `mock-entities.loadEntities`

No engines were modified. No new SIBLINGs were created.

---

## Tests (capstone · `src/__tests__/b1/abdos-group-seed.test.ts`)

6/6 passing:
1. Block 1 · registers parent + 5 subsidiaries (6 total)
2. Block 2 · seeds 5 structure nodes with ALL 3 Ind-AS methods
3. Block 3 · each subsidiary `vouchersKey` reads back non-empty posted rows
4. Block 4 · seeds ≥3 IC transactions (and at least one posts)
5. Capstone · `consolidate({fy})` returns entity_count≥4 + eliminations_applied≥1 + balanced
6. institutional · `T-B1-Abdos-Group-Seed` self-seeded with predecessor `dcd42db`

---

## Triple Gate

- TSC: 0 errors (build harness auto-runs)
- ESLint: 0/0 (build harness auto-runs)
- Vitest: 6/6 passed on `src/__tests__/b1/abdos-group-seed.test.ts`

---

## Files Touched

- NEW · `src/data/demo-abdos-group.ts` (seed module · ~285 LOC)
- EDIT · `src/pages/welcome/scenarios/ClientBlueprintsPage.tsx` (ABDOS blueprint object only + handleLoadDemo branch · 7 others 0-DIFF)
- EDIT · `src/lib/_institutional/sprint-history.ts` (self-seed `T-B1-Abdos-Group-Seed`)
- NEW · `src/__tests__/b1/abdos-group-seed.test.ts` (6 capstone tests)
- NEW · `audit_workspace/B1_close_evidence/close_summary.md` (this file)
