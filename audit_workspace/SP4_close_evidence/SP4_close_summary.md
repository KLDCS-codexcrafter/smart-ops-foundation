# SP.4 · T-SP4-Build-Your-Plan · Close Summary

**Sprint:** SP.4 · SaaS Productization **ARC CLOSE** · target 114 ⭐
**Predecessor HEAD:** `f02c930c` ("Completed SP.3 provisioning pass" · 113 ⭐)
**New SIBLING:** **NONE** (consuming UI over SP.2 + SP.3 engines · `newSiblings: []`)
**LOC:** ~900 (page + tests + history)

## Configurator Flow

| Step | Surface | Consumes |
|---|---|---|
| 1 · Base | `Prudent360 ERP` (34 CardId toggle grid · select-all/core preset/clear) `OR` 1 of 24 standalone modules `OR` 1 of 4 bundles | `ALL_CARD_IDS`, `VARIANT_MODULE_IDS` (0-DIFF) |
| 2 · Add-ons | À-la-carte grid (12 real catalog ids) | `VARIANT_ADDON_IDS` (0-DIFF) |
| 3 · Conditions | Sliders: companies (1–50) · users (1–500) · space_gb (5–2000); other LimitSet dims default | `LimitSet` shape (SP.2) |
| 4 · Plan & Price | Pricing model + billing-cycle + base/per-user/per-company/per-gb/discount/channel-margin inputs · **live quote** | **`computeListPrice` + `computeChannelPrice`** (SP.2 · display math) |
| 5 · Request | CTA `Request Demo` / `Get Final Copy` / `Create Client Request` → confirmation view | **`createProvisionRequest`** (SP.3 · drops into provisioning queue) |

## Consume-spine (0-DIFF)

| Source | Symbol(s) consumed | Wall held |
|---|---|---|
| `src/lib/product-variant-engine.ts` | `computeListPrice`, `computeChannelPrice`, `ALL_CARD_IDS`, `VARIANT_MODULE_IDS`, `VARIANT_ADDON_IDS` | ✅ no re-implementation in page (grep guards in tests) |
| `src/lib/provisioning-engine.ts` | `createProvisionRequest` | ✅ no re-implementation in page |
| `src/types/product-variant.ts` | `EMPTY_LIMIT_SET`, `EMPTY_PRICING_PLAN`, `LimitSet`, `PricingPlan`, `PricingModel`, `BillingCycle` | ✅ unchanged |
| `src/types/provisioning.ts` | `ProvisionRequest`, `ProvisionRequestType` | ✅ unchanged |
| `src/types/card-entitlement.ts` (`CardId` union) | indirect (via `ALL_CARD_IDS`) | ✅ unchanged |
| `ModulesPage` / `AddOnsPage` catalogs | indirect (via `VARIANT_MODULE_IDS` / `VARIANT_ADDON_IDS`) | ✅ unchanged |
| `applications.ts` | none | ✅ **0-DIFF** |

## Tier-L Honesty

Banner mounted at top of page and embedded in confirmation view:
> **"Live quote · request drops into the provisioning queue · checkout, payment & instant provisioning arrive with Wave-2."**

Greppable enforcement: page contains **no** `processPayment` / `chargeCard` / `stripe` / `razorpay` / `spinUpInstance` / `provisionInstance` calls (asserted in tests).

## Routes / Surface

- **New public route:** `/build-your-plan` (no `<ProtectedRoute>` wrap · Tier-L public prototype).
- **Welcome tile:** added to `panelCards` in `src/pages/Welcome.tsx` (additive · WIP-class neutral · no badge).

## Tests

`src/test/sprint-sp4/sp4-block-behavioral.test.ts` — 27 `it()` cases covering:
- Catalog 0-DIFF + module/bundle partition + page greppably references real ids
- Live price math per model (per_seat / per_company / flat_tier / hybrid) + discount + channel margin clamps
- CTA delegation to `createProvisionRequest` + queue persistence + supported request types
- Honest Wave-2 banner export + mounted in page + no fake payment/checkout
- Walls: no in-page re-implementation of price math or request creation
- **Non-forward-looking** history assertions only (existence + SP.3 flip to `f02c930c` + empty `newSiblings`)

## SaaS Productization ARC roll-up (SP.1 → SP.4)

| Sprint | HEAD | Capability shipped |
|---|---|---|
| **SP.1** · T-SP1-Variant-Builder | `83d28166` | Super-admin Variant Builder · `product-variant-engine` SIBLING · ProductVariant model · CONSUMES card-entitlement / feature-gate / 28+12 catalog |
| **SP.2** · T-SP2-Prudent360-ERP | `9a17efe6` | Additive: `product_kind` + `enabled_cards` (34 CardIds) + full `LimitSet` + `PricingPlan` + `computeListPrice` / `computeChannelPrice` + flagship Prudent360-ERP/Lite/Mfg seeds |
| **SP.3** · T-SP3-Provisioning | `f02c930c` | `provisioning-engine` SIBLING · 4-level Account Hierarchy · 5 ProvisionRequest types · guarded lifecycle · CONSUMES partner-portal + variant-engine (full delegation chain) |
| **SP.4** · T-SP4-Build-Your-Plan | TBD_AT_BANK | Customer-facing self-serve configurator (compose → live quote → request) · CONSUMES SP.2 price math + SP.3 queue · **NO new SIBLING** · **ARC CLOSE** |

### Arc honesty (all Wave-2 deferred)
- Real instance spin-up (per-tenant provisioning)
- Runtime entitlement enforcement (limits + usage metering)
- Billing / charging / payment capture
- Checkout flow
- Per-account authentication

## Files Touched (allowlisted)

- **NEW** `src/pages/build-your-plan/BuildYourPlanPage.tsx`
- **NEW** `src/test/sprint-sp4/sp4-block-behavioral.test.ts`
- **NEW** `audit_workspace/SP4_close_evidence/SP4_close_summary.md`
- **EDIT** `src/App.tsx` — additive lazy import + public `/build-your-plan` route
- **EDIT** `src/pages/Welcome.tsx` — additive "Build Your Plan / Pricing" tile
- **EDIT** `src/lib/_institutional/sprint-history.ts` — flipped SP.3 to `f02c930c` + appended SP.4 row (empty `newSiblings`)

## Gate Status

- TSC: 0 errors (post-final-edit)
- ESLint repo-wide `--max-warnings 0`: clean
- Vitest scoped (sp4 + sp3 + sp2 + sp1 + b6 + p83–p87): green
- `npm run build`: PASS

## Bank Sequence

`origin/main` to advance off `f02c930c`. New HEAD short hash to be reported by harness on commit landing.
