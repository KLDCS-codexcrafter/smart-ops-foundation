/**
 * BiometricLoginPrompt.tsx — Unlock-with-biometric button for MobileLogin.
 * Only renders on native + enrolled devices. Gracefully hidden on web.
 */

import { useEffect, useState } from 'react';
import { Fingerprint, ScanFace } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  checkBiometricCapability,
  promptBiometric,
  getBiometricToken,
  type BiometricKind,
} from '@/lib/biometric-bridge';

interface BiometricLoginPromptProps {
  onAuthenticated: (credential: string) => void;
}

export function BiometricLoginPrompt({ onAuthenticated }: BiometricLoginPromptProps) {
  const [kind, setKind] = useState<BiometricKind>('none');
  const [available, setAvailable] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const cap = await checkBiometricCapability();
      if (!mounted) return;
      setAvailable(cap.available);
      setKind(cap.kind);
      if (cap.available) {
        const token = await getBiometricToken('opx_session_credential');
        if (mounted) setHasToken(!!token);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (!available || !hasToken) return null;

  const promptLabel =
    kind === 'face' ? 'Unlock with Face ID' :
    kind === 'fingerprint' ? 'Unlock with fingerprint' :
    kind === 'iris' ? 'Unlock with iris' :
    'Unlock';

  const Icon = kind === 'face' ? ScanFace : Fingerprint;

  const handleUnlock = async () => {
    const result = await promptBiometric('Sign in to OperixGo');
    if (result.ok) {
      const token = await getBiometricToken('opx_session_credential');
      if (token) {
        onAuthenticated(token);
        toast.success('Unlocked');
        return;
      }
    }
    if (result.cancelled) {
      toast.info('Biometric cancelled');
    } else if (result.reason) {
      toast.error(result.reason);
    }
  };

  return (
    <Button
      variant="outline"
      type="button"
      onClick={handleUnlock}
      className="w-full gap-2"
    >
      <Icon className="h-4 w-4" />
      {promptLabel}
    </Button>
  );
}

export default BiometricLoginPrompt;
