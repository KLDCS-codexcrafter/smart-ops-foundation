# Cross-Card Journey · Re-Run vs Baseline

Append-only · one dispatch per re-run · paired with `audit/CROSS_CARD_JOURNEY_REPORT.md`.

---

## RE-RUN · 2026-06-14 · T-CLFINAL · post Class-C removal + CL-3a..3e entity-hook sweep

**Predecessor HEAD:** f02c23f (Class-C dead-code stripped · QA bridge consolidated on `qa.outcome.applied`)
**This HEAD:** 0e88ed6 (headSha discipline restored · 14 stale TBD_AT_BANK rows backfilled · CLFINAL self-seeded)

Baseline anchor: `audit/CROSS_CARD_JOURNEY_REPORT.md` § "JOURNEY RUN · CLOSE-OUT — 2026-06-14"

### Re-run verdict matrix

```
J1 · Order-to-Cash    LINKED   (was PARTIAL · non-SMRT registers now read scenario entity via useEntityCode hook · CL-3b customer-hub + CL-3b projx + CL-3e customer/Statement converted)
J2 · Procure-to-Pay   PARTIAL  (unchanged · getBillsForPo entity-seam latent · 4 manual state-flips · PayOut↔Bill FK deferred · NOT in CL-3 scope)
J3 · Lead-to-Order    LINKED   (unchanged · cleanest of the five)
J4 · Quality-gate     LINKED   (was PARTIAL · Class-C dormant event bus removed · single live channel qa.outcome.applied carries quality_score_delta · NCR FK still deferred but no longer two competing buses)
J5 · Aggregation      LINKED   (was PARTIAL on the entity-leak axis · sd-service-daybook entity-leak CLOSED at CL-2 Block 1 · A/B isolation proven by src/__tests__/cl-2/daybook-service-isolation.test.ts green · 5 missing DayBook sources still deferred → MANUAL-ONLY annotation retained)
```

### Key proofs

**J1 · non-SMRT registers read the scenario entity**
The hardcode→hook sweep CL-3a/b/c/d/e converted every module-scope `const E = 'DEMO'` / `const ENTITY = DEFAULT_ENTITY_SHORTCODE` / raw `localStorage.getItem('active_entity_code')` reader into a component-top-level `const { entityCode } = useEntityCode()`. Switching the entity header from SMRT to (e.g.) ABDOS now reactively re-reads `customerOrdersKey(entityCode)` / `projectsKey(entityCode)` / `timeEntriesKey(entityCode)` / vendor-portal panels / customer Statement — the non-SMRT scenario data appears. Guards in `src/__tests__/cl-3{a,b,c,d,e}/*-entity-hook-guard.test.ts` + the comprehensive scan in `src/__tests__/cl-3e/entity-resolution-final-guard.test.ts` assert ZERO offending literals remain across `src/pages` and `src/components`. Behavioural proof: `src/__tests__/cl-3e/entity-resolution-behavioural.test.ts`.

**J5 · A/B tenant isolation · bleed closed**
The pre-CL-2 bug was `daybook-sources.ts:104` exposing `read: ()` for `sd-service-daybook` which called `listServiceTickets()` with no entity arg, leaking entity B's service tickets into entity A's unified DayBook. CL-2 Block 1 corrected the signature to `read: (entityCode)` and routed through `listServiceTickets({ entity_id: entityCode })`. The two-tenant isolation guard `src/__tests__/cl-2/daybook-service-isolation.test.ts` seeds OPRX (entity A) with 2 tickets and SMRT (entity B) with 3, then asserts:

- A's read returns exactly 6 events (2 × 3 lifecycle events) AND every `reference` starts with `STA-`
- A's read contains ZERO `STB-*` references (no bleed)
- B's read is independent and complete (9 events)

This is a real cross-tenant assertion, not a smoke check. Re-run: GREEN.

### Class-C removal · J4 post-state

- `mountQaBridge` · `applyQaOutcome` · `QA_FINALIZED_EVENT` deleted from `src/lib/bill-passing-qa-bridge.ts`
- `Procure360Page.tsx` no longer mounts the dead bridge (`useEffect` + import gone)
- `notifyQaHandoff` KEPT live (real callers · single source of truth for QA→Procure transitions)
- `ncr-engine.ts` · `qualicheck-bridges.ts` · `NcrCloseDialog.tsx` doc-comments scrubbed to reference the LIVE `qa.outcome.applied` channel (which already carries the score-delta)
- Result: J4 no longer has two parallel QA buses competing — exactly one live channel, no dead code

### Debts retained for Wave-2 (unchanged from baseline)

1. **5 missing DayBook sources** — SalesX (Enquiry/Quote/SO), Procure360 (PO/Bill-Passing/PayOut requisition), QualiCheck (Inspection), NCR. Each is a ~20-line `registerDayBookSource({...})` wrapping the existing entity-scoped loader.
2. **InsightX transaction-feed lens** — aggregator is KPI-only; per-record drill-through to journey events is not a registered lens. Once #1 lands, the cross-card DayBook surface covers it.
3. **J2 getBillsForPo entity-seam · PayOut↔Bill FK** — latent (out of CL-3 entity-resolution scope).

### Sprint-history discipline · post-hotfix

`src/test/_meta/sha-backfill-enforcement.test.ts` requires ≤1 sprint with `headSha === 'TBD_AT_BANK'`. Before this hotfix: 14 (FAIL). After: 1 (the open CLFINAL row · GREEN). Backfill rule applied: each historical TBD set to the predecessorSha of the NEXT sprint (the actual banked commit between the two).

**RE-RUN COMPLETE.** Two of three baseline gaps (J1 entity hardcodes · J5 service-source leak) closed by CL-2 + CL-3 arc; J4 dormant-bus debt closed by CLFINAL Class-C removal. The remaining 3 Wave-2 debts are intentional and surveyed.
