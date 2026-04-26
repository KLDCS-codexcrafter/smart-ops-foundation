# Block 1 — D-140 Pre-Flight Validation (decimal-helpers.ts · dAdd extraction)

## Pattern tested
Move `dAdd` from sam-engine.ts L13 inline definition to shared
`src/lib/decimal-helpers.ts` import. Verify sam-engine still compiles
and behavior is identical (helper is pure · no semantic change).

## Site validated
sam-engine.ts L13 dAdd extraction (canonical pattern that 6 other helpers will follow)

## Verification
- decimal-helpers.ts file created with OWW §8.9 header: yes
- sam-engine.ts imports dAdd from new file: yes
- Inline dAdd definition removed from sam-engine.ts L13: yes
- tsc --noEmit: 0 errors
- eslint --max-warnings 0 exit: 0

## Verdict
- [x] PATTERN VALIDATED · proceed to Block 2 (extract remaining 6 helpers)
- [ ] PATTERN FAILED · STOP · surface to founder
