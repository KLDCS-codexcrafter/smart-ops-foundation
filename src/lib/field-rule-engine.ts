/**
 * @file     field-rule-engine.ts — OOB-3 · Field rule validator
 * @sprint   T-Phase-2.7-b · Q2-c hard-block on posted, soft warn on draft
 * @purpose  Validates form data against the active voucher type's field_rules.
 *           Returns errors map for forms to render · severity matches Q2-c rule.
 */

import type { FieldRule } from '@/lib/non-finecore-voucher-type-registry';

export type ValidationSeverity = 'error' | 'warning' | 'info';
export type FormState = 'draft' | 'posted';

export interface FieldRuleViolation {
  field_path: string;
  field_label: string;
  severity: ValidationSeverity;
  message: string;
  rule: FieldRule;
}

export interface FieldRuleResult {
  ok: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
  violations: FieldRuleViolation[];
}

/** Read a value from a record by dot-path (supports nested fields like 'address.line_1'). */
function readPath(record: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>(
    (acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined),
    record,
  );
}

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** Determine severity based on Q2-c rule. */
function severityFor(rule: FieldRule, formState: FormState): ValidationSeverity {
  if (rule.enforce_on === 'always') return 'error';
  if (rule.enforce_on === 'posted') {
    return formState === 'posted' ? 'error' : 'warning';
  }
  if (rule.enforce_on === 'draft') {
    return formState === 'draft' ? 'error' : 'info';
  }
  return 'info';
}

/** Sprint 2.7-c · Q1-c · gate per-rule on record amount threshold (default 'total_amount'). */
function ruleApplies(rule: FieldRule, data: Record<string, unknown>): boolean {
  if (!rule.min_amount || rule.min_amount <= 0) return true;
  const amountField = rule.amount_field ?? 'total_amount';
  const amountRaw = data[amountField];
  const amount = typeof amountRaw === 'number' ? amountRaw : Number(amountRaw ?? 0);
  return Number.isFinite(amount) && amount >= rule.min_amount;
}

/** Validate form data against a list of field rules. */
export function validateFieldRules(
  data: Record<string, unknown>,
  rules: FieldRule[] | undefined | null,
  formState: FormState,
): FieldRuleResult {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};
  const violations: FieldRuleViolation[] = [];

  if (!rules || rules.length === 0) {
    return { ok: true, errors, warnings, violations };
  }

  for (const rule of rules) {
    // Sprint 2.7-c · Q1-c · skip rules whose amount threshold is not met yet.
    if (!ruleApplies(rule, data)) continue;
    const value = readPath(data, rule.field_path);
    const empty = isEmpty(value);

    let violated = false;
    let message = '';

    if (rule.rule === 'mandatory') {
      if (empty) {
        violated = true;
        message = rule.custom_message ?? `${rule.field_label} is required`;
      } else if (rule.min_length && typeof value === 'string' && value.trim().length < rule.min_length) {
        violated = true;
        message = rule.custom_message ?? `${rule.field_label} must be at least ${rule.min_length} characters`;
      } else if (rule.pattern && typeof value === 'string') {
        try {
          const re = new RegExp(rule.pattern);
          if (!re.test(value)) {
            violated = true;
            message = rule.custom_message ?? `${rule.field_label} does not match required format`;
          }
        } catch { /* invalid regex · skip */ }
      }
    } else if (rule.rule === 'forbidden') {
      if (!empty) {
        violated = true;
        message = rule.custom_message ?? `${rule.field_label} must not be set for this voucher type`;
      }
    }

    if (violated) {
      const severity = severityFor(rule, formState);
      violations.push({ field_path: rule.field_path, field_label: rule.field_label, severity, message, rule });
      if (severity === 'error') errors[rule.field_path] = message;
      else if (severity === 'warning') warnings[rule.field_path] = message;
    }
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    warnings,
    violations,
  };
}
