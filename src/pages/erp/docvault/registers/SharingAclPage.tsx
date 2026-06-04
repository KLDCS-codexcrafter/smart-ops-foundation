/**
 * @file        src/pages/erp/docvault/registers/SharingAclPage.tsx
 * @purpose     S144 · Sharing + TDL 6-action ACL + pending external approvals
 * @sprint      Sprint 144 · T-TaskFlow-A641.8 · Block 4
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  listShares, approveExternalShare, revokeShare,
  listACLs, upsertACL, getACL, DEFAULT_ACL,
  type AclAction,
} from '@/lib/docvault-governance-engine';
import type { DocumentShare, DocVaultUserACL } from '@/types/docvault';

const ACTIONS: AclAction[] = ['config', 'upload', 'view', 'download', 'delete'];

export default function SharingAclPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const byUserId = user?.id ?? 'demo-user';
  const [shares, setShares] = useState<DocumentShare[]>([]);
  const [acls, setACLs] = useState<DocVaultUserACL[]>([]);

  const refresh = useCallback(() => {
    setShares(listShares(entityCode));
    setACLs(listACLs(entityCode));
  }, [entityCode]);
  useEffect(() => { refresh(); }, [refresh]);

  const pending = useMemo(() => shares.filter((s) => s.requires_approval && !s.revoked_at), [shares]);
  const active = useMemo(() => shares.filter((s) => !s.requires_approval && !s.revoked_at), [shares]);

  const onApprove = (id: string): void => {
    try { approveExternalShare(entityCode, id, byUserId); toast.success('External share approved'); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
  };
  const onRevoke = (id: string): void => {
    try { revokeShare(entityCode, id, byUserId); toast.success('Share revoked'); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
  };

  const toggleAcl = (userId: string, action: AclAction, value: boolean): void => {
    const current = getACL(entityCode, userId);
    const key = `allow_${action}` as keyof DocVaultUserACL;
    upsertACL(entityCode, { ...current, [key]: value, updated_by: byUserId } as DocVaultUserACL);
    refresh();
  };

  const ensureRow = (userId: string): DocVaultUserACL =>
    acls.find((a) => a.user_id === userId) ?? DEFAULT_ACL(userId, entityCode);

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader><CardTitle>Pending external approvals</CardTitle></CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending approvals.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted-foreground">
                <th className="py-2">Document</th><th>Grantee</th><th>Permission</th><th>Expires</th><th></th>
              </tr></thead>
              <tbody>
                {pending.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="py-2 font-mono text-xs">{s.document_id}</td>
                    <td>{s.external_email ?? s.grantee_user_id}</td>
                    <td><Badge variant="outline">{s.permission}</Badge></td>
                    <td className="font-mono text-xs">{s.expires_at ?? '—'}</td>
                    <td className="text-right">
                      <Button size="sm" onClick={() => onApprove(s.id)}>Approve</Button>
                      <Button size="sm" variant="outline" className="ml-2" onClick={() => onRevoke(s.id)}>Revoke</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Active shares</CardTitle></CardHeader>
        <CardContent>
          {active.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active shares.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted-foreground">
                <th className="py-2">Document</th><th>Grantee</th><th>Permission</th><th>Expires</th><th></th>
              </tr></thead>
              <tbody>
                {active.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="py-2 font-mono text-xs">{s.document_id}</td>
                    <td>{s.external_email ?? s.grantee_user_id}</td>
                    <td><Badge variant="secondary">{s.permission}</Badge></td>
                    <td className="font-mono text-xs">{s.expires_at ?? '—'}</td>
                    <td className="text-right">
                      <Button size="sm" variant="outline" onClick={() => onRevoke(s.id)}>Revoke</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>User ACL · 6-action grid (Scan = desktop-agent seam · excluded)</CardTitle></CardHeader>
        <CardContent>
          {acls.length === 0 ? (
            <p className="text-sm text-muted-foreground">No per-user overrides yet. Default profile: view + download enabled, others denied.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted-foreground">
                <th className="py-2">User</th>
                {ACTIONS.map((a) => <th key={a} className="capitalize">{a}</th>)}
              </tr></thead>
              <tbody>
                {acls.map((a) => {
                  const row = ensureRow(a.user_id);
                  return (
                    <tr key={a.user_id} className="border-t border-border">
                      <td className="py-2 font-mono text-xs">{a.user_id}</td>
                      {ACTIONS.map((act) => (
                        <td key={act}>
                          <Checkbox
                            checked={row[`allow_${act}` as keyof DocVaultUserACL] as boolean}
                            onCheckedChange={(v) => toggleAcl(a.user_id, act, v === true)}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
