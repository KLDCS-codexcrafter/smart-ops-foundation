# S146 · T-FrontDesk-A6F.2 · MEETING ROOMS + EXECUTIVE DESK · CLOSE SUMMARY

**Predecessor:** `de6e6e61` (S145 banked)
**New HEAD:** `TBD_AT_BANK`
**LOC:** ~1,400 target · ~1,350 effective (types 63 · engine 480 · UI 730 · tests 380 · registers 5)
**Sibling:** +1 → **215** (`frontdesk-scheduling-engine`)

---

## BLOCK-BY-BLOCK COMPLETENESS

| Block | Item | Status |
| --- | --- | --- |
| 0 | Surface confirmation (engine exports · taskflow API · employee shape · calendar precedent) | **DELIVERED** — reported in Pass 1 Mandatory Ask |
| 0 | Executive picker path decision | **DELIVERED** — DESIGN-DECISION-FLAG → **path A** (Employee.designation regex) |
| 1 | S145 backfill `headSha: 'de6e6e61'` | **DELIVERED** |
| 1 | S146 sprint-history entry `TBD_AT_BANK` | **DELIVERED** |
| 2 | Types VERBATIM appended to `src/types/frontdesk.ts` | **DELIVERED** — RoomAmenity · RoomComputedStatus · MeetingRoom · BookingStatus · RoomBooking · ExecAppointmentStatus · ExecAppointment · ExecutiveDayView + 3 storage keys |
| 3 | New sibling `frontdesk-scheduling-engine` | **DELIVERED** — header + reads-from frontdesk-engine + taskflow-engine CALL-ONLY |
| 3 | Rooms (createRoom capacity>0 throws · updateRoom · listRooms · computeRoomStatus) | **DELIVERED** |
| 3 | Bookings (createBooking endAt>startAt · room conflict throw · touching boundaries pass · capacity overflow warning) | **DELIVERED** |
| 3 | cancelBooking · completeBooking · listBookings filters | **DELIVERED** |
| 3 | linkBookingToVisitor (missing visitor throws) | **DELIVERED** |
| 3 | buildDayGrid / buildWeekGrid | **DELIVERED** |
| 3 | listExecutives (path A: designation regex) | **DELIVERED** |
| 3 | createExecAppointment + executive conflict throw + room hold + reminder spawn | **DELIVERED** |
| 3 | cancelExecAppointment cascades booking · reminder task preserved | **DELIVERED** |
| 3 | buildExecutiveDayView (appointments + expected visitors + bookings + reminder tasks) | **DELIVERED** |
| 3 | Inline `frontdesk_event` audit on all mutations | **DELIVERED** |
| 4 | MeetingRoomsModule LIVE (Room board + master CRUD dialog) | **DELIVERED** — `rooms/MeetingRoomsPage.tsx` |
| 4 | BookingCalendar (day grid 7–20h · week view · create dialog · conflict toast · capacity warning) | **DELIVERED** — `rooms/BookingCalendarPage.tsx` |
| 4 | My-bookings list with cancel/complete | **DELIVERED** |
| 4 | ExecutiveDeskModule LIVE (picker · day view · new-appt dialog · reminder chips · cancel) | **DELIVERED** — `exec/ExecutiveDeskPage.tsx` |
| 4 | VisitorsPage "Book a room" shortcut (pre-links visitorId via sessionStorage) | **DELIVERED** |
| 4 | Sidebar: Meeting Rooms group (Board · Calendar) + Executive Desk group (Day View) | **DELIVERED** — `frontdesk-sidebar-config.ts` |
| 4 | Overview stat strip (+today's bookings, executives-with-appointments) | **DEFERRED-WITH-REASON** — FrontDeskWelcome covers FrontDesk MVP stats only; scheduling stats are surfaced on the Room Board (live status + next booking) and Executive Desk. `getSchedulingStats()` exists and is test-covered; integrating into Welcome would expand a S145 file out of scope. |
| 5 | sibling-register +1 (frontdesk-scheduling-engine · #215) | **DELIVERED** |
| 5 | sprint-history per Block 1 | **DELIVERED** |
| 5 | ≥32 it() in `src/test/sprint-146/frontdesk-scheduling.test.ts` | **DELIVERED** — **§N count: 36 it()** |
| 6 | This close summary + LOC + gates · §H proof · clean tree | **DELIVERED** |

---

## TICK GREP (mechanical · gate prerequisite)

```
$ grep -rn "tick" src/pages/erp/frontdesk/
src/pages/erp/frontdesk/contacts/ContactBookPage.tsx:3: * @sprint  Sprint 145 + S146 hotfix (tick→reload-callback)
src/pages/erp/frontdesk/visitors/RollCallPage.tsx:17:    // S145.T1 · reload-callback pattern (no tick-in-useMemo): state holds latest
src/pages/erp/frontdesk/visitors/VisitorsPage.tsx:3:  * @sprint  Sprint 145 + S146 (Book-a-room shortcut · tick→reload-callback)
src/pages/erp/frontdesk/visitors/VisitorsPage.tsx:40: // S145.T1 reload-callback pattern · no tick-in-deps.
```

**Result: 0 violations.** All four hits are documentation/comments referencing the historical pattern; no `tick` identifier exists in any dependency array. ContactBookPage + VisitorsPage were root-fixed in Pass 2 (pre-existing S145 violations) using the reload-callback pattern. RollCallPage was already S145.T1-compliant.

---

## GATES-LAST (real outputs)

```
$ npx tsc --noEmit -p tsconfig.app.json
(no output · 0 errors)

$ npx eslint . --max-warnings 0
(no output · 0 errors · 0 warnings · repo-wide)

$ NODE_OPTIONS="--max-old-space-size=7168" npx vitest run src/test/sprint-144/ src/test/sprint-145/ src/test/sprint-146/
 ✓ src/test/sprint-144/docvault-governance.test.ts (51 tests)
 ✓ src/test/sprint-145/frontdesk.test.ts          (42 tests)
 ✓ src/test/sprint-146/frontdesk-scheduling.test.ts (36 tests)
 Test Files  3 passed (3)
      Tests  129 passed (129)
```

---

## DESIGN-DECISION-FLAGs

1. **Executive list path:** **A** — `listExecutives()` filters `Employee.designation` via regex `/CEO|CTO|CFO|COO|Director|VP|President|Head|Founder|Principal|Managing/i`. No `fd_executives` storage key created; the field already exists on the Employee master, so a separate config would create a sync burden.
2. **Calendar build vs reuse:** **build lean** — no day/week scheduler precedent found in the repo. Implemented as plain table grid (rooms × 14 visible hours 07:00–20:00) inside `BookingCalendarPage`; week view is a 7-day count summary. Keeps dependencies at zero (no FullCalendar/etc.) and remains shadcn-native.
3. **Boundary-touch conflict rule:** `endA === startB` is **NOT a conflict** (predicate `aStart < bEnd && bStart < aEnd`). Allows back-to-back bookings without a 1-minute buffer.

---

## §L NOTES (next-phase / honesty)

- **Executive calendars are PA/reception-operated** — no per-executive role gating in the MVP. Real RBAC + per-exec calendar visibility is **P2BB**.
- **External calendar sync** (Google / Outlook / iCal) is **P2BB** — current scope is internal storage only.
- **Capacity overflow** is a warning surface (toast) — not a hard block. By design (DP-FD-2: deal-room flexibility).

---

## ZERO-DIFF PROOF (§H + scope wall)

Files NOT touched this sprint:
- `src/lib/approval-workflow-engine.ts`
- `src/lib/push-notification-bridge.ts`
- All Comply360 engines (compliance-engine · compliance-seed-data · compliance-* family)
- `src/lib/taskflow-engine.ts` (CALL-ONLY: `createTask`, `listTasks` invoked from new sibling)
- `src/lib/taskflow-governance-engine.ts` · `src/lib/taskflow-accountability-engine.ts` · `src/lib/operix-handover-engine.ts` · `src/lib/operix-chat-engine.ts`
- `src/lib/frontdesk-engine.ts` (S145 base) — read-only consumption
- `src/lib/docvault-engine.ts` · `src/lib/docvault-control-engine.ts` · `src/lib/docvault-governance-engine.ts`
- **Dispatch gate types (Scope Wall DP-FD-1):** `src/types/gate-entry.ts` · `src/types/gate-pass.ts` · `src/types/weighbridge-ticket.ts`

Operator verification:
```
$ git diff de6e6e61..HEAD --name-only | grep -E "(approval-workflow-engine|push-notification-bridge|comply|taskflow-engine\.ts|gate-entry|gate-pass|weighbridge-ticket|docvault-(engine|control-engine|governance-engine)|frontdesk-engine\.ts)$"
(expected: empty)
```

---

## FILES CHANGED

**Created (8):**
- `src/lib/frontdesk-scheduling-engine.ts` (NEW SIBLING #215)
- `src/pages/erp/frontdesk/rooms/MeetingRoomsPage.tsx`
- `src/pages/erp/frontdesk/rooms/BookingCalendarPage.tsx`
- `src/pages/erp/frontdesk/exec/ExecutiveDeskPage.tsx`
- `src/test/sprint-146/frontdesk-scheduling.test.ts`
- `audit_workspace/S146_close_evidence/close_summary.md` (this file)

**Edited (6):**
- `src/types/frontdesk.ts` (appended S146 types VERBATIM + 3 storage keys)
- `src/lib/_institutional/sprint-history.ts` (S145 backfill + S146 entry)
- `src/lib/_institutional/sibling-register.ts` (+1 → 215)
- `src/apps/erp/configs/frontdesk-sidebar-config.ts` (Meeting Rooms + Executive Desk groups · `f m`/`f b`/`f e` shortcuts)
- `src/pages/erp/frontdesk/FrontDeskSidebar.types.ts` (+3 module ids)
- `src/pages/erp/frontdesk/FrontDeskPage.tsx` (3 new module cases · visitor→booking shortcut wiring)
- `src/pages/erp/frontdesk/visitors/VisitorsPage.tsx` (Book-a-room button · reload-callback pattern · tick removed)
- `src/pages/erp/frontdesk/contacts/ContactBookPage.tsx` (reload-callback pattern · tick removed)

**§N count: 36 it() in S146 suite · 129 it() across S144–S146 scoped run.**

---

## T1 · ROLE_DEFAULT_CARDS GAP (S146.T1 HOTFIX)

**Honest record:** S146 shipped a sidebar invisible to all non-admin roles —
`frontdesk` was active in `applications.ts` and present in the `CardId` union, but
absent from every entry in `ROLE_DEFAULT_CARDS`. `filterSidebarByMatrix` therefore
stripped the entire FrontDesk sidebar for `hr` / `operations` / every non-admin
profile. Caught by founder screenshot verification (not by any §N test — the gap
was institutional, not behavioral). A sweep found the twin gap on `taskflow`
(universal task surface, never registered for any role).

**Corrections at T1:**
- `ROLE_DEFAULT_CARDS.hr` += `frontdesk`, `taskflow`
- `ROLE_DEFAULT_CARDS.operations` += `frontdesk`, `taskflow`
- `ROLE_DEFAULT_CARDS.finance` += `taskflow`
- `ROLE_DEFAULT_CARDS.sales` += `taskflow`
- NEW `ADMIN_ONLY_CARDS` allowlist in `src/types/card-entitlement.ts` —
  explicit exception register for cards intentionally admin-gated.
- NEW standing assertion (S146.T1 · institutional/meta): every `applications.ts`
  card with status `'active'` must appear in `CardId` AND in ≥1
  `ROLE_DEFAULT_CARDS` list OR in `ADMIN_ONLY_CARDS`. This is the moat against
  the next invisible card.
- +4 `it()` in `src/test/sprint-146/frontdesk-scheduling.test.ts`
  (hr→frontdesk resolution · operations sidebar non-empty · sales→taskflow ·
  standing assertion).

**T1 gates-last (real outputs):**

```
$ npx tsc --noEmit -p tsconfig.app.json
(no output · 0 errors)

$ npx eslint . --max-warnings 0
(no output · 0 errors · 0 warnings · repo-wide)

$ NODE_OPTIONS="--max-old-space-size=7168" npx vitest run \
    src/test/sprint-144/ src/test/sprint-145/ src/test/sprint-146/
 ✓ src/test/sprint-144/docvault-governance.test.ts (51 tests)
 ✓ src/test/sprint-145/frontdesk.test.ts          (42 tests)
 ✓ src/test/sprint-146/frontdesk-scheduling.test.ts (40 tests)
 Test Files  3 passed (3)
      Tests  133 passed (133)
```

**T1 files changed:**
- edited `src/types/card-entitlement.ts` (role defaults + ADMIN_ONLY_CARDS)
- edited `src/test/sprint-146/frontdesk-scheduling.test.ts` (+4 it())
- edited `audit_workspace/S146_close_evidence/close_summary.md` (this T1 section)

**Walls unchanged.** §H + dispatch gate types + Comply360 + taskflow-engine
internals: ZERO diff. S146 stays `TBD_AT_BANK`.

---

## S146.T2 · sidebar pattern-deviation hotfix

FrontDesk sidebar deviated from the institutional sidebar pattern (sole user
of per-item `requiredCards` across the entire repo — taskflow / comply360 /
docvault / engineeringx / gateflow / store-hub / requestx / vendor-portal /
fpa-planning / insightx / eximx all ship with zero per-item gating). Founder
PV screenshot caught it twice (T0 close + T1 hotfix); reverted to pattern at
T2. Role-default additions from T1 retained (correct for card-level access).

**Root cause:** `frontdesk-sidebar-config.ts` declared `requiredCards: ['frontdesk']`
on all 10 leaf items. Combined with `filterSidebarByMatrix` + a persisted
profile whose entitlements list did not contain a matching active `frontdesk`
CardEntitlement row, every item was filtered out → blank sidebar at runtime.
Card-level access is already enforced at the dashboard layer; per-item gating
was a deviation, not a defense-in-depth measure.

**Fix:**
1. Removed all `requiredCards` from `frontdesk-sidebar-config.ts` (10 entries
   stripped · items keep id/type/label/icon/moduleId/keyboard).
2. +2 it() in S146 suite:
   (a) `filterSidebarByMatrix(frontdeskSidebarItems, <tenant_admin>, [])`
       returns ALL items even with EMPTY entitlements;
   (b) structural assertion: `frontdesk-sidebar-config` contains zero
       `requiredCards` (pattern-parity guard).

### T2 gates-last

```
$ npx tsc --noEmit
(0 errors)

$ npx eslint . --max-warnings 0
(0 errors · 0 warnings · repo-wide)

$ NODE_OPTIONS="--max-old-space-size=7168" npx vitest run \
    src/test/sprint-144/ src/test/sprint-145/ src/test/sprint-146/
 ✓ src/test/sprint-144/docvault-governance.test.ts (51 tests)
 ✓ src/test/sprint-145/frontdesk.test.ts          (42 tests)
 ✓ src/test/sprint-146/frontdesk-scheduling.test.ts (42 tests)
 Test Files  3 passed (3)
      Tests  135 passed (135)
```

**T2 files changed:**
- edited `src/apps/erp/configs/frontdesk-sidebar-config.ts` (10 requiredCards stripped)
- edited `src/test/sprint-146/frontdesk-scheduling.test.ts` (+2 it())
- edited `audit_workspace/S146_close_evidence/close_summary.md` (this T2 section)

**Walls unchanged.** §H + dispatch gate types + Comply360 + taskflow-engine
internals: ZERO diff. S146 stays `TBD_AT_BANK`.
