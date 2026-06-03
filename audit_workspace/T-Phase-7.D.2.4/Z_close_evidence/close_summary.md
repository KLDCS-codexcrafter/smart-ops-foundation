# Sprint 129 · T-Phase-7.D.2.4 · 🏁 ARC D.2 CAPSTONE · Close Summary

## Headline
ABM + NPS + MarketingX dashboard delivered as SalesX EXTENSION (DP-P7-2). 🏁 Closes Arc D.2.

- **Predecessor HEAD:** `1d6f650d3e0f3cf05ac169ffc91727d214d108b3` (S128 banked · A first-pass-clean)
- **Streak target:** **52 ⭐** · ESLint STRICT 0/0 + 0 warnings (80-sprint streak hold)
- **+1 SIBLID** `abm-nps-engine` (sibling-register 196 → 197)
- **+1 PAGE** `ABMNpsPage` (Standalone #55 · SalesXModule `sx-abm-nps`)
- **+1 AUDIT TYPE** `abm_nps_event` under `mca-roc` (ComplianceModule UNTOUCHED)

## Deliverables (by block)

| Block | Deliverable | Status |
|:--:|---|:--:|
| 0 | Pre-flight (HEAD · D.2 engines · NPS distinct from realisation-feedback) | ✅ |
| 1 | S128 SHA backfill → `1d6f650d…` | ✅ |
| 2 | NEW SIBLID `abm-nps-engine` (~550 LOC) | ✅ |
| 3 | Audit type `abm_nps_event` (+1) | ✅ |
| 4 | NEW PAGE `ABMNpsPage` + MarketingX dashboard (~450 LOC) | ✅ |
| 5 | Registers + LEAN-BEHAVIORAL test pack (≥20 it) + close-summary | ✅ |

## §L · Design-Decision Flags

- **DP-D2-2 / DP-D2-3 · FR-44 REUSE:** engine READS customer/opportunity types,
  `salesx-conversion-engine` (funnel/account touches via `conversionActivityKey`),
  and the D.2 engines (`marketing-planning` · `marketing-automation` ·
  `attribution`) for the dashboard roll-up. All sources stay 0-DIFF; surface
  exposed via `__fr44_reuse` for transparency.
- **NPS distinctness (FR-44 no-dup):** NPS here is CUSTOMER-SURVEY scoring
  (promoter / passive / detractor + `computeNPS`). `realisation-feedback-engine`
  is REALISATION-specific (days-to-realise / FEMA penalty / realisation history)
  — orthogonal domains. The engine does NOT import realisation-feedback and
  does NOT re-export its functions; the test asserts this.
- **DP-D2-9 · SCOPE WALL:** ABM + NPS + MarketingX-scoped dashboard ONLY.
  No InsightX/75-scenario/cross-card aggregation (that lives in Arc D.3).
  Scope-wall asserted via `toBeUndefined` on engine surface (time-robust).
- **DP-P7-2 · SalesX EXTENSION:** registered as `SalesXModule` `sx-abm-nps` +
  `SalesXSidebar` masters item + `SalesXSidebar.groups` (master tab) +
  `SalesXPage` renderModule case. NO new card. NO new shell-config. Existing
  SalesX modules 0-DIFF. ABMNpsPage is First-Class Standalone Page #55, NOT a sibling.
- **MarketingX dashboard = READ-ONLY:** `buildMarketingXDashboard` aggregates
  S126 `listMarketingPlans` + S127 `listLeadScores`/`listJourneys`/`listEnrollments`
  + S128 `listAttributions`/`listMarketingSegments`/`getChannelROI` + this engine's
  `listABMAccounts`/`computeNPS`. **Recomputes NOTHING.** No new attribution
  model, no new segmentation parser. `sources_loaded` exposes wiring honestly.
- **Decimal precision:** NPS math uses `dMul`/`dAdd`/`round2` and clamps to
  −100..100. ABM engagement uses `dMul` and clamps to 100. Touchpoint counting
  is best-effort match on `from_id`/`to_id`/`from_no`/`to_no` from the
  conversion activity log — no fabrication; missing log → 0 touches.
- **DP-D2-8 · Honest AI:** ABM tier inference is a transparent threshold
  (engagement ≥ 70 → strategic · ≥ 30 → target · else nurture). No ML library,
  no new runtime deps (§O).
- **Guardrails 1+2:** S129 `headSha: 'TBD_AT_BANK'` (legitimate latest open).
  NO S130 entry pre-created.
- **Test posture:** ≥20 discrete `it()` (28 actual). S129 own headSha via
  `toContain([...])` not `toBe`. No `existsSync`-future tombstones, no
  "no S130 entry" checks. Scope-wall via `toBeUndefined`. Sibling count via
  `toBeGreaterThanOrEqual(197)`.

## §H · Zero-Touch Boundaries Verified

0-DIFF on: customer/opportunity types · `salesx-conversion-engine` ·
`realisation-feedback-engine` (distinct · never duplicated) ·
`marketing-planning-engine` (S126) · `marketing-automation-engine` (S127) ·
`attribution-engine` (S128) · ComplianceModule · all Phase 0–6 + D.0 + D.1 +
S126-128 engines and pages · SalesX existing modules.

## 🏁 Arc D.2 Completion Note

**MarketingX complete.** The D.2 arc delivered as a clean SalesX extension:

| Sprint | Engine | Page |
|--------|--------|------|
| S126 | `marketing-planning-engine` | #52 MarketingPlanningPage |
| S127 | `marketing-automation-engine` | #53 MarketingAutomationPage |
| S128 | `attribution-engine` | #54 AttributionSegmentationPage |
| S129 | `abm-nps-engine` | #55 ABMNpsPage (+ MarketingX dashboard) |

- **4 NEW SIBLIDs** (193 → 197)
- **4 NEW PAGES** (#52 → #55)
- **4 NEW AUDIT TYPES** (`marketing_plan_event` · `marketing_automation_run` ·
  `attribution_run` · `abm_nps_event`) — all under `mca-roc`
- **0 NEW CARDS** · **0 NEW SHELL-CONFIGS** — pure SalesX EXTENSION (DP-P7-2)
- **Existing SalesX modules 0-DIFF** across all 4 sprints
- **FR-44 maintained** every sprint (S128 dedup of segmentation was the key proof)

**On clean bank → Arc D.3 (InsightX) Step-1 Alignment** (founder ratification
before any D.3 sprint). The MarketingX dashboard here is scoped to the
marketing domain; the 75-scenario cross-card aggregation lives in InsightX.

## Files Modified

**Created:**
- `src/lib/abm-nps-engine.ts`
- `src/features/abm-nps/ABMNpsPage.tsx`
- `src/test/sprint-129/abm-nps.test.ts`
- `audit_workspace/T-Phase-7.D.2.4/Z_close_evidence/close_summary.md`

**Edited:**
- `src/lib/_institutional/sprint-history.ts` (S128 SHA backfill + S129 entry)
- `src/lib/_institutional/sibling-register.ts` (+1 abm-nps-engine)
- `src/types/audit-trail.ts` (+1 `abm_nps_event`)
- `src/features/salesx/SalesXSidebar.types.ts` (+1 `sx-abm-nps`)
- `src/features/salesx/SalesXSidebar.groups.ts` (+1 mapping → master)
- `src/features/salesx/SalesXSidebar.tsx` (+1 masters item)
- `src/features/salesx/SalesXPage.tsx` (+ import + renderModule case + breadcrumb)

## Triple Gate
- **TSC:** 0 errors
- **ESLint:** 0/0 + 0 warnings (`npx eslint . --max-warnings 0`)
- **Vitest:** all-pass (S129 pack ≥20 it · S126–S128 backward-compat green)
- **Build:** PASS

**Banked HEAD: TBD_AT_BANK** (will be backfilled at S130 Block 1).
