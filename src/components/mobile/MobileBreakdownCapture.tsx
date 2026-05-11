/**
 * @file        src/components/mobile/MobileBreakdownCapture.tsx
 * @purpose     Mobile breakdown capture · OOB-M9 5-step pattern · matches A.15b MobileSiteDPRCapture precedent
 * @sprint      T-Phase-1.A.17 · Q-LOCK-2 + Q-LOCK-7 · Block C.1 · NEW · MOAT #23 criterion #8
 * @decisions   D-NEW-DF Mobile Capture 5-Step Pattern POSSIBLE 29th canonical (8 consumers at A.17 · FR-72 strong candidate)
 * @disciplines FR-30 standard headers · FR-73.1 absolute
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  listEquipment,
  createBreakdownReport,
  appendEquipmentPhoto,
} from '@/lib/maintainpro-engine';

const E = 'DEMO';

export default function MobileBreakdownCapture(): JSX.Element {
  const navigate = useNavigate();
  const equipment = listEquipment(E);

  const [equipmentId, setEquipmentId] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [complaint, setComplaint] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [gps, setGps] = useState<{ lat: number; lon: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Step 4 · GPS auto-capture · Phase 1 stub · [JWT] Phase 2 real navigator.geolocation
    setGps({ lat: 19.076, lon: 72.8777 });
  }, []);

  function handleCapturePhoto(): void {
    // [JWT] Phase 2: real camera/gallery via Capacitor or web file input
    setPhotoUrl(`stub-photo-${Date.now()}.jpg`);
  }

  function handleSubmit(): void {
    if (!equipmentId || !complaint) return;
    setSubmitting(true);
    createBreakdownReport(E, {
      breakdown_no: `BD/MOB/${Date.now()}`,
      equipment_id: equipmentId,
      reported_by_user_id: 'mobile_tech',
      originating_department_id: 'maintenance',
      occurred_at: new Date().toISOString(),
      reported_at: new Date().toISOString(),
      resolved_at: null,
      downtime_minutes: 0,
      nature_of_complaint: complaint,
      severity,
      corrective_action: '',
      attended_by_user_id: null,
      remarks: gps ? `GPS: ${gps.lat},${gps.lon}` : '',
      triggered_work_order_id: null,
      project_id: null,
    });
    if (photoUrl) {
      appendEquipmentPhoto(E, equipmentId, photoUrl, 'pre_maintenance', 'mobile_tech');
    }
    setSubmitting(false);
    toast.success('Breakdown reported');
    navigate('/operix-go/maintenance-technician');
  }

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/operix-go/maintenance-technician')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
        <h1 className="text-base font-bold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" />Report Breakdown
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
            <option key={eq.id} value={eq.id}>
              {eq.equipment_code} · {eq.equipment_name}
            </option>
          ))}
        </select>
      </Card>

      <Card className="p-4 space-y-2">
        <Label>Step 2 · Photo</Label>
        <Button variant="outline" className="w-full" onClick={handleCapturePhoto}>
          <Camera className="h-4 w-4 mr-2" />{photoUrl ? 'Retake Photo' : 'Capture Photo'}
        </Button>
        {photoUrl && <p className="text-xs text-muted-foreground">Photo attached</p>}
      </Card>

      <Card className="p-4 space-y-2">
        <Label>Step 3 · Complaint &amp; Severity</Label>
        <Textarea
          placeholder="Describe the issue..."
          value={complaint}
          onChange={(e) => setComplaint(e.target.value)}
        />
        <div role="radiogroup" className="flex gap-2 flex-wrap">
          {(['low', 'medium', 'high', 'critical'] as const).map((s) => (
            <label key={s} className="flex items-center gap-1 text-xs">
              <input
                type="radio"
                name="severity"
                value={s}
                checked={severity === s}
                onChange={() => setSeverity(s)}
              />
              {s}
            </label>
          ))}
        </div>
      </Card>

      <Card className="p-3">
        <Label className="text-xs">Step 4 · GPS</Label>
        {gps ? (
          <p className="text-xs font-mono text-muted-foreground">
            {gps.lat.toFixed(4)}, {gps.lon.toFixed(4)}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Acquiring...</p>
        )}
      </Card>

      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={!equipmentId || !complaint || submitting}
      >
        {submitting ? 'Submitting...' : 'Step 5 · Submit Breakdown'}
      </Button>
    </div>
  );
}
