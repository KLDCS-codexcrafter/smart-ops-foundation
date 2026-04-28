/**
 * MobileLogin.tsx — Admin-driven login.
 * No self-signup. Resolves credential against Distributor + Customer masters.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { resolveIdentity, type CustomerLite, type ResolvedRole } from '@/lib/mobile-role-resolver';
import type { Distributor } from '@/types/distributor';
import { type SAMPerson, samPersonsKey } from '@/types/sam-person';
import { logAudit } from '@/lib/card-audit-engine';
import { QRCameraScanner } from '@/components/mobile/QRCameraScanner';
import { BiometricLoginPrompt } from '@/components/mobile/BiometricLoginPrompt';
import { setBiometricToken } from '@/lib/biometric-bridge';
import { logMobileLogin } from '@/lib/mobile-audit';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

const ENTITY_CODE = DEFAULT_ENTITY_SHORTCODE;
const DEFAULT_PLAN = 'growth' as const;

function readDistributors(): Distributor[] {
  try {
    // [JWT] GET /api/distributors?entityCode=SMRT
    const raw = localStorage.getItem(`erp_distributors_${ENTITY_CODE}`);
    return raw ? (JSON.parse(raw) as Distributor[]) : [];
  } catch {
    return [];
  }
}

interface CustomerMasterRow {
  id: string;
  name?: string;
  legal_name?: string;
  mobile?: string;
  primary_mobile?: string;
  email?: string;
  primary_email?: string;
  active?: boolean;
}

function readCustomers(): CustomerLite[] {
  try {
    // [JWT] GET /api/customers?entityCode=SMRT
    const raw = localStorage.getItem('erp_group_customer_master');
    if (!raw) return [];
    const list = JSON.parse(raw) as CustomerMasterRow[];
    return list.map((c) => ({
      id: c.id,
      name: c.name ?? c.legal_name ?? 'Customer',
      mobile: c.mobile ?? c.primary_mobile,
      email: c.email ?? c.primary_email,
      active: c.active,
    }));
  } catch {
    return [];
  }
}

export default function MobileLogin() {
  const navigate = useNavigate();
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credential.trim()) {
      toast.error('Enter your mobile, email or partner code');
      return;
    }
    setBusy(true);

    // [JWT] POST /api/mobile/auth/login — simulate latency
    await new Promise((r) => setTimeout(r, 600));

    const identity = resolveIdentity(
      credential,
      password,
      readDistributors(),
      readCustomers(),
      ENTITY_CODE,
      DEFAULT_PLAN,
    );

    if (identity.role === 'unknown') {
      setBusy(false);
      toast.error(identity.failure_reason ?? 'Account not found');
      return;
    }

    try {
      // [JWT] POST /api/mobile/auth/session
      sessionStorage.setItem(
        'opx_mobile_session',
        JSON.stringify({
          role: identity.role,
          user_id: identity.user_id,
          display_name: identity.display_name,
          entity_code: identity.entity_code,
          plan_tier: identity.plan_tier,
        }),
      );
    } catch {
      /* ignore */
    }

    logAudit({
      entityCode: ENTITY_CODE,
      userId: identity.user_id ?? 'mobile-user',
      userName: identity.display_name,
      cardId: identity.role === 'distributor' ? 'distributor-hub' : 'customer-hub',
      action: 'card_open',
      refType: 'mobile_session',
      refId: identity.user_id,
      refLabel: `OperixGo login (${identity.role})`,
    });

    // Sprint 14b — mobile-flavoured audit (Bell drawer surfaces this)
    if (identity.user_id) {
      logMobileLogin(
        identity.entity_code,
        identity.user_id,
        identity.display_name,
        identity.role,
      );
    }

    // Sprint 14c — store credential for next biometric unlock (native only)
    if (identity.user_id) {
      void setBiometricToken('opx_session_credential', credential);
    }

    toast.success(`Welcome, ${identity.display_name}`);
    navigate('/mobile/home', { replace: true });
  };

  const handleQRPayload = (qrCredential: string, _qrToken: string) => {
    // Pre-fill credential and trigger same submit flow.
    // Admin-issued token is trusted (admin-panel model); password skipped.
    setCredential(qrCredential);
    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      void onSubmit(fakeEvent);
    }, 50);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-sm p-6 space-y-5 bg-background/95 backdrop-blur">
        <div className="text-center space-y-1">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mb-2">
            <Smartphone className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">OperixGo</h1>
          <p className="text-xs text-muted-foreground">Your business, on the go</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cred" className="text-xs">
              Mobile / Email / Partner Code
            </Label>
            <Input
              id="cred"
              inputMode="email"
              autoComplete="username"
              placeholder="98765 43210"
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              disabled={busy}
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pwd" className="text-xs">
              Password
            </Label>
            <Input
              id="pwd"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />
          </div>

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Signing in…
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        <div className="flex items-center gap-3 my-3">
          <div className="h-px bg-border flex-1" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px bg-border flex-1" />
        </div>

        <BiometricLoginPrompt
          onAuthenticated={(token) => {
            setCredential(token);
            setTimeout(() => {
              const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
              void onSubmit(fakeEvent);
            }, 50);
          }}
        />

        <QRCameraScanner onPayload={handleQRPayload} />

        <div className="rounded-md border border-border bg-muted/30 p-3 text-[11px] text-muted-foreground leading-relaxed">
          <p className="font-semibold text-foreground mb-1">New to OperixGo?</p>
          Contact your sales representative. No self-registration — your account
          must be set up by admin.
        </div>
      </Card>
    </div>
  );
}
