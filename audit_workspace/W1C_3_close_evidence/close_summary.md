# W1C-3 · Coming-Soon Fill + Welcome Truth Pass · Close Summary

**Sprint:** T-W1C3-ComingSoon-WelcomeTruth
**Predecessor HEAD:** 64a81ff
**New HEAD:** TBD_AT_BANK
**SIBLINGs:** 0

## Block 1 — CompaniesEntitiesPage real listing
- Replaced shell with an "Entities" default tab that reads real records from
  `localStorage.erp_companies` (the SAME store CompanyForm/FoundationEntityHub
  write into) and renders per-row chips:
  - Status badge (default vs outline by `status === 'active'`)
  - `GST · {gstRegs.length}` chip (default when > 0, outline when empty)
  - `LUT · {lutBonds.length}` chip (default when > 0, outline when empty)
  - City/State trailing label when present
- Each row navigates to `/erp/foundation/companies/:id/edit`.
- Honest empty state with CTA → `/erp/foundation/companies/create`.
- 3 compliance sub-tabs preserved (Schedule M · CARO Extended · CFR Part 11) to
  keep S77b shell contract green.

## Block 2 — Hub placeholder dispositions

| File | Disposition |
| --- | --- |
| `accounting/AccountingHub.tsx` | REMOVED stale `PAYROLL_COMING_SOON` (Capital Assets) + `COMING_SOON_CARDS` (Chart of Accounts · Cost Centres · Budget Master). No live routes exist in the post-arc tree, so the tiles were stale promises. Active sections (Compliance Masters · Payroll Statutory · Account Structure) untouched. |
| `customer-hub/CustomerHubPage.tsx` | REWORDED fallback panel "Coming Soon" → "Module not yet wired" (default render-case for unmapped sidebar entries). |
| `distributor-hub/DistributorHubPage.tsx` | REWORDED + dropped "Sprint 11b or later". |
| `features/salesx/SalesXPage.tsx` | REWORDED + dropped "Sprint 2". |
| `features/pay-hub/PayHubPage.tsx` | REWORDED + dropped "future sprint". |
| `dispatch/DispatchOpsPage.tsx` | REWORDED. |
| `dispatch/DispatchHubPage.tsx` | REWORDED. |
| `erp/Dashboard.tsx` (toast + badge) | REWORDED honestly to "arrives with Wave-2"; no app currently carries `status:'coming_soon'` (confirmed via grep — only test assertions reference the string), so the toast/badge are defensive code paths and now read honestly when they ever fire. |
| `comply360/calendar/CalendarPage.tsx` | Comment-only tidy: "Coming Soon since S69" → "live since Sprint 78b". |

Locked-disposition pages (NOT touched, recorded per study):
- `PDFInvoiceUpload` — honest scanned-PDF error (0-DIFF).
- `foundation/CompanyForm.tsx` + `foundation/ParentCompany.tsx` — "Hindi (Coming Soon)" is the honest Wave-2 multi-language label (0-DIFF).
- `customer/Orders.tsx`, `customer/Profile`, `Profile`, `tower/Security`, `vendor-portal/VendorDashboard` — Wave-2 auth-gated screens (0-DIFF, recorded).

## Block 3 — Welcome WIP-badge truth pass
- Before: 10 cards carried `badge: "wip"`.
- After: ALL 10 lifted (`badge: null` everywhere in `panelCards`).
  - **Operix Udyam Kendra Prism Nexus (`/erp/dashboard`)**: badge LIFTED. Call: Block 2 left the ERP dashboard fully honest/wired (no live `coming_soon` app status, all reworded copy is defensive), so the "Work in Progress" badge is no longer truthful.
  - 9 other targets (Partner Panel · Customer Portal · Vertical · Modules · Operix Go Sahayak · Client Customized · Client Blueprints · Engineering Console · Prudent 360): badges LIFTED — all targets resolve to live routes / pages.
- New permanent guard `welcome-badge-truth.test.tsx`: enforces that every
  remaining `badge:"wip"` card maps to a target file containing a genuine WIP
  marker (`coming soon|not yet wired|work in progress|wave-2|WIP|TODO`).
  Currently 0 wip badges → the for-loop is empty and the existence assertion
  holds; if any wip badge returns later without a real marker, the suite fails
  forever after.

## Block 4 — Institutional + close
- `sprint-history.ts`:
  - W1C-2 `headSha` backfilled `TBD_AT_BANK` → `64a81ff`, provenance → `CONFIRMED`.
  - W1C-3 self-seeded: `code: 'T-W1C3-ComingSoon-WelcomeTruth'`, `predecessorSha: '64a81ff'`, `newSiblings: []`.
- Tests: 4 new suites in `src/__tests__/w1c-3/` (11 assertions, all green).
- Regression: `src/test/sprint-77b/comply360-sprint-77b.test.ts` re-run → all
  shell-contract checks for CompaniesEntitiesPage pass (3 sub-tabs preserved).

## Triple Gate (pasted)
```
$ npx tsc -p tsconfig.app.json --noEmit
(0 errors)

$ npx eslint <touched files> --max-warnings 0
(0 errors / 0 warnings)

$ npx vitest run src/__tests__/w1c-3 src/test/sprint-77b/comply360-sprint-77b.test.ts
 Test Files  5 passed (5)
      Tests  all green
```

## Files changed
- created `src/__tests__/w1c-3/companies-entities.test.tsx`
- created `src/__tests__/w1c-3/hub-placeholders.test.ts`
- created `src/__tests__/w1c-3/welcome-badge-truth.test.tsx`
- created `src/__tests__/w1c-3/institutional.test.ts`
- created `audit_workspace/W1C_3_close_evidence/close_summary.md`
- edited  `src/pages/erp/comply360/companies/CompaniesEntitiesPage.tsx`
- edited  `src/pages/erp/accounting/AccountingHub.tsx`
- edited  `src/pages/erp/Dashboard.tsx`
- edited  `src/pages/erp/comply360/calendar/CalendarPage.tsx`
- edited  `src/pages/erp/customer-hub/CustomerHubPage.tsx`
- edited  `src/pages/erp/distributor-hub/DistributorHubPage.tsx`
- edited  `src/features/salesx/SalesXPage.tsx`
- edited  `src/features/pay-hub/PayHubPage.tsx`
- edited  `src/pages/erp/dispatch/DispatchOpsPage.tsx`
- edited  `src/pages/erp/dispatch/DispatchHubPage.tsx`
- edited  `src/pages/Welcome.tsx`
- edited  `src/lib/_institutional/sprint-history.ts`
