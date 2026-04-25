# Block 1 — D-140 Pre-Flight Validation

## Pattern tested
Remove re-export of hook from component file (`useGlobalDateRange.tsx` L26)
and update importers to import from `GlobalDateRangeContext.ts` directly.

## Site validated
`src/hooks/useGlobalDateRange.tsx` — re-export removed.
2 importers updated:
- `src/components/layout/ERPDatePicker.tsx:11`
- `src/components/layout/ERPHeader.tsx:55`

## Verification
- `tsc --noEmit -p tsconfig.app.json`: **0 errors**
- ESLint warnings on `useGlobalDateRange.tsx`: **0**
- Total `react-refresh` count: **17** (baseline 18 · −1 as expected)

## Verdict
- [x] PATTERN VALIDATED · proceed to Sites 2-3 in Blocks 2-3
- [ ] PATTERN FAILED
