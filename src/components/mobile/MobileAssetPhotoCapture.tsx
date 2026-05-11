/**
 * @file        src/components/mobile/MobileAssetPhotoCapture.tsx
 * @purpose     Mobile standalone equipment photo capture · OOB-M9 5-step · 5 context options · D-NEW-DG consumer
 * @sprint      T-Phase-1.A.17 · Q-LOCK-2 + Q-LOCK-7 · Block C.4 · NEW
 * @decisions   D-NEW-DF consumer #8 · D-NEW-DG consumer
 * @disciplines FR-30 standard headers · FR-73.1 absolute
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera as CameraIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { listEquipment, appendEquipmentPhoto } from '@/lib/maintainpro-engine';

const E = 'DEMO';

type PhotoContext = 'pre_maintenance' | 'post_maintenance' | 'warranty_claim' | 'audit' | 'general';

const CONTEXTS: PhotoContext[] = ['pre_maintenance', 'post_maintenance', 'warranty_claim', 'audit', 'general'];

export default function MobileAssetPhotoCapture(): JSX.Element {
  const navigate = useNavigate();
  const equipment = listEquipment(E);

  const [equipmentId, setEquipmentId] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [context, setContext] = useState<PhotoContext>('general');
  const [notes, setNotes] = useState('');
  const [gps, setGps] = useState<{ lat: number; lon: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setGps({ lat: 19.076, lon: 72.8777 });
  }, []);

  function handleCapturePhoto(): void {
    setPhotoUrl(`stub-photo-${Date.now()}.jpg`);
  }

  function handleSubmit(): void {
    if (!equipmentId || !photoUrl) return;
    setSubmitting(true);
    appendEquipmentPhoto(E, equipmentId, photoUrl, context, 'mobile_tech');
    void notes;
    void gps;
    setSubmitting(false);
    toast.success('Photo recorded');
    navigate('/operix-go/maintenance-technician');
  }

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/operix-go/maintenance-technician')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
        <h1 className="text-base font-bold flex items-center gap-2">
          <CameraIcon className="h-4 w-4 text-primary" />Asset Photo
        </h1>
        <div className="w-12" />
      </header>

      <Card className="p-4 space-y-2">
        <Label>Step 1 · Equipment</Label>
        <select
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={equipmentId}
          onChange={(e) => setEquipmentId(e.target.value)}
        >
          <option value="">Select Equipment</option>
          {equipment.map((eq) => (
            <option key={eq.id} value={eq.id}>{eq.equipment_code} · {eq.equipment_name}</option>
          ))}
        </select>
      </Card>

      <Card className="p-4 space-y-2">
        <Label>Step 2 · Photo</Label>
        <Button variant="outline" className="w-full" onClick={handleCapturePhoto}>
          <CameraIcon className="h-4 w-4 mr-2" />{photoUrl ? 'Retake' : 'Capture Photo'}
        </Button>
        {photoUrl && <p className="text-xs text-muted-foreground">Photo attached</p>}
      </Card>

      <Card className="p-4 space-y-2">
        <Label>Step 3 · Context &amp; Notes</Label>
        <select
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={context}
          onChange={(e) => setContext(e.target.value as PhotoContext)}
        >
          {CONTEXTS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes..." />
      </Card>

      <Card className="p-3">
        <Label className="text-xs">Step 4 · GPS</Label>
        {gps && (
          <p className="text-xs font-mono text-muted-foreground">
            {gps.lat.toFixed(4)}, {gps.lon.toFixed(4)}
          </p>
        )}
      </Card>

      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={!equipmentId || !photoUrl || submitting}
      >
        {submitting ? 'Submitting...' : 'Step 5 · Submit Photo'}
      </Button>
    </div>
  );
}
