# 4DSmartOps · PWA + Capacitor 360° Audit

**Generated:** 14 Jun 2026 · IST
**HEAD SHA:** `cbe2357d9`
**Auditor role:** Principal Architect + DevSecOps + Mobile Architect + Performance Engineer
**Mandate:** Diagnose only. Backend not built — Sections 4 (Backend) and 5 (Database) are **N/A**; rated against contract surface (`[JWT]` markers).

---

## Section 1 — Executive Audit Summary

| Dimension | Score | Notes |
|---|---|---|
| Overall architecture | **7.0 / 10** | Clean invariants; backend missing penalises beyond this |
| Production readiness | **3.0 / 10** | Demo / pilot only |
| Scalability | **2.5 / 10** | localStorage = single-device |
| Security | **2.0 / 10** | Mock auth, client roles |
| Maintainability | **8.0 / 10** | TS-strict-friendly, engine purity, sprint-history discipline |
| Mobile performance | **5.0 / 10** | Capacitor 6 wired but splash + native-bridge usage shallow |
| PWA compliance | **5.5 / 10** | Manifest ✓, SW ✓ but no precache for app shell |
| Offline capability | **3.5 / 10** | SW network-first for code, no IndexedDB sync queue, no conflict resolver |
| DevOps maturity | **2.0 / 10** | No CI/CD config visible, no IaC, no monitoring |
| Enterprise readiness | **3.0 / 10** | Architecture intent is enterprise; execution is Beta |

### Top Strengths
- D-127/D-128/D-194/D-216 invariants, sprint-history institutional memory, decimal.js precision, Capacitor 6 (current major).
- Service-worker kill-switch for preview hosts (post-S152.T4 hardening) — operational maturity.

### Top Weaknesses
- No backend, no real auth, no precache for app shell, no IndexedDB, no sync engine, no CI/CD visible, no monitoring.

### Critical Blockers (production)
1. No backend → no multi-tenant truth.
2. No real authentication.
3. PWA "offline" promise unfulfilled — first-visit offline is blank because precache is just manifest + favicon.
4. No push-notification server, no APNs/FCM credentials story.

### Technical-debt analysis
372 `eslint-disable` directives, 135 `console.*` calls, no coverage gate, no ADRs — debt is **measurable but contained**.

### Enterprise Maturity Level
**Beta** — past MVP because of disciplined architecture, short of Production Ready because of backend absence.

---

## Section 2 — Frontend Architecture Audit

| Area | Status | Evidence |
|---|---|---|
| Framework | React 18.3.1 + Vite 5.4.19 + TS 5.8.3 | `package.json` |
| Folder structure | Panel-based: `pages/{auth,tower,bridge,erp,partner,customer,mobile}` | per memory `mem://architecture/file-structure` |
| Component lib | shadcn/ui only (Radix primitives) | `package.json` |
| State management | Local `useState` + `event-bus` + context (no Redux/Zustand) | `src/hooks/`, `src/contexts/` |
| Server state | **`@tanstack/react-query` NOT INSTALLED** despite memory rule | `package.json` |
| Hooks | 127 hooks, each with header doc-comment | `src/hooks/useEntityCode.ts` is exemplary |
| Routing | `react-router-dom@6.30.1`, **391 routes in single `App.tsx`** | `rg '<Route ' src/App.tsx` |
| Code-splitting | Vendor chunks only (`vendor-radix`, `vendor-charts`, `vendor-pdf`, `vendor-xlsx`) — **no page-level lazy** | `vite.config.ts` |
| Error boundaries | Not verified per route | — |
| TypeScript | Only 10 `:any` in 155k LOC = excellent | `rg -c ': any' src` |
| Dead code | Not measured; 372 `eslint-disable` may hide it | — |
| Accessibility | shadcn/Radix is accessible by default; custom usage not audited | — |
| SEO for PWA | `index.html` not inspected in this audit pass | — |
| PWA manifest | Present, SVG-only icons | `public/manifest.webmanifest` |
| Service worker | Manual, network-first navigations + code, cache-first long-lived | `public/sw.js` |
| Cache strategy | Versioned (`opx-v2`), kill-switch for preview hosts | `public/sw.js` |
| IndexedDB | **NOT USED** — everything in `localStorage` (4,424 sites) | `rg 'localStorage\.' src` |
| Storage management | `storage-quota-engine` exists, `audit_trail` intent always allowed | per `docs/ARCHITECTURE.md` |

### Anti-patterns identified
- **Single-file router** at this scale: 391 routes in `App.tsx` defeats tree-shaking per hub.
- **No React Query** while memory rule lists it: rolling your own cache invalidation across 4,424 storage calls is brittle.
- **localStorage as DB**: documented and intentional for Phase 1, but at ~5 MB browser quota = a wall, not a runway.

### Refactoring recommendations
1. Split router by hub; each hub `lazy()`-loaded.
2. Introduce React Query at the same time as backend; cache key = same string used for localStorage key.
3. Promote `event-bus` listeners to dedicated hooks (`useEventBus.ts` exists — enforce its use).
4. Wrap every hub route in `<ErrorBoundary>` with telemetry hook.

---

## Section 3 — Capacitor Mobile App Audit

| Item | Status | Notes |
|---|---|---|
| Capacitor major | **6.0.0** (current; 7 is GA but breaks `bundledWebRuntime`) | `package.json` |
| Plugins installed | `app`, `camera`, `device`, `geolocation`, `preferences`, `push-notifications`, `splash-screen`, `barcode-scanner` (community), `native-biometric` | 9 plugins |
| `webDir` | `dist` (Vite default) ✓ | `capacitor.config.ts` |
| `bundledWebRuntime` | `false` ✓ | `capacitor.config.ts` |
| Android `allowMixedContent` | `false` ✓ | `capacitor.config.ts:37` |
| Android `webContentsDebuggingEnabled` | `false` ✓ release | `capacitor.config.ts:39` |
| iOS `limitsNavigationsToAppBoundDomains` | **`false`** ⚠️ — widens nav surface | `capacitor.config.ts:47` |
| Splash screen | `launchShowDuration: 1500`, `launchAutoHide: true`, immersive | `capacitor.config.ts:19-28` |
| Status bar | dark style, `#1E3A5F` — **mismatches manifest `theme_color: #F97316`** | mismatch |
| Deep linking | Not visible in config | — |
| Push notifications | Plugin installed, server-side absent | — |
| Background sync | Plugin not installed (`@capacitor/background-fetch` not in deps) | — |
| Native bridge usage | Plugins listed but **usage depth not measured** | — |
| Secure storage | `@capacitor/preferences` installed; can fulfil JWT-token storage | not visibly used |
| Biometric | `capacitor-native-biometric@4.2.2` installed | usage unverified |
| Native crash risks | Webview crash recovery unverified | — |
| WebView optimization | No `webViewVersion` floor declared | — |

### Findings (Mobile)

| ID | Severity | Issue |
|---|---|---|
| M-1 | HIGH | `SplashScreen.hide()` must be called from React mount; not verified in `src/main.tsx`. Splash may freeze if first paint errors. |
| M-2 | HIGH | iOS `limitsNavigationsToAppBoundDomains: false` — Apple may flag in review; set `true` and whitelist. |
| M-3 | MEDIUM | No deep-link / Universal-Link config — push-notification taps cannot land on a specific voucher. |
| M-4 | MEDIUM | No background-fetch plugin — offline mutations cannot retry while app is killed. |
| M-5 | MEDIUM | `Preferences` plugin installed but token storage not enforced; if JWT lands in `localStorage` it's recoverable via webview inspection on jailbroken devices. |
| M-6 | LOW | StatusBar / theme_color colour mismatch (cosmetic). |
| M-7 | LOW | SVG-only icons in manifest — older Android may not render correctly inside notification tray. |
| M-8 | LOW | No `cap:doctor` output in repo to prove plugin matrix is consistent. |

---

## Section 4 — Backend Architecture Audit

**N/A — backend not built.** `@supabase/supabase-js` and `firebase` are absent; no `/supabase` directory; 1,441 `[JWT]` markers identify the future endpoint surface.

When backend is built (recommended: Lovable Cloud), audit these now to avoid rework:
- API gateway design (single domain or per-hub subdomain)
- JWT in httpOnly cookie + refresh rotation
- Multi-tenant RLS using `user_roles` + `has_role()` SECURITY DEFINER (memory rule already documents the pattern)
- Idempotency keys on every POST (Bridge Outbox pattern)
- Rate limiting at edge

---

## Section 5 — Database Audit

**N/A — no database on HEAD.** Migration guidance:
- Use `entity_id` UUID FK universally (not `shortCode` strings).
- One schema per hub if you go Postgres + RLS; one DB per hub only if scale demands it later.
- Append-only `audit_log` table with monthly Merkle anchor.
- Time-partition voucher tables by `posted_at` quarter for retention.

---

## Section 6 — Security Audit

### Posture (Phase 1)

| OWASP item | Phase 1 verdict |
|---|---|
| A01 Broken Access Control | **OPEN** — client-side checks only |
| A02 Cryptographic Failures | FNV-1a used for voucher hash; not crypto-grade — replace with SHA-256 for audit chain |
| A03 Injection | N/A (no server) |
| A04 Insecure Design | Phase-1 single-device design is explicit; intent is OK, ship gate not yet open |
| A05 Security Misconfiguration | iOS `limitsNavigationsToAppBoundDomains: false`, mixed-content correctly off |
| A06 Vulnerable Components | `xlsx@0.18.5` has prototype-pollution history; `pdfjs-dist@5.6.205` recent CVEs — run `npm audit` before each release |
| A07 Identification & Auth | **OPEN** — mock auth |
| A08 Software & Data Integrity | No SRI on external CDN; no Subresource-Integrity policy documented |
| A09 Logging & Monitoring | Local-only; no central log sink |
| A10 SSRF | N/A (no server) |

### Mobile-specific

- Hardcoded secrets — none found (no API keys grep'd).
- Webview-debugging off in release ✓.
- Cleartext disabled ✓.
- Biometric plugin installed but unused — if used, must enrol device-bound key, not just gate UI.

### CORS / TLS / Certificates
Deferred until Phase 2 backend; pin TLS via Android `network_security_config.xml` at that point.

---

## Section 7 — Performance Audit

| Metric | Status |
|---|---|
| Frontend bundle | Not measured on HEAD — recommend `vite build --report` |
| Routes | 391 — un-chunked beyond vendor split |
| Heavy deps | recharts (120 KB), xlsx (450 KB), pdfjs-dist (~1 MB), jspdf — `vendor-pdf` / `vendor-xlsx` correctly isolated in `vite.config.ts:62` |
| Lighthouse | **Not run** in this audit |
| Mobile cold start | Unmeasured — predicted >5 s on mid-tier Android 4G |
| Memory leaks | Untested; `eventBus.on(...)` cleanup pattern in `useEntityChangeEffect.ts` is correct shape |
| Battery | N/A (no background work) |

### Optimisation plan
1. Page-level `React.lazy()` per hub — estimated 50–70 % reduction in initial JS.
2. Replace `recharts` with `visx` on heavy dashboards.
3. Defer `pdfjs-dist` and `xlsx` (already split — verify they aren't accidentally imported eagerly).
4. Add `bundle-budget` check to CI.

---

## Section 8 — DevOps & Infrastructure Audit

| Item | Status |
|---|---|
| CI/CD pipeline | **Not visible** in repo (no `.github/workflows`, no `azure-pipelines.yml`) |
| Release management | Not visible |
| Environment separation | Single dev preview today |
| Docker | Not present |
| Kubernetes | N/A |
| IaC | None |
| Monitoring | None |
| Logging | `console.*` (135 sites in src) |
| Alerting | None |
| DR | None |

### Recommendations
- Add GitHub Actions: `bun install` → `bun run lint --max-warnings 0` → `bun run test` → `vite build` → bundle-budget check.
- Once backend lands: Sentry (or self-hosted) + Otel; budget-based alerting.

---

## Section 9 — QA & Testing Audit

| Test type | Status |
|---|---|
| Unit | Vitest 3.2.4 — 1,070 test files |
| Integration | Some (per `cl-*` directories) |
| E2E | `@playwright/test@1.57.0` installed; **no `playwright` runner script in package.json** — usage unverified |
| Mobile | None visible |
| Offline | None visible |
| Sync conflict | N/A (no sync engine) |
| Load | None |
| Security | None |
| Coverage gate | Not configured |

### Test discipline observations (positive)
- Global `localStorage.clear()` in `src/test/setup.ts` (`T-FREEZE-FIX-TestIsolation`) — proves teamcares about determinism.
- Sprint-coded test directories (`cl-1`, `cl-2`, `cl-3*`, `w1c-*`) — easy traceability.
- Grep-guard tests for code conventions — fast, regression-cheap.

### Gaps
- Coverage percentage unknown (no report).
- Behavioural coverage of finance math (RCM, intercompany, depreciation) not measurable in this pass.

---

## Section 10 — Offline-First & Sync Engine Audit

| Concern | Status |
|---|---|
| Offline architecture | Storage is local but SW does **not** precache app-shell JS → first-visit-offline = blank |
| Sync queue | Bridge Outbox pattern **documented** (memory) but server is absent so queue has nowhere to drain |
| Retry handling | Documented |
| Conflict resolution | Not yet — no server timestamp authority |
| Partial sync | N/A |
| Failed-sync recovery | Documented |
| Duplicate prevention | Idempotency-key design exists in pattern docs only |
| Local DB | localStorage (string-only, no transactions) — should be IndexedDB |
| Network switching | `online`/`offline` listeners not verified in cartography |
| Background sync | Capacitor background-fetch plugin not installed |

### Recommendations
1. Migrate write-side cache from `localStorage` to IndexedDB (via `idb` or Dexie).
2. Adopt Workbox `BackgroundSyncPlugin` for queue.
3. On Capacitor, persist queue in `Preferences` so OS-kill survives.
4. Conflict policy: server timestamp wins; client gets toast + diff modal.

---

## Section 11 — Code Quality Audit

| Metric | Value | Comment |
|---|---|---|
| `:any` count | 10 | Excellent for 155k LOC |
| `eslint-disable` | 372 | Each is a sweep — high improvement leverage |
| `console.*` | 135 | Replace with structured logger |
| File header docs | Consistent on hooks (`useEntityCode.ts` exemplary) | Continue |
| Naming | Indian-domain-aware, panel-based, sprint-coded | Excellent |
| SOLID | Engine-purity (D-216) enforces SRP; OCP via card-registry pattern | Good |
| Dependency count | 69 prod + 23 dev | Reasonable |
| Risky deps | `xlsx@0.18.5`, `pdfjs-dist@5.6.205` | Track CVEs |
| Deprecated | None obvious; Capacitor 6 still current | OK |

### Refactor priorities
1. Eliminate `eslint-disable` in chunks of 50 / sprint.
2. Replace `console.*` with `logger.<level>`.
3. Extract `App.tsx` router into per-hub routers.

---

## Section 12 — Enterprise Readiness Audit

| Readiness | Verdict |
|---|---|
| 10 K users | ❌ (single-device) |
| 100 K users | ❌ |
| 1 M users | ❌ |
| Multi-location | ❌ |
| Multi-tenant SaaS | ❌ |
| Enterprise clients | ❌ for paying / ✅ for pilot |
| ISO/SOC compliance | ❌ — no evidence trail |
| Audit logging | ⚠️ client-only |
| Uptime SLA | N/A (no backend) |
| Supportability | ⚠️ — sprint discipline is strong but no observability |
| Maintainability | ✅ |

### Simulated failure scenarios
- **Server crash:** N/A — no server, but a stale SW could be the equivalent. Kill-switch in `sw.js:26–40` covers preview; production hosts will still see stale code if a deploy ships a broken `sw.js`.
- **App reinstall:** all `localStorage` lost — Phase 1 = full data loss.
- **Database corruption:** equivalent = browser cache corruption — same as reinstall.
- **Token expiration:** N/A.
- **Push notification failure:** silent — no server.
- **Mobile background kill:** in-flight UI state lost; persisted state survives if it was `set` before kill.
- **Android low-memory:** webview recreated — must be tested.

---

## Section 13 — Final Critical Report

### CRITICAL
1. No backend → no multi-tenant truth, no real audit log, no real auth.
2. PWA precache empty for app-shell JS → first-visit-offline blank.
3. Mock authentication = privilege escalation by anyone.
4. localStorage quota wall + no IndexedDB.
5. iOS `limitsNavigationsToAppBoundDomains: false` (App-Store risk + phishing surface).

### HIGH
6. 391 routes un-chunked.
7. No CI/CD config visible.
8. `SplashScreen.hide()` lifecycle not verified.
9. No deep-linking config.
10. `xlsx@0.18.5` known-vulnerable history.
11. No coverage gate.
12. 372 `eslint-disable` directives.
13. No structured logger.
14. No DR/backup story.
15. No push-notification server.

### MEDIUM
16. No background-fetch.
17. Manifest icons SVG-only.
18. StatusBar / theme_color mismatch.
19. No Lighthouse / bundle-size baseline.
20. No ADRs.
21. `cap:doctor` not in repo.
22. No bug-bounty.
23. No vendor-risk register.
24. No SRI/CSP policy documented.
25. No coverage report.

### LOW
26. Manifest missing `id` field.
27. Manifest missing `screenshots[]`.
28. No `network_security_config.xml`.
29. No Android adaptive-icon PNG fallbacks.
30. `webContentsDebuggingEnabled` not env-gated.

For each issue: business impact = "blocks production / blocks enterprise sale / risks compliance"; technical impact = "data loss / unauthorised access / UX failure"; remediation = see Section 14 roadmap; complexity = S/M/L per issue.

---

## Section 14 — Final Production Decision

**Is this application production ready?** **No.**
**Enterprise ready?** **No.**
**Scalable?** **Not in current form.** Architecture is scalable; persistence layer is not.
**Secure?** **No.**
**Maintainable long-term?** **Yes** — invariant discipline is rare and valuable.
**Would I approve for enterprise deployment today?** **No.**

### Verdict: ⚠️ **NO-GO** for paid multi-tenant production · ✅ **GO** for internal demo / single-tenant pilot

### Production-deployment blockers
1. Activate backend (Lovable Cloud) — owns the next 90 days.
2. Real authentication.
3. Server-side audit log.
4. Move write-cache to IndexedDB.
5. Page-level code-splitting.
6. PWA precache via Workbox / `vite-plugin-pwa`.
7. CI/CD with gates.
8. iOS app-bound domain fix.

### 30-Day Improvement Roadmap
- D 1–7: Lovable Cloud activation + auth schema + `user_roles` + `has_role()`.
- D 8–14: Migrate masters + audit-trail server-side.
- D 15–21: Page-level code-split; PWA Workbox migration; CI gates.
- D 22–30: iOS app-bound fix; structured logger; bundle budgets; first Lighthouse baseline.

### 90-Day Enterprise Roadmap
- D 31–60: Migrate vouchers + period-lock + IRN-lock; dashboards from server; sync queue in IndexedDB + Preferences.
- D 61–90: Push-notification server (APNs/FCM); ADRs; SOC2 evidence file open; bug-bounty soft-launch; DR rehearsal.

### Architecture Modernisation Roadmap
- Promote engines to `packages/engines/` workspace.
- Per-hub micro-frontend boundaries (long-term).
- Edge-cached read-models for dashboards.
- Event-sourced audit ledger with Merkle anchor.

---

## Method Appendix

Evidence sourced from: cartography greps (Section "Facts Locked" in Doc 1), `capacitor.config.ts`, `public/sw.js`, `public/manifest.webmanifest`, `vite.config.ts`, `package.json`, `docs/ARCHITECTURE.md`, project memory index.

### Did NOT do
- No `vite build` or bundle-size measurement
- No Lighthouse / WebPageTest
- No `vitest run`, no Playwright run
- No `npm audit` / CVE database lookup
- No `cap doctor` execution
- No browser exec on preview
- No edits to `src/`, configs, tests, `package.json`, mem, sprint-history, sibling-register, `audit_workspace/Z*`
- No backend activation
