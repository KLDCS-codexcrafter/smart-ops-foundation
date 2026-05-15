# /erp/dashboard — Scoped 360° + ERP Logic Audit

| Field | Value |
|---|---|
| **Audit timestamp** | 15 May 2026, 14:57 IST |
| **Auditor role** | External Enterprise Software Auditor + ERP Logic Auditor (read-only) |
| **Scope** | **Single route only: `/erp/dashboard`** and its direct dependency closure |
| **Mode** | Diagnosis only — **no code modified, no fixes applied** |
| **Frameworks** | Doc 1: 360° Production Audit (12 dimensions, 8-section format) · Doc 2: ERP Logic Audit (20 dimensions, 12-field per finding) |
| **Predecessor HEAD** | Latest on `main` at audit time |

---

## 0. Files Inspected (provable scope boundary)

**In scope (dependency closure of `/erp/dashboard`):**

1. `src/App.tsx` — route registration only (line 71, 602–603)
2. `src/pages/erp/Dashboard.tsx` — the route component (390 lines)
3. `src/components/operix-core/applications.ts` — card registry (417 lines)
4. `src/components/operix-core/CardTile.tsx` — frequent-lane tile (101 lines)
5. `src/components/layout/SuspendedSessionBanner.tsx` (53 lines)
6. `src/components/layout/CommandPalette.tsx` (147 lines)
7. `src/components/layout/CrossCardSearch.tsx` (109 lines)
8. `src/hooks/useKeyboardShortcuts.ts` (49 lines)
9. `src/hooks/useCardEntitlement.ts` (198 lines)
10. `src/lib/card-frequency-tracker.ts` (27 lines)
11. `src/lib/card-pulse-engine.ts` (173 lines)
12. `src/lib/breadcrumb-memory.ts` (91 lines)

**Inspected by reference only (signatures used, internals NOT audited):** `ThemeToggle`, `UserProfileDropdown`, `card-entitlement-engine`, `card-audit-engine`, `command-palette-registry`, `cross-card-search-engine`, `cross-card-activity-engine`, `session-suspend`, `keyboard-shortcut-registry`.

**Explicitly OUT of scope (not audited):** every downstream card target route (`/erp/fincore`, `/erp/salesx`, `/erp/payout`, etc.), all panels other than ERP, all of the ERP logic outside the dashboard shell (vouchers, masters, GST, TDS, inventory, manufacturing, payroll, multi-company posting). These are flagged **N/A — out of scope** in Section B wherever the framework asks for them.

---

# SECTION A — 360° Production Audit (per Doc 1)

## 1. Executive Summary

| Score | Value | Basis |
|---|---|---|
| **Overall system health** (this route) | **6.5 / 10** | Solid UI structure; correct lazy loading; good keyboard ergonomics. Held back by client-side-only entitlement, localStorage as auth/data store, and silent failure modes. |
| **Production readiness** (this route) | **5 / 10** | Will render in prod, but every "permission" and "frequency" decision is browser-trustable, not server-trustable. Not enterprise-safe yet. |

**Key risks summary**

- Entitlement, "allowed cards", and audit log are **read from `localStorage` and seeded on first run from the client**. A user with devtools can mint themselves any role.
- Auth identity (`getUserName`, `getCurrentUserId`) is read from a single `localStorage` key `4ds_login_credential`. No JWT verification, no expiry, no signature.
- The dashboard performs **synchronous `localStorage.getItem` reads on every render of every visible tile** via `card-pulse-engine` + `JSON.parse` of potentially large lists. At enterprise scale this becomes a main-thread hog and a quota-overflow risk.
- "Frequently used" lane reads the entire audit log and filters by date in JS on every render of the dashboard.
- No error boundary inside this page; any throw inside a tile, the banner, or the palette black-holes the dashboard.
- Several tiles use `text-emerald-500`, `text-amber-600`, `text-sky-500` etc. — **direct Tailwind named colors**, in violation of the project's own locked memory rule "Never use Tailwind named colors".
- One emoji in `getGreeting()` ("🌅 ☀️ 🌆 🌙") — **violates locked memory rule "no emojis as interface icons"**.

## 2. Critical Findings (must fix before production)

### C-1 · Client-trusted entitlement and identity
- **Issue:** `useCardEntitlement` reads `cardEntitlementsKey(entityCode)` from `localStorage`, and if empty calls `seedDemoEntitlements()` and writes it back. The dashboard then uses `allowedCards` to scope `CommandPalette`, `CrossCardSearch`, and the Frequently Used lane. Identity comes from `localStorage.4ds_login_credential.value`.
- **Impact:** Any user can edit `localStorage` to grant themselves every card, change `userId`, or impersonate another tenant by changing `active_entity_code`. This is privilege escalation by design.
- **Affected area:** `src/hooks/useCardEntitlement.ts` lines 19–34, 36–198; consumed by Dashboard, CardTile, CommandPalette, CrossCardSearch, SuspendedSessionBanner.
- **Risk:** Critical.
- **Recommendation:** Treat client entitlement as a render hint only. Source of truth must be a server-validated JWT claim list, re-validated on every protected route and every server call. Remove `seedDemo*` from production bundles.

### C-2 · No error boundary around the dashboard
- **Issue:** `Dashboard.tsx` has no `<ErrorBoundary>`. A single throw in any tile (`computeCardPulse`), in the suspended banner, or in `readActivity` will unmount the whole `/erp/dashboard` and show a blank screen.
- **Impact:** A corrupt JSON value in any of ~30+ localStorage keys breaks the user's only ERP landing page.
- **Risk:** Critical (single point of failure).
- **Recommendation:** Wrap the page body, and at minimum each lane and the two overlays, in error boundaries with a safe fallback ("module pulse unavailable") so one bad key cannot brick the dashboard.

### C-3 · Synchronous heavy reads on render path
- **Issue:** `CardTile` calls `computeCardPulse(card.id, entityCode)` inside `useMemo`, which reads up to 5 distinct `localStorage` keys *per tile* and JSON-parses each. With 30+ tiles rendered on a fresh dashboard this can mean 50–100 sync `localStorage` reads + parses on every entity change.
- **Impact:** First paint stall on accounts with realistic data sizes; localStorage 5–10 MB quota saturation will throw and (per C-2) crash the page.
- **Risk:** Critical at scale.
- **Recommendation:** Move pulse computation behind React Query with a cache + Web Worker / IndexedDB; gate per-tile pulse to only the visible/entitled cards; debounce on entity switch.

## 3. High / Medium / Low Findings

### High

- **H-1 · Audit log is client-written, append-only, capped at 500 entries.** `cardAuditKey` is per-entity localStorage. "Frequently used" derives from this. A user can clear it, edit it, or fabricate it. **Why it matters:** the dashboard's personalisation surface is therefore non-evidentiary — fails ISO 27001 A.12.4 logging and SOC 2 CC7.
- **H-2 · "Migration" code runs on every render.** `useCardEntitlement` rewrites the entitlements blob whenever it sees stale `qulicheak`/`gateflow`/`production`/`procure360`/`qualicheck`/`engineeringx`/`sitex`/`maintainpro`/`servicedesk` statuses. Each session repeats the work. **Impact:** unnecessary localStorage writes, race risk if multiple tabs open, and the migration list now has 9 hardcoded special cases — high bug-magnet.
- **H-3 · `LANES` ids contain string literals not type-checked against `CardId`.** Adding/removing a card is a manual two-place edit (registry + LANES). **Impact:** silent dropouts in production if a lane id is misspelled; only caught visually.
- **H-4 · Keyboard shortcut handler attaches to `window` and ignores the React tree.** `useKeyboardShortcuts` rebinds every time the `handlers` object changes (it's a fresh literal each render). **Impact:** measurable add/remove churn on every render of the dashboard; potential for two listeners firing in dev / strict-mode.
- **H-5 · `topCardsForUser` filters by date in JS each render.** `frequentApps` is memoised on `entityCode/userId/allowedCards` only — but `card-frequency-tracker` reads localStorage inside, so memoisation does NOT prevent stale data. **Impact:** visual inconsistency between the Frequently Used lane and reality after the user opens a card and returns.
- **H-6 · `voucher_type === 'sales_invoice'` filter in `card-pulse-engine` does not match the project's own `base_voucher_type` convention** used elsewhere (e.g., `PayOutDashboard` uses `base_voucher_type === 'Payment'`). **Impact:** ReceivX pulse "Open invoices" likely always 0.

### Medium

- **M-1 · Hardcoded Tailwind named colors throughout LANES** (`border-l-sky-500`, `text-cyan-600`, `bg-emerald-500`, etc.) — violates project memory `mem://constraints/prohibited-practices` and `mem://standards/tailwind-dynamic-classes`. Should be semantic tokens.
- **M-2 · Emoji used as UI element** (`🌅 ☀️ 🌆 🌙`) in `getGreeting` — violates the same memory.
- **M-3 · `void revKey;` in `SuspendedSessionBanner`** — using state purely as a re-render trigger after dismiss is an anti-pattern; the second session never surfaces because component reads `sessions[0]` on every render but only forces re-render after dismiss; first session won't actually disappear unless `readSuspended` re-reads after `resolveSuspended` writes.
- **M-4 · No telemetry of dashboard load time, no LCP/INP marks, no Sentry/observability hook.** ISO 25010 reliability/observability gap.
- **M-5 · `PREFETCH_MAP` covers only 4 of ~30 cards.** Hover prefetch benefit is uneven and undocumented; some Tier-1 cards (e.g., `inventory-hub`, `procure360`) get no prefetch.
- **M-6 · `applications.ts` is 417 lines of registry + JSDoc**; a registry file mixing data, naming policy, and architectural anchors is hard to lint and review. Should be split into `applications.data.ts` and `applications.docs.md`.
- **M-7 · `CardTile` opacity-based "locked" state still navigates if `allowed=true` but does not announce unentitled state to screen readers** (no `aria-disabled`, no `role` annotation).

### Low

- **L-1 · `console.log` calls absent (good)** but no structured logger either; future debug effort will reach for `console.log`.
- **L-2 · The dashboard `<header>` has no skip-to-content link** — minor a11y gap.
- **L-3 · `<button>` cards have no `aria-label` distinct from inner text** — fine today, but if icons-only variant ships, accessibility breaks.
- **L-4 · `getUserName` returns "there" on failure** — friendly but masks broken auth state.
- **L-5 · Background orbs use fixed `animate-pulse` and three layered gradients on every render** — minor GPU cost on low-end devices.
- **L-6 · Frequently Used lane animation delay `${i * 0.04}s` is computed in inline style** — hydrate-time recompute; trivial.

## 4. System Strengths (preserve)

- Lazy import of every downstream card route — correct code-splitting model.
- Hover-prefetch pattern via `PREFETCH_MAP` is a strong UX choice (extend it).
- Clean separation: `applications.ts` (registry) → `LANES` (presentation) → `AppCard` / `CardTile` (render).
- `useCardEntitlement` returns a tightly-typed surface (`allowedCards`, `getStatus`, `canAccess`).
- Self-healing seed-parity migration concept (lines 108–126 of `useCardEntitlement.ts`) is the right *idea* for additive card rollouts — keep, but move server-side.
- Keyboard-first design (Ctrl+K, Ctrl+Shift+F, `?`) is enterprise-grade ergonomic.
- Strict TypeScript discipline visible (`AppDefinition`, `CardId`, `AppStatus` enums).

## 5. Risk Heatmap (this route only)

| Dimension | Heat | Notes |
|---|---|---|
| Architecture | Medium | Clean separation, but client-trusted state model. |
| Security | **Critical** | Entitlement + identity + audit are all client-side. |
| Performance | High | Synchronous localStorage reads on render scale poorly. |
| Data | High | Migration mutates storage on every load; pulse uses wrong field name (H-6). |
| UX | Low–Medium | Strong base; emoji + raw colors hurt brand discipline. |
| Compliance | High | No tamper-proof audit; ISO 27001 A.12.4, SOC 2 CC7 gaps. |

## 6. Future Risk Predictions

- **At scale (>1000 vouchers per entity):** dashboard first paint will degrade as `card-pulse-engine` JSON-parses larger blobs synchronously. Expect >300 ms main-thread blocks.
- **Multi-tab use:** two open tabs both run the migration block on mount; last-writer-wins on `cardEntitlementsKey`. A user opening dashboard + a card in two tabs can flap entitlements.
- **localStorage quota:** each card bucket grows independently; one noisy card (e.g., audit log w/ 500-entry cap × N entities) will hit Chromium's 5 MB per-origin quota and throw — caught silently and dashboard renders with empty state, masking real data.
- **Migration list growth:** every new card adds an `if (ent.card_id === '<new>'...)` line. Within 12 months this block will be unmaintainable.
- **Auth lifecycle:** `4ds_login_credential` has no expiry; a stolen browser session stays valid forever.
- **i18n roll-out:** hardcoded English strings ("Resume where you left off", "Frequently used", "No modules match your search") block Hindi rollout from `mem://localization/hindi-framework`.

## 7. Production Readiness Verdict

**⚠️ Conditionally Ready.**

Reasoning: the page renders, the UX is good, code-splitting is correct, and the surface API is clean. However, the entire trust model on this route is client-side, and there is no error boundary protecting the user's only landing page. Both gates must close before this route can be called production-grade for an enterprise tenant. As a **demo / prototype** dashboard it is already strong.

## 8. Strategic Recommendations (Top 1% level)

1. **Move entitlement to a JWT claim** verified on every protected route; keep `useCardEntitlement` as a thin React adaptor that reads from an auth context, not localStorage. Drop seeding from prod build.
2. **Introduce a read-through cache layer** (`useEntityStorage`) backed by IndexedDB for >100 KB blobs; deprecate direct `localStorage.getItem` from any render path.
3. **Wrap dashboard in three error boundaries**: page-level fallback, lane-level "module pulse unavailable", overlay-level for the two palettes.
4. **Replace the migration `if`-ladder with a declarative `MIGRATIONS` array** + an idempotency guard stored as `migration_version`. Run-once, not run-every-render.
5. **Promote `LANES` to use `CardId` typing** and assert at module-init time that every lane id exists in `applications`. Prevents silent drops.
6. **Adopt semantic tokens** for all lane colors (`border-l-lane-management`, `text-lane-operations`) defined in `index.css`; remove every Tailwind named color from this page. Removes a project-memory violation.
7. **Replace the four greeting emojis** with `lucide-react` icons (`Sunrise`, `Sun`, `Sunset`, `Moon`).
8. **Add observability**: a single `usePagePerf('erp-dashboard')` hook emitting LCP, INP, mount→first-tile-render to your telemetry sink.
9. **Pre-fetch the top-N entitled routes**, not a hardcoded 4.
10. **i18n every literal string** through `useT()` so Hindi can ship without touching this file again.

---

# SECTION B — ERP Logic Audit (per Doc 2)

For each finding the 12-field schema from Doc 2 is followed.

> **Scope reminder:** Most ERP logic dimensions (vouchers, GST/TDS, inventory, manufacturing, payroll, multi-company posting, approvals, integrations) are **N/A — out of scope for `/erp/dashboard`**, which is a routing/landing surface, not a transactional surface. Findings below are restricted to logic that *this route actually executes*.

## B-1 · Module: Dashboard Routing & Card Visibility

| Field | Value |
|---|---|
| Risk Level | **Critical** |
| Problem Description | Card visibility and "allowed" gating depend on `localStorage`-resident entitlements seeded from the browser. |
| Business Impact | Any operator can self-grant every card, bypassing license/role boundaries. |
| Technical Root Cause | `useCardEntitlement` writes seed if missing; no server check; `CommandPalette`/`CrossCardSearch` filter purely on `allowedSet`. |
| Fraud / Failure Scenario | Junior storekeeper edits `localStorage`, opens FinCore + PayOut, posts vendor payments. |
| Recommended Fix | Server-issued, signature-validated entitlement list per session; client cache only. |
| Enterprise Best Practice | OAuth/OIDC scopes + RBAC enforced at API layer; UI hides what server already protects. |
| Automation Opportunity | Auto-revoke entitlement when role JWT claim changes mid-session via WebSocket. |
| Scalability Concern | None — fix is structural, not load-driven. |
| Security Concern | Direct privilege escalation. |
| Suggested Architecture Improvement | `EntitlementProvider` reading JWT, no localStorage seeding in production builds. |

## B-2 · Module: Audit Trail (Card-Audit & Activity)

| Field | Value |
|---|---|
| Risk Level | **High** |
| Problem | Audit log is a 500-entry capped, append-only **client** file. |
| Business Impact | Audit non-evidentiary; cannot be relied on for ISO 27001/SOC 2/MCA Rule 3(1) requirements. |
| Technical Root Cause | `card-audit-engine` and `cross-card-activity-engine` write to `cardAuditKey(entity)` + `crossCardActivityKey`. Soft cap = 500. |
| Fraud Scenario | User performs unauthorised access, then clears localStorage; log gone. |
| Recommended Fix | Mirror every write to a server endpoint with append-only storage and tamper-evident hash chain. |
| Enterprise Best Practice | WORM storage, hash-linked entries (already done elsewhere via `mem://standards/voucher-integrity-hashing` — replicate FNV-1a 64-bit chain for audit log). |
| Automation Opportunity | Cron a daily integrity check; alert on chain break. |
| Scalability Concern | Cap of 500 means heavy users lose history within hours. |
| Security Concern | Failure to detect insider misuse. |
| Architecture Improvement | Edge-function-backed `audit_events` table; client emits, server stores. |

## B-3 · Module: Pulse Engine Logic Correctness

| Field | Value |
|---|---|
| Risk Level | **High** |
| Problem | `case 'receivx'` filters `voucher_type === 'sales_invoice'`, but the codebase elsewhere (e.g. `PayOutDashboard`) uses `base_voucher_type === 'Payment'`. Field name mismatch. |
| Business Impact | "Open invoices" KPI on the dashboard is almost certainly always 0 → operators ignore the tile. |
| Technical Root Cause | Two parallel naming conventions for voucher type (`voucher_type` vs `base_voucher_type`). Pulse engine adopts the wrong one. |
| Fraud Scenario | A real overdue-AR situation is invisible because the tile says 0 → cash flow blind spot. |
| Recommended Fix | Audit `Voucher` type definition and align all reads to `base_voucher_type`; add a unit test that posts a sales invoice fixture and asserts pulse increments. |
| Best Practice | Single canonical accessor (`getVoucherKind(v)`) so neither key name leaks into call sites. |
| Automation Opportunity | Add a Vitest snapshot per pulse case using fixed fixtures. |
| Scalability Concern | None directly. |
| Security Concern | None. |
| Architecture Improvement | Type-safe selector library per card, replacing inline string literals in switch arms. |

## B-4 · Module: Multi-Tenant Entity Switching

| Field | Value |
|---|---|
| Risk Level | **High** |
| Problem | `getActiveEntityCode()` reads `localStorage.active_entity_code` raw; no validation that the user is actually entitled to that entity. |
| Business Impact | A user with two entities in scope can be tricked (or self-trick) into viewing another entity's masters by editing one localStorage key. |
| Root Cause | No server-side `entityCode ∈ user.entities` check on this surface. |
| Fraud Scenario | Cross-tenant data peek by changing one string. |
| Fix | Server endpoint `GET /api/me/active-entity` returns the canonical entity, signed; client cache only. |
| Best Practice | Tenant binding in JWT, never derived from client input. |
| Automation | Audit-log every entity switch (already typed as `entity.switched` in `card-audit.ts` — wire it). |
| Scalability | OK. |
| Security | Tenant-isolation breach. |
| Architecture | `TenantContext` provider derived from JWT claim. |

## B-5 · Module: Concurrency & Multi-Tab

| Field | Value |
|---|---|
| Risk Level | **Medium** |
| Problem | Two dashboard tabs open → both run the entitlement migration → race on `setItem(cardEntitlementsKey, ...)` |
| Business Impact | Inconsistent entitlement display across tabs; "card disappeared" support tickets. |
| Root Cause | No `storage` event listener; no version-stamping on writes. |
| Failure Scenario | User opens dashboard in two tabs after a release that adds a new card; one tab overwrites the other's migrated state mid-flight. |
| Fix | Use the BroadcastChannel API or `storage` events to invalidate React Query cache; stamp writes with a monotonic `version`. |
| Best Practice | Optimistic-concurrency token on every persisted blob. |
| Automation | None applicable. |
| Scalability | Worse with more tabs / more users in shared kiosks. |
| Security | None directly. |
| Architecture | Adopt a single state-sync layer (Zustand + persist + cross-tab middleware, or React Query with broadcast). |

## B-6 · Module: Performance / Render Path

| Field | Value |
|---|---|
| Risk Level | **High** |
| Problem | ~30 tiles, each calling `computeCardPulse` synchronously on render; localStorage reads + JSON parses serialised on the main thread. |
| Business Impact | Slow first paint at scale; INP degradation on entity switch. |
| Root Cause | No batching; no Web Worker; no IndexedDB. |
| Failure Scenario | Tenant with 10k vouchers experiences 1–2 s blank dashboard. |
| Fix | Batch into one function `computeAllPulses(allowedCards)` reading once, fanning out; move to IndexedDB; cache via React Query with 30 s stale time. |
| Best Practice | Render-time = pure render only; data work in a worker or hook with cache. |
| Automation | Add a perf budget in CI (Lighthouse CI ≥ 95 perf for this route). |
| Scalability | This is the scalability ceiling for this page. |
| Security | None. |
| Architecture | Workerised data layer; the dashboard never reads localStorage directly. |

## B-7 · Module: Workflow / "Resume where you left off"

| Field | Value |
|---|---|
| Risk Level | **Medium** |
| Problem | `SuspendedSessionBanner` only ever shows `sessions[0]`; second suspended item never surfaces; the `revKey` re-render trick only triggers a re-read because `readSuspended` is called inside the function body — but state is `revKey`, not the session list, so React's reconciliation may not actually re-run `readSuspended` after dismiss in the same paint. |
| Business Impact | Workflow continuity feature is effectively single-item and has a subtle dismissal bug. |
| Root Cause | State holds a counter, not the list; component re-reads localStorage inside render, which is also a perf code-smell. |
| Failure Scenario | User has 3 suspended approvals; sees only one; dismisses; banner sometimes shows none, sometimes flickers. |
| Fix | Keep the list in state; mutate via a setter; show all sessions or a "1 of N" stepper. |
| Best Practice | Source of truth in React state (or React Query); never re-read localStorage during render. |
| Automation | Tests for "N suspended sessions → N-1 after dismiss". |
| Scalability | Low. |
| Security | None. |
| Architecture | Suspended-sessions hook with subscription, not pull. |

## B-8 · Module: Compliance / Audit Trail Readiness

| Field | Value |
|---|---|
| Risk Level | **High** |
| Problem | This route reads/writes audit, entitlement, activity, frequency, and breadcrumb data with **no server round-trip**. The entire personalisation + access surface is therefore non-compliant with MCA Rule 3(1) audit-trail expectations enforced elsewhere in the codebase. |
| Business Impact | The platform's own discipline (per `mem://logic/mca-audit-trail`) is broken at the dashboard surface. |
| Root Cause | localStorage-as-database design choice. |
| Failure Scenario | Statutory audit asks "who opened FinCore on 12 May at 14:30?"; logs are local, possibly already cycled past 500-entry cap. |
| Fix | Mirror to server; provide an admin export. |
| Best Practice | All audit-relevant events go to immutable backend storage with hash chain. |
| Automation | Hash-chain integrity check job. |
| Scalability | Server side scales; client side already at risk. |
| Security | Critical for forensics. |
| Architecture | Edge function `POST /audit/event` with schema validation and signed timestamps. |

## B-9 · Modules N/A for this route

The following Doc 2 dimensions cannot be honestly audited from `/erp/dashboard` alone and are explicitly **N/A — out of scope**:

| Dimension | Status |
|---|---|
| Customer / Supplier / Item / BOM / Employee / CoA / Tax / Warehouse master logic | N/A |
| Sales / Purchase / Payment / Receipt / Journal / Stock-journal / DN-CN voucher logic | N/A |
| Stock movement, batch, serial, expiry, valuation, FIFO/LIFO | N/A |
| Double-entry, GST/TDS/TCS, reconciliation, depreciation, rounding | N/A |
| Manufacturing: BOM, MRP, job work, WIP, costing | N/A |
| Approval hierarchy / escalation / delegation | N/A |
| API integrations: Tally, payment gateway, logistics, ecommerce, webhooks | N/A |
| Scheduled jobs / email / SMS / recurring invoices / reminders | N/A |
| MIS reports, profitability, aging, branch consolidation | N/A |
| Multi-branch / multi-company posting logic | N/A |
| DR, HA, backup restoration, microservice boundaries | N/A |

These should each get their own scoped audit (one per route or module) before any Top-50 enterprise list can be honestly produced.

## ERP Maturity Score (this route only): **42 / 100**

Breakdown:

| Pillar (10 each) | Score | Note |
|---|---|---|
| Master/Registry design | 7 | `applications.ts` is well-typed, well-documented. |
| Workflow logic | 5 | Suspended-session feature partially broken (B-7). |
| Validation / data correctness | 3 | Pulse uses wrong field (B-3). |
| Security / RBAC | 1 | Client-trusted (B-1, B-4). |
| Audit trail | 2 | Client-only, capped (B-2, B-8). |
| Performance | 4 | Sync localStorage reads on render (B-6). |
| Multi-tenant safety | 3 | Entity switch unverified (B-4, B-5). |
| Observability | 1 | Nothing emitted. |
| Compliance | 2 | ISO 27001 / MCA Rule 3(1) gaps. |
| Code quality / maintainability | 14/20 | Strong typing, lazy loading, clear separation; offset by emoji and Tailwind-named-color memory violations and the 9-case migration ladder. |

---

## Top 5 Critical Risks (this route only)

1. Client-trusted entitlement and identity (B-1, C-1).
2. No error boundary on the only ERP landing page (C-2).
3. Synchronous localStorage reads on render at 30+ tiles (B-6, C-3).
4. Audit + activity logs client-only and capped (B-2, B-8).
5. Pulse "Open invoices" wrong-field bug (B-3) — silently shows 0.

## Top 5 Quick Wins (this route only)

1. Wrap the page in `<ErrorBoundary>`.
2. Replace 4 greeting emojis with `lucide-react` icons.
3. Replace `voucher_type === 'sales_invoice'` with `base_voucher_type === 'sales_invoice'` in `card-pulse-engine`.
4. Move the 9-case migration ladder behind a `migration_version` guard so it runs once, not per render.
5. Add a `aria-disabled` + `role` on locked `CardTile`s.

---

## STOP-and-Raise

- This audit covers **only `/erp/dashboard`** — the platform-wide health cannot be inferred. A "boardroom verdict" at portfolio level requires running this same template against every other route.
- Findings about server enforcement (B-1, B-4) are stated based on the absence of any server call in the audited closure. If a server middleware exists upstream of these routes that I did not audit, severity may drop.
- I did **not** run the build, tests, Lighthouse, or any browser tooling. Findings are static-analysis only, as instructed ("only do for /erp/dashboard", read-only).

---

*End of report — generated 15 May 2026, 14:57 IST. Saved to `docs/audits/erp-dashboard-audit-2026-05-15_1457-IST.md`.*
