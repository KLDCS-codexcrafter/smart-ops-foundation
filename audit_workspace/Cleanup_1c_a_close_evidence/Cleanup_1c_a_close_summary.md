# T-H1.5-Z-Cleanup-1c-a Close Summary

## Result
- **react-refresh warnings:** 40 → **18** (closed 22)
- **exhaustive-deps warnings:** 0 (preserved from 1b-cont)
- **tsc --noEmit:** 0 errors
- **npm run build:** SUCCESS
- **comply360SAMKey count:** 27 (untouched — Cleanup-1c-b territory)
- **erp_sam_targets_${e} template:** preserved bytes-identical (D-127)

## Closed
- 8 vendor warnings via D-139 (eslint.config.js scope `src/components/ui/**`)
- 14 in-source warnings via standard move pattern across 10 files
- All importers updated to use new `.types.ts` / `.helpers.ts` / `.constants.ts` / `Context.ts` files

## New files created (12)
- src/hooks/useGlobalDateRange.types.ts
- src/hooks/GlobalDateRangeContext.ts
- src/hooks/useLanguage.types.ts
- src/hooks/LanguageContext.ts
- src/components/ask-dishani/DishaniContext.types.ts
- src/components/theme/ThemeContext.ts
- src/components/finecore/pickers/StatePicker.types.ts
- src/pages/erp/salesx/masters/TargetMaster.types.ts
- src/pages/erp/foundation/geography/CityMaster.constants.ts
- src/pages/erp/dispatch/transactions/InvoiceUploadWizard.helpers.ts
- src/features/salesx/SalesXSidebar.types.ts
- src/features/receivx/ReceivXSidebar.types.ts

## Remaining (3 in-scope + 15 ComplianceSettingsAutomation = 18)
- `src/hooks/useLanguage.tsx:15` — `export { useLanguage } from './LanguageContext'` re-export
- `src/hooks/useGlobalDateRange.tsx:26` — same pattern (`useGlobalDateRange` re-export)
- `src/components/ask-dishani/DishaniContext.tsx:171` — `export function useDishani()` (hook in same file as Provider — needs same Context.ts split as Theme/Language)

These 3 require: extract hook to `*Context.ts` and update ~10 importers across App.tsx, UserProfileDropdown, LanguageSwitcher, Profile, ERPDatePicker, ERPHeader, DishaniFloatingButton, DishaniPanel, ask-dishani/index.ts. Defer to next sprint to keep this close atomic.

## Decisions applied
- D-139 vendor scope suppression for `src/components/ui/**`
- D-127 storage key preservation invariant verified
- Pattern: extract types/helpers/context into sibling files, update all importers (no backward-compat re-exports — they trip the rule)
