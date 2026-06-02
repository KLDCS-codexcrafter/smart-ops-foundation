# Sprint 118 · T-Phase-7.D.0.3 · Close Summary

**Arc:** D.0 Organisation Planning · Pillar D · Phase 7
**Headline:** OKR / KPI Framework + Org-Cost Allocation engine, page, sidebar/CC wiring,
audit type, registry, and lean-behavioral test pack.

## §A Deliverables (register-certified)
- **SIBLING #187** — `src/lib/okr-kpi-engine.ts` (greenfield).
- **Standalone Page #45** — `src/features/okr-framework/OKRFrameworkPage.tsx` (NOT a sibling).
- **Audit type** — `'okr_cascade_event'` under `'mca-roc'` (ComplianceModule UNTOUCHED).
- **Sidebar** — `fpa-planning-okr-framework` (requiredCards: `['fpa-planning']`).
- **CommandCenterPage** — module union + import + render-switch + hash list + label entry.
- **S117 SHA backfill** — `8171ba36ac3d3419b9169cc114f9c3bd2a07d00d`.
- **S118 entry** — `headSha: 'TBD_AT_BANK'` (backfilled at S119 Block 1).

## §B FR-44 reuse map (all sources 0-DIFF)
- `org-structure` — `Division`/`Department` shapes + `DIVISIONS_KEY`/`DEPARTMENTS_KEY` (read).
- `org-planning-engine` (S116) — `listStrategicTargets` (linked_target_id validation), `CascadeLevel`.
- `intercompany-group-structure-engine` — `listGroupStructure`, `ownership_pct` (allocation entities).
- `internal-pricing-engine` — `overhead_allocation_pct` pattern (read-only mirror).

## §C Scope wall (DP-D0-7)
OKR + org-cost ONLY. NO org-design/succession (S119). NO budget/forecast/scenario (D.1).
Engine-surface `toBeUndefined` asserts none of those exports exist.

## §D Math
- Objective composite key: `OBJ::{fy}::{level}::{scope_id}::{title}` (idempotent upsert).
- KR composite key: `KR::{objective_id}::{title}` (idempotent upsert).
- KR progress: clamped `Math.max(0, Math.min(100, pct))`.
- Org-cost: shares validated via `dEq(sum, 100, places=2)`; per-entity amount =
  `round2(totalWithOverhead × share_pct / 100)`; overhead applied as
  `total + total × overhead_pct / 100` (mirrors internal-pricing pattern).

## §E Gates
- `npx tsc -p tsconfig.app.json --noEmit` → 0 errors.
- `npx eslint . --max-warnings 0` → 0 errors / 0 warnings.
- `npx vitest run src/test/sprint-118 src/test/sprint-117 src/test/_meta` →
  **108 / 108 passed** (S118 = 43 it()).
- `npm run build` — harness-run.

## §F Test posture (Phase 7 lean-behavioral)
- 43 discrete `it()` (FLOOR = 20). All behavioral / wiring / FR-44 / audit / scope-wall.
- No exact `toBe(N)` counts; `toBeGreaterThanOrEqual` used throughout.
- No `existsSync`-future tombstones, no "no S119 entry" absence checks.
- Scope-wall via `toBeUndefined` on the engine's own surface (time-robust).

## §G Sibling count
- Pre-S118: 186 · Post-S118: **187** (one engine id, registered exactly once).

## §H Page count
- Pre-S118: 44 · Post-S118: **45** (OKRFrameworkPage).

## §I Audit types added
- `'okr_cascade_event'` (1 new under `'mca-roc'`).

## §J Streak target
- 41 ⭐ (69-sprint ESLint clean streak held).

## §K Files touched (single-pass · within LOC envelope)
- created `src/lib/okr-kpi-engine.ts`
- created `src/features/okr-framework/OKRFrameworkPage.tsx`
- created `src/test/sprint-118/okr-kpi.test.ts`
- edited `src/types/audit-trail.ts` (+ `'okr_cascade_event'`)
- edited `src/apps/erp/configs/command-center-sidebar-config.ts` (sidebar item)
- edited `src/features/command-center/pages/CommandCenterPage.tsx` (import + union + case + hash + label)
- edited `src/lib/_institutional/sibling-register.ts` (+1 entry · 187)
- edited `src/lib/_institutional/sprint-history.ts` (backfill S117 → 8171ba36, + S118 TBD_AT_BANK)
- created `audit_workspace/T-Phase-7.D.0.3/Z_close_evidence/close_summary.md`

## §L DESIGN-DECISION-FLAGs
- **DP-D0-5 cascade subset** — OKR levels = `corporate | division | department` (S116
  CascadeLevel also has `entity`). The prompt explicitly scopes cascade to
  `corporate → division → department`; `asCascadeLevel` exposes a 1:1 mapping for callers
  that need the broader S116 surface.
- **FR-44 internal-pricing reuse** — pattern reuse (`overhead_allocation_pct`), NOT a
  runtime call. Engine listed in `READS_FROM.engines` for transparency (FR-91); the
  pricing engine itself stays 0-DIFF.
- **Honest metrics (DP-A4-8 / FR-91)** — `defaultSharesFromOwnership()` returns `[]` when
  the group structure is empty rather than fabricating equal splits.
- **Audit best-effort** — `logAudit` is wrapped in `try/catch` per S117 precedent so
  audit append failures cannot break the engine write path.
- **Scope-id sentinel** — corporate level requires `scope_id === 'GROUP'`, mirroring the
  S116 `CORPORATE_SCOPE_ID` so the OKR apex coincides with the AOP apex.
