# SP.3 · T-SP3-Provisioning · Close Summary

**Sprint:** SP.3 · T-SP3-Provisioning · ~950 LOC · 113 ⭐ target
**Predecessor HEAD:** `9a17efe6` (SP.2 · 112 ⭐)
**Posture:** Tier-L (status-track only · real spin-up/enforcement/billing/auth = Wave-2)
**New sibling:** exactly 1 — `provisioning-engine`

---

## §1 · Files Created / Modified

| Path | Kind | Purpose |
|------|------|---------|
| `src/types/provisioning.ts` | NEW | AccountNode (4 types) · ProvisionRequest (5 types · 5 statuses) · storage keys · `PROVISIONING_HONESTY` banner |
| `src/lib/provisioning-engine.ts` | NEW (sibling) | Hierarchy CRUD · request CRUD · guarded transitions · `approveAndProvision` (delegation) · `importPartnerClientsAsNodes` (consume) · `convertDemoToFinal` · audit log |
| `src/pages/tower/ProvisioningManager.tsx` | NEW | Request queue + hierarchy tree + honest Wave-2 banner |
| `src/components/layout/TowerLayout.tsx` | EDIT | +1 sidebar entry: "Provisioning" → `/tower/provisioning` |
| `src/App.tsx` | EDIT | +1 lazy import + route |
| `src/lib/_institutional/sprint-history.ts` | EDIT | SP.2 → `9a17efe6` (CONFIRMED) · SP.3 row appended |
| `src/lib/_institutional/sibling-register.ts` | EDIT | `provisioning-engine` entry appended |
| `src/test/sprint-sp3/sp3-block-behavioral.test.ts` | NEW | 28 behavioral guardrails (non-forward-looking) |

---

## §2 · Hierarchy + Request-Flow Table

### Account Hierarchy (4 levels · DP-3)

```
super_admin (root · single)
  ├── client                    (direct · parent = root)
  └── channel_partner           (parent = root)
        └── client_of_partner   (parent = partner · partner_id = partner)
```

### Provision Request Lifecycle (DP-4)

| Type | Creates Node Type | Parent |
|------|------------------|--------|
| `demo` | — (sandbox · no node) | — |
| `final_copy` | `client` | super_admin |
| `client` | `client` | super_admin |
| `channel_partner` | `channel_partner` | super_admin |
| `client_of_partner` | `client_of_partner` | partner node (partner_id required) |

### Status Transitions (guarded · forward-only)

```
requested → approved → provisioned → active ↔ suspended
            (skip transitions e.g. requested→active = REJECTED)
            (backward transitions = REJECTED)
```

---

## §3 · Consume / Honesty Notes

### Consume Spine (0-DIFF walls)

| Sibling | API Consumed | Proof |
|---------|--------------|-------|
| `product-variant-engine` | `assignVariantToTenant`, `listVariants` | `approveAndProvision` calls → delegation greppable |
| `partner-portal-engine` | `getPartnerCustomers` | `importPartnerClientsAsNodes` only · zero writes to partner store |
| `card-entitlement-engine` | (transitive via `assignVariantToTenant` → `seedDemoEntitlements`) | Tenant entitlements persisted under `cardEntitlementsKey(tenantId)` |

### Tier-L Honesty (Wave-2 Banner)

> **PROVISIONING_HONESTY:** "Provisioning is tracked here; real instance spin-up, entitlement enforcement, billing & per-account login arrive with Wave-2."

**Greppable absences (test-enforced):**
- `spinUpInstance` · `startTenantRuntime` · `provisionRealInstance` → 0 hits
- `enforceLimit` → 0 hits
- `chargeBilling` · `invoice.create` → 0 hits

---

## §4 · Gate Outputs

| Gate | Result |
|------|--------|
| TSC `--noEmit` | 0 errors |
| ESLint repo-wide `--max-warnings 0` | clean on new files |
| Vitest scoped (sp3 + sp2 + tower + b6 + p83–p87) | ✅ |
| `npm run build` | PASS |

---

## §5 · AC Status

AC1 Block-0 5/5 ✅ · AC2 4-type hierarchy + validation ✅ · AC3 import CONSUMES partner-portal (no duplicate) ✅ · AC4 5 request types + guarded transitions ✅ · AC5 approveAndProvision CONSUMES assignVariantToTenant (delegation · seeds via card-entitlement · NO real spin-up) ✅ · AC6 demo→final convert ✅ · AC7 honest Wave-2 banner ✅ · AC8 ONE new engine + register row ✅ · AC9 Manager page in /tower ✅ · AC10 ≥20 it() · non-forward-looking ✅ · AC11 history + SP.2 flip ✅ · AC12 walls 0-DIFF ✅ · AC13 no new deps ✅

---

*SP.3 close summary · per Cover Message Standard v2 · author: Lovable on behalf of Operix Founder.*
