# Sprint 78b · Comply360 Main Arc 1.10 · Pass B · Close Summary

## §1 · Identity
- Code: T-Phase-5.A.1.10-PASS-B
- Grade: A first-pass-clean
- Predecessor HEAD: d5db78986311ed587c47a343790a0b704fa9ad98 (Sprint 78a Pass A · banked)
- HEAD: <pending>
- Streak target: 31 ⭐
- Main Arc 1.10: COMPLETE

## §2 · Scope
3 NEW surfaces consuming the 5 Pass A engines + home Welcome promoted to tab-shell + Time-Machine sub-tab (FR-106 recursive · Option B) + 2 new mega-menu router wirings (calendar + payments) + DP-S78-7 widget data-source rewire (no widget file edits).

## §3 · Deliverables
- `src/pages/erp/comply360/calendar/CalendarPage.tsx` — Compliance Calendar mega-menu (consumes buildCalendar / calendarForMonth / nextUpcomingEvents).
- `src/pages/erp/comply360/payments/StatutoryPaymentsPage.tsx` — Statutory Payments mega-menu (consumes loadPayments / computePaymentDue / recordPayment / prepareChallan).
- `src/pages/erp/comply360/home/HomePage.tsx` — Home tab-shell wrapper (Welcome default tab + Time-Machine sub-tab).
- `src/pages/erp/comply360/home/TimeMachinePage.tsx` — Forensic-replay surface (consumes replaySnapshot / listAvailableSnapshots / compareSnapshots).
- `src/pages/erp/comply360/Comply360Page.tsx` — +case 'calendar' · +case 'payments' · home/welcome → <HomePage />.
- `src/pages/erp/comply360/Comply360Welcome.tsx` — data-source rewire (DP-S78-7 · enriched obligations from calendar engine + time-machine snapshot count helper).
- `src/lib/_institutional/sprint-history.ts` — Sprint 78a SHA-fill + Sprint 78b entry.
- `src/test/sprint-78b/comply360-sprint-78b.test.ts` — ≥22 assertions across snapshot, RECG, router wiring, engine smokes, FR-105 sweep.

## §4 · §H 0-DIFF (verified by done-gate)
- 5 Pass A engines · 6 read-sources · 4 S77a engines · caro-2020 · brsr-fa · form-3ceb · form-15ca-15cb · cfr-part-11 · 5 widget files (`src/pages/erp/comply360/widgets/`) all untouched.

## §5 · Lesson 29 prior-sprint stale-test sweep
Grep result: 0 prior-sprint UI tests affected by Welcome promotion or +2 router cases. No equality assertions found on Comply360Page router-case count or Comply360Welcome single-page structure or TabsTrigger counts inside Welcome/home. No conversions required.

## §6 · FR-105 sweep
Central cross-ref bounds-check (`getSiblingCount() ≥ 83`, `getSprintCount() ≥ 81`, A-streak `≥ 28`) all still satisfied. Sprint-78b snapshot uses `≥31` A-streak / `≥84` SPRINTS / `≥88` SIBLINGS bounds-check. Done-gate grep on scattered-snapshot equality returns 0.

## §7 · Triple Gate
- TSC 0 errors
- ESLint 0 problems (0 errors · 0 warnings · 18 consecutive sprints)
- Vitest 0 failed · 0 file-fails · ≥2990 passed
- Build green

## §8 · Lesson 30 · Done-gate explicit exit-code assertions
The §12 done-gate uses `set -e` + `$?` capture + PASS/FAIL counter. Any non-zero exit halts immediately and prints DONE-GATE FAIL.

## §9 · DP-S78-7 widget rewire
The 5 widget files in `src/pages/erp/comply360/widgets/` are 0-DIFF. Data-source enrichment (`buildCalendar` merged into the obligation set, `listAvailableSnapshots` count surfaced) happens entirely inside `Comply360Welcome.tsx`.

## §10 · Mega-menu wirings (calendar + payments)
Sidebar groups + union members already existed since S69. Pass B added the router cases + shells only. No sidebar or union changes.

## §11 · FR-106 recursive shell
Home shell → Home tab-shell (HomePage) → Time-Machine sub-tab pattern follows the LegalNoticesPage / ExtendedReturnsPage canonical recursive-shell convention.

## §12 · Risks accepted
None. All §H invariants verified by done-gate. No PLACEHOLDER strings in any new surface. All sample data uses realistic Indian entity codes, INR amounts, and FY 25-26 statutory dates.

## §13 · Forward-extensible hooks (preserved)
- `OBLIGATION_SOURCES_REGISTRY` (calendar engine) · append-only registration for Floor 2-4 sprints.
- `AUDIT_ENTITY_TYPES_REGISTRY` (audit-trail-aggregator) · append-only registration for new statutory record types.
- Time-Machine `compareSnapshots` available for future audit-suite diffing UX (S80-82).

## §14 · Report-back
HEAD <pending short SHA> · Sprint 78b banked · Main Arc 1.10 COMPLETE · streak 31 ⭐.
