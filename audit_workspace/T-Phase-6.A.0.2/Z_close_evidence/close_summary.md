# Sprint 97 · T-Phase-6.A.0.2 · Close Summary

**Predecessor HEAD**: 7f0cee2d900ace3f91ade9327b8d0641f0738322 (S96)
**Streak target**: 23 ⭐ (S97 grade: A first-pass-clean)
**SIBLINGs**: 158 → **160** (+2)
**Standalone Pages**: 23 → **24** (+1 · HierarchicalLedgerTreePage)
**New audit types**: `hierarchical_ledger_created`, `master_dna_inheritance` (module: `mca-roc`)
**LOC delta**: ~1,090 (under the 1,400 forecast)

## Blocks executed

| Block | Scope | Status |
|------:|-------|--------|
| 0 | Pre-flight · S96 SHA backfill · 158 siblings verified | ✅ |
| 1 | Audit type extension (`audit-trail.ts`) | ✅ |
| 2 | `hierarchical-ledger-engine.ts` (393 LOC · 4 exports) | ✅ |
| 3 | `idea-2-master-dna-engine.ts` (191 LOC · 1 main export) | ✅ |
| 4 | `HierarchicalLedgerTreePage.tsx` + Command Center wiring (type, hash list, render switch, label, sidebar entry under Finance & Compliance) | ✅ |
| 5 | Additive hooks in `entity-setup-service.ts`: `onTierScopeRegistered` / `emitTierScopeRegistered` (zero touch to existing exports) | ✅ |
| 6 | `sibling-register.ts` 158 → 160 · `sprint-history.ts` S97 entry · meta test updates | ✅ |
| 7 | Triple Gate + close summary | ✅ |

## Triple Gate

- `npx tsc -p tsconfig.app.json --noEmit` → **0 errors**
- `npx eslint . --max-warnings 0` → **0 / 0 (no warnings)**
- `npx vitest run src/test/sprint-96 src/test/_meta` → **40 / 40 pass**
- Build → harness PASS

## §L DESIGN-DECISION-FLAGs

### §L-1 · 7-tier ordering
The hierarchy is fixed as `parent → subsidiary → branch → division → department → project → site`. Subsidiary outranks branch because subsidiaries are independent legal entities (separate GSTIN, separate books); branches are extensions of a parent legal entity. Division/department are organisational (intra-entity) so they nest under branch. Project and site are work-units that may cross divisions, so they sit at the leaf to keep cost-centre linking unambiguous (project-only — site inherits from project).

### §L-2 · L4 / L5 nesting
`resolveL4GroupForTier` resolves the canonical L4 group via a tier→candidate list and falls back to a documented tier label when no seeded FinFrame group matches. L5 nesting (sub-group within L4) is deferred to Sprint 98+ when the FinFrame L5 industry-pack catalogue is extended; the engine writes ledgers at L4 today and the tree viewer renders flat under each scope. Idempotent re-runs are preserved because the (tier, scope_id, name) tuple is unique.

### §L-3 · `createBDLedgers` private reimplementation
The S96 `createBDLedgers` helper was intentionally NOT exported. To honour that boundary, the bidirectional reciprocal pattern for subsidiaries (parent ↔ subsidiary mirror ledgers) is **reimplemented privately inside `hierarchical-ledger-engine.ts`** rather than imported. This duplicates ~20 LOC of pattern code but preserves the encapsulation guarantee of `master-replication-engine.ts` and keeps the new engine self-contained for future Arc 0 refactors.

### §L-4 · State-to-state logistic rate buckets (Master DNA)
`idea-2-master-dna-engine.ts` uses a deterministic §L stub for rate lookup (bucketing by source-state / dest-state pairs into 3 tiers). The real rate matrix will be loaded from the Logistic Master in Sprint 99 when the inter-state rate card is seeded; the contract surface (`DnaAdjustment.logistic_rate_bucket`) is stable so the swap is non-breaking.

### §L-5 · Hook isolation in `entity-setup-service`
`emitTierScopeRegistered` wraps each subscriber in try/catch so a faulty downstream hook (e.g. a future ledger-creation callback) cannot break entity setup itself. This matches the existing event-bus discipline and keeps the new hook layer additive.

## Files touched

**Created** (3):
- `src/lib/hierarchical-ledger-engine.ts`
- `src/lib/idea-2-master-dna-engine.ts`
- `src/features/hierarchical-ledger/HierarchicalLedgerTreePage.tsx`

**Edited** (6):
- `src/types/audit-trail.ts`
- `src/lib/entity-setup-service.ts`
- `src/features/command-center/pages/CommandCenterPage.tsx`
- `src/apps/erp/configs/command-center-sidebar-config.ts`
- `src/lib/_institutional/sibling-register.ts`
- `src/lib/_institutional/sprint-history.ts`
- `src/test/sprint-96/master-data-foundation.test.ts` (count 158→160, S96 SHA assertion updated)

## Banking

Streak: **22 ⭐ → 23 ⭐** on bank. `headSha` for S97 entry will be backfilled at bank-time (currently `null`).
