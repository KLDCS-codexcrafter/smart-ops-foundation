# OPERIX — ARCHITECTURE OF RECORD
### The permanent project charter — for any developer or AI picking up this repository
**Frozen state:** Wave-1 · commit `cbe2357` · 187 ⭐ · 14 June 2026
**Purpose:** This document exists so that **any future human developer or AI can clone this repository and understand the project clearly** — what it is, how it is built, where everything lives, how to run it, and how to change it safely. It is committed at the repository root and is the first thing to read. Updated only at major boundaries (e.g. the Wave-2 freeze).

---

## 0 · TL;DR (read this first)
Operix is a **multi-company Indian ERP** (33 functional cards) built as a React + TypeScript single-page app. It is currently **Wave-1 / "Tier-L"**: all data lives in the browser's `localStorage`, there is no backend yet, and authentication is mocked. It is a complete, navigable, demo-seedable product — every backend integration point is explicitly marked in the code so Wave-2 (a real self-hosted PostgreSQL backend) can be wired in. **It is Wave-2-ready, not production-ready.**

- **Three layers of naming:** **4DSmartOps** = the vision · **Operix** = this project/product · **Prudent360** = the brand it's sold under. (Full detail in `Operix_4DSmartOps_Vision_and_Reference_Compendium_v1`.)
- **Stack:** React 18 · TypeScript 5.8 · Vite 5 · Vitest 3 · Tailwind + shadcn/ui · Capacitor (mobile PWA).
- **Scale at freeze:** 3,934 source files · 916 test files · 612 engines · 33/33 cards active.

---

## 1 · HOW TO RUN IT
```
npm install
npm run dev        # Vite dev server
npm run test       # Vitest (run once)   ·  npm run test:watch for watch mode
npm run lint       # ESLint (repo-wide)
npm run build      # production build
```
**Important gotcha:** the type-check and build can run out of memory at this scale. Use:
```
NODE_OPTIONS="--max-old-space-size=7168" npx tsc --build
NODE_OPTIONS="--max-old-space-size=7168" npm run build
```
The test setup (`src/test/setup.ts`) clears `localStorage`/`sessionStorage` between tests for determinism, and mocks `ResizeObserver`.

---

## 2 · THE ENTRY PATH (the way you encounter the app)

### 2.1 · Login — `src/pages/auth/Login.tsx`
Sign in with a credential + password. In Wave-1 this is **mock auth** (`mockLogin`): any password of **6+ characters** succeeds and returns the role `tenant_admin`. The page also has forgot-password and reset views (`?mode=reset`). Five roles (super_admin, partner_admin, customer_user, operator, tenant_admin) all route to `/welcome`, with `/erp/dashboard` as fallback. Every auth call carries a `[JWT]` seam comment naming the Wave-2 API that will replace it.

### 2.2 · Welcome — `src/pages/Welcome.tsx`
The post-login hub, with three tabs:
- **Workspace** — the gateway into the 33-card ERP (each tile routes to its card).
- **Support Ops** — routes into ServiceDesk.
- **Server Ops** — an operations/infrastructure view.
Unauthenticated visits redirect to `/auth/login`.

### 2.3 · Operix — the 33-card ERP — `src/components/operix-core/applications.ts`
This file is the card **registry** — the source of truth for what cards exist, their routes, and their hub grouping. All 33 are `status: 'active'`:

| Hub | Cards |
|---|---|
| **Ops Hub (13)** | Command Center · Procure360 · Main Store Hub · QualiCheck · GateFlow · Production · MaintainPro · RequestX · EngineeringX · Department Stores · Vendor Portal · SiteX · Logistics |
| **Fin Hub (6)** | Fin Core · Comply360 · PayOut · ReceivX · Bill Passing · FP&A / Planning |
| **Sales Hub (6)** | SalesX Hub · Distributor Hub · Customer Hub · ProjX · WebStoreX · EcomX |
| **Support Hub (3)** | ServiceDesk · TaskFlow · DocVault |
| **Other** | EximX (Intl Trade) · PeoplePay (Pay Hub) · Dispatch Hub · FrontDesk · InsightX |

Card UIs live under `src/pages/erp/<card>/`. Beyond the ERP, the app also routes external portals and platform surfaces: `/partner`, `/customer`, `/vendor`, `/tower` (SaaS Control Tower), `/bridge` (Tally sync console), `/prudent360`, `/build-your-plan` (self-serve configurator), `/operix-go` (mobile PWA).

---

## 3 · REPO MAP (where everything lives)
```
src/
  main.tsx                       app bootstrap
  App.tsx                        top-level routes (every route is wired here)
  pages/
    auth/Login.tsx               the login surface
    Welcome.tsx                  post-login 3-tab hub
    erp/<card>/                  each ERP card's pages (36 dirs incl. shared)
  components/
    operix-core/applications.ts  ⭐ the 33-card registry (routes + hubs)
    ui/                          shadcn/ui primitives
    layout/                      shells, providers (e.g. ERPCompanyProvider)
  lib/                           ⭐ 612 ENGINES — all business logic (pure fns over localStorage)
  hooks/                         React hooks — incl. useEntityCode() (entity resolver)
  contexts/ · shell/             app-wide context + shell chrome
  types/                         shared TS types (incl. prudent360.ts, product-variant.ts)
  data/                          demo-seed data + fixtures
  services/ · features/ · apps/  feature modules + per-app configs
  test/setup.ts                  global test setup (storage clearing, mocks)
  __tests__/                     cross-cutting guard/invariant tests
```
**The mental model:** pages/components are *thin*; all logic is in `src/lib/` engines. To understand what a card *does*, read its engine(s) in `src/lib/`, not its page.

---

## 4 · HOW IT IS BUILT (architecture)

### 4.1 · Two waves
- **Wave-1 (this freeze) — Tier-L.** All state in browser `localStorage`. Single-user, no backend, mock auth. Complete and demo-seedable.
- **Wave-2 (next) — real backend.** Self-hosted **PostgreSQL**, India-resident (Rule 46(8)), Operix owning all API/auth/realtime/storage (decision **DP-P8-2**: Postgres, not Supabase). Backend built in **Claude Code** (own repo, real Postgres in Docker); frontend wiring by **Lovable**; contract = **OpenAPI per card**, ratified at Master Alignment v4.

### 4.2 · The engine layer (`src/lib/`)
612 engine modules hold the business logic as pure functions over localStorage. Each engine's persistence call is the exact point where Wave-1's localStorage becomes Wave-2's API call.

### 4.3 · The entity model — `useEntityCode()` (`src/hooks/useEntityCode.ts`)
Operix is multi-company, so every read/write is scoped to the *active* entity. The canonical resolver is the **`useEntityCode()` hook**, which reads the active company reactively from `useERPCompanyContext`. **578 files** resolve entity through it. A 7-sprint Wave-1 cleanup eliminated every non-canonical entity source (hardcoded constants, stale captures, raw-key reads); at freeze, **zero** non-canonical patterns remain repo-wide.

### 4.4 · The Wave-1 / Wave-2 boundary — the `[JWT]` seam convention
**The most important thing to understand about this codebase:** the backend boundary is marked everywhere. **1,434 files** carry `[JWT]` seam comments, each naming the API that will replace the localStorage call (e.g. `// [JWT] ... POST /api/...`). A further **135 files** carry declared Wave-2 stubs. These are **not gaps** — they are the deliberate line between waves. Read a `[JWT]` comment as "here is exactly where the real backend plugs in."

---

## 5 · HOW TO MAKE A CHANGE (conventions that keep this codebase consistent)
A future developer or AI should follow these — they are the rules the existing 187⭐ of work obeys:
1. **Logic goes in an engine** (`src/lib/<domain>-engine.ts`), not in the page. Pages call engines.
2. **Always resolve entity via `useEntityCode()`** — never hardcode an entity code, never read a raw localStorage key for it. Call the hook **at component top level** (never inside JSX/callbacks/IIFEs).
3. **Mark every backend touch with a `[JWT]` seam comment** naming the future API — don't silently couple to localStorage.
4. **No synthetic/placeholder data on rendered surfaces** — real reads or an honest empty state only.
5. **Tests assert behaviour, not brittle exact counts** — prefer `toBeGreaterThanOrEqual` over `toBe(N)`; the global test setup already clears storage between tests.
6. **Gates before done:** TSC 0 · ESLint repo-wide `--max-warnings 0` · Vitest green · build PASS (with the `NODE_OPTIONS` memory flag).

---

## 6 · HOW IT WAS VERIFIED
Wave-1 closed under a **two-auditor protocol**: an AI builder (Lovable) executes sprints; an independent auditor (Claude) cross-checks every claim against a fresh clone, running gates independently. Across the closing phase, **zero fabricated results passed** — the protocol caught real defects the builder's reports missed (a guard test green over unconverted files; a stale assertion; test-isolation pollution). The freeze passed a **7-of-7 gate**: full suite green (916 files, sharded + run twice for determinism), repo-wide lint clean, TSC 0 (3,934 files), a direct repo-wide grep confirming zero entity-resolution debt, headSha discipline, and a TODO audit. Evidence is recorded in `Operix_Wave1_Freeze_Record_v1`.

**Honest claim:** Wave-1 is **Tier-L-complete and Wave-2-ready** — verified, type-clean, deterministically test-green, entity-correct, well-bounded. It is **not** "production-ready"; the Wave-2 gates below earn that.

---

## 7 · CARRIED-FORWARD WAVE-2 GATES (mandatory before production)
Explicitly NOT certified by the Wave-1 freeze; all must close before real customer data or money flows:
1. **Financial correctness audit** of FinCore / Statutory / Fixed-Assets / Comply360 — Wave-1 render-tested but did not calculation-audit these. Wave-2 must verify the trial balance balances, depreciation matches a hand-computed schedule, GST ties to invoices, and statutory retention matches the law (IT Rule 6F · Companies Act §128 · GST §36).
2. **Real authentication + tenant isolation** — currently mock; untested at the auth layer.
3. **Backend, concurrency, and scale testing** — none exercised in single-user Tier-L.
4. **Security / penetration testing** — a pre-production infrastructure activity.

---

## 8 · GLOSSARY (terms a newcomer will hit)
- **4DSmartOps / Operix / Prudent360** — the vision / this project / the market brand, respectively.
- **Wave-1 / Wave-2** — the localStorage foundation / the real-backend production crossing.
- **Tier-L** — "Tier-localStorage": Wave-1's no-backend, single-user persistence mode.
- **`[JWT]` seam** — a code comment marking a backend integration point and naming its future API.
- **engine** — a pure-logic module in `src/lib/` (the business logic layer).
- **entity / entity-code** — a company/legal entity in the multi-company model; resolved via `useEntityCode()`.
- **⭐ (star)** — an internal banked-sprint counter; "187⭐" is the cumulative count at this freeze.
- **DP-P8-2** — the founder decision selecting self-hosted PostgreSQL for Wave-2.
- **two-auditor protocol** — builder (Lovable) + independent auditor (Claude) cross-checking against a fresh clone.

---

## 9 · COMPANION DOCUMENTS (in the repo)
- **`Operix_Wave1_Freeze_Record_v1`** — the official Wave-1 close-out: the 7/7 gate, deferral-decisions, carried-forward gates. *Read for current state.*
- **`Operix_4DSmartOps_Vision_and_Reference_Compendium_v1`** — vision (4DSmartOps), brand (Prudent360), and the 30 origin reference sources (25 years of Tally/TDL lineage). *Read for the "why" and the history.*

*Operix Architecture of Record · Wave-1 freeze `cbe2357` · 187⭐ · code-verified · drafted by Claude (independent architect/auditor), committed to the repository on behalf of the Operix Founder · to be updated at the Wave-2 boundary.*
