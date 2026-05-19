/**
 * @file        src/pages/vendor-portal/VendorLogin.tsx
 * @purpose     Modern login · richer UX than VendorPortalLogin · same auth-engine API ·
 *              token-or-credentials flow per D-255 · navigates to /vendor-portal (Dashboard) on success
 * @who         External vendor users · pre-authentication
 * @when        2026-05-18 (Sprint A-c.1)
 * @sprint      T-Phase-1.A-c.1-VendorPortal-Layout-Dashboard-Login
 * @iso         ISO 25010 Usability · Security
 * @whom        Audit Owner
 * @decisions   D-272 · D-255 · A-c-Q2=D wholesale modernization · A-c-Q3=B shadcn primitives ·
 *              D-NEW-DX empirical schema verification mid-flight (auth-engine API confirmed positional)
 * @disciplines FR-30 · FR-50 · FR-58
 * @reuses      vendor-portal-auth-engine (consume only · positional signature)
 * @[JWT]       N/A (engine handles auth)
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, Building2, KeyRound, ArrowRight, ShieldCheck,
} from 'lucide-react';
import {
  verifyVendorCredential, createVendorSession, persistVendorSession,
  touchVendorLastLogin, recordVendorActivity,
} from '@/lib/vendor-portal-auth-engine';
import { useT } from '@/lib/i18n-engine';
import { VendorLocaleToggle } from './VendorLocaleToggle';

export default function VendorLogin(): JSX.Element {
  const navigate = useNavigate();
  const t = useT();
  const [params] = useSearchParams();
  const tokenFromUrl = params.get('token');
  const vendorIdFromUrl = params.get('vendor');
  const entityFromUrl = params.get('entity') ?? '';
  const isTokenLanding = !!tokenFromUrl && !!vendorIdFromUrl;

  const [vendorId, setVendorId] = useState(vendorIdFromUrl ?? '');
  const [entityCode, setEntityCode] = useState(entityFromUrl);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Token-landing flow · auto-verify on mount (D-255)
  useEffect(() => {
    if (!isTokenLanding || !vendorIdFromUrl) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await verifyVendorCredential(vendorIdFromUrl, entityFromUrl, null);
        if (cancelled) return;
        if (!result.ok || !result.vendor) {
          setError(result.reason ?? 'Invalid token or vendor not found for this entity.');
          return;
        }
        const session = createVendorSession(result.vendor, entityFromUrl, true, result.mustChangePassword);
        persistVendorSession(session);
        recordVendorActivity(result.vendor.id, entityFromUrl, 'token_landing');
        touchVendorLastLogin(result.vendor.id, entityFromUrl);
        navigate('/vendor-portal', { replace: true });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Login failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isTokenLanding, vendorIdFromUrl, entityFromUrl, navigate]);

  const handleCredentialLogin = async (): Promise<void> => {
    if (!vendorId.trim() || !entityCode.trim()) {
      setError('Vendor ID and Entity Code are required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await verifyVendorCredential(
        vendorId.trim(),
        entityCode.trim().toUpperCase(),
        password || null,
      );
      if (!result.ok || !result.vendor) {
        setError(t('vendor.login.error_invalid', 'Invalid credentials. Check your vendor ID, entity code, and password.'));
        return;
      }
      const session = createVendorSession(
        result.vendor,
        entityCode.trim().toUpperCase(),
        false,
        result.mustChangePassword,
      );
      persistVendorSession(session);
      touchVendorLastLogin(result.vendor.id, session.entity_code);
      navigate('/vendor-portal', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="absolute top-4 right-4">
        <VendorLocaleToggle />
      </div>
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">{t('vendor.login.title', 'Operix · Vendor Portal')}</h1>
          <p className="text-sm text-muted-foreground">{t('vendor.login.subtitle', 'Secure access for procurement partners')}</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {isTokenLanding ? (
                <>
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  {t('vendor.login.token_signin', 'Token Sign-in')}
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  {t('vendor.login.signin', 'Sign in')}
                </>
              )}
            </CardTitle>
            <CardDescription>
              {isTokenLanding
                ? 'Verifying your invitation token · this is automatic'
                : 'Use your vendor credentials or token URL from email'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isTokenLanding ? (
              <div className="py-6 text-center">
                {loading ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('vendor.login.token_verifying', 'Verifying token…')}
                  </div>
                ) : error ? (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : (
                  <div className="text-sm text-muted-foreground">{t('vendor.login.token_verified', 'Token verified · redirecting…')}</div>
                )}
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="vendor-id" className="text-xs">{t('vendor.login.vendor_id', 'Vendor ID')}</Label>
                  <Input
                    id="vendor-id"
                    value={vendorId}
                    onChange={(e) => setVendorId(e.target.value)}
                    placeholder="vendor-sinha-v1"
                    disabled={loading}
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="entity-code" className="text-xs">{t('vendor.login.entity_code', 'Entity Code')}</Label>
                  <Input
                    id="entity-code"
                    value={entityCode}
                    onChange={(e) => setEntityCode(e.target.value)}
                    placeholder="SINHA"
                    disabled={loading}
                    className="font-mono uppercase"
                  />
                </div>
                <div>
                  <Label htmlFor="password" className="text-xs">{t('vendor.login.password', 'Password')}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleCredentialLogin(); }}
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button
                  onClick={handleCredentialLogin}
                  disabled={loading}
                  className="w-full gap-2"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  {t('vendor.login.signin', 'Sign in')}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {!isTokenLanding && (
          <div className="text-center text-xs text-muted-foreground space-y-1">
            <p>{t('vendor.login.help_firsttime', 'First-time vendor? Use the token link from your invitation email.')}</p>
            <Badge variant="outline" className="text-[10px]">D-255 · Token-only initial access</Badge>
          </div>
        )}
      </div>
    </div>
  );
}
