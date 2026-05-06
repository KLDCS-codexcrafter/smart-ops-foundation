/**
 * @file     MobileMaterialIssuePage.tsx
 * @sprint   T-Phase-1.3-3a-pre-3 · Block H · D-563 · Q17=a
 */
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useProductionOrders } from '@/hooks/useProductionOrders';
import { useGodowns } from '@/hooks/useGodowns';
import { createMaterialIssue, issueMaterialIssue } from '@/lib/material-issue-engine';
import { getCurrentLocation } from '@/lib/geolocation-bridge';

interface SessionLite { user_id: string | null; display_name: string }
function readSession(): SessionLite | null {
  try {
    // [JWT] GET /api/mobile/auth/session
    const raw = sessionStorage.getItem('opx_mobile_session');
    return raw ? (JSON.parse(raw) as SessionLite) : null;
  } catch { return null; }
}

export default function MobileMaterialIssuePage(): JSX.Element {
  const navigate = useNavigate();
  const session = readSession();
  const { orders } = useProductionOrders();
  const { godowns } = useGodowns();
  const releasedPOs = orders.filter(o => o.status === 'released' || o.status === 'in_progress');

  const [poId, setPoId] = useState('');
  const [sourceGodownId, setSourceGodownId] = useState('');
  const [destGodownId, setDestGodownId] = useState('');
  const [geoStamp, setGeoStamp] = useState('');
  const [busy, setBusy] = useState(false);

  const captureLocation = useCallback(async () => {
    const loc = await getCurrentLocation();
    setGeoStamp(loc.ok && loc.latitude !== undefined ? `${loc.latitude.toFixed(4)},${loc.longitude?.toFixed(4)}` : 'unavailable');
  }, []);

  const handleSave = async (): Promise<void> => {
    if (!poId || !sourceGodownId || !destGodownId) { toast.error('Select PO + source + destination'); return; }
    setBusy(true);
    try {
      const po = releasedPOs.find(p => p.id === poId);
      if (!po) throw new Error('PO not found');
      const min = createMaterialIssue({
        entity_id: po.entity_id,
        production_order: po,
        issue_date: new Date().toISOString().slice(0, 10),
        department_id: po.department_id,
        department_name: po.department_name ?? '',
        issued_by_user_id: session?.user_id ?? 'mobile',
        issued_by_name: session?.display_name ?? 'Mobile User',
        lines: po.lines.map(l => ({
          production_order_line_id: l.id,
          item_id: l.item_id, item_code: l.item_code, item_name: l.item_name,
          required_qty: l.required_qty,
          issued_qty: Math.max(0, l.required_qty - (l.issued_qty || 0)),
          uom: l.uom,
          source_godown_id: sourceGodownId,
          source_godown_name: godowns.find(g => g.id === sourceGodownId)?.name ?? '',
          destination_godown_id: destGodownId,
          destination_godown_name: godowns.find(g => g.id === destGodownId)?.name ?? '',
          reservation_id: l.reservation_id,
          batch_no: null, serial_nos: [], heat_no: null,
          unit_rate: l.original_unit_rate || 0,
          remarks: `Mobile · geo:${geoStamp || 'no_loc'}`,
        })),
        notes: `Mobile entry · ${session?.display_name ?? 'unknown'} · ${geoStamp || 'no_geo'}`,
      });
      issueMaterialIssue(min, { id: session?.user_id ?? 'mobile', name: session?.display_name ?? 'Mobile' });
      toast.success(`MIN ${min.doc_no} issued`);
      navigate('/operix-go');
    } catch (e) {
      toast.error(`Issue failed: ${(e as Error).message}`);
    } finally { setBusy(false); }
  };

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate('/operix-go')}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>
      <h1 className="text-xl font-bold">Material Issue</h1>
      <Card className="p-4 space-y-3">
        <div>
          <Label>Production Order</Label>
          <Select value={poId} onValueChange={setPoId}>
            <SelectTrigger><SelectValue placeholder="Select PO..." /></SelectTrigger>
            <SelectContent>
              {releasedPOs.map(po => (
                <SelectItem key={po.id} value={po.id}>{po.doc_no} · {po.output_item_code}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Source Godown</Label>
          <Select value={sourceGodownId} onValueChange={setSourceGodownId}>
            <SelectTrigger><SelectValue placeholder="Select source..." /></SelectTrigger>
            <SelectContent>
              {godowns.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Destination (WIP)</Label>
          <Select value={destGodownId} onValueChange={setDestGodownId}>
            <SelectTrigger><SelectValue placeholder="Select destination..." /></SelectTrigger>
            <SelectContent>
              {godowns.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={captureLocation}>
            <MapPin className="h-3 w-3 mr-1" /> Capture
          </Button>
          {geoStamp && <span className="text-xs text-muted-foreground font-mono">{geoStamp}</span>}
        </div>
        <Button className="w-full" size="lg" onClick={handleSave} disabled={busy}>
          <Save className="h-4 w-4 mr-1" /> {busy ? 'Issuing…' : 'Issue & Save'}
        </Button>
      </Card>
    </div>
  );
}
