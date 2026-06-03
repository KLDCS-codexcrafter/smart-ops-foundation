# Sprint 126 · T-Phase-7.D.2.1 · 🎬 Arc D.2 OPENER · Marketing Planning · Close Summary

**Predecessor HEAD:** `23e5eabe0f77c0b0bf179da63770c28725030e6c` (S125 banked · 48 ⭐)
**Streak target:** 49 ⭐ · ESLint STRICT 0/0
**Authority:** DP-P7-2 (MarketingX = SalesX EXTENSION) · DP-D2-1/2/3/6/7/9
**Discipline:** FR-1 · FR-19 · FR-34 · FR-44 · FR-67 · FR-91 · FR-93 · v1.30 §L+§M

---

## Blocks delivered

| Block | Deliverable | Status |
|:--:|---|:--:|
| 0 | Pre-flight: HEAD verified; SalesX registration mechanism confirmed (`SalesXSidebar.types` union + `SalesXSidebar.groups` map + `SalesXPage.renderModule` switch); Campaign/CampaignBudget + fpa-budgeting + salesx-conversion shapes confirmed | ✅ |
| 1 | S125 SHA backfill → `23e5eabe…` (sprint-history.ts line 734) | ✅ |
| 2 | NEW SIBLID **marketing-planning-engine** (~280 LOC): `allocateChannelBudget` · `upsertMarketingPlan` · `listMarketingPlans` · `getCampaignCalendar` · `MARKETING_CHANNELS` · `__fr44_reuse` · `READS_FROM` | ✅ |
| 3 | +1 audit type `marketing_plan_event` under `mca-roc` (ComplianceModule UNTOUCHED) | ✅ |
| 4 | NEW PAGE **MarketingPlanningPage** (#52 · under SalesX) — registered via SalesXModule `sx-marketing-planning` + SalesXSidebar.groups (master tab) + SalesXPage renderModule case (NO new card · NO new shell-config) | ✅ |
| 5 | sibling-register 193 → 194 · sprint-history S126 (`headSha:'TBD_AT_BANK'`) · test pack (≥20 it()) · close summary §L | ✅ |

---

## §L · Design Decisions

1. **SalesX EXTENSION pattern (DP-P7-2 · DP-D2-1 confirmed).** MarketingX surfaces under SalesX through three additive seams only:
   - `SalesXModule` union gets `'sx-marketing-planning'`
   - `SALESX_MODULE_GROUP` maps it to the `master` tab (alongside other plan-side masters)
   - `SalesXPage.renderModule` adds one `case 'sx-marketing-planning'` returning `<MarketingPlanningPage />`
   
   No new card, no new shell-config, no new sidebar-config file. Existing SalesX modules are 0-DIFF.

2. **FP&A budget tie (cross-arc reuse).** `allocateChannelBudget` reconciles `total_budget` to the FP&A `operating` budget for the same FY+entity by calling `fpa-budgeting-engine.listBudgets`. When no FP&A budget exists, `fpa_budget_reference = null` and `reconciles_to_fpa = true` (honest-pass per FR-91 honest claim).

3. **Channel-mix sum-to-100 via `dEq`.** Mix percentages are validated with `dEq(sum, 100, 2)` before any allocation. Rounding drift after `dMul`/`round2` is redistributed onto the last channel so per-channel budgets sum exactly to `total_budget`.

4. **Campaign calendar reads existing Campaign data.** `getCampaignCalendar` reads `campaignsKey(entity)` from storage, maps `CampaignType` → `MarketingChannel`, falls back to `start_date` when `end_date` is null, and filters by FY year prefix. No write path, no shape change to the Campaign type.

5. **FR-44 wall (three-way reuse · all 0-DIFF).** Engine REUSES (does not reimplement) Campaign/CampaignBudget types + `fpa-budgeting-engine` + `salesx-conversion-engine`. The reused symbols are re-exported via `__fr44_reuse` for transparency. Test pack asserts no S126 marker appears in any source file.

6. **Scope wall (DP-D2-9).** Marketing planning only. Lead-scoring/automation (S127), attribution/segmentation (S128), ABM/NPS (S129), and InsightX aggregation (D.3) are explicitly NOT exported; the scope-wall test uses `toBeUndefined` on the engine surface (time-robust).

7. **Lean-behavioral test posture (§N FLOOR ≥20).** ≥20 discrete `it()` blocks. S126 own `headSha` uses `toContain(['TBD_AT_BANK'])` (S121-T1 rule). Sibling-count assertions are `toBeGreaterThanOrEqual`. No `existsSync`-future tombstones. No "no S127 entry" absence checks.

8. **Guardrails 1 + 2.** S126 entry `headSha:'TBD_AT_BANK'`. No S127 entry pre-created.

---

## Triple Gate (per-block)

- TSC `npx tsc -p tsconfig.app.json --noEmit` → 0
- ESLint `npx eslint . --max-warnings 0` → 0/0
- Vitest `src/test/sprint-126 + sprint-125 + _meta` → ALL pass
- Build `npm run build` → PASS

49 ⭐ · 77-sprint ESLint streak held.
