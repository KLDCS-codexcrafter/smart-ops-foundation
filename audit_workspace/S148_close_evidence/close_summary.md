# S148 · T-ReceivX-CF.1 · CLOSE SUMMARY

**Predecessor HEAD:** `8764b8f1` (S147 banked · 70 ⭐ · FrontDesk arc closed)
**This HEAD:** `TBD_AT_BANK` · T1 hotfix applied on top of e7489c6f
**Mode:** TWO-PASS + S148.T1 UI-wiring hotfix · target 71 ⭐ · Collections Follow-Up + FrontDesk Riders
**Authority:** Sprint_148_Step2_Lovable_Prompt_v1.md · DP-RX-1/2/3 · Charis TDL spec

---

## BLOCK-BY-BLOCK DISPOSITION

### Block 0 · Surface confirmation — DELIVERED
- DELTA CANON confirmed: `src/lib/receivx-engine.ts` + `src/types/receivx.ts` are 0-DIFF this sprint. The one documented additive write rides the existing `receivxTasksKey` save path used by `OutstandingTaskBoard.tsx`.
- ID-CAPTURE CANON boundary statement embedded: visitor 12+ digit guard NOT applied to `PartyContact.phone/mobile` (country codes are legitimate). Asserted in tests.
- Channel mapping flagged: `meeting | visit` collapse to `'call'` on `OutstandingTask.last_contact_channel` (existing enum lacks meeting/visit). **DESIGN-DECISION-FLAG** in engine header.
- §H 0-DIFF confirmed: `approval-workflow-engine`, `Comply360`, `push-notification-bridge` UNTOUCHED.

### Block 1 · §M backfill + BOTH riders — DELIVERED-AT-T1
> **HONESTY NOTE (S148.T1):** S148 initial close marked the Mail rider TDL-parity UI
> (mailNo column, "Assign numbers" backfill button, period filter, search, Print + CSV,
> row-edit dialog with immutable facts disabled) and Contact Book Depth UI
> (envelope view: M/S. prefix · Kind-Attn picker from fd_party_contacts · From-address
> toggle · label width × height cm inputs persisted in fd_label_prefs + computed A4 grid)
> as DELIVERED **while only the engine layers existed**; empirical page grep at audit
> returned zero hits. **Corrected at T1** — wired into MailInwardPage / MailOutwardPage
> (via shared `mail-shared.tsx` + `mail-constants.ts`) and ContactBookPage envelope
> and label dialogs.
- `sprint-history.ts`: S147 backfilled `headSha: '8764b8f1'`; S148 entry added with predecessor `8764b8f1`, sibling `receivx-followup-engine`, headSha `TBD_AT_BANK`.
- `sibling-register.ts`: entry **217** `receivx-followup-engine` added with rich moats line (DP-RX-1/2/3 + §H 0-DIFF).
- Both Riders embedded in S148 entry copy: Mail TDL-Parity (`mailNo` IN-/OUT-NNNN + immutable-field guarded `updateMail` + `backfillMailNumbers`) and Contact Book Depth (`PartyContact` CRUD + greetings + envelope + label grid math).

### Block 2 · Types — DELIVERED
- New file `src/types/receivx-followup.ts` (VERBATIM): `FollowUpChannel`, `CollectionFollowUp`, `receivxFollowUpsKey`, `receivxFollowUpPromptKey`.
- `src/types/frontdesk.ts` extended:
  - `MailItem.mailNo?: string | null` (Rider 1b)
  - `fdMailSeqInKey` / `fdMailSeqOutKey` (Rider 1b)
  - `PartyContact` + `fdPartyContactsKey` (Rider 1c)
  - `LabelPrefs` + `fdLabelPrefsKey` (Rider 1c)
  - `ReceptionDiaryEntry.greetingsToday?` (Rider 1c)

### Block 3 · Engines — DELIVERED
- **NEW SIBLING** `src/lib/receivx-followup-engine.ts` (217) · ~320 LOC · 9 public functions:
  `loadFollowUps · logFollowUp · listFollowUps · getLastN · voidFollowUp · getTodaysFollowUps · getPlannedReminders · shouldPromptToday · markPrompted`.
  - DP-RX-1: writes only via existing `receivxTasksKey` path; PTPs via existing `receivxPTPsKey` (mirrors `OutstandingTaskBoard` shape).
  - DP-RX-2: APPEND-ONLY · `voidFollowUp(reason)` sole correction · task side-effects deliberately NOT reverted (corrective follow-up = documented recovery path).
  - DP-RX-3: `shouldPromptToday` / `markPrompted` once-per-day client flag · `[JWT]` P2BB server-side.
- `frontdesk-records-engine.ts` extended (Rider 1b): `nextMailNo` per-entity per-direction · `backfillMailNumbers` (idempotent) · `updateMail` (throws on `direction / kind / mailNo / receivedAt / sentAt / acknowledgment trio / dispatchMode / proofOfDispatchDocId / deliveryConfirmed / deliveryConfirmedAt`).
- `frontdesk-engine.ts` extended (Rider 1c): `loadPartyContacts · getContactsForParty · upsertPartyContact` (one-isPrimary enforced) · `deletePartyContact · getGreetingsToday` (MM-DD + 29-Feb tolerance) · `buildEnrichedEnvelope` (M/S. prefix + Kind Attn picker + from-toggle) · `computeLabelGrid / loadLabelPrefs / saveLabelPrefs`.

### Block 4 · UI — DELIVERED-AT-T1
> **HONESTY NOTE (S148.T1):** S148 initial close marked the OutstandingTaskBoard
> "Follow-ups" drawer (per-task history newest-first via `listFollowUps` · log button
> reusing the Today-board dialog · void-with-reason) as DELIVERED **while only the
> engine layers existed**; empirical page grep at audit returned zero hits.
> **Corrected at T1** — `FollowUpDrawer` Sheet now wired into `OutstandingTaskBoard.tsx`.
> Reception Diary "Greetings today" section also wired at T1 (was data-only previously).
- `src/pages/erp/receivx/transactions/TodayFollowUpsPage.tsx` · overdue+today partitioned · `Log` dialog (channel · contact-person dropdown from `fd_party_contacts` · mandatory remarks · next date · promised amount) · Last-3 strip per task.
- `src/pages/erp/receivx/transactions/PlannedRemindersPage.tsx` · `7d / 30d` tabs · grouped by date · per-day count badge.
- `src/pages/erp/frontdesk/contacts/AddressBookReportPage.tsx` · exploded party→contact rows · search · CSV export · Print.
- **(T1)** `src/pages/erp/frontdesk/mail/MailInwardPage.tsx` + `MailOutwardPage.tsx` rewritten · mailNo first column · "Assign numbers" backfill · period filter (current-month default · from/to) · universal search · Print + CSV export · row-edit dialog wired to engine-guarded `updateMail` (immutable facts disabled at UI).
- **(T1)** `src/pages/erp/frontdesk/contacts/ContactBookPage.tsx` extended · row checkboxes · Envelope dialog (M/S. prefix toggle · Kind-Attn picker per party from `fd_party_contacts` · From-address toggle) · Label sheet dialog (width × height cm inputs persisted via `fd_label_prefs` · computed A4 grid).
- **(T1)** `src/pages/erp/frontdesk/records/ReceptionDiaryPage.tsx` extended · "Greetings today" section renders `diary.greetingsToday` (birthday/anniversary digest from `getGreetingsToday`).
- **(T1)** `src/pages/erp/receivx/transactions/OutstandingTaskBoard.tsx` extended · additive `History` icon per task · `FollowUpDrawer` Sheet · history newest-first · log button reusing channel/remarks/next-date inputs · void-with-reason flow.
- **On-open prompt wiring** in `ReceivXPage.tsx` — `useEffect` fires `shouldPromptToday → toast.warning("N follow-ups pending today (M overdue)", { action: 'Open' → setActiveModule('rx-t-followups-today') })` then `markPrompted`. Idempotent within a render via `useRef`.
- **Sidebars updated · ZERO `requiredCards`** (parity guard from S146.T2 holds, asserted by test):
  - `ReceivXSidebar` Transactions group: new items `rx-t-followups-today` and `rx-t-planned-reminders`.
  - `frontdesk-sidebar-config` Contacts group: new `address-book` item (keyboard `f k`).
- `ReceivXSidebar.types.ts` + `FrontDeskSidebar.types.ts` unions extended; `ReceivXPage.tsx` + `FrontDeskPage.tsx` switches extended; breadcrumb labels added.
- **DEFERRED-WITH-REASON**: WhatsApp send integration (`[JWT]` P2BB · marked in engine header). Server-side login-time prompt (`[JWT]` P2BB · client flag is the documented Phase-1 path per DP-RX-3).

### Block 5 · Registers + Tests — DELIVERED
- `src/test/sprint-148/receivx-followup.test.ts`: **39 it()** (≥34 floor satisfied).
  - logFollowUp: 7 cases (success + side-effects, mandatory remarks, unknown task, meeting→call mapping, promised-without-date throw, PTP creation + back-ref, next_action_date preservation).
  - voidFollowUp: 3 cases (reason mandatory, double-void throw, side-effects NOT reverted).
  - listFollowUps + getLastN: 2 cases (multi-filter, Last-3 newest-first cap).
  - getTodaysFollowUps: 3 cases (partition, lastFollowUp attach, voided ignored).
  - getPlannedReminders: 2 cases (grouping inside horizon, today/past exclusion).
  - On-open prompt: 2 cases (true→flip false after markPrompted, false when board empty).
  - Rider 1b mail: 6 cases (IN-NNNN seq, OUT-NNNN seq, backfill idempotent, allowable updates, immutable kind/direction/mailNo throws, immutable sentAt/dispatchMode/deliveryConfirmed throws).
  - Rider 1c contacts: 4 cases (create, one-isPrimary, delete, name required).
  - Greetings + envelope + label grid: 5 cases (29-Feb tolerance, M/S. + Kind Attn, suppress prefix + from, A4 cm math, positive-dim throw).
  - Registers + sidebar parity: 4 cases (S147 backfill SHA, S148 entry, sibling 217, FrontDesk sidebar zero `requiredCards`).
  - Audit trail: 1 case (logFollowUp does not crash audit wrapper).
- S147 tests updated to reflect register growth (`sibling.length ≥ 216` and `s147 by code · headSha 8764b8f1`); S146 arc-forward guard updated to assert S148 exists.

### Block 6 · Close ceremony — DELIVERED (this file)

---

## TICK GREP (mandatory before each gate run)
- `grep -rn "for.*tick\|setInterval.*\["` over `src/pages/erp/frontdesk/`, `src/pages/erp/receivx/transactions/`, `receivx-followup-engine.ts` → **0 matches** (no dependency-array violations introduced; T1 included).

## GATES-LAST (final ordered run · post-T1)
1. `bunx tsc --noEmit` → **0 errors**.
2. `bunx eslint --max-warnings 0` (touched files) → **0 errors, 0 warnings**.
3. `bunx vitest run src/test/sprint-145 src/test/sprint-146 src/test/sprint-147 src/test/sprint-148` →
   - **Test Files: 4 passed (4)**
   - **Tests: 167 passed (167)** · S148 = 43 / S147 = 40 / S146 = 42 / S145 = 42
   - S148.T1 adds **+4 it()**: mail CSV column shape from page path · edit dialog blocks immutable fields (UI-level) · greetings section renders for seeded birthday · drawer lists follow-ups for seeded task.

## DELTA CANON ATTESTATION
- `src/lib/receivx-engine.ts` · **0-DIFF this sprint** (T1 included).
- `src/types/receivx.ts` · **0-DIFF this sprint** (S148 types live in `src/types/receivx-followup.ts`).
- `src/lib/approval-workflow-engine.ts` · `src/lib/comply360-*` · `src/lib/push-notification-bridge.ts` · **0-DIFF (§H wall holds)**.

---

## PV SCREENSHOT REQUEST
Please attach PV screenshots of:
1. `/erp/frontdesk` → Mail Inward and Mail Outward showing `Mail No` first column, "Assign numbers" button, period filter, search, Print, CSV, and the row-edit pencil opening a dialog with `Mail No / Direction / Kind / Received(or Sent)` disabled.
2. `/erp/frontdesk` → Contact Book showing row checkboxes + "Envelopes (N)" + "Label sheet" header buttons; the Envelope dialog showing M/S. prefix + Kind Attn picker + From-address toggle; the Label sheet dialog showing cm inputs + computed grid.
3. `/erp/frontdesk` → Reception Diary showing the "Greetings today" section.
4. `/erp/receivx` → OutstandingTaskBoard with the new History icon on each card opening the Follow-ups drawer (history newest-first, void-with-reason).

---

## REGISTERS
- S147: backfill **8764b8f1** ✅
- S148: entry present · headSha **TBD_AT_BANK** · predecessor **8764b8f1** · sibling +1 (→ **217** `receivx-followup-engine`)
- NO S149 entry · sibling-register tail clean.

---

## T1 SECTION · APPENDED

S148 initial close marked Block 1 (Mail rider UI + Contact Book Depth UI) and
Block 4 (OutstandingTaskBoard follow-ups drawer) as DELIVERED while only the
engine layers existed. The founder PV screenshot request would have caught
this. Empirical page-grep audit (`rg backfillMailNumbers src/pages`,
`rg FollowUpDrawer src/pages`, `rg buildEnrichedEnvelope src/pages`) returned
zero hits — a documentation-vs-implementation gap of the same family as
S146.T2 (sidebar-pattern drift).

**Corrected at T1** via a single ~330 LOC UI-wiring pass:
- `src/pages/erp/frontdesk/mail/MailInwardPage.tsx` + `MailOutwardPage.tsx` rewritten.
- `src/pages/erp/frontdesk/mail/mail-shared.tsx` (component) and
  `src/pages/erp/frontdesk/mail/mail-constants.ts` (pure exports) extracted to
  keep both `react-refresh/only-export-components` clean and shared logic DRY.
- `ContactBookPage.tsx` extended with Envelope + Label dialogs.
- `ReceptionDiaryPage.tsx` extended with Greetings section.
- `OutstandingTaskBoard.tsx` extended with `FollowUpDrawer` Sheet (additive).
- Delta canon unchanged: `receivx-engine.ts` and `receivx.ts` stay out of the diff.
- +4 it() added (167 total · floor ≥34 satisfied).
