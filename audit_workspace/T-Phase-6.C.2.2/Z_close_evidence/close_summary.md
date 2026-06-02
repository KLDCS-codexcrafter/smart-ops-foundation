# Sprint 110 · T-Phase-6.C.2.2 · Close Summary

**Arc 3 · Pillar C.2 · Multi-Currency Translation (Ind AS 21 / IAS 21)**
Predecessor: `49690f03daa4eb9a42b0279930879b8bf2c3d7e4` · S110 headSha: `TBD_AT_BANK` (backfills at S111 Block 1)

## Deliverables
- **NEW SIBLING #178** `src/lib/fx-translation-engine.ts` — Ind AS 21 Current Rate method (closing → BS, average → P&L, historical → equity, FCTR residual → OCI).
- **NEW Standalone Page #38** `MultiCurrencyTranslationPage` (sidebar `type:'item'` + CC case; not a sibling).
- **+1 audit type** `fx_translation_run` (module `mca-roc`).
- **S109 backfill** `headSha` → `49690f03daa4eb9a42b0279930879b8bf2c3d7e4` (Pass-B final).
- **S110 sprint-history** appended with `TBD_AT_BANK`; no S111 pre-entry.

## §L — Design decisions

### §L.1 — §H WAIVER (S110-only · narrow · backward-compatible)
The user explicitly granted a §H waiver for **one** change to `group-consolidation-engine.ts`:

- Added an **optional** `entityTBProvider?: (entity_id, fy) => EntityTrialBalance` param to `consolidate(input)`.
- Default path (no provider supplied) is **byte-identical** to pre-S110 behaviour — the loop branches on `entityTBProvider ? entityTBProvider(...) : computeEntityTrialBalance(...)`; everything downstream (method scaling, equity roll-up, eliminations, balance check, audit emit) is **unchanged**.
- `computeEntityTrialBalance`, `buildConsolidatedPnL`, `getConsolidationSummary` are 0-DIFF.

**Why B over A:** Option A (mirror S109's ~75-line rollup + method-scaling + equity-line + elimination subtraction inside a wrapper) is the exact FR-44 duplication we avoid — shadow logic that drifts when S109 changes. Trading a 1-line surgical optional-param extension for 75 lines of mirrored math is a clear win on correctness, maintainability, and reviewability. The waiver is narrow, asserted by tests, and §L-documented.

Waiver conditions (all asserted in `src/test/sprint-110/fx-translation.test.ts`):
1. Only the `entityTBProvider` optional param is added — `git diff` shows no other logic/signature changes.
2. Existing S109 sprint-109 tests pass unchanged (default path 0-DIFF).
3. Regression test: `consolidate({fy})` produces identical output across two invocations and matches the legacy 3-entity rollup count.
4. This §L block documents the rationale.

### §L.2 — FR-44 WALL: translation ≠ scenario simulation
`fx-translation-engine` performs **actual** Ind AS 21 translation of real foreign-sub balances; `fx-what-if-engine` is a **scenario simulator** projecting "what if rate ±X%" off a realisation's `realised_rate`. They are distinct concerns:
- The new engine **does NOT** import, call, wrap, or duplicate `fx-what-if-engine`. `fx-what-if` is 0-DIFF.
- Rate data is reused via `dual-rate-engine.loadForexRates` (NOT a parallel rate store), currency master (`world-currencies`), and `idea-1-time-travel-masters-engine.getMasterAsOf` for historical equity rates.
- A grep-style test asserts the engine source contains no `fx-what-if` / `computeFXScenarioForRealisation` / `FXScenario` references.

### §L.3 — Ind AS 21 rate-type mapping
| L1 nature | Classification | Rate type |
|---|---|---|
| `A` / `L` / `SR` / other balance-sheet | `bs` | closing |
| `I` (income) / `E` (expense) | `pnl` | average |
| `CE` (capital/equity) | `equity` | historical |

Refines S109's `classify()` (which buckets equity as BS for orchestration purposes) without modifying it. The S109 hook collapses `equity` back to BS-shaped TBLines for the rollup — the per-line `historical` rate has already been applied at translation time, so this collapse is loss-less.

### §L.4 — FCTR / OCI treatment
After translating every line at its rate-type-specific rate, the residual `dSub(totalDr, totalCr)` represents the exchange difference that must balance the translated TB. Convention:
- `fctr_amount > 0` → translation gain → credited to OCI (`FCTR-OCI` ledger group, credit side).
- `fctr_amount < 0` → translation loss → debited to OCI (`FCTR-OCI`, debit side).
The `translateEntityTB` shim appends this synthetic `FCTR-OCI` BS line so the S109 rollup stays balanced (`dEq` check at engine end).

### §L.5 — Rate-data reuse seam
| Rate | Source | Fallback |
|---|---|---|
| Closing | `loadForexRates(GROUP).standard_rate` | buying → selling → last_voucher → 1 |
| Average | mean of `selling+buying` for latest applicable rate | standard → selling → buying → 1 |
| Historical | `getMasterAsOf({master_type:'ledger', master_key:'forex_<ISO>'})` | closing rate |
INR-functional entities short-circuit to a `(1,1,1)` set.

### §L.6 — S109 integration seam (the consolidation hook)
S109's pre-S110 `consolidate({fy})` walks `listGroupStructure()` internally and produces per-entity TBs through `computeEntityTrialBalance` — there was no external-TB injection point. Hard-rule #5 / AC#12 required a STOP-and-report rather than a silent S109 edit, which we did at Block 0. Per founder ruling, we proceeded with **Option B (§H waiver)** described in §L.1. `consolidateWithTranslation({fy})` is the only S110 caller of the new param; it passes `(id, fy) => translateEntityTB(id, fy)` and otherwise lets S109 do all the rollup/method/elimination work.

### §L.7 — Scope wall (DP-A3-9)
Translation only. Forbidden in S110 (asserted): `buildBalanceSheet`, `buildCashFlow`, `computeNCI`, `computeGoodwill`, `buildDisclosure`, `computeFXScenario`, `simulateScenario`. BS/CF/NCI/Goodwill land in S111; disclosure in S112; scenarios stay in `fx-what-if-engine`.

### §L.8 — Register guardrails
- S110 `headSha = 'TBD_AT_BANK'` (single allowed TBD per §M; meta-guard passes).
- No S111 pre-entry.
- S109 backfilled to the Pass-B final SHA `49690f03…` (NOT a Pass-A checkpoint).
- sibling-register: 177 → 178 (`fx-translation-engine`, single grep, `comply360-tier2` still 1).

## Gates (target)
- TSC: 0 errors · ESLint `--max-warnings 0`: 0/0 · Vitest sprint-110 + sprint-109 + _meta: all pass · Build: PASS.

## Files touched
- **created** `src/lib/fx-translation-engine.ts`
- **created** `src/features/intercompany/MultiCurrencyTranslationPage.tsx`
- **created** `src/test/sprint-110/fx-translation.test.ts`
- **created** `audit_workspace/T-Phase-6.C.2.2/Z_close_evidence/close_summary.md`
- **edited (§H WAIVER · 1 param)** `src/lib/group-consolidation-engine.ts`
- **edited (+1 type)** `src/types/audit-trail.ts`
- **edited (+1 entry · 177→178)** `src/lib/_institutional/sibling-register.ts`
- **edited (backfill S109 + append S110)** `src/lib/_institutional/sprint-history.ts`
- **edited (sidebar #38 + CC wiring)** `src/apps/erp/configs/command-center-sidebar-config.ts`, `src/features/command-center/pages/CommandCenterPage.tsx`
