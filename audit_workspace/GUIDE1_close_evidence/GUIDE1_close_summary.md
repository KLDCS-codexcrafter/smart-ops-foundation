# GUIDE-1 · T-GUIDE1-OperixGo-Personas · CLOSE SUMMARY

**Sprint:** GUIDE-1 · operix-go dev-guide completeness · 6 persona apps as first-class entries
**Predecessor HEAD:** `e441113e` (AM.4 banked · 119 ⭐)
**Target:** 120 ⭐ milestone · LOC ~350 · New SIBLING: NONE

## §0 Pre-flight
- HEAD `e441113e` ✅
- Persona dir cross-check (real counts on disk):
  - salesman 11 · telecaller 12 · manager 9 · supervisor 9 · distributor 6 · servicedesk 1 ✅
- 6 personas absent from operix-go MOBILE_PRODUCTS as first-class entries → ADDED.

## §1 6 Persona Guide Entries (entries-only · NO new pages)
Added to `src/pages/mobile/OperixGoPage.tsx` MOBILE_PRODUCTS, each `phase: 'live'`:

| id | role-route | pages | engine consumed |
|---|---|---|---|
| `persona-salesman` | `/mobile/salesman` (role `salesman`) | 11 | location-tracker-engine · mobile-audit · useTimeEntries |
| `persona-telecaller` | `/mobile/telecaller` (role `telecaller`) | 12 | mobile-audit · useCallSessions · useWaTemplates |
| `persona-manager` | `/mobile/manager` (role `sales_manager`) | 9 | mobile-audit · role-home-engine · insights-inbox |
| `persona-supervisor` | `/mobile/supervisor` (role `supervisor`) | 9 | mobile-audit · approval-rail-engine · location-tracker-engine |
| `persona-distributor` | `/mobile/distributor/catalog` | 6 | distributor-cart-store · distributor-order-engine · distributor-auth-engine |
| `persona-servicedesk-engineer` | `/operix-go/service-engineer` (role `service_engineer`) | 1 | servicedesk-engine · servicedesk-bridges |

## COMPLETE OPERIX-GO MOBILE INDEX (post-GUIDE-1)
**Total entries:** 32 (26 prior + 6 persona apps).

**Phase 2 (3):** vetan-nidhi · salesx-go · receivx-go
**Live (28):** gate-guard · qualicheck-mobile · inward-receipt-mobile · store-issue · receipt-ack · material-indent · site-engineer · maintenance-technician · shop-floor-operator · site-dpr · site-snag · site-safety · site-material-issue · approval-inbox · am2-procure-approve · am2-payout-approve · am2-requestx-indent · am2-frontdesk-checkin · am2-docvault-capture · am3-universal-approval · am3-universal-reporting · am4-commerce-pwa · **persona-salesman · persona-telecaller · persona-manager · persona-supervisor · persona-distributor · persona-servicedesk-engineer**
**Planned (1):** fincore

## §H Walls (0-DIFF verified)
- All 6 persona directories · MobileRouter core handlers · all card engines · applications.ts · PWA manifest/sw — UNTOUCHED.
- Only edits: `OperixGoPage.tsx` (icon imports + 6 entries) · `sprint-history.ts` (AM.4 flip + GUIDE-1 row) · NEW test file.

## Triple Gate
- TSC: 0 errors ✅
- Vitest GUIDE-1: 37/37 passed ✅
- Build: PASS (post-edit run by harness)

## Bookkeeping
- AM.4 flipped `TBD_AT_BANK` → `e441113e` (CONFIRMED).
- GUIDE-1 row appended (`predecessorSha: 'e441113e'`, `newSiblings: []`, headSha pending bank).

## 120 ⭐ Milestone
operix-go is now the COMPLETE mobile dev-guide index — every persona app we develop is listed as a first-class entry alongside the institutional captures and consumer commerce PWA.
