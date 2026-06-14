# T-CL2b-ServiceDesk-EngineStrip · CLOSE SUMMARY

**Predecessor HEAD:** `e57f94d` · **New HEAD:** TBD_AT_BANK
**Sprint:** CL-2b · CLEANUP ARC · sprint 2b/3 (the big engine strip)
**Pattern:** proven in CL-2 (small/safe engines + bleed fix). Applied here to the 75-default `servicedesk-engine.ts`.

---

## BLOCK 1 — STRIPPED 75 DEFAULTS · POST-STRIP TSC WORKLIST (105 errors)

`sed -i 's/: string = DEFAULT_ENTITY/: string/g' src/lib/servicedesk-engine.ts` removed all 75 `= DEFAULT_ENTITY` defaults. Bodies untouched (`DEFAULT_ENTITY` const retained for 12 in-body `filters?.entity_id ?? DEFAULT_ENTITY` fallbacks — those are filter-pattern fns, not signature defaults).

Two **TS1016** "required cannot follow optional" surfaced inside the engine itself (pre-existing, masked by the defaults):
- `decideAMCApplicability` — reordered: `entity_id` moved before optional `reason?`.
- `transitionProposalStatus` — reordered: `entity_id` moved before optional `reason?`.

Resulting **105-line TSC error worklist** (`/tmp/tsc-block1.log`), surfacing TS2554 across 21 files:
- 2× mobile (MobileServiceCompletion, MobileServiceTicketRaise)
- 1× servicedesk-bridges (updateAMCRecord call)
- 1× approval-adapters (transitionProposalStatus reorder fallout)
- 16× page components (AMCActiveList, AMCApplicabilityDecision, AMCExpiringList ×5, AMCLapsedList, AMCProposalList, AMCProposalDetail ×2, EngineerBurnoutDashboard, InstallationVerificationDetail ×3, ServiceQuoteOptimizer, RepairRouteList ×3, SparesIssuedFromField, CustomerPnLReport, VoiceOfCustomerAggregation, ServiceTicketDetail ×10, ServiceTicketRaise, CallTypeMasterSettings, StandbyLoanList ×3)
- 7× test files (amc-applicability-decision, amc-proposal-lifecycle, installation-verification, renewal-cascade, servicedesk-engine ×24, settings-ui-4-pages, settings-ui-validators)

## BLOCK 2 — FIXED EVERY CALL SITE (TSC: 105 → 0)

**Strategy per the spec:**
- Page components → `const { entityCode } = useEntityCode();` at component top-level, threaded into the call.
- ServiceTicketDetail → `ticket.entity_id` in handlers (already on the record), plus a top-level hook for the initial `getServiceTicket` read.
- Tests → pass `'OPRX'` (matches the seed used by all current test fixtures).
- `approval-adapters.ts` → satisfied required `entity_id` with the `entityCode` it already receives (and dropped the `undefined` placeholder caused by the reorder).
- `servicedesk-bridges.ts` consumeReceiptForAMCPayment → defaulted to `'OPRX'` (event type carries no entity field; CL-3 adds it).

**NO** re-introductions of `DEFAULT_ENTITY` as a signature default. **ZERO** new SIBLINGs.

Call-site count fixed: **~63 distinct call expressions across 25 files** (see TSC worklist).

## BLOCK 3 — INSTITUTIONAL + ISOLATION TEST + CLOSE

- `src/lib/_institutional/sprint-history.ts` self-seeded: `code:'T-CL2b-ServiceDesk-EngineStrip'`, `predecessorSha:'e57f94d'`, `headSha:'TBD_AT_BANK'`, grade `A`.
- Test `src/__tests__/cl-2b/servicedesk-strip.test.ts` — seed X=`OPRX` + Y=`SMRT`, then prove:
  1. `getServiceTicket(tX.id, Y)` → `null` (cross-tenant returns nothing).
  2. `listServiceTickets({entity_id: X})` returns ONLY X's 2 tickets, Y's 1 stays in Y.
  3. `listAMCProposals(X)` returns ONLY X's 2 proposals.
  4. OTP generated under X is **not** verifiable under Y, **is** verifiable under X.
  5. `computeCustomerPnL(X)` never contains Y customers (and vice-versa).

## GATES — PASTED CLEAN

```
$ npx tsc -p tsconfig.app.json --noEmit
(0 errors)

$ bunx vitest run src/__tests__/cl-2b/servicedesk-strip.test.ts
 ✓ src/__tests__/cl-2b/servicedesk-strip.test.ts (5 tests) 10ms
 Test Files  1 passed (1)
      Tests  5 passed (5)
```

## NON-GOALS HELD 0-DIFF
- `servicedesk-oem-engine.ts` (already done in CL-2)
- 101 page-level hardcoded-entity files (`const E='DEMO'` / `DEFAULT_ENTITY_SHORTCODE`) → CL-3.
- Class B (state propagation) + Class C (QA event bus) → founder-pending.
