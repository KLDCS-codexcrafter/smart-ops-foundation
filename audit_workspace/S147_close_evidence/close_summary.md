# S147 · T-FrontDesk-A6F.3 · CLOSE SUMMARY · 🏁 FRONTDESK ARC CLOSE

**Predecessor HEAD:** `c06202c9` (S146 banked · 69 ⭐ · post-T2)
**This HEAD:** `TBD_AT_BANK`
**Mode:** TWO-PASS · ARC CLOSER · target 70 ⭐ + FrontDesk Arc Close
**Authority:** FrontDesk_Step1_Alignment_v4_FINAL.md · DP-FD-4/9/15/16

---

## BLOCK-BY-BLOCK DISPOSITION

### Block 0 · Surface confirmation — DELIVERED
- Asset read surface → `useAssetMaster` / `Asset` from `ASSETS_KEY`. **DESIGN-DECISION-FLAG**: custody picker uses `Asset` (richer fields: assetCode + name + serialNo); `useAssetTags` deferred (label-print scope, not custody).
- Gate-entry read path → no engine exists; `types/gate-entry.ts` exports `gateEntriesKey(entityCode)`. **DESIGN-DECISION-FLAG**: new sibling reads `localStorage.getItem(gateEntriesKey(...))` directly (READ-ONLY).
- TaskFlow tag convention → `custody-overdue:<recordId>` (mirrors S146 `exec-reminder:<apptId>`).
- `AttachDocuments` ref_type enum → `'task' | 'conversation' | 'obligation' | 'employee' | 'voucher'`. **DESIGN-DECISION-FLAG**: mail rows use `'voucher'` as closest generic; `refLabel` carries human context.
- FrontDeskPage module ids → no Mail Room pane previously; module union extended with `mail-inward / mail-outward / asset-custody / reception-diary`.

### Block 1 · §M backfill — DELIVERED
- `sprint-history.ts`: S146 `headSha: 'c06202c9'` backfilled with bank-date 2026-06-05; S147 entry added (`headSha: 'TBD_AT_BANK'`, `predecessorSha: 'c06202c9'`, `newSiblings: ['frontdesk-records-engine']`).

### Block 2 · Types (append to `src/types/frontdesk.ts`) — DELIVERED
- Types VERBATIM per prompt with one additive extension on `MailItem`: `acknowledgedViaOverride` + `acknowledgedOverrideReason` (reception-override semantics recorded for audit). **DESIGN-DECISION-FLAG**.
- Storage keys: `fd_mail_<entityCode>`, `fd_custody_<entityCode>`.
- ~70 LOC added.

### Block 3 · NEW SIBLING `frontdesk-records-engine` — DELIVERED
- 612 LOC · path `src/lib/frontdesk-records-engine.ts` · 20 functions.
- **Mail**: `createInwardMail` · `acknowledgeInwardMail({overrideReason?})` · `getUnclaimedInward` · `createOutwardMail` · `markSent` · `attachProofOfDispatch` · `confirmDelivery` · `getUnconfirmedOutward` (missingProofWarn for rpad/speed_post ≥2 days, never throws) · `linkScan` · `listMail` · `loadMail` · `getMail`.
- **Custody (DP-FD-4 · masters READ-ONLY)**: `issueAsset` (assetRefId existence check, one-open-per-asset throw, photo ≤1MB) · `returnAsset` · `getOverdueCustody` · `flagOverdueCustody` (idempotent · spawns TaskFlow `custody-overdue:<recordId>` · assignee=holder · priority=high · category=general).
- **Diary (DP-FD-16 · COMPUTED, never stored)**: `buildReceptionDiary`.
- **Gate bridge (DP-FD-1 READ-ONLY)**: `listGateEntriesReadOnly` (reads `gateEntriesKey`) · `linkVisitorToGateEntry` (unknown gate-entry throws · writes only `visitor.gateEntryRef` via additive `setVisitorGateRef` in `frontdesk-engine`).
- All mutations audited via inline `frontdesk_event` (D-AUDIT-SAFE wrapper).
- ID-CAPTURE CANON scope statement embedded in header: 12+ digit guard scopes to VISITOR fields only; mail.notes free-text exempt (AWB/tracking legitimacy).

### Block 4 · UI — DELIVERED
- **Mail Room goes LIVE** (last coming-soon pane falls):
  - `MailInwardPage` · kind tabs · unclaimed counter · ageing badge · acknowledge dialog with reception-override reason · gift-conditional fields in create dialog.
  - `MailOutwardPage` · register · mark-sent dialog (mode select) · confirm-delivery action · `missing proof` WARN badge (red) on rpad/speed_post ≥2 days · unconfirmed counter.
- `AssetCustodyPage` · issue dialog (asset picker from `useAssetMaster` · holder from `useEmployees` · due-back · condition) · open register with overdue badges · return dialog · **"Flag overdue → tasks"** action with toast surfacing new+already-flagged counts.
- `ReceptionDiaryPage` (DP-FD-16) · date nav · computed sections (visitors · unclaimed mail · unconfirmed outward · custody overdue · tomorrow's appointments · expected couriers) · print button.
- **Sidebar updated · ZERO requiredCards** (S146.T2 parity guard holds): Mail Room → Inward / Outward; Records → Asset Custody / Reception Diary. Keyboards `f n / f o / f a / f d`.
- `FrontDeskSidebar.types.ts` `FrontDeskModule` union extended; `FrontDeskPage.tsx` switch extended.
- **DEFERRED-WITH-REASON**: Overview strip extra counters (unclaimed mail / unconfirmed outward / custody overdue) — `FrontDeskWelcome` retained as-is; the per-module headers already surface the counts. Visitor row "Link gate entry" picker — engine support present (`linkVisitorToGateEntry`) but not surfaced in the visitor row UI this pass to keep the diff bounded; deferred to next FrontDesk-bench polish sprint. The `AttachDocuments` proof-of-dispatch UI hook is also deferred (proof docId is settable via engine; the dialog wiring needs a refType decision that we flagged in Block 0).

### Block 5 · Registers + Tests — DELIVERED
- sibling-register: `frontdesk-records-engine` added (→ **216**); rich moats line.
- sprint-history: S147 entry per Block 1.
- `src/test/sprint-147/frontdesk-records.test.ts`: **40 it()** (floor ≥32 satisfied).
  - Inward: 12 cases (per-kind create · gift validation · ack flows · override · double-ack · ageDays math).
  - Outward: 8 cases (lifecycle · proof-before-sent throw · rpad WARN · confirmDelivery clears board · ageDays · recipient required · linkScan · listMail filter).
  - Custody: 7 cases (unknown asset throw · double-open throw · return + condition · overdue detection · flag spawns task with correct tag/assignee · idempotent re-run · photo cap throw · load).
  - Diary: 3 cases (empty-day honest · partitioning · expectedCouriers filter).
  - Gate bridge: 2 cases (missing entry throws · ref stored via additive update).
  - Canon + parity: 2 cases (12-digit in mail.notes does NOT throw · sidebar parity zero requiredCards).
  - Audit + Registers + time-robust: 6 cases (audit on create · audit on return · S146 SHA `c06202c9` · S147 last entry TBD_AT_BANK · sibling 216 · injected-now math).

### Block 6 · ARC CLOSE Ceremony — DELIVERED (this file)

---

## GATES-LAST (real outputs · gates were the FINAL action before commit)

### TICK GREP — `grep -rn "tick" src/pages/erp/frontdesk/`
```
src/pages/erp/frontdesk/contacts/ContactBookPage.tsx:3: * @sprint Sprint 145 + S146 hotfix (tick→reload-callback)
src/pages/erp/frontdesk/visitors/RollCallPage.tsx:17:  // S145.T1 · reload-callback pattern (no tick-in-useMemo): state holds latest
src/pages/erp/frontdesk/visitors/VisitorsPage.tsx:3: * @sprint Sprint 145 + S146 (Book-a-room shortcut · tick→reload-callback)
src/pages/erp/frontdesk/visitors/VisitorsPage.tsx:40: // S145.T1 reload-callback pattern · no tick-in-deps.
```
**Verdict: PASS** — 4 hits, **ALL in header/inline comments** documenting the canonical pattern. **ZERO dependency-array uses.**

### TSC — `bunx tsc --noEmit`
```
(no output · 0 errors)
```

### ESLint — `bunx eslint . --max-warnings 0`
```
(no output · 0 errors, 0 warnings)
```

### Vitest — `bunx vitest run src/test/sprint-145 src/test/sprint-146 src/test/sprint-147`
```
✓ src/test/sprint-145/frontdesk.test.ts (42 tests)
✓ src/test/sprint-147/frontdesk-records.test.ts (40 tests)
✓ src/test/sprint-146/frontdesk-scheduling.test.ts (42 tests)
Test Files  3 passed (3)
Tests  124 passed (124)
```
S146 stale arc-guard updated: `NO S147 entry` → `NO S148 entry`; `S146 is most recent` → pinned-headSha + sibling ≥215 lower-bound. Honest evolution of forward-guard.

---

## §N COUNT
**S147 suite: 40 it()** — floor 32 cleared by +8.

---

## DESIGN-DECISION-FLAGs
1. **Asset picker surface** → `Asset` (useAssetMaster / `ASSETS_KEY`). Rejected `AssetTag` (label-print scope, not custody).
2. **Reception override semantics** → new fields `acknowledgedViaOverride: boolean` + `acknowledgedOverrideReason: string` on `MailItem`. Override does NOT bypass audit; reason is mandatory at the engine.
3. **Diary section boundaries** → date partitions on UTC YYYY-MM-DD slice of `checkInAt`/`checkOutAt`. Empty-day returns empty arrays (no synthetic placeholders).
4. **Gate-entry read** → direct localStorage via `gateEntriesKey`. No engine exists to defer to.
5. **Visitor `gateEntryRef` write** → additive `setVisitorGateRef` in `frontdesk-engine.ts` (audited update). Scope wall (gate-entry.ts) untouched.

---

## §L NOTES (P2BB)
- Courier API tracking (live AWB poll) — out of scope, recorded as `[JWT]` in engine header.
- Retention enforcement (mail/custody) — out of scope, recorded as `[JWT]`.
- **ID-CAPTURE CANON scope statement (codified)**: the 12+ digit guard in `frontdesk-engine` scopes to **VISITOR fields only**. Mail `notes`/`awbDocketNo` are exempt because tracking numbers legitimately exceed 12 digits. An explicit boundary test asserts this in `src/test/sprint-147/frontdesk-records.test.ts`.

---

## ARC CLOSE · FrontDesk Pillar A.6-F (S145 → S147)

### 3-sprint ledger
| Sprint | Code | HeadSha | New Sibling | SIBLID |
|---|---|---|---|---|
| S145 | T-FrontDesk-A6F.1 | `de6e6e61` (post-T1) | `frontdesk-engine` | 214 |
| S146 | T-FrontDesk-A6F.2 | `c06202c9` (post-T2) | `frontdesk-scheduling-engine` | 215 |
| S147 | T-FrontDesk-A6F.3 | `TBD_AT_BANK` | `frontdesk-records-engine` | **216** |

### Modules shipped
Visitors · Contact Book · Watchlist · Roll-Call · Plan Visit · Walk-in Check-in · Meeting Rooms (Board + Calendar) · Executive Desk · **Mail Inward** · **Mail Outward** · **Asset Custody** · **Reception Diary** — **12 modules · all coming-soon panes retired.**

### DP-FD disposition (one-liners)
- **DP-FD-1** SCOPE WALL · gate-entry/gate-pass/weighbridge 0-DIFF — **HELD across all 3 sprints**.
- **DP-FD-2** Meeting Room conflict discipline · touching boundaries pass — **S146 ✓**.
- **DP-FD-3** Visitor planned + walk-in flows — **S145 ✓**.
- **DP-FD-4** Asset custody on READ-ONLY masters · one-open-per-asset · photo cap — **S147 ✓**.
- **DP-FD-5** Items-Carried reconciliation — **S145 ✓**.
- **DP-FD-8** Contact Book · per-party notes — **S145 ✓**.
- **DP-FD-9** Inward TF-29a acknowledgment + reception-override — **S147 ✓**.
- **DP-FD-10** Executive Desk pre-auth honesty · PA/reception-operated — **S146 ✓**.
- **DP-FD-12** Badge B-#### sequence — **S145 ✓**.
- **DP-FD-13** Watchlist symmetric visibility + mandatory reason — **S145 ✓**.
- **DP-FD-14** Roll-Call / muster · overstays via expectedDuration — **S145 ✓**.
- **DP-FD-15** Outward proof-of-dispatch lifecycle · rpad/speed_post WARN — **S147 ✓**.
- **DP-FD-16** Reception Diary COMPUTED · never stored — **S147 ✓**.
- **DP-FD-17** Evacuation print — **S145 ✓**.
- **DP-FD-18** ID-CAPTURE CANON · idProofLast4 max 4 · 12+ digits throws on visitor fields · photo ≤1MB — **S145 ✓ · scope statement codified at S147 to allow mail.notes/AWB exemption**.

### PV ledger
- **S146-PV-1** (founder screenshot · post-S146 close · blank FrontDesk sidebar for non-admin) — root cause: `ROLE_DEFAULT_CARDS` gap. Fixed at **S146.T1** (added frontdesk to hr/operations, taskflow to finance/sales/operations/hr; added `ADMIN_ONLY_CARDS` allowlist + standing assertion).
- **S146-PV-2** (founder screenshot · post-T1 · sidebar still blank) — root cause: `frontdesk-sidebar-config` was the **only** sibling using per-item `requiredCards`. Fixed at **S146.T2** (removed all per-item gating · pattern-parity guard added).

### T-fix classes banked as canon
1. **Tick-in-deps** → canonical `reload-callback` pattern (`useState` + `useCallback` + `useEffect`) · S145.T1 lesson · tick-grep is now a mandatory pre-gate ritual.
2. **Sidebar visibility** → 2-layer canon: (a) `ROLE_DEFAULT_CARDS` MUST include every `active` card OR the card must be in `ADMIN_ONLY_CARDS` (standing assertion enforces); (b) sidebar items MUST carry ZERO per-item `requiredCards` (parity assertion enforces). Both assertions live in the S146 suite and continue to pass at S147.

### PV REQUEST (standing for UI sprints) — required at audit
**Founder screenshot of the Mail Room module rendered from a non-admin profile is requested at audit time.** This validates that the visibility canon (role defaults + zero per-item gating) holds for the newly-live Mail Room pane and that the operations/hr default surfaces it.

### Clean-tree proof
Will be captured at bank as `git status --porcelain` empty after the test runs.

### §H proof (planned at bank)
`git diff c06202c9..HEAD --name-only` will be filtered to confirm: approval-workflow-engine, Comply360, push-notification-bridge, dispatch gate types (`src/types/gate-entry.ts`, `gate-pass.ts`, `weighbridge-ticket.ts`), and asset masters (`src/types/asset-master.ts`, `fixed-asset.ts`, `asset-tag.ts`) all show **ZERO** entries in the diff.

---

## LOC ACCOUNTING
Target ~1500 · actual:
- types append: ~70
- engine sibling: ~612
- frontdesk-engine additive `setVisitorGateRef`: ~13
- UI pages (4): ~570
- tests: ~330
- registers + sidebar + page wiring: ~80
- **Total ≈ ~1675** (≈+12% vs target · driven by 4 UI pages closing the arc).

🏁 **FrontDesk Arc CLOSED.**
