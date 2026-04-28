/**
 * VisitTracking.tsx — Salesman check-in / check-out screen
 * Sprint 7. Captures geo-location, distance from customer, outcome.
 * Append-only — no edits to past visits.
 * [JWT] GET /api/salesx/visit-logs?entityCode={entityCode}
 * [JWT] POST /api/salesx/visit-logs
 */
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  MapPin, LogIn, LogOut, CheckCircle2, AlertTriangle, Search, Navigation,
} from 'lucide-react';
import { SignaturePad, Check } from '@/components/ui/signature-pad';
import type { SignaturePadHandle } from '@/components/ui/signature-pad';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import {
  type VisitLog, type VisitOutcome, type VisitPurpose, type GeoPoint,
  visitLogsKey, VISIT_OUTCOME_LABELS, VISIT_PURPOSE_LABELS,
  DEFAULT_CHECK_IN_RADIUS_METERS,
} from '@/types/visit-log';
import { type SAMPerson, samPersonsKey } from '@/types/sam-person';
import { type BeatRoute, beatRoutesKey } from '@/types/beat-route';
import {
  computeDistanceMeters, isWithinRadius, todayBeatFor,
} from '@/lib/field-force-engine';

interface Props { entityCode: string }

interface CustomerLite {
  id: string;
  partyCode: string;
  partyName: string;
  latitude?: number | null;
  longitude?: number | null;
}

const NOW = () => new Date().toISOString();
const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const formatINR = (n: number) => `₹${inrFmt.format(n)}`;

function loadVisits(entityCode: string): VisitLog[] {
  try {
    // [JWT] GET /api/salesx/visit-logs
    const raw = localStorage.getItem(visitLogsKey(entityCode));
    return raw ? (JSON.parse(raw) as VisitLog[]) : [];
  } catch { return []; }
}
function saveVisits(entityCode: string, list: VisitLog[]): void {
  // [JWT] POST /api/salesx/visit-logs (append-only)
  localStorage.setItem(visitLogsKey(entityCode), JSON.stringify(list));
}
function loadSalesmen(entityCode: string): SAMPerson[] {
  try {
    const raw = localStorage.getItem(samPersonsKey(entityCode));
    const all = raw ? (JSON.parse(raw) as SAMPerson[]) : [];
    return all.filter(p => p.person_type === 'salesman' && p.is_active);
  } catch { return []; }
}
function loadBeats(entityCode: string): BeatRoute[] {
  try {
    const raw = localStorage.getItem(beatRoutesKey(entityCode));
    return raw ? (JSON.parse(raw) as BeatRoute[]) : [];
  } catch { return []; }
}
function loadCustomers(): CustomerLite[] {
  try {
    const raw = localStorage.getItem('erp_group_customer_master');
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map(c => ({
      id: c.id ?? c.partyCode,
      partyCode: c.partyCode,
      partyName: c.partyName,
      latitude: c.latitude ?? null,
      longitude: c.longitude ?? null,
    })) : [];
  } catch { return []; }
}

function getBrowserGeo(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not available in this browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy_meters: pos.coords.accuracy,
      }),
      err => reject(err),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  });
}

export function VisitTrackingPanel({ entityCode }: Props) {
  const [visits, setVisits] = useState<VisitLog[]>(() => loadVisits(entityCode));
  const [salesmen, setSalesmen] = useState<SAMPerson[]>(() => loadSalesmen(entityCode));
  const [beats, setBeats] = useState<BeatRoute[]>(() => loadBeats(entityCode));
  const [customers, setCustomers] = useState<CustomerLite[]>(() => loadCustomers());

  const [search, setSearch] = useState('');
  const [activeSalesmanId, setActiveSalesmanId] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [purpose, setPurpose] = useState<VisitPurpose>('regular_visit');
  const [outcome, setOutcome] = useState<VisitOutcome>('order_captured');
  const [orderValue, setOrderValue] = useState('0');
  const [notes, setNotes] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [activeVisitId, setActiveVisitId] = useState<string | null>(null);

  useEffect(() => {
    setVisits(loadVisits(entityCode));
    setSalesmen(loadSalesmen(entityCode));
    setBeats(loadBeats(entityCode));
    setCustomers(loadCustomers());
  }, [entityCode]);

  const todayBeats = useMemo(() => {
    if (!activeSalesmanId) return [];
    return todayBeatFor(activeSalesmanId, new Date(), beats);
  }, [activeSalesmanId, beats]);

  const beatCustomerIds = useMemo(() => {
    const ids = new Set<string>();
    todayBeats.forEach(b => b.stops.forEach(s => ids.add(s.customer_id)));
    return ids;
  }, [todayBeats]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter(c =>
      !q || c.partyName.toLowerCase().includes(q) || c.partyCode.toLowerCase().includes(q),
    );
  }, [customers, search]);

  const activeVisit = useMemo(
    () => visits.find(v => v.id === activeVisitId) ?? null,
    [visits, activeVisitId],
  );

  const todaysVisits = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return visits
      .filter(v => v.check_in_time.startsWith(today))
      .filter(v => !activeSalesmanId || v.salesman_id === activeSalesmanId)
      .sort((a, b) => b.check_in_time.localeCompare(a.check_in_time));
  }, [visits, activeSalesmanId]);

  const handleCheckIn = useCallback(async () => {
    if (!activeSalesmanId) { toast.error('Select a salesman'); return; }
    if (!selectedCustomerId) { toast.error('Select a customer'); return; }
    const customer = customers.find(c => c.id === selectedCustomerId);
    const salesman = salesmen.find(s => s.id === activeSalesmanId);
    if (!customer || !salesman) { toast.error('Invalid selection'); return; }

    setCheckingIn(true);
    let geo: GeoPoint;
    try {
      geo = await getBrowserGeo();
    } catch (err) {
      toast.error(`Geo capture failed: ${(err as Error).message}`);
      // Fallback: zero geo, still let user check-in (not best practice but unblocks demo)
      geo = { latitude: 0, longitude: 0, accuracy_meters: null };
    }
    setCheckingIn(false);

    const customerGeo: GeoPoint | null =
      customer.latitude != null && customer.longitude != null
        ? { latitude: customer.latitude, longitude: customer.longitude, accuracy_meters: null }
        : null;

    const distance = customerGeo ? computeDistanceMeters(geo, customerGeo) : null;
    const within = customerGeo ? isWithinRadius(geo, customerGeo, DEFAULT_CHECK_IN_RADIUS_METERS) : true;

    if (customerGeo && !within) {
      toast.warning(`Outside ${DEFAULT_CHECK_IN_RADIUS_METERS}m radius — flagged`);
    }

    const matchingBeat = todayBeats.find(b => b.stops.some(s => s.customer_id === customer.id));

    const newVisit: VisitLog = {
      id: `vl-${Date.now()}`,
      entity_id: entityCode,
      salesman_id: salesman.id,
      salesman_name: salesman.display_name,
      customer_id: customer.id,
      customer_name: customer.partyName,
      beat_id: matchingBeat?.id ?? null,
      check_in_time: NOW(),
      check_in_geo: geo,
      check_out_time: null,
      check_out_geo: null,
      customer_geo: customerGeo,
      distance_from_customer_meters: distance,
      within_radius: within,
      purpose,
      outcome: 'other',
      notes: '',
      order_captured_value: 0,
      order_voucher_id: null,
      next_visit_date: null,
      photo_urls: [],
      created_at: NOW(),
    };

    const next = [...visits, newVisit];
    saveVisits(entityCode, next);
    setVisits(next);
    setActiveVisitId(newVisit.id);
    toast.success(`Checked-in at ${customer.partyName}`);
  }, [activeSalesmanId, selectedCustomerId, customers, salesmen, purpose, todayBeats, visits, entityCode]);

  const handleCheckOut = useCallback(async () => {
    if (!activeVisit) return;
    setCheckingIn(true);
    let geo: GeoPoint;
    try {
      geo = await getBrowserGeo();
    } catch {
      geo = { latitude: 0, longitude: 0, accuracy_meters: null };
    }
    setCheckingIn(false);

    const updated: VisitLog = {
      ...activeVisit,
      check_out_time: NOW(),
      check_out_geo: geo,
      outcome,
      notes,
      order_captured_value: outcome === 'order_captured' ? Number(orderValue) || 0 : 0,
    };
    const next = visits.map(v => v.id === activeVisit.id ? updated : v);
    saveVisits(entityCode, next);
    setVisits(next);
    setActiveVisitId(null);
    setNotes('');
    setOrderValue('0');
    setOutcome('order_captured');
    toast.success('Checked-out');
  }, [activeVisit, outcome, notes, orderValue, visits, entityCode]);

  useCtrlS(() => {
    if (activeVisit && !activeVisit.check_out_time) {
      handleCheckOut();
    }
  });

  return (
    <div className="space-y-4" data-keyboard-form>
      <Card className="border-orange-500/20">
        <CardHeader className="pb-3 sticky top-0 z-10 bg-background md:static">
          <CardTitle className="text-base flex items-center gap-2">
            <Navigation className="h-4 w-4 text-orange-500" />
            Visit Tracking
            <span className="ml-auto text-[11px] font-mono text-muted-foreground">
              {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Salesman</Label>
              <Select value={activeSalesmanId} onValueChange={setActiveSalesmanId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select salesman" /></SelectTrigger>
                <SelectContent>
                  {salesmen.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.display_name} ({s.person_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Today's Beat</Label>
              <div className="h-9 flex items-center gap-2 px-3 rounded-md border bg-muted/30 text-xs">
                {todayBeats.length === 0
                  ? <span className="text-muted-foreground">No beat scheduled today</span>
                  : todayBeats.map(b => (
                      <Badge key={b.id} variant="outline" className="border-orange-500/30">
                        {b.beat_name} ({b.stops.length} stops)
                      </Badge>
                    ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">Active Status</Label>
              <div className="h-9 flex items-center px-3 rounded-md border bg-muted/30 text-xs">
                {activeVisit
                  ? <span className="flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" /> Checked-in at {activeVisit.customer_name}</span>
                  : <span className="text-muted-foreground">Not checked-in</span>}
              </div>
            </div>
          </div>

          {!activeVisit && (
            <div className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="h-8 text-xs"
                  placeholder="Search customer to visit..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={onEnterNext}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Customer</Label>
                  <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select customer" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {filteredCustomers.slice(0, 100).map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.partyName}
                          {beatCustomerIds.has(c.id) && (
                            <span className="ml-2 text-orange-500">★</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Purpose</Label>
                  <Select value={purpose} onValueChange={v => setPurpose(v as VisitPurpose)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(VISIT_PURPOSE_LABELS).map(([k, label]) => (
                        <SelectItem key={k} value={k}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    data-primary
                    onClick={handleCheckIn}
                    disabled={checkingIn || !activeSalesmanId || !selectedCustomerId}
                    className="w-full h-12 md:h-10 bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    <LogIn className="h-3.5 w-3.5 mr-1" />
                    {checkingIn ? 'Capturing GPS...' : 'Check-In'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeVisit && (
            <div className="border rounded-lg p-3 space-y-3 bg-orange-500/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{activeVisit.customer_name}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Checked in at {new Date(activeVisit.check_in_time).toLocaleTimeString('en-IN')}
                  </p>
                </div>
                {activeVisit.distance_from_customer_meters != null && (
                  <Badge
                    variant="outline"
                    className={activeVisit.within_radius
                      ? 'border-success/30 text-success'
                      : 'border-warning/30 text-warning'}
                  >
                    <MapPin className="h-3 w-3 mr-1" />
                    {Math.round(activeVisit.distance_from_customer_meters)}m
                    {!activeVisit.within_radius && <AlertTriangle className="h-3 w-3 ml-1" />}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Outcome</Label>
                  <Select value={outcome} onValueChange={v => setOutcome(v as VisitOutcome)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(VISIT_OUTCOME_LABELS).map(([k, label]) => (
                        <SelectItem key={k} value={k}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {outcome === 'order_captured' && (
                  <div>
                    <Label className="text-xs">Order Value (₹)</Label>
                    <Input
                      type="number"
                      className="h-9 font-mono"
                      value={orderValue}
                      onChange={e => setOrderValue(e.target.value)}
                      onKeyDown={onEnterNext}
                    />
                  </div>
                )}

                <div className="md:col-span-1">
                  <Label className="text-xs">Notes</Label>
                  <Input
                    className="h-9"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    onKeyDown={onEnterNext}
                    placeholder="Brief outcome notes"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  data-primary
                  onClick={handleCheckOut}
                  disabled={checkingIn}
                  variant="outline"
                  className="w-full md:w-auto h-12 md:h-10 border-orange-500 text-orange-700"
                >
                  <LogOut className="h-3.5 w-3.5 mr-1" />
                  {checkingIn ? 'Capturing GPS...' : 'Check-Out & Save'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Today's Visits ({todaysVisits.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {todaysVisits.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">No visits today.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Time</TableHead>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs">Purpose</TableHead>
                  <TableHead className="text-xs">Outcome</TableHead>
                  <TableHead className="text-xs text-right">Order</TableHead>
                  <TableHead className="text-xs text-right">Distance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todaysVisits.map(v => (
                  <TableRow key={v.id}>
                    <TableCell className="text-xs font-mono">
                      {new Date(v.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell className="text-xs">{v.customer_name}</TableCell>
                    <TableCell className="text-xs">{VISIT_PURPOSE_LABELS[v.purpose]}</TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className="text-[10px]">
                        {VISIT_OUTCOME_LABELS[v.outcome]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {v.order_captured_value > 0 ? formatINR(v.order_captured_value) : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {v.distance_from_customer_meters != null
                        ? `${Math.round(v.distance_from_customer_meters)}m`
                        : '—'}
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

export default VisitTrackingPanel;
