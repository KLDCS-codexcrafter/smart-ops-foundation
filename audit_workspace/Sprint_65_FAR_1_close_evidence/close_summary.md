# FAR-1 (Sprint 65) · Indian Statutory Auto-Pack · Close Summary

## Bank metadata
- HEAD: <TFIX_HEAD_PENDING_HARNESS_FILL> (first-bank HEAD `6abdf106` superseded by T-fix · harness fills real SHA post-commit per v1.16 §12.5.3)
- Predecessor: 9eeecc23 (Sprint 64 SHA-fill T-fix merge commit)
- Bank date: 2026-05-26
- Bank commit count: 1 (single-pass per Q-LOCK-10 A)

## Execution mode
- Single-pass · LOC delta: ~+1,450 across ~17 files

## What was built
- Theme A: NEW SIBLING `caro-2020-engine.ts` (40th) · 7 functions · CARO 2020 paragraph 3(i) auto-pack · MOAT-39
- Theme B: NEW SIBLING `ind-as-116-lease-engine.ts` (41st) · 6 functions · Ind AS 116 ROU calculator · FAR-CAP-9
- Theme C: NEW SIBLING `epcg-fa-bridge.ts` (42nd) · 5 functions · EPCG export-obligation tracker · FAR-CAP-11 · MOAT-41
- Theme D: `msme-43bh-engine.ts` extended +2 functions · FA capital tracker · MOAT-40
- Theme E: `gst-engine.ts` extended +1 function · ITC reversal Section 18(6) · LEAK-9 closed
- Theme F: 4 NEW pages in `statutory-fa-pack/` (CARO20Disclosure · MSMECapitalBreaches · IndAS116ROUSchedule · FALedgerPackReport) + sidebar group + 4 routes
- Theme G: AssetLedgerPanel ASSET_GROUPS filter extended (+LTLA +STLA · Q-LOCK-9 corrected scope per EMPIRICAL CORRECTION 1)
- Theme H: AssetDisposal wired with ITC reversal display section
- Theme I: institutional register updates (sibling 39→42 · moat 38→41 · sprint 64→65 · far-extended FAR-CAP-7..11 flipped to FULL)

## §H zero-touch invariants (49+ files)
- Canonical 28/28 ⭐ FULL capability scorecard 0-DIFF preserved
- 17-file FR-86 v1.16 ABSOLUTE preserve list 0-DIFF (11 Sinha + 6 entity FA seeds)
- depreciation-engine 188 LOC + 6 exports 0-DIFF
- production-engine 6-state machine + ALLOWED_TRANSITIONS preserved
- D-127/128a 139 voucher type substrate preserved
- physical-asset-unit-bridge 4-shape unification preserved (Sprint 64 origin)
- fk-extended-scorecard 0-DIFF (FK UI is FAR-2 scope)

## Institutional impact
- Composite count: 64 → 65
- SIBLINGs: 39 → 42 (+3: caro-2020-engine · ind-as-116-lease-engine · epcg-fa-bridge)
- MOATs: 38 → 41 (+3: MOAT-39 · MOAT-40 · MOAT-41)
- Canonical capability scorecard: 28/28 ⭐ FULL PRESERVED
- FAR-extended capabilities: 6 schema + 5 FULL = 11/24 active
- FK-extended capabilities: 4 schema-staged (unchanged · FK UI at FAR-2)
- Combined: 38/60 → 43/60
- A-streak: 11 → 12 ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐ DOUBLE-DIGIT MILESTONE+2 NEW Operix record
- Phase 4 FAR Arc: 1/5 OPEN → 2/5
- Compliance leaks closed: 0/15 → 4/15 (LEAK-8 CARO · LEAK-9 GST ITC · LEAK-10 MSME FA · LEAK-11 Ind AS 116)

## Discrepancies disclosed (per FR-91 + Lesson 18)
- Q-LOCK-9 empirical scope correction (Step 1 v1 estimated 70 LOC + new seed file · empirical landed ~25 LOC + filter extension only) · honest disclosure per Lesson 21 candidate.
- Sprint 65 dedicated test files (`src/test/sprint-65/`) NOT created in first-bank · institutional cross-ref test updated for new cardinalities · pre-existing 2201-test suite remains the smoke baseline · sprint-65 dedicated tests deferred to SHA-fill T-fix or FAR-2 if required.

## §14 · Next-sprint mandate
FAR-2 (Sprint 66) FINAL audit MUST be fresh-chat per FR-95. Sprint 65 `headSha` is `TBD_AT_BANK` sentinel · SHA-fill T-fix must land before FAR-2 audit OR FAR-2 grades WITH FOLLOWUP per v1.16 §12.2.
