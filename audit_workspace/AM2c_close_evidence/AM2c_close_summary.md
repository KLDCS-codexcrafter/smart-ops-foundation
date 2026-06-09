# AM.2c · T-AM2c-OperixGo-Captures · Close Summary

**Predecessor HEAD:** `0f8e8069` (AM.2 banked · 116 ⭐)
**Target:** 117 ⭐ · ~900 LOC · NO new SIBLING (consume-only)
**Authority:** operix-go honest study — SiteX / MaintainPro / ShopFloor landings closed, GateFlow-legacy DEAD.

---

## Scope delivered

1. **GateFlow-legacy (planned) tile REMOVED** from `OperixGoPage.MOBILE_PRODUCTS`
   (superseded by live `gate-guard`).
2. **3 landings flipped `phase2 → live`**:
   - `site-engineer` (SiteX) — landing wired to 4 institutional 5-step captures
     (DPR · Snag · Safety · Material Issue), each consuming `sitex-engine` +
     `geolocation-bridge` (100 m fence) + `camera-bridge` + `offline-queue-engine`.
   - `maintenance-technician` (MaintainPro) — landing wired to 4 captures
     (Breakdown · PM tick-off · Spares Issue · Asset Photo), each consuming
     `maintainpro-engine` (`createBreakdownReport` · `createPMTickoff` ·
     `createSparesIssue` · `appendEquipmentPhoto`) + camera + offline queue.
   - `shop-floor-operator` (Production) — landing exposes voice-input production
     confirmation (Web Speech API · manual entry primary) + barcode scan via
     `camera-bridge`, both consuming `production-confirmation-engine`
     (`createProductionConfirmation`).
3. **Honest OEE-live banner mounted** on the ShopFloor landing
   (`SHOPFLOOR_OEE_HONESTY` · "Live OEE & IoT machine-health arrive with Wave-2 …").
4. **Sprint history**: AM.2 row flipped to `headSha: '0f8e8069'`
   (provenance CONFIRMED); AM.2c row appended with `predecessorSha: '0f8e8069'`,
   `newSiblings: []`, `provenance: 'PENDING_BACKFILL'`.
5. **Behavioral test suite** `src/test/sprint-am2c/am2c-block-behavioral.test.ts`
   (~20 `it()` · non-forward-looking · source-grep based engine-consumption
   guards · §H wall integrity checks).

## Walls held (0-DIFF asserted by tests)

- `sitex-engine`, `maintainpro-engine`, `production-confirmation-engine`
- `camera-bridge`, `geolocation-bridge`, `offline-queue-engine`, `VoiceNote` (AM.2 shell)
- `MobileRouter.renderRoleRoute` core handler
- `applications.ts`

## What is intentionally Wave-2 (honest, NO fabrication)

- OCR auto-extract on captured photos.
- Voice-to-text transcription on `VoiceNote` shell.
- Live OEE / IoT machine-health on ShopFloor landing.

Each of the above is gated by an honest banner; greppable assertions in the
behavioral test suite enforce zero `tesseract` / `ocr-extract(` / `oee_live` /
`transcript:` literals in the new surfaces.

## New SIBLING

**NONE** (`newSiblings: []`). Pure consume of existing engines + AM.2 shells.

## Files touched (allowlist)

- `src/pages/mobile/OperixGoPage.tsx` — 3 phase2→live flips + GateFlow-legacy entry removed.
- `src/pages/mobile/MobileShopFloorOperatorPage.tsx` — `SHOPFLOOR_OEE_HONESTY` banner.
- `src/lib/_institutional/sprint-history.ts` — AM.2 flip + AM.2c row.
- `src/test/sprint-am2c/am2c-block-behavioral.test.ts` — NEW (~20 it()).
- `audit_workspace/AM2c_close_evidence/AM2c_close_summary.md` — this file.

## Bank ceremony

1. Commit.
2. Confirm `origin/main` advanced off `0f8e8069` via `git ls-remote origin refs/heads/main`.
3. Report the new HEAD short hash here (only once landed) and backfill the
   `TBD_AT_BANK` placeholder on the next sprint open.

— *AM.2c · Tier-L · 116 → 117 ⭐ · author: Lovable agent.*
