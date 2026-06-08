# Sprint B3 · T-B3-WhatsApp-Channel · Close Summary

**Sprint identity:** B3 · T-B3-WhatsApp-Channel · Pillar-B **B.3 CLOSE**
**Predecessor HEAD:** `f6f5fcc9` ("Completed B2 Sprint pass" · B.2 banked A first-pass · 92 ⭐)
**Streak target:** 93 ⭐
**Bank date:** 2026-06-08
**New HEAD short hash:** `TBD_AT_BANK`

---

## §0 · Pre-flight (Block 0 · paste real outputs)

1. **HEAD equivalence** (sandbox lacks git → working-tree confirmation per Operix Execution Discipline §1):
   - `src/lib/communication-engine.ts` present (B.2 spine · 428 LOC pre-edit)
   - `src/lib/distributor-whatsapp-notify.ts` present (115 LOC · wa.me precedent · NOT FORKED)
   - sprint-history B2 row at line 1042 with `predecessorSha: 'ab3e3090'` + `headSha: 'TBD_AT_BANK'` (flipped to `f6f5fcc9` in Item 6)
   - HEAD `f6f5fcc9` confirmed by architect against origin/main, June 07 2026.

2. **Greenfield** (`grep -rln "whatsapp-channel-engine\|buildWaMe\|WhatsAppTemplate" src/`):
   - `src/lib/payment-gateway-engine.ts` → `buildWaMePaymentMessage` (B2B receivables · UNRELATED · substring match only)
   - `src/pages/customer/Statement.tsx` + `src/pages/erp/receivx/transactions/PaymentLinks.tsx` → consumers of the above
   - **`whatsapp-channel-engine` = 0 · `buildWaMeLink` = 0 · `WhatsAppTemplate` = 0 · greenfield confirmed**.

3. **Consume shapes (0-DIFF posture)**:
   - `communication-engine.ts:185` `renderTemplate` · `:259` `resolveRecipients` · `:276` `composeFromDocument` · `:363` `dispatch` · `:393` `enqueueFromEvent` — all consumed
   - `src/types/communication.ts:69` `TemplateRow.channel: 'email'` (additive extension to `'email' | 'whatsapp'` per §1 Item 1)
   - `DocSendBar.tsx:133` disabled WhatsApp button stub (enabled per §2 Item 3)
   - `distributor-whatsapp-notify.ts` 115 LOC wa.me/CommunicationLog precedent (consumed pattern; **NOT forked** · AC7)

4. **Party phone sources** (READ-ONLY · E.164 normalization):
   - `src/types/party.ts` (Party master; phone present on legacy + extension fields)
   - `src/pages/erp/masters/LogisticMaster.tsx:53-58` `LogisticContact { phone: string; mobile: string }`
   - `src/types/foreign-vendor.ts` + `src/types/foreign-customer.ts` (phone fields)
   - `whatsapp-channel-engine.resolveWhatsAppRecipient` reads vendor/customer master phone, returns `null` when honest-unknown.

5. **First-customer hook reuse**: `EnqueueEventInput` extended with optional `channel?: CommChannel`. Approval-rail + reminders engines stay **0-DIFF** — WhatsApp callers invoke `enqueueWhatsAppFromEvent` directly to avoid circular import (documented in `communication-engine.ts:393`).

6. **Scoped Vitest baseline**: 338 / 14 files before edits (b2 + b1s2 + b1s1 + wms1–3 + p83–p87).

---

## §1 · Pass 1 · Types + WhatsApp Engine

### Item 1 · `src/types/communication.ts` (additive only)
- `CommChannel = 'email' | 'whatsapp'` (new)
- `WaCategory = 'utility' | 'marketing' | 'authentication'` (new)
- `DeliveryMode` += `'opened_in_whatsapp'`
- `TemplateRow.channel: CommChannel` (was `'email'`) + optional `wa_category?: WaCategory`
- `OutboxMessage.channel?: CommChannel` (defaults `'email'` back-compat)
- `EnqueueEventInput.channel?: CommChannel` (defaults `'email'` · approval/reminders never set it)

### Item 2 · `src/lib/whatsapp-channel-engine.ts` (NEW SIBLING · sole engine credit · ~400 LOC)
Exports:
- `normalizePhoneE164(raw, defaultCountry='IN'): string | null` — honest null over fabrication
- `resolveWhatsAppRecipient(objectType, sourceRecord, entityCode): string | null`
- `renderWhatsAppMessage(objectType, mergeData, entityCode, currentUserName?)` — 1024-cap + HTML strip + honest `(truncated)` tail
- `buildWaMeLink(phoneE164, message): string`
- `dispatchWhatsApp(input): WhatsAppDispatchResult` — class-aware: user → `wa.me` + `opened_in_whatsapp` · dept/system → `queued_for_wave2` NEVER `wa.me`
- `enqueueWhatsAppFromEvent(input: EnqueueEventInput): OutboxMessage | null` — reuses B.2 shape
- `listWhatsAppOutbox(entityCode)` — channel filter for CC
- `WA_MAX_BODY_CHARS = 1024`

**Pass-1 Gate:** TSC 0 · ESLint 0 (post-final-edit).

---

## §2 · Pass 2 · DocSendBar enable + CC channel variant + tests

### Item 3 · `DocSendBar.tsx` (enable WhatsApp · additive)
Replaced the disabled stub with a live action: preview modal (editable phone + 1024-char counter) → `dispatchWhatsApp` → user-class opens `wa.me`, dept/system shows "queued for Wave-2 (PULSE BSP)". Email/PDF/Print actions and existing props unchanged. 12 B.2-mounted print surfaces light up WhatsApp automatically (shared component).

### Item 4 · `CommunicationConsolePage.tsx` (Template channel variant)
- Channel toggle (Email/WhatsApp) per template
- WhatsApp rows show 1024-char counter, plain-text editor (no HTML controls), `wa_category` selector
- Outbox Monitor shows channel chips (✉/WA) + `opened_in_whatsapp` status
- 5 WhatsApp template seeds added to `communication-engine.listTemplates` (invoice-memo, delivery-memo, payment-advice, approval.pending, digest.my_reminders)
- `applications.ts` 0-DIFF

### Item 5 · Tests (`src/test/sprint-b3/b3-block-behavioral.test.ts`)
**24 it() · house posture (≥22 required):**
- E.164 normalize (bare 10-digit → +91 · international preserved · unparseable → null · rejects non-6-9 mobile)
- Recipient resolver (direct field win · vendor master read · honest null)
- WhatsApp render (no-template empty · merges · HTML strip · 1024-cap truncation note)
- `buildWaMeLink` encodes correctly
- `dispatchWhatsApp` class routing (user → wa.me + opened_in_whatsapp · dept → queued · system → queued · honest reasons for missing template / phone)
- Outbox channel filter (`listWhatsAppOutbox` 1 message)
- `enqueueWhatsAppFromEvent` (success with wa_phone · honest null without · communication-engine returns null for `channel: 'whatsapp'`)
- TemplateRow accepts `channel: 'whatsapp'` + `wa_category` · ≥5 WA seeds
- AC2: zero BSP token/apikey/secret in `whatsapp-channel-engine.ts`
- AC7: PULSE not imported · `distributor-whatsapp-notify.ts` not forked
- AC11: approval-rail-engine + reminders engine do NOT import whatsapp engine (0-DIFF)
- AC11: DocSendBar WhatsApp button enabled
- Sprint-history B3 row with predecessor `f6f5fcc9` + WA sibling
- Sprint-history B2 headSha flipped to `f6f5fcc9`

### Item 6 · Sprint-history + sibling-register + close summary
- B3 row inserted (`predecessorSha: 'f6f5fcc9'`, `newSiblings: ['whatsapp-channel-engine']`, narrative includes **"B.3 CLOSED · WhatsApp live on DocSendBar via wa.me · PULSE BSP = Wave-2 target · Pillar-B email+WhatsApp channels complete"**)
- B2 row `headSha` flipped from `TBD_AT_BANK` to `f6f5fcc9` (architect-verified)
- SIBLING registered: `whatsapp-channel-engine` with full narrative (sole engine credit · PULSE BSP-aligned by SHAPE only · NO BSP tokens client-side)

---

## §6 · Acceptance Criteria

| AC | Status | Evidence |
|----|--------|----------|
| AC1 Block-0 6/6 + spine confirmed | ✅ | §0 above |
| AC2 zero BSP tokens client-side | ✅ | `grep -E "(bsp_token|bsp_secret|wa_api_key|whatsapp_token|apiKey|api_key|access_token)" src/lib/whatsapp-channel-engine.ts` → 0; test asserts |
| AC3 phone normalization honest (null > fabrication) | ✅ | 4 it() assertions |
| AC4 dept/system NEVER routed to wa.me · user-class wa.me real | ✅ | 3 dispatch tests |
| AC5 ONE engine + register row | ✅ | `whatsapp-channel-engine` only; sibling-register updated |
| AC6 WA templates `channel:'whatsapp'` in SAME Template Master · 1024 + no-HTML | ✅ | seed + tests |
| AC7 PULSE not imported · distributor-whatsapp-notify not forked | ✅ | 2 test assertions; engine import list clean |
| AC8 reminder/approval WA reuses B.2 enqueue shape · those engines 0-DIFF | ✅ | `EnqueueEventInput.channel?` additive; approval-rail-engine + reminders-engine still 0-DIFF (test asserts no import) |
| AC9 ≥22 it() green | ✅ | 24 it() · all green |
| AC10 history + B.2 flip + B.3 CLOSE declaration | ✅ | Item 6 above |
| AC11 walls zero-diff list | ✅ | See §H below |
| AC12 no new deps · Triple Gate 4/4 · close summary committed | ✅ | See gates below |

---

## §H · Walls

- `distributor-whatsapp-notify.ts` — **0-DIFF**
- `src/lib/approval-rail-engine.ts` — **0-DIFF** (test asserts no whatsapp-channel-engine import)
- `src/lib/taskflow-reminders-engine.ts` — **0-DIFF** (test asserts no whatsapp-channel-engine import)
- `src/lib/notification-engine.ts` · `src/lib/taskflow-engine.ts` — **0-DIFF**
- `src/lib/audit-trail-hash-chain.ts` · `src/lib/audit-trail-chain-engine.ts` — **0-DIFF**
- `src/lib/record-retention-policy-engine.ts` — **0-DIFF** (NO new case · WA reuses `outbox_message → operational_log_only`)
- `src/apps/erp/configs/applications.ts` · entitlements · 12 print surfaces — **0-DIFF** (WA lights up via shared DocSendBar component)
- Party master types — **READ-ONLY** (resolver reads existing phone fields)
- `src/lib/communication-engine.ts` — additive only (5 WA template seeds + `channel: 'whatsapp'` short-circuit returning `null` to keep first-customers 0-DIFF)
- **No PULSE imports** anywhere in the new engine

---

## §L · Honesty Notes

- **Phone normalization edge cases**: Bare 10-digit Indian mobiles require leading 6-9 (per TRAI mobile numbering); strings without a `+` and not matching Indian mobile patterns return `null` (no default-country fabrication beyond IN). International numbers require explicit `+CC` and 8..15 digits per E.164.
- **Channel template seeds** (B.3 adds 5 WhatsApp variants to the existing CC Template Master · CC-editable like email seeds):
  - `tpl-wa-inv-memo` — invoice-memo (user-class)
  - `tpl-wa-delivery` — delivery-memo (user-class)
  - `tpl-wa-payment` — payment-advice (department-class · `payout`)
  - `tpl-wa-approval` — approval.pending (system-class)
  - `tpl-wa-reminders` — digest.my_reminders (system-class)
- **Attachment honesty**: `wa.me` deep links cannot pre-attach files. When the caller supplies a PDF name, the message body carries a `(attach the downloaded PDF: filename.pdf)` line until Wave-2 BSP media send arrives.
- **EnqueueFromEvent + circular imports**: A direct delegate from `communication-engine.enqueueFromEvent` to `whatsapp-channel-engine.enqueueWhatsAppFromEvent` would create a circular import. Instead, `enqueueFromEvent` returns `null` when `channel === 'whatsapp'`, and WhatsApp callers (e.g., the CC, future Wave-2 schedulers) invoke `enqueueWhatsAppFromEvent` directly. This keeps approval-rail-engine and taskflow-reminders-engine **0-DIFF** — they never set `channel`, so their behavior is unchanged.
- **B.2 brittle test** (`src/test/sprint-b2/b2-block-behavioral.test.ts:212`): the `expect(src).toContain('disabled')` assertion was relaxed to mirror the established **architect-owned posture fix** canon — B.3 legitimately enables the WhatsApp button, so the B.2 assertion has been updated to assert the four action labels (Email/WhatsApp/Download PDF/Print) without insisting on the disabled stub.

---

## Triple Gate (post-final-edit)

1. **TSC** (`NODE_OPTIONS="--max-old-space-size=7168" npx tsc -p tsconfig.app.json --noEmit`): exit 0 · zero errors.
2. **ESLint** (`--max-warnings 0` on touched files): exit 0 · zero warnings.
3. **Vitest scoped** (`b3 + b2 + b1s2 + b1s1 + wms1–3 + p83–p87`):
   ```
   Test Files  15 passed (15)
        Tests  370 passed (370)
     Duration  4.41s
   ```
4. **Build** (`NODE_OPTIONS="--max-old-space-size=7168" npm run build`):
   ```
   ✓ built in 51.09s
   ```

---

## Closing

**B.3 CLOSED.** Pillar-B (Operix Communication) email + WhatsApp channels complete. PULSE BSP integration is the Wave-2 target for queued department/system messages; user-class WhatsApp is real today via `wa.me`. Streak target 93 ⭐ banked at next sync.
