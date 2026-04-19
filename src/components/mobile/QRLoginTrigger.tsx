/**
 * QRLoginTrigger.tsx — Button on MobileLogin that prompts for QR payload
 *
 * 14b SCOPE: The actual camera-based QR scanner is Sprint 14c work
 * (needs @capacitor/camera + @capacitor/barcode-scanner). For 14b we
 * ship a simple text-input dialog where the user can paste a QR payload
 * they received via email/WhatsApp from their admin. Same decoder,
 * same flow, just without camera yet.
 */

import { useState } from 'react';
import { QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { decodeQRPayload } from '@/lib/qr-login-engine';

interface QRLoginTriggerProps {
  onPayload: (credential: string, token: string) => void;
}

export function QRLoginTrigger({ onPayload }: QRLoginTriggerProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');

  const submit = () => {
    const result = decodeQRPayload(input.trim());
    if (!result.ok || !result.payload) {
      toast.error(result.reason ?? 'Invalid QR');
      return;
    }
    onPayload(result.payload.credential, result.payload.token);
    toast.success('QR verified — logging in');
    setOpen(false);
    setInput('');
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="w-full gap-2"
      >
        <QrCode className="h-4 w-4" />
        Login with QR code
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Paste QR payload</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Your admin sent you a login code via email or WhatsApp. Paste it
              here. (Camera-based scanning coming in the next update.)
            </p>
            <Input
              placeholder="Paste the QR token here"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!input.trim()}>
              Verify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default QRLoginTrigger;
