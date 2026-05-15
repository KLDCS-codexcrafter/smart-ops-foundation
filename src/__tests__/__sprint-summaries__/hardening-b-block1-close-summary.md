# Hardening-B · Block 1 — Close Summary

**Sprint:** T-Phase-1.Hardening-B · Block 1 (D-1 Long-Tail Legacy-Fallback Suppression Pass)
**Predecessor HEAD:** `f8f0b72` (Precision & Calculation Integrity Arc CLOSED)
**Founder rulings:** Interpretation (1) pattern-only on D-9 (no code change in Block 1) · (B) suppression-with-documentation on D-1
**Status:** ⏸ HALT for §2.4 Real Git Clone Audit — NOT self-certified.

---

## SUPPLEMENT 7 — Line-number reconciliation at `f8f0b72`

All 10 sites verified mechanically. **Zero drift** from Appendix A.

| # | File | Expected line | Verified at | Drift |
|---|------|---------------|-------------|-------|
| 1 | `src/features/command-center/modules/FoundationModule.tsx` | 87 | 87 | 0 |
| 2 | `src/features/command-center/modules/FoundationModule.tsx` | 94 | 94 | 0 |
| 3 | `src/lib/voucher-org-tag-engine.ts` | 115 | 115 | 0 |
| 4 | `src/pages/erp/accounting/TransactionTemplates.tsx` | 150 | 150 | 0 |
| 5 | `src/pages/erp/masters/CustomerMaster.tsx` | 440 | 440 | 0 |
| 6 | `src/pages/erp/masters/VendorMaster.tsx` | 1181 | 1181 | 0 |
| 7 | `src/pages/erp/masters/VendorMaster.tsx` | 1202 | 1202 | 0 |
| 8 | `src/pages/erp/pay-hub/masters/EmployeeMaster.tsx` | 104 | 104 | 0 |
| 9 | `src/pages/erp/pay-hub/masters/EmployeeMaster.tsx` | 113 | 113 | 0 |
| 10 | `src/pages/erp/salesx/transactions/Telecaller.tsx` | 187 | 187 | 0 |

---

## Verdict table — 10 sites · 7 files

Each suppression is **rule-scoped** (`hardening-a/no-hardcoded-scoped-key`), uses the **`-next-line`** form on its own line directly above the flagged line, and the flagged line itself is **character-identical** to `f8f0b72`.

| # | File | Flagged line (post-comment) | Rule | Comment shape | `-next-line` confirmed |
|---|------|------|------|---------------|------------------------|
| 1 | `FoundationModule.tsx` | 88 (was 87) | `hardening-a/no-hardcoded-scoped-key` | `// eslint-disable-next-line hardening-a/no-hardcoded-scoped-key -- legacy total fallback during Hardening-A scoped-key migration window; scoped count computed above (line 85)` | ✅ |
| 2 | `FoundationModule.tsx` | 96 (was 94) | `hardening-a/no-hardcoded-scoped-key` | `// eslint-disable-next-line hardening-a/no-hardcoded-scoped-key -- legacy total fallback during Hardening-A scoped-key migration window; scoped count computed above (line 92)` | ✅ |
| 3 | `voucher-org-tag-engine.ts` | 116 (was 115) | `hardening-a/no-hardcoded-scoped-key` | `// eslint-disable-next-line hardening-a/no-hardcoded-scoped-key -- legacy fallback during Hardening-A scoped-key migration window; scopedRaw (line 114) takes precedence` | ✅ |
| 4 | `TransactionTemplates.tsx` | 151 (was 150) | `hardening-a/no-hardcoded-scoped-key` | `// eslint-disable-next-line hardening-a/no-hardcoded-scoped-key -- legacy fallback during Hardening-A scoped-key migration window; scopedRaw (line 149) takes precedence` | ✅ |
| 5 | `CustomerMaster.tsx` | 441 (was 440) | `hardening-a/no-hardcoded-scoped-key` | `// eslint-disable-next-line hardening-a/no-hardcoded-scoped-key -- legacy fallback during Hardening-A scoped-key migration window; template-literal scoped read leads, legacy follows via ??` | ✅ |
| 6 | `VendorMaster.tsx` | 1182 (was 1181) | `hardening-a/no-hardcoded-scoped-key` | `// eslint-disable-next-line hardening-a/no-hardcoded-scoped-key -- legacy fallback during Hardening-A scoped-key migration window; scoped read on line 1178 takes precedence` | ✅ |
| 7 | `VendorMaster.tsx` | 1204 (was 1202) | `hardening-a/no-hardcoded-scoped-key` | `// eslint-disable-next-line hardening-a/no-hardcoded-scoped-key -- legacy fallback during Hardening-A scoped-key migration window; scoped read on line 1199 takes precedence` | ✅ |
| 8 | `EmployeeMaster.tsx` | 105 (was 104) | `hardening-a/no-hardcoded-scoped-key` | `// eslint-disable-next-line hardening-a/no-hardcoded-scoped-key -- legacy fallback during Hardening-A scoped-key migration window; departmentsKey scoped read leads, legacy follows via ??` | ✅ |
| 9 | `EmployeeMaster.tsx` | 115 (was 113) | `hardening-a/no-hardcoded-scoped-key` | `// eslint-disable-next-line hardening-a/no-hardcoded-scoped-key -- legacy fallback during Hardening-A scoped-key migration window; divisionsKey scoped read leads, legacy follows via ??` | ✅ |
| 10 | `Telecaller.tsx` | 188 (was 187) | `hardening-a/no-hardcoded-scoped-key` | `// eslint-disable-next-line hardening-a/no-hardcoded-scoped-key -- legacy fallback during Hardening-A scoped-key migration window; template-literal scoped read on line 186 leads via ??` | ✅ |

**Mandatory shape audit:**
- ✅ All 10 are rule-scoped (`hardening-a/no-hardcoded-scoped-key`) — none bare.
- ✅ All 10 use `-next-line` form (own line, immediately above) — none trailing.
- ✅ Zero file-scoped `/* eslint-disable */` directives introduced.
- ✅ All 10 flagged lines are **character-identical** to `f8f0b72` (only the comment line is new).

---

## Triple Gate — baseline `f8f0b72` vs final

| Gate | Baseline `f8f0b72` | Final | Δ |
|------|-------------------|-------|----|
| TSC | 0 errors | 0 errors | identical |
| ESLint | 0 errors / **10 warnings** | 0 errors / **0 warnings** | **−10 warnings (goal achieved)** |
| Vitest | 1209 pass / 165 files | 1209 pass / 165 files | identical (no behaviour change, no new tests) |
| Build | clean | clean | identical |

---

## 0-diff confirmations

- ✅ `src/lib/decimal-helpers.ts` — 0-diff (Precision Arc closed; not touched).
- ✅ Protected zones — 0-diff:
  - `src/types/voucher-type.ts`
  - `src/types/cc-masters.ts`
  - `src/components/operix-core/applications.ts`
  - `src/lib/cc-compliance-settings.ts`
- ✅ Voucher-posting path — 0-diff.
- ✅ All 10 flagged lines themselves — 0-diff (only comment lines added).
- ✅ All imports — 0-diff (we suppressed, did not migrate).
- ✅ No new tests; no test-file diffs.

**Diff inventory (8 files total):**
1. `src/features/command-center/modules/FoundationModule.tsx` (+2 comment lines)
2. `src/lib/voucher-org-tag-engine.ts` (+1 comment line)
3. `src/pages/erp/accounting/TransactionTemplates.tsx` (+1 comment line)
4. `src/pages/erp/masters/CustomerMaster.tsx` (+1 comment line)
5. `src/pages/erp/masters/VendorMaster.tsx` (+2 comment lines)
6. `src/pages/erp/pay-hub/masters/EmployeeMaster.tsx` (+2 comment lines)
7. `src/pages/erp/salesx/transactions/Telecaller.tsx` (+1 comment line)
8. `src/__tests__/__sprint-summaries__/hardening-b-block1-close-summary.md` (this file, new)

---

## STOP-AND-RAISE

**Adjacent non-scope `hardcoded-scoped-key` warnings:** _(none detected)_
**Sites not matching expected shape:** _(none — all 10 verified bytes-clean at expected line numbers)_

---

## Honest disclosures

Beyond the 10 inline `eslint-disable-next-line hardening-a/no-hardcoded-scoped-key` comments and this close summary: **nothing else changed.** No imports, no logic, no whitespace beyond the inserted comment lines, no test files, no audit-table reconciliation (Block 1 is not a Stage-2 migration block).

**D-9 status:** Per founder ruling Interpretation (1), D-9 is NOT a code change in Hardening-B. The FR-text item ("all cross-card bridge events must carry `department_id` as part of the FR-75 standard extension") is captured here for the mid-arc FR-promotion ceremony and is **not** written into FR text in Block 1. The 17-bridge interface retrofit remains the Phase 2 Backbone Arc opening task per v2/v4 §6.

---

⏸ **HALT for §2.4 Real Git Clone Audit. Block 2 NOT started. Not self-certified.**
