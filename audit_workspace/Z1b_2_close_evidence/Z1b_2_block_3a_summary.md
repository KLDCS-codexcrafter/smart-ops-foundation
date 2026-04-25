# Sprint T-H1.5-Z-Z1b.2 — Block 3a Close

**Scope completed**: LedgerMaster.tsx (34 sites) + ItemCraft.tsx (43 sites) = 77 explicit `any` removed.

## Status
- `npx tsc --noEmit`: 0 errors (output: 12 bytes, empty)
- `npm run build`: green, ✓ built in 33.92s
- ItemCraft.tsx: 0 real `any` sites
- LedgerMaster.tsx: 0 real `any` sites (2 hits in `//` comments only)
- Project-wide: 224 → ~143 (Block 3b–3e remaining)

## Remediation patterns used
1. **Master-data lists** (`groups`, `brands`, `uoms`, `godowns`): added local `MasterRow` type, removed `(x: any)` callbacks.
2. **Dynamic field access** on form/packing/vendor objects: introduced `getStr(obj, k)` / `getBool(obj, k)` helpers (typed as `unknown` then narrowed).
3. **Enum unions** (`stock_nature`, `status`, `level`, `barcode_type`, `dimension_unit`, `party_type`, `lenderType`, `loanType`, `rcmSection`, `gstTaxSubType`, `itcEligibility`): replaced `as any` with explicit literal-union casts derived from existing type defs.
4. **Storage boundaries** (`loadAllDefinitions`, `loadInstances`, `saveDefinition`, `saveInstance`): cast input as `Array<Record<string, unknown>>`, narrowed via field-by-field `??` defaults, then `as unknown as AnyLedgerDefinition[]` at boundary exit.
5. **Generic helpers**: `renderScopeSection` and `applyHsnSac` made generic over form shape `<F extends ...>` instead of `any`.
6. **Detail panel reads** on `AnyLedgerDefinition` union: replaced `(def as any).field` with `(def as { field?: T }).field` per access.

## Deferred to follow-up loops
- Block 3b–3e: ~143 remaining `any` sites across ~35 files (geography, foundation, pay-hub, voice-engine, etc.)
- Block 4: ESLint `no-explicit-any: 'error'` activation — stays deferred until 0 any sites project-wide.

## Evidence files
- `any_count_after_3a.txt` — per-file + project totals
- `tsc_output.txt` — empty (0 errors)
- `build_output.txt` — full build log, exit 0
- `smoke_login_screen.png` — preview reachable, login page rendered (auth gate confirmed; LedgerMaster route requires authenticated session)
