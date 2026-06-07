# WMS3 · T-WMS3-Manifest-Ship · WMS-ARC CLOSE — Close Summary

**Sprint:** WMS3 · T-WMS3-Manifest-Ship · WMS-ARC 3 of 3 · **ARC CLOSE**
**Predecessor HEAD:** `bdd4c6ec` ("Completed WMS2 sprint")
**Authority:** WMS_ARC_Step1_Alignment_v1 canons 1·3·5 (export half) · founder DP "W3 agreed"
**Target:** 89 ⭐ (post-WMS2 86→89 ⭐ · ARC CLOSE)

---

## Block 0 · Pre-flight (paste · zero code first)

```
$ git log -1 --format='%H %s'
bdd4c6ec2eced442e9d2c9403b194a39ef04d4da Completed WMS2 sprint
```
HEAD matches predecessor `bdd4c6ec` ✅

```
$ grep -rln "wms-manifest\|PackageTypeMaster\|ToleranceGroup\|manifestsKey" src/
(no matches)
```
Greenfield confirmed (egm.ts = EximX customs EGM, unrelated · WALL) ✅

**Reuse spine (READ-ONLY unless allowlisted):**

| File | Used as |
|---|---|
| `src/types/logistic-portal.ts` (LRAcceptance + `lrAcceptancesKey`) | Pattern template for ManifestAck |
| `src/lib/dispute-workflow-engine.ts` (`createDisputeFromMatch(match, logisticId, logisticName, raisedBy, reason?)`) | Consumed for tolerance breach · never modified |
| `src/types/transporter-invoice.ts` (`PayerModel`) + `transporter-rate.ts` | Type substrate for synthesized MatchLine |
| `src/types/export-dispatch-mirror.ts` (`ExportDispatchMirror` + `exportDispatchMirrorKey`) | READ-ONLY context for export shipment build |
| `src/types/packing-slip.ts` + `wms-pick-pack.ts` (`packGroupsKey`) | Manifest feeds from packed groups |
| `src/types/voucher.ts:199` (`transporter_id`) | Transporter identity field |

**Logistic panel routing (App.tsx ~802-808):** seven `/erp/logistic/*` routes registered (login, dashboard, invoices/new, lr-queue, payments, disputes, profile). New WMS3 route joins this pattern: `/erp/logistic/manifest-queue`.

**W1/W2 Warehouse module pattern:** DispatchHubSidebar `dh-w-*` module union with collapsible "Warehouse" section. WMS3 adds `dh-w-manifest-console`.

**Scoped Vitest baseline (pre-edit · 10 files / 230 tests):** p83 (2) · p84 (3) · p85 (1) · p86 (1) · p87 (1) · wms1 (1) · wms2 (1).

---

## §5 · Item Disposition

| # | Item | Status |
|---|---|---|
| 1 | `src/types/wms-manifest.ts` (170 LOC) | ✅ created · 5 type unions + 5 keys |
| 2 | `src/lib/wms-manifest-engine.ts` (~500 LOC) — **sole new SIBLING** | ✅ created · 14 exports |
| 3 | `src/pages/erp/dispatch/wms/ManifestConsole.tsx` (~320 LOC) | ✅ created · honesty line verbatim |
| 4 | `src/pages/erp/logistic/LogisticManifestQueue.tsx` (~170 LOC) | ✅ created · ack-only writes |
| 5 | `src/pages/erp/eximx/export/ExportDispatchList.tsx` rider (~25 LOC) | ✅ read-only badge · no setItem · no other EximX file touched |
| 6 | `src/test/sprint-wms3/wms3-block-behavioral.test.ts` (30 it()) | ✅ all green |
| 7 | sprint-history + sibling-register + close summary (this file) | ✅ committed |

---

## Triple Gate (post-final-edit · paste from real run)

**TSC** — `NODE_OPTIONS="--max-old-space-size=7168" npx tsc --noEmit` → **exit 0** (no output).

**ESLint** — `NODE_OPTIONS="--max-old-space-size=7168" npx eslint . --max-warnings 0` → **exit 0** (after fixing 4 useMemo deps warnings via `void version` pattern).

**Vitest scoped** — `npx vitest run src/test/sprint-wms3 src/test/sprint-wms2 src/test/sprint-wms1 src/test/sprint-p83 src/test/sprint-p84 src/test/sprint-p85 src/test/sprint-p86 src/test/sprint-p87`:
```
 Test Files  11 passed (11)
      Tests  260 passed (260)
   Duration  4.31s
```
(+30 new WMS3 tests · 230 baseline preserved)

**Build** — `NODE_OPTIONS="--max-old-space-size=7168" npx vite build` → ✓ built in 1m 15s.

---

## §L · Decisions (with rationale)

| Decision | Choice | Why |
|---|---|---|
| Tolerance edge semantics | Breach requires **BOTH** pct AND abs exceeded | Founder DP "W3 agreed". The pct-passes-abs-fails edge test asserts NO dispute fires — this prevents an absolute-only false positive on heavy shipments where a tiny absolute error still passes pct. |
| Within-tolerance handling | Recorded on `manifest.accepted_variance` (never silent) | AC7: zero silent write-offs. Operator can see exactly how much was accepted and against which thresholds. |
| Manifest retention bucket | `gst_8yr` | Manifest is an e-way / GST-adjacent transport doc. Shipment + manifest-ack are operational lifecycle → `operational_log_only`. |
| Ack flow | LR-acceptance pattern verbatim · `acknowledgeManifest` is the only Logistics-side write surface | Mirrors `lrAcceptancesKey` ledger semantics. AC6: LogisticManifestQueue greps zero `localStorage.setItem(...)` calls (verified via comment-stripping test). |
| Dispute synthesis | Build a `MatchLine` wrapper and call `createDisputeFromMatch` | Existing dispute engine is consumed unchanged. The synthesized MatchLine carries the manifest id in `lr_no` + `expected_amount`/`declared_amount` reused as declared-kg / billed-kg so the dispute carries human-readable context. |
| EximX export-flip surface | Dispatch-side `getManifestForExportPO` consumed by the 25-LOC `ExportDispatchList.tsx` rider | Single-Door canon 5 export half. Mirror becomes a read; ExportDispatchMirror + its bridge stay 0-DIFF. |

---

## WMS-ARC CLOSE table · W1 / W2 / W3

| Wave | Sprint | New SIBLING | Console pages | Single-Door canon proof | New record types (P8.6 floor) |
|---|---|---|---|---|---|
| **W1** | WMS1 · Pick-Pack | `wms-pick-pack-engine` | PickingConsole · PackingConsole | All sources via `ordersKey` ONLY (no ecOrdersKey / wsStoreOrdersKey reads) | picklist · pack-group → `operational_log_only` |
| **W2** | WMS2 · Putaway-ASN | `wms-putaway-engine` | PutawayConsole · ShelfView | `generateAsnFromImportPO` writes ZERO EximX keys (importPOKey + billOfEntryKey READ-ONLY) | asn · bin-placement → `operational_log_only` |
| **W3** | WMS3 · Manifest-Ship · **ARC CLOSE** | `wms-manifest-engine` | ManifestConsole + LogisticManifestQueue | `createExportShipment` writes ZERO EximX keys (export PO + dispatch-mirror READ-ONLY) · `getManifestForExportPO` is the flip read API | manifest → `gst_8yr` · shipment + manifest-ack → `operational_log_only` |

**WMS-ARC CLOSED · W1→W3 · 86→89 ⭐ · Single-Door canon fully realized:** all sources picked (W1) · imports through Dispatch inward (W2) · exports through Dispatch manifests (W3) · **Uniware floor-parity hole closed.**

---

## §6 · Acceptance Criteria (12 of 12)

- **AC1** Block-0 6/6 ✅ (HEAD · greenfield · reuse spine · logistic routes · WMS pattern · vitest baseline)
- **AC2** EximX zero line-diff EXCEPT 25-LOC rider in `ExportDispatchList.tsx` · grep `setItem` in rider = 0 ✅
- **AC3** floor fields on Manifest + Shipment (retention_policy + created_by born at create) ✅
- **AC4** ONE engine + register row (`wms-manifest-engine` · sibling-register entry committed) ✅
- **AC5** retention diff = three additive cases (manifest · shipment-operational · manifest-ack) ✅
- **AC6** Manifest one-write: LogisticManifestQueue contains zero direct `localStorage.setItem(` calls (test asserts via comment-stripped source) ✅
- **AC7** tolerance breach = BOTH thresholds → existing dispute engine consumed (never modified) · within tolerance recorded as accepted_variance · zero silent write-offs ✅
- **AC8** honesty line verbatim on ManifestConsole: "Courier label generation, live tracking and e-way bill integration arrive with Wave-2." ✅
- **AC9** ≥22 it() green · **30 passing** ✅
- **AC10** history self-seed + WMS2 flipped to `bdd4c6ec` + arc-close declaration present ✅
- **AC11** walls zero diff: `egm.ts` · `export-dispatch-bridge.ts` · `export-dispatch-mirror.ts` · `dispute-workflow-engine.ts` · packing engines · W1/W2 deliverables · hash-chain pair · logAudit entry-write · comply360 retention · P8.6 console · applications · entitlements ✅
- **AC12** no new deps · Triple Gate 4/4 · close summary committed ✅

---

## §H · Walls + Allowlist (verified)

**Walls (0-DIFF):** `src/types/egm.ts` · `src/lib/export-dispatch-bridge.ts` · `src/types/export-dispatch-mirror.ts` · all other EximX files · `src/lib/dispute-workflow-engine.ts` · existing Logistics pages (new page only) · packing-bom-engine · packing-slip-engine · W1/W2 deliverables · `audit-trail-hash-chain.ts` + `audit-trail-chain-engine.ts` · `logAudit` entry-write · `comply360-audit-retention-engine.ts` · `RetentionConsolePage.tsx` · `applications.ts` · entitlements.

**Allowlist (touched):** NEW `src/types/wms-manifest.ts` · NEW `src/lib/wms-manifest-engine.ts` · NEW `src/pages/erp/dispatch/wms/ManifestConsole.tsx` · NEW `src/pages/erp/logistic/LogisticManifestQueue.tsx` · `src/App.tsx` (one route) · `src/pages/erp/logistic/LogisticDashboard.tsx` (one nav card) · `src/pages/erp/dispatch/DispatchHubSidebar.tsx` (additive) · `src/pages/erp/dispatch/DispatchHubPage.tsx` (additive) · `src/pages/erp/eximx/export/ExportDispatchList.tsx` (Item-5 rider only) · `src/lib/record-retention-policy-engine.ts` (3 additive cases) · `src/lib/_institutional/sprint-history.ts` · `src/lib/_institutional/sibling-register.ts` · NEW `src/test/sprint-wms3/` · NEW `audit_workspace/WMS3_close_evidence/`.

---

*WMS3 close summary · 2026-06-07 · WMS-ARC CLOSES HERE · author: Lovable agent on behalf of Operix Founder.*
