# W1C-8 · SigmaFlow Scenario — Close Summary

**Sprint:** `T-W1C8-SigmaFlow-Scenario` · Wave-1 Close Arc · 8th `/welcome/scenarios` blueprint
**Predecessor HEAD:** `8ee1757` ("Shipped W1C-7c ops-close seed")
**New HEAD:** `TBD_AT_BANK`
**Grade target:** A · ZERO new SIBLINGs

## What shipped

A new additive `'valve-mfg'` archetype with grounded SIGMA Flow Control India profile + valve-flavored demo data. Seed flows through the existing `seedEntityDemoData` orchestrator — zero new seed logic.

### Block 1 — `valve-mfg` archetype + valve item set
- `src/data/demo-customers-vendors.ts`: extended `DemoArchetype` union → `'trading' | 'services' | 'manufacturing' | 'valve-mfg'`.
- `src/data/demo-items-master.ts`: added `DEMO_ITEMS_VALVE_MFG` (15 items · real HSN/GST) + wired into `itemsForArchetype`.
  - HSN 8481 (valves): butterfly DN100/DN150, sluice DN100 (BS-5163), check DN100, air-release DN80
  - HSN 7307 (fittings): universal coupling, flange adaptor, tapping saddle, repair clamp, 90° bend
  - HSN 7325 (DI castings raw): valve-body blank, disc blank
  - HSN 7222 (SS stem) · HSN 4016 (EPDM seat) · HSN 7318 (M16 fastener set)
  - GST 18% across the set (industrial valves/fittings)

### Block 2 — Valve customers + import vendors
- 4 valve-mfg customers: Kolkata Municipal Corporation (Water Supply), WB PHED, L&T WET (EPC), VA Tech Wabag (EPC).
- 4 valve-mfg vendors: Eastern DI Foundry (Howrah), Sigma Corp USA — Castings Import, Polymech Rubber (EPDM seats), Ludhiana Fastener Works.
- Realistic GSTINs, state codes, addresses; import vendor flagged with empty GSTIN (foreign).

### Block 3 — Flagship DN100 valve BOM
- `src/data/demo-bom-data.ts`: added `DEMO_BOM_VALVE_MFG` — DN100 PN16 DI Butterfly Valve, 5 components referencing Block-1 raw items (body casting, disc casting, SS stem, EPDM seat, M16 fastener set).
- `src/lib/demo-seed-orchestrator.ts`: single conditional swap on the existing `erp_bom_${entity}` write — `archetype === 'valve-mfg' ? DEMO_BOM_VALVE_MFG : DEMO_BOM_HAPPY_PATH`. Existing BOM seed for non-valve archetypes is 0-DIFF.

### Block 4 — 8th blueprint + institutional + tests
- `src/pages/welcome/scenarios/ClientBlueprintsPage.tsx`: added 8th entry `{ id: 'sigmaflow', icon: Gauge, archetype: 'valve-mfg', entityCode: 'SIGMA', ... }` mirroring the existing entry shape. The 7 existing entries are 0-DIFF.
- `src/lib/_institutional/sprint-history.ts`: backfilled W1C-7c `headSha` → `8ee1757`; self-seeded W1C-8 (`predecessorSha: '8ee1757'`, `newSiblings: []`).

## Tests (15/15 pass · 4 files · ONE per block)

```
src/__tests__/w1c-8/items-valve-mfg.test.ts       5 passed
src/__tests__/w1c-8/parties-valve-mfg.test.ts     3 passed
src/__tests__/w1c-8/bom-valve-mfg.test.ts         3 passed
src/__tests__/w1c-8/blueprint-sigmaflow.test.ts   4 passed
```

The blueprint test reads `ClientBlueprintsPage.tsx` source and asserts: (a) all 7 legacy ids present verbatim; (b) NO `archetype: 'valve-mfg'` appears in the pre-`sigmaflow` block (7-unchanged proof); (c) the 8th `id: 'sigmaflow'` entry with `archetype: 'valve-mfg'` is present.

The end-to-end test seeds entity `SIGMA` via `seedEntityDemoData('SIGMA','valve-mfg')` and asserts:
- `erp_inventory_items` contains `VLV-BFV-DN100`
- `erp_bom_SIGMA` contains the DN100 valve BOM
- `customersForArchetype('valve-mfg')` returns municipal/PHED buyers
- `vendorsForArchetype('valve-mfg')` returns an import_supplier

## Gates

- TSC: `npx tsc -p tsconfig.app.json --noEmit` → **0 errors**
- Vitest (W1C-8 suite): **15/15 pass**
- ZERO new SIBLINGs (additive enum value · 4 new data exports · 1 blueprint row · 1 conditional)
- Walls held: `seedEntityDemoData` core logic CONSUMED 0-DIFF · all card engines + pages 0-DIFF · all 7 existing blueprints 0-DIFF · 3 existing archetypes + their data 0-DIFF.

## Files touched

- `src/data/demo-customers-vendors.ts` (union + 4 customers + 4 vendors)
- `src/data/demo-items-master.ts` (15 valve items + `itemsForArchetype` branch)
- `src/data/demo-bom-data.ts` (DN100 valve BOM)
- `src/lib/demo-seed-orchestrator.ts` (1 import + 1 conditional)
- `src/pages/welcome/scenarios/ClientBlueprintsPage.tsx` (Gauge icon import + 8th entry)
- `src/lib/_institutional/sprint-history.ts` (W1C-7c backfill + W1C-8 self-seed)
- `src/__tests__/w1c-8/*.test.ts` (4 new test files)
- `audit_workspace/W1C_8_close_evidence/close_summary.md` (this file)
