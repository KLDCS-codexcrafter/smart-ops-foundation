/**
 * @file        src/components/mobile/MobileSiteSnagCapture.tsx
 * @purpose     Mobile Snag capture · 5-step pattern · severity ≥ medium auto-escalates to NCR via emitSnagRaisedSevere (OOB #10)
 * @sprint      T-Phase-1.A.15b SiteX Closeout (mobile) · Q-LOCK-2a + Q-LOCK-4a · Block C
 * @reuses      Snag + snagsKey from @/types/sitex · emitSnagRaisedSevere from @/lib/sitex-bridges · listSites
 * @[JWT]       POST /api/sitex/snags
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Camera, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { listSites } from '@/lib/sitex-engine';
import { emitSnagRaisedSevere } from '@/lib/sitex-bridges';
import { enqueueWrite } from '@/lib/offline-queue-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import { snagsKey, type Snag, type SiteMaster } from '@/types/sitex';

const ENTITY = DEFAULT_ENTITY_SHORTCODE;

export default function MobileSiteSnagCapture(): JSX.Element {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [sites, setSites] = useState<SiteMaster[]>([]);
  const [siteId, setSiteId] = useState<string>('');
  const [location, setLocation] = useState('');
  const [severity, setSeverity] = useState<Snag['severity']>('low');
  const [category, setCategory] = useState<Snag['category']>('workmanship');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    setSites(listSites(ENTITY).filter((s) => s.status === 'active' || s.status === 'mobilizing'));
  }, []);

  const site = sites.find((s) => s.id === siteId) ?? null;

  const canProceed = (s: number): boolean => {
    if (s === 1) return true;
    if (s === 2) return !!siteId && location.length > 1;
    if (s === 3) return description.length > 3;
    if (s === 4) return true;
    return false;
  };

  const submit = (): void => {
    if (!site) return;
    const snag: Snag = {
      id: `SNAG-${Date.now()}`,
      site_id: site.id,
      entity_id: site.entity_id,
      raised_by: 'site_engineer',
      raised_at: new Date().toISOString(),
      severity,
      category,
      description,
      location_on_site: location,
      photo_url: photoUrl,
      status: 'open',
      ncr_id: null,
      resolved_at: null,
    };
    let escalated = false;
    if (severity === 'medium' || severity === 'high' || severity === 'critical') {
      emitSnagRaisedSevere({
        type: 'sitex.snag.raised.severe',
        snag_id: snag.id,
        site_id: snag.site_id,
        entity_id: snag.entity_id,
        severity,
        category,
        description,
        timestamp: new Date().toISOString(),
      });
      snag.status = 'escalated_to_ncr';
      escalated = true;
    }
    if (!navigator.onLine) {
      enqueueWrite(ENTITY, 'complaint_submit', { kind: 'sitex_snag', payload: snag });
      toast.success('Queued · will sync when online');
    } else {
      // [JWT] POST /api/sitex/snags
      const key = snagsKey(ENTITY);
      const all = JSON.parse(localStorage.getItem(key) ?? '[]') as Snag[];
      all.push(snag);
      localStorage.setItem(key, JSON.stringify(all));
      toast.success(escalated ? `Snag ${snag.id} · NCR auto-created` : `Snag ${snag.id} captured`);
    }
    navigate('/operix-go/site-engineer');
  };

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
        <div className="text-xs text-muted-foreground">Step {step} / 5</div>
      </header>
      <h1 className="text-lg font-bold">Report Snag</h1>

      {step === 1 && (
        <Card className="p-4 space-y-2 text-sm">
          <p>One-tap snag capture. Medium+ severity auto-escalates to NCR.</p>
        </Card>
      )}
      {step === 2 && (
        <Card className="p-4 space-y-3">
          <Label>Site</Label>
          <Select value={siteId} onValueChange={setSiteId}>
            <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
            <SelectContent>{sites.map((s) => <SelectItem key={s.id} value={s.id}>{s.site_code}</SelectItem>)}</SelectContent>
          </Select>
          <Label>Location on site</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Block A · 3rd floor" />
        </Card>
      )}
      {step === 3 && (
        <Card className="p-4 space-y-3">
          <Label>Severity</Label>
          <Select value={severity} onValueChange={(v) => setSeverity(v as Snag['severity'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium · auto-NCR</SelectItem>
              <SelectItem value="high">High · auto-NCR</SelectItem>
              <SelectItem value="critical">Critical · auto-NCR</SelectItem>
            </SelectContent>
          </Select>
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as Snag['category'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="workmanship">Workmanship</SelectItem>
              <SelectItem value="safety">Safety</SelectItem>
              <SelectItem value="material">Material</SelectItem>
              <SelectItem value="design">Design</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          <Button variant="outline" className="w-full" onClick={() => setPhotoUrl(`mock://snag-${Date.now()}.jpg`)}>
            <Camera className="h-4 w-4 mr-2" />{photoUrl ? 'Photo captured' : 'Capture photo'}
          </Button>
          {(severity === 'medium' || severity === 'high' || severity === 'critical') && (
            <div className="text-xs text-warning flex items-center gap-1"><AlertTriangle className="h-3 w-3" />NCR will be auto-created</div>
          )}
        </Card>
      )}
      {step === 4 && site && (
        <Card className="p-4 space-y-2 text-sm">
          <div><strong>Site:</strong> {site.site_name}</div>
          <div><strong>Severity:</strong> {severity}</div>
          <div><strong>Category:</strong> {category}</div>
          <div><strong>Where:</strong> {location}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </Card>
      )}
      {step === 5 && (
        <Card className="p-4 text-center space-y-3">
          <p className="text-sm">Submit snag report</p>
          <Button onClick={submit} className="w-full">Submit Snag</Button>
        </Card>
      )}

      <div className="flex gap-2">
        {step > 1 && <Button variant="outline" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4 | 5)} className="flex-1">Back</Button>}
        {step < 5 && <Button onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3 | 4 | 5)} disabled={!canProceed(step)} className="flex-1">Next<ArrowRight className="h-4 w-4 ml-1" /></Button>}
      </div>
    </div>
  );
}
