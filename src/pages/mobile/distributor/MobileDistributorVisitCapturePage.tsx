/**
 * MobileDistributorVisitCapturePage.tsx — Distributor visit capture (downstream retailers)
 * Sprint T-Phase-1.1.1l-d · Writes a VisitLog to existing visitLogsKey for downstream beat.
 */
import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, MapPin, Save, Loader2, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import type { MobileSession } from '../MobileRouter';
import {
  type VisitLog, type VisitOutcome, type VisitPurpose,
  visitLogsKey, VISIT_OUTCOME_LABELS, VISIT_PURPOSE_LABELS,
} from '@/types/visit-log';
import { getCurrentLocation } from '@/lib/geolocation-bridge';

function readSession(): MobileSession | null {
  try { const raw = sessionStorage.getItem('opx_mobile_session'); return raw ? (JSON.parse(raw) as MobileSession) : null; } catch { return null; }
}
function loadList<T>(key: string): T[] { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; } }

export default function MobileDistributorVisitCapturePage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);
  const [customerName, setCustomerName] = useState('');
  const [purpose, setPurpose] = useState<VisitPurpose>('regular_visit');
  const [outcome, setOutcome] = useState<VisitOutcome>('order_captured');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const myLogs = useMemo<VisitLog[]>(() => {
    if (!session) return [];
    return loadList<VisitLog>(visitLogsKey(session.entity_code))
      .filter(v => v.salesman_id === session.user_id)
      .sort((a, b) => b.check_in_time.localeCompare(a.check_in_time))
      .slice(0, 30);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, reloadKey]);

  const handleSubmit = useCallback(async () => {
    if (!session) return;
    if (!customerName.trim()) { toast.error('Customer name required'); return; }
    setBusy(true);
    const reading = await getCurrentLocation();
    const lat = reading.ok && reading.latitude !== undefined ? reading.latitude : 0;
    const lng = reading.ok && reading.longitude !== undefined ? reading.longitude : 0;
    const acc = reading.ok && reading.accuracy_m !== undefined ? reading.accuracy_m : null;
    const now = new Date().toISOString();
    const log: VisitLog = {
      id: `vl-${Date.now()}`,
      entity_id: session.entity_code,
      salesman_id: session.user_id ?? '',
      salesman_name: session.display_name,
      customer_id: `cust-${Date.now()}`,
      customer_name: customerName.trim(),
      beat_id: null,
      check_in_time: now,
      check_in_geo: { latitude: lat, longitude: lng, accuracy_meters: acc },
      check_out_time: now,
      check_out_geo: { latitude: lat, longitude: lng, accuracy_meters: acc },
      customer_geo: null,
      distance_from_customer_meters: null,
      within_radius: true,
      purpose, outcome,
      notes: notes.trim(),
      order_captured_value: 0,
      order_voucher_id: null,
      next_visit_date: null,
      photo_urls: [],
      signature_data_url: null,
      signature_captured_at: null,
      created_at: now,
    };
    const all = loadList<VisitLog>(visitLogsKey(session.entity_code));
    // [JWT] POST /api/salesx/visit-logs
    localStorage.setItem(visitLogsKey(session.entity_code), JSON.stringify([log, ...all]));
    setCustomerName(''); setNotes('');
    setReloadKey(k => k + 1);
    setBusy(false);
    toast.success('Visit captured');
  }, [session, customerName, purpose, outcome, notes]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Visit Capture</h1>
      </div>

      <Card className="p-3 space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Retailer / Customer Name</Label>
          <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="e.g. Sharma General Stores" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Purpose</Label>
            <Select value={purpose} onValueChange={v => setPurpose(v as VisitPurpose)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(VISIT_PURPOSE_LABELS) as VisitPurpose[]).map(p => (
                  <SelectItem key={p} value={p}>{VISIT_PURPOSE_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Outcome</Label>
            <Select value={outcome} onValueChange={v => setOutcome(v as VisitOutcome)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(VISIT_OUTCOME_LABELS) as VisitOutcome[]).map(o => (
                  <SelectItem key={o} value={o}>{VISIT_OUTCOME_LABELS[o]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Notes</Label>
          <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Brief observation" />
        </div>
        <Button className="w-full" disabled={busy} onClick={handleSubmit}>
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Capture Visit
        </Button>
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" /> GPS captured automatically
        </p>
      </Card>

      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        Recent Visits ({myLogs.length})
      </p>
      {myLogs.length === 0 ? (
        <Card className="p-6 text-center">
          <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No visits yet</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {myLogs.map(v => (
            <Card key={v.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{v.customer_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {VISIT_PURPOSE_LABELS[v.purpose]} · {VISIT_OUTCOME_LABELS[v.outcome]}
                  </p>
                </div>
                <Badge variant="outline" className="text-[9px] shrink-0 font-mono">
                  {v.check_in_time.slice(0, 10)}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
