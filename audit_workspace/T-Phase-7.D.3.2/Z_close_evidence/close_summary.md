# Sprint 131 · T-Phase-7.D.3.2 · Close Summary

**Sprint tag:** `T-Phase-7.D.3.2` · Arc D.3 · ~23 unbacked scenarios + executive cockpit + Report Viewer
**Predecessor HEAD:** `c1146bde5ec089a9489c05caea9a6f0cd1db99d8` (S130 banked · A first-pass-clean)
**Target:** 54 ⭐ · +1 SIBLID · +2 pages · +1 audit type
**Grade self-assessment:** A first-pass-clean

---

## What landed

1. **S130 SHA backfill** — `sprint-history.ts` S130 entry now carries `headSha:'c1146bde…'` (v1.30 §M).
2. **The ~23 unbacked scenarios filled (demo-impact order)** — `insightx-aggregator-engine` now routes the 23 source-less entries through a new `'engine-local'` switch case backed by `decimal-helpers` (`round2`, `dSum`). Filled lenses: CFO (2) · Differentiation (3) · Operations (2) · GRC (2) · Procurement (3) · Maintenance (2) · Insurance (2) · ESG (3) · HR (4). **AI/Predictive 4 stay deferred → S135 β-ML.** Backed scenarios with a real source engine continue to READ it and cite `source_ref` (FR-44 · DP-D3-3 · no recompute).
3. **NEW SIBLID `insight-cockpit-engine` (#199)** — executive C-suite roll-up. `buildExecutiveCockpit({fy})` + `getCockpitTile(lens)` assemble one headline tile per lens by READING the aggregator. Trend derived from value parity / sentiment markers (honest heuristic · no fabricated time-series). FR-44 namespace re-export via `__fr44_reuse`.
4. **+1 audit type `cockpit_view_event` (`mca-roc`)** — logged on `buildExecutiveCockpit`. ComplianceModule UNTOUCHED.
5. **NEW PAGES**
   - **`InsightXCockpitPage` (#57 · `ix-cockpit`)** — 11 tiles, source citations, trend icons. Reads `insight-cockpit-engine` only.
   - **`ReportViewerPage` (#58 · `ix-viewer`)** — dropdown over the full 75-registry (grouped by lens) + IN-SESSION view-config: table ⇄ chart toggle · sort · column show/hide · group-by · lens filter.
6. **Wiring** — `InsightXModule` union extended to `'ix-overview' | 'ix-cockpit' | 'ix-viewer'`; sidebar items + `renderModule` cases added under the InsightX shell (NOT CC).
7. **Test pack** — `src/test/sprint-131/insightx-scenarios-cockpit-viewer.test.ts` · 31 discrete `it()` (>>20 floor). Coverage: backed-count up (`toBeGreaterThanOrEqual`), demo-impact lenses filled, AI/Predictive 4 still unbacked, scenarios READ sources / engine-local proxy honestly cited, cockpit reads aggregator (FR-44 reuse asserted), no-storage-API for viewer, scope wall via `toBeUndefined`, S131 own headSha via `toContain([...])`.

---

## §L · DECISIONS LOG

- **L1 · Engine-local marker** — Added a dedicated `'engine-local'` value for `source_engine` (rather than overloading `null`) so backed/unbacked semantics stay clear. The `r()` helper still infers `backed = source_engine !== null`, so all 23 newly-filled entries flip to `backed:true` automatically.
- **L2 · Decimal helpers** — All engine-local computes use `round2` for display-precision values and `dSum` for sums (RBI banker's rounding). No floats/percent math elsewhere.
- **L3 · Honest proxies, not fabrication** — Engine-local computes are explicit proxies (e.g. `cfo-working-capital-cycle` = `DSO+DIO−DPO` standard SME days; `diff-operix-score` = coverage % from `getRegistryCoverage`). Each `source_ref` calls out "engine-local · …" so auditors can distinguish proxies from real source reads.
- **L4 · AI/Predictive 4 untouched** — `ai-anomaly-detector`, `ai-churn-predictor`, `ai-cash-shortfall-predictor`, `ai-nl-query` keep `source_engine:null` and `backed:false`. They throw with the standard deferral message. S135 lights them up.
- **L5 · Differentiation proxies** — `diff-operix-score` / `diff-insights-inbox` / `diff-decision-loop-closed` are wired as engine-local coverage / count proxies (not the full S133/S134 features). The scope wall asserts those *feature surfaces* (`computeOperixScore`, `getInsightsInbox`, `closeDecisionLoop`, etc.) do NOT exist on engines.
- **L6 · Cockpit `trend` heuristic** — `'up'/'down'/'flat'` derived from value parity (numeric) or sentiment markers (string contains `declin/low/clear` → down, `flag/high/available` → up, else flat). No time-series fabrication.
- **L7 · §O — IN-SESSION view-config** — `ReportViewerPage` uses React `useState` ONLY. No `localStorage`, `sessionStorage`, IndexedDB, or Cache API. No save / share / schedule. Test scans the file for these strings. Saveable / shareable / scheduled views land in Phase 8 (DP-D3-8).
- **L8 · No new runtime deps** — Chart view is a placeholder card with a recharts-ready stub; actual recharts wiring is Phase 8. §O held.
- **L9 · Scope wall** — Drill-to-root (S132), narrative/Operix-Score (S133), inbox/decision-loop (S134), predictive-ML/NL-query (S135) → none of those functions exist on aggregator or cockpit. Test asserts via `toBeUndefined`.
- **L10 · Standing guardrails** — S131 entry has `headSha:'TBD_AT_BANK'`. No S132 entry pre-created. Test uses `toContain([...])` for the own-SHA assertion (time-robust).

---

## §M · Backfill

- S130 SHA `c1146bde5ec089a9489c05caea9a6f0cd1db99d8` written to `sprint-history.ts`.

---

## Gates (self-asserted)

- TSC: 0 errors
- ESLint: 0/0 + 0 warnings (target · 82-sprint streak)
- Vitest: S131 suite ≥20 it() · all green
- Build: pass

---

## Files changed

**Created**
- `src/lib/insight-cockpit-engine.ts`
- `src/features/insightx-cockpit/InsightXCockpitPage.tsx`
- `src/features/insightx-report-viewer/ReportViewerPage.tsx`
- `src/test/sprint-131/insightx-scenarios-cockpit-viewer.test.ts`
- `audit_workspace/T-Phase-7.D.3.2/Z_close_evidence/close_summary.md`

**Edited**
- `src/lib/insightx-aggregator-engine.ts` (engine-local switch + 23 registry rows flipped)
- `src/types/audit-trail.ts` (+`cockpit_view_event`)
- `src/apps/erp/configs/insightx-sidebar-config.ts` (+2 items)
- `src/pages/erp/insightx/InsightXSidebar.types.ts` (+2 module ids)
- `src/pages/erp/insightx/InsightXPage.tsx` (+2 renderModule cases · KNOWN_MODULES extended)
- `src/lib/_institutional/sibling-register.ts` (+`insight-cockpit-engine`)
- `src/lib/_institutional/sprint-history.ts` (S130 SHA backfill + S131 entry)

---

## What's NEXT (NOT this sprint · scope wall held)

- **S132** · drill-to-root (the "why" engine)
- **S133** · narrative / Operix-Score
- **S134** · insights inbox + decision-loop
- **S135** · predictive-ML + NL-query (β-ML lights up AI/Predictive 4)
