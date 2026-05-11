/**
 * @file        src/components/mobile/MobileSiteDPRCapture.tsx
 * @purpose     Mobile DPR capture · institutional 5-step pattern · geo-fenced photo validation (OOB #2) · BLOCKS submit if photo outside site fence
 * @sprint      T-Phase-1.A.15b SiteX Closeout (mobile) · Q-LOCK-2a + Q-LOCK-3a · Block B
 * @decisions   D-NEW-CV consumer · D-194 localStorage · FR-50 multi-entity · FR-73.1 absolute
 * @reuses      geolocation-bridge (100m accuracy gate · 3 retries) · offline-queue-engine · listSites · DPR + sitexDprsKey from @/types/sitex
 * @[JWT]       POST /api/sitex/dpr (multipart with photo + geo EXIF)
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Camera, CheckCircle2, MapPin, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { listSites } from '@/lib/sitex-engine';
import { getCurrentLocation } from '@/lib/geolocation-bridge';
import { enqueueWrite } from '@/lib/offline-queue-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import { dprsKey, type DPR, type SiteMaster } from '@/types/sitex';

const ENTITY = DEFAULT_ENTITY_SHORTCODE;

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export default function MobileSiteDPRCapture(): JSX.Element {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [sites, setSites] = useState<SiteMaster[]>([]);
  const [siteId, setSiteId] = useState<string>('');
  const [workCompleted, setWorkCompleted] = useState('');
  const [manpower, setManpower] = useState(0);
  const [equipment, setEquipment] = useState('');
  const [materials, setMaterials] = useState('');
  const [weather, setWeather] = useState<DPR['weather']>('sunny');
  const [delays, setDelays] = useState('');
  const [photoGeo, setPhotoGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [geoFencePassed, setGeoFencePassed] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSites(listSites(ENTITY).filter((s) => s.status === 'active' || s.status === 'mobilizing'));
  }, []);

  const site = sites.find((s) => s.id === siteId) ?? null;

  const capturePhoto = async (): Promise<void> => {
    const loc = await getCurrentLocation(100);
    if (!loc.ok || loc.latitude === undefined || loc.longitude === undefined) {
      toast.error(`GPS failed: ${loc.reason ?? 'unknown'}`);
      return;
    }
    setPhotoGeo({ lat: loc.latitude, lng: loc.longitude });
    setPhotoUrl(`mock://dpr-photo-${Date.now()}.jpg`);
    if (site) {
      const dist = haversineMeters(loc.latitude, loc.longitude, site.location.geo_lat, site.location.geo_lng);
      const passed = dist <= site.location.geo_radius_meters;
      setGeoFencePassed(passed);
      if (!passed) toast.error(`Photo ${Math.round(dist)}m from site (fence ${site.location.geo_radius_meters}m) · submit BLOCKED`);
      else toast.success(`Photo within fence (${Math.round(dist)}m)`);
    }
  };

  const canProceed = (s: number): boolean => {
    if (s === 1) return true;
    if (s === 2) return !!siteId;
    if (s === 3) return workCompleted.length > 3 && manpower > 0 && photoUrl !== null && geoFencePassed === true;
    if (s === 4) return true;
    return false;
  };

  const submit = async (): Promise<void> => {
    if (!site || !photoGeo) return;
    if (geoFencePassed !== true) {
      toast.error('Submit BLOCKED · photo outside geo-fence');
      return;
    }
    setSubmitting(true);
    const dpr: DPR = {
      id: `DPR-${Date.now()}`,
      site_id: site.id,
      entity_id: site.entity_id,
      report_date: new Date().toISOString().slice(0, 10),
      prepared_by: 'site_engineer',
      work_completed: workCompleted,
      manpower_count: manpower,
      equipment_count: equipment ? equipment.split(',').length : 0,
      material_consumed: materials
        ? [{ item_id: 'misc', qty: 1, uom: 'lot' }]
        : [],
      weather,
      delays,
      geo_validated: true,
      geo_lat: photoGeo.lat,
      geo_lng: photoGeo.lng,
      geo_distance_from_site_m: haversineMeters(photoGeo.lat, photoGeo.lng, site.location.geo_lat, site.location.geo_lng),
      geo_accuracy_m: 100,
      photo_url: photoUrl,
      created_at: new Date().toISOString(),
    };
    try {
      if (!navigator.onLine) {
        enqueueWrite(ENTITY, 'order_place', { kind: 'sitex_dpr', payload: dpr });
        toast.success('Queued · will sync when online');
      } else {
        // [JWT] POST /api/sitex/dpr
        const key = dprsKey(ENTITY);
        const all = JSON.parse(localStorage.getItem(key) ?? '[]') as DPR[];
        all.push(dpr);
        localStorage.setItem(key, JSON.stringify(all));
        toast.success(`DPR ${dpr.id} submitted`);
      }
      navigate('/operix-go/site-engineer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
        <div className="text-xs text-muted-foreground">Step {step} / 5</div>
      </header>
      <h1 className="text-lg font-bold">Daily Progress Report</h1>

      {step === 1 && (
        <Card className="p-4 space-y-3">
          <p className="text-sm">Capture today's site progress with geo-fenced photo evidence.</p>
          <p className="text-xs text-muted-foreground">Role: site_engineer · OOB #2 Geo-fenced DPR</p>
        </Card>
      )}

      {step === 2 && (
        <Card className="p-4 space-y-3">
          <Label>Select site</Label>
          <Select value={siteId} onValueChange={setSiteId}>
            <SelectTrigger><SelectValue placeholder="Choose active site" /></SelectTrigger>
            <SelectContent>
              {sites.map((s) => <SelectItem key={s.id} value={s.id}>{s.site_code} · {s.site_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Card>
      )}

      {step === 3 && (
        <Card className="p-4 space-y-3">
          <div><Label>Work completed</Label><Textarea value={workCompleted} onChange={(e) => setWorkCompleted(e.target.value)} /></div>
          <div><Label>Manpower</Label><Input type="number" value={manpower || ''} onChange={(e) => setManpower(parseInt(e.target.value) || 0)} /></div>
          <div><Label>Equipment</Label><Input value={equipment} onChange={(e) => setEquipment(e.target.value)} /></div>
          <div><Label>Material consumed</Label><Input value={materials} onChange={(e) => setMaterials(e.target.value)} /></div>
          <div>
            <Label>Weather</Label>
            <Select value={weather} onValueChange={(v) => setWeather(v as DPR['weather'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sunny">Sunny</SelectItem>
                <SelectItem value="cloudy">Cloudy</SelectItem>
                <SelectItem value="rainy">Rainy</SelectItem>
                <SelectItem value="extreme">Extreme</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Delays / blockers</Label><Input value={delays} onChange={(e) => setDelays(e.target.value)} /></div>
          <Button onClick={() => void capturePhoto()} variant="outline" className="w-full">
            <Camera className="h-4 w-4 mr-2" />{photoUrl ? 'Re-capture photo' : 'Capture geo-photo'}
          </Button>
          {photoUrl && geoFencePassed === true && (
            <div className="text-xs text-success flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Within fence</div>
          )}
          {photoUrl && geoFencePassed === false && (
            <div className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Outside fence · submit BLOCKED</div>
          )}
        </Card>
      )}

      {step === 4 && site && (
        <Card className="p-4 space-y-2 text-sm">
          <div><strong>Site:</strong> {site.site_name}</div>
          <div><strong>Work:</strong> {workCompleted}</div>
          <div><strong>Manpower:</strong> {manpower}</div>
          <div><strong>Weather:</strong> {weather}</div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{photoGeo?.lat.toFixed(5)}, {photoGeo?.lng.toFixed(5)}</div>
        </Card>
      )}

      {step === 5 && (
        <Card className="p-4 space-y-3 text-center">
          <p className="text-sm">Confirm submission</p>
          <Button onClick={() => void submit()} disabled={submitting || geoFencePassed !== true} className="w-full">
            {submitting ? 'Submitting...' : 'Submit DPR'}
          </Button>
        </Card>
      )}

      <div className="flex gap-2">
        {step > 1 && <Button variant="outline" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4 | 5)} className="flex-1">Back</Button>}
        {step < 5 && (
          <Button onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3 | 4 | 5)} disabled={!canProceed(step)} className="flex-1">
            Next<ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
