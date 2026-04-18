/**
 * partner-auth-engine.ts — Partner JWT scope, separate from internal ERP auth.
 * Sprint 10. Pure functions only — no React, no localStorage in computation
 * (only in the I/O helpers below). All localStorage marked with [JWT].
 */
import {
  PARTNER_SESSION_KEY,
  PARTNER_TOKEN_KEY,
  partnersKey,
  type Partner,
  type PartnerSession,
} from '@/types/partner';

/**
 * issuePartnerToken — mock JWT generator for a verified partner.
 * Sandbox-safe (browser btoa). Real impl signs server-side.
 * Output is base64url payload + mock signature, ~250 chars.
 */
export function issuePartnerToken(partner: Partner, entityCode: string): string {
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
 * verifyPartnerCredential — looks up a partner by email or partner_code.
 * Mock auth: any password ≥6 chars succeeds (matches internal mockLogin).
 * [JWT] Replace with: POST /api/partner/auth/login
 */
export async function verifyPartnerCredential(
  credential: string,
  password: string,
  entityCode: string,
): Promise<{ partner: Partner; entityCode: string } | { error: string }> {
  await new Promise(r => setTimeout(r, 1200));
  if (password.length < 6) return { error: 'Invalid credentials' };
  const list = loadPartners(entityCode);
  const lc = credential.trim().toLowerCase();
  const found = list.find(p =>
    p.contact_email.toLowerCase() === lc ||
    p.partner_code.toLowerCase() === lc ||
    p.contact_mobile === credential.trim(),
  );
  if (!found) return { error: 'Partner not found for this entity' };
  if (found.status !== 'active') return { error: `Account ${found.status}` };
  return { partner: found, entityCode };
}

/**
 * createPartnerSession — assembles session payload from partner + token.
 */
export function createPartnerSession(
  partner: Partner,
  token: string,
  entityCode: string,
): PartnerSession {
  return {
    token,
    partner_id: partner.id,
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
 * scopeQueryToPartner — pure filter: returns only rows owned by the partner's
 * customer_id. Use in PartnerInvoices, PartnerPayments, etc., to prevent leaks.
 */
export function scopeQueryToPartner<T extends { party_id?: string | null; customer_id?: string | null; partner_id?: string | null }>(
  rows: T[],
  session: PartnerSession,
): T[] {
  return rows.filter(r =>
    r.partner_id === session.partner_id ||
    r.customer_id === session.customer_id ||
    r.party_id === session.customer_id,
  );
}

// ── I/O helpers (browser-only) ──

/** [JWT] localStorage GET — replace with: GET /api/partners?entity={entityCode} */
export function loadPartners(entityCode: string): Partner[] {
  try {
    const raw = localStorage.getItem(partnersKey(entityCode));
    return raw ? (JSON.parse(raw) as Partner[]) : [];
  } catch { return []; }
}

/** [JWT] localStorage SET — replace with: POST /api/partners */
export function savePartners(entityCode: string, list: Partner[]): void {
  localStorage.setItem(partnersKey(entityCode), JSON.stringify(list));
}

/** Persist session + token. [JWT] in real flow, server returns httpOnly cookie. */
export function persistPartnerSession(session: PartnerSession): void {
  localStorage.setItem(PARTNER_TOKEN_KEY, session.token);
  localStorage.setItem(PARTNER_SESSION_KEY, JSON.stringify(session));
}

/** Read current session, or null if missing/expired. */
export function getPartnerSession(): PartnerSession | null {
  try {
    const raw = localStorage.getItem(PARTNER_SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as PartnerSession;
    if (new Date(s.expires_at).getTime() < Date.now()) {
      clearPartnerSession();
      return null;
    }
    return s;
  } catch { return null; }
}

/** Clear partner login state. */
export function clearPartnerSession(): void {
  localStorage.removeItem(PARTNER_TOKEN_KEY);
  localStorage.removeItem(PARTNER_SESSION_KEY);
}
