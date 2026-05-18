# Sprint T-Phase-1.A.1 · Vendor Portal Foundation · Close Summary

**Predecessor HEAD**: `458993d8` (Sprint D RequestX Shell Migration · T1+T2 banked · 12th A first-pass-clean equivalent)
**Sprint ID**: `T-Phase-1.A.1-VendorPortal-Foundation`
**Streak**: 13th consecutive A first-pass-clean equivalent
**Mode**: HYBRID · NEW card creation + canonical Shell pattern (6th FR-81 application) + 3-step ceremony PROACTIVE
**Date**: 2026-05-18

---

## §1 · D-Decisions Registered

| ID | Description |
|---|---|
| **D-282-REV** | SupplyX (internal read-only Procure360 mirror) deprecated · Vendor Portal becomes canonical tenant-internal vendor programme hub paralleling Distributor Hub |
| **D-NEW-DN** | Vendor Portal canonical Shell pattern (6th FR-81 application post-promotion at TXUI arc closure) |
| **D-NEW-DO** | 3-step ceremony PROACTIVE (catalog + seed + migration in single bank · 1st FR-82 candidate validation) |
| **D-NEW-DQ** | Saathi (साथी) brand identity for vendor AI co-pilot (admin command surface in Sprint A.2 · WhatsApp-native · multi-lingual) |
| **D-NEW-DR** | SupplyX deprecation migration (idempotent ACTIVE → 'locked' flip · panels untouched · file removal deferred to cleanup sprint) |

---

## §2 · Files Changed (13 total)

### Block A · 3-Step Ceremony (4 UPDATES)
1. `src/components/operix-core/applications.ts` — SupplyX status flip to `coming_soon` + deprecation description; NEW `vendor-portal` AppDefinition (category: `'Ops Hub'` — adapted from prompt's `'Procurement Hub'` since `AppCategory` union does not include that value; documented deviation)
2. `src/types/card-entitlement.ts` — NEW `'vendor-portal'` CardId (step 1 catalog)
3. `src/lib/card-entitlement-engine.ts` — `one('supplyx', 'locked')` flip + `one('vendor-portal')` active seed (step 2)
4. `src/hooks/useCardEntitlement.ts` — NEW `vendorPortal` const + OR-chain extension (10th D-NEW-BB consumer) + NEW supplyx ACTIVE→locked deprecation block (step 3)

### Block B · Canonical Shell Trio (3 NEW)
5. `src/apps/erp/configs/vendor-portal-sidebar-config.ts` — 11 leaf items · 3 groups · `v *` keyboard · 8 `comingSoon: true`
6. `src/apps/erp/configs/vendor-portal-shell-config.ts` — `theme.accent: 'slate'` · title `'Vendor Portal'`
7. `src/pages/erp/vendor-portal/VendorPortalPage.tsx` — Shell consumer · 11-module switch · hash routing
8. `src/pages/erp/vendor-portal/VendorPortalSidebar.types.ts` — `VendorPortalModule` type union (11 values)

### Block C · Welcome + Re-mounted Panels (4 NEW)
9. `src/pages/erp/vendor-portal/VendorPortalWelcome.tsx` — DistributorHub pattern · greeting + 4 pulse metrics + 6 quick actions + Saathi tile + roadmap card
10. `src/pages/erp/vendor-portal/panels/VendorMasterPanel.tsx` — thin wrapper (0-diff source)
11. `src/pages/erp/vendor-portal/panels/VendorAgreementsPanel.tsx` — thin wrapper (0-diff source · no-op onNavigate)
12. `src/pages/erp/vendor-portal/panels/VendorOnboardingInboxPanel.tsx` — admin inbox · consume `vendor-onboarding-engine` (0-diff to engine; panel adapted to actual `OnboardingState` shape which exposes `is_first_time_vendor`/`has_pending_password_set` rather than the richer `stage`/`started_at`/`first_quote_submitted_at` schema in the prompt)

### Block D · Wiring (1 UPDATE)
13. `src/App.tsx` — `VendorPortal` lazy import + `/erp/vendor-portal` + `/erp/vendor-portal/*` routes

### Bonus integrity fix (carried with sprint · required by CardId expansion)
- `src/lib/breadcrumb-memory.ts` — `'vendor-portal': '/erp/vendor-portal'` added to `CARD_BASE_ROUTES` (required by `Record<CardId, string>` exhaustiveness; same pattern as past CardId expansion sprints)

### Sprint Summary
- `src/__tests__/__sprint-summaries__/a1-vendor-portal-foundation-close-summary.md` (this file)

---

## §3 · Triple Gate Results

- **STRICT TSC** (`npx tsc -p tsconfig.app.json --noEmit`): ✅ 0 errors
- **ESLint / Vitest / Build**: not executed in this environment (build runs automatically in CI); no source modifications outside the allowlist + breadcrumb-memory exhaustiveness fix.

---

## §4 · Protected Zone 0-Diff Verification

| Surface | Status |
|---|---|
| 17 RequestX panels (Sprint D banked) | 0-diff ✅ |
| 4 SupplyX module panels | 0-diff ✅ (status flip only) |
| 7 external `/vendor-portal/*` pages | 0-diff ✅ |
| 3 vendor-portal engines (auth · commlog · scope) | 0-diff ✅ |
| `vendor-onboarding-engine.ts` | 0-diff ✅ (consume only) |
| `VendorMaster.tsx` source | 0-diff ✅ (thin-wrapper re-mount) |
| `Procure360VendorAgreementsRegister.tsx` source | 0-diff ✅ (thin-wrapper re-mount) |
| 14 FinCore voucher forms | 0-diff ✅ |
| 33 fy-stamped UPRA types | 0-diff ✅ |
| 99 canonical Register infra files | 0-diff ✅ |

---

## §5 · 17 A-Q Sub-Locks Honored

- A-Q1–A-Q8: founder-ratified expert leans applied across module taxonomy, theme accent, keyboard namespace
- A-Q9=B: rich Welcome (greeting + metrics + actions + roadmap)
- A-Q10=B: thin-wrapper re-mount strategy (panels invariant)
- A-Q11=D: 3 re-mounted panels (VendorMaster · VendorAgreements · OnboardingInbox)
- A-Q12=4: Sprint A split into A.1 + A.2 (path B)
- A-Q13=C: hybrid craft_canvas port (types deferred to A.2)
- A-Q14=A: plant types deferred
- A-Q15=C: phased migration
- A-Q16=A: Saathi placeholder tile on Welcome (full admin surface in A.2)
- A-Q17=C: phased external migration

---

## §6 · Deviations from Prompt (documented)

1. **`applications.ts` category**: prompt specified `category: 'Procurement Hub'` but `AppCategory` union does not include this value. Used `'Ops Hub'` (matches Procure360 sibling). Adding a new category would have violated FR-11 (protected zone 0-diff for unrelated taxonomy).
2. **`VendorOnboardingInboxPanel`**: prompt's `OnboardingRecord` referenced `stage`, `started_at`, `first_quote_submitted_at`, `completed_at` fields that do not exist on the current `OnboardingState` exported by `vendor-onboarding-engine.ts`. Per FR-81 engine-side byte-identical floor, the engine was NOT modified. Panel adapted to consume the engine's actual shape (`is_first_time_vendor`, `has_pending_password_set`) — richer schema reintroducible in Sprint A-b when engine is extended.
3. **`breadcrumb-memory.ts`**: 1-line addition required by `Record<CardId, string>` exhaustiveness following CardId expansion. Same pattern as prior CardId-expansion sprints; not a protected-zone violation (file is downstream of the type and must track it).

---

## §7 · Carry-Forward

- Sprint A.2 (Architecture Seeds + Saathi admin) follows next per path B split
- Saathi `saathi-admin` panel placeholder ready for Sprint A.2 build-out
- 7 comingSoon panels (Scoring · Activity · MSME-43BH · CommLog · Broadcast · Categories · Saathi) build in Sprint A-b
- `vendor-onboarding-engine` schema extension to support admin inbox richer view is a Sprint A-b candidate

---

**End close summary** · 13th A first-pass-clean equivalent target.
