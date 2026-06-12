# RPT-8b · FrontDesk + TaskFlow + DocVault + Pay-hub (closes Phase C) · Close Summary

**Predecessor HEAD:** `25862b3` (RPT-8a)
**This HEAD:** `TBD_AT_BANK`
**Scope:** Phase C final cohort — closes the hub rollouts. 6 pages chart-enabled, 6 KPIs, 4 DSC sources.

---

## Block 1 — Pages (recipe per-page, applied mechanically)

| Card | Page | shadcn `<Table>` count | Recipe | KPI |
|---|---|---|---|---|
| FrontDesk | `src/pages/erp/frontdesk/contacts/AddressBookReportPage.tsx` | 1 | toggle | `fd-addressbook` |
| TaskFlow | `src/pages/erp/taskflow/SLAManagementPage.tsx` | 1 | toggle | `tf-sla` |
| DocVault | `src/pages/erp/docvault/transactions/DocumentRegister.tsx` | 1 | toggle | `dv-documents` |
| DocVault | `src/pages/erp/docvault/registers/DrawingRegisterTree.tsx` | 0 | dashboard | `dv-drawings` |
| DocVault | `src/pages/erp/docvault/registers/ExpiryReviewPage.tsx` | 2 | toggle | `dv-expiry` |
| Pay-hub | `src/pages/erp/pay-hub/transactions/StatutoryReturns.tsx` | 6+ | toggle | `ph-statutory` |

**Pattern:** additive `<Card>` AFTER existing content — layouts PRESERVED · NO recharts import · hooks at top level.
**ScorecardTile OMITTED across all 6 pages** — no page exposes a real bounded summary-%; status mixes and counts only.

## Block 2 — DSC + KPI seeds

**6 KPIs** (layer-tagged, idempotent, seed-data only) appended to `src/lib/report-framework/kpi-registry.ts`:
- `fd-addressbook` · op/mgr/mgmt · `frontdesk.contacts`
- `tf-sla` · op/mgr/mgmt · `taskflow.tasks`
- `dv-documents` · op/mgr/mgmt · `docvault.documents`
- `dv-drawings` · op/mgr/mgmt · `docvault.documents`
- `dv-expiry` · mgr/mgmt · `docvault.documents`
- `ph-statutory` · mgr/mgmt · `payhub.payroll`

**4 DSC sources** appended to `src/lib/report-framework/data-sources.ts`:
- `frontdesk.contacts` — wraps `fdPartyContactsKey(entityCode)`
- `taskflow.tasks` — wraps `tfSLAKey(entityCode)`
- `docvault.documents` — wraps `erp_documents_${entityCode}`
- `payhub.payroll` — wraps `payrollRunsKey(entityCode)` (THE SAME storage the pay-hub workflow modules already read · resolves the deferred pay-hub DSC)

## Pay-hub embedded-analytics 0-DIFF note

All pay-hub workflow modules (Onboarding · PayrollProcessing · ExitAndFnF · etc.) and `PayHubDayBook` (registry-served via RPT-3a) stay **0-DIFF by design**. `StatutoryReturns` is the only standalone wrap target this sprint. The `payhub.payroll` DSC source registers a read-only wrapper of `payrollRunsKey` — the same payroll runs the workflow modules already consume — without duplicating engines or storage.

## Block 3 — Institutional + Tests

**`src/lib/_institutional/sprint-history.ts`:**
- RPT-8a `headSha` BACKFILLED `'TBD_AT_BANK'` → `'25862b3'` · provenance flipped `PENDING_BACKFILL` → `CONFIRMED`
- RPT-8b self-seeded (`headSha:'TBD_AT_BANK'`, `predecessorSha:'25862b3'`, `loc:420`)
- **ZERO new SIBLINGs**

**Test files created (7):**
1. `src/pages/erp/frontdesk/contacts/__tests__/address-book-report-page.test.tsx` (toggle)
2. `src/pages/erp/taskflow/__tests__/sla-management-page.test.tsx` (toggle)
3. `src/pages/erp/docvault/transactions/__tests__/document-register.test.tsx` (toggle)
4. `src/pages/erp/docvault/registers/__tests__/drawing-register-tree.test.tsx` (dashboard)
5. `src/pages/erp/docvault/registers/__tests__/expiry-review-page.test.tsx` (toggle)
6. `src/pages/erp/pay-hub/transactions/__tests__/statutory-returns.test.tsx` (toggle)
7. `src/lib/report-framework/__tests__/rpt-8b-kpis-and-sources.test.ts` (registry + DSC)

Registry test asserts: all 6 KPIs idempotent · all 4 sources `read()` return arrays · `payhub.payroll` returns real payroll rows OR honestly empty array (no synthetic seed).

## Triple Gate (verified before this summary)

```
$ npx tsc -p tsconfig.app.json --noEmit
(0 errors)

$ npx eslint --max-warnings 0 <16 touched files>
(0 warnings, 0 errors)

$ npx vitest run <7 new test files>
 Test Files  7 passed (7)
      Tests  10 passed (10)
   Duration  4.18s
```

**No synthetic/placeholder data.** All chart rows derive in-line from the real records each page already loads (parties/contacts, SLA rules, documents, drawings, expiry evaluations, statutory challans). Honest empty-state preserved.

**Phase C closed.** All hub rollouts complete.
