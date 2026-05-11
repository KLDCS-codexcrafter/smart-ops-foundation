/**
 * @file        src/components/mobile/MobilePMTickoffCapture.tsx
 * @purpose     Mobile PM tickoff capture · OOB-M9 5-step pattern · post_maintenance photo via appendEquipmentPhoto
 * @sprint      T-Phase-1.A.17 · Q-LOCK-2 + Q-LOCK-7 · Block C.2 · NEW
 * @decisions   D-NEW-DF consumer #6 · D-NEW-DG consumer
 * @disciplines FR-30 standard headers · FR-73.1 absolute
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  listEquipment,
  listPMScheduleTemplates,
  createPMTickoff,
  appendEquipmentPhoto,
} from '@/lib/maintainpro-engine';

const E = 'DEMO';

export default function MobilePMTickoffCapture(): JSX.Element {
  const navigate = useNavigate();
  const equipment = listEquipment(E);
  const templates = listPMScheduleTemplates(E);

  const [templateId, setTemplateId] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [durationMinutes, setDurationMinutes] = useState(30);
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
    if (!templateId || !equipmentId) return;
    setSubmitting(true);
    createPMTickoff(E, {
      pm_no: `PM/MOB/${Date.now()}`,
      pm_schedule_template_id: templateId,
      equipment_id: equipmentId,
      scheduled_date: new Date().toISOString(),
      actual_completion_date: new Date().toISOString(),
      performed_by_user_id: 'mobile_tech',
      duration_minutes: durationMinutes,
      activities_completed: [],
      parts_used: [],
      next_due_date: null,
      status: 'completed',
      project_id: null,
    });
    if (photoUrl) {
      appendEquipmentPhoto(E, equipmentId, photoUrl, 'post_maintenance', 'mobile_tech');
    }
    void notes;
    void gps;
    setSubmitting(false);
    toast.success('PM completed');
    navigate('/operix-go/maintenance-technician');
  }

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/operix-go/maintenance-technician')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
        <h1 className="text-base font-bold flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-primary" />PM Tick-off
        </h1>
        <div className="w-12" />
      </header>

      <Card className="p-4 space-y-2">
        <Label>Step 1 · PM Template &amp; Equipment</Label>
        <select
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
        >
          <option value="">Select PM Template</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.template_code} · {t.template_name}</option>
          ))}
        </select>
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
          <Camera className="h-4 w-4 mr-2" />{photoUrl ? 'Retake' : 'Capture Photo'}
        </Button>
      </Card>

      <Card className="p-4 space-y-2">
        <Label>Step 3 · Duration &amp; Notes</Label>
        <Input
          type="number"
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(Number(e.target.value))}
          placeholder="Minutes"
        />
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
        disabled={!templateId || !equipmentId || submitting}
      >
        {submitting ? 'Submitting...' : 'Step 5 · Submit PM Tick-off'}
      </Button>
    </div>
  );
}
