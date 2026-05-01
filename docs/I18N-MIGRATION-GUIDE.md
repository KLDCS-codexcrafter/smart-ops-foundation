# i18n Migration Guide

## Migration Status (post-1.2.5h-c2-fix)

- **30 priority pages migrated** with `useT()` (page title + 3-5 visible strings each)
- **223 dictionary keys** in en.ts ↔ hi.ts (parity enforced by test U4)
- **~466 page components remaining** on Phase 1.6 backlog — migrate as touched
- Sprint 1.2.5h-c2-fix added 17 new page-title keys + 2 common keys (`storage`, `logout`)

Sprint T-Phase-1.2.5h-c2 closed L-4 (i18n not set up). The framework is in place
and all 30 high-traffic priority pages are now migrated. The remaining ~466 page
components need incremental migration as they're touched.

## Pattern

```tsx
import { useT } from '@/lib/i18n-engine';

export function MyComponent() {
  const t = useT();
  return <Button>{t('common.save', 'Save')}</Button>;
}
```

Every `t()` call MUST include a fallback English string as the second argument.
This guarantees the UI never shows raw keys even if the dictionary is missing
the key in the active locale.

## Variable interpolation

```tsx
t('approval.submitted_by', 'Submitted by {name} at {time}', {
  name: 'Alice',
  time: '10:30 AM',
});
```

## Adding new keys

1. Add the key + English value to `src/data/i18n/en.ts` in the appropriate category
2. Add the same key + Hindi translation to `src/data/i18n/hi.ts` (parity test U4 enforces this)
3. Use `t('your.key', 'Fallback English')` in the component

Test U3 ensures the dictionary stays at >= 200 keys; U4 enforces parity with `hi.ts`.

## Per-entity locale persistence

Locales are persisted per-entity (Bucket C):
```
erp_locale_${entityCode}     // user's locale for entity X
erp_locale_system            // fallback when no entity selected
```

Switching locale via the `LocaleToggle` in `ERPHeader.tsx` calls
`setLocale(next, entityCode)` so each entity remembers its operator's preference.

## What to translate

DO translate:
- Card titles, section headers, tab labels, dialog titles
- Primary CTA buttons (Save, Submit, Cancel, Approve)
- Inline form-field error messages
- Toast titles + descriptions for user-triggered actions

DON'T translate:
- Voucher numbers, dates, currency symbols (₹), IDs, PAN, GSTIN
- Table column headers that are abbreviations (UoM, Qty, Rate)
- Field names that are already English standards (GRN, MIN, PO, SO) — keep as-is
- Audit trail entries (compliance: archived in English for tax officer audit)

## Phase 1.6 Migration Backlog

Files containing `// i18n-todo: Sprint T-Phase-1.2.5h-c2` markers indicate pages
where only top-level strings have been wrapped. Each subsequent Card touch
(Procure360, Production, etc.) should migrate the touched files fully.

Approximate scope:
- ~466 page components remain on backlog
- ~30 reports + ~50 master forms most-visible after Tier-A/B
- Phase 2 backend will provide server-driven dictionaries via
  `/api/i18n/{locale}.json` (currently statically imported).

## Adding a new locale (post-Hindi)

To add Marathi, Tamil, etc.:
1. Create `src/data/i18n/{locale}.ts` with all 200+ keys
2. Update `Locale` type in `src/lib/i18n-engine.ts` to include the new code
3. Add it to the `resources` block in the i18n init call
4. Add a corresponding option to `LocaleToggle.tsx`

Indic languages render correctly via system fonts; no font assets bundled.
