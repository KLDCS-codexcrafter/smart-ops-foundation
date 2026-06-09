# SP.1 — Variant Builder · Close Summary

**Sprint:** SP.1 · T-SP1-Variant-Builder · SaaS Productization
**Predecessor:** d4db38ae (CATALOG-1 banked)
**Target:** 110 → 111 ⭐
**LOC:** ~1,000
**New SIBLING:** `product-variant-engine` (the sole engine credit)

---

## Variant Model

| Field | Type | Source / canon |
|---|---|---|
| `id` | string | engine-generated `var-<t36>-<r>` |
| `name` | string | free-form named edition (DP-1) |
| `description?` | string | optional marketing copy |
| `base_plan_tier` | `PlanTier` | canonical (`starter`/`growth`/`enterprise`/`trial` · DP-2) |
| `enabled_modules` | `string[]` | drawn from real 28-id ModulesPage catalog (fabricated ids filtered at write) |
| `enabled_addons` | `string[]` | drawn from real 12-id AddOnsPage catalog |
| `limits.max_users` | number | stored + displayed · not enforced |
| `limits.storage_gb` | number | stored + displayed · not enforced |
| `limits.feature_flags` | `FeatureId[]` | references `plan-features` FEATURE_MATRIX |
| `limits.extra` | record | extensible bag — operator-defined extras (DP-5) |
| `status` | `'draft' \| 'published'` | published is immutable |

---

## Consume-Spine (read-only · 0-DIFF)

| Wall | Symbol consumed | Where | Delegation proof |
|---|---|---|---|
| `card-entitlement-engine` | `seedDemoEntitlements(tenantId)` | `resolveVariantEntitlements` | greppable import; engine never hand-builds `card_id:` literals (AC3) |
| `card-entitlement` types | `CardEntitlement`, `PlanTier`, `cardEntitlementsKey` | engine + types | read-only · type-imports only |
| `feature-gate-engine` | `FeatureId` flags persisted onto `limits.feature_flags` | engine + builder | no re-evaluation of gates inside variant engine |
| `ModulesPage` catalog | 28 ids enumerated in `VARIANT_MODULE_IDS` | engine | test asserts each id appears in `ModulesPage.tsx` |
| `AddOnsPage` catalog | 12 ids enumerated in `VARIANT_ADDON_IDS` | engine | test asserts each id appears in `AddOnsPage.tsx` |
| Tower `TenantPlan` | `'Starter' \| 'Professional' \| 'Enterprise'` | `mapTenantPlanToPlanTier` (DP-2) | maps to canonical PlanTier 1:1 |
| `audit-trail-engine` | `logAudit({ entityType: 'master_lifecycle_event' })` | `publishVariant` | reuses existing AuditEntityType — NO new audit type |
| `applications.ts` | n/a | n/a | Variant Builder lives in `/tower` (not an ERP card) → 0-DIFF |

---

## Enforcement Honesty (DP-7 · Tier-L)

Limits are **stored, validated at write time, and displayed** on the variant list — they are **not runtime-enforced** anywhere in this sprint. The Variant Builder page mounts a single honest banner:

> "Limits are recorded for product definition; runtime enforcement, billing & provisioning arrive with Wave-2."

Grep proofs (asserted by tests):
- engine contains no `enforceLimit*` / `enforceQuota*` / `enforceVariant*` symbol
- engine contains no `throw new Error(... limit ...)` runtime gate
- builder page contains `VARIANT_LIMITS_HONESTY` string mount

---

## Files

**New**
- `src/types/product-variant.ts` (~80 LOC)
- `src/lib/product-variant-engine.ts` (~290 LOC · 14 exports)
- `src/pages/tower/VariantBuilder.tsx` (~440 LOC)
- `src/test/sprint-sp1/sp1-block-behavioral.test.ts` (~210 LOC · 24 it())
- `audit_workspace/SP1_close_evidence/SP1_close_summary.md` (this file)

**Edited (allowlist)**
- `src/components/layout/TowerLayout.tsx` — additive nav entry "Product Variants" (`/tower/variants`, `Boxes` icon)
- `src/App.tsx` — additive lazy import + route for `/tower/variants`
- `src/lib/_institutional/sprint-history.ts` — CAT1 headSha flipped to `d4db38ae`; SP.1 row appended (`headSha: 'TBD_AT_BANK'`)
- `src/lib/_institutional/sibling-register.ts` — `product-variant-engine` registered
- `src/test/sprint-p360/p360-block-behavioral.test.ts` — roadmap-top assertion advanced to `T-SP1-Variant-Builder`

---

## Acceptance Criteria

| # | Criterion | Status |
|---|---|---|
| AC1 | Block-0 5/5 (consume-spine + catalog ids enumerated) | ✅ |
| AC2 | ProductVariant model (modules+addons+limits+status) | ✅ |
| AC3 | `resolveVariantEntitlements` CONSUMES card-entitlement (greppable, no reimplemented entitlement logic) | ✅ |
| AC4 | `enabled_modules`/`enabled_addons` reference REAL catalog ids only | ✅ (write-time filter + test) |
| AC5 | `mapTenantPlanToPlanTier` covers DP-2 (3 cases) | ✅ |
| AC6 | Limits stored + validated, NOT runtime-enforced; honest banner present | ✅ |
| AC7 | Exactly ONE new engine + sibling-register row | ✅ |
| AC8 | Variant Builder page in `/tower` (TowerLayout) | ✅ |
| AC9 | ≥20 it() green (24 it()) | ✅ |
| AC10 | history row + CAT1 → d4db38ae flip | ✅ |
| AC11 | Walls 0-DIFF | ✅ |
| AC12 | No new deps; Triple Gate clean | ✅ |

---

*SP.1 close · 09 Jun 2026 · 110 → 111 ⭐ · author: Lovable on behalf of the Operix Founder.*

---

## T1 Remediation · p360 roadmap test de-brittled (post-bank)

The SP.1-era assertion `rows[0].code === 'T-SP1-Variant-Builder'` in
`src/test/sprint-p360/p360-block-behavioral.test.ts` violated the canon
"no forward-looking / last-entry assertions" — every future sprint would
break it on append. Replaced with three non-forward-looking checks that
stay green for all future sprints:

1. **Stable floor**: `rows.length >= 5` (existence of the banked baseline).
2. **Existence pattern**: `rows.some(r => r.code === 'T-P360-DevTeam-Hub')`
   (P360 is the anchor row, immune to future appends).
3. **Order invariant**: rows with `bankDate` are sorted newest-first
   (`dated[i].bankDate >= dated[i+1].bankDate` for all i).

Grep confirms zero remaining `rows[0]` / last-entry assertions in
`src/test/sprint-p360/`. Re-run: sp1 26/26 + p360 29/29 = 55/55 ✅.

