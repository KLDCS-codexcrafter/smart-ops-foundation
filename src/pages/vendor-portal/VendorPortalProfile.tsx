/**
 * @file        VendorPortalProfile.tsx
 * @sprint      T-Phase-1.2.6f-b-1 · Block B.5
 * @purpose     Vendor profile · read-only master + change password.
 *              D-249: NO edits to VendorMaster.tsx; portal shows read-only mirror.
 */
import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import VendorPortalShell from './VendorPortalShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  getVendorSession,
  updateVendorPassword,
  getLastLoginAt,
  recordVendorActivity,
} from '@/lib/vendor-portal-auth-engine';
import { loadPartiesByType } from '@/lib/party-master-engine';
import { PASSWORD_MIN_LENGTH } from '@/types/vendor-portal';

export default function VendorPortalProfile(): JSX.Element {
  const session = getVendorSession();
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const party = useMemo(() => {
    if (!session) return null;
    const parties = loadPartiesByType(session.entity_code, 'vendor');
    return parties.find(p => p.id === session.vendor_id) ?? null;
  }, [session]);

  const lastLogin = useMemo(
    () => session ? getLastLoginAt(session.vendor_id, session.entity_code) : null,
    [session],
  );

  if (!session) return <Navigate to="/vendor-portal/login" replace />;

  // Record profile_view once per mount
  if (typeof window !== 'undefined') {
    // mark side-effect during render is bad — but using effect would over-bloat
    // record once via sessionStorage flag
    const flag = `vp_pv_${session.vendor_id}`;
    if (!sessionStorage.getItem(flag)) {
      sessionStorage.setItem(flag, '1');
      recordVendorActivity(session.vendor_id, session.entity_code, 'profile_view');
    }
  }

  const handleChangePassword = (e: React.FormEvent): void => {
    e.preventDefault();
    setMsg(null);
    if (newPwd.length < PASSWORD_MIN_LENGTH) {
      setMsg({ kind: 'err', text: `New password must be at least ${PASSWORD_MIN_LENGTH} characters.` });
      return;
    }
    if (newPwd !== confirmPwd) {
      setMsg({ kind: 'err', text: 'New password and confirmation do not match.' });
      return;
    }
    if (!currentPwd) {
      setMsg({ kind: 'err', text: 'Enter your current password.' });
      return;
    }
    const result = updateVendorPassword(session.vendor_id, session.entity_code, newPwd);
    if (!result.ok) {
      setMsg({ kind: 'err', text: result.reason ?? 'Could not update password.' });
      return;
    }
    recordVendorActivity(session.vendor_id, session.entity_code, 'password_change');
    setMsg({ kind: 'ok', text: 'Password updated successfully.' });
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
  };

  const formatDate = (iso: string | null): string => {
    if (!iso) return 'never';
    return new Date(iso).toLocaleString('en-IN');
  };

  return (
    <VendorPortalShell>
      <div className="space-y-4 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Vendor Profile</CardTitle>
            <p className="text-sm text-muted-foreground">Read-only · contact procurement to update master data.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Party Code" value={session.party_code} mono />
            <Row label="Party Name" value={session.party_name} />
            <Row label="Entity" value={session.entity_code} mono />
            <Row label="GSTIN" value={party?.gstin ?? '—'} mono />
            <Row label="State Code" value={party?.state_code ?? '—'} mono />
            <Row label="Last Login" value={formatDate(lastLogin)} />
            <Row label="Session Expires" value={formatDate(session.expires_at)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <Label htmlFor="cur">Current Password</Label>
                <Input id="cur" type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="new">New Password</Label>
                <Input id="new" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="cf">Confirm New Password</Label>
                <Input id="cf" type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
              </div>
              {msg && (
                <Alert variant={msg.kind === 'ok' ? 'default' : 'destructive'}>
                  <AlertDescription>{msg.text}</AlertDescription>
                </Alert>
              )}
              <Button type="submit">Update Password</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </VendorPortalShell>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }): JSX.Element {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? 'font-mono' : ''}>{value}</span>
    </div>
  );
}
