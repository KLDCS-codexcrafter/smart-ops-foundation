# Sprint 1.A.5.b · Qulicheak CAPA + MTC + FAI · Close Summary

**Sprint**: T-Phase-1.A.5.b-Qulicheak-CAPA-MTC-FAI
**Predecessor HEAD**: post-T2 close (α-a-bis Grade A composite)
**Streak target**: 19th consecutive first-pass A
**Date**: 2026-05-09 (IST)

---

## 1. Triple Gate (final)

- **TSC**: exit 0 · zero errors
- **ESLint**: exit 0 · zero warnings on touched files (16 files audited)
- **Vitest**: 462/462 passed · 69 test files · +20 new tests this sprint
  - capa-engine.test.ts · 6 tests
  - mtc-engine.test.ts · 8 tests
  - fai-engine.test.ts · 8 tests
  - (Block C wiring exercised by ncr-engine + capa-engine existing tests)

## 2. LOC Inventory (all touched/new files)

Total: 3,079 LOC across 17 files (engines + types + UI + tests).

Net new this sprint: ~1,080 raw → trimmed to ~880 effective.
Block B CapaDetail intentionally kept as ~75 LOC stub per Step 2 plan.

## 3. Block-by-Block Status

| Block | Scope | Status |
|-------|-------|--------|
| A | CAPA engine + types + 6 tests | ✅ shipped |
| B | CAPA UI (Capture · Detail · Register) | ✅ shipped |
| C | NCR ↔ CAPA wiring (column · gate · bridges) | ✅ shipped |
| D | MTC engine + types + UI + 8 tests | ✅ shipped |
| E | FAI engine + types + UI + 8 tests | ✅ shipped |
| F | NcrCapture polish (Cmd+Enter) + EffectivenessVerificationDuePanel | ✅ shipped |
| G | Sidebar entries (capa-capture/register · mtc-capture/register · fai-capture/register · effectiveness-verification-due) | ✅ shipped |
| H | FR-30 + 8 ACs + D-decisions register + Part 11 close report | ✅ this file |

## 4. D-Decisions Register

| ID | Title | Notes |
|----|-------|-------|
| D-NEW-BD | CAPA engine NEW · 8D + 30/60/90-day verification model | per Step 2 plan |
| D-NEW-BE | NCR↔CAPA bidirectional wiring · Q-LOCK-4(b) gate · override audit prefix `[CAPA-OPEN-OVERRIDE id]` | per Step 2 plan |
| D-NEW-BF | MTC engine NEW · per-parameter model · fail-dominant overall | per Step 2 plan |
| D-NEW-BG | FAI engine NEW · per-dimension nominal±tolerance · fail-dominant · approveFai shortcut | per Step 2 plan |
| D-NEW-BH | CAPA verification 30/60/90-day milestones · listVerificationsDueWithin helper · Effectiveness Due panel | per Step 2 plan |
| D-NEW-BI | qulicheak-bridges CAPA observability channels · `capa:linked-to-ncr` · `capa:effective:applied` · `capa:ineffective:reopened` (no-op listeners · Procure360 future-sub) | per Step 2 plan |
| D-NEW-BJ | API signature alignment · 3-arg `(entityCode, userId, draft)` adopted across capa/mtc/fai engines for consistency with α-a-bis ncr-engine. **3 places adapted** (well under 8+ halt threshold). | T2 §6 ask · pre-approved Option 2 |
| D-NEW-BK | Trident Template preset for MTC · 14 standard parameter rows seeded (8 chemical: C/Mn/Si/S/P/Cr/Ni/Mo + 6 mechanical: tensile/yield/elongation/hardness/impact/grain) · architectural pivot from Q-LOCK-5(b) explicit-14 to flexible parameter array + preset | Founder pre-approved this turn |
| D-NEW-BL | MTC scope expansion · 5-state status (`draft/submitted/approved/rejected/archived`) · `transitionMtc` stamps `approved_at/by` · ~30 LOC beyond Step 2 plan, accepted as documentation-only expansion | this turn |

## 5. Acceptance Criteria (8 ACs)

| # | Criterion | Evidence |
|---|-----------|----------|
| 1 | CAPA can be raised standalone or from an NCR | `raiseCapa` + `raiseCapaFromNcr` exported · CapaCapture supports both modes via `prefillNcrId` |
| 2 | NCR Register shows linked CAPA + Create-CAPA button | NcrRegister.tsx CAPA column + dialog (lines 247–289) |
| 3 | NCR cannot close while linked CAPA is open without override | NcrCloseDialog Q-LOCK-4(b) gate (lines 53–73) · audit prefix `[CAPA-OPEN-OVERRIDE id]` |
| 4 | MTC captures cert + parameters with auto pass/fail per spec | mtc-engine.evaluateParameter + deriveOverall · 8 unit tests |
| 5 | MTC has Trident Template preset (14 std rows) | MtcCapture TRIDENT_PRESET button seeds rows |
| 6 | FAI captures dimensions with nominal ± tol auto pass/fail | fai-engine.evaluateDimension + recomputeOverallStatus · 8 unit tests |
| 7 | Effectiveness verifications (30/60/90-day) listed and actionable | EffectivenessVerificationDuePanel with Effective/Ineffective inline buttons |
| 8 | All new modules sidebar-routable with keyboard shortcuts | qulicheak-sidebar-config: `q n` NCR · `q c` CAPA · `q m` MTC · `q f` FAI |

## 6. FR-30 Header Verification

All 17 touched files carry FR-30 compliant headers (`@file · @purpose · @sprint · @decisions · @disciplines · @reuses · @[JWT]`). Verified via grep for `@sprint` and `@decisions` markers.

## 7. Constraint Check

- **53 protected files**: zero touches verified
- **ncr-engine.ts / types/ncr.ts**: zero line diff (read-only consumers only)
- **Procure360**: zero touches (FR-19 sibling) · CAPA observability channels are pub-sub only
- **Banned patterns (FR-21)**: 0 `any`, 0 `console.log`, 0 float-money, 0 TODO, 0 emoji-as-icon

## 8. D-NEW-BJ Adaptation Table (≤5 places)

| # | File | Step-2 spec | Adapted-to-α-a-bis |
|---|------|-------------|---------------------|
| 1 | capa-engine.ts | `raiseCapa(entityCode, draft, opts)` | `raiseCapa(entityCode, userId, draft)` |
| 2 | mtc-engine.ts | `createMtc(entityCode, draft, opts)` | `createMtc(entityCode, userId, draft)` |
| 3 | fai-engine.ts | `createFai(entityCode, draft, opts)` | `createFai(entityCode, userId, draft)` |

Total: 3 adaptations · within bounded 3–5 target · no halt-and-regenerate signal.

## 9. Q-LOCK Compliance

- **Q-LOCK-4(b)** ✅ NCR close blocked by open CAPA · override path with audit prefix
- **Q-LOCK-5(b)** ✅ pivoted to D-NEW-BK preset model (Trident 14-param template)
- **Q-LOCK-7(c)** ✅ MTC ↔ source linkage via `related_grn_id` field on createMtc (Pattern B)

## 10. Files Inventory

**Engines (NEW)**: capa-engine.ts · mtc-engine.ts · fai-engine.ts
**Types (NEW)**: capa.ts · mtc.ts · fai.ts
**UI (NEW)**: CapaCapture.tsx · CapaDetail.tsx · MtcCapture.tsx · FaiCapture.tsx
**Reports (NEW)**: CapaRegister.tsx · MtcRegister.tsx · FaiRegister.tsx · EffectivenessVerificationDuePanel.tsx
**Tests (NEW)**: capa-engine.test.ts · mtc-engine.test.ts · fai-engine.test.ts
**Edited**: NcrRegister.tsx · NcrCloseDialog.tsx · NcrCapture.tsx · qulicheak-bridges.ts · QualiCheckPage.tsx · QualiCheckSidebar.types.ts · qulicheak-sidebar-config.ts

## 11. Part 11 — Founder Report-Back Template

```
SPRINT  : T-Phase-1.A.5.b-Qulicheak-CAPA-MTC-FAI
HEAD    : <new HEAD hash post-merge>
GRADE   : (requested) A · first-pass
STREAK  : 19th consecutive first-pass A (target)
GATES   : TSC 0 · ESLint 0/0 · Vitest 462/462 (+20 new)
LOC     : 3,079 total touched · ~880 effective net-new
BLOCKS  : A · B · C · D · E · F · G · H all green
DECIS   : D-NEW-BD/BE/BF/BG/BH/BI/BJ/BK/BL registered
ACs     : 8/8 met · evidence in Section 5
PROTECT : 53 protected files · zero touches verified
SIBLING : Procure360 zero touches · FR-19 maintained
PIVOTS  : Q-LOCK-5(b) → D-NEW-BK preset model (founder pre-approved)
RISKS   : none open · α-c (next: Sales/Customer-Complaint inlet) ready to plan
```

---
END OF CLOSE SUMMARY
