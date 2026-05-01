/**
 * validate-first.ts — Inline form-validation helper
 *
 * Sprint T-Phase-1.2.5h-b2
 *
 * Pattern: validate() returns { ok, errors: { [field]: string } } so the form
 * can display errors INLINE next to fields (red border + helper text below)
 * instead of as toast popups. Submit button is disabled until errors clear.
 *
 * SCOPE: Field-level validation only. System-level errors (network / quota /
 * auth) continue to use toasts.
 */

export interface ValidationResult {
  ok: boolean;
  errors: Record<string, string>;
}

export interface FieldRule<T> {
  field: keyof T & string;
  test: (value: T[keyof T], record: T) => boolean;
  message: string;
}

export function makeFieldValidator<T>(
  rules: Array<FieldRule<T>>,
): (record: T) => ValidationResult {
  return (record) => {
    const errors: Record<string, string> = {};
    for (const rule of rules) {
      const v = record[rule.field];
      // Stop at first failure per field (multiple rules per field are OK · first wins)
      if (errors[rule.field]) continue;
      if (!rule.test(v, record)) {
        errors[rule.field] = rule.message;
      }
    }
    return { ok: Object.keys(errors).length === 0, errors };
  };
}

/** Helper · returns red-border CSS class if field has error */
export function fieldErrorClass(errors: Record<string, string>, field: string): string {
  return errors[field] ? 'border-destructive focus-visible:ring-destructive' : '';
}

/** Helper · returns error text for a field, or null if no error */
export function fieldErrorText(errors: Record<string, string>, field: string): string | null {
  return errors[field] ?? null;
}

/** Helper · removes a field's error from the errors map (returns a new object). */
export function clearFieldError(
  errors: Record<string, string>,
  field: string,
): Record<string, string> {
  if (!(field in errors)) return errors;
  const next = { ...errors };
  delete next[field];
  return next;
}
