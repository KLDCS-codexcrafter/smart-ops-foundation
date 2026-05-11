/**
 * @file        src/pages/erp/sitex/registers/DPRRegister.tsx
 * @purpose     Daily Progress Report register (Master Plan §6.3 + Geo-fenced OOB #2)
 * @sprint      T-Phase-1.A.15a · Block E.2
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FileText, AlertTriangle } from 'lucide-react';
import { listSites } from '@/lib/sitex-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import { dprsKey, type DPR } from '@/types/sitex';

interface Props { onNavigate: (m: string) => void }

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number): number => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function DPRRegister({ onNavigate: _onNavigate }: Props): JSX.Element {
  const entity = DEFAULT_ENTITY_SHORTCODE;
  const sites = useMemo(() => listSites(entity), [entity]);
  const [siteId, setSiteId] = useState<string>(sites[0]?.id ?? '');
  const [workCompleted, setWorkCompleted] = useState('');
  const [manpower, setManpower] = useState('');
  const [equipment, setEquipment] = useState('');
  const [photoLat, setPhotoLat] = useState('');
  const [photoLng, setPhotoLng] = useState('');
  const [refresh, setRefresh] = useState(0);

  const site = sites.find((s) => s.id === siteId);
  const dist = site && photoLat && photoLng
    ? haversineMeters(Number(photoLat), Number(photoLng), site.location.geo_lat, site.location.geo_lng)
    : null;
  const blocked = dist !== null && site ? dist > site.location.geo_radius_meters : false;

  const submit = (): void => {
    if (!site || blocked) return;
    const all: DPR[] = (() => {
      try { return JSON.parse(localStorage.getItem(dprsKey(entity)) ?? '[]'); } catch { return []; }
    })();
    const now = new Date().toISOString();
    const dpr: DPR = {
      id: `DPR-${Date.now()}`,
      site_id: siteId,
      entity_id: site.entity_id,
      report_date: now.split('T')[0],
      prepared_by: 'demo-user',
      work_completed: workCompleted,
      manpower_count: Number(manpower) || 0,
      equipment_count: Number(equipment) || 0,
      material_consumed: [],
      weather: 'sunny',
      delays: '',
      geo_validated: dist !== null && dist <= site.location.geo_radius_meters,
      geo_lat: Number(photoLat) || 0,
      geo_lng: Number(photoLng) || 0,
      geo_distance_from_site_m: dist ?? 0,
      geo_accuracy_m: 10,
      photo_url: null,
      created_at: now,
    };
    all.push(dpr);
    localStorage.setItem(dprsKey(entity), JSON.stringify(all));
    setWorkCompleted(''); setManpower(''); setEquipment('');
    setRefresh((x) => x + 1);
  };

  const dprs: DPR[] = (() => {
    try { return JSON.parse(localStorage.getItem(dprsKey(entity)) ?? '[]'); } catch { return []; }
  })();
  const siteDprs = dprs.filter((d) => d.site_id === siteId);

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-amber-600" />
        <h1 className="text-2xl font-bold">DPR · Daily Progress Report</h1>
      </div>

      <Card className="p-4">
        <select className="w-full border rounded-lg px-3 py-2 bg-background"
          value={siteId} onChange={(e) => setSiteId(e.target.value)}>
          <option value="">Select site...</option>
          {sites.map((s) => <option key={s.id} value={s.id}>{s.site_code} · {s.site_name}</option>)}
        </select>
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="font-semibold">New DPR</h2>
        <Textarea placeholder="Work completed today..." value={workCompleted} onChange={(e) => setWorkCompleted(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="Manpower" type="number" value={manpower} onChange={(e) => setManpower(e.target.value)} />
          <Input placeholder="Equipment count" type="number" value={equipment} onChange={(e) => setEquipment(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="Photo geo lat" value={photoLat} onChange={(e) => setPhotoLat(e.target.value)} />
          <Input placeholder="Photo geo lng" value={photoLng} onChange={(e) => setPhotoLng(e.target.value)} />
        </div>
        {blocked && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Geo-fence blocked · photo {dist?.toFixed(0)}m from site (radius {site?.location.geo_radius_meters}m)</span>
          </div>
        )}
        <Button onClick={submit} disabled={!site || blocked}>Submit DPR</Button>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold mb-3">Recent DPRs</h2>
        {siteDprs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No DPRs yet.</p>
        ) : siteDprs.slice().reverse().map((d) => (
          <div key={d.id} className="border-b py-2 text-sm">
            <div className="flex justify-between">
              <span>{d.report_date}</span>
              <Badge variant="outline">{d.geo_validated ? 'Geo-verified' : 'Geo-failed'}</Badge>
            </div>
            <div className="text-muted-foreground">{d.work_completed}</div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground mt-2">Refresh tick: {refresh}</p>
      </Card>
    </div>
  );
}
