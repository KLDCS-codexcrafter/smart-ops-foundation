# Sprint 121 · T-Phase-7.D.1.2 · Arc D.1 · FP&A Forecasting · CLOSE SUMMARY

**Predecessor HEAD:** `749907701208bf70e6e1bedb3863b3b7b37b014f` (S120 banked A first-pass-clean · 43 ⭐ · 189 SIBLIDs · 47 pages · ESLint 71)
**Sprint HEAD:** `TBD_AT_BANK` (backfilled at S122 Block 1 per Guardrail 1)
**Streak target:** 44 ⭐ · ESLint STRICT 0/0 (72-sprint streak)
**Disciplines:** FR-1 · FR-19 · FR-34 · FR-44 · FR-67 · FR-91 (honest AI) · FR-93 · v1.30 §L+§M · §O (no new runtime deps)

## §A · Deliverables

| Block | Output | Status |
|--:|---|---|
| 0 | Pre-flight at HEAD `74990770` · demand-forecast / fpa-budgeting / group-consolidation read fns confirmed; no existing revenue/cash forecast engine | ✅ |
| 1 | S120 SHA backfill → `749907701208bf70e6e1bedb3863b3b7b37b014f` (v1.30 §M) | ✅ |
| 2 | NEW SIBLID **`fpa-forecasting-engine`** (~430 LOC · DP-D1-5 honest AI · 3 heuristic methods + declared ML-seam) | ✅ |
| 3 | +1 audit type **`forecast_event`** (mca-roc · ComplianceModule UNTOUCHED) | ✅ |
| 4 | NEW Page #48 **`ForecastingPage`** (sidebar `type:'item'` + CC case · `requiredCards:['fpa-planning']`) | ✅ |
| 5 | sibling-register 189 → **190** · sprint-history S121 (TBD_AT_BANK) · test pack (≥20 lean-behavioral `it()`) · this close-summary | ✅ |

## §B · FR-44 Reuse (all 0-DIFF)

- `demand-forecast-engine` · `listForecasts` — demand history (called, not reimplemented)
- `fpa-budgeting-engine` (S120) · `listBudgets` — plan baseline for forecast-vs-budget
- `group-consolidation-engine` (S109) · `buildConsolidatedPnL` — revenue/cash actuals trend

## §C · Honest AI claim (DP-D1-5 / DP-P7-6)

- Forecasting = **explainable heuristics** (moving-average · linear-trend least-squares · seasonal period-index) over historical actuals.
- `ForecastModelHook` is the **declared ML-interface seam** — a future predictive model implements it WITHOUT engine surgery.
- **NO** live ML training. **NO** new runtime dependencies (§O). The engine imports zero ML libraries (test asserts this with a negative-import sweep covering TensorFlow / ONNX / OpenAI / HuggingFace / brain.js / ml-* / prophet).
- `confidence_note` explains the method and the assumption — never a black-box label.

## §D · Scope wall (DP-D1-9)

Forecasting only. The engine surface deliberately does **NOT** export `simulateScenario` / `runScenario` (S122-123) or `computeCost` / `runDriver` / `activityBasedCost` (S124-125). Asserted via `toBeUndefined` on the engine's own surface (time-robust).

## §E · Lean-behavioral test posture

- File: `src/test/sprint-121/fpa-forecasting.test.ts`
- ≥20 discrete `it()` (FLOOR). Quality > volume.
- Behavioral coverage: 3 heuristic methods compute correctly · ML-seam (default vs custom model) · history CALLS consolidated P&L / demand · forecast-vs-budget reads S120 baseline · `forecast_event` audit · FR-44 reuse · NO ML import · scope-wall via `toBeUndefined`.
- Register/history checks: `toBeGreaterThanOrEqual(190)` · S120 SHA backfilled · S121 carries `TBD_AT_BANK`. NO exact `toBe(N)` counts. NO `existsSync`-future tombstones. NO "no S122 entry" check.

## §F · Wiring

- Sidebar (`command-center-sidebar-config.ts`): new `{ id: 'fpa-planning-forecasting', type: 'item', requiredCards: ['fpa-planning'] }` under the fpa-planning card group.
- `CommandCenterPage.tsx`: imported `ForecastingPage`, added to `CardId` union, hash-init allow-list, label map, and `renderModuleContent` switch.

## §G · §H Zero-touch boundaries (verified)

0-DIFF: `demand-forecast-engine` · `material-wastage-forecaster` · `fpa-budgeting-engine` (S120) · `group-consolidation-engine` (S109) · `ComplianceModule` · all Phase 0-6 + D.0 + S120 engines + pages · `card-entitlement.ts` · Dashboard LANES · all prior sprint-history except the S120 SHA (Block 1) + appended S121 · `comply360-tier2-extensions-engine` register entry stays exactly 1.

Additive only: `src/types/audit-trail.ts` (+1 `forecast_event`) · 1 NEW engine · 1 NEW page + wiring · sibling-register (+1) · sprint-history (S120 SHA + S121 entry) · test file · this close-summary.

## §H · Triple Gate (final)

- TSC 0 · ESLint STRICT `npx eslint . --max-warnings 0` clean · Vitest all-pass · Build PASS.

## §L · Design Decisions

- **DP-D1-5 honest AI** — forecasting is documented as heuristic + seam; the engine `@no-ml` header makes this scannable. The `ForecastModelHook` interface is the contractual extension point.
- **Cash proxy** — without a Statement-of-Cash-Flows readout per FY, cash history uses `profit_before_tax` from `buildConsolidatedPnL` as a deterministic, decimal-safe proxy. The proxy is explicit (`§L`-flagged in the engine source) and replaceable when a per-FY cash output exists.
- **History sourcing** — default historical FY series is the 3 FYs preceding the requested FY (`historyFYs` override supported). This keeps the FR-44 call into `buildConsolidatedPnL` per-FY and the spy assertion deterministic.
- **Forecast persistence** — forecasts are keyed by `FCAST::{fy}::{target}::{method}::{scope_id}` and overwritten on re-generation (idempotent), mirroring the S120 budget composite-key pattern.
- **ML-seam respect** — when `model` is supplied to `generateFPAForecast`, `confidence_note` explicitly names the model so consumers can distinguish heuristic output from external predictor output.

## §M · Guardrails honoured

1. S121 `headSha = 'TBD_AT_BANK'` (never a Pass-A SHA).
2. No S122 entry pre-created.

## §N · Test count

≥20 discrete `it()` across §A-§J (FLOOR · lean-behavioral posture).
