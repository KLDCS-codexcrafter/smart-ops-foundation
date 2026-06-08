# Sprint B6 · T-B6-Master-Health · Close Summary

**Pillar-B CLOSE** · target 94 ⭐ · ~550 LOC · Predecessor HEAD `46a58b4a`

---

## §0 Identity

| Field | Value |
|---|---|
| Sprint | B6 · T-B6-Master-Health · **PILLAR-B CLOSE** |
| Predecessor | `46a58b4a` ("Added WhatsApp channel engine" · B.3 · 93 ⭐) |
| New SIBLING | **exactly 1** — `master-health-scorecard-engine` |
| LOC | ~550 (reuse-heavy aggregator) |
| Streak | 93 → 94 ⭐ |

---

## §A Block-0 Pre-Flight (evidence)

1. **HEAD equivalence (sandbox lacks git):** working-tree check —
   `src/lib/_institutional/sprint-history.ts` carries B3 row with
   `predecessorSha: 'f6f5fcc9'` and `headSha` flipped this sprint to `46a58b4a`.
   `src/lib/whatsapp-channel-engine.ts` exists. HEAD `46a58b4a` confirmed by
   architect against `origin/main`, June 07 2026.
2. **Greenfield for new work:**
   `grep -rln "master-health-scorecard\|MasterHealthScore" src/` → 0 hits
   prior to this sprint (now 5 hits: engine, types, page, test, two registers).
3. **Reuse spine present (consumed · 0-DIFF):**
   - `src/lib/idea-3-conflict-resolution-engine.ts` exports `scanForDuplicates`
   - `src/lib/idea-9-sleeping-master-detector-engine.ts` exports
     `detectSleepingMasters`, `DEFAULT_DORMANT_DAYS=90`, `DEFAULT_SLEEPING_DAYS=180`
   - `src/lib/master-replication-engine.ts` exports `ALL_MASTER_TYPES` (8 types),
     `MasterType`, `getPreference` (key shape `erp_<entity>_master_repl_pref_<type>`)
   - `src/lib/party-master-engine.ts` exports `loadPartyMaster`, `loadPartiesByType`
   - Drill targets present:
     `src/features/master-visibility/MasterVisibilityHeatmapPage.tsx`,
     `src/features/master-lifecycle/MasterLifecycleWizardPage.tsx`,
     `src/features/command-center/modules/MasterConflictResolutionPanel.tsx`
4. **Incomplete-check field reality (paste · real shapes):**
   - `Party` (`src/types/party.ts`): `gstin: string | null`, `state_code: string | null`,
     `created_via_quick_add: boolean`, `audit_flag_resolved_at: string | null` ✅
   - Ledger via `ledgerDefsKey(e) = 'erp_group_ledger_definitions_${e}'`; rows
     carry `{ id, name, parentGroupCode?, parentGroupId? }` (used for orphan check).
   - `InventoryItem` (`src/types/inventory-item.ts`):
     `hsn_sac_code?: string | null`, `stock_group_id?: string | null`.
   - Email/phone fields are NOT modeled on Ledger or Inventory master shapes →
     incomplete check for those reports `source:'unavailable'` honestly, NEVER a
     fabricated 0%.
5. **CC governance-group pattern:** new module registered under
   `governance-group` in `command-center-sidebar-config.ts` (P8.5/P8.6/B.2 pattern)
   with module switch wired in `CommandCenterPage.tsx`; `applications.ts` 0-DIFF.

---

## §L Score Rubric (transparent · documented in `scoreMasterType`)

```
start at 100
for each check:
  if source === 'unavailable' → -2 (honest visibility penalty, never silent)
  else if severity === 'critical' → -20
  else if severity === 'warn'     → -7
clamp [0, 100]
```

Severity bands:
- **count-based dimensions** (duplicates, sleeping, orphaned, ssot_coverage):
  `0 → ok`, `1..5 → warn`, `>5 → critical`
- **percent-based dimensions** (incomplete %):
  `≤5% → ok`, `≤20% → warn`, `>20% → critical`

Overall score = simple mean of per-master-type scores (rounded).

**Monotonicity proof:** see test
`b6-block-behavioral.test.ts › 'score rubric is monotonic'`
(`sOk > s1 > s2 ≥ 0` for 0, 1, 2 critical findings).

---

## §M Per-dimension provenance ledger (which checks are unavailable-and-why)

| Master type | duplicates | sleeping | incomplete | orphaned | ssot_coverage |
|---|---|---|---|---|---|
| customer       | idea-3 | idea-9 | b6-incomplete (gstin/state_code/unresolved quick-add) | unavailable (no parent ref on Party shape) | b6-replication |
| vendor         | idea-3 | idea-9 | b6-incomplete (gstin/state_code/unresolved quick-add) | unavailable (no parent ref on Party shape) | b6-replication |
| item           | idea-3 | idea-9 | b6-incomplete (hsn_sac_code/stock_group_id) | b6-orphaned (group ref · group master cross-check is Wave-2) | b6-replication |
| ledger         | idea-3 | idea-9 | b6-incomplete (name; integrity via 'orphaned') | b6-orphaned (parentGroupId resolves) | b6-replication |
| stock_group    | idea-3 | idea-9 | unavailable (model not defined at this tier) | unavailable | b6-replication |
| stock_category | idea-3 | idea-9 | unavailable | unavailable | b6-replication |
| voucher_type   | idea-3 | idea-9 | unavailable | unavailable | b6-replication |
| unit           | idea-3 | idea-9 | unavailable | unavailable | b6-replication |

Unavailable rows carry a `detail` string explaining why — the cockpit renders
them as `n/a` chips, never as `0%` (AC3).

---

## §G Gate Pastes (post-final-edit)

### TSC
```
$ NODE_OPTIONS="--max-old-space-size=7168" npx tsc --noEmit
(no output · exit 0)
```

### ESLint
```
$ npx eslint --max-warnings 0 src/lib/master-health-scorecard-engine.ts \
    src/types/master-health.ts \
    src/features/command-center/modules/MasterHealthScorecardPage.tsx \
    src/test/sprint-b6/ src/features/command-center/pages/CommandCenterPage.tsx \
    src/apps/erp/configs/command-center-sidebar-config.ts \
    src/lib/_institutional/sprint-history.ts src/lib/_institutional/sibling-register.ts
(no output · exit 0)
```

### Vitest (scoped)
```
$ NODE_OPTIONS="--max-old-space-size=7168" npx vitest run \
    src/test/sprint-b6/ src/test/sprint-b3/ src/test/sprint-b2/ \
    src/test/sprint-b1s2/ src/test/sprint-b1s1/ \
    src/test/sprint-wms1/ src/test/sprint-wms2/ src/test/sprint-wms3/ \
    src/test/sprint-p83/ src/test/sprint-p84/ src/test/sprint-p85/ \
    src/test/sprint-p86/ src/test/sprint-p87/

 Test Files  16 passed (16)
      Tests  394 passed (394)
   Duration  6.40s
```
(B6 contributes +24 it() · prior baseline 370 → 394)

### Build
```
$ NODE_OPTIONS="--max-old-space-size=7168" npx vite build
✓ built in 1m 14s
```

---

## §H Walls (zero diff)

All consumed, never modified:
- `src/lib/idea-3-conflict-resolution-engine.ts`
- `src/lib/idea-9-sleeping-master-detector-engine.ts`
- `src/lib/master-replication-engine.ts`
- `src/lib/party-master-engine.ts`
- `src/lib/fincore-engine.ts` (only `ledgerDefsKey` shape consumed read-only)
- `src/features/master-visibility/MasterVisibilityHeatmapPage.tsx`
- `src/features/master-lifecycle/MasterLifecycleWizardPage.tsx`
- `src/features/command-center/modules/MasterConflictResolutionPanel.tsx`
- `src/components/operix-core/applications.ts` (no change)
- entitlements / shell configs (no change)
- hash-chain / retention engines (no new case · read-model only)

---

## §I Acceptance Criteria

- **AC1** Block-0 6/6 ✅
- **AC2** Duplicates + sleeping DELEGATE to idea-3 / idea-9 — engine source has
  no own `similarity()` or `buildLastUsedIndex()` (test guards) ✅
- **AC3** Incomplete reads REAL fields · unavailable shown honestly, no
  fabricated 0% (test `incomplete check honest when field model not defined`) ✅
- **AC4** ONE new engine + sibling register row ✅
- **AC5** Orphaned uses if-present-then-valid (synthetic ledger w/ missing
  parent flagged → count = 1) ✅
- **AC6** ssot_coverage enumerates `ALL_MASTER_TYPES` (one check per type) ✅
- **AC7** Cockpit drills to EXISTING panels · no `buildMergePlan`/`commitMerge`
  in page source (test guard) ✅
- **AC8** Score rubric documented + monotonic (test proves) ✅
- **AC9** Honesty banner verbatim ✅
- **AC10** 24 it() green ✅
- **AC11** History + B.3 flip + Pillar-B CLOSE declaration ✅
- **AC12** Walls 0-diff · no new deps · Triple Gate 4/4 ✅

---

## §J Pillar-B CLOSE Declaration

> **PILLAR-B CLOSE** · B.1 approvals + B.2 email + B.3 WhatsApp + B.6
> master-health · master governance was already substantially built
> (idea-3/idea-9/heatmap/lifecycle/replication) · B.6 is the unifying scorecard
> · Master SSOT Write-Through registered for Wave-2.

---

*Chat hand-off: new HEAD short hash → TBD_AT_BANK*
