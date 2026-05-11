/**
 * @file        src/components/mobile/MobileSiteSafetyIncidentCapture.tsx
 * @purpose     Mobile Safety Incident capture · 5-step · high/critical auto-escalates via emitSafetyIncidentEscalate (Q-LOCK-5a)
 * @sprint      T-Phase-1.A.15b SiteX Closeout (mobile) · Q-LOCK-2a + Q-LOCK-5a · Block D
 * @reuses      SafetyIncident from @/types/sitex · emitSafetyIncidentEscalate from @/lib/sitex-bridges
 * @[JWT]       POST /api/sitex/safety-incidents
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Camera, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { listSites } from '@/lib/sitex-engine';
import { emitSafetyIncidentEscalate } from '@/lib/sitex-bridges';
import { enqueueWrite } from '@/lib/offline-queue-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import { sitexSafetyIncidentsKey, type SafetyIncident, type SiteMaster } from '@/types/sitex';

const ENTITY = DEFAULT_ENTITY_SHORTCODE;

const SEVERITY_MAP: Record<SafetyIncident['incident_type'], SafetyIncident['severity']> = {
  near_miss: 'low',
  minor_injury: 'medium',
  medical_treatment: 'high',
  lost_time: 'high',
  fatal: 'critical',
  property_damage: 'critical',
};

export default function MobileSiteSafetyIncidentCapture(): JSX.Element {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [sites, setSites] = useState<SiteMaster[]>([]);
  const [siteId, setSiteId] = useState('');
  const [incidentType, setIncidentType] = useState<SafetyIncident['incident_type']>('near_miss');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    setSites(listSites(ENTITY).filter((s) => s.status === 'active' || s.status === 'mobilizing'));
  }, []);

  const severity = SEVERITY_MAP[incidentType];
  const site = sites.find((s) => s.id === siteId) ?? null;

  const canProceed = (s: number): boolean => {
    if (s === 1) return true;
    if (s === 2) return !!siteId;
    if (s === 3) return description.length > 3 && location.length > 1;
    if (s === 4) return true;
    return false;
  };

  const submit = (): void => {
    if (!site) return;
    const incident: SafetyIncident = {
      id: `SI-${Date.now()}`,
      site_id: site.id,
      entity_id: site.entity_id,
      incident_type: incidentType,
      severity,
      description,
      location_on_site: location,
      photo_url: photoUrl,
      reported_by: 'site_engineer',
      occurred_at: new Date().toISOString(),
      ncr_id: null,
      created_at: new Date().toISOString(),
    };
    let escalated = false;
    if (severity === 'high' || severity === 'critical') {
      emitSafetyIncidentEscalate({
        type: 'sitex.safety.incident.escalate',
        incident_id: incident.id,
        site_id: incident.site_id,
        entity_id: incident.entity_id,
        severity,
        incident_type: incidentType,
        reported_by: incident.reported_by,
        occurred_at: incident.occurred_at,
        timestamp: new Date().toISOString(),
      });
      escalated = true;
    }
    if (!navigator.onLine) {
      enqueueWrite(ENTITY, 'complaint_submit', { kind: 'sitex_safety', payload: incident });
      toast.success('Queued · will sync when online');
    } else {
      // [JWT] POST /api/sitex/safety-incidents
      const key = sitexSafetyIncidentsKey(ENTITY);
      const all = JSON.parse(localStorage.getItem(key) ?? '[]') as SafetyIncident[];
      all.push(incident);
      localStorage.setItem(key, JSON.stringify(all));
      toast.success(escalated ? `Incident ${incident.id} · escalated to NCR + dashboard alert` : `Incident ${incident.id} reported`);
    }
    navigate('/operix-go/site-engineer');
  };

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
        <div className="text-xs text-muted-foreground">Step {step} / 5</div>
      </header>
      <h1 className="text-lg font-bold">Safety Incident</h1>

      {step === 1 && (
        <Card className="p-4 space-y-2 text-sm">
          <p>Report safety incident. High/critical escalates to NCR + dashboard alert.</p>
        </Card>
      )}
      {step === 2 && (
        <Card className="p-4 space-y-3">
          <Label>Site</Label>
          <Select value={siteId} onValueChange={setSiteId}>
            <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
            <SelectContent>{sites.map((s) => <SelectItem key={s.id} value={s.id}>{s.site_code}</SelectItem>)}</SelectContent>
          </Select>
        </Card>
      )}
      {step === 3 && (
        <Card className="p-4 space-y-3">
          <Label>Incident type</Label>
          <Select value={incidentType} onValueChange={(v) => setIncidentType(v as SafetyIncident['incident_type'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="near_miss">Near miss</SelectItem>
              <SelectItem value="minor_injury">Minor injury</SelectItem>
              <SelectItem value="medical_treatment">Medical treatment</SelectItem>
              <SelectItem value="lost_time">Lost time</SelectItem>
              <SelectItem value="fatal">Fatal</SelectItem>
              <SelectItem value="property_damage">Property damage</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground">Derived severity: <strong>{severity}</strong></div>
          <Label>Location</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          <Button variant="outline" className="w-full" onClick={() => setPhotoUrl(`mock://safety-${Date.now()}.jpg`)}>
            <Camera className="h-4 w-4 mr-2" />{photoUrl ? 'Photo captured' : 'Capture photo'}
          </Button>
          {incidentType === 'fatal' && (
            <div className="text-xs text-destructive border border-destructive rounded p-2">
              Notify safety officer IMMEDIATELY · call emergency
            </div>
          )}
        </Card>
      )}
      {step === 4 && site && (
        <Card className="p-4 space-y-2 text-sm">
          <div><strong>Site:</strong> {site.site_name}</div>
          <div><strong>Type:</strong> {incidentType}</div>
          <div className="flex items-center gap-1"><ShieldAlert className="h-3 w-3" /><strong>Severity:</strong> {severity}</div>
          <div><strong>Location:</strong> {location}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </Card>
      )}
      {step === 5 && (
        <Card className="p-4 text-center space-y-3">
          <Button onClick={submit} className="w-full">Submit Incident Report</Button>
        </Card>
      )}

      <div className="flex gap-2">
        {step > 1 && <Button variant="outline" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4 | 5)} className="flex-1">Back</Button>}
        {step < 5 && <Button onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3 | 4 | 5)} disabled={!canProceed(step)} className="flex-1">Next<ArrowRight className="h-4 w-4 ml-1" /></Button>}
      </div>
    </div>
  );
}
