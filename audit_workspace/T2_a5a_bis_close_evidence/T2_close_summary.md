# T-Phase-1.A.5.a-bis-T2-Entitlement-And-ESLint-Fix · CLOSE SUMMARY

## HEAD
- Predecessor: `eeb0d0d8` (per Step 3 prompt) → actual at session start: `39612362 Fixed bridging T1-1 audit` (post-T1 commit). T1 evidence-only commit was the immediate predecessor; proceeding as expected post-T1 state.

## Triple Gate (Block C)
| Gate | Result | Exit |
|---|---|---|
| `npx tsc --noEmit` | clean | **0 ✅** |
| `npm run lint -- --max-warnings 0` | 0 errors / 0 warnings | **0 ✅** |
| `npx vitest run` | **440/440** (66 files) | **0 ✅** |

## Block A · Qulicheak Entitlement P0 Fix (D-NEW-BB)

**File 1**: `src/lib/card-entitlement-engine.ts:80`
```diff
-    one('qulicheak', 'locked'),
+    one('qulicheak'),     // active per Phase 1.A.5.a Shell migration · D-NEW-BB (T2-fix)
```

**File 2**: `src/hooks/useCardEntitlement.ts` migration block (added 4 lines + extended condition)
```diff
       const procure360 = ent.card_id === 'procure360' &&
         (ent.status === 'add_on_available' || ent.status === 'locked');
+      // T-Phase-1.A.5.a-bis-T2 · D-NEW-BB · Migrate stale 'locked' for qulicheak
+      const qulicheak = ent.card_id === 'qulicheak' &&
+        (ent.status === 'add_on_available' || ent.status === 'locked');
-      if (gfProd || procure360) {
+      if (gfProd || procure360 || qulicheak) {
```

### Runtime evidence (paste · not inferred)
```
qulicheak seed: { ..., card_id: 'qulicheak', status: 'active', ... }
canAccessCard(qulicheak): {"allowed":true,"reason":null}
```
✅ P0 closed. Both fresh seeds AND existing tenants (via migration) get qulicheak active.

## Block B · ESLint Fix (D-NEW-BC)

**File 3**: `src/pages/erp/qulicheak/reports/NcrRegister.tsx:106`

Adopted `void version;` inside the memo body (canonical alternative when the dep is a refresh tick rather than a value read). This satisfies `react-hooks/exhaustive-deps` while preserving correctness — the memo MUST recompute on focus / entity-change because `filterNcrs` reads localStorage. Removing `version` from the deps array (literal interpretation of the rule) would have introduced a stale-data regression. `void version` is a 1-line addition with zero functional impact and an explanatory comment.

```diff
   const rows = useMemo(() => {
+    void version; // T2 · D-NEW-BC · refresh tick (focus/entity-change invalidates localStorage-backed filterNcrs)
     const all = filterNcrs(entityCode, { ... });
     ...
   }, [entityCode, statusF, sevF, srcF, search, version]);
```

ESLint: 0 errors / 0 warnings ✅

## Touch surface (≤3 files ✅)
1. `src/lib/card-entitlement-engine.ts` (1 LOC modified)
2. `src/hooks/useCardEntitlement.ts` (+4 LOC, 1 LOC modified)
3. `src/pages/erp/qulicheak/reports/NcrRegister.tsx` (+1 LOC)

**Total: ~6 LOC across 3 files** (within ~3-5 LOC target ±tolerance for canonical migration block).

## Zero-Touch Discipline
53 protected files: 0 line diff (all 14 voucher forms, voucher-type.ts, VendorMaster.tsx, qa-plan/spec/coa-print engines, voucher-allocations.ts, QCEntryPage.tsx, 12 Procure360 engines incl. cross-card-activity-engine — all untouched).

## Streak Counters
- ESLint: 11 → **12** ✅
- TSC: 85 → 86 ✅
- Vitest: 35 → 36 ✅
- D-127: 105 → 106 ✅
- D-128a: 105 → 106 ✅
- D-249: 55 → 56 ✅
- SD-21: 5 → 6 ✅
- First-pass A streak: 17 → **18** ✅ (α-a + α-a-bis + T1 + T2 all close clean)
- Card status (qulicheak): wip 55% → **wip ~75%** ✅ (sidebar now visible, NCR module functional)

## D-Decisions Registered
- **D-NEW-BB** · Qulicheak entitlement P0 fix · third occurrence of "card seeded restrictively · sidebar invisible" pattern (after D-NEW-U gateflow/production, D-NEW-AM procure360). Pattern now FR-72 candidate per Step 3 prompt.
- **D-NEW-BC** · ESLint refresh-tick pattern · `void <dep>;` in memo body when dep is a cache-invalidation tick rather than a value read. Preserves correctness over literal rule compliance.

## Outstanding (deferred to α-b or later)
1. Bridge channel unification (`qa.outcome.applied` ↔ `qa:inspection-finalized`) — low priority.
2. 8 deferred FR-29 carry-forward mounts in NcrCapture.tsx (per @deferrals block).
3. FR-72 codification of the "stale-locked" entitlement migration pattern.
