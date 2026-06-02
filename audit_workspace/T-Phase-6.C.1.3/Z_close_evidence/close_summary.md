# Sprint 107 · T-Phase-6.C.1.3 · Arc 2 · Pillar C.1 · IC Transactions Pt 2 — Close Summary

**Sprint tag:** T-Phase-6.C.1.3
**Predecessor HEAD:** `30839e082e3250b11ac79ef40b6696e7d64e8481` (S106 banked post-T1 · 32 ⭐)
**Streak target:** 33 ⭐
**Pass mode:** SINGLE-PASS (additive within ASK-zone budget)

---

## Deliverables

| # | Item | Path |
|---|---|---|
| 1 | Engine extension · +4 IC types | `src/lib/intercompany-transaction-engine.ts` (`expense_allocation`, `asset_transfer`, `invoice`, `payment`) |
| 2 | Settlement transition (`posted`→`settled`) | `settleICTransaction` in same engine |
| 3 | NEW audit type | `intercompany_settlement` (module: `mca-roc`) — `src/types/audit-trail.ts` |
| 4 | UI extension · 4 new type options + Settle action | `src/features/intercompany/IntercompanyTransactionsHubPage.tsx` |
| 5 | Test pack (45 it) | `src/test/sprint-107/intercompany-transactions-pt2.test.ts` |
| 6 | Register updates | sprint-history S106 headSha backfill (→ `30839e08`) + S107 TBD_AT_BANK entry |
| 7 | S106 test adapter | `src/test/sprint-106/intercompany-transactions-pt1.test.ts` (additive-union tolerance) |

SIBLINGs: 174 → 174 (+0). Standalone pages: 35 → 35 (+0). Audit types: +1.

---

## §L · Rationale, Boundaries, and Decisions

### §L.1 · Block 0 · HEAD + spine re-confirmed
Working HEAD at sprint start ≈ predecessor `30839e08…` (per prompt). Re-verified intact:
- `ICTransactionType` union (S106) + `buildReciprocalVouchers` switch ✓
- `mkLine(code, dr, cr)` shape ✓
- `postICTransaction` orchestrates `resolvePrice` → `generateTPAudit` → `postVoucher` (FR-44 spine) ✓
- All 4 underlying engines unchanged (§H 0-DIFF preserved · see §L.8).

No divergence — proceeded per FR-1.

### §L.2 · The 4 new IC types (completes 8/8)
| Type | Priced? | Source-side (Dr / Cr) | Counterparty-side (Dr / Cr) |
|---|---|---|---|
| `expense_allocation` | NO | IC-RECV / IC-EXP-ALLOC-INC | IC-EXP-ALLOC-EXP / IC-PAY |
| `asset_transfer` | YES | IC-FA-RECV / IC-FA-OUT | IC-FA-IN / IC-FA-PAY |
| `invoice` | YES | IC-AR / IC-SALES | IC-PURCHASES / IC-AP |
| `payment` | NO | IC-PAY / CASH-BANK | CASH-BANK / IC-RECV |

`expense_allocation` + `payment` join `UNPRICED_IC_TYPES` alongside S106's `capital_infusion` + `loan` (rationale: cost-share allocations and cash settlements are not arms-length supplies under §92).

### §L.3 · Settlement transition (`settleICTransaction`)
Pure status mutation: `posted` → `settled`. Guards:
- Source IC txn must exist + be in `posted` state (throws otherwise — Block 3 tests assert).
- Both source + reciprocal records flipped atomically (write both before returning).
- Emits `intercompany_settlement` audit entry ONLY on success.
- No voucher mutation. No ledger writes. No reversal of prior posting. Cancellation/reversal deferred to S108 (matching arc).

§L-flagged scope wall: settle does NOT call `postVoucher`, does NOT touch fincore. It is a registry transition — settlement-clearing vouchers are an S108 concern.

### §L.4 · Audit type added: `intercompany_settlement`
Added to `AuditEntityType` union + `getModuleForEntityType()` mapping (module: `mca-roc`, same as `intercompany_transaction`). One type only — `intercompany_match` deferred to S108 (no matching logic implemented this sprint).

### §L.5 · UI extension — additive only
`IntercompanyTransactionsHubPage` (page #35, NOT a new page):
- Draft-form type select gains 4 new options.
- Posted-status rows gain a "Settle" action → calls `settleICTransaction` + toasts + refreshes.
- All existing S106 type flows untouched (regression-tested).
- No new sidebar entry · no new route · no new SIBLING.

### §L.6 · S106 test adapter (additive-union tolerance)
S106 tests originally asserted `ICTransactionType` equals an exact 4-element set. Updated to assert **superset** semantics (`expect(types).toEqual(expect.arrayContaining([...s106_types]))`) so additive union growth doesn't break historical pack. No behavioral assertions changed.

### §L.7 · §H ZERO-TOUCH boundaries upheld
0-DIFF this sprint:
- `internal-pricing-engine.ts` ✓
- `idea-7-transfer-pricing-audit-engine.ts` ✓
- `fincore-engine.ts` ✓
- `hierarchical-ledger-engine.ts` ✓
- `intercompany-group-structure-engine.ts` ✓
- `mock-entities.ts` ✓
- `comply360-tier2-extensions-engine` ✓
- All Comply360 sidebar/types ✓

### §L.8 · Scope wall (DP-A2-9 reaffirmed)
Engine surface area gains: `settleICTransaction` only. Still **absent**: `matchICTransactions`, `eliminateICEntries`, `consolidateGroup`, `buildConsolidatedPL`, `reverseICTransaction`, `cancelICSettlement`. Test pack asserts absence. Matching + eliminations + consolidation = S108 / Arc 3.

### §L.9 · Register backfill (Block 1)
- S106 `headSha`: `'TBD_AT_BANK'` → `'30839e082e3250b11ac79ef40b6696e7d64e8481'` (T1 hotfix final HEAD per prompt §11 — NOT the Pass-A `4d1ce9ca`).
- S107 entry appended with `headSha: 'TBD_AT_BANK'`, `predecessorSha: '30839e08…'`, `provenance: 'PENDING_BACKFILL'`, `grade: 'A'`.
- Sha-backfill meta-test passes — S107 is the lone PENDING_BACKFILL.

### §L.10 · Z-evidence discipline (Operix v1 §1)
0 changes under `audit_workspace/Z*_close_evidence/`. Sprint spec did not require Z-evidence regeneration.

---

## Triple Gate

| Gate | Result |
|---|---|
| `npx tsc -p tsconfig.app.json --noEmit` | **0 errors** |
| `npx eslint . --max-warnings 0` | **0/0** (streak **58**) |
| `npx vitest run src/test/sprint-107 src/test/sprint-106 src/test/_meta` | **PASS** (45 + 55 + meta) |
| `npm run build` | **PASS** |

Total project vitest: 336/336 passing.

---

## Counters

- Sprints banked: 106 → 107 (33rd A target)
- SIBLINGs: 174 → 174 (+0 · engine extension only)
- Standalone pages: 35 → 35 (+0 · page #35 extended in-place)
- Audit types: +1 (`intercompany_settlement`)
- IC types coverage: 4/8 → **8/8 ✓ COMPLETE**
- ESLint streak: 57 → 58
- A-streak: 32 → 33 ⭐ (pending bank)

Closes IC Transactions arc (Pt 1 + Pt 2). Matching + eliminations + consolidated P&L → S108.
