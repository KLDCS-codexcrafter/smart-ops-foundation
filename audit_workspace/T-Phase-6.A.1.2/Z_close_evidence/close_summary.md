# Sprint 103 · T-Phase-6.A.1.2 · Close Summary

**Arc**: 1 (UX Surfacing) · **Predecessor HEAD**: `ba5a81b75132577a7599d6ff0945d0ded2662db5` (S102)
**Target**: 29th A · 4 NEW Standalone Pages + 2 SURFACED · ZERO new SIBLINGs / engines / audit types
**LOC (approx)**: ~950 (under 1,000 ASK gate)

## Scope delivered

### 4 NEW First-Class Standalone Pages
| # | Page | Engine read (USE-SITE · FR-44 · 0-DIFF) |
|---|------|----------------------------------------|
| 28 | `cost-audit/CostAuditDashboardPage.tsx` | `comply360-cost-audit-engine` (CRA-1/2/3/4 · §148(3) cooling-off) |
| 29 | `meetings/MeetingsDashboardPage.tsx`   | `comply360-meetings-engine`   (Board · AGM · EGM · quorum · voting · MGT-7) |
| 30 | `survival-kit/SurvivalKitDashboardPage.tsx` | `comply360-survival-kit-engine` (OOB-4 · readiness % · checklist · Q&A) |
| 31 | `csr/CSRDashboardPage.tsx`              | `comply360-csr-engine` (Committee · CSR-1 · CSR-2 · Sch VII applicability) |

### 2 SURFACED (existing pages newly wired into Comply360 router + sidebar + Welcome)
| Surface | Existing page | Engine |
|---------|---------------|--------|
| `form-15ca` | `exim/foreign-tax/Form15CAPage.tsx` | `form-15ca-15cb-engine` |
| `schedule-m` | `companies/ScheduleMPage.tsx` (canonical) | `comply360-schedule-m-engine` |

### Wiring
- `Comply360Sidebar.types.ts` — extended union with 6 new modules.
- `comply360-sidebar-config.ts` — 6 sidebar entries appended (type=item per S95-HOTFIX canon · keyboard `c U / c J / c V / c H / c 5 / c 7`).
- `Comply360Page.tsx` — router switch cases for all 6 + lazy imports.
- `Comply360Welcome.tsx` — 6 new tiles in landing grid.

## §L Architectural Decisions

### L.1 — CSR re-scope SURFACE → BUILD (FR-1 decision)
Pre-flight Block 0 row 4 marked CSR as "SURFACE only" based on a `find *csr*` shell match. The match was a **false positive on `TDSAnalyticsReport.tsx`** (substring `csr` inside `TDSAnalyticsReport`). The repo contained **no dedicated CSR page** — only `Section393Page.tsx` consumed one `comply360-csr-engine` helper inline. Per Hard-Rule #1 ("STOP if a SURFACE target does not exist"), the agent halted and asked. Founder ratified **Option A**: re-scope CSR to BUILD (page #31). Result: symmetric 4-new/2-surfaced shape, still ZERO new engines/SIBLINGs/audit types.

### L.2 — Built-vs-Surfaced boundary
"BUILD" = the page is a net-new artifact created in this sprint over an existing 0-DIFF engine. "SURFACE" = an existing page (built in an earlier sprint, possibly never reachable through Comply360's mega-menu) gets newly wired into the router/sidebar/Welcome with no source-file changes to the page itself. This boundary preserves FR-44 (no orchestrator-vs-engine drift) and keeps the §H envelope intact (no engine changes ⇒ no audit-trail surface changes).

### L.3 — Schedule M canonical choice (canonical over QualiCheck variant)
Two Schedule M pages exist in the repo: the comply360 canonical (`companies/ScheduleMPage.tsx`, FR-19/FR-91, deep-links to QualiCheck) and a QualiCheck-bay variant (`pages/erp/qualicheck/...`). S103 surfaces **only the comply360 canonical**: it is the FR-91-blessed entry, it owns the §H audit trail, and it already deep-links to the QualiCheck variant via `useNavigate`. The QualiCheck variant remains untouched (`@iso` parity).

### L.4 — Transfer-Pricing (TP) skip
Sprint 103 charter excludes TP. The `comply360-transfer-pricing-engine` already has surfaces (`comply360/tax-gst/...`); no new wiring required. TP-skip is documented here so a future sprint does not infer a coverage gap.

### L.5 — Sprint-history backfill discipline
S103 entry is appended with `headSha: null` per the published `TBD_AT_BANK → next-sprint Block 1` rule; S102's headSha (`ba5a81b7…`) is carried as `predecessorSha`. The S102 entry retains its already-banked SHA. No moat-register changes (no new SIBLINGs/moats this sprint).

## Triple-Gate evidence (this sprint)
- **TSC**: `npx tsc -p tsconfig.app.json --noEmit` → 0 errors
- **ESLint**: `npx eslint . --max-warnings 0` → 0/0
- **Vitest**: `npx vitest run src/test/sprint-103` → all green (≥25 it() in 1 file)
- **Build**: `npm run build` → PASS

## Files touched
**Created**
- `src/pages/erp/comply360/cost-audit/CostAuditDashboardPage.tsx`
- `src/pages/erp/comply360/meetings/MeetingsDashboardPage.tsx`
- `src/pages/erp/comply360/survival-kit/SurvivalKitDashboardPage.tsx`
- `src/pages/erp/comply360/csr/CSRDashboardPage.tsx`
- `src/test/sprint-103/arc1-ux-surfacing.test.ts`
- `audit_workspace/T-Phase-6.A.1.2/Z_close_evidence/close_summary.md`

**Edited**
- `src/pages/erp/comply360/Comply360Sidebar.types.ts`
- `src/apps/erp/configs/comply360-sidebar-config.ts`
- `src/pages/erp/comply360/Comply360Page.tsx`
- `src/pages/erp/comply360/Comply360Welcome.tsx`
- `src/lib/_institutional/sprint-history.ts`

## Status
- 29-streak ⭐ banked (pending headSha at S104 Block 1).
- SIBLING count unchanged: **172**.
- Standalone Pages: **27 → 31** (+4 new) plus 2 newly-routed surfaces.
- ESLint streak: **53 → 54**.
