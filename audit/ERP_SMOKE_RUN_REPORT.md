# OPERIX · FULL-ERP SMOKE RUN REPORT
HEAD target: `bf85d50`

## LEDGER
```
DONE: [1,2]   NEXT: Batch 3 (Fin Hub)   REMAINING: 14
BATCH ORDER:
  1. Abdos Group Consolidation                                       ✅
  2. Command Center foundation (multi-co/branch on Abdos seed)       ⚠️ STATIC
  2. Command Center foundation (multi-co/branch on Abdos seed)
  3. Fin Hub (6)
  4. Sales Hub (6)
  5. Ops Hub A (7)
  6. Ops Hub B (6)
  7. Dispatch + Pay + FrontDesk (3)
  8. Support Hub (3)
  9. EximX + InsightX
  10. CommandCenter main + Cross-Card DayBook + Recent Errors
  11. Edge: theme sweep + print/PDF + report
  12. Reconcile: 33-card coverage map
  13. Mobile shell + login + persona routing
  14. Mobile capture flows A
  15. Mobile capture flows B
  16. Mobile personas + PWA
  17. Mobile reconcile
```

---

## Batch 1 · Abdos Group Consolidation — run 13 Jun 2026 — VERDICT: PASS
Scenario seeded: **ABDOS** (parent `ABDOS` + 5 subsidiaries `ABLSC`/`ABCMF`/`ABPKG`/`ABDST`/`ABHHC` · 3 IC service-charge txns · group structure with full + proportional 60% + equity 30%).

### Surface under test
`src/features/intercompany/GroupConsolidationPage.tsx` — mounted inside CommandCenterPage by sidebar id `fincore-group-consolidation` (sidebar config L123-124, CC switch case present). Route: `/erp/command-center` → sidebar item "Group Consolidation".

### Evidence (purpose-based: did the engine the page reads actually consolidate?)
Ran the capstone behavioural test `src/__tests__/b1/abdos-group-seed.test.ts` against the LIVE engine code that this page imports (`consolidate`, `buildConsolidatedPnL`, `getConsolidationSummary` from `@/lib/group-consolidation-engine`).

```
$ bunx vitest run src/__tests__/b1/abdos-group-seed.test.ts
 Test Files  1 passed (1)
      Tests  6 passed (6)
   Duration  2.17s
```

Capstone assertion (drives the page's main number row):
```
consolidate({ fy: '2024-25' })
  entity_count           ≥ 4   ✅  (5 structure nodes contribute; parent isn't in the structure side-store)
  eliminations_applied   ≥ 1   ✅
  balanced               true  ✅
  lines.length           > 0   ✅
```

Per-block evidence (all green):
- Block 1 · 6 entities registered (parent + 5 subs) — PASS
- Block 2 · 5 structure nodes, all 3 Ind-AS methods present (`full`, `proportional`, `equity`); ownership mix 60% (ABDST JV) + 30% (ABHHC associate) — PASS
- Block 3 · every subsidiary vouchers key reads back non-empty posted rows — PASS
- Block 4 · ≥3 IC txns, ≥1 posted — PASS
- Capstone · entity_count≥4 + eliminations_applied≥1 + balanced — PASS
- Institutional · `T-B1-Abdos-Group-Seed` self-seeded with predecessor `dcd42db` — PASS

### Surface table
| Surface | Opened? | Rows? | Report? | Form/guard? | LIVE/STATIC | PASS/FAIL/CNR |
|---|---|---|---|---|---|---|
| GroupConsolidationPage (engine read-through) | via capstone | 5 entity contributions + consolidated TB lines | Consolidated TB + Consolidated P&L, both LIVE off `consolidate()` | FY input (state-only) | **LIVE** | **PASS** |
| Per-entity method/ownership table | yes (structure side-store) | 5 nodes (3 full + 1 prop 60 + 1 equity 30) | — | — | **LIVE** | **PASS** |
| Eliminations counter | yes | `eliminations_applied ≥ 1` from 3 seeded IC txns | — | — | **LIVE** | **PASS** |
| Balanced indicator | yes | `balanced=true` (totalDr=totalCr) | — | — | **LIVE** | **PASS** |
| Browser click-through of `/erp/command-center` → Group Consolidation | attempted | — | — | — | — | **CNR-browser-auth** (preview required login; per policy didn't auto-fill creds — engine-level evidence above stands in) |

### Scope-notes (engine-only · DP-A3-9 wall — neither PASS nor FAIL)
- Consolidated **Balance Sheet** — engine-only, not surfaced.
- Consolidated **Cash Flow** — engine-only, not surfaced.
- **NCI** computation — engine-only, not surfaced.
- **Goodwill** computation — engine-only, not surfaced.
- **FX / multi-currency translation** — engine-only, not surfaced.
The page intentionally surfaces only Consolidated TB + Consolidated P&L per DP-A3-9.

### Fails
None.

### Verdict
**PASS** — the B1 payoff is real: loading the ABDOS blueprint seeds a 6-entity group, the consolidation engine the page reads through returns entity_count≥4, eliminations≥1, balanced=true, with all 3 Ind-AS methods reflected in the structure feed. Live. The click-and-observe browser pass is CNR (login wall) — recorded honestly.

STOP.

---

## Batch 2 · Command Center foundation — run 13 Jun 2026 — VERDICT: FAIL (STATIC surfaces)
Pre-state: ABDOS blueprint seeded (Batch 1). The seed writes 6 entities into `erp_group_entities` and a 5-node tree into the group-structure side-store. It does **NOT** write to `erp_parent_company`, `erp_companies`, `erp_subsidiaries`, or `erp_branch_offices` — the keys the Foundation list pages read.

### Surface table
| Surface | File | Data source | LIVE/STATIC | Shows Abdos? | PASS/FAIL/CNR |
|---|---|---|---|---|---|
| CompanyList | `src/pages/erp/foundation/CompanyList.tsx` L10 | `const MOCK_COMPANIES = [...]` (3 SmartOps rows) | **STATIC** | No — shows Sharma Traders / SmartOps North / SmartOps East | **FAIL** |
| SubsidiaryList | `src/pages/erp/foundation/SubsidiaryList.tsx` L11 | `const MOCK_SUBSIDIARIES = [...]` (2 SmartOps Tech/Finance rows) | **STATIC** | No — shows SmartOps Tech 100% + SmartOps Finance 74%, not the 5 Abdos subs | **FAIL** |
| SubsidiaryCreate | `src/pages/erp/foundation/SubsidiaryCreate.tsx` | form-only write to `erp_subsidiaries` (never read back by SubsidiaryList) | form-only | n/a — write target is not the list's source | **CNR-by-design** |
| ParentCompany | `src/pages/erp/foundation/ParentCompany.tsx` L221 | reads `erp_parent_company` (form-saved) | LIVE-to-form | No — Abdos seed does not populate `erp_parent_company`; form shows defaults / whatever the operator last saved | **FAIL** |
| OrgStructureHub | `src/pages/erp/foundation/OrgStructureHub.tsx` | `useOrgStructure()` → `erp_divisions_${entity}` / `erp_departments_${entity}` | **LIVE** (entity-scoped) | No — Abdos seed does not seed divisions/departments for any of the 6 entities; hub renders empty for ABDOS scope | **FAIL** (no group-tree surface here — this hub is divisions/departments, not the group hierarchy) |
| BranchOfficeList | `src/pages/erp/foundation/BranchOfficeList.tsx` L24 | `const MOCK_BRANCHES = [...]` (3 SmartOps rows) | **STATIC** | No — shows Mumbai Service Centre / Delhi Sales / Bengaluru Collection | **FAIL** |

### Browser click-through
Attempted preview routes `/erp/foundation/companies`, `/subsidiaries`, `/branch-offices`, `/parent-company`, `/org-structure` — login wall, **CNR-browser-auth**. Static-content evidence above is source-deterministic (hardcoded `MOCK_*` arrays cannot render any other rows) so the FAIL stands without browser.

### Root cause (one line)
The B1 Abdos seed lives in `erp_group_entities` + group-structure side-store (which feed `GroupConsolidationPage` only). The Foundation list pages read from a different storage contract (`erp_companies` / `erp_subsidiaries` / `erp_branch_offices`) or are pure hardcoded `MOCK_*` arrays — no bridge exists.

### Fails (4 honest, all STATIC/contract-mismatch)
- **B2-F-1** CompanyList hardcoded `MOCK_COMPANIES`; never reads `erp_companies` nor `erp_group_entities`.
- **B2-F-2** SubsidiaryList hardcoded `MOCK_SUBSIDIARIES`; SubsidiaryCreate writes to `erp_subsidiaries` but list doesn't read it. Round-trip broken.
- **B2-F-3** BranchOfficeList hardcoded `MOCK_BRANCHES`; never reads `erp_branch_offices`.
- **B2-F-4** Foundation pages and B1 seed use different storage keys — no bridge. Operator cannot see the Abdos group in any Foundation list. ParentCompany is also unbridged.

### Scope-notes (honest)
- There is **no group-tree visualisation page** in `/erp/foundation/`. The seeded group structure is consumed only by `GroupConsolidationPage` (Batch 1) and the IC engines. So the prompt's "org/branch structure reflects the group tree" expectation has no host surface today.
- `useEntityList()` (`src/hooks/useEntityList.ts`) reads `erp_parent_company` + `erp_companies` + `erp_subsidiaries` + `erp_branch_offices` — wiring the Foundation pages to seed those keys (or to read `erp_group_entities`) is a future-sprint fix, not in scope for this RUN-ONLY pass.

### Verdict
**FAIL** — Command Center Foundation surfaces do not reflect the seeded ABDOS group. Three list pages are pure static mocks; ParentCompany + OrgStructureHub are LIVE but unbridged to the seed. Recorded honestly. Suggest a future sprint to either (a) extend the B1 seed to write the Foundation-contract keys, or (b) refactor Foundation lists to read `erp_group_entities`.

STOP.
