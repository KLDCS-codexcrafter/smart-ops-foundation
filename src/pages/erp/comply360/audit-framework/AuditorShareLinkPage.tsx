/**
 * @file        src/pages/erp/comply360/audit-framework/AuditorShareLinkPage.tsx
 * @purpose     OOB-4 · Auditor Read-Only Share Link Generator (Phase 5 HMAC-signed token).
 *              Phase 6 JWT promotes signing logic from client-side HMAC to proper JWT.
 * @sprint      Sprint 80f · T-Phase-5.B.2.1-PASS-F · OOB-4
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { logAudit } from '@/lib/audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { getActiveBAPAccount, type BAPAccountId } from '@/lib/comply360-audit-framework-engine';
import { getActiveEngagement } from '@/lib/comply360-auditor-workspace-engine';

const STORAGE_KEY = 'erp_auditor_share_tokens';
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
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    const arr: StoredShareToken[] = raw ? JSON.parse(raw) : [];
    arr.push(stored);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr.slice(-100)));
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

function loadStoredTokens(): StoredShareToken[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as StoredShareToken[] : [];
  } catch {
    return [];
  }
}

export default function AuditorShareLinkPage(): JSX.Element {
  const activeEng = useMemo(() => getActiveEngagement(), []);
  const activeBAP = useMemo(() => getActiveBAPAccount(), []);

  const [reportId, setReportId] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [tokens, setTokens] = useState<StoredShareToken[]>(() => loadStoredTokens());

  const handleGenerate = (): void => {
    if (!activeEng) {
      toast.error('No active engagement · create one first on AuditFrameworkDashboardPage');
      return;
    }
    if (!reportId) {
      toast.error('Provide a report ID to share');
      return;
    }
    generateAuditorShareToken({
      engagement_id: activeEng.id,
      report_id: reportId,
      expires_at: new Date(expiresAt).toISOString(),
      generated_by_bap: activeBAP,
    });
    setTokens(loadStoredTokens());
    toast.success('Share link generated · Phase 6 JWT promotes to true JWT');
  };

  const handleCopy = (url: string): void => {
    try {
      navigator.clipboard.writeText(url);
      toast.success('Share URL copied to clipboard');
    } catch {
      toast.error('Clipboard copy failed');
    }
  };

  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Auditor Read-Only Share Link (OOB-4)</h1>
        <p className="text-sm text-muted-foreground">
          Phase 5 · client-side HMAC-signed token (FNV-1a 64-bit). Phase 6 promotes to JWT.
          Auditor opens the URL and sees the Rule 11(g) report read-only, no login.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generate share link</CardTitle>
          <CardDescription>Engagement: {activeEng?.id ?? '— none —'}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor="share-report-id">Rule 11(g) report ID</Label>
            <Input id="share-report-id" value={reportId} onChange={(e) => setReportId(e.target.value)} placeholder="r11g_..." />
          </div>
          <div className="space-y-1">
            <Label htmlFor="share-expires">Expires on</Label>
            <Input id="share-expires" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={handleGenerate}>Generate Share Link</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Existing share links</CardTitle></CardHeader>
        <CardContent>
          {tokens.length === 0 ? (
            <p className="text-sm text-muted-foreground">No share links generated yet.</p>
          ) : (
            <ul className="space-y-2">
              {tokens.map((t) => (
                <li key={t.token} className="rounded-md border p-2 text-xs space-y-1">
                  <div className="flex justify-between font-mono">
                    <span>{t.engagement_id} · {t.report_id}</span>
                    <span className="text-muted-foreground">expires {t.expires_at.slice(0, 10)}</span>
                  </div>
                  <div className="font-mono break-all text-[10px]">{t.share_url}</div>
                  <Button size="sm" variant="outline" onClick={() => handleCopy(t.share_url)}>Copy URL</Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
