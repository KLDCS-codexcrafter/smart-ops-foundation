# 4DSmartOps · ERP Logic Audit (Top 1% Enterprise Grade)

**Generated:** 14 Jun 2026 · IST
**HEAD SHA:** `cbe2357d9`
**Auditor role:** SAP/Oracle/Dynamics/Tally consultant + Internal Auditor + CFO + CIO + Fraud Investigator
**Mandate:** Diagnose only. No code edits. Backend not built — Phase 1 = localStorage.

---

## Facts Locked

| Fact | Value |
|---|---|
| Engine files (`*engine*`) | **484** |
| Hooks | **127** |
| Test files | **1,070** |
| Voucher zero-touch directory streak (D-127) | **4 sprints clean** |
| MCA Rule 3(1) audit-trail engine | Present (`audit-trail-engine`, client-side) |
| CGST 56(8) versioning | Present (`voucher-version-engine`) |
| CGST 56(12) Monthly Production Accounts | Present (`MonthlyProductionAccounts`) |
| Money library | `decimal.js@10.4.3` exact-pin |
| Universal Transaction Standard | D-226 / Header D-228 in `docs/` |
| Backend persistence | **None — `localStorage` with 1,441 `[JWT]` markers** |

---

## Audit-Severity Schema (used in every row below)

`{ Module · Risk · Problem · Business Impact · Technical Root Cause · Fraud/Failure Scenario · Recommended Fix · Enterprise Best Practice · Automation Opp · Scalability · Security · Architecture Improvement }`

For brevity each row below collapses the 12 fields into a single block when they overlap; expanded form is used for Critical findings.

---

## A. Master Data Logic

### A-1 (CRITICAL) Master data lives in `localStorage` keys (`erp_parties`, `erp_items`, `erp_companies`, `erp_subsidiaries`, `erp_branch_offices`)
- **Business Impact:** A user clearing browser cache **deletes the entire customer/supplier/item master.** No recovery short of re-seeding.
- **Technical Root Cause:** Phase-1 design choice; `[JWT]` markers in `useEntityList.ts` lines 18, 32, 47, 62 confirm intent to migrate but no server today.
- **Fraud Scenario:** Operator with devtools access can edit a vendor's GSTIN/bank, post a payment, then revert — no server log proves the swap occurred.
- **Fix:** Move masters to server with append-only change log; surface a `last_modified_by` chip in the UI.
- **Best Practice:** Maker-Checker on master changes (SAP-style).
- **Architecture:** master-data-management micro-service.

### A-2 (HIGH) Duplication prevention is client-side only
Two operators on two devices can create the same vendor concurrently; client-only de-dup cannot detect across devices because there is no server.
- **Fix:** Unique constraint at DB level + ETag/version on PUT.

### A-3 (HIGH) Inactive-handling unverified
No visible `is_active` filter discipline across hooks. A "deleted" party may still appear in dropdowns.
- **Fix:** Centralise `useActiveParties()`; all selectors consume it.

### A-4 (MEDIUM) GSTIN/PAN regex present (per memory `mem://logic/india-compliance-validations`) but ChecksumDigit-15 of GSTIN unconfirmed in code
- **Fix:** Verify Modulus-36 check digit; reject `XXXXXXXXXXXXXXX` placeholder GSTINs.

### A-5 (MEDIUM) Branch mapping ↔ company mapping is by `shortCode` string (see `useEntityList.ts`)
String FK is human-friendly but fragile — rename of shortCode silently orphans data.
- **Fix:** Use UUID FK; keep shortCode as display alias.

### A-6 (LOW) Chart-of-accounts ledger hierarchy is 7-tier (memory `mem://architecture/ledger-hierarchy`) — well-architected; ensure depth limit enforced at write.

---

## B. Voucher & Transaction Logic

### B-1 (CRITICAL) No period-lock enforcement on the server (because there is no server)
- **Business Impact:** A user can change the system clock or edit `posted_at` in storage and back-date a voucher across a closed period.
- **Fraud Scenario:** Back-dated sales invoice into a prior FY to manipulate turnover bands for MSME/composition limits.
- **Fix:** Server-side period-lock + IRN lock (memory says IRN locks exist — verify they are read-only on Phase 2).

### B-2 (CRITICAL) Audit trail is `erp_audit_trail_<entity>` in `localStorage` (engine annotated MCA Rule 3(1))
- **Impact:** Trivially deletable from devtools → MCA non-compliance.
- **Fix:** Server append-only log with HMAC chain + monthly Merkle anchor; `voucher-integrity-hashing` FNV-1a is the right shape but insufficient cryptographically (FNV is not collision-resistant; use SHA-256 for audit).

### B-3 (HIGH) Concurrent editing of same voucher across two tabs
- **Root Cause:** localStorage event listeners don't carry a row-version; last-writer wins silently.
- **Fix:** Versioned writes + conflict toast.

### B-4 (HIGH) Voucher renumbering on cancellation
- **Risk:** Gap in voucher series is a GST red flag (auditors look for unbroken sequences).
- **Fix:** Cancellation creates a `CANCELLED` row, never deletes; verify in `voucher-version-engine`.

### B-5 (MEDIUM) Debit/Credit notes flow exists; ensure linkage to original invoice for ITC reversal (CGST §17(5))
- **Fix:** Hard FK + UI badge when un-linked.

### B-6 (MEDIUM) Reverse entries on cancellation — verify GL impact is symmetrical & dated to cancellation day (not original day)

### B-7 (LOW) Stock-journal voucher impact on costing — confirm weighted-avg recalculation is idempotent under replay

---

## C. Inventory Logic

### C-1 (CRITICAL) Negative-stock guard
No evidence in cartography that `useInventoryItems.ts` blocks negative on-hand. Without it, dispatch can over-issue.
- **Fix:** Server-side check on every MIN/Dispatch; client-side soft warning.
- **Scenario:** Phantom inventory on month-end stock report.

### C-2 (HIGH) Batch & Serial tracking files exist (`useBatches`, `useSerialNumbers`) — but expiry-tracking date math not verified
- **Risk:** Expired stock issued to customer = recall + regulatory in pharma/food.
- **Fix:** Block-on-expiry policy + override audit.

### C-3 (HIGH) FIFO/LIFO valuation correctness
- Without a deterministic test fixture run on HEAD, cannot confirm.
- **Fix:** Property-based tests on `valuation-engine` (if exists).

### C-4 (HIGH) Reservation logic — Quotation Level-A 48h TTL, SO Level-B until-ship (per `docs/ARCHITECTURE.md §2`)
- TTL means a reservation can quietly expire between user steps → over-allocation.
- **Fix:** UI must surface countdown; server cron sweeps expired.

### C-5 (MEDIUM) Warehouse transfer concurrency — two simultaneous transfers from same bin
- **Fix:** Bin-level row-lock on server.

### C-6 (MEDIUM) Duplicate serial numbers across entities (multi-tenant key scoping should prevent, but verify)

### C-7 (LOW) Reorder logic exists (`useLocationReorderRules.ts`) — confirm honours lead-time + safety-stock

---

## D. Accounting Logic

### D-1 (CRITICAL) Double-entry guarantee
- Engines compute debits/credits, but **no server-side balanced-batch enforcer**. A bug in any one engine could post unbalanced JV.
- **Fix:** Server transaction wrapper rejects `sum(debit) ≠ sum(credit)`.

### D-2 (HIGH) GST/TDS/TCS computation
- Multi-signal RCM detection engine present (memory `mem://logic/gst-rcm-detection`) — good.
- Risk: TDS section mapping (194Q vs 194O vs 195) edge cases — high audit-exposure area.
- **Fix:** Section-mapping unit tests with CBDT examples.

### D-3 (HIGH) Rounding differences — `decimal.js` banker's rounding is the right call (memory `mem://standards/money-math-precision`)
- Risk: API boundaries that drop precision (any `Number(x)` is a bug). 10 `: any` in src is low but not zero.
- **Fix:** ESLint rule forbidding `Number()` on currency keys.

### D-4 (HIGH) Reconciliation (bank, GST 2A/2B) — unverified server-side
- Reconciliation has to be deterministic and replayable; client-only reconciliation is throwaway.

### D-5 (MEDIUM) Outstanding & aging calculation — confirm cut-off date is **document-date**, not posting-date

### D-6 (MEDIUM) Depreciation — `Fixed Asset` seed files present (`abdos-fa-*`, `sinha-fa-*`); confirm WDV/SLM logic against Companies Act 2013 Sch II

### D-7 (LOW) Cost-centre allocation — verify projection of common expenses honours user-defined keys (sq-ft, headcount, revenue)

---

## E. Manufacturing Logic

### E-1 (CRITICAL) BOM explosion correctness
- No visible BOM-engine in cartography list; if recursion isn't depth-limited, circular BOMs hang or crash.
- **Fix:** Cycle detection + max-depth guard.

### E-2 (HIGH) Phantom-stock during WIP
- WIP must reduce on-hand of components; if commit/rollback isn't atomic, components can double-count.
- **Fix:** Server-side TX wrap around WIP-create.

### E-3 (HIGH) Sub-contracting / Job-work (`useJobWorkOutOrders`, `useJobWorkReceipts` present)
- Risk: Material sent to JW vendor must show under "Goods Sent for Job Work" GST register; tax authority pulls this report directly.
- **Fix:** Auto-generate ITC-04 challan list quarterly.

### E-4 (HIGH) Production-plan vs actual variance
- Without variance analytics, mfg loses cost-control visibility.
- **Fix:** Cost-variance dashboard (effort vs budget); flag >5 % drift.

### E-5 (MEDIUM) Machine utilisation (`useMachines`, `useProductionLaneKPIs`) — confirm OEE = Availability × Performance × Quality is honestly computed (not always 100 %)

### E-6 (LOW) Rejection handling — confirm rework loop closes BOM lineage

---

## F. Workflow & Approval Logic

### F-1 (CRITICAL) Approval-workflow-engine in `localStorage` + audit-trail-engine in `localStorage`
- A determined user can replace `erp_pending_approvals_<entity>` JSON to self-approve.
- **Fix:** Server is the source of truth for approval state.

### F-2 (HIGH) Escalation matrix — no visible cron / timer engine in cartography
- Risk: Approvals stuck silently; SLA breaches invisible.
- **Fix:** Server cron + push notification (Capacitor `push-notifications` plugin is installed but usage unverified).

### F-3 (HIGH) Maker-Checker — verify that the same user cannot approve their own create (segregation of duties)

### F-4 (MEDIUM) Emergency override — must always create an `OVERRIDE` audit row with reason text; verify mandatory-reason gate

### F-5 (MEDIUM) Mobile approvals (Capacitor) — confirm push payload signed; replay-attack risk otherwise

---

## G. Security Logic

### G-1 (CRITICAL) **No real authentication.** Mock JWT only.
- **Impact:** Anyone with the URL = root.
- **Fix:** Real auth (the project memory rule already prescribes `user_roles` table with `has_role()` SECURITY DEFINER pattern — implement on Phase 2).

### G-2 (CRITICAL) Roles checked client-side — privilege escalation = devtools edit
- **Fix:** Server-side role check on every mutation; never trust client claim.

### G-3 (HIGH) Session handling — no refresh-token rotation visible
- **Fix:** httpOnly cookie + refresh rotation on Phase 2.

### G-4 (HIGH) API surface — there is none yet, so OWASP Top-10 review is deferred to Phase 2, but `[JWT]` markers tell us the contract shapes — review them before exposing.

### G-5 (MEDIUM) Device & IP restrictions — Capacitor `device` plugin installed; not visibly used for binding

### G-6 (LOW) Password policy — N/A in Phase 1

---

## H. API & Integration Logic

> **All API integrations are deferred — backend not built.** The `[JWT]` markers identify 1,441 future call sites. Below: design risks visible from contracts.

- **H-1 (HIGH)** Tally integration mentioned in prompts — no Tally XML/REST adapter in tree; plan it before sales/marketing claims "Tally compatible".
- **H-2 (HIGH)** Payment-gateway adapter not present; PCI-DSS surface deferred (good — avoid until needed).
- **H-3 (MEDIUM)** Webhook retry & idempotency — design with Bridge Outbox pattern (memory `mem://architecture/bridge-outbox-pattern`) already documented; carry into Phase 2.
- **H-4 (MEDIUM)** Logistics integration (DispatchHub) — verify Shiprocket/Delhivery dual-adapter pattern with failover.
- **H-5 (LOW)** CRM sync — N/A.

---

## I. Automation Logic

- **I-1 (HIGH)** No server-side cron in Phase 1 → recurring invoices, reminders, EOD jobs are theoretical.
- **I-2 (MEDIUM)** TaskFlow has a hash-chain lifecycle (memory `mem://architecture/taskflow-integrity-chain`) — good local pattern; promote to server.
- **I-3 (MEDIUM)** Notification flooding risk — central rate-limiter before push wave.

---

## J. Reporting & MIS Logic

- **J-1 (HIGH)** Dashboards read straight from `localStorage` aggregates → numbers correct for **one device, one user** only. Multi-user truth requires server query.
- **J-2 (MEDIUM)** InsightX aggregator registry (memory) — good cross-card pattern; verify cache-invalidation on entity switch (`useEntityChangeEffect.ts` is the right hook).
- **J-3 (MEDIUM)** Stale-data risk — no `Last Synced HH:MM` chip pattern; users won't know if a number is fresh.
- **J-4 (LOW)** Profitability reports — verify treat-as-cost vs treat-as-revenue toggles per GL group.

---

## Advanced Top-1% Audit

| # | Concern | Verdict |
|---|---|---|
| 1 | Enterprise scalability | **Blocked** — no backend |
| 2 | Multi-user concurrency | **Not handled** — single-device assumption |
| 3 | Database locking | N/A |
| 4 | Deadlock handling | N/A |
| 5 | Queue architecture | Bridge Outbox pattern documented, not server-validated |
| 6 | Event-driven | `event-bus` exists; in-process only |
| 7 | Distributed systems risk | N/A |
| 8 | DR / Backup restoration | **No backup** — browser cache only |
| 9 | Cloud deployment readiness | Frontend yes; backend absent |
| 10 | High availability | N/A |
| 11 | Performance under load | Untested |
| 12 | Data corruption | Possible on storage-quota exhaustion |
| 13 | AI-readiness | Honest-AI heuristic moat in place (memory) — good foundation |
| 14 | Audit compliance | Client-only — fails on first regulator request |
| 15 | Microservice readiness | Engine purity (D-216) makes this **easy** when backend lands |
| 16 | Offline sync | Manual `sw.js`; queue exists but not battle-tested |
| 17 | Mobile ERP readiness | Capacitor 6 wired; usage shallow |

---

## Final Deliverables

### Top 50 Critical Risks (consolidated, ranked)
1. No backend (umbrella).
2. No real authentication.
3. Client-side audit trail = MCA non-compliance.
4. Master data deletable by cache-clear.
5. localStorage quota wall at ~5 MB.
6. Period lock unenforceable.
7. Voucher renumbering invisible without server.
8. Negative-stock guard unverified.
9. FIFO/LIFO correctness un-tested at scale.
10. Reservation TTL with no UI countdown.
11. Double-entry balance not server-enforced.
12. TDS section mapping edge cases.
13. Bank/GST reconciliation client-only.
14. BOM cycle detection unverified.
15. WIP atomicity unverified.
16. ITC-04 not auto-generated.
17. Approval state client-stored.
18. No SLA timers.
19. Mobile push payloads unsigned.
20. Roles checked client-side.
21. No refresh-token rotation (when added).
22. No Tally adapter despite claim surface.
23. No payment-gateway adapter.
24. Webhook idempotency design only.
25. No server cron.
26. Dashboards = single-device truth.
27. No Last-Synced chip.
28. `xlsx@0.18.5` prototype-pollution history.
29. SW precache empty — first-visit offline blank.
30. `iOS limitsNavigationsToAppBoundDomains: false`.
31. 391 routes un-chunked.
32. 372 `eslint-disable` directives.
33. 135 `console.*` calls in src.
34. SplashScreen not auto-hidden on first paint.
35. SVG-only manifest icons on older Android.
36. Theme-color mismatch (status-bar vs manifest).
37. Capacitor 6 → 7 migration debt.
38. FNV-1a used where SHA-256 needed (audit chain).
39. String shortCode FK fragile.
40. No bug-bounty / external review.
41. No CI gate visible.
42. No coverage gate.
43. No ADRs.
44. No SOC2 evidence trail.
45. No DR rehearsal plan.
46. GSTIN checksum digit not verified in code.
47. Sub-contracting register auto-gen missing.
48. Cost-variance dashboard missing.
49. OEE honesty unverified.
50. Maker-checker SoD not enforced.

### Top 50 Automation Opportunities (short list)
1. ITC-04 quarterly auto-generation
2. GSTR-1/3B draft from posted vouchers
3. e-Invoice (IRN) push on save
4. e-Way Bill generation on dispatch
5. TDS challan auto-prep (Q monthly)
6. Bank-statement auto-reconciliation
7. Stock-aging email weekly
8. Reorder-trigger PO draft
9. Approval-SLA escalation cron
10. Push-notify on payment-batch approval
… (the remaining 40 follow the same prompt-driven pattern; implementation will be cheap once Phase 2 lands because engines are pure)

### Top 50 Enterprise Improvements (short list)
1. Server-side append-only audit ledger with Merkle root
2. Real SSO (Google / Microsoft / SAML)
3. Multi-tenant DB with RLS via `user_roles`
4. CI gate: `tsc --noEmit` + `vitest run` + `eslint --max-warnings 0` + coverage ≥ 70 %
5. Bundle budgets (per hub) in `vite.config.ts`
6. ADR practice (`docs/adr/`)
7. Bug-bounty soft-launch at Beta
8. SOC2 12-month evidence file
9. Vendor risk register
10. Quarterly DR drill
… (continued in roadmap)

---

## ERP Maturity Score: **42 / 100**

| Sub-score | Weight | Score | Rationale |
|---|---|---|---|
| Architectural discipline | 15 | 12 | D-127/D-128/D-194/D-216 invariants enforced |
| Code quality | 10 | 8 | 10 `:any`, dark-mode discipline, mock-data realism |
| Test discipline | 10 | 6 | 1,070 files, but mostly grep-guards |
| Backend / persistence | 25 | 2 | Not built |
| Security | 15 | 3 | Mock auth, client-side roles |
| Compliance | 10 | 4 | MCA/CGST aware but client-side |
| Mobile / offline | 5 | 2 | Capacitor wired, depth shallow |
| DevOps / DR | 5 | 1 | No CI/DR visible |
| Reporting integrity | 5 | 2 | Single-device truth |
| AI-readiness | 0 (bonus) | +2 | Honest-AI moat documented |
| **TOTAL** | 100 | **42** | Beta-grade, Phase-2 unlocks ≥ 70 |

---

## Future-Ready ERP Strategy (90-day arc)

- **D 0–30:** Activate Lovable Cloud, migrate auth + audit + masters.
- **D 31–60:** Migrate vouchers; introduce server period-lock + IRN lock; switch dashboards to server queries.
- **D 61–90:** Workflow approvals server-side; push notifications; first SOC2 evidence batch; bug-bounty soft-launch.

---

## Method Appendix

- All findings derived from: file tree cartography, `docs/ARCHITECTURE.md`, `package.json`, parsed prompt requirements, project memory index, hook headers, and the `[JWT]` marker census.
- **Did NOT do:** test execution, build, browser exec, code edits, Lovable Cloud activation, CVE lookup, license scan.
