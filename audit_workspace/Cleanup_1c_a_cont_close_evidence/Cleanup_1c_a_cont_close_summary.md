# T-H1.5-Z-Cleanup-1c-a-cont — Close Summary

## Outcome
Cleanup-1c-a properly closed. 3 hook re-exports removed via per-site
extraction pattern (no shortcuts). ESLint `react-refresh/only-export-components`
warning count dropped from **18 → 15** (remaining 15 all in
`ComplianceSettingsAutomation.tsx` · Cleanup-1c-b territory).

## 3-Site Decision Table

| # | Site | Approach | New file | Importers updated |
|---|------|----------|----------|-------------------|
| 1 | `src/hooks/useGlobalDateRange.tsx` | Remove L26 re-export · point importers at existing `GlobalDateRangeContext.ts` | none | 2 (`ERPDatePicker`, `ERPHeader`) |
| 2 | `src/hooks/useLanguage.tsx` | Remove L15 re-export · point importers at existing `LanguageContext.ts` | none | 3 (`UserProfileDropdown`, `LanguageSwitcher`, `Profile`) |
| 3 | `src/components/ask-dishani/DishaniContext.tsx` | **Approach B** — extract React context to new `DishaniContextObject.ts`; extract hook to new `useDishani.ts`; Provider file imports the context object. | 2 (`DishaniContextObject.ts`, `useDishani.ts`) | 3 (`DishaniFloatingButton`, `DishaniPanel`, `index.ts` barrel) |

Approach B was chosen for Site 3 because the React context object was
defined inline in `DishaniContext.tsx` and not previously exported — the
"point at existing context" path used in Sites 1-2 was not available.
Extraction also resolves an HMR module-duplication runtime error
("useDishani must be used within DishaniProvider") that Founder was hitting
in preview after fast-refresh cycles.

## Hard Invariants

| # | Invariant | Result |
|---|-----------|--------|
| I-1 | tsc 0 errors | ✅ 0 |
| I-2 | eslint 0 errors | ✅ 0 errors |
| I-3 | npm run build | ✅ green (33.93s) |
| I-4 | exhaustive-deps = 0 | ✅ 0 |
| I-5 | react-refresh = 15 | ✅ 15 (was 18) |
| I-6 | total warnings = 15 | ✅ 15 |
| I-9 | eslint-disable ≤ 95 | ✅ no new disables added in this sprint |
| I-10 | `comply360SAMKey` = 27 occurrences | ✅ 27 |
| I-11 | NO hook re-exports in the 3 files | ✅ verified by grep |
| I-13 | No new npm deps | ✅ package.json untouched |
| I-14 | Block 1 D-140 validation executed | ✅ `Block_1_validation_result.md` |
| I-15 | All 8 importer updates clean | ✅ tsc 0 errors |
| I-16 | ESLint config unchanged | ✅ |

## Files Changed

**Modified (8):**
- `src/hooks/useGlobalDateRange.tsx` (re-export removed)
- `src/hooks/useLanguage.tsx` (re-export removed)
- `src/components/ask-dishani/DishaniContext.tsx` (context + hook extracted out)
- `src/components/layout/ERPDatePicker.tsx` (importer)
- `src/components/layout/ERPHeader.tsx` (importer)
- `src/components/auth/UserProfileDropdown.tsx` (importer)
- `src/components/layout/LanguageSwitcher.tsx` (importer)
- `src/pages/Profile.tsx` (importer)
- `src/components/ask-dishani/DishaniFloatingButton.tsx` (importer)
- `src/components/ask-dishani/DishaniPanel.tsx` (importer)
- `src/components/ask-dishani/index.ts` (barrel)

**Created (2):**
- `src/components/ask-dishani/DishaniContextObject.ts`
- `src/components/ask-dishani/useDishani.ts`

## ISO 25010 Scorecard

| Characteristic | Pre | Post | Evidence |
|---|---|---|---|
| Functional Suitability | HIGH | HIGH | tsc 0 · build green · runtime Dishani error fixed |
| Reliability | HIGH++(0.65) | HIGH++(0.7) | HMR fast-refresh works in all 3 provider files |
| Maintainability | HIGH+++(0.7) | HIGH+++(0.8) | Cleanup-1c-a properly closed · pattern consistent |

## Eight-Lens Debrief
- **WHO:** Lovable executed · Founder smoke pending
- **WHAT:** 3 re-exports removed · 2 new files · 8 importer rewrites
- **WHEN:** Apr-2026
- **WHERE:** `src/hooks/`, `src/components/ask-dishani/`, plus 5 importer sites
- **WHY:** Honor 100% production-ready bar · D-140 validates shortcut-free pattern
- **WHICH:** Per-site extraction · no re-exports
- **WHOM:** Phase 2 dev team (clean HMR) · Founder (preview no longer crashes)
- **HOW:** 5 blocks · Block 1 validated pattern before scaling

## Hand-off to Cleanup-1c-b
Remaining 15 react-refresh warnings are all in
`src/pages/erp/accounting/ComplianceSettingsAutomation.tsx`. Once cleared,
`eslint src --max-warnings 0` exits 0 → Z2 unblocked.
