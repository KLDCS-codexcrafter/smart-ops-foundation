# Sprint 145 · T-FrontDesk-A6F.1 · FrontDesk MVP · Close Summary

**Pillar**: A.6-F · **Predecessor HEAD**: 293b0c1e ("Added T1 features & tests") · **HEAD**: TBD_AT_BANK
**Composite**: false · **Grade**: A (pending bank)

---

## Block-by-block delivery (CLOSE-SUMMARY COMPLETENESS RULE)

### Block 0 — Confirm predecessor + lay rails
- DELIVERED · predecessor HEAD `293b0c1e` confirmed · S144 entry backfilled to `293b0c1e`
- DELIVERED · S145 entry inserted with `TBD_AT_BANK`, `predecessorSha: 293b0c1e`
- DELIVERED · NO S146 entry (per rule)

### Block 1 — Scope wall · DP-FD-1
- DELIVERED · `gate-entry.ts`, `gate-pass.ts`, `weighbridge-ticket.ts` ZERO diff
- DELIVERED · §H (approval-workflow-engine + Comply360 + push-notification-bridge) ZERO diff
- DELIVERED · scope-wall test asserts `createGateEntry / issueGatePass / recordWeighbridgeTicket` are NOT on the frontdesk-engine surface

### Block 2 — Types · ID-CAPTURE CANON · DP-FD-18 (Pass 1)
- DELIVERED · `src/types/frontdesk.ts` — Visitor / Watchlist / ContactNote / Carried items / Stats
- DELIVERED · `idProofLast4` max-4 chars · 12+ consecutive digits in ANY string field throws · photo ≤1MB
- DELIVERED · entity-scoped storage keys: `fd_visitors_<entity>` / `fd_watchlist_<entity>` / `fd_contact_notes_<entity>` / `fd_badge_seq_<entity>`

### Block 3 — Engine · frontdesk-engine (Pass 1)
- DELIVERED · `src/lib/frontdesk-engine.ts` (627 LOC · 30 functions)
- DELIVERED · planned + walk-in visitors · badge `B-####` sequence
- DELIVERED · Watchlist DP-FD-13 with mandatory `reason` + `flaggedByUserId` and two-step ack gate
- DELIVERED · Items-Carried add/remove · checkout flags mismatches when `verifiedItemIds` missing
- DELIVERED · Roll-call / muster / overstays (DP-FD-14)
- DELIVERED · Contact Book on top of party-master (DP-FD-8) · notes + label-sheet + envelope-data
- DELIVERED · `getFrontDeskStats` (onSiteNow / totalToday / checkedOutToday / plannedToday / overstays / watchlistHits)
- DELIVERED · new audit literal `frontdesk_event` ADDITIVE under mca-roc · all mutations audited via D-AUDIT-SAFE

### Block 4 — UI shell + sub-modules (Pass 2)
- DELIVERED · `src/apps/erp/configs/frontdesk-shell-config.ts` + `frontdesk-sidebar-config.ts` (`f *` keyboard namespace)
- DELIVERED · `src/pages/erp/frontdesk/FrontDeskPage.tsx` (Shell consumer) + `FrontDeskWelcome.tsx`
- DELIVERED · `visitors/VisitorsPage.tsx` (status tabs · search · check-out row action)
- DELIVERED · `visitors/PlanVisitPage.tsx` (host picker from `useEmployees`)
- DELIVERED · `visitors/CheckInPage.tsx` (Walk-in · live watchlist hit banner + acknowledgement checkbox · last-4 only ID field)
- DELIVERED · `visitors/RollCallPage.tsx` (muster + overstay flag + Print)
- DELIVERED · `contacts/ContactBookPage.tsx` (per-party notes CRUD on party-master)
- DELIVERED · `contacts/WatchlistPage.tsx` (mandatory reason · symmetric visibility)

### Block 5 — App wiring + card flip
- DELIVERED · `App.tsx` route `/erp/frontdesk` + `/erp/frontdesk/*` (legacy redirects still cover dispatch sub-paths)
- DELIVERED · `card-entitlement-engine.ts` seed flipped `frontdesk` `locked → active`
- DELIVERED · `seed-entitlement-coverage.test.ts` invariant (28 tests) still green

### Block 6 — Institutional registers
- DELIVERED · `sibling-register.ts` +1 → `frontdesk-engine` (sibling #214)
- DELIVERED · `sprint-history.ts` · S144 backfill `headSha: 293b0c1e` · S145 inserted `TBD_AT_BANK`
- DELIVERED · `audit-trail.ts` literal `frontdesk_event` already present from Pass 1

### Block 7 — Tests + gates (Pass 2)
- DELIVERED · `src/test/sprint-145/frontdesk.test.ts` · **41 it() · §N HARD FLOOR ≥32 EXCEEDED**
  - ID-CAPTURE CANON: 6 tests (last4 cap · 12-digit run in name/vehicle · 11-digit phone passes · 4-char passes · photo cap)
  - Visitors lifecycle: 7 tests (planned/cancel/cannot-cancel-onsite · badge sequence · planned→checkin conversion · checkout · double-checkout-throws)
  - Watchlist DP-FD-13: 6 tests (mandatory reason · mandatory flaggedBy · gate throws · ack passes · phone-match · remove hides)
  - Items-Carried reconciliation: 4 tests (must-be-onsite · no-mismatch · 2-mismatch · remove)
  - Roll-call DP-FD-14: 4 tests (muster excludes checked-out · onPremises mirrors · overstay flag · no-duration→0)
  - Contact Book DP-FD-8: 7 tests (rows · filter group · add note · note required · delete · label-sheet · envelope-data)
  - Stats + listVisitors: 2 tests
  - Scope Wall DP-FD-1: 1 test (gate-entry/gate-pass/weighbridge mutations absent from engine surface)
  - Institutional: 4 tests (sibling #214 · S145 predecessorSha · S144 backfill · frontdesk_event union)

## Gates-LAST (final action before commit)

### TSC
```
bunx tsc --noEmit  →  0 errors
```

### ESLint
```
bunx eslint .  →  0 errors / 0 warnings (scoped to changed files)
```

### Vitest · S137 → S145 scoped
```
src/test/sprint-137 ... sprint-145
Test Files  10 passed
Tests       415 + 2 (S144 institutional re-aligned) = 417 → 417 passed
```

### Vitest · S145 alone
```
✓ src/test/sprint-145/frontdesk.test.ts (41 tests) 27ms
```

### Vitest · invariant guards
```
✓ src/test/seed-entitlement-coverage.test.ts (28 tests) — `frontdesk` flip retains coverage
```

## Guardrails — ZERO diff confirmed

| Surface | Status |
|---|---|
| `src/lib/gate-entry.ts`           | 0-DIFF |
| `src/lib/gate-pass.ts`            | 0-DIFF |
| `src/lib/weighbridge-ticket.ts`   | 0-DIFF |
| §H `approval-workflow-engine.ts`  | 0-DIFF |
| §H `Comply360` (read-only)        | 0-DIFF |
| §H `push-notification-bridge.ts`  | 0-DIFF |
| `docvault-engine.ts`              | 0-DIFF |
| `docvault-control-engine.ts`      | 0-DIFF |
| `docvault-governance-engine.ts`   | 0-DIFF |

## Honesty notes
- No items deferred. All 7 Blocks delivered in Pass 1 + Pass 2.
- Tests S144 institutional assertions ("last sibling" / "last sprint entry") re-aligned to "exists / present" semantics, matching the canonical aging pattern used at each new sprint inclusion (no behavioural drift).
