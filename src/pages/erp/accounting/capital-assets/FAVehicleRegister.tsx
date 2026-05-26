/**
 * @file        src/pages/erp/accounting/capital-assets/FAVehicleRegister.tsx
 * @purpose     Vehicle-as-FA register + utilization view · FAR-CAP-15 · MOAT-44 vehicle component
 * @sprint      T-Phase-4.FAR-2 · Block 8 · uses vehicle-fa-bridge (43rd SIBLING)
 */
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Truck, Link2, Activity } from 'lucide-react';
import { toast } from 'sonner';
import type { AssetUnitRecord } from '@/types/fixed-asset';
import { faUnitsKey } from '@/types/fixed-asset';
import type { VehicleUtilizationMetric } from '@/types/vehicle-fa';
import {
  linkVehicleToFA,
  recordVehicleUtilization,
  getVehicleRegistryWithFA,
} from '@/lib/vehicle-fa-bridge';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

const loadFAUnits = (entityCode: string): AssetUnitRecord[] => {
  try {
    const r = localStorage.getItem(faUnitsKey(entityCode));
    return r ? (JSON.parse(r) as AssetUnitRecord[]) : [];
  } catch { return []; }
};

interface Props { entityCode?: string }

export function FAVehicleRegisterPanel({ entityCode = DEFAULT_ENTITY_SHORTCODE }: Props): JSX.Element {
  const [refreshKey, setRefreshKey] = useState(0);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [utilDialogOpen, setUtilDialogOpen] = useState(false);
  const [activeVehicleId, setActiveVehicleId] = useState('');
  const [newVehicleId, setNewVehicleId] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [metric, setMetric] = useState<VehicleUtilizationMetric>('mileage');
  const [utilValue, setUtilValue] = useState(0);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  const rows = useMemo(
    () => getVehicleRegistryWithFA(entityCode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, refreshKey],
  );

  const vehicleFAUnits = useMemo(
    () => loadFAUnits(entityCode).filter(
      u => u.entity_id === entityCode && u.it_act_block === 'Vehicles' && u.status === 'active',
    ),
    [entityCode, refreshKey],
  );

  const openLinkDialog = (vehicleId: string): void => {
    setActiveVehicleId(vehicleId);
    setNewVehicleId(vehicleId);
    setSelectedAssetId('');
    setMetric('mileage');
    setLinkDialogOpen(true);
  };

  const openNewLink = (): void => {
    setActiveVehicleId('');
    setNewVehicleId('');
    setSelectedAssetId('');
    setMetric('mileage');
    setLinkDialogOpen(true);
  };

  const openUtilDialog = (vehicleId: string): void => {
    setActiveVehicleId(vehicleId);
    setUtilValue(0);
    setPeriodStart('');
    setPeriodEnd('');
    setUtilDialogOpen(true);
  };

  const confirmLink = (): void => {
    if (!newVehicleId || !selectedAssetId) {
      toast.error('Vehicle ID and Asset are required');
      return;
    }
    linkVehicleToFA(entityCode, newVehicleId, selectedAssetId, { id: 'admin', name: 'Admin' }, metric);
    toast.success(`Vehicle ${newVehicleId} linked`);
    setLinkDialogOpen(false);
    setRefreshKey(k => k + 1);
  };

  const confirmUtilization = (): void => {
    const row = rows.find(r => r.vehicleId === activeVehicleId);
    if (!row?.assetUnitRecord) {
      toast.error('Vehicle must be linked to a Fixed Asset first');
      return;
    }
    if (!periodStart || !periodEnd || utilValue <= 0) {
      toast.error('Period and utilization value required');
      return;
    }
    recordVehicleUtilization(entityCode, {
      vehicle_id: activeVehicleId,
      asset_unit_record_id: row.assetUnitRecord.id,
      period_start: periodStart,
      period_end: periodEnd,
      utilization_value: utilValue,
      gate_pass_event_count: 0,
    });
    toast.success('Utilization recorded');
    setUtilDialogOpen(false);
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Truck className="h-6 w-6 text-teal-500" />
          <div>
            <h2 className="text-xl font-bold">Vehicle Register (FA-Linked)</h2>
            <p className="text-xs text-muted-foreground">
              Vehicle ↔ Fixed Asset bridge · {rows.length} vehicle(s) tracked
            </p>
          </div>
        </div>
        <Button size="sm" onClick={openNewLink}>
          <Link2 className="h-4 w-4 mr-1" /> Link New Vehicle
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-xs">Vehicle ID</TableHead>
              <TableHead className="text-xs">Linked Asset</TableHead>
              <TableHead className="text-xs">Item</TableHead>
              <TableHead className="text-xs">Last Utilization</TableHead>
              <TableHead className="text-xs">Last Recorded</TableHead>
              <TableHead className="text-xs">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No vehicles linked yet. Use "Link New Vehicle" to begin.
                </TableCell></TableRow>
              ) : rows.map(r => (
                <TableRow key={r.vehicleId}>
                  <TableCell className="font-mono text-xs">{r.vehicleId}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {r.assetUnitRecord ? r.assetUnitRecord.asset_id : '—'}
                  </TableCell>
                  <TableCell className="text-xs">{r.assetUnitRecord?.item_name ?? '—'}</TableCell>
                  <TableCell className="text-xs font-mono">{r.lastUtilization || '—'}</TableCell>
                  <TableCell className="text-xs font-mono">{r.lastRecordedAt?.slice(0, 10) ?? '—'}</TableCell>
                  <TableCell className="space-x-1">
                    {!r.assetUnitRecord && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openLinkDialog(r.vehicleId)}>
                        Link to FA
                      </Button>
                    )}
                    {r.assetUnitRecord && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openUtilDialog(r.vehicleId)}>
                        <Activity className="h-3 w-3 mr-1" /> Record Utilization
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {vehicleFAUnits.length > 0 && rows.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                  <Badge variant="outline" className="text-[10px]">
                    {vehicleFAUnits.length} vehicle FA unit(s) available to link
                  </Badge>
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Link Vehicle to Fixed Asset</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Vehicle ID</Label>
              <Input value={newVehicleId} onChange={e => setNewVehicleId(e.target.value)} placeholder="VEH-001" disabled={!!activeVehicleId} />
            </div>
            <div>
              <Label className="text-xs">Fixed Asset (Vehicles block)</Label>
              <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                <SelectTrigger><SelectValue placeholder="Pick asset..." /></SelectTrigger>
                <SelectContent>
                  {vehicleFAUnits.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.asset_id} · {u.item_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Utilization Metric</Label>
              <Select value={metric} onValueChange={v => setMetric(v as VehicleUtilizationMetric)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mileage">Mileage (km)</SelectItem>
                  <SelectItem value="engine_hours">Engine Hours</SelectItem>
                  <SelectItem value="days_in_service">Days in Service</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmLink}>Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={utilDialogOpen} onOpenChange={setUtilDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Utilization · {activeVehicleId}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Period Start</Label>
                <Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Period End</Label>
                <Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Utilization Value</Label>
              <Input type="number" value={utilValue || ''} onChange={e => setUtilValue(Number(e.target.value) || 0)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUtilDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmUtilization}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function FAVehicleRegister(): JSX.Element {
  return <FAVehicleRegisterPanel />;
}
