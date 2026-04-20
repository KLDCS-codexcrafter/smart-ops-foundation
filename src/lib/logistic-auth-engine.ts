/**
 * logistic-auth-engine.ts — Transporter Portal auth (mirrors distributor-auth-engine).
 * Sprint 15c-2. Pure auth functions. All localStorage I/O marked with [JWT] comments.
 * Mock JWT (unsigned) — replace with server HS256 in production.
 * 8-hour session — configurable via SESSION_HOURS in logistic-portal.ts.
 * No rate-limiting on login (server-side responsibility).
 */

import {
  LOGISTIC_SESSION_KEY, LOGISTIC_TOKEN_KEY, SESSION_HOURS,
  type LogisticPortalSession, type LogisticActivity, type LogisticActivityKind,
  logisticActivityKey,
} from '@/types/logistic-portal';

/** Minimal LogisticMaster shape for auth (avoids importing the full interface). */
export interface LogisticMasterLite {
  id: string;
  partyCode: string;
  partyName: string;
  logisticType: string;
  gstin: string;
  contacts: Array<{ email?: string; mobile?: string }>;
  portal_enabled?: boolean;
  password_hash?: string | null;
  password_updated_at?: string | null;
  last_login_at?: string | null;
  must_change_password?: boolean;
  status: 'active' | 'inactive';
}

const LOGISTIC_MASTER_KEY = 'erp_group_logistic_master';

/**
 * issueLogisticToken — mock JWT generator.
 * Base64url format with scope='logistic_portal'.
 */
export function issueLogisticToken(
  logistic: LogisticMasterLite, entityCode: string,
): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payload = btoa(JSON.stringify({
    sub: logistic.id,
    code: logistic.partyCode,
    type: logistic.logisticType,
    ent: entityCode,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + SESSION_HOURS * 3600,
    scope: 'logistic_portal',
  })).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  // Mock signature (NOT cryptographically secure — server signs in prod)
  const sig = btoa(`mock_${logistic.id}_${Date.now()}`)
    .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${header}.${payload}.${sig}`;
}

/**
 * verifyLogisticCredential — look up transporter by code, email, or mobile.
 * Mock hash verification: btoa(password) matches password_hash.
 * [JWT] Replace with: POST /api/logistic/auth/login
 */
export async function verifyLogisticCredential(
  credential: string, password: string, entityCode: string,
): Promise<{ logistic: LogisticMasterLite; entityCode: string } | { error: string }> {
  await new Promise(r => setTimeout(r, 800));

  if (password.length < 6) return { error: 'Invalid credentials' };

  const list = loadLogistics(entityCode);
  const lc = credential.trim().toLowerCase();

  const found = list.find(l =>
    l.partyCode.toLowerCase() === lc ||
    (l.contacts ?? []).some(c =>
      (c.email?.toLowerCase() ?? '') === lc || c.mobile === credential.trim(),
    ),
  );

  if (!found) return { error: 'Transporter not found for this entity' };
  if (!found.portal_enabled) return { error: 'Portal access not enabled. Contact the manufacturer.' };
  if (found.status !== 'active') return { error: `Account ${found.status}` };
  if (!found.password_hash) return { error: 'No password set. Contact admin.' };

  const expectedHash = btoa(password);
  if (found.password_hash !== expectedHash) return { error: 'Invalid credentials' };

  return { logistic: found, entityCode };
}

/** Create portal session from verified logistic record. */
export function createLogisticSession(
  logistic: LogisticMasterLite, entityCode: string, token: string,
): LogisticPortalSession {
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_HOURS * 3600 * 1000);
  return {
    logistic_id: logistic.id,
    party_code: logistic.partyCode,
    party_name: logistic.partyName,
    logistic_type: logistic.logisticType,
    entity_code: entityCode,
    token,
    issued_at: now.toISOString(),
    expires_at: expires.toISOString(),
    must_change_password: logistic.must_change_password ?? false,
  };
}

/** Persist session to localStorage. [JWT] Replace with secure cookie on server. */
export function persistLogisticSession(session: LogisticPortalSession): void {
  try {
    localStorage.setItem(LOGISTIC_SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(LOGISTIC_TOKEN_KEY, session.token);
  } catch { /* storage unavailable */ }
}

/** Load current portal session; returns null if none or expired. */
export function getLogisticSession(): LogisticPortalSession | null {
  try {
    const raw = localStorage.getItem(LOGISTIC_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as LogisticPortalSession;
    if (new Date(session.expires_at).getTime() < Date.now()) {
      clearLogisticSession();
      return null;
    }
    return session;
  } catch { return null; }
}

/** Clear session (logout). */
export function clearLogisticSession(): void {
  try {
    localStorage.removeItem(LOGISTIC_SESSION_KEY);
    localStorage.removeItem(LOGISTIC_TOKEN_KEY);
  } catch { /* ignore */ }
}

/** Record an activity event (login, invoice submit, LR accept, etc.). */
export function recordLogisticActivity(
  logisticId: string, entityCode: string, kind: LogisticActivityKind,
  opts?: Partial<Pick<LogisticActivity, 'ref_type' | 'ref_id' | 'ref_label' | 'notes'>>,
): void {
  try {
    // [JWT] POST /api/logistic/activity
    const all: LogisticActivity[] = JSON.parse(
      localStorage.getItem(logisticActivityKey(entityCode)) ?? '[]',
    );
    all.push({
      id: `la-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      logistic_id: logisticId,
      entity_code: entityCode,
      kind,
      at: new Date().toISOString(),
      ...opts,
    });
    localStorage.setItem(logisticActivityKey(entityCode), JSON.stringify(all));
  } catch { /* ignore */ }
}

/** Update password (called during must_change_password flow). */
export function updateLogisticPassword(
  logisticId: string, newPassword: string, entityCode: string,
): { ok: boolean; error?: string } {
  if (newPassword.length < 8) return { ok: false, error: 'Password must be at least 8 characters' };

  try {
    // [JWT] PUT /api/logistic/:id/password
    const list = JSON.parse(localStorage.getItem(LOGISTIC_MASTER_KEY) ?? '[]') as LogisticMasterLite[];
    const idx = list.findIndex(l => l.id === logisticId);
    if (idx < 0) return { ok: false, error: 'Logistic record not found' };

    list[idx] = {
      ...list[idx],
      password_hash: btoa(newPassword),
      password_updated_at: new Date().toISOString(),
      must_change_password: false,
    };
    localStorage.setItem(LOGISTIC_MASTER_KEY, JSON.stringify(list));
    recordLogisticActivity(logisticId, entityCode, 'password_change');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Failed to update password' };
  }
}

/** I/O helper — load all logistics for entity. [JWT] GET /api/logistic/masters */
export function loadLogistics(_entityCode: string): LogisticMasterLite[] {
  try {
    // Logistics are group-scoped (single key); entity filter is reserved for future split.
    const raw = localStorage.getItem(LOGISTIC_MASTER_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

/** Update last_login_at timestamp on the logistic master record. */
export function touchLastLogin(logisticId: string): void {
  try {
    const list = JSON.parse(localStorage.getItem(LOGISTIC_MASTER_KEY) ?? '[]') as LogisticMasterLite[];
    const idx = list.findIndex(l => l.id === logisticId);
    if (idx < 0) return;
    list[idx] = { ...list[idx], last_login_at: new Date().toISOString() };
    localStorage.setItem(LOGISTIC_MASTER_KEY, JSON.stringify(list));
  } catch { /* ignore */ }
}
