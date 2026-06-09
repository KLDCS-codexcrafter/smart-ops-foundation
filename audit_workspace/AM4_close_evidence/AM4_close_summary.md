# AM.4 · T-AM4-Commerce-PWA · CLOSE SUMMARY

**Sprint:** AM.4 · best-of-both MOBILE arc CLOSE
**Predecessor:** `bf33d8e2` (AM.3 bank · 118 ⭐)
**Target:** 119 ⭐
**LOC:** ~950
**New SIBLING:** none (empty `newSiblings` · pure consuming UI · helpers inlined)

---

## Scope delivered (3 passes)

### Pass 1 — Shop home + browse (~400 LOC)
- `src/pages/mobile/customer/MobileShopHomePage.tsx` — featured + categories from
  `erp_inventory_items` (CONSUMES existing webstorex/customer-hub catalog).
- `src/pages/mobile/customer/MobileShopSearchPage.tsx` — search same store.
- `src/pages/mobile/customer/MobileShopCategoryPage.tsx` — groups by
  `stock_group_name ?? category_type`.
- `src/pages/mobile/customer/MobileShopProductPage.tsx` — rich product page,
  add-to-cart writes to existing `customerCartKey` (0-DIFF cart schema).

### Pass 2 — Cart → Checkout-shell → Track (~400 LOC)
- `src/pages/mobile/customer/MobileCheckoutShellPage.tsx` — address/phone/summary;
  places order via the **existing** `customerOrdersKey` write path
  + `fyForDate` stamping (mirrors `MobileCustomerCartPage` exactly).
  **NO payment gateway · NO charge · honest Wave-2 banner**
  (`data-payment-honesty="wave-2"`).
- `src/pages/mobile/customer/MobileOrderTrackPage.tsx` — timeline
  (placed → confirmed → packed → shipped → delivered) from existing
  `CustomerOrder.status`; one-tap **Reorder** re-pushes lines into
  `customerCartKey`.
- `src/pages/mobile/customer/MobileWishlistPage.tsx` — `erp_customer_wishlist_${entity}_${customer}`
  localStorage; hydrates display from `erp_inventory_items`.
- `MobileCustomerCartPage.tsx` extended with single "Checkout with delivery
  address →" CTA (existing Place-Order preserved · cart still 0-DIFF on
  storage shape).
- `MobileRouter.tsx` — 7 additive customer routes
  (`/shop`, `/search`, `/category/:name`, `/product/:id`, `/checkout`,
  `/track/:id`, `/wishlist`). Core handlers / role gating untouched.
- `OperixGoPage.tsx` — 1 new tile `am4-commerce-pwa` (additive
  `MOBILE_PRODUCTS` row).

### Pass 3 — Tests + history
- `src/test/sprint-am4/am4-block-behavioral.test.ts` — 24 it() covering
  consumption proofs, no-payment-gateway grep, walls 0-DIFF, history flip.
- `sprint-history.ts` — AM.3 flipped `bf33d8e2 / CONFIRMED`; AM.4 row
  appended (`predecessorSha: 'bf33d8e2'`, `newSiblings: []`).

---

## Engine-consumption evidence (inline, audit-ready)

| Surface | Consumes | Greppable |
|---|---|---|
| ShopHome/Search/Category/Product | catalog `erp_inventory_items` | `grep erp_inventory_items src/pages/mobile/customer/MobileShop*` |
| ProductPage `Add to Cart` | `customerCartKey` from `@/types/customer-order` | `grep customerCartKey src/pages/mobile/customer/MobileShopProductPage.tsx` |
| Checkout-shell `Place Order` | `customerOrdersKey` + `fyForDate` (existing path) | `grep -E "customerOrdersKey\|fyForDate" src/pages/mobile/customer/MobileCheckoutShellPage.tsx` |
| Order Track | `customerOrdersKey` read; `CustomerOrder.status` timeline | `grep customerOrdersKey src/pages/mobile/customer/MobileOrderTrackPage.tsx` |
| Reorder | writes back to `customerCartKey` | same file |
| Wishlist | scoped key `erp_customer_wishlist_${entity}_${customer}` | `grep erp_customer_wishlist_ src/pages/mobile/customer/MobileWishlistPage.tsx` |
| Installable PWA | `public/manifest.webmanifest` + `public/sw.js` 0-DIFF | unchanged in this sprint |

## Walls held 0-DIFF
- `src/types/customer-order.ts` (cart/order schemas)
- `src/types/inventory-item.ts`
- `src/lib/fincore-engine.ts` (fyForDate)
- `public/manifest.webmanifest`, `public/sw.js`
- `src/pages/mobile/MobileRouter.tsx` core handlers (only routes table appended)
- `src/pages/erp/.../customer-hub/*` (web surfaces)
- `applications.ts`, hash-chain, retention, entitlements

## Tier-L honesty (Wave-2 deferrals)
- **Payment & instant checkout** — explicit banner in Shop Home, Product,
  and Checkout; no SDK / no charge call. Grep guards in the test file:
  `razorpay|stripe|paytm|payu|cashfree|phonepe|gpay → 0 hits`.

---

## MOBILE arc roll-up (AM.1 → AM.4)

| Sprint | Theme | New SIBLING | Streak |
|---|---|---|---|
| AM.1 | AI Everywhere (Dishani route-context + RoleHome) | `role-home-engine` | 115 ⭐ |
| AM.2 | Back-office mobile captures (5 personas + camera/voice shells) | — | 116 ⭐ |
| AM.2c | Operix-Go capture flows (SiteX · MaintainPro · ShopFloor) | — | 117 ⭐ |
| AM.3 | Universal Approval + Universal Reporting (read-only) | `mobile-report-registry` | 118 ⭐ |
| AM.4 | **Consumer commerce PWA** (Flipkart-Lite · shop/search/product/cart/checkout-shell/track/reorder/wishlist) | — | **119 ⭐** |

MOBILE Tier-L is now **COMPLETE**. Remaining mobile depth (live IoT/OEE,
OCR/transcribe, payment gateway, instant provisioning) are explicitly
Wave-2.
