# SP.AM.2 — T-AM2-Mobile-Captures — Close Summary

**Sprint:** AM.2 · T-AM2-Mobile-Captures (best-of-both Tier-L CLOSE)
**Predecessor HEAD:** `3fd7e61f` ("Wired Dishani & RoleHome feeds")
**This sprint LOC:** ~900
**Streak target:** 116 ⭐ (115 → 116)
**New SIBLING:** **NONE** (`newSiblings: []`) — every new page CONSUMES an
existing card engine; the two new shells are presentation-only components.

---

## 1. 5 mobile-gap capture personas — engine consumption table

| Mobile page                              | Route                                  | Card engine consumed (no reimplement) | Engine entry-points used                                  |
|------------------------------------------|----------------------------------------|---------------------------------------|-----------------------------------------------------------|
| `MobileProcureApprovePage`               | `/mobile/captures/procure-approve`     | `approval-rail-engine` (B.1)          | `listPendingMirrors`, `decideApproval`                    |
| `MobilePayoutApprovePage`                | `/mobile/captures/payout-approve`      | `payment-requisition-engine`          | `listRequisitions`, `approveDeptLevel`, `approveAccountsLevel`, `rejectRequisition` |
| `MobileRequestXIndentPage`               | `/mobile/captures/requestx-indent`     | `request-engine`                      | `createMaterialIndent`, `submitIndent`                    |
| `MobileFrontDeskCheckInPage`             | `/mobile/captures/frontdesk-checkin`   | `frontdesk-engine`                    | `createPlannedVisitor`, `checkInVisitor`, `listVisitors`  |
| `MobileDocVaultCapturePage`              | `/mobile/captures/docvault-capture`    | `docvault-engine`                     | `createDocument`                                          |

All approve actions honor the B.1 SoD rail (reason-required reject is enforced
inside `decideApproval`; payment-requisition routing is enforced by the
engine's hardcoded `ROUTING_RULES`).

---

## 2. Capture SHELLS — honesty + Wave-2 seams

| Shell             | File                                       | Honesty banner export      | Wave-2 `[JWT]` seam                                |
|-------------------|--------------------------------------------|----------------------------|----------------------------------------------------|
| `CameraCapture`   | `src/components/mobile/CameraCapture.tsx`  | `CAMERA_CAPTURE_HONESTY`   | `[JWT] Wave-2: POST /api/ai/ocr-extract`           |
| `VoiceNote`       | `src/components/mobile/VoiceNote.tsx`      | `VOICE_NOTE_HONESTY`       | `[JWT] Wave-2: POST /api/ai/transcribe`            |

- **No OCR** anywhere — `CameraCapture` only previews and attaches a photo;
  manual fields remain primary.
- **No transcription** anywhere — `VoiceNote` records via `MediaRecorder` and
  attaches the clip; no synthesized transcript strings exist in the codebase.
- Grep confirms zero hits for `extracted_text`, `ocrResult`, `transcript_text`,
  or any fabricated extraction string in either shell.

---

## 3. Walls held (`§H` · 0-DIFF on consume-spine)

`approval-rail-engine`, `payment-requisition-engine`, `request-engine`,
`frontdesk-engine`, `docvault-engine`, the B.1 approval rail core,
`MobileRouter` core handlers (only the routes-array + import block were
appended), `applications.ts`, hash-chain, retention, and entitlements — all
0-DIFF apart from explicit additive entries in the allowlist.

---

## 4. Institutional bookkeeping

- `src/lib/_institutional/sprint-history.ts` — **AM.1 flipped to `3fd7e61f`
  (`provenance: CONFIRMED`)** and AM.2 row appended (`predecessorSha:
  '3fd7e61f'`, `newSiblings: []`, `headSha: 'TBD_AT_BANK'`,
  `provenance: PENDING_BACKFILL`).
- `src/lib/_institutional/sibling-register.ts` — untouched (no new sibling).
- Tests: `src/test/sprint-am2/am2-block-behavioral.test.ts` — 30 `it()` blocks,
  non-forward-looking assertions only (no last-entry / no roadmap newest-first
  checks).

---

## 5. Acceptance criteria

- **AC1** Block-0 4/4 · consume-spine confirmed (HEAD == `3fd7e61f`).
- **AC2** 5 mobile-gap pages each greppably consume their card engine.
- **AC3** Approve actions honor B.1 SoD (decideApproval reason guard;
  payment-requisition routing rules).
- **AC4** `CameraCapture` is photo + manual fields only — no OCR; honest
  Wave-2 banner; `[JWT]` seam preserved.
- **AC5** `VoiceNote` is record + attach only — no transcription; honest
  Wave-2 banner; `[JWT]` seam preserved.
- **AC6** Zero new SIBLING (`newSiblings: []`).
- **AC7** Five pages reachable via MobileRouter; five tiles surfaced on
  `/operix-go`.
- **AC8** ≥20 it() green; non-forward-looking only.
- **AC9** Sprint-history flips AM.1 and appends AM.2.
- **AC10** Walls 0-DIFF held (per §3 above).
- **AC11** No new dependencies; Triple Gate 4/4 (tsc · eslint repo-wide · vitest
  scoped · build) under `NODE_OPTIONS="--max-old-space-size=7168"`.

---

*Wave-2 will replace the SHELLS with real on-device OCR + ASR through the
preserved `[JWT]` seams; this sprint banks the field-valuable capture surface
without any fabricated AI output.*
