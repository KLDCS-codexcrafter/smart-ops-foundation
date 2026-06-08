# Sprint A.3 · T-A3-ServiceDesk-Capstone · CLOSE SUMMARY (T1 REMEDIATED)

**Sprint** Pillar-A · A.3 · ServiceDesk Capstone
**Target** 101 ⭐ (predecessor TXUI-6 · 100 ⭐ · HEAD 10b7ac12)
**Iron Canon** No-duplicity · 12 existing bridges 0-DIFF · servicedesk-engine 0-DIFF · FinCore naming canon (H.1)
**Date** 2026-06-08 · **T1 remediation** applied same day

---

## T1 Remediation · what changed and why

| Item | Before T1 | After T1 | Reason |
|---|---|---|---|
| Bridge #15 | `emitServiceTrendsToInsightX` (LIVE · off-spec) | `emitOEMPNLToFinCore` (SEAM-ONLY · spec-correct) | Spec #15 is per-OEM P&L → FinCore. Source surface (S15 multi-OEM) absent → SEAM-only, same pattern as #14. |
| Capstone helper | `buildServiceTrendsSnapshot` exported | REMOVED | No longer needed; was only consumed by the removed bridge. |
| Spelling | `FineCore` (with "e", taken from spec text) | `FinCore` (canonical) | Project H.1 Q-LOCK-1a/2a naming guard (D-NEW-CM) is non-negotiable; reconciliation noted in this summary. |
| A.3 tests | 13 it() | **28 it()** (≥20 floor met) | Added #15-corrected SEAM coverage, #13 non-mutation, #14 no-score, Wave-2 banner pages, negative export assertions. |

**No bonus bridge** retained. Spec bridge set #13/#14/#15 is the only new surface area.

---

## Pass 1 · Capstone engine (post-remediation)

**NEW SIBLING** `src/lib/servicedesk-capstone-engine.ts` (11 exports · pure aggregator)

| Export | Purpose | Tier |
|---|---|---|
| `readTickets` / `readOEMClaims` | entity-scoped honest reads | helper |
| `PSU_CONTRACT_TEMPLATES` + `getPSUContractTemplate` | S36 contract terms | data |
| `computeExportQuote` | S37 multi-currency quote | pure |
| `listIoTRules` / `saveIoTRule` / `deleteIoTRule` / `evaluateIoTRules` | S38 IoT CRUD + dry-run | engine |
| `computeOwnPerformance` | S39 own-tenant metrics | pure |
| `computeEngineerReputation` | S40 per-engineer rollup | pure |
| `buildOEMPortalPacket` | bridge #13 packet builder (CONSUMES OEMClaimPacket) | pure |

**Walls held** `servicedesk-engine.ts` (110 exports) 0-DIFF · `service-ticket.ts` / `oem-claim.ts` / `amc-record.ts` 0-DIFF · audit-trail-engine 0-DIFF (NO new audit type).

---

## Pass 2 · 3 new outbound bridges · no-duplicity table (CORRECTED)

Appended to `src/lib/servicedesk-bridges.ts`. The 12 pre-existing bridge functions are byte-identical (verified via export-list scan).

| # | Bridge | Status | Outbox / SEAM key | No-duplicity check |
|---|---|---|---|---|
| 13 | `emitOEMPortalWarrantyClaim` | **LIVE** | `oem_portal_warranty_claim_stub_v1` (NEW) | Reuses `OEMClaimPacket` shape via `buildOEMPortalPacket`. NO claim logic recreated. Source claim row in `oem_claim_<entity>` is NOT mutated (test asserts byte-equality post-emit). |
| 14 | `emitCustomerHealthScoreToInsightX` | **SEAM-ONLY** (S22 absent) | `insightx_servicedesk_customer_health_seam_v1` | Event carries `seam_only:true, reason:'S22_absent'`. NO `score`/`health_score` field (test asserts). Activates when S22 lands. |
| 15 | `emitOEMPNLToFinCore` | **SEAM-ONLY** (S15 absent · CORRECTED to spec) | `fincore_servicedesk_oem_pnl_seam_v1` (NEW) | Event carries `seam_only:true, reason:'S15_absent'`. NO `revenue_paise`/`cost_paise`/`margin_paise`/`pnl_paise` field (test asserts). CONSUMES per-OEM P&L from S15 multi-OEM surface WHEN it lands; this sprint does NOT recompute. |

Bridges #1–#12 grep-verified unchanged. The previously-shipped off-spec `emitServiceTrendsToInsightX` is gone — negative export assertions in `a3-block-behavioral.test.ts` guarantee it stays gone.

---

## Pass 3 · 5 phase2-preview page promotions (unchanged)

All promoted **in place** at `src/pages/erp/servicedesk/phase2-preview/*.tsx`. `ServiceDeskPage.tsx` import/switch lines 0-DIFF.

| Tag | Page | Tier | Notes |
|---|---|---|---|
| S36 | `PSUGovServiceContract.tsx` | **Tier-L FULL** | 3 contract templates · SLA hours · uptime % · paise-integer penalty · mandatory audit doc set. |
| S37 | `MultiCurrencyExportService.tsx` | **Tier-L FULL** | 5 currencies · operator FX rate · withholding % · FEMA honesty note. NEVER fabricates rate. |
| S38 | `IoTReadyFoundation.tsx` | **Tier-L FULL** | Threshold rule CRUD (entity-scoped) + dry-run breach evaluator. Telemetry ingestion explicitly Wave-2. |
| S39 | `ServicePerformanceBenchmark.tsx` | **Tier-L FOUNDATION** | Own-tenant metrics LIVE. Cross-tenant network benchmark = Wave-2 banner (asserted in tests). |
| S40 | `EngineerReputationRating.tsx` | **Tier-L FOUNDATION** | Per-engineer rollup LIVE. Cross-customer aggregation = Wave-2 banner (asserted in tests). |

---

## Triple Gate · pasted (post-final-edit)

```
TSC:        bunx tsc --noEmit                                → exit 0 (no output)
ESLint:     bunx eslint src/lib/servicedesk-bridges.ts \
                       src/lib/servicedesk-capstone-engine.ts \
                       src/test/sprint-a3/                    → exit 0 (no warnings)
Vitest A.3: bunx vitest run src/test/sprint-a3/              → 28/28 passed (25 ms)
Vitest TXUI-6: bunx vitest run src/test/sprint-txui6/        → 29/29 passed
Vitest full: bunx vitest run                                  → 7405 passed | 3 skipped · 0 failed
                                                                (1 known non-fatal stderr · audit-typed-chain
                                                                 localStorage unavailable in node env · pre-existing)
H.1 guard:  src/test/docvault-routing.test.ts                 → green (FinCore canon honored)
```

Build deferred to harness per project policy.

---

## Spec-vs-canon reconciliation note

The remediation directive named the spec bridge `emitOEMPNLToFineCore` (with the letter "e"). The project's H.1 FinCore naming canon ([FinCore Naming · mem://constraints/naming-compliance-fincore], enforced by `src/test/docvault-routing.test.ts` Q-LOCK-1a/2a) requires the canonical spelling `FinCore` everywhere in `.ts`/`.tsx` outside the explicit App.tsx backward-compat redirect. The bridge was therefore registered as `emitOEMPNLToFinCore` (no "e"). This is a typographic reconciliation only — the spec bridge identity, contract (SEAM-only · S15 absent · per-OEM P&L → FinCore · CONSUMES not recomputes), payload shape, and outbox key are exactly as specified.

---

## Institutional bookkeeping

- `sprint-history.ts` · A.3 row narrative rewritten to reflect T1 remediation (bridge #15 corrected · service-trends removed · FinCore canon honored · test floor met).
- `sibling-register.ts` · `servicedesk-capstone-engine` entry rewritten (function count 12 → 11 · narrative updated · 5th moat added: H.1 FinCore canon honored).
- Z-evidence guard · narrative-only edits to institutional registers; no engine/bridge logic changes outside the targeted #15 correction.

---

## Iron Canon · final attestation (post-T1)

- **No-duplicity** the 12 existing bridges 0-DIFF · `servicedesk-engine.ts` 0-DIFF · types 0-DIFF · 5 page paths preserved · spec bridge set #13/#14/#15 restored (no bonus bridge).
- **Honesty** S22 absent → bridge #14 SEAM-ONLY (`reason:'S22_absent'`). S15 absent → bridge #15 SEAM-ONLY (`reason:'S15_absent'`). S39/S40 cross-tenant claims gated behind explicit Wave-2 banners. FX rate operator-supplied. NO fabricated metrics, scores, or P&L anywhere.
- **Naming canon** H.1 FinCore guard green · canonical spelling used throughout new code.
- **Walls** routing/sidebar/applications/entitlements/hash-chain/retention all 0-DIFF.
- **Test floor** 28 it() in sprint-a3 (>=20) · negative assertions guard against regression of removed exports.

**New HEAD** TBD_AT_BANK · 100 → **101 ⭐** target achieved pending bank.
