# Sprint 128 · T-Phase-7.D.2.3 · Close Summary

**Arc:** D.2 · MarketingX (SalesX EXTENSION · DP-P7-2)
**Sprint:** T-Phase-7.D.2.3 · Attribution + Segmentation
**Predecessor HEAD:** `2c6f04d2c8590d275222370d23afabb259b84e9b` (S127 banked)
**S128 HEAD:** `TBD_AT_BANK` (backfilled at S129 Block 1)
**Grade target:** **A first-pass-clean** (51st ⭐)

---

## §A · Deliverables
- **Sibling #196** — `src/lib/attribution-engine.ts`:
  - Multi-touch attribution: `last_touch`, `linear`, `time_decay`.
  - Credits sum to 100% (decimal-helpers `dEq` · drift redistributed onto last touch).
  - `getChannelROI` = attributed_revenue ÷ marketing-planning channel spend (divide-by-zero guarded).
  - Touchpoint sources surfaced via `getTouchpointSources` (READS salesx-conversion + marketing-automation).
  - **★ Segmentation REUSES segment-rule-engine** — `buildMarketingSegment` calls `evalRule` AND `evaluateAllSegments`; both paths cross-checked (throws on disagreement). **No second segmentation engine/parser built.**
- **Page #54** — `AttributionSegmentationPage` (3 tabs: Attribution, Channel ROI, Segmentation). Reads engine only.
- **Audit type +1** — `attribution_run` under `mca-roc`. ComplianceModule UNTOUCHED. Segmentation events ride the same type (one new audit type per sprint).
- **SalesX EXTENSION** — `sx-attribution-segmentation` registered in `SalesXSidebar.types`, `SalesXSidebar.groups` (master tab), `SalesXSidebar.tsx` (always-available item), `SalesXPage.tsx` (renderModule case + breadcrumb). Existing modules **0-DIFF**.
- **Backfill** — S127 `headSha` → `2c6f04d2c8590d275222370d23afabb259b84e9b`.
- **Sprint-history** — S128 entry added with `headSha: 'TBD_AT_BANK'`, `newSiblings: ['attribution-engine']`. **No S129 pre-entry.**

## §B · Test pack
`src/test/sprint-128/attribution-segmentation.test.ts` — 41 discrete `it()` (§N FLOOR ≥20):
- A · 3 attribution models · sum-to-100 invariant (×3 models) · credit_value math · empty-touchpoints throw
- B · Channel ROI · divide-by-zero guard · FR-44 read of marketing-planning spend · aggregation
- C · Touchpoint sources reads (FR-44)
- D · ★ Segmentation REUSE assertions — calls evalRule + evaluateAllSegments · NO duplicate parser
- E · FR-44 namespace + imports + no new runtime deps
- F · SCOPE WALL (toBeUndefined) — no ABM/NPS/InsightX exports
- G · SalesX extension registration (5 assertions)
- H · Audit + Registers · sibling count ≥196 · S127 backfill · S128 headSha via `toContain([...])` (NEVER `toBe`)

## §C · Gates
- TSC 0 / ESLint `npx eslint . --max-warnings 0` 0/0 / Vitest pass / Build PASS — verified after each block.

---

## §L · Notes & honest claims

1. **★ DP-D2-5 (the key FR-44 dedup) executed:** Segmentation is implemented by **calling** `segment-rule-engine` (`evalRule` + `evaluateAllSegments`) — no second segmentation engine, no duplicate DSL parser, no second `evalClause`. The engine cross-checks both APIs and throws if they disagree, guarding against silent drift. `segment-rule-engine` stays **0-DIFF**.
2. **Audit type consolidation:** Segmentation events use `attribution_run` rather than a second new audit type — sprint discipline allows only one new audit type per sprint (DP-D2-9). Segmentation audit payload sets `via: 'segment-rule-engine'` for transparency.
3. **Channel ROI honesty:** When `spend = 0` (channel had no marketing-planning allocation) ROI returns `0` rather than `Infinity` or fabricated value. The UI shows `—` so users know it is a guard, not a real datapoint.
4. **Touchpoint assembly:** `getTouchpointSources` surfaces *availability* and *counts* — it does not fabricate touch records. Real attribution callers pass touchpoints assembled from `salesx-conversion-engine` (funnel) + `marketing-automation-engine.fireJourneyStep` results (journey).
5. **Scope wall:** ABM, NPS (S129) and InsightX aggregation (D.3) exports are asserted `undefined` (time-robust). No silent S129 work.
6. **Guardrails:** S128 entry headSha is `'TBD_AT_BANK'` (own-headSha asserted via `toContain([...])`). No S129 pre-entry. Block 1 backfill of S127 SHA verified.
