/**
 * @file        VendorOnboardingFirstQuote.tsx
 * @sprint      T-Phase-1.2.6f-b-1 · Block D.2
 * @purpose     Modal-style page after first quote submission · D-255 password setup.
 */
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2 } from 'lucide-react';
import { getVendorSession } from '@/lib/vendor-portal-auth-engine';
import {
  completeOnboarding,
  skipOnboarding,
  getOnboardingState,
} from '@/lib/vendor-onboarding-engine';
import { PASSWORD_MIN_LENGTH } from '@/types/vendor-portal';

export default function VendorOnboardingFirstQuote(): JSX.Element {
  const navigate = useNavigate();
  const session = getVendorSession();
  const state = getOnboardingState();
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!session || !state) return <Navigate to="/vendor-portal/login" replace />;

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    setErr(null);
    if (pwd.length < PASSWORD_MIN_LENGTH) {
      setErr(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
      return;
    }
    if (pwd !== confirm) {
      setErr('Passwords do not match.');
      return;
    }
    setBusy(true);
    const result = completeOnboarding(state.vendor_id, state.entity_code, pwd);
    setBusy(false);
    if (!result.ok) {
      setErr(result.reason ?? 'Could not save password.');
      return;
    }
    navigate('/vendor-portal/inbox', { replace: true });
  };

  const handleSkip = (): void => {
    skipOnboarding();
    navigate('/vendor-portal/inbox', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <CardTitle>Welcome, {session.party_name}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Your first quotation has been submitted successfully.
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-4">
            Set a password now to access future RFQs without the email link.
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="np">New Password</Label>
              <Input id="np" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="cp">Confirm Password</Label>
              <Input id="cp" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            {err && <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert>}
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={busy}>Set Password</Button>
              <Button type="button" variant="outline" onClick={handleSkip} disabled={busy}>
                Skip for now
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
