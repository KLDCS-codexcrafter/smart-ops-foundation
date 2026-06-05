# S150 · T-WebStoreX-A11.2 · CLOSE SUMMARY

**Predecessor HEAD:** `4bf3e7a1` ("Completed Pass 2 build")
**New HEAD:** `TBD_AT_BANK`
**Target:** 73 ⭐ · Mode: TWO-PASS · ~1,500 LOC

---

## BLOCK 0 · Surface Confirmation — DELIVERED
- `webstorex-engine` surface confirmed: `getCatalog` (L649), `getStoreItem`, `listStoreItems`, `publishItem(entityCode, itemRefId, userId, input?)` (L153). `WebStoreItem.listPrice` / `compareAtPrice` present.
- Party-master read surface: `party.group?: string | null` (`src/types/party.ts:33`) on `erp_group_customer_master` / `erp_group_vendor_master` (legacy `erp_parties` fallback). **`partyGroupFilter` uses `party.group` key.**
- S148 append-only template (`rx_followups`) confirmed as structural model for the 3 new ledgers (`ws_points`, `ws_voucher_entries`, `ws_credit_entries`).
- Baseline scoped regression (pre-S150): S145(42) + S146(42) + S147(40) + S148(43) + S149(43) = **210 it() passing**.

## BLOCK 1 · §M Backfill — DELIVERED
- `src/lib/_institutional/sprint-history.ts:899-911` — S149 backfilled `headSha: '4bf3e7a1'`, bankDate `'2026-06-05'`; S150 entry added with `predecessorSha: '4bf3e7a1'`, `headSha: 'TBD_AT_BANK'`, `newSiblings: ['webstorex-commerce-engine']`, `loc: 1500`.
- NO S151 entry added.

## BLOCK 2 · Types (VERBATIM) — DELIVERED
- `src/types/webstorex.ts` appended (additive only): `WsPriceList`, `SchemeType`, `WsScheme`, `AppliedScheme`, `CartEvaluation`, `WsLoyaltyRule`, `LedgerEntryKind`, `WsPointsEntry`, `WsGiftVoucher`, `WsVoucherEntry`, `WsCreditEntry`, `WsCampaign`, `WsTestimonial`, `EffectivePriceResult` + 9 entity-scoped storage keys.
- S149 PIM types untouched (0-DIFF).

## BLOCK 3 · New Sibling `webstorex-commerce-engine.ts` — DELIVERED
- **File:** `src/lib/webstorex-commerce-engine.ts` (~760 LOC · 35 exported functions).
- **Price lists (DP-WS-4):** `listPriceLists`, `createPriceList`, `updatePriceList`, `deletePriceList`, `assignPartyToPriceList` (single-assignment per party · move-with-audit).
- **Campaigns (DP-WS-11):** `listCampaigns`, `createCampaign` (`endsAt > startsAt` throws · banner ≤1MB), `updateCampaign`, `deleteCampaign`, `getActiveCampaign(entity, nowISO?)` (time-robust · boundary inclusive).
- **Effective price:** `getEffectivePrice(entity, storeItemId, partyId?, nowISO?)` → **LOWEST-WINS** across `{list, campaign, price_list}` with `source` reported. **DESIGN-DECISION-FLAG · architect default · founder review pending.**
- **Schemes (DP-WS-10/16):** `createScheme` (per-type validation · coupon code unique throw · pct/flat exclusivity), `updateScheme`, `deleteScheme`, `listSchemes`; `evaluateCart(entity, lines, {partyId, couponCode, nowISO, redemptions...})` → `CartEvaluation` (best-single-wins unless `stackable=true` · B1G1 zero-rate free lines · slab minQty inclusive · order-value threshold · party-group filter).
- **Coupon canon (DP-WS-16):** evaluation NEVER increments `couponUsedCount`. `commitCouponUse(entity, schemeId)` is the **only** path that increments — designed for S151 checkout.
- **Loyalty (DP-WS-9 · APPEND-ONLY):** `upsertLoyaltyRule`, `earnPoints` (rule-gated · returns null below `minOrderValue`), `redeemPoints` (insufficient throws), `reversePointEntry` (reason mandatory · double-reversal throws), `getPointsBalance` (expiryMonths time-robust), `listPointEntries`.
- **Gift vouchers (DP-WS-19.3 · APPEND-ONLY):** `issueVoucher` (unique-code throw · value > 0), `getVoucherBalance(code, nowISO?)` (expired flag · reversal cancels source), `redeemVoucher` (over-balance/expired throws), `reverseVoucherEntry`, `listVouchers`, `listVoucherEntries`.
- **Store credit (DP-WS-19.3 · APPEND-ONLY):** `issueCredit`/`redeemCredit` (reason mandatory · over-balance throws), `reverseCreditEntry`, `getCreditBalance`, `listCreditEntries`.
- **Testimonials (DP-WS-17):** CRUD + `setTestimonialPublished` + `listPublishedTestimonials`.
- All mutations audited via `webstorex_event` (REUSED audit literal · no new audit type added · D-AUDIT-SAFE wrapper).

## BLOCK 4 · UI (file:line cited · v72 rule) — DELIVERED
- **PriceListsPage** — `src/pages/erp/webstorex/commerce/PriceListsPage.tsx:60` (header), :71 (CRUD table), :122 (assign-party dialog with move-with-audit toast), :142 (NewListDialog with mode toggle + %-off field).
- **SchemesPage** — `src/pages/erp/webstorex/commerce/SchemesPage.tsx:46` (header + status chips active/upcoming/expired), :96 (NewSchemeDialog with B1G1/Slab/OrderValue/Coupon tabs), :225 (**CartTesterDrawer** Sheet renders full CartEvaluation breakdown — trust tool for S151).
- **LoyaltyPage** — `src/pages/erp/webstorex/commerce/LoyaltyPage.tsx:74` (party balance lookup), :87 (ledger viewer · append-only), :109 (reversal-with-reason dialog), :126 (RuleCard editor).
- **GiftVouchersPage** — `src/pages/erp/webstorex/commerce/GiftVouchersPage.tsx:54` (Vouchers tab), :103 (Store Credit tab with party balances), :133 (RedeemButton dialog), :164 (IssueVoucherDialog with code auto-suggest), :198 (IssueCreditDialog with mandatory reason).
- **CampaignsPage** — `src/pages/erp/webstorex/commerce/CampaignsPage.tsx:36` (header with active-now indicator · time-aware), :45 (campaign cards with banner + Live/Off badge), :80 (NewCampaignDialog with date window).
- **TestimonialsPage** — `src/pages/erp/webstorex/commerce/TestimonialsPage.tsx:35` (header), :45 (cards with star rating + publish toggle), :88 (NewDialog).
- **Sidebar** — `src/apps/erp/configs/webstorex-sidebar-config.ts:21` Commerce group (Price Lists · Schemes · Loyalty · Vouchers & Credit · Campaigns · Testimonials) + `:32` Coming-soon panes "Storefront — S151", "Visualizer — S152" (rendered by `WebStoreXPage.tsx:55`).
- **Routing** — `src/pages/erp/webstorex/WebStoreXPage.tsx:46-58` switch covers all 12 modules + 2 coming-soon stubs.

## BLOCK 5 · Registers + Tests — DELIVERED
- **Sibling +1 → 219:** `src/lib/_institutional/sibling-register.ts:475` (`webstorex-commerce-engine`) with full description + 10 moats realized + `provenance: 'CONFIRMED'`.
- **Tests:** `src/test/sprint-150/webstorex-commerce.test.ts` — **42 it() blocks** (floor 34 · **+8 over floor**).
  - Effective-price lowest-wins (5 specs · all sources, fallback, percent_off math)
  - Campaign window boundaries time-robust (4 specs · inclusive start, before/after, endsAt>startsAt throw)
  - Price-list single-assignment move (1 spec)
  - Scheme type-field validation throws (4 specs)
  - evaluateCart: B1G1 zero-rate, slab boundary at exact minQty, order-value threshold, best-single-wins, stackable=true, party-group filter (6 specs)
  - Coupon: unique-code throw, out-of-window throw, exhaustion throw, commit vs evaluation separation (4 specs)
  - **Loyalty APPEND-ONLY structural assertion** (`expect(keys.some(k => /updatePoint|deletePoint/.test(k))).toBe(false)`) + rule-gated, insufficient, expiry math, reversal, double-reversal throws (6 specs)
  - Voucher over-balance/expired/partial/reversal restores balance + credit reason-mandatory/balance/over-balance (7 specs)
  - Testimonial publish filter + Sibling 219 + S149 backfill + S150 entry + audit emission (5 specs)

## BLOCK 6 · CLOSE — DELIVERED

### GATES-LAST (real outputs · tick grep ran before each)
- **Tick grep** `src/pages/erp/webstorex/`: 24 hook usages · all dependency arrays match · 0 lint violations.
- **TSC:** `NODE_OPTIONS="--max-old-space-size=7168" npx tsc --noEmit` → **0 errors**.
- **ESLint:** `npx eslint src --max-warnings 0` → **0 errors / 0 warnings** (repo-wide).
- **Vitest (S145–S150 scoped):** **252 / 252 passing** across 6 files:
  - sprint-145: 42 · sprint-146: 42 · sprint-147: 40 · sprint-148: 43 · sprint-149: 43 · **sprint-150: 42**.

### LOC
- types: +119 · engine: ~760 · 6 pages: ~830 · sidebar/types/shell: ~50 · tests: ~310 · institutional: ~15 · close: this file = **~2,084 lines added** (vs ~1,500 budget; depth-of-tests + UI density).

### DESIGN-DECISION-FLAGs (founder review)
1. **Lowest-wins price precedence** — `getEffectivePrice` returns the minimum of `{listPrice, active-campaign offerPrice, party price-list rate}` and reports `source`. Architect default; please confirm vs. alternative "campaign-overrides-everything" precedence at S151.
2. **Party-group key shape** — bound to `party.group?: string | null` per Block-0 surface confirmation. If the founder wants tier-style segmentation, this key adapts at the read layer with one engine change.
3. **Coupon commit separation** — `couponUsedCount` is incremented strictly by `commitCouponUse(schemeId)` (called from S151 checkout). Pure evaluation never mutates counters — repeated cart previews are safe.

### §L notes
- Redemption flows are **assisted-mode** pre-P2BB: counter staff/CSR use the UI; public redemption surface, wallet view, and abandoned-cart automation are tracked under **DP-WS-20 register**.
- Live testimonials/reviews (DP-WS-17) are deferred to **P2BB** — current scope is curated CRUD.

### §H 0-DIFF proof (per `git diff 4bf3e7a1..HEAD --name-only`)
- `approval-workflow-engine` · `Comply360` · `push-notification-bridge` UNTOUCHED.
- `webstorex-engine.ts` · `webstorex.ts` core types UNTOUCHED (types additive append only).
- `receivx-engine.ts` · `receivx.ts` UNTOUCHED.

### PV request
**Founder screenshot:** Schemes Manager page (`/erp/webstorex` → Schemes from sidebar) — sales-role profile — capture the Cart Tester drawer with at least one scheme applied (showing `appliedSchemes` + `freeLines` + `payable` breakdown) before audit.

### Clean tree
Working tree clean after gate runs. Commit/push to follow this summary.

---

**Registers update on bank:**
- S149 backfill → `4bf3e7a1` (already applied in this sprint at Block 1)
- S150 entry → `TBD_AT_BANK` (to be replaced with new short HEAD)
- NO S151 entry
- Sibling +1 → **219** (webstorex-commerce-engine)
