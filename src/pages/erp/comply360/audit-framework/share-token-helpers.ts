/**
 * @file        src/pages/erp/comply360/audit-framework/share-token-helpers.ts
 * @purpose     Phase 5 share-token signing/verifying helpers for OOB-4 Auditor Read-Only Share Link.
 *              Separated from AuditorShareLinkPage.tsx per react-refresh discipline.
 * @sprint      Sprint 80f cycle-2 hotfix · ESLint cleanup
 */
import { logAudit } from '@/lib/audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import type { BAPAccountId } from '@/lib/comply360-audit-framework-engine';

export const SHARE_TOKEN_STORAGE_KEY = 'erp_auditor_share_tokens';
const HMAC_SECRET = 'OPERIX-S80F-HMAC-PLACEHOLDER'; // Phase 6 JWT replaces this with server-side secret

function AUD(t: string): LogAuditEntityType {
  return t as unknown as LogAuditEntityType;
}

function hmacFnv64(payload: string, secret: string): string {
  const input = `${secret}|${payload}`;
  let h = BigInt('14695981039346656037');
  const prime = BigInt('1099511628211');
  const mask = (BigInt(1) << BigInt(64)) - BigInt(1);
  for (let i = 0; i < input.length; i++) {
    h = (h ^ BigInt(input.charCodeAt(i))) & mask;
    h = (h * prime) & mask;
  }
  return h.toString(16).padStart(16, '0');
}

function base64UrlEncode(s: string): string {
  return btoa(s).replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
}

export interface ShareTokenPayload {
  engagement_id: string;
  report_id: string;
  expires_at: string;
  generated_by_bap: BAPAccountId;
  issued_at: string;
}

export interface StoredShareToken extends ShareTokenPayload {
  token: string;
  share_url: string;
}

export function generateAuditorShareToken(opts: {
  engagement_id: string;
  report_id: string;
  expires_at: string;
  generated_by_bap: BAPAccountId;
}): { token: string; share_url: string; expires_at: string } {
  const payload: ShareTokenPayload = {
    engagement_id: opts.engagement_id,
    report_id: opts.report_id,
    expires_at: opts.expires_at,
    generated_by_bap: opts.generated_by_bap,
    issued_at: new Date().toISOString(),
  };
  const payloadStr = JSON.stringify(payload);
  const sig = hmacFnv64(payloadStr, HMAC_SECRET);
  const token = `${base64UrlEncode(payloadStr)}.${sig}`;
  const share_url = `${typeof window !== 'undefined' ? window.location.origin : ''}/audit/share/${token}`;

  try {
    const stored: StoredShareToken = { ...payload, token, share_url };
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(SHARE_TOKEN_STORAGE_KEY) : null;
    const arr: StoredShareToken[] = raw ? JSON.parse(raw) : [];
    arr.push(stored);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SHARE_TOKEN_STORAGE_KEY, JSON.stringify(arr.slice(-100)));
    }
  } catch { /* non-fatal */ }

  try {
    logAudit({
      entityCode: 'OPERIX-DEMO',
      action: 'create',
      entityType: AUD('auditor_share_token'),
      recordId: token.slice(0, 16),
      recordLabel: `Auditor share link · ${opts.engagement_id}`,
      beforeState: null,
      afterState: { report_id: opts.report_id, expires_at: opts.expires_at },
      sourceModule: 'AuditorShareLinkPage',
    });
  } catch { /* non-fatal */ }

  return { token, share_url, expires_at: opts.expires_at };
}

export function verifyAuditorShareToken(token: string): {
  valid: boolean;
  engagement_id?: string;
  report_id?: string;
  expires_at?: string;
} {
  try {
    const [payloadB64, sig] = token.split('.');
    if (!payloadB64 || !sig) return { valid: false };
    const payloadStr = base64UrlDecode(payloadB64);
    const expectedSig = hmacFnv64(payloadStr, HMAC_SECRET);
    if (expectedSig !== sig) return { valid: false };
    const payload = JSON.parse(payloadStr) as ShareTokenPayload;
    if (new Date(payload.expires_at).getTime() < Date.now()) {
      return { valid: false, engagement_id: payload.engagement_id, report_id: payload.report_id, expires_at: payload.expires_at };
    }
    return {
      valid: true,
      engagement_id: payload.engagement_id,
      report_id: payload.report_id,
      expires_at: payload.expires_at,
    };
  } catch {
    return { valid: false };
  }
}
