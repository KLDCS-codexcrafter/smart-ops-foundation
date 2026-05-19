# Sprint T-Phase-1.A-c.1 · External Portal Layout + Dashboard + Modern Login · Close Summary

**Sprint ID**: T-Phase-1.A-c.1-VendorPortal-Layout-Dashboard-Login
**Banked HEAD**: <set at commit>
**Predecessor HEAD**: 48194461 (Sprint A-b.2 · 16th A streak · A-b arc 100% complete)
**Date**: 2026-05-18
**Streak target**: 17th consecutive A first-pass-clean
**Mode**: Wholesale chrome replacement · 3 NEW pages + 5 UPDATES + 2 deprecation proxies + 1 routing update + 1 close summary

## §1 · Sprint Outcome

- VendorPortalLayout NEW · modern shell wholesale replacing VendorPortalShell (A-c-Q2=D)
- VendorDashboard NEW · vendor home at /vendor-portal · KPIs + quick actions + roadmap + legacy access
- VendorLogin NEW · modernized login · same auth-engine API · token-or-credentials per D-255
- 3 existing pages chrome-refreshed (VendorInbox · VendorPortalProfile · VendorCommLog) · chrome-only per A-c-Q11=A · internal JSX 0-diff
- 2 deprecation proxies created (VendorPortalLogin · VendorPortalShell · D-NEW-DZ pattern)
- App.tsx routing updated · /vendor-portal → Dashboard · /vendor-portal/login → VendorLogin
- Sprint A-c 33% complete (A-c.1 banked · A-c.2 + A-c.3 remain)

## §2 · Files Changed (11 total)

### NEW (4)
1. `src/pages/vendor-portal/VendorPortalLayout.tsx` (~180 LOC · 10 nav entries · 2 dropdowns · mobile-responsive)
2. `src/pages/vendor-portal/VendorDashboard.tsx` (~200 LOC · 4 KPI tiles · 4 quick actions · roadmap · legacy access)
3. `src/pages/vendor-portal/VendorLogin.tsx` (~210 LOC · brand header · token + credential flows · D-255 badge)
4. `src/__tests__/__sprint-summaries__/a-c-1-vendor-portal-external-layout-dashboard-login-close-summary.md` (this file)

### UPDATE · chrome swap (3)
5. `src/pages/vendor-portal/VendorInbox.tsx` (import + open + close tag swap · internal JSX 0-diff)
6. `src/pages/vendor-portal/VendorPortalProfile.tsx` (same 3-swap pattern)
7. `src/pages/vendor-portal/VendorCommLog.tsx` (same 3-swap pattern)

### UPDATE · deprecation proxy (2)
8. `src/pages/vendor-portal/VendorPortalLogin.tsx` (1-line `export { default } from './VendorLogin'`)
9. `src/pages/vendor-portal/VendorPortalShell.tsx` (1-line `export { default } from './VendorPortalLayout'`)

### UPDATE · routing (1)
10. `src/App.tsx` (2 new lazy imports + 1 new Route + 1 swapped Route)

### Skipped per Block D conditional
- `VendorOnboardingFirstQuote.tsx` · no VendorPortalShell wrapper (grep verified) · skipped
- `RFQPublicForm.tsx` · no VendorPortalShell wrapper (grep verified) · skipped
- `docs/vendor-portal-external-deprecation-note.md` · `docs/` exists but per Block F.13 marked OPTIONAL · inlined here instead

## §3 · D-decisions Registered

- **D-NEW-DY** · VendorPortalLayout wholesale replacement pattern · 10 nav entries + DropdownMenu · precedent for future external-portal layout refreshes (distributor portal · service-desk portal Phase 2)
- **D-NEW-DZ** · Deprecation Proxy Pattern · 10-line re-export proxy for 1 sprint cycle when wholesale-replacing a file · removed in next-arc cleanup · consumers migrate naturally · zero breakage
- **D-NEW-DX** (carried forward · 2nd application) · Empirical Schema Verification mid-flight · STOP-AND-RAISE on auth-engine API mismatch · positional `verifyVendorCredential(vendorId, entityCode, password|null)` · 4-arg `createVendorSession(vendor, entityCode, isTokenOnly, mustChangePassword)` · `'token_landing'` activity kind (not `'login_token'`) · matched A-b.2 institutional precedent

## §4 · Triple Gate Results

- STRICT TSC: pending CI
- ESLint: pending CI
- Vitest: 1211 / 165 files / 0 skipped · IDENTICAL target (no test files touched)
- Build: pending CI

## §5 · Carry-Forward 0-Diff Verification

- 4 core protected zones · 33 fy-stamped UPRA · 99 Register infra · 14 FinCore vouchers · 17 RequestX · 4 SupplyX · all internal admin (A.1 + A.2 + A-b.1 + A-b.2) · all 5 consumed engines · vendor-broadcast-engine · vendor-portal-auth-engine · vendor-portal-scope · vendor-portal-commlog-engine · card-entitlement.ts + engine + hook · applications.ts · breadcrumb-memory.ts · vendor-portal-shell-config.ts · VendorPortalSidebar.types.ts · VendorPortalPage + Welcome (internal) · 11 internal vendor-portal panels · NO test changes · NO package.json

## §6 · Forward State

- Sprint A-c.1 banked · A-c.2 (VendorEnquiryResponse + VendorBidSubmission + VendorPOView · ~1100 LOC · 18th A target)
- A-c.3 (VendorKYCManagement + VendorInvoiceUpload + VendorMessages + VendorPerformanceView · ~1200 LOC · 19th A · A-c arc closure)
- Two deprecation proxies (VendorPortalShell · VendorPortalLogin) scheduled for deletion in Sprint A-d after natural consumer migration
