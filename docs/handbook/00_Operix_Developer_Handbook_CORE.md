# OPERIX · DEVELOPER HANDBOOK
## The single front-door for any engineer joining the project — frontend, backend, or mobile

**Anchor:** Wave-1 freeze `c30f161` · 188⭐ · 33/33 cards active
**Audience:** new developers (all three tracks). **Read this first**, then the card deep-dives for whatever you're assigned.
**Relationship to other docs:** this handbook is the *guided path*. It points to — does not duplicate — `Operix_Architecture_of_Record.md` (charter), `docs/ARCHITECTURE.md` (deep internals + diagrams), and `docs/CODE-CONVENTIONS.md` (conventions). When this handbook and those conflict, the code wins; tell the founder.

---

## PART 0 · WHAT OPERIX IS, AND WHAT IT'S FOR

**The product.** Operix is a compliance-first, modular ERP for India's micro, small and medium enterprises (MSMEs). It unifies finance, operations, manufacturing, sales, people and statutory compliance in one platform — across **33 functional "cards" (modules)** — with Indian compliance (GST, TDS, e-invoice, e-way bill, MCA audit trail) built into the architecture rather than bolted on, mobile apps (OperixGo), and a two-way TallyPrime bridge.

**Who it's for.** Indian SMEs caught between rising mandatory compliance and software that can't keep up — too big for spreadsheets/basic billing, priced out of SAP/NetSuite. Operix is "Tally-class compliance + SAP-class breadth at SME pricing."

**The three-layer naming (important — you'll see all three):**
- **4DSmartOps** — the *vision* (the north-star: the default operating system for Indian SMEs).
- **Operix** — the *project/product* (this codebase, this repo). The ERP. **OperixGo** = the mobile app.
- **Prudent360** — the *brand* it's marketed/sold under.

**Where the project is right now (be clear on this):**
- **Wave 1 = DONE and frozen** (`c30f161`, 188⭐). This is "Tier-L": **everything runs in the browser's `localStorage`. There is no backend yet, and authentication is mocked.** It is a complete, demo/pilot-ready product — *not* production-ready.
- **Wave 2 = the build ahead.** A real self-hosted PostgreSQL backend, server-enforced auth, server-persisted audit trail. Every backend integration point in the code is already marked with a `[JWT]` comment, so Wave-2 is a controlled swap, not a rewrite. 1,434 such seams exist.

**The 30,000-ft architecture (three clean layers):**
```
  Pages (src/pages, src/features)   →  presentation, thin orchestration
        ↑ calls
  Hooks (src/hooks)                 →  React state + side-effects
        ↑ calls
  Engines (src/lib/*.ts)            →  pure business logic, NO UI, NO persistence
        ↓ (today)            ↓ (Wave-2)
  localStorage             /api/* → PostgreSQL
```
Verified scale at freeze: **675,921 LOC · 3,934 files · 612 engines · 916 test files · 328 typed domain files · 1,434 [JWT] seams · 33 active cards.**

---

## PART 1 · DAY ONE — GET IT RUNNING

**Prerequisites:** Node.js 20 LTS, npm, Git. (Windows: work inside WSL2 — see Part 6.)

**Setup:**
```bash
git clone https://github.com/KLDCS-codexcrafter/smart-ops-foundation.git
cd smart-ops-foundation
npm install
npm run dev          # Vite dev server → open the printed localhost URL
```

**The scripts you'll use (from package.json — verified):**
| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server (hot reload) |
| `npm run test` | Vitest (run once) · `npm run test:watch` to watch |
| `npm run lint` | ESLint over the repo |
| `npm run build` | Production build |
| `npm run cap:sync` | Build + sync to mobile (Capacitor) |

**⚠️ THE GOTCHA THAT BITES EVERYONE — memory.** At 600+ engines, `tsc` and `build` OOM with Node's default heap. Always:
```bash
NODE_OPTIONS="--max-old-space-size=7168" npx tsc --build
NODE_OPTIONS="--max-old-space-size=7168" npm run build
```

**The entry path (what you'll see):** `Login` → `Welcome` → an Operix card. On Login, **any password ≥6 characters logs you in** (mock auth) as `tenant_admin`. You land on the **Welcome** hub. From there you open the **Command Center** or any card.

**You're set up correctly when:** `npm run dev` serves the app, you can log in with any 6-char password, you reach the Welcome page with its three tabs, and `npm run test` runs green.

---

## PART 2 · THE APPLICATION WALKTHROUGH (login → welcome → shell → cards)

This is the user journey, verified against the real code. (The **Welcome page** and **Command Center** each also have their own dedicated card deep-dive document — read those for full detail.)

### 2.1 The Login page — `src/pages/auth/Login.tsx`
- **Mock authentication (Wave-1):** `mockLogin()` accepts any credential with a password of **≥6 characters** and returns role `tenant_admin`. Passwords under 6 chars are rejected.
- **Five roles** exist — `super_admin`, `partner_admin`, `customer_user`, `operator`, `tenant_admin` — and **all five route to `/welcome`** (fallback `/erp/dashboard`).
- **`[JWT]` seams** already mark the real endpoints (`POST /api/auth/...`, forgot/reset password) for Wave-2.
- Mobile has its own login surfaces (biometric, QR) — see the mobile track (Part 6) and the mobile files under `src/pages/mobile/`.

### 2.2 The Welcome page — `src/pages/Welcome.tsx`  *(also a card — see its dedicated doc)*
The **post-login hub**. Three tabs:
- **Workspace** — your panels/cards launchpad.
- **Support Ops** — support/ticket operations (CLN1 stub today).
- **Server Ops** — server/infra operations view.
It already names **Prudent360** and includes the **self-serve configurator** (compose ERP cards/modules/add-ons, see a live quote, drop a request into the provisioning queue — checkout/instant-provisioning arrive with Wave-2).

### 2.3 The application shell (what wraps every card)
**Header — `src/components/layout/ERPHeader.tsx`** (two rows, verified):
- **Row 1:** date picker · FY (financial-year) badge · **search (Ctrl+K, cross-card)** · app launcher / department switcher · refresh · data dot · **notification bell** · **Dishani** (AI assistant) · theme toggle · **profile**.
- **Row 2:** breadcrumb · context strip · online dot · environment badge.

**Sidebar — `src/components/layout/AppSidebar.tsx`:** navigation grouped by **hub** (Operations, Ecosystem, …), built by mapping over the panels registry; collapsible.

**Profile / identity — `src/components/auth/UserProfileDropdown.tsx`:** the user menu.

**The active company (entity) — the single most important shell concept.** Operix is multi-tenant/multi-entity. The *currently active company* is resolved everywhere through one canonical reactive hook, **`useEntityCode()`** (`src/hooks/useEntityCode.ts`). Every data read/write is scoped to that entity. **You must always resolve the entity through this hook — never hardcode it.** (See Part 4.)

### 2.4 The 33-card landscape
Cards are the top-level modules, grouped into hubs. The registry (single source of truth) is **`src/components/operix-core/applications.ts`**. The hubs:
- **Ops Hub (13):** Command Center, Procure360, Main Store Hub, QualiCheck, GateFlow, Production, MaintainPro, RequestX, EngineeringX, Department Stores, Vendor Portal, SiteX, Logistics
- **Sales Hub (6):** SalesX Hub, Distributor Hub, Customer Hub, ProjX, WebStoreX, EcomX
- **Fin Hub (6):** Fin Core, Comply360, PayOut, ReceivX, Bill Passing, FP&A / Planning
- **Support Hub (3):** ServiceDesk, TaskFlow, DocVault
- **Plus:** EximX (International Trade), PeoplePay (Pay Hub), Dispatch Hub, FrontDesk, InsightX

**Command Center is the master SSOT hub** — platform-wide masters (org structure, geography, taxes, voucher types, period locks). Other cards render replicas of Command Center data. **Start your reading there** (its card doc is the gold-standard deep-dive).

---

## PART 3 · HOW TO DO COMMON TASKS (worked recipes)

> Golden rule first: **logic goes in an engine, not the page.** Pages call hooks; hooks call engines; engines are pure.

**Recipe A — Resolve the active company (you'll do this constantly):**
```tsx
import { useEntityCode } from '@/hooks/useEntityCode';
function MyPanel() {
  const { entityCode } = useEntityCode();   // ALWAYS at component top level
  // ...use entityCode for all reads/writes
}
```
Never call the hook inside a callback, `useMemo`, IIFE, or JSX expression. Top level only.

**Recipe B — Add a new business calculation → make an engine:**
- Create `src/lib/<domain>-engine.ts`. Export pure functions. No React, no JSX, no `localStorage` writes inside the engine (D-216 — engines never persist; the caller decides).
- Add a JSDoc header (see `docs/CODE-CONVENTIONS.md`) including any `[JWT]` endpoint a Wave-2 caller will hit.
- Write a behavioural test (Recipe E).

**Recipe C — Add a page/panel to a card:**
- Place it under that card's `src/pages/erp/<card>/...` (or `src/features/<card>/...`). Keep it thin — resolve entity via the hook, call engines, render.
- Mention it in the card's routing so the sidebar/router can reach it.

**Recipe D — Add an audited action (compliance):**
- Route the write through the audit-trail engine (`logAudit`) so it's captured in the append-only trail (MCA Rule 3(1)). Importing `logAudit` isn't enough — you must actually call it.

**Recipe E — Write a test the suite will accept:**
- Assert **behaviour**, not brittle exact counts. Use `toBeGreaterThanOrEqual`, not `toBe(N)`.
- The global setup (`src/test/setup.ts`) clears `localStorage`/`sessionStorage` before each test and mocks `ResizeObserver` — don't re-do that.
- Use robust queries (`getByRole`, `queryAllByText`), not brittle `getByText`.

**Recipe F — Touch money:** use the decimal helpers (`dMul`, `dAdd`, `dSub`, `round2`, …) from `@/lib/decimal-helpers`. **Never `Math.round` on currency.**

---

## PART 4 · THE RULES YOU MUST NOT BREAK (and why)

1. **Entity via `useEntityCode()` at top level — always.** Hardcoding an entity (or reading a raw `localStorage` key for it) silently writes one company's data into another's. This is a financial-correctness bug. A repo-wide guard scans `src/pages + src/components + src/features` and asserts **zero** hardcoded-entity reads.
2. **Engines are pure (D-216).** No persistence inside an engine; the caller stores. Keeps logic testable and Wave-2-portable.
3. **Mark every backend touch with a `[JWT]` seam (D-194).** Name the future API in a comment. This is what makes Wave-2 a swap, not a rewrite.
4. **Voucher form pages are ZERO-TOUCH (D-127).** Files under `src/pages/erp/accounting/vouchers/` are not edited without explicit founder justification — they're the audited financial core.
5. **`voucher.ts` / `voucher-type.ts` stay byte-identical across forks (D-128).** Add sibling fields; never rename.
6. **No synthetic/placeholder data on rendered surfaces.** Real reads or an honest empty state — never fake rows.
7. **Money math uses decimal helpers**, never floating `Math.round`.
8. **Tests assert behaviour, not brittle counts.**

The "why" matters: this is a *financial* system. Being wrong costs the customer penalties. The invariants exist to make wrongness structurally hard.

---

## PART 5 · GOTCHAS THAT WILL BITE YOU

- **OOM on tsc/build** → always set `NODE_OPTIONS="--max-old-space-size=7168"`.
- **Hooks in callbacks** → React breaks. `useEntityCode()` (and all hooks) at component top level only. (This was a real past defect — RPT-2e.)
- **`ResizeObserver is not defined` in tests** → it's already mocked in `src/test/setup.ts`; don't add your own.
- **Brittle tests** → exact-count `toBe(N)` assertions break on every data change; use `toBeGreaterThanOrEqual`.
- **Guards have scopes** → an entity-resolution guard only catches what its scan roots cover. When you add a directory, check it's in scope (a real straggler once hid in `src/features` because the guard only scanned `pages`+`components`).
- **localStorage quota** → it's ~5MB; large tenants hit the wall. This is *the* reason Wave-2 exists; don't design new features assuming infinite local storage.
- **"It imported logAudit so it's audited"** → no. The engine must *call* `logAudit`, not just import it.

---

## PART 6 · WORKFLOW, QUALITY GATES & THE THREE TRACKS

**The quality gate (must pass before "done"):**
1. `NODE_OPTIONS=... npx tsc --build` → **0 errors**
2. `npm run lint` (repo-wide, `--max-warnings 0`) → **0 errors / 0 warnings**
3. `npm run test` (scoped to what you touched) → **green**
4. `NODE_OPTIONS=... npm run build` → **PASS**

**Definition of done:** gate passes · behaviour tested · no hardcoded entity · `[JWT]` seams on backend touches · no synthetic data · conventions followed.

**The three developer tracks:**

**Frontend track (Wave-1 codebase).** You work in this repo. Build pages/panels/engines for cards, wire them to `localStorage` today, mark `[JWT]` seams for tomorrow. The frontend builder of record is **Lovable** (cloud); human frontend devs follow the same conventions.

**Backend track (Wave-2 — being built).** A separate self-hosted **PostgreSQL** backend, India-resident (Rule 46(8)). You build `/api/*` endpoints to satisfy the 1,434 `[JWT]` seams, in priority order: **auth → audit-trail → vouchers → masters → reports**. The contract is **OpenAPI per card**. The designated backend tool is **Claude Code** (runs on a real machine with Postgres in Docker). Backend conventions: server-enforce what the client currently trusts (auth, tenant isolation, audit append-only). See `docs/audits/Operix_Wave2_Gate_Punchlist_v1.md` for the 30 gates.

**Mobile track (OperixGo — Capacitor).** Verified: `capacitor.config.ts` → `appId: com.fourdsmartops.operixgo`, `appName: OperixGo`, `webDir: dist`. The mobile app is the **same React codebase shipped to Android/iOS via Capacitor** (~134 mobile-specific files under `src/**/mobile/`), with biometric login, a QR-login path, and an offline queue. Build/sync with `npm run cap:sync`. Mobile-specific surfaces live in `src/pages/mobile/` and `src/components/mobile/`. Mobile parity is a Wave-1 design goal; PWA precache + iOS app-bound-domains hardening are Wave-2 gates (see punch-list). When you build a card surface, consider its mobile capture/approval variant.

**Sprint rhythm (how work is organized):** discrete numbered sprints, each self-seeding a history row in `src/lib/_institutional/sprint-history.ts`; discuss-before-prompt; verify-before-claiming (re-clone + re-run gates before declaring done). Even if you're human, follow the same discipline — it's why the codebase stays clean at this scale.

---

## PART 7 · GLOSSARY & WHERE-TO-LOOK

**Vocabulary:**
- **Card** — a top-level functional module (one of 33). Registry: `applications.ts`.
- **Hub** — a group of cards (Ops/Sales/Fin/Support/…).
- **Engine** — a pure business-logic module in `src/lib/*.ts`.
- **Entity / entity code** — the active company in a multi-tenant context; resolved via `useEntityCode()`.
- **Tier-L** — Wave-1's localStorage-only deployment tier.
- **Wave 1 / Wave 2** — frozen frontend foundation / the backend build ahead.
- **[JWT] seam** — a marked backend-integration boundary.
- **Bucket A/B/C** — multi-tenant key-scoping (global / dual / entity-isolated).
- **D-NNN** — a numbered architectural decision (D-127, D-194, D-216…).
- **Comply360 / Command Center / Fin Core …** — specific cards (each has a deep-dive doc).
- **Dishani** — the in-app AI assistant.
- **SSOT** — single source of truth (Command Center is the master SSOT).

**Where to look:**
| If you need… | Read… |
|---|---|
| The big picture / how to run | this handbook + `Operix_Architecture_of_Record.md` |
| Internal data flows + diagrams + invariants | `docs/ARCHITECTURE.md` |
| Coding conventions in detail | `docs/CODE-CONVENTIONS.md` |
| A specific card | that card's deep-dive document (this series) |
| The Wave-2 plan | `docs/audits/Operix_Wave2_Gate_Punchlist_v1.md` |
| The vision / brand / history | `Operix_4DSmartOps_Vision_and_Reference_Compendium_v1.md` |

---

*Operix Developer Handbook · Core · verified against the codebase at Wave-1 freeze c30f161 · author: Claude on behalf of the Operix Founder. Read alongside the per-card deep-dive series.*
