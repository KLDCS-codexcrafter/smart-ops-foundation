/**
 * @file        vendor-portal-auth-engine.ts
 * @sprint      T-Phase-1.2.6f-b-1 · Block A.2
 * @purpose     Vendor portal auth · token issue · session management · activity log.
 *              Hybrid per D-265: logistic-auth API shape + distributor-auth scope-query
 *              (in sibling file vendor-portal-scope.ts).
 * @decisions   D-255 · D-265 · D-272 · D-273 · D-275
 * @[JWT]       POST /api/vendor/portal/auth/* · /api/vendor/portal/activity
 */

import type {
  VendorPortalSession,
  VendorActivity,
  VendorActivityKind,
} from '@/types/vendor-portal';
import {
  VENDOR_SESSION_KEY,
  VENDOR_TOKEN_KEY,
  vendorActivityKey,
  vendorPasswordKey,
  DEFAULT_TEMP_PASSWORD,
  PASSWORD_MIN_LENGTH,
  SESSION_HOURS,
} from '@/types/vendor-portal';
import { loadPartiesByType } from './party-master-engine';
import type { Party } from '@/types/party';

export interface VendorMasterLite {
  id: string;
  party_code: string;
  party_name: string;
  entity_code: string;
}

/** Read vendors (party_type='vendor' or 'both') for an entity. */
export function loadVendors(entityCode: string): VendorMasterLite[] {
  const parties = loadPartiesByType(entityCode, 'vendor');
  return parties.map((p: Party) => ({
    id: p.id,
    party_code: p.party_code,
    party_name: p.party_name,
    entity_code: entityCode,
  }));
}

/** Mock JWT token issuance (Phase 1 · base64-url payload + random sig). */
export function issueVendorToken(vendor: VendorMasterLite, entityCode: string): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    sub: vendor.id,
    code: vendor.party_code,
    ent: entityCode,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + SESSION_HOURS * 3600,
    scope: 'vendor_portal',
  }));
  const sig = b64url(`mock_${vendor.id}_${Date.now()}`);
  return `${header}.${payload}.${sig}`;
}

function b64url(s: string): string {
  const b64 = typeof btoa !== 'undefined' ? btoa(s) : Buffer.from(s).toString('base64');
  return b64.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Verify credentials.
 * - password === null → token-only first-quote path (D-255). Returns mustChangePassword=true.
 * - password provided → matched against stored hash; if no hash, accepts DEFAULT_TEMP_PASSWORD per D-275.
 * [JWT] POST /api/vendor/portal/auth/login
 */
export async function verifyVendorCredential(
  vendorId: string,
  entityCode: string,
  password: string | null,
): Promise<{ ok: boolean; vendor: VendorMasterLite | null; mustChangePassword: boolean; reason?: string }> {
  await new Promise(r => setTimeout(r, 600));
  const vendors = loadVendors(entityCode);
  const vendor = vendors.find(v => v.id === vendorId);
  if (!vendor) return { ok: false, vendor: null, mustChangePassword: false, reason: 'vendor_not_found' };

  if (password === null) {
    return { ok: true, vendor, mustChangePassword: true };
  }

  const stored = readStoredPassword(entityCode, vendorId);
  if (!stored) {
    if (password === DEFAULT_TEMP_PASSWORD) {
      return { ok: true, vendor, mustChangePassword: true };
    }
    return { ok: false, vendor: null, mustChangePassword: false, reason: 'invalid_credentials' };
  }

  if (await mockHashEquals(password, stored)) {
    return { ok: true, vendor, mustChangePassword: false };
  }
  return { ok: false, vendor: null, mustChangePassword: false, reason: 'invalid_credentials' };
}

function readStoredPassword(entityCode: string, vendorId: string): string | null {
  try {
    return localStorage.getItem(vendorPasswordKey(entityCode, vendorId));
  } catch {
    return null;
  }
}

async function mockHashEquals(plain: string, stored: string): Promise<boolean> {
  // Phase 1: stored is btoa(plain). Phase 1.4 → bcrypt.
  const expected = typeof btoa !== 'undefined' ? btoa(plain) : Buffer.from(plain).toString('base64');
  return expected === stored || plain === stored;
}

export function createVendorSession(
  vendor: VendorMasterLite,
  entityCode: string,
  isTokenOnly: boolean,
  mustChangePassword: boolean,
): VendorPortalSession {
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_HOURS * 60 * 60 * 1000);
  return {
    vendor_id: vendor.id,
    party_code: vendor.party_code,
    party_name: vendor.party_name,
    entity_code: entityCode,
    token: issueVendorToken(vendor, entityCode),
    issued_at: now.toISOString(),
    expires_at: expires.toISOString(),
    must_change_password: mustChangePassword,
    is_token_only: isTokenOnly,
  };
}

export function persistVendorSession(session: VendorPortalSession): void {
  // [JWT] POST /api/vendor/portal/session
  try {
    localStorage.setItem(VENDOR_SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(VENDOR_TOKEN_KEY, session.token);
  } catch { /* quota silent */ }
}

export function getVendorSession(): VendorPortalSession | null {
  try {
    const raw = localStorage.getItem(VENDOR_SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as VendorPortalSession;
    if (new Date(s.expires_at).getTime() < Date.now()) {
      clearVendorSession();
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function clearVendorSession(): void {
  try {
    localStorage.removeItem(VENDOR_SESSION_KEY);
    localStorage.removeItem(VENDOR_TOKEN_KEY);
  } catch { /* silent */ }
}

export function recordVendorActivity(
  vendorId: string,
  entityCode: string,
  kind: VendorActivityKind,
  refType?: VendorActivity['ref_type'],
  refId?: string,
  refLabel?: string,
  notes?: string,
): void {
  // [JWT] POST /api/vendor/portal/activity
  try {
    const key = vendorActivityKey(entityCode);
    const raw = localStorage.getItem(key);
    const list = (raw ? JSON.parse(raw) : []) as VendorActivity[];
    const entry: VendorActivity = {
      id: `va-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      vendor_id: vendorId,
      entity_code: entityCode,
      kind,
      ref_type: refType,
      ref_id: refId,
      ref_label: refLabel,
      notes,
      at: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify([entry, ...list].slice(0, 500)));
  } catch { /* silent */ }
}

export function updateVendorPassword(
  vendorId: string,
  entityCode: string,
  newPassword: string,
): { ok: boolean; reason?: string } {
  if (newPassword.length < PASSWORD_MIN_LENGTH) return { ok: false, reason: 'too_short' };
  try {
    const hash = typeof btoa !== 'undefined' ? btoa(newPassword) : Buffer.from(newPassword).toString('base64');
    localStorage.setItem(vendorPasswordKey(entityCode, vendorId), hash);
    recordVendorActivity(vendorId, entityCode, 'password_set');
    return { ok: true };
  } catch {
    return { ok: false, reason: 'storage_error' };
  }
}

export function touchVendorLastLogin(vendorId: string, entityCode: string): void {
  recordVendorActivity(vendorId, entityCode, 'login');
}

/** Get last login timestamp from activity log. */
export function getLastLoginAt(vendorId: string, entityCode: string): string | null {
  try {
    const raw = localStorage.getItem(vendorActivityKey(entityCode));
    if (!raw) return null;
    const list = JSON.parse(raw) as VendorActivity[];
    const login = list.find(a => a.vendor_id === vendorId && a.kind === 'login');
    return login?.at ?? null;
  } catch {
    return null;
  }
}
