# Sprint 120 · T-Phase-7.D.1.1 · 🎬 Arc D.1 OPENER · Close Summary

**Sprint code:** T-Phase-7.D.1.1
**Predecessor HEAD:** `d7489a054eb592beedc0c636d2034441f8156a1d` (S119 · Arc D.0 capstone)
**LOC actual:** ~1,300 (single-pass; MANDATORY-ASK valve not tripped)
**Streak:** 43 ⭐ A target · ESLint STRICT 0/0/0 warnings (71-sprint streak)

---

## What shipped

| Block | Deliverable | Result |
|:--:|---|:--:|
| 0 | Pre-flight — HEAD verified; LANES Finance ids match (fincore/bill-passing/comply360/payout/receivx, `fpa-planning` absent); `budget-allocation-engine` commit/consume; `org-planning.listStrategicTargets`; `group-consolidation.buildConsolidatedPnL` all confirmed | ✅ |
| 1 | S119 SHA backfilled → `d7489a054eb592beedc0c636d2034441f8156a1d` | ✅ |
| 2 | **UI FIX (S116 carryover):** added `'fpa-planning'` to Finance lane `ids` in `src/pages/erp/Dashboard.tsx` (1 line) — the FP&A/Planning card now actually renders on the ERP dashboard | ✅ |
| 3 | **NEW SIBLID `fpa-budgeting-engine`** (`src/lib/fpa-budgeting-engine.ts`) — operating/capital/cash budgets per org node; budget-vs-actual via consolidated P&L; budget-vs-AOP via S116 StrategicTarget | ✅ |
| 4 | `+1` audit type `budget_event` under `mca-roc` | ✅ |
| 5 | **NEW Standalone Page #47 `BudgetingPage`** (`src/features/budgeting/BudgetingPage.tsx`) — `moduleId:'fpa-planning-budgeting'`, sidebar `type:'item'`, `requiredCards:['fpa-planning']`, CC case wired | ✅ |
| 6 | sibling-register 188 → **189**, sprint-history S120 appended (headSha `'TBD_AT_BANK'`, predecessor `d7489a05…`, newSiblings `['fpa-budgeting-engine']`), test pack `src/test/sprint-120/fpa-budgeting.test.ts` (**31 discrete `it()`**, lean-behavioral), close summary | ✅ |

---

## §L · Design decisions & narrative

- **S116 lane-wiring carryover closed.** `fpa-planning` was registered in `CardId`, `ROLE_DEFAULT_CARDS`, and `applications.ts` in S116, but the ERP Dashboard renders by `LANES` and the Finance lane never listed it — so the card never rendered. S120 Block 2 adds the one-line wiring; existing lane ids are 0-DIFF (additive).
- **FR-44 reuse · 0-DIFF on three source engines.**
  - `budget-allocation-engine` — **pattern reuse only** (commit/consume ledger model). Never imported, never called, never edited. Procurement budget surface stays 0-DIFF.
  - `org-planning-engine` (S116) — `listStrategicTargets` for AOP linkage; `isValidScope` for scope validation (single source of truth on the real org tree).
  - `group-consolidation-engine` (S109) — `buildConsolidatedPnL` is the actuals source for budget-vs-actual; no figure rebuild.
- **Three budget types per org node.** `operating | capital | cash`, idempotent upsert on composite key `{fy, budget_type, scope_level, scope_id}`. Orphan `scope_id` rejected at validation.
- **Decimal-helpers everywhere.** `dAdd / dSub / round2` for budgeted, actual, variance, AOP variance — no float drift; test asserts `0.3 − 0.2 === 0.1`.
- **Honest AOP linkage.** When no `StrategicTarget` matches the scope, `getBudgetVsAOP` returns `aop_target: 0` with `aop_missing: true` rather than fabricating a target (FR-91).
- **Audit.** Single new type `budget_event` (mca-roc). ComplianceModule UNTOUCHED. Logged on upsert + vs-actual + vs-AOP.
- **Scope wall (DP-D1-9).** Engine exports **only** budgeting functions. No `forecast / buildForecast / simulateScenario / computeCost / runDriver / activityBasedCost` — those belong to S121 (forecast), S122-123 (scenario), S124-125 (costing). Asserted via `toBeUndefined` on the engine's own surface (time-robust).
- **Lean-behavioral test posture held.** 31 discrete `it()` (floor 20); `toBeGreaterThanOrEqual` on sibling count; no `existsSync`-future tombstones; no "no S121 entry" absence checks; CALLS-buildConsolidatedPnL asserted via `vi.spyOn`.
- **Honest metrics note.** S120 advances the running totals (43 ⭐ A target, 189 SIBLIDs, 47 pages, 71 audit types). Larger narrative figures (16/16 OOBs, 161/161 statutory obligations, Horizon 1.5) remain NARRATIVE-only per DP-A4-8 — explicitly NOT register-certified by this sprint.

---

## Gates

| Gate | Result |
|:--|:--:|
| TypeScript (`tsc`) | ✅ 0 errors |
| ESLint STRICT (`npx eslint . --max-warnings 0`) | ✅ 0 errors / 0 warnings (71-sprint streak) |
| Vitest S120 + S119 + `_meta` | ✅ 77 / 77 |
| `fpa-budgeting-engine` id greps to | 1 |
| `comply360-tier2-extensions-engine` id greps to | 1 |
| Sibling count | 189 |

Wider-suite legacy failures (sprint-70b/95 hardcoded sidebar counts, sprint-102 "only latest TBD" stale assertion, ESLint-runner-in-vitest timeouts in 80f/81a-d/83/84/85/95) are pre-existing institutional canon-locked tests unrelated to S120 — none touch the files this sprint modified. Phase 7 lean-behavioral posture explicitly avoids re-introducing such brittleness.

---

## Guardrails (verified)

1. ✅ S120 entry `headSha: 'TBD_AT_BANK'` — never a Pass-A SHA.
2. ✅ No S121 entry pre-created.
3. ✅ `budget-allocation-engine`, `org-planning-engine`, `group-consolidation-engine`, `org-structure`, `card-entitlement.ts`, ComplianceModule — all 0-DIFF.
4. ✅ Existing Dashboard.tsx LANES ids 0-DIFF (Block 2 is purely additive).
5. ✅ No new runtime dependencies.

**Next:** Commit + push from local clone and report the new HEAD for the S121 Block 1 backfill.
