/**
 * QRCameraScanner.tsx — Camera-based QR scanner; graduates the 14b
 * paste-input approach. Uses @capacitor-community/barcode-scanner on native.
 * Falls back to QRLoginTrigger paste-input on web.
 */

import { useState } from 'react';
import { Camera, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { isNative } from '@/lib/platform-engine';
import { decodeQRPayload } from '@/lib/qr-login-engine';
import { QRLoginTrigger } from './QRLoginTrigger';

interface QRCameraScannerProps {
  onPayload: (credential: string, token: string) => void;
}

interface BarcodeScannerLike {
  checkPermission: (opts: { force: boolean }) => Promise<{ granted?: boolean }>;
  hideBackground: () => Promise<void>;
  showBackground: () => Promise<void>;
  startScan: (opts: { targetedFormats: string[] }) => Promise<{
    hasContent?: boolean;
    content?: string;
  }>;
}

async function loadScanner(): Promise<BarcodeScannerLike | null> {
  try {
    const mod = (await import(
      /* @vite-ignore */ '@capacitor-community/barcode-scanner' as unknown as string
    )) as { BarcodeScanner?: BarcodeScannerLike };
    return mod.BarcodeScanner ?? null;
  } catch {
    return null;
  }
}

export function QRCameraScanner({ onPayload }: QRCameraScannerProps) {
  const [scanning, setScanning] = useState(false);

  if (!isNative()) {
    return <QRLoginTrigger onPayload={onPayload} />;
  }

  const scan = async () => {
    setScanning(true);
    try {
      const BarcodeScanner = await loadScanner();
      if (!BarcodeScanner) {
        toast.error('Scanner plugin not installed');
        setScanning(false);
        return;
      }

      const status = await BarcodeScanner.checkPermission({ force: true });
      if (!status.granted) {
        toast.error('Camera permission required');
        setScanning(false);
        return;
      }

      await BarcodeScanner.hideBackground();
      document.body.classList.add('qr-scan-active');

      const result = await BarcodeScanner.startScan({ targetedFormats: ['QR_CODE'] });

      document.body.classList.remove('qr-scan-active');
      await BarcodeScanner.showBackground();

      if (result.hasContent && result.content) {
        const decoded = decodeQRPayload(result.content);
        if (decoded.ok && decoded.payload) {
          onPayload(decoded.payload.credential, decoded.payload.token);
          toast.success('QR verified');
        } else {
          toast.error(decoded.reason ?? 'Invalid QR');
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  return (
    <Button
      variant="outline"
      type="button"
      onClick={scan}
      disabled={scanning}
      className="w-full gap-2"
    >
      {scanning ? (
        <ScanLine className="h-4 w-4 animate-pulse" />
      ) : (
        <Camera className="h-4 w-4" />
      )}
      {scanning ? 'Scanning…' : 'Scan QR code'}
    </Button>
  );
}

export default QRCameraScanner;
