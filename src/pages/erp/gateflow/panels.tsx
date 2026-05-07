/**
 * @file        panels.tsx
 * @purpose     GateFlow panels · Welcome · Gate Inward/Outward Queue · Gate Pass Register
 * @who         Security guards · Gatekeepers · Dispatch supervisors
 * @when        Phase 1.A.1.a · GateFlow Patterns + Features sprint
 * @sprint      T-Phase-1.A.1.a-GateFlow-Patterns-Features (was T-Phase-1.2.6f-d-2-card4-4-pre-1)
 * @iso         Maintainability · Usability · Reliability
 * @decisions   D-301 (4-panel base) · D-302 (gate-pass type) · D-305 (storage key) ·
 *              D-NEW-C (12-item carry-forward) · D-NEW-D (FT-DISPATCH-004 UI · uses existing
 *              linked_voucher_* fields · NO new field per FR-11 SSOT) · D-NEW-F (Multi-Branch
 *              FR-51 · branch_id additive)
 * @reuses      useSprint27d1Mount · Sprint27d2Mount · Sprint27eMount ·
 *              UseLastVoucherButton · DraftRecoveryDialog · KeyboardShortcutOverlay ·
 *              useEntityCode · useCurrentUser · useFormKeyboardShortcuts · gateflow-engine
 * @[JWT]       GET /api/gateflow/passes · POST /api/gateflow/passes ·
 *              PATCH /api/gateflow/passes/:id · GET /api/gateflow/passes/:id/links
 */
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  LogIn, LogOut, Clock, ShieldCheck, Truck, Activity, AlertCircle, Plus, FileText, Link2,
} from 'lucide-react';
import {
  createInwardEntry, createOutwardEntry, transitionGatePass, attachLinkedVoucher,
  listGatePasses, listInwardQueue, listOutwardQueue, ALLOWED_TRANSITIONS,
} from '@/lib/gateflow-engine';
import type { GatePass, GatePassStatus, GatePassDirection, LinkedVoucherType } from '@/types/gate-pass';
import type { GateFlowModule } from './GateFlowSidebar.types';

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
  try {
    return localStorage.getItem('active_entity_code') ?? 'DEMO';
  } catch { return 'DEMO'; }
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
    return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata',
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

function statusVariant(s: GatePassStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (s === 'completed') return 'default';
  if (s === 'cancelled') return 'destructive';
  if (s === 'pending') return 'outline';
  return 'secondary';
}

// ============================================================
// 1) WELCOME · 5 KPI tiles + activity feed (Q8=A)
// ============================================================

interface WelcomeProps { onNavigate: (m: GateFlowModule) => void }

export function GateFlowWelcome({ onNavigate }: WelcomeProps): JSX.Element {
  const entityCode = getActiveEntityCode();
  const [list, setList] = useState<GatePass[]>([]);

  const refresh = useCallback((): void => {
    setList(listGatePasses(entityCode));
  }, [entityCode]);

  useEffect(() => { refresh(); }, [refresh]);

  const today = new Date().toISOString().slice(0, 10);
  const vehiclesInside = list.filter(gp => gp.status === 'in_progress' || gp.status === 'partial').length;
  const pendingVerify = list.filter(gp => gp.status === 'pending').length;
  const todayInward = list.filter(gp => gp.direction === 'inward' && gp.entry_time.slice(0, 10) === today).length;
  const todayOutward = list.filter(gp => gp.direction === 'outward' && gp.entry_time.slice(0, 10) === today).length;

  // Avg dwell · last 7 days · verified→completed
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const dwells = list
    .filter(gp => gp.status === 'completed' && gp.verified_time && gp.exit_time && gp.entry_time >= sevenDaysAgo)
    .map(gp => new Date(gp.exit_time!).getTime() - new Date(gp.verified_time!).getTime());
  const avgDwellMin = dwells.length > 0
    ? Math.round(dwells.reduce((a, b) => a + b, 0) / dwells.length / 60000)
    : 0;

  const kpis = [
    { label: 'Vehicles Inside', value: vehiclesInside, icon: Truck, accent: 'text-primary' },
    { label: 'Pending Verification', value: pendingVerify, icon: AlertCircle, accent: 'text-warning' },
    { label: "Today's Inward", value: todayInward, icon: LogIn, accent: 'text-primary' },
    { label: "Today's Outward", value: todayOutward, icon: LogOut, accent: 'text-primary' },
    { label: 'Avg Dwell (7d)', value: `${avgDwellMin}m`, icon: Clock, accent: 'text-muted-foreground' },
  ];

  const recent = list.slice(0, 10);

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">GateFlow</h1>
        <p className="text-sm text-muted-foreground">
          Operations gate management · Vehicle in/out workflow · Card #4 Foundation
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map(k => (
          <Card key={k.label} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <k.icon className={`h-4 w-4 ${k.accent}`} />
                {k.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-mono font-semibold">{k.value}</div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('gate-inward-queue')}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><LogIn className="h-4 w-4" /> Inward Queue</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Vehicles arriving with goods · verify · in-progress · complete
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('gate-outward-queue')}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><LogOut className="h-4 w-4" /> Outward Queue</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Vehicles dispatching goods · DLN linked · counterparty tracking
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('gate-pass-register')}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Pass Register</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Full register · search · filter · audit trail
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <div className="text-sm text-muted-foreground">No gate passes yet. Create one from the queues.</div>
            ) : (
              <ul className="divide-y divide-border">
                {recent.map(gp => (
                  <li key={gp.id} className="py-2 flex items-center justify-between gap-4 text-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      {gp.direction === 'inward'
                        ? <LogIn className="h-4 w-4 text-primary shrink-0" />
                        : <LogOut className="h-4 w-4 text-primary shrink-0" />}
                      <span className="font-mono text-xs">{gp.gate_pass_no}</span>
                      <span className="font-mono text-xs text-muted-foreground">{gp.vehicle_no}</span>
                      <span className="truncate text-muted-foreground">{gp.counterparty_name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant={statusVariant(gp.status)}>{gp.status}</Badge>
                      <span className="font-mono text-xs text-muted-foreground">{fmtTime(gp.entry_time)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

// ============================================================
// 2 + 3) QUEUE PANELS · shared
// ============================================================

interface QueueProps { direction: GatePassDirection; title: string; icon: typeof LogIn }

function QueuePanel({ direction, title, icon: Icon }: QueueProps): JSX.Element {
  const entityCode = getActiveEntityCode();
  const userId = getCurrentUserId();
  const [list, setList] = useState<GatePass[]>([]);
  const [filter, setFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const refresh = useCallback((): void => {
    setList(direction === 'inward' ? listInwardQueue(entityCode) : listOutwardQueue(entityCode));
  }, [entityCode, direction]);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = list.filter(gp => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return gp.vehicle_no.toLowerCase().includes(q)
      || gp.counterparty_name.toLowerCase().includes(q)
      || gp.gate_pass_no.toLowerCase().includes(q);
  });

  const onTransition = async (gp: GatePass, to: GatePassStatus): Promise<void> => {
    try {
      await transitionGatePass(gp.id, to, entityCode, userId);
      toast.success(`${gp.gate_pass_no} → ${to}`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Transition failed');
    }
  };

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Icon className="h-5 w-5" /> {title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} active {direction} {filtered.length === 1 ? 'pass' : 'passes'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search vehicle, counterparty, GP no…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-72"
          />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> New {direction}</Button>
            </DialogTrigger>
            <CreateDialogContent
              direction={direction}
              entityCode={entityCode}
              userId={userId}
              onCreated={() => { setDialogOpen(false); refresh(); }}
            />
          </Dialog>
        </div>
      </header>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No active {direction} passes. Create one to begin.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>GP No</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Counterparty</TableHead>
                  <TableHead>Linked</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(gp => (
                  <TableRow key={gp.id}>
                    <TableCell className="font-mono text-xs">{gp.gate_pass_no}</TableCell>
                    <TableCell className="font-mono text-xs">{gp.vehicle_no}</TableCell>
                    <TableCell className="text-sm">{gp.driver_name}</TableCell>
                    <TableCell className="text-sm">{gp.counterparty_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {gp.linked_voucher_no ?? <span className="italic">walk-in</span>}
                    </TableCell>
                    <TableCell><Badge variant={statusVariant(gp.status)}>{gp.status}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{fmtTime(gp.entry_time)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {ALLOWED_TRANSITIONS[gp.status].map(to => (
                          <Button
                            key={to}
                            size="sm"
                            variant={to === 'cancelled' ? 'outline' : 'secondary'}
                            onClick={() => onTransition(gp, to)}
                          >
                            {to === 'verified' && <ShieldCheck className="h-3 w-3 mr-1" />}
                            {to}
                          </Button>
                        ))}
                      </div>
                    </TableCell>
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

export function GateInwardQueuePanel(): JSX.Element {
  return <QueuePanel direction="inward" title="Inward Queue" icon={LogIn} />;
}

export function GateOutwardQueuePanel(): JSX.Element {
  return <QueuePanel direction="outward" title="Outward Queue" icon={LogOut} />;
}

// ============================================================
// CREATE DIALOG · shared by both queue panels
// ============================================================

interface CreateDialogProps {
  direction: GatePassDirection;
  entityCode: string;
  userId: string;
  onCreated: () => void;
}

function CreateDialogContent({ direction, entityCode, userId, onCreated }: CreateDialogProps): JSX.Element {
  const [vehicleNo, setVehicleNo] = useState('');
  const [vehicleType, setVehicleType] = useState('truck');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [purpose, setPurpose] = useState('');
  const [linkedType, setLinkedType] = useState<string>('none');
  const [linkedNo, setLinkedNo] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (): Promise<void> => {
    if (!vehicleNo || !driverName || !driverPhone || !counterparty || !purpose) {
      toast.error('Please fill vehicle, driver, counterparty and purpose');
      return;
    }
    setBusy(true);
    try {
      const linked: LinkedVoucherType = linkedType === 'none' ? null : (linkedType as LinkedVoucherType);
      const input = {
        vehicle_no: vehicleNo,
        vehicle_type: vehicleType,
        driver_name: driverName,
        driver_phone: driverPhone,
        counterparty_name: counterparty,
        purpose,
        linked_voucher_type: linked,
        linked_voucher_no: linked ? linkedNo : undefined,
      };
      const fn = direction === 'inward' ? createInwardEntry : createOutwardEntry;
      const gp = await fn(input, entityCode, userId);
      toast.success(`Gate pass ${gp.gate_pass_no} created`);
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>New {direction === 'inward' ? 'Inward' : 'Outward'} Gate Pass</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="gp-vehicle-no">Vehicle No</Label>
          <Input id="gp-vehicle-no" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} placeholder="KA-01-AB-1234" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gp-vehicle-type">Vehicle Type</Label>
          <Select value={vehicleType} onValueChange={setVehicleType}>
            <SelectTrigger id="gp-vehicle-type"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="truck">Truck</SelectItem>
              <SelectItem value="tempo">Tempo</SelectItem>
              <SelectItem value="van">Van</SelectItem>
              <SelectItem value="car">Car</SelectItem>
              <SelectItem value="two-wheeler">Two-wheeler</SelectItem>
              <SelectItem value="walk-in">Walk-in</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gp-driver-name">Driver Name</Label>
          <Input id="gp-driver-name" value={driverName} onChange={e => setDriverName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gp-driver-phone">Driver Phone</Label>
          <Input id="gp-driver-phone" value={driverPhone} onChange={e => setDriverPhone(e.target.value)} placeholder="+91-9876543210" />
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label htmlFor="gp-counterparty">{direction === 'inward' ? 'Vendor / Visitor' : 'Customer'}</Label>
          <Input id="gp-counterparty" value={counterparty} onChange={e => setCounterparty(e.target.value)} />
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label htmlFor="gp-purpose">Purpose</Label>
          <Input id="gp-purpose" value={purpose} onChange={e => setPurpose(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gp-linked-type">Linked Voucher</Label>
          <Select value={linkedType} onValueChange={setLinkedType}>
            <SelectTrigger id="gp-linked-type"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (walk-in)</SelectItem>
              <SelectItem value="po">PO</SelectItem>
              <SelectItem value="git_stage1">GIT Stage 1</SelectItem>
              <SelectItem value="dln">DLN</SelectItem>
              <SelectItem value="som">SOM</SelectItem>
              <SelectItem value="dom">DOM</SelectItem>
              <SelectItem value="gst_invoice">GST Invoice</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gp-linked-no">Linked Doc No</Label>
          <Input id="gp-linked-no" value={linkedNo} onChange={e => setLinkedNo(e.target.value)} disabled={linkedType === 'none'} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={submit} disabled={busy}>{busy ? 'Creating…' : 'Create'}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ============================================================
// 4) PASS REGISTER · all directions, all statuses + detail
// ============================================================

export function GatePassRegisterPanel(): JSX.Element {
  const entityCode = getActiveEntityCode();
  const [list, setList] = useState<GatePass[]>([]);
  const [search, setSearch] = useState('');
  const [dirFilter, setDirFilter] = useState<'all' | GatePassDirection>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | GatePassStatus>('all');
  const [detail, setDetail] = useState<GatePass | null>(null);

  const refresh = useCallback((): void => {
    setList(listGatePasses(entityCode));
  }, [entityCode]);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = list.filter(gp => {
    if (dirFilter !== 'all' && gp.direction !== dirFilter) return false;
    if (statusFilter !== 'all' && gp.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return gp.vehicle_no.toLowerCase().includes(q)
        || gp.counterparty_name.toLowerCase().includes(q)
        || gp.gate_pass_no.toLowerCase().includes(q)
        || gp.driver_name.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Gate Pass Register</h1>
        <p className="text-sm text-muted-foreground">{filtered.length} of {list.length} passes</p>
      </header>

      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="reg-search">Search</Label>
            <Input id="reg-search" placeholder="Vehicle, GP no, driver, counterparty…"
              value={search} onChange={e => setSearch(e.target.value)} className="w-72" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reg-dir">Direction</Label>
            <Select value={dirFilter} onValueChange={v => setDirFilter(v as 'all' | GatePassDirection)}>
              <SelectTrigger id="reg-dir" className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="inward">Inward</SelectItem>
                <SelectItem value="outward">Outward</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reg-status">Status</Label>
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v as 'all' | GatePassStatus)}>
              <SelectTrigger id="reg-status" className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No gate passes match your filter.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>GP No</TableHead>
                  <TableHead>Dir</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Counterparty</TableHead>
                  <TableHead>Linked</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead>Exit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(gp => (
                  <TableRow key={gp.id} className="cursor-pointer" onClick={() => setDetail(gp)}>
                    <TableCell className="font-mono text-xs">{gp.gate_pass_no}</TableCell>
                    <TableCell>
                      {gp.direction === 'inward'
                        ? <LogIn className="h-4 w-4 text-primary" />
                        : <LogOut className="h-4 w-4 text-primary" />}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{gp.vehicle_no}</TableCell>
                    <TableCell className="text-sm">{gp.counterparty_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {gp.linked_voucher_no ?? '—'}
                    </TableCell>
                    <TableCell><Badge variant={statusVariant(gp.status)}>{gp.status}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{fmtTime(gp.entry_time)}</TableCell>
                    <TableCell className="font-mono text-xs">{fmtTime(gp.exit_time)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={detail !== null} onOpenChange={o => { if (!o) setDetail(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{detail?.gate_pass_no}</DialogTitle>
          </DialogHeader>
          {detail && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Direction</dt>
              <dd className="font-medium">{detail.direction}</dd>
              <dt className="text-muted-foreground">Status</dt>
              <dd><Badge variant={statusVariant(detail.status)}>{detail.status}</Badge></dd>
              <dt className="text-muted-foreground">Vehicle</dt>
              <dd className="font-mono text-xs">{detail.vehicle_no} · {detail.vehicle_type}</dd>
              <dt className="text-muted-foreground">Driver</dt>
              <dd>{detail.driver_name} · {detail.driver_phone}</dd>
              <dt className="text-muted-foreground">Counterparty</dt>
              <dd>{detail.counterparty_name}</dd>
              <dt className="text-muted-foreground">Linked</dt>
              <dd className="text-xs">
                {detail.linked_voucher_type ? `${detail.linked_voucher_type} · ${detail.linked_voucher_no ?? ''}` : '—'}
              </dd>
              <dt className="text-muted-foreground">Purpose</dt>
              <dd className="col-span-2 text-sm">{detail.purpose}</dd>
              <dt className="text-muted-foreground">Entry</dt>
              <dd className="font-mono text-xs">{fmtTime(detail.entry_time)}</dd>
              <dt className="text-muted-foreground">Verified</dt>
              <dd className="font-mono text-xs">{fmtTime(detail.verified_time)}</dd>
              <dt className="text-muted-foreground">In Progress</dt>
              <dd className="font-mono text-xs">{fmtTime(detail.in_progress_time)}</dd>
              <dt className="text-muted-foreground">Exit</dt>
              <dd className="font-mono text-xs">{fmtTime(detail.exit_time)}</dd>
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
