# T-Phase-6.C.2.3 · Sprint 111 · Close Summary (Pre-Bank)

**Sprint**: T-Phase-6.C.2.3 · Arc 3 · Pillar C.2 · Consolidated BS + CF + NCI + Goodwill
**Predecessor HEAD**: `d247e08cdb840605129296409a18c1202d748592` (S110 post-T1 banked)
**HEAD (this sprint)**: TBD_AT_BANK (backfilled at S112 Block 1)

## Deliverables

### Engines (2 NEW SIBLINGs · 178 → 180)
- `src/lib/consolidated-balance-sheet-engine.ts` — buildBalanceSheet · computeNCI · computeGoodwill · computeEntityNetAssets · loadConsolidatedBalanceSheet
- `src/lib/consolidated-cash-flow-engine.ts` — buildCashFlow · classifyCashFlowSection (engine-local) · loadConsolidatedCashFlow

### Page (#39)
- `src/features/intercompany/ConsolidatedFinancialsPage.tsx` — 4 tabs (BS / CF / NCI / Goodwill)
- Sidebar item `fincore-consolidated-financials` (Command Center · type:'item') + CC routing case + label

### Audit types (+2 under module `mca-roc`)
- `consolidated_balance_sheet_run`
- `consolidated_cash_flow_run`

### Registers
- sibling-register: appended consolidated-balance-sheet-engine + consolidated-cash-flow-engine (CONFIRMED)
- sprint-history: S110 headSha backfilled `TBD_AT_BANK` → `d247e08c…` (Block 1); S111 entry added with `TBD_AT_BANK` and predecessor `d247e08c…`; no S112 pre-entry.

### Tests
- `src/test/sprint-111/consolidated-financials.test.ts` (~35 it() blocks · ≥30 floor)
- Updated `src/test/sprint-110/fx-translation.test.ts` registry-hygiene block: count floor `toBeGreaterThanOrEqual(178)`, S110 SHA backfilled to `d247e08c…`, removed stale "no S111 pre-entry" assertion (S111 now exists with TBD).

## §L — Design-Decision Flags

### §L-1 · Equity = L1 'CE' only (no L1 'SR')
`finframe-seed-data` exposes L1 codes `A | L | CE | I | E` only. The token `SR` is an **L2 code** whose `l1Code` is `'CE'` (Suspense & Reconciliation under Capital & Equity), and `'SR'` is also an unrelated voucher prefix elsewhere. There is **no separate L1 'SR'**. The prompt's "SR=reserves L1" reference is therefore void — reserves live as L3 children of L2 `CE-SF` (`RSRV`, `OCI`, etc.) and are recognised under the L1=`CE` bucket. S111 implements **Option α**: consolidated equity = L1==='CE' lines + FCTR-OCI synthetic (S110) + NCI synthetic (this engine). `BalanceSheet.tsx` is mirrored (CE-SF + CE-PP + retained profit). No waiver required.

### §L-2 · Ind AS 7 op/inv/fin classifier ENGINE-LOCAL (cash-flow-engine 0-DIFF)
`cash-flow-engine.ts` is a **treasury projector** (`getCurrentBankBalances`, `computeCashFlowProjection`, `suggestPaymentTiming`, `forecastByWeek`) — it has **no Ind AS 7 op/inv/fin partition** to reuse. Option A's premise ("reuse cash-flow-engine for CF structure") is therefore void. S111 implements `classifyCashFlowSection(ledger_group_code) → 'operating' | 'investing' | 'financing'` **engine-local** inside `consolidated-cash-flow-engine` using the L1/L2 scheme:
- L2 `A-NCA` → investing
- L2 `L-NCL` or L1 `CE` → financing
- L1 `I`/`E` or L2 `A-CA`/`L-CL` → operating
- fallback → operating

FR-44 is **not** violated: there is no pre-existing classifier to duplicate; this is net-new logic in its correct home. **cash-flow-engine stays 0-DIFF · no §H waiver required.** Test pack asserts `cash-flow-engine.ts` source contains no `classifyCashFlowSection` or `buildCashFlow(` and the new engine does not import from `cash-flow-engine`.

### §L-3 · Goodwill `acquisition?` param + current-net-assets fallback
`computeGoodwill({ fy, acquisition?: { entity_id; net_assets_at_acquisition }[] })`. When a sub's acquisition entry is omitted, the engine falls back to parent-share-of-**current**-net-assets (`acquisition_fallback_used: true` flagged per row). This keeps `intercompany-group-structure-engine` 0-DIFF (no new field on `GroupStructureNode` · FR-44 clean) and surfaces the approximation explicitly in the UI badge "§L fallback".

### §L-4 · Ind AS 36 impairment = FLAG not DCF
`impairment_flag` is a heuristic surface indicator (positive goodwill AND current net assets < acquired share). It is **not** a DCF computation — real impairment testing lives outside this engine (S112+). The page renders a `flagged` badge; no value is recorded.

## FR-44 / Scope-Wall Discipline

- BS engine reuses S110 `consolidateWithTranslation` (S109 fallback for unmocked paths). Does **not** re-roll, re-translate, or re-eliminate.
- BS + CF engines do **not** import `fx-what-if-engine` (FR-44 wall preserved).
- CF engine does **not** import `cash-flow-engine` (treasury 0-DIFF wall preserved).
- Scope-wall tests assert `buildXBRL`, `generateDisclosures`, `simulateScenario`, `computeFXScenario` are not exported by either S111 engine; the BS engine does not expose `buildCashFlow` and vice versa.

## Triple Gate (pre-bank · expected on local clone)

- `npx tsc -p tsconfig.app.json --noEmit` → 0
- `npx eslint . --max-warnings 0` → 0/0
- `npx vitest run src/test/sprint-109 src/test/sprint-110 src/test/sprint-111 src/test/_meta` → all pass

## Counters

- Pages: 38 → **39**
- SIBLINGs: 178 → **180** (+2)
- Audit types: +2 (`consolidated_balance_sheet_run`, `consolidated_cash_flow_run`)
- Sprint history: S110 backfilled to `d247e08c`; S111 added with `TBD_AT_BANK`; **no S112 pre-entry**.
