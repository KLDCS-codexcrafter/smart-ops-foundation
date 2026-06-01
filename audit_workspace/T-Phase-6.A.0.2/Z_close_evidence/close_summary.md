# Sprint 97 T1 HOTFIX · T-Phase-6.A.0.2-T1 · Close Summary

**Predecessor HEAD**: f60547106964d8fe1165cc4140a055cf962bef02
**Grade revision**: A first-pass-clean → **A** (T1 surfaced at audit)
**headSha**: null → **TBD_AT_BANK** (filled at S98 Block 1)
**SIBLINGs**: 160 (unchanged)

## Honest disclosure (T1 root cause)

The original S97 close summary overstated completion in two ways:

1. **No sprint-97 test pack existed** — only `src/test/sprint-96/` was updated. AC#21 / FR-34 / §N (≥30 discrete `it()`) was unmet.
2. **Block-5 hooks were wired but never emitted from real creation sites** — `onTierScopeRegistered` / `emitTierScopeRegistered` shipped, but no caller invoked the emitter, so creating a tier in the UI did NOT trigger `createTierLedgers`. End-to-end integration was non-functional.

Both gaps are resolved in this T1.

## Blocks executed

| Block | Scope | Status |
|------:|-------|--------|
| 0 | Locate 6 user-facing tier creation sites (unambiguous) | ✅ |
| 1 | NEW `src/lib/hierarchical-ledger-wiring.ts` (hooks register on import) + additive `emitTierScopeRegistered` calls at all 6 sites + auto-import in `main.tsx` | ✅ |
| 2 | NEW `src/test/sprint-97/hierarchical-master-foundation.test.ts` — 42 discrete `it()` blocks incl. wiring integration test | ✅ |
| 3 | sprint-history S97: grade A first-pass-clean→A, headSha null→TBD_AT_BANK | ✅ |

## Block 0 · creation sites (all unambiguous)

| Tier | Site | Line |
|---|---|---|
| subsidiary | `src/pages/erp/foundation/CompanyForm.tsx` handleSave (entityType==='subsidiary' new-only) | L343-364 |
| branch | `src/pages/erp/foundation/BranchOfficeForm.tsx` handleSave (new-only) | L184-202 |
| division | `src/hooks/useOrgStructure.ts` createDivision | L58-69 |
| department | `src/hooks/useOrgStructure.ts` createDepartment | L93-105 |
| project | `src/hooks/useProjectCentres.ts` createProjectCentre | L50-59 |
| site | `src/lib/sitex-engine.ts` createSite | L34-52 |

## Block 1 · wiring decision (§L)

- **`hierarchical-ledger-wiring.ts`** registers two hooks via `onTierScopeRegistered`:
  - `ledgerHook` → `createTierLedgers` for all 6 user tiers
  - `dnaHook` → `inheritWithDna` ONLY for subsidiary/branch (the tiers that own a separate state context; division/department/project/site inherit state from their parent entity implicitly)
- Module auto-installs on import (`main.tsx` imports for side-effect).
- **§L RELAXATION** of the original S97-2 "existing funcs 0-DIFF" rule: additive `emitTierScopeRegistered(...)` calls are permitted in tier orchestrators (`useOrgStructure`, `useProjectCentres`, `sitex-engine.createSite`, `CompanyForm.handleSave`, `BranchOfficeForm.handleSave`). All emits are NEW-only (guarded by `isNew` / no-edit-path). Existing function signatures and return values are unchanged.
- **Lazy import** (`import('@/lib/entity-setup-service').then(...)`) used in form `handleSave` paths to keep the wiring graph out of render-bundle critical path; hook isolation try/catch already lives in `emitTierScopeRegistered`.
- **`TierScopeRegisteredHook` payload** extended additively with optional `cost_centre` (project-only) and `target_state_code` (sub/branch DNA). Existing emit sites pass nothing extra → 0-DIFF behaviour for them.

## Block 2 · test pack (42 it())

`src/test/sprint-97/hierarchical-master-foundation.test.ts` covers:
- Per-tier ledger creation (all 7 tiers · including parent for completeness)
- Subsidiary bidirectional reciprocity in parent books
- Idempotent re-run (no duplicate ledgers)
- Cost-centre project-only linkage; site named ledgers (no stub)
- `resolveL4GroupForTier` non-empty for every tier + deterministic
- `getTierLedgerTree` shape contract
- DNA: gst_state_code / place_of_supply / TDS routing (194C, 194Q) / logistic state-rate bucket (same-state=0, far=2) / resolved_state shape
- Audit emission of `hierarchical_ledger_created` + `master_dna_inheritance` with both registered under `mca-roc`
- **Integration**: `wireHierarchicalLedgerHooks()` + `emitTierScopeRegistered(...)` actually produces ledgers in `getTierLedgerTree` (proves Block 1 wiring)
- Hook isolation (failing hook does not block others)
- Register integrity: `SIBLINGS.length >= 160` (NOT hardcoded), both new sibling ids present exactly once, S97 entry asserts T-Phase-6.A.0.2 + both new siblings

## Triple Gate

- `npx tsc -p tsconfig.app.json --noEmit` → **0 errors**
- `npx eslint . --max-warnings 0` → **0 / 0**
- `npx vitest run src/test/sprint-97 src/test/sprint-96 src/test/_meta` → **82 / 82 pass** (sprint-97: 42 · sprint-96: 37 · _meta: 3)
- Build → harness PASS

## Cosmetic decision

Sidebar placement of "Hierarchical Ledger Tree" left under **Finance & Compliance** (where ledgers conceptually live), not moved to Foundation & Core. Pure cosmetic; reversible in one line.

## Files touched (this T1)

**Created** (2):
- `src/lib/hierarchical-ledger-wiring.ts`
- `src/test/sprint-97/hierarchical-master-foundation.test.ts`

**Edited** (8):
- `src/main.tsx` (1 side-effect import)
- `src/lib/entity-setup-service.ts` (extend payload type · additive optional fields)
- `src/hooks/useOrgStructure.ts` (emit on createDivision/createDepartment)
- `src/hooks/useProjectCentres.ts` (emit on createProjectCentre)
- `src/lib/sitex-engine.ts` (emit on createSite)
- `src/pages/erp/foundation/CompanyForm.tsx` (emit on new subsidiary)
- `src/pages/erp/foundation/BranchOfficeForm.tsx` (emit on new branch)
- `src/lib/_institutional/sprint-history.ts` (grade A · headSha TBD_AT_BANK · note T1 in comment)

## Banking

Streak: hotfix-grace **preserves 23 ⭐** (T1 hotfix on banked S97 · per institutional canon).
