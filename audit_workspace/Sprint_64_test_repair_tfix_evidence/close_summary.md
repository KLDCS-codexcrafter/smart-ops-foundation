# Sprint 64 Snapshot Test Repair T-fix · Close Summary

**T-fix HEAD:** 5597a11c
**Predecessor:** 5597a11c (Sprint 67 FAR-3 Prompt B banked)
**Date:** 2026-05-26
**Scope:** 1 file · 1 test repair · ≤30 LOC delta
**FR-98 acceptance:** ≤2 files ✓ · ≤100 LOC ✓ · single finding ✓ · honest disclosure ✓

## What was repaired
The pre-existing failing test `FK-CAP-1 · FK-CAP-3 · FK-CAP-4 · FK-CAP-5 schema-staged at Sprint 64`
was converted to a historical-snapshot pattern that accommodates post-Sprint-64 promotions of
FK-CAP-1/3/5 to `full` (lit at Sprint 66 FAR-2). FK-CAP-4 remains schema-staged correctly.

## Triple Gate at T-fix HEAD
- TSC: 0 errors
- ESLint: 0 errors · 2 carry-forward warnings
- Vitest: 2386 pass / 0 fail (was 2385 pass / 1 fail pre-T-fix)

## Files touched
- src/test/sprint-64/institutional-registers-sprint-64-update.test.ts (edited · lines 31-37)
- audit_workspace/Sprint_64_test_repair_tfix_evidence/close_summary.md (NEW · this file)

## Next sprint hand-off
Authorizes close summary §5/§6 amendment T-fix dispatch next.
