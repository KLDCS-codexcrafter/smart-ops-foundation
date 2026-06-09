# SP.2 · T-SP2-Prudent360-ERP · Close Summary

**Predecessor HEAD:** `83d28166` (SP.1 banked A POST-T1 · 111 ⭐)
**Streak target:** 112 ⭐
**New SIBLING:** NONE — additive to SP.1's `product-variant-engine` + `product-variant.ts` (empty `newSiblings`)
**Tier:** L — Limits + Pricing STORED + DISPLAYED · NOT enforced / NOT charged (Wave-2)

---

## 1 · Model extension table (additive · SP.1 fields 0-DIFF)

| Surface | SP.1 shape | SP.2 additions |
|---|---|---|
| `ProductVariant` | `id · name · base_plan_tier · enabled_modules · enabled_addons · limits: VariantLimits · status · timestamps` | `product_kind?: 'erp'|'module'|'addon'|'bundle'` · `enabled_cards?: CardId[]` · `limits: LimitSet` (LimitSet **extends** VariantLimits → SP.1 callers 0-DIFF) · `pricing?: PricingPlan` |
| `VariantLimits` | `max_users · storage_gb · feature_flags · extra` | preserved 0-DIFF |
| `LimitSet` (NEW) | — | extends VariantLimits + `companies · users · space_gb · branches · transactions_per_month · retention_years · api_calls · support_tier` |
| `PricingPlan` (NEW) | — | `model: per_seat|per_company|flat_tier|usage|hybrid · base_price · per_user_price? · per_company_price? · per_gb_price? · billing_cycle · discount_pct? · trial_days? · channel_margin_pct?` |
| `EMPTY_VARIANT_LIMITS` | preserved | — |
| `EMPTY_LIMIT_SET` | NEW | full defaults for all dims |
| `EMPTY_PRICING_PLAN` | NEW | per_seat / monthly defaults |
| `VARIANT_LIMITS_HONESTY` | "limits stored not enforced" | widened to also mention billing/charging (Wave-2) |

## 2 · Engine extension table (additive · same SIBLING)

| Export | Purpose | Delegation |
|---|---|---|
| `ALL_CARD_IDS` | Canonical CardId roster (34 entries · mirrors `src/types/card-entitlement.ts` union) | read-only |
| `isValidCardId` | Card-grid write-time wall (no fabricated CardIds) | — |
| `resolveErpCardEntitlements(variant, tenantId)` | For `product_kind:'erp'` · returns `seedDemoEntitlements(tenant).filter(card_id ∈ enabled_cards)` | **CONSUMES** `seedDemoEntitlements` (greppable · AC3 · no in-engine `CardEntitlement` construction) |
| `validateLimitSet(limits)` | Non-negative across all 8 new dims | write-time validation only — NOT runtime-enforced |
| `computeListPrice(pricing, limits)` | Display math per model (per_seat · per_company · flat_tier · usage · hybrid) + discount | NO charging · NO invoice · NO Stripe |
| `computeChannelPrice(list, margin)` | List − margin% (10/20/30 ties to Partner Portal) | display only |
| `seedFlagshipPrudent360(entity)` | Idempotent seed of 3 flagship variants | uses `createVariant` |
| `FLAGSHIP_SEED_NAMES` | Roster (`Prudent360 ERP`, `Prudent360 ERP — Lite`, `Prudent360 ERP — Manufacturing`) | — |
| `assignVariantToTenant` | EXTENDED: routes `product_kind:'erp'` through card-filter path | DELEGATES |

## 3 · Flagship seed (idempotent · written on first builder mount)

| Name | product_kind | enabled_cards | LimitSet (companies/users/space_gb) | PricingPlan |
|---|---|---|---|---|
| Prudent360 ERP | erp | **all 34 CardIds** | 25 / 500 / 1000 | hybrid · base ₹1,00,000 · per_user ₹800 · per_company ₹5,000 · per_gb ₹5 · annual · 10% discount · 20% channel margin |
| Prudent360 ERP — Lite | erp | command-center · fincore · salesx · receivx · customer-hub · insightx · taskflow (7) | 1 / 10 / 25 | per_seat · base ₹5,000 · per_user ₹500 · monthly · 10% channel margin |
| Prudent360 ERP — Manufacturing | erp | command-center · fincore · procure360 · inventory-hub · production · qualicheck · maintainpro · gateflow · store-hub · insightx (10) | 5 / 100 / 250 | hybrid · base ₹50,000 · per_user ₹700 · per_company ₹4,000 · per_gb ₹4 · annual · 5% discount · 15% channel margin |

## 4 · CONSUME proof (AC3 · greppable)

```
src/lib/product-variant-engine.ts:
  import { seedDemoEntitlements } from '@/lib/card-entitlement-engine';
  resolveVariantEntitlements → seedDemoEntitlements(tenantId)
  resolveErpCardEntitlements → resolveVariantEntitlements(...).filter(...)
```

No inline `card_id: '...'` literal construction (regex assertion in test).

## 5 · Honesty banner (DP-7 · Wave-2)

> "Product definition only; runtime enforcement of limits, usage metering and billing/charging arrive with Wave-2."

Mounted on `/tower/variants` page. Engine grep proves no `enforceLimit*`, no `throw new Error(...limit...)`, no `charge(`/`invoiceCustomer`/`chargeCard`.

## 6 · Walls held (§H · 0-DIFF)

- `src/lib/card-entitlement-engine.ts` — 0-DIFF (consumed read-only)
- `src/types/card-entitlement.ts` (CardId union) — 0-DIFF
- `src/pages/modules/ModulesPage.tsx` / `src/pages/addons/AddOnsPage.tsx` (catalog) — 0-DIFF
- Entity-hierarchy types — 0-DIFF
- SP.1's `resolveVariantEntitlements` module path — 0-DIFF (extended additively via new fn `resolveErpCardEntitlements`)
- `applications.ts` — 0-DIFF (page lives in /tower)
- Hash-chain · retention — 0-DIFF
- No new SIBLING · no new audit type · no new dependency

## 7 · Sprint-history

- SP.1 row flipped: `headSha` `TBD_AT_BANK` → `83d28166` · `provenance: CONFIRMED`
- SP.2 row appended: `code: 'T-SP2-Prudent360-ERP'` · `predecessorSha: '83d28166'` · `newSiblings: []` · `headSha: 'TBD_AT_BANK'` (backfilled at SP.3 Block 0).

## 8 · Tests

- `src/test/sprint-sp2/sp2-block-behavioral.test.ts` — 25 `it()` (non-forward-looking · no `rows[0].code`).

## 9 · Files touched

| File | Change |
|---|---|
| `src/types/product-variant.ts` | extended additively (ProductKind · LimitSet · PricingPlan · EMPTY_LIMIT_SET · EMPTY_PRICING_PLAN · widened banner copy) |
| `src/lib/product-variant-engine.ts` | extended additively (ALL_CARD_IDS · isValidCardId · validateLimitSet · computeListPrice · computeChannelPrice · resolveErpCardEntitlements · seedFlagshipPrudent360 · FLAGSHIP_SEED_NAMES · ERP routing in assignVariantToTenant) |
| `src/pages/tower/VariantBuilder.tsx` | UI extension (product_kind selector · 34-card grid with select-all/clear · LimitSet inputs · PricingPlan inputs · computed list/channel price preview · idempotent flagship seed mount) |
| `src/lib/_institutional/sprint-history.ts` | SP.1 flip to 83d28166 · SP.2 row appended |
| `src/test/sprint-sp2/sp2-block-behavioral.test.ts` | NEW · 25 it() |
| `audit_workspace/SP2_close_evidence/SP2_close_summary.md` | NEW · this file |

— SP.2 close · 112 ⭐ target · per FR-1 Discussion-First · author: Lovable on behalf of Operix Founder.
