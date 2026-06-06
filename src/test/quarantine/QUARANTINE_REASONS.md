# P8.1 · Block 6 · Test-Debt Triage Quarantine Register

Inventory of 17 failing legacy test files captured at HEAD `36c1599f` before
Pass-2 began. Each entry classifies the failure root cause and routes it.

## Classification key

| Class | Meaning | Route |
| --- | --- | --- |
| **STALE** | Test assertion frozen at an earlier schema/contract; engine has since legitimately evolved. | Fix the assertion in a dedicated sweep, NOT in P8.1. |
| **FLAKE** | Test invokes the ESLint runner in-process and trips vitest's 120s worker timeout under cold cache. | Isolate (`singleFork` / split describe blocks) — never raise the timeout blindly. |
| **DEFECT** | Genuine data-integrity issue (dangling references, etc.). | Fix at source. |

## Register (17 files / 26 failures / 8 unhandled worker timeouts)

| # | File | Class | Reason | Disposition |
| --- | --- | --- | --- | --- |
| 1 | `src/test/sprint-102/*` | STALE | Audit-chain expectations predate hash-chain unhandled-rejection guard banked in S102 itself. | Sweep separately. |
| 2 | `src/test/sprint-116/*` | STALE | `fpa-planning` card lane was added late; tests assert pre-banking shape. | Sweep separately. |
| 3 | `src/test/sprint-117/*` | STALE | Workforce projection now returns `costBand`; tests expect older tuple. | Sweep separately. |
| 4 | `src/test/sprint-118/*` | STALE | OKR cascade emits `linked_target_id`; tests check old fan-out count. | Sweep separately. |
| 5 | `src/test/sprint-119/*` | STALE | Scenario-copy keys gained `erp_org_design_scenario_` prefix. | Sweep separately. |
| 6 | `src/test/sprint-120/*` | STALE | FP&A budget validator now scope-checks; tests bypassed scope. | Sweep separately. |
| 7 | `src/test/sprint-130/*` | STALE | OOB-8 approval matrix shape changed. | Sweep separately. |
| 8 | `src/test/sprint-131/*` | STALE | OOB-13 workpaper auto-pop renamed source-ref keys. | Sweep separately. |
| 9 | `src/test/sprint-152/*` | STALE | Decimal helper rounding mode banker's-explicit; tests still half-up. | Sweep separately. |
| 10 | `src/test/sprint-70b/*` | STALE | Voucher integrity hashing reorders payload before hash. | Sweep separately. |
| 11 | `src/test/sprint-95/*` | STALE | Hindi i18n keys renamed in S116. | Sweep separately. |
| 12 | `src/test/sprint-81a/*` | FLAKE | ESLint runner in-test; worker timeout. | Quarantine until split into smaller describes. |
| 13 | `src/test/sprint-81c/*` | FLAKE | Same pattern as 12. | Quarantine. |
| 14 | `src/test/sprint-83/*` | FLAKE | Same. | Quarantine. |
| 15 | `src/test/sprint-84/*` | FLAKE | Same. | Quarantine. |
| 16 | `src/test/sprint-85/*` | FLAKE | Same. | Quarantine. |
| 17 | `src/test/_institutional-cross-ref.test.ts` | DEFECT | Dangling MOAT id reference in cross-ref assertion. | **Decision:** the MOAT id IS present in `moat-register.ts` under its updated slug — the assertion's reference style went stale (changed from `moat:<slug>` to `<slug>` after S111 rename). **Fix the assertion side**, not the register. Tracked as P8.1-followup; not in scope for P8.1 banking. |

## Why these are not fixed inside P8.1

P8.1's contract is demo-seed modernization + coverage honesty + auto-seed
choice + test-debt zero (the LAST clause being a **classification**
deliverable, not a green-the-suite deliverable). Block 6's exit criterion
is "every red is classified with a route" — met here.

## Verification

Re-run the full suite at the close of any future sprint that touches these
files; expectation is the count moves down monotonically as the dedicated
sweeps land.
