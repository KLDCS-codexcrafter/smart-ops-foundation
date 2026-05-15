# Hardening-B · Block 2B-pre-2 — Close Summary

**Sprint:** T-Phase-1.Hardening-B · Block 2B-pre-2 — Voucher-Type Parent-Child Hierarchy (Tally-Style 1-Level) + `resolveVoucherType` Inheritance Resolver
**Predecessor HEAD:** `1c9e529` (Block 2B-pre banked)
**Status:** Banked pending §2.4 Real Git Clone Audit. **Not self-certified.**

---

## SUPPLEMENT 7 reconciliation

All named sites verified at HEAD `1c9e529` prior to edit. Zero drift beyond ±5 line tolerance.

| Site | Expected line | Found | Delta | Outcome |
|---|---|---|---|---|
| `voucher-type.ts` `export interface VoucherType {` | 236 | 236 | 0 | OK |
| `voucher-type.ts` `voucher_classes?: VoucherClass[]` | 294 | 294 | 0 | OK — anchor for new field |
| `voucher-type.ts` closing `}` of `VoucherType` | 303 | 303 | 0 | OK |
| `voucher-type.ts` `export interface VoucherClass {` | 204 | 204 | 0 | OK — NOT modified |
| `fincore-engine.ts` `generateVoucherNo` | 158 | 158 | 0 | OK — NOT modified |
| `fincore-engine.ts` `fyForDate` | 216 | 216 | 0 | OK — NOT modified |
| `fincore-engine.ts` `resolvePrefix` | 248 | 248 | 0 | OK — NOT modified |
| `fincore-engine.ts` `loadVoucherTypesForResolve` | 273 | 273 | 0 | OK — REUSED, not duplicated |

---

## 2-item verdict

| # | Item | Outcome |
|---|---|---|
| 1 | Add `parent_voucher_type_id?: string` to `VoucherType` (one-block authorized) with full docstring | **Done** — added immediately after `voucher_classes?` block, before placeholder section header. Optional `?:` marker. Docstring covers Tally 1-level constraint, full-merge inheritance semantics, and four downstream consumers. |
| 2 | Add `resolveVoucherType(vtId, entityCode): VoucherType` helper in `fincore-engine.ts` adjacent to `loadVoucherTypesForResolve` / `resolvePrefix` | **Done** — exported, reuses `loadVoucherTypesForResolve` (not duplicated), full-merge per-field with the exact 10-key Q3 never-inherit list, three throw conditions wired (chain > 1, parent not found, parent `is_system !== true`). Exposed but **NOT** called by `generateVoucherNo`. |

---

## Files in diff (exactly 3 expected)

| # | File | Change shape | Insertions | Deletions |
|---|---|---|---|---|
| 1 | `src/types/voucher-type.ts` | +1 optional field with docstring | ~22 | 0 |
| 2 | `src/lib/fincore-engine.ts` | +1 new exported helper `resolveVoucherType` | ~85 | 0 |
| 3 | `src/__tests__/__sprint-summaries__/hardening-b-block2b-pre-2-close-summary.md` | NEW close summary | this file | 0 |

No additional files in diff. Surgical bound respected.

---

## Triple Gate — baseline vs final

| Gate | Baseline (HEAD `1c9e529`) | Final | Delta |
|---|---|---|---|
| TSC | 0 errors | 0 errors | 0 |
| ESLint | 0 errors / 0 warnings | 0 errors / 0 warnings | 0 |
| Vitest | 1209 / 165 | 1209 / 165 | **IDENTICAL** ✓ |
| Build | clean | clean | 0 |

Vitest count IDENTICAL as required (no behaviour change — schema-additive + helper-exposed-not-wired).

---

## 0-diff confirmations

- `src/lib/decimal-helpers.ts` — 0-diff (Precision Arc closed; untouched).
- `src/types/cc-masters.ts` — 0-diff (protected zone).
- `src/components/operix-core/applications.ts` — 0-diff (protected zone).
- `src/lib/cc-compliance-settings.ts` — 0-diff (protected zone).
- `src/data/voucher-type-seed-data.ts` — 0-diff (no existing VT has a parent today).
- `generateVoucherNo` body — BYTE-IDENTICAL to Block 2A.
- `generateDocNo` body — BYTE-IDENTICAL to Block 2A.
- `resolvePrefix` body — BYTE-IDENTICAL to Block 2B-pre.
- `loadVoucherTypesForResolve` body — BYTE-IDENTICAL to Block 2B-pre (REUSED).
- `fyForDate`, `getFY`, `getCurrentFY`, `resolveStartMonth`, `postVoucher` — all BYTE-IDENTICAL.
- All **30** `generateVoucherNo` caller signatures — BYTE-IDENTICAL.
- All **48** `generateDocNo` caller signatures — BYTE-IDENTICAL.
- All `*Print.tsx` components — 0-diff.
- All voucher form pages — 0-diff.
- `VoucherTypesMaster.tsx` — 0-diff (UI doesn't know about parent yet; future sprint).
- `useVoucherTypes.ts` — 0-diff.
- `VoucherClass` interface — 0-diff (founder ruling: classes stay flat; no `parent_class_id`).
- `VoucherBaseType` union — 0-diff.
- All other `VoucherType` existing fields — 0-diff.

---

## One-block protected-zone authorization statement

`src/types/voucher-type.ts` was touched in this block under explicit one-block authorization granted by the founder per ruling (α). The touch was scoped **strictly** to the addition of the single optional `parent_voucher_type_id?: string` field plus its docstring — zero existing fields, interfaces, or unions modified. **Protected-zone status is RESTORED** the moment 2B-pre-2 banks; further edits to this file require fresh one-block authorization.

---

## Schema additions summary — Q-LOCK satisfaction

Single field added: `parent_voucher_type_id?: string` on `VoucherType`.

| Q-LOCK | Founder ruling | Implementation |
|---|---|---|
| Q1 — parent reference | References parent's `id` field within same entity-scoped registry | Resolver does `vts.find(v => v.id === vt.parent_voucher_type_id)` against the entity-scoped load |
| Q2 — inheritance semantics | Full-merge per-field; child overrides where present; missing fields inherit | `merged = { ...parent }` then per-key override loop where `vt[key] !== undefined` |
| Q3 — never-inherit keys | Exactly 10 keys | `NEVER_INHERIT_KEYS = ['id','name','abbreviation','numbering_prefix','current_sequence','voucher_classes','parent_voucher_type_id','entity_id','created_at','updated_at']` |
| Q4 — depth enforcement | Runtime resolver throws on chain > 1; UI deferred | Throws if `parent.parent_voucher_type_id` is set |
| Q5 — three throw conditions | Chain > 1, parent not found, parent `is_system !== true` | All three wired with explicit error messages |

---

## STOP-AND-RAISE section

**Empty by intent.** No adjacent items surfaced during the surgical pass. No "while we're in here" temptations actioned. No seed rows populated. No callers touched. No sub-helpers extracted (merge logic kept inline per scope).

---

**HALT for §2.4 Real Git Clone Audit. Block 2B main NOT started. Not self-certified.**
