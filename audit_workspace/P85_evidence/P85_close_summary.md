# P8.5 · B.5-L2 · Close Summary

**Sprint:** T-P85-Global-Hash-Chain
**Predecessor HEAD:** `803310f12` (P8.4 banked · 83 ⭐)
**Target:** 84 ⭐ · global hash-chain · every audit-trail entry tamper-evident
**Bank date:** 2026-06-07

---

## The logAudit instrumentation diff (verbatim · ONE-SITE rule)

`src/lib/audit-trail-engine.ts` — entry-write logic 0-DIFF; the only edits are
+1 import, +1 call, +4 comment lines.

**Imports block (lines 16–22):**
```diff
 import type {
   AuditTrailEntry, AuditAction, AuditEntityType,
 } from '@/types/audit-trail';
 import { auditTrailKey } from '@/types/audit-trail';
+// P8.5 · B.5-L2 · Global hash-chain instrumentation (the ONE-SITE hook).
+// chainAuditEntry is fire-and-forget — logAudit stays synchronous.
+import { chainAuditEntry } from '@/lib/audit-trail-chain-engine';
```

**Body of `logAudit` — right before the final `return entry` (lines 145–147):**
```diff
       console.error('[audit-trail] write failed', e);
     }
   }
+  // P8.5 · B.5-L2 · Forge a per-(entity,entityType) tamper-evident chain link
+  // for this entry. Fire-and-forget — never blocks the caller.
+  chainAuditEntry(entry);
   return entry;
 }
```

That is the entirety of the diff. Signature stays `(opts) => AuditTrailEntry` (synchronous).
No `await` introduced. Storage write (114–141), guard (92), entry construction (95–112) byte-identical.

---

## Two-spine relationship statement

| Spine | File | Scope | Status this sprint |
|---|---|---|---|
| **S137 (original)** | `src/lib/audit-trail-hash-chain.ts` | Single chain per entity over narrow voucher set (material/service/capital indents · RFQ · vendor-quotation · etc.) | **ZERO DIFF** — 9 consumers (weighbridge, vendor-return, vendor-quotation, bill-passing, bill-passing-masters-bridge, git, gateflow-inward-bridge, gateflow-git-bridge, ApprovalActionPanel) untouched |
| **P8.5 (generalized)** | `src/lib/audit-trail-chain-engine.ts` (NEW) | One chain per `(entityCode, auditEntityType)` over EVERY audit-trail entry via logAudit instrumentation | New sibling — coexists, does not replace |

Both spines use the same hash primitive: `crypto.subtle.digest('SHA-256', …)` with FNV-1a 64-bit deterministic fallback. The P8.5 engine re-implements this primitive privately because the S137 file is on the 0-DIFF wall.

---

## New sibling

`audit-trail-chain-engine.ts` — registered same pass in
`src/lib/_institutional/sibling-register.ts` after `notification-engine`:

- **Public exports:** `chainAuditEntry` · `ensureChainsSeeded` · `verifyTypedChain` · `verifyAllChains` · `drainChainQueue` · `readTypedChain` · `readTypedChainStore` · `listChainTypes` · `typedChainKey` + types
- **Storage key:** `erp_audit_typed_chain_<entityCode>` → `Record<auditEntityType, TypedChainEntry[]>`
- **Synchronous contract:** `chainAuditEntry` returns `void` synchronously; async hash work runs on a per-entity tail-promise queue. Multiple concurrent logAudit calls in one tick serialize correctly without blocking the caller.
- **Retro-genesis migration:** `ensureChainsSeeded(entity)` — idempotent, walks `erp_audit_trail_<entity>` in stored array order, chains every entry not yet chained. Runs on first Verify, never per-write.

---

## Pass 2 — Command Center UI

- **Sidebar:** `governance-group` (Master Data Governance) gains `'audit-integrity'` item. `ShieldCheck` icon. **NO `requiredCards`** — CC-internal infrastructure.
- **Module switch:** `'audit-integrity'` added to `CommandCenterModule` union, to mount-time hash allow-list, to hash-change `KNOWN_MODULES`, and to `renderModule()` switch → `<AuditIntegrityPage />`.
- **Page:** `src/features/audit-integrity/AuditIntegrityPage.tsx`
  - Summary strip: chains · total links · intact · broken
  - **Verify Now** button — `drainChainQueue` → `ensureChainsSeeded` → `verifyAllChains`
  - Per-type table: type · length · INTACT/BREAK badge · break detail (seq + entryId + reason)
  - Migration note surfaced when retro-genesis chains pre-existing entries
  - Plain-language tamper-explanation panel
  - Seam footer: "Chain-head server anchoring arrives with the Phase-2 backend · [JWT]"
  - Mobile-honest at 380 px (responsive grid, overflow-x table, smaller text on sm)

---

## §N Tests (≥26 behavioral · `src/test/sprint-p85/p85-block4-behavioral.test.ts`)

**30 tests · all passing.** Coverage:

| # | Behavior |
|---|---|
| 1 | First append → seq:0 + GENESIS prev_hash |
| 2 | Second append chains to first (prev_hash = previous chain_hash) |
| 3 | Per-entityType isolation (voucher / order grow independently) |
| 4 | Per-entity isolation (two entities never share a store) |
| 5 | `listChainTypes` enumerates only chained types |
| 6 | `chainAuditEntry` idempotent on duplicate auditEntryId |
| 7 | `readTypedChainStore` returns whole map |
| 8 | Identity-fields include id → distinct entries produce distinct hashes |
| 9 | Verify re-derives identical hashes (deterministic primitive) |
| 10 | **TAMPER · mutate record_label** → names seq + entryId |
| 11 | **TAMPER · mutate action** → names break at that link |
| 12 | **TAMPER · delete underlying audit row** → reason 'underlying audit entry missing' |
| 13 | **TAMPER · reorder chain links** → break at first out-of-place position |
| 14 | **TAMPER · delete a mid-chain link** → prev_hash / seq mismatch |
| 15 | **TAMPER · mutate chain_hash field** → break at that link |
| 16 | Retro-genesis covers pre-existing entries |
| 17 | Migration idempotent — second run = 0 new links |
| 18 | Mixed pre/post entries chain correctly post-migration |
| 19 | Verify on zero-trail entity → no work |
| 20 | Empty entityCode → {0, 0} |
| 21 | Migration order deterministic (stored array order is canonical) |
| 22 | Verify empty type → valid + length 0 |
| 23 | `verifyAllChains` aggregates intact/broken counts |
| 24 | Verify is read-only — does NOT mutate storage |
| 25 | **logAudit signature SYNCHRONOUS** — returns entry directly, no Promise |
| 26 | `chainAuditEntry` is fire-and-forget — returns void synchronously |
| 27 | S137 spine module's public API untouched (named: `audit-trail-hash-chain.ts` + suite `sprint-102/institutional-debt-cleanup.test.ts`) |
| 28 | typed-chain key namespace = `erp_audit_typed_chain_<entity>` (distinct from S137's) |
| 29 | `readTypedChain` on missing entity → empty array (defensive) |
| 30 | P8.5 headSha row exists in sprint-history canon · P8.4 row flipped to `'803310f12'` |

---

## Registers updated same-pass

**`src/lib/_institutional/sprint-history.ts`:**
- L979–985: P8.4 row · `headSha 'TBD_AT_BANK' → '803310f12'` · `provenance 'PENDING_BACKFILL' → 'CONFIRMED'` · comment annotated `(P8.5 Block 0.2 backfill)`
- L986–992 (NEW): P8.5 row · `code 'T-P85-Global-Hash-Chain'` · `headSha 'TBD_AT_BANK'` · `predecessorSha '803310f12'` · `newSiblings: ['audit-trail-chain-engine']`

**`src/lib/_institutional/sibling-register.ts`:**
- New entry `audit-trail-chain-engine` (after `notification-engine`) · `functionCount: 7` · two moats recorded · `provenance: 'CONFIRMED'`

---

## Walls held

| Wall | Status |
|---|---|
| `audit-trail-hash-chain.ts` | **0 lines changed** |
| P8.3 / P8.4 instrumented sites (80+) | **0 edits** |
| 12 module-local `safeAudit` wrappers | **0 edits** (inherit chaining via call-through to logAudit) |
| ComplianceModule | **0 diff** |
| `notification-engine.ts` | **0 diff** |
| `src/data/applications.ts` / entitlements / routes | **0 diff** |
| New runtime deps | **0** (hash primitive re-implemented locally) |
| Server-anchoring code | **0** (seam footer only) |
| Retention / dept_id work | **0** (P8.6 / P8.7 scope) |
| logAudit synchronous signature | **preserved** (asserted by tests 25, 26) |

---

## Gates (pasted)

```
$ NODE_OPTIONS="--max-old-space-size=7168" npx tsc --noEmit
TSC exit 0

$ npx eslint . --max-warnings 0
ESLint exit 0

$ npx vitest run src/test/sprint-p85 src/test/sprint-p84 src/test/sprint-p83 \
                 src/test/sprint-102/institutional-debt-cleanup.test.ts
 ✓ src/test/sprint-p85/p85-block4-behavioral.test.ts (30 tests)
 ✓ src/test/sprint-p84/p84-block3-behavioral.test.ts (32 tests)
 ✓ src/test/sprint-p84/p84-block4-meta.test.ts (7 tests)
 ✓ src/test/sprint-p84/p84-t1-escaped-paths.test.ts (4 tests)
 ✓ src/test/sprint-p83/p83-block4-meta.test.ts (11 tests)
 ✓ src/test/sprint-p83/p83-block5-behavioral.test.ts (32 tests)
 ✓ src/test/sprint-102/institutional-debt-cleanup.test.ts (24 tests · S137 chain suite)

 Test Files  7 passed (7)
      Tests  140 passed (140)
```

**S137 chain's existing suite named explicitly:**
`src/test/sprint-102/institutional-debt-cleanup.test.ts` — AC#5 (`appendAuditEntrySafe` export) + AC#11 (`audit-trail-hash-chain.ts` original public API retained) — both green, both asserting the 0-DIFF wall holds.

---

## Commit message recorded

```
P8.5 · B.5-L2 global hash-chain — every audit entry tamper-evident
```

**Requesting finalize ratification.** HEAD short hash will be stamped by the Lovable platform on commit.
