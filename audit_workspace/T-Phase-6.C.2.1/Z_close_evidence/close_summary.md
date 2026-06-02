# Sprint 109 · T-Phase-6.C.2.1 · Group Consolidation (Arc 3 Opener) — Close Summary

**Predecessor HEAD:** `d621d0a52ed50a40ca01cc562c2919cdca176bbb` (S108 close-summary commit)
**Sprint outcome:** 35th A target · +1 SIBLING (`group-consolidation-engine`) · +1 page (`GroupConsolidationPage`) · +1 audit type (`group_consolidation_run`).
**Arc:** Arc 3 OPENER · scope wall `DP-A3-9` enforced.

---

## §L — Sprint Ledger / Variance Notes

### L1 · Orchestration spine (FR-44 mirrored, NOT re-derived)
`group-consolidation-engine` is a pure orchestrator over four published APIs:
- **Per-entity TB**: walks `loadEntities()` → reads `vouchersKey(shortCode)` from localStorage (`[JWT]`-annotated) → aggregates `VoucherLedgerLine.dr_amount/cr_amount` by `ledger_group_code` on `status === 'posted'` vouchers inside the FY window (Apr–Mar).
- **Classification**: MIRRORS `pages/erp/fincore/reports/reportUtils.getL1Code` / `getL2Code`. L1 ∈ {I,E} → `pnl`; else `bs`. No parallel taxonomy invented — DP-A3 mirror discipline upheld.
- **Group structure**: READS `listGroupStructure()` from Arc 2 `intercompany-group-structure-engine`. Engine **does not** re-derive parent/subsidiary/associate relationships or `ownership_pct`. Scope-wall test asserts no re-export.
- **Eliminations**: READS `generateEliminations({fy})` from Arc 2 `group-eliminations-engine`. Engine **does not** re-run E1–E7 derivation. Each elimination is applied as a balanced negative pair against `debit_account` (Dr−=amt) and `credit_account` (Cr−=amt) so the TB remains in balance.

### L2 · Consolidation method math (3 Ind AS methods)
| Method        | Treatment                                                                                  |
|---------------|--------------------------------------------------------------------------------------------|
| `full`        | 100 % line-by-line addition of the entity's TB lines.                                      |
| `proportional`| `ownership_pct / 100` scalar applied via `dPct` to each `debit` and `credit`.              |
| `equity`      | **Not** line-by-line. Raw lines zeroed. Net P&L share rolled up as a balanced pair:        |
|               | Dr `IC-EQUITY-INVEST` / Cr `IC-EQUITY-INCOME` (reversed for losses).                       |

All math via `decimal-helpers` (`dAdd`, `dSub`, `dMul`, `dPct`, `dSum`, `round2`, `dEq`) — no native float drift.

### L3 · Consolidated P&L derivation
`buildConsolidatedPnL` slices the consolidated TB by L2 code (mirrors `ProfitLoss.tsx`):
- `revenue` ← Σ(Cr−Dr) over `L2='I-OR'`
- `cogs`    ← Σ(Dr−Cr) over `L2='E-COG'`
- `other_income` ← Σ(Cr−Dr) over `L2='I-OI'`
- `expenses` ← Σ(Dr−Cr) over `L2 ∈ {E-OE, E-FC, E-DEP}`
- Derived: `gross_profit`, `operating_profit`, `profit_before_tax`.

### L4 · Test pack & in-flight fixes (variance log)
Test pack: `src/test/sprint-109/group-consolidation.test.ts` — **41 it() blocks** (>30 required). Two hotfix iterations were needed before close:
1. **Seed shortCode drift** — initial seed used `vouchersKey('GRP1')` for entity `e1`, but `mock-entities` maps `e1.shortCode = DEFAULT_ENTITY_SHORTCODE = 'SMRT'`. Fixed seed to `'SMRT'` (no engine change — the engine correctly uses `loadEntities()` lookup).
2. **Equity-method TB imbalance** — original equity rollup posted only the Dr side of the share (Dr `IC-EQUITY-INVEST` with no Cr leg), which broke `Dr=Cr` on the consolidated TB. Fixed to post the **balanced pair** Dr `IC-EQUITY-INVEST` / Cr `IC-EQUITY-INCOME` (reversed for losses). Both legs use `dAdd` against `Math.abs(share)`.

### L5 · ESLint hygiene
`GroupConsolidationPage.tsx` initially carried three `react-hooks/exhaustive-deps` warnings on `useMemo([fy, tick])`. Same family as the S99 fix — `tick` removed from deps; `tick` value destructured-out (`const [, setTick] = useState(0)`) to avoid TS6133 while preserving the `refresh()` setter that triggers re-render. No new `eslint-disable` introduced. Streak holds at **59** modules at 0/0.

### L6 · Audit emit
Single emit per consolidation run, in `consolidate()`:
- `entityType: 'group_consolidation_run'`
- `entityCode: 'GROUP'`
- `sourceModule: 'group-consolidation-engine'`
- `module: 'mca-roc'` (audit-type registry)
- `afterState`: `{ fy, entity_count, line_count, eliminations_applied, total_debit, total_credit, balanced }`
Downstream engines (`group-eliminations-engine`, `intercompany-matching-engine`) retain ownership of their own audit emits (Arc 2). No double-logging.

### L7 · Arc 3 scope wall (DP-A3-9) — assertions
The scope-wall section of the test pack asserts that this module does **not** export any of the following (all reserved for later Arc 3 sprints):
- `buildBalanceSheet` (S111)
- `buildCashFlow` (S111)
- `computeNCI` / minority interest (S111)
- `computeGoodwill` (S111)
- FX / multi-currency translation (S110)
- disclosure / note generator (S112)
Wall passes. Arc 3 stays scoped to **Consolidated P&L + Trial Balance only** for this opener.

### L8 · Registry & SHA discipline
- `sibling-register`: count **177** (was 176) · `group-consolidation-engine` registered once.
- `sprint-history`: S108 `headSha` **backfilled** to `d621d0a5...` (close-summary commit, **not** `8f66a752`). No pre-created S110 entry. S109 entry added with `headSha: 'TBD_AT_BANK'` per protocol.
- `comply360-tier2` count unchanged at **1**.

---

## 🏁 Arc 3 Opener Completion Note

| Item                         | Count / Value |
|------------------------------|---------------|
| Stars (A targets)            | **35 ⭐**     |
| SIBLINGs                     | **177**       |
| Standalone Pages             | **37**        |
| ESLint 0/0 streak            | **59**        |
| Arc 3 audit types this sprint| **1** (`group_consolidation_run`) |
| Methods supported            | 3 (full · proportional · equity) |
| Mirror discipline            | UPHELD (ProfitLoss.tsx classifier reused) |
| Scope wall (DP-A3-9)         | ENFORCED (BS/CF/NCI/Goodwill/FX/Disclosure all blocked) |

---

## Triple Gate Evidence

```
npx tsc -p tsconfig.app.json --noEmit              → 0 errors
npx eslint . --max-warnings 0                      → 0 errors / 0 warnings
npx vitest run src/test/sprint-109 src/test/_meta  → 46/46 passing
npm run build                                      → built in 47.70s (PASS)
```

Sprint 109 closes Arc 3 Block 1. Next: S110 — multi-currency translation (FCTR/CTA) per DP-A3-10. S109 `headSha` to be backfilled at S110 Block 1 alongside this close-summary commit.
