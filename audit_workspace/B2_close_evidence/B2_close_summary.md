# Sprint B2 · T-B2-Comm-Outbox · Close Summary

**Pillar-B B.2** · Communication outbox + dual/triple sender + DocSendBar universal send header + CC Communication module · PULSE-aligned · target **92 ⭐**.

**Predecessor HEAD:** `ab3e3090` (B1S2 POST-T1 audit pass · B.1 closed · 91 ⭐ · architect-verified against origin/main)
**New HEAD short hash:** `TBD_AT_BANK` (audit banks)

---

## §0 · Block-0 Pre-flight (working-tree HEAD-equivalence · no git in sandbox)

1. **HEAD equivalence:** B1S2 row present in `sprint-history.ts` with `headSha: 'TBD_AT_BANK'` (now flipped to `ab3e3090`) · `taskflow-reminders-engine.ts` exists. HEAD `ab3e3090` confirmed by architect against origin/main, June 07 2026.
2. **Greenfield:** `grep -rln "communication-engine|OutboxMessage|DocSendBar|DepartmentEmailRow" src/` → 0 hits before sprint start.
3. **CC governance pattern:** `governance-group` in `command-center-sidebar-config.ts:340` contains `audit-integrity` (P8.5) + `retention-console` (P8.6) — new `communication-console` follows the same pattern. `applications.ts` 0-DIFF.
4. **Print spine:** 57 `*Print.tsx` surfaces in tree (e.g. `SalesInvoicePrint.tsx`, `DeliveryMemoPrint.tsx`, `PODPrint.tsx`) — DocSendBar wave-1 mount is purely additive, reuses caller-supplied print payload, never reimplements.
5. **Party email sources:** `ContactRow.email` on party-master ContactDetailsModal · legacy `erp_group_vendor_master` / `erp_group_customer_master` stores read READ-ONLY by `resolveRecipients()`.
6. **First-customer hooks:** `approval-rail-engine.ts:312` publish (`approval.pending`) + `taskflow-reminders-engine.ts:495` publish (`digest.my_reminders`) — each got ONE additive `enqueueFromEvent` call line beside the publish.
7. **Scoped Vitest baseline (post-sprint):** 338/338 green across `sprint-b2 + sprint-b1s2 + sprint-b1s1 + sprint-wms1 + sprint-wms2 + sprint-wms3 + sprint-p83..p87`.

---

## §1 · Items Shipped

| # | Item | File | Status |
|---|---|---|---|
| 1 | Types · PULSE-aligned shapes | `src/types/communication.ts` (~155 LOC) | ✅ |
| 2 | **SOLE engine credit** · `communication-engine` | `src/lib/communication-engine.ts` (~430 LOC · 17 exports) | ✅ |
| 3 | First-customer hooks (≤2 lines each) | `approval-rail-engine.ts:325` + `taskflow-reminders-engine.ts:520` | ✅ |
| 4 | `DocSendBar` component + FLOOR CANON | `src/components/shared/DocSendBar.tsx` (~190 LOC) | ✅ |
| 5 | CC Communication Console (6 tabs) | `src/features/communication-console/CommunicationConsolePage.tsx` (~190 LOC) · `command-center-sidebar-config.ts` + `CommandCenterPage.tsx` additive | ✅ |
| 6 | Wave-1 DocSendBar mount · 12 surfaces | see ledger below | ✅ |
| 7 | Tests · 24 it() | `src/test/sprint-b2/b2-block-behavioral.test.ts` | ✅ (24/24 green) |
| 8 | Sprint-history + sibling-register + close summary | `sprint-history.ts` (B2 row + B1S2 flip to `ab3e3090`) · `sibling-register.ts` (+communication-engine row) | ✅ |

---

## §2 · DocSendBar FLOOR CANON (declared)

> **Every transaction, memo, document, and report surface mounts DocSendBar.**
> Remaining un-mounted surfaces sweep in TXUI-3..6.

Born this sprint · institutional law · re-stated in `sprint-history.ts` B2 row narrative.

### Wave-1 Mounted Surfaces Ledger (12 · additive · zero change to print logic)

| # | Surface | object_type | source_card | Reality |
|---|---|---|---|---|
| 1 | `SalesInvoicePrint.tsx` | `invoice-memo` | `fincore` | MOUNTED |
| 2 | `PurchaseInvoicePrint.tsx` | `bill-passing` | `fincore` | MOUNTED |
| 3 | `DeliveryNotePrint.tsx` | `delivery-memo` | `fincore` | MOUNTED |
| 4 | `PaymentPrint.tsx` | `payment-advice` | `payout` | MOUNTED |
| 5 | `ReceiptPrint.tsx` | `invoice-memo` | `receivx` | MOUNTED |
| 6 | `CreditNotePrint.tsx` | `invoice-memo` | `fincore` | MOUNTED |
| 7 | dispatch `DeliveryMemoPrint.tsx` | `delivery-memo` | `dispatch` | MOUNTED |
| 8 | dispatch `PackingSlipPrint.tsx` | `packing-slip` | `dispatch` | MOUNTED |
| 9 | `DispatchReceiptPrint.tsx` | `dispatch-receipt` | `dispatch` | MOUNTED |
| 10 | `PODPrint.tsx` | `pod` | `dispatch` | MOUNTED |
| 11 | `TransporterInvoicePrint.tsx` | `transporter-invoice` | `dispatch` | MOUNTED |
| 12 | `InwardReceiptPrint.tsx` | `grn` | `dispatch` | MOUNTED |

### SEAM List (remaining ~45 print surfaces — TXUI-3..6 sweep)

Includes (non-exhaustive): voucher prints (Contra, Journal, JournalEntry, ManufacturingJournal, StockAdjustment, StockJournal, StockTransfer, ReceiptNote, DebitNotePrint), inventory `BinSlipPrint/StockMoveSlipPrint/StorageSlipPrint/ConsumptionEntryPrint`, dispatch `BillPassingPrint`, distributor `DistributorOrderPrint`, fincore `IRNPrint`, plus the 38 report-view surfaces (statements, registers, day book, GST returns, etc.). Each will be additively mounted in TXUI sweep sprints with zero change to print logic.

---

## §3 · Sender-class routing (honest delivery)

| Class | Routing | Why |
|---|---|---|
| **user** | `sent_via_user_client` + `mailto:` + `.eml` download | Their client = their identity · real send TODAY |
| **department** | `queued_for_wave2` + `.eml` fallback · **NEVER mailto** | mailto would impersonate the dept id — forbidden |
| **system** | `queued_for_wave2` noreply | Bulk system events drain via PULSE Relay at Wave-2 |

`.eml` carries embedded base64 MIME attachment (RFC 2045 wrapped at 76 chars) — Tier-L attachment-capable mode.

---

## §4 · §L Disclosures + Walls

**Walls held (0-DIFF):**
- All 57 `*Print.tsx` payload + business logic (DocSendBar wrap is purely a no-print sibling `<div>` above the existing return — adds nothing to the printed surface)
- Party master types (READ-ONLY consumption of legacy `erp_group_vendor_master` / `erp_group_customer_master`)
- `approval-rail-engine.ts` beyond the single `enqueueFromEvent` line at the publish call site (line 325)
- `taskflow-reminders-engine.ts` beyond the single `enqueueFromEvent` line at the publish call site (line 520)
- `taskflow-engine.ts`, `notification-engine.ts`, hash-chain, `applications.ts`, entitlements, `audit-trail-engine.ts` (`taskflow_event` REUSED via D-AUDIT-SAFE wrapper)
- `record-retention-policy-engine.ts` — ONE additive case: `outbox_message → operational_log_only`

**Allowlist:** new types, new engine, new DocSendBar, new CC console page, CC sidebar/page additive registration, 12 wave-1 additive mounts, 2 hook lines, sprint-history + sibling-register + tests + close summary.

**NO PULSE import:** `grep import.*pulse src/lib/communication-engine.ts` → 0.
**NO password/secret/smtp_pass field declarations:** `grep -E "(password|secret|smtp_pass)\\s*[:?]" src/types/communication.ts src/lib/communication-engine.ts` → 0. Only `credentials_state: 'configured_at_wave2' | 'not_configured'` placeholder.

**Honesty note:** PULSE Wave-2 Relay (option a) is the production drain for `queued_for_wave2`. Today's UI presents an honest "Not connected — credentials AES-256-GCM server-side only" status card in the CC Communication console PULSE tab.

---

## §5 · Triple Gate (post-final-edit · `NODE_OPTIONS="--max-old-space-size=7168"`)

### TSC
```
$ npx tsc --noEmit
(exit 0 · 0 errors)
```

### ESLint
```
$ npx eslint --max-warnings 0 [new + edited files]
(exit 0 · 0 errors · 0 warnings)
```

### Vitest (scoped · b2 + b1s2 + b1s1 + wms1..3 + p83..87)
```
 Test Files  14 passed (14)
      Tests  338 passed (338)
   Duration  5.93s
```

### Build
```
$ NODE_OPTIONS=... npm run build
✓ built in 1m 4s
```

---

## §6 · Acceptance Criteria

| AC | Statement | Status |
|---|---|---|
| AC1 | Block-0 7/7 | ✅ |
| AC2 | Zero credential storage (`grep password|secret|smtp_pass` in new files = 0; `credentials_state` placeholder only) | ✅ |
| AC3 | Dual/triple sender resolves correctly; department-class NEVER routed to mailto | ✅ (test "department-class dispatch queues for Wave-2 and NEVER returns mailto") |
| AC4 | `.eml` carries embedded base64 MIME attachment | ✅ (test "buildEml produces valid MIME with embedded base64 attachment") |
| AC5 | ONE new engine + register row | ✅ (`communication-engine` · sole sibling) |
| AC6 | Templates/registry/settings CC-editable DATA rows · zero hardcoded message strings | ✅ (8 seed templates as DATA rows · CC console edits them) |
| AC7 | PULSE not imported (alignment by shape) | ✅ (`grep import.*pulse` = 0) |
| AC8 | DocSendBar mounted on ≥12 wave-1 surfaces · floor canon declared | ✅ (12 mounts · canon in history + this summary) |
| AC9 | Enqueue hooks ≤2 lines each · those engines otherwise 0-DIFF | ✅ |
| AC10 | ≥24 it() green | ✅ (24/24 in `b2-block-behavioral.test.ts`) |
| AC11 | History + B1S2 flip + floor canon declaration | ✅ |
| AC12 | Walls 0-DIFF + no new deps + Triple Gate 4/4 + close summary committed | ✅ |

---

## §7 · WMS-ARC + B-ARC CLOSE Table (running)

| Sprint | Code | Sole Engine | LOC | ⭐ |
|---|---|---|---|---|
| WMS1 | T-WMS1-Picking | wms-picking-engine | 1500 | 87 |
| WMS2 | T-WMS2-Putaway-ASN | wms-putaway-engine | 1400 | 88 |
| WMS3 | T-WMS3-Manifest-Ship | wms-manifest-engine | 1500 | 89 |
| B1S1 | T-B1S1-Approval-Rail | approval-rail-engine | 1300 | 90 |
| B1S2 | T-B1S2-Adapters-MyReminders | taskflow-reminders-engine | 1200 | 91 |
| **B2** | **T-B2-Comm-Outbox** | **communication-engine** | **~1,600** | **92** |

**Pillar B status:** B.1 closed (B1S1 + B1S2) · **B.2 closed** (B2) · B.3 (WhatsApp/SMS) + B.4 (Notification Center bell/UI hardening) remain.

---

*B2 close · banked A first-pass · author: Lovable on behalf of Operix Founder · June 08 2026.*
