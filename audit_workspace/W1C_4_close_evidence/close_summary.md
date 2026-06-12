# W1C-4 · Close Summary — Auto-Send-on-Event (Tier-L)

**Sprint:** T-W1C4-AutoSend-TierL · Wave-1 Close Arc · sprint 4
**Predecessor HEAD:** f6d8bcb · 163 ⭐
**HEAD (new):** TBD_AT_BANK (164 ⭐)
**Scope:** Comm Pillar open item #1 — Tally "auto-email after voucher entry"
pattern, Tier-L honest. CC-editable rule registry → existing TemplateMaster
render → enqueue on existing outbox with `queued_for_wave2`. Zero new
delivery code, zero direct sends.

---

## Blocks

### Block 1 — Rule registry (NEW SIBLING · React-free)
- `src/lib/auto-send-rules-engine.ts` (NEW)
  - Sole namespaced key: `autoSendRulesKey(entityCode)` → `erp_auto_send_rules_<entity>`.
  - `AutoSendRule { id; event; enabled; templateId; templateObjectType; recipientResolver: 'party'|'department'|'fixed'; recipientValue?; senderClass: 'department'|'system'; channel: 'email'; lang: 'en'; description? }`.
  - `evaluateAutoSend(event, payload)`: match enabled rules → `resolveRule` (party via `resolveRecipients` · department via `listDepartmentEmails` · fixed with `targetUserId` mail-profile fallback) → `renderTemplate` (TemplateMaster) → write `OutboxMessage { delivery_mode: 'queued_for_wave2', status: 'queued' }` onto the existing outbox (`outboxKey`).
  - `handleNotificationEvent(evt)` — additive adapter for spine fan-out. The P8.2 `notification-engine` itself is **0-DIFF**.
  - `recentEnqueuesForRule(rule, 5)` — derived per-rule log over the existing outbox.
  - Audit via `logAudit` (reuses `taskflow_event` entityType — zero new audit types).

#### Starter rules · seeded DISABLED-BY-DEFAULT
Seeded only for events the **P8.2 notification spine** (NotificationKind union in `src/types/notification.ts`) actually emits **and** for which a TemplateMaster row exists:

| event              | template       | senderClass | resolver |
|--------------------|----------------|-------------|----------|
| `approval.pending` | `tpl-approval` | system      | fixed    |
| `digest.my_reminders` | `tpl-reminders` | system   | fixed    |

#### `STARTER_RULES_UNAVAILABLE` (honestly NOT seeded)
The prompt's suggested events are **not in the P8.2 spine** — exported for transparency, never seeded:
`voucher-posted` · `po-approved` · `dln-created` · `sla-breach` · `payment-released`.

### Block 2 — CC Admin surface
- `src/features/auto-send-rules/AutoSendRulesPage.tsx` (NEW)
  - Mounted under Command Center governance group (same admin-gating pattern as `CommunicationConsolePage` + `RetentionConsolePage` siblings).
  - Rule CRUD (enable/disable · template picker from TemplateMaster · recipient resolver + value · sender class · description).
  - Per-rule **last-5 enqueue log** rendered from the existing outbox.
  - Honest banner listing `STARTER_RULES_UNAVAILABLE`.
- Sidebar entry added in `command-center-sidebar-config.ts` (additive).
- `CommandCenterPage.tsx`: import + `'auto-send-rules'` module union + KNOWN_MODULES + hash list + switch case (all additive · communication-console + governance siblings 0-DIFF).

### Block 3 — Institutional + tests + close
- `sibling-register.ts`: appended **`auto-send-rules-engine`** — Wave-1 Close Arc's ONE new SIBLING (justified: a genuinely new orchestration engine; comm pillar open item #1).
- `sprint-history.ts`:
  - W1C-3 headSha backfilled `TBD_AT_BANK` → `f6d8bcb` · provenance `CONFIRMED`.
  - W1C-4 self-seeded: `code: 'T-W1C4-AutoSend-TierL'` · `newSiblings: ['auto-send-rules-engine']`.

---

## Tests · src/__tests__/w1c-4/ — 19 assertions across 5 files

```
✓ rule-crud.test.ts            (3)  · seed disabled · namespaced-key-only writes · CRUD round-trip
✓ evaluate-auto-send.test.ts   (4)  · enabled→queued_for_wave2 + render · disabled→skip · unknown→noop · targetUserId fallback
✓ no-direct-send-grep.test.ts  (4)  · no mailto/fetch/XHR/mail-protocol tokens · every enqueue uses queued_for_wave2
✓ starter-rules-honest.test.ts (2)  · STARTER_RULES_UNAVAILABLE captures 5 spine-absent events · not seeded
✓ institutional.test.ts        (6)  · history backfill + self-seed + sibling-register + CC sidebar/page wiring
```

## Triple Gate

```
TSC   :  npx tsc -p tsconfig.app.json --noEmit            → 0 errors
ESLint:  npx eslint <new files> --max-warnings 0          → 0/0
Vitest:  npx vitest run src/__tests__/w1c-4               → 19 passed (5 files)
```

## 0-DIFF walls held

- `src/lib/communication-engine.ts` (consumed: `renderTemplate` · `resolveRecipients` · `listDepartmentEmails` · `listUserMailProfiles` · `getCompanyMailSettings` · `listOutbox`)
- `src/types/communication.ts` (consumed: `OutboxMessage` · `outboxKey`)
- `src/lib/notification-engine.ts` + `src/types/notification.ts` (additive subscribe via `handleNotificationEvent` only — spine 0-DIFF)
- `DocSendBar` · all banked pages · all other CC modules

## Canon compliance

- Rules are **CC-editable DATA rows** under one namespaced key — no hardcoded message strings.
- Department + system class enqueue with **`queued_for_wave2`** — never mailto-impersonation (grep-lock).
- **NO credentials** read or written client-side.
- Templates via existing **TemplateMaster** shapes.
- **Zero PULSE imports** · PULSE-shaped by alignment only.
