# T-CLN1-Wave1-Cleanups · Close Summary

**Sprint:** CLEANUP-1 · `T-CLN1-Wave1-Cleanups`
**Predecessor HEAD:** `cca094bd` ("Added 5 new VPG behaviors" · VP-GAPS A POST-T1 · 105 ⭐)
**Target streak:** 106 ⭐ · Tier-L · ~450 LOC
**New SIBLING:** _none_ (cleanups · `newSiblings: []`)
**Bank date:** 2026-06-09

---

## 3-item disposition table

| # | Item | Scope | Honest result | Files |
|---|---|---|---|---|
| 1 | **B25 · Inventory Part-No search** | New search surface in MainStoreHub (Reports group · `r-part-no-search` module). Reads `InventoryItem.code / .short_name / .hsn_sac_code / .name` via the existing `useInventoryItems` hook. Pure search/filter — `filterByPartNo()` is a pure function. Honest empty state when no match. | Existing item master untouched; no new item data; no mutators called. | NEW `src/pages/erp/inventory/PartNoSearch.tsx` · edits to `MainStoreHubSidebar.types.ts` (added `'r-part-no-search'`), `MainStoreHubSidebar.tsx` (sidebar row), `MainStoreHubSidebar.groups.ts` (group map), `MainStoreHubPage.tsx` (panel router case + import). |
| 2 | **`/welcome` mock-ticket T-fix** | Removed `MOCK_TICKETS` array (15 rows), `SupportTicket` interface, `TicketPriority` / `TicketStatus` type unions, the entire `SupportOpsTab()` body and the "Create Ticket — backend pending" `toast.info(…)` button. Support tab now renders a stub that links to `/erp/servicedesk` (ServiceDesk v7 owns tickets). Removed unused imports: `toast`, `Select*`, `Clock`, `Search`, `Plus`. | `WorkspaceTab` and `ServerOpsTab` (incl. `MOCK_TENANTS`) are 0-DIFF guards. Grep `MOCK_TICKETS` = 0. Grep `backend pending` = 0. | edit `src/pages/Welcome.tsx`. |
| 3 | **ProductionConfig flag expansion** | Wired all previously-unwired keys from the real `ProductionConfig` interface in `ComplianceSettingsAutomation.constants.ts` — 27 new controls grouped into 6 new cards: Cost Allocation Depth · BOM & Planning · Multi-BU / Project / Customer · Approval / Visibility / Operator Privacy · Mobile Capture · Printing. Every key referenced exists on the type — test asserts `unknown = []`. | Existing 10 priority cards 0-DIFF. Store core (`comply360ProductionKey`, `DEFAULT_PRODUCTION_CONFIG`) untouched. TODO line removed. Honest residual: this panel now covers every flag defined on the `ProductionConfig` interface as of this sprint — any future flags added to the type need a row here. | edit `src/pages/erp/accounting/ProductionConfigAutomation.tsx` (additive sections + header comment refresh + TODO line removal). |

---

## DROPPED · "TaskRoom eslint-disables" — rationale

Founder honest-study ruling: the eslint-disables in
`src/pages/erp/taskflow/ApprovalsInboxPage.tsx` are **intentional false-positive
suppressions** of the `react-hooks/exhaustive-deps` rule. They exist to prevent
re-renders from a localStorage read + a tick re-run pattern that the linter
cannot statically reason about. Removing them would force `useEffect` dependencies
that re-trigger reads on every tick, breaking the inbox refresh contract and
risking the ESLint zero-warnings streak. They are **working code, not debt**.

CLN1 therefore **does not touch `ApprovalsInboxPage.tsx`** — §H wall, asserted
by `cln1-block-behavioral.test.ts → §H walls + history → "ApprovalsInboxPage.tsx
is NOT touched by CLN1"`.

---

## Triple Gate · post-final-edit (NODE_OPTIONS="--max-old-space-size=7168")

### TSC

```
$ npx tsc --noEmit
(exit 0 · no output)
```

### ESLint (repo-wide, --max-warnings 0)

```
$ npx eslint --max-warnings 0 .
(exit 0 · clean)
```

### Vitest (scoped: cln1 + vpg + a2 + b6 + p83-p87)

```
✓ src/test/sprint-cln1/cln1-block-behavioral.test.ts (25 tests)
✓ src/test/sprint-vpg/vpg-block-behavioral.test.ts   (23 tests)
✓ src/test/sprint-a2/a2-block-behavioral.test.ts     (23 tests)
✓ src/test/sprint-b6/...                              (passed)
✓ src/test/sprint-p83…p87/...                         (passed)

Test Files  12 passed (12)
Tests       268 passed (268)
```

### Build (`npx vite build`)

```
✓ built in 1m 1s
```

---

## History flip + append

- **VP-GAPS** row: `headSha` flipped from `TBD_AT_BANK` → `cca094bd`; provenance `PENDING_BACKFILL` → `CONFIRMED`.
- **CLN1** row appended: `predecessorSha: 'cca094bd'`, `newSiblings: []`, `loc: 450`, narrative per §H.

## Walls 0-DIFF (asserted in tests)

`ApprovalsInboxPage.tsx` · ServiceDesk engine · `useInventoryItems` core ·
`DEFAULT_PRODUCTION_CONFIG` shape · Welcome workspace/server-ops sections ·
hash-chain · retention · applications.ts · entitlements.

## Acceptance Criteria

AC1 Block-0 6/6 ✓ · AC2 B25 reads existing item part-no, honest empty ✓ ·
AC3 `MOCK_TICKETS` + dead button removed, grep `"backend pending"` = 0,
no orphaned refs ✓ · AC4 ProductionConfig additional flags wired against
the real type, no fabricated keys ✓ · AC5 empty `newSiblings` ✓ ·
AC6 `ApprovalsInboxPage.tsx` 0-DIFF ✓ · AC7 25 ≥ 20 it() green ✓ ·
AC8 history flip + CLN1 append ✓ · AC9 walls 0-DIFF ✓ · AC10 Triple Gate 4/4 ✓.

**Streak:** 105 → **106 ⭐**

`headSha` will be backfilled at bank time (`PENDING_BACKFILL` → `CONFIRMED`)
after the GitHub mirror flush confirms `origin/main` advanced off `cca094bd`.
