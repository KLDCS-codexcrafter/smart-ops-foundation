/**
 * partner-auth-engine.ts — Distributor JWT scope, separate from internal ERP auth.
 * Sprint 10. Pure functions only — no React, no localStorage in computation
 * (only in the I/O helpers below). All localStorage marked with [JWT].
 */
import {
  DISTRIBUTOR_SESSION_KEY,
  DISTRIBUTOR_TOKEN_KEY,
  distributorsKey,
  type Distributor,
  type DistributorSession,
} from '@/types/distributor';

/**
 * issueDistributorToken — mock JWT generator for a verified partner.
 * Sandbox-safe (browser btoa). Real impl signs server-side.
 * Output is base64url payload + mock signature, ~250 chars.
 */
export function issueDistributorToken(partner: Distributor, entityCode: string): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payload = btoa(JSON.stringify({
    sub: partner.id,
    cust: partner.customer_id,
    code: partner.partner_code,
    tier: partner.tier,
    pl: partner.price_list_id,
    ent: entityCode,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60, // 8h
    scope: 'partner_portal',
  })).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  // Mock signature (NOT cryptographically secure — server signs in prod)
  const sig = btoa(`mock_${partner.id}_${Date.now()}`)
    .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${header}.${payload}.${sig}`;
}

/**
 * verifyDistributorCredential — looks up a partner by email or partner_code.
 * Mock auth: any password ≥6 chars succeeds (matches internal mockLogin).
 * [JWT] Replace with: POST /api/partner/auth/login
 */
export async function verifyDistributorCredential(
  credential: string,
  password: string,
  entityCode: string,
): Promise<{ distributor: Distributor; entityCode: string } | { error: string }> {
  await new Promise(r => setTimeout(r, 1200));
  if (password.length < 6) return { error: 'Invalid credentials' };
  const list = loadDistributors(entityCode);
  const lc = credential.trim().toLowerCase();
  const found = list.find(p =>
    p.contact_email.toLowerCase() === lc ||
    p.partner_code.toLowerCase() === lc ||
    p.contact_mobile === credential.trim(),
  );
  if (!found) return { error: 'Distributor not found for this entity' };
  if (found.status !== 'active') return { error: `Account ${found.status}` };
  return { distributor: found, entityCode };
}

/**
 * createDistributorSession — assembles session payload from partner + token.
 */
export function createDistributorSession(
  partner: Distributor,
  token: string,
  entityCode: string,
): DistributorSession {
  return {
    token,
    distributor_id: partner.id,
    customer_id: partner.customer_id,
    legal_name: partner.legal_name,
    partner_code: partner.partner_code,
    tier: partner.tier,
    price_list_id: partner.price_list_id,
    entity_code: entityCode,
    email: partner.contact_email,
    expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * scopeQueryToDistributor — pure filter: returns only rows owned by the partner's
 * customer_id. Use in DistributorInvoices, DistributorPayments, etc., to prevent leaks.
 */
export function scopeQueryToDistributor<T extends { party_id?: string | null; customer_id?: string | null; partner_id?: string | null; distributor_id?: string | null }>(
  rows: T[],
  session: DistributorSession,
): T[] {
  return rows.filter(r =>
    r.distributor_id === session.distributor_id ||
    r.partner_id === session.distributor_id ||
    r.customer_id === session.customer_id ||
    r.party_id === session.customer_id,
  );
}

// ── I/O helpers (browser-only) ──

/** [JWT] localStorage GET — replace with: GET /api/partners?entity={entityCode} */
export function loadDistributors(entityCode: string): Distributor[] {
  try {
    const raw = localStorage.getItem(distributorsKey(entityCode));
    return raw ? (JSON.parse(raw) as Distributor[]) : [];
  } catch { return []; }
}

/** [JWT] localStorage SET — replace with: POST /api/partners */
export function saveDistributors(entityCode: string, list: Distributor[]): void {
  localStorage.setItem(distributorsKey(entityCode), JSON.stringify(list));
}

/** Persist session + token. [JWT] in real flow, server returns httpOnly cookie. */
export function persistDistributorSession(session: DistributorSession): void {
  localStorage.setItem(DISTRIBUTOR_TOKEN_KEY, session.token);
  localStorage.setItem(DISTRIBUTOR_SESSION_KEY, JSON.stringify(session));
}

/** Read current session, or null if missing/expired. */
export function getDistributorSession(): DistributorSession | null {
  try {
    const raw = localStorage.getItem(DISTRIBUTOR_SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as DistributorSession;
    if (new Date(s.expires_at).getTime() < Date.now()) {
      clearDistributorSession();
      return null;
    }
    return s;
  } catch { return null; }
}

/** Clear partner login state. */
export function clearDistributorSession(): void {
  localStorage.removeItem(DISTRIBUTOR_TOKEN_KEY);
  localStorage.removeItem(DISTRIBUTOR_SESSION_KEY);
}
