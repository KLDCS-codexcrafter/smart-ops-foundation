/**
 * @file        vehicle-panels.tsx
 * @purpose     GateFlow vehicle panels · Vehicle Inward/Outward · Vehicle/Driver Master · Weighbridge Register
 * @who         Security guards · Gatekeepers · Drivers · Operators
 * @when        Phase 1.A.1.a · GateFlow Patterns + Features sprint
 * @sprint      T-Phase-1.A.1.a-GateFlow-Patterns-Features (was T-Phase-1.2.6f-d-2-card4-4-pre-2)
 * @iso         Maintainability · Usability · Reliability
 * @decisions   D-307 (master FKs) · D-310 (ANPR) · D-NEW-C (12-item carry-forward) ·
 *              D-NEW-E (Driver Safety OOB) · D-NEW-F (Multi-Branch FR-51 additive)
 * @reuses      useSprint27d1Mount · Sprint27d2Mount · Sprint27eMount · UseLastVoucherButton ·
 *              DraftRecoveryDialog · KeyboardShortcutOverlay · useEntityCode · useCurrentUser ·
 *              useFormKeyboardShortcuts · gateflow-engine · weighbridge-engine ·
 *              vehicle-master-engine · driver-master-engine
 * @[JWT]       GET /api/weighbridge/tickets · GET /api/vehicle-master · GET /api/driver-master
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Truck, Camera, UserCheck, IdCard, Weight, Plus, Scale,
} from 'lucide-react';

import {
  listInwardQueue, listOutwardQueue,
} from '@/lib/gateflow-engine';
import {
  createTicket, weighIn, weighOut, closeTicket, listTickets,
} from '@/lib/weighbridge-engine';
import {
  createVehicle, listVehicles,
} from '@/lib/vehicle-master-engine';
import {
  createDriver, listDrivers,
} from '@/lib/driver-master-engine';
import { capturePhoto } from '@/lib/camera-bridge';

import type { GatePass } from '@/types/gate-pass';
import type {
  WeighbridgeTicket, WeighbridgeTicketStatus,
} from '@/types/weighbridge-ticket';
import type { VehicleMaster, VehicleType, FuelType } from '@/types/vehicle-master';
import type { DriverMaster, LicenseClass } from '@/types/driver-master';

// Sprint T-Phase-1.A.1.a · 12-item carry-forward (FR-29) + Multi-Entity (FR-50) imports
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useFormKeyboardShortcuts } from '@/hooks/useFormKeyboardShortcuts';
import { useSprint27d1Mount } from '@/hooks/useSprint27d1Mount';
import { Sprint27d2Mount } from '@/components/uth/Sprint27d2Mount';
import { Sprint27eMount } from '@/components/uth/Sprint27eMount';
import { UseLastVoucherButton } from '@/components/uth/UseLastVoucherButton';
import { DraftRecoveryDialog } from '@/components/uth/DraftRecoveryDialog';
import { KeyboardShortcutOverlay } from '@/components/uth/KeyboardShortcutOverlay';

// ============================================================
// HELPERS
// ============================================================

function getActiveEntityCode(): string {
  try { return localStorage.getItem('active_entity_code') ?? 'DEMO'; }
  catch { return 'DEMO'; }
}
function getCurrentUserId(): string {
  try {
    const raw = localStorage.getItem('4ds_login_credential');
    if (!raw) return 'mock-user';
    const parsed = JSON.parse(raw);
    return parsed.value ?? 'mock-user';
  } catch { return 'mock-user'; }
}
function fmtTime(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}
function fmtDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
}

type ExpiryVariant = 'default' | 'secondary' | 'destructive' | 'outline';
function expiryVariant(iso?: string): ExpiryVariant {
  if (!iso) return 'outline';
  const exp = new Date(iso).getTime();
  const now = Date.now();
  const days = Math.floor((exp - now) / (1000 * 60 * 60 * 24));
  if (days < 30) return 'destructive';
  if (days < 60) return 'secondary';
  return 'default';
}

function wbStatusVariant(s: WeighbridgeTicketStatus): ExpiryVariant {
  if (s === 'closed') return 'default';
  if (s === 'weighed_out') return 'secondary';
  return 'outline';
}

// ============================================================
// SHARED · WEIGH DIALOG (used by Inward + Outward)
// ============================================================

interface WeighDialogProps {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  mode: 'in' | 'out';
  ticketId: string;
  onDone: () => void;
}

function WeighDialog({ open, onOpenChange, mode, ticketId, onDone }: WeighDialogProps): JSX.Element {
  const entity = getActiveEntityCode();
  const user = getCurrentUserId();
  const [gross, setGross] = useState('');
  const [tare, setTare] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setGross(''); setTare(''); setPhotoUrl(undefined); }
  }, [open]);

  const onCapture = async (): Promise<void> => {
    const r = await capturePhoto();
    if (r.ok && r.data_url) {
      setPhotoUrl(r.data_url);
      toast.success('Photo captured');
    } else {
      toast.error(r.reason ?? 'Capture cancelled');
    }
  };

  const onSubmit = async (): Promise<void> => {
    const g = Number(gross);
    if (!Number.isFinite(g) || g <= 0) { toast.error('Enter valid gross weight'); return; }
    setBusy(true);
    try {
      if (mode === 'in') {
        const t = Number(tare);
        if (!Number.isFinite(t) || t <= 0) { toast.error('Enter valid tare weight'); setBusy(false); return; }
        await weighIn({ ticket_id: ticketId, gross_in_kg: g, tare_in_kg: t, in_photo_url: photoUrl }, entity, user);
        toast.success('Weigh-in recorded');
      } else {
        const t = tare ? Number(tare) : undefined;
        await weighOut({ ticket_id: ticketId, gross_out_kg: g, tare_out_kg: t, out_photo_url: photoUrl }, entity, user);
        toast.success('Weigh-out recorded');
      }
      onOpenChange(false);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Weigh failed');
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'in' ? 'Weigh In (First Weigh)' : 'Weigh Out (Back Weigh)'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Gross weight (kg)</Label>
            <Input value={gross} onChange={(e) => setGross(e.target.value)} type="number" inputMode="decimal" />
          </div>
          <div>
            <Label>Tare weight (kg) {mode === 'out' ? '(optional)' : ''}</Label>
            <Input value={tare} onChange={(e) => setTare(e.target.value)} type="number" inputMode="decimal" />
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onCapture}>
              <Camera className="h-4 w-4 mr-2" /> Capture weighbridge photo
            </Button>
            {photoUrl ? <Badge variant="default">Photo attached</Badge> : null}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={onSubmit} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// 1) VEHICLE INWARD PANEL
// ============================================================

export function VehicleInwardPanel(): JSX.Element {
  return <VehicleQueuePanel direction="inward" />;
}

// ============================================================
// 2) VEHICLE OUTWARD PANEL
// ============================================================

export function VehicleOutwardPanel(): JSX.Element {
  return <VehicleQueuePanel direction="outward" />;
}

// Shared queue panel implementation
function VehicleQueuePanel({ direction }: { direction: 'inward' | 'outward' }): JSX.Element {
  const entity = getActiveEntityCode();
  const user = getCurrentUserId();
  const [list, setList] = useState<GatePass[]>([]);
  const [tickets, setTickets] = useState<WeighbridgeTicket[]>([]);
  const [weighDialog, setWeighDialog] = useState<{ open: boolean; mode: 'in' | 'out'; ticketId: string }>({
    open: false, mode: 'in', ticketId: '',
  });

  const refresh = useCallback((): void => {
    setList(direction === 'inward' ? listInwardQueue(entity) : listOutwardQueue(entity));
    setTickets(listTickets(entity));
  }, [entity, direction]);

  useEffect(() => { refresh(); }, [refresh]);

  const ticketsByGp = (gpId: string): WeighbridgeTicket[] =>
    tickets.filter((t) => t.gate_pass_id === gpId);

  const onCapturePlate = async (): Promise<void> => {
    const r = await capturePhoto();
    if (r.ok) { toast.success('ANPR plate captured (preview only · MVP stub)'); }
    else { toast.error(r.reason ?? 'Capture cancelled'); }
  };

  const onCreateTicket = async (gp: GatePass): Promise<void> => {
    try {
      const t = await createTicket({
        gate_pass_id: gp.id, gate_pass_no: gp.gate_pass_no,
        direction: gp.direction, vehicle_no: gp.vehicle_no,
        vehicle_id: gp.vehicle_id,
      }, entity, user);
      toast.success(`Weighbridge ticket ${t.ticket_no} created`);
      refresh();
      setWeighDialog({ open: true, mode: 'in', ticketId: t.id });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  const onCloseTicket = async (ticketId: string): Promise<void> => {
    try {
      await closeTicket({ ticket_id: ticketId }, entity, user);
      toast.success('Ticket closed');
      refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Close failed'); }
  };

  const title = direction === 'inward' ? 'Vehicle Inward Queue' : 'Vehicle Outward Queue';

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><Truck className="h-6 w-6" />{title}</h1>
          <p className="text-sm text-muted-foreground">Weighbridge-aware queue · two-weigh discipline</p>
        </div>
        <Button variant="outline" onClick={onCapturePlate}>
          <Camera className="h-4 w-4 mr-2" /> Capture Plate (ANPR)
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Active Vehicles</CardTitle></CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No vehicles in queue.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gate Pass</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Counterparty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Weighbridge</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((gp) => {
                  const gpTickets = ticketsByGp(gp.id);
                  const open = gpTickets.find((t) => t.status !== 'closed');
                  return (
                    <TableRow key={gp.id}>
                      <TableCell className="font-mono text-xs">{gp.gate_pass_no}</TableCell>
                      <TableCell className="font-mono">{gp.vehicle_no}</TableCell>
                      <TableCell>{gp.driver_name}</TableCell>
                      <TableCell>{gp.counterparty_name}</TableCell>
                      <TableCell><Badge variant="secondary">{gp.status}</Badge></TableCell>
                      <TableCell>
                        {open ? (
                          <Badge variant={wbStatusVariant(open.status)}>{open.ticket_no} · {open.status}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {!open ? (
                          <Button size="sm" variant="outline" onClick={() => onCreateTicket(gp)}>
                            <Scale className="h-4 w-4 mr-1" /> Start Weigh
                          </Button>
                        ) : open.status === 'pending_in' ? (
                          <Button size="sm" onClick={() => setWeighDialog({ open: true, mode: 'in', ticketId: open.id })}>
                            Weigh In
                          </Button>
                        ) : open.status === 'pending_out' ? (
                          <Button size="sm" onClick={() => setWeighDialog({ open: true, mode: 'out', ticketId: open.id })}>
                            Weigh Out
                          </Button>
                        ) : open.status === 'weighed_out' ? (
                          <Button size="sm" variant="default" onClick={() => onCloseTicket(open.id)}>
                            Close Ticket
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <WeighDialog
        open={weighDialog.open}
        onOpenChange={(b) => setWeighDialog((d) => ({ ...d, open: b }))}
        mode={weighDialog.mode}
        ticketId={weighDialog.ticketId}
        onDone={refresh}
      />
    </div>
  );
}

// ============================================================
// 3) VEHICLE MASTER PANEL
// ============================================================

export function VehicleMasterPanel(): JSX.Element {
  const entity = getActiveEntityCode();
  const user = getCurrentUserId();
  const [list, setList] = useState<VehicleMaster[]>([]);
  const [open, setOpen] = useState(false);

  // form state
  const [vNo, setVNo] = useState('');
  const [vType, setVType] = useState<VehicleType>('truck');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [capKg, setCapKg] = useState('');
  const [fuel, setFuel] = useState<FuelType>('diesel');
  const [rcNo, setRcNo] = useState('');
  const [rcExp, setRcExp] = useState('');
  const [insNo, setInsNo] = useState('');
  const [insExp, setInsExp] = useState('');
  const [permitNo, setPermitNo] = useState('');
  const [permitExp, setPermitExp] = useState('');

  const refresh = useCallback((): void => { setList(listVehicles(entity)); }, [entity]);
  useEffect(() => { refresh(); }, [refresh]);

  const reset = (): void => {
    setVNo(''); setVType('truck'); setMake(''); setModel(''); setCapKg('');
    setFuel('diesel'); setRcNo(''); setRcExp(''); setInsNo(''); setInsExp('');
    setPermitNo(''); setPermitExp('');
  };

  const onSave = (): void => {
    if (!vNo.trim() || !make.trim() || !model.trim() || !capKg) {
      toast.error('Fill required fields'); return;
    }
    try {
      createVehicle({
        vehicle_no: vNo, vehicle_type: vType, make, model,
        capacity_kg: Number(capKg) || 0, fuel_type: fuel,
        rc_no: rcNo || undefined, rc_expiry: rcExp || undefined,
        insurance_no: insNo || undefined, insurance_expiry: insExp || undefined,
        permit_no: permitNo || undefined, permit_expiry: permitExp || undefined,
      }, entity, user);
      toast.success('Vehicle created');
      setOpen(false); reset(); refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><IdCard className="h-6 w-6" /> Vehicle Master</h1>
          <p className="text-sm text-muted-foreground">IMVA compliance · RC + insurance + permit expiry tracking</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> New Vehicle</Button>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader><DialogTitle>New Vehicle</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Vehicle no *</Label><Input value={vNo} onChange={(e) => setVNo(e.target.value)} placeholder="KA-01-AB-1234" /></div>
              <div><Label>Type</Label>
                <Select value={vType} onValueChange={(v) => setVType(v as VehicleType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['truck','tempo','van','pickup','car','two_wheeler','tractor','other'] as VehicleType[]).map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Make *</Label><Input value={make} onChange={(e) => setMake(e.target.value)} /></div>
              <div><Label>Model *</Label><Input value={model} onChange={(e) => setModel(e.target.value)} /></div>
              <div><Label>Capacity (kg) *</Label><Input value={capKg} onChange={(e) => setCapKg(e.target.value)} type="number" /></div>
              <div><Label>Fuel</Label>
                <Select value={fuel} onValueChange={(v) => setFuel(v as FuelType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['diesel','petrol','cng','electric','hybrid'] as FuelType[]).map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>RC no</Label><Input value={rcNo} onChange={(e) => setRcNo(e.target.value)} /></div>
              <div><Label>RC expiry</Label><Input value={rcExp} onChange={(e) => setRcExp(e.target.value)} type="date" /></div>
              <div><Label>Insurance no</Label><Input value={insNo} onChange={(e) => setInsNo(e.target.value)} /></div>
              <div><Label>Insurance expiry</Label><Input value={insExp} onChange={(e) => setInsExp(e.target.value)} type="date" /></div>
              <div><Label>Permit no</Label><Input value={permitNo} onChange={(e) => setPermitNo(e.target.value)} /></div>
              <div><Label>Permit expiry</Label><Input value={permitExp} onChange={(e) => setPermitExp(e.target.value)} type="date" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={onSave}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No vehicles registered.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle No</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Make / Model</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>RC Expiry</TableHead>
                  <TableHead>Insurance Expiry</TableHead>
                  <TableHead>Permit Expiry</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono">{v.vehicle_no}</TableCell>
                    <TableCell>{v.vehicle_type}</TableCell>
                    <TableCell>{v.make} {v.model}</TableCell>
                    <TableCell className="font-mono">{v.capacity_kg} kg</TableCell>
                    <TableCell><Badge variant={expiryVariant(v.rc_expiry)}>{fmtDate(v.rc_expiry)}</Badge></TableCell>
                    <TableCell><Badge variant={expiryVariant(v.insurance_expiry)}>{fmtDate(v.insurance_expiry)}</Badge></TableCell>
                    <TableCell><Badge variant={expiryVariant(v.permit_expiry)}>{fmtDate(v.permit_expiry)}</Badge></TableCell>
                    <TableCell><Badge variant={v.status === 'active' ? 'default' : 'outline'}>{v.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// 4) DRIVER MASTER PANEL
// ============================================================

export function DriverMasterPanel(): JSX.Element {
  const entity = getActiveEntityCode();
  const user = getCurrentUserId();
  const [list, setList] = useState<DriverMaster[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [lic, setLic] = useState('');
  const [licExp, setLicExp] = useState('');
  const [licClass, setLicClass] = useState<LicenseClass>('HMV');
  const [aadhaar4, setAadhaar4] = useState('');

  const refresh = useCallback((): void => { setList(listDrivers(entity)); }, [entity]);
  useEffect(() => { refresh(); }, [refresh]);

  const reset = (): void => {
    setName(''); setPhone(''); setLic(''); setLicExp(''); setLicClass('HMV'); setAadhaar4('');
  };

  const onSave = (): void => {
    if (!name.trim() || !phone.trim() || !lic.trim()) { toast.error('Fill required fields'); return; }
    if (aadhaar4 && !/^\d{4}$/.test(aadhaar4)) { toast.error('Aadhaar last-4 must be 4 digits'); return; }
    try {
      createDriver({
        driver_name: name, driver_phone: phone, driver_license_no: lic,
        license_expiry: licExp || undefined, license_class: licClass,
        aadhaar_last_4: aadhaar4 || undefined,
      }, entity, user);
      toast.success('Driver created');
      setOpen(false); reset(); refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><UserCheck className="h-6 w-6" /> Driver Master</h1>
          <p className="text-sm text-muted-foreground">License expiry tracking · privacy-friendly KYC (Aadhaar last-4)</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> New Driver</Button>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>New Driver</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label>Phone *</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div><Label>License no *</Label><Input value={lic} onChange={(e) => setLic(e.target.value)} /></div>
              <div><Label>License expiry</Label><Input value={licExp} onChange={(e) => setLicExp(e.target.value)} type="date" /></div>
              <div><Label>License class</Label>
                <Select value={licClass} onValueChange={(v) => setLicClass(v as LicenseClass)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['LMV','HMV','HCV','TWO_WHEELER'] as LicenseClass[]).map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Aadhaar last-4</Label><Input value={aadhaar4} onChange={(e) => setAadhaar4(e.target.value)} maxLength={4} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={onSave}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No drivers registered.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>License No</TableHead>
                  <TableHead>License Class</TableHead>
                  <TableHead>License Expiry</TableHead>
                  <TableHead>Aadhaar (last-4)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.driver_name}</TableCell>
                    <TableCell className="font-mono">{d.driver_phone}</TableCell>
                    <TableCell className="font-mono">{d.driver_license_no}</TableCell>
                    <TableCell>{d.license_class ?? '—'}</TableCell>
                    <TableCell><Badge variant={expiryVariant(d.license_expiry)}>{fmtDate(d.license_expiry)}</Badge></TableCell>
                    <TableCell className="font-mono">{d.aadhaar_last_4 ? `XXXX-${d.aadhaar_last_4}` : '—'}</TableCell>
                    <TableCell><Badge variant={d.status === 'active' ? 'default' : 'outline'}>{d.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// 5) WEIGHBRIDGE TICKET REGISTER PANEL
// ============================================================

export function WeighbridgeTicketRegisterPanel(): JSX.Element {
  const entity = getActiveEntityCode();
  const [list, setList] = useState<WeighbridgeTicket[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | WeighbridgeTicketStatus>('all');
  const [detail, setDetail] = useState<WeighbridgeTicket | null>(null);

  const refresh = useCallback((): void => { setList(listTickets(entity)); }, [entity]);
  useEffect(() => { refresh(); }, [refresh]);

  const filtered = list.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return t.ticket_no.toLowerCase().includes(s)
      || t.vehicle_no.toLowerCase().includes(s)
      || t.gate_pass_no.toLowerCase().includes(s);
  });

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2"><Weight className="h-6 w-6" /> Weighbridge Tickets</h1>
        <p className="text-sm text-muted-foreground">Full register · search by ticket / vehicle / gate pass</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Input
              placeholder="Search ticket / vehicle / gate pass…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | WeighbridgeTicketStatus)}>
              <SelectTrigger className="max-w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending_in">Pending In</SelectItem>
                <SelectItem value="pending_out">Pending Out</SelectItem>
                <SelectItem value="weighed_out">Weighed Out</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No tickets.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket No</TableHead>
                  <TableHead>Gate Pass</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Net In (kg)</TableHead>
                  <TableHead>Net Disp. (kg)</TableHead>
                  <TableHead>Variance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id} className="cursor-pointer" onClick={() => setDetail(t)}>
                    <TableCell className="font-mono text-xs">{t.ticket_no}</TableCell>
                    <TableCell className="font-mono text-xs">{t.gate_pass_no}</TableCell>
                    <TableCell>{t.direction}</TableCell>
                    <TableCell className="font-mono">{t.vehicle_no}</TableCell>
                    <TableCell className="font-mono">{t.net_in_kg ?? '—'}</TableCell>
                    <TableCell className="font-mono">{t.net_dispatched_kg ?? '—'}</TableCell>
                    <TableCell className="font-mono">{t.variance_kg ?? '—'}</TableCell>
                    <TableCell><Badge variant={wbStatusVariant(t.status)}>{t.status}</Badge></TableCell>
                    <TableCell className="text-xs">{fmtTime(t.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(b) => !b && setDetail(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Ticket {detail?.ticket_no}</DialogTitle></DialogHeader>
          {detail ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Gate Pass: </span><span className="font-mono">{detail.gate_pass_no}</span></div>
              <div><span className="text-muted-foreground">Direction: </span>{detail.direction}</div>
              <div><span className="text-muted-foreground">Vehicle: </span><span className="font-mono">{detail.vehicle_no}</span></div>
              <div><span className="text-muted-foreground">Status: </span><Badge variant={wbStatusVariant(detail.status)}>{detail.status}</Badge></div>
              <div><span className="text-muted-foreground">Gross In: </span><span className="font-mono">{detail.gross_in_kg ?? '—'}</span></div>
              <div><span className="text-muted-foreground">Tare In: </span><span className="font-mono">{detail.tare_in_kg ?? '—'}</span></div>
              <div><span className="text-muted-foreground">Net In: </span><span className="font-mono">{detail.net_in_kg ?? '—'}</span></div>
              <div><span className="text-muted-foreground">Gross Out: </span><span className="font-mono">{detail.gross_out_kg ?? '—'}</span></div>
              <div><span className="text-muted-foreground">Net Dispatched: </span><span className="font-mono">{detail.net_dispatched_kg ?? '—'}</span></div>
              <div><span className="text-muted-foreground">Variance: </span><span className="font-mono">{detail.variance_kg ?? '—'} kg ({detail.variance_pct ?? '—'}%)</span></div>
              <div><span className="text-muted-foreground">Weighed In: </span>{fmtTime(detail.weighed_in_at)}</div>
              <div><span className="text-muted-foreground">Weighed Out: </span>{fmtTime(detail.weighed_out_at)}</div>
              <div className="col-span-2 flex gap-3">
                {detail.in_photo_url ? (
                  <div><Label className="text-xs">In photo</Label>
                    <img src={detail.in_photo_url} alt="weigh in" className="h-24 rounded border" />
                  </div>
                ) : null}
                {detail.out_photo_url ? (
                  <div><Label className="text-xs">Out photo</Label>
                    <img src={detail.out_photo_url} alt="weigh out" className="h-24 rounded border" />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

