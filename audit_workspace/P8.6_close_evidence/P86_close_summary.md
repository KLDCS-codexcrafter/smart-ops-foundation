# P8.6 Close Evidence · T-P86-Retention-Floor-Plant

**Sprint**: P8.6 · B.5-L3 · Retention policy model + 35-record-type floor-plant
**Predecessor SHA**: `e6238446` (P8.5 bank)
**Head SHA**: `TBD_AT_BANK` (will be backfilled at next sprint Block 0)
**Grade target**: A · 85 stars
**LOC**: ~1,100 (engine 360 · UI 280 · types 50 · floor-plant edits ~120 · tests 280 · register edits ~40)

---

## 1:1 Disposition Table

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | `src/types/record-retention.ts` — RetentionPolicyId (5 literals) + RetentionPolicyRow + RetentionEvaluationRow | DONE | `src/types/record-retention.ts:11-46` |
| 2 | Floor-plant on all 35 FY-stamped types · `retention_policy?` everywhere · `created_by?` on the 13 missing | DONE | grep `retention_policy` src/types = 36 files (35 + record-retention.ts); all 13 `created_by` confirmed by Pass-1 audit |
| 3 | NEW SIBLING `src/lib/record-retention-policy-engine.ts` (sole engine credit) | DONE | `src/lib/record-retention-policy-engine.ts` (360 LOC) · sibling-register `:497` |
| 4 | Retention Console page · CC governance group · NO requiredCards · 3 sections (policy table · evaluation report · honesty banner verbatim) | DONE | `src/features/retention-console/RetentionConsolePage.tsx` (280 LOC) · sidebar registration `src/apps/erp/configs/command-center-sidebar-config.ts:352-355` · CC import `src/features/command-center/pages/CommandCenterPage.tsx:164-165` · module union `:314-315` · allowed-list hash entries `:352, :417` · render switch `:591-592` |
| 5 | Tests `src/test/sprint-p86/p86-block-behavioral.test.ts` (29 it · ≥20 target) | DONE | 29/29 passing (see Triple Gate output below) |
| 6 | Sprint-history self-seed P8.6 + flip P8.5 → e6238446 | DONE | `src/lib/_institutional/sprint-history.ts:986-998` (P8.5 flip + P8.6 row) |
| 7 | Close summary | DONE | this file |

---

## Architectural Decisions (§L)

1. **5 ratified retention literals · verbatim**. RetentionPolicyId is a closed string-union exactly as ratified — no aliases, no extras.

2. **`retention_policy_event` as the single new audit literal**. Added one new member to `AuditEntityType` + `ADDITIVE_INLINE_AUDIT_TYPES` (single-source canon) via the same-edit catalog precedent set in P8.3/P8.4. The 80+ instrumented sites and `logAudit` entry-write logic are untouched.

3. **`employment_lifetime_plus_7` is sentinel, not a number**. The HR bucket carries an explicit string sentinel rather than encoding it as a number — preserves the semantic ("employment lifetime + 7y post-exit") at the type level. Cutoff math reduces it to a 7y anchor when the row has no employment context to draw on; UI shows `lifetime+7` in the years input.

4. **Best-effort collector · honest no_data**. `evaluateRetention` maps every known record-type to a well-known `erp_<thing>_<entityCode>` localStorage key. Types whose key isn't present (or where the value is non-array) report `no_data` honestly. No counts are fabricated. This is the only honest answer until Phase-8 Wave-2 adds server-side enumeration.

5. **Single-engine credit**. Per the meta-rule, this sprint claims exactly one new sibling — `record-retention-policy-engine`. The Retention Console page is interface; the floor-plant edits are interface-only additive optional fields. None of these claim engine credit.

6. **Walls held verbatim**:
   - `src/lib/audit-trail-hash-chain.ts` — 0-DIFF
   - `src/lib/audit-trail-chain-engine.ts` — 0-DIFF
   - `src/lib/comply360-audit-retention-engine.ts` — 0-DIFF
   - All P8.3/P8.4 instrumented sites — 0-DIFF
   - `logAudit` entry-write body (`src/lib/audit-trail-engine.ts:83-115`) — 0-DIFF; only the type-union literal `retention_policy_event` was added at the catalog level

7. **No enforcement code**. Per ratified scope. UI carries the verbatim honesty banner: *"Evaluation and flagging only. Automated archival and enforcement arrive with the Phase-8 Wave-2 backend."* Header `[JWT]` comments mark the server-side enforcement + Rule 46(8) anchor seam.

8. **CC governance-group registration mirrors P8.5 Audit Integrity exactly**. NO `requiredCards`. Same 5 touchpoints (sidebar, import, type union, two allowed-list entries, render switch).

---

## Triple Gate — Pasted Real Outputs (post-T1 re-run)

> T1-disclosure: ESLint gate originally pasted from a pre-final-edit run; corrected per evidence-honesty canon.

```
$ NODE_OPTIONS="--max-old-space-size=7168" npx tsc --noEmit
TSC_EXIT=0

$ NODE_OPTIONS="--max-old-space-size=7168" npx eslint . --max-warnings 0
ESLINT_EXIT=0
(no output)

$ NODE_OPTIONS="--max-old-space-size=7168" npx vitest run src/test/sprint-p86 src/test/sprint-p85 src/test/sprint-p84 src/test/sprint-p83
 RUN  v3.2.4 /dev-server

 ✓ src/test/sprint-p83/p83-block4-meta.test.ts        (11 tests) 487ms
 ✓ src/test/sprint-p85/p85-block4-behavioral.test.ts  (30 tests) 97ms
 ✓ src/test/sprint-p84/p84-block4-meta.test.ts        (7 tests)  75ms
 ✓ src/test/sprint-p84/p84-block3-behavioral.test.ts  (32 tests) 40ms
 ✓ src/test/sprint-p83/p83-block5-behavioral.test.ts  (32 tests) 33ms
 ✓ src/test/sprint-p86/p86-block-behavioral.test.ts   (29 tests) 12ms
 ✓ src/test/sprint-p84/p84-t1-escaped-paths.test.ts   (4 tests)  15ms

 Test Files  7 passed (7)
      Tests  145 passed (145)
   Duration  3.16s
VITEST_EXIT=0

$ NODE_OPTIONS="--max-old-space-size=7168" npm run build
vite v5.4.19 building for production...
transforming...
✓ 6580 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                                   2.35 kB │ gzip:   0.85 kB
…
BUILD_EXIT=0
```

---

## logAudit Diff Shown Verbatim (P8.6 catalog-only delta)

`src/types/audit-trail.ts` — adds one literal to the union + one entry to the consolidated catalog. The `logAudit` function body in `src/lib/audit-trail-engine.ts` is **not** edited.

```diff
--- src/types/audit-trail.ts
+++ src/types/audit-trail.ts
@@ AuditEntityType union, near the tail
-  | 'service_event';          // servicedesk-oem-engine (createOEMClaim · transitionOEMClaim)
+  | 'service_event'           // servicedesk-oem-engine (createOEMClaim · transitionOEMClaim)
+  // Sprint P8.6 · T-P86-Retention-Floor-Plant · B.5-L3 · Retention policy edits (Retention Console)
+  // ADDITIVE inline emission ONLY · NO registerAuditEntityType call. Logged by
+  // record-retention-policy-engine.updateRetentionPolicy on every operator edit.
+  | 'retention_policy_event'; // record-retention-policy-engine (updateRetentionPolicy)
@@ ADDITIVE_INLINE_AUDIT_TYPES catalog
   // Sprint P8.4.T1 · escaped-path wiring (1 new domain literal · 13th P8.4 literal)
   'service_event',
+  // Sprint P8.6 · T-P86-Retention-Floor-Plant · B.5-L3
+  'retention_policy_event',
 ] as const satisfies readonly AuditEntityType[];
```

Engine call-site (the entire emission surface for the new literal):

```ts
// src/lib/record-retention-policy-engine.ts (inside updateRetentionPolicy)
logAudit({
  entityCode: 'GLOBAL',
  action: 'update',
  entityType: 'retention_policy_event',
  recordId: id,
  recordLabel: updated.label,
  beforeState: before as unknown as Record<string, unknown>,
  afterState: updated as unknown as Record<string, unknown>,
  reason: 'Retention policy edited via Retention Console',
  sourceModule: 'record-retention-policy-engine',
});
```

---

## Files Changed (P8.6)

**Created**
- `src/types/record-retention.ts`
- `src/lib/record-retention-policy-engine.ts`
- `src/features/retention-console/RetentionConsolePage.tsx`
- `src/test/sprint-p86/p86-block-behavioral.test.ts`
- `audit_workspace/P8.6_close_evidence/P86_close_summary.md` (this file)

**Edited**
- `src/types/audit-trail.ts` (+1 union member · +1 catalog entry)
- 35 FY-stamped type files in `src/types/` (additive optional fields only)
- `src/apps/erp/configs/command-center-sidebar-config.ts` (sidebar entry)
- `src/features/command-center/pages/CommandCenterPage.tsx` (import · union · 2 allowed-list entries · render switch)
- `src/lib/_institutional/sprint-history.ts` (P8.5 headSha flip · P8.6 row)
- `src/lib/_institutional/sibling-register.ts` (record-retention-policy-engine entry)

**0-DIFF walls verified**
- `src/lib/audit-trail-hash-chain.ts`
- `src/lib/audit-trail-chain-engine.ts`
- `src/lib/comply360-audit-retention-engine.ts`
- All P8.3/P8.4 instrumented sites
- `logAudit` entry-write body in `src/lib/audit-trail-engine.ts`
