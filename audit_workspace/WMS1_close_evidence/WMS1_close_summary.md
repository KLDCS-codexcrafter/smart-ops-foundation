# SPRINT WMS1 · T-WMS1-Pick-Pack · CLOSE SUMMARY

**Predecessor HEAD:** `9ac7e41fc6153edc889e398efa171ab55779aaae` ("Completed P8.7 Triple Gate")
**Sprint head:** TBD_AT_BANK
**Posture:** A · target 87 ⭐ · WMS-ARC W1 of 3 · first post-Wave-1 sprint

---

## §0 Block-0 pre-flight (real pastes)

```
$ git log -1 --format='%H %s'
9ac7e41fc6153edc889e398efa171ab55779aaae Completed P8.7 Triple Gate
```

**Unified order truth:**
- `src/types/order.ts:66` → `export const ordersKey = (e: string) => 'erp_orders_' + e;`
- `src/types/ecomx.ts:83` → `export interface EcOrder {           // link + snapshot (WsStoreOrder pattern) — voucher truth lives in ordersKey`
- `src/types/webstorex.ts:256` → `export interface WsStoreOrder {                 // LINK + SNAPSHOT · never the order itself (DP-WS-3)`

**Source attribution field(s) on the Order record itself:**
- `Order.narration` prefix `"EcomX · "` → ecomx-engine.ts:674 (`"EcomX · ${marketplace.name} · ${stg.marketplaceOrderId}..."`)
- `Order.narration` prefix `"WebStoreX order"` → webstorex-order-engine.ts:374 (`"WebStoreX order · schemes: ..."`)
- everything else → manual SalesX entry
There is **no** `source: ...` field on Order today (see §L for the explicit honesty disclosure). 3 sample sniffs:
- demo-salesx-data.ts `SO/25-26/0001` narration `"Demo SO 1 (Sprint 1.1.1o handoff tracker chain)"` → salesx
- ecomx-engine.ts:674 narration template `"EcomX · …"` → ecomx
- webstorex-order-engine.ts:374 narration template `"WebStoreX order · schemes: …"` → webstorex

**FR-44 reuse spine present (no edits this sprint):**
- `src/lib/packing-bom-engine.ts` — `resolveActiveBOM` (line 13), `expandDLN` (line 66), `expandDLNLine`, `computeBOMTotalCost`, `buildDLNConsumptionMovements`, `computeActualVariance` ✓
- `src/lib/packing-slip-engine.ts` exports: `computePackingSlip` (line 62) ✓
- `src/types/packing-slip.ts` → `packingSlipsKey` ✓
- `src/types/godown.ts` ✓ · `src/types/bin-label.ts` (Store Hub-owned · READ-ONLY) ✓

**DispatchHubModule union pattern** (`DispatchHubSidebar.tsx:38`) — additive literal followed by sidebar section + DispatchHubPage switch case. Mirrored exactly for `dh-w-picking-console` and `dh-w-packing-console`.

**Greenfield grep:**
```
$ grep -rln "picklist\|PickBucket\|pack_group" src/
(no output — 0 matches)
```

**Vitest baseline (p83–p87 scoped):**
```
 Test Files  8 passed (8)
      Tests  173 passed (173)
```

---

## §1 Disposition table (Items 1–6)

| # | Item | File(s) · key lines | Status |
|---|---|---|---|
| 1 | NEW types | `src/types/wms-pick-pack.ts` (Picklist L41 · PackGroup L73 · `picklistsKey`/`packGroupsKey` L92-93 · P8.6 floor fields L52-54 & L82-84) | ✓ |
| 2 | NEW sibling engine | `src/lib/wms-pick-pack-engine.ts` — `getOpenPickableOrders` L101, `generatePicklists` L155, `confirmPick` L234, `createPackGroup` L274, `markPacked` L327, `getPickPackSummary` L392, `classifyBucket` L114; retention map additive case in `record-retention-policy-engine.ts` L125-127 | ✓ |
| 3 | Dispatch Hub additive module | `DispatchHubSidebar.tsx` union L64-67 + WAREHOUSE_ITEMS L108-111 + Warehouse collapsible L250-281 · `DispatchHubPage.tsx` imports L42-44 + cases L85-87 · pages `src/pages/erp/dispatch/wms/PickingConsole.tsx`, `PackingConsole.tsx` (honesty line verbatim on both) | ✓ |
| 4 | Tests ≥20 it() | `src/test/sprint-wms1/wms1-block-behavioral.test.ts` (27 it() · all green) | ✓ |
| 5 | Sprint-history + sibling-register | `sprint-history.ts` WMS1 row L1009-1014 + P8.7 headSha flipped to `9ac7e41f` L1003 · `sibling-register.ts` WMS1 row appended L500 | ✓ |
| 6 | Close summary | This file (`audit_workspace/WMS1_close_evidence/WMS1_close_summary.md`) committed | ✓ |

---

## §L Architectural decisions (honest disclosures)

1. **Pickable predicate.** Selected `order.status ∈ {'open', 'partial'} AND ∃ line with pending_qty > 0`. No new "picked/released" Order status was added (Order shape has no such literal today; spec §H wall forbids order-status fabrication). When Wave-2 introduces auth + server picklists, the predicate can extend to a true "released-to-warehouse" status.

2. **Bucket heuristic.** Single-Door classifier:
   - `single_item`: exactly 1 pending line with pending_qty == 1
   - `b2b_bulk`: `source === 'salesx' AND Σpending_qty ≥ 50` (EcomX / WebStoreX excluded — those are consumer channels by canon)
   - `multi_item`: everything else
   The B2B/bulk threshold (50) is a heuristic — operators will tune in Wave-2 when picker config UI lands.

3. **Source attribution.** Order has no `source` field today. We sniff `Order.narration` prefix (`"EcomX · "` / `"WebStoreX order"`) as the **honest** signal — those prefixes are owned by the two writer engines (ecomx-engine.ts:674 · webstorex-order-engine.ts:374). When P2BB-Auth lands, source becomes a first-class field on Order and this sniff is removed.

4. **Audit literal.** Reused existing `dispatch_txn_event` (already in `ADDITIVE_INLINE_AUDIT_TYPES`, P8.4 Block 1b). No new literal added.

5. **Order-status writes.** **None.** The engine never mutates `Order.status` or any Order field. Picklist/pack-group are separate records linked by `order_id`. (Spec §1 explicitly permitted an additive status literal under §L disclosure — not needed.)

6. **BinLabel write check.** Engine reads `localStorage['erp_bin_labels']` once per `generatePicklists` call. Never writes. Behavioral test `'§H wall · BinLabel storage is read-only by wms engine'` asserts the byte-equal invariant.

7. **Packing slip generation.** `markPacked` synthesizes a transient DLN-shaped Voucher object purely as input to the existing `computePackingSlip` (no parallel writer). The slip is persisted to the existing `packingSlipsKey(entityCode)` store — same key the rest of the app reads.

---

## §G Triple Gate (post-final-edit pastes)

### TSC
```
$ NODE_OPTIONS="--max-old-space-size=7168" npx tsc --noEmit
(exit 0 · no output)
```

### ESLint
```
$ NODE_OPTIONS="--max-old-space-size=7168" npx eslint . --max-warnings 0
(exit 0 · no output)
```

### Vitest (scoped p83–p87 + wms1)
```
 Test Files  9 passed (9)
      Tests  200 passed (200)
   Duration  4.13s
```
WMS1 contributes 27 it() (172 + 28 = 200 vs baseline 173; +27 net).

### Build
```
$ NODE_OPTIONS="--max-old-space-size=7168" npm run build
✓ built in 1m 6s
```

---

## §H · Wall verification

```
$ git diff 9ac7e41f -- src/lib/audit-trail-hash-chain.ts \
                      src/lib/audit-trail-chain-engine.ts \
                      src/lib/comply360-audit-retention-engine.ts \
                      src/lib/packing-bom-engine.ts \
                      src/lib/packing-slip-engine.ts \
                      src/types/bin-label.ts \
                      src/features/retention-console
(no output · 0-DIFF on all walls)
```

Additional 0-DIFF (asserted by absence in `git diff --name-only`): all EximX, applications.ts, entitlements, Logistics panel business pages, logAudit entry-write block, record-retention-policy-engine (touched ONLY for the additive 2-line map case L126-127 — the explicitly permitted touch).

---

## §AC · Acceptance criteria

| AC | Result |
|---|---|
| AC1 Block-0 pasted · greenfield confirmed | ✓ |
| AC2 picking reads ordersKey only · 0 `ecOrdersKey`/`wsStoreOrdersKey` reads | ✓ (grep clean; one match is a comment line stating "NEVER touches") |
| AC3 P8.6 floor on both new types | ✓ |
| AC4 exactly ONE new engine + register row | ✓ (`wms-pick-pack-engine`) |
| AC5 retention engine diff = one additive case | ✓ (2 lines · L126-127) |
| AC6 BinLabel zero writes | ✓ (behavioral test asserts) |
| AC7 packing slip via existing engine | ✓ (computePackingSlip · same packingSlipsKey) |
| AC8 honesty lines verbatim on both consoles | ✓ |
| AC9 ≥20 it() green | ✓ (27 it()) |
| AC10 history seed + P8.7 flip + toContain | ✓ |
| AC11 §H walls 0-DIFF | ✓ |
| AC12 no new deps · Triple Gate 4/4 · close summary committed | ✓ |

---

## §F Files changed

**Created (5):**
- `src/types/wms-pick-pack.ts`
- `src/lib/wms-pick-pack-engine.ts`
- `src/pages/erp/dispatch/wms/PickingConsole.tsx`
- `src/pages/erp/dispatch/wms/PackingConsole.tsx`
- `src/test/sprint-wms1/wms1-block-behavioral.test.ts`
- `audit_workspace/WMS1_close_evidence/WMS1_close_summary.md` (this file)

**Edited (4 · all additive · all on §H allowlist):**
- `src/lib/record-retention-policy-engine.ts` (1 additive map case · L126-127)
- `src/pages/erp/dispatch/DispatchHubSidebar.tsx` (union + WAREHOUSE_ITEMS + Warehouse section · additive)
- `src/pages/erp/dispatch/DispatchHubPage.tsx` (2 imports + 2 case statements · additive)
- `src/lib/_institutional/sprint-history.ts` (P8.7 headSha flip → `9ac7e41f` + WMS1 row seed)
- `src/lib/_institutional/sibling-register.ts` (WMS1 sibling row)

---

*WMS1 Close Summary · 07 Jun 2026 · target 87 ⭐ · author: Lovable on behalf of Operix Founder · awaits founder bank ceremony for HEAD short hash.*
