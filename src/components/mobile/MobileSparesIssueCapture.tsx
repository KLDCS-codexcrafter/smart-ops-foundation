/**
 * @file        src/components/mobile/MobileSparesIssueCapture.tsx
 * @purpose     Mobile spares issue capture · OOB-M9 5-step pattern · OOB-M7 velocity spike alert inline
 * @sprint      T-Phase-1.A.17 · Q-LOCK-2 + Q-LOCK-7 · Block C.3 · NEW
 * @decisions   D-NEW-DF consumer #7
 * @disciplines FR-30 standard headers · FR-73.1 absolute
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  listEquipment,
  listSpareParts,
  createSparesIssue,
  appendEquipmentPhoto,
} from '@/lib/maintainpro-engine';

const E = 'DEMO';

export default function MobileSparesIssueCapture(): JSX.Element {
  const navigate = useNavigate();
  const equipment = listEquipment(E);
  const spares = listSpareParts(E);

  const [spareId, setSpareId] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [gps, setGps] = useState<{ lat: number; lon: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [spikeAlert, setSpikeAlert] = useState(false);

  useEffect(() => {
    setGps({ lat: 19.076, lon: 72.8777 });
  }, []);

  function handleCapturePhoto(): void {
    setPhotoUrl(`stub-photo-${Date.now()}.jpg`);
  }

  function handleSubmit(): void {
    if (!spareId || !equipmentId) return;
    setSubmitting(true);
    const issue = createSparesIssue(E, {
      issue_no: `SI/MOB/${Date.now()}`,
      spare_id: spareId,
      qty,
      consuming_equipment_id: equipmentId,
      consuming_work_order_id: null,
      consuming_breakdown_id: null,
      issued_to_user_id: 'mobile_tech',
      unit_cost: unitCost,
      total_cost: unitCost * qty,
      fincore_voucher_id: null,
      project_id: null,
      issued_at: new Date().toISOString(),
    });
    if (issue.velocity_spike_detected) {
      setSpikeAlert(true);
      toast.warning('OOB-M7: Velocity spike detected for this spare');
    }
    if (photoUrl) {
      appendEquipmentPhoto(E, equipmentId, photoUrl, 'general', 'mobile_tech');
    }
    void gps;
    setSubmitting(false);
    if (!issue.velocity_spike_detected) {
      toast.success('Spares issued');
      navigate('/operix-go/maintenance-technician');
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/operix-go/maintenance-technician')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
        <h1 className="text-base font-bold flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />Spares Issue
        </h1>
        <div className="w-12" />
      </header>

      {spikeAlert && (
        <Card className="p-3 border-warning bg-warning/10">
          <p className="text-xs text-warning-foreground">OOB-M7 · Velocity spike detected. Confirm before re-submit.</p>
          <Button size="sm" className="mt-2" onClick={() => navigate('/operix-go/maintenance-technician')}>
            Acknowledge &amp; Continue
          </Button>
        </Card>
      )}

      <Card className="p-4 space-y-2">
        <Label>Step 1 · Spare &amp; Equipment</Label>
        <select
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={spareId}
          onChange={(e) => setSpareId(e.target.value)}
        >
          <option value="">Select Spare</option>
          {spares.map((s) => (
            <option key={s.stockitem_id} value={s.stockitem_id}>
              {s.stockitem_code} · {s.stockitem_name}
            </option>
          ))}
        </select>
        <select
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={equipmentId}
          onChange={(e) => setEquipmentId(e.target.value)}
        >
          <option value="">Consuming Equipment</option>
          {equipment.map((eq) => (
            <option key={eq.id} value={eq.id}>{eq.equipment_code} · {eq.equipment_name}</option>
          ))}
        </select>
      </Card>

      <Card className="p-4 space-y-2">
        <Label>Step 2 · Photo (optional)</Label>
        <Button variant="outline" className="w-full" onClick={handleCapturePhoto}>
          <Camera className="h-4 w-4 mr-2" />{photoUrl ? 'Retake' : 'Capture'}
        </Button>
      </Card>

      <Card className="p-4 space-y-2">
        <Label>Step 3 · Qty &amp; Unit Cost (₹)</Label>
        <Input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
        <Input
          type="number"
          value={unitCost}
          onChange={(e) => setUnitCost(Number(e.target.value))}
          placeholder="Unit cost ₹"
        />
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
        disabled={!spareId || !equipmentId || submitting}
      >
        {submitting ? 'Submitting...' : 'Step 5 · Submit Issue'}
      </Button>
    </div>
  );
}
