# Operix Code Conventions

Sprint T-Phase-1.2.5h-c2 · Card #2.5 final · production-grade close

This document captures the engineering conventions established across Phase 1
so new code follows the same patterns the audit toolchain expects.

## File Headers

Every new `.ts` and `.tsx` file in `src/lib/`, `src/types/`, `src/hooks/`,
and `src/pages/` should start with a JSDoc header:

```typescript
/**
 * {filename.ts} — {one-line purpose}
 *
 * Sprint T-Phase-{sprint-id} · {Card-id} {sub-sprint description}
 *
 * Key invariants:
 *   - {D-decision references}
 *   - {Behaviour guarantees}
 *
 * [JWT] {API endpoint Phase 2 will hit}
 */
```

## Engine vs Hook vs Page

- **Engines** (`src/lib/*-engine.ts`): pure functions, no React hooks, no JSX. Testable in isolation.
- **Hooks** (`src/hooks/use*.ts`): wrap engines + provide React state + handle side effects.
- **Pages** (`src/pages/erp/**/*.tsx`): orchestrate hooks + render UI. Thin.

Voucher form pages (`src/pages/erp/accounting/vouchers/*.tsx`) are governed by
**D-127** — they remain thin orchestrators that delegate posting to
`finecore-engine.ts`. Zero touches without explicit close-summary justification.

## D-Decision References

When a sprint introduces an architectural decision, document it as `D-NNN` and
reference it in subsequent files that depend on it.

- **D-127** — voucher form `.tsx` files in `src/pages/erp/accounting/vouchers/` are zero-touch
- **D-128** — `voucher.ts` + `voucher-type.ts` are byte-identical across all sprints (sibling fields permitted)
- **D-194** — Phase 1 uses `localStorage` only; all API call sites carry `[JWT]` markers
- **D-216** — Pure engines (item-movement, profit, ABC classification, etc.) are NEVER persisted; recomputed on read

## Money Math

Use `dMul`, `dAdd`, `dSub`, `dPct`, `dSum`, `round2` from `@/lib/decimal-helpers`
for ALL currency / quantity / percentage arithmetic. Never `Math.round` on money.

Files swept to Decimal carry the `MONEY-MATH-AUDITED` header marker. New code
should follow the same pattern. The decimal-helpers test suite enforces the
ROUND_HALF_UP idiom.

## Multi-Tenant Storage Keys

- **Bucket A · TRULY GLOBAL:** geography, currency, access_roles, holiday_calendars
- **Bucket B · TEMPLATE + PER-ENTITY:** voucher_types, approval_delegations, transaction_templates
- **Bucket C · PER-ENTITY:** all transaction data, employee data, master data per entity

Pattern for new per-entity key:
```typescript
export const myKey = (entityCode: string): string =>
  entityCode ? `erp_my_${entityCode}` : 'erp_my_system';
```

Locale (`erp_locale_*`) is Bucket C — each entity remembers its operator's preferred language.

## Audit Trail

Every voucher post + memo create + master CRUD MUST call `logAudit({...})` from
`@/lib/audit-trail-engine`. The engine cannot be disabled (MCA Rule 3(1)
compliance). Quota exhaustion falls through to console.error rather than
silently dropping entries.

For approval workflows, use `submit/approve/reject/post/cancel` from
`@/lib/approval-workflow-engine` — these wire audit trail automatically.

## Validation

Use `makeFieldValidator` from `@/lib/validate-first` for inline form-field errors.
Reserve toasts for system-level errors (network, quota, auth, period lock).

Form-level errors must set `aria-invalid` and link descriptive `aria-describedby`
ids per the UX-interactivity standards memory.

## i18n

Wrap user-visible strings in `t('key', 'Fallback English')` from `@/lib/i18n-engine`.
Add new keys to both `src/data/i18n/en.ts` AND `src/data/i18n/hi.ts` simultaneously.

Test U4 (in `src/test/i18n.test.ts`) enforces parity. Don't translate technical
abbreviations (GRN, MIN, GSTIN, PAN) — keep them in Latin or Devanagari
transliteration as Indian SME operators read them today.

## Tests

Every new engine module ships with at least 3-5 unit tests in `src/test/`.
Test files mirror engine names: `src/test/{engine-name}.test.ts`. Coverage
floor is enforced informally — sprint close summaries quote test counts.

## Period Lock

Voucher dates MUST go through `isPeriodLocked()` check at the engine layer
(`validateVoucher` in `finecore-engine.ts` already enforces this). Forms should
also surface period-lock errors inline for better UX. CGST Rule 56(8) governs
modification of posted records — the engine throws and the form surfaces
`err.cannot_modify_posted` from the i18n dictionary.

## Console Output

Do NOT add `// eslint-disable-next-line no-console` directives — that rule
isn't in this project's config and the directive will trigger
`unused-disable-directives`. Prefer `error-engine.ts` for operational logging.

## Universal Transaction Standard (UTS · D-226)

Sprint T-Phase-1.2.6a locked the 8-dimension Universal Transaction Standard.
Every operational record (voucher and non-voucher) presents the same
dimensions in registers, prints, and exports.

The 8 dimensions:

1. Doc number — FY-scoped, generated via `generateDocNo(prefix, entityCode)`.
2. Voucher / primary date — operational date.
3. Effective date — accounting date; fallback `record.effective_date ?? record.primary_date`.
4. Status — finite state machine with audit hooks.
5. Reference linkage — every record cites its source.
6. Decimal-safe money math — `@/lib/decimal-helpers`.
7. Audit trail — every CRUD + transition.
8. Print + Export parity — `UniversalPrintFrame` and `universal-export-engine`.

Hybrid treatment for ProjX:

- **Project** and **ProjectMilestone** are masters (no posting effect).
- **TimeEntry** is a voucher (posts to payroll/billing).

Sibling-abstraction rule: do NOT modify
`src/components/finecore/registers/RegisterGrid.tsx`. Non-voucher consumers
use the sibling `src/components/registers/UniversalRegisterGrid.tsx` instead.
