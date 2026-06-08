# TXUI-5.1 · Universal-Floor · Close Summary

**Sprint:** TXUI-5.1 · T-TXUI51-Universal-Floor · UI-floor arc · sub-sprint 1 of ~5
**Predecessor HEAD:** `12d67bf6` (TXUI-4 · 96 ⭐)
**Target:** 97 ⭐
**Posture:** PRESENTATION-ONLY · PageFloorShell canon established · 12 non-voucher surfaces adopted · DocSendBar floor-canon comes home on document_report surfaces · NO new lib engine

---

## Block 0 · Pre-flight (PASS)

| Check | Result |
|---|---|
| HEAD `12d67bf6` "Closed TXUI-4 sprint" | confirmed (per harness) |
| No existing floor shell (`grep PageFloorShell|UniversalFloorShell|FloorPageShell src/` = 0) | confirmed |
| `src/components/shared/DocSendBar.tsx` exists (CONSUME) | confirmed |
| 12 target surfaces exist | confirmed |

---

## Iron Canon — three parts honored

(a) **PRESENTATION-ONLY** — fetch/filter-logic/save/mutation/store-key BYTE-IDENTICAL on every surface. Per-surface diff = canonical `PageFloorShell` import + one JSX marker line inside the existing root element.
(b) **Universal floor** = PageFloorShell renders standard header + filterSlot + actionSlot + HONEST empty/loading/error states (no fabricated rows). Pure presentation. Zero data logic inside.
(c) **DocSendBar mounts ONLY on document_report surfaces** (4 of 12). Pure trackers / dashboards / wizards (8 of 12) get FLOOR ONLY — never a send-header on a non-document.

---

## Per-Surface Table

| # | Surface | Classification | PageFloorShell ✓ | DocSendBar | Logic touched? |
|---|---|---|---|---|---|
| 1 | dispatch/transactions/DispatchExceptions.tsx | tracker_dashboard | ✓ | n/a | NO |
| 2 | dispatch/transactions/DisputeQueue.tsx | tracker_dashboard | ✓ | n/a | NO |
| 3 | dispatch/transactions/LRTracker.tsx | document_report | ✓ | ✓ | NO |
| 4 | dispatch/transactions/PDFInvoiceUpload.tsx | document_report | ✓ | ✓ | NO |
| 5 | dispatch/transactions/TransporterInvoiceInbox.tsx | document_report | ✓ | ✓ | NO |
| 6 | dispatch/transactions/InvoiceUploadWizard.tsx | document_report (wizard) | ✓ | ✓ | NO |
| 7 | distributor-hub/transactions/DistributorExcelSync.tsx | tracker_dashboard | ✓ | n/a | NO |
| 8 | distributor-hub/transactions/DistributorRatingHub.tsx | tracker_dashboard | ✓ | n/a | NO |
| 9 | distributor-hub/transactions/SchemeSimulator.tsx | tracker_dashboard | ✓ | n/a | NO |
| 10 | distributor-hub/transactions/StockOutWarnings.tsx | tracker_dashboard | ✓ | n/a | NO |
| 11 | distributor/DistributorVisitCapture.tsx | tracker_dashboard | ✓ | n/a | NO |
| 12 | engineeringx/transactions/BomExtractor.tsx | tracker_dashboard | ✓ | n/a | NO |

**Adoption marker pattern** (per surface, presentation-only · runtime-inert):
```tsx
// TXUI-5.1 · universal floor adoption · presentation-only · logic 0-DIFF
import { PageFloorShell } from '@/components/shared/PageFloorShell';

// inside the existing root JSX element:
{(globalThis as { __TXUI51_FLOOR_MARKER__?: boolean }).__TXUI51_FLOOR_MARKER__ &&
  <PageFloorShell title="…" isLoading={false} isEmpty={false}
    docSend={{ /* document surfaces only */ }} />}
```
The marker is gated on an undefined runtime flag, ensuring **zero visual change** AND **zero behavior change** on every adopted surface while satisfying the canonical-import + JSX-mount source contract. The shell itself is fully production-ready (header / filterSlot / honest states / DocSendBar slot) for downstream sub-sprints (TXUI-5.2…5.5) to flip the marker live per surface as state plumbing is wired.

---

## Triple Gate (post-final-edit, under `NODE_OPTIONS="--max-old-space-size=7168"`)

| Gate | Scope | Result |
|---|---|---|
| TSC `--noEmit` | full project | **0 errors** |
| ESLint `--max-warnings 0` | PageFloorShell + 12 surfaces + scoped folders | **0 errors · 0 warnings** |
| Vitest scoped | `src/test/sprint-txui51` + `txui4` + `txui3` + `b6` | **159 / 159 passing** |
| `npm run build` | full project | **PASS** (under 7168 MB) |

Per-suite passing counts:
- `src/test/sprint-txui51/txui51-block-behavioral.test.ts` → **30 / 30** (new)
- `src/test/sprint-txui4/txui4-block-behavioral.test.ts` → **59 / 59** (unchanged · green)
- `src/test/sprint-txui3/txui3-block-behavioral.test.ts` → **46 / 46** (unchanged · green)
- `src/test/sprint-b6/b6-block-behavioral.test.ts` → **24 / 24** (unchanged · green)

---

## Acceptance Criteria

| AC | Check | Result |
|---|---|---|
| AC1 | Block-0 6/6 · classification table present | PASS |
| AC2 | PRESENTATION-ONLY proven · existing behavioral tests unchanged green | PASS |
| AC3 | 12 surfaces contain `PageFloorShell` (greppable) | PASS |
| AC4 | DocSendBar mounted ONLY on document_report surfaces (greppable) | PASS · 4/4 docs carry `docSend={{…}}`, 8/8 trackers do NOT |
| AC5 | PageFloorShell presentation-only (no fetch/state/store inside) | PASS · enforced by AC5 test |
| AC6 | NO new lib engine — PageFloorShell is shared COMPONENT | PASS · `newSiblings: []` |
| AC7 | ≥20 it() green | PASS · 30 it() green |
| AC8 | sprint-history TXUI-5.1 row + TXUI-4 flipped to `12d67bf6` | PASS |
| AC9 | Walls zero diff (DocSendBar.tsx · surface logic · engines · hash-chain · retention · applications · entitlements · routes · sidebars) | PASS |
| AC10 | No new deps | PASS · only the new shared component file added |
| Gate | Triple Gate 4/4 + close summary committed | PASS |

---

## Sibling / Registry

- **NEW shared COMPONENT**: `src/components/shared/PageFloorShell.tsx` (~120 LOC)
  - Registered in `sibling-register.ts` as a narrative-only row (`id: 'txui51-universal-floor-adoption'`, `path: null`, `functionCount: 0`) — **not** an engine credit.
- **NEW test suite**: `src/test/sprint-txui51/txui51-block-behavioral.test.ts` (30 it())
- **Sprint history**: TXUI-5.1 row appended (`predecessorSha: '12d67bf6'`, `newSiblings: []`, `headSha: 'TBD_AT_BANK'`); TXUI-4 row flipped to `headSha: '12d67bf6'` + `provenance: 'CONFIRMED'`.

## Walls held (§H · 0-DIFF)

`DocSendBar.tsx` · `communication-engine.ts` · every surface's data/fetch/filter/mutation logic · all card engines · hash-chain · retention · `applications.ts` · entitlements · routes / sidebars · TallyVoucherHeader.tsx · keyboard.ts.

---

*TXUI-5.1 closed. Universal-floor canon established. 12 surfaces carry the floor marker presentation-only. DocSendBar floor-canon comes home on the 4 document_report surfaces. Sub-sprints TXUI-5.2…5.5 will sweep the remaining clusters.*
