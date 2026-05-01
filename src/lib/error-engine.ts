/**
 * error-engine.ts — Centralized error logging with circular buffer
 *
 * Sprint T-Phase-1.2.5h-b2
 *
 * Replaces scattered console.error calls. Circular buffer (FIFO) of last 200
 * entries per entity. Phase 2 backend ships entries to Sentry / equivalent.
 *
 * [JWT] POST /api/error-log
 */

import type { ErrorLogEntry, ErrorCategory, ErrorSeverity } from '@/types/error-log';
import { errorLogKey, ERROR_LOG_MAX } from '@/types/error-log';

function getCurrentUser(): { id: string; name: string } {
  try {
    // [JWT] GET /api/auth/me
    const raw = localStorage.getItem('erp_mock_auth_active');
    if (raw) {
      const u = JSON.parse(raw);
      return { id: u.id ?? 'unknown', name: u.name ?? u.id ?? 'unknown' };
    }
  } catch { /* fall through */ }
  return { id: 'system', name: 'system' };
}

function getEntityCode(): string {
  // Read from same source as the rest of Operix — non-hook engine.
  try {
    const raw = localStorage.getItem('erp_selected_company');
    return raw && raw !== 'all' ? raw : 'system';
  } catch {
    return 'system';
  }
}

function makeId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function logError(
  category: ErrorCategory,
  message: string,
  context: Record<string, unknown> = {},
  err?: Error | unknown,
  severity: ErrorSeverity = 'error',
): ErrorLogEntry {
  const user = getCurrentUser();
  const errObj = err instanceof Error ? err : undefined;
  const entry: ErrorLogEntry = {
    id: makeId(),
    entity_id: getEntityCode(),
    timestamp: new Date().toISOString(),
    user_id: user.id,
    user_name: user.name,
    category,
    severity,
    message,
    stack: errObj?.stack ?? null,
    context: { ...context, ...(err && !errObj ? { rawError: String(err) } : {}) },
  };

  const key = errorLogKey(entry.entity_id);
  let buffer: ErrorLogEntry[] = [];
  try {
    const raw = localStorage.getItem(key);
    buffer = raw ? JSON.parse(raw) : [];
  } catch { buffer = []; }

  buffer.push(entry);
  // Circular buffer · keep last ERROR_LOG_MAX
  if (buffer.length > ERROR_LOG_MAX) {
    buffer = buffer.slice(-ERROR_LOG_MAX);
  }

  try {
    localStorage.setItem(key, JSON.stringify(buffer));
  } catch {
    // If localStorage itself is failing, fall back to console
    console.error('[error-engine] persistence failed', entry);
  }

  // Always also surface to console for local dev visibility
  console.error(`[${category}] ${message}`, context, errObj ?? '');

  return entry;
}

export function readErrorLog(entityCode: string, opts?: {
  category?: ErrorCategory; severity?: ErrorSeverity; limit?: number;
  sinceIso?: string;
}): ErrorLogEntry[] {
  try {
    const raw = localStorage.getItem(errorLogKey(entityCode));
    let entries: ErrorLogEntry[] = raw ? JSON.parse(raw) : [];
    if (opts?.category) entries = entries.filter(e => e.category === opts.category);
    if (opts?.severity) entries = entries.filter(e => e.severity === opts.severity);
    if (opts?.sinceIso) entries = entries.filter(e => e.timestamp >= opts.sinceIso!);
    entries = entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    if (opts?.limit) entries = entries.slice(0, opts.limit);
    return entries;
  } catch {
    return [];
  }
}

export function clearErrorLog(entityCode: string): void {
  // Only clears the OPS error log — audit_trail is unaffected
  localStorage.removeItem(errorLogKey(entityCode));
}
