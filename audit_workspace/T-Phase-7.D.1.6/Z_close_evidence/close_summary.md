# Sprint 125 · T-Phase-7.D.1.6 · 🏁 Arc D.1 CAPSTONE · Close Summary

**Predecessor HEAD:** `2ff3e426645aff98648ab8d2ccf0b9ba405f535d` (S124 banked · A first-pass-clean)
**New HEAD:** `TBD_AT_BANK` (backfilled at S126 Block 1)
**Streak target:** **48 ⭐**

---

## §L · What shipped

### Block 1 · S124 SHA backfill
`sprint-history.ts` S124 `headSha` → `2ff3e426645aff98648ab8d2ccf0b9ba405f535d` (v1.30 §M MANDATORY).

### Block 2 · NEW SIBLID `advanced-costing-engine` (DP-D1-4 / DP-COSTING-6..8)
Path: `src/lib/advanced-costing-engine.ts`.
- **Job costing** — `computeJobCost(...)`: DM + DL + applied overhead → total + cost/unit (decimal-helpers, divide-by-zero guarded on units=0).
- **Process costing** — `computeProcessCost(...)`: input + conversion / equivalent units → cost/equiv-unit (divide-by-zero guarded on EU=0).
- **Activity-Based Costing (ABC)** — `computeABC(...)`: rate × driver_qty per activity; driver shares computed via **`cost-allocation-engine.computeRatios('by_quantity')`** so reuse is observable to tests.
- **CVP / break-even** — `computeCVP(...)`: contribution margin = sales − variable; CM-ratio = CM / sales; break-even = fixed / CM-ratio; margin of safety = (sales − break-even) / sales. Divide-by-zero guard sets `divide_by_zero_guarded = true` and returns 0 when sales = 0 or CM ≤ 0.
- **Standard-cost base** — when `standard_item_key` is supplied to `computeJobCost`, the engine reads **`operational-costing-engine.getStandardCost`** (S124) as a reference base.
- **Audit** — every compute* emits `advanced_cost_run` under module `mca-roc` via `audit-trail-engine.logAudit`.
- **Storage** — `erp_advanced_costing_jobs` + `erp_advanced_costing_processes` (paste-friendly, idempotent upserts).

### Block 3 · +1 audit type
`'advanced_cost_run'` appended to `AuditEntityType` (`mca-roc`). **ComplianceModule UNTOUCHED.** No other type.

### Block 4 · NEW PAGE `AdvancedCostingPage` (Standalone Page #51)
Path: `src/features/advanced-costing/AdvancedCostingPage.tsx`. Tabs: **Job · Process · ABC · CVP**. Each tab posts to the engine and renders the result decimal-safely. No dead UI — every interactive surface calls the engine.

### Block 5 · Registers + tests + 🏁 Arc D.1 close
- **sibling-register** 192 → **193**; `advanced-costing-engine` inserted exactly once; `comply360-tier2-extensions-engine` still appears exactly once (0-DIFF).
- **FP&A sidebar** — `fpa-planning-sidebar-config.ts` gets a new `type:'item'` entry (`id`/`moduleId`=`fpa-advanced-costing`, `keyboard:'f x'`). `FpaPlanningModule` union extended; `KNOWN_MODULES` set updated; `renderModule()` case added; `FpaHome` tile added (badge `🏁 S125`).
- **sprint-history** — S124 backfilled; S125 entry appended with `headSha:'TBD_AT_BANK'`, `predecessorSha:'2ff3e426…'`, `newSiblings:['advanced-costing-engine']`. **NO S126 entry.**
- **Test pack** — `src/test/sprint-125/advanced-costing.test.ts`, **31 discrete `it()`** spanning behavior, both FR-44 walls, scope wall, page wiring, and time-robust register/history.

---

## FR-44 — TWO WALLS

| Wall | What it protects | Evidence |
|---|---|---|
| **A · Statutory cost-audit** | Advanced costing must NOT touch `comply360-cost-audit-engine` (statutory §148 · CRA-1/2/3/4) | Engine code does not import the cost-audit engine; contains no `CRA_n` / `cost_auditor_appointment` / `fileCRA*` symbols; `comply360-cost-audit-engine.ts` source carries no S125 marker. |
| **B · S124 standard-cost base** | ABC + Job-costing must **reuse**, not reimplement, the S124 standard-cost base + cost-allocation share math | Engine imports `operational-costing-engine.getStandardCost` and `cost-allocation-engine.computeRatios`; reuse surfaced via `__fr44_reuse` namespace; spy proves `computeRatios` is called on every `computeABC`; S124 + cost-allocation source files carry no S125 marker. |

## SCOPE WALL — DP-D1-9

Engine surface asserted via `toBeUndefined`:
`runCampaignROI`, `computeMarketingMix`, `runAttributionAnalysis` (D.2 / MarketingX), and `buildInsightXAggregate`, `computeCrossPillarKPI`, `buildCMODashboard` (D.3 / InsightX). Costing only.

## Lean-behavioral posture (S121-T1 rule)

- S125 own `headSha` assertion uses **`toContain(['TBD_AT_BANK'])`** — never `toBe`.
- Count assertions use `toBeGreaterThanOrEqual(193)` for the sibling register.
- No `existsSync`-future tombstones. No "no S126 entry" absence checks.
- Scope walls are `toBeUndefined` on the live engine surface (time-robust).

## Guardrails

1. S125 `headSha` = `'TBD_AT_BANK'`. ✅
2. No S126 pre-entry. ✅
3. S124 SHA backfilled in Block 1. ✅
4. Sibling count exactly +1; one new id; `comply360-tier2-extensions-engine` count unchanged. ✅
5. ComplianceModule UNTOUCHED; no other audit type added. ✅
6. No new runtime deps. ✅

---

## 🏁 Arc D.1 — COMPLETION NOTE

**Arc D.1 (FP&A) closed.** Six sprints, six clean banks:

| Sprint | Capability | SIBLID | Page |
|---|---|---|---|
| S120 | Operating / Capital / Cash Budgeting | `fpa-budgeting-engine` | #47 BudgetingPage |
| S121 | Revenue / Cash / Demand Forecasting (Honest-AI heuristics + ML seam) | `fpa-forecasting-engine` | #48 ForecastingPage |
| ⭐ S122 | Best/Base/Worst Scenario Modeling (single + consolidated) | `scenario-modeling-engine` | #49 ScenarioModelingPage |
| ⭐ S123 | Scenario Pt2 — FX × revenue × cost matrix + demand + capex (engine extension) | (extension, no new SIBLID) | #49 (extended) |
| S124 | Operational Costing Pt1 — BOM roll-up · standard cost · variance + **A1 FP&A self-owned card** | `operational-costing-engine` | #50 OperationalCostingPage |
| 🏁 S125 | Advanced Costing — Job · Process · ABC · CVP / break-even | `advanced-costing-engine` | #51 AdvancedCostingPage |

**Net delta over Arc D.1:** +5 SIBLIDs (188 → 193) · +5 pages (#47–#51) · FP&A becomes its own self-owned card (its own shell + sidebar + module-switch) under the Comply360 pattern.

⭐ The Moat: multi-entity consolidated scenario orchestration (S122/123) — orchestrates Phase-6 stack (`group-consolidation` + `fx-translation` + `group-eliminations` + `fpa-forecasting`) across entities + currencies, no parallel implementations, all foundations 0-DIFF.

**Next:** Arc D.2 (MarketingX) — Step-1 Alignment ratification required before any D.2 sprint.
