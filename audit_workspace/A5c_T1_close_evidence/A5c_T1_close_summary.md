# Sprint T-Phase-1.A.5.c-T1-Audit-Closure · Close Summary

**Sprint**: T1 audit-closure (composite with α-c)
**Date**: 2026-05-09
**Predecessor**: α-c close

## Triple Gate
- TSC: 0 errors ✅
- ESLint: 0/0 ✅
- Vitest: **474/474** passed (+2 new CapaDetail integration tests) ✅

## Fixes Applied

### FIX 1 · HEAD hash
α-c close HEAD captured by founder (sandbox has no git history visibility — placeholder
`<actual α-c HEAD>` to be filled by founder from `git log -1` at α-c tip).

### FIX 2 · FR-29 12/12 baseline · AUDIT RESULT
File-by-file mount audit (per Part 3.1 grep):

| Form | Mounts present | Status |
|---|---|---|
| NcrCapture.tsx          | 8/12 (UseLastVoucher · Sprint27d1/d2/e · KeyboardShortcutOverlay · DraftRecoveryDialog · PinnedTemplatesWidget · useSmartDefaults) | partial |
| CapaCapture.tsx         | 0/12 | none |
| MtcCapture.tsx          | 0/12 | none |
| FaiCapture.tsx          | 0/12 | none |
| WelderQualification.tsx | 0/12 | none |

**HALT decision per Part 7**: Bringing 4 forms from 0/12 → 12/12 plus NcrCapture
8 → 12 = ~52 mount integrations × ~5–10 LOC each = 260–520 LOC. Far exceeds
the 50–100 LOC T1 budget. Per Part 3.2 contingency and Part 7 escalation rule
("Any FR-29 mount missing that requires non-trivial integration → halt"), this
T1 sub-sprint registers **D-NEW-BT-deferred** rather than attempting a
multi-hundred-LOC retrofit inside an audit-closure window.

### FIX 3 · D-NEW-BS-revised · REGISTERED
Q-LOCK-7(c) MTC↔ProductionConfirmation linkage shipped via read-only consumer
(`findPcMatchesForHeat` in `qulicheak-bridges.ts`) instead of stored-field-on-MTC
pattern. Files actually touched (α-c Block G):
- `src/lib/qulicheak-bridges.ts` (EXT · +findPcMatchesForHeat)
- `src/pages/erp/qulicheak/reports/MtcRegister.tsx` (EXT · +PC Link column)
- `src/test/qulicheak-mtc-pc-bridge.test.ts` (NEW · 4 tests)

Trade-off: cleaner SD-28 (zero α-b just-built touches) vs view-time PC resolution
instead of stored linkage. Founder acceptance pending.

### FIX 4 · CapaDetail integration tests · SHIPPED
- `src/test/capa-detail-editor.test.ts` NEW · 2 tests · both pass.
  - Test 1: 5 Whys persistence on D4 via `updateEightDStep`
  - Test 2: 30/60/90 verification flow via `recordVerification` + audit log

### FIX 5 · D-NEW-BT-deferred · REGISTERED
FR-29 12/12 baseline NOT fully reached at α-c close. Forms below 12/12:
NcrCapture (8/12) · CapaCapture · MtcCapture · FaiCapture · WelderQualification (all 0/12).
Target completion at α-d alongside bridge unification cleanup. Q-LOCK-8(a) verdict
**partially fulfilled** — strict reading: deferred.

## D-Decisions Registered (α-c composite)
- D-NEW-BN · Welder Qualification engine ✅
- D-NEW-BO · Vendor Scorecard QA-dim subscription ✅
- D-NEW-BP · ISO 9001 7-clause taxonomy ✅
- D-NEW-BQ · IqcEntryPage wrap · QCEntryPage zero-touch ✅
- D-NEW-BR · CapaDetail full 8D editor ✅ (now with 2 integration tests)
- D-NEW-BS-revised · Read-only `findPcMatchesForHeat` consumer pattern ✅
- D-NEW-BT-deferred · FR-29 12/12 retrofit deferred to α-d ⚠️

## LOC Delta (T1 only)
- New: `src/test/capa-detail-editor.test.ts` (~60 LOC)
- New: `audit_workspace/A5c_T1_close_evidence/A5c_T1_close_summary.md` (this file)
- Total T1 net-new: ~60 LOC · within 50–100 budget

## Streak Posture
Composite first-pass A with α-c (per A.5.a-bis-T1 + A.5.a-bis-T2 + A.2.b-T1
precedent). Streak 19 → **20** pending founder acceptance of D-NEW-BS-revised
and D-NEW-BT-deferred wording.
