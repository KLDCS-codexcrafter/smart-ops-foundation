/**
 * EWayBillRegister.tsx — E-Way Bill ledger / register
 * Sprint 9. Lists every EWBRecord. Time Left column is colour-coded.
 * Extend dialog re-uses computeEWBValidity to compute new validity.
 *
 * [JWT] GET /api/finecore/ewb/list?entity={code}
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Truck, RefreshCw, Clock, X, Search, Plus, ListOrdered,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  type EWBRecord, ewbRecordsKey, EWB_CANCEL_REASONS, EWB_EXTEND_REASONS,
  EWB_CANCELLATION_WINDOW_HOURS,
} from '@/types/irn';
import type { EntityGSTConfig } from '@/types/entity-gst';
import { entityGstKey, DEFAULT_ENTITY_GST_CONFIG } from '@/types/entity-gst';
import {
  cancelEWB, extendEWB, computeEWBValidity, type EWBCredentials,
} from '@/lib/ewb-engine';

interface Props { entityCode: string }

function loadOne<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function loadList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
}

function formatTimeLeft(validUntilIso: string | null): { label: string; tone: 'success' | 'warning' | 'destructive' | 'muted' } {
  if (!validUntilIso) return { label: '—', tone: 'muted' };
  const ms = new Date(validUntilIso).getTime() - Date.now();
  if (ms <= 0) return { label: 'Expired', tone: 'destructive' };
  const h = Math.floor(ms / 3600000);
  const d = Math.floor(h / 24);
  if (d >= 2) return { label: `${d}d ${h % 24}h`, tone: 'success' };
  if (h > 6) return { label: `${h}h`, tone: 'warning' };
  return { label: `${h}h`, tone: 'destructive' };
}

export function EWayBillRegisterPanel({ entityCode }: Props) {
  const [records, setRecords] = useState<EWBRecord[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | EWBRecord['status']>('all');
  const [cancelTarget, setCancelTarget] = useState<EWBRecord | null>(null);
  const [cancelReason, setCancelReason] = useState('1');
  const [extendTarget, setExtendTarget] = useState<EWBRecord | null>(null);
  const [extendReason, setExtendReason] = useState('1');
  const [extendKm, setExtendKm] = useState<number>(50);
  const [extendVehicle, setExtendVehicle] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    setRecords(loadList<EWBRecord>(ewbRecordsKey(entityCode)));
  }, [entityCode]);

  useEffect(() => { refresh(); }, [refresh]);

  const persist = useCallback((next: EWBRecord[]) => {
    // [JWT] PUT /api/finecore/ewb/bulk
    localStorage.setItem(ewbRecordsKey(entityCode), JSON.stringify(next));
    setRecords(next);
  }, [entityCode]);

  const credentials = useMemo<EWBCredentials>(() => {
    const gst = loadOne<EntityGSTConfig>(
      entityGstKey(entityCode),
      { ...DEFAULT_ENTITY_GST_CONFIG, entity_id: entityCode },
    );
    return {
      username: gst.ewb_username,
      password: gst.ewb_password,
      test_mode: gst.ewb_test_mode,
    };
  }, [entityCode]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return r.voucher_no.toLowerCase().includes(q)
        || (r.ewb_no ?? '').toLowerCase().includes(q)
        || (r.vehicle_no ?? '').toLowerCase().includes(q);
    });
  }, [records, search, statusFilter]);

  const totals = useMemo(() => {
    const now = Date.now();
    return {
      total: records.length,
      active: records.filter(r => r.status === 'generated' && r.valid_until && new Date(r.valid_until).getTime() > now).length,
      expiringSoon: records.filter(r => {
        if (r.status !== 'generated' || !r.valid_until) return false;
        const ms = new Date(r.valid_until).getTime() - now;
        return ms > 0 && ms < 24 * 3600 * 1000;
      }).length,
      expired: records.filter(r => r.status === 'expired' || (r.valid_until && new Date(r.valid_until).getTime() < now && r.status === 'generated')).length,
      cancelled: records.filter(r => r.status === 'cancelled').length,
    };
  }, [records]);

  const isWithinCancelWindow = useCallback((rec: EWBRecord) => {
    if (!rec.ewb_date) return false;
    const ageMs = Date.now() - new Date(rec.ewb_date).getTime();
    return ageMs < EWB_CANCELLATION_WINDOW_HOURS * 3600 * 1000;
  }, []);

  const submitCancel = useCallback(async () => {
    if (!cancelTarget?.ewb_no) return;
    setBusy(true);
    try {
      const patch = await cancelEWB(cancelTarget.ewb_no, cancelReason, 'Cancelled from register', credentials);
      const next = records.map(r => r.id === cancelTarget.id ? { ...r, ...patch } as EWBRecord : r);
      persist(next);
      toast.success('E-Way Bill cancelled');
      setCancelTarget(null);
    } finally { setBusy(false); }
  }, [cancelTarget, cancelReason, credentials, records, persist]);

  const submitExtend = useCallback(async () => {
    if (!extendTarget?.ewb_no) return;
    if (extendKm <= 0) { toast.error('Additional distance must be positive'); return; }
    setBusy(true);
    try {
      const patch = await extendEWB(
        extendTarget.ewb_no, extendReason, extendKm,
        extendVehicle.trim() || null, credentials,
      );
      const next = records.map(r => r.id === extendTarget.id ? { ...r, ...patch } as EWBRecord : r);
      persist(next);
      const newValid = computeEWBValidity(extendKm, new Date().toISOString());
      toast.success(`E-Way Bill extended; new validity ${newValid.slice(0, 10)}`);
      setExtendTarget(null);
      setExtendVehicle('');
    } finally { setBusy(false); }
  }, [extendTarget, extendReason, extendKm, extendVehicle, credentials, records, persist]);

  const statusBadge = (s: EWBRecord['status']) => {
    switch (s) {
      case 'generated': return <Badge className="bg-success/15 text-success border-success/30">Generated</Badge>;
      case 'extended': return <Badge className="bg-info/15 text-info border-info/30">Extended</Badge>;
      case 'expired': return <Badge variant="destructive">Expired</Badge>;
      case 'cancelled': return <Badge variant="secondary">Cancelled</Badge>;
      case 'not_required': return <Badge variant="outline">N/A</Badge>;
      default: return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Truck className="h-5 w-5 text-teal-500" /> E-Way Bill Register
          </h2>
          <p className="text-xs text-muted-foreground">
            All E-Way Bills generated for this entity. Time Left is colour-coded; extend before expiry.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryTile label="Total" value={totals.total} />
        <SummaryTile label="Active" value={totals.active} tone="success" />
        <SummaryTile label="Expiring < 24h" value={totals.expiringSoon} tone="warning" />
        <SummaryTile label="Expired" value={totals.expired} tone="destructive" />
        <SummaryTile label="Cancelled" value={totals.cancelled} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ListOrdered className="h-4 w-4 text-teal-500" /> EWB Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Voucher / EWB no / vehicle…"
                className="h-8 pl-7 text-xs"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v: 'all' | EWBRecord['status']) => setStatusFilter(v)}>
              <SelectTrigger className="h-8 text-xs w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="generated">Generated</SelectItem>
                <SelectItem value="extended">Extended</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>Voucher</TableHead>
                  <TableHead>EWB No</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Time Left</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-xs text-muted-foreground">
                      No E-Way Bills found.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map(r => {
                  const tl = formatTimeLeft(r.valid_until);
                  const toneClass =
                    tl.tone === 'success' ? 'text-success'
                    : tl.tone === 'warning' ? 'text-warning'
                    : tl.tone === 'destructive' ? 'text-destructive'
                    : 'text-muted-foreground';
                  return (
                    <TableRow key={r.id} className="text-xs">
                      <TableCell className="font-mono">{r.voucher_no}</TableCell>
                      <TableCell className="font-mono">{r.ewb_no ?? '—'}</TableCell>
                      <TableCell className="font-mono">{r.vehicle_no ?? '—'}</TableCell>
                      <TableCell className="font-mono">{r.transport_distance_km} km</TableCell>
                      <TableCell className="font-mono text-right">
                        ₹{r.total_value.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 font-mono ${toneClass}`}>
                          <Clock className="h-3 w-3" /> {tl.label}
                        </span>
                      </TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {r.status === 'generated' && (
                            <Button
                              variant="outline" size="sm"
                              onClick={() => {
                                setExtendTarget(r);
                                setExtendKm(50);
                                setExtendVehicle(r.vehicle_no ?? '');
                                setExtendReason('1');
                              }}
                              className="h-7 text-[10px]"
                            >
                              <Plus className="h-3 w-3 mr-1" /> Extend
                            </Button>
                          )}
                          {r.status === 'generated' && isWithinCancelWindow(r) && (
                            <Button
                              variant="outline" size="sm"
                              onClick={() => { setCancelTarget(r); setCancelReason('1'); }}
                              className="h-7 text-[10px] text-destructive"
                            >
                              <X className="h-3 w-3 mr-1" /> Cancel
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Cancel dialog */}
      <Dialog open={!!cancelTarget} onOpenChange={o => !o && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel E-Way Bill</DialogTitle>
            <DialogDescription>
              Cancellation allowed within {EWB_CANCELLATION_WINDOW_HOURS} hours of generation.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label className="text-xs">Reason</Label>
            <Select value={cancelReason} onValueChange={setCancelReason}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EWB_CANCEL_REASONS.map(r => (
                  <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>Close</Button>
            <Button data-primary variant="destructive" onClick={submitCancel} disabled={busy}>
              Cancel EWB
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend dialog */}
      <Dialog open={!!extendTarget} onOpenChange={o => !o && setExtendTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend E-Way Bill Validity</DialogTitle>
            <DialogDescription>
              New validity is computed at 1 day per 200 km via computeEWBValidity.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Reason</Label>
              <Select value={extendReason} onValueChange={setExtendReason}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EWB_EXTEND_REASONS.map(r => (
                    <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Additional Distance (km)</Label>
              <Input type="number" className="h-8 text-sm font-mono" value={extendKm}
                onChange={e => setExtendKm(Number(e.target.value) || 0)} />
            </div>
            <div>
              <Label className="text-xs">New Vehicle Number (optional)</Label>
              <Input className="h-8 text-sm font-mono uppercase" value={extendVehicle}
                onChange={e => setExtendVehicle(e.target.value.toUpperCase())}
                placeholder="MH12AB1234" />
            </div>
            <div className="text-[10px] text-muted-foreground">
              Projected new validity: {computeEWBValidity(extendKm, new Date().toISOString()).slice(0, 10)}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendTarget(null)}>Close</Button>
            <Button data-primary onClick={submitExtend} disabled={busy}>
              Extend Validity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: number; tone?: 'success' | 'warning' | 'destructive' }) {
  const toneClass =
    tone === 'success' ? 'text-success'
    : tone === 'warning' ? 'text-warning'
    : tone === 'destructive' ? 'text-destructive'
    : 'text-foreground';
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`text-2xl font-bold font-mono ${toneClass}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
