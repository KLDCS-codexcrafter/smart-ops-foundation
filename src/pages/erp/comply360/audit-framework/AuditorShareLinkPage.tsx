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
import { getActiveBAPAccount } from '@/lib/comply360-audit-framework-engine';
import { getActiveEngagement } from '@/lib/comply360-auditor-workspace-engine';
import {
  generateAuditorShareToken,
  verifyAuditorShareToken,
  SHARE_TOKEN_STORAGE_KEY,
  type StoredShareToken,
  type ShareTokenPayload,
} from './share-token-helpers';

// Re-export so existing test imports continue working.
export { generateAuditorShareToken, verifyAuditorShareToken };
export type { ShareTokenPayload, StoredShareToken };

function loadStoredTokens(): StoredShareToken[] {
  try {
    const raw = localStorage.getItem(SHARE_TOKEN_STORAGE_KEY);
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
