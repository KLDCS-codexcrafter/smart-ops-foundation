# Operix

**Wave-1 freeze:** commit `cbe2357` · 14 June 2026

Operix is a multi-company Indian ERP (33 functional cards) built as a React + TypeScript single-page app. It is currently Wave-1 / "Tier-L": all data lives in the browser's `localStorage`, there is no backend yet, and authentication is mocked. Every backend integration point is marked with a `[JWT]` seam comment so Wave-2 (a real self-hosted PostgreSQL backend) can be wired in.

**Three layers of naming:**
- **4DSmartOps** — the vision
- **Operix** — this project / product
- **Prudent360** — the brand it is sold under

## Start here

1. [`Operix_Architecture_of_Record_v1.md`](./Operix_Architecture_of_Record_v1.md) — the permanent project charter. Read this first.
2. [`Operix_4DSmartOps_Vision_and_Reference_Compendium_v1.md`](./Operix_4DSmartOps_Vision_and_Reference_Compendium_v1.md) — vision, brand, and origins compendium.

> **New developers:** start with [`docs/handbook/00_Operix_Developer_Handbook_CORE.md`](./docs/handbook/00_Operix_Developer_Handbook_CORE.md) — the developer handbook core, then walk the 34 card deep-dives in `docs/handbook/`.

## Run it

```
npm install
npm run dev        # Vite dev server
npm run test       # Vitest
npm run lint       # ESLint
npm run build      # production build
```

At this scale, type-check and build may need more memory:

```
NODE_OPTIONS="--max-old-space-size=7168" npx tsc --build
NODE_OPTIONS="--max-old-space-size=7168" npm run build
```

## Stack

React 18 · TypeScript 5.8 · Vite 5 · Vitest 3 · Tailwind + shadcn/ui · Capacitor (mobile PWA).
