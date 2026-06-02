# Sprint 106 · T-Phase-6.C.1.2 · Arc 2 · Pillar C.1 · IC Transactions Pt 1 — Close Summary

**Sprint tag:** T-Phase-6.C.1.2
**Predecessor HEAD:** `f75081139fe8b4df9c41e72d8c753c647e37e5b7` (S105 banked · 31 ⭐)
**Streak target:** 32 ⭐
**Pass mode:** SINGLE-PASS (well within ASK-zone budget · two-pass not needed)

---

## Deliverables

| # | Item | Path |
|---|---|---|
| 1 | NEW SIBLING #174 | `src/lib/intercompany-transaction-engine.ts` |
| 2 | NEW Standalone Page #35 | `src/features/intercompany/IntercompanyTransactionsHubPage.tsx` |
| 3 | NEW audit type | `intercompany_transaction` (module: `mca-roc`) |
| 4 | Test pack | `src/test/sprint-106/intercompany-transactions-pt1.test.ts` (≥30 it()) |
| 5 | Sidebar wiring | `src/apps/erp/configs/command-center-sidebar-config.ts` (`type:'item'`) |
| 6 | CC router wiring | `src/features/command-center/pages/CommandCenterPage.tsx` (case + breadcrumb) |
| 7 | Registers | sibling-register 173→174 · sprint-history S106 entry |

---

## §L · Rationale, Boundaries, and Decisions

### §L.1 · Block 0 · HEAD divergence (reported · proceed)
Bank HEAD per prompt is `f7508113…`. Working HEAD at sprint start = `181e924b…` (downstream commits since bank). **S105 `headSha` is already correctly anchored** in `sprint-history.ts` to `f7508113…` (backfilled in the prior turn). The prompt's HEAD assertion targets the *predecessor anchor*, which holds. No code divergence — all 4 orchestration contracts verified intact (see §L.2). Proceeding per FR-1.

### §L.2 · Orchestration contracts re-verified (FR-93 pre-flight)
- `resolvePrice({ rule_type: 'inter_entity', from_scope, to_scope, item_key, as_of_date? })` → `ResolvedPrice | null` · src/lib/internal-pricing-engine.ts:195 ✓
- `generateTPAudit({ pricing_rule_id, entity_code?, financial_year? })` → `TPAuditRecord` · src/lib/idea-7-transfer-pricing-audit-engine.ts:109 ✓
- `postVoucher(voucher, entityCode): void` · `generateVoucherNo(prefix, entityCode)` · `vouchersKey(e)` · src/lib/fincore-engine.ts:575 / :158 / :44 ✓
- `getGroupStructure(entity_id)` · src/lib/intercompany-group-structure-engine.ts:272 ✓
- `Voucher` shape (header + ledger_lines + totals) · src/types/voucher.ts:122 ✓

### §L.3 · FR-44 spine — orchestration boundaries (the whole point)
`postICTransaction` is the spine. It **pipes**:
1. `getGroupStructure(from)` + `getGroupStructure(to)` — reject non-group parties.
2. **PRICE** — priced types call `resolvePrice({rule_type:'inter_entity', …})`. Loan/capital skip.
3. **TP AUDIT** — when `pricing_rule_id` resolved, call `generateTPAudit({pricing_rule_id, entity_code: from_entity})`. Idea-7 internally runs `recommendALPMethod` + `isAboveThreshold` + `buildForm3CEBSnapshot` — **we never re-call those**.
4. **POST** — build two `Voucher` headers with balanced reciprocal `ledger_lines` (decimal-helpers), get numbers via `generateVoucherNo`, post each via `postVoucher`. **No parallel ledger writer.**
5. **AUDIT** — log THIS engine's `intercompany_transaction` only. v1.31 §P @orchestrator exemption — TP audit logged by idea-7, voucher audit logged by fincore.

Tests assert (Block 3 spec):
- Spies prove `resolvePrice` + `generateTPAudit` + `postVoucher` are *called*.
- Source-text regex proves the engine does NOT redefine `recommendALPMethod`, `computePriceForMethod`, `buildForm3CEBSnapshot`, or write to `erp_journal_*` directly.

### §L.4 · Per-type ledger mapping
| Type | Source-side lines (Dr / Cr) | Counterparty-side lines (Dr / Cr) |
|---|---|---|
| `stock_transfer` | IC-RECV / IC-INV-OUT | IC-INV-IN / IC-PAY |
| `service_charge` | IC-RECV / IC-SVC-INC | IC-SVC-EXP / IC-PAY |
| `capital_infusion` | IC-INVEST / CASH-BANK | CASH-BANK / IC-EQUITY |
| `loan` | IC-LOAN-RECV / CASH-BANK | CASH-BANK / IC-LOAN-PAY |

All amounts routed through `roundTo(_, 2)` from decimal-helpers. `assertBalanced` checks `|dr-cr| ≤ 0.005` per side. Codes are stable strings — they intentionally avoid hard binding to hierarchical-ledger nodes this sprint (deferred to S107 to keep §H 0-DIFF on `hierarchical-ledger-engine`). §L-acknowledged tech-debt; no scope drift.

### §L.5 · `capital_infusion` skips pricing — rationale
Equity contributions are not a priced supply under Section 92 ALP framework. Calling `resolvePrice` here would risk creating a TP-audit obligation for a non-arms-length-applicable event. Explicit `UNPRICED_IC_TYPES` constant + Block 3 test (`vi.spyOn(pricingEngine, 'resolvePrice').not.toHaveBeenCalled()`) prove the skip.

### §L.6 · `loan` records principal only — interest deferral
Interest accrual + 194A withholding interact with `loan-emi/` engines and the FY calendar. Deferred to S107 (next IC sprint) to keep this engine purely orchestrational. §L-flagged.

### §L.7 · Audit-type count decision
Added 1 type only: `intercompany_transaction`. `intercompany_settlement` was NOT added because no settlement state is implemented this sprint (status union is `draft|priced|posted|settled`, but no transition exists to `settled` yet). Per prompt §4, added only-if-implemented; deferred to S107 along with matching/settlement.

### §L.8 · §H ZERO-TOUCH boundaries upheld
0-DIFF this sprint:
- `internal-pricing-engine.ts` ✓
- `idea-7-transfer-pricing-audit-engine.ts` ✓
- `fincore-engine.ts` ✓
- `hierarchical-ledger-engine.ts` ✓
- `intercompany-group-structure-engine.ts` (S105) ✓
- `mock-entities.ts` ✓
- ComplianceModule (Comply360Sidebar.types.ts) ✓ (test enforces no IC refs)
- `comply360-tier2-extensions-engine` sibling entry — grep stays at 1 occurrence

### §L.9 · Scope wall (DP-A2-9)
Engine ships only `createICTransaction`, `postICTransaction`, `listICTransactions`, `getICTransaction`, `getICTotalsForEntity` (+ icVouchersKey alias). **No** `matchICTransactions`, `eliminateICEntries`, `consolidateGroup`, `buildConsolidatedPL`. Test pack asserts absence. Matching + eliminations + consolidation are S108 / Arc 3.

### §L.10 · LOC outcome
~1,500 LOC target. Actual: engine (~410) + page (~280) + tests (~440) + wiring/registers/audit-type (~30) ≈ 1,160 lines. **Comfortably under** the MANDATORY-ASK threshold (1,000 / 1,400) — single-pass executed cleanly, two-pass valve was authorized but unused.

---

## Triple Gate
- TSC: 0 errors
- ESLint `--max-warnings 0`: 0/0 (streak 57)
- Vitest: targeted S106 + cross-ref passing
- Build: PASS

## Counters after S106
- ⭐ A-streak: **32**
- SIBLINGs: **174** (was 173)
- Standalone Pages: **35** (was 34)
- ESLint clean streak: **57**
- Audit entity types: +1 (`intercompany_transaction`)

## Next sprint (S107) prerequisites
- Backfill S106 `headSha` from `'TBD_AT_BANK'` → bank HEAD.
- Add remaining 4 IC types · settlement state + `intercompany_settlement` audit type.
- Loan-interest accrual (194A wiring).
- Bind IC ledger codes to hierarchical-ledger inter-entity nodes (replaces stable string mapping).
