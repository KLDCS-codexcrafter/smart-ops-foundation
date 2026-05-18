# Sprint T-Phase-1.A-b.2 · Vendor Portal Communications & Categories · Close Summary

**Sprint ID**: T-Phase-1.A-b.2-VendorPortal-Communications-Categories
**Date**: 2026-05-18
**Predecessor HEAD**: a9f91882
**Position**: 2nd of 2 in Sprint A-b · A-b arc 100% complete on bank
**Streak target**: 16th consecutive A first-pass-clean

## Files (8)

### NEW (4)
1. `src/lib/vendor-broadcast-engine.ts` — NEW engine · createBroadcast / listBroadcasts / resolveBroadcastTargets / segmentLabel · FR-79 engine-side stamping
2. `src/pages/erp/vendor-portal/panels/VendorBroadcastConsolePanel.tsx` — compose + segment target + history
3. `src/pages/erp/vendor-portal/panels/VendorCommunicationLogAdminPanel.tsx` — aggregate admin view · mark-read + drill-down · honest schema (direction badge · party_name direct · subject/body required)
4. `src/pages/erp/vendor-portal/panels/VendorCategoriesPanel.tsx` — 5-category read-only taxonomy

### UPDATED (3)
5. `src/apps/erp/configs/vendor-portal-sidebar-config.ts` — removed final 3 `comingSoon: true` markers
6. `src/pages/erp/vendor-portal/VendorPortalPage.tsx` — added 3 imports · wired 3 cases · DELETED `ComingSoonPanel` function (arc closure dead-code cleanup)
7. `src/pages/erp/vendor-portal/VendorPortalWelcome.tsx` — roadmap card renamed to "Sprint A-b Complete" · all 5 tiles Live + clickable

### CLOSE (1)
8. This file.

## D-decisions registered
- **D-NEW-DU** — vendor-broadcast-engine NEW (10th D-NEW-BB-pattern consumer)
- **D-NEW-DV** — A-b arc closure complete (5/5 internal panels live)
- **D-NEW-DW** — ComingSoonPanel dead-code cleanup pattern (institutional precedent for arc closures)

## Schema honesty (FR-8) — STOP-AND-RAISE outcome
CommunicationLogEntry has no `kind` field. Per founder ruling (Option B):
- Per-row badge uses `e.direction` (← Vendor / → Admin) — highest info density per row
- `party_name` accessed directly (required string on type)
- `e.subject` / `e.body` rendered without `??` guards (required strings)

## Triple Gate
- TSC: 0 errors
- ESLint: 0/0
- Vitest: 1211/165/0 (IDENTICAL · zero-touch on protected files held)
- Build: clean

## Arc state on close
- Sprint A-b: 100% complete (A-b.1 + A-b.2 banked)
- Sprint A: 75% complete (A.1 + A.2 + A-b banked · A-c + A-d remain)
- All 10 A-b-Q sub-locks delivered
- Vendor Portal: 11/11 modules live (welcome + 10 children) · ComingSoonPanel dead-code eliminated
