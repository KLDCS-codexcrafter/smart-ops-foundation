# Sprint 151 · T-WebStoreX-A11.3 · Close Summary

**Predecessor SHA:** `f56afce2`
**HEAD SHA:** `TBD_AT_BANK` (backfilled at S152 Block 1)
**Sibling added:** #220 · `webstorex-order-engine` · `src/lib/webstorex-order-engine.ts`
**LOC:** ~1750

## Pillars

1. **DP-WS-3 · ONE-WRITE WALL** — `checkoutCart` creates a REAL Sales Order
   voucher via the existing `useOrders.createOrder` data path. Order shape +
   `ordersKey` storage consumed verbatim. `WsStoreOrder` is a LINK + evaluation
   snapshot, never the source of truth.

   *File:line citations:*
   * `src/lib/webstorex-order-engine.ts:241-244` — `writeSalesOrderVoucher` call
   * `src/lib/webstorex-order-engine.ts:360-383` — Order construction + `ordersKey` persist
   * `src/lib/webstorex-order-engine.ts:255-269` — `WsStoreOrder` snapshot

2. **DP-WS-8 · SERVER-SIDE TRUTH** — `evaluateCart` re-evaluated at commit.

   * `src/lib/webstorex-order-engine.ts:188-194`

3. **Append-only ledgers + atomic rollback** — points/voucher/credit
   redemption failure ABORTS, with reversing entries written for any committed
   ledger entry. Coupon `usedCount` increments only at checkout success.

   * `src/lib/webstorex-order-engine.ts:196-277`
   * `src/lib/webstorex-order-engine.ts:247-249` — `commitCouponUse` gating

4. **DP-WS-19.1 · Quick-Order Pad** — text + CSV parse; variant-SKU first.
   * `src/lib/webstorex-order-engine.ts:476-511`

5. **DP-WS-19.2 · Request-a-Quote** — REAL Quotation voucher via
   `quotationsKey` + `generateDocNo('RFQ', ...)`.
   * `src/lib/webstorex-order-engine.ts:400-471`

6. **DP-WS-19.6 · Saved Carts** + `loadSavedCart` + `buildReorderLines`.
   * `src/lib/webstorex-order-engine.ts:74-135` · `:516-522`

7. **Status mirror + payment-link attach**
   * `src/lib/webstorex-order-engine.ts:539-563`

8. **`askAboutProduct` → OperixChat customer channel**
   * `src/lib/webstorex-order-engine.ts:568-587`

## UI DELIVERED · file:line citations (v72 rule)

| Surface | File | Lines |
| --- | --- | --- |
| Browse storefront | `src/pages/erp/webstorex/storefront/StorefrontHomePage.tsx` | `42-94` |
| Product detail   | `src/pages/erp/webstorex/storefront/StorefrontProductPage.tsx` | `64-142` |
| Cart             | `src/pages/erp/webstorex/storefront/StorefrontCartPage.tsx` | `42-94` |
| Checkout         | `src/pages/erp/webstorex/storefront/StorefrontCheckoutPage.tsx` | `75-130` |
| Quick order      | `src/pages/erp/webstorex/storefront/StorefrontQuickOrderPage.tsx` | `26-67` |
| Saved carts      | `src/pages/erp/webstorex/storefront/StorefrontSavedCartsPage.tsx` | `60-105` |
| My orders        | `src/pages/erp/webstorex/storefront/StorefrontOrdersPage.tsx` | `54-101` |
| Request a quote  | `src/pages/erp/webstorex/storefront/StorefrontQuotePage.tsx` | `42-78` |
| Preview ribbon (DP-WS-22) | `src/pages/erp/webstorex/storefront/PreviewRibbon.tsx` | `7-17` |
| Cart hook        | `src/pages/erp/webstorex/storefront/storefront-shared.ts` | `39-80` |
| Shell wiring (8 storefront cases) | `src/pages/erp/webstorex/WebStoreXPage.tsx` | `61-68` |
| Sidebar group `Storefront` (8 items) | `src/apps/erp/configs/webstorex-sidebar-config.ts` | `33-39` |
| PWA guarded SW registration | `src/main.tsx` | `7-28` |

## Block-0 voucher-shape report (reproduced)

* **Order line shape** consumed verbatim from `src/types/order.ts`.
* **Order shape lacks an order-level discount field** → discounts (schemes +
  coupon + free-good math) expressed as a SYNTHETIC LINE with negative rate
  (`item_id: '__discount__'`). *DESIGN-DECISION-FLAG · founder review.*
* **Free goods** rendered as zero-rate `__free__`-marked SO lines.
* **Doc numbering** reuses `generateDocNo('SO', ...)` and `generateDocNo('RFQ', ...)`.
* **Dispatch status** mirror returns `null` — no readable dispatch surface at
  HEAD. *DESIGN-DECISION-FLAG · founder review.*

## Walls held · 0-DIFF

* `src/lib/webstorex-engine.ts` (S149) — UNTOUCHED.
* `src/lib/webstorex-commerce-engine.ts` (S150) — UNTOUCHED.
* `src/lib/receivx-engine.ts` · `src/lib/salesx-engine.ts` · `useOrders` ·
  `useQuotations` — UNTOUCHED.
* §H — `approval-workflow-engine` / Comply360 / push bridges — UNTOUCHED.

## Tests

* **`src/test/sprint-151/webstorex-storefront.test.ts` · 47 `it()` blocks**
  (§N floor 36 satisfied).
* S145–S151 scoped vitest: **299 passed / 299** (7 files).

## Gates (final action before commit)

* `bunx tsc --noEmit` — **0 errors**
* `bunx eslint --max-warnings 0 .` — **0 errors · 0 warnings**
* `bunx vitest run src/test/sprint-145…151` — **299 / 299 passed**

## Registers

* `S150` backfilled → `f56afce2` (`src/lib/_institutional/sprint-history.ts:909`).
* `S151` entry · `headSha: 'TBD_AT_BANK'` · `predecessorSha: 'f56afce2'` ·
  `newSiblings: ['webstorex-order-engine']`
  (`src/lib/_institutional/sprint-history.ts:913-917`).
* Sibling #220 `webstorex-order-engine` registered
  (`src/lib/_institutional/sibling-register.ts:478`).
* NO `S152` entry.

## DESIGN-DECISION-FLAGs (founder review)

1. **Synthetic discount line** — Order type has no order-level discount; we
   use a negative-rate `__discount__` line to preserve the gross/net math.
2. **Dispatch status null** — there is no readable dispatch surface at HEAD;
   mirror is honest about the absence rather than fabricating.
3. **PWA registration guard** — SW only registers in real PROD non-iframe
   contexts (per PWA skill). Lovable preview/dev unregister any stale SW.
4. **Storefront PWA scope** — uses existing `public/manifest.webmanifest` and
   `public/sw.js`; no new dependency added.
