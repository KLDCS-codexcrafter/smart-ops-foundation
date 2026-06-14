# 4DSmartOps · Full 360° Audit

**Generated:** 14 Jun 2026 · IST
**HEAD SHA:** `cbe2357d9`
**Auditor role:** Top 1% Enterprise Software Auditor & QA Architect
**Mandate:** Diagnose only — no code edits, no test runs, no remediation PRs.

---

## Facts Locked (verified on HEAD)

| Fact | Value | Source |
|---|---|---|
| TS/TSX source files | **3,934** | `find src -name '*.ts*' \| wc -l` |
| Total LOC (src) | **155,401** | `wc -l` aggregate |
| Page components | **1,536** | `find src/pages -name '*.tsx'` |
| Hooks | **127** | `find src/hooks` |
| Engines (`*engine*`) | **484** | `find src/lib` |
| Routes registered | **391** | `rg '<Route ' src/App.tsx` |
| Test files | **1,070** | `find … -name '*.test.*'` |
| `[JWT]` REST markers | **1,441** | `rg -c '\[JWT\]' src` |
| `localStorage.*` calls | **4,424** | `rg -c 'localStorage\.' src` |
| `: any` occurrences | **10** | `rg -c ': any' src` |
| `eslint-disable` directives | **372** | `rg -c 'eslint-disable' src` |
| `console.*` in src | **135** | `rg -c 'console\.' src` |
| Production deps / devDeps | **69 / 23** | `package.json` |
| Backend (Supabase / Firebase) | **NOT INSTALLED** | `@supabase/supabase-js`, `firebase` absent |
| `@tanstack/react-query` | **NOT INSTALLED** | `package.json` |
| `vite-plugin-pwa` / `workbox-*` | **NOT INSTALLED** | manual SW in `public/sw.js` instead |
| Capacitor 6 (core/android/ios) | **Installed** | `^6.0.0` |
| `playwright` runner | **NOT INSTALLED** | `@playwright/test` present, no runner script |

**Backend Status (locked, do not penalise):** Phase 1 = **localStorage only with `[JWT]` markers at every boundary** per `docs/ARCHITECTURE.md §D-194`. Phase 2 (REST + Postgres) is intentionally deferred. Findings below are scored against a **Phase-1 prototype targeting Beta → Production migration**, not against a live multi-tenant SaaS.

---

## 1. Executive Summary

| Score | Value | Rubric |
|---|---|---|
| **Overall system health** | **6.5 / 10** | Strong frontend discipline + huge feature surface, but persistence layer is browser-local |
| **Production-readiness** | **3.0 / 10** | Cannot serve multi-tenant prod without backend; SSO/RBAC/audit-server missing |
| **Architecture maturity** | **7.5 / 10** | Clear D-127/D-128/D-194/D-216 invariants, panel separation, engine purity |
| **Code-quality** | **8.0 / 10** | Only 10 `: any`, mock-data discipline strong, TS-strict-friendly |
| **Test discipline** | **7.0 / 10** | 1,070 test files, deterministic seed/cleanup post-CL-FREEZE, grep-guards for regressions |

### Key Risks (one-liners)

1. **No backend** — every byte lives in `localStorage` (4,424 call sites). At ~5 MB browser quota, an active mid-size tenant **will hit quota** in production.
2. **No real auth** — mock JWT only; any user can mint admin session by editing devtools.
3. **No server-side audit log** — MCA Rule 3(1) "tamper-evident" claim is local-only; trivially deletable.
4. **391 routes, 1,536 pages, no route-level code-splitting beyond vendor chunks** — initial bundle risk un-measured (no Lighthouse run on HEAD).
5. **Manual `sw.js`** instead of Workbox — kill-switch in place for preview hosts but no precache manifest = first-visit offline is empty.

---

## 2. Critical Findings (Must Fix Before Production)

| # | Issue | Impact | Affected Area | Risk | Recommendation |
|---|---|---|---|---|---|
| C-1 | Persistence is `localStorage` only (4,424 call sites, 1,441 `[JWT]` swap markers but no server) | Data loss on cache clear; no cross-device; per-tenant isolation enforced only client-side; quota = ~5 MB | All hubs (FinCore, Inventory, ProcureHub, SalesX, Pay-Hub) | **CRITICAL** | Activate Lovable Cloud, generate `/api/*` per `[JWT]` markers, migrate writes through `ls<T>` helper without changing call sites |
| C-2 | No real authentication or authorization | Any visitor can impersonate any role; user_roles table exists in spec but is mocked | `src/pages/auth/`, `useCurrentUser.ts` | **CRITICAL** | Stand up real auth, store roles in `user_roles` table per project memory rule, gate routes with server-validated JWT |
| C-3 | Audit trail (MCA Rule 3(1)) is browser-local — `erp_audit_trail_<entity>` | "Tamper-evident" claim cannot survive devtools edit; non-compliant with MCA on prod | `audit-trail-engine`, `MonthlyProductionAccounts` | **CRITICAL** | Server-side append-only log with HMAC chain; the FNV-1a chain in `voucher-integrity-hashing` is a good local prototype but is not auditor-grade |
| C-4 | Storage-quota engine guards writes but no eviction strategy for transactional data | Once quota hit, posts will silently fail (intent=`audit_trail` always allowed, others can reject) | `storage-quota-engine`, all voucher writers | **CRITICAL** | Move transactional data off-client; keep only UI state + sync-queue on device |
| C-5 | Service worker has **no precache for app shell JS/CSS** (only `manifest.webmanifest` + `favicon.ico`) | First-load offline = blank page; "PWA" claim partly false | `public/sw.js` lines 47–50 | **CRITICAL** for PWA / **HIGH** for web-only | Adopt Workbox or `vite-plugin-pwa` to generate precache manifest at build |
| C-6 | `391 <Route>` in single `App.tsx` with vendor-chunked but not page-chunked builds | Untested cold-start latency; risk of >2 MB initial JS | `src/App.tsx`, `vite.config.ts` | **HIGH→CRITICAL on mobile** | Lazy-load page modules with `React.lazy` per hub; measure with `vite build --report` |

---

## 3. High / Medium / Low Findings

### HIGH

| # | Issue | Why it matters | Business impact | Recommendation |
|---|---|---|---|---|
| H-1 | No `@tanstack/react-query` despite memory rule listing it as core | Memory rule violated; manual cache invalidation everywhere | Stale UI, double-fetch when backend lands | Add React Query before Phase 2 cutover; standardise data layer |
| H-2 | 372 `eslint-disable` directives | Each is a swept-under-rug rule | Hidden bug surface; CL-arc has already paid the cost of grep-guards | Convert to focused suppressions with TODO refs to sprint codes |
| H-3 | 135 `console.*` calls in `src/` | Leaks in prod build; PII risk | Logging discipline gap | Strip via Vite `define` or replace with a structured logger gated by env |
| H-4 | `splashFullScreen: true` + `splashImmersive: true` with manual hide unspecified | iOS/Android splash can hang if `SplashScreen.hide()` isn't called from React mount | App-launch UX fail on production builds | Add `await SplashScreen.hide()` after first paint in `main.tsx` |
| H-5 | `limitsNavigationsToAppBoundDomains: false` on iOS | Wider web nav surface = larger phishing/redirect attack vector inside webview | App-Store reviewer may flag | Set `true` and whitelist required domains |
| H-6 | `allowMixedContent: false` ✓ but `androidScheme: 'https'` with no certificate-pinning | MITM possible on hostile networks | Confidentiality of business data | Add network-security-config pinning once Phase 2 lands |
| H-7 | 1 single `App.tsx` likely large; no error boundary verified per route | One render crash = whole hub white-screens | Operator productivity loss | Wrap each hub route in `<ErrorBoundary>` |
| H-8 | Mock-data discipline is good but seeds run unconditionally in test setup (`localStorage.clear()` in global afterEach) | Any production code path that depends on storage at module-init time becomes a hidden ordering dependency | Phase-2 migration risk | Move seeds inside `beforeEach` of dependent tests only |

### MEDIUM

| # | Issue | Recommendation |
|---|---|---|
| M-1 | 484 files matching `*engine*` — engine pattern is a strength but **no central engine registry** | Add `src/lib/_engines/index.ts` barrel with dependency-direction lint |
| M-2 | `decimal.js@10.4.3` pinned exact ✓ but `Money Math Precision` rule not enforced by an ESLint rule | Add custom ESLint rule banning `Number()` on currency keys |
| M-3 | i18next + react-i18next installed but only Hindi/English per memory | Add ICU plural/gender support before second locale |
| M-4 | `recharts ^2.15.4` known to be heavy (~120 KB gz) | Tree-shake; consider visx for high-frequency dashboards |
| M-5 | No CI config visible in tree | Add GitHub Actions / Lovable CI step for `tsc --noEmit` + `vitest run` + `eslint --max-warnings 0` |
| M-6 | `pdfjs-dist@5.6.205` + `jspdf` + `xlsx@0.18.5` — `xlsx` has known prototype-pollution history | Migrate to `exceljs` or pin via patch |
| M-7 | `bundledWebRuntime: false` — Capacitor 6 default — but no `cordova` shim audit | Document plugin compatibility matrix |
| M-8 | `webContentsDebuggingEnabled: false` ✓ for release but flag is single-value not env-gated | Use `process.env.NODE_ENV` switch |

### LOW

- L-1 SVG icons only in manifest — Android < 8 may not render. Ship PNG fallbacks (192/512).
- L-2 `start_url: '/mobile/'` correct for OperixGo PWA, but no `id` field — install prompt may duplicate.
- L-3 No `screenshots[]` in manifest → no rich install prompt on Android Chrome.
- L-4 `theme_color` (#F97316) ≠ Capacitor `StatusBar.backgroundColor` (#1E3A5F) — visual mismatch.
- L-5 `dist/` is `webDir` but Vite default — confirm `cap sync` runs after every build in release pipeline.

---

## 4. System Strengths (preserve)

1. **D-127 zero-touch discipline** on `src/pages/erp/accounting/vouchers/` — proven streak of 4 sprints. Excellent change-control culture.
2. **D-194 `[JWT]` markers at 1,441 sites** — Phase-2 migration is a search-and-replace job, not a rewrite. Rare and valuable.
3. **D-216 pure engines** — 484 engine files with no persistence side-effects = high testability.
4. **Multi-tenant key scoping** (Bucket A/B/C in ARCHITECTURE.md) — entity isolation pattern is clearer than most early-stage SaaS.
5. **Test isolation hotfix** (T-FREEZE-FIX) — global storage reset in `setup.ts` proves engineering discipline around determinism.
6. **Sprint-history + sibling-register** institutional memory — most teams lack this until Series-B.
7. **MCA Rule 3(1), CGST 56(8)/56(12) awareness** baked into engine names — audit-readiness mindset is present.
8. **Indian-locale strictness** (₹, paise integers, IST, DD MMM YYYY, lakhs) — no $-leak in code, no lorem ipsum.
9. **Service-worker kill-switch for preview hosts** — shows operational maturity after the S152.T4 brick incident.
10. **Decimal.js + banker's rounding contract** — finance math is correct, not naive `Number`.

---

## 5. Risk Heatmap

| Dimension | Risk | Notes |
|---|---|---|
| **Architecture** | 🟡 Medium | Strong invariants; weak only because Phase-2 boundary is theoretical |
| **Security** | 🔴 High | No real auth, no server validation, audit log local-only |
| **Performance** | 🟡 Medium | 391 routes un-chunked; no Lighthouse evidence on HEAD |
| **Data** | 🔴 High | localStorage quota is a wall, not a runway |
| **UX** | 🟢 Low-Medium | Dark-mode discipline, shadcn-only library, mock data is Indian-realistic |
| **Compliance** | 🟠 High | MCA/CGST hooks exist but enforcement is client-side |

---

## 6. Future Risk Predictions

1. **At ~50 entities × 12 months of vouchers**, localStorage quota will be exceeded on Chrome desktop (~5 MB). Silent write failures will erode trust before any error surfaces.
2. **On Android low-memory kill**, the webview is destroyed; without a sync-queue persisted in `@capacitor/preferences` (installed but usage unverified), in-flight mutations are lost.
3. **When Phase-2 backend lands**, the 4,424 `localStorage.*` call sites will need to be migrated through `ls<T>` helper — if any bypass it, race conditions between local cache and server become a multi-month debugging tail.
4. **Bundle bloat** — at 1,536 page components, even at 5 KB each gzipped you're at ~7.5 MB JS without lazy-loading. Cold start on mid-tier Android (4G) will exceed 8 s LCP.
5. **Test-suite drift** — 1,070 test files mostly grep-guards; behavioural coverage of business logic (e.g. GST RCM, intercompany reciprocity) is not measurable without a coverage report. Refactor courage will erode.
6. **Capacitor 6 → 7 upgrade** — `bundledWebRuntime` is deprecated in 7; plugin API changes will require touchups across 11 installed `@capacitor/*` packages.
7. **MCA audit** — if a regulator asks for tamper-evident logs today, the localStorage chain is indefensible. Reputational risk > technical risk.

---

## 7. Production Readiness Verdict

# ⚠️ Conditionally Ready (Beta-grade)

- **For an internal demo / pilot tenant on a single device:** ready.
- **For multi-tenant prod, paying customers, or regulator-facing claims:** **not ready** until backend, real auth, and server-side audit-log land.

---

## 8. Strategic Recommendations (Top-1% Level)

### 8.1 Architectural

1. **Activate Lovable Cloud** as the first Phase-2 step. Migrate `[JWT]`-marked endpoints in priority order: auth → audit-trail → vouchers → masters → reports.
2. **Introduce a thin `dataLayer` abstraction** so `ls<T>` and `api<T>` share a signature. Call sites stay identical; only the import path changes.
3. **Split `App.tsx`** — one router per hub, code-split at hub boundary, share a tiny app-shell.
4. **Promote the engine layer to a workspace package** (`packages/engines/`) so Phase-2 server can import the same pure functions without React.

### 8.2 System Design Upgrades

5. **Server-side append-only audit ledger** with monthly Merkle-root anchored to a public timestamping service — that closes MCA Rule 3(1) defensibly.
6. **Move sync-queue to `@capacitor/preferences`** (already in deps) so OS-kill survival is real.
7. **Replace manual `sw.js`** with `vite-plugin-pwa` (Workbox under the hood); keep the preview-host kill-switch via runtime config.

### 8.3 Long-term Maintainability

8. **Eliminate the 372 `eslint-disable`** in a tracked sprint; each one is a future debugging hour.
9. **Add a coverage gate** to CI (`vitest --coverage` ≥ 70 % on `src/lib/`). Grep-guards are necessary but not sufficient.
10. **Introduce ADRs** (`docs/adr/NNN-*.md`) for every D-NNN invariant. The discipline is in code-review memory today — that doesn't scale past the founding team.

### 8.4 Enterprise Best Practices

11. **SOC2-readiness checklist** (access review, change management, vulnerability scan, vendor risk) — start a 12-month evidence file now; auditors only count what was logged ≥ 6 months in advance.
12. **Disaster-recovery rehearsal** — when backend lands, schedule quarterly restore tests on a hidden tenant.
13. **Bug-bounty soft-launch** at Beta — even un-paid, external eyes will find what internal grep cannot.

---

## Method Appendix

### Commands executed
```
git rev-parse --short HEAD                            # cbe2357d9
find src -type f \( -name '*.ts' -o -name '*.tsx' \) | wc -l
find src -type f \( -name '*.ts' -o -name '*.tsx' \) -exec wc -l {} +
find src/pages -name '*.tsx' | wc -l
find src/__tests__ src -name '*.test.*' -type f | wc -l
find src/hooks -type f | wc -l
rg -c '\[JWT\]' src
rg -c 'localStorage\.' src
rg -c ': any' src
rg -c 'eslint-disable' src
rg -c 'console\.(log|warn|error)' src
rg -c "from ['\"]firebase" src
rg -c "from ['\"]@supabase" src
node -e "deps + devDeps enumerate"
rg -c '<Route ' src/App.tsx
find src/lib -maxdepth 2 -name '*engine*' -type f
ls capacitor.config.ts public/sw.js public/manifest.webmanifest vite.config.ts
ls supabase                                            # absent
```

### Files cited in critical findings
- `capacitor.config.ts` (all)
- `public/sw.js` (47–50, kill-switch, network-first navigations)
- `public/manifest.webmanifest`
- `vite.config.ts` (manualChunks)
- `package.json` (deps inventory)
- `docs/ARCHITECTURE.md` (D-127, D-128, D-194, D-216, MCA Rule 3(1))
- `src/hooks/useEntityCode.ts`
- `src/hooks/useEntityList.ts`
- memory: `mem://architecture/multi-tenant-key-scoping`, `mem://architecture/data-layers`

### Did NOT do (out of scope by mandate)
- No `vite build` or production bundle inspection
- No `vitest run` or coverage report
- No browser/Lighthouse run on preview
- No Playwright execution
- No edits to `src/`, `tests/`, configs, `package.json`, mem, sprint-history, sibling-register, `audit_workspace/Z*`
- No Lovable Cloud activation, no Supabase provisioning
- No CVE-database lookup (would need `npm audit` run — see Doc 3 §6 for posture review)
- No license-compliance scan
