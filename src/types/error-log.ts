/**
 * error-log.ts — Operational error log type
 *
 * Sprint T-Phase-1.2.5h-b2
 *
 * NOTE: This is the OPS error log (debugging / monitoring). Distinct from
 * the audit_trail (compliance / regulatory). Errors that affect the books
 * of account also appear in audit_trail; this log is for triage.
 */

export type ErrorCategory =
  | 'voucher_post'
  | 'stock_balance'
  | 'validation'
  | 'migration'
  | 'quota'
  | 'audit_trail'
  | 'network'
  | 'unknown';

export type ErrorSeverity = 'info' | 'warn' | 'error' | 'critical';

export interface ErrorLogEntry {
  id: string;
  entity_id: string;             // per-entity isolation (Q2-a lock)
  timestamp: string;             // ISO 8601
  user_id: string;
  user_name: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  stack: string | null;
  context: Record<string, unknown>;
}

/** [JWT] GET/POST /api/error-log?entityCode={e} */
export const errorLogKey = (entityCode: string): string =>
  entityCode ? `erp_error_log_${entityCode}` : 'erp_error_log_system';

/** Circular buffer cap */
export const ERROR_LOG_MAX = 200;
