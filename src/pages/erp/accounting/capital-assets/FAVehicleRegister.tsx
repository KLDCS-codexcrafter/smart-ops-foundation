/**
 * FAVehicleRegister.tsx — Sprint 66 FAR-2 · Block 8 · FAR-CAP-15 · MOAT-44 vehicle
 * Vehicle-as-FA register with utilization view via vehicle-fa-bridge (43rd SIBLING).
 * [JWT] Replace with GET /api/fa/vehicle-register
 */
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Truck, Link2, Gauge } from 'lucide-react';
import type { AssetUnitRecord } from '@/types/fixed-asset';
import { faUnitsKey } from '@/types/fixed-asset';
import {
  linkVehicleToFA,
  recordVehicleUtilization,
  getVehicleRegistryWithFA,
  type VehicleRegistryRow,
} from '@/lib/vehicle-fa-bridge';
import type { VehicleUtilizationMetric } from '@/types/vehicle-fa';

const ls = <T,>(k: string): T[] => {
  try {
    const r = localStorage.getItem(k);
    return r ? JSON.parse(r) : [];
  } catch { return []; }
};

interface Props { entityCode: string; }

export function FAVehicleRegisterPanel({ entityCode }: Props) {
  const [rows, setRows] = useState<VehicleRegistryRow[]>([]);
  const [units, setUnits] = useState<AssetUnitRecord[]>([]);
  const [linkOpen, setLinkOpen] = useState<string | null>(null);
  const [utilOpen, setUtilOpen] = useState<string | null>(null);
  const [selAsset, setSelAsset] = useState('');
  const [metric, setMetric] = useState<VehicleUtilizationMetric>('mileage');
  const [utilValue, setUtilValue] = useState('');

  const refresh = (): void => setRows(getVehicleRegistryWithFA(entityCode));

  useEffect(() => {
    refresh();
    setUnits(ls<AssetUnitRecord>(faUnitsKey(entityCode))
      .filter(u => u.entity_id === entityCode && u.it_act_block === 'Vehicles'));
  }, [entityCode]);

  const vehicleAssets = useMemo(() => units, [units]);

  const handleLink = (): void => {
    if (!linkOpen || !selAsset) return;
    linkVehicleToFA(entityCode, linkOpen, selAsset, { id: 'usr-mock', name: 'Current User' }, metric);
    toast.success(`Vehicle ${linkOpen} linked to FA`);
    setLinkOpen(null); setSelAsset('');
    refresh();
  };

  const handleUtil = (): void => {
    if (!utilOpen) return;
    const v = parseFloat(utilValue);
    if (!Number.isFinite(v) || v <= 0) { toast.error('Enter valid utilization'); return; }
    const row = rows.find(r => r.vehicleId === utilOpen);
    if (!row?.assetUnitRecord) { toast.error('Link vehicle to FA first'); return; }
    const today = new Date().toISOString().slice(0, 10);
    recordVehicleUtilization(entityCode, {
      vehicle_id: utilOpen,
      asset_unit_record_id: row.assetUnitRecord.id,
      period_start: today,
      period_end: today,
      utilization_value: v,
      gate_pass_event_count: 0,
    });
    toast.success('Utilization recorded');
    setUtilOpen(null); setUtilValue('');
    refresh();
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Truck className="h-5 w-5" /> Vehicle Register (FA-linked)
        </h2>
        <p className="text-sm text-muted-foreground">
          Vehicle-as-FA register with utilization + gate-pass cross-ref · MOAT-44.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vehicle ID</TableHead>
            <TableHead>Linked Asset</TableHead>
            <TableHead>Last Utilization</TableHead>
            <TableHead>Last Recorded At</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No vehicles registered
              </TableCell>
            </TableRow>
          ) : rows.map(r => (
            <TableRow key={r.vehicleId}>
              <TableCell className="font-mono">{r.vehicleId}</TableCell>
              <TableCell>
                {r.assetUnitRecord ? (
                  <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                    {r.assetUnitRecord.asset_id}
                  </Badge>
                ) : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="font-mono">{r.lastUtilization}</TableCell>
              <TableCell>{r.lastRecordedAt ? new Date(r.lastRecordedAt).toLocaleString('en-IN') : '—'}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {!r.assetUnitRecord && (
                    <Button size="sm" variant="outline" onClick={() => setLinkOpen(r.vehicleId)}>
                      <Link2 className="h-3 w-3 mr-1" /> Link to FA
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setUtilOpen(r.vehicleId)}>
                    <Gauge className="h-3 w-3 mr-1" /> Record Utilization
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Link dialog */}
      <Dialog open={linkOpen !== null} onOpenChange={o => { if (!o) setLinkOpen(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Link Vehicle {linkOpen} to Fixed Asset</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={selAsset} onValueChange={setSelAsset}>
              <SelectTrigger><SelectValue placeholder="Select Vehicle FA unit" /></SelectTrigger>
              <SelectContent>
                {vehicleAssets.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.asset_id} · {u.item_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={metric} onValueChange={v => setMetric(v as VehicleUtilizationMetric)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mileage">Mileage (km)</SelectItem>
                <SelectItem value="engine_hours">Engine Hours</SelectItem>
                <SelectItem value="days_in_service">Days in Service</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter><Button onClick={handleLink}>Link</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Utilization dialog */}
      <Dialog open={utilOpen !== null} onOpenChange={o => { if (!o) setUtilOpen(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Utilization · {utilOpen}</DialogTitle></DialogHeader>
          <Input type="number" placeholder="Value" value={utilValue} onChange={e => setUtilValue(e.target.value)} />
          <DialogFooter><Button onClick={handleUtil}>Record</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FAVehicleRegisterPanel;
