/**
 * @file        src/components/mobile/CameraCapture.tsx
 * @purpose     AM.2 · capture SHELL · snap-or-pick photo → preview → attach
 *              MANUAL entry remains primary · NO OCR · NO fabricated extraction
 * @sprint      AM.2 · T-AM2-Mobile-Captures · Pass 1
 * @canon       Tier-L · auto-extract (OCR) arrives with Wave-2
 *              [JWT] Wave-2: POST /api/ai/ocr-extract
 */
import { useRef, useState } from 'react';
import { Camera, X, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export const CAMERA_CAPTURE_HONESTY =
  'Auto-extract (OCR) arrives with Wave-2 — enter fields manually for now.';

export interface CameraCaptureProps {
  label?: string;
  onPhotoAttached?: (dataUrl: string | null) => void;
  initialDataUrl?: string | null;
}

export function CameraCapture({
  label = 'Photo',
  onPhotoAttached,
  initialDataUrl = null,
}: CameraCaptureProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(initialDataUrl);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      setDataUrl(result);
      onPhotoAttached?.(result);
      // [JWT] Wave-2: POST /api/ai/ocr-extract { image: result }
      // NO client-side OCR here — manual entry remains primary (Tier-L).
    };
    reader.readAsDataURL(file);
  }

  function handleClear(): void {
    setDataUrl(null);
    onPhotoAttached?.(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <Card className="p-3 space-y-2 glass-card rounded-2xl">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold flex items-center gap-1">
          <Camera className="h-3.5 w-3.5 text-primary" />
          {label}
        </Label>
        {dataUrl && (
          <Button variant="ghost" size="sm" onClick={handleClear} aria-label="Remove photo">
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />

      {dataUrl ? (
        <img
          src={dataUrl}
          alt="Captured"
          className="w-full max-h-64 object-contain rounded-lg border border-input bg-background"
        />
      ) : (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="h-4 w-4 mr-2" />
          Capture / pick photo
        </Button>
      )}

      <p className="text-[11px] text-muted-foreground italic">
        {CAMERA_CAPTURE_HONESTY}
      </p>
    </Card>
  );
}

export default CameraCapture;
