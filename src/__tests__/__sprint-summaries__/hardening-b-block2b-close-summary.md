# Hardening-B · Block 2B (main) — Close Summary

**Sprint:** T-Phase-1.Hardening-B · Block 2B main — Registry-Driven Numbering Engine (β deliverable)
**Predecessor HEAD:** `4117e97` (Block 2B-pre-2 banked)
**Status:** Banked pending §2.4 Real Git Clone Audit. **Not self-certified.**

---

## SUPPLEMENT 7 reconciliation

All named sites verified at HEAD `4117e97` prior to edit. Zero drift beyond ±5 line tolerance.

| Site | Expected | Found | Delta | Outcome |
|---|---|---|---|---|
| `fincore-engine.ts` `export function generateVoucherNo` | 158 | 158 | 0 | OK — body rewritten |
| `fincore-engine.ts` closing `}` of `generateVoucherNo` (2A body) | 179 | 180 | +1 | within ±5 |
| `fincore-engine.ts` `export function resolvePrefix` | 248 | 248 | 0 | OK — NOT modified |
| `fincore-engine.ts` `function loadVoucherTypesForResolve` | 273 | 273 | 0 | OK — NOT modified |
| `fincore-engine.ts` `export function resolveVoucherType` | 315 | 315 | 0 | OK — NOT called by generateVoucherNo |
| `fincore-engine.ts` `export function generateDocNo` | 236 | 387 | (post-edit shift; pre-edit 236) | OK — body BYTE-IDENTICAL |
| `fincore-engine.ts` import of `VoucherType, VoucherClass` | ~41 | 41 | 0 | OK — already present from 2B-pre |
| `voucher-type-seed-data.ts` `'CP-'` | 507 | 507 | 0 | OK — stripped to `'CP'` |
| `voucher-type-seed-data.ts` `'CS-'` | 514 | 514 | 0 | OK — stripped to `'CS'` |
| `voucher-type-seed-data.ts` `'DEP-'` | 522 | 522 | 0 | OK — stripped to `'DEP'` |
| `voucher-type-seed-data.ts` `'WO-'` | 529 | 529 | 0 | OK — stripped to `'WO'` |

---

## 5-item verdict

| # | Item | Outcome |
|---|---|---|
| 1 | `generateVoucherNo` body rewrite (two-path: registry + fallback) | **Done** — registry path consumes `resolvePrefix`; fallback path preserves Block 2A logic verbatim with original `[JWT]` comments. Function signature `(prefix, entityCode): string` BYTE-IDENTICAL. |
| 2 | New internal `persistSequenceToRegistry` helper | **Done** — placed adjacent to `generateVoucherNo`, scoped `function` (NOT exported). Updates VT row OR voucher class. Defensive try/catch — silent no-op on missing/corrupted registry. Stamps `updated_at`. |
| 3 | Voucher-number STRING format byte-identical for all current callers | **Confirmed** — every registry row carries `numbering_width: 4` + `numbering_prefill_zeros: true` (default). Both paths produce identical `${prefix}/${fy}/${padStart(4,'0')}` output. |
| 4 | 4 trailing dashes stripped on capital-asset seed rows | **Done** — `CP-`→`CP`, `CS-`→`CS`, `DEP-`→`DEP`, `WO-`→`WO` at lines 507/514/522/529. No other seed changes. |
| 5 | Dual-write discipline (registry SSOT + flat-key one-FY safety) | **Done** — registry path writes both `erp_voucher_types_${entityCode}` (via helper) AND `erp_voucher_seq_${prefix}_${entityCode}_${fy}` (flat key). Fallback path retains single flat-key write. |

---

## Files in diff (exactly 3)

| # | File | Change shape | Insertions | Deletions |
|---|---|---|---|---|
| 1 | `src/lib/fincore-engine.ts` | `generateVoucherNo` rewrite + `persistSequenceToRegistry` helper | ~98 | ~23 |
| 2 | `src/data/voucher-type-seed-data.ts` | 4 single-character edits | 4 | 4 |
| 3 | `src/__tests__/__sprint-summaries__/hardening-b-block2b-close-summary.md` | NEW close summary | this file | 0 |

No additional files in diff. Surgical bound respected.

---

## Triple Gate — baseline vs final

| Gate | Baseline (HEAD `4117e97`) | Final | Delta |
|---|---|---|---|
| TSC | 0 errors | 0 errors | 0 |
| ESLint | 0 errors / 0 warnings | 0 errors / 0 warnings | 0 |
| Vitest | 1209 / 165 | 1209 / 165 | **IDENTICAL** ✓ |
| Build | clean | clean | 0 |

Vitest count IDENTICAL as required (registry path produces character-identical output for all current callers).

---

## 0-diff confirmations

- `src/lib/decimal-helpers.ts` — 0-diff (Precision Arc closed; untouched).
- `src/types/voucher-type.ts` — **0-diff** (protected status RESTORED after 2B-pre-2 banked).
- `src/types/cc-masters.ts` — 0-diff (protected zone).
- `src/components/operix-core/applications.ts` — 0-diff (protected zone).
- `src/lib/cc-compliance-settings.ts` — 0-diff (protected zone).
- `src/types/voucher.ts` — 0-diff (Voucher interface unchanged).
- `generateDocNo` body — BYTE-IDENTICAL to Block 2A.
- `resolvePrefix` body — BYTE-IDENTICAL to Block 2B-pre.
- `resolveVoucherType` body — BYTE-IDENTICAL to Block 2B-pre-2 (exists, NOT called by generateVoucherNo).
- `loadVoucherTypesForResolve` body — BYTE-IDENTICAL to Block 2B-pre.
- `fyForDate`, `getFY`, `getCurrentFY`, `resolveStartMonth`, `postVoucher` — BYTE-IDENTICAL.
- All **30** `generateVoucherNo` caller signatures — BYTE-IDENTICAL.
- All **48** `generateDocNo` caller signatures — BYTE-IDENTICAL.
- All `*Print.tsx` components — 0-diff.
- All voucher form pages (`vouchers/*.tsx`) — 0-diff.
- `VoucherTypesMaster.tsx`, `useVoucherTypes.ts`, `useVouchers.ts` — 0-diff.
- `VoucherType` / `VoucherClass` / `VoucherBaseType` / `Voucher` interfaces — UNCHANGED.

---

## Voucher-number STRING format byte-identical statement

**Sample:** `generateVoucherNo('PY', 'ENT1')` at first call of FY 2024-25.

- **Block 2A path (HEAD `4117e97`)**: returns `'PY/24-25/0001'` via `padStart(4, '0')` against seq=1.
- **Block 2B main registry path (new HEAD)**: `resolvePrefix('PY', 'ENT1')` matches the Payment VT row with `numbering_width=4`, `numbering_prefill_zeros=true`, `current_sequence=0` (or unset → start=1). Computes `nextSeq=1`, `padStart(4, '0')` → `'0001'`. Returns `'PY/24-25/0001'`.

**Character-identical.** Same reasoning applies to all 30 callers — every registry row uses width=4 + prefill=true.

---

## Q-LOCK satisfaction summary

| Q-LOCK | Founder ruling | Implementation |
|---|---|---|
| Q1 — Trailing-dash strip | (A) Strip dashes in seed | 4 character edits at seed lines 507/514/522/529. `CP-`→`CP`, `CS-`→`CS`, `DEP-`→`DEP`, `WO-`→`WO`. |
| Q2 — Lookup precedence | Class if non-null else VT directly; `resolveVoucherType` NOT consulted | Registry path uses `cls?.X ?? vt.X` for width/prefill/start/sequence. `resolveVoucherType` is never called from `generateVoucherNo`. |
| Q3 — Sequence write-back | (C) Dual-write registry + flat-key | `persistSequenceToRegistry` (SSOT) + `localStorage.setItem(flatKey, ...)` (safety). |
| Q4 — Fallback on unresolved prefix | (A) Silent fallback to Block 2A | When `resolvePrefix` returns null, executes verbatim Block 2A body (newKey/legacyKey migration + `padStart(4,'0')`). |

---

## STOP-AND-RAISE section

**Empty by intent.** No adjacent items surfaced during the surgical pass:
- `generateDocNo` left untouched (separate concern).
- `persistSequenceToRegistry` kept internal — not exported.
- No caller files touched.
- No "while we're in here" cleanups elsewhere in `fincore-engine.ts`.
- No new tests added.
- No interface modifications.
- No Print components or voucher forms touched.
- No UI hooks or pages touched.

---

**HALT for §2.4 Real Git Clone Audit. Block 2C-i NOT started. Not self-certified.**
