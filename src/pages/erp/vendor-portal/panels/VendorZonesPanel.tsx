/**
 * @file        src/pages/erp/vendor-portal/panels/VendorZonesPanel.tsx
 * @purpose     Vendor Zones master · list + create surface · ccc-aligned
 * @sprint      T-VPG-VendorPortal-Gaps
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MapPin, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import {
  listVendorZones,
  createVendorZone,
} from '@/lib/vendor-risk-compliance-engine';
import type { VendorZone } from '@/types/vendor-zone';

export function VendorZonesPanel(): JSX.Element {
  const entityCode = useMemo(() => {
    try { return localStorage.getItem('active_entity_code') ?? DEFAULT_ENTITY_SHORTCODE; }
    catch { return DEFAULT_ENTITY_SHORTCODE; }
  }, []);
  const [rows, setRows] = useState<VendorZone[]>(() => listVendorZones(entityCode));
  const [form, setForm] = useState({ zone_code: '', zone_name: '', region: '' });

  const submit = (): void => {
    if (!form.zone_code || !form.zone_name) { toast.error('Zone code and name required'); return; }
    createVendorZone(entityCode, { ...form, active: true });
    setRows(listVendorZones(entityCode));
    setForm({ zone_code: '', zone_name: '', region: '' });
    toast.success('Zone created');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-slate-500/15 flex items-center justify-center">
          <MapPin className="h-6 w-6 text-slate-600" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Vendor Zones</h1>
          <p className="text-sm text-muted-foreground">Geographic / operational zones for vendor segmentation</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>New Zone</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input placeholder="Zone code (NORTH-01)" value={form.zone_code} onChange={e => setForm({ ...form, zone_code: e.target.value })} />
          <Input placeholder="Zone name" value={form.zone_name} onChange={e => setForm({ ...form, zone_name: e.target.value })} />
          <Input placeholder="Region (North/East/…)" value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} />
          <Button onClick={submit}><Plus className="h-4 w-4 mr-1" /> Add</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Zones ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No zones defined yet.</p>
          ) : (
            <div className="space-y-2">
              {rows.map(z => (
                <div key={z.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <div>
                    <div className="font-medium">{z.zone_name} <span className="font-mono text-xs text-muted-foreground">· {z.zone_code}</span></div>
                    <div className="text-xs text-muted-foreground">{z.region || '—'}</div>
                  </div>
                  <Badge variant={z.active ? 'default' : 'secondary'}>{z.active ? 'Active' : 'Inactive'}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
