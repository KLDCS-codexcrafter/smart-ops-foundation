/**
 * qr-login-engine.ts — Decode tenant-issued QR codes for zero-typing login
 * Out-of-box #6. Admin generates a QR per user in the Customer/Distributor
 * Master. User scans it on their phone → credentials auto-filled.
 *
 * QR payload format (JSON, base64-encoded):
 *   { v: 1, entity: 'SMRT', credential: 'distributor@example.com',
 *     token: 'tok-abc123', expires_at: '2026-05-01T00:00:00Z' }
 *
 * The 'token' is a short-lived (7-day) admin-issued auth token; the
 * mobile app presents it in place of a password for first-login.
 * Post first-login, the app stores a normal session and discards the token.
 */

export interface QRLoginPayload {
  v: 1;
  entity: string;
  credential: string;
  token: string;
  expires_at: string;
}

export interface QRDecodeResult {
  ok: boolean;
  payload?: QRLoginPayload;
  reason?: string;
}

export function decodeQRPayload(rawBase64: string): QRDecodeResult {
  try {
    const jsonStr = atob(rawBase64);
    const payload = JSON.parse(jsonStr) as Partial<QRLoginPayload>;

    if (payload.v !== 1) return { ok: false, reason: 'Unsupported QR version' };
    if (!payload.entity || !payload.credential || !payload.token) {
      return { ok: false, reason: 'QR is missing required fields' };
    }
    if (!payload.expires_at) return { ok: false, reason: 'QR has no expiry' };

    const expiresAt = new Date(payload.expires_at).getTime();
    if (Number.isNaN(expiresAt)) return { ok: false, reason: 'Invalid expiry date' };
    if (expiresAt < Date.now()) {
      return { ok: false, reason: 'QR has expired. Ask your admin for a new one.' };
    }

    return { ok: true, payload: payload as QRLoginPayload };
  } catch {
    return { ok: false, reason: 'QR code is not readable' };
  }
}

/** Encode (for admin-side QR generation — used in future admin UI). */
export function encodeQRPayload(payload: QRLoginPayload): string {
  return btoa(JSON.stringify(payload));
}

/** Generate a demo QR for testing — tenant admin would issue via UI. */
export function generateDemoQR(credential: string, entity: string = DEFAULT_ENTITY_SHORTCODE): string {
  const payload: QRLoginPayload = {
    v: 1,
    entity,
    credential,
    token: `tok-${Math.random().toString(36).slice(2, 10)}`,
    expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
  };
  return encodeQRPayload(payload);
}
