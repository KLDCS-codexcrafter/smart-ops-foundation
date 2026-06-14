# OPERIX · WAVE-2 GATE PUNCH-LIST v1
## Single consolidated, deduplicated action list — derived from the 3 independent audits (14 Jun 2026) + the Wave-1 Freeze Record
**Anchor:** Wave-1 freeze `cbe2357` · 187 ⭐ · **Audits cross-checked by independent re-clone (HEAD verified, no src edits).**
**Sources:** `docs/audits/360_full_audit` · `docs/audits/erp_logic_audit` (42/100) · `docs/audits/pwa_capacitor_audit` (NO-GO paid / GO pilot) · `Operix_Wave1_Freeze_Record_v1`
**Shared verdict of all sources (no contradiction):** demo/pilot-ready · **NOT production-ready.** This list is what earns "production-ready."

---

## HOW TO READ THIS
- **[FREEZE]** = already named as a carried-forward gate in the Freeze Record (confirmed by the audits — not new).
- **[NEW]** = surfaced by the audits, not previously in our gate list — capture these.
- **[VERIFY]** = audit flagged "no evidence / unconfirmed" (auditor did not run the suite) — treat as a *correctness-audit checklist item*, NOT a confirmed defect.
- Severity: 🔴 Critical · 🟠 High · 🟡 Medium · ⚪ Low.

---

## GATE 1 · BACKEND + PERSISTENCE  🔴 [FREEZE]
The spine of Wave-2. Everything else assumes this lands first.
1. 🔴 Stand up the self-hosted PostgreSQL backend (DP-P8-2 · India-resident · Rule 46(8)). Generate `/api/*` per the 1,434 `[JWT]` seam markers, in priority order: **auth → audit-trail → vouchers → masters → reports**.
2. 🔴 Migrate the ~4,400 `localStorage.*` call sites through a single `ls<T>`→`api<T>` data-layer abstraction so call sites stay identical (audit 360 §8.1-2). Any bypass = race-condition debt.
3. 🟠 [NEW] Move transactional data off-client entirely — localStorage ~5 MB quota is a wall (a mid-size tenant will hit it). Keep only UI state + sync-queue on device. *(360 C-1/C-4)*
4. 🟡 [NEW] Consider promoting the engine layer to a workspace package so the Wave-2 server can import the same pure functions (360 §8.1-4).

## GATE 2 · AUTH + TENANT ISOLATION  🔴 [FREEZE]
5. 🔴 Real authentication — replace `mockLogin`. Server-validated JWT, roles in a `user_roles` table, route guards gated server-side. *(360 C-2 · ERP G-1/G-2 · PWA)* Today any visitor can mint an admin session via devtools.
6. 🔴 Server-enforced tenant isolation — Bucket A/B/C scoping is correct client-side but must be enforced at the DB/row level in Wave-2.

## GATE 3 · SERVER-SIDE AUDIT TRAIL (MCA Rule 3(1))  🔴 [FREEZE]
7. 🔴 Append-only server log with a cryptographic chain. **Note from audit:** the Wave-1 FNV-1a integrity hash is the right *shape* but not auditor-grade — use **SHA-256** + a monthly Merkle root anchored to a timestamping service. *(360 C-3 · ERP B-2)* Until then the "tamper-evident" claim is client-only and devtools-deletable.
8. 🟠 Server-side period-lock + IRN read-only lock (prevents back-dating across closed periods). *(ERP B-1)*

## GATE 4 · FINANCIAL & ERP-LOGIC CORRECTNESS AUDIT  🔴 [FREEZE]
The Freeze Record's mandatory correctness audit of FinCore/Statutory/FA/Comply360. The ERP-logic report supplies the **[VERIFY] checklist** — each is "unconfirmed without a test run," NOT a known defect:
9. 🔴 Double-entry: server transaction wrapper rejecting `sum(debit) ≠ sum(credit)`. *(ERP D-1)*
10. 🟠 [VERIFY] Negative-stock guard on MIN/Dispatch (ERP C-1) · BOM cycle-detection + max-depth (ERP E-1) · WIP atomic component reduction (ERP E-2).
11. 🟠 [VERIFY] GST/TDS section-mapping (194Q/194O/195) unit tests vs CBDT examples (ERP D-2) · D/C-note ITC-reversal linkage CGST §17(5) (ERP B-5) · job-work ITC-04 register (ERP E-3).
12. 🟠 [VERIFY] Depreciation WDV/SLM vs Companies Act Sch II (ERP D-6) · FIFO/LIFO valuation idempotency (ERP C-3) · expiry-block on batch issue (ERP C-2).
13. 🟡 [VERIFY] GSTIN modulus-36 check-digit validation (ERP A-4) · aging cut-off = document-date not posting-date (ERP D-5) · reservation TTL expiry surfacing (ERP C-4).
14. 🟠 Statutory retention floor vs the law: IT Rule 6F · Companies Act §128 · GST §36 (Freeze Record — research still pending).
> Discipline: this gate is a **correctness audit with the suite RUN**, not a render check. Confirm each [VERIFY] item against its engine; many may already be handled.

## GATE 5 · PWA / MOBILE PRODUCTION READINESS  🟠 [NEW — mostly]
The audits' genuinely-new contribution beyond our existing gates:
15. 🔴 [NEW] **PWA precache is empty** — `public/sw.js` caches only manifest + favicon, so first-visit offline is blank. Adopt Workbox / `vite-plugin-pwa` to precache the app shell; keep the preview-host kill-switch. *(360 C-5 · PWA §10)*
16. 🟠 [NEW] **iOS `limitsNavigationsToAppBoundDomains: false`** (`capacitor.config.ts:47`) — set `true` + whitelist domains (App-Store-review + phishing-surface risk). *(360 H-5 · PWA)*
17. 🟠 [NEW] Move the offline sync-queue to `@capacitor/preferences` (already a dep) so OS-kill of the webview doesn't lose in-flight mutations. *(360 §8.2-6)*
18. 🟠 [NEW] Verify `SplashScreen.hide()` is called after first paint in `main.tsx` (else splash can hang). *(360 H-4)*
19. 🟡 [NEW] Push-notification server + APNs/FCM credentials story (none today). Manifest polish: add `id`, `screenshots[]`, PNG icon fallbacks; fix StatusBar/theme_color mismatch.

## GATE 6 · PERFORMANCE + BUNDLE  🟠 [NEW]
20. 🟠 [NEW] **391 routes in one `App.tsx`, no page-level code-splitting** — measured cold-start unknown. At 1,536 page components, lazy-load per hub via `React.lazy`; measure with `vite build --report`. *(360 C-6 · PWA §7)* Cross-check against `docs/PERFORMANCE-BASELINE.md`.
21. 🟡 [NEW] Wrap each hub route in an `<ErrorBoundary>` (one render crash currently white-screens a whole hub). *(360 H-7)*
22. 🟡 Tree-shake/replace heavy libs (recharts ~120 KB gz); review `xlsx@0.18.5` (prototype-pollution history → consider exceljs/patch). *(360 M-4/M-6)*

## GATE 7 · SECURITY / PEN-TEST  🔴 [FREEZE]
23. 🔴 Security + penetration test (pre-production infra activity — Freeze Record gate 4).
24. 🟠 [NEW] Certificate pinning / `network_security_config.xml` for mobile (MITM on hostile networks). *(360 H-6)*
25. 🟡 [NEW] Document CSP/SRI policy; vendor-risk register; `npm audit` / CVE pass (not run by the audit). *(PWA §6)*

## GATE 8 · DEVOPS / DR / OBSERVABILITY  🟠 [NEW]
26. 🟠 [NEW] No CI/CD config in the tree — add a pipeline running `tsc --noEmit` + `vitest run` + `eslint --max-warnings 0` + a coverage gate (≥70% on `src/lib/`). *(360 M-5/§8.3-9 · PWA §8)*
27. 🟡 [NEW] Strip/guard the 135 `console.*` calls (prod leak/PII risk) via a structured logger. *(360 H-3)*
28. 🟡 [NEW] Track down the 372 `eslint-disable` directives in a dedicated sprint — each is hidden bug-surface. *(360 H-2)*
29. 🟡 [NEW] DR/backup story + quarterly restore rehearsal on a hidden tenant once backend lands. *(360 §8.4)*
30. ⚪ [NEW] ADRs (`docs/adr/NNN-*.md`) for each D-NNN invariant; SOC2-readiness evidence file started early. *(360 §8.3-10/8.4-11)*

---

## DATA-RECONCILIATION NOTE (so the docs don't appear to contradict)
The audits' "facts locked" use different grep patterns than the Freeze Record, so a few counts differ — both are correct, they count different things:
- Engines: audit **484** (`find src/lib -name '*engine*'`) vs Freeze **612** (`ls src/lib/*.ts`).
- Test files: audit **1,070** (broader pattern, incl. `src/__tests__`) vs Freeze **916**.
- `[JWT]` markers: audit **1,441** vs Freeze **1,434** (within noise).
- Source files: both **3,934** ✅.
None of these are errors; cite the method when quoting a number.

## WHAT THE AUDITS CONFIRMED IS ALREADY GOOD (preserve through Wave-2)
D-127/128/194/216 invariant discipline · the 1,434 `[JWT]` seams (Wave-2 = search-replace, not rewrite) · pure engines · entity key-scoping · test-isolation determinism · decimal.js money math · Indian-locale strictness · sprint-history/sibling-register institutional memory · the service-worker kill-switch. *(All three reports list these as genuine strengths.)*

---

*Wave-2 Gate Punch-List v1 · consolidated from 3 independent audits (14 Jun 2026) deduplicated against the Wave-1 Freeze Record · 30 gates across 8 groups · [FREEZE]=already-tracked · [NEW]=audit-surfaced · [VERIFY]=unconfirmed-not-defect · independently cross-checked by re-clone · author: Claude on behalf of Operix Founder · feeds the Master Alignment v4 ceremony that opens Wave-2.*
