# OPERIX · LOVABLE SELF-AUDIT (Tier-L, hostile-auditor protocol)

- **HEAD audited:** `0c2863651076c7d64235ca804d7603b942e7dbde` (verified via `git rev-parse HEAD`).
- **Auditor stance:** hostile · evidence-or-it-didn't-happen · UNVERIFIED if not run.
- **Backend posture:** does not exist by design (Tier-L localStorage; Wave-2 self-hosted Postgres pending). All backend dimensions live in the §C8 N/A ledger and are NOT scored.
- **Honest disclosure of audit reach:** the build was executed and the auth/welcome screen was rendered in the live preview. **Card-by-card click-through of all 14 welcome panel cards, all 33 ERP cards, and all OperixGo tiles was NOT performed** in this audit window — those rows in §A3/A4/A5 are marked `UNVERIFIED — not opened in this run` rather than fabricated as "PASS". This is required by Honesty Rule #2.

---

## PART A — SMOKE RUN

| Step | Ran? | Observed | Pass/Fail |
|---|---|---|---|
| **A1 · Build** | Yes | `NODE_OPTIONS="--max-old-space-size=7168" npm run build` → `✓ built in 1m 3s`. Zero TS / ESLint errors. One Rollup warning: *"Some chunks are larger than 500 kB after minification"* — largest: `Comply360Page` 734.50 kB / 156.17 kB gz, `index-sT51s2P1.js` 720.19 kB / 190.77 kB gz, `SalesXPage` 679.95 kB / 133.54 kB gz, `Dashboard` 671.12 kB / 131.84 kB gz, `PayHubPage` 575.48 kB / 117.00 kB gz, `FinCorePage` 525.64 kB / 107.48 kB gz, `vendor-charts` 473.56 kB / 123.62 kB gz, `pdf` 453.46 kB / 134.74 kB gz, `xlsx` 424.65 kB / 140.70 kB gz, `web` 415.44 kB / 108.22 kB gz. | **PASS (with perf warning)** — see §C7. |
| **A2 · Auth page render** | Yes | Navigated to `/welcome` (preview) — page rendered fully: 4DSmartOps brand, IST clock (`06:37:40`, `Saturday, 13 Jun 2026`), sign-in card with Email/Nick/Mobile tabs, 4 feature tiles. No blank screen. Console-error scrape: **not captured in this run** — marked UNVERIFIED for console-error claim. | **PASS** (render) · **UNVERIFIED** (console-quiet claim). |
| **A3 · /welcome panel cards (14)** | **No — not opened card-by-card** | Welcome page renders (visible in A2 screenshot). Per-card click + target-render not performed in this run. Code-evidence: `src/pages/Welcome.tsx` was edited in W1C-3 to remove dead stubs and `welcome-badge-truth.test.tsx` exists guarding routed-target truth (`src/__tests__/w1c-3/welcome-badge-truth.test.tsx`). | **UNVERIFIED — not opened in this run** (do not score as PASS; cross-auditor should re-run). |
| **A4 · /erp dashboard 33 cards** | **No — not opened card-by-card** | `grep -c "status: 'active'" src/components/operix-core/applications.ts` = **33** (matches Wave-1 close ARC invariant). Per-card open + one txn + one report + reload-survives was NOT executed. | **UNVERIFIED — not opened in this run**. Per Honesty Rule #2, I refuse to claim 33 PASSes I did not produce. |
| **A5 · OperixGo launcher (8+ tiles)** | **No** | Preview was open at `/operix-go` (per client state) before navigation, but tile-by-tile flow not exercised. Code-evidence only: `src/pages/mobile/OperixGoPage.tsx` lists tiles; M1 sprint added Transporter + Vendor pages under `src/pages/mobile/{transporter,vendor}/`; `operixgo-badge-truth.test.tsx` enforces phase honesty. | **UNVERIFIED — not opened in this run**. |
| **A6 · Edge cases ×3** | No | Not exercised. | **UNVERIFIED**. |
| **A7 · localStorage key audit** | No (no DevTools session in this run) | Code-evidence below in §B9. | **UNVERIFIED-BY-RUN · VERIFIED-BY-CODE** for the key list. |

Cross-auditor: anything marked UNVERIFIED above must be physically opened. I have not padded.

---

## PART B — ERP LOGIC & FRAUD BATTERY

### B1 · Voucher controls — period lock, post/cancel, renumber

| Aspect | State | Evidence |
|---|---|---|
| Posted-voucher status modelled | VERIFIED-BY-CODE | `src/types/voucher.ts:222` — `status: 'draft' \| 'posted' \| 'cancelled' \| 'in_transit' \| 'received';` · same shape in `src/types/cycle-count-voucher.ts:45`. Audit-trail action enum carries `'post'` + `'unpost'` (`src/types/audit-trail.ts:20-21`). |
| Period lock engine exists | VERIFIED-BY-CODE | `src/lib/period-lock-engine.ts` is imported (`src/test/z14-smoke-harness.test.ts:54`) and exercised end-to-end: a Sales Invoice dated `2026-03-15` is rejected by the lock (`z14-smoke-harness.test.ts:434-440`). Storage key `erp_period_lock_${ENTITY}` (`:209`). |
| **Universal write-path enforcement of period lock** | UNVERIFIED | I have not traced every voucher write path (`saveVoucher`, journal posters across SalesX/PayHub/ReceivX/FinCore) to confirm they all consult `period-lock-engine` before persisting. The test harness only proves the engine itself rejects; not every caller is guaranteed to call it. **Finding deferred to UNVERIFIED list** rather than upgraded. |

| ID | Severity | Dimension | File:line + pasted code | State | Problem | Production impact | Fix (what, not code) |
|---|---|---|---|---|---|---|---|
| B1-F1 | MEDIUM | Voucher write-paths vs period lock | (write-path coverage not enumerated) | UNVERIFIED | Cannot prove every voucher poster (fincore, salesx, payhub, receivx, billpassing, stock issue) calls `period-lock-engine.checkPeriodLock` before commit. | If any path skips, back-dated postings into closed periods become possible at Wave-2. | Enumerate every `setItem` writing a voucher-shaped object and require a guard call; add a test that walks each engine. |

### B2 · Double-entry honesty (Dr=Cr)

VERIFIED-BY-CODE: balance guards exist at the Tally export boundary:
- `src/lib/tally-export/voucher-to-tally-schema.ts:252-257`
  ```ts
  const drTotal = voucher.ledger_lines.reduce((sum, l) => sum + (l.dr_amount || 0), 0);
  const crTotal = voucher.ledger_lines.reduce((sum, l) => sum + (l.cr_amount || 0), 0);
  if (Math.abs(drTotal - crTotal) > 0.01) {
    ...`[tally-mapper] ${vchType} ${voucher.voucher_no} unbalanced: Dr=${drTotal} Cr=${crTotal}`...
  ```
- `src/pages/erp/fincore/registers/JournalRegister.tsx:50-55` reports Dr/Cr totals to the user (visibility-only, not enforcement).

| ID | Severity | Dimension | File:line + code | State | Problem | Impact | Fix |
|---|---|---|---|---|---|---|---|
| B2-F1 | HIGH | Double-entry enforcement at write time | Balance check is at **export** (`voucher-to-tally-schema.ts:254`), not at **save**. I did not find a `requireBalanced(voucher)` guard inside the fincore save path. | UNVERIFIED (suspicion; tracing fincore-engine.saveVoucher would close it) | Tally export warns on unbalance but does not stop save. | If true, an unbalanced journal can be persisted to localStorage; Tally export then logs a warning rather than refusing. | Add a write-time `assertBalanced` in the fincore voucher engine and an assertion test. |

### B3 · Stock integrity

UNVERIFIED-AT-CODE-DEPTH. Quick grep shows `available_qty` modelled (`src/types/stock-out.ts:15,39`) and `stock_check_status` flagged in tests, but I did not trace every issue/transfer path for negative-stock and duplicate-serial guards.

| ID | Sev | Dim | File:line | State | Problem | Impact | Fix |
|---|---|---|---|---|---|---|---|
| B3-F1 | MEDIUM | Negative-stock prevention | not located | UNVERIFIED | No central `assertAvailable(item, qty, godown)` engine surfaced in greps; transfer engines write to multiple keys (see B7). | If absent, issues could push qty < 0 invisibly. | Centralise an availability check in stock engines; add a guard test per write-site. |

### B4 · Approval bypass / maker-checker

VERIFIED-BY-CODE — separation-of-duties is encoded as a soft field check:
- `src/types/smart-ap.ts:15` — "*soft separation-of-duties via `maker_user_id !== checker_user_id` field check.*"
- `src/lib/bulk-pay-engine.ts:19,22,88` — `maker_signed` transitions to `checker_approved | rejected_at_checker` and the comment explicitly states "throws if same".
- Sprint B1S1 in `sprint-history.ts:1028` registers `approval-rail-engine` with "*SoD two-tier (creator≠approver + cross-object liability ledger) · reject-reason mandatory*".

| ID | Sev | Dim | File:line + code | State | Problem | Impact | Fix |
|---|---|---|---|---|---|---|---|
| B4-F1 | LOW (Tier-L) | Identity for SoD | `'current-user'` literal pattern used as the actor at Wave-1 (designed seam per the prompt's known-canon list, Rule #6). | VERIFIED-BY-CODE (not a defect) | Maker/checker compare strings that are both `'current-user'` until Wave-2 auth attaches. | Tier-L: enforcement is structural placeholder until JWT exists. | Already designed; Wave-2 lights it up. **Not a finding** by Rule #6. |

### B5 · Master data duplicates / inactive blocking

VERIFIED-BY-CODE: PartyPicker inline-create derives PAN from GSTIN and seeds GST registration fields (`src/components/fincore/pickers/PartyPicker.tsx:132-141`):
```ts
const gstin = (draft.gstin ?? '').trim().toUpperCase();
const pan = gstin.length >= 12 ? gstin.slice(2, 12) : '';
...
gstRegistrationType: 'regular', gstStateCode: gstin.slice(0, 2),
```

| ID | Sev | Dim | File:line + code | State | Problem | Impact | Fix |
|---|---|---|---|---|---|---|---|
| B5-F1 | MEDIUM | Duplicate-GSTIN prevention in inline-create | `PartyPicker.tsx:120-170` — derives PAN/state but I did not see a `parties.some(p => p.gstin === gstin)` short-circuit. | UNVERIFIED (needs targeted view of the create dispatch) | Two parties with identical GSTIN may be creatable through the inline picker. | Master pollution; ITC/2A reconciliation drift. | Add a `findByGstin` pre-check on inline-create and surface a "select existing instead" affordance. |
| B5-F2 | LOW | Inactive-master usage block | not located | UNVERIFIED | No `isActive` gate confirmed in transaction line entry. | Soft master hygiene risk. | Add a `disabled-when-inactive` filter on the pickers and a save-time assert. |

### B6 · Money math discipline

VERIFIED-BY-CODE (mixed signal):
- `decimal.js` IS adopted in 12 files including `src/lib/decimal-helpers.ts`, `src/lib/fincore-engine.ts`, `src/lib/sam-engine.ts`, `src/lib/commission-engine.ts`, `src/lib/partner-portal-engine.ts`, `src/components/uth/SimpleGSTPanel.tsx`.
- However raw-float arithmetic is widespread elsewhere: **626 `parseFloat(` and 966 `.toFixed(` occurrences across `src`**. Concrete sample:
  - `src/lib/bill-passing-engine.ts:710` — `const value = (line.estimated_rate ?? 0) * qty;` (float multiply with no Decimal wrap)
  - `src/lib/webstorex-order-engine.ts:314` — `taxable_value: +(cl.qty * rate).toFixed(2),`
  - `src/lib/webstorex-order-engine.ts:417` — `const subTotal = +(cl.qty * rate).toFixed(2);`

| ID | Sev | Dim | File:line + code | State | Problem | Impact | Fix |
|---|---|---|---|---|---|---|---|
| B6-F1 | HIGH | Money math precision drift | `bill-passing-engine.ts:710`, `webstorex-order-engine.ts:314,417` (and class-wide: 626 parseFloat + 966 toFixed sites) vs Money-Math-Precision memory canon (Decimal.js + banker's rounding). | VERIFIED-BY-CODE | Two engines that own price × qty calculations bypass the Decimal helper used by `fincore-engine`. | At scale + accumulation, sub-paise drift accumulates; cross-module totals (FinCore-derived vs WebStoreX/BillPassing-derived) will disagree at the rupee. | Replace each `(qty * rate)` with `decimal-helpers.multiply(qty, rate)` and a `toPaise()` final cast. Add a precision-contract lint to fail on raw `*` between known money fields. |

### B7 · SSOT / name drift

UNVERIFIED at full sweep; canon-acknowledged class. The `sprint-history.ts` references DP-EC-9 `Σ-guard` patterns and W1C series specifically existed to retire name-drift in pickers (Memory: "card-id drift class"). No fresh collision enumerated by me — listing none is honest, listing fake ones would violate Rule #2.

### B8 · Audit coverage

VERIFIED-BY-CODE: `logAudit(` is called in **348 sites**; `localStorage.setItem` is called in **806 files**. Even allowing that many setItem sites are UI prefs / cache / not business state, the absolute count of mutating sites without an adjacent `logAudit` will be large. Concrete unlogged mutations I can name (read-write of business shape without an adjacent `logAudit`, verified by file scan):

| # | File:line | Mutation |
|---|---|---|
| 1 | `src/pages/welcome/scenarios/ClientBlueprintsPage.tsx:417` | `localStorage.setItem('erp_group_vouchers', JSON.stringify(filtered));` — voucher delete with no `logAudit` import in file. |
| 2 | `src/pages/welcome/scenarios/ClientBlueprintsPage.tsx:427` | `localStorage.setItem('erp_outstanding', JSON.stringify(filtered));` — outstanding mutated with no audit. |
| 3 | `src/hooks/useDemoSeedLoader.ts:248,263` | `localStorage.setItem('erp_demo_loaded', ...)` — demo flag mutation (low severity; flag, not finance). |
| 4 | `src/pages/auth/Login.tsx:344` | `localStorage.setItem("4ds_token", "mock-jwt-token-xyz");` — mock auth (designed seam; not a finding). |
| 5 | `src/pages/Profile.tsx:168,185` | `display_settings` / `notif_settings` — user prefs (LOW). |

Honest estimate: I cannot produce a percentage without a write-path inventory. Marked **UNVERIFIED-percentage**, **VERIFIED-by-code for the 5 named sites**.

| ID | Sev | Dim | File:line + code | State | Problem | Impact | Fix |
|---|---|---|---|---|---|---|---|
| B8-F1 | MEDIUM | Audit coverage on voucher/outstanding mutation in ClientBlueprintsPage | `ClientBlueprintsPage.tsx:417,427` | VERIFIED-BY-CODE | Business-shape mutation without `logAudit` adjacency. | Scenario page can clear vouchers/outstanding silently in Tier-L. | Wrap both writes in the audit-safe helper used by FinCore. |

### B9 · Multi-entity isolation (extends A7)

VERIFIED-BY-CODE — non-entity-prefixed business-shape writes outside test/seed files:

| Key | File:line | Risk |
|---|---|---|
| `'erp_group_vouchers'` | `ClientBlueprintsPage.tsx:417` | Voucher store keyed by group, not entity. |
| `'erp_outstanding'` | `ClientBlueprintsPage.tsx:427` | Outstanding by group, not entity. |
| `'erp_companies'` | (test seed `w1c-3/companies-entities.test.tsx:25`) | Companies registry — multi-tenant only if `companies[].entity_code` is enforced. |
| `'operix_console_tab'` | `SecurityModule.tsx:1627` | UI state — LOW. |
| `'app_language'` | `useLanguage.tsx:26` | Pref — LOW. |
| `'4ds_token' / 4ds_login_*'` | `Login.tsx:332-344` | Mock auth (designed). |
| `'display_settings' / 'notif_settings'` | `Profile.tsx:168,185` | User prefs — LOW. |

| ID | Sev | Dim | File:line + code | State | Problem | Impact | Fix |
|---|---|---|---|---|---|---|---|
| B9-F1 | HIGH | Tenant isolation on vouchers/outstanding (Tier-L) | `ClientBlueprintsPage.tsx:417,427` — keys `erp_group_vouchers`, `erp_outstanding` carry **no entity_code suffix**. | VERIFIED-BY-CODE | Group-keyed business data violates the Multi-Tenant Key Scoping canon. | A second entity loaded into the same browser inherits / overwrites the first's vouchers in Tier-L. | Rename to `erp_${entityCode}_vouchers` / `erp_${entityCode}_outstanding`; provide a legacy-fallback read shim per the Multi-Tenant Key Scoping memory. |

### B10 · Tax/GST logic

VERIFIED-BY-CODE (positive signals): GST helpers exist (`src/components/uth/SimpleGSTPanel.tsx` uses `decimal.js`), `comply360-itr6-engine.ts:154` uses `round2`. Rate-anomaly notes preserved instead of overwriting file-reported TDS/TCS (`sprint-history.ts:934` documents this). I did NOT trace every tax pickup for the "silently defaults to 0" pattern — listing it as a finding would be invention. **Marked UNVERIFIED.**

---

## PART C — 360° + PWA (Tier-L sections)

### C1 · Architecture / engine-vs-page separation

Concrete breach: `src/pages/welcome/scenarios/ClientBlueprintsPage.tsx:417,427` writes `erp_group_vouchers` and `erp_outstanding` **directly from a page** when `fincore-engine` owns the voucher store. **VERIFIED-BY-CODE.** Finding C1-F1 severity MEDIUM (would be HIGH outside the scenarios scratchpad).

### C2 · State / React

UNVERIFIED at depth. Sample effects scanned (e.g. `MarketingPlanningPage.tsx:61`, `useWorkCenters.ts:34`) all carry deps arrays. No effect-without-deps located in a 10-row sample. No render-time data work flagged here without proof.

### C3 · Error boundaries / promises

- VERIFIED-BY-CODE: **single top-level ErrorBoundary** at `src/App.tsx:419` / closing `:887`. Total `ErrorBoundary` references in `src`: 18 (mostly imports + the one mount).
- Empty `catch (e) {}` blocks: **0 found** in `src` via `rg 'catch\s*\([^)]*\)\s*\{\s*\}'`. Good.

| ID | Sev | Dim | File:line + code | State | Problem | Impact | Fix |
|---|---|---|---|---|---|---|---|
| C3-F1 | MEDIUM | Single global ErrorBoundary across 397 `<Route>` elements (`rg '<Route\s' src \| wc -l` = 397). | `App.tsx:419,887` | VERIFIED-BY-CODE | One thrown component takes down the whole app section instead of just the routed page. | A buggy report (e.g. one of the 525 kB FinCore subtrees) blanks the rest of the shell. | Wrap each `Shell`-mounted module body in a per-card ErrorBoundary with a recover-to-welcome action. |

### C4 · TypeScript honesty

VERIFIED-BY-RUN of greps:
- `: any` / `<any>` / `as any` occurrences in `src`: **0**.
- `@ts-ignore`: **0**.
- `@ts-expect-error`: **0**.

Honest result: no `any`-debt findings. (Cross-auditor: re-run with a stricter pattern that includes `Record<string, any>` if desired.)

### C5 · Dead weight

UNVERIFIED — full dep-vs-import sweep not performed. `console.log/error/warn` appears in **70 src files** — not strictly dead weight but a chore item.

### C6 · PWA

VERIFIED-BY-CODE:
- Manifest (`public/manifest.webmanifest`): `name`, `short_name`, `start_url: '/mobile/'`, `scope: '/mobile/'`, `display: 'standalone'`, theme/background colors, 192/512 + maskable icons, two shortcuts. **Complete for OperixGo.**
- Service worker (`public/sw.js`): v2 network-first for navigations/JS/CSS, cache-first for icons/fonts/images, network-first for `/api/*`. **Kill-switch self-unregisters on `lovableproject.com` / `lovable.app`** preview hosts — explicit and documented.
- `pending_sync` mobile queues acknowledged as a Wave-2 seam (Rule #6 known canon).

| ID | Sev | Dim | File:line + code | State | Problem | Impact | Fix |
|---|---|---|---|---|---|---|---|
| C6-F1 | LOW | Manifest scope confines installable PWA to `/mobile/` | `manifest.webmanifest:5` `"scope": "/mobile/"` | VERIFIED-BY-CODE (not a defect — by design for OperixGo) | If a user installs from `/erp/...` the install prompt may be suppressed. | Desktop ERP is not an install target. | Confirm with product; otherwise no action. |
| C6-F2 | LOW | `pending_sync` overflow/replay risk | designed seam | UNVERIFIED-BY-RUN | Replay/dedupe semantics not exercised offline-then-online in this audit. | Wave-2 risk surface. | Add a reconnect test that asserts `processed_at` dedupes by `(entity_code, intent_id)`. |

### C7 · Performance

VERIFIED-BY-RUN of `npm run build`: 7 chunks exceed 500 kB ungzipped. Largest: `Comply360Page` 734.50 kB, `index-sT51s2P1.js` 720.19 kB, `SalesXPage` 679.95 kB, `Dashboard` 671.12 kB, `PayHubPage` 575.48 kB, `FinCorePage` 525.64 kB. `vendor-charts` 473.56 kB, `pdf` 453.46 kB, `xlsx` 424.65 kB.

Lazy-route adoption: `rg lazy\\( src` ≈ 3 files only — **most route nodes are eagerly imported in `App.tsx`**, which is consistent with the giant `index-sT51s2P1.js` 720 kB main chunk.

| ID | Sev | Dim | Evidence | State | Problem | Impact | Fix |
|---|---|---|---|---|---|---|---|
| C7-F1 | HIGH | Bundle size / first paint | Build output above; `App.tsx` 887 lines registering 397 `<Route>`s with ~3 `lazy()` sites. | VERIFIED-BY-RUN | Main chunk 720 kB + Dashboard 671 kB ship up-front. | Slow first paint on Tier-L hardware; mobile 3G unusable. | Convert each top-level ERP card route to `React.lazy()`; split `vendor-charts`/`pdf`/`xlsx` into manualChunks; defer `html2canvas`/`jspdf` to user-initiated export. |

### C8 · N/A LEDGER (mandatory)

| Dimension | Verdict | Future seam |
|---|---|---|
| Auth / JWT / session | **N/A — backend not built (Wave-2)** | `4ds_token` mock + `[JWT]` comments throughout (`Login.tsx:344`). |
| API / DB / SQL-injection | **N/A — backend not built (Wave-2)** | localStorage abstraction → REST swap-in at `[JWT]` markers. |
| Concurrency / row-locking | **N/A — backend not built (Wave-2)** | Server-side row-version columns post-Wave-2. |
| DevOps / CI-CD / DR | **N/A — backend not built (Wave-2)** | Self-hosted Postgres ceremony. |
| Push notifications | **N/A — backend not built (Wave-2)** | `queued_for_wave2` outbox (`auto-send-rules-engine.ts`). |
| Rate limiting / WAF | **N/A — backend not built (Wave-2)** | Gateway in Wave-2. |
| Multi-user concurrency | **N/A — backend not built (Wave-2)** | Single-browser Tier-L today. |
| SSO / OIDC | **N/A — backend not built (Wave-2)** | n/a. |
| Secrets management | **N/A — backend not built (Wave-2)** | No client-side creds (Pillar canon). |
| Backups / RPO-RTO | **N/A — backend not built (Wave-2)** | n/a. |

---

## PART D — OUTPUT

### D3 · Top 10 actually proven broken (VERIFIED only)

Honest count: **3 verified findings** below. Padding to 10 would violate Rule #2.

1. **B9-F1 · HIGH · Tenant-leak keys** — `erp_group_vouchers` / `erp_outstanding` are group-keyed, not entity-keyed (`ClientBlueprintsPage.tsx:417,427`). Verified by code.
2. **B6-F1 · HIGH · Money math precision drift** — `bill-passing-engine.ts:710` and `webstorex-order-engine.ts:314,417` use raw float `*` for price × qty alongside the Decimal canon used elsewhere. Verified by code.
3. **C7-F1 · HIGH · Bundle size / lazy-route coverage** — 7 chunks >500 kB; `lazy()` used in only ~3 files. Verified by build run.

Adjacent verified-but-lower:
4. **C3-F1 · MEDIUM** — single global ErrorBoundary for 397 routes (`App.tsx:419,887`).
5. **C1-F1 · MEDIUM** — page-direct storage write breaks engine-vs-page rule (`ClientBlueprintsPage.tsx:417,427`).
6. **B8-F1 · MEDIUM** — two business-shape writes in `ClientBlueprintsPage.tsx` carry no `logAudit`.

### D4 · Suspected but UNVERIFIED — needs a real test

- **B1-F1** — universal period-lock coverage across every voucher poster.
- **B2-F1** — Dr=Cr enforcement at *save* (currently only at Tally *export*).
- **B3-F1** — central negative-stock guard.
- **B5-F1** — duplicate-GSTIN block on inline party create.
- **B5-F2** — inactive-master usage block in transaction lines.
- **B10** — silent tax-defaults-to-zero paths.
- **C2** — render-time work / missing-deps sweep at full scale (sample of 10 was clean).
- **C5** — unused npm deps.
- **C6-F2** — `pending_sync` reconnect dedupe behaviour.
- **A3 / A4 / A5 / A6 / A7-by-run** — physical click-throughs (welcome panel, 33 ERP cards, OperixGo tiles, edge cases, DevTools storage dump). Not performed in this audit window; cross-auditor must re-run.

### D5 · Scores (Tier-L only)

| Dimension | Score | One-line justification |
|---|---|---|
| Frontend architecture | **7 / 10** | Strong engine-vs-page separation overall (B4 SoD model, decimal helpers, ErrorBoundary present); C1-F1 + C3-F1 hold it back. |
| ERP logic integrity | **6.5 / 10** | Period-lock engine exists and is test-proven (B1); Dr=Cr enforcement only at export (B2-F1 UNVERIFIED at save); precision drift in two engines (B6-F1) is real. |
| Fraud-control posture | **6 / 10** | maker-checker enforced as a hard field rule in bulk-pay (B4 VERIFIED); audit coverage is good in absolute count (348 `logAudit` sites) but 3 named unlogged mutations exist (B8-F1) and tenant keys leak (B9-F1). |
| PWA / mobile | **7.5 / 10** | Manifest complete, SW v2 has a preview kill-switch, `pending_sync` seam is documented (C6); replay semantics UNVERIFIED. |
| Production-readiness-as-frontend | **6 / 10** | Build passes clean, 0 `any` / 0 `@ts-ignore` (C4); but 7 chunks >500 kB and ~3 lazy routes (C7-F1) make first paint a real concern. |

### D6 · Verdict (one paragraph)

**Go for Tier-L pilot use; conditional Yes for "frontend solid enough to wire a backend onto".** The backbone (engines, audit/hash/signing canons, master pickers, period-lock engine, double-entry shape, SoD field rules, PWA with a preview kill-switch) is in place and the build is genuinely clean (0 TS errors, 0 `any`, 0 `@ts-ignore`, 0 empty catches). The single biggest *real* risk found is **B9-F1 · tenant-leak keys (`erp_group_vouchers` / `erp_outstanding`)** — at Tier-L it just means a second entity in the same browser overwrites the first, but if those keys survive into the Wave-2 REST mapping unchanged they become a cross-tenant data bleed waiting to happen. Fix B9-F1 + B6-F1 + C7-F1 before pilot; the rest of the UNVERIFIED list should be physically re-run by a second auditor (the §A3/A4/A5 click-throughs were not performed here and **are not claimed**).

---

*End of report. HEAD `0c2863651076c7d64235ca804d7603b942e7dbde`. No other file in this commit.*
