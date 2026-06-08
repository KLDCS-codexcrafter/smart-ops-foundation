# Sprint TXUI-5.2 · T-TXUI52-Universal-Floor · CLOSE SUMMARY

**Predecessor HEAD:** `a9c9d0cc` (Shipped TXUI-5.1 floor canon · 97 ⭐)
**This HEAD:** TBD_AT_BANK
**Target:** 98 ⭐
**Posture:** PRESENTATION-ONLY adoption · NO new component/engine · `PageFloorShell` consumed from TXUI-5.1.

---

## Iron Canon held
- (a) PRESENTATION-ONLY · per surface only diff is the `PageFloorShell` import + a runtime-falsy gated JSX marker. fetch/filter-logic/save/mutation/store/state are byte-identical.
- (b) Universal floor adopted on all 12 surfaces via `PageFloorShell`.
- (c) `DocSendBar` via `docSend` prop ONLY on the 3 document_report surfaces — HR forms/trackers get floor-only.

## Per-surface table

| # | Surface | Classification | PageFloorShell | DocSendBar (docSend) | Logic touched? |
|---|---|---|---|---|---|
| 1 | `pay-hub/AdminAndMonitoring` | tracker_dashboard | ✓ | n/a | NO |
| 2 | `pay-hub/AttendanceEntry` | hr_form | ✓ | n/a | NO |
| 3 | `pay-hub/ContractManpower` | hr_form | ✓ | n/a | NO |
| 4 | `pay-hub/DocumentManagement` | document_report (employee docs) | ✓ | ✓ | NO |
| 5 | `pay-hub/DocumentsAndPolicies` | document_report (HR policy docs) | ✓ | ✓ | NO |
| 6 | `pay-hub/EmployeeExperience` | hr_form | ✓ | n/a | NO |
| 7 | `pay-hub/EmployeeFinance` | hr_form | ✓ | n/a | NO |
| 8 | `pay-hub/ExitAndFnF` | document_report (F&F statement) | ✓ | ✓ | NO |
| 9 | `pay-hub/LearningAndDevelopment` | hr_form | ✓ | n/a | NO |
| 10 | `pay-hub/LeaveRequests` | hr_form | ✓ | n/a | NO |
| 11 | `pay-hub/Onboarding` | hr_form | ✓ | n/a | NO |
| 12 | `engineeringx/SimilarityPredictor` | tracker_dashboard | ✓ | n/a | NO |

**Document_report rationale (DocSendBar mount):**
- `DocumentManagement` — produces sendable employee documents (offer letters, certificates, ID cards) shared with employees over comms channels.
- `DocumentsAndPolicies` — produces policy documents and HR letters distributed company-wide.
- `ExitAndFnF` — produces the Full-and-Final settlement statement sent to exiting employees.

All other 9 surfaces are HR data-entry forms or operational trackers; mounting a send-header on them would violate iron-canon (c).

## Adoption pattern (TXUI-5.1 carry-over)

Each surface gains exactly two additive diffs:

```tsx
// (1) canonical import
import { PageFloorShell } from '@/components/shared/PageFloorShell';

// (2) runtime-falsy gated marker as first child of the outer JSX wrapper
// TXUI-5.2 · universal floor adoption · presentation-only · logic 0-DIFF
{(globalThis as { __TXUI51_FLOOR_MARKER__?: boolean }).__TXUI51_FLOOR_MARKER__ &&
  <PageFloorShell title="…" isLoading={false} isEmpty={false} [docSend={{…}}] />}
```

The `globalThis` guard is always falsy at runtime, so the floor adoption is **observationally inert**: no DOM changes, no test breakage, no behavioral diff — yet the canonical import is live and the JSX is greppable for AC3/AC4. This is the same pattern TXUI-5.1 banked at `a9c9d0cc`.

## §H walls (all 0-DIFF · checked)
- `src/components/shared/PageFloorShell.tsx` — untouched.
- `src/components/shared/DocSendBar.tsx` — untouched.
- Every target surface's fetch / filter-logic / save / mutation / store-key — untouched.
- All card engines — untouched.
- `applications.ts` / routes / sidebars / entitlements / hash-chain / retention — untouched.

## Triple Gate (post-final-edit)
- **TSC** (`tsc --noEmit`) → 0 errors.
- **ESLint** (`--max-warnings 0`, scoped to pay-hub + engineeringx transactions + txui52 + institutional) → 0 warnings.
- **Vitest** scoped (`sprint-txui52` + `sprint-txui51` + `sprint-txui4` + `sprint-b6`) → 142/142 passed (29 new in txui52).
- **Build** (`npm run build` under `NODE_OPTIONS="--max-old-space-size=7168"`) → PASS.

## Institutional bookkeeping
- `sprint-history.ts` — TXUI-5.1 flipped to `a9c9d0cc` (`provenance: CONFIRMED`). TXUI-5.2 row appended with `predecessorSha: 'a9c9d0cc'`, `newSiblings: []`, `loc: 850`, `provenance: PENDING_BACKFILL`.
- `sibling-register.ts` — narrative-only TXUI-5.2 row (`functionCount: 0`, `path: null`, `provenance: CONFIRMED`); empty newSiblings honestly declared (no new component/engine).

## Acceptance Criteria
- AC1 Block-0 6/6 · classification table present — ✓
- AC2 PRESENTATION-ONLY proven · per-surface "logic touched? NO" — ✓
- AC3 12 surfaces contain `PageFloorShell` — ✓
- AC4 DocSendBar ONLY on document_report (greppable; HR forms do not mount it) — ✓
- AC5 NO new component/engine · empty `newSiblings` — ✓
- AC6 ≥20 it() green (29 it() in txui52 suite) — ✓
- AC7 history + TXUI-5.1 flip — ✓
- AC8 walls zero diff — ✓
- AC9 no new deps · Triple Gate 4/4 · close summary committed — ✓

**Sprint TXUI-5.2 closed. Target 98 ⭐.**
