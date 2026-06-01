# Sprint 104 · T-Phase-6.A.1.3 · 🏁 Arc 1 CAPSTONE — Close Summary

**Predecessor HEAD:** `327b7bdebaeea5347cdecf4f964e6292de6af322` (S103 banked · 29 ⭐ · 172 SIBLINGs · 31 pages · ESLint 54)
**Grade target:** A (30 ⭐ · ESLint 55)
**Scope:** Cost Audit §148 applicability engine extension (ADDITIVE) + CostAuditDashboardPage update + UX-surfacing closure.

## Blocks executed

| Block | Outcome |
|---|---|
| 0 · Pre-flight | §148 applicability confirmed ABSENT from `comply360-cost-audit-engine`; existing page-local `evaluateSection148Applicability` helper has a DIFFERENT shape ({applicable, reasons[]}) so engine addition is NOT a FR-44 duplicate. **Orphan enumeration:** 2 genuine orphans — `audit-framework` (AuditFrameworkDashboardPage) and `rule-11g` (Rule11gReportPage). Both are routable via `Comply360Page.tsx` switch + declared in `Comply360Sidebar.types.ts` union, but had **no sidebar entry and no Welcome tile**. All other comply360 page directories map cleanly to existing sidebar entries; sub-pages (e.g. `companies/CAROExtendedPage`, `tax-gst/extended/*`, `exim/foreign-tax/*`) are deep-links of surfaced parents — NOT orphans. |
| 1 · S103 backfill | `sprint-history` S103 `headSha`: `null` → `'327b7bdebaeea5347cdecf4f964e6292de6af322'`. S104 appended with `headSha: 'TBD_AT_BANK'`, `predecessorSha: '327b7bde…'`, `newSiblings: []`. |
| 2 · Engine extension | Added (ADDITIVE) to `src/lib/comply360-cost-audit-engine.ts`: `CostAuditApplicability`, `CostProductServiceEntry`, `CostAuditTable`, `determineCostAuditApplicability`, `listCostProductServices`, `upsertCostProductService`. Existing 9 exports **0-DIFF**. No new audit type registered. No new SIBLING. |
| 3 · Page update | `CostAuditDashboardPage` now consumes `determineCostAuditApplicability` (page-local helper removed); header badge reflects records-only vs audit-required; new "§148 Applicability" tab with industry selector + overall turnover input + aggregate-derived display + product/service table upsert form. **No new page component.** |
| 4 · UX-surfacing closure | 2 new `comply360-sidebar-config` entries (`audit-framework` `c 8`, `rule-11g` `c 9`) + 2 new `Comply360Welcome` tiles. **Zero edits to the orphan page logic** (surface-only). |
| 5 · Tests + registers + close | `src/test/sprint-104/cost-audit-applicability-surfacing.test.ts` with 30 discrete `it()` blocks; sibling count asserted at 172 via `getSiblingCount`. Close summary committed. |

## §L · Design-decision flags

1. **CRA Rules 2014 threshold figures used (Block 2 source-of-truth):**
   - Rule 3 (cost records): uniform overall turnover ≥ **₹35 cr** for both Table A (regulated) and Table B (non-regulated). Source: MCA G.S.R. 425(E) dated 30-Jun-2014, Rule 3.
   - Rule 4 (cost audit): overall turnover gate **₹50 cr regulated / ₹100 cr non-regulated**, AND aggregate product/service turnover ≥ **₹25 cr regulated / ₹35 cr non-regulated**. Source: same notification, Rule 4(1) & 4(2).
   - Encoded as named constants (`RECORDS_THRESHOLD_INR`, `AUDIT_THRESHOLD_REGULATED_INR`, etc.) — integer paise-style ₹ (no raw float).
2. **Engine-extension-not-new-engine rationale:** §148 applicability is logically owned by the existing `comply360-cost-audit-engine` (already houses appointment + CRA + report + cooling-off for the same statute). A new engine would (a) fragment the §148 domain across two files, (b) create a new SIBLING (forbidden by §H), and (c) duplicate the BAP-routing/audit-trail wiring. The 9 existing exports remain byte-identical.
3. **Page-local helper vs engine fn — no FR-44 duplicate:** the prior page helper had shape `{applicable, reasons[]}` and a different threshold heuristic; it was REPLACED (not duplicated) by the engine call. Page is now a pure consumer.
4. **No new audit type:** the applicability determination is a read-only computation; nothing is persisted that requires a new entity-type log. DP-A1-4 posture preserved (Arc 1 adds zero audit types).
5. **Orphan-surfacing honesty:** 2 orphans found, 2 surfaced — NOT a no-op. The two orphans are real first-class dashboards (`AuditFrameworkDashboardPage` from S80c, `Rule11gReportPage` from S80f) that were routable but unreachable from chrome.
6. **Schedule M canonical choice (carry-over from S103):** unchanged — the comply360 `ScheduleMPage` remains canonical; the QualiCheck variant remains untouched.

## 🏁 Arc 1 Completion Note

Arc 1 closes with this sprint:
- **Institutional debt cleared** (S102: hash-chain unhandled-rejection guard via `appendAuditEntrySafe` + 9 stale-TBD SHA backfills + meta-guard strengthened; S102-T1 hotfix swept 6 residual bare-`void` sites).
- **UX surfacing complete** (S103: 4 NEW dashboards #28–#31 + 2 surfaced; S104: final 2 orphans surfaced).
- **Cost Audit §148 substance** (S103 page #28 wired; S104 engine extension with Rule 3/4 thresholds + product/service table).

**Final state:** 30 ⭐ target · 172 SIBLINGs (unchanged) · ~31 Standalone Pages · ESLint 55-streak · ZERO new audit types this arc. Ready for **Arc 2 — Intercompany Foundation**.
