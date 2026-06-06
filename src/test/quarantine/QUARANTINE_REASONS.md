# P8.1 · Block 6 · Test-Debt Triage Quarantine Register

**Final status after Pass 2c (full gate):** ZERO ROWS. No file remains quarantined.

## Resolution log

All 17 originally-triaged files were repaired or isolated in Pass 2a/2b:

| Class | Files | Resolution |
| --- | --- | --- |
| **STALE** (11) | sprint-102, 116, 117, 118, 119, 120, 130, 131, 152, 70b, 95 | Durable-conversion repairs (existence-with-sha, schema-only assertions, bounds checks). Snapshots that asserted "which sprint is LAST" or "exactly N items" were converted to invariants that survive future sprints. |
| **FLAKE** (5) | sprint-81a, 81c, 83, 84, 85 | Isolated via `poolMatchGlobs` → `singleFork` in `vitest.config.ts` for in-process ESLint runners. No more 120s worker timeouts. |
| **DEFECT** (1) | `_institutional-cross-ref.test.ts` | (a) Sibling direction (:102): 3 missing register entries added (entity-branding-engine, demo-seed-manifest, demo-seeders-p81). (b) MOAT direction (:92): M1-PLUS two-class assertion — `/^MOAT-\d{2}$/` strict IDs MUST resolve in register; provenance markers (DP-*, §H, prose) require only non-empty string. `TODO_MOAT_REF_NORMALIZATION` recorded in test for future normalization sprint. |

## Pass 2c gate evidence

- tick grep on touched files: 16 hits, all P8.1 Pass-2a/2b provenance.
- `tsc --noEmit` (7GB): exit 0.
- `eslint . --max-warnings 0`: exit 0.
- Full suite: `Test Files 485 passed | 3 skipped (488)` · `Tests 6699 passed | 3 skipped (6702)` · Errors: 0 · Duration 444s.
- sprint-p81 + sprint-r0: `Test Files 2 passed (2)` · `Tests 63 passed (63)`.

The 3 skipped files are pre-existing `describe.skip` (cc-compliance-settings, comply360-health-score-engine, comply360-role-config) — unrelated to P8.1.
