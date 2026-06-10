# Plan · Fresh `/erp/dashboard` Feature Comparison — Document 1 of 4

This is **fresh first-time work**. No reference to the May-15 audits, no `_v2` suffix, no "refresh" framing. Built from current HEAD.

## Hard scope (Document 1 only)

- **One deliverable, then stop.** I do not start Documents 2/3/4 until you say "continue".
- **Read-only output.** Single new file under `docs/audits/`. Zero diff on `src/`, `tests/`, configs, `package.json`, sprint-history, sibling-register, mem.

## Deliverable

```text
docs/audits/operix-erp-dashboard-feature-comparison-2026-06-10-IST.md
```

(Fresh filename — no version suffix, no "v2", no reference to a prior doc.)

## Verified facts I will lock in the doc header

| Fact | Value | Source |
|---|---|---|
| Current `/erp/dashboard` card count | **33** | `grep -c "status: 'active'" src/components/operix-core/applications.ts` → 33 |
| Coming-soon cards | **0** | same file, no `coming_soon` matches |
| TallyPrime GA version benchmarked | **7.0** | `help.tallysolutions.com/release-notes-tallyprime-7-0/`, `tallysolutions.com/download/` |
| TallyPrime 7.1 | **Beta only** (roadmap signal, not GA) | `tallysolutions.com/download-tallyprime-7-1-beta/` |

## Competitor matrix (9 columns)

| # | Vendor | Edition |
|---|---|---|
| 1 | TallyPrime | 7.0 GA (7.1 Beta noted in margin) |
| 2 | SAP S/4HANA | Public Cloud 2025 |
| 3 | Oracle Fusion Cloud ERP | (Financials, SCM, PPM, HCM, EPM) |
| 4 | Oracle NetSuite | 2025.1 |
| 5 | Microsoft Dynamics 365 | F&O + Business Central |
| 6 | Odoo | 17 Enterprise |
| 7 | Zoho One | (Books, Inventory, CRM, People, Projects, Desk) |
| 8 | Marg | ERP 9+ |
| 9 | Busy | 21 |

Oracle is two distinct columns (Fusion ≠ NetSuite) per your instruction.

## The 33-card spine (enumerated fresh from `applications.ts`)

Ops Hub (12): command-center, procure360, inventory-hub (renamed "Main Store Hub"), qualicheck, gateflow, production, maintainpro, requestx, engineeringx, store-hub, vendor-portal, sitex, logistics
Sales Hub (5): salesx, distributor-hub, customer-hub, projx, webstorex, ecomx
Fin Hub (6): fincore, comply360, payout, receivx, bill-passing, fpa-planning
International Trade (1): eximx
Pay Hub (1): peoplepay
Dispatch Hub (1): dispatch-hub
FrontDesk Hub (1): frontdesk
Support Hub (3): servicedesk, taskflow, docvault
InsightX (1): insightx

(Recount happens in Step 1 below — final categorization is whatever applications.ts says verbatim.)

## Document 1 structure

```
0. Header
   - Generated date · IST
   - Source of truth: src/components/operix-core/applications.ts (HEAD commit SHA)
   - 9 competitor versions with citations
   - Method statement (honest, no assumptions)

1. Inventory of /erp/dashboard cards
   1.1 Active cards table (id · name · category · route · sidebar-config file)
       — Built by reading applications.ts top-to-bottom, no May-15 carry-over.
       — Each row links to its actual page file path verified on HEAD.
   1.2 Coming-soon cards — explicitly stated as 0; no separate table.
   1.3 Total: 33 cards.

2. Functional comparison matrix (one row per card, nine competitor columns)
   - Each cell is the competitor's named module (e.g. "SAP MM-PUR", "NetSuite Procurement",
     "Fusion Procurement Cloud", "Tally Vouchers > Purchase Order", "Marg PO Module").
   - Legend: ✅ named-module / ◐ partial via add-on (name the add-on) / ✖ not offered.
   - No naked checkmarks. Every cell carries the module name or "—".

3. Card-level verdict
   For each of the 33 cards:
   - One-line "Operix ships:" (verified from page/component file path).
   - One-line "Closest peer in each of the 8 vendors" (named module).
   - One-line "Operix differentiator" or "Operix gap" (honest, qualitative — no invented scores).
   - UNVERIFIED tag if the page file can't be located on HEAD.

4. Cross-suite advantages (qualitative bullets, no fabricated scoring)
5. Cross-suite gaps (qualitative bullets)
6. Module-by-module coverage summary (count of ✅ / ◐ / ✖ per competitor)
7. Recommendations — **deferred to Document 2 (Enhancement Roadmap)**. This doc only states facts.

8. Method appendix
   - Exact commands run (grep / file reads).
   - Source URLs for each competitor's module names (release notes pages).
   - Explicit "Did NOT do" list (no Playwright re-run, no live browser CRUD, no scoring rubric invention).
```

## Step-by-step execution

1. Read `src/components/operix-core/applications.ts` end-to-end; emit the 33-row inventory.
2. For each card, verify its primary page/shell file exists (`src/pages/erp/<slug>/<Pascal>Page.tsx` or `src/apps/erp/configs/<slug>-shell-config.ts`). Mark UNVERIFIED if missing.
3. For each competitor, source module names from official release-note URLs (TallyHelp 7.0, SAP S/4HANA Cloud 2025 What's New, NetSuite 2025.1 release notes, Oracle Fusion Cloud applications module catalog, Microsoft Learn for D365 F&O + BC, Odoo 17 apps page, Zoho One apps page, Marg & Busy product pages).
4. Build matrix tables in the order above.
5. Write the markdown file. No other path is touched.
6. Run `git status` to prove only `docs/audits/operix-erp-dashboard-feature-comparison-2026-06-10-IST.md` is new.
7. Report file path + final line count + section anchors. **Stop. Wait for "continue".**

## Honesty rules (enforced inline)

- Every Operix capability claim is followed by the verifying file path.
- Every competitor module claim is followed by a named module + source URL footnoted once per section.
- Any card whose page file is missing on HEAD is marked `UNVERIFIED — registry entry only`.
- No 1-10 scoring. No fabricated percentages. No "we beat X" without naming the specific competitor module that is weaker.
- Numbers come from `grep` / `wc`, never from memory.

## Explicit out-of-scope for this plan

- No Documents 2, 3, or 4. They get their own plans after you approve Document 1.
- No code changes anywhere in the repo.
- No Playwright execution.
- No sprint-history / sibling-register / memory writes.
- No commit ceremony beyond the docs file landing on HEAD.
- No reference to or comparison with the May-15 audits.
