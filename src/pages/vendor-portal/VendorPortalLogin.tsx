/**
 * @file        VendorPortalLogin.tsx
 * @sprint      T-Phase-1.2.6f-b-1 · Block B.2
 * @purpose     Token-or-password landing page · D-255 token-only flow + credentials path.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import {
  verifyVendorCredential,
  createVendorSession,
  persistVendorSession,
  touchVendorLastLogin,
  recordVendorActivity,
} from '@/lib/vendor-portal-auth-engine';

export default function VendorPortalLogin(): JSX.Element {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const tokenFromUrl = params.get('token');
  const vendorIdFromUrl = params.get('vendor');
  const entityFromUrl = params.get('entity') ?? '';
  const isTokenLanding = !!tokenFromUrl && !!vendorIdFromUrl;

  const [vendorId, setVendorId] = useState(vendorIdFromUrl ?? '');
  const [entity, setEntity] = useState(entityFromUrl);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Auto-attempt token-only login on mount when token present.
  useEffect(() => {
    if (!isTokenLanding) return;
    let cancelled = false;
    void (async () => {
      setBusy(true);
      const result = await verifyVendorCredential(vendorIdFromUrl, entityFromUrl, null);
      if (cancelled) return;
      if (!result.ok || !result.vendor) {
        setError('Invalid token or vendor not found for this entity.');
        setBusy(false);
        return;
      }
      const session = createVendorSession(result.vendor, entityFromUrl, true, result.mustChangePassword);
      persistVendorSession(session);
      recordVendorActivity(result.vendor.id, entityFromUrl, 'token_landing');
      touchVendorLastLogin(result.vendor.id, entityFromUrl);
      navigate('/vendor-portal/inbox', { replace: true });
    })();
    return () => { cancelled = true; };
  }, [isTokenLanding, vendorIdFromUrl, entityFromUrl, navigate]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    if (!vendorId.trim() || !entity.trim()) {
      setError('Vendor ID and Entity Code are required.');
      return;
    }
    setBusy(true);
    const result = await verifyVendorCredential(vendorId.trim(), entity.trim().toUpperCase(), password || null);
    setBusy(false);
    if (!result.ok || !result.vendor) {
      // Don't reveal vendor existence — generic message (security hint from spec)
      setError('Invalid credentials. Check your vendor ID, entity code, and password.');
      return;
    }
    const session = createVendorSession(result.vendor, entity.trim().toUpperCase(), false, result.mustChangePassword);
    persistVendorSession(session);
    touchVendorLastLogin(result.vendor.id, session.entity_code);
    navigate('/vendor-portal/inbox', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Operix · Vendor Portal</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in to view RFQs and submit quotations
          </p>
        </CardHeader>
        <CardContent>
          {isTokenLanding && busy && (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Verifying token …
            </div>
          )}
          {!isTokenLanding && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="vendor">Vendor ID</Label>
                <Input
                  id="vendor"
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  placeholder="vendor-sinha-v1"
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="entity">Entity Code</Label>
                <Input
                  id="entity"
                  value={entity}
                  onChange={(e) => setEntity(e.target.value)}
                  placeholder="SINHA"
                  className="font-mono uppercase"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              {error && (
                <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
              )}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Sign In
              </Button>
              <p className="text-xs text-muted-foreground text-center pt-2">
                First time? Submit your first quote using the link from your RFQ email.
              </p>
            </form>
          )}
          {error && isTokenLanding && (
            <Alert variant="destructive" className="mt-4"><AlertDescription>{error}</AlertDescription></Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
