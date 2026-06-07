# WMS2 Close Summary · T-WMS2-Putaway-ASN

**Sprint:** WMS2 · 2 of 3 in WMS-ARC · target 88 ⭐
**Predecessor HEAD:** `cf8a409d` ("Completed WMS1 pick-pack sprint")
**LOC:** ~1,450 (engine ~560 · types ~120 · consoles ~430 · tests ~370 · rider + registers ~30)
**New SIBLING:** `wms-putaway-engine` (sole engine credit)

---

## §0 · Block 0 Pre-flight Pastes (post-checkout · pre-edit)

1. **HEAD**
   ```
   $ git log -1 --format='%H %s'
   cf8a409dc453670d9922af7e73f9f4004589d7bb Completed WMS1 pick-pack sprint
   ```
2. **Greenfield**
   ```
   $ grep -rln "AsnRecord\|advance_shipping\|BinPlacement\|putaway" src/types src/lib
   (no matches)
   ```
3. **Reuse spine confirmed**
   - `src/types/bin-label.ts` · `BinLabel.items_assigned?: string[] | null` · `capacity?: number | null`
   - `src/types/item-location.ts` · `ItemLocation { godown_id?, bin_id?, … }` · `itemLocationsKey(e)='erp_item_locations_${e}'`
   - `src/types/inward-receipt.ts` · `InwardReceiptStatus = 'draft'|'arrived'|'quarantine'|'released'|'rejected'|'cancelled'` · `inwardReceiptsKey(e)='erp_inward_receipts_${e}'` · **status union untouched (no §L addition required)**
   - `src/types/import-purchase-order.ts` · `importPOKey(e)='erp_${e}_import_purchase_orders'`
   - `src/types/bill-of-entry.ts` · `billOfEntryKey(e)` exported (line 118)
   - `src/types/godown.ts` · `Godown` interface present · single-global key `'erp_godowns'`
4. **Rider sites located**
   - `src/lib/ecomx-engine.ts:675` · `narration: 'EcomX · ${marketplace.name} …'`
   - `src/lib/webstorex-order-engine.ts:374` · `narration: 'WebStoreX order · schemes: …'`
   - `src/lib/wms-pick-pack-engine.ts:77-87` · `classifyOrderSource` narration sniffer
5. **W1 Warehouse module pattern confirmed** in `DispatchHubSidebar.tsx` (WAREHOUSE_ITEMS · `warehouseOpen` state · collapsible block lines 250-280) and `DispatchHubPage.tsx` (`dh-w-*` switch cases lines 85-87).
6. **Scoped Vitest baseline** (pre-edit): 9 files · 200 tests.

---

## §1 · Item Disposition

| Item | Description | Status |
|---|---|---|
| 1 | `src/types/wms-putaway.ts` — types + keys, floor fields on both | ✅ |
| 2 | `src/lib/wms-putaway-engine.ts` — sole SIBLING · ASN + putaway + shelf + canon-5 import path + honest 3-step ladder | ✅ |
| 3 | Source-field rider · `Order.source?` + 2 birth-site plants + W1 fallback | ✅ |
| 4 | Two consoles (PutawayConsole + ShelfView) under Warehouse section · additive sidebar/page wiring | ✅ |
| 5 | `src/test/sprint-wms2/wms2-block-behavioral.test.ts` · 30 `it()` green (target ≥20) | ✅ |
| 6 | Sprint-history WMS2 seed + WMS1 headSha flip → `cf8a409d` · sibling-register · this close summary | ✅ |

---

## §L · Architectural Decisions

1. **Canon-5 enforcement** is structural: `generateAsnFromImportPO` only ever calls `safeRead` against `importPOKey` / `billOfEntryKey`. Test #7 ("Canon-5 proof") snapshots the byte content of both keys around the call and asserts no change. Zero `localStorage.setItem` call anywhere in the engine targets an EximX key.
2. **Suggestion ladder** is order-deterministic and unique-per-bin: step ③ skips bins that already appear in steps ① or ②. Capacity-null bins are dropped at step ③ rather than getting a synthetic capacity. Empty ladder returns a single entry with `basis: 'none'` so the UI/audit always carries a reason.
3. **Inward-receipt status union** required NO addition. ASN status `'received'` is local to ASN — receipts continue to flow `draft → arrived → quarantine|released`. Link is FK-only (`asn.inward_receipt_id`), never duplication.
4. **Audit literal reuse**: ASN create / arrive / link and BinPlacement create all use `dispatch_txn_event` (the existing dispatch lifecycle literal) — no new `AuditEntityType`, no `registerAuditEntityType` call. Mirrors WMS1.
5. **WMS1 forward-item closed**: `Order.source?` field added additively. `classifyOrderSource` now: **field → narration sniff (legacy fallback)**. Two one-line plants (ecomx ~677, webstorex ~376) and the W1 patch are the only writes outside the §H allowlist.

---

## §H · Walls Verified · 0-DIFF

ALL EximX files · `bin-label.ts` · `item-location.ts` · `godown.ts` · `inward-receipt.ts` (status union untouched) · `packing-bom-engine.ts` · `packing-slip-engine.ts` · `audit-trail-hash-chain.ts` · `audit-trail-chain-engine.ts` · `logAudit` entry-write logic · `comply360-audit-retention-engine.ts` · `RetentionConsolePage.tsx` · `applications.ts` · entitlements · all sidebars except `DispatchHubSidebar` (additive).

---

## §5 · Triple Gate Pastes (post-final-edit run)

```
$ NODE_OPTIONS="--max-old-space-size=7168" npx tsc --noEmit
(exit 0 · no output)

$ NODE_OPTIONS="--max-old-space-size=7168" npx eslint . --max-warnings 0
(exit 0 · no output)

$ NODE_OPTIONS="--max-old-space-size=7168" npx vitest run \
    src/test/sprint-wms2 src/test/sprint-wms1 \
    src/test/sprint-p83 src/test/sprint-p84 src/test/sprint-p85 \
    src/test/sprint-p86 src/test/sprint-p87
Test Files  10 passed (10)
Tests       230 passed (230)

$ NODE_OPTIONS="--max-old-space-size=7168" npm run build
✓ built in 1m 5s
```

Baseline 200 → +30 WMS2 = **230 tests** across **10 files**.

---

## Acceptance Criteria Check

AC1 ✅ Block-0 6/6 · AC2 ✅ EximX 0-DIFF (canon-5 proof test) · AC3 ✅ floor fields on AsnRecord + BinPlacement · AC4 ✅ ONE engine + registered · AC5 ✅ retention diff = 2 additive cases · AC6 ✅ BinLabel/ItemLocation/godown read-only (test #28) · AC7 ✅ honest ladder + basis on every placement · AC8 ✅ rider 3 sites · AC9 ✅ honesty lines verbatim on both consoles · AC10 ✅ 30 `it()` green · AC11 ✅ WMS2 row + WMS1 flip · AC12 ✅ walls 0-DIFF, Triple Gate 4/4, summary committed.
