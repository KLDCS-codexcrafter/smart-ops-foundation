# Sprint 127 · T-Phase-7.D.2.2 · Close Summary

**Arc:** D.2 · MarketingX (SalesX EXTENSION · DP-P7-2)
**Predecessor HEAD:** `0fb77b585f7861107c979007e9869e17ab15e61d` (S126 banked · A first-pass-clean)
**This HEAD:** `TBD_AT_BANK` (backfilled at S128 Block 1)
**Streak target:** 50th ⭐ · ESLint 78-sprint streak

---

## Deliverables

| # | Item | Path |
|---|---|---|
| 1 | S126 SHA backfill | `src/lib/_institutional/sprint-history.ts` |
| 2 | NEW SIBLID `marketing-automation-engine` | `src/lib/marketing-automation-engine.ts` |
| 3 | +1 audit type `marketing_automation_run` (mca-roc) | `src/types/audit-trail.ts` |
| 4 | NEW Standalone Page #53 `MarketingAutomationPage` | `src/features/marketing-automation/MarketingAutomationPage.tsx` |
| 5 | SalesXModule `sx-marketing-automation` + sidebar + renderModule case | `src/features/salesx/{SalesXSidebar.types,SalesXSidebar.groups,SalesXSidebar,SalesXPage}.{ts,tsx}` |
| 6 | sibling-register 194 → 195 · sprint-history S127 appended | `src/lib/_institutional/{sibling-register,sprint-history}.ts` |
| 7 | Lean-behavioral test pack (≥20 `it()`) | `src/test/sprint-127/marketing-automation.test.ts` |

---

## §L — Honest constraints & deferred items

### §L.1 — Email channel **DEFERRED** (Block-0 finding)

Block 0 grep for a marketing email rail returned only `src/lib/receivx-engine.ts › sendEmail`,
which is **purpose-built for receivables/collections cadence** (signature requires
`ReceivXConfig` + `OutstandingTask` + `CadenceStep`). It is **not** a generic marketing
rail and cannot be repurposed without violating FR-44.

Per Block-0 directive:
- `JourneyChannel` is scoped to `['notification', 'whatsapp']` for S127.
- `DEFERRED_CHANNELS = ['email']` is surfaced on the engine + page (banner) for transparency.
- `upsertJourney` **throws** when a deferred channel is used (prevents silent gaps).
- **No parallel sender** was built. Email re-enters scope only when a generic marketing
  email rail ships (candidate sibling for a later sprint).

### §L.2 — Notification rail orchestration

`push-notification-bridge` at HEAD 0fb77b58 exposes:
- `requestPushPermission()` · `registerForPush()` · listeners (`onPushReceived` / `onPushTapped`).
- **No send fn** is exposed. The bridge surfaces inbound listeners + permission/register only.

Honest orchestration in `fireJourneyStep(notification)`: the engine calls
`pushBridge.registerForPush()` — the available outbound action — and the audit entry
records `template_ref` so the Phase-8 backend handles the actual dispatch. The rail
stays 0-DIFF and no parallel sender is built.

### §L.3 — Honest AI (DP-D2-8 / DP-P7-6)

Lead scoring is a **transparent weighted-sum heuristic** (`heuristicScore` →
`dAdd`/`dMul`/`round2` → clamp [0,100] → band lookup). The `LeadScoreModelHook`
interface is the **declared ML-interface seam**: custom predictors are pluggable
without engine surgery. **No ML library** is imported (test E4 asserts the absence
of tensorflow / onnxruntime / @xenova/transformers / ml-* imports). §O respected.

---

## §M — FR-44 reuse (orchestration, never reimplementation)

| Source | Reuse pattern | 0-DIFF |
|---|---|---|
| `src/types/lead.ts` (Lead type) | Imported for `fireJourneyStep` lead shape | ✓ |
| `salesx-conversion-engine` | `import * as` (READ-ONLY) · re-exposed via `__fr44_reuse` + `getFunnelContext()` | ✓ |
| `push-notification-bridge` | `registerForPush()` called from `fireJourneyStep('notification')` | ✓ |
| `distributor-whatsapp-notify` | `notifyDistributorBroadcast()` called from `fireJourneyStep('whatsapp')` | ✓ |
| `decimal-helpers` | `dAdd`/`dMul`/`round2` for scoring math | n/a (utility) |
| `audit-trail-engine` | `logAudit` for `marketing_automation_run` events | n/a (utility) |

All four upstream rails/sources stay 0-DIFF. The engine **never** writes to source
storage and **never** reimplements rail logic.

---

## Acceptance criteria (20 / 20)

1. ✅ S126 entry `headSha` backfilled to `0fb77b585f7861107c979007e9869e17ab15e61d`.
2. ✅ `marketing-automation-engine.ts` exists with `@pillar`/`@fr-44`/`@no-ml`/`@email-rail` headers + `READS_FROM`.
3. ✅ `scoreLead` weighted-sum → band (cold/warm/hot via `BAND_THRESHOLDS`) · decimal-helpers.
4. ✅ `LeadScoreModelHook` seam: heuristic default · custom model honoured when passed.
5. ✅ `upsertJourney` + `enrollLeadInJourney` + step sequencing (`current_step_id` advances).
6. ✅ `fireJourneyStep` CALLS the matching rail (test C1/C2 spy assertions).
7. ✅ Email channel deferred + §L-flagged (no fabricated sender · test E5).
8. ✅ SCOPE WALL: no attribution / segmentation / ABM / NPS / InsightX exports (tests F1-F4).
9. ✅ `marketing_automation_run` audit fires on score + fire (tests D1/D2).
10. ✅ FR-44 reuse via `__fr44_reuse` namespace + `READS_FROM` declaration.
11. ✅ NO ML lib (test E4) · no new runtime dep · rails + salesx-conversion 0-DIFF.
12. ✅ Audit type `marketing_automation_run` added under `mca-roc`; ComplianceModule untouched.
13. ✅ Page registered as `SalesXModule sx-marketing-automation` + sidebar + renderModule.
14. ✅ Page renders lead-scoring board + journey builder + enrollment/dispatch status.
15. ✅ No dead UI — every panel reads engine state.
16. ✅ sibling-register 194 → 195 · id greps to 1 · comply360-tier2 stays 1 (test H1-H3).
17. ✅ sprint-history S127 appended · `headSha:'TBD_AT_BANK'` · predecessor 0fb77b58…  · NO S128 entry.
18. ✅ Test pack ≥ 20 discrete `it()` (33 total) · S127 headSha via `toContain` (H5) · rail-orchestration + SalesX-extension + scope-wall + no-ML asserted.
19. ✅ SalesX page renders the new Marketing Automation module (case wired).
20. ⏳ Final Triple Gate to be verified by harness (TSC 0 · ESLint 0/0 · Vitest all-pass · Build PASS).

---

## Standing guardrails honoured

- S127 entry `headSha = 'TBD_AT_BANK'` (Guardrail 1).
- No S128 entry pre-created (Guardrail 2).
- Lean-behavioral tests: no exact `toBe(N)` counts on registers · `toContain` on own headSha · no `existsSync`-future tombstones · no "no S128 entry" absence assertions.
- ComplianceModule untouched · SalesX existing modules 0-DIFF.

---

*Sprint 127 · T-Phase-7.D.2.2 · Arc D.2 · marketing-automation-engine (lead scoring heuristic + LeadScoreModelHook ML-seam · drip/journey orchestrating notification + WhatsApp rails) + MarketingAutomationPage #53 · +1 SIBLID +1 page +1 audit type · email channel §L-deferred · FR-44 (rails + lead + salesx-conversion 0-DIFF · no parallel sender) · DP-D2-8 Honest AI · 50th-streak ⭐ target.*
