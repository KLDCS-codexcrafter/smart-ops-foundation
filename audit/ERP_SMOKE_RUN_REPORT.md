# OPERIX · FULL-ERP SMOKE RUN REPORT
HEAD target: `bcb1574`

## LEDGER
```
DONE: [1]   NEXT: Batch 2 (Command Center foundation)   REMAINING: 15
BATCH ORDER:
  1. Abdos Group Consolidation                                       ✅
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
